package com.aigameplatform.backend.entity.question;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "matching_questions")
@Getter
@Setter
@NoArgsConstructor
public class MatchingQuestion extends QuestionGame {

    private String word;

    private String meaning;

    private String imageUrl;
}
