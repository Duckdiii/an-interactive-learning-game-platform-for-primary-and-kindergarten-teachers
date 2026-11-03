-- V1 enables vector in Supabase's extensions schema. Do not modify applied migrations.
CREATE TABLE public.curriculum_embeddings (
    embedding_id UUID PRIMARY KEY,
    embedding extensions.vector(768) NOT NULL,
    text TEXT NOT NULL,
    metadata JSONB NOT NULL,
    CONSTRAINT curriculum_embedding_metadata CHECK (
        metadata ?& ARRAY['chunkId', 'subject', 'gradeLevel', 'topic', 'contentType',
                         'sourceDocument', 'sourceSha256', 'sourcePdfPages', 'sourcePrintedPages',
                         'curriculumVersion', 'datasetVersion', 'embeddingModel', 'outcomeText']
        AND metadata->>'contentType' = 'curriculum_outcome'
    )
);

CREATE INDEX curriculum_embeddings_scope_idx ON public.curriculum_embeddings
    ((metadata->>'subject'), (metadata->>'gradeLevel'), (metadata->>'datasetVersion'));

-- This is backend-only data; direct database setup/retrieval uses the configured DB role.
ALTER TABLE public.curriculum_embeddings ENABLE ROW LEVEL SECURITY;
