package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.session.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParticipantRepository extends JpaRepository<Participant, String> {
}
