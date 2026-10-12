# Curriculum RAG — implementation and evidence plan

**Status:** in progress; no commit or push.

**Working branch:** `duc/curriculum-rag-grade1-spike`.

## Scope and denominator

The current full-curriculum target is **15 curriculum scopes**: the three supported primary-school `Subject` enum values (`MATH`, `VIETNAMESE`, `ENGLISH`) crossed with grades 1–5. A curriculum scope means one subject and one grade/program variant. It does not multiply by the 10 game types; game types are a separate generation-coverage dimension.

English grades 1–2 use the distinct optional “Làm quen Tiếng Anh” program in TT32/2018. They remain the `ENGLISH/GRADE_1` and `ENGLISH/GRADE_2` scope rows with `programVariant=OPTIONAL_FAMILIARIZATION`; grades 3–5 use the mandatory English Foreign Language 1 program. Kindergarten domains and preschool English are out of this 15-scope primary-subject target and are not counted here.

The earlier 71 figure was `53 + 15 + 3`: it mixed all-primary-subject claims with kindergarten development-domain/age and kindergarten-English rows. The 53 primary rows were not accompanied by a frozen row list and are not the three-enum × five-grade denominator. That figure is superseded for this task; it must not be used as a result or denominator.

## Work packages

1. **Scope/source map:** freeze the 15 rows, record TT32 PDF/printed pages, program variant, source SHA, and amendment applicability.
2. **Corpus preparation:** extract only the three requested programs’ “Nội dung — Yêu cầu cần đạt” tables; create exact-source candidate chunks with page/region metadata; never invent or paraphrase an outcome.
3. **Verification and ingestion:** compare extracted fragments against the cited PDF pages and table columns, record chunk review state, and perform idempotent per-scope ingestion only after the candidate corpus passes the source gate.
4. **Retrieval:** filter by exact subject, grade, program/version, source hash and embedding model before ranking. Record positive, negative and near-miss outcomes and prevent out-of-scope evidence from entering a response.
5. **Threshold/evidence gate:** keep exploratory, calibration and independent holdout data separate. Score and threshold semantics must be documented. Similarity alone does not certify curriculum alignment or preserve the source’s knowledge limits.
6. **Generation:** verify actual generation for each registered game type with retrieved source evidence; separately score schema, answer correctness, curriculum alignment and teacher review. Paired with/without-RAG comparisons use the same topic, model and settings.
7. **Reporting/review:** maintain one aggregate report, row-level CSV and JSON evidence. `NOT_RUN`, `BLOCKED`, AI advisory and pending teacher review never count as passes. Request independent subagent review before handoff.

## Acceptance rules

- A scope is supported only with official source provenance, source-verified chunks, indexed vectors, retrieval evaluation and generation evidence.
- Store the expected chunk IDs and cited source pages before running each calibration/holdout query.
- Report Hit@3, false rejection, false acceptance, negative rejection and leakage with numerator and denominator; keep per-scope averages separate from query-weighted totals.
- Use a distinct frozen holdout after the threshold is fixed. Do not call repeated/exploratory prompts independent.
- AI chunk and game reviews are advisory. Teacher review is a separate required status. The post-generation claim checker is coded and unit-tested; it requires at least one claim per question ID but does not prove exhaustive claim coverage within each question. Live evaluation and teacher review are still pending, and the frontend does not yet render the warnings.

## Current state

- The source is the user-supplied official TT32/2018 PDF, SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`. All 15 scope datasets now contain 497 primary outcomes plus 61 controls (558 chunks). The source verifier matched text and PDF pages for 558/558, including retained page images for visual transcriptions. Semantic/pedagogical and teacher approval remain NOT_RUN.
- PDFBox 3.0.8 raw evidence contains 58 unique mapped TT32 pages, including the Vietnamese grade 5 continuation on PDF 96. The source hash, per-chunk page/region and exact corpus version are kept in each manifest/audit.
- Supabase contains all 558/558 expected vector IDs; a repeat ingest wrote 0 and skipped all 558. This confirms idempotency for the pinned corpus/model.
- Exploratory retrieval ran on 8/15 scopes at production threshold 0.855: positive Hit@3 80/80, negative rejection 19/24, false acceptance 5/24, control exclusion 33/33 and leakage 0. The aggregate gate FAILS. Seven scopes remain NOT_RUN because Gemini returned its 1,000 embedding requests/day free-tier quota error, first at ENGLISH G3; retry estimate was about 19 hours.
- Independent holdout remains MATH G1–G3 only and all three scope gates FAIL: positive 18/18, negative rejection 9/9, near-miss rejection 3/9, false acceptance 6/18, leakage 0. Threshold 0.855 unchanged; calibration is NOT_RUN.
- Strategy-level matched generation was attempted for all 10 game types at Math G1: 6 paired artifacts, 4 provider failures. Full GameGenerationService end-to-end remains NOT_RUN.
- Current consolidated scope states and evidence references are in [`results/scope-coverage.csv`](results/scope-coverage.csv) and [`results/curriculum-rag-summary.md`](results/curriculum-rag-summary.md).
