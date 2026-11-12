package com.aigameplatform.backend.entity.question.embedded;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class VisualClozeBlank {
    @Column(name = "blank_id", nullable = false, length = 64)
    private String blankId;

    @Column(nullable = false)
    private double x;

    @Column(nullable = false)
    private double y;

    @Column(name = "correct_option_id", nullable = false, length = 64)
    private String correctOptionId;

    public VisualClozeBlank(String blankId, double x, double y, String correctOptionId) {
        this.blankId = blankId;
        this.x = x;
        this.y = y;
        this.correctOptionId = correctOptionId;
    }
}
