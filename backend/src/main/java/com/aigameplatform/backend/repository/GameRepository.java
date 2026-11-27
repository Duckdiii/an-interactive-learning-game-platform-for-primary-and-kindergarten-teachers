package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.Game;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameRepository extends JpaRepository<Game, String> {
    Optional<Game> findByIdAndAuthor_Id(String id, String authorId);
    Optional<Game> findByShareCode(String shareCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from Game g where g.id = :gameId and g.author.id = :authorId")
    Optional<Game> findByIdAndAuthor_IdForUpdate(@Param("gameId") String gameId, @Param("authorId") String authorId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from Game g where g.id = :id")
    Optional<Game> findByIdForUpdate(@Param("id") String id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from Game g where g.shareCode = :code")
    Optional<Game> findByShareCodeForUpdate(@Param("code") String shareCode);

    List<Game> findByAuthor_IdOrderByUpdatedAtDesc(String authorId);
}
