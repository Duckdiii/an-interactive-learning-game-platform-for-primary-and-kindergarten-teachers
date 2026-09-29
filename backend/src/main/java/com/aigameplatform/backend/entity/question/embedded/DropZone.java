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
public class DropZone {

    @Column(nullable = false)
    private String zoneId;

    private String label;
}
