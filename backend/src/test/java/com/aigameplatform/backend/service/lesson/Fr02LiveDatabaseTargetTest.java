package com.aigameplatform.backend.service.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class Fr02LiveDatabaseTargetTest {
    @Test
    void acceptsOnlyAllowlistedSupabaseDirectOrSessionPoolerHosts() {
        assertThat(Fr02LiveDatabaseTarget.isAllowed(
                "jdbc:postgresql://db.project-ref.supabase.co:5432/postgres", "db.project-ref.supabase.co"))
                .isTrue();
        assertThat(Fr02LiveDatabaseTarget.isAllowed(
                "jdbc:postgresql://aws-1-us-east-1.pooler.supabase.com:5432/postgres",
                "aws-1-us-east-1.pooler.supabase.com"))
                .isTrue();
    }

    @Test
    void rejectsNonSupabaseHostsEvenWhenAnotherUrlPartContainsSupabase() {
        assertThat(Fr02LiveDatabaseTarget.isAllowed(
                "jdbc:postgresql://db.example.net/postgres?application_name=supabase", "db.example.net"))
                .isFalse();
    }

    @Test
    void rejectsTransactionPoolerPortAndUnexpectedHosts() {
        assertThat(Fr02LiveDatabaseTarget.isAllowed(
                "jdbc:postgresql://aws-1-us-east-1.pooler.supabase.com:6543/postgres",
                "aws-1-us-east-1.pooler.supabase.com"))
                .isFalse();
        assertThat(Fr02LiveDatabaseTarget.isAllowed(
                "jdbc:postgresql://db.project-ref.supabase.co:5432/postgres", "db.other-project.supabase.co"))
                .isFalse();
    }
}
