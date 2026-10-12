# Curriculum RAG — consolidated evaluation report

**As of:** 2026-10-12  
**Overall:** The agreed 15-scope corpus remains indexed as 497 primary outcomes + 61 controls (558 vectors). Official PDFBox source checks matched 558/558 fragments. Retrieval and holdout gates still FAIL; full RAG is not accepted. The source audit found one incomplete parent-topic label and one redundant same-scope source record; both await a selective index update.

## Scope and source

The denominator is 15 curriculum scopes: MATH, VIETNAMESE, and ENGLISH for grades 1–5. English grades 1–2 are the optional familiarization program; grades 3–5 are required foreign-language curriculum. One curriculum scope is one subject/grade variant. It is separate from the 10 game types; scope × game type would be 150 combinations.

The primary source is TT 32/2018. Applicability of 20/2021, 13/2022, and 17/2025 was checked separately; the reviewed amendments do not change outcomes included in this corpus. See [source applicability](../source-applicability-full.md). Evaluation, equipment, and digital transformation texts are not mixed into the searchable outcome corpus.

## Consolidated scope matrix

| Scope | Source / extraction / index | Exploratory retrieval | Holdout | Generation / teacher review |
|---|---|---|---|---|
| MATH G1 | PASS, 23 outcomes + 5 controls | PASS | FAIL | NOT_RUN / PENDING |
| MATH G2 | PASS, 43 + 4 | PASS | FAIL | NOT_RUN / PENDING |
| MATH G3 | PASS, 51 + 4 | FAIL | FAIL | NOT_RUN / PENDING |
| MATH G4 | PASS, 53 + 4 | NOT_RUN (quota) | NOT_RUN | NOT_RUN / PENDING |
| MATH G5 | PASS, 53 + 4 | NOT_RUN (quota) | NOT_RUN | NOT_RUN / PENDING |
| VIETNAMESE G1 | PASS, 36 + 4 | NOT_RUN (quota) | NOT_RUN | NOT_RUN / PENDING |
| VIETNAMESE G2 | PASS, 42 + 4 | NOT_RUN (quota) | NOT_RUN | NOT_RUN / PENDING |
| VIETNAMESE G3 | PASS, 45 + 4 | FAIL | NOT_RUN | NOT_RUN / PENDING |
| VIETNAMESE G4 | PASS, 42 + 4 | FAIL | NOT_RUN | NOT_RUN / PENDING |
| VIETNAMESE G5 | PASS, 41 + 4 | FAIL | NOT_RUN | NOT_RUN / PENDING |
| ENGLISH G1 (familiarization) | PASS, 14 + 4 | PASS | NOT_RUN | NOT_RUN / PENDING |
| ENGLISH G2 (familiarization) | PASS, 13 + 4 | PASS | NOT_RUN | NOT_RUN / PENDING |
| ENGLISH G3 | PASS, 15 + 4 | NOT_RUN (quota) | NOT_RUN | NOT_RUN / PENDING |
| ENGLISH G4 | PASS, 14 + 4 | NOT_RUN (quota) | NOT_RUN | NOT_RUN / PENDING |
| ENGLISH G5 | PASS, 12 + 4 | NOT_RUN (quota) | NOT_RUN | NOT_RUN / PENDING |

Row counts are primary outcome chunks + control chunks. Totals remain 497 outcomes + 61 controls = 558 indexed chunks. The official 32/2018 PDF hash matched the manifests; PDFBox verified every non-visual fragment in its cited page/region, and the six visual transcriptions were compared with rendered pages. The source text agrees for 558/558 rows. The 25 cross-page outcomes were checked for ordered, complete joins; ranges and limits remain intact. The 61 controls all carry a subject/grade outside their owning dataset and the retriever now explicitly filters `control=false` in addition to scope/version. A full audit is in the existing [558-row chunk index](../evidence/chunk-audit/all-558-chunks.csv); reviewer fields name PDFBox automation and Codex AI-assisted review, never teacher approval.

Duplicate review classifies the 107 rows in 38 hash groups: 61 intentional controls reproduce 31 valid outcomes for wrong-scope filter tests; 13 primary outcomes are identical across grades/scopes; and 2 IDs are the same Vietnamese G5 outcome from the same source page, topic and region (page 93 contains one printed row). No row was removed by hash. The Vietnamese G5 duplicate is confirmed redundant but remains until its single indexed vector can be removed safely. `math-g5-053` contains the complete outcome and example on PDF page 211, while its parent topic continues on page 212; its current index still has the abbreviated topic. This metadata/vector refresh is pending. Structural and source completeness were checked across all 497 outcomes; semantic/pedagogical and teacher review remain pending.

## Retrieval evaluation

Production threshold remains 0.855. Older exploratory measurements at 0.75 and 0.855 are retained separately; threshold calibration is NOT_RUN. Latest-per-scope exploratory evaluation covers 8/15 scopes and 104 queries:

| Metric | Result | Denominator |
|---|---:|---:|
| Positive Hit@3 | 80/80 = 100% | 80 positive queries |
| False rejection | 0/80 = 0% | 80 positive queries |
| Negative rejection | 19/24 = 79.2% | 24 negative queries |
| False acceptance | 5/24 = 20.8% | 24 negative queries |
| Cross-scope leakage | 0 | 104 queries |
| Control exclusion | 33/33 = 100% | 33 control probes |

Macro-average by evaluated scope: positive Hit@3 100%; negative rejection 79.2%. Four scopes passed both positive and negative gates. MATH G3 and VIETNAMESE G3–G5 failed due to false acceptance. Seven scopes are NOT_RUN and excluded from averages. Overall exploratory gate: **FAIL**.

Holdout is separate: 3/15 scopes, 36 queries. Positive Hit@3 18/18; false rejection 0/18; negative rejection 9/9; near-miss rejection 3/9; false acceptance 6/18; leakage 0. All three measured MATH scopes failed the combined gate. The remaining 12 scopes are NOT_RUN. The 180-query manifest is source-traceable, but all labels await independent review. MATH G1–G3 v2 were authored after observing development failures and are candidate holdout only. Exposed results remain development evidence; production threshold was not changed.

Old live failures remain FAIL. Full evidence-gate-v2 live benchmark is NOT_RUN. The embedding provider reported a daily request quota at the last recorded run; no fresh calls were made in this continuation. Query cache keys include exact query, model, dimension, and task type. No document embeddings were regenerated.

## Failure analysis and evidence gate

The five exploratory false acceptances and six failed holdout queries, with query, expected outcome, retrieved chunks, scores, source/pages, and tentative quality-vs-operation classification, are listed in [failure analysis](../evidence/false-acceptance-analysis-2026-10-12.md). Their subject/grade/version filters were correct; failures concern unsupported boundaries and near-miss interpretation, not evidence of quota or ingest failure. Labels were not changed to improve scores.

Evidence-gate-v2 has offline regression evidence only: 11/11 exposed failures rejected; 30 source-derived development boundary cases across 14 rules accepted 15/15 supported and rejected 15/15 adjacent unsupported cases (false block 0/15; false accept 0/15). This is not independent evaluation or live retrieval proof. Rules do not use benchmark query or chunk IDs. See [rule/source audit](../evidence/evidence-gate-rule-audit.csv). Similarity alone is not treated as proof that a request's limits are supported.

## Generation and review

A strategy-level comparison attempted all 10 game types. Six paired with/without-RAG outputs were captured with schema-valid outputs; four (MATCHING, MEMORY_CARD, DRAG_DROP, ORDERING) failed at the Gemini-with-RAG call with InvalidRequestException. No output exists for those four. Their historical artifacts do not contain HTTP status, provider code/message or response correlation ID, so no root cause is known. The adapter now records available status/code/message and correlation ID with credential redaction; LangChain4j's `HttpException` exposes status and message but not response headers. No retry was issued: the last embedding quota retry estimate was 19h 2m 50.8s at 2026-10-12 04:57Z, so the quota window has not elapsed. These remain provider errors, separate from content quality.

A Spring-managed service integration test now calls `GameGenerationService.generate(...)` for 15 supported and 15 insufficient-evidence cases through the production registry, strategy adapter, factory, validator, retry loop and moderation chain, with a local Gemini protocol stub and in-memory reviewed corpus. It passed both tests: all 30 cases were exercised, negative cases made no chat request, and retrieval/context/schema assertions passed. This is service integration only; it is not real-provider generation or HTTP API E2E. HTTP API E2E remains NOT_RUN because the repository has no game-generation endpoint.

Comparison evidence is incomplete: among the six captured pairs, an AI desk-check found 20/20 explicit answer/arithmetic items in the with-RAG outputs provisionally correct; this is not independent or teacher scoring. The no-RAG ODD_ONE_OUT output included an ambiguous item with multiple plausible odd choices. SPOT_THE_TARGET has no explicit answer field for correctness scoring. No paired curriculum-alignment score has been reviewed.

The 30-case service matrix is prepared, not executed. No claim is made that all 15 scopes or all 150 scope × game-type combinations passed. Two older MATH G1 QUIZ smoke tests cover one game type only.

## Code, contract, tests, and review status

- **Implemented:** required subject/grade/source/version/model retrieval filters; source/page context; unsupported-scope rejection; evidence gate; one retrieval before retry and stable context; context integration into all 10 strategies; advisory claim reviewer; query cache and evaluation/audit runners.
- **Corpus/index:** 15/15 scopes and 558/558 vectors verified; idempotent rerun wrote 0.
- **Build/tests:** local Maven cache selection was the build blocker: Maven defaulted to `sandbox local Maven repository`, while the Spring Boot 4.1.0 parent is present in `%USERPROFILE%\.m2\repository`. No `settings.xml` was found. POM still pins Boot 4.1.0. The wrapper now handles a null PowerShell `.Target`; test compilation and the latest full suite ran on JDK 25 with `-Djacoco.skip=true`; 537 tests passed, 0 failed/errors and 2 Gemini-opt-in tests skipped. JaCoCo coverage was not checked because 0.8.12 cannot instrument generated Java 25 classes; JDK 21 is not installed. The archived 533-test run records 71.14% coverage but omits its Java/Maven/local-repository fingerprint; separate older build notes mention JDK 21 but do not establish the runtime of that 533-test run. H2 contextLoads does not prove Flyway/pgvector against PostgreSQL.
- **Public DSL / `curriculumReview`:** generation attaches advisory claims/warnings to `metadata.curriculumReview`; the frontend has only a TypeScript type and no runtime display/use. Because the product request says teachers should see these warnings, keep the field in the public contract rather than treating it as evaluation-only. Optionality does not establish compatibility: the field was added to the existing 1.0.0 DSL schemas, Duy must review placement/semantics/versioning, and the frontend needs a warning renderer before teachers can see it. No teacher review is claimed.
- **Chunk review:** one 28-chunk AI review was advisory only. Semantic/pedagogical review and teacher review remain NOT_RUN/PENDING; AI output is not human approval.
- **Secrets/database:** this report contains no secret values and makes no claim of a PostgreSQL migration or live endpoint test from H2.

## Status summary

| Dimension | Status |
|---|---|
| Official source, 15-scope extraction, provenance | PASS: PDFBox 558/558; 1 parent-topic update and 1 redundant-row cleanup pending selective index changes |
| Corpus ingestion/idempotency | PASS, 558 vectors; 0 writes on rerun |
| Exploratory retrieval | FAIL, 8/15 scopes; 5 false acceptances |
| Holdout | FAIL on measured 3/15; 12/15 NOT_RUN; labels pending independent review |
| Calibration | NOT_RUN |
| Evidence-gate live benchmark | NOT_RUN |
| Strategy comparison | 6/10 outputs captured; 4/10 provider errors |
| Service integration | PASS offline with local provider stub: 30/30 cases through Spring-managed service; no real Gemini content or HTTP API call |
| HTTP API E2E | NOT_RUN; endpoint absent |
| AI claim review | Advisory code exists; live evaluation NOT_RUN |
| Teacher review | PENDING |
| Duy contract/versioning review | PENDING; frontend runtime warning display not implemented |

## Evidence index

- Scope matrix: [scope-coverage.csv](scope-coverage.csv), [scope-coverage.json](scope-coverage.json)
- Detailed runs: [full-curriculum-run-2026-10-12.json](full-curriculum-run-2026-10-12.json)
- Source applicability: [source-applicability-full.md](../source-applicability-full.md)
- 558 chunk audit: [all-558-chunks.csv](../evidence/chunk-audit/all-558-chunks.csv)
- False-acceptance analysis: [false-acceptance-analysis-2026-10-12.md](../evidence/false-acceptance-analysis-2026-10-12.md)
- Holdout/resume: [holdout-manifest-2026-10-12.csv](holdout-manifest-2026-10-12.csv), [resume-runbook-2026-10-12.md](resume-runbook-2026-10-12.md)
- Raw runs: [results directory](.)
- Do not commit or push from this worktree; main has not been touched.
