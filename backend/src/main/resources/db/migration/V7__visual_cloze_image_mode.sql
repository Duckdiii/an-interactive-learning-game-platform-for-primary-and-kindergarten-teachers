alter table games
    add column visual_cloze_mode varchar(16),
    add column updated_at timestamp not null default current_timestamp,
    add constraint ck_games_visual_cloze_mode
        check (visual_cloze_mode is null or visual_cloze_mode in ('TEXT', 'IMAGE'));

alter table visual_cloze_questions
    add column question_text varchar(255),
    add column scene_width integer,
    add column scene_height integer;

create table visual_cloze_blanks (
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

create table visual_cloze_image_options (
    question_id varchar(255) not null,
    option_order integer not null check (option_order >= 0),
    option_id varchar(64) not null,
    visual_prompt varchar(255) not null,
    image_url varchar(2048),
    primary key (option_order, question_id),
    constraint fk_visual_cloze_image_options_question foreign key (question_id)
        references visual_cloze_questions (id)
);
