package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.GenerationScopeUnsupportedException;
import java.util.*;

/** Published scopes come from primary outcomes, never from control rows or DB availability. */
public final class CurriculumCatalog {
    private record Scope(Subject subject, GradeLevel grade) { }
    private final Map<Scope, CurriculumDataset> datasets;
    private final Set<GameType> gameTypes;

    public CurriculumCatalog(List<CurriculumDataset> datasets, Set<GameType> gameTypes) {
        this.gameTypes = Set.copyOf(gameTypes);
        var scopes = new HashMap<Scope, CurriculumDataset>();
        for (var dataset : datasets) {
            dataset.chunks().stream().filter(c -> !c.control()).forEach(c -> {
                var key = new Scope(c.gradeLevel() == GradeLevel.KINDERGARTEN ? null : c.subject(), c.gradeLevel());
                var previous = scopes.putIfAbsent(key, dataset);
                if (previous != null && previous != dataset)
                    throw new IllegalArgumentException("Only one active dataset per scope is allowed");
            });
        }
        this.datasets = Map.copyOf(scopes);
    }

    public CurriculumDataset requireSupported(GameType type, Subject subject, GradeLevel grade) {
        var dataset = datasets.get(new Scope(grade == GradeLevel.KINDERGARTEN ? null : subject, grade));
        if (!gameTypes.contains(type) || dataset == null)
            throw new GenerationScopeUnsupportedException(
                    "Chưa có chương trình đã công bố cho kiểu game, môn hoặc lớp đã chọn. Hiện hỗ trợ kiểu game QUIZ.");
        return dataset;
    }
}
