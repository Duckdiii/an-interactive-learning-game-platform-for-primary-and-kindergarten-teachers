package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.SharedNarrationAsset;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SharedNarrationAssetRepository extends JpaRepository<SharedNarrationAsset, String> {
    Optional<SharedNarrationAsset> findByCacheKey(String cacheKey);
}
