package com.aigameplatform.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "ai_config_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiConfigVersion {

    @Id
    private String id;

    @Column(name = "system_prompt", nullable = false, columnDefinition = "TEXT")
    private String systemPrompt;

    @Column(nullable = false)
    private Double temperature;

    @Column(name = "max_tokens", nullable = false)
    private Integer maxTokens;

    @Column(name = "moderation_threshold", nullable = false)
    private Double moderationThreshold;

    private String label;

    @Column(name = "is_frozen", nullable = false)
    private boolean frozen;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by")
    private String createdBy;
}
