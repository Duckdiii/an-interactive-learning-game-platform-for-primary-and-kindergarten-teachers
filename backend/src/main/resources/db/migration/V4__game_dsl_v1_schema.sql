-- Schema changes for Game JSON DSL v1.0.0 (see docs/game-json-dsl-v1.0.0.md).

-- 1. Games: DSL version and the finer-grained grade levels.
alter table games add column schema_version varchar(20) not null default '1.0.0';

update games set grade = 'GRADE_1' where grade = 'ELEMENTARY';
alter table games drop constraint if exists games_grade_check;
alter table games
    add constraint games_grade_check
    check (grade in ('KINDERGARTEN', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5'));

-- 2. Media shared by every question. AI only produces audio_text and visual_prompt;
--    audio_url and image_url are filled in by the backend (TTS, Pexels).
alter table question_games add column audio_text varchar(255);
alter table question_games add column audio_url varchar(255);
alter table question_games add column visual_prompt varchar(255);
alter table question_games add column image_url varchar(255);

alter table order_steps add column visual_prompt varchar(255);
alter table order_steps add column image_url varchar(255);

-- 3. AUDIO_VISUAL_MATCH: correct image plus distractor images (audio moved to question_games).
alter table audio_visual_match_questions drop column audio_url;
alter table audio_visual_match_questions drop column image_url;
alter table audio_visual_match_questions add column correct_visual_prompt varchar(255);
alter table audio_visual_match_questions add column correct_image_url varchar(255);

create table audio_visual_match_distractors (
    distractor_order integer not null check (distractor_order >= 0),
    image_url varchar(255),
    question_id varchar(255) not null,
    visual_prompt varchar(255),
    primary key (distractor_order, question_id)
);

alter table audio_visual_match_distractors
    add constraint fk_avm_distractors_question
    foreign key (question_id)
    references audio_visual_match_questions (id);

-- 4. SPOT_THE_TARGET: hit region as 0-1 ratios, nullable while the game is a draft
--    (background image moved to question_games.image_url).
alter table spot_the_target_questions drop column background_image_url;
alter table spot_the_target_questions drop column hit_regionx;
alter table spot_the_target_questions drop column hit_regiony;
alter table spot_the_target_questions drop column hit_region_radius;
alter table spot_the_target_questions add column hit_region_x double precision;
alter table spot_the_target_questions add column hit_region_y double precision;
alter table spot_the_target_questions add column hit_region_radius double precision;
alter table spot_the_target_questions add column target_description varchar(255);

-- 5. MATCHING: one question is a whole round holding several pairs.
alter table matching_questions drop column word;
alter table matching_questions drop column meaning;
alter table matching_questions drop column image_url;

create table matching_pairs (
    pair_order integer not null check (pair_order >= 0),
    left_image_url varchar(255),
    left_text varchar(255),
    left_visual_prompt varchar(255),
    pair_id varchar(255) not null,
    question_id varchar(255) not null,
    right_image_url varchar(255),
    right_text varchar(255),
    right_visual_prompt varchar(255),
    primary key (pair_order, question_id)
);

alter table matching_pairs
    add constraint fk_matching_pairs_question
    foreign key (question_id)
    references matching_questions (id);

-- 6. MEMORY_CARD: one question is a whole round holding several card pairs.
alter table memory_card_questions drop column pair_id;
alter table memory_card_questions drop column content;
alter table memory_card_questions drop column image_url;

create table memory_card_pairs (
    pair_order integer not null check (pair_order >= 0),
    content_image_url varchar(255),
    content_text varchar(255),
    content_visual_prompt varchar(255),
    pair_id varchar(255) not null,
    question_id varchar(255) not null,
    primary key (pair_order, question_id)
);

alter table memory_card_pairs
    add constraint fk_memory_card_pairs_question
    foreign key (question_id)
    references memory_card_questions (id);

-- 7. DRAG_DROP: one question is a whole round with its drop zones and draggable items.
alter table drag_drop_questions drop column item;
alter table drag_drop_questions drop column item_image_url;
alter table drag_drop_questions drop column target_zone;

create table drag_drop_zones (
    zone_order integer not null check (zone_order >= 0),
    label varchar(255),
    question_id varchar(255) not null,
    zone_id varchar(255) not null,
    primary key (zone_order, question_id)
);

create table drag_drop_items (
    item_order integer not null check (item_order >= 0),
    image_url varchar(255),
    item_id varchar(255) not null,
    question_id varchar(255) not null,
    target_zone_id varchar(255) not null,
    text varchar(255),
    visual_prompt varchar(255),
    primary key (item_order, question_id)
);

alter table drag_drop_zones
    add constraint fk_drag_drop_zones_question
    foreign key (question_id)
    references drag_drop_questions (id);

alter table drag_drop_items
    add constraint fk_drag_drop_items_question
    foreign key (question_id)
    references drag_drop_questions (id);

-- 8. VISUAL_CLOZE: distractor words (illustration moved to question_games.image_url).
alter table visual_cloze_questions drop column image_url;

create table visual_cloze_distractors (
    distractor_order integer not null check (distractor_order >= 0),
    distractor_value varchar(255),
    question_id varchar(255) not null,
    primary key (distractor_order, question_id)
);

alter table visual_cloze_distractors
    add constraint fk_visual_cloze_distractors_question
    foreign key (question_id)
    references visual_cloze_questions (id);
