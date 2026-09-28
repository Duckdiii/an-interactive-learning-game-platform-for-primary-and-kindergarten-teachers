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
public class DraggableItem {

    @Column(nullable = false)
    private String itemId;

    private String text;

    private String visualPrompt;

    @Column(length = 2048)
    private String imageUrl;

    // Đáp án: id của DropZone mà vật này thuộc về.
    @Column(nullable = false)
    private String targetZoneId;
}
