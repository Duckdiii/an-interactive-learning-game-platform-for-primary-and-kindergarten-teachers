package com.aigameplatform.backend.exception;

/** The teacher must identify the preschool age band before curriculum retrieval or generation. */
public class KindergartenAgeBandRequiredException extends ApiException {
    public KindergartenAgeBandRequiredException() {
        super(ErrorCode.VALIDATION_ERROR,
                "Vui lòng chọn độ tuổi mẫu giáo: 3–4, 4–5 hoặc 5–6 tuổi trước khi tạo game.");
    }
}
