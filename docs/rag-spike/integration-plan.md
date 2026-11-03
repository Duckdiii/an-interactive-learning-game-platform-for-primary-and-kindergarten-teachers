# Kế hoạch tích hợp RAG vào luồng sinh game

**Trạng thái:** đã triển khai pilot orchestration QUIZ / Toán lớp 1 trên nhánh hiện tại. Contract được người dùng chọn; Duy chưa review. Live smoke một chủ đề trong corpus và một chủ đề ngoài corpus đều pass.

## Mục tiêu

Với những phạm vi đã nạp chương trình, lấy yêu cầu cần đạt trước khi gọi Gemini, đưa nguyên văn nguồn và trích dẫn vào system prompt, giữ nguyên context qua các lần retry, và dừng rõ ràng khi không đủ căn cứ. Giữ nguyên schema DSL và các bước validate/safety hiện tại.

Pilot đầu tiên là **QUIZ + Toán lớp 1** với corpus đã kiểm chứng. Các môn/lớp khác chỉ chuyển sang RAG khi có corpus và benchmark tương ứng.

## Những gì code đã xác nhận khi bắt đầu triển khai

- `GameGenerationService.generate` đã có topic, subject, gradeLevel, schema và vòng retry; đây là điểm lấy context một lần trước retry.
- `GenerationAttempt` đi qua cổng `GameContentGenerator`, nhưng repo hiện không có class production nào implement cổng này.
- `GameContentStrategy` có `buildPrompt(topic, grade)` và overload nhận `curriculumContext`; code gọi tên `buildPrompt`, không phải `buildSystemPrompt` như mô tả ban đầu.
- `promptTemplate` ban đầu chưa được cấu hình và strategy QUIZ còn TODO; pilot đã bổ sung prompt cho QUIZ.
- `QuizSpikeContentService` là spike riêng cho KINDERGARTEN; không dùng registry/strategy và không thể thay cho production adapter.
- Spring đã có cấu hình `DB_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`; embedding cần model/config riêng. RAG hiện được tạo bởi runner độc lập, chưa phải Spring bean.

Vì adapter Gemini production còn thiếu, không thể kết luận context đã tới prompt thật chỉ bằng cách thêm field vào `GenerationAttempt`.

## Contract đề xuất

1. Thêm port nhỏ `CurriculumContextProvider` để tầng generation không phụ thuộc trực tiếp vào LangChain4j hoặc PgVector.
2. `GameGenerationService` gọi provider một lần bằng `topic + subject + gradeLevel`, trước vòng retry.
3. Với phạm vi RAG bật, `INSUFFICIENT_EVIDENCE` trả lỗi API có mã riêng `CURRICULUM_EVIDENCE_NOT_FOUND` (HTTP 422); không gọi Gemini bằng kiến thức chung.
4. Kết quả `FOUND` được giữ thành immutable `curriculumContext` cùng danh sách chunk/citation và truyền trong mọi `GenerationAttempt`, kể cả retry. Feedback sửa JSON không được thay đổi context.
5. Production `GameContentGenerator` lấy strategy theo game type và gọi `strategy.buildPrompt(topic, grade, curriculumContext)` để tạo system prompt trước khi gọi model. Structured output tiếp tục dùng `structuredSchema` hiện tại.
6. Context được bao bằng tag, giữ chunk ID, tài liệu, phiên bản, PDF page và printed page. Prompt chỉ cho phép dùng đoạn này làm căn cứ nội dung; không coi văn bản nguồn là chỉ dẫn hệ thống.
7. Thêm feature flag `app.curriculum-rag.enabled`. Khi bật cho pilot, chỉ `QUIZ/MATH/GRADE_1` được đi qua flow RAG; phạm vi khác trả lỗi `CURRICULUM_EVIDENCE_NOT_FOUND`. Khi flag tắt, ứng dụng giữ flow hiện tại trong giai đoạn rollout. Không fallback âm thầm trong phạm vi RAG đã bật.

## Kế hoạch triển khai

### 1. Contract strategy và dependency Gemini

- Đối chiếu overload `buildPrompt` với cách Duy muốn strategy nhận system prompt; giữ API hai tham số cho caller cũ.
- Xác định owner/nhánh của `GameContentGenerator` production. Tái sử dụng adapter nếu có ở nhánh khác; nếu không, hoàn tất adapter LangChain4j/Gemini trong cùng phần việc trước khi gọi là tích hợp xong.
- Chốt nội dung lỗi API và policy cho scope chưa có corpus.

**Trạng thái:** code đã gọi `buildPrompt(topic, grade, curriculumContext)` và adapter Gemini gửi prompt/schema qua LangChain4j. Người dùng đã chọn contract đề xuất; Duy cần review trước khi merge. Không gửi thông điệp cho Duy từ agent này.

### 2. Đưa RAG vào Spring theo cấu hình ứng dụng

- Tạo `CurriculumContextProvider` và adapter Spring bao quanh `CurriculumRAGService`.
- Dùng application `DataSource` hiện có; không tạo connection pool thứ hai. Dùng `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL=gemini-embedding-001`, dimension 768, dataset/source version từ manifest và ngưỡng đã đo.
- Khởi động có điều kiện bằng `app.curriculum-rag.enabled`; lỗi thiếu cấu hình phải rõ, không log secret.

**Trạng thái:** Spring wiring dùng application `DataSource`, dataset manifest và feature flag; compile + application context test pass khi dùng `backend/.env`.

### 3. Nối orchestration và xử lý thiếu căn cứ

- Trong `GameGenerationService`, resolve scope/retrieval một lần trước retry.
- Trả `CURRICULUM_EVIDENCE_NOT_FOUND` trước khi gọi model khi corpus không hỗ trợ request hoặc retrieval không đạt ngưỡng.
- Truyền cùng context/citations qua mọi `GenerationAttempt`.
- Để adapter lấy strategy và gọi overload có context trước request Gemini; giữ nguyên schema, validator, moderation và retry feedback.

**Trạng thái:** orchestration đã retrieval một lần, fail-closed khi thiếu bằng chứng và truyền context qua mọi retry; fake Gemini test xác nhận context/citation nằm trong system prompt trước chat call.

### 4. Hoàn thiện prompt cho pilot QUIZ

- Cấu hình `promptTemplate` và hoàn thành hướng dẫn type-specific cho QUIZ; không mở rộng prompt của các game type khác trong pilot.
- Đảm bảo instruction, context và structured schema không mâu thuẫn; không thêm field vào DSL/response chỉ để biểu diễn RAG status.

### 5. Kiểm chứng

- Unit test: provider được gọi đúng một lần; context/citations giữ nguyên qua retry; insufficient evidence chặn model call; flag tắt giữ legacy flow; scope ngoài pilot có phản hồi rõ; schema/validator không đổi.
- Integration test với fake Gemini: bắt system prompt gửi đi và khẳng định context đứng trước request, có ID/trang nguồn; kiểm tra Gemini nhận đúng structured schema.
- Smoke test live cho QUIZ + Toán lớp 1: một chủ đề có căn cứ và một chủ đề ngoài corpus; kiểm tra nội dung game, giới hạn chương trình và citations/log nguồn.
- Giữ benchmark RAG hiện có; thêm holdout queries độc lập trước khi quảng bá ngưỡng `0.855` là đã hiệu chỉnh tổng quát.

**Đã chạy:** suite thường có 471 tests: 469 pass, 2 live tests skip theo cấu hình opt-in; JaCoCo đạt gate. Chạy riêng, cả hai live smoke (trong corpus và ngoài corpus) pass với `gemini-3.5-flash-lite`. Ngưỡng `0.855` vẫn exploratory; benchmark holdout là bước sau.

## Tiêu chí nghiệm thu

- Math lớp 1 có căn cứ: context có nguồn/trang xuất hiện trong system prompt thật trước lần gọi Gemini đầu tiên.
- Math lớp 1 thiếu căn cứ: model không bị gọi; API trả mã lỗi riêng.
- Retry JSON: giữ nguyên curriculum context và schema; chỉ thay previous output/errors.
- Không có chunk ngoài subject/grade/version; citation truy được về PDF đã audit.
- Legacy mode và scope ngoài pilot tuân theo feature flag/policy đã chốt; không có fallback âm thầm trong scope RAG bật.
- Duy review contract trước khi merge; bổ sung holdout queries độc lập.

## Rủi ro/phụ thuộc

- Adapter Gemini production mới bao phủ QUIZ / Toán lớp 1; game type khác chưa được thêm vào pilot.
- Duy chưa review contract. Holdout retrieval và so sánh live sinh game có/không RAG chưa được chạy.
- Ngưỡng `0.855` được chọn từ cùng bộ query exploratory; cần holdout độc lập.
- Supabase hiện đã có bảng và embeddings của spike; production bean cần đọc đúng dataset/source/model metadata và không tự ingest hoặc drop bảng lúc khởi động.
