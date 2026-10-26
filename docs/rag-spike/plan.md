# Toán lớp 1 RAG spike

Initial approved brief: the user's eight requirements for the Toán lớp 1 retrieval spike, including the source gate before chunking and embeddings. After the retrieval spike passed, the user approved a separate pilot extension to game-generation orchestration; its implementation and remaining handoff are documented in [integration-plan.md](integration-plan.md). The pilot adds no HTTP endpoint and leaves the frozen game DSL unchanged.

## Question and pass criterion

Can LangChain4j + Gemini embeddings + Supabase pgvector retrieve a relevant, source-verifiable Grade 1 Maths outcome for at least 8 of 10 fixed queries (Hit@3), with zero subject/grade leakage? Independent negative queries check insufficient evidence. Mock tests are not retrieval quality evidence.

## Tasks

- [x] Audit all supplied files; visually inspect Maths Grade 1 and amendment articles. Record SHA-256, PDF versus printed pages, classification and applicable versions.
- [x] Curate 23 verbatim outcomes and separate, genuine control outcomes from Grade 2 Maths and Grade 1 Vietnamese. Verify each fragment against PDFBox extraction. Freeze 10 positive queries and their expected chunk IDs before measuring.
- [x] Add PDFBox 3.0.8 and LangChain4j pgvector 1.20.1-beta30, matching the existing LangChain4j core/Gemini 1.20.1. Add V5 only; Flyway owns the embedding table and V1 remains untouched.
- [x] Test first, then implement chunk validation, deterministic UUIDs, source extraction, mandatory filters, insufficient evidence and evaluation metrics. Mock external embedding calls only; use a real in-memory store for local filter tests.
- [x] Add a standalone runner: extract, check-config, migrate, ingest, query and evaluate. Re-ingestion skips identical IDs and never drops shared tables. Use the same embedding model/dimension for document/query vectors; store model/version metadata.
- [x] Add a compatible `buildPrompt(topic, grade, curriculumContext)` overload. Keep the old signature and document the orchestration contract. After separate user approval, wire only the QUIZ / MATH / GRADE_1 pilot through the generation orchestration.
- [x] Run the backend suite and package build, PDFBox source verification, CLI checks and review the diff. Two review findings were reproduced with failing tests and fixed; 459 tests and the 70% coverage gate passed, package/install passed.
- [x] Run live Supabase migration, ingest 28 chunks twice (second run skipped all 28), evaluate 10 positive/3 negative queries plus 5 controls, and inspect returned text/pages manually. Initial threshold 0.75 failed negative rejection; exploratory calibration at 0.855 passed. See both immutable reports and results/status.json.

## Review focus

Cross-page outcomes, a Grade 2 boundary on the same PDF page, numeric limitations, mixed-subject controls, repeated setup, changed models/versions, and missing secrets must not silently corrupt the corpus or measurement. Only the QUIZ strategy is wired to curriculum context in this pilot; other game types remain outside scope.
