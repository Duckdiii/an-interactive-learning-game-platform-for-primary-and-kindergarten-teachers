package com.aigameplatform.backend.exception;

/** The draft could not be deterministically verified; it must not be returned as curriculum-grounded. */
public class GeneratedContentUnverifiedException extends ApiException {
    public GeneratedContentUnverifiedException(String reasonCode) {
        super(ErrorCode.GENERATED_CONTENT_UNVERIFIED,
                "Nội dung game chưa được xác minh (mã lý do: " + reasonCode + ")");
    }
}
