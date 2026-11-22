-- Game ngoài danh mục (gameType CUSTOM, CPF Game v2.0.0; docs/cpf-game-v2.0.0.md mục 7, phương án B):
-- mỗi game CUSTOM có đúng một câu hỏi CpfQuestion (subclass JOINED của QuestionGame) giữ toàn bộ JSON đã kiểm duyệt.
-- Chỉ thêm, không đổi dữ liệu cũ.

-- 1. Cho phép CUSTOM. Ràng buộc V2 viết inline nên Postgres đặt tên games_game_type_check.
alter table games drop constraint if exists games_game_type_check;
alter table games
    add constraint games_game_type_check
    check (game_type in ('MATCHING', 'QUIZ', 'MEMORY_CARD', 'DRAG_DROP', 'ORDERING', 'WORD_SCRAMBLE',
                         'ODD_ONE_OUT', 'VISUAL_CLOZE', 'AUDIO_VISUAL_MATCH', 'SPOT_THE_TARGET', 'CUSTOM'));

-- 2. Bảng con của question_games cho CPF.
create table cpf_questions (
    id varchar(255) not null,
    payload jsonb not null check (jsonb_typeof(payload) = 'object'),
    primary key (id)
);

alter table cpf_questions
    add constraint fk_cpf_questions_question
    foreign key (id) references question_games (id);
