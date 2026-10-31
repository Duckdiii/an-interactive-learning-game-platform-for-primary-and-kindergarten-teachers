package com.aigameplatform.backend.service.curriculum;

import java.sql.SQLException;
import java.util.HashSet;
import javax.sql.DataSource;

/** Production readiness check; contains no CLI, credential parsing, or ingestion code. */
public final class CurriculumDatasetReadiness {
    private final DataSource dataSource;

    public CurriculumDatasetReadiness(DataSource dataSource) {
        this.dataSource = java.util.Objects.requireNonNull(dataSource);
    }

    public void requireComplete(CurriculumDataset dataset, String embeddingModel) {
        try {
            var found = new HashSet<String>();
            try (var connection = dataSource.getConnection(); var statement = connection.prepareStatement("""
                    SELECT embedding_id FROM public.curriculum_embeddings
                    WHERE metadata->>'datasetVersion' = ? AND metadata->>'sourceSha256' = ?
                      AND metadata->>'embeddingModel' = ?
                    """)) {
                statement.setString(1, dataset.source().datasetVersion());
                statement.setString(2, dataset.source().sourceSha256());
                statement.setString(3, embeddingModel);
                try (var rows = statement.executeQuery()) {
                    while (rows.next()) found.add(rows.getString(1));
                }
            }
            var expected = dataset.chunks().stream()
                    .map(c -> c.embeddingId(dataset.source(), embeddingModel, CurriculumEmbeddingContract.DIMENSION))
                    .collect(java.util.stream.Collectors.toSet());
            if (!found.equals(expected))
                throw new IllegalStateException("Dataset is missing or differs from the reviewed corpus; retrieval is unavailable");
        } catch (SQLException exception) {
            throw new IllegalStateException("Curriculum dataset readiness check failed", exception);
        }
    }
}
