package com.aigameplatform.backend.entity.session;

import com.aigameplatform.backend.entity.enums.ChoosingStrategy;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "duel_sessions")
@Getter
@Setter
@NoArgsConstructor
public class DuelSession extends TeacherSession {

    @Enumerated(EnumType.STRING)
    private ChoosingStrategy pairingStrategy;
}
