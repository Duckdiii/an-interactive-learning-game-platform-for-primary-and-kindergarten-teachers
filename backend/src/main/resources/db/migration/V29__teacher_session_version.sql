ALTER TABLE teachers ADD COLUMN session_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE refresh_tokens ADD COLUMN session_version BIGINT NOT NULL DEFAULT 0;

UPDATE teachers SET session_version = 1 WHERE status = 'LOCKED';
