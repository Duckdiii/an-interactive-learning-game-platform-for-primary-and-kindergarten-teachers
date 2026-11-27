-- Visual Cloze chế độ hình ảnh (DSL 1.1.0). Trước đây là V7 trên main; đổi số vì DB dùng chung đã áp V7–V16 khác
-- (V7–V9 của dev, V12–V16 của nhánh feature). Viết để chạy lặp được: DB dùng chung đã có phần lớn các bảng/cột này do
-- Hibernate ddl-auto=update tạo ở nhánh feature/admin-portal (tên ràng buộc khác, xem docs/corrections.md).
-- Bỏ cột games.updated_at của bản cũ: V8__game_updated_at đã thêm (timestamptz).

alter table games add column if not exists visual_cloze_mode varchar(16);
-- Ràng buộc do Hibernate tự đặt tên; thay bằng tên chuẩn để DB dùng chung và DB mới giống nhau.
alter table games drop constraint if exists games_visual_cloze_mode_check;
alter table games drop constraint if exists ck_games_visual_cloze_mode;
alter table games add constraint ck_games_visual_cloze_mode
    check (visual_cloze_mode is null or visual_cloze_mode in ('TEXT', 'IMAGE'));

alter table visual_cloze_questions
    add column if not exists question_text varchar(255),
    add column if not exists scene_width integer,
    add column if not exists scene_height integer;

create table if not exists visual_cloze_blanks (
    question_id varchar(255) not null,
    blank_order integer not null check (blank_order >= 0),
    blank_id varchar(64) not null,
    x double precision not null,
    y double precision not null,
    correct_option_id varchar(64) not null,
    primary key (blank_order, question_id),
    constraint fk_visual_cloze_blanks_question foreign key (question_id)
        references visual_cloze_questions (id)
);

create table if not exists visual_cloze_image_options (
    question_id varchar(255) not null,
    option_order integer not null check (option_order >= 0),
    option_id varchar(64) not null,
    visual_prompt varchar(255) not null,
    image_url varchar(2048),
    primary key (option_order, question_id),
    constraint fk_visual_cloze_image_options_question foreign key (question_id)
        references visual_cloze_questions (id)
);
