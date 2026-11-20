package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.BlockedWordEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BlockedWordEntityRepository extends JpaRepository<BlockedWordEntity, String> {

    List<BlockedWordEntity> findAllByOrderByWordAsc();

    boolean existsByWord(String word);
}
