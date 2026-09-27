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
6. **Đã làm:** test parser/validation bằng JSON fixture và mock `ChatModel`, không gọi Gemini thật trong test. Người dùng đã chạy một initial thật với prompt cũ; kết quả được ghi ở phần bên dưới. Key/model chưa có trong môi trường agent. Đã build bằng JDK 21 và Maven Wrapper; test spike chạy riêng, không cần DB.

## Review structured output và phép đo (2026-09-27)

- Trước review, runner chỉ dùng `ResponseFormat.JSON` (JSON mode). Hiện runner truyền `ResponseFormat` có `JsonSchema` với `JsonRawSchema`: object gốc bắt buộc có `questions`, mỗi item bắt buộc có `text`, `options`, `correctIndex`; giới hạn 4 item/4 option và index 0–3. Đây là **schema draft cho spike**, chưa phải contract đã freeze.
- Parser kiểm tra lại JSON sau khi model trả về: object/array đúng kiểu, đủ field, không có field lạ, chuỗi không rỗng, index nguyên 0–3. Không dựa riêng vào lời nhắc hoặc bảo đảm từ phía model. Test offline gồm trường hợp thiếu field, sai kiểu, số câu/option sai và index ngoài khoảng.
- Runner đặt `maxRetries(0)` cho model; service không retry. Test với `ChatModel` mock xác nhận lỗi lần gọi đầu được ném ra và chỉ có một lần gọi. Runner ghi lỗi ban đầu và dừng; các lỗi authentication/permission/quota trong đợt đo cũng dừng ngay. Không có cơ chế tự gọi lại che lỗi đầu tiên.
- Runner có hai mode độc lập: `--initial` gọi 1 lần; chỉ sau khi xem nội dung và đáp án mới chạy `--measure` để gọi 10 lần tuần tự với cùng topic/grade/model. Mỗi mode lưu riêng JSON Lines trong `backend/target/quiz-spike/` (thư mục build được ignore): đầu ra thô khi nhận được, câu đã parse khi thành công, độ trễ từng lượt (gọi model + parse), loại lỗi và cấu hình model/topic/grade. Không lưu key hoặc exception message. `SUCCESS` chỉ xác nhận cấu trúc; độ đúng nghĩa của đáp án cần người review thủ công trước đợt đo.
- Tại thời điểm review, `GEMINI_API_KEY` và `GEMINI_MODEL` đều thiếu trong môi trường agent. Đã kiểm tra lệnh Maven Exec với hai biến bị xóa trong tiến trình: runner dừng ở thông báo thiếu biến trước lời gọi API, exit code 1. Người dùng sau đó chạy một initial thật trong terminal riêng; kết quả được lưu bên dưới.

## Chạy runner độc lập

Tại PowerShell, đặt key cho **tiến trình hiện tại** bằng nhập ẩn (không dán key vào chat, không đưa vào command history), và chọn model. Ví dụ model `gemini-2.5-flash`; thay nếu key không có quyền dùng model này:

```powershell
$secret = Read-Host 'Gemini API key' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try { $env:GEMINI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$env:GEMINI_MODEL = 'gemini-2.5-flash'
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
Set-Location backend
chcp.com 65001 > $null
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
.\mvnw.cmd -q exec:java '-Dexec.mainClass=com.aigameplatform.backend.service.strategy.QuizGeminiSpikeRunner' '-Dexec.args=--check-utf8'
.\mvnw.cmd -q exec:java '-Dexec.mainClass=com.aigameplatform.backend.service.strategy.QuizGeminiSpikeRunner' '-Dexec.args=--initial dem so con vat trong pham vi 5 cho tre 5-6 tuoi KINDERGARTEN'
```

Sau khi kiểm tra 4 câu, 4 lựa chọn, index và nội dung đáp án trong file `target/quiz-spike/initial-*.jsonl`, giữ nguyên model/topic/grade rồi chạy:

```powershell
.\mvnw.cmd -q exec:java '-Dexec.mainClass=com.aigameplatform.backend.service.strategy.QuizGeminiSpikeRunner' '-Dexec.args=--measure dem so con vat trong pham vi 5 cho tre 5-6 tuoi KINDERGARTEN'
```

Lệnh này gọi 10 lượt tuần tự và ghi file `target/quiz-spike/measurement-*.jsonl`. Tham số cuối là `KINDERGARTEN` hoặc `ELEMENTARY`; mọi từ giữa mode và grade được ghép thành topic. Cả hai lệnh gọi Gemini thật, có thể tốn quota. Runner chạy độc lập, không cần DB. Cần chạy từ `backend/`; nếu đã ở đó thì bỏ `Set-Location backend`.

## Initial đầu tiên và prompt mới

- [Initial 2026-09-27 06:13:52 UTC](task-1-results/initial-20260927-061352.jsonl) dùng `gemini-2.5-flash`, topic `Con vat`, latency **4695 ms**. Đủ 4 câu × 4 lựa chọn và chỉ số đáp án hợp lệ, nhưng câu hỏi về nhận biết động vật nên chưa đạt mục tiêu đếm số con vật.
- File cũ hợp lệ UTF-8: `rawOutput` và `questions` đã parse cùng chứa dấu tiếng Việt; byte file không có ký tự thay thế `�`. SHA-256 gốc là `19ECDA4B73EDD3F53BA81250790EE79E8D97A0C35599D48AD05EF3FC1387997D`. Trong lúc kiểm chứng, Maven `clean` đã xóa file dưới `target`; file được khôi phục đúng hash từ bản ghi nội dung đã đọc và sao chép sang `docs/task-1-results/` để lưu bền vững. `clean` cũng xóa file `initial-20260927-061125.jsonl` có sẵn trong `target`; nội dung file đó chưa được đọc trước khi xóa nên không thể khôi phục từ bản ghi. Console dùng code page 437 ở phiên kiểm tra, nên nguyên nhân dấu hỏi nằm ở đường hiển thị, không phải phản hồi Gemini hay dữ liệu ghi file.
- `promptVersion = quiz-count-animals-v2`: câu ngắn tiếng Việt cho trẻ 5–6 tuổi; tình huống đếm con vật trong phạm vi 5 bằng chữ, không cần hình ảnh; bốn lựa chọn là bốn số khác nhau từ 1 đến 5. Parser spike kiểm tra thêm phạm vi và tính khác nhau của đáp án. Đây là tiêu chí thử nghiệm, chưa phải ràng buộc QUIZ chung. Model giữ nguyên.
- Runner in UTF-8 và terminal dùng code page 65001. Chế độ `--check-utf8` không gọi API đã in đúng tiếng Việt: `Có 2 con mèo. Có tất cả bao nhiêu con mèo?`.
- Key/model không có trong môi trường agent; người dùng đã chạy initial v2 và v3 từ terminal của họ. Chỉ chạy đợt đo 10 lượt sau khi initial đạt cấu trúc lẫn nội dung và đáp án đã được kiểm tra thủ công.

## Review initial v2 và prompt v3

- [Initial 2026-09-27 06:21:37 UTC](task-1-results/initial-20260927-062137.jsonl) có `promptVersion = quiz-count-animals-v2`, model `gemini-2.5-flash`, topic `dem so con vat trong pham vi 5 cho tre 5-6 tuoi`, latency **5847 ms**. File hợp lệ UTF-8, `rawOutput` khớp phần câu hỏi đã parse. SHA-256: `C4F7CEE24A57509327E7FED20E29B38377CA91824E7CC61EC351BEFE33C3777A`.
- Có đủ 4 câu × 4 lựa chọn là số 1–5, index 0–3. Kiểm tra phép tính và đáp án: câu 1 `2+2=4` → index 1; câu 2 `3−1=2` → index 2; câu 3 `1+4=5` → index 1; câu 4 `5−2=3` → index 2. **Bốn đáp án đúng**, nhưng câu 3 đặt “trên bờ” cạnh “đang bơi”, dễ gây hiểu nhầm. Câu 2 và 4 là bài “còn lại”, lệch khỏi mục tiêu chỉ đếm số con vật đang có. Initial v2 chưa đạt tiêu chí nội dung để chạy 10 lượt đo.
- Prompt `quiz-count-animals-v3` giữ model và định dạng JSON, yêu cầu một cảnh hiện tại với các con vật ở cùng nơi, chỉ hỏi tổng số, tối đa hai câu ngắn; cấm tình huống đi/đến/ngủ và cấm câu hỏi “còn lại”. Đáp án vẫn là bốn số khác nhau từ 1–5. Đây là chỉnh prompt thử nghiệm, schema/DTO vẫn draft.
- Initial v3 được review ở mục kế tiếp. Build runner không dùng `clean` để giữ các kết quả dưới `target`.

## Review initial v3

- [Initial 2026-09-27 06:24:42 UTC](task-1-results/initial-20260927-062442.jsonl), `promptVersion = quiz-count-animals-v3`, model `gemini-2.5-flash`, latency **7767 ms**, category `SUCCESS`, UTF-8 hợp lệ. SHA-256: `CD867FB6AC50189685A0A00EC7AF1648C2FA924C72E0C8324E141D87AE576CD1`. File dưới `target` và bản sao trong `docs/task-1-results/` khớp hash.
- Câu 1: 3 mèo → 3 (`correctIndex=1`); câu 2: 1 chim → 1 (`index=1`); câu 3: 2 vịt trắng + 2 vịt vàng → 4 (`index=2`); câu 4: 1 gà trống + 3 gà mái → 4 (`index=1`). Cả bốn câu hỏi ngắn, hỏi tổng số con vật đang có, không phụ thuộc hình ảnh. **Initial v3 đạt tiêu chí nội dung và đáp án đã kiểm tra.**
- Initial v3 đạt nên người dùng đã chạy đợt đo; kết quả và phân tích ở mục “Đợt đo 10 lượt — measurement v3”. Schema/DTO vẫn draft; chưa commit.

## Đợt đo 10 lượt — measurement v3

- **Mục tiêu và cấu hình:** đo spike tạo câu hỏi tiếng Việt ngắn để trẻ 5–6 tuổi đếm số con vật trong phạm vi 5, không phụ thuộc hình ảnh. Artifact có 10 bản ghi tuần tự với cùng model `gemini-2.5-flash`, prompt `quiz-count-animals-v3`, topic `dem so con vat trong pham vi 5 cho tre 5-6 tuoi`, grade `KINDERGARTEN`; tất cả dùng cùng runner/schema draft và `maxRetries(0)`. Nhiệt độ không được đặt tường minh, nên dùng mặc định của module Gemini trong cả đợt. JSONL lưu model/topic/grade/promptVersion nhưng không ghi schema hash hay cấu hình nhiệt độ; tính nhất quán schema/retry được đối chiếu từ một cấu hình runner dùng chung, không suy ra từ từng dòng output.
- **Dữ liệu và tính toán:** [Measurement 2026-09-27 06:28 UTC](task-1-results/measurement-20260927-062806.jsonl) có đúng 10 dòng (SHA-256 `DA61AB32C18CA85CDDFAF001129592384CA8D6E81C389BFC45F412AF0FB9BA44`); hash khớp bản được sao lưu từ `backend/target`. Có **9 `SUCCESS` và 1 `HTTP_503` (`InternalServerException`) ở lượt 9**, mất 30.579 ms. Lượt lỗi được giữ trong mẫu số; không chạy lại để thay thế. Tỷ lệ gọi và parse thành công là **9/10 (90%)**. Đây là tỷ lệ kỹ thuật của spike, **không phải First-Generation Acceptance Rate của giáo viên**.
- Độ trễ tính riêng từ 9 lượt thành công, sắp xếp theo `latencyMs`: min **5098 ms**, median **5955 ms**, mean **6085.6 ms**, max **8020 ms**. Lượt lỗi mất **30579 ms**; tính cả lỗi thì median là **6044 ms**, mean **8534.9 ms**. Các độ trễ đo thời gian gọi model và parse trong runner. Không đưa lượt lỗi vào thống kê success-only.
- **Kiểm tra cấu trúc và nội dung:** chín phản hồi `SUCCESS` có 36 câu; cả 36 có 4 lựa chọn số phân biệt từ 1–5 và `correctIndex` hợp lệ. Đánh giá thủ công theo tiêu chí prompt phát hiện **4/36 câu lệch tiêu chí**: lượt 3 câu 3 có vịt đang ngủ dù prompt cấm cảnh ngủ; lượt 8 câu 4 đếm chim trên cây cùng cá dưới ao ở hai nơi; lượt 10 câu 2 hỏi số vịt nhưng không nêu số lượng; lượt 10 câu 4 có chó đang ngủ. 32 câu còn lại có dữ kiện đủ và đáp án đúng theo kiểm tra thủ công. Không tính tỷ lệ game đạt toàn bộ; phép đo chất lượng ở đây là tỷ lệ câu được đánh dấu lệch tiêu chí trên 36 câu.
- Không có lỗi xác thực, quyền hoặc quota trong 10 bản ghi. `HTTP_503` là lỗi dịch vụ tại lượt đo; output chỉ có HTTP status và class, không có log chi tiết để xác định nguyên nhân sâu hơn. Không quy lỗi này cho model, và dữ liệu một model không chứng minh đổi model sẽ xử lý được.
- **Giới hạn và kết luận:** mẫu chỉ có 10 lượt, một model, một chủ đề, một khối lớp và một phiên bản prompt; JSON hợp lệ không bảo đảm nội dung hợp lý hoặc phù hợp sư phạm. Spike chứng minh pipeline structured output có thể trả JSON theo cấu trúc draft và parser có thể kiểm tra các ràng buộc spike; **chưa chứng minh nội dung luôn đạt yêu cầu sư phạm hoặc API luôn sẵn sàng**. Cải thiện semantic validation, retry production, RAG và kiểm duyệt nội dung đầy đủ là việc sau Task 1, không nằm trong bằng chứng của đợt này. Schema/DTO vẫn draft; kết quả không được xem là contract đã Duy phê duyệt.

## Bàn giao / Definition of Done

- Đã có runner CLI độc lập, cấu hình Gemini qua biến môi trường, structured output JSON Schema draft, parser/validation cho tiêu chí spike, test offline và artifact initial/measurement được lưu trong `docs/task-1-results/`.
- Chờ Duy xác nhận contract QUIZ chính thức: cấu trúc bao `questions`, field AI sinh `{text, options: List<String>, correctIndex}` và các field bắt buộc/nullability; ý nghĩa `version`; quy tắc `itemIndex`; nguồn/đơn vị/mặc định `timeLimit` và `point`; nguồn của title/grade/subject và phạm vi runner. Hiện giả định backend gán ID quản lý, `itemIndex`, `timeLimit`, `point`, `shareCode`, `status`, `version` và các metadata của game; AI chỉ sinh nội dung câu hỏi.
- Chưa triển khai persistence/entity/migration hay tích hợp production; chưa tính tỷ lệ chấp nhận của giáo viên. Reviewer đề xuất: Duy cho schema và backend. Chưa có phê duyệt schema mới.
- **Kiểm tra cuối:** với JDK 21.0.10 và Maven 3.9.16 trong distribution Maven Wrapper, `install -DskipTests` PASS; 8/8 `QuizSpikeContentServiceTests` PASS, không gọi Gemini. Chạy toàn bộ test cho kết quả 8 PASS và một lỗi ngoài spike: `AigameBackendApplicationTests.contextLoads` không khởi tạo được Spring context vì datasource `url` không bắt đầu bằng `jdbc` (thiếu cấu hình URL JDBC hợp lệ trong môi trường test). Không sửa cấu hình DB trong Task 1. `git diff --check` PASS. Không chạy `clean`; mọi JSONL minh chứng đã lưu ngoài `target/`.

## Cần Duy xác nhận

- JSON gốc của nhóm: game đầy đủ hay chỉ nội dung câu hỏi, tên field bọc danh sách nếu có, field nào bắt buộc/nullable, và `version` có nghĩa gì.
- AI output có đúng ba field mỗi câu và `questions` là mảng ở top level hay không; có cần metadata khác do AI sinh không.
- `itemIndex` bắt đầu từ 0 hay 1; đơn vị/mặc định của `timeLimit` và mặc định của `point`.
- Phạm vi runner: CLI trong backend không phụ thuộc Spring/DB hay kiểu runner khác; model Gemini và cách cung cấp topic/grade.

Không có endpoint hoặc schema DB mới trong Task 1 spike này.
