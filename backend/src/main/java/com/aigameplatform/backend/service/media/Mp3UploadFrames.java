package com.aigameplatform.backend.service.media;

import java.util.Arrays;

final class Mp3UploadFrames {
    private static final int[] MPEG1_LAYER3 = {0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0};
    private static final int[] MPEG2_LAYER3 = {0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0};
    private static final int[] MPEG1_SAMPLE_RATES = {44_100, 48_000, 32_000};

    private Mp3UploadFrames() {}

    /** Keeps complete MPEG Layer III frames. The transcription provider then decodes the stream. */
    static byte[] stripTags(byte[] bytes) {
        int start = 0;
        int end = bytes.length;
        if (end >= 10 && matches(bytes, 0, 'I', 'D', '3')) {
            int tagSize = 0;
            for (int index = 6; index < 10; index++) {
                int value = bytes[index] & 0xff;
                if (value > 127) return null;
                tagSize = (tagSize << 7) | value;
            }
            start = 10 + tagSize + (bytes[3] == 4 && (bytes[5] & 0x10) != 0 ? 10 : 0);
        }
        if (end - start >= 128 && matches(bytes, end - 128, 'T', 'A', 'G')) end -= 128;
        if (end - start < 4) return null;

        int frames = 0;
        for (int position = start; position < end; frames++) {
            int frameSize = frameSize(bytes, position, end);
            if (frameSize == 0) return null;
            position += frameSize;
        }
        return frames >= 2 ? Arrays.copyOfRange(bytes, start, end) : null;
    }

    private static int frameSize(byte[] bytes, int offset, int end) {
        if (end - offset < 4 || bytes[offset] != (byte) 0xff || (bytes[offset + 1] & 0xe0) != 0xe0) return 0;
        int version = (bytes[offset + 1] >>> 3) & 3;
        int layer = (bytes[offset + 1] >>> 1) & 3;
        int bitrateIndex = (bytes[offset + 2] >>> 4) & 15;
        int sampleRateIndex = (bytes[offset + 2] >>> 2) & 3;
        if (version == 1 || layer != 1 || sampleRateIndex == 3) return 0;
        boolean mpeg1 = version == 3;
        int bitrate = (mpeg1 ? MPEG1_LAYER3 : MPEG2_LAYER3)[bitrateIndex];
        if (bitrate == 0) return 0;
        int divisor = mpeg1 ? 1 : version == 2 ? 2 : 4;
        int sampleRate = MPEG1_SAMPLE_RATES[sampleRateIndex] / divisor;
        int padding = (bytes[offset + 2] >>> 1) & 1;
        int size = (mpeg1 ? 144_000 : 72_000) * bitrate / sampleRate + padding;
        return size <= end - offset ? size : 0;
    }

    private static boolean matches(byte[] bytes, int offset, char first, char second, char third) {
        return bytes[offset] == first && bytes[offset + 1] == second && bytes[offset + 2] == third;
    }
}
