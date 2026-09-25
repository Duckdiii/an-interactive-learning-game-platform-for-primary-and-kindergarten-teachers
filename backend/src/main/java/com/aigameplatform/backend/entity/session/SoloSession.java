package com.aigameplatform.backend.entity.session;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "solo_sessions")
@Getter
@Setter
@NoArgsConstructor
public class SoloSession extends TeacherSession {

    private int maxParticipants;
}
