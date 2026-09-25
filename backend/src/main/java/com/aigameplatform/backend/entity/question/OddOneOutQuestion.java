package com.aigameplatform.backend.entity.question;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "odd_one_out_questions")
@Getter
@Setter
@NoArgsConstructor
public class OddOneOutQuestion extends QuestionGame {

    @ElementCollection
    @CollectionTable(name = "odd_one_out_items", joinColumns = @JoinColumn(name = "question_id"))
    @OrderColumn(name = "item_order")
    @Column(name = "item_value")
    private List<String> items = new ArrayList<>();
    
    private String oddOneOutId;
}
