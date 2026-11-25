package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.GameNarrationAsset;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameNarrationAssetRepository extends JpaRepository<GameNarrationAsset, String> {
    Optional<GameNarrationAsset> findByGame_IdAndQuestion_Id(String gameId, String questionId);
    @EntityGraph(attributePaths = {"game", "question"})
    List<GameNarrationAsset> findAllByGame_Id(String gameId);
}
