# Kế hoạch tích hợp RAG vào luồng sinh game

**Trạng thái:** orchestration RAG đã nối cho các scope có corpus; hiện catalog chỉ có Toán lớp 1. Context được đưa vào strategy của cả 10 game type, nhưng live E2E mới có một cặp QUIZ. Ba giá trị enum subject được giữ nguyên. Contract được người dùng chọn; Duy chưa review. Mục tiêu full corpus là 15 primary subject-grade/program scopes. Ngưỡng 0.855 vẫn exploratory; q01 đúng UTF-8 lặp lại 0.895729657 và đạt ngưỡng ở cả hai lần chạy. Probe 0.8548 dùng query bị thay 3 ký tự tiếng Việt thành `?`, nên không phải một lần chạy lại cùng query.

## Mục tiêu

Với những phạm vi đã nạp chương trình, lấy yêu cầu cần đạt trước khi gọi Gemini, đưa nguyên văn nguồn và trích dẫn vào system prompt, giữ nguyên context qua các lần retry, và dừng rõ ràng khi không đủ căn cứ. Giữ nguyên schema DSL và các bước validate/safety hiện tại.

Pilot đầu tiên là **QUIZ + Toán lớp 1** với corpus đã kiểm chứng. Các môn/lớp khác chỉ chuyển sang RAG khi có corpus và benchmark tương ứng.

## Những gì code đã xác nhận khi bắt đầu triển khai

- `GameGenerationService.generate` đã có topic, subject, gradeLevel, schema và vòng retry; đây là điểm lấy context một lần trước retry.
- `GenerationAttempt` đi qua cổng `GameContentGenerator`, nhưng repo hiện không có class production nào implement cổng này.
- `GameContentStrategy` có overload `buildPrompt(topic, subject, grade, curriculumContext)`; code gọi `buildPrompt`, không phải `buildSystemPrompt` như mô tả ban đầu.
- Ban đầu 9/10 game strategies chưa có prompt instruction dùng được; hiện đã có prompt/template theo output schema cho cả 10 game type và test context đi tới generator cho ba giá trị `Subject`.
- `QuizSpikeContentService` là spike riêng cho KINDERGARTEN; không dùng registry/strategy và không thể thay cho production adapter.
- Spring đã có cấu hình `DB_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`; embedding cần model/config riêng. RAG hiện được tạo bởi runner độc lập, chưa phải Spring bean.

Vì adapter Gemini production còn thiếu, không thể kết luận context đã tới prompt thật chỉ bằng cách thêm field vào `GenerationAttempt`.

## Contract đề xuất

1. Thêm port nhỏ `CurriculumContextProvider` để tầng generation không phụ thuộc trực tiếp vào LangChain4j hoặc PgVector.
2. `GameGenerationService` gọi provider một lần bằng `topic + subject + gradeLevel`, trước vòng retry.
3. Với phạm vi RAG bật, `INSUFFICIENT_EVIDENCE` trả lỗi API có mã riêng `CURRICULUM_EVIDENCE_NOT_FOUND` (HTTP 422); không gọi Gemini bằng kiến thức chung.
4. Kết quả `FOUND` được giữ thành immutable `curriculumContext` cùng danh sách chunk/citation và truyền trong mọi `GenerationAttempt`, kể cả retry. Feedback sửa JSON không được thay đổi context.
5. Production `GameContentGenerator` lấy strategy theo game type và gọi `strategy.buildPrompt(topic, subject, grade, curriculumContext)` để tạo system prompt trước khi gọi model. Structured output tiếp tục dùng `structuredSchema` hiện tại.
6. Context được bao bằng tag, giữ chunk ID, tài liệu, phiên bản, PDF page và printed page. Prompt chỉ cho phép dùng đoạn này làm căn cứ nội dung; không coi văn bản nguồn là chỉ dẫn hệ thống.
7. Thêm feature flag `app.curriculum-rag.enabled`. Khi bật cho pilot, chỉ `QUIZ/MATH/GRADE_1` được đi qua flow RAG; phạm vi khác trả lỗi `CURRICULUM_EVIDENCE_NOT_FOUND`. Khi flag tắt, ứng dụng giữ flow hiện tại trong giai đoạn rollout. Không fallback âm thầm trong phạm vi RAG đã bật.

## Kế hoạch triển khai

### 1. Contract strategy và dependency Gemini

- Đối chiếu overload `buildPrompt` với cách Duy muốn strategy nhận system prompt; giữ API hai tham số cho caller cũ.
- Xác định owner/nhánh của `GameContentGenerator` production. Tái sử dụng adapter nếu có ở nhánh khác; nếu không, hoàn tất adapter LangChain4j/Gemini trong cùng phần việc trước khi gọi là tích hợp xong.
- Chốt nội dung lỗi API và policy cho scope chưa có corpus.

**Trạng thái:** adapter Gemini gửi prompt/schema qua LangChain4j; context được giữ qua retry. Người dùng đã chọn contract đề xuất; Duy cần review trước khi merge. Không gửi thông điệp cho Duy từ agent này.

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

### 4. Hoàn thiện prompt cho các game strategy

- Cấu hình prompt dùng chung và hướng dẫn type-specific theo schema của cả 10 game type; truyền đúng môn, lớp, chủ đề và curriculum context.
- Đảm bảo instruction, context và structured schema không mâu thuẫn; không thêm field vào DSL/response chỉ để biểu diễn RAG status.

### Contract `metadata.curriculumReview` — cần Duy review

- `GameGenerationService` hiện đính kèm review tư vấn vào game trả về: `status` (`REVIEWED`/`UNAVAILABLE`), `claims[]`, `warnings[]`; mỗi claim có `questionId`, nội dung, trạng thái hỗ trợ, lý do và `chunkIds` nguồn. Review chỉ cảnh báo, không chặn game.
- Frontend hiện chỉ khai báo TypeScript type; không có nơi đọc hoặc hiển thị warning. Product requirement trước đó yêu cầu giáo viên nhìn thấy cảnh báo, nên giữ contract public và thêm renderer ở frontend; không chuyển nó thành artifact đánh giá riêng.
- Field đang được thêm vào JSON schemas của DSL `1.0.0`. Optional không bảo đảm tương thích: Duy cần quyết định có giữ trong `metadata` hay chuyển sang response envelope, cách version schema/API, semantics của `UNAVAILABLE`, và định dạng citation trước merge. Renderer phải phân biệt warning AI với teacher review đang pending.
- Trạng thái hiện tại: contract code có, frontend runtime consumer chưa có, Duy review/versioning chưa xong. Không xem advisory AI là phê duyệt sư phạm.

### 5. Kiểm chứng

- Unit test: provider được gọi đúng một lần; context/citations giữ nguyên qua retry; insufficient evidence chặn model call; flag tắt giữ legacy flow; scope ngoài pilot có phản hồi rõ; schema/validator không đổi.
- Integration test với fake Gemini: bắt system prompt gửi đi và khẳng định context đứng trước request, có ID/trang nguồn; kiểm tra Gemini nhận đúng structured schema.
- Smoke test live cho QUIZ + Toán lớp 1: một chủ đề có căn cứ và một chủ đề ngoài corpus; kiểm tra nội dung game, giới hạn chương trình và citations/log nguồn.
- Giữ benchmark RAG hiện có; thêm holdout queries độc lập trước khi quảng bá ngưỡng `0.855` là đã hiệu chỉnh tổng quát.

**Đã chạy:** bộ test targeted ban đầu 48 pass; full backend suite (không gồm `AigameBackendApplicationTests`, cần Spring context/DB) có 478 pass, 0 failure/error, 2 live tests skip theo opt-in; sau đó có thêm 3 unit test pass cho vector-score audit. Gemini chunk advisory: 28/28 kết quả, tất cả `CANDIDATE_OK`; teacher review vẫn bắt buộc. Một cặp game Math G1/QUIZ tại threshold 0.75: cả hai schema-valid, preliminary arithmetic 4/4 mỗi output; chưa có teacher scoring. Hai lần chạy đúng fixture UTF-8 cho q01 đều đạt 0.895729657 tại cả threshold 0.75 và 0.855. Vector replay xác nhận query bị lỗi mã hoá có relevance 0.854824668 theo công thức PgVector `(1+cosine)/2`; không phải cùng một query. Holdout độc lập đã chạy và FAIL near-miss gate (2/6 false acceptance); calibration riêng NOT_RUN. Claim verifier advisory đã có code/unit test, chưa live-evaluate. 14 scope đã trích raw page text nhưng chưa outcome-chunk/ingest/evaluate; Duy review vẫn pending. Báo cáo tổng hợp và flow nằm ở [`results/curriculum-rag-summary.md`](results/curriculum-rag-summary.md) và [`curriculum-rag-flow.md`](curriculum-rag-flow.md).

## Tiêu chí nghiệm thu

- Math lớp 1 có căn cứ: context có nguồn/trang xuất hiện trong system prompt thật trước lần gọi Gemini đầu tiên.
- Math lớp 1 thiếu căn cứ: model không bị gọi; API trả mã lỗi riêng.
- Retry JSON: giữ nguyên curriculum context và schema; chỉ thay previous output/errors.
- Không có chunk ngoài subject/grade/version; citation truy được về PDF đã audit.
- Legacy mode và scope ngoài pilot tuân theo feature flag/policy đã chốt; không có fallback âm thầm trong scope RAG bật.
- Duy review contract trước khi merge; calibration riêng; mở rộng corpus 14 scope; live-evaluate advisory checker; chạy full orchestration; teacher review.

## Rủi ro/phụ thuộc

- Hiện mới có 1/15 curriculum scopes đã chunk/ingest; không có scope nào được xác nhận full support.
- Chỉ 1/10 game type đã có live end-to-end pair; 9 loại còn lại và các môn/khối còn lại chưa chạy live.
- Duy chưa review contract. Holdout chạy nhưng fail; independent calibration chưa chạy. Post-generation checker đã implement advisory nhưng chưa live-evaluate.
- Ngưỡng `0.855` được chọn từ cùng bộ exploratory query; lặp đúng q01 ổn định nhưng không thay thế holdout.
- Supabase hiện đã có bảng và embeddings của spike; production bean cần đọc đúng dataset/source/model metadata và không tự ingest hoặc drop bảng lúc khởi động.
