package com.aigameplatform.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Shared fixed-phrase narration cache. Phrase text is deliberately not stored. */
@Entity
@Table(name = "shared_narration_assets")
@Getter
@Setter
@NoArgsConstructor
public class SharedNarrationAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "cache_key", nullable = false, length = 64, columnDefinition = "char(64)", unique = true)
    private String cacheKey;

    @Column(nullable = false, length = 8)
    private String language;

    @Column(nullable = false, length = 24)
    private String provider;

    @Column(name = "voice_id", nullable = false, length = 128)
    private String voiceId;

    @Column(name = "model_id", nullable = false, length = 128)
    private String modelId;

    @Column(name = "phrase_key", nullable = false, length = 16)
    private String phraseKey;

    @Column(name = "phrase_version", nullable = false, length = 32)
    private String phraseVersion;

    @Column(name = "storage_path", nullable = false, length = 512, unique = true)
    private String storagePath;

    @Column(name = "byte_length", nullable = false)
    private int byteLength;

    @Column(name = "duration_millis", nullable = false)
    private int durationMillis;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
