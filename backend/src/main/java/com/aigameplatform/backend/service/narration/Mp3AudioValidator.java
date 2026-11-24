package com.aigameplatform.backend.service.narration;

import org.springframework.stereotype.Component;

/** Validates the encoded size and MPEG audio frame duration of a generated MP3. */
@Component
public final class Mp3AudioValidator {
    public static final int MAX_FILE_BYTES = 256 * 1024;
    public static final double MAX_DURATION_SECONDS = 30.0;

    private static final int[][] MPEG1_LAYER_III_KBPS = {
            {}, {32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320},
    };
    private static final int[] MPEG2_LAYER_III_KBPS = {
            0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
    };
    private static final int[] MPEG1_SAMPLE_RATES = {44_100, 48_000, 32_000};

    public double validate(byte[] audio) {
        if (audio == null || audio.length == 0) throw new IllegalArgumentException("TTS response is empty");
        if (audio.length > MAX_FILE_BYTES) throw new IllegalArgumentException("MP3 exceeds 256 KiB per file");

        int offset = skipId3Tag(audio);
        double duration = 0;
        int frames = 0;
        while (offset + 4 <= audio.length) {
            if (isId3v1Tag(audio, offset)) break;
            Mp3Frame frame = parseFrame(audio, offset);
            if (frame == null || offset + frame.frameLength() > audio.length)
                throw new IllegalArgumentException("TTS response contains an invalid or truncated MP3 frame");
            duration += (double) frame.samplesPerFrame() / frame.sampleRate();
            if (duration > MAX_DURATION_SECONDS)
                throw new IllegalArgumentException("MP3 exceeds 30 seconds per file");
            frames++;
            offset += frame.frameLength();
        }
        if (offset < audio.length && !isId3v1Tag(audio, offset))
            throw new IllegalArgumentException("TTS response contains trailing bytes outside the MP3 stream");
        if (frames == 0) throw new IllegalArgumentException("TTS response is not a valid MP3");
        return duration;
    }

    private static int skipId3Tag(byte[] audio) {
        if (audio.length < 10 || audio[0] != 'I' || audio[1] != 'D' || audio[2] != '3') return 0;
        int size = ((audio[6] & 0x7F) << 21) | ((audio[7] & 0x7F) << 14)
                | ((audio[8] & 0x7F) << 7) | (audio[9] & 0x7F);
        return Math.min(audio.length, 10 + size);
    }

    private static boolean isId3v1Tag(byte[] audio, int offset) {
        return audio.length - offset == 128 && audio[offset] == 'T' && audio[offset + 1] == 'A'
                && audio[offset + 2] == 'G';
    }

    private static Mp3Frame parseFrame(byte[] audio, int offset) {
        int first = audio[offset] & 0xFF;
        int second = audio[offset + 1] & 0xFF;
        if (first != 0xFF || (second & 0xE0) != 0xE0) return null;

        int version = (second >> 3) & 0x03;
        int layer = (second >> 1) & 0x03;
        int third = audio[offset + 2] & 0xFF;
        int bitrateIndex = (third >> 4) & 0x0F;
        int sampleRateIndex = (third >> 2) & 0x03;
        if (version == 1 || layer != 1 || bitrateIndex == 0 || bitrateIndex == 15 || sampleRateIndex == 3)
            return null;

        int bitrate = version == 3 ? MPEG1_LAYER_III_KBPS[1][bitrateIndex] : MPEG2_LAYER_III_KBPS[bitrateIndex];
        int sampleRate = MPEG1_SAMPLE_RATES[sampleRateIndex] / (version == 3 ? 1 : version == 2 ? 2 : 4);
        int padding = (third >> 1) & 0x01;
        int frameLength = (version == 3 ? 144 : 72) * bitrate * 1000 / sampleRate + padding;
        return new Mp3Frame(frameLength, sampleRate, version == 3 ? 1152 : 576);
    }

    private record Mp3Frame(int frameLength, int sampleRate, int samplesPerFrame) { }
}
