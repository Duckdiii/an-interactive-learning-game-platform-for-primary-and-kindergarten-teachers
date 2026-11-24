package com.aigameplatform.backend.service.lesson;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.game.AiRequestRateLimiter;
import com.aigameplatform.backend.exception.RateLimitedException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.web.MockMultipartFile;

class LessonPreparationServiceTest {
    private final TeacherRepository teachers = mock(TeacherRepository.class);
    private final LessonDocumentExtractor extractor = mock(LessonDocumentExtractor.class);
    private final GameInputGuard guard = mock(GameInputGuard.class);
    private final LessonIntentResolver resolver = mock(LessonIntentResolver.class);
    private final AiRequestRateLimiter limiter = mock(AiRequestRateLimiter.class);
    @SuppressWarnings("unchecked")
    private final ObjectProvider<LessonIntentResolver> resolverProvider = mock(ObjectProvider.class);
    private final LessonPreparationService service = new LessonPreparationService(teachers, extractor, guard, resolverProvider, limiter);
    private final AuthenticatedTeacher principal = new AuthenticatedTeacher("teacher-1", "teacher@example.edu", "session-1");
    private final MockMultipartFile file = new MockMultipartFile("file", "lesson.docx", "application/octet-stream", new byte[]{1});

    LessonPreparationServiceTest() {
        when(resolverProvider.getIfAvailable()).thenReturn(resolver);
        when(limiter.acquire(anyString())).thenReturn(() -> { });
    }

    @Test void authenticatesAndResolvesTeacherBeforeParsing() {
        assertCode("UNAUTHORIZED", () -> service.prepare(Subject.MATH, GradeLevel.GRADE_1, null, file, null));
        verifyNoInteractions(extractor, guard, resolver);
        when(teachers.findById("teacher-1")).thenReturn(Optional.empty());
        assertCode("UNAUTHORIZED", () -> service.prepare(Subject.MATH, GradeLevel.GRADE_1, null, file, principal));
        verifyNoInteractions(extractor, guard, resolver);
    }

    @Test void checksInputPreservesExplicitTeacherScopeAndReturnsOnlyPreparedIdea() {
        Teacher teacher = new Teacher(); when(teachers.findById("teacher-1")).thenReturn(Optional.of(teacher));
        when(extractor.extract(file)).thenReturn(new ExtractedLesson("Bài đếm số từ 1 đến 10"));
        when(resolver.resolve(Subject.MATH, GradeLevel.GRADE_1, "Dạy đếm trong phạm vi 1 đến 5", "Bài đếm số từ 1 đến 10"))
                .thenReturn(new LessonIntentResolver.Resolution(LessonIntentResolver.Status.READY,
                        "Dạy bé đếm số lượng trong phạm vi 1 đến 5 bằng hình ảnh."));
        var result = service.prepare(Subject.MATH, GradeLevel.GRADE_1, "Dạy đếm trong phạm vi 1 đến 5", file, principal);
        assertThat(result.idea()).contains("1 đến 5");
        verify(guard).requireSafe("Dạy đếm trong phạm vi 1 đến 5", "Bài đếm số từ 1 đến 10");
        verify(resolver).resolve(Subject.MATH, GradeLevel.GRADE_1,
                "Dạy đếm trong phạm vi 1 đến 5", "Bài đếm số từ 1 đến 10");
    }

    @Test void requestsClarificationWhenLessonIsAmbiguous() {
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(new Teacher()));
        when(extractor.extract(file)).thenReturn(new ExtractedLesson("Nhiều bài thuộc các tuần khác nhau"));
        when(resolver.resolve(any(), any(), any(), any())).thenReturn(
                new LessonIntentResolver.Resolution(LessonIntentResolver.Status.CLARIFICATION_REQUIRED, ""));
        assertCode("LESSON_CLARIFICATION_REQUIRED", () -> service.prepare(Subject.MATH, GradeLevel.GRADE_1, null, file, principal));
    }

    @Test void reportsServiceUnavailableWhenGeminiPreparationIsDisabled() {
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(new Teacher()));
        when(extractor.extract(file)).thenReturn(new ExtractedLesson("Văn bản bài học đủ dài để phân tích"));
        when(resolverProvider.getIfAvailable()).thenReturn(null);

        assertCode("LESSON_PROCESSING_UNAVAILABLE", () -> service.prepare(Subject.MATH, GradeLevel.GRADE_1, null, file, principal));
        verifyNoInteractions(resolver);
    }

    @Test void neverAcceptsResolverOutputOutsideGenerateIdeaLimits() {
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(new Teacher()));
        when(extractor.extract(file)).thenReturn(new ExtractedLesson("Văn bản bài học"));
        when(resolver.resolve(any(), any(), any(), any())).thenReturn(
                new LessonIntentResolver.Resolution(LessonIntentResolver.Status.READY, "ngắn"));
        assertCode("AI_GENERATION_TIMEOUT", () -> service.prepare(Subject.MATH, GradeLevel.GRADE_1, null, file, principal));
        verify(guard).requireSafe(null, "Văn bản bài học");
    }

    @Test void rejectsIdeaOutsidePublishedRange() {
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(new Teacher()));
        assertCode("VALIDATION_ERROR", () -> service.prepare(Subject.MATH, GradeLevel.GRADE_1, "too short", file, principal));
        verifyNoInteractions(extractor, guard, resolver);
    }

    @Test void enforcesPerTeacherAiRateLimitBeforeCallingGemini() {
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(new Teacher()));
        when(extractor.extract(file)).thenReturn(new ExtractedLesson("Bài học có văn bản đủ dài để phân tích."));
        when(resolver.resolve(any(), any(), any(), any())).thenReturn(
                new LessonIntentResolver.Resolution(LessonIntentResolver.Status.READY,
                        "Mô tả bài học đủ dài để tạo trò chơi tương tác cho học sinh."));
        doThrow(new RateLimitedException("Đã gửi quá nhiều yêu cầu", 12)).when(limiter).acquire("teacher-1");

        assertThatThrownBy(() -> service.prepare(Subject.MATH, GradeLevel.GRADE_1, null, file, principal))
                .isInstanceOf(RateLimitedException.class);
        verify(limiter).acquire("teacher-1");
        verifyNoInteractions(guard, resolver);
    }

    @Test void preparationSharesTheTenRequestsPerMinuteTeacherBudget() {
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(new Teacher()));
        when(extractor.extract(file)).thenReturn(new ExtractedLesson("Bài học có văn bản đủ dài để phân tích."));
        when(resolver.resolve(any(), any(), any(), any())).thenReturn(
                new LessonIntentResolver.Resolution(LessonIntentResolver.Status.READY,
                        "Mô tả bài học đủ dài để tạo trò chơi tương tác cho học sinh."));
        var actualLimiter = new AiRequestRateLimiter(java.time.Clock.systemUTC());
        var limitedService = new LessonPreparationService(teachers, extractor, guard, resolverProvider, actualLimiter);

        for (int i = 0; i < 10; i++)
            limitedService.prepare(Subject.MATH, GradeLevel.GRADE_1, null, file, principal);

        assertThatThrownBy(() -> limitedService.prepare(Subject.MATH, GradeLevel.GRADE_1, null, file, principal))
                .isInstanceOf(RateLimitedException.class);
        verify(resolver, times(10)).resolve(any(), any(), any(), any());
    }

    private static void assertCode(String code, org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOf(ApiException.class)
                .satisfies(error -> assertThat(((ApiException)error).getErrorCode().name()).isEqualTo(code));
    }
}
