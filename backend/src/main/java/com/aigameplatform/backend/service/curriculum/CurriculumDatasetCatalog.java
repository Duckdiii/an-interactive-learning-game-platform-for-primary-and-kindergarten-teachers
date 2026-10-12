package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Resolves one reviewed dataset per primary subject and grade; control chunks do not advertise a scope. */
public final class CurriculumDatasetCatalog {
    private final Map<Scope, CurriculumDataset> datasets;
    private final List<CurriculumDataset> activeDatasets;

    public CurriculumDatasetCatalog(List<CurriculumDataset> datasets) {
        if (datasets == null || datasets.isEmpty()) {
            throw new IllegalArgumentException("At least one reviewed curriculum dataset is required");
        }
        Map<Scope, CurriculumDataset> byScope = new HashMap<>();
        for (CurriculumDataset dataset : datasets) {
            if (dataset == null) {
                throw new IllegalArgumentException("Curriculum datasets cannot contain null entries");
            }
            List<Scope> scopes = dataset.chunks().stream()
                    .filter(chunk -> !chunk.control())
                    .map(chunk -> new Scope(chunk.subject(), chunk.gradeLevel()))
                    .distinct()
                    .toList();
            if (scopes.size() != 1) {
                throw new IllegalArgumentException("A reviewed dataset must contain primary outcomes for one scope");
            }
            Scope scope = scopes.getFirst();
            if (byScope.putIfAbsent(scope, dataset) != null) {
                throw new IllegalArgumentException("More than one active curriculum dataset for " + scope);
            }
        }
        this.datasets = Map.copyOf(byScope);
        this.activeDatasets = List.copyOf(byScope.values());
    }

    public Optional<CurriculumDataset> find(Subject subject, GradeLevel gradeLevel) {
        if (subject == null || gradeLevel == null) {
            throw new IllegalArgumentException("Subject and grade level are required");
        }
        return Optional.ofNullable(datasets.get(new Scope(subject, gradeLevel)));
    }

    public List<CurriculumDataset> select(Subject subject, GradeLevel gradeLevel) {
        return List.of(find(subject, gradeLevel).orElseThrow(() ->
                new IllegalArgumentException("No reviewed curriculum dataset for " + subject + "/" + gradeLevel)));
    }

    public List<CurriculumDataset> activeDatasets() {
        return activeDatasets;
    }

    private record Scope(Subject subject, GradeLevel gradeLevel) {
        private Scope {
            if (subject == null || gradeLevel == null) {
                throw new IllegalArgumentException("Subject and grade level are required");
            }
        }
    }
}
