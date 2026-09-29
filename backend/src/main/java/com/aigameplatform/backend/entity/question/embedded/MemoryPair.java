package com.aigameplatform.backend.entity.question.embedded;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Một cặp thẻ giống nhau; renderer nhân đôi thành 2 thẻ. */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class MemoryPair {

    @Column(nullable = false)
    private String pairId;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "text", column = @Column(name = "content_text")),
        @AttributeOverride(name = "visualPrompt", column = @Column(name = "content_visual_prompt")),
        @AttributeOverride(name = "imageUrl", column = @Column(name = "content_image_url", length = 2048))
    })
    private PairSide content;
}
