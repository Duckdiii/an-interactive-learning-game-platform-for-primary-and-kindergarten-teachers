-- UC-15 luồng 4b/4c và 3a: khóa tài khoản (bởi quản trị viên), khóa tạm khi đăng nhập sai liên tiếp,
-- và "ghi nhớ đăng nhập" (refresh token 30 ngày, giữ nguyên qua mỗi lần xoay vòng).
alter table teachers
    add column status varchar(255) not null default 'ACTIVE' check ((status in ('ACTIVE','LOCKED')));
alter table teachers
    add column failed_login_attempts integer not null default 0;
alter table teachers
    add column login_locked_until timestamp(6);

alter table refresh_tokens
    add column remember_me boolean not null default false;
