-- Token đặt lại mật khẩu (UC-15 luồng 2a): lưu dạng băm SHA-256 (hex), dùng một lần (used_at), hết hạn sau 30 phút.
-- V20 chứ không phải V12: DB dùng chung đã có V12–V16 từ các nhánh feature, V17–V19 dành cho bộ migration đánh lại của main.
create table password_reset_tokens (
    id varchar(255) not null,
    teacher_id varchar(255) not null,
    token_hash varchar(64) not null unique,
    expires_at timestamp(6) not null,
    used_at timestamp(6),
    created_at timestamp(6) not null,
    primary key (id)
);

alter table password_reset_tokens
    add constraint fk_password_reset_tokens_teacher
    foreign key (teacher_id)
    references teachers (id)
    on delete cascade;

create index idx_password_reset_tokens_teacher_id on password_reset_tokens (teacher_id);
