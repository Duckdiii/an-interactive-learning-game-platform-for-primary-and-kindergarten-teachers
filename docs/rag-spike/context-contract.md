# Contract curriculumContext đã chọn cho spike

> **Chuyên đề Curriculum-RAG**: [[Chương trình GDPT 2018 và Curriculum RAG]]



Người dùng đã chọn phương án này để triển khai pilot. Duy chưa review; tài liệu vẫn là contract để nhóm đối chiếu trước khi merge.

## Các interface

```java
CurriculumRAGService.RetrievalResult retrieve(String topic, Subject subject, GradeLevel gradeLevel);
String GameContentStrategy.buildPrompt(String topic, GradeLevel grade, String curriculumContext);
```

Hai tham số `buildPrompt(topic, grade)` cũ vẫn giữ nguyên; overload mới thêm khối căn cứ chương trình. `GenerationAttempt` mang `curriculumContext` qua cả lần đầu và retry. DSL/schema đầu ra không đổi.

## Handoff cho tầng điều phối

1. Lấy `topic`, `subject`, `gradeLevel` từ request có sẵn.
2. Gọi retrieval trước khi dựng prompt và trước vòng retry Gemini.
3. `INSUFFICIENT_EVIDENCE`: trả `CURRICULUM_EVIDENCE_NOT_FOUND` (HTTP 422); không âm thầm gọi Gemini bằng kiến thức chung.
4. `FOUND`: giữ context có chunk ID, tài liệu, phiên bản và trang; truyền vào overload mới của strategy trước model call.
5. Dùng lại cùng context qua các lần sửa JSON; feedback lỗi không thay căn cứ chương trình.
6. Gemini vẫn phải theo schema đầu ra và đi qua các lớp validation hiện có. Trạng thái thiếu căn cứ phải được xử lý ở orchestration, không thêm field lỗi vào schema AI/DSL đang freeze.

Overload nhận context trống sẽ cho kết quả prompt cũ để giữ tương thích. Vì vậy orchestration mới phải kiểm tra trạng thái retrieval trước khi gọi; overload không phải cơ chế cưỡng chế RAG ở mọi call site.

## Điểm code đã kiểm tra

- `GameContentStrategy` dùng `buildPrompt`, không có `buildSystemPrompt`.
- `GameDslRequest`/`GenerationAttempt` đã có môn và lớp. `GameGenerationService` có vòng retry và cổng `GameContentGenerator`.
- `QuizSpikeContentService` là một đường spike riêng, giới hạn `KINDERGARTEN`; pilot RAG hiện nối luồng sinh `QUIZ / MATH / GRADE_1` qua orchestration chính. Các game type khác chưa thuộc pilot.
- Pilot đã wiring qua `GameGenerationService`, `CurriculumContextProvider` và `GeminiGameContentGenerator`; fake model test bắt system prompt/schema. Hai live smoke đã chạy: quiz cho chủ đề trong corpus được tạo, còn chủ đề ngoài corpus bị từ chối. Duy chưa review contract.

## Frozen DSL and preschool evidence contract

DSL 1.0.0 remains frozen: curriculum review/evidence is separate from the student game JSON and is persisted through the V6 review table. The teacher-only review endpoint returns age-band labels and cited outcomes outside the DSL. A future game edit must mark its review `STALE` in the same save transaction.

For `KINDERGARTEN`, there are no grade-specific subjects for curriculum retrieval: the submitted DSL subject is only a compatibility hint. The catalog publishes the one Kindergarten scope, retrieval filters by allowed `domain` and dataset provenance, and searches all three age bands without age filtering. The context labels each cited age band and requests preschool-appropriate short, image-first/audio-supported content. This does not imply that every game type has native audio/image capabilities.

The checked-in Kindergarten data is a nine-outcome pilot subset. The feature flag remains off until coverage and specialist review are complete. TT50/2020 has an official source but is not yet curated into the corpus; do not generate English preschool under an `UNVERIFIED` label until its source is chunked, cited, and validated.
