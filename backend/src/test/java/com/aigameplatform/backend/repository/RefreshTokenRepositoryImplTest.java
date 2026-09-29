package com.aigameplatform.backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Chỉ kiểm tra hàm băm khóa (thuần, không cần DB); {@code lockFamily} tự nó cần Postgres thật để kiểm chứng. */
class RefreshTokenRepositoryImplTest {

    @Test
    void sameFamilyIdAlwaysGivesTheSameKey() {
        assertThat(RefreshTokenRepositoryImpl.lockKeyFor("family-1"))
                .isEqualTo(RefreshTokenRepositoryImpl.lockKeyFor("family-1"));
    }

    @Test
    void differentFamilyIdsUsuallyGiveDifferentKeys() {
        assertThat(RefreshTokenRepositoryImpl.lockKeyFor("family-1"))
                .isNotEqualTo(RefreshTokenRepositoryImpl.lockKeyFor("family-2"));
    }
}
