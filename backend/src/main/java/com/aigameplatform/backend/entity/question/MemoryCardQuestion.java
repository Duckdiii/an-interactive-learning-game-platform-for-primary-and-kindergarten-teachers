package com.aigameplatform.backend.entity.question;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "memory_card_questions")
@Getter
@Setter
@NoArgsConstructor
public class MemoryCardQuestion extends QuestionGame {

    private String pairId;

    private String content;

    private String imageUrl;
}
