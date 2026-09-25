package com.aigameplatform.backend.entity.session;

import com.aigameplatform.backend.entity.Classroom;
import com.aigameplatform.backend.entity.Teacher;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "teacher_sessions")
@Getter
@Setter
@NoArgsConstructor
public abstract class TeacherSession extends GameSession {

    // Aggregation: Teacher là chủ phiên. Không cascade.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @Column(name = "is_locked", nullable = false)
    private boolean isLocked;

    // Aggregation: phiên diễn ra cho một Classroom. Không cascade.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "classroom_id")
    private Classroom classroom;
}
