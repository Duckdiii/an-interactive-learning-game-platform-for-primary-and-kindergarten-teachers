package com.aigameplatform.backend.exception;

/** The selected pilot generator does not implement this game, subject or grade combination. */
public class GenerationScopeUnsupportedException extends ApiException {
    public GenerationScopeUnsupportedException(String message) {
        super(ErrorCode.GENERATION_SCOPE_UNSUPPORTED, message);
    }
}
