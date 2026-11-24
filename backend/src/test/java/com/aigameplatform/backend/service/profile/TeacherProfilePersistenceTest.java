package com.aigameplatform.backend.service.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.db.AbstractPostgresTest;
import com.aigameplatform.backend.dto.classroom.ClassroomLearningProfile;
import com.aigameplatform.backend.dto.classroom.ClassroomRequest;
import com.aigameplatform.backend.dto.media.SpeechVoice;
import com.aigameplatform.backend.dto.profile.TeacherProfileInput;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.classroom.ClassroomService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class TeacherProfilePersistenceTest extends AbstractPostgresTest {

    @Autowired TeacherRepository teachers;
    @Autowired TeacherProfileService profiles;
    @Autowired ClassroomService classrooms;

    @Test
    void profileAndSuggestionsPersistSeparatelyForEachTeacherAndResetKeepsTheClasses() {
        String owner = teacher();
        String other = teacher();
        assertThat(profiles.get(owner).school()).isEqualTo("Trường đăng ký");
        var profile = new TeacherProfileInput("Hoa Mai", "Kết nối tri thức", SpeechVoice.MALE, Subject.MATH, GradeLevel.GRADE_1);
        profiles.save(owner, profile);
        assertThat(profiles.get(owner)).isEqualTo(profile);
        assertThat(profiles.get(other).subject()).isNull();

        var one = profiles.remember(owner, "  Phép cộng  ");
        assertThat(profiles.remember(owner, "Phép cộng")).isEqualTo(one);
        var two = profiles.remember(owner, "Hình tròn");
        var otherTopic = profiles.remember(other, "Số đếm");
        profiles.forget(other, one.id());
        assertThat(profiles.suggestions(owner)).containsExactlyInAnyOrder(one, two);
        profiles.forget(owner, one.id());
        assertThat(profiles.suggestions(owner)).containsExactly(two);
        profiles.forget(owner, null);
        assertThat(profiles.suggestions(owner)).isEmpty();
        profiles.remember(owner, "Hình vuông");

        var learning = new ClassroomLearningProfile(GradeLevel.GRADE_1, 24, "Đếm trong phạm vi 10", "Thích làm theo nhóm", "Động vật");
        var classroom = classrooms.create(owner, new ClassroomRequest("Lớp 1A", null, null, learning));
        classrooms.update(owner, classroom.classroomId(), new ClassroomRequest("Lớp 1A mới", null, null));
        assertThat(classrooms.list(owner).getFirst().learningProfile()).isEqualTo(learning);
        assertThat(classrooms.generationContext(owner, classroom.classroomId(), GradeLevel.GRADE_1))
                .contains("Sĩ số: 24", "Đếm trong phạm vi 10", "Động vật").doesNotContain("Lớp 1A");
        assertThatThrownBy(() -> classrooms.generationContext(other, classroom.classroomId(), GradeLevel.GRADE_1))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
        assertThatThrownBy(() -> classrooms.generationContext(owner, classroom.classroomId(), GradeLevel.GRADE_2))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));

        profiles.delete(owner);
        assertThat(profiles.get(owner)).isEqualTo(new TeacherProfileInput("Trường đăng ký", null, null, null, null));
        assertThat(profiles.suggestions(owner)).isEmpty();
        assertThat(profiles.suggestions(other)).containsExactly(otherTopic);
        assertThat(classrooms.list(owner)).hasSize(1);
    }

    private String teacher() {
        Teacher teacher = new Teacher();
        teacher.setEmail(UUID.randomUUID() + "@example.test");
        teacher.setFullName("Giáo viên");
        teacher.setSchool("Trường đăng ký");
        teacher.setPasswordHash("unused");
        return teachers.saveAndFlush(teacher).getId();
    }
}
