package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.Game;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRepository extends JpaRepository<Game, String> {
    Optional<Game> findByIdAndAuthor_Id(String id, String authorId);
    Optional<Game> findByShareCode(String shareCode);

    List<Game> findByAuthor_IdOrderByUpdatedAtDesc(String authorId);
}
