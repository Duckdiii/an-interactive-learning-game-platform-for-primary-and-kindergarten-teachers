package com.aigameplatform.backend.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;

class GlobalExceptionHandlerLockTest {

    @Test
    void lockTimeoutIsAConflictTheClientCanRetryNotAServerError() {
        var response = new GlobalExceptionHandler().handleLockTimeout(new PessimisticLockingFailureException("timeout"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isFalse();
    }
}
