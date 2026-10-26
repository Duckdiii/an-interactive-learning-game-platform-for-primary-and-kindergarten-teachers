# Chạy spike RAG Toán lớp 1

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

Sau khi xác nhận Gemini chat key/model và bảng/vector đã nạp đủ, đặt trong `backend/.env`:

```dotenv
GEMINI_GAME_GENERATION_ENABLED=true
CURRICULUM_RAG_ENABLED=true
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
CURRICULUM_RAG_MIN_SCORE=0.855
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

- LangChain4j core/Gemini 1.20.1 được giữ nguyên; PgVector integration dùng bản tương ứng 1.20.1-beta30. PDFBox 3.0.8 phục vụ kiểm tra theo trang/cột.
- Bảng do Flyway quản lý, vector 768 chiều; `PgVectorEmbeddingStore` không tự tạo bảng/extension, không xoá bảng trước khi chạy.
- Cùng embedding model 001 và 768 chiều; tài liệu dùng `RETRIEVAL_DOCUMENT`, query dùng `RETRIEVAL_QUERY`. Vectors tài liệu được chuẩn hoá. [Tài liệu Google](https://ai.google.dev/gemini-api/docs/embeddings).
- ID UUID được xác định từ SHA nguồn, phiên bản bộ dữ liệu, chunk ID, model, dimension và nội dung. Nạp lại bỏ qua các ID đã tồn tại; thư viện còn upsert theo primary key nếu có lần nạp đồng thời.
- Nếu dữ liệu/model thay đổi, phải review và tạo phiên bản mới; không trộn vector khác model vào cùng phạm vi retrieval. Bộ dữ liệu phải đủ 28 ID đúng trước khi query/evaluate.
- Metadata lọc bắt buộc `subject`, `gradeLevel`, `contentType`, phiên bản dữ liệu/chương trình, SHA nguồn và embedding model. Dữ liệu đối chứng không bị loại bằng cờ `control`, để kiểm tra bộ lọc môn/lớp có tác dụng thực sự.

## Kết quả và giới hạn

Extraction lưu tại `backend/target/curriculum-spike/extracted/`. Báo cáo live mới được tạo ở `docs/rag-spike/results/live-*.json` sau khi chạy đủ query và đối chứng. Mỗi báo cáo ghi model, dimension, ngưỡng, nguồn, thời điểm, đoạn trả về, score, latency và kết quả gate; yêu cầu đọc thủ công trước khi dẫn kết luận chất lượng.

`FOUND` nghĩa là có ứng viên vượt ngưỡng tương đồng, không chứng minh mọi yêu cầu trong câu giáo viên nhập đều được chương trình hỗ trợ. Đặc biệt, similarity có thể không phân biệt được “không nhớ” và “có nhớ”. Negative queries được đo riêng để phát hiện vấn đề này. Nếu negative gate không đạt, cần nghiên cứu xác nhận phạm vi/reranking trước khi đưa vào luồng sinh game.

Đánh giá retrieval không chứng minh Gemini luôn sinh đúng chương trình. Chưa chạy so sánh live sinh game có/không RAG; pilot mới hoàn thiện prompt QUIZ và chưa mở rộng prompt cho 10 strategy.
