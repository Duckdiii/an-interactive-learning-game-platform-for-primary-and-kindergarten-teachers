alter table question_games add column retired boolean not null default false;

alter table edit_logs add column game_id varchar(255);
alter table edit_logs add column editor_teacher_id varchar(255);
alter table edit_logs add column changed_paths text not null default '[]';

update edit_logs
set game_id = question_games.game_id
from question_games
where edit_logs.question_id = question_games.id;

alter table edit_logs alter column game_id set not null;
alter table edit_logs add constraint fk_edit_log_game foreign key (game_id) references games (id) on delete cascade;
create index ix_edit_logs_game_id on edit_logs (game_id);

alter table edit_logs drop constraint FKg6jx4dhbnpa7fx3aawn4r95u8;
alter table edit_logs alter column question_id drop not null;
alter table edit_logs add constraint fk_edit_log_question foreign key (question_id) references question_games (id) on delete set null;
