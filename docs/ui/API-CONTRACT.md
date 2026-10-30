# API frontend CẦN mà Backend chưa có

Ngày: 27/10/2026 · Phạm vi: chỉ đề xuất, **không sửa** `openapi.yaml`, DSL hay code Backend. Nhóm Backend duyệt rồi mới đưa vào `docs/openapi/openapi.yaml` (nguồn sự thật, thiết kế trước, code sau).

Căn cứ: `docs/ui/SPEC.md` mục 5, `docs/openapi/openapi.yaml` (REST API Contract v1.1.0), `docs/game-json-dsl-v1.0.0.md`, và mã Backend hiện tại.

## 0. Hiện trạng Backend (đọc lại từ mã, không đoán)

- Controller đã cài: **chỉ `AuthController`** (`/api/auth/register|login|refresh|logout`). Mọi endpoint game, xuất bản, phiên chơi, chấm điểm, kết quả đều **chưa có controller**, dù `openapi.yaml` đã mô tả sẵn nhiều endpoint (`x-status: planned`).
- Vì vậy phần lớn các mục dưới đây chia làm hai loại:
  - **Loại A**: đã có trong `openapi.yaml` ở trạng thái `planned`, Frontend chỉ cần Backend cài đúng spec (mục 1).
  - **Loại B**: spec chưa có hoặc chưa đủ cho giao diện mới; cần bổ sung (mục 2 trở đi).
- Trong lúc chờ, Frontend chạy bằng dữ liệu mô phỏng (cờ `VITE_USE_MOCK`, nhóm `sessions`, `results`), mô phỏng đúng các hình dạng JSON ghi ở đây.

Quy ước chung (giữ nguyên contract hiện có): vỏ `{ "success": true, "data": ... }` / `{ "success": false, "error": { "code", "message", "details?" } }`; học sinh gửi header `X-Participant-Id`; giáo viên gửi `Authorization: Bearer`.

## 1. Loại A: đã có trong spec, Frontend phụ thuộc (chỉ cần cài đúng)

| Endpoint | Dùng cho màn |
|---|---|
| `GET /games/shared/{shareCode}` | Hs-Join, Be-Intro, Hs-Nickname (cần mở rộng, xem 2.1) |
| `POST /games/shared/{shareCode}/play` | Tạo phiên `SELF` khi bé/học sinh chơi ở nhà |
| `GET /sessions/by-code/{accessCode}`, `POST /sessions/{id}/join` | Vào phòng thi đấu bằng mã PIN 6 số |
| `GET /sessions/{id}/questions` | Lấy câu hỏi dạng học sinh (cần ví dụ máy đọc, xem 2.3) |
| `POST /sessions/{id}/interactions` | Nộp và chấm (cần làm rõ, xem 2.4 và 2.5) |
| `GET /sessions/{id}/my-result`, `GET /sessions/{id}/leaderboard` | Kết quả, bảng xếp hạng (cần mở rộng, xem 2.7) |
| `POST /games/{id}/publish` | Xuất bản (cần mở rộng, xem 2.2) |
| `POST /games/{id}/sessions`, `start/pause/resume/close`, `GET /sessions/{id}`, `GET /sessions/{id}/results` | Giáo viên mở và điều khiển phòng |
| `POST /games/generate` (kèm `Accept: text/event-stream`) | Tiến trình AI soạn (F4), cần thêm bước, xem 2.9 |
| `POST /auth/forgot-password`, `/auth/reset-password` | F9 (ẩn liên kết đến khi cài) |

## 2. Loại B: còn thiếu hoặc cần mở rộng

### 2.1 Thông tin game trước khi vào chơi (chọn khung Bé / Học sinh, theme)

**Vấn đề:** `SharedGameInfo` chỉ có `gameTitle, gameType, questionCount`; `SessionByCode` không có thông tin game. Nhưng màn Hs-Nickname hiện "Toán · Lớp 2 · 10 câu" và ảnh theme, màn Be-Intro cần theme, và **khung (Bé/Học sinh) phải biết trước khi tải câu hỏi** (câu hỏi chỉ lấy được sau khi đã có `participantId`).

Đề xuất: thêm vào `SharedGameInfo` **và** `SessionByCode`:

```json
{
  "success": true,
  "data": {
    "gameTitle": "Đếm con vật",
    "gameType": "QUIZ",
    "questionCount": 5,
    "metadata": { "subject": "MATH", "gradeLevel": "KINDERGARTEN", "topic": "Đếm số lượng" },
    "uiOverride": "AUTO",
    "themeId": null
  }
}
```

`uiOverride` thuộc `AUTO | BE | HOC_SINH`. `themeId` là chuỗi tùy ý, `null` thì Frontend tự chọn theme theo loại game và môn. Không thêm vào Game JSON DSL (SPEC mục 3).

Lỗi phân biệt cho màn lỗi (SPEC mục 2): `404` với `error.code` thuộc `SHARE_CODE_NOT_FOUND | GAME_NOT_PUBLISHED | GAME_EXPIRED | GAME_DISABLED` (SELF); `SESSION_NOT_FOUND | SESSION_CLOSED | SESSION_STARTED | SESSION_FULL` (phòng). Hiện spec chỉ có 404/409 chung.

### 2.2 Thông tin xuất bản (SPEC 5.3)

`PublishResult` mới chỉ có `shareCode, shareUrl`. Cần thêm cài đặt xuất bản (giáo viên đặt ở hộp thoại F7).

`PUT /games/{gameId}/publish-settings` (giáo viên, game phải `PUBLISHED`)

```json
{ "uiOverride": "AUTO", "themeId": "farm", "enabled": true, "expiresAt": "2026-11-30T16:59:59Z" }
```

Response `200`:

```json
{ "success": true, "data": { "gameId": "uuid", "shareCode": "A3F9K2", "shareUrl": "https://.../play/A3F9K2",
  "uiOverride": "AUTO", "themeId": "farm", "enabled": true, "expiresAt": "2026-11-30T16:59:59Z" } }
```

`expiresAt: null` là mở không giới hạn. `enabled: false` là tắt mã (học sinh nhận `GAME_DISABLED`). Đồng thời `POST /games/{id}/publish` và `GET /games/{id}` nên trả cùng các trường này. Lưu ở thông tin xuất bản, **không** nằm trong JSON game.

**Frontend đang dùng (P3):** hộp "Xuất bản và chia sẻ" (F7, `frontend/src/components/editor/PublishDialog.tsx` và `PublishSettingsRow.tsx`) đọc và lưu 4 trường này qua `PublishSettingsApi { get, update }` (`frontend/src/services/publishSettings/`, hook `usePublishSettings`). Hiện chạy bằng adapter mô phỏng (nhóm `editor`, lưu theo `gameId` trong bộ nhớ, có nhãn "Dữ liệu mô phỏng" ở dev). Bản thật trả lỗi "chưa hỗ trợ": hàng cài đặt vẫn hiện nhưng khóa kèm "Sắp có". `get` dự kiến lấy từ `GET /games/{id}` (khi đã trả các trường trên). `expiresAt` do giao diện gửi là cuối ngày giờ Việt Nam, dạng `YYYY-MM-DDT16:59:59Z`.

Lưu ý mâu thuẫn: spec hiện cố định phiên `SELF` hết hạn sau 24 giờ (`PlayResult.expiresAt`); cần chốt `expiresAt` của phiên `SELF` lấy từ đâu (xem câu hỏi Q8 trong PLAN).

### 2.3 Dạng câu hỏi dành cho học sinh: ví dụ máy đọc cho cả 10 loại

`GET /sessions/{id}/questions` (đã có trong spec, nhưng `StudentGameResponse` mới có schema máy đọc cho MATCHING). Frontend cần ví dụ cụ thể cho mọi loại để viết kiểu TypeScript và dữ liệu mô phỏng. Đề xuất dưới đây **cụ thể hóa bảng mô tả sẵn có** của spec; chỗ duy nhất thêm ý mới là ORDERING cấp lại `id` theo vị trí hiển thị, đánh dấu **[ĐỀ XUẤT]** (lý do ở cuối mục). Bản mô phỏng của Frontend đang làm theo đề xuất này và theo mã lỗi đề xuất ở mục 2.1.

**Nguyên tắc:** vỏ giữ `schemaVersion, gameType, metadata, gameplaySettings{hitboxScale}, questions, answeredQuestionIds`. Mỗi câu hỏi **không chứa bất kỳ trường [ĐA] nào** và không chứa trường làm lộ đáp án qua thứ tự hay id.

| Loại | Trường bị bỏ ([ĐA]) | Thay bằng |
|---|---|---|
| QUIZ | `correctOptionId` | (không) |
| AUDIO_VISUAL_MATCH | `correct`, `distractors` | `options[{id,imageUrl,visualPrompt}]` đã xáo |
| ODD_ONE_OUT | `oddOneOutId` | (không) |
| SPOT_THE_TARGET | `hitRegion` | (không) |
| WORD_SCRAMBLE | `correctWord` | giữ `scrambledLetters` |
| MATCHING | `pairs` (quan hệ cặp) | `leftItems[]`, `rightItems[]` mã mờ `l*`/`r*` |
| MEMORY_CARD | (không có bí mật) | giữ `pairs` |
| DRAG_DROP | `items[].targetZoneId` | (không) |
| ORDERING | `steps[].correctPosition` | thứ tự mảng là thứ tự hiển thị đã xáo |
| VISUAL_CLOZE | `correctAnswer`, `distractors` | `options: [chuỗi]` đã xáo |

Ví dụ (một phần tử của `questions[]`, đã có `id`, `timeLimitSeconds`, `points`, `audioText`, `audioUrl`, `imageUrl` khi có):

```json
// QUIZ
{ "id": "q1", "timeLimitSeconds": 30, "points": 10, "audioText": "Có mấy con mèo?", "audioUrl": "https://.../q1.mp3",
  "questionText": "Có mấy con mèo?", "visualPrompt": "three cats", "imageUrl": "https://.../cats.jpg",
  "options": [ { "id": "a", "text": "2" }, { "id": "b", "text": "3" }, { "id": "c", "text": "4" } ] }

// AUDIO_VISUAL_MATCH
{ "id": "q1", "audioText": "Quả táo", "audioUrl": "https://.../apple.mp3",
  "options": [ { "id": "a", "visualPrompt": "banana", "imageUrl": "https://.../b.jpg" },
               { "id": "b", "visualPrompt": "apple",  "imageUrl": "https://.../a.jpg" } ] }

// ODD_ONE_OUT
{ "id": "q1", "audioText": "Con nào khác loại?",
  "items": [ { "id": "a", "text": "mèo" }, { "id": "b", "text": "xe hơi" }, { "id": "c", "text": "chó" } ] }

// SPOT_THE_TARGET (không có hitRegion)
{ "id": "q1", "audioText": "Tìm con mèo", "targetDescription": "con mèo", "imageUrl": "https://.../garden.jpg" }

// WORD_SCRAMBLE (không có correctWord)
{ "id": "q1", "audioText": "Sắp xếp thành con vật", "imageUrl": "https://.../cow.jpg", "scrambledLetters": ["Ò", "B"] }

// MATCHING (đã có schema MatchingStudentQuestion)
{ "id": "q1", "audioText": "Nối từ với nghĩa",
  "leftItems":  [ { "id": "l1", "text": "dog" }, { "id": "l2", "text": "cat" } ],
  "rightItems": [ { "id": "r1", "text": "mèo" }, { "id": "r2", "text": "chó" } ] }

// MEMORY_CARD (giữ nguyên pairs; Frontend nhân đôi và xáo)
{ "id": "q1", "audioText": "Tìm các thẻ giống nhau",
  "pairs": [ { "pairId": "p1", "content": { "visualPrompt": "apple", "imageUrl": "https://.../a.jpg" } } ] }

// DRAG_DROP (không có targetZoneId)
{ "id": "q1", "audioText": "Xếp vào đúng rổ",
  "dropZones": [ { "id": "z1", "label": "Trái cây" }, { "id": "z2", "label": "Đồ chơi" } ],
  "items": [ { "id": "i1", "text": "táo", "imageUrl": "https://.../apple.jpg" }, { "id": "i2", "text": "gấu bông" } ] }

// ORDERING (không có correctPosition; thứ tự mảng đã xáo; id gán theo vị trí hiển thị SAU khi xáo, không theo thứ tự đúng)
{ "id": "q1", "audioText": "Sắp xếp các bước trồng cây",
  "steps": [ { "id": "s1", "text": "Tưới nước" }, { "id": "s2", "text": "Cây lớn lên" }, { "id": "s3", "text": "Gieo hạt" } ] }
// VISUAL_CLOZE (không có correctAnswer; options gồm đáp án đúng và nhiễu, đã xáo)
{ "id": "q1", "audioText": "Con gì kêu meo meo?", "sentenceTemplate": "Con ___ kêu meo meo.",
  "imageUrl": "https://.../cat.jpg", "options": ["chó", "mèo", "gà"] }
```

**Điều kiện kiểm thử Backend (đã ghi ở SPEC P0):** test API cho đủ 10 loại, khẳng định chuỗi JSON trả cho học sinh **không chứa** các khóa `correctOptionId, oddOneOutId, correct, distractors, hitRegion, correctWord, pairs (ở MATCHING), targetZoneId, correctPosition, correctAnswer`. Frontend sẽ kiểm tương tự trên dữ liệu mô phỏng (PLAN, bước P1.5).

Các điểm cần Backend để ý vì làm lộ đáp án gián tiếp:
- MATCHING: cột phải không được xáo sao cho cặp đúng nằm cùng hàng (spec đã ghi `[ĐỀ XUẤT]`; xin chốt thành bắt buộc).
- **[ĐỀ XUẤT]** ORDERING: id bước phải được cấp lại theo vị trí hiển thị sau khi xáo; giữ id gốc `s1, s2...` (đánh theo thứ tự đúng) thì lộ đáp án.
- Bộ xáo dùng cho AUDIO_VISUAL_MATCH, VISUAL_CLOZE phải là xáo thường (đáp án đúng có thể đứng ở bất kỳ vị trí nào, kể cả vị trí ban đầu); chỉ MATCHING cần xáo không cặp nào cùng hàng. Riêng ORDERING: xáo thường, nhưng nếu tình cờ ra đúng thứ tự đúng thì xáo lại (bày sẵn đáp án thì không còn là câu hỏi); bản mô phỏng làm như vậy.
- MEMORY_CARD giữ `pairs` nên `pairId` lộ nhóm thẻ trùng nhau; chấp nhận được vì đó là luật chơi, không phải đáp án.

### 2.4 Nộp câu trả lời và `correctAnswer` theo loại

`POST /sessions/{sessionId}/interactions` (đã có). Xin bổ sung vào spec bảng `correctAnswer` theo loại để renderer hiện đáp án đúng cho trẻ:

| Loại | Body trả lời | `correctAnswer` trả về sau khi chấm |
|---|---|---|
| QUIZ | `{ "selectedOptionId": "b" }` | `{ "selectedOptionId": "b" }` |
| AUDIO_VISUAL_MATCH | `{ "selectedOptionId": "b" }` | `{ "selectedOptionId": "b" }` |
| ODD_ONE_OUT | `{ "selectedItemId": "b" }` | `{ "selectedItemId": "b" }` |
| SPOT_THE_TARGET | `{ "x": 0.62, "y": 0.41 }` | `{ "x": 0.62, "y": 0.41, "radius": 0.08 }` |
| WORD_SCRAMBLE | `{ "word": "BÒ" }` | `{ "word": "BÒ" }` |
| MATCHING | `{ "matches": [{ "leftPairId": "l1", "rightPairId": "r2" }] }` | `{ "matches": [...] }` (mã mờ) |
| MEMORY_CARD | `{ "matchedPairIds": ["p1","p2"], "flips": 7 }` | `{ "matchedPairIds": ["p1","p2"] }` |
| DRAG_DROP | `{ "placements": [{ "itemId": "i1", "zoneId": "z1" }] }` | `{ "placements": [...] }` |
| ORDERING | `{ "order": ["s3","s1","s2"] }` (id theo vị trí hiển thị) | `{ "order": ["s3","s1","s2"] }` |
| VISUAL_CLOZE | `{ "answer": "mèo" }` | `{ "answer": "mèo" }` |

Mọi request kèm `questionId` và `timeSpentMs`; hết giờ/bỏ qua dùng `outcome: "TIMEOUT" | "SKIPPED"`. Response mẫu (QUIZ trả lời sai):

```json
{ "success": true, "data": {
  "status": "INCORRECT", "isCorrect": false, "pointsEarned": 0, "totalScore": 10,
  "correctAnswer": { "selectedOptionId": "b" }, "explanation": null } }
```

### 2.5 Hai mâu thuẫn cần Backend quyết (ảnh hưởng thiết kế cho Bé)

**(a) Bé không đếm giờ, nhưng Backend đổi sang `TIMEOUT` khi `timeSpentMs` vượt giới hạn cộng 1 giây.** SPEC 1.10: "không đếm giờ". Đề xuất: phiên `SELF` **không áp `TIMEOUT`** (giới hạn chỉ mang tính thông tin); điểm của `SELF` vẫn tính theo công thức FLD-16 nhưng không bao giờ về 0 vì chậm. Nếu Backend không đổi, Frontend tạm gửi `timeSpentMs = min(thực tế, timeLimitSeconds × 1000)` (ghi nhận là giải pháp tạm, sai số liệu thời gian).

**(b) "Sai thì gợi ý và thử lại" và "ghi `attemptsCount`, lưu cả đáp án sai" (SPEC 5.2) so với "gửi lại cùng (participant, questionId) trả kết quả đã lưu, không tạo bản ghi mới" (spec hiện tại).** Với spec hiện tại, mọi lần thử lại sau lần đầu đều không được ghi, nên F1 "Lớp mình cần ôn lại" chỉ thấy đáp án sai **lần đầu**. Đề xuất giữ kết quả chính thức = lần đầu (điểm không đổi), nhưng ghi thêm các lần thử:

```json
// POST /sessions/{id}/interactions  (lần thử lại)
{ "questionId": "q1", "selectedOptionId": "a", "timeSpentMs": 4200, "retry": true }

// 200
{ "success": true, "data": {
  "status": "CORRECT", "isCorrect": true, "pointsEarned": 0, "totalScore": 10,
  "attemptsCount": 2, "correctAnswer": { "selectedOptionId": "a" }, "explanation": null } }
```

Quy tắc: `retry: true` chỉ được khi kết quả chính thức của câu đang là `INCORRECT`; mỗi lần thử được thêm vào danh sách `attempts` (đáp án, đúng/sai, thời điểm); `status` và `pointsEarned` chính thức không đổi; `attemptsCount` tăng. Gửi lại **không** có `retry` vẫn đúng như spec cũ (idempotent). Chỉ phiên `SELF` được dùng `retry` (phòng thi đấu: đúng hết hoặc không, một lần).

### 2.6 Xem lại đáp án của chính mình (Hs-Review)

Hiện chỉ giáo viên đọc được `.../participants/{pid}/interactions`. Học sinh cần:

`GET /sessions/{sessionId}/my-interactions` (header `X-Participant-Id`; chỉ khi phiên đã xong hoặc participant `COMPLETED`)

```json
{ "success": true, "data": [
  { "questionId": "q2", "status": "INCORRECT", "pointsEarned": 0, "attemptsCount": 1,
    "answer": { "selectedItemId": "c" }, "correctAnswer": { "selectedItemId": "b" } },
  { "questionId": "q1", "status": "CORRECT", "pointsEarned": 9, "attemptsCount": 1,
    "answer": { "selectedOptionId": "b" }, "correctAnswer": { "selectedOptionId": "b" } } ] }
```

Frontend ghép với `GET /sessions/{id}/questions` (đã có nội dung câu) để vẽ "Bạn chọn / Đáp án đúng". Trước khi hoàn thành thì trả 409, để không dùng làm kênh dò đáp án.

### 2.7 Kết quả cá nhân và bảng xếp hạng cho học sinh

Wireframe cần thêm so với spec:

1. `MyResult` thêm `topic` (cho lời nhắn phụ huynh "Bé làm đúng 4/5 câu chủ đề ...") và `streakBest` (chuỗi đúng dài nhất, dùng cho Hs-Result). Nếu không muốn thêm: Frontend tự tính chuỗi từ 2.6, `topic` lấy từ `StudentGameResponse.metadata.topic` (đã có). **Có thể bỏ yêu cầu này**, ghi để Backend biết.
2. `GET /sessions/{id}/leaderboard?limit=5` cho học sinh: thêm tham số `limit` và khối `me` (hạng của chính participant gửi header), vì "thứ hạng từng bạn chỉ hiện trên máy bạn đó" nhưng `participantId` không được lộ cho học sinh:

```json
{ "success": true, "data": {
  "participants": [ { "rank": 1, "nickname": "Sao Băng", "score": 360 } ],
  "me": { "rank": 7, "nickname": "Ong Vàng", "score": 280, "totalParticipants": 32 } } }
```

### 2.8 Tổng hợp cho giáo viên (F1 "Lớp mình cần ôn lại", F8 "Cần ôn lại")

`SessionResults` hiện chỉ có thống kê theo người (đã ghi ở `decisions.md` mục 4). Cần thống kê **theo câu**, chỉ dữ liệu tổng hợp theo biệt danh, không dữ liệu định danh.

`GET /games/{gameId}/insights?sessionType=SOLO|TEAM|SELF` (giáo viên chủ game; bỏ `sessionType` là tất cả)

```json
{ "success": true, "data": {
  "playCount": 26, "correctRate": 0.72, "avgAttemptsPerQuestion": 1.6,
  "questions": [
    { "questionId": "q4", "order": 4, "text": "CHỊ", "answeredCount": 26, "correctRate": 0.41, "avgAttempts": 2.1,
      "needsReview": true,
      "commonWrong": [ { "label": "CHI", "count": 9, "answer": { "word": "CHI" } } ] } ] } }
```

`label` là chuỗi **đã dựng sẵn ở Backend** cho người đọc (đáp án sai có hình dạng khác nhau theo loại game nên Frontend không tự dựng được). `needsReview` do Backend quyết theo ngưỡng cấu hình (đề xuất: `correctRate < 0.6` và `answeredCount >= 5`). Nếu có phiên thi đấu đã đóng, chỉ giữ số liệu tổng hợp (SPEC mục 1.9).

`GET /insights/review-needed?limit=3` (trang chủ F1)

```json
{ "success": true, "data": [
  { "gameId": "uuid", "gameTitle": "Ghép chữ về gia đình", "questionId": "q4", "questionText": "CHỊ",
    "correctRate": 0.41, "commonWrong": { "label": "CHI", "count": 9 } } ] }
```

"Tạo game ôn tập từ lỗi này": mở rộng `GenerateGameRequest` bằng trường tùy chọn `reviewFrom: { "gameId": "uuid", "questionIds": ["q4"] }` để Backend tự đưa các câu và lỗi hay gặp vào lời nhắc cho AI. Frontend không tự dựng lời nhắc từ dữ liệu kết quả (tránh đưa dữ liệu học sinh vào `idea`).

Đề xuất bổ sung cho `review-needed`: sắp theo `correctRate` tăng dần (câu yếu nhất trước); `commonWrong` là `null` khi chưa có đáp án sai nào lặp lại từ 2 lần (Frontend khi đó bỏ vế "hay nhầm thành").

> **Frontend đang dùng (P3, 2026-10-28):** trang chủ F1 gọi `GET /insights/review-needed?limit=3` qua `HomeApi.listReviewNeeded` (`frontend/src/services/home/`), hiện chạy bằng adapter mô phỏng (nhóm `results`, có nhãn "dữ liệu mẫu" ở dev); bản thật trả lỗi "chưa hỗ trợ" và khối hiện trạng thái trống. Trong lúc chưa có `reviewFrom`, nút "Tạo game ôn tập" chỉ điền sẵn `idea = "Ôn tập: {gameTitle}"` (tên game của giáo viên), không đưa câu trả lời của học sinh vào.

> **Frontend đang dùng (P3, F8 trang "Kết quả"):** trang `/results` (`frontend/src/pages/ResultsPage.tsx`; không có `?gameId=` thì liệt kê game đã đăng để chọn) gọi `GET /games/{gameId}/insights` qua `HomeApi.getGameInsights(gameId, sessionType?)` (cùng `frontend/src/services/home/`, hook `useGameInsights`). Chip lọc "Tất cả lượt / Phòng thi đấu / Chơi ở nhà" gửi `sessionType` bỏ trống / `TEAM` / `SELF` và giữ trên địa chỉ `?type=`. Hiện chạy bằng adapter mô phỏng nhóm `results` (`mockInsights.ts`: số liệu xác định dựng từ câu hỏi của game mô phỏng, có câu `needsReview` và `commonWrong`; có nhãn "dữ liệu mẫu" ở dev); bản thật trả lỗi "chưa hỗ trợ" và trang hiện "Chưa có số liệu", không báo lỗi. Frontend chỉ dùng `label` của `commonWrong` (đã dựng ở Backend), chưa dùng `answer`. Thẻ "Cần ôn lại" lấy câu `needsReview` có `correctRate` thấp nhất; nút "Tạo game ôn tập" làm đúng như Trang chủ: chỉ điền sẵn `idea = "Ôn tập: {gameTitle}"` cùng `grade`, `subject` của game, không đưa lỗi hay câu trả lời của học sinh vào (chờ `reviewFrom`).

### 2.9 Tiến trình AI soạn (F4) và đề xuất kiểu chơi (F5)

**Tiến trình:** spec đã có SSE (`progress` với `step` thuộc `ANALYZING, VALIDATING, FETCHING_IMAGES, GENERATING_AUDIO, SAVING`). Wireframe F4 có 5 bước hiển thị: Đọc mô tả / Đối chiếu chương trình / Soạn câu hỏi (đang soạn câu 3/5) / Kiểm tra an toàn / Gắn hình và giọng. Đề xuất:
- Thêm bước `GENERATING` (soạn câu hỏi) kèm `{ "done": 3, "total": 5 }`; ví dụ `event: progress` / `data: {"step":"GENERATING","percent":55,"done":3,"total":5}`.
- Ánh xạ: Đọc mô tả = `ANALYZING`; Soạn câu hỏi = `GENERATING`; Kiểm tra an toàn = `VALIDATING`; Gắn hình và giọng = `FETCHING_IMAGES` + `GENERATING_AUDIO`; `SAVING` gộp vào bước cuối.
- **"Đối chiếu chương trình" (bước 2) không có chức năng nào ở Backend hay tài liệu.** Frontend sẽ **không hiển thị bước này** cho đến khi có (xem Q10 trong PLAN), thay vì bịa ra.
- Nếu SSE chưa làm: Frontend chạy theo thời gian ước tính và ghi rõ "tạm thời" (đúng SPEC 5.4).
- **Frontend đang dùng (P3):** chưa có SSE nên màn F4 (`frontend/src/components/create/CreateProgressPanel.tsx`) hiện 4 bước (bỏ "Đối chiếu chương trình") và thanh tiến độ tính bằng `estimateProgress` (`frontend/src/utils/estimatedProgress.ts`, tối đa 95% cho tới khi có kết quả), kèm dòng "tạm thời". Khi có SSE, chỉ cần thay `estimateProgress` bằng `step`/`percent` từ sự kiện `progress` theo ánh xạ ở trên.

**Đề xuất kiểu chơi (F5):** `openapi.yaml` **không có** endpoint đề xuất kiểu chơi (Frontend đang dùng bản mô phỏng `gameTypeSuggestionService`). Chờ chốt Q2 của SPEC (đề xuất rồi mới soạn, hay soạn sẵn cả 3). Cho cả hai phương án, hình dạng tối thiểu:

`POST /games/suggest-types` (giáo viên)

```json
// request
{ "idea": "Cho bé đếm con vật từ 1 đến 5", "gradeLevel": "KINDERGARTEN", "subject": "MATH" }
// response
{ "success": true, "data": [
  { "gameType": "QUIZ", "reason": "Bé nhìn tranh, đếm rồi chạm vào số đúng.", "description": "Chọn một đáp án",
    "fitScore": 0.92, "best": true } ] }
```

Phương án "soạn sẵn cả 3": mỗi phần tử thêm `gameId` của bản nháp đã soạn (cùng cơ chế `DRAFT`), để nút "Chơi thử" và "Dùng kiểu này" dùng tiếp; các bản nháp không được chọn phải được dọn.

### 2.10 Quản lý phòng và danh sách phiên đang chạy

| Endpoint | Mục đích | Request / Response |
|---|---|---|
| `GET /sessions?status=WAITING,ACTIVE,PAUSED` | F1 "Đang diễn ra": hiện chỉ có `GET /games/{id}/sessions` theo từng game. **Frontend đang dùng (P3):** `HomeApi.listLiveSessions` (`frontend/src/services/home/`), chạy bằng mô phỏng nhóm `sessions` có nhãn "dữ liệu mẫu" | Response mảng `SessionListItem` thêm `gameId`, `gameTitle`, `currentQuestionIndex` (số, **tính từ 0**, hoặc `null` khi chưa bắt đầu), `questionCount` (tổng số câu của game, bắt buộc). Mỗi phần tử là đủ `SessionListItem` hiện có cộng 4 trường này; không trả phiên `SELF` (giao về nhà); sắp theo thời gian tạo mới nhất trước |
| `DELETE /sessions/{sessionId}/participants/{participantId}` | Giáo viên xóa biệt danh không phù hợp (D1) | `204`; participant bị gỡ khỏi bảng và nhận sự kiện bị loại (WebSocket); biệt danh có thể dùng lại |

### 2.11 Phòng thi đấu thời gian thực (P5, phụ thuộc spike WebSocket)

`openapi.yaml` ghi rõ: **tài liệu WebSocket Message Format chưa viết**. Wireframe D1–D7 yêu cầu **đồng bộ theo câu do giáo viên điều khiển** ("Câu tiếp", "Kết thúc câu sớm", "Xem đáp án", đồng hồ chung, "đã trả lời 21/32"), trong khi contract hiện tại để từng học sinh làm theo nhịp riêng (`getSessionQuestions` trả cả bộ câu, chỉ có `start/pause/resume/close`). Xin Backend chốt:

1. Phòng đồng bộ theo câu (giáo viên điều khiển) hay theo nhịp riêng (tivi chỉ hiện tổng hợp)? Frontend giả định **đồng bộ theo câu**.
2. Danh sách sự kiện tối thiểu (đề xuất, cần Backend xác nhận):

| Đích `/topic/session/{id}/...` | Nội dung | Ai nhận |
|---|---|---|
| `lobby` | `{ participantCount, nicknames[] }` | giáo viên (tivi) và học sinh |
| `question` | `{ questionId, index, total, endsAt }` | tất cả |
| `answered` | `{ answeredCount, participantCount }` | giáo viên (tivi) |
| `board` | `{ top: [{rank,nickname,score,delta}], classCorrectRate }` (top 5, không có `participantId`) | tất cả |
| `reveal` | `{ questionId }` (cho phép hiện đáp án câu đó) | tất cả |
| `state` | `{ status: WAITING|ACTIVE|PAUSED|CLOSED }` | tất cả |
| `kicked` | `{}` (gửi riêng cho participant bị loại) | một học sinh |

3. Tivi chỉ cần dữ liệu tổng hợp; **không gửi nội dung câu hỏi qua kênh tivi** (câu hỏi hiện trên máy từng học sinh, SPEC 1.9).
4. Ngưỡng ổn định: 30 máy cùng phòng; kết nối lại giữ `participantId`.

Frontend không thể tự làm kiểm thử 30 máy; cần Backend cung cấp môi trường thử (hoặc script tải).

### 2.12 Tài khoản giáo viên

- `POST /auth/forgot-password` đã ở spec (`planned`): Frontend ẩn liên kết "Quên mật khẩu" đến khi `x-status` đổi thành `implemented`.
- Trường tùy chọn "Cô dạy cấp nào?" khi đăng ký (F10): thêm `teachingLevel` (`KINDERGARTEN | PRIMARY`) tùy chọn vào `RegisterRequest` và hồ sơ giáo viên. Dùng để gợi ý mặc định môn và khối ở F3.
- Lưu ý: mã Frontend hiện còn theo contract cũ của đăng nhập (`refreshToken` trong body, `AuthUser.id`); contract mới dùng cookie `HttpOnly` và `teacherId`. Việc đổi nằm ở Frontend (PLAN, P3.1), không cần Backend làm thêm.

### 2.13 Yêu cầu bảo mật khi cài các endpoint của học sinh (từ rà soát `security-auditor`, 2026-10-27)

1. **`X-Participant-Id` là thông tin xác thực duy nhất của học sinh:** sinh ngẫu nhiên đủ dài (UUID v4 trở lên, không tuần tự); trên mọi endpoint kiểm `participantId` thuộc đúng `{sessionId}` ở đường dẫn, nếu không học sinh A đọc hoặc nộp bài thay học sinh B.
2. **Chống dò mã:** giới hạn tần suất theo IP cho `GET /games/shared/{code}`, `POST /games/shared/{code}/play` (spec mới có cho lượt tra mã sai) và `GET /sessions/by-code/{pin}`, trả 429 kèm `Retry-After`; PIN phòng chỉ sống khi phòng mở; giới hạn số participant mỗi phiên và số phiên `SELF` theo IP.
3. **Không tin dữ liệu từ máy học sinh:** máy chủ tự ghi mốc lúc gửi câu hỏi và chặn `timeSpentMs` trong [0, giới hạn]; không nhận điểm từ client. `my-interactions` trả 409 trước khi hoàn thành phải được kiểm ở máy chủ. `retry` (2.5b) trả `correctAnswer` ngay lần sai đầu nên chỉ bật cho `SELF`, giới hạn số lần thử mỗi câu.
4. **Xáo phía máy chủ** bằng HMAC với khóa bí mật (spec đã ghi), không dùng hạt giống đoán được như bản mô phỏng (`sessionId:questionId`).
5. **Biệt danh** (khi có ô nhập): lọc từ cấm, 1 đến 20 ký tự, trả về như văn bản thuần.

6. **Số liệu của giáo viên (`GET /games/{gameId}/insights`, `GET /insights/review-needed`, 2.8):** lọc theo `teacherId` lấy từ token; game không thuộc giáo viên thì trả **404 như game không tồn tại** (không trả 403, để không dò được mã game); `review-needed` chỉ gộp game của chính giáo viên đó. Trang F8 của Frontend chỉ gọi khi game có trong danh sách của cô, nhưng đó chỉ là lớp giao diện, không thay được kiểm quyền ở máy chủ.
7. **`commonWrong.label`** là chuỗi dựng từ câu trả lời của học sinh (với loại nhập chữ như WORD_SCRAMBLE là chữ trẻ tự gõ): chỉ trả khi đáp án sai lặp lại từ 2 lần trở lên (áp cho cả `insights`, không riêng `review-needed`), giới hạn độ dài, đã lọc từ cấm, không chứa biệt danh, trả về như văn bản thuần. Khi `reviewFrom` đưa các chuỗi này vào lời nhắc AI: đặt trong khối dữ liệu tách riêng, ghi rõ là dữ liệu không tin cậy, vẫn qua đủ 3 lớp kiểm duyệt; `reviewFrom.gameId` kiểm chủ sở hữu như mục 6 và `questionIds` phải thuộc game đó.

Phía Frontend khi cài `RealPlayerApi`: dùng một axios instance **riêng cho học sinh** (không có interceptor đính token và làm mới token của giáo viên, chỉ gắn `X-Participant-Id`), vì `axiosInstance` hiện tại sẽ đính token giáo viên nếu máy dùng chung còn đăng nhập và đẩy học sinh sang trang đăng nhập khi gặp 401.

## 3. Tóm tắt những gì Frontend KHÔNG yêu cầu Backend

- Huy hiệu, kỷ lục cá nhân, hình đại diện ở Hs-Nickname/Hs-Result: **không có trong contract**; Frontend chỉ lưu cục bộ trên máy (`localStorage`) hoặc bỏ (PLAN Q6). Không tạo tài khoản học sinh.
- Chuỗi đúng liên tiếp trong lượt chơi: Frontend tự đếm.
- Lời khích lệ: Frontend chọn theo tỉ lệ đúng (đã đúng với spec `my-result`).
- Trình chiếu trên lớp (nhóm A): chạy cục bộ ở máy giáo viên bằng `GET /games/{id}` (bản đầy đủ), không cần endpoint mới; xem Q5 trong PLAN.
