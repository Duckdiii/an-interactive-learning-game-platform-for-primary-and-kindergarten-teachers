package com.aigameplatform.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Cách trình bày của game (metadata.presentation trong DSL): lưu ba cột, cột nào null thì frontend tự chọn. */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GamePresentation {

    @Column(name = "presentation_world", length = 20)
    private String world;

    @Column(name = "presentation_carrier", length = 20)
    private String carrier;

    @Column(name = "presentation_layout", length = 20)
    private String layout;
}
