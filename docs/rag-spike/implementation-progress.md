# Execution ledger — plan: docs/superpowers/plans/2026-10-30-rag-generation-business-plan.md

User authorized implementation on 2026-10-30. Scope: P0/P1 (T1–T6); T7/T8 remain deferred.

Ruling: Work in the existing feature checkout `duc/task-1-ai-services-structured-output` and preserve uncommitted pipeline changes. Do not create a separate checkout that omits those approved changes or commit unrelated changes.

Ruling: Use native Windows tools and this durable ledger rather than Bash-only workflow helpers. Implement inline with TDD, then request a fresh read-only review.

Pre-flight: T1 catalog produces dataset scope consumed by T3; T2 produces typed constraints/decisions consumed by T3/T4/T5; T3 keeps CurriculumContextProvider.Evidence compatible with generation; T5 must report retrieval and verification separately; T6 instruments these boundaries without query labels.

Ruling: Human approval of constraints, independent benchmark labels and manual game review cannot be fabricated. Prepare concrete draft artifacts and review checks; report those release gates as pending until evidence is supplied. Continue all independent implementation and local validation.

## Status and evidence

- T1: local implementation verified. Catalog only publishes primary scopes, generation uses the existing unsupported-scope exception; regression run: 41 tests, zero failures/errors (`backend/target/rag-t1-green.log`).
- T2: typed capabilities, conservative parser and verifier implemented. Checksum/coverage/control/duplicate guards tested. Human sidecar review is pending; runtime requires approval of exact bytes, not merely a boolean. Review artifact: `constraints-review.md`.
- T3: lazy model/store creation and runtime DB readiness implemented. Clock tests exercise failure, cached failure, recovery and expiry; Spring configuration test confirms no DB access during RAG bean creation. Current-request query failure still returns503 after a cached ready result.
- T4: guidance, existing HTTP error envelope, unchanged DSL, single retrieval/retry/safety boundary verified. Canary test found raw provider payload logging; removed payload from logs while preserving the existing exception-cause contract. Focused run: 39 tests, zero failures/errors (`backend/target/rag-t4-green.log`).
- T5: benchmark framework and CLI implemented, including cohort distributions, independent group/topic separation, reviewed checksum manifests, acceptance and false acceptance metrics. **Pending:** externally reviewed 30 tune/60 holdout labels and live results; no synthetic labels claimed as independent evidence. Legacy reports explicitly remain retrieval-only. Live pgvector score/filter test passed on a TEMP table: cosine1/0/-1 maps to score1/0.5/0; threshold0.855 retains only the aligned vector. Evidence: results/pgvector-score-2026-10-30.json.
- T6: finite-label Micrometer timers/counters and percentile tracking wired; registry failures cannot affect domain outcomes. Complete local suite after integration: 492 tests, zero failures/errors, 3 skipped; coverage gate70% passed (`backend/target/rag-business-local-tests.log`). Full suite also ran: `contextLoads` needs a valid JDBC URL; initial metric assertion was corrected and then passed in the local suite. Live service/game acceptance remains pending.
- T7/T8: outside current implementation scope.

Ruling: Immutable packaged manifest/chunks remain validated at catalog load. Defer transient DB/model/store/constraints availability to runtime; do not claim JPA/Flyway or malformed packaged artifacts can operate without a database or valid resources.

Ruling: Preserve the legacy evaluation API and add `CurriculumBenchmark` as a separate focused unit instead of expanding the four-field legacy query type and invalidating existing reports/tests. CLI accepts externally reviewed tune/holdout files. Do not author a fake independent holdout to satisfy sample counts.

Ruling: Do not auto-commit this mixed working tree. Leave reviewable changes and artifacts in place, preserving the preceding authorized pipeline edits.

## Independent review

Fresh read-only reviewer found omitted numeric/carry/unit constraints, broad clock aliases and unguarded metric failures. Added failing regression tests, then fixed each. Reviewer recheck: no remaining Critical/Important findings. Also removed cm from the general practical-measurement capability for chunk023, regenerated checksum, documented activation and separated cohort summaries from the overall quality gate.

## Release gates still open

### Lượt nghiệm thu rộng ngày2026-10-30

Xem [báo cáo nghiệm thu](acceptance-2026-10-30.md). Full regression với DB thật hiện đạt496 test tổng,0 failure/error,5 skipped, coverage70% đạt; cổng JDBC context đã được kiểm tra thành công. Lượt live mới có22 test:20 đạt,2 error;90 ca thăm dò đạt29/30 supported,0/60 false acceptance,0 leakage.18 game được tạo còn có lỗi đáp án/nội dung và thiếu media; review bằng AI không thay giáo viên. OpenAI Moderation vẫn401. **Chưa nghiệm thu phát hành.**

1. CLOSED: user approved the exact sidecar with “ok chốt”; decision and SHA recorded in `constraints-review.md`, local approval SHA configured. Independent benchmark/game review remain separate gates.
2. Independent tune/holdout authorship, review and live run; no quality/latency/cost conclusion fabricated.
3. At least20 manually reviewed games; pgvector score/filter integration has passed.
4. CLOSED: full application-context tests now pass with local DB configuration. No API/UI generation endpoint is added by this backend plan.
