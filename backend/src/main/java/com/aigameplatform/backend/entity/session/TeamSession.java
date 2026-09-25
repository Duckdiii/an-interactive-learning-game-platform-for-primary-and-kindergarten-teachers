package com.aigameplatform.backend.entity.session;

import com.aigameplatform.backend.entity.enums.ChoosingStrategy;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "team_sessions")
@Getter
@Setter
@NoArgsConstructor
public class TeamSession extends TeacherSession {

    // Composition: TeamSession ◆ 2..* Team. Team chết theo phiên.
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "team_session_id", nullable = false)
    private List<Team> teams = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private ChoosingStrategy groupingStrategy;
}
