package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.GameCurriculumReview;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameCurriculumReviewRepository extends JpaRepository<GameCurriculumReview, UUID> {
    Optional<GameCurriculumReview> findByGame_IdAndGame_Author_Id(String gameId, String authorId);
}
