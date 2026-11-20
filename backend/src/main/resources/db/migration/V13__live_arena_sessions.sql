-- Cho phép SessionStatus có thêm WAITING và PAUSED
ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_status_check;
ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_status_check CHECK (status IN ('WAITING', 'ACTIVE', 'PAUSED', 'CLOSED'));

-- Cho phép classroom_id là null trong teacher_sessions (Live Arena ad-hoc không bắt buộc chọn lớp)
ALTER TABLE teacher_sessions ALTER COLUMN classroom_id DROP NOT NULL;

-- Thêm created_at cho game_sessions nếu chưa có
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS created_at timestamp default now();
