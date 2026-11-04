# Chạy spike RAG Toán lớp 1

> **Chuyên đề Curriculum-RAG**: [[Chương trình GDPT 2018 và Curriculum RAG]]



**Kết luận nghiệm thu mới nhất (2026-10-30): chưa đạt phát hành.** Regression backend và pgvector đạt, nhưng bộ20 lần sinh mới có2 lỗi và game được tạo có lỗi nội dung. Xem [báo cáo nghiệm thu](acceptance-2026-10-30.md). Kết quả exploratory cũ bên dưới không chứng minh phiên bản hiện tại đã nghiệm thu đầy đủ. Các đề xuất hybrid/HyDE/judge nằm trong [plan thử nghiệm](rag-variants-experiment.md), chưa bật vào pipeline.

Trạng thái lịch sử (2026-10-30): bộ 10 câu Toán lớp 1 đạt tiêu chí exploratory (Hit@3 10/10), nhưng không phải holdout độc lập và không chứng minh chất lượng release; xem báo cáo nghiệm thu 2026-10-30. Các báo cáo mới tách tỷ lệ từ chối/chấp nhận sai, đúng căn cứ, gợi ý cứu được, MRR và khoảng tin cậy. p50/p95 trong benchmark là thời gian retrieval + verification, chưa gồm sinh game.

## Điền cấu hình trên máy

Mở `backend/.env`; file này đã được Git ignore. Không sửa `.env.example` để lưu key thật.

1. Vào [Google AI Studio / API keys](https://aistudio.google.com/apikey), chọn/tạo key cho project bạn dùng; điền vào `GEMINI_API_KEY`. [Hướng dẫn chính thức](https://ai.google.dev/gemini-api/docs/api-key).
2. Vào project Supabase của nhóm, chọn **Connect**, chọn **Session pooler**. Lấy host, port 5432, database `postgres`, username được hiển thị. [Hướng dẫn kết nối chính thức](https://supabase.com/docs/guides/database/connecting-to-postgres).
3. Điền `DB_URL` theo dạng JDBC bên dưới, `DB_USERNAME` đúng như dashboard hiển thị, `DB_PASSWORD` là mật khẩu database. Đây không phải anon key hay service_role API key. Nếu project do Duy quản lý, cần thông tin kết nối của project nhóm.
4. Giữ `GEMINI_EMBEDDING_MODEL=gemini-embedding-001`. `GEMINI_MODEL` của chat không cần cho spike retrieval. Đường dẫn `CURRICULUM_PDF` đã được điền theo file người dùng cung cấp.

```dotenv
GEMINI_API_KEY=điền_key_của_bạn
DB_URL=jdbc:postgresql://HOST_TRONG_DASHBOARD:5432/postgres?sslmode=require
DB_USERNAME=USERNAME_TRONG_DASHBOARD
DB_PASSWORD=điền_mật_khẩu_database
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
RAG_MIN_SCORE=0.855
```

Copy host vào URL JDBC, không dán nguyên URI `postgresql://user:password@...`. Mật khẩu ở ô riêng. Không dùng Transaction pooler cổng 6543. Runner cần tài khoản database có quyền chạy Flyway, đọc/ghi bảng; bảng bật RLS và không mở API công khai.

## Bật pilot sinh game có RAG

Pipeline hiện có thêm bước xác minh ràng buộc. Trước khi bật pilot mới, người duyệt nghiệp vụ phải đối chiếu [23 bản nhãn và checksum](constraints-review.md), ghi quyết định APPROVED, rồi cấu hình `CURRICULUM_CONSTRAINTS_APPROVED_SHA256` bằng đúng checksum được duyệt. Mặc định biến này trống: RAG trả `CURRICULUM_UNAVAILABLE` trước khi gọi embedding. Không coi việc copy checksum hoặc test local đạt là phê duyệt nghiệp vụ. Người dùng đã chốt bản nhãn hiện tại; quyết định và SHA được ghi trong biên bản, cấu hình local đã cập nhật. Các môi trường khác cần cấu hình SHA được duyệt riêng.

Sau khi xác nhận Gemini chat key/model và bảng/vector đã nạp đủ, đặt trong `backend/.env`:

```dotenv
GEMINI_GAME_GENERATION_ENABLED=true
CURRICULUM_RAG_ENABLED=true
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
CURRICULUM_RAG_MIN_SCORE=0.855
# Chỉ điền sau khi có quyết định duyệt trong constraints-review.md:
# CURRICULUM_CONSTRAINTS_APPROVED_SHA256=SHA_256_DA_DUOC_DUYET
```

Pilot chỉ nhận `QUIZ + MATH + GRADE_1`. Với flag RAG bật, yêu cầu ngoài scope, không đủ evidence, hoặc retrieval không dùng được sẽ dừng rõ ràng trước khi gọi Gemini. Để sinh game khi chưa bật RAG, tắt `CURRICULUM_RAG_ENABLED` và bật `GEMINI_GAME_GENERATION_ENABLED`. Live smoke dùng tạm `gemini-3.5-flash-lite` vì `GEMINI_MODEL` trong `.env` còn trống; `.env` không bị sửa. Duy cần review contract trước khi merge; benchmark holdout còn là bước tiếp theo.

## Lệnh PowerShell từ thư mục gốc repo

```powershell
# Chỉ in trạng thái đã cấu hình hay chưa; không in giá trị secret.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode CheckConfig

# Bước này không cần Gemini/database. Xác minh lại đúng nguồn trước khi nạp.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Extract -SkipBuild

# Chạy Flyway của project: V1 bật vector; V5 tạo bảng. Không sửa V1–V4.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Migrate -SkipBuild

# Nạp 23 yêu cầu và 5 đoạn đối chứng; xác minh nguồn trước khi gọi embedding API.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Ingest -SkipBuild

# Chạy lại: cùng ID được bỏ qua, không gọi embedding lại cho các ID đã có.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Ingest -SkipBuild

powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Query -Topic 'Phép cộng nhẩm trong phạm vi 10' -SkipBuild
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Evaluate -SkipBuild
```

Lần đầu bỏ `-SkipBuild` để compile và tạo classpath. Script dùng Maven có sẵn hoặc Maven trong wrapper cache, rồi mới dùng `mvnw.cmd`. Có thể truyền `-EnvFile 'đường_dẫn_file.env'` và `-PdfPath 'đường_dẫn_PDF'`. Biến môi trường process được ưu tiên so với file.

Mã thoát: 0 thành công; 1 lỗi vận hành; 2 cấu hình còn thiếu; 3 query không đủ căn cứ; 4 kết quả đánh giá chưa đạt. Không chạy Spring application nên không cần cấu hình JWT/OpenAI Moderation cho runner này.

## Lưu trữ và nạp lại

- Pipeline được củng cố ngày 2026-10-30: đối chứng vẫn lưu vào database nhưng luôn bị loại khỏi truy xuất, kể cả trong chính môn/lớp của đối chứng. Các kết quả live ngày 2026-10-10 ở trên là bằng chứng của pipeline cũ; cần chạy lại Evaluate để có bằng chứng live cho chính sách mới.
- LangChain4j core/Gemini 1.20.1 được giữ nguyên; PgVector integration dùng bản tương ứng 1.20.1-beta30. PDFBox 3.0.8 phục vụ kiểm tra theo trang/cột.
- Bảng do Flyway quản lý, vector 768 chiều; `PgVectorEmbeddingStore` không tự tạo bảng/extension, không xoá bảng trước khi chạy.
- Cùng embedding model 001 và 768 chiều; tài liệu dùng `RETRIEVAL_DOCUMENT`, query dùng `RETRIEVAL_QUERY`. Vectors tài liệu được chuẩn hoá. [Tài liệu Google](https://ai.google.dev/gemini-api/docs/embeddings).
- ID UUID được xác định từ SHA nguồn, phiên bản bộ dữ liệu, chunk ID, model, dimension và nội dung. Nạp lại bỏ qua các ID đã tồn tại; thư viện còn upsert theo primary key nếu có lần nạp đồng thời. Embedding được tạo và lưu theo lô tối đa 32 chunk; từng lô phải đạt kiểm tra số lượng, chiều và giá trị vector trước khi ghi. Nếu lô sau lỗi, chạy lại Ingest để tiếp tục từ các ID đã lưu; chỉ các chunk còn thiếu được gửi đến Gemini.
- Nếu dữ liệu/model thay đổi, phải review và tạo phiên bản mới; không trộn vector khác model vào cùng phạm vi retrieval. Bộ dữ liệu phải đủ 28 ID đúng trước khi query/evaluate.
- Metadata lọc bắt buộc `subject`, `gradeLevel`, `contentType`, `control="false"`, phiên bản dữ liệu/chương trình, SHA nguồn và embedding model. Chunk thiếu nhãn `control` cũng không được truy xuất. Không cần thay đổi embedding ID hoặc ingest lại các dòng hiện có vì metadata đã lưu nhãn này.

## Kết quả và giới hạn

Extraction lưu riêng tại `backend/target/curriculum-spike/extracted/<dataset>/` để chạy bộ này không ghi đè bằng chứng của bộ khác. Báo cáo live mới được tạo ở `docs/rag-spike/results/live-*.json` sau khi chạy đủ query và đối chứng. Mỗi báo cáo ghi model, dimension, ngưỡng, nguồn, thời điểm, đoạn trả về, score, latency và kết quả gate; yêu cầu đọc thủ công trước khi dẫn kết luận chất lượng.

`source-verification.json` trong `backend/target/curriculum-spike/extracted/<dataset>/` chỉ được xuất bản khi toàn bộ chunk của dataset đó khớp PDF. Báo cáo ghi SHA nguồn, phiên bản dataset/chương trình, số YCCĐ/đối chứng và nội dung từng chunk kèm trang PDF, trang in, vùng chữ. Báo cáo thành công cũ bị xóa ngay đầu lần xác minh mới; nếu sai SHA hoặc một fragment không khớp thì không còn báo cáo thành công để dùng nhầm. File được ghi tạm rồi đổi tên sau khi hoàn tất.

Báo cáo Evaluate mới có `reportVersion=2` và `controlPolicy=STORED_BUT_EXCLUDED_FROM_ALL_RETRIEVAL_SCOPES`. Runner kiểm tra đủ ID trong database trước khi đánh giá (`controlsStored=true`). Mỗi control probe phải có `ownScopeControlLeakage=0` và `primaryScopeLeakage=0`; không còn yêu cầu tìm được đối chứng qua retrieval. Probe rỗng không được coi là đạt.

`FOUND` nghĩa là có ứng viên vượt ngưỡng tương đồng, không chứng minh mọi yêu cầu trong câu giáo viên nhập đều được chương trình hỗ trợ. Đặc biệt, similarity có thể không phân biệt được “không nhớ” và “có nhớ”. Negative queries được đo riêng để phát hiện vấn đề này. Nếu negative gate không đạt, cần nghiên cứu xác nhận phạm vi/reranking trước khi đưa vào luồng sinh game.

Đánh giá retrieval không chứng minh Gemini luôn sinh đúng chương trình. Chưa chạy so sánh live sinh game có/không RAG; pilot mới hoàn thiện prompt QUIZ và chưa mở rộng prompt cho 10 strategy.

## Runtime có kiểm chứng ràng buộc

Catalog chỉ công bố scope có YCCĐ chính; các lớp của chunk đối chứng không trở thành scope hỗ trợ. Ngoài scope trả `GENERATION_SCOPE_UNSUPPORTED` (422) trước khi gọi AI. Provider kiểm tra ràng buộc có kiểu trên từng điều kiện; thiếu phạm vi số, điều kiện nhớ hoặc đơn vị cần thiết thì yêu cầu làm rõ (422), không dùng điểm tương đồng để vượt qua luật. Ví dụ: “Đếm từ 1 đến 5” có thể dùng YCCĐ đếm trong 100; “Cộng trong phạm vi 1000” không có căn cứ; “Cộng” cần bổ sung phạm vi và điều kiện. “Đọc giờ” chưa đủ để suy ra “giờ đúng”.

Grammar cố ý giới hạn, giữ dấu tiếng Việt và từ chối phần ngôn ngữ chưa hiểu. Có thể có từ chối nhầm; cần benchmark độc lập trước khi mở pilot. Context chỉ chứa các chunk được verifier xác nhận, giữ nguyên DSL 1.0.0, không thêm `curriculumReview` hay reviewer Gemini đồng bộ.

Kiểm tra đủ ID trong DB chuyển sang runtime, cache readiness 30 giây và vẫn kiểm tra lỗi của từng query. Việc tạo model/store cũng được hoãn; lỗi Gemini/DB trả 503, không biến thành thiếu căn cứ. Manifest/chunks đóng gói vẫn được kiểm tra khi nạp catalog: dữ liệu đóng gói hỏng có thể khiến bean không khởi tạo. JPA/Flyway của ứng dụng vẫn cần DB lõi; đây không phải chế độ hoạt động không database.

Metrics nằm trong Micrometer `MeterRegistry`: `curriculum.requests`, `curriculum.duration`; các stage `QUERY_EMBEDDING`, `RETRIEVAL`, `VERIFICATION`, `GENERATION`, `TOTAL`. Nhãn ứng dụng chỉ có stage/outcome/subject/gradeLevel; Micrometer có thêm nhãn `phi` hữu hạn cho p50/p95. Registry mặc định trong RAM, có thể dùng registry exporter do ứng dụng cung cấp; chưa thêm endpoint HTTP metrics. Registry lỗi không được ảnh hưởng kết quả nghiệp vụ. Không thêm cache query hoặc log topic/prompt/output.

## Benchmark mới: tune và holdout

Legacy Evaluate vẫn đo retrieval và được ghi rõ `LEGACY_RETRIEVAL_ONLY_NOT_VERIFIED_GENERATION`. Benchmark mới dùng `reportVersion=3`, đo Hit@3, acceptance trên câu có căn cứ, false acceptance trên câu thiếu căn cứ, leakage và báo cáo riêng các cohort.

Tập tune/holdout phải do người duyệt chuẩn bị; chưa có tập được duyệt trong checkout. Mỗi dòng JSONL có `queryId`, `groupId`, `cohort` (`SUPPORTED|BOUNDARY|UNSUPPORTED`), `topic`, `subject`, `gradeLevel`, `expectedSupported`, `expectedChunkIds`. Query supported phải có ID YCCĐ chính, query unsupported có danh sách rỗng. Tune gồm 30 dòng (10 supported, 10 boundary chia đều đúng/sai, 10 unsupported); holdout gồm 60 dòng theo tỷ lệ tương ứng. Nhóm paraphrase và topic chuẩn hóa không được trùng giữa hai tập.

Cạnh file query phải có file `<queries-path>.manifest.json` ghi `reviewStatus=APPROVED`, `reviewedBy`, `reviewedAt`, `querySha256`, `datasetVersion`, `curriculumVersion`, `sourceSha256`, `constraintsSha256`. Thiếu duyệt, sai SHA hoặc sai cohort đều dừng; không có dữ liệu mẫu nào được trình bày là holdout độc lập đã đạt.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Evaluate -EvaluationSet tune -QueriesPath 'PATH_TO_REVIEWED_TUNE.jsonl'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Evaluate -EvaluationSet holdout -QueriesPath 'PATH_TO_REVIEWED_HOLDOUT.jsonl' -TunePath 'PATH_TO_REVIEWED_TUNE.jsonl'
```

Test thang score/filter pgvector được bật riêng bằng `RUN_LIVE_RAG_VECTOR_TEST=true` và cấu hình DB trong process khi chạy Maven `-Dtest=PgVectorScoreIntegrationTest`. Test dùng bảng TEMP trên một session, không ghi vào corpus thật. Test live này đã đạt ngày 2026-10-30: score = (cosine + 1) / 2, nên ngưỡng score 0.855 tương đương cosine 0.71; xem [bằng chứng score](results/pgvector-score-2026-10-30.json). Bộ nhãn độc lập, số đo live và duyệt ít nhất 20 game vẫn là cổng phát hành cần hoàn tất.

## Remediation decision (2026-10-31)

- Keep DSL v1.0.0 unchanged. `metadata.curriculumReview` is rejected by all ten game schemas. Curriculum evidence and review status live in V6 `game_curriculum_reviews`, with a teacher-owned `GET /api/games/{id}/curriculum-review` contract. This checkout has no game create/update HTTP route; callers must use `GameCurriculumReviewService.saveWithGame` in the same transaction and `saveEditedGame` to mark reviews stale. The generation reviewer is currently `UNAVAILABLE` because this checkout has no reviewer service.
- Preschool does not have primary-school subjects. Retrieval uses `gradeLevel=KINDERGARTEN`, filters to the requested age before ranking, and searches the approved `COGNITIVE`/`LANGUAGE` domains; the DSL `subject` is only a compatibility hint. The packaged corpus contains 134 outcomes for ages 3–4, 4–5 and 5–6 across the agreed cognitive and language scope. The owner approved it as sourced curriculum data under the exact-PDF extraction policy; this does not claim specialist pedagogical review.
- The dataset is based on consolidated `01/VBHN-BGDĐT (2021)` (TT17/2009 as amended by TT28/2016 and TT51/2020), and is pinned to its manifest SHA-256. It does not represent the experimental GDMN program for 2026–2027 approved under Decision 388/QĐ-BGDĐT for participating schools. See the [Hanoi Department of Education pilot notice](https://hanoi.edu.vn/giao-duc-thu-do-doi-moi-hoi-nhap-phat-trien/so-gddt-tap-huan-huong-dan-thuc-hien-chuong-trinh-giao-duc-mam-non-thi-diem-nam/ctmb/1142/17087).
- The official source for preschool English familiarization, TT50/2020, is identified at the [Government legal document portal](https://vanban.chinhphu.vn/default.aspx?docid=203049&pageid=27160), but it has not yet been curated into source-verified chunks. English preschool must not silently borrow Vietnamese-language outcomes.
- Official source: consolidated 01/VBHN-BGDĐT (2021), including TT17/2009 as amended by TT28/2016 and TT51/2020, SHA-256 `146c1f23b3515d46f2e2e97afcfc0a1d871ef28b6700c7db4fbacfeb56e8572f`, 84 PDF pages. English preschool program source TT50/2020 was found, but source-specific provenance/OCR curation is not complete; English remains unsupported rather than falsely marked UNVERIFIED.
- Evaluation tooling distinguishes decision quality from retrieval ranking. Existing exposed query sets are development/exploratory data, not an independent holdout. Exact filtered vector scan remains the current choice for the small corpus. Runtime query text/vector caching is disabled.
- Offline Extract/Ingest/Evaluate code now lives in test scope and is invoked by `scripts/rag-spike.ps1` with `-Dataset primary-math-g1|kindergarten`.

The agreed cognitive/language preschool corpus is packaged and owner-approved as source data, but live preschool quality evaluation remains unrun. No separate curriculum-specialist pedagogical review or end-to-end generation/save endpoint is claimed.

## Current cross-scope implementation recheck (2026-11-01)

This section supersedes older statements above that described the runtime catalog or semantic reviewer as Math Grade 1 only / unavailable. It does not supersede historical evaluation results.

- **Offline path:** packaged manifests are loaded as 15 primary subject/grade datasets plus one Kindergarten dataset. Source verification, chunk parsing, dataset hashes, provenance, and control labels remain dataset-specific. Existing `Extract`, `Ingest`, and `Evaluate` tools remain in test scope and are invoked through `scripts/rag-spike.ps1`; evaluation artifacts remain exploratory unless independently labeled and frozen.
- **Online retrieval path:** the runtime catalog loads the 15 primary datasets and selects by requested subject/grade. Each request checks readiness against the selected source; vector filtering includes source hash, curriculum version, dataset version, embedding model, subject/grade, `contentType`, and `control=false`. Primary non-pilot scopes use a constrained Gemini semantic evidence decision over the retrieved candidates; the Math Grade 1 deterministic constraint verifier remains specialized to that pilot. Similarity alone does not grant evidence.
- **Kindergarten:** a separate feature flag defaults off; when enabled, the exact source approval hash is also required. Retrieval filters the requested age band and allowed domains before semantic evidence selection. The corpus currently contains 134 outcomes (38 age 3–4, 47 age 4–5, 49 age 5–6). Specialist review and live evaluation are still pending; AI review is not specialist approval.
- **Generation integration limit:** `GeminiGameContentGenerator` still restricts generation to QUIZ / MATH / GRADE_1, and the existing `QuizGameStrategy` prompt is hardcoded to Grade 1 and throws for other grades. Therefore the new per-scope RAG retrieval code does **not** yet mean end-to-end generation is supported for the other 14 primary scopes or Kindergarten. Strategy-owner coordination is required; this task did not rewrite that strategy or the published DSL.
- **Current verification:** focused backend RAG/provider/generation regressions passed (62 tests, 0 failures/errors). The all-packaged-dataset in-memory regression covers metadata scope and control exclusion for 15 primary datasets and age/domain filtering for Kindergarten. This is technical filter evidence, not a live pgvector quality evaluation.
- **Still not measured:** natural-language independent benchmark, false-accept/false-reject rates, semantic verifier live calls, retrieval quality across all scopes, and online Kindergarten quality. Local pgvector was unavailable for a new run; Supabase was not written.

| Scope | Dataset outcomes | RAG selection/filter implementation | Current generation status | Evaluation / review |
|---|---:|---|---|---|
| Math Grades 1–5 | 23 / 43 / 51 / 53 / 53 | Source-scoped retrieval; Grade 1 deterministic verifier; Grades 2–5 semantic verifier | Grade 1 only; Grades 2–5 blocked by existing strategy/generator guard | Unit/filter tests; no new live quality run; labels not independently reviewed |
| English Grades 1–5 | 6 / 7 / 15 / 14 / 15 | Source-scoped retrieval and semantic verifier | Blocked by existing strategy/generator guard | Unit/filter tests; no new live quality run; labels not independently reviewed |
| Vietnamese Grades 1–5 | 36 / 42 / 45 / 42 / 40 | Source-scoped retrieval and semantic verifier | Blocked by existing strategy/generator guard | Unit/filter tests; no new live quality run; labels not independently reviewed |
| Kindergarten ages 3–4 / 4–5 / 5–6 | 38 / 47 / 49 | Age/domain filter precedes semantic verification; feature flag and source-hash gate | Disabled pending specialist approval; generator prompt is also Grade 1-specific | Age/filter regression passed; no live new evaluation; specialist review pending |

## Backend RAG remediation and execution — 2026-11-01 (latest)

This section supersedes older descriptions of the current runtime; historical measurements above are retained. Input: the supplied 30/10 source/review (`13-V-n-hi-n-ta-i-30-10-2026.txt`), offline/online pipeline (15/17), and improvement options (18). The goal is to let a teacher's request reach the matching curriculum evidence and the existing generation service without changing teammates' product contracts.

### Implementation and traceability

| Requirement | Implemented behavior and failure boundary | Regression |
|---|---|---|
| BR-01: select a primary subject/grade's actual source/version | The inherited 16-dataset catalog and per-source readiness are retained. Retrieval rechecks source/model/version metadata; provider rechecks IDs, exact outcome/topic, domain/age and source pages against packaged non-control chunks. Unknown/modified evidence fails as a service/data integrity error, never as support. | `CurriculumRAGServiceTest`, `CurriculumRuntimeEvaluationTest` (all datasets) |
| BR-02: understand a natural learning objective | Each non-pilot scope uses a structured semantic verifier with subject-specific instructions. Math G1 grammar misses can use that verifier after its reviewed sidecar gate. Missing details, insufficient evidence and unavailable service remain distinct. Similarity alone is never support. | Semantic verifier/provider tests; the all-dataset fixture regression is a contract test, not semantic-quality evidence |
| BR-03: preserve evidence into existing generation | Context now includes source SHA/dataset/model in addition to exact selected outcomes/pages; retry reuses evidence. Output review checks each question's answer, unique answer, teacher objective/conditions and cited retrieved IDs. Empty/unavailable reviews cannot pass. Non-arithmetic Math G1 forms may use a separate PENDING automated review; parsed arithmetic requirements retain the deterministic gate and cannot be promoted by a model after a pilot rejection. | `GameGenerationServiceTest`, `GeminiGeneratedContentReviewerTest` |
| BR-04: preschool age/domain selection | Age filtering precedes ranking; the RAG interface additionally accepts optional `COGNITIVE`/`LANGUAGE`, filtered before the model. Existing subject remains a legacy hint. Preschool English is explicitly unsupported because TT50 English is outside this corpus. Whole-dataset readiness verifies the versioned KG deployment unit. The owner-approved exact-PDF extraction policy replaces the separate expert-source-hash gate; this does not claim specialist pedagogical review. | All three ages and both domains through provider fixtures; explicit domain+age regression; KG English rejection |
| BR-05: evaluate actual runtime decisions | New test-scope `CurriculumRuntimeEvaluation` invokes the production provider for every dataset. It records raw top-3 ranking separately from selected evidence, false accepts/rejects, evidence correctness, leakage and service outages. It supports unreviewed exploratory runs and reviewed manifests without loading Math G1 constraints for another subject. | Draft checksum/cohort/scope checks; unreviewed labels cannot enter reviewed loader; service failures are excluded from decision-rate denominators and counted separately |
| BR-06: preserve team scope | No frontend, controller, CRUD, game strategy, factory or DSL/schema changes. Two chat models use explicit qualifiers so enabling RAG and generation together is unambiguous. | Spring configuration regression enables both models without API calls; Git scope check |

Choice: retain exact metadata-filtered ranking over this small corpus and a structured semantic gate. No hybrid, HyDE, graph, reranker, CAG or agentic variant was added merely because it appeared in the options document. The semantic paths inspect the selected small corpus rather than borrowing Math G1's score floor. This is candidate recall policy, not a lowering of the agreed quality gate. KG legacy top-k/min-score settings are not semantic acceptance criteria.

### Offline / online pipeline as implemented

Offline remains: official source → hash/page/fragment verification (declared manual exceptions) → one outcome/chunk and separate controls → document embeddings (768 dimensions) → idempotent local ingest → readiness. This change does not repeat or overwrite prior source audits, migrations or local ingest. A clean clone still needs the externally supplied TT32 PDF to repeat that extraction; its hash in the manifest must match. No source approval was manufactured.

Online is: request scope → catalog dataset/source → per-source readiness → query embedding → exact source/version/model/non-control filters (+ preschool age and optional domain) → ranked candidates → packaged-evidence integrity check → deterministic Math G1 or structured semantic decision → selected outcome context/provenance → existing generation service → existing schema/business/safety checks → specialized arithmetic or semantic grounding gate → separate generation result/evidence/review. Automated semantic acceptance remains `PENDING`, not human approval. `visualPrompt` does not prove a rendered image; unresolved visual/aural content must not be claimed verified.

The service's existing `GameDslRequest` has topic/subject/grade/age but **no lesson-plan field or explicit preschool domain**. `GameGenerationService.retrieveCurriculumContext(GameType, GameDslRequest)` calls the four-argument `CurriculumContextProvider.retrieve`; it cannot pass the optional domain accepted by the five-argument RAG overload. `QuizGameStrategy.buildTypeSpecificInstruction` rejects every grade except GRADE_1, and `GeminiGameContentGenerator.generate(GenerationAttempt)` rejects every scope except QUIZ / MATH / GRADE_1. To generate outside the pilot, the owner must coordinate the request/provider contract and the strategy prompt + generator guard as one change; source history identifies Nguyễn Đức Duy as the `GameDslRequest`/`QuizGameStrategy` owner. This run did not edit those contracts. Therefore RAG retrieval is implemented across scopes, but game generation is not end-to-end supported beyond the Math G1 pilot.

### Evaluation commands and interpretation

The checked-in `evaluation-drafts/<datasetVersion>/` contains 30 `DEV` and 60 exposed `HOLDOUT_CANDIDATE` questions per dataset (480 + 960 total). All are `AI_AUTHORED_UNREVIEWED`, with empty independent labeler IDs and SHA/source/version manifests. Natural paraphrases repeat a limited set of learning objectives; negative groups overlap across splits. They are exploratory candidates, **not a frozen independent holdout**, not comprehensive curriculum coverage, and not evidence that a QUIZ can assess every listed skill. Reviewers must correct/extend labels and create genuinely disjoint frozen groups before using the independent gate.

```powershell
# All 16 datasets; preflight makes no API/DB calls.
./scripts/rag-spike.ps1 -Mode RuntimePreflight -RuntimeSplit DEV
./scripts/rag-spike.ps1 -Mode RuntimePreflight -RuntimeSplit HOLDOUT_CANDIDATE
# Requires an authorized local cluster; the runner verifies server DB/address/port/data_directory.
# Uses only SELECT/query calls, no migration or ingest. Never falls back to remote Supabase.
$env:RAG_LOCAL_EVAL = 'true'
./scripts/rag-spike.ps1 -Mode RuntimeExploratory -RuntimeSplit DEV
./scripts/rag-spike.ps1 -Mode RuntimeExploratory -RuntimeSplit HOLDOUT_CANDIDATE
# Independently reviewed files, when available: APPROVED manifest, reviewer/date, source SHA,
# per-query independent labelers, DEV/HOLDOUT, 30/60 cohort counts; Math G1 also pins constraints SHA.
./scripts/rag-spike.ps1 -Mode RuntimeReviewed -QueriesPath 'REVIEWED_ROOT' -RuntimeSplit HOLDOUT
```

Reviewed HOLDOUT also loads approved DEV and rejects overlapping group IDs or normalized topics. The supplied exposed candidates deliberately cannot satisfy that gate. Hit@3 ≥ 90%, supported acceptance ≥ 90%, zero false accepts and zero scope leakage remain unchanged. No expert or teacher sign-off is inferred from AI labels or unit tests. The new runner supersedes the legacy spike's Math-only decision path for multi-dataset runtime evaluation; old artifacts remain historical. Raw teacher inputs are not durably cached or logged; evaluation artifacts contain only these checked-in synthetic queries.

### Finding disposition from 30/10

| Finding | Current disposition |
|---|---|
| 1: review data in frozen DSL | Previously corrected; separate evidence/review retained; no DSL changes |
| 2: no KG routing | Age/domain RAG implemented; publication remains blocked by specialist approval and concrete generator contract |
| 3: source-copy benchmark | Natural AI draft sets and actual-provider harness implemented; independent labels/diverse frozen holdout still missing |
| 4: stale online results | Current contract tests/preflight recorded; current live ranking/decision quality is NOT_RUN because local DB/key are unavailable; old PASS is not reused |
| 5: Math-centric rules / linguistic ambiguity | Other scopes bypass Math constraints; grammar misses have semantic path, preserving accents, requested skills and explicit bounds. Model quality is unmeasured; parser-supported arithmetic remains conservative |
| 6: serialized persistent teacher-query cache | Production persistence remains disabled; no unnecessary new cache |
| 7: latency NFR | Deferred in original review; no invented p95 claim or async acceptance bypass |
| 8: eval mains in application source | Evaluation stays under `src/test`, including the new runner |
| 9: readiness outage affects startup | Lazy model/store and per-source readiness preserved; RAG failure is service unavailable. General application datasource startup is outside this RAG change |
| 10: hard rejection without guidance | Nearest-outcome guidance retained; clarification is distinct from insufficient evidence/service outage |
| 11: no lesson-plan context | Contract dependency: `GameDslRequest` has no lesson-plan input. No undocumented field/teammate API was introduced |
| 12: no ANN | Deliberate exact filtered scan at current corpus size; not an open defect |

Completion still requires live decision coverage for all scopes after Gemini quota is available, independent benchmark review, and agreement with the generation owner on request-level Kindergarten domain selection. The owner has approved the Kindergarten corpus as PDF-sourced data; no specialist pedagogical review is claimed. Technical tests do not substitute for live quality evidence. See the scope matrix in `corpus-expansion-status.md` and sanitized current-run evidence in `results/local-acceptance-2026-11-01.json`.

## Local PostgreSQL and exploratory runtime evaluation — 2026-11-02

This execution supersedes the 2026-11-02 cross-platform section above where it says no local database or model was available. It does not supersede historical tests or establish independent benchmark approval.

- A dedicated PostgreSQL 18.4 cluster with pgvector was started under the ignored `backend/target/rag-eval-local/` directory, bound only to `127.0.0.1:55432`; database `rag_eval` is separate from all Supabase projects. Existing Flyway migrations V1–V6 completed. The extension/vector smoke query passed.
- The normal Ingest runner verified source fragments and ingested all 16 datasets. SQL confirmed 653/653 unique embedding IDs, all vectors 768-dimensional, one source hash per dataset, and 34 control chunks. Counts were Math 1–5: 28/43/51/53/53; Vietnamese 1–5: 36/44/47/44/42; English 1–5: 13/13/18/17/17; Kindergarten: 134. A second complete pass through the runner returned `0 written / 653 skipped` across all 16 datasets. No remote writes.
- `RuntimeExploratory DEV` called the production `VerifiedCurriculumContextProvider` against the local pgvector corpus for 30 queries in each of 16 datasets (480 total). It produced 80 actual decisions (37 `SUPPORTED`, 43 `INSUFFICIENT_EVIDENCE`) and 400 `SERVICE_UNAVAILABLE`; 130 failures occurred before candidates were ranked, 270 after candidate ranking. Those failures remain distinct from evidence decisions.
- Among the 80 completed decisions, exploratory Hit@3 was 100%, false accepts 0, and scope leakage 0. Supported acceptance was 100% for English G1, Math G1/G3/G5; 70% for English G3 and 87.5% for English G5. Four AI-labeled positive queries were refused despite their expected chunk appearing in the top 3: `english-grade3-draft-v1-DEV-006`, `-009`, `-013`, and `english-grade5-draft-v1-DEV-014`. These require label/content adjudication; they are not established false rejections because all labels are AI-authored and unreviewed. Ten datasets had zero completed decisions. No dataset has a complete 30-query measurement.
- During bounded live generation smoke, Gemini returned HTTP 429 `RESOURCE_EXHAUSTED`: the configured embedding model had exhausted the Free Tier daily quota of 1,000 requests and reported a reset delay of about 13h51m. The in-scope game was not generated. The out-of-corpus case also surfaced `SERVICE_UNAVAILABLE` before it could establish an evidence rejection. Do not report either as a passing generation test.
- No holdout-candidate live run was started after the quota response. Existing `HOLDOUT_CANDIDATE` is exposed AI draft material, not an independent holdout. No score threshold or quality gate was changed. `results/local-acceptance-2026-11-01.json` contains the sanitized 16-scope status summary and separate failure/decision counts; raw Gemini errors, keys, prompts from teachers, and generated output are not committed.
- Full backend `mvn verify` passed after these changes: 622 tests, 0 failures/errors, 8 skipped; JaCoCo passed. The opt-in two-case live generation smoke was attempted but failed as described above due to API quota, so it is not counted as a passing test.

### Review packet for an independent benchmark and Kindergarten expert

Use the existing files under `evaluation-drafts/<datasetVersion>/DEV.jsonl` and `HOLDOUT_CANDIDATE.jsonl`; each line contains the natural-language question, proposed accept/reject label, proposed acceptable `expectedChunkIds`, style, author, split and age where applicable. The adjacent manifest pins query SHA, source SHA and curriculum/dataset versions. Resolve each proposed chunk ID in `backend/src/main/resources/curriculum/primary/math-grade1/chunks.jsonl` for Math G1, `backend/src/main/resources/curriculum/kindergarten/chunks.jsonl` for preschool, or `backend/src/main/resources/curriculum/spike/<subject-grade>/chunks.jsonl` for the other 14 primary datasets. Follow its `sourceFragments` to the official PDF, PDF page, printed page, and region. The corpus evidence manifests retain the source hash and transcription exceptions.

Reviewer checklist (not yet completed):

1. Independently decide whether the request should be supported, clarified, or refused; record every acceptable chunk ID rather than forcing a single answer.
2. Verify each proposed chunk against the cited PDF fragment, one-outcome boundary, subject/grade, and (for Kindergarten) age band and allowed domain. For Math, verify every explicit number/operation/range; for language objectives, verify the exact skill and condition without adding requirements absent from the source.
3. Mark ambiguity and rationale, especially the four English DEV IDs above, any question whose top-three contains several plausible outcomes, boundary/negative requests, and questions with compound conditions. Do not relabel these by similarity alone.
4. Record reviewer identity/date separately from the author; double-label at least 20% independently and resolve disagreement before freezing. Current sets have `AI_AUTHORED_UNREVIEWED` status and empty reviewer IDs.
5. Keep DEV for tuning only. Replace exposed candidates as needed, create genuinely disjoint groups, hash and freeze a new HOLDOUT before anyone tuning retrieval sees it. Preserve the agreed gate unchanged: Hit@3 and supported acceptance ≥90%, false accepts = 0, scope leakage = 0.

### Current per-scope live outcomes (AI labels; exploratory only)

| Dataset | Attempted | Service unavailable | Live supported | Live insufficient | Hit@3 | Supported acceptance | False accepts / leaks |
|---|---:|---:|---:|---:|---:|---:|---:|
| English G1 | 30 | 14 | 15 | 1 | 100% | 100% | 0 / 0 |
| English G2 | 30 | 30 | 0 | 0 | — | — | — |
| English G3 | 30 | 15 | 7 | 8 | 100% | 70% | 0 / 0 |
| English G4 | 30 | 30 | 0 | 0 | — | — | — |
| English G5 | 30 | 18 | 7 | 5 | 100% | 87.5% | 0 / 0 |
| Kindergarten | 30 | 30 | 0 | 0 | — | — | — |
| Math G1 | 30 | 18 | 4 | 8 | 100% | 100% | 0 / 0 |
| Math G2 | 30 | 30 | 0 | 0 | — | — | — |
| Math G3 | 30 | 17 | 3 | 10 | 100% | 100% | 0 / 0 |
| Math G4 | 30 | 30 | 0 | 0 | — | — | — |
| Math G5 | 30 | 18 | 1 | 11 | 100% | 100% | 0 / 0 |
| Vietnamese G1 | 30 | 30 | 0 | 0 | — | — | — |
| Vietnamese G2 | 30 | 30 | 0 | 0 | — | — | — |
| Vietnamese G3 | 30 | 30 | 0 | 0 | — | — | — |
| Vietnamese G4 | 30 | 30 | 0 | 0 | — | — | — |
| Vietnamese G5 | 30 | 30 | 0 | 0 | — | — | — |

The table is not a pass: 400 service failures make every scope incomplete, labels are not independently reviewed, and several scopes have zero live decisions. The next external action is to provide authorized Gemini embedding capacity after the current daily quota resets or is raised; only then can the bounded live evaluation and generation smoke resume. Independently, the benchmark and Kindergarten corpus still need human review, and non-pilot generation still needs a coordinated change to the existing `GameDslRequest`/`QuizGameStrategy`/`GeminiGameContentGenerator` contract owner.

## Quota interruption follow-up — 2026-11-02

### What the 400 historical service failures establish

The prior `live-dev.json` stores status, ranked candidates and timing, but not exception class, HTTP status or cause. All 400 historical failures are therefore classified `CAUSE_NOT_CAPTURED_IN_PRIOR_RUN`, not quota. The artifact can only separate 130 failures before ranking from 270 after ranking. A separate later smoke did capture Gemini embedding HTTP 429 `RESOURCE_EXHAUSTED`, proving quota exhaustion at that later time only; it cannot be projected onto the 400 earlier failures. The runner now preserves sanitized service causes internally so future records can distinguish quota, authentication/permission, other HTTP statuses, database, DNS, timeout and unknown causes. No raw provider message is written to the report.

### Checkpoint, resume and embedding reuse

Runtime evaluation writes to a unique run directory and a unique attempt directory under `backend/target/rag-eval-local/runs/`. Every attempt has its own `report.json`; reports are written with a temporary file, fsync, and atomic move. A blocked preflight or service error cannot replace an older attempt or the historical global `live-dev.json`. Reusing a run ID requires an existing matching run manifest; each resume creates a new attempt under that run.

Per-dataset checkpoints are run-scoped snapshots written atomically after each query result. Fingerprints bind the dataset/source, query set, models and retrieval configuration; a mismatch blocks resume. Decisions (`SUPPORTED`, `INSUFFICIENT_EVIDENCE`, `NEEDS_CLARIFICATION`) are complete, while service failures remain pending. An explicit quota/rate-limit response is checkpointed before stopping the batch. The runner does not import old global reports: only per-query checkpoint records in the selected run can be resumed.

Persistent query-embedding reuse is enabled only for the synthetic AI-authored exploratory benchmark. Its key includes a content hash, model, dataset, retrieval configuration, task type and vector dimension; it stores no query text. Teacher requests have no persistent cache. Each report separates fresh vectors, reused vectors and live API calls. Before any live batch, the operator must manually confirm provider quota and provide remaining request budgets plus a timestamp no older than 15 minutes. There are no automatic retries; the batch stops on explicit quota exhaustion.
### English false-reject candidates retained for review

| Query | Expected outcome | Retrieval evidence | Decision attribution | Label status |
|---|---|---|---|---|
| English G3 `DEV-006` | `en-g3-003` (listen and answer simple familiar questions spoken slowly and clearly) | Expected outcome in top 3 | Retrieved, then semantic verifier returned insufficient evidence | AI-authored, unreviewed |
| English G3 `DEV-009` | `en-g3-003` | Expected outcome ranked 2; `en-g3-007` ranked 1 | Retrieved, then semantic verifier returned insufficient evidence | AI-authored, unreviewed |
| English G3 `DEV-013` | `en-g3-003` | Expected outcome in top 3 | Retrieved, then semantic verifier returned insufficient evidence | AI-authored, unreviewed |
| English G5 `DEV-014` | `en-g5-001` (recognize word stress) | Expected outcome ranked 1 | Retrieved, then semantic verifier returned insufficient evidence | AI-authored, unreviewed |

These are verifier-stage refusals, not retrieval misses. Existing artifacts do not retain the Gemini verifier's exact rejection rationale, and the labels have no independent review; therefore none is asserted as a confirmed false reject. Keep all four unchanged as regression/adjudication cases. No threshold or label was tuned to improve the score.

### Minimal generation contract proposal for Nguyễn Đức Duy

Proposal only; no teammate-owned strategy, generation contract or DSL was edited. `GameDslRequest` currently carries topic, subject, grade and optional Kindergarten age, but no curriculum domain. The existing `CurriculumContextProvider` already has a domain-filtered overload. The minimal integration is to add an optional internal `curriculumDomain` (`COGNITIVE`/`LANGUAGE`) to the request and pass it through to that overload; if omitted, Kindergarten retrieval may consider both already-approved domains. Keep age required and keep DSL 1.0.0 unchanged.

For generator grounding outside Math Grade 1, the owner should agree one internal generation-context contract carrying domain/age alongside the selected YCCĐ and provenance from `GameGenerationService` through `GenerationAttempt` to the strategy/generator prompt. The generator must receive the actual subject/grade/age and scope-specific instructions, while the generation guard continues to reject unsupported scopes. This requires a coordinated contract update across `GameDslRequest`, `GameGenerationService`, `GenerationAttempt`, `QuizGameStrategy` and `GeminiGameContentGenerator`; the RAG work must not silently rewrite those owner-managed files. Exact internal type and ownership are the requested coordination decision.

No post-change live resume result is claimed in this report update. Benchmark labels remain exploratory/unreviewed, Kindergarten remains pending specialist approval, and remote Supabase remains untouched.

### Resume attempt and recovery blocker — historical state

At the time of this earlier invocation, the bounded post-change run targeted loopback `rag_eval` but failed before any Gemini call with `SQLTransientConnectionException`; it made no DB writes, no query embedding calls and no new decision. The quota state was therefore not rechecked. The existing data directory was not recreated and ingestion was not repeated. The cluster is currently inconsistent from the runner's view: its PID file/process exists, but `pg_ctl status` reports no running server and port 55432 has no listener. The recovery action is to restore/restart this exact existing cluster so JDBC can connect to `127.0.0.1:55432/rag_eval`; do not initialize a new data directory.

The previous per-query `live-dev.json` was ignored under `target/` and was overwritten by that failed invocation before the runner had a blocked-report sidecar safeguard. The tracked acceptance JSON and this README still preserve the prior aggregate decision counts, stages, scope metrics and four English review cases, but the old per-query outcomes/rankings are no longer available in this workspace. The aggregate is insufficient to reconstruct exactly which 80 queries had decisions. To respect the instruction not to repeat completed work, the runner will not replay all 480 questions. Exact resume requires restoring that prior ignored artifact from backup; absent a backup, start a newly authorized exploratory run with new checkpoints. Future environment failures write a `.blocked.json` sidecar and leave the main report intact.

After the runner changes, focused tests passed (15/15) and full backend `mvn verify` passed (627 tests, 0 failures/errors, 8 skipped; JaCoCo passed). No post-change live evaluation or generation result is claimed because local JDBC failed before model calls.

## Evaluation evidence recovery and isolated preflight — 2026-11-02

- Search covered available Temp backups/worktrees, result folders, and Git object/path history. The only `live-dev.json` found was the already-blocked 2,990-byte report under ignored `backend/target/rag-eval-local/`; no per-query backup was found. `runtime-DEV.json` and `runtime-preflight.json` contain summaries only. The prior 80 individual decisions/rankings cannot be reconstructed and are not inferred from aggregate counts.
- The tracked historical report remains unchanged. Its 480 outcomes, 400 service failures and four English verifier-stage cases are historical aggregates. Cause for the 400 failures is still `CAUSE_NOT_CAPTURED_IN_PRIOR_RUN`; the later HTTP 429 proves quota only for that later smoke. The four English cases remain AI-labeled/unreviewed disagreements, not confirmed false rejects or fixes.
- PostgreSQL was not restarted, initialized, migrated or ingested in this follow-up. Read-only `psql` confirmed the existing local cluster at `127.0.0.1:55432`, database `rag_eval`, data directory `backend/target/rag-eval-local/data`, 653 rows and 16 dataset versions. Earlier JDBC failure was caused by supplying the remote `.env` role when targeting localhost; it did not establish that the cluster was down. Supabase was not accessed.
- A fresh no-call DEV preflight is recorded at `backend/target/rag-eval-local/runs/run-20261101T185722896Z-b669d5c0/attempts/attempt-20261101T185722896Z-9a0ba750/report.json` (code revision `ba4b8cd`). It validated 480 synthetic AI-authored questions and estimated at most 480 embedding + 480 reviewer requests (960 total); manual quota confirmation was absent, so it made zero provider calls. This preflight is not a retrieval result. A new preflight can be run with `scripts/rag-spike.ps1 -Mode RuntimePreflight -RuntimeSplit DEV`; a live attempt requires fresh manual quota confirmation and the local-only connection settings.
- No historic query outcome is merged into a new run. A fresh live evaluation is a separate exploratory run; four prior English adjudication candidates remain unresolved. Independent benchmark labeling and Kindergarten expert approval remain pending.

- Post-hardening verification: focused runner/checkpoint/provider suite passed 36 tests. Full backend `mvn verify` passed 629 tests (0 failures, 0 errors, 8 skipped); JaCoCo passed. This verifies code behavior, not live ranking quality. `git diff --check` and acceptance JSON parsing passed.

## Latest quota and per-dataset follow-up — 2026-11-02

The exact existing PostgreSQL process (PID 37736, PostgreSQL 18) was already listening on 127.0.0.1:55432, so it was not restarted. Read-only SQL reconfirmed the original `data_directory` at `backend/target/rag-eval-local/data`, database `rag_eval`, 653 rows and 16 dataset versions. No corpus, migration or DB write occurred. Backup/worktree/result/Git searches still find only the ignored blocked `live-dev.json`; historic per-query decisions are not recoverable from inspected locations, so the 80 outcomes were not reconstructed.

A single synthetic `RETRIEVAL_QUERY` embedding probe with retries and request logging disabled returned `RateLimitException` (`GEMINI_PROBE=RATE_LIMIT`). This was one attempted request; it is a current rate-limit blocker, not an inferred cause for the old 400 failures. The live batch was not started. The DEV all-scope preflight remains separate (480 pending; maximum 960 requests; 0 provider calls). A dataset-scoped preflight for `english-grade3-draft-v1` validated 30 questions, 30 pending, 0 provider calls; run `preflight-en-g3-postscope-20261102`, attempt `attempt-20261101T190640216Z-867746b4`.

`RuntimeExploratory` now requires `-DatasetVersion` and a stable `-RunId`, runs just that dataset, and records a separate checkpoint under the selected run. Inspect the dataset report and resolve any service failure before starting the next dataset. To resume that scope, reuse the same run ID; to start an unrelated evaluation, choose a new one. No live dataset run has begun because the single-request probe was rate limited.

### English G3/G5 adjudication notes and owner contract to confirm

These four cases are candidate disagreements, not verified false rejects. The proposed labels were written by AI and have no independent reviewer; the old artifact has no per-query verifier explanation.

| Case | Query compared with cited YCCĐ | What is known / unresolved |
|---|---|---|
| G3 DEV-006 | Asks for a basis to answer a familiar English question spoken slowly/clearly. `en-g3-003` says listen and answer **very simple** questions about familiar topics spoken slowly and clearly. | Expected chunk was in top 3; exact rank is not retained. The query does not explicitly say “very simple”; label validity needs an independent teacher/language reviewer. |
| G3 DEV-009 | Plans for pupils to answer a familiar question spoken slowly/clearly. The cited YCCĐ also explicitly covers listening and **very simple** questions. | Expected chunk ranked 2 behind `en-g3-007` (classroom question/answer). This is the strongest scope-confusion candidate: the top rank is speaking, while the expected listening outcome is second. Label/verifier disagreement remains unresolved. |
| G3 DEV-013 | Same familiar, slowly/clearly spoken question; asks not to substitute another activity. | Expected chunk in top 3; exact rank not retained. The “very simple” condition is still absent from the query. |
| G5 DEV-014 | Asks pupils to hear an English word and recognize the stressed sound. `en-g5-001` says listen and recognize word stress. | Expected chunk ranked 1 and wording is close. Whether “tiếng được nhấn mạnh” matches “trọng âm từ” is not independently adjudicated. |

Minimal contract for Nguyễn Đức Duy to confirm (proposal only; no request sent and no strategy/DSL changed):

1. Add an internal optional `curriculumDomain` (`COGNITIVE`/`LANGUAGE`) to the existing generation request for Kindergarten; pass it through `GameGenerationService` to the domain-filtered provider. Keep preschool age required and filter both before semantic verification. Do not add DSL fields.
2. Carry selected evidence as an internal context containing exact chunk ID/text, source document/hash, curriculum and dataset versions, PDF/printed pages, and (for preschool) age/domain into generation.
3. Confirm the strategy/generator boundary accepts the actual subject, grade, age/domain and teacher objective and applies scope-appropriate prompts/grounding; Math G1 arithmetic rules do not decide English or Kindergarten evidence. Unsupported scopes remain blocked until the owner implements and tests them.
4. Duy confirms the internal type and method signatures across `GameDslRequest` → `GameGenerationService` → `GenerationAttempt` → strategy/generator, with public DSL 1.0.0 unchanged.

The history search found no recoverable old per-query checkpoint. Do not treat new-run results as a continuation of the old 80. Benchmark labels remain AI-authored/unreviewed, and preschool expert approval remains pending.

- Runner regression after the single-scope change: focused RAG suite now covers 37 tests; full backend `mvn verify` passed 630 tests, 0 failures/errors, 8 skipped, JaCoCo passed. This run still includes no live retrieval because Gemini rate-limited the one-request probe.

## Generation adapter grounding follow-up — 2026-11-02

- The generation service already passes the selected subject, grade, teacher topic, retrieved context and evidence to `GenerationAttempt`; the output reviewer receives the same evidence IDs. The previous adapter guard nevertheless rejected every non-Math-G1 request, and its only prompt path called the Math-G1-specific `QuizGameStrategy`.
- The adapter now preserves that existing Math-G1 arithmetic-verifier path, but for other QUIZ scopes builds a separate scope-aware prompt from the actual subject, grade, teacher request, retrieved outcome text and provenance. It requires versioned source/hash, dataset version and embedding-model markers before making a model call. Non-QUIZ types remain rejected. The strategy, request contract and DSL were not edited.
- Kindergarten provider context now includes the selected outcome's age band, domain, subdomain and source provenance; the non-pilot prompt explicitly tells the model to honor age/domain. Request-level domain selection is still unavailable in the generation request, so the provider searches the permitted domains and the evidence verifier selects the supported outcome. Adding a request-level domain requires the owner contract change described above.
- Focused regression additions cover all 14 non-pilot primary subject/grade scopes, Kindergarten age/domain preservation, rejection before model call without provenance, and evidence/context passage through `GameGenerationService`. These are fixture/model-fake checks, not live generation or content-quality evidence.
- The latest one-request Gemini probe returned rate limit, so no generation or retrieval batch was attempted. Focused tests after this adapter edit passed 56 tests (0 failures/errors/skipped). Full backend `mvn verify` after the edit passed 634 tests (0 failures/errors, 8 skipped); JaCoCo passed. This validates code and regression behavior, not live retrieval or generated content quality.
- The four English G3/G5 candidate disagreements remain unresolved as documented above; no labels, thresholds or verifier outcomes were changed. Independent benchmark review, Kindergarten specialist approval and live results remain pending.

## Owner approval for PDF-extracted Kindergarten corpus — 2026-11-02

- The owner has decided that Kindergarten outcomes extracted from and verified against the exact official PDF are approved as curriculum corpus data. The manifest pins the source hash and records this approval basis. This is not represented as specialist pedagogical review.
- Runtime catalog now includes the packaged Kindergarten dataset with the primary scopes whenever Curriculum RAG is enabled. The separate `CURRICULUM_KINDERGARTEN_ENABLED` and `CURRICULUM_KINDERGARTEN_EXPERT_APPROVED_SOURCE_SHA256` gates have been removed. Per-request age/domain filters, semantic evidence verification, exact-manifest readiness and no-control checks remain required.
- Focused configuration/provider tests passed 11/11; full backend `mvn verify` passed 634 tests, 0 failures/errors, 8 skipped, and JaCoCo passed. No Gemini call or database write was made for this change. Live retrieval and generation quality remain unmeasured until quota is available.
