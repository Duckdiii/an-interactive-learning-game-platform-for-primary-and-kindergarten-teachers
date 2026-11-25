-- V23 (trước là V14; đổi số vì main đã dùng đến V22, DB dùng chung đã áp bản V14 nên mọi câu lệnh phải chạy lặp được): Admin foundation, teacher role/status/school, and audit logs table

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS role varchar(50) NOT NULL DEFAULT 'ROLE_TEACHER';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS school varchar(255);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS created_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS audit_logs (
    id varchar(255) NOT NULL,
    timestamp timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_id varchar(255) NOT NULL,
    actor_role varchar(50) NOT NULL,
    ip varchar(255),
    action varchar(255) NOT NULL,
    result varchar(50) NOT NULL,
    moderation_result text,
    details text,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
