package com.aigameplatform.backend.service.classroom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.classroom.ClassroomRequest;
import com.aigameplatform.backend.entity.Classroom;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.repository.ClassroomRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ClassroomServiceTest {

    private final ClassroomRepository classrooms = mock(ClassroomRepository.class);
    private final TeacherRepository teachers = mock(TeacherRepository.class);
    private final ClassroomService service =
            new ClassroomService(classrooms, teachers, new BlockedWordList(List.of("xấu")));
    private Teacher teacher;

    @BeforeEach
    void setUp() {
        teacher = new Teacher();
        teacher.setId("teacher-1");
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(teacher));
        when(classrooms.save(any(Classroom.class))).thenAnswer(invocation -> {
            Classroom saved = invocation.getArgument(0);
            if (saved.getId() == null) saved.setId("class-1");
            return saved;
        });
    }

    private static Classroom classroom(String id, String name) {
        Classroom classroom = new Classroom();
        classroom.setId(id);
        classroom.setClassName(name);
        return classroom;
    }

    @Test
    void listReturnsTheTeachersClassrooms() {
        when(classrooms.findAllByTeacherId("teacher-1")).thenReturn(List.of(classroom("c1", "1A"), classroom("c2", "1B")));

        assertThat(service.list("teacher-1")).extracting(c -> c.className()).containsExactly("1A", "1B");
    }

    @Test
    void createTrimsTextTurnsBlankIntoNullAndLinksTheClassroomToTheTeacher() {
        var created = service.create("teacher-1", new ClassroomRequest("  Lớp 1A ", "  ", " Trường Hoa Mai "));

        assertThat(created.classroomId()).isEqualTo("class-1");
        assertThat(created.className()).isEqualTo("Lớp 1A");
        assertThat(created.schoolYear()).isNull();
        assertThat(created.schoolName()).isEqualTo("Trường Hoa Mai");
        assertThat(teacher.getClassrooms()).extracting(Classroom::getId).containsExactly("class-1");
        verify(teachers).save(teacher);
    }

    @Test
    void unsafeTextIsRejectedAndNothingIsSaved() {
        assertThatThrownBy(() -> service.create("teacher-1", new ClassroomRequest("Lớp xấu", null, null)))
                .isInstanceOf(UnsafeContentException.class);
        assertThatThrownBy(() -> service.create("teacher-1", new ClassroomRequest("Lớp 1A", null, "trường xấu")))
                .isInstanceOf(UnsafeContentException.class);

        verify(classrooms, never()).save(any(Classroom.class));
    }

    @Test
    void updateChangesOnlyAClassroomOfTheTeacher() {
        Classroom existing = classroom("c1", "1A");
        when(classrooms.findByIdAndTeacherId("c1", "teacher-1")).thenReturn(Optional.of(existing));

        var updated = service.update("teacher-1", "c1", new ClassroomRequest("1A mới", "2026-2027", null));

        assertThat(updated.className()).isEqualTo("1A mới");
        assertThat(updated.schoolYear()).isEqualTo("2026-2027");
    }

    @Test
    void someoneElsesClassroomIsNotFoundForUpdateAndDelete() {
        when(classrooms.findByIdAndTeacherId("c9", "teacher-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update("teacher-1", "c9", new ClassroomRequest("X", null, null)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
        assertThatThrownBy(() -> service.delete("teacher-1", "c9"))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
        verify(classrooms, never()).delete(any(Classroom.class));
        verify(classrooms, never()).detachSessions(any());
    }

    @Test
    void deleteDetachesSessionsBeforeRemovingTheClassroom() {
        Classroom existing = classroom("c1", "1A");
        teacher.getClassrooms().add(existing);
        when(classrooms.findByIdAndTeacherId("c1", "teacher-1")).thenReturn(Optional.of(existing));

        service.delete("teacher-1", "c1");

        var order = org.mockito.Mockito.inOrder(classrooms);
        order.verify(classrooms).detachSessions("c1");
        order.verify(classrooms).delete(existing);
        assertThat(teacher.getClassrooms()).isEmpty();
    }

    @Test
    void createIsRefusedOnceTheTeacherHasTheMaximumNumberOfClassrooms() {
        for (int i = 0; i < ClassroomService.MAX_CLASSROOMS; i++) teacher.getClassrooms().add(classroom("c" + i, "L" + i));

        assertThatThrownBy(() -> service.create("teacher-1", new ClassroomRequest("Thêm một lớp", null, null)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT));
        verify(classrooms, never()).save(any(Classroom.class));
    }

    @Test
    void updatingSomeoneElsesClassroomIs404EvenWhenTheTextIsUnsafe() {
        when(classrooms.findByIdAndTeacherId("c9", "teacher-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update("teacher-1", "c9", new ClassroomRequest("Lớp xấu", null, null)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }

    @Test
    void ownedRequiresALoggedInTeacher() {
        assertThatThrownBy(() -> service.owned(null, "c1"))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED));
    }
}
