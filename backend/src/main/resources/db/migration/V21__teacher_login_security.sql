-- UC-15 luồng 4b/4c và 3a: khóa tài khoản (bởi quản trị viên), khóa tạm khi đăng nhập sai liên tiếp,
-- và "ghi nhớ đăng nhập" (refresh token 30 ngày, giữ nguyên qua mỗi lần xoay vòng).
-- IF NOT EXISTS: V14 của nhánh admin-portal (đã áp ở DB dùng chung) cũng thêm teachers.status cùng giá trị ACTIVE/LOCKED.
alter table teachers
    add column if not exists status varchar(255) not null default 'ACTIVE' check ((status in ('ACTIVE','LOCKED')));
alter table teachers
    add column if not exists failed_login_attempts integer not null default 0;
alter table teachers
    add column if not exists login_locked_until timestamp(6);

alter table refresh_tokens
    add column if not exists remember_me boolean not null default false;
