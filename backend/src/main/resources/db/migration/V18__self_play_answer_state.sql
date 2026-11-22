-- Trạng thái câu trả lời khi học sinh tự chơi. Trước đây là V8 trên main; đổi số và viết chạy lặp được như V17
-- (DB dùng chung đã có các cột này do Hibernate tạo, nhưng thiếu giá trị mặc định).

alter table game_sessions
    add column if not exists student_option_salt varchar(64);

alter table play_interaction_details
    add column if not exists time_spent_ms integer not null default 0,
    add column if not exists points_earned integer not null default 0,
    add column if not exists answer_json text,
    add column if not exists correct_answer_json text;

alter table play_interaction_details alter column time_spent_ms set default 0;
alter table play_interaction_details alter column points_earned set default 0;
