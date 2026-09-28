package com.aigameplatform.backend.entity.question.embedded;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class MatchingPair {

    @Column(nullable = false)
    private String pairId;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "text", column = @Column(name = "left_text")),
        @AttributeOverride(name = "visualPrompt", column = @Column(name = "left_visual_prompt")),
        @AttributeOverride(name = "imageUrl", column = @Column(name = "left_image_url", length = 2048))
    })
    private PairSide left;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "text", column = @Column(name = "right_text")),
        @AttributeOverride(name = "visualPrompt", column = @Column(name = "right_visual_prompt")),
        @AttributeOverride(name = "imageUrl", column = @Column(name = "right_image_url", length = 2048))
    })
    private PairSide right;
}
