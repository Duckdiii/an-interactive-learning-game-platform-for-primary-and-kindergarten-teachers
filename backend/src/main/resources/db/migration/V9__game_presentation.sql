-- metadata.presentation của Game DSL (docs/game-json-dsl-v1.0.0.md): thế giới, vật mang đáp án, bố cục.
-- Chỉ thêm cột cho phép null; game cũ để trống và frontend tự chọn cách trình bày.
alter table games add column presentation_world varchar(20);
alter table games add column presentation_carrier varchar(20);
alter table games add column presentation_layout varchar(20);
