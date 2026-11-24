package com.aigameplatform.backend.service.lesson;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LessonPreparationService {
    public static final int IDEA_MIN_LENGTH = 10;
    public static final int IDEA_MAX_LENGTH = 2_000;
    private final TeacherRepository teachers;
    private final LessonDocumentExtractor extractor;
    private final GameInputGuard inputGuard;
    private final ObjectProvider<LessonIntentResolver> resolver;

    @Autowired
    public LessonPreparationService(TeacherRepository teachers, LessonDocumentExtractor extractor,
            GameInputGuard inputGuard, ObjectProvider<LessonIntentResolver> resolver) {
        this.teachers = teachers; this.extractor = extractor; this.inputGuard = inputGuard; this.resolver = resolver;
    }

    public PreparedLesson prepare(Subject subject, GradeLevel gradeLevel, String idea, MultipartFile file,
            AuthenticatedTeacher principal) {
        if (principal == null || principal.teacherId() == null
                || teachers.findById(principal.teacherId()).isEmpty())
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Authentication required");
        if (subject == null || gradeLevel == null || file == null || file.isEmpty())
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Môn học, khối lớp và tệp giáo án là bắt buộc.");
        String normalizedIdea = idea == null || idea.isBlank() ? null : idea.strip();
        if (normalizedIdea != null && (normalizedIdea.length() < IDEA_MIN_LENGTH || normalizedIdea.length() > IDEA_MAX_LENGTH))
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Ý tưởng phải có từ 10 đến 2.000 ký tự.");

        String lessonText = extractor.extract(file).text();
        inputGuard.requireSafe(normalizedIdea, lessonText);
        LessonIntentResolver intentResolver = resolver.getIfAvailable();
        if (intentResolver == null)
            throw new ApiException(ErrorCode.LESSON_PROCESSING_UNAVAILABLE, "Dịch vụ AI chưa sẵn sàng để phân tích giáo án. Vui lòng thử lại sau.");
        LessonIntentResolver.Resolution result;
        try {
            result = intentResolver.resolve(subject, gradeLevel, normalizedIdea, lessonText);
        } catch (ApiException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new ApiException(ErrorCode.AI_GENERATION_TIMEOUT,
                    "Chưa phân tích được giáo án. Ý tưởng của bạn vẫn còn trên trang; vui lòng thử lại sau.");
        }
        if (result == null || result.status() == null)
            throw new ApiException(ErrorCode.AI_GENERATION_TIMEOUT, "AI chưa trả về kết quả phân tích hợp lệ. Vui lòng thử lại.");
        if (result.status() == LessonIntentResolver.Status.CLARIFICATION_REQUIRED)
            throw new ApiException(ErrorCode.LESSON_CLARIFICATION_REQUIRED,
                    "Chưa xác định được một mục tiêu học tập rõ ràng từ giáo án. Hãy bổ sung bài học hoặc phạm vi muốn dùng.");
        String prepared = result.preparedIdea() == null ? "" : result.preparedIdea().strip();
        if (prepared.length() < IDEA_MIN_LENGTH || prepared.length() > IDEA_MAX_LENGTH)
            throw new ApiException(ErrorCode.AI_GENERATION_TIMEOUT, "AI chưa tạo được mô tả bài học hợp lệ. Vui lòng thử lại.");
        // Recheck generated text before returning it to the browser. Generate will recheck again after teacher edits.
        inputGuard.requireSafe(prepared, null);
        return new PreparedLesson(prepared);
    }
}
