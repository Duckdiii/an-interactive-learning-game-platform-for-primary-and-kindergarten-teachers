package com.aigameplatform.backend.entity.question;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "word_scramble_questions")
@Getter
@Setter
@NoArgsConstructor
public class WordScrambleQuestion extends QuestionGame {

    @ElementCollection
    @CollectionTable(name = "word_scramble_letters", joinColumns = @JoinColumn(name = "question_id"))
    @OrderColumn(name = "letter_order")
    @Column(name = "letter_value")
    private List<String> scrambledLetters = new ArrayList<>();

    private String correctWord;
}
