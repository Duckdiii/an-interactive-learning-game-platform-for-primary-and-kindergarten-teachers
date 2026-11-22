-- Cho phép trạng thái IN_PROGRESS (StudentPlayService). Trước đây là V9 trên main; DB dùng chung chưa từng áp.

alter table play_interaction_details
    drop constraint if exists play_interaction_details_status_check;

alter table play_interaction_details
    add constraint play_interaction_details_status_check
        check (status in ('CORRECT', 'INCORRECT', 'SKIPPED', 'TIMEOUT', 'IN_PROGRESS'));
