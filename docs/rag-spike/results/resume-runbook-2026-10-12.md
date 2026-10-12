# RAG resume runbook — 2026-10-12

All commands are scoped to the existing 15 curriculum datasets. They do not ingest or regenerate document embeddings. Retrieval resumes from the named missing scopes; rerunning an evaluation writes a new result file and keeps earlier evidence.

## Before live calls

The last Gemini embedding response reported the daily `embed_content_free_tier_requests` limit at 2026-10-12 04:57 UTC, with retry after 19h 2m 50.8s (approximately 2026-10-12 23:59:51 UTC / 2026-10-13 06:59:51 Asia/Saigon). Confirm current quota first; this timestamp is the provider response, not a guarantee of reset. The local query-vector cache is `backend/target/curriculum-spike/query-embedding-cache.jsonl`. Its key hashes the exact query, embedding model, dimension, and task type. Only two historical replay vectors were available to seed it; uncached future queries will call the provider once and then persist the vector.

Keep `RAG_MIN_SCORE=0.855`. The failed benchmark rows are development cases now; do not use them to tune a production threshold.

## Resume retrieval for the seven unmeasured scopes

Run these after quota is available. Start the first command without `-SkipBuild`; later commands can use `-SkipBuild`.

```powershell
./scripts/rag-spike.ps1 -Mode Evaluate -ScopeOnly -Subject MATH -GradeLevel GRADE_4
./scripts/rag-spike.ps1 -Mode Evaluate -ScopeOnly -Subject MATH -GradeLevel GRADE_5 -SkipBuild
./scripts/rag-spike.ps1 -Mode Evaluate -ScopeOnly -Subject VIETNAMESE -GradeLevel GRADE_1 -SkipBuild
./scripts/rag-spike.ps1 -Mode Evaluate -ScopeOnly -Subject VIETNAMESE -GradeLevel GRADE_2 -SkipBuild
./scripts/rag-spike.ps1 -Mode Evaluate -ScopeOnly -Subject ENGLISH -GradeLevel GRADE_3 -SkipBuild
./scripts/rag-spike.ps1 -Mode Evaluate -ScopeOnly -Subject ENGLISH -GradeLevel GRADE_4 -SkipBuild
./scripts/rag-spike.ps1 -Mode Evaluate -ScopeOnly -Subject ENGLISH -GradeLevel GRADE_5 -SkipBuild
```

## Holdout

MATH GRADE_1–3 v1 were exposed and failed; those rows are development data. Three fresh v2 fixtures exist for these scopes, with source SHA, expected chunk IDs, and PDF page locked in JSONL. They were authored after this guard work by the implementer, so they are **candidate holdout pending independent review**, not a blinded independent result. The other twelve never-evaluated scopes use their existing v1 fixtures. [The 15-scope manifest](holdout-manifest-2026-10-12.csv) records fixture version, source hash, 6/3/3 labels, run status, and pending reviewer status. All 15 sets are source-traceable and `NOT_RUN`; all labels still require independent review. Do not use results to tune production until reviewer sign-off.

```powershell
./scripts/rag-spike.ps1 -Mode Holdout -HoldoutVersion v2 -ScopeOnly -Subject MATH -GradeLevel GRADE_1
./scripts/rag-spike.ps1 -Mode Holdout -HoldoutVersion v2 -ScopeOnly -Subject MATH -GradeLevel GRADE_2 -SkipBuild
./scripts/rag-spike.ps1 -Mode Holdout -HoldoutVersion v2 -ScopeOnly -Subject MATH -GradeLevel GRADE_3 -SkipBuild
```

The following 12 scopes have never been queried with a holdout set. Keep the frozen v1 fixtures and run once per scope:

```powershell
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject MATH -GradeLevel GRADE_4
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject MATH -GradeLevel GRADE_5 -SkipBuild
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject VIETNAMESE -GradeLevel GRADE_1 -SkipBuild
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject VIETNAMESE -GradeLevel GRADE_2 -SkipBuild
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject VIETNAMESE -GradeLevel GRADE_3 -SkipBuild
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject VIETNAMESE -GradeLevel GRADE_4 -SkipBuild
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject VIETNAMESE -GradeLevel GRADE_5 -SkipBuild
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject ENGLISH -GradeLevel GRADE_1 -SkipBuild
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject ENGLISH -GradeLevel GRADE_2 -SkipBuild
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject ENGLISH -GradeLevel GRADE_3 -SkipBuild
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject ENGLISH -GradeLevel GRADE_4 -SkipBuild
./scripts/rag-spike.ps1 -Mode Holdout -ScopeOnly -Subject ENGLISH -GradeLevel GRADE_5 -SkipBuild
```

## Retry only the four provider-failed strategy pairs

The previous valid comparison artifacts for the other six game types remain intact. On 2026-10-12, all four failures were retried once on `evidence-gate-v2` using UTF-8 query `q01`. Each had one query-cache hit, zero embedding provider misses, retrieval reached `GEMINI_WITH_RAG`, and Gemini returned `InvalidRequestException`; none produced an output, and all remain `FAIL`. Do not repeat the same requests until the provider request/model issue is diagnosed or configuration changes. The latest JSON checkpoints are `batch-2026-10-12T06-03-36.023121900Z.json` (MATCHING), `batch-2026-10-12T06-04-02.719537700Z.json` (MEMORY_CARD), `batch-2026-10-12T06-04-15.754600100Z.json` (DRAG_DROP), and `batch-2026-10-12T06-04-28.315900300Z.json` (ORDERING). The commands below reproduce the matched topic/model/schema through the UTF-8 fixture if a provider-side fix is made:

```powershell
./scripts/rag-spike.ps1 -Mode CompareGeneration -Subject MATH -GradeLevel GRADE_1 -GameType MATCHING -QueryId q01
./scripts/rag-spike.ps1 -Mode CompareGeneration -Subject MATH -GradeLevel GRADE_1 -GameType MEMORY_CARD -QueryId q01 -SkipBuild
./scripts/rag-spike.ps1 -Mode CompareGeneration -Subject MATH -GradeLevel GRADE_1 -GameType DRAG_DROP -QueryId q01 -SkipBuild
./scripts/rag-spike.ps1 -Mode CompareGeneration -Subject MATH -GradeLevel GRADE_1 -GameType ORDERING -QueryId q01 -SkipBuild
```

The comparison runner reads `GEMINI_MODEL`, DB settings, and API key from the selected `.env` file without printing secrets. Use `-QueryId q01` for this UTF-8 benchmark query: passing Vietnamese directly through Windows PowerShell previously changed characters to `?`, which generated a different query vector and a false no-evidence result. Query embeddings are cached; generated content still goes to Gemini for each uncaptured pair.

## Production E2E matrix

[production-e2e-matrix.csv](production-e2e-matrix.csv) and [production-e2e-matrix.json](production-e2e-matrix.json) contain 30 planned cases: one source-cited supported topic and one out-of-scope request for each of the 15 subject/grade scopes. All are `NOT_RUN`; schema validity, answer correctness, curriculum alignment, and reviewer fields remain unscored. Use production threshold/model for acceptance. Record retrieval result, game type, request/response IDs, schema validity, answer correctness, alignment, AI advisory, and teacher review for each case. The current repository still needs a live end-to-end execution path and the quota/provider prerequisite; do not present this matrix as completed generation coverage.

## API-free verification already completed

`CurriculumEvidenceVerifierTest`, `CurriculumCatalogRetrievalTest`, `QueryEmbeddingCacheEmbeddingModelTest`, `CurriculumSpikeTest`, `CurriculumHoldoutTest`, `GameGenerationServiceTest`, `GeminiGameContentGeneratorTest`, and `GameContentStrategyRagTest` passed together: **74 tests, 0 failures/errors/skips**. They cover all 15 in-memory subject/grade filters, cross-scope/version exclusion, insufficiency blocking generation, retrieval once/context stable across retries, prompt/schema, query-vector cache key dimensions, and provider error separation. This is code-level verification; it is not a live provider run or teacher review.

The later full backend run after the evidence-gate and test-datasource changes completed with **533 tests, 0 failures, 0 errors, 2 skipped**; the two skipped tests require Gemini opt-in credentials and do not count as passes. JaCoCo line coverage was 71.14% (70% build floor). `contextLoads` now uses an in-memory H2 datasource and a test-only JWT key; it no longer inherits production `DB_URL`. The verifier matrix checks 30 source-text cases across 14 rule groups (15 supported boundary cases and 15 adjacent unsupported cases) with 0 false blocks and 0 false accepts on development regression data. The all-scope holdout integrity test checks each set's provenance and positive references but does not independently approve its labels.

## Version-aware result interpretation

The prior live retrieval/holdout artifacts remain `FAIL`. The full retrieval benchmark for `evidence-gate-v2` is `NOT_RUN`; four strategy retries reached the Gemini generation phase after retrieval, then failed with `InvalidRequestException` and produced no output. The offline 11/11 rejection count and the 30-case matrix are development regressions, not evidence that production retrieval now passes. Keep the 0.855 production threshold and use the holdout manifest only after independent label review. No corpus or document vector was regenerated.
