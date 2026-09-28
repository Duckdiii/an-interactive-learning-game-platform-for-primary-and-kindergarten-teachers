# JSON DSL Schema v1.0.0 — mẫu dữ liệu cho 10 loại game

Bộ JSON mẫu được xuất theo yêu cầu từ Class Diagram do người dùng cung cấp và entity tại commit `615b4a7`. Mỗi file là một game; mỗi phần tử `questions` là một câu hỏi/item. Có thể lấy `questions[0]` làm mẫu một câu hỏi, kèm `gameType` của game để xác định loại. Game có nhiều item dùng cùng cấu trúc và cùng loại.

Đây là tài liệu cấu trúc và JSON mẫu, không phải file JSON Schema dùng cho validator và chưa phải bằng chứng contract đã được nhóm phê duyệt. Không có thay đổi endpoint, DTO, parser, entity hoặc migration trong lần xuất này.

## Nguồn và khác biệt cần biết

- Ảnh Class Diagram có `QuestionGame.contentPayload: String`, nhưng không mô tả nội dung của chuỗi cho từng loại game. Repo hiện không còn field này; nội dung nằm trực tiếp trong 10 subclass tại `backend/src/main/java/com/aigameplatform/backend/entity/question/`. Mẫu giữ tên và kiểu của các field hiện có, không tạo thêm lớp bọc `contentPayload` hoặc chuỗi JSON lồng nhau.
- Diagram mô tả `Game.gameType` là strategy và có `isCheck`; entity dùng enum `GameType` và `status`. Mẫu dùng enum theo entity và quy định UPPER_SNAKE_CASE trong `CLAUDE.md`.
- Entity bổ sung `QuestionGame.point`. Mẫu có field này. Các quan hệ `Game.author` và `QuestionGame.editLogs` nằm ngoài nội dung học tập nên không xuất. Đây là phép chiếu nội dung, không phải bản serialize đầy đủ của JPA entity hay request tạo game đã được triển khai. Khi lưu DB vẫn cần gán author theo nghiệp vụ.
- Không có discriminator trên từng câu hỏi: `gameType` nằm ở game. Parser hiện tại chưa triển khai; không suy ra rằng Jackson đã hỗ trợ deserialize các mẫu này thành subclass.

## Cấu trúc chung

| Đối tượng | Field | Kiểu trong JSON | Ý nghĩa trong mẫu |
| --- | --- | --- | --- |
| Game | `id` | string | UUID minh họa; ID thật do backend sinh |
| Game | `title` | string | Tên game |
| Game | `gameType` | string enum | Chọn một trong 10 loại bên dưới |
| Game | `questionNum` | integer | Bằng số phần tử `questions`; với memory card là số thẻ |
| Game | `grade` | string enum | `KINDERGARTEN` hoặc `ELEMENTARY` |
| Game | `subject` | string enum | `MATH`, `VIETNAMESE`, `ENGLISH` |
| Game | `shareCode` | string | Mã mẫu riêng cho mỗi game; không phải mã đã phát hành |
| Game | `version` | string | Field có trong `Game`; giá trị minh họa `1.0.0`. Ý nghĩa chưa được định nghĩa trong repo, cần nhóm xác nhận; không tự đổi tên thành `schemaVersion` |
| Game | `status` | string enum | `DRAFT` hoặc `PUBLISHED`; mẫu dùng `DRAFT` |
| Game | `questions` | array of objects | Các item theo đúng loại game |
| QuestionGame | `id` | string | UUID minh họa |
| QuestionGame | `itemIndex` | integer | Vị trí item |
| QuestionGame | `timeLimit` | integer | Thời gian cho item |
| QuestionGame | `point` | integer | Điểm cho item |

Tên field và kiểu được lấy từ entity. Việc một field xuất hiện trong mẫu không khẳng định field đó bắt buộc trong API hay AI output. Quy tắc required/null/default của contract chưa được ảnh xác định.

## Field riêng và file mẫu

| Game type | File mẫu một game | Field riêng của mỗi item |
| --- | --- | --- |
| `MATCHING` | [matching.json](examples/matching.json) | `word: string`, `meaning: string`, `imageUrl: string` |
| `QUIZ` | [quiz.json](examples/quiz.json) | `text: string`, `options: string[]`, `correctIndex: integer` |
| `MEMORY_CARD` | [memory_card.json](examples/memory_card.json) | `pairId: string`, `content: string`, `imageUrl: string` |
| `DRAG_DROP` | [drag_drop.json](examples/drag_drop.json) | `item: string`, `itemImageUrl: string`, `targetZone: string` |
| `ORDERING` | [ordering.json](examples/ordering.json) | `steps: object[]`; mỗi step có `stepId: string`, `text: string`, `correctPosition: integer` |
| `WORD_SCRAMBLE` | [word_scramble.json](examples/word_scramble.json) | `scrambledLetters: string[]`, `correctWord: string` |
| `ODD_ONE_OUT` | [odd_one_out.json](examples/odd_one_out.json) | `items: string[]`, `oddOneOutId: string` |
| `VISUAL_CLOZE` | [visual_cloze.json](examples/visual_cloze.json) | `sentenceTemplate: string`, `imageUrl: string`, `correctAnswer: string` |
| `AUDIO_VISUAL_MATCH` | [audio_visual_match.json](examples/audio_visual_match.json) | `audioUrl: string`, `imageUrl: string` |
| `SPOT_THE_TARGET` | [spot_the_target.json](examples/spot_the_target.json) | `backgroundImageUrl: string`, `hitRegionX: integer`, `hitRegionY: integer`, `hitRegionRadius: integer` |

## Quy ước cụ thể của bộ mẫu

Các quy ước dưới đây giúp đọc và kiểm tra mẫu; ảnh và entity chưa đủ để xác nhận chúng là quy tắc nghiệp vụ đã freeze:

- `itemIndex`, `correctIndex`, `correctPosition` bắt đầu từ **0**. QUIZ có đáp án đúng `options[1] = "3"`; `correctIndex` phải nằm trong mảng `options`.
- `timeLimit` dùng giây; `point` là điểm khi trả lời đúng. Mẫu dùng 30 giây và 10 điểm/item.
- MATCHING: mỗi item biểu diễn một cặp từ–nghĩa. MEMORY_CARD: mỗi item là một thẻ, hai thẻ có cùng `pairId` tạo thành một cặp; mẫu có 4 thẻ/2 cặp.
- DRAG_DROP: mỗi item biểu diễn một vật và zone đúng. `targetZone` là khóa zone dạng chuỗi. Entity chưa có bố cục hoặc danh sách zone; mẫu không bổ sung field mới cho chúng.
- ORDERING: tối thiểu 2 step theo chú thích entity; mẫu có 3 step, thứ tự đúng từ 0 đến 2. Các step được xuất theo thứ tự đúng; việc xáo trộn để hiển thị thuộc renderer.
- WORD_SCRAMBLE: các chữ trong `scrambledLetters` là hoán vị của `correctWord` trong mẫu.
- ODD_ONE_OUT: `items` hiện là danh sách chuỗi, không phải object có `id`. Mẫu dùng các chuỗi duy nhất làm khóa và cho `oddOneOutId` trùng đúng một phần tử. Cách ánh xạ khóa sang nhãn/hình ảnh chưa có trong entity.
- VISUAL_CLOZE: `{{blank}}` biểu diễn một chỗ trống trong mẫu. Cú pháp placeholder này là quy ước của bộ mẫu, chưa có parser trong repo.
- AUDIO_VISUAL_MATCH: mỗi item là một cặp âm thanh–hình ảnh đúng. Mẫu có 2 cặp; entity chưa có `options`, `correctIndex` hay quy tắc tạo đáp án nhiễu. Không tự thêm các field của QUIZ vào loại này.
- SPOT_THE_TARGET: vùng trúng là hình tròn; tọa độ mẫu dùng pixel trên ảnh gốc 800×600, gốc ở góc trên trái, X sang phải, Y xuống dưới. Renderer cần quy đổi khi scale ảnh; kích thước ảnh không phải field đã có trong entity.
- URL `https://example.com/assets/...` là chỗ giữ cho media, không phải tài nguyên hoạt động. Thay bằng media thật khi tích hợp. Mẫu chứa đáp án để soạn nội dung; chưa xác định payload gửi cho người chơi.

## Kiểm chứng và phạm vi

Đã đối chiếu bộ field JSON với `Game`, `QuestionGame`, 10 subclass, `OrderStep` và các enum trong repo; kiểm tra parse JSON, đủ 10 loại, số item, ID, chỉ số và các quan hệ đáp án theo quy ước trên. Build nền backend tại commit nguồn thành công bằng JDK 21.0.10 và Maven Wrapper 3.9.16 với `mvnw.cmd clean install -DskipTests`; không chạy test DB. Đây chưa phải kiểm chứng runtime của parser/renderer.
