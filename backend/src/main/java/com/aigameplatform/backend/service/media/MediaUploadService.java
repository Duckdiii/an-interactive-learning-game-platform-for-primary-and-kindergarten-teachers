package com.aigameplatform.backend.service.media;

import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.game.AiRequestRateLimiter;
import com.aigameplatform.backend.service.validation.ContentSafetyCheck;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ModerationUnavailableException;
import com.aigameplatform.backend.service.validation.safety.OpenAiModerationClient;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaUploadService {
    private static final String INVALID_FILE = "Tệp tải lên không đúng định dạng hỗ trợ "
            + "(Ảnh cần là dạng PNG/JPG/WebP dưới 5MB, âm thanh thuyết minh cần là dạng MP3 dưới 10MB). "
            + "Vui lòng chọn tệp tin khác.";
    private static final int IMAGE_LIMIT = 5 * 1024 * 1024;
    private static final int AUDIO_LIMIT = 10 * 1024 * 1024;

    private final MediaStorageService storage;
    private final OpenAiModerationClient moderation;
    private final ContentSafetyCheck safety;
    private final BlockedWordList blockedWords;
    private final AiRequestRateLimiter requests;
    private final SceneImagePolicy imagePolicy;

    public MediaUploadService(MediaStorageService storage, OpenAiModerationClient moderation, BlockedWordList blockedWords,
            AiRequestRateLimiter requests, SceneImagePolicy imagePolicy, ContentSafetyCheck safety) {
        this.storage = storage;
        this.moderation = moderation;
        this.safety = safety;
        this.blockedWords = blockedWords;
        this.requests = requests;
        this.imagePolicy = imagePolicy;
    }

    public UploadedMedia upload(MultipartFile file, String teacherId) {
        if (file == null || file.isEmpty() || file.getSize() > AUDIO_LIMIT) {
            throw invalid();
        }
        try (var permit = requests.acquire("media:" + teacherId); var stream = file.getInputStream()) {
            byte[] bytes = stream.readNBytes(AUDIO_LIMIT + 1);
            if (bytes.length > AUDIO_LIMIT) throw invalid();

            byte[] audio = Mp3UploadFrames.stripTags(bytes);
            if (audio != null) {
                moderateAudio(audio);
                return store(audio, "mp3", "audio/mpeg", Kind.AUDIO);
            }
            CheckedImage image = normalizeImage(bytes);
            if (safety.isUnsafe(moderation.moderateImage(image.bytes(), image.mimeType()))) throw unsafe();
            return store(image.bytes(), image.extension(), image.mimeType(), Kind.IMAGE);
        } catch (ModerationUnavailableException ex) {
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE,
                    "Chưa kiểm tra được độ an toàn của tệp. Vui lòng thử lại sau.");
        } catch (IOException ex) {
            throw invalid();
        }
    }

    private void moderateAudio(byte[] audio) {
        String transcript = moderation.transcribeMp3(audio);
        if (transcript.isBlank()) {
            throw new ApiException(ErrorCode.FILE_TOO_LARGE_OR_INVALID_FORMAT,
                    "Không nhận diện được lời đọc trong tệp MP3. Vui lòng chọn bản ghi có lời đọc rõ hơn.");
        }
        if (blockedWords.findIn(transcript).isPresent() || safety.isUnsafe(moderation.moderateTranscript(transcript))) {
            throw unsafe();
        }
    }

    private CheckedImage normalizeImage(byte[] bytes) {
        if (bytes.length == 0 || bytes.length > IMAGE_LIMIT) throw invalid();
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalid();
            var reader = readers.next();
            try {
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!format.equals("jpeg") && !format.equals("png") && !format.equals("webp")) throw invalid();
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width <= 0 || height <= 0 || width > imagePolicy.maxDimension() || height > imagePolicy.maxDimension()
                        || (long) width * height > imagePolicy.maxPixels()) throw invalid();

                // WebP is normalized to PNG so the same immutable bytes work with the scene-image validator.
                boolean jpeg = format.equals("jpeg");
                BufferedImage decoded = reader.read(0);
                if (decoded == null) throw invalid();
                BufferedImage normalized = new BufferedImage(width, height,
                        !jpeg && decoded.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
                var graphics = normalized.createGraphics();
                try {
                    graphics.drawImage(decoded, 0, 0, null);
                } finally {
                    graphics.dispose();
                }
                // Re-encoding discards original metadata, embedded payloads and animation frames before moderation.
                var output = new ByteArrayOutputStream();
                if (!ImageIO.write(normalized, jpeg ? "jpeg" : "png", output) || output.size() > imagePolicy.maxBytes()) {
                    throw invalid();
                }
                return new CheckedImage(output.toByteArray(), jpeg ? "jpg" : "png", jpeg ? "image/jpeg" : "image/png");
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException ex) {
            throw invalid();
        }
    }

    private UploadedMedia store(byte[] bytes, String extension, String mimeType, Kind kind) {
        String url = storage.upload("uploads/" + UUID.randomUUID() + "." + extension, bytes, mimeType);
        return new UploadedMedia(url, kind);
    }

    private static ApiException invalid() {
        return new ApiException(ErrorCode.FILE_TOO_LARGE_OR_INVALID_FORMAT, INVALID_FILE);
    }

    private static ApiException unsafe() {
        return new ApiException(ErrorCode.UNSAFE_CONTENT,
                "Tệp tải lên không đáp ứng tiêu chuẩn an toàn nội dung dành cho môi trường giáo dục. Vui lòng chọn tệp khác.");
    }

    private record CheckedImage(byte[] bytes, String extension, String mimeType) {}

    public record UploadedMedia(String mediaUrl, Kind mediaType) {}

    public enum Kind { IMAGE, AUDIO }
}
