alter table play_interaction_details
    drop constraint play_interaction_details_status_check;

alter table play_interaction_details
    add constraint play_interaction_details_status_check
        check (status in ('CORRECT', 'INCORRECT', 'SKIPPED', 'TIMEOUT', 'IN_PROGRESS'));
