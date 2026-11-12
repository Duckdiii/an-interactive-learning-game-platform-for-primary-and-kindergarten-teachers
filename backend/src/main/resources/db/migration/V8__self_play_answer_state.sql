alter table game_sessions
    add column student_option_salt varchar(64);

alter table play_interaction_details
    add column time_spent_ms integer not null default 0,
    add column points_earned integer not null default 0,
    add column answer_json text,
    add column correct_answer_json text;
