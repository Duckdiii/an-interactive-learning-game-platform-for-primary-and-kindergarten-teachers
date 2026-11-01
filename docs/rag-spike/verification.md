# Verification record — 2026-10-10

## Current corpus verification - 2026-10-31

Fresh `Extract` runs verified all 15 elementary scope datasets against the 1,555-page TT 32/2018 PDF (SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`) and the 134-outcome kindergarten dataset against its 84-page consolidated PDF (SHA-256 `146c1f23b3515d46f2e2e97afcfc0a1d871ef28b6700c7db4fbacfeb56e8572f`). Elementary totals are 485 outcomes and 34 controls; kindergarten has 134 outcomes. PDFBox directly matched 482 primary outcomes, all 34 controls and 131 kindergarten outcomes; 6 outcomes (2 Math Grade 3, 1 Math Grade 5, 3 kindergarten) use explicitly declared manual transcriptions. No duplicate chunk IDs or duplicate primary texts were found, and manifest counts match all 15 elementary files. English Grades 1-2 now verify on PDF pages 1238-1239, printed pages 7-8, `FULL` region.

The full backend suite passed after test database isolation: 544 tests, 0 failures, 0 errors, 8 skipped; JaCoCo coverage checks passed. The extraction runner now stores reports under `backend/target/curriculum-spike/extracted/<dataset>/` and the existing per-dataset reports in `docs/rag-spike/evidence/` were refreshed.

This is source-fragment verification, not proof that the corpus contains every outcome in the national curriculum or professional curriculum approval. The original 497 outcomes + 61 controls estimate does not match the checked-in data (485 + 34); no rows were invented to fill the difference. Expanded primary datasets remain extraction-only and kindergarten remains review/evaluation pending. A read-only online Math Grade 1 query on 2026-10-31 returned `FOUND` from the configured Supabase/Gemini path (top scores 0.8704 and 0.8586). A read-only Kindergarten query failed the dataset-readiness gate because the expected current corpus is missing or differs in Supabase; retrieval did not run. No ingest, migration, negative online evidence-verifier test or game generation was run. The configured database is remote Supabase and its dev/test/production role is not identifiable from configuration, so no writes were attempted. Current runtime availability remains Math Grade 1 plus optional kindergarten only.
## Source

`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Extract -SkipBuild` succeeded against the supplied PDF. Result: 28 verified chunks, 6 extracted pages, matching SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`. The retained evidence includes source-verification.json, right-column text and images for PDF pages 187–189.

## Backend

- Baseline: 445 backend tests passed before adding the spike; application context test requiring a database was excluded.
- Test-first runs demonstrated the missing RAG/config/strategy contracts. New unit tests then passed without external API/database calls.
- Independent read-only review found two issues: metadata-only changes were omitted from the embedding identity, and an incomplete negative benchmark could pass. Both were reproduced by regression tests (2 failures), then fixed. IDs now incorporate scope/version/source fragments; benchmark loading and summary gates require unique IDs and the prescribed query counts.
- Final command: `mvn -B -Dtest=!AigameBackendApplicationTests test dependency:build-classpath -Dmdep.outputFile=target/rag-classpath.txt` → **459 tests, 0 failures, 0 errors, 0 skips**, JaCoCo **70% minimum gate passed**, BUILD SUCCESS.
- `mvn -B clean install -DskipTests` → BUILD SUCCESS, packaged Spring Boot JAR installed in local Maven cache.
- Git whitespace check passed. Existing user edits in `.vscode/settings.json` and `ai-usage-log.md` were preserved; no commit or branch switch was performed.

## Configuration and live measurement

CheckConfig reports only booleans; Gemini key, DB URL/user/password were not configured at the last check. `backend/.env` is ignored by Git. Supabase V5 migration, first/repeated ingestion and live evaluation are **not run**. No Hit@3 percentage, live row-count invariance or real negative rejection is claimed.

## Status update — 2026-10-11

- Live Supabase migration/ingestion/evaluation completed: V5 applied, 28 chunks ingested idempotently, retrieval reached Hit@3 10/10, negative rejection 3/3, and 5/5 control probes passed. Threshold 0.855 was tuned on the same query set and remains exploratory; an independent holdout is still needed.
- The pilot is wired for QUIZ / Mathematics Grade 1 through `GameGenerationService`, Spring RAG configuration and a LangChain4j Gemini adapter. The standard backend suite has 469 passes and two opt-in live tests skipped; JaCoCo passes. Both live smoke tests were also run separately and passed: in-corpus generation returned a four-question quiz; the Python-loop query was refused before generation.
- Duy has not reviewed the selected context contract. Generated quiz content has not yet been manually scored against retrieved outcomes, and no live with/without-RAG comparison has been run. Other game types and subjects remain outside this pilot.

## Kiểm chứng triển khai P0/P1 ngày 2026-10-30

Cập nhật sau khi người dùng yêu cầu nghiệm thu rộng: [báo cáo ngày2026-10-30](acceptance-2026-10-30.md). Regression hiện đạt với JDBC thật, nhưng live acceptance **NOT_ACCEPTED** vì2 lỗi vận hành và các lỗi nội dung trong game mẫu. Các số phía dưới là bằng chứng ở thời điểm triển khai, không thay thế kết luận nghiệm thu mới.

- Bộ backend độc lập JDBC: 492 tests, 0 failure/error, 3 skipped (489 đạt); JaCoCo gate LINE >=70% đạt. Log local: `backend/target/rag-business-local-tests.log`.
- Full suite đã được chạy. `AigameBackendApplicationTests.contextLoads` còn cần URL JDBC hợp lệ; lỗi assertion metric xuất hiện ở lần đầu đã được sửa và kiểm thử lại đạt. Không thay cấu hình/ngưỡng test để che lỗi môi trường.
- Test thật `PgVectorScoreIntegrationTest` đạt 1/1, dùng bảng TEMP trên một session. Xác nhận scope filter và score mapping `(cosine+1)/2`; [bằng chứng](results/pgvector-score-2026-10-30.json).
- Chạy lại `scripts/rag-spike.ps1 -Mode Extract -SkipBuild` trên PDF thật: SHA khớp, 28/28 chunk xác minh trên 6 trang (23 YCCĐ, 5 đối chứng).
- Reviewer độc lập đã kiểm tra và tái kiểm tra các sửa đổi: không còn Critical/Important. Kiểm thử hồi quy gồm thiếu phạm vi/điều kiện nhớ/đơn vị, đọc giờ chưa chỉ rõ giờ đúng và registry metric lỗi.
- Chưa có nhãn ràng buộc được người duyệt nghiệp vụ chấp thuận, chưa có tune/holdout độc lập được duyệt, chưa chạy đánh giá chất lượng Gemini mới hoặc review 20 game. Không kết luận chất lượng phát hành từ các test trên.
- Runtime yêu cầu SHA phê duyệt đúng file constraints; xem [biên bản chờ duyệt](constraints-review.md). Khi chưa có SHA đó, RAG trả 503 trước embedding. Không sửa `.env` để tự bật cổng này.

Chi tiết task, sai khác có chủ đích và cổng phát hành: [execution ledger](implementation-progress.md).

## Kiểm tra live bổ sung — 2026-10-31

- Kiểm tra nguồn Mầm non đạt lại: SHA-256 khớp và đủ 18/18 kết quả mong đợi tại đúng trang PDF/cột độ tuổi.
- Ingest Supabase ghi 18 vector Mầm non. Toán lớp 1 đã đủ dữ liệu nên ingest ghi 0, bỏ qua 28. Một truy vấn Toán lớp 1 viết tự nhiên trả `FOUND`, top gồm `math-g1-002`, `math-g1-008`, `math-g1-007`.
- Thử nghiệm thăm dò gồm 7 câu tự soạn: 4 dương tính, 3 âm tính. Điểm cao nhất của nhóm dương tính 0,846–0,888; nhóm âm tính 0,816–0,836. Ngưỡng Mầm non mặc định được nâng từ 0,50 lên **0,84**. Chạy lại live: câu đếm được nhận (0,874), câu phép chia Tiểu học bị từ chối và có gợi ý gần nhất (0,816).
- Ngưỡng 0,84 được chọn từ mẫu dev rất nhỏ, không có nhãn độc lập; không chứng minh tỷ lệ nhận nhầm đủ thấp để phát hành. Cờ bật RAG Mầm non vẫn tắt mặc định. Corpus hiện mới là pilot và cần mở rộng nội dung, chuyên gia rà soát.
- Yêu cầu full corpus chưa hoàn thành: Tiểu học chỉ có Toán lớp 1 (23 YCCĐ + 5 đối chứng); Mầm non có 18 kết quả mong đợi. Các môn/lớp Tiểu học khác và phần còn lại của nhận thức/ngôn ngữ Mầm non chưa được soạn hoặc ingest. Nguồn tiếng Anh Mầm non là TT50/2020; PDF local là bản quét không có lớp text nên còn cần phiên âm riêng và kiểm chứng trước khi hỗ trợ. [Văn bản TT50/2020 trên Cổng Thông tin điện tử Chính phủ](https://vanban.chinhphu.vn/default.aspx?docid=203049&pageid=27160).
- Test hồi quy `CurriculumSpikeTest`: 17 test, 0 lỗi/thất bại/bỏ qua. Full backend suite sau thay đổi: 521 test, 0 lỗi/thất bại, 8 test opt-in bỏ qua.

## Local corpus ingest and retrieval audit — 2026-11-01

- Remote Supabase was inspected read-only before setup. It reports PostgreSQL 17.6 and successful Flyway versions V1–V6, with existing rows under earlier dataset versions. Neither repository configuration nor deployment/CI documentation identifies that project as a permitted dev/test target, so no remote migration or write was made. Its existing rows are not treated as evidence for the current manifests.
- A dedicated PostgreSQL 18.4 instance with pgvector 0.8.7 was created under `backend/target/rag-eval-local`, bound only to `127.0.0.1:55432`; the existing PostgreSQL service was left untouched. Migrations V1–V6 applied successfully.
- All 15 primary datasets and the kindergarten dataset were source-verified and ingested locally, then re-ingested. The second pass wrote 0 rows and skipped the exact expected count for all 16 datasets. Final count: 653 rows (485 primary outcomes + 34 controls + 134 kindergarten outcomes), all IDs unique; all vectors have 768 dimensions and every row satisfies the V5 13-key metadata constraint.
- A read-only pgvector exact-search audit used each stored vector as the query vector with the runtime scope/version/hash/model and `control=false` predicates. All 485 primary outcome vectors and all 134 kindergarten vectors ranked their own chunk in top 3; 34 control probes produced 0 candidates in the control row's own scope. This verifies storage, exact-vector ranking and metadata filtering; it is not a question-embedding or semantic-quality evaluation.
- One real Gemini `RETRIEVAL_QUERY` + pgvector query using exact source text was run for each of the 15 primary scopes and kindergarten: all 16 returned `FOUND`. All 15 primary queries ranked the exact chunk first. Kindergarten's 3–4-year expected outcome was present in top-K, while a closely related 4–5-year outcome ranked first; age is intentionally not a retrieval filter, and age labels remain in the returned evidence. Scores were 0.8717–0.9163 (median 0.8951). These are source-text smoke checks, not teacher-style benchmark cases.
- A synthetic out-of-scope calculus query was run through all 16 scopes: all 16 returned `INSUFFICIENT_EVIDENCE`, with 0 returned candidates and nearest scores 0.7841–0.8158. The checked-in 90-case exploratory set still covers Math Grade 1 only. The synthetic pair gives 0/16 observed false accepts and 0/16 exact-source retrieval misses for this smoke run, but it does not establish independent false-accept/false-reject rates. Teacher-authored independent evaluation, threshold calibration and live game generation remain pending. Runtime remains gated to its existing verified scope; draft scopes were not enabled based only on similarity. No AI review was used as a substitute for pending preschool specialist review.
- Focused regression passed for generation, catalog, readiness, evidence verification and spike ingestion tests. The full backend suite passed after adding local database identity checks: 547 tests, 0 failures, 0 errors, 8 opt-in tests skipped; JaCoCo line coverage 85.97%. An independent code review found no Critical or Important issue after the fix; the reviewer noted only that runner-ordering could have a dedicated fake-datasource test.
- Local-evaluation mode now checks the live PostgreSQL database name, loopback server address, dedicated port and actual data directory before Flyway or ingest can write. A local idempotent ingest passed after this check. This prevents a loopback tunnel to a remote database from being treated as the dedicated local cluster.

Local results above are isolated evaluation evidence only. They do not indicate deployment to Supabase or professional approval of any curriculum corpus.

## Age-band and bounded generation follow-up — 2026-11-01

- Added an explicit kindergarten age-band field to the internal generation request. A kindergarten request without an age now returns a validation clarification before embedding. DSL v1.0.0 and its schema are unchanged.
- Kindergarten retrieval applies the requested age-band filter before ranking and verifies the returned metadata. The regression fixture puts a closer 4–5 candidate ahead of the 3–4 candidate by vector score; a 3–4 request returns only 3–4 evidence.
- A live Gemini query against the dedicated local database returned `kg-cog-science-classify-34` for AGE_3_4 (score 0.8538, PDF 62 / printed 74). Sanitized evidence: [local acceptance record](results/local-acceptance-2026-11-01.json).
- Bounded live generation against the same local database passed one QUIZ / MATH / GRADE_1 positive case and one insufficient-evidence rejection. The quiz passed DSL/business validation. Manual review of the four generated arithmetic items found 4/4 correct answers, all totals within 10, and evidence `math-g1-007` (PDF 188 / printed 22). The external OpenAI moderation service was disabled for this smoke; blocklist validation ran.
- Focused RAG/generation regression: 101 tests passed. Full backend suite after independent-review fixes: 549 tests, 0 failures, 0 errors, 8 opt-in skips.
- Full natural-language dev/holdout evaluation across 15 primary scopes and preschool age bands remains `NOT_RUN`: no independent teacher-authored questions and qualified independent labels have been supplied. False-accept and false-reject rates are therefore not established. The current 90-row Math Grade 1 set remains exploratory and AI-authored, not a holdout.
- Runtime catalog remains limited to MATH / GRADE_1. Kindergarten stays disabled pending specialist review; no other scope was enabled based on retrieval similarity alone. Remote Supabase was not written because the target is not confirmed as an approved write destination.

## Official-runtime hardening follow-up — 2026-11-01

- The configured Math Grade 1 corpus now resides at `backend/src/main/resources/curriculum/primary/math-grade1/`; its loader and source-review link were updated. The other 14 primary datasets remain under `curriculum/spike/` and are not published to runtime.
- RAG-backed generation now fails closed unless a Gemini content reviewer returns one accepted record for every question, confirms the marked answer, confirms curriculum support, and cites only retrieved chunk IDs. Rejected drafts use the existing bounded retry loop. A missing or unavailable reviewer prevents game return. Successful per-question claims populate the teacher-only review record; DSL v1.0.0 is unchanged.
- `QuizRule` independently checks one explicit integer arithmetic expression against the selected option. Chained or separate expressions in one question are rejected as ambiguous; a mismatch is rejected before any model review. It does not automatically solve arbitrary word problems or infer visual content.
- Kindergarten no longer treats a high similarity candidate as accepted evidence. `VerifiedCurriculumContextProvider` requires a domain verifier and validates that it returns only retrieved chunks from the requested age band. No production verifier is configured, so the path fails closed before embedding/retrieval and remains disabled pending expert approval.
- Verification run: focused reviewer/provider/generation/business-rule suite, 94 passed; full backend suite, 561 passed, 0 failures/errors, 8 opt-in skips; JaCoCo gate passed. The new Gemini reviewer used fake-model tests only; live reviewer behavior and latency are not measured.
- Independent review found that multiple/chained arithmetic expressions could hide the asked calculation and that `UNAVAILABLE` review status could accompany an empty error list. The arithmetic guard now rejects ambiguous operations, and generation returns a game only when the review status is exactly `REVIEWED`; all regression tests pass.
- The reviewer is another Gemini pass, not an independent human or model. The teacher-authored frozen benchmark across 15 scopes, independent labels, preschool specialist approval, wider runtime enablement and remote Supabase deployment remain outstanding. Previous local ingest and source-verification evidence is unchanged.

## Content-verification gate recheck — 2026-11-01

- `GameGenerationService` no longer injects or calls `GeminiGeneratedContentReviewer`. Only `PilotQuizContentVerifier` can mark this pilot’s returned arithmetic quiz as `REVIEWED`; the review provenance is `math-g1-quiz-deterministic-v1`. Wrong selected answers, multiple numerically correct options, negative arithmetic, contradictory `= result`, out-of-range values/options, requested carry/round-tens constraints, and the retrieved capability are checked. Retrieval and similarity alone cannot pass this gate.
- An unsupported draft may use the existing bounded retry count with deterministic error codes as feedback. The service returns a game only after a retry itself passes the deterministic verifier. When the result remains uncertain, it returns HTTP 422 `GENERATED_CONTENT_UNVERIFIED` with a reason code. This does not mark the prior draft as verified.
- Focused regressions cover wrong and multiple answers, range overflow, carry/borrow including `10−1` and `20−11`, negative operands/results, contradictory assertions, same-skill duplicate constraints, retry after unverified, and kindergarten age filtering/fail-closed behavior.
- Live check used the dedicated local PostgreSQL at `127.0.0.1:55432/rag_eval` (653 corpus rows) and Gemini; OpenAI Moderation was intentionally disabled for this content-only check. The out-of-corpus case passed as a rejection. The in-corpus positive case remained `UNVERIFIED` after the bounded retry (`QUESTION_NOT_MACHINE_CHECKABLE`); no game was returned. Thus the live safety behavior passed, but positive live game acceptance did not. The earlier 20-sample run is historical and is not counted as a current pass.
- Current `mvn verify`: 575 tests, 0 failures, 0 errors, 8 opt-in tests skipped; JaCoCo line coverage 87.86%, gate passed. This run did not enable live tests.
- Recheck of the 2026-10-30 artifacts found the sample-6 narrative in that report does not match its JSON: the artifact says “cho em thêm 25” and asks for the total, so 30+25=55 is correct. The current arithmetic-only pilot still rejects the word-problem form as unverified; it is not a validated-generation success. Sample-16 remains an ambiguous geometry question and is also unverified, not fixed semantically. Sample-2 media rendering, sample-1 retrieval miss, sample-3 Gemini 503, and language/visual issues in the other samples were not corrected in this scope.
- Kindergarten behavior was not expanded: age filtering remains regression-covered, but without a specialist-approved semantic verifier its candidates cannot be consumed by confirmed generation. No reviewer AI substitutes for preschool specialist approval.

| Trạng thái | Hạng mục |
| --- | --- |
| Đã đạt | Deterministic gate cho quiz số học Toán 1; retry không thể tự nâng trạng thái; `GENERATED_CONTENT_UNVERIFIED` 422; hồi quy cho đáp án sai/đa đáp án/vượt phạm vi/mượn/trừ âm; kindergarten age filter và fail-closed regression; full backend verify/JaCoCo. |
| Chưa đạt | Live positive generation: Gemini vẫn tạo ít nhất một dạng câu chưa phân tích được sau retry; câu hỏi văn bản, hình học và câu phụ thuộc media chưa có verifier; các lỗi retrieval/language/media lịch sử chưa được chạy lại đầy đủ. |
| Ngoài phạm vi bàn giao | Benchmark độc lập 15 scope và độ tuổi Mầm non; mở rộng runtime; duyệt chunk/game bởi giáo viên hoặc chuyên gia Mầm non; triển khai Supabase từ xa. |

Checked-in 16-dataset local ingest/source-verification evidence is preserved and was not rerun because this change did not affect corpus, ingestion, metadata, or age filtering.
