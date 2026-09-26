package com.aigameplatform.backend.entity.question;

import com.aigameplatform.backend.entity.question.embedded.MemoryPair;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
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

    // Composition: mỗi câu (một màn chơi) chứa nhiều cặp thẻ; cặp chết theo câu hỏi.
    @ElementCollection
    @CollectionTable(name = "memory_card_pairs", joinColumns = @JoinColumn(name = "question_id"))
    @OrderColumn(name = "pair_order")
    private List<MemoryPair> pairs = new ArrayList<>();
}
