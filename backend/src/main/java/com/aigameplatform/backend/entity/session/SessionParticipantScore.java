package com.aigameplatform.backend.entity.session;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "session_participant_scores")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionParticipantScore {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "participant_id", nullable = false)
    private String participantId;

    @Column(name = "participant_name", nullable = false)
    private String participantName;

    @Column(name = "final_score", nullable = false)
    private int finalScore;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
