package com.aigameplatform.backend.service.classroom;

import com.aigameplatform.backend.dto.classroom.ClassroomDto;
import com.aigameplatform.backend.dto.classroom.ClassroomRequest;
import com.aigameplatform.backend.entity.Classroom;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import java.util.StringJoiner;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.repository.ClassroomRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** UC-16 (phần lớp học): giáo viên khai báo, sửa, xóa các lớp mình phụ trách. Lớp của người khác trả 404. */
@Service
public class ClassroomService {

    // Chặn một tài khoản tạo lớp vô hạn làm phình bảng và danh sách.
    static final int MAX_CLASSROOMS = 50;

    private final ClassroomRepository classrooms;
    private final TeacherRepository teachers;
    private final BlockedWordList blockedWords;

    public ClassroomService(ClassroomRepository classrooms, TeacherRepository teachers, BlockedWordList blockedWords) {
        this.classrooms = classrooms;
        this.teachers = teachers;
        this.blockedWords = blockedWords;
    }

    @Transactional(readOnly = true)
    public List<ClassroomDto> list(String teacherId) {
        return classrooms.findAllByTeacherId(requireTeacher(teacherId)).stream().map(ClassroomDto::of).toList();
    }

    @Transactional
    public ClassroomDto create(String teacherId, ClassroomRequest request) {
        requireTeacher(teacherId);
        requireSafe(request);
        Teacher teacher = teachers.findById(teacherId)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED, "Tài khoản giáo viên không tồn tại"));
        if (teacher.getClassrooms().size() >= MAX_CLASSROOMS) {
            throw new ApiException(ErrorCode.CONFLICT, "Cô đã khai báo tối đa " + MAX_CLASSROOMS + " lớp, hãy xóa bớt lớp không dùng");
        }
        Classroom classroom = new Classroom();
        apply(classroom, request);
        Classroom saved = classrooms.save(classroom);
        teacher.getClassrooms().add(saved);
        teachers.save(teacher);
        return ClassroomDto.of(saved);
    }

    @Transactional
    public ClassroomDto update(String teacherId, String classroomId, ClassroomRequest request) {
        Classroom classroom = owned(teacherId, classroomId); // kiểm quyền trước: lớp của người khác luôn là 404
        requireSafe(request);
        apply(classroom, request);
        return ClassroomDto.of(classrooms.save(classroom));
    }

    /** Các trò chơi và phiên đã có không bị ảnh hưởng, phiên chỉ không còn gắn với lớp này. */
    @Transactional
    public void delete(String teacherId, String classroomId) {
        Classroom classroom = owned(teacherId, classroomId);
        classrooms.detachSessions(classroomId);
        teachers.findById(teacherId).ifPresent(teacher -> teacher.getClassrooms().removeIf(c -> c.getId().equals(classroomId)));
        classrooms.delete(classroom);
    }

    /** Dùng khi tạo phiên và lọc thống kê: lớp phải thuộc giáo viên, nếu không thì 404 như lớp không tồn tại. */
    @Transactional(readOnly = true)
    public Classroom owned(String teacherId, String classroomId) {
        return classrooms.findByIdAndTeacherId(classroomId, requireTeacher(teacherId))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy lớp học"));
    }

    @Transactional(readOnly = true)
    public String generationContext(String teacherId, String classroomId, GradeLevel gradeLevel) {
        Classroom classroom = owned(teacherId, classroomId);
        if (gradeLevel == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Vui lòng chọn khối lớp");
        }
        if (classroom.getGradeLevel() != null && classroom.getGradeLevel() != gradeLevel) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Khối lớp đã chọn không khớp với lớp học");
        }
        StringJoiner context = new StringJoiner("\n");
        if (classroom.getStudentCount() != null) context.add("Sĩ số: " + classroom.getStudentCount());
        if (classroom.getKnowledgeScope() != null) context.add("Phạm vi đã học: " + classroom.getKnowledgeScope());
        if (classroom.getCharacteristics() != null) context.add("Đặc điểm chung: " + classroom.getCharacteristics());
        if (classroom.getFavoriteTopics() != null) context.add("Chủ đề yêu thích: " + classroom.getFavoriteTopics());
        return context.length() == 0 ? null : context.toString();
    }

    private void requireSafe(ClassroomRequest request) {
        var profile = request.learningProfile();
        for (String text : new String[] {request.className(), request.schoolYear(), request.schoolName(),
                profile == null ? null : profile.knowledgeScope(), profile == null ? null : profile.characteristics(),
                profile == null ? null : profile.favoriteTopics()}) {
            if (text != null && blockedWords.findIn(text).isPresent()) {
                throw new UnsafeContentException("Nội dung chưa đạt chuẩn an toàn dành cho học sinh. Vui lòng điều chỉnh lại.");
            }
        }
    }

    private static void apply(Classroom classroom, ClassroomRequest request) {
        classroom.setClassName(request.className().trim());
        classroom.setSchoolYear(blankToNull(request.schoolYear()));
        classroom.setSchoolName(blankToNull(request.schoolName()));
        var profile = request.learningProfile();
        if (profile != null) {
            classroom.setGradeLevel(profile.gradeLevel());
            classroom.setStudentCount(profile.studentCount());
            classroom.setKnowledgeScope(blankToNull(profile.knowledgeScope()));
            classroom.setCharacteristics(blankToNull(profile.characteristics()));
            classroom.setFavoriteTopics(blankToNull(profile.favoriteTopics()));
        }
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }

    private static String requireTeacher(String teacherId) {
        if (teacherId == null || teacherId.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Cần đăng nhập tài khoản giáo viên");
        }
        return teacherId;
    }
}
