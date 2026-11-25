package com.aigameplatform.backend.service.lesson;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.web.MockMultipartFile;

class LessonPreparationServiceTest {
    private final TeacherRepository teachers = mock(TeacherRepository.class);
    private final LessonDocumentExtractor extractor = mock(LessonDocumentExtractor.class);
    private final GameInputGuard guard = mock(GameInputGuard.class);
    private final LessonIntentResolver resolver = mock(LessonIntentResolver.class);
    @SuppressWarnings("unchecked")
    private final ObjectProvider<LessonIntentResolver> resolverProvider = mock(ObjectProvider.class);
    private final LessonPreparationService service = new LessonPreparationService(teachers, extractor, guard, resolverProvider);
    private final AuthenticatedTeacher principal = new AuthenticatedTeacher("teacher-1", "teacher@example.edu", "session-1");
    private final MockMultipartFile file = new MockMultipartFile("file", "lesson.docx", "application/octet-stream", new byte[]{1});

    LessonPreparationServiceTest() { when(resolverProvider.getIfAvailable()).thenReturn(resolver); }

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

    private static void assertCode(String code, org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOf(ApiException.class)
                .satisfies(error -> assertThat(((ApiException)error).getErrorCode().name()).isEqualTo(code));
    }
}
