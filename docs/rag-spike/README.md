# Chạy spike Curriculum RAG

Trạng thái: corpus 15/15 scope đã nạp đủ 558/558 vector; lần nạp lặp bỏ qua 558, ghi 0. Exploratory retrieval đã chạy trên 8/15 scope: Hit@3 80/80, negative rejection 19/24, leakage 0; gate tổng thể FAIL. Holdout MATH G1–G3 đều FAIL; calibration chưa chạy. Hai live QUIZ smoke trước đó xác nhận sinh được game cho chủ đề trong corpus và từ chối chủ đề ngoài corpus. So sánh strategy có/không RAG cho MATH G1 có output schema-valid ở 6/10 type, còn 4 lỗi provider; ma trận E2E production đủ 10 type mới chạy 0/15 scope. Gemini embedding daily quota hiện chặn 7 scope retrieval còn lại. Xem [báo cáo tổng hợp](results/curriculum-rag-summary.md), [coverage](results/scope-coverage.csv), [kiểm tra nguồn](source-audit.md), [contract context](context-contract.md) và [kế hoạch orchestration](integration-plan.md).

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

Sau khi xác nhận Gemini chat key/model và bảng/vector đã nạp đủ, đặt trong `backend/.env`:

```dotenv
GEMINI_GAME_GENERATION_ENABLED=true
CURRICULUM_RAG_ENABLED=true
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
CURRICULUM_RAG_MIN_SCORE=0.855
```

Corpus outcome-level hiện có đủ **15/15 curriculum scope**: 497 yêu cầu cần đạt và 61 chunk đối chứng, tổng 558 chunk; tất cả đã trích xuất và đối chiếu text/trang nguồn, semantic/pedagogical review chưa chạy. Kiểm tra Supabase xác nhận **558/558 vectors**, 15/15 scope. Ingest lặp ghi 0 và bỏ qua 558 ID đã có.

Retrieval exploratory đã chạy 8/15 scope; 7 scope còn lại (`MATH` G4–G5, `VIETNAMESE` G1–G2, `ENGLISH` G3–G5) chưa chạy vì Gemini báo hết 1000 embedding requests/ngày. Trên 104 query ở các scope đã đo: Hit@3 80/80; negative rejection 19/24; 5 false acceptance nên gate FAIL. Holdout chỉ có MATH G1–G3 và cả ba FAIL; calibration chưa chạy. Hai live QUIZ smoke ở MATH G1 đã xác nhận một topic được sinh và topic ngoài corpus bị từ chối; đầy đủ 10 game type E2E theo scope chưa chạy (0/15). So sánh strategy MATH G1 có 6/10 cặp schema-valid và 4 provider failures. Checker chỉ advisory; live checker và UI giáo viên chưa xác minh; review của giáo viên đang pending. Chi tiết từng scope/run ở [báo cáo tổng hợp](results/curriculum-rag-summary.md), [coverage CSV/JSON](results/scope-coverage.csv) và [run checkpoint](results/full-curriculum-run-2026-10-12.json).

## Lệnh PowerShell từ thư mục gốc repo

```powershell
# Chỉ in trạng thái đã cấu hình hay chưa; không in giá trị secret.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode CheckConfig

# Bước này không cần Gemini/database. Xác minh lại đúng nguồn trước khi nạp.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Extract -SkipBuild

# Chạy Flyway của project: V1 bật vector; V5 tạo bảng. Không sửa V1–V4.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Migrate -SkipBuild

# Nạp/retry các dataset còn thiếu (558 chunks tổng cộng; scope hoàn tất được bỏ qua); xác minh nguồn trước khi gọi embedding API.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Ingest -SkipBuild

# Chạy lại: cùng ID được bỏ qua, không gọi embedding lại cho các ID đã có.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Ingest -SkipBuild

powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Query -Topic 'Phép cộng nhẩm trong phạm vi 10' -SkipBuild
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Evaluate -SkipBuild
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Holdout -SkipBuild
```

Lần đầu bỏ `-SkipBuild` để compile và tạo classpath. Script dùng Maven có sẵn hoặc Maven trong wrapper cache, rồi mới dùng `mvnw.cmd`. Có thể truyền `-EnvFile 'đường_dẫn_file.env'` và `-PdfPath 'đường_dẫn_PDF'`. Biến môi trường process được ưu tiên so với file.

Mã thoát: 0 thành công; 1 lỗi vận hành; 2 cấu hình còn thiếu; 3 query không đủ căn cứ; 4 kết quả đánh giá chưa đạt. Không chạy Spring application nên không cần cấu hình JWT/OpenAI Moderation cho runner này.

## Lưu trữ và nạp lại

- LangChain4j core/Gemini 1.20.1 được giữ nguyên; PgVector integration dùng bản tương ứng 1.20.1-beta30. PDFBox 3.0.8 phục vụ kiểm tra theo trang/cột.
- Bảng do Flyway quản lý, vector 768 chiều; `PgVectorEmbeddingStore` không tự tạo bảng/extension, không xoá bảng trước khi chạy.
- Cùng embedding model 001 và 768 chiều; tài liệu dùng `RETRIEVAL_DOCUMENT`, query dùng `RETRIEVAL_QUERY`. Vectors tài liệu được chuẩn hoá. [Tài liệu Google](https://ai.google.dev/gemini-api/docs/embeddings).
- ID UUID được xác định từ SHA nguồn, phiên bản bộ dữ liệu, chunk ID, model, dimension và nội dung. Nạp lại bỏ qua các ID đã tồn tại; thư viện còn upsert theo primary key nếu có lần nạp đồng thời.
- Nếu dữ liệu/model thay đổi, phải review và tạo phiên bản mới; không trộn vector khác model vào cùng phạm vi retrieval. Mỗi scope phải khớp danh sách ID và expected outcomes đã đóng băng trong catalog/fixture trước khi query/evaluate.
- Metadata lọc bắt buộc `subject`, `gradeLevel`, `contentType`, phiên bản dữ liệu/chương trình, SHA nguồn và embedding model. Dữ liệu đối chứng không bị loại bằng cờ `control`, để kiểm tra bộ lọc môn/lớp có tác dụng thực sự.

## Kết quả và giới hạn

Extraction lưu tại `backend/target/curriculum-spike/extracted/`. Báo cáo live mới được tạo ở `docs/rag-spike/results/live-*.json` sau khi chạy đủ query và đối chứng. Mỗi báo cáo ghi model, dimension, ngưỡng, nguồn, thời điểm, đoạn trả về, score, latency và kết quả gate; yêu cầu đọc thủ công trước khi dẫn kết luận chất lượng.

`FOUND` nghĩa là có ứng viên vượt ngưỡng tương đồng, không chứng minh mọi yêu cầu trong câu giáo viên nhập đều được chương trình hỗ trợ. Đặc biệt, similarity có thể không phân biệt được “không nhớ” và “có nhớ”. Negative queries được đo riêng để phát hiện vấn đề này. Nếu negative gate không đạt, cần nghiên cứu xác nhận phạm vi/reranking trước khi đưa vào luồng sinh game.

Đánh giá retrieval không chứng minh Gemini luôn sinh đúng chương trình. Đã chạy một so sánh strategy-level có/không RAG cho cả 10 game type tại MATH/GRADE_1: 6/10 cặp có output hợp lệ schema, 4/10 bị lỗi từ provider. Đây chưa phải kiểm thử orchestration production end-to-end cho toàn bộ 15 scope; ma trận đó vẫn NOT_RUN. Đáp án và curriculum alignment chưa được giáo viên đánh giá.

## Tiếp tục sau quota và kết quả offline

Failure analysis, evidence guard, query embedding cache, test status và trạng thái NOT_RUN được cập nhật trong [báo cáo tổng hợp](results/curriculum-rag-summary.md). Dùng [resume runbook](results/resume-runbook-2026-10-12.md) để chạy đúng 7 scope retrieval còn thiếu, 12 holdout chưa chạy và 4 strategy provider failures. [Production E2E matrix](results/production-e2e-matrix.csv) có 30 ca cho 15 scope, hiện tất cả `NOT_RUN`. Corpus 558 vector không cần ingest lại. Evidence guard là kiểm tra ràng buộc tường minh, chưa chứng minh semantic alignment tổng quát; threshold giữ 0.855.