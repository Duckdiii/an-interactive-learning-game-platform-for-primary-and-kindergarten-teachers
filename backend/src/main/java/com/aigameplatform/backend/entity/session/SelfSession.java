package com.aigameplatform.backend.entity.session;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "self_sessions")
@Getter
@Setter
@NoArgsConstructor
public class SelfSession extends GameSession {

    private LocalDateTime sessionExpiresAt;
}
