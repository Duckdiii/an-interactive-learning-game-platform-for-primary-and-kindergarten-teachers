package com.aigameplatform.backend.db;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.request.LoginRequest;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.UserRole;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.AuthService;
import com.aigameplatform.backend.service.admin.AiConfigService;
import com.aigameplatform.backend.service.asset.AssetRetriever;
import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import com.aigameplatform.backend.service.generation.GeminiGameContentGenerator;
import com.aigameplatform.backend.service.media.NotoEmojiCatalog;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import com.aigameplatform.backend.service.validation.safety.OpenAiModerationClient;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.json.JsonMapper;

@AutoConfigureMockMvc
@Import(AdminAiConfigPostgresTest.GeneratorConfiguration.class)
class AdminAiConfigPostgresTest extends AbstractPostgresTest {

    @DynamicPropertySource
    static void enableModerationThresholdTest(DynamicPropertyRegistry registry) {
        registry.add("app.moderation.required", () -> "true");
        registry.add("app.moderation.openai.api-key", () -> "ci-test-only-key");
    }

    private static final String CONFIG = "/api/admin/ai-config";
    private static final String VERSIONS = CONFIG + "/versions";

    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private TeacherRepository teachers;
    @Autowired private PasswordEncoder passwords;
    @Autowired private AuthService auth;
    @Autowired private JsonMapper json;
    @MockitoBean(name = "uc14ChatModel") private ChatModel model;
    @MockitoSpyBean private OpenAiModerationClient moderation;

    @Test
    void savedAndRestoredVersionsDriveTheNextTeacherGeneration() throws Exception {
        String admin = login("config-admin", UserRole.ROLE_ADMIN);
        String teacher = login("config-teacher", UserRole.ROLE_TEACHER);
        String rawQuiz = new ClassPathResource("ai-output-examples/quiz.json").getContentAsString(StandardCharsets.UTF_8);
        when(model.chat(any(ChatRequest.class))).thenReturn(ChatResponse.builder().aiMessage(AiMessage.from(rawQuiz)).build());
        doReturn(true).when(moderation).isConfigured();
        doAnswer(call -> call.<List<String>>getArgument(0).stream()
                .map(text -> new ModerationResult(false, List.of(), Map.of("violence", 0.60))).toList())
                .when(moderation).moderate(any());

        mvc.perform(get(CONFIG).header("Authorization", teacher)).andExpect(status().isForbidden());
        String previous = create(admin, "Ưu tiên câu ngắn.", 0.20, 2200, 0.90);
        mvc.perform(post(VERSIONS + "/" + previous + "/freeze").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"label":"UC-14 baseline"}
                                """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.frozen").value(true));

        String strict = create(admin, "Thêm động từ rõ ràng.", 0.65, 3100, 0.60);
        generateQuiz(teacher).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.error.code").value("UNSAFE_CONTENT"));
        assertModelRequest("Thêm động từ rõ ràng.", 0.65, 3100);

        mvc.perform(post(VERSIONS + "/" + previous + "/activate").header("Authorization", admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.active").value(true));
        mvc.perform(post(VERSIONS + "/" + previous + "/activate").header("Authorization", admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.active").value(true));
        assertActive(admin, previous);
        mvc.perform(get(CONFIG).header("Authorization", admin))
                .andExpect(jsonPath("$.data.versions[?(@.versionId == '%s')].active".formatted(strict)).value(false));

        clearInvocations(model);
        generateQuiz(teacher).andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("DRAFT"));
        assertModelRequest("Ưu tiên câu ngắn.", 0.20, 2200);
    }

    @Test
    void invalidInputAndPostgresWriteFailureKeepThePreviousVersionActive() throws Exception {
        String admin = login("rollback-admin", UserRole.ROLE_ADMIN);
        String previous = create(admin, "Giữ bản cấu hình hiện tại.", 0.30, 2300, 0.85);

        mvc.perform(createRequest(admin, "  ", 1.5, 4001, -0.1))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        assertActive(admin, previous);

        // Làm INSERT thất bại sau khi service đã chạy lệnh bỏ kích hoạt bản cũ.
        jdbc.execute("""
                ALTER TABLE ai_config_versions ADD CONSTRAINT uc14_simulated_write_failure
                CHECK (system_prompt <> 'uc14-test-db-write-failure')
                """);
        try {
            mvc.perform(createRequest(admin, "uc14-test-db-write-failure", 0.42, 2200, 0.80))
                    .andExpect(status().isInternalServerError()).andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"));
        } finally {
            jdbc.execute("ALTER TABLE ai_config_versions DROP CONSTRAINT uc14_simulated_write_failure");
        }

        assertActive(admin, previous);
        mvc.perform(get(CONFIG).header("Authorization", admin))
                .andExpect(jsonPath("$.data.versions[?(@.systemPrompt == 'uc14-test-db-write-failure')]").isEmpty());
    }

    private ResultActions generateQuiz(String teacher) throws Exception {
        return mvc.perform(post("/api/games/generate").header("Authorization", teacher)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"subject":"MATH","gradeLevel":"GRADE_1","gameType":"QUIZ","idea":"Trò chơi đếm con vật từ 1 đến 5"}
                        """));
    }

    private void assertModelRequest(String prompt, double temperature, int maxTokens) {
        var sent = ArgumentCaptor.forClass(ChatRequest.class);
        verify(model).chat(sent.capture());
        ChatRequest request = sent.getValue();
        assertThat(((SystemMessage) request.messages().getFirst()).text())
                .startsWith(prompt + "\n\n").contains("Trò chơi đếm con vật từ 1 đến 5");
        assertThat(request.parameters().temperature()).isEqualTo(temperature);
        assertThat(request.parameters().maxOutputTokens()).isEqualTo(maxTokens);
        assertThat(request.parameters().responseFormat().jsonSchema()).isNotNull();
    }

    private void assertActive(String admin, String versionId) throws Exception {
        mvc.perform(get(CONFIG).header("Authorization", admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active.versionId").value(versionId))
                .andExpect(jsonPath("$.data.versions[?(@.active == true)]", hasSize(1)));
    }

    private String create(String admin, String prompt, double temperature, int maxTokens, double threshold) throws Exception {
        byte[] response = mvc.perform(createRequest(admin, prompt, temperature, maxTokens, threshold))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsByteArray();
        return json.readTree(response).path("data").path("versionId").asString();
    }

    private MockHttpServletRequestBuilder createRequest(String admin, String prompt, double temperature, int maxTokens,
            double threshold) {
        return post(VERSIONS).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("systemPrompt", prompt, "temperature", temperature,
                        "maxTokens", maxTokens, "moderationThreshold", threshold)));
    }

    private String login(String name, UserRole role) {
        String password = "Test-Only-Password-14!";
        Teacher account = new Teacher();
        account.setEmail("uc14-" + name + "@example.test");
        account.setFullName(name);
        account.setPasswordHash(passwords.encode(password));
        account.setRole(role);
        teachers.saveAndFlush(account);
        return "Bearer " + auth.login(new LoginRequest(account.getEmail(), password)).response().accessToken();
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class GeneratorConfiguration {
        @Bean
        GeminiGameContentGenerator uc14Generator(@Qualifier("uc14ChatModel") ChatModel model,
                GameContentStrategyRegistry strategies, GameAssetCatalog assets, AssetRetriever retriever,
                NotoEmojiCatalog noto, AiConfigService config) {
            return new GeminiGameContentGenerator(model, model, strategies, assets, retriever, false, noto, config);
        }
    }
}
