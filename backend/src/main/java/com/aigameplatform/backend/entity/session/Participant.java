package com.aigameplatform.backend.entity.session;

import com.aigameplatform.backend.entity.interaction.PlayInteractionDetail;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "participants")
@Getter
@Setter
@NoArgsConstructor
public class Participant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String studentNickname;

    private int score;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    // Composition: Participant ◆ 0..* PlayInteractionDetail (tương tác). Chết theo Participant.
    @OneToMany(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "participant_id", nullable = false)
    private List<PlayInteractionDetail> playInteractionDetails = new ArrayList<>();

    private LocalDateTime playedAt;

    private LocalDateTime completedAt;

    private String note;

    /** Ghi chú đặt khi giáo viên đóng phòng lúc học sinh chưa làm xong (không tính là hoàn thành). */
    public static final String ENDED_BY_CLOSE_NOTE = "ENDED";

    public boolean finishedByPlaying() {
        return completedAt != null && !ENDED_BY_CLOSE_NOTE.equals(note);
    }
}
