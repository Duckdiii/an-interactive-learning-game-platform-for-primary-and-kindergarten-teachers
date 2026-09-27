package com.aigameplatform.backend.entity.session;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "family_sessions")
@Getter
@Setter
@NoArgsConstructor
public class FamilySession extends GameSession {

    private String parentName;

    private String contactInformation;
}
