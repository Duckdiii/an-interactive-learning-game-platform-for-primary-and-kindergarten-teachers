# Curriculum corpus expansion: scope and workflow

> **Chuyên đề Curriculum-RAG**: [[Chương trình GDPT 2018 và Curriculum RAG]]



Status: primary corpus expansion remains draft. On 2026-10-31, fresh PDFBox extraction verified all 15 primary-scope datasets against the exact-hash 1,555-page TT 32/2018 PDF, plus the 84-page kindergarten source. On 2026-11-02, the owner approved the Kindergarten corpus as sourced curriculum data under the exact-PDF extraction policy; this does not claim separate specialist pedagogical review. A separate loopback-only evaluation database contains all 653 rows (519 primary: 485 outcomes + 34 controls; kindergarten: 134 outcomes). Extraction evidence is retained per dataset under `backend/target/curriculum-spike/extracted/<dataset>/` and `docs/rag-spike/evidence/*-source-verification.json`.

## Business outcome

Teachers should be able to request a QUIZ grounded in an applicable curriculum outcome for every supported primary subject and grade, and for the agreed kindergarten domains. The system must stop generation when it has no verified evidence. A close vector match alone is not proof that an outcome supports the request.

## Requirements

- **BR-01 — Correct scope:** Match a request only to its published subject/grade dataset. Kindergarten covers the agreed cognitive and language domains across age bands 3–4, 4–5 and 5–6, without filtering retrieval by age.
- **BR-02 — One outcome per chunk:** Each non-control row represents exactly one YCCĐ or one preschool expected outcome. Never split by character count or combine separate outcomes for convenience.
- **BR-03 — Verifiable source:** Each row records exact PDF page, printed page, region/age column and verbatim source fragment. A source hash, page count or fragment mismatch blocks extraction and ingest.
- **BR-04 — Separate controls:** Control outcomes may be stored for leakage checks, but every production retrieval excludes them.
- **BR-05 — Honest readiness:** A dataset is available to generation only after source verification, schema/count validation and the applicable owner approval policy. A pilot or partial corpus must be labeled as such and must not imply complete subject/grade coverage.
- **BR-06 — Reproducible evaluation:** Each dataset has its own versioned manifest and evaluation set. Retrieval thresholds are not copied from Math Grade 1 without measurement.
- **BR-07 — No persistent teacher text:** Do not write teacher topics/prompts to durable cache or logs without an approved retention and access policy.

## Verified repository coverage and production readiness

These counts describe packaged resource files, not a fresh query of Supabase:

| Scope | Packaged data | State |
| --- | ---: | --- |
| Primary Math, Grade 1 | 23 outcomes + 5 controls | Source-verified pilot corpus now uses `curriculum/primary/math-grade1`; runtime remains the only published elementary scope and still requires its approved constraints fingerprint |
| Primary Math, Grade 2 | 43 outcomes + 0 controls | All 43 outcomes passed PDFBox and independent source review on pages 190–194; adjacent grade sections do not share those pages; evaluation pending; not published |
| Primary Math, Grade 3 | 51 outcomes + 0 controls (51 source fragments) | 49 matched by PDFBox; 2 stacked-fraction outcomes are separately marked manual transcriptions; page/footer checks passed on 2026-10-31; amendment applicability and evaluation pending; not published |
| Primary Math, Grade 4 | 53 outcomes + 0 controls (57 source fragments) | All 53 matched by PDFBox in the declared regions; all six printed-page footers and rendered pages 200–205 checked on 2026-10-31; independent review passed; not published |
| Primary Math, Grade 5 | 53 outcomes + 0 controls (56 source fragments) | 52 outcomes / 55 fragments matched by PDFBox; one stacked-fraction outcome separately marked as manual transcription; all six printed-page footers and rendered pages 206–211 checked on 2026-10-31; independent review passed; not published |
| Primary Vietnamese, Grade 1 | 36 outcomes + 0 controls | All 36 outcomes matched PDFBox and independent visual source review on pages 74–77; Grade 2 begins on the next PDF page, so no same-page controls apply; evaluation pending; not published |
| Primary Vietnamese, Grade 2 | 42 outcomes + 2 controls (49 source fragments) | All 44 chunks passed PDFBox on pages 78–83; controls are Grade 3 outcomes beginning on the same transition page; independent review passed after correcting one wrong page citation; not published |
| Primary Vietnamese, Grade 3 | 45 outcomes + 2 controls (50 source fragments) | All 47 chunks matched by PDFBox; controls are Grade 4 outcomes from the same page; all six printed-page footers and rendered pages 82–87 checked on 2026-10-31; independent review passed; not published |
| Primary Vietnamese, Grade 4 | 42 outcomes + 2 controls (45 source fragments) | All 44 chunks matched by PDFBox; controls are Grade 3 outcomes on the first source page; all five printed-page footers and rendered pages 87–91 checked on 2026-10-31; independent review passed; not published |
| Primary Vietnamese, Grade 5 | 40 outcomes + 2 controls (45 source fragments) | All 42 chunks matched by PDFBox; controls are Grade 4 outcomes on the preceding source page; all six printed-page footers and rendered pages 91–96 checked on 2026-10-31; independent review passed; not published |
| Kindergarten | 134 expected outcomes, 0 controls (134 source fragments) | Cognitive and language outcomes for ages 3–4, 4–5 and 5–6 on PDF pages 61–70. 131 passed PDFBox; 3 superscript footnote cases have separately declared manual transcriptions. Owner-approved as corpus data under exact-PDF extraction policy; local DB contains its vectors and runtime catalog now includes it. Live quality evaluation remains pending; no separate specialist pedagogical review is claimed. See `docs/rag-spike/source-audit-kindergarten.md` and `docs/rag-spike/evidence/kindergarten-source-verification.json`. |
| Primary English, Grade 3 | 15 outcomes + 3 controls (20 source fragments) | All 18 chunks passed PDFBox region and printed-footer verification across 20 fragments on 2026-10-31; amendment applicability and evaluation pending; not published |
| Primary English, Grade 1 | 6 outcomes + 7 controls (13 source fragments) | Full scan located the annex in the exact-hash PDF; all 13 fragments passed PDFBox on PDF pages 1238-1239 (printed pages 7-8, `FULL` region); source text visually checked; applicability review passed; evaluation pending; extraction-only, not ingested or published |
| Primary English, Grade 2 | 7 outcomes + 6 controls (13 source fragments) | Full scan located the annex in the exact-hash PDF; all 13 fragments passed PDFBox on PDF pages 1238-1239 (printed pages 7-8, `FULL` region); source text visually checked; applicability review passed; evaluation pending; extraction-only, not ingested or published |
| Primary English, Grade 4 | 14 outcomes + 3 controls (19 source fragments) | All 17 chunks passed PDFBox with grade-scoped skill bands across 19 fragments; three printed-page footers and rendered pages 1277–1279 checked on 2026-10-31; independent review passed; not published |
| Primary English, Grade 5 | 15 outcomes + 2 controls (18 source fragments) | PDFBox verified 14 outcomes and both controls; one `Đ` glyph transcription (`en-g5-012`) was visually checked and declared separately; four printed-page footers and rendered pages 1279–1281 checked on 2026-10-31; independent review passed; not published |

The original estimate of 497 primary outcomes plus 61 controls is not present as packaged data. The current 15 primary scope manifests sum to 485 outcomes and 34 controls; the difference is not padded with invented outcomes or controls. Fresh dataset checks found no duplicate chunk IDs or duplicate primary texts and matched the manifest role counts for all 15 scopes. Control rows are included where a neighboring-grade outcome is available for leakage checks. TT 32/2018 includes an optional English familiarization program for Grades 1-2, separate from mandatory English Grades 3-5; both drafts now pass source hash, page count and PDFBox fragment verification, but remain extraction-only pending evaluation and review gates. The current target is 15 subject/grade combinations (Math, Vietnamese and English Grades 1-5), plus kindergarten. None of the expanded primary scopes is runtime-published or ingestible; kindergarten remains expert-review and evaluation pending.

## Dataset readiness states

Track each subject/grade dataset independently through these states:

1. `SOURCE_IDENTIFIED` — official source, applicable version and amendment review recorded.
2. `CHUNKS_DRAFTED` — one outcome per row, with topic path and source fragments.
3. `SOURCE_VERIFIED` — manifest hash/page count match and every fragment passes PDFBox in its declared region.
4. `CONTENT_REVIEWED` — each chunk is checked against the source page for one-outcome boundaries, transcription and scope; any PDFBox exception is separately declared and reported as manual.
5. `EVALUATION_READY` — natural teacher-style positive and negative examples are frozen for development/evaluation.
6. `INGESTED` — deterministic IDs are present in the target database and metadata filters are verified.
7. `PUBLISHED` — runtime catalog enables the scope only after all required gates pass.

Never skip a state by inferring readiness from a successful build, embedding call or database connection.

## Repeatable intake procedure

For each dataset:

1. Create a directory under `backend/src/main/resources/curriculum/` with `manifest.json`, `chunks.jsonl`, and (when PDF text extraction is unreliable) `text-transcriptions.jsonl`.
2. Record the official source identity, SHA-256, page count, curriculum version, dataset version, applicable amendments, exact pages and the review state in the manifest.
3. Curate each expected outcome as one JSONL record. Use separate control records only for plausible scope-leakage checks. Do not derive data with arbitrary text windows.
4. Verify every fragment against the declared page and region. Keep any manual transcription explicitly linked to the PDF location and independently reviewed.
5. Check IDs, required metadata, exact counts, scope consistency, age/domain rules and control flags before embedding.
6. Ingest idempotently. Query each dataset with its exact metadata filter; inspect representative results and prove controls cannot be returned.
7. Evaluate using that dataset's frozen development set. Record false accepts, false rejections, evidence accuracy, suggestions and latency. Label small exploratory samples as exploratory, not as benchmark results.
8. Enable the scope in the production catalog only when the readiness gates are satisfied.

## Implementation and acceptance trace

| BR | Components / files | Task | Acceptance evidence |
| --- | --- | --- | --- |
| BR-01, BR-05 | `CurriculumCatalog`, `CurriculumDataset`, `CurriculumRagConfiguration`, `CurriculumRAGService`, `VerifiedCurriculumContextProvider` | Replace the two-scope hardcoding with manifest-backed dataset selection; ensure no partially reviewed dataset is published | Catalog tests prove supported scopes select their own source/version; unknown or not-ready scopes fail before embedding/generation |
| BR-01, BR-02 | `CurriculumChunk`, kindergarten chunk data and embedding metadata | Represent kindergarten outcomes without a fabricated curriculum subject; preserve the nearest DSL subject only as a generation choice and require an explicit age band | Tests prove kindergarten retrieval filters the requested age before ranking and still filters grade, domain, dataset/version, source hash and controls |
| BR-02, BR-03, BR-04 | `CurriculumPdfExtractor`, per-dataset `manifest.json` and `chunks.jsonl` | Apply the same source gate to every new dataset | Each dataset extracts with matching hash/page count and verifies every fragment; one deliberately altered fragment fails and produces no success report |
| BR-03, BR-05 | `CurriculumDataset` and corpus resource tests | Validate manifest scope, outcome/control counts, required provenance and one-outcome records | A malformed, mismatched or unreviewed dataset is rejected at load/readiness time |
| BR-06 | Per-dataset evaluation resources and runner | Make evaluation selection dataset-aware without sharing Math Grade 1 thresholds or labels | Reports include dataset/source/code fingerprints and metrics by scope/style; missing credentials/database is reported separately from quality failure |
| BR-07 | Query embedding configuration/cache | Keep durable file cache evaluation-only; avoid persisting teacher input in runtime mode | Runtime config test confirms no persistent query cache; evaluation mode explicitly opts in |

## Decisions and assumptions

- The target is 15 primary subject/grade combinations (MATH and VIETNAMESE × Grades 1–5; ENGLISH × Grades 1–5 under TT 32/2018), plus the kindergarten dataset specified above. English Grades 1–2 are optional familiarization; the local source PDF and amendment/applicability review are still needed before verification or publication.
- A shared primary PDF does not imply shared applicability review: each curriculum subject and any amendments must be checked within its scope.
- PDF matching verifies that transcribed text comes from the supplied source; it does not by itself prove that every outcome in a scope has been included.
- Thresholds and quality targets remain proposals until measured on a frozen, independently labeled set.
- External database ingestion is a later operational step; local corpus completeness and evidence verification come first.

## Completion conditions

The expansion is complete only when each declared scope has an explicit readiness state, all published datasets pass source verification and review gates, controls are excluded from every production query, independent evaluation reports are stored under `docs/rag-spike/results/`, and the backend regression suite passes. Any scope that lacks an official source, reliable transcription or reviewer remains disabled and is reported as incomplete.

## Follow-up status — 2026-11-01

- Source verification and local ingest for 15 elementary scopes plus the kindergarten corpus are recorded in the verification report. Ingest/idempotency were inherited and not repeated for this request because the corpus did not change.
- Age-aware kindergarten retrieval and request clarification are implemented and covered by regression tests. A local Gemini query confirmed the returned source was AGE_3_4 after filtering.
- The current publication catalog still exposes only MATH / GRADE_1 at runtime. Other primary scopes do not yet have independently reviewed natural-language decision evaluation; kindergarten remains disabled while specialist approval is pending.
- Bounded live generation passed for the only integrated game/scope (QUIZ / MATH / GRADE_1); one out-of-scope query was rejected before generation. See the [sanitized acceptance record](results/local-acceptance-2026-11-01.json).
- Independent review found two fail-open risks (legacy providers ignoring age and query dataset/grade mismatch); both were changed to fail closed and covered by regression tests.
- Independent teacher-style development/holdout measurements across all 15 primary scopes and preschool ages are not available, so false-accept/false-reject rates are not claimed. No remote Supabase migration or ingestion was performed.

## Runtime hardening follow-up — 2026-11-01

- The runtime Math Grade 1 corpus was moved from `curriculum/spike/` to `curriculum/primary/`. Other subject/grade datasets remain in `spike/` because their natural-language decision evaluation and publication gates are incomplete; this is not a promotion of all 15 scopes.
- With Curriculum RAG enabled, generated game content now requires a second Gemini review of every question's marked answer and curriculum support. The review must cover every question and cite IDs from the retrieved evidence; a missing reviewer, malformed response or failed review cannot return a game. Accepted claims are stored in the existing teacher-only curriculum review record, outside the frozen DSL.
- The business validator now independently computes a single explicit integer arithmetic expression and rejects chained/multiple-expression prompts or a mismatched marked answer before Gemini review. This deterministic check covers explicit calculations; it does not prove arbitrary visual or prose answers. The Gemini check is a guard, not independent human validation or a guarantee of correctness.
- Kindergarten retrieval now requires an injected `KindergartenEvidenceVerifier` to select supported chunks from the age-filtered candidate set. No production verifier is configured, so even if its flag is enabled the provider fails closed before vector retrieval. Preschool remains disabled pending specialist review and a domain verifier.
- Focused hardening regressions: 94 tests passed. Full backend suite: 561 tests, 0 failures, 0 errors, 8 skipped; JaCoCo gate passed. The Gemini content-reviewer was tested with a fake model; a live reviewer call and latency measurement were not run.
- Independent code review found two additional fail-open cases: multi-expression questions and an accepted result with review status other than `REVIEWED`. Both now fail closed and have regression tests.
- The independent natural-language benchmark, wider runtime publication, preschool specialist approval and remote Supabase deployment remain incomplete. Historical `docs/rag-spike/` reports and evaluation tools retain their name; they document the pilot/evaluation history and are not the production corpus path.

## Cross-scope runtime recheck — 2026-11-01

This update supersedes the earlier statements in this file that the runtime catalog exposes only Math Grade 1 or that no Kindergarten semantic verifier path exists. It does **not** claim all scopes are ready for generation or publication.

- `CurriculumRagConfiguration` now loads all 15 packaged primary datasets when RAG is enabled. It includes Kindergarten only when its feature flag is enabled; `VerifiedCurriculumContextProvider` additionally requires the configured expert-approved SHA to match the current Kindergarten source. No specialist approval is claimed.
- `CurriculumRAGService` supports a selected dataset source and scope-specific candidate policy. The provider selects by request subject/grade, applies exact source/version/model filters, excludes controls, checks readiness by source, and keeps the deterministic Math Grade 1 verifier isolated to that pilot. Other primary scopes and age-filtered Kindergarten use the structured semantic evidence verifier; similarity cannot decide support, and only exact retrieved candidate IDs may be returned.
- Cross-dataset in-memory regression passed for all 15 primary datasets plus Kindergarten age/domain filtering. Focused suite: 62 tests passed. Current full backend `mvn verify`: 595 tests, 0 failures/errors, 8 skipped; JaCoCo passed.
- The existing `QuizGameStrategy` still hardcodes a Math Grade 1 prompt and rejects other grades, while `GeminiGameContentGenerator` retains its Math Grade 1 pilot guard. Therefore only QUIZ / MATH / GRADE_1 is end-to-end generation-enabled. Widening the existing strategy contract requires its owner's coordination and was not done as part of RAG.
- No new live pgvector/semantic quality run was possible in the local environment. Independent natural-language benchmark, false-accept/false-reject estimates, teacher/specialist label review, live semantic reviewer call, and preschool publication remain pending. Remote Supabase was not modified.

## Latest backend remediation scope matrix — 2026-11-01

All rows below have implementation and fixture regression coverage of the RAG path. That is separate from real-model quality, human review and concrete generation support. Corpus source-verification/ingest evidence is inherited, not repeated here. Current live evaluation is NOT_RUN in every row because the process has no local DB configuration or Gemini key. No remote writes.

| Scope | Outcomes | RAG implementation | Exploratory preparation (AI, unreviewed) | Remaining blocker |
|---|---:|---|---|---|
| Mầm non 3–4 tuổi | 38 | COGNITIVE 24; LANGUAGE 14 | 10 dev + 20 exposed candidates / age | Specialist approval + generator contract |
| Mầm non 4–5 tuổi | 47 | COGNITIVE 31; LANGUAGE 16 | 10 dev + 20 exposed candidates / age | Specialist approval + generator contract |
| Mầm non 5–6 tuổi | 49 | COGNITIVE 32; LANGUAGE 17 | 10 dev + 20 exposed candidates / age | Specialist approval + generator contract |
| Toán 1 | 23 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels |
| Tiếng Anh 1 | 6 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Tiếng Anh 2 | 7 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Tiếng Anh 3 | 15 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Tiếng Anh 4 | 14 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Tiếng Anh 5 | 15 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Toán 2 | 43 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Toán 3 | 51 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Toán 4 | 53 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Toán 5 | 53 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Tiếng Việt 1 | 36 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Tiếng Việt 2 | 42 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Tiếng Việt 3 | 45 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Tiếng Việt 4 | 42 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |
| Tiếng Việt 5 | 40 | Own source/version + appropriate verifier | 30 dev + 60 exposed candidates | Live DB/key + independent labels + non-pilot generator contract |

Regression uses fixture vectors and fixture verifier decisions through the real provider for all 16 datasets; KG positives span three ages and COGNITIVE/LANGUAGE. A separate test exercises explicit LANGUAGE + AGE_4_5 before verification. This does not measure embedding ranking or the model's semantic correctness. Readiness is per versioned dataset/source; the KG dataset is one deployment unit with request-level age/domain filters. Primary corpora and KG retain their existing source-review status; no label/expert approval was invented.

Only the existing QUIZ / MATH / GRADE_1 concrete adapter is implemented end to end, within its limited verifier grammar. The RAG evidence service and semantic output gate are implemented for other scopes, but the current `QuizGameStrategy`/adapter still block concrete generation outside that pilot. The RAG overload accepts an optional preschool domain; the existing generation request has no domain/lesson-plan field. Those contracts need coordination with their owner; no teammate strategy/schema or DSL was rewritten.

Drafts cover selected objectives and repeated paraphrases, not all outcomes or an independent holdout. Negative intent groups overlap between DEV and exposed candidates. The reviewed benchmark gate rejects these labels and overlapping held-out groups. Acceptance remains Hit@3/support acceptance ≥90%, zero false accepts/leaks, reviewed labels and appropriate specialist/content review. Latest tests and blocked-live run details are in the current-run object in `results/local-acceptance-2026-11-01.json`.

## Cross-platform evaluation recheck — 2026-11-02

- On remote base `f3a7ecd8b637b861e816464c099201c463de9ddd`, DEV preflight passed for 16 datasets / 480 AI-authored queries and HOLDOUT_CANDIDATE preflight passed for 16 datasets / 960 exposed AI-authored queries. These are integrity/load checks only; neither preflight performs retrieval or establishes a holdout.
- The first preflight exposed a Windows `core.autocrlf=true` issue: CRLF checkout bytes did not match LF-based query and Math Grade 1 constraint manifest hashes. The evaluation loader and constraint sidecar now canonicalize text to UTF-8 LF before hashing/parsing. Regression tests reproduced each failure before the fix, pass afterward, and confirm edited content still fails its unchanged hash.
- `mvn verify` on the follow-up worktree passed: 622 tests, 0 failures/errors, 8 skipped; JaCoCo passed. The 24 focused tests also passed; running only those classes triggers the repository's expected 70% whole-backend coverage gate, so it is not a valid standalone `verify` result.
- A bounded exploratory run was attempted with the DB URL forced to loopback `127.0.0.1:55432/rag_eval`; it stopped before any Gemini request with `SQLTransientConnectionException`. The PostgreSQL 18 service responds on 5432, but 55432 does not accept connections and the local installation lacks pgvector. The checked-in `.env` target was not used for database access; Supabase was not contacted or written.
- Therefore real vector retrieval, semantic decisions, false accept/reject rates and online quality remain **NOT_RUN** for all scopes. Existing source verification/ingest records are inherited, not re-run. Independent labels and preschool specialist approval remain pending; the generation adapter remains limited to its existing QUIZ / MATH / GRADE_1 contract.

## Local runtime execution recheck — 2026-11-02

This section supersedes the immediately preceding `NOT_RUN` statement; that statement remains as the historical state before the isolated local database was provisioned.

- Local PostgreSQL 18.4 + pgvector now runs at loopback port 55432 in ignored `backend/target/rag-eval-local/`; Flyway V1–V6 completed. All packaged datasets were ingested via the existing runner. SQL verified 653 unique rows, 768-dimensional vectors, one source hash per dataset, and the expected row/control counts; a complete second Ingest pass reported 0 written / 653 skipped over all 16 datasets. No remote database was contacted or written.
- The production provider processed 480 AI-authored DEV queries (30 for each of 16 datasets). 80 returned real decisions: 37 supported and 43 insufficient evidence. 400 returned `SERVICE_UNAVAILABLE` and were excluded from decision metrics. 130 had no ranked candidates, and 270 had candidates before provider failure. All 80 measured decisions had exploratory Hit@3 = 100%, false accepts = 0 and scope leaks = 0; supported acceptance was below the unchanged 90% target for English G3 (70%) and English G5 (87.5%). Ten datasets had zero completed decisions. Every run is marked exploratory because labels are AI-authored/unreviewed; no benchmark gate is established.
- The bounded generation smoke then confirmed the external failure: Gemini HTTP 429 `RESOURCE_EXHAUSTED`, Free Tier embedding request quota 1,000/day exceeded, response suggested retry after about 13h51m. The positive Math G1 generation case did not generate; the negative/out-of-corpus case could not complete retrieval and therefore did not prove a curriculum rejection. No retry was made after quota exhaustion.
- Review packet instructions and the complete per-scope table are in `docs/rag-spike/README.md`; the machine-readable summary is in `results/local-acceptance-2026-11-01.json`. Four AI-labeled positive queries were refused even though their expected English chunk ranked in top 3 (English G3 DEV-006/009/013; English G5 DEV-014). These are review candidates, not confirmed system errors until human label adjudication.
- Independent benchmark labels, double-label agreement, specialist review for Kindergarten, and non-pilot generation contract agreement remain outstanding. Existing generation contract owners need to extend the request/strategy/adapter together; this RAG work did not alter those contracts.
- Full backend `mvn verify` passed on this worktree after the execution: 622 tests, 0 failures/errors, 8 skipped; JaCoCo passed. The opt-in live generation smoke did not pass because quota was exhausted; no positive game or negative evidence rejection is claimed.

### Checkpoint hardening follow-up — 2026-11-02

- The prior 400 service failures cannot be attributed to quota from the old artifact: exception classes/statuses were not stored. Categorize them `CAUSE_NOT_CAPTURED_IN_PRIOR_RUN`; only a separate later Gemini embedding smoke proves HTTP 429 at that later time. Four English G3/G5 refusals are retained as verifier-stage regression candidates because their expected chunks were retrieved; labels remain AI-authored/unreviewed and exact semantic rejection reasons were not recorded.
- Added test-runner-only cause classification, quota stop, append-and-fsync checkpointing, exact-query legacy import, and a synthetic benchmark-only persistent embedding cache. Production/teacher requests do not use persistent query cache. Checkpoint/cache fingerprints reject model, source, question-set or retrieval-configuration drift. A quota result is recorded before stopping; service failures stay pending.
- The first post-change run stopped before Gemini because local JDBC reported `SQLTransientConnectionException`. No model call, DB write, migration or ingest was performed. A later check found the existing cluster's PID/process but no listener on port 55432; it was not reinitialized. See the acceptance JSON for the exact recovery state.
- During that failed attempt, the ignored `target/live-dev.json` raw per-query report was overwritten before a blocked-report sidecar guard was added. Tracked evidence still preserves aggregate historic metrics and the four adjudication cases, but not the exact per-query result/ranking rows. Those aggregates cannot identify exactly which 80 queries had decisions. Do not replay all 480; recover the ignored artifact from backup or obtain approval for a new exploratory run. Future blocked attempts write a sidecar without replacing the main report.
- Minimal generator contract proposal for Nguyễn Đức Duy is documented in the existing README/acceptance record. No strategy, generation owner code or DSL was changed.
- Focused regression tests passed: 15 tests, 0 failures/errors. Final backend `mvn verify` passed: 627 tests, 0 failures/errors, 8 skipped; JaCoCo passed. A post-change live resume and live generation remain not run because local JDBC was unavailable before any Gemini call.

## Recovery and artifact-isolation follow-up — 2026-11-02

This section supersedes earlier statements in this report that the local PostgreSQL cluster was unreachable and that a prior report could be imported for resume.

- The existing local PostgreSQL cluster is active; read-only `psql` confirmed `127.0.0.1:55432/rag_eval`, its existing `backend/target/rag-eval-local/data` directory, 653 embeddings and 16 dataset versions. This follow-up performed no restart, initdb, migration, ingest or database write. A previous JDBC connection failure used the project `.env` database role against localhost; that role mismatch does not prove database outage. No Supabase access occurred.
- Recovery searched available backup, worktree, result and Git history locations. The only raw-name match was the ignored blocked `live-dev.json`; available tracked JSON preserves aggregate counts only. The old 80 per-query decisions and rankings are lost from inspected locations. They were not recreated or attributed from totals.
- New execution code isolates every run and attempt, writes reports and complete checkpoint snapshots atomically, pins resume to input/model/retrieval fingerprints, and refuses legacy global-report import. Blocked/preflight reports live in the attempt directory and do not overwrite older evidence. Regression covers preservation of a pre-existing global report, unique attempts, resume identity and path traversal rejection.
- A preflight run `run-20261101T185722896Z-b669d5c0` / attempt `attempt-20261101T185722896Z-9a0ba750` validated 480 DEV drafts and estimated 960 maximum requests (480 embedding + 480 reviewer); it made zero provider calls. No current quota confirmation is stored, so no live rerun was performed.
- Historic service causes remain unclassified (`CAUSE_NOT_CAPTURED_IN_PRIOR_RUN`) except for a separate later Gemini HTTP 429 smoke, which cannot identify the causes of the earlier 400 failures. The four English G3/G5 cases remain label/verifier disagreements with AI-authored, unreviewed labels and no retained verifier rationale; they are not confirmed false rejects.
- Post-hardening checks: focused suite 36/36 passed; full backend `mvn verify` passed 629 tests, 0 failures/errors, 8 skipped, JaCoCo passed. Live retrieval remains unrun because current quota confirmation was absent; the separate preflight made zero provider calls.

## Single-scope live-run readiness — 2026-11-02

- Existing PostgreSQL PID 37736 is active on loopback 55432; read-only verification confirms the original data directory and 653 embeddings across 16 dataset versions. No database lifecycle or ingest action was taken.
- A one-request synthetic Gemini embedding probe returned `RateLimitException`; no batch followed. The earlier 400 historical failures retain unknown causes.
- The evaluator and script now permit only one dataset for `RuntimeExploratory`, require a stable run ID, retain one checkpoint per dataset, and stop after quota exhaustion before entering another scope. A 30-query English G3 preflight validated selection and made zero API calls. Do not interpret it as retrieval.
- The four English cases are analyzed in README with exact query/chunk conditions and ranking known from retained aggregate evidence. Their labels/verifier disagreement remains unresolved pending independent review.
- A minimal internal domain/evidence/generator-context contract for Nguyễn Đức Duy is prepared in the existing README. No generation strategy or DSL change was made.
- After the single-scope change, focused RAG tests passed 37/37 and full backend `mvn verify` passed 630 tests, 0 failures/errors, 8 skipped; JaCoCo passed. The one-request Gemini rate-limit result prevented live evaluation.

## Generation adapter grounding follow-up — 2026-11-02

- The prior non-pilot generation restriction was in the Gemini adapter, which routed every allowed request through a Math Grade 1-specific strategy prompt. The adapter now keeps the Math G1 deterministic arithmetic path intact and uses a separate scope-aware QUIZ prompt for other subject/grade scopes. It carries teacher topic, exact retrieved context and provenance, and rejects non-pilot calls that lack versioned source/hash, dataset version or embedding-model evidence. Unsupported game types remain blocked.
- The selected Kindergarten evidence context now includes its age band, domain, subdomain and provenance. The provider's existing age/domain filtering and semantic evidence verifier remain in place. A request-level Kindergarten domain selector is still missing from the generation request; retrieval currently considers allowed domains and the verifier selects evidence. Exact request-contract coordination remains with the strategy/generation owner; no strategy, schema or DSL change was made.
- Focused tests were added for all 14 non-pilot primary subject/grade combinations and Kindergarten prompt scope, no-provenance rejection, and evidence/context handoff through the existing generation service. They use fixture evidence and a fake chat model; they do not establish live generation quality.
- No live run followed the most recent Gemini `RateLimitException`. Focused tests after this adapter edit passed 56 tests (0 failures/errors/skipped); full backend `mvn verify` passed 634 tests (0 failures/errors, 8 skipped), and JaCoCo passed. This is implementation regression evidence, not live retrieval or generation-quality evidence.
- No benchmark labels or thresholds changed. The four English G3/G5 cases remain unresolved label/verifier disagreements. Independent benchmark review, Kindergarten specialist approval, live retrieval/generation and remote deployment remain pending.

## Kindergarten owner approval policy — 2026-11-02

The owner has approved the 134-outcome corpus as sourced curriculum data because it was extracted from and verified against the exact official PDF hash in the manifest. This does not claim separate preschool-specialist pedagogical review. Runtime catalog includes the dataset with the other packaged scopes; exact-manifest vector readiness, age/domain filtering, semantic evidence verification and control exclusion remain active. Focused configuration/provider tests passed 11/11; full backend `mvn verify` passed 634 tests (0 failures/errors, 8 skipped), JaCoCo passed. No Gemini call or database write was made; live quality evaluation remains pending.
