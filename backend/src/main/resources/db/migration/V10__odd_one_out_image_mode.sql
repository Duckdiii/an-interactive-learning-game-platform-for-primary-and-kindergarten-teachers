alter table games add column odd_one_out_mode varchar(16),
    add constraint ck_games_odd_one_out_mode check (odd_one_out_mode is null or odd_one_out_mode in ('TEXT', 'IMAGE'));

alter table odd_one_out_questions add column question_text varchar(255);

create table odd_one_out_image_items (
    question_id varchar(255) not null references odd_one_out_questions (id),
    item_order integer not null check (item_order >= 0),
    asset_id varchar(64) not null,
    item_label varchar(100) not null,
    image_url varchar(2048) not null,
    primary key (item_order, question_id)
);
