-- UC-15 luồng 4-5: vai trò quyết định màn hình sau đăng nhập.
-- IF NOT EXISTS và cùng kiểu cột với V14 của nhánh admin-portal (đã áp ở DB dùng chung) để hai nhánh không xung đột.
alter table teachers
    add column if not exists role varchar(50) not null default 'ROLE_TEACHER';
