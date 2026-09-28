-- Schema changes for Game JSON DSL v1.0.0 (see docs/game-json-dsl-v1.0.0.md).
-- Every legacy column is copied to its new place before it is dropped, so existing rows keep their content.
-- URL columns are varchar(2048) to match the DSL limit (maxLength 2048).

-- 1. Games: DSL version and the finer-grained grade levels.
alter table games add column schema_version varchar(20) not null default '1.0.0';

-- The V2 check only allows KINDERGARTEN and ELEMENTARY, so drop it before converting the old values.
alter table games drop constraint if exists games_grade_check;
update games set grade = 'GRADE_1' where grade = 'ELEMENTARY';
alter table games
    add constraint games_grade_check
    check (grade in ('KINDERGARTEN', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5'));

-- 2. Media shared by every question. AI only produces audio_text and visual_prompt;
--    audio_url and image_url are filled in by the backend (TTS, Pexels).
alter table question_games add column audio_text varchar(255);
alter table question_games add column audio_url varchar(2048);
alter table question_games add column visual_prompt varchar(255);
alter table question_games add column image_url varchar(2048);

alter table order_steps add column visual_prompt varchar(255);
alter table order_steps add column image_url varchar(2048);

-- 3. AUDIO_VISUAL_MATCH: correct image plus distractor images (audio moved to question_games).
alter table audio_visual_match_questions add column correct_visual_prompt varchar(255);
alter table audio_visual_match_questions add column correct_image_url varchar(2048);

update question_games
    set audio_url = (select a.audio_url from audio_visual_match_questions a where a.id = question_games.id)
    where id in (select id from audio_visual_match_questions);
update audio_visual_match_questions set correct_image_url = image_url;

alter table audio_visual_match_questions drop column audio_url;
alter table audio_visual_match_questions drop column image_url;

create table audio_visual_match_distractors (
    distractor_order integer not null check (distractor_order >= 0),
    image_url varchar(2048),
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
--    The legacy hit region was stored as whole numbers (pixels), which cannot be turned into ratios without the
--    image size, so old rows start as drafts and the teacher picks the region again by tapping the image.
update question_games
    set image_url = (select s.background_image_url from spot_the_target_questions s where s.id = question_games.id)
    where id in (select id from spot_the_target_questions);

alter table spot_the_target_questions drop column background_image_url;
alter table spot_the_target_questions drop column hit_regionx;
alter table spot_the_target_questions drop column hit_regiony;
alter table spot_the_target_questions drop column hit_region_radius;
alter table spot_the_target_questions add column hit_region_x double precision;
alter table spot_the_target_questions add column hit_region_y double precision;
alter table spot_the_target_questions add column hit_region_radius double precision;
alter table spot_the_target_questions add column target_description varchar(255);

-- 5. MATCHING: one question is a whole round holding several pairs.
--    A legacy question (one word and its meaning) becomes a round with a single pair.
create table matching_pairs (
    pair_order integer not null check (pair_order >= 0),
    left_image_url varchar(2048),
    left_text varchar(255),
    left_visual_prompt varchar(255),
    pair_id varchar(255) not null,
    question_id varchar(255) not null,
    right_image_url varchar(2048),
    right_text varchar(255),
    right_visual_prompt varchar(255),
    primary key (pair_order, question_id)
);

alter table matching_pairs
    add constraint fk_matching_pairs_question
    foreign key (question_id)
    references matching_questions (id);

insert into matching_pairs (pair_order, pair_id, question_id, left_text, left_image_url, right_text)
    select 0, 'p1', id, word, image_url, meaning from matching_questions;

alter table matching_questions drop column word;
alter table matching_questions drop column meaning;
alter table matching_questions drop column image_url;

-- 6. MEMORY_CARD: one question is a whole round holding several card pairs.
--    A legacy question (one card pair) becomes a round with a single pair.
create table memory_card_pairs (
    pair_order integer not null check (pair_order >= 0),
    content_image_url varchar(2048),
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

insert into memory_card_pairs (pair_order, pair_id, question_id, content_text, content_image_url)
    select 0, 'p1', id, content, image_url from memory_card_questions;

alter table memory_card_questions drop column pair_id;
alter table memory_card_questions drop column content;
alter table memory_card_questions drop column image_url;

-- 7. DRAG_DROP: one question is a whole round with its drop zones and draggable items.
--    A legacy question (one item and its target zone) becomes a round with one zone and one item.
create table drag_drop_zones (
    zone_order integer not null check (zone_order >= 0),
    label varchar(255),
    question_id varchar(255) not null,
    zone_id varchar(255) not null,
    primary key (zone_order, question_id)
);

create table drag_drop_items (
    item_order integer not null check (item_order >= 0),
    image_url varchar(2048),
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

-- Every legacy row with any content is copied. A row without a target zone still gets zone z1 (label left empty)
-- so the item keeps its data; the teacher fills in the zone label later.
insert into drag_drop_zones (zone_order, zone_id, question_id, label)
    select 0, 'z1', id, target_zone from drag_drop_questions
    where target_zone is not null or item is not null or item_image_url is not null;
insert into drag_drop_items (item_order, item_id, question_id, target_zone_id, text, image_url)
    select 0, 'i1', id, 'z1', item, item_image_url from drag_drop_questions
    where target_zone is not null or item is not null or item_image_url is not null;

alter table drag_drop_questions drop column item;
alter table drag_drop_questions drop column item_image_url;
alter table drag_drop_questions drop column target_zone;

-- 8. VISUAL_CLOZE: distractor words (illustration moved to question_games.image_url).
update question_games
    set image_url = (select c.image_url from visual_cloze_questions c where c.id = question_games.id)
    where id in (select id from visual_cloze_questions);

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
