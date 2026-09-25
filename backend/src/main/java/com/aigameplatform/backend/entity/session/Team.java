package com.aigameplatform.backend.entity.session;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "teams")
@Getter
@Setter
@NoArgsConstructor
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String teamName;

    private String teamColor;

    // Aggregation: Team ◇ 1..* Participant. Không cascade; mỗi Participant thuộc đúng 1 Team.
    @OneToMany
    @JoinColumn(name = "team_id")
    private List<Participant> members = new ArrayList<>();
}
