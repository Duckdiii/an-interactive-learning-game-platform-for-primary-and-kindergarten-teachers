package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.Classroom;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClassroomRepository extends JpaRepository<Classroom, String> {

    // Quan hệ Teacher 1..* Classroom chỉ khai ở phía Teacher, nên truy vấn đi qua Teacher.
    @Query("select c from Teacher t join t.classrooms c where t.id = :teacherId order by c.className")
    List<Classroom> findAllByTeacherId(@Param("teacherId") String teacherId);

    @Query("select c from Teacher t join t.classrooms c where t.id = :teacherId and c.id = :classroomId")
    Optional<Classroom> findByIdAndTeacherId(@Param("classroomId") String classroomId, @Param("teacherId") String teacherId);

    /** Xóa lớp thì phiên đã diễn ra vẫn còn, chỉ không gắn lớp nữa (UC-16 luồng 3a). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update TeacherSession s set s.classroom = null where s.classroom.id = :classroomId")
    int detachSessions(@Param("classroomId") String classroomId);
}
