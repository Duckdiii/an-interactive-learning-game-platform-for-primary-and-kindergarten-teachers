package com.aigameplatform.backend.dto.response;

import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class QuizAiContentDraft {

    private List<QuizAiQuestionDraft> questions;
}
