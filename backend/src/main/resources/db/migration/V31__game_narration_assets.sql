CREATE TABLE game_narration_assets (
    id VARCHAR(36) PRIMARY KEY,
    game_id VARCHAR(36) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    question_id VARCHAR(36) NOT NULL REFERENCES question_games(id) ON DELETE CASCADE,
    content_sha256 CHAR(64) NOT NULL,
    storage_path VARCHAR(512) NOT NULL UNIQUE,
    byte_length INTEGER NOT NULL CHECK (byte_length > 0 AND byte_length <= 262144),
    duration_millis INTEGER NOT NULL CHECK (duration_millis > 0 AND duration_millis <= 30000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_game_narration_question UNIQUE (game_id, question_id)
);

CREATE INDEX idx_game_narration_game ON game_narration_assets(game_id);
