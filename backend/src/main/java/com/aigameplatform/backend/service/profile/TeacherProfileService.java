package com.aigameplatform.backend.service.profile;

import com.aigameplatform.backend.dto.profile.TeacherProfileInput;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.UserRole;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeacherProfileService {

    private static final int MAX_SUGGESTIONS = 20;

    private final TeacherRepository teachers;
    private final BlockedWordList blockedWords;

    public TeacherProfileService(TeacherRepository teachers, BlockedWordList blockedWords) {
        this.teachers = teachers;
        this.blockedWords = blockedWords;
    }

    @Transactional(readOnly = true)
    public TeacherProfileInput get(String teacherId) {
        return profileOf(teachers.findByIdAndRole(teacherId, UserRole.ROLE_TEACHER).orElseThrow(TeacherProfileService::unauthorized));
    }

    @Transactional
    public TeacherProfileInput save(String teacherId, TeacherProfileInput input) {
        safe(input.school());
        safe(input.textbook());
        Teacher teacher = lockedTeacher(teacherId);
        teacher.setProfileSchool(input.school() == null ? "" : input.school().strip());
        teacher.setTextbook(blankToNull(input.textbook()));
        teacher.setPreferredVoice(input.voice());
        teacher.setPreferredSubject(input.subject());
        teacher.setPreferredGradeLevel(input.gradeLevel());
        return profileOf(teacher);
    }

    @Transactional
    public void delete(String teacherId) {
        Teacher teacher = lockedTeacher(teacherId);
        teacher.setProfileSchool(null);
        teacher.setTextbook(null);
        teacher.setPreferredVoice(null);
        teacher.setPreferredSubject(null);
        teacher.setPreferredGradeLevel(null);
        teacher.getSuggestions().clear();
    }

    @Transactional(readOnly = true)
    public List<Suggestion> suggestions(String teacherId) {
        var teacher = teachers.findByIdAndRole(teacherId, UserRole.ROLE_TEACHER).orElseThrow(TeacherProfileService::unauthorized);
        return teacher.getSuggestions().entrySet().stream()
                .map(entry -> new Suggestion(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(Suggestion::topic).thenComparing(Suggestion::id))
                .toList();
    }

    @Transactional
    public Suggestion remember(String teacherId, String topic) {
        String normalized = topic.strip();
        safe(normalized);
        var suggestions = lockedTeacher(teacherId).getSuggestions();
        return suggestions.entrySet().stream().filter(entry -> entry.getValue().equals(normalized)).findFirst()
                .map(entry -> new Suggestion(entry.getKey(), entry.getValue()))
                .orElseGet(() -> {
                    if (suggestions.size() >= MAX_SUGGESTIONS) {
                        throw new ApiException(ErrorCode.CONFLICT, "Đã lưu tối đa 20 gợi ý. Hãy xóa một gợi ý trước.");
                    }
                    String id = UUID.randomUUID().toString();
                    suggestions.put(id, normalized);
                    return new Suggestion(id, normalized);
                });
    }

    @Transactional
    public void forget(String teacherId, String id) {
        var suggestions = lockedTeacher(teacherId).getSuggestions();
        if (id == null) {
            suggestions.clear();
        } else {
            suggestions.remove(id);
        }
    }

    private Teacher lockedTeacher(String teacherId) {
        return teachers.findProfileForUpdate(teacherId).orElseThrow(TeacherProfileService::unauthorized);
    }

    private static ApiException unauthorized() {
        return new ApiException(ErrorCode.UNAUTHORIZED, "Cần đăng nhập tài khoản giáo viên");
    }

    private void safe(String value) {
        if (value != null && blockedWords.findIn(value).isPresent()) {
            throw new UnsafeContentException("Nội dung chưa đạt chuẩn an toàn dành cho học sinh. Vui lòng điều chỉnh lại.");
        }
    }

    private static TeacherProfileInput profileOf(Teacher teacher) {
        String school = teacher.getProfileSchool() == null ? teacher.getSchool() : teacher.getProfileSchool();
        return new TeacherProfileInput(blankToNull(school), teacher.getTextbook(), teacher.getPreferredVoice(),
                teacher.getPreferredSubject(), teacher.getPreferredGradeLevel());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    public record Suggestion(String id, String topic) { }
}
