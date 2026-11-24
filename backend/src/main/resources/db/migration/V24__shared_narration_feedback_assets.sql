CREATE TABLE shared_narration_assets (
    id VARCHAR(36) PRIMARY KEY,
    cache_key CHAR(64) NOT NULL UNIQUE,
    language VARCHAR(8) NOT NULL CHECK (language IN ('vi', 'en')),
    provider VARCHAR(24) NOT NULL CHECK (provider IN ('viettel-ai', 'elevenlabs')),
    voice_id VARCHAR(128) NOT NULL,
    model_id VARCHAR(128) NOT NULL,
    phrase_key VARCHAR(16) NOT NULL CHECK (phrase_key IN ('correct', 'wrong')),
    phrase_version VARCHAR(32) NOT NULL,
    storage_path VARCHAR(512) NOT NULL UNIQUE,
    byte_length INTEGER NOT NULL CHECK (byte_length > 0 AND byte_length <= 262144),
    duration_millis INTEGER NOT NULL CHECK (duration_millis > 0 AND duration_millis <= 30000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shared_narration_provider_language
    ON shared_narration_assets(provider, language);
