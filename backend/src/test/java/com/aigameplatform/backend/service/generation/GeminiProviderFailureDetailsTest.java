package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;

import dev.langchain4j.exception.HttpException;
import dev.langchain4j.exception.InvalidRequestException;
import org.junit.jupiter.api.Test;

class GeminiProviderFailureDetailsTest {

    @Test
    void extractsProviderStatusCodeMessageAndRequestIdWithoutLeakingCredentials() {
        var provider = new HttpException(400, """
                {"error":{"code":400,"status":"INVALID_ARGUMENT","message":"Invalid schema; key=<redacted>"},"requestId":"req-42"}
                """);

        var details = GeminiProviderFailureDetails.from(new InvalidRequestException(provider));

        assertThat(details.httpStatus()).isEqualTo(400);
        assertThat(details.providerCode()).isEqualTo("INVALID_ARGUMENT");
        assertThat(details.providerMessage()).contains("Invalid schema").doesNotContain("AIzaSyExampleCredential");
        assertThat(details.correlationId()).isEqualTo("req-42");
    }

    @Test
    void leavesProviderFieldsUnavailableWhenTheSdkDoesNotExposeAnHttpResponse() {
        var details = GeminiProviderFailureDetails.from(new IllegalStateException("connection failed"));

        assertThat(details.httpStatus()).isNull();
        assertThat(details.providerCode()).isEqualTo("UNAVAILABLE");
        assertThat(details.providerMessage()).isEqualTo("connection failed");
        assertThat(details.correlationId()).isNull();
    }
}
