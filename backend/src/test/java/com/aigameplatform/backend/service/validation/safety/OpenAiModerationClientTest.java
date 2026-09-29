package com.aigameplatform.backend.service.validation.safety;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** Chỉ dùng máy chủ giả, không bao giờ gọi OpenAI thật. */
class OpenAiModerationClientTest {

    private static final String URL = "https://api.openai.com/v1/moderations";
    private static final String CLEAN = "{\"flagged\":false,\"categories\":{\"violence\":false,\"sexual\":false}}";

    private final RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final OpenAiModerationClient client = new OpenAiModerationClient(builder, "test-key", "omni-moderation-latest");

    private static String response(String... results) {
        return "{\"id\":\"modr-1\",\"model\":\"omni-moderation-latest\",\"results\":[" + String.join(",", results) + "]}";
    }

    private static String cleanResults(int count) {
        return response(Collections.nCopies(count, CLEAN).toArray(String[]::new));
    }

    @Test
    void sendsModelInputAndBearerKey() {
        server.expect(requestTo(URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andExpect(jsonPath("$.model").value("omni-moderation-latest"))
                .andExpect(jsonPath("$.input[0]").value("Con mèo kêu meo meo"))
                .andExpect(jsonPath("$.input[1]").value("Hôm nay trời đẹp"))
                .andRespond(withSuccess(cleanResults(2), MediaType.APPLICATION_JSON));

        List<ModerationResult> results = client.moderate(List.of("Con mèo kêu meo meo", "Hôm nay trời đẹp"));

        assertThat(results).hasSize(2);
        server.verify();
    }

    @Test
    void parsesFlaggedResultsWithTheirCategories() {
        String flagged = "{\"flagged\":true,\"categories\":{\"violence\":true,\"sexual\":false,\"harassment\":true}}";
        server.expect(requestTo(URL)).andRespond(withSuccess(response(CLEAN, flagged), MediaType.APPLICATION_JSON));

        List<ModerationResult> results = client.moderate(List.of("ok", "bad"));

        assertThat(results.get(0).flagged()).isFalse();
        assertThat(results.get(0).categories()).isEmpty();
        assertThat(results.get(1).flagged()).isTrue();
        assertThat(results.get(1).categories()).containsExactlyInAnyOrder("violence", "harassment");
    }

    @Test
    void splitsLargeInputIntoBatchesAndKeepsTheOrder() {
        server.expect(requestTo(URL)).andExpect(jsonPath("$.input.length()").value(20))
                .andRespond(withSuccess(cleanResults(20), MediaType.APPLICATION_JSON));
        server.expect(requestTo(URL)).andExpect(jsonPath("$.input.length()").value(20))
                .andRespond(withSuccess(cleanResults(20), MediaType.APPLICATION_JSON));
        server.expect(requestTo(URL)).andExpect(jsonPath("$.input.length()").value(5))
                .andRespond(withSuccess(cleanResults(5), MediaType.APPLICATION_JSON));

        List<String> texts = IntStream.range(0, 45).mapToObj(i -> "text " + i).collect(Collectors.toList());

        assertThat(client.moderate(texts)).hasSize(45);
        server.verify();
    }

    @Test
    void serverErrorBecomesUnavailable() {
        server.expect(requestTo(URL)).andRespond(withServerError());

        assertThatThrownBy(() -> client.moderate(List.of("x"))).isInstanceOf(ModerationUnavailableException.class);
    }

    @Test
    void rejectedKeyBecomesUnavailableWithoutLeakingIt() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> client.moderate(List.of("x")))
                .isInstanceOf(ModerationUnavailableException.class)
                .hasMessageNotContaining("test-key");
    }

    @Test
    void wrongNumberOfResultsBecomesUnavailable() {
        server.expect(requestTo(URL)).andRespond(withSuccess(cleanResults(1), MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.moderate(List.of("a", "b"))).isInstanceOf(ModerationUnavailableException.class);
    }

    @Test
    void unexpectedBodyBecomesUnavailable() {
        server.expect(requestTo(URL)).andRespond(withSuccess("{\"error\":{\"message\":\"x\"}}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.moderate(List.of("a"))).isInstanceOf(ModerationUnavailableException.class);
    }

    @Test
    void isNotConfiguredWithoutAKey() {
        OpenAiModerationClient noKey = new OpenAiModerationClient(RestClient.builder(), "  ", "m");

        assertThat(noKey.isConfigured()).isFalse();
        assertThatThrownBy(() -> noKey.moderate(List.of("x"))).isInstanceOf(IllegalStateException.class);
        assertThat(client.isConfigured()).isTrue();
    }
}
