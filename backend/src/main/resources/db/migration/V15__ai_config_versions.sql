-- V15: Dynamic AI configuration versions and school safety blocked words

CREATE TABLE IF NOT EXISTS ai_config_versions (
    id varchar(255) NOT NULL,
    system_prompt text NOT NULL,
    temperature double precision NOT NULL DEFAULT 0.3,
    max_tokens integer NOT NULL DEFAULT 2000,
    moderation_threshold double precision NOT NULL DEFAULT 0.85,
    label varchar(100),
    is_frozen boolean NOT NULL DEFAULT FALSE,
    is_active boolean NOT NULL DEFAULT FALSE,
    sha256 varchar(64) NOT NULL,
    created_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by varchar(255),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_ai_config_active ON ai_config_versions (is_active);
CREATE INDEX IF NOT EXISTS idx_ai_config_created_at ON ai_config_versions (created_at);

CREATE TABLE IF NOT EXISTS blocked_words (
    id varchar(255) NOT NULL,
    word varchar(255) NOT NULL UNIQUE,
    created_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_words_word ON blocked_words (word);
