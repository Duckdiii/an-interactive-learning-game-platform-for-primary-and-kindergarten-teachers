package com.aigameplatform.backend.entity.session;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "game_sessions")
@Inheritance(strategy = InheritanceType.JOINED)
@Getter
@Setter
@NoArgsConstructor
public abstract class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String sessionName;

    @Column(unique = true)
    private String accessCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status = SessionStatus.ACTIVE;

    // Aggregation: GameSession gắn vào Game. Không cascade, Game có vòng đời độc lập.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id")
    private Game game;

    // Composition: GameSession ◆ 0..* Participant (tổ chức). Participant chết theo phiên.
    @OneToMany(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "game_session_id", nullable = false)
    private List<Participant> participants = new ArrayList<>();
}
