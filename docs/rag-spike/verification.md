# Verification record — 2026-10-10

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
