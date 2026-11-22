package com.aigameplatform.backend.dto.response;

import com.aigameplatform.backend.dto.understanding.GameUnderstanding;
import java.util.List;

/** {@code GameUnderstandingResponse} của openapi.yaml; {@code question} null khi đã đủ thông tin. */
public record GameUnderstandingResponse(String reply, Question question, GameUnderstanding understanding, boolean ready) {

    public record Question(String text, List<String> quickReplies) {
    }
}
