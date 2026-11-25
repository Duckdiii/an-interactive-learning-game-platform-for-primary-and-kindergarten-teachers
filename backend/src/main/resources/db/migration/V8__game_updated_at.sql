-- GameResponse/GameSummary bắt buộc updatedAt (docs/openapi/openapi.yaml); GET /games sắp theo cột này giảm dần.
-- Chỉ thêm cột; dòng cũ lấy thời điểm chạy migration.
alter table games add column updated_at timestamptz not null default now();

create index idx_games_author_updated on games (author_id, updated_at desc);
