-- Refresh tokens are stored hashed (SHA-256, hex). family_id groups tokens that descend
-- from the same login so a reused (already revoked) token can revoke the whole family.
create table refresh_tokens (
    id varchar(255) not null,
    teacher_id varchar(255) not null,
    token_hash varchar(64) not null unique,
    family_id varchar(255) not null,
    expires_at timestamp(6) not null,
    revoked_at timestamp(6),
    created_at timestamp(6) not null,
    primary key (id)
);

alter table refresh_tokens
    add constraint fk_refresh_tokens_teacher
    foreign key (teacher_id)
    references teachers (id)
    on delete cascade;

create index idx_refresh_tokens_family_id on refresh_tokens (family_id);
create index idx_refresh_tokens_teacher_id on refresh_tokens (teacher_id);
