package com.aigameplatform.backend.service.narration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import java.util.Arrays;

class Mp3AudioValidatorTest {
    private final Mp3AudioValidator validator = new Mp3AudioValidator();

    @Test
    void acceptsAValidMp3WithinSizeAndDurationLimits() {
        assertThat(validator.validate(mp3Frames(20))).isBetween(0.5, 1.0);
    }

    @Test
    void acceptsAdjacentMpeg1LayerThree128KbpsFrames() {
        assertThat(validator.validate(mpeg1LayerThree128KbpsFrames(2))).isBetween(0.05, 0.06);
    }

    @Test
    void rejectsAnAudioLargerThanThePerFileLimit() {
        byte[] tooLarge = new byte[256 * 1024 + 1];
        System.arraycopy(mp3Frames(1), 0, tooLarge, 0, 104);
        assertThatThrownBy(() -> validator.validate(tooLarge))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("256 KiB");
    }

    @Test
    void rejectsNonMp3Payloads() {
        assertThatThrownBy(() -> validator.validate(new byte[] {1, 2, 3}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("MP3");
    }

    @Test
    void rejectsTruncatedMp3Frames() {
        byte[] truncated = Arrays.copyOf(mp3Frames(2), 104 + 50);

        assertThatThrownBy(() -> validator.validate(truncated))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("MP3");
    }

    @Test
    void rejectsAudioLongerThanThirtySeconds() {
        assertThatThrownBy(() -> validator.validate(mp3Frames(1150)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("30 seconds");
    }

    private static byte[] mp3Frames(int frameCount) {
        byte[] frame = new byte[104];
        frame[0] = (byte) 0xFF;
        frame[1] = (byte) 0xF3;
        frame[2] = (byte) 0x40;
        frame[3] = 0;
        byte[] result = new byte[frame.length * frameCount];
        for (int i = 0; i < frameCount; i++) System.arraycopy(frame, 0, result, i * frame.length, frame.length);
        return result;
    }

    private static byte[] mpeg1LayerThree128KbpsFrames(int frameCount) {
        byte[] frame = new byte[417];
        frame[0] = (byte) 0xFF;
        frame[1] = (byte) 0xFB;
        frame[2] = (byte) 0x90;
        frame[3] = 0x64;
        byte[] result = new byte[frame.length * frameCount];
        for (int i = 0; i < frameCount; i++) System.arraycopy(frame, 0, result, i * frame.length, frame.length);
        return result;
    }
}
