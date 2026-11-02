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
        if (type == null || !gameTypes.contains(type))
            throw new GenerationScopeUnsupportedException(
                    "Chưa đăng ký strategy/schema cho loại game đã chọn.");
        return requireDataset(subject, grade);
    }

    /** Selects the curriculum independently from whether a game type is enabled for generation. */
    public CurriculumDataset requireDataset(Subject subject, GradeLevel grade) {
        if (grade == null || subject == null)
            throw new GenerationScopeUnsupportedException("Cần chọn môn và lớp để xác định chương trình.");
        // Kindergarten LANGUAGE outcomes describe the Vietnamese language domain, not the
        // separate preschool-English program. That English corpus has not been curated yet.
        if (grade == GradeLevel.KINDERGARTEN && subject == Subject.ENGLISH)
            throw new GenerationScopeUnsupportedException(
                    "Chua co chuong trinh Tieng Anh Mam non da duoc doi chieu.");
        var dataset = datasets.get(new Scope(grade == GradeLevel.KINDERGARTEN ? null : subject, grade));
        if (dataset == null)
            throw new GenerationScopeUnsupportedException(
                    "Chưa có chương trình đã công bố cho môn hoặc lớp đã chọn.");
        return dataset;
    }
}
