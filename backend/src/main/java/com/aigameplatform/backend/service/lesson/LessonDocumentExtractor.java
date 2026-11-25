package com.aigameplatform.backend.service.lesson;

import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import java.io.IOException;
import java.util.Locale;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class LessonDocumentExtractor {
    public static final int MAX_FILE_BYTES = 10 * 1024 * 1024;
    public static final int MAX_TEXT_CHARS = 20_000;
    private final LessonParserProcess process;

    public LessonDocumentExtractor(LessonParserProcess process) { this.process = process; }

    public ExtractedLesson extract(MultipartFile file) {
        if (file == null || file.isEmpty()) throw invalid("Giáo án không có nội dung. Vui lòng chọn tệp khác.");
        if (file.getSize() > MAX_FILE_BYTES) throw invalid("Tệp tài liệu vượt quá dung lượng cho phép (tối đa 10MB).");
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String type = name.endsWith(".pdf") ? "pdf" : name.endsWith(".docx") ? "docx" : null;
        if (type == null) throw invalid("Vui lòng gửi file docx hoặc pdf.");
        try (var stream = file.getInputStream()) {
            byte[] bytes = stream.readNBytes(MAX_FILE_BYTES + 1);
            if (bytes.length > MAX_FILE_BYTES) throw invalid("Tệp tài liệu vượt quá dung lượng cho phép (tối đa 10MB).");
            return new ExtractedLesson(process.parse(bytes, type));
        } catch (IOException e) {
            throw invalid("Không đọc được tệp giáo án. Vui lòng chọn lại tệp.");
        }
    }

    static ApiException invalid(String message) {
        return new ApiException(ErrorCode.FILE_TOO_LARGE_OR_INVALID_FORMAT, message);
    }
}
