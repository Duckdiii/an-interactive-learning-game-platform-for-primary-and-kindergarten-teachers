-- Teacher-side provenance. Do not change the frozen DSL or previously applied V5.
CREATE TABLE public.game_curriculum_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id VARCHAR(255) NOT NULL UNIQUE REFERENCES public.games(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'REVIEWED', 'UNAVAILABLE', 'STALE')),
    evidence JSONB NOT NULL CHECK (jsonb_typeof(evidence) = 'object'),
    claims JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(claims) = 'array'),
    warnings JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(warnings) = 'array'),
    dataset_version TEXT,
    curriculum_version TEXT,
    embedding_model TEXT,
    reviewer_model TEXT
);
ALTER TABLE public.game_curriculum_reviews ENABLE ROW LEVEL SECURITY;
-- Backend DB role only; the teacher API also checks ownership. No public/student access policy.
