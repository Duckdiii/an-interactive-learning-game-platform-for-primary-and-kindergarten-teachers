# Chạy spike RAG Toán lớp 1

**Kết luận nghiệm thu mới nhất (2026-10-30): chưa đạt phát hành.** Regression backend và pgvector đạt, nhưng bộ20 lần sinh mới có2 lỗi và game được tạo có lỗi nội dung. Xem [báo cáo nghiệm thu](acceptance-2026-10-30.md). Kết quả exploratory cũ bên dưới không chứng minh phiên bản hiện tại đã nghiệm thu đầy đủ. Các đề xuất hybrid/HyDE/judge nằm trong [plan thử nghiệm](rag-variants-experiment.md), chưa bật vào pipeline.

Trạng thái: spike live Toán lớp 1 **đạt bộ tiêu chí exploratory**: Hit@3 10/10, zero leakage, 3/3 negative bị từ chối và 5/5 control probes đúng scope. Ngưỡng 0.855 được chọn sau lần chạy đầu trên cùng bộ query; cần đánh giá holdout trước khi coi kết quả tổng quát. Pilot QUIZ / Toán lớp 1 đã nối retrieval vào `GameGenerationService` và system prompt Gemini qua feature flag. Fake Gemini test xác nhận context/citation và schema; live smoke sinh quiz từ chủ đề trong corpus và từ chối chủ đề ngoài corpus đều pass. Xem [kiểm tra nguồn](source-audit.md), [contract context](context-contract.md), [kế hoạch tích hợp orchestration](integration-plan.md) và [bảng đánh giá](evaluation.md).

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

Extraction lưu tại `backend/target/curriculum-spike/extracted/`. Báo cáo live mới được tạo ở `docs/rag-spike/results/live-*.json` sau khi chạy đủ query và đối chứng. Mỗi báo cáo ghi model, dimension, ngưỡng, nguồn, thời điểm, đoạn trả về, score, latency và kết quả gate; yêu cầu đọc thủ công trước khi dẫn kết luận chất lượng.

`source-verification.json` chỉ được xuất bản khi toàn bộ chunk khớp PDF. Báo cáo ghi SHA nguồn, phiên bản dataset/chương trình, số YCCĐ/đối chứng và nội dung từng chunk kèm trang PDF, trang in, vùng chữ. Báo cáo thành công cũ bị xóa ngay đầu lần xác minh mới; nếu sai SHA hoặc một fragment không khớp thì không còn báo cáo thành công để dùng nhầm. File được ghi tạm rồi đổi tên sau khi hoàn tất.

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
