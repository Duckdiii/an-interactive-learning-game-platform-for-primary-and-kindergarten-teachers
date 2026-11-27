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
public class VisualClozeImageOption {
    @Column(name = "option_id", nullable = false, length = 64)
    private String optionId;

    @Column(name = "visual_prompt", nullable = false, length = 255)
    private String visualPrompt;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    public VisualClozeImageOption(String optionId, String visualPrompt, String imageUrl) {
        this.optionId = optionId;
        this.visualPrompt = visualPrompt;
        this.imageUrl = imageUrl;
    }
}
