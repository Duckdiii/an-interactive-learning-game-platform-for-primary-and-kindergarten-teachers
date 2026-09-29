package com.aigameplatform.backend.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RefreshTokenCodecTest {

    private final RefreshTokenCodec codec = new RefreshTokenCodec();

    @Test
    void generatesUrlSafeTokenOf256Bits() {
        String token = codec.generate();

        // 32 byte -> 43 ký tự Base64 URL không padding.
        assertThat(token).hasSize(43).matches("[A-Za-z0-9_-]+");
    }

    @Test
    void generatesDifferentTokensEachTime() {
        Set<String> tokens = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            tokens.add(codec.generate());
        }

        assertThat(tokens).hasSize(1000);
    }

    @Test
    void hashesWithSha256AsHex() {
        // Vector chuẩn của SHA-256("abc").
        assertThat(codec.hash("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    @Test
    void hashIsDeterministicAndDiffersFromToken() {
        String token = codec.generate();

        assertThat(codec.hash(token)).isEqualTo(codec.hash(token)).hasSize(64).isNotEqualTo(token);
    }
}
