# Task 1 — kế hoạch spike sinh QUIZ bằng Gemini (draft)

Trạng thái: kế hoạch và hợp đồng DTO **đề xuất**, chưa phải JSON DSL Schema v1.0.0 đã freeze. Người dùng xác nhận căn cứ là Class Diagram và [mẫu QUIZ đang có trong repo](json-dsl/v1.0.0/examples/quiz.json); JSON trong repo là ví dụ do AI tạo từ entity và Class Diagram, chưa có dấu hiệu được nhóm freeze.

## Đối chiếu hiện trạng

| Field | Nguồn trong repo | Kết luận cho Task 1 |
| --- | --- | --- |
| `text` | `QuizQuestion.text: String` | Nội dung câu hỏi do AI sinh. |
| `options` | `QuizQuestion.options: List<String>` | AI sinh mảng chuỗi có thứ tự. Không dùng `QuizOptionDto` hoặc `isCorrect`. |
| `correctIndex` | `QuizQuestion.correctIndex: int` | AI trả chỉ số từ 0. Spike yêu cầu 0–3 do mỗi câu có 4 lựa chọn. |
| `id` | `QuestionGame.id: String`, `@GeneratedValue(UUID)` | Backend/JPA sinh khi lưu; không nằm trong DTO AI. |
| `itemIndex` | `QuestionGame.itemIndex: int` | Backend gán từ thứ tự câu trong kết quả đã chấp nhận, bắt đầu 0; cần Duy xác nhận quy ước chỉ số. |
| `timeLimit` | `QuestionGame.timeLimit: int` | Backend lấy từ cấu hình/yêu cầu giáo viên, rồi gán cho entity; cần chốt đơn vị và mặc định. |
| `point` | `QuestionGame.point: int` | Backend lấy từ cấu hình/yêu cầu giáo viên, rồi gán cho entity; cần chốt mặc định. |
| `version` | `Game.version: String`; file JSON mẫu trong repo có `"version": "1.0.0"` | Chưa có code/contract xác định đây là phiên bản nội dung game hay schema. Không đổi thành `schemaVersion`; không đưa vào DTO AI cho đến khi Duy xác nhận. |

Trước Task 1, `backend/src/main/java/com/aigameplatform/backend/dto/{request,response}/` chỉ có `.gitkeep`; không có DTO cũ để đối chiếu. Task 1 thêm DTO draft riêng cho spike. `QuizGameStrategy` vẫn ném `UnsupportedOperationException` ở hai phương thức liên quan đến prompt và parse vì schema chính thức chưa có. Entity và Flyway giữ nguyên.

## Ranh giới dữ liệu đề xuất

- **DTO AI sinh (draft):** một object `questions` chứa các object `{ "text": string, "options": string[], "correctIndex": integer }`. Chỉ ba field nội dung này đi vào structured output/prompt và parser. Đây là hình dạng đề xuất cho spike, chưa được nhóm phê duyệt.
- **Backend gán:** `QuestionGame.id` do JPA sinh; `itemIndex` từ thứ tự trong mảng; `timeLimit` và `point` từ cấu hình/yêu cầu giáo viên. Backend cũng kiểm tra/loại bỏ kết quả không đạt trước khi tạo `QuizQuestion`.
- **Game đầy đủ:** `Game.id`, `title`, `gameType=QUIZ`, `questionNum`, `grade`, `subject`, `shareCode`, `version`, `status`, `questions`, `author` thuộc luồng tạo/lưu game. AI không sinh ID quản lý, `shareCode`, `status` hoặc `version`. `questionNum` do backend tính từ số câu đã chấp nhận; `title`, `grade`, `subject` đến từ giáo viên/request hoặc quy tắc nghiệp vụ cần xác nhận.
- Không sử dụng các field `questionText`, `QuizOptionDto`, `isCorrect` từ bản Task 1 cũ. Không sửa entity/migration để theo các field đó.

Ví dụ **draft cho một câu do AI sinh**:

```json
{
  "text": "Có 2 con mèo và thêm 1 con mèo. Có tất cả bao nhiêu con mèo?",
  "options": ["2", "3", "4", "5"],
  "correctIndex": 1
}
```

## Trình tự thực hiện spike

1. Duy xác nhận các giả định ở cuối tài liệu, nhất là ý nghĩa `version` và hình dạng bao `questions`. Nếu mẫu nhóm được freeze sau này có khác, cập nhật DTO draft theo contract đã chốt.
2. **Đã làm:** cấu hình `GEMINI_API_KEY` và `GEMINI_MODEL` trong `application.yml`/`.env.example`, không lưu key. Thêm `langchain4j-google-ai-gemini` sau khi người dùng duyệt. Runner độc lập đọc trực tiếp hai biến môi trường, không khởi động Spring.
3. **Đã làm cho spike:** `QuizGeminiSpikeRunner` gọi model qua `ChatModel`, nhận chủ đề/lớp và yêu cầu **4 câu, mỗi câu đúng 4 lựa chọn**; không tạo/lưu `Game`, không gọi DB. `QuizSpikeContentService` nhận `ChatModel` qua constructor nên có thể thay bằng mock khi test.
4. **Đã làm cho spike:** parse JSON thành `QuizAiContentDraft`/`QuizAiQuestionDraft`, kiểm tra đúng 4 câu; mỗi `text` không rỗng, `options` là 4 chuỗi không rỗng, `correctIndex` là số nguyên trong **0–3**. Báo rõ câu lỗi và không tiếp tục chuyển thành entity khi sai. Đây là tiêu chí spike, không áp dụng thành ràng buộc chung cho mọi QUIZ.
5. Khi ghép vào nghiệp vụ sau spike, backend gán bốn field chung theo nguồn nêu trên; `GameValidationService` chịu trách nhiệm business validation theo kiến trúc đã chốt. Việc thiết kế JSON Schema chính thức và các layer moderation theo contract phải được chốt riêng trước khi đưa vào production.
6. **Đã làm:** test parser/validation bằng JSON fixture, không gọi Gemini thật. Chưa chạy Gemini live vì không có key; runner sẽ gọi API khi người dùng chủ động chạy. Đã build bằng JDK 21 và Maven Wrapper; test spike chạy riêng, không cần DB.

## Chạy runner độc lập

Đặt `GEMINI_API_KEY` và `GEMINI_MODEL` vào môi trường của terminal (không nhập giá trị thật vào lệnh lưu trong repo), rồi từ `backend/` chạy:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
.\mvnw.cmd -q exec:java '-Dexec.mainClass=com.aigameplatform.backend.service.strategy.QuizGeminiSpikeRunner' '-Dexec.args=Con vật KINDERGARTEN'
```

Runner nhận hai tham số: topic và `KINDERGARTEN`/`ELEMENTARY`. Với topic nhiều từ, Maven Exec nhận phần trước grade là topic theo chuỗi ví dụ trên; cần kiểm tra cách quote nếu dùng CLI khác. Lệnh gọi Gemini thật, có thể tốn quota; chưa được chạy trong lần này.

## Cần Duy xác nhận

- JSON gốc của nhóm: game đầy đủ hay chỉ nội dung câu hỏi, tên field bọc danh sách nếu có, field nào bắt buộc/nullable, và `version` có nghĩa gì.
- AI output có đúng ba field mỗi câu và `questions` là mảng ở top level hay không; có cần metadata khác do AI sinh không.
- `itemIndex` bắt đầu từ 0 hay 1; đơn vị/mặc định của `timeLimit` và mặc định của `point`.
- Phạm vi runner: CLI trong backend không phụ thuộc Spring/DB hay kiểu runner khác; model Gemini và cách cung cấp topic/grade.

Không có endpoint hoặc schema DB mới trong Task 1 spike này.
