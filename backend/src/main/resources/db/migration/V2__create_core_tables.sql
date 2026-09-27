-- Core schema generated from the JPA entities (com.aigameplatform.backend.entity).
    create table audio_visual_match_questions (
        audio_url varchar(255),
        id varchar(255) not null,
        image_url varchar(255),
        primary key (id)
    );

    create table classrooms (
        class_name varchar(255) not null,
        id varchar(255) not null,
        school_name varchar(255),
        school_year varchar(255),
        teacher_id varchar(255),
        primary key (id)
    );

    create table drag_drop_questions (
        id varchar(255) not null,
        item varchar(255),
        item_image_url varchar(255),
        target_zone varchar(255),
        primary key (id)
    );

    create table duel_sessions (
        id varchar(255) not null,
        pairing_strategy varchar(255) check ((pairing_strategy in ('RANDOM','MANUAL_ASSIGN','FREE_CHOICE'))),
        primary key (id)
    );

    create table edit_logs (
        edited_at timestamp(6) not null,
        edited_by varchar(255) not null check ((edited_by in ('TEACHER','AI'))),
        id varchar(255) not null,
        question_id varchar(255) not null,
        primary key (id)
    );

    create table family_sessions (
        contact_information varchar(255),
        id varchar(255) not null,
        parent_name varchar(255),
        primary key (id)
    );

    create table game_sessions (
        access_code varchar(255) unique,
        game_id varchar(255) not null,
        id varchar(255) not null,
        session_name varchar(255),
        status varchar(255) not null check ((status in ('ACTIVE','CLOSED'))),
        primary key (id)
    );

    create table games (
        question_num integer not null,
        author_id varchar(255) not null,
        game_type varchar(255) not null check ((game_type in ('MATCHING','QUIZ','MEMORY_CARD','DRAG_DROP','ORDERING','WORD_SCRAMBLE','ODD_ONE_OUT','VISUAL_CLOZE','AUDIO_VISUAL_MATCH','SPOT_THE_TARGET'))),
        grade varchar(255) check ((grade in ('KINDERGARTEN','ELEMENTARY'))),
        id varchar(255) not null,
        share_code varchar(255) unique,
        status varchar(255) not null check ((status in ('DRAFT','PUBLISHED'))),
        subject varchar(255) check ((subject in ('MATH','VIETNAMESE','ENGLISH'))),
        title varchar(255) not null,
        version varchar(255),
        primary key (id)
    );

    create table matching_questions (
        id varchar(255) not null,
        image_url varchar(255),
        meaning varchar(255),
        word varchar(255),
        primary key (id)
    );

    create table memory_card_questions (
        content varchar(255),
        id varchar(255) not null,
        image_url varchar(255),
        pair_id varchar(255),
        primary key (id)
    );

    create table odd_one_out_items (
        item_order integer not null check ((item_order>=0)),
        item_value varchar(255),
        question_id varchar(255) not null,
        primary key (item_order, question_id)
    );

    create table odd_one_out_questions (
        id varchar(255) not null,
        odd_one_out_id varchar(255),
        primary key (id)
    );

    create table order_steps (
        correct_position integer not null,
        question_id varchar(255),
        step_id varchar(255) not null,
        text varchar(255),
        primary key (step_id)
    );

    create table ordering_questions (
        id varchar(255) not null,
        primary key (id)
    );

    create table participants (
        score integer not null,
        completed_at timestamp(6),
        played_at timestamp(6),
        game_session_id varchar(255) not null,
        id varchar(255) not null,
        note varchar(255),
        student_nickname varchar(255),
        team_id varchar(255),
        primary key (id)
    );

    create table play_interaction_details (
        attempts_count integer not null,
        duration_seconds integer not null,
        id varchar(255) not null,
        participant_id varchar(255) not null,
        question_id varchar(255) not null,
        status varchar(255) not null check ((status in ('CORRECT','INCORRECT','SKIPPED','TIMEOUT'))),
        primary key (id)
    );

    create table question_games (
        item_index integer not null,
        point integer not null,
        time_limit integer not null,
        game_id varchar(255) not null,
        id varchar(255) not null,
        primary key (id)
    );

    create table quiz_question_options (
        option_order integer not null check ((option_order>=0)),
        option_value varchar(255),
        question_id varchar(255) not null,
        primary key (option_order, question_id)
    );

    create table quiz_questions (
        correct_index integer not null,
        id varchar(255) not null,
        text varchar(255),
        primary key (id)
    );

    create table self_sessions (
        session_expires_at timestamp(6),
        id varchar(255) not null,
        primary key (id)
    );

    create table solo_sessions (
        max_participants integer not null,
        id varchar(255) not null,
        primary key (id)
    );

    create table spot_the_target_questions (
        hit_region_radius integer not null,
        hit_regionx integer not null,
        hit_regiony integer not null,
        background_image_url varchar(255),
        id varchar(255) not null,
        primary key (id)
    );

    create table teacher_sessions (
        is_locked boolean not null,
        classroom_id varchar(255) not null,
        id varchar(255) not null,
        teacher_id varchar(255) not null,
        primary key (id)
    );

    create table teachers (
        email varchar(255) not null unique,
        full_name varchar(255) not null,
        id varchar(255) not null,
        password varchar(255),
        password_hash varchar(255) not null,
        primary key (id)
    );

    create table team_sessions (
        grouping_strategy varchar(255) check ((grouping_strategy in ('RANDOM','MANUAL_ASSIGN','FREE_CHOICE'))),
        id varchar(255) not null,
        primary key (id)
    );

    create table teams (
        id varchar(255) not null,
        team_color varchar(255),
        team_name varchar(255),
        team_session_id varchar(255) not null,
        primary key (id)
    );

    create table visual_cloze_questions (
        correct_answer varchar(255),
        id varchar(255) not null,
        image_url varchar(255),
        sentence_template varchar(255),
        primary key (id)
    );

    create table word_scramble_letters (
        letter_order integer not null check ((letter_order>=0)),
        letter_value varchar(255),
        question_id varchar(255) not null,
        primary key (letter_order, question_id)
    );

    create table word_scramble_questions (
        correct_word varchar(255),
        id varchar(255) not null,
        primary key (id)
    );

    alter table audio_visual_match_questions 
       add constraint FK8alkpbcta4lx49jn99lrbbcwn 
       foreign key (id) 
       references question_games (id);

    alter table classrooms 
       add constraint FKbyl3mbf2j46aa8i242b6gxjg1 
       foreign key (teacher_id) 
       references teachers (id);

    alter table drag_drop_questions 
       add constraint FKqkq4n8a11vp6sfjjed0m25pl6 
       foreign key (id) 
       references question_games (id);

    alter table duel_sessions 
       add constraint FKe5hpiilrhmctwvaejnyw3n00m 
       foreign key (id) 
       references teacher_sessions (id);

    alter table edit_logs 
       add constraint FKg6jx4dhbnpa7fx3aawn4r95u8 
       foreign key (question_id) 
       references question_games (id);

    alter table family_sessions 
       add constraint FKas9rf357qykluig82d216wskg 
       foreign key (id) 
       references game_sessions (id);

    alter table game_sessions 
       add constraint FKlg198vj4h7ejkp6n710neylxx 
       foreign key (game_id) 
       references games (id);

    alter table games 
       add constraint FKmxbuhhk70ebg773jn2wrkeu56 
       foreign key (author_id) 
       references teachers (id);

    alter table matching_questions 
       add constraint FK73k6q0i068k4g28aaexdcb33i 
       foreign key (id) 
       references question_games (id);

    alter table memory_card_questions 
       add constraint FKd1evavkgnslmwnrbksqqgpb4q 
       foreign key (id) 
       references question_games (id);

    alter table odd_one_out_items 
       add constraint FK808dms3iux22bhprd6j7w5tbm 
       foreign key (question_id) 
       references odd_one_out_questions (id);

    alter table odd_one_out_questions 
       add constraint FKtexl8jflmvkaatvm0vcmjx2ar 
       foreign key (id) 
       references question_games (id);

    alter table order_steps 
       add constraint FK5vh989iqpdc3qoqywgcqdu1jp 
       foreign key (question_id) 
       references ordering_questions (id);

    alter table ordering_questions 
       add constraint FKbvl4ikk02c5gdubsfj2omsx1w 
       foreign key (id) 
       references question_games (id);

    alter table participants 
       add constraint FKd9fj9qgl0laglppk9oxdrjwkp 
       foreign key (team_id) 
       references teams (id);

    alter table participants 
       add constraint FK30pagmtlh5vecwfoni1k6mfsy 
       foreign key (game_session_id) 
       references game_sessions (id);

    alter table play_interaction_details 
       add constraint FKb0owih44u3pxvidwow7c5ifl7 
       foreign key (question_id) 
       references question_games (id);

    alter table play_interaction_details 
       add constraint FKdlidcxygm0e4y2lmgkwtpv5t1 
       foreign key (participant_id) 
       references participants (id);

    alter table question_games 
       add constraint FK71djchclyfcbeyyqk5tc63cp 
       foreign key (game_id) 
       references games (id);

    alter table quiz_question_options 
       add constraint FKkl6tbgdyegw1o9agywy1xje60 
       foreign key (question_id) 
       references quiz_questions (id);

    alter table quiz_questions 
       add constraint FKjmt7w1f283fqlko6dc14ihb54 
       foreign key (id) 
       references question_games (id);

    alter table self_sessions 
       add constraint FKoskx8udkdj01m9lyyjxcbbcmx 
       foreign key (id) 
       references game_sessions (id);

    alter table solo_sessions 
       add constraint FK2v38qs0dnkjla146isccioqk 
       foreign key (id) 
       references teacher_sessions (id);

    alter table spot_the_target_questions 
       add constraint FK8va1l38t4s3f4uugckxxc4qlc 
       foreign key (id) 
       references question_games (id);

    alter table teacher_sessions 
       add constraint FK5dfk4aaxxkjhat2ion74mxkwx 
       foreign key (classroom_id) 
       references classrooms (id);

    alter table teacher_sessions 
       add constraint FKrh6mw7m76xcioujycu46tna9n 
       foreign key (teacher_id) 
       references teachers (id);

    alter table teacher_sessions 
       add constraint FKkjb14m33mtbuy0am20w9pndao 
       foreign key (id) 
       references game_sessions (id);

    alter table team_sessions 
       add constraint FKtmokthjh1h3vd4h1qm6mexa6o 
       foreign key (id) 
       references teacher_sessions (id);

    alter table teams 
       add constraint FKbip1r2ohnvcj7immsoxohtrqg 
       foreign key (team_session_id) 
       references team_sessions (id);

    alter table visual_cloze_questions 
       add constraint FKfmnv4qqsaxah1g530ap2s6laf 
       foreign key (id) 
       references question_games (id);

    alter table word_scramble_letters 
       add constraint FK3je6o5t7xhxigc9r7cw95xse2 
       foreign key (question_id) 
       references word_scramble_questions (id);

    alter table word_scramble_questions 
       add constraint FKkd6nc46iygn9q20bhcx4f11f8 
       foreign key (id) 
       references question_games (id);
