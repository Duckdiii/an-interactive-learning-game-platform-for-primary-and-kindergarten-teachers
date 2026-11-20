package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.admin.AiConfigInput;
import com.aigameplatform.backend.dto.admin.AiConfigResponseDto;
import com.aigameplatform.backend.dto.admin.AiConfigVersionDto;
import com.aigameplatform.backend.dto.admin.BlockedWordsDto;
import com.aigameplatform.backend.dto.admin.FreezeAiConfigRequest;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.admin.AiConfigService;
import com.aigameplatform.backend.service.admin.SafetyAdminService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AdminAiConfigControllerTest {

    @Mock
    private AiConfigService aiConfigService;

    @Mock
    private SafetyAdminService safetyAdminService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AuthenticatedTeacher admin = new AuthenticatedTeacher("admin-id", "admin@school.vn", "s1", "ROLE_ADMIN");

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AdminAiConfigController(aiConfigService, safetyAdminService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();

        var auth = new UsernamePasswordAuthenticationToken(admin, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("GET /api/admin/ai-config trả về 200 và dữ liệu cấu hình")
    void getAiConfig_returns200() throws Exception {
        AiConfigVersionDto active = new AiConfigVersionDto(
                "v1", "System prompt", 0.3, 2000, 0.85, "v1.0", true, true, "hash", Instant.now(), "admin"
        );
        AiConfigResponseDto response = new AiConfigResponseDto(active, List.of(active));
        when(aiConfigService.getAiConfig()).thenReturn(response);

        mockMvc.perform(get("/api/admin/ai-config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.active.versionId").value("v1"));
    }

    @Test
    @DisplayName("POST /api/admin/ai-config/versions tạo phiên bản mới trả về 201")
    void createVersion_returns201() throws Exception {
        AiConfigInput input = new AiConfigInput("New prompt", 0.4, 2500, 0.8);
        AiConfigVersionDto created = new AiConfigVersionDto(
                "v2", "New prompt", 0.4, 2500, 0.8, null, false, true, "sha2", Instant.now(), "admin"
        );

        when(aiConfigService.createVersion(any(), any(), any())).thenReturn(created);

        mockMvc.perform(post("/api/admin/ai-config/versions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.versionId").value("v2"));
    }

    @Test
    @DisplayName("POST /api/admin/ai-config/versions/{id}/freeze trả về 200")
    void freezeVersion_returns200() throws Exception {
        FreezeAiConfigRequest req = new FreezeAiConfigRequest("v2.0");
        AiConfigVersionDto frozen = new AiConfigVersionDto(
                "v2", "New prompt", 0.4, 2500, 0.8, "v2.0", true, true, "sha2", Instant.now(), "admin"
        );

        when(aiConfigService.freezeVersion(eq("v2"), any(), any(), any())).thenReturn(frozen);

        mockMvc.perform(post("/api/admin/ai-config/versions/v2/freeze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.frozen").value(true));
    }

    @Test
    @DisplayName("POST /api/admin/ai-config/versions/{id}/activate trả về 200")
    void activateVersion_returns200() throws Exception {
        AiConfigVersionDto activated = new AiConfigVersionDto(
                "v1", "System prompt", 0.3, 2000, 0.85, "v1.0", true, true, "hash", Instant.now(), "admin"
        );

        when(aiConfigService.activateVersion(eq("v1"), any(), any())).thenReturn(activated);

        mockMvc.perform(post("/api/admin/ai-config/versions/v1/activate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    @DisplayName("GET /api/admin/safety/blocked-words trả về danh sách từ cấm 200")
    void getBlockedWords_returns200() throws Exception {
        BlockedWordsDto data = new BlockedWordsDto(List.of("từ1", "từ2"));
        when(safetyAdminService.getBlockedWords()).thenReturn(data);

        mockMvc.perform(get("/api/admin/safety/blocked-words"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.words[0]").value("từ1"));
    }

    @Test
    @DisplayName("PUT /api/admin/safety/blocked-words cập nhật danh sách từ cấm trả về 200")
    void replaceBlockedWords_returns200() throws Exception {
        BlockedWordsDto req = new BlockedWordsDto(List.of("cấm1", "cấm2"));
        when(safetyAdminService.replaceBlockedWords(any(), any(), any())).thenReturn(req);

        mockMvc.perform(put("/api/admin/safety/blocked-words")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.words[0]").value("cấm1"));
    }
}
