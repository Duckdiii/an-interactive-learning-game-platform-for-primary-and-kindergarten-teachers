CREATE TABLE IF NOT EXISTS session_participant_scores (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    participant_id VARCHAR(64) NOT NULL,
    participant_name VARCHAR(255) NOT NULL,
    final_score INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_participant_scores_session_id ON session_participant_scores(session_id);
