# Game JSON DSL v1.0.0

Trạng thái: **đặc tả đã duyệt, chờ đóng băng** (2026-09-26).

Tài liệu này là hợp đồng dữ liệu giữa AI (sinh nội dung), Backend (kiểm duyệt, lưu trữ) và Frontend (Konva.js vẽ và chạy game). Mọi thay đổi trường phải cập nhật tài liệu này và đồng bộ cả Backend lẫn Frontend.

## 1. Nguyên tắc thiết kế

- AI chỉ lo **nội dung và quan hệ sư phạm**. AI không sinh tọa độ pixel, kích thước, màu, URL hay id.
- Frontend tự tính bố cục theo kích thước màn hình và số phần tử trong JSON.
- Backend là chốt chặn: JSON của AI phải qua 3 lớp kiểm duyệt trước khi lưu. JSON lỗi không bao giờ tới Frontend.
- Mỗi `question` là **một màn chơi trọn vẹn** cho cả 10 loại game. Các loại nhiều phần tử (MATCHING, MEMORY_CARD, DRAG_DROP) chứa danh sách cặp/vật/vùng bên trong một màn.

## 2. Hai dạng dữ liệu

| Dạng | Ai tạo | Khác biệt |
|---|---|---|
| **Đầu ra của AI** | LLM (Structured Outputs) | Đơn giản: không có `id`, `points`, `timeLimitSeconds`, `hitboxScale`, `scrambledLetters`, `imageUrl`, `audioUrl` |
| **DSL hoàn chỉnh** | Backend bổ sung sau khi AI trả về | Có `id`, điểm và thời gian mặc định theo khối lớp, đáp án đã xáo trộn, media đã gắn URL. Đây là dạng lưu trữ và dạng Frontend nhận |

Giáo viên chỉnh sửa (`PUT`) gửi lại dạng hoàn chỉnh, và Backend chạy lại đủ 3 lớp kiểm duyệt.

## 3. Vỏ chung (Envelope)

```json
{
  "schemaVersion": "1.0.0",
  "gameType": "QUIZ",
  "metadata": {
    "title": "Đếm con vật",
    "subject": "MATH",
    "gradeLevel": "GRADE_1",
    "topic": "Đếm số lượng"
  },
  "gameplaySettings": { "hitboxScale": 1.5 },
  "questions": []
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `schemaVersion` | string | Luôn `"1.0.0"`. Lưu ở cột `games.schema_version` |
| `gameType` | enum | `QUIZ`, `AUDIO_VISUAL_MATCH`, `ODD_ONE_OUT`, `SPOT_THE_TARGET`, `WORD_SCRAMBLE`, `MATCHING`, `MEMORY_CARD`, `DRAG_DROP`, `ORDERING`, `VISUAL_CLOZE` |
| `metadata.title`, `topic` | string | |
| `metadata.subject` | enum | `MATH`, `VIETNAMESE`, `ENGLISH` |
| `metadata.gradeLevel` | enum | `KINDERGARTEN`, `GRADE_1`, `GRADE_2`, `GRADE_3`, `GRADE_4`, `GRADE_5` |
| `gameplaySettings.hitboxScale` | number | **Backend tự gán** theo khối lớp (ví dụ 1.5 cho `KINDERGARTEN` và `GRADE_1`, 1.0 cho các lớp lớn). AI không sinh |
| `questions[]` | array | Mỗi phần tử là một màn chơi |

### Trường chung của mỗi màn (`questions[]`)

| Trường | Ghi chú |
|---|---|
| `id` | Backend gán, dạng `q1`, `q2`... |
| `timeLimitSeconds`, `points` | Backend đặt mặc định theo khối lớp, giáo viên có thể sửa |
| `audioText` | (tùy chọn) câu đọc bằng TTS |

## 4. Quy ước chung

- **Media**: AI chỉ sinh `visualPrompt` (từ khóa tiếng Anh để Backend gọi Pexels lấy ảnh) và `audioText` (để TTS đọc). Sau khi Backend xử lý, dạng hoàn chỉnh có thêm `imageUrl`, `audioUrl` cạnh các trường đó.
- **Id của đáp án/phần tử**: cấp theo vị trí `a`, `b`, `c`, `d`, `e` (tối đa 5). Với cặp, vùng, bước: `p1`, `z1`, `s1`...
- **Trường đáp án, ký hiệu [ĐA]**: là trường lộ đáp án đúng. Bản dành cho học sinh (làm sau) sẽ **bỏ** các trường này.
- **Xáo trộn**: Backend xáo thứ tự lựa chọn ngay khi tạo (AI thường đặt đáp án đúng ở đầu). Không tin thứ tự do AI trả về.
- **Nội dung văn bản** (`text`, `label`, `audioText`...) có giới hạn độ dài theo khối lớp; con số cụ thể ghi trong JSON Schema.

## 5. Đặc tả 10 loại game

Các ví dụ chỉ trình bày một phần tử của `questions[]`, ở dạng hoàn chỉnh (dành cho giáo viên).

### 5.1 QUIZ

| Trường | Ghi chú |
|---|---|
| `questionText` | Câu hỏi |
| `visualPrompt` | (tùy chọn) ảnh minh họa |
| `options[{id, text}]` | 2–4 đáp án (chỉ có chữ ở v1.0.0) |
| `correctOptionId` **[ĐA]** | `id` của đáp án đúng |

Layer 2: đúng 1 đáp án đúng; `correctOptionId` thuộc `options`; `text` không trùng nhau.
Trả lời: `selectedOptionId`.

```json
{ "id": "q1", "timeLimitSeconds": 30, "points": 10,
  "audioText": "Có mấy con mèo?", "questionText": "Có mấy con mèo?", "visualPrompt": "three cats",
  "options": [ { "id": "a", "text": "2" }, { "id": "b", "text": "3" }, { "id": "c", "text": "4" } ],
  "correctOptionId": "b" }
```

### 5.2 AUDIO_VISUAL_MATCH (nghe âm thanh, chọn hình đúng)

| Trường | Ghi chú |
|---|---|
| `audioText` | Từ/câu cần đọc |
| `correct{visualPrompt}` **[ĐA]** | Hình đúng |
| `distractors[{visualPrompt}]` | 1–3 hình sai |

Layer 2: 1–3 hình nhiễu; các hình không trùng nhau.
Trả lời: `selectedOptionId` (id lựa chọn do Backend cấp khi phục vụ bản học sinh).

```json
{ "id": "q1", "audioText": "Quả táo",
  "correct": { "visualPrompt": "apple" },
  "distractors": [ { "visualPrompt": "banana" }, { "visualPrompt": "orange" } ] }
```

### 5.3 ODD_ONE_OUT

| Trường | Ghi chú |
|---|---|
| `items[{id, text}]` | 3–5 phần tử (chỉ có chữ ở v1.0.0) |
| `oddOneOutId` **[ĐA]** | `id` của phần tử khác loại |

Layer 2: `oddOneOutId` thuộc `items`; các phần tử không trùng nhau.
Trả lời: `selectedItemId`.

```json
{ "id": "q1", "audioText": "Con nào khác loại?",
  "items": [ { "id": "a", "text": "mèo" }, { "id": "b", "text": "chó" }, { "id": "c", "text": "thỏ" }, { "id": "d", "text": "xe hơi" } ],
  "oddOneOutId": "d" }
```

### 5.4 SPOT_THE_TARGET

| Trường | Ghi chú |
|---|---|
| `visualPrompt` | Ảnh nền |
| `targetDescription` | Mô tả vật cần tìm (AI sinh) |
| `hitRegion{x, y, radius}` **[ĐA]** | Vùng đúng, **tỉ lệ 0–1**, có thể `null` khi còn là bản nháp. Giáo viên chạm lên ảnh trong Workspace để chọn |

Layer 2: nếu có, `x`, `y` trong [0,1] và `radius` trong (0,1]. **Chưa có `hitRegion` thì không cho xuất bản.**
Trả lời: `x`, `y` (0–1). Backend so khoảng cách với `radius`.

```json
{ "id": "q1", "audioText": "Tìm con mèo", "visualPrompt": "a garden with a cat",
  "targetDescription": "con mèo", "hitRegion": { "x": 0.62, "y": 0.41, "radius": 0.08 } }
```

### 5.5 WORD_SCRAMBLE

| Trường | Ghi chú |
|---|---|
| `correctWord` **[ĐA]** | Từ đúng |
| `audioText` / `visualPrompt` | (tùy chọn) gợi ý |
| `scrambledLetters` | **Backend tự xáo**, AI không sinh |

Layer 2: 2–10 chữ cái, không khoảng trắng; chuỗi xáo khác chuỗi gốc. Mỗi phần tử là một chữ cái (giữ nguyên dấu tiếng Việt).
Trả lời: `word`.

```json
{ "id": "q1", "audioText": "Sắp xếp thành con vật", "visualPrompt": "cow",
  "correctWord": "BÒ", "scrambledLetters": ["Ò", "B"] }
```

### 5.6 MATCHING

| Trường | Ghi chú |
|---|---|
| `pairs[{pairId, left, right}]` **[ĐA: quan hệ cặp]** | 3–6 cặp. `left`, `right` đều có dạng `{text?, visualPrompt?}` |

Layer 2: `pairId` không trùng; nội dung mỗi phía không trùng; quan hệ 1-1.
Trả lời: `matches[{leftPairId, rightPairId}]`, đúng khi hai id bằng nhau.

```json
{ "id": "q1", "audioText": "Nối từ với nghĩa",
  "pairs": [
    { "pairId": "p1", "left": { "text": "apple", "visualPrompt": "apple" }, "right": { "text": "táo" } },
    { "pairId": "p2", "left": { "text": "dog" }, "right": { "text": "chó" } },
    { "pairId": "p3", "left": { "text": "cat" }, "right": { "text": "mèo" } } ] }
```

### 5.7 MEMORY_CARD

| Trường | Ghi chú |
|---|---|
| `pairs[{pairId, content{text?, visualPrompt?}}]` | 2–8 cặp. Renderer nhân đôi mỗi cặp thành 2 thẻ, nên tổng số thẻ luôn chẵn |

Layer 2: `pairId` không trùng; nội dung không trùng.
Trả lời: `matchedPairIds[]`, `flips`.

```json
{ "id": "q1", "audioText": "Tìm các thẻ giống nhau",
  "pairs": [ { "pairId": "p1", "content": { "visualPrompt": "apple" } },
             { "pairId": "p2", "content": { "visualPrompt": "banana" } } ] }
```

### 5.8 DRAG_DROP

| Trường | Ghi chú |
|---|---|
| `dropZones[{id, label}]` | 2–4 vùng thả |
| `items[{id, text?, visualPrompt?, targetZoneId}]` **[ĐA: `targetZoneId`]** | 3–8 vật |

Layer 2: mọi `targetZoneId` tồn tại trong `dropZones`; mỗi vùng có ít nhất 1 vật; `id` không trùng.
Trả lời: `placements[{itemId, zoneId}]`.

```json
{ "id": "q1", "audioText": "Xếp vào đúng rổ",
  "dropZones": [ { "id": "z1", "label": "Trái cây" }, { "id": "z2", "label": "Đồ chơi" } ],
  "items": [ { "id": "i1", "text": "táo", "visualPrompt": "apple", "targetZoneId": "z1" },
             { "id": "i2", "text": "gấu bông", "visualPrompt": "teddy bear", "targetZoneId": "z2" },
             { "id": "i3", "text": "chuối", "visualPrompt": "banana", "targetZoneId": "z1" } ] }
```

### 5.9 ORDERING

| Trường | Ghi chú |
|---|---|
| `steps[{id, text?, visualPrompt?, correctPosition}]` **[ĐA: `correctPosition`]** | 2–6 bước |

Layer 2: `correctPosition` là các số 1..n không trùng và đủ dãy. Backend xáo thứ tự hiển thị.
Trả lời: `order[]` (các `id` theo thứ tự trẻ sắp xếp).

```json
{ "id": "q1", "audioText": "Sắp xếp các bước trồng cây",
  "steps": [ { "id": "s1", "text": "Gieo hạt", "correctPosition": 1 },
             { "id": "s2", "text": "Tưới nước", "correctPosition": 2 },
             { "id": "s3", "text": "Cây lớn lên", "correctPosition": 3 } ] }
```

### 5.10 VISUAL_CLOZE

| Trường | Ghi chú |
|---|---|
| `sentenceTemplate` | Câu có đúng 1 chỗ trống ký hiệu `___` |
| `visualPrompt` | Ảnh minh họa |
| `correctAnswer` **[ĐA]** | Từ đúng |
| `distractors[text]` | 1–3 từ sai |

Layer 2: đúng 1 chỗ trống; đáp án đúng không trùng từ nhiễu.
Trả lời: `answer` (so sánh sau khi chuẩn hóa chữ hoa/thường và khoảng trắng).

```json
{ "id": "q1", "audioText": "Con gì kêu meo meo?", "sentenceTemplate": "Con ___ kêu meo meo.",
  "visualPrompt": "a cat", "correctAnswer": "mèo", "distractors": ["chó", "gà"] }
```

## 6. Chấm điểm

- Mỗi màn chỉ có một kết quả: **`CORRECT` khi đúng toàn bộ**, ngược lại `INCORRECT`. Ghi `attemptsCount` (số lần thử).
- Phản hồi cho Frontend: `{ "isCorrect": true, "correctAnswer": ... }`, `correctAnswer` có cấu trúc riêng theo từng loại game.
- Chấm điểm từng phần **để dành cho phiên bản sau**.

## 7. Bộ kiểm duyệt và xử lý lỗi

| Lớp | Việc kiểm tra | Công cụ |
|---|---|---|
| 1. Cú pháp | JSON khớp JSON Schema của từng `gameType`, đủ trường, đúng kiểu, đúng enum | Jackson + `json-schema-validator` |
| 2. Logic | Luật cứng theo bảng ở mục 5 | Chuỗi validator (`AbstractGameValidator`) |
| 3. An toàn | Từ cấm học đường + OpenAI Moderation cho mọi trường văn bản | Danh sách từ cấm trong bộ nhớ + API (mock khi test) |

- Nếu Lớp 1 hoặc 2 lỗi: tự gọi lại LLM tối đa **2 lần**, đính kèm thông báo lỗi cụ thể (có vị trí) để AI sửa.
- Vẫn lỗi: trả `504 AI_GENERATION_TIMEOUT` theo REST API Contract. Không nạp game mẫu.
- Lớp 3 phát hiện nội dung không an toàn: `422 UNSAFE_CONTENT`.
- Mỗi Strategy (`QuizGameStrategy`...) cung cấp schema riêng cho loại game của nó và hàm `parseToQuestions`. Strategy **không** chứa logic kiểm duyệt.

## 8. Ánh xạ sang entity và thay đổi database (migration V4)

| Thay đổi | Chi tiết |
|---|---|
| `games.schema_version` | Cột mới, lưu `1.0.0` |
| `GradeLevel` | Đổi thành `KINDERGARTEN`, `GRADE_1`..`GRADE_5`; đổi ràng buộc `CHECK` của `games.grade` |
| MATCHING, MEMORY_CARD | Bỏ cột cũ; thêm danh sách cặp (thành phần nhúng, composition) |
| DRAG_DROP | Bỏ cột cũ; thêm danh sách vùng thả và danh sách vật (thành phần nhúng) |
| SPOT_THE_TARGET | Vùng bấm đổi sang số thực 0–1, cho phép rỗng; thêm `target_description` |
| AUDIO_VISUAL_MATCH, VISUAL_CLOZE | Thêm bảng `distractors` |
| QUIZ, ODD_ONE_OUT | Không đổi cột. `id` đáp án là `a`, `b`, `c`... suy ra từ vị trí; `correctIndex` giữ nguyên |
| Media | `question_games` có thêm `audio_text`, `audio_url`, `visual_prompt`, `image_url` dùng chung cho mọi loại (ảnh nền/ảnh minh họa của SPOT_THE_TARGET, VISUAL_CLOZE, QUIZ, WORD_SCRAMBLE nằm ở đây); `order_steps` có thêm `visual_prompt`, `image_url` |

Class diagram phải cập nhật tương ứng.

## 9. Việc để sau (chưa thuộc v1.0.0)

- **Bản dành cho học sinh** và endpoint riêng: bỏ các trường [ĐA], Backend cấp lại id lựa chọn (đã xáo) khi phục vụ để không lộ đáp án qua thứ tự hay `pairId`.
- Chấm điểm từng phần.
- Hình minh họa cho từng đáp án của QUIZ và từng phần tử của ODD_ONE_OUT (hiện chỉ có chữ).
- Công cụ tự sinh type TypeScript từ JSON Schema.
- Bộ chuyển đổi (Adapter) tương thích ngược khi có v1.1.0 trở đi.

## 10. Thay đổi cần cập nhật ở REST API Contract v1.0.0

1. `login` và `refresh`: bỏ `refreshToken` khỏi body (server gửi qua cookie `HttpOnly`); `refresh` không còn body request.
2. `gradeLevel`: dùng các giá trị ở mục 3 thay cho ví dụ hiện tại.
3. `POST /sessions/{sessionId}/interactions`: dùng dạng trả lời theo từng loại ở mục 5.
4. `GameResponse.questions[]` theo đúng tài liệu này.
