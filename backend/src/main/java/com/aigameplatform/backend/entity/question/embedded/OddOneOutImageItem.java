package com.aigameplatform.backend.entity.question.embedded;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OddOneOutImageItem {
    @Column(name = "asset_id", nullable = false, length = 64)
    private String assetId;
    @Column(name = "item_label", nullable = false, length = 100)
    private String label;
    @Column(name = "image_url", nullable = false, length = 2048)
    private String imageUrl;
}
