# Kế hoạch triển khai giao diện (khảo sát, chưa sửa code)

Ngày: 27/10/2026 · Phạm vi: **chỉ frontend**. Không đụng `backend/`, DSL v1.0.0, schema, prompt đóng băng. SPEC mục 5 (yêu cầu backend) và giai đoạn P0 không làm trong đợt này; phần Frontend cần Backend được gom ở `docs/ui/API-CONTRACT.md`.

Tài liệu đã đọc: `docs/ui/SPEC.md` (mục 1, 2, 3, 4, 6, 8), `docs/game-json-dsl-v1.0.0.md`, `docs/openapi/openapi.yaml`, `docs/plan.md`, `docs/decisions.md`, `docs/progress-2026-10-16.md`; 24 trong 37 wireframe (A-Home, A-Games, A-Create*, A-Editor, A-Publish, A-Results, A-Login, Be-*, Hs-*, Tv-*, Room-*), đọc theo hướng dẫn đầu SPEC (bỏ cú pháp công cụ vẽ). Chưa mở ảnh PNG (thư mục chỉ có `.dc.html`).

## 1. Hiện trạng đã kiểm chứng

### Backend (chỉ đọc)
- Chỉ **`AuthController`** có endpoint thật (`/api/auth/register|login|refresh|logout`). **Toàn bộ** game, xuất bản, phiên chơi, chấm điểm, kết quả đều chưa có controller. `openapi.yaml` đã mô tả nhiều endpoint nhưng đều `x-status: planned`.
- Hệ quả: mọi màn học sinh và giáo viên mới phải chạy bằng dữ liệu mô phỏng. Mã hiện có đã làm theo hướng đó (cờ `VITE_USE_MOCK`, nhóm `games, editor, media, ai, sessions, results`; hai nhóm `sessions`, `results` chưa có service nào dùng).

### Frontend
- React 19, Vite 8, TypeScript 6, Tailwind v4 (`@theme` trong `src/index.css`, `@config` cho `tailwind.config.js`), `react-router-dom` 7, `@tanstack/react-query` 5, axios (một instance `src/api/axiosInstance.ts`), `konva` 10 + `react-konva` 19 + `use-image`, `howler`, `canvas-confetti`, `qrcode.react` 4.2.0. Test: Vitest 4 + Testing Library + jsdom (jsdom không có Canvas). Lint: oxlint. **Chưa có** `@stomp/stompjs`, `sockjs-client`, font Baloo 2 / Nunito.
- State: Context API + `useState/useReducer` (`context/AuthContext`, reducer riêng cho editor và chơi thử). Không có thư viện state khác (đúng quy ước).
- Router (`src/App.tsx`, `routes/paths.ts`): `/login`, `/register`, `/dashboard`, `/games/new`, `/workspace`, `/workspace/editor`, `/dev/canvas-sandbox` (chỉ dev). Trang giáo viên nằm sau `ProtectedRoute` + `AppLayout`. **Chưa có route nào cho học sinh** (`/play/...`, `/join`, `/present`, `/room`).
- Trang giáo viên: `Dashboard` (283 dòng), `MyGamesPage` (319), `CreateGamePage` (541), `WorkspaceEditor` (563), `LoginPage`, `RegisterPage`; khoảng 30 file test trang.
- Thành phần chơi (`src/games/`): có **2 trong 10** renderer là `QUIZ` và `MATCHING`, cùng thư mục `common/` (`ResponsiveStage`, `QuestionAudioButton`, `useQuestionAudio`, `useIllustration`, `playSound`, `useFeedback`, `measureText`, `mediaLayout`, `answerResult`...). Bố cục là hàm thuần có test (`computeQuizLayout`, `computeMatchingLayout`). Prop theo union `mode: 'preview' | 'play' | 'review'`; ở `play` renderer nhận `onAnswered` **trả `boolean`** (Quiz) hoặc `MatchingAnswerResult` (Matching), và **tự gọi `useFeedback`** (confetti + âm thanh).
- Kiểu dữ liệu học sinh: `types/game-student.types.ts` **chỉ có MATCHING** (`MatchingStudentQuestion`). `config/studentApp.ts` đã dựng sẵn `resolveShareUrl` → `/play/{shareCode}` (trang đích chưa tồn tại).
- Trình soạn thảo: có chơi thử (QUIZ, MATCHING), tải ảnh/âm thanh, xuất bản, chia sẻ + QR, tin nhắn phụ huynh, AI làm lại một câu, và form sửa tay cho 7 loại (còn thiếu SPOT_THE_TARGET, DRAG_DROP, ORDERING; `docs/progress-2026-10-16.md`).
- Styling hiện tại: token màu trong `@theme` (`paper #f6f7f2`, `brand #0b7a5b`, màu theo môn...), font hệ thống/Inter; **khác bảng token SPEC mục 4** (nền kem `#FBF6EC`, xanh lá `#0E7A57`, Baloo 2 + Nunito). `src/games/` có quy ước màu riêng, không dùng chung token giáo viên.

## 2. Bảng màn hình/tính năng ↔ API

Ký hiệu: **Có** = có trong `openapi.yaml` nhưng Backend chưa cài (`planned`), dùng dữ liệu mô phỏng; **Thiếu** = chưa có trong spec, đã ghi ở `API-CONTRACT.md` (mục trong ngoặc). Nhóm mô phỏng mới dùng lại `sessions` và `results`.

### Học sinh
| Màn | API đã có (spec, chưa cài) | API còn thiếu | Cách Frontend xử lý |
|---|---|---|---|
| Hs-Join, Hs-Desk-Join (nhập mã, QR) | `GET /games/shared/{code}`, `GET /sessions/by-code/{pin}` | Phân biệt hai loại mã; thông tin game để chọn khung (2.1) | Một ô nhập; xác định loại mã (xem Q3); QR là đường dẫn mở thẳng trang, quét trong trang là tùy chọn |
| Hs-Nickname | `POST .../join`, `POST /games/shared/{code}/play` | Hình đại diện (không có trong contract) | Gửi biệt danh; hình đại diện chỉ lưu cục bộ hoặc bỏ (Q6) |
| Be-Intro (không có bước biệt danh) | `POST /games/shared/{code}/play` bắt buộc `nickname` | – | Bé không nhập: Frontend tự gửi biệt danh mặc định (Q4) |
| Hs-Intro, Be-Intro | `GET /games/shared/...` | `metadata`, `uiOverride`, `themeId` (2.1) | Khung chọn bằng `resolveUiProfile` |
| Hs-Play, Be-Play, Hs-Desk-Play, Be-Phone-Play | `GET /sessions/{id}/questions`, `POST .../interactions` | Ví dụ JSON cho 10 loại (2.3), `retry`, bỏ `TIMEOUT` ở SELF (2.5) | Khung lo đồng hồ, điểm, chuyển câu, phản hồi; renderer nộp qua adapter (xem mục 3, M3) |
| Hs-Result, Be-Result, Be-Phone-Result | `GET .../my-result` | `topic`, chuỗi đúng (2.7, có thể bỏ) | Huy hiệu/kỷ lục: cục bộ hoặc bỏ (Q6); lời nhắn phụ huynh dựng ở Frontend |
| Hs-Review | `GET .../questions` | `GET .../my-interactions` (2.6) | Ghép câu hỏi với đáp án đã chọn; chỉ đáp án đúng, không giải thích |
| Hs-Error, Be-Error, Be-Phone-Rotate | 404/409/429 | Mã lỗi phân biệt (2.1) | Màn lỗi theo `error.code`; mất mạng: giữ tiến độ trong `sessionStorage` (`sessionId`, `participantId`), nộp lại an toàn nhờ idempotent |
| Tv-Lobby, Tv-Play, Tv-Result (trình chiếu) | `GET /games/{id}` (bản đầy đủ, giáo viên) | – | Chạy cục bộ ở máy giáo viên, renderer ở `mode: 'preview'` (Q5); kết quả cả lớp do giáo viên đánh dấu tại chỗ, không lưu |
| Room-Lobby/Question/Board/Podium (tivi) | `POST /games/{id}/sessions`, `start/pause/close`, `GET .../leaderboard` | Tài liệu WebSocket, sự kiện, xóa biệt danh, `limit` (2.10, 2.11) | P5; mô phỏng bằng bus cục bộ cho tới khi có tài liệu WebSocket |
| Room-Wait/Feedback/Final (máy học sinh) | `join`, `questions`, `interactions`, `my-result` | `me` trong bảng xếp hạng (2.7), đồng bộ theo câu (2.11) | P5 |

### Giáo viên
| Màn | API đã có (spec, chưa cài) | API còn thiếu | Cách Frontend xử lý |
|---|---|---|---|
| F9 Đăng nhập / F10 Đăng ký | `/auth/*` (đã cài) | `forgot-password` (planned), `teachingLevel` (2.12) | Dùng API thật; ẩn "Quên mật khẩu"; đổi sang cookie/`teacherId` theo contract mới |
| F1 Trang chủ | `GET /games` | `GET /sessions?status=...`, `GET /insights/review-needed` (2.8, 2.10) | Đã có hạ tầng mock; "Đang diễn ra"/"Lớp mình cần ôn lại" dùng mock có nhãn "Dữ liệu mô phỏng" |
| F2 Kệ trò chơi | `GET /games` (đã có trong mã) | – | Đổi giao diện; nút chính theo trạng thái |
| F3 Tạo game: mô tả | `POST /games/generate` (kèm tệp) | – | Giữ logic hiện có; khối lớp/môn theo `decisions.md` mục 1 |
| F4 Tiến trình | SSE `progress` (spec) | Bước `GENERATING`, `done/total` (2.9) | Dùng SSE nếu có; không thì chạy theo thời gian ước tính, có nhãn "tạm thời" |
| F5 Chọn kiểu chơi | (không có endpoint đề xuất kiểu chơi) | `POST /games/suggest-types` (2.9) | Tiếp tục dùng `gameTypeSuggestionService` mô phỏng; chờ Q2 |
| F6 Soạn thảo 3 cột | `GET/PUT /games/{id}`, `/media/upload`, `.../regenerate` | – | Xem trước bằng khung + renderer thật (cần P1) |
| F7 Xuất bản | `POST .../publish` | `PUT .../publish-settings` (2.2) | Hộp thoại 3 lựa chọn; "uiOverride, themeId, hạn chơi" chờ API |
| F8 Kết quả | `GET /sessions/{id}/results` | `GET /games/{id}/insights` (2.8) | Mock có nhãn; "Tạo game ôn tập" gửi `reviewFrom` (2.8) |

## 3. Chỗ SPEC hoặc wireframe mâu thuẫn với DSL / contract / code hiện có

Theo SPEC mục 8, các điểm dưới đây cần nhóm xác nhận trước khi làm bước liên quan. Cột "Tạm thời" là cách đi **nếu chưa có trả lời**; không có điểm nào phải sửa DSL.

| # | Mâu thuẫn | Tạm thời |
|---|---|---|
| M1 | **Số renderer.** SPEC P1 chỉ cần QUIZ + MATCHING, P2 "chơi hết một game", nhưng wireframe (Hs-Review có ODD_ONE_OUT, VISUAL_CLOZE) và Bước A8 đề xuất đủ 10 loại; hiện chỉ có 2/10 renderer và 1/10 kiểu học sinh. SPEC không có giai đoạn nào cho 8 renderer còn lại. | Thêm giai đoạn **P2b** (mỗi loại một bước nhỏ). Hỏi nhóm có giới hạn v1 ở 2 loại không (`progress-2026-10-16.md` đã nêu câu này) → Q1 |
| M2 | **Bé "không đếm giờ"** (SPEC 1.10) và "Cho thử lại" (Tv-Play) so với contract: Backend đổi sang `TIMEOUT` khi vượt giờ + 1s; gửi lại cùng câu trả về kết quả cũ, không ghi lần thử mới. SPEC 5.2 lại muốn "lưu cả đáp án sai", "attemptsCount". | Frontend không hiện đồng hồ cho Bé; gửi `timeSpentMs` chặn ở giới hạn; thử lại chỉ ở giao diện. Đề xuất API ở `API-CONTRACT.md` 2.5 |
| M3 | **Ai lo phản hồi đúng/sai.** SPEC mục 3: khung lo phản hồi, renderer gọi `onSubmit(answer)`. Mã hiện có và quy ước CLAUDE.md: renderer ở `play` tự gọi `useFeedback`, nhận `onAnswered` trả `boolean`/`MatchingAnswerResult`. | Giữ renderer hiện có, thêm **adapter** `PlayableRenderer` chuẩn hóa về `onSubmit(answer) → Promise<AnswerResult>`; di chuyển dần phản hồi lên khung (P1.6). Cần xác nhận tách phản hồi khỏi renderer có làm hỏng chơi thử ở editor không → Q9 |
| M4 | **Hai loại mã, một ô nhập.** Hs-Join chỉ có "Mã trò chơi". `shareCode` (SELF) là 6 ký tự chữ-số (ví dụ `A3F9K2`, có thể toàn số); `accessCode` (phòng) là 6 chữ số. Hai mã có thể trùng định dạng. | Hai route riêng (`/play/:shareCode`, `/join/:pin`); ô nhập chung gọi thử `by-code` rồi `shared` (Q3) |
| M5 | **Biệt danh.** Be-Intro không có bước nhập, nhưng `PlayRequest.nickname` bắt buộc (1–20 ký tự). Hs-Nickname có "hình đại diện" (không có trường nào). Hs-Result có "Ong Vàng 27" (biệt danh tự sinh?). | Bé: gửi biệt danh mặc định ("Bé" + số ngẫu nhiên); hình đại diện: bỏ hoặc cục bộ (Q4, Q6) |
| M6 | **Khung phải biết trước khi có `participantId`.** Hs-Nickname hiện môn, lớp, theme, nhưng `SharedGameInfo`/`SessionByCode` không có `metadata`, `uiOverride`, `themeId`. | Cần API (2.1). Tạm: màn biệt danh chỉ hiện tên game |
| M7 | **Hs-Review "Bạn chọn: thỏ"** cần đáp án học sinh đã chọn; chỉ giáo viên đọc được `.../participants/{pid}/interactions`. | Cần API (2.6). Tạm: lưu đáp án đã nộp trong bộ nhớ phiên của trang, mất khi tải lại |
| M8 | **Hs-Result có "kỷ lục cũ", "huy hiệu", "chuỗi 5 câu"** nhưng không có tài khoản học sinh và contract không lưu kỷ lục. | Chuỗi tính tại Frontend; kỷ lục/huy hiệu chỉ cục bộ trên máy hoặc bỏ (Q6) |
| M9 | **Phòng thi đấu đồng bộ theo câu** (Room-Board "Câu tiếp", "Kết thúc câu sớm", đồng hồ chung) so với contract: mỗi học sinh làm nhịp riêng, `getSessionQuestions` trả cả bộ. Tài liệu WebSocket chưa viết. | P5 chờ; mô phỏng cục bộ để dựng giao diện (Q7) |
| M10 | **Top 5, thứ hạng riêng từng máy** (SPEC 1.9) so với `Leaderboard` (không có khối "tôi", không có `limit`; học sinh không được thấy `participantId`). | Cần API (2.7); Frontend cắt top 5 |
| M11 | **Xóa biệt danh không phù hợp** (D1) không có endpoint. | API 2.10 |
| M12 | **F4 có 5 bước, trong đó "Đối chiếu chương trình"** không có chức năng tương ứng ở Backend. SSE spec có 5 `step` khác tên. | Bỏ bước đó cho tới khi được xác nhận (Q10); ánh xạ bước ở `API-CONTRACT.md` 2.9 |
| M13 | **F5 "nội dung 5 câu đã soạn sẵn cho từng kiểu"** (wireframe) nhưng SPEC 5.5 và mục 7.2 ghi chưa chốt; hiện mã chỉ có bước đề xuất mô phỏng. | Giữ bước đề xuất; "Chơi thử" trong F5 chỉ bật khi có bản nháp (Q2) |
| M14 | **"Thời gian và điểm đặt mặc định ở cấp game, câu nào khác mới ghi đè"** (SPEC 1.15, A-Editor "theo mặc định của game"): DSL chỉ có `timeLimitSeconds`/`points` **từng câu**, không có mặc định cấp game, và không đánh dấu câu "đặt riêng". | Chỉ làm ở giao diện: nhập một lần ghi vào mọi câu chưa bị sửa tay trong phiên soạn; không đổi DSL. Cần xác nhận cách coi một câu là "đặt riêng" (Q11) |
| M15 | **Phạm vi lưu trong thông tin xuất bản** (`uiOverride`, `themeId`, hạn, tắt mã) nhưng `PublishResult` chỉ có `shareCode`/`shareUrl`; phiên `SELF` cố định hết hạn sau 24 giờ. | Cần API (2.2); tạm lưu cục bộ cùng nhãn mô phỏng (Q8) |
| M16 | **Bảng token SPEC mục 4** khác `@theme` trong `index.css` (nền, xanh lá, vàng, màu môn, font). | Đổi giá trị ở một chỗ (P3.0); không viết cứng màu. Cần xác nhận hiệu ứng lên khoảng 30 file test chứa chuỗi giao diện cũ |
| M17 | **Đăng nhập Frontend theo contract cũ** (`refreshToken` trong body, `AuthUser.id`); contract mới dùng cookie `HttpOnly`, `teacherId` (CLAUDE.md đã ghi). F9 có "Giữ đăng nhập". | P3.1 chuyển theo contract; "Giữ đăng nhập" cần Backend (Q12) |
| M18 | **Hạn chế hitbox** của MATCHING trên điện thoại 390 px dưới 64 px (đã ghi `progress-2026-10-16.md`) mâu thuẫn trực tiếp với Be-Phone-Play (touch target 64 px, vùng an toàn). | Sửa bố cục trước khi đưa Matching vào khung Bé trên điện thoại (P2.5) |
| M19 | **SPEC mục 12 (bắt buộc xoay ngang)** nhưng ví dụ hiện có `ResponsiveStage` chưa khóa hướng; Safari iOS không có `screen.orientation.lock`. | Màn nhắc xoay dựa vào `matchMedia('(orientation: portrait)')`; thử khóa hướng nếu trình duyệt cho phép; `viewport-fit=cover` + `env(safe-area-inset-*)` |

## 4. Kế hoạch P1 → P5

Quy ước chung cho mọi bước (theo `docs/plan.md`): mỗi bước tối đa khoảng 300 dòng thay đổi (không tính test), TypeScript chặt không `any`, dùng token không viết cứng màu, mọi hành động có thể lỗi phải có trạng thái lỗi + nút thử lại, mock có nhãn "Dữ liệu mô phỏng", test chạy `npm test`, cuối bước chạy `tsc -b`, `oxlint`, `npm run build`. Mỗi bước xong dừng chờ "duyệt". Không thêm thư viện ngoài mục 5; sau mỗi bước ghi một dòng vào `ai-usage-log.md`, chạy `reviewer` + `test-verifier` (theo bảng định tuyến trong CLAUDE.md).

### P1: Nền tảng player (SPEC mục 3)

| Bước | Việc | Test |
|---|---|---|
| P1.1 | **Token dùng chung cho player**: biến CSS trong `src/player/theme/tokens.css` (màu học sinh tạm xanh dương `#1F5BD8`, cam `#FF9F1C` đúng wireframe, đặt tên theo vai trò để đổi một chỗ); đọc cho Konva qua hàm `readToken()` | Test hàm đọc token; test không có màu hex nằm ngoài file token trong `src/player/` (quét mã nguồn) |
| P1.2 | `profile/types.ts`, `profiles.ts`, `resolveUiProfile.ts`: `be` cho `KINDERGARTEN`, `GRADE_1`; `hocSinh` cho còn lại; thứ tự ưu tiên ghi đè của giáo viên → `gradeLevel` → mặc định; thiếu/lạ → mặc định có cảnh báo | Bảng test: 6 `gradeLevel` × 3 giá trị `uiOverride` × thiếu metadata |
| P1.3 | `UiProfileContext.tsx` + `useUiProfile()` | Render trong Provider, ngoài Provider báo lỗi rõ |
| P1.4 | **Kiểu dữ liệu học sinh cho cả 10 loại** (mở rộng `game-student.types.ts`, đúng bảng `API-CONTRACT.md` 2.3, không sửa `game-dsl.types.ts`) và kiểu `AnswerPayload`/`AnswerResult` theo từng loại | Kiểm tra kiểu lúc build (`tsc -b`); test fixtures khớp kiểu |
| P1.5 | **Lớp dữ liệu player + mô phỏng** (`services/playService.ts` + `services/mock/mockPlay.ts`, nhóm `sessions`): `getSharedGame`, `startSelfPlay`, `getQuestions`, `submitInteraction`, `getMyResult`. Mô phỏng tách đáp án khỏi game đầy đủ (dùng `gameFixtures.ts`), xáo xác định, chấm theo bảng 2.4, gửi lại cùng câu trả cùng kết quả | Test **không có khóa [ĐA]** trong JSON học sinh cho cả 10 loại; test chấm đúng/sai mỗi loại; test gửi lại không cộng điểm hai lần; test lỗi 404/409 |
| P1.6 | **Hợp đồng khung ↔ renderer**: `PlayableRenderer` (adapter đưa `QuizRenderer`, `MatchingRenderer` về `onSubmit(answer) → Promise<AnswerResult>`), registry theo `gameType` (đa hình, không `switch`). Không đổi hành vi chơi thử ở editor | Test các kiểu adapter; test editor chơi thử còn xanh (`WorkspaceEditorPlay.test.tsx`) |
| P1.7 | `shells/BeShell.tsx`, `StudentShell.tsx` (bố cục theo wireframe Be-Play, Hs-Play: tiêu đề tiến độ, vùng game, thanh phản hồi, chỗ chừa nhân vật), `policies/feedback.ts` (`garden` không điểm, `score`), `policies/interaction.ts` | Test thuần cho chính sách; test render hai shell (jsdom, không Canvas) |
| P1.8 | `theme/` registry bản đầu: chọn theo loại game + môn, nhân vật dùng biểu tượng nền tảng (SVG nội tuyến) với các trạng thái chào, nói, hỏi, vui, an ủi, ăn mừng | Test chọn theme và dự phòng |
| P1.9 | `pages/PlayPage` (`/play/:shareCode`): máy trạng thái bằng reducer thuần (đang tải → giới thiệu → chơi → xong / lỗi), lazy route ngoài `ProtectedRoute`; `sessionStorage` giữ `sessionId`/`participantId` để nối lại | Test reducer duyệt mọi chuyển trạng thái; test route lazy |
| P1.10 | QUIZ và MATCHING chơi trọn một game trong **cả hai khung** với dữ liệu mô phỏng | Test tích hợp; mở trình duyệt thật (viewport điện thoại và máy tính bảng) |

Xong khi: QUIZ và MATCHING chơi được trong cả hai khung, JSON học sinh mô phỏng không lộ đáp án.

### P2: Chơi cá nhân (nhóm B, C, E)

| Bước | Việc | Test |
|---|---|---|
| P2.1 | Hs-Join + Hs-Desk-Join (một ô nhập, phím Enter), `/join`; xử lý hai loại mã (M4) | Test phân loại mã; test mã sai 404 |
| P2.2 | Hs-Nickname + Hs-Intro + Be-Intro: kiểm biệt danh (1–20 ký tự, hiện thông báo từ cấm lấy từ lỗi 422), biệt danh mặc định cho Bé | Test kiểm hợp lệ NFC/NFD như form QUIZ |
| P2.3 | Hs-Result, Be-Result, Be-Phone-Result, lời nhắn phụ huynh, khóa phụ huynh nhấn giữ 3 giây | Test hàm dựng lời nhắn; test khóa giữ 3 giây (giả lập thời gian) |
| P2.4 | Hs-Review (cần dữ liệu đã nộp, M7) | Test lọc "Câu sai" |
| P2.5 | Trạng thái lỗi bắt buộc (SPEC mục 2): mã sai, hết hạn/tắt/chưa xuất bản, phòng đóng/đã bắt đầu/đầy, mất mạng giữa chừng, âm thanh bị chặn ("chạm để bắt đầu"), máy dọc khi cần ngang; **sửa vùng chạm MATCHING trên 390 px** (M18) | Test thuần cho bố cục mọi tổ hợp (không đè, ≥ 64 px); test tự nối lại |
| P2.6 | Điện thoại cho Bé: màn xoay máy, vùng an toàn (`viewport-fit=cover` trong `index.html`), Be-Phone-Play | Test màn xoay theo `matchMedia` giả lập |
| P2.7 → P2.14 (**P2b**) | Renderer 8 loại còn lại, **mỗi loại một bước**: AUDIO_VISUAL_MATCH, ODD_ONE_OUT, SPOT_THE_TARGET, WORD_SCRAMBLE, MEMORY_CARD, DRAG_DROP, ORDERING, VISUAL_CLOZE. Mỗi bước: kiểu học sinh, bố cục thuần, reducer, renderer với `mode`, nộp **một lần** với loại nhiều phần tử (MATCHING, MEMORY_CARD, DRAG_DROP), phản hồi nhẹ nhàng, nút nghe lại, hỗ trợ bàn phím | Mỗi loại: test bố cục duyệt mọi tổ hợp, test reducer, test trong khung; dùng lại mẫu `computeQuizLayout`/`computeMatchingLayout` |

Xong khi: chơi hết một game trên điện thoại, máy tính bảng và máy tính, đủ trạng thái lỗi. P2b có thể chạy song song với P3 vì không dùng chung file; nếu nhóm giới hạn v1 (Q1) thì bỏ hoặc hoãn P2b.

### P3: Giao diện giáo viên mới F1–F10

| Bước | Việc | Test |
|---|---|---|
| P3.0 | Token "Lớp học ấm áp" thay giá trị `@theme`, font Baloo 2 + Nunito tự host (cần duyệt, mục 5); thử dấu tiếng Việt trước khi chốt (SPEC mục 4) | Sửa các test chứa chuỗi/lớp giao diện cũ; test không còn màu viết cứng trong trang giáo viên |
| P3.1 | F9 Đăng nhập và F10 Đăng ký (độ mạnh mật khẩu, "Cô dạy cấp nào?" chỉ khi Backend sẵn sàng); chuyển sang cookie/`teacherId` (M17); ẩn "Quên mật khẩu" | Cập nhật `LoginPage.test`, `RegisterPage.test`; test ẩn liên kết |
| P3.2 | `AppLayout` mới (thanh điều hướng Trang chủ / Trò chơi của tôi / Kết quả) | `teacherUi.test.tsx` |
| P3.3 | F2 Kệ trò chơi: ảnh bìa theo môn, lọc màu, nút chính theo trạng thái ("Trình chiếu"/"Soạn tiếp") | Cập nhật `MyGamesPage.test` |
| P3.4 | F3 Tạo game: chọn môn/khối dạng nút, gợi ý theo môn và khối, đính kèm giáo án | Cập nhật `CreateGamePage*.test` |
| P3.5 | F4 Tiến trình 5 bước (bỏ bước chưa có thật, M12), thanh tiến độ, nút Hủy; SSE khi Backend có, ngược lại theo thời gian ước tính | Test ánh xạ `step` → hiển thị; test Hủy |
| P3.6 | F5 Chọn kiểu chơi: 3 đề xuất có lý do và "Phù hợp nhất" | Test sắp xếp/đánh dấu |
| P3.7 | F6 Soạn thảo 3 cột: danh sách câu, form gọn, xem trước bằng khung + renderer thật có đổi thiết bị (Tivi / Máy tính bảng / Điện thoại), tự lưu và bỏ nút "Lưu bản nháp", mặc định thời gian/điểm ở cấp game (M14). **Tách thành các bước nhỏ** vì `WorkspaceEditor` đã 563 dòng | Giữ xanh 17 file `WorkspaceEditor*.test.tsx`; thêm test tự lưu |
| P3.8 | F7 Xuất bản: hộp thoại 3 lựa chọn, mã/QR/link, in phiếu QR, tùy chọn giao diện/chủ đề/hạn chơi | Cập nhật `WorkspaceEditorPublish.test` |
| P3.9 | F8 Kết quả + "Cần ôn lại" + nút "Tạo game ôn tập" | Test tính `needsReview` ở dữ liệu mô phỏng |
| P3.10 | F1 Trang chủ: ô mô tả nhanh, "Đang diễn ra", "Lớp mình cần ôn lại", soạn dở | Cập nhật `Dashboard.test` |
| P3.11 | Các form sửa tay còn thiếu (SPOT_THE_TARGET, DRAG_DROP, ORDERING) trong kiểu mới (nếu nhóm vẫn muốn) | Theo mẫu form hiện có |

Xong khi: thay hết giao diện cũ, F6 xem trước bằng renderer thật, F7/F8 chạy bằng mô phỏng có nhãn.

### P4: Trình chiếu trên lớp (nhóm A)

| Bước | Việc | Test |
|---|---|---|
| P4.1 | Route giáo viên `/present/:gameId`, `PresentShell` (1280×720, thanh điều khiển dưới màn hình tự ẩn sau 3 giây) | Test hook tự ẩn (giả lập thời gian) |
| P4.2 | Tv-Lobby: toàn màn hình (Fullscreen API), kiểm tra âm thanh, Space bắt đầu | Test phím tắt |
| P4.3 | Tv-Play: câu trước/sau (← →), đọc lại (R), cho thử lại, gợi ý, tạm dừng, kết thúc; renderer ở `mode: 'preview'` (Q5) | Test reducer điều khiển |
| P4.4 | Tv-Result: kết quả cả lớp, không điểm từng bé | Test không hiển thị điểm cá nhân |

Xong khi: giáo viên chạy hết một game trên tivi bằng chuột/bàn phím.

### P5: Thi đấu theo phòng (nhóm D)

Phụ thuộc: spike WebSocket và tài liệu Message Format của Backend (chưa có).

| Bước | Việc | Test |
|---|---|---|
| P5.1 | Kiểu thông điệp theo tài liệu WebSocket khi có; bus mô phỏng cục bộ để dựng giao diện | Test kiểu |
| P5.2 | Thư viện thời gian thực (`@stomp/stompjs` + `sockjs-client`, trong danh sách đã duyệt, cần cài) bọc sau một interface để mock | Test với client giả |
| P5.3 | Tivi D1–D4: phòng chờ (xóa biệt danh), đang trả lời, top 5, bục vinh danh | Test top 5, xếp hạng hòa |
| P5.4 | Máy học sinh D5–D7: chờ, sau mỗi câu, kết thúc (hạng chỉ hiện trên máy mình) | Test không lộ `participantId` |
| P5.5 | Mất mạng, kết nối lại, giữ `participantId` | Test nối lại |

Xong khi: phòng 30 máy chạy ổn định (Frontend không tự kiểm được, cần Backend; xem Q7).

### Thứ tự và phụ thuộc
P1 → P2 (P2b song song với P3) → P4 (cần P1). P3.7 cần P1.10 (xem trước bằng renderer thật). P5 cuối. P3.0 (token, font) nên làm sớm vì mọi bước giáo viên sau đều dựa vào.

## 5. Thư viện, font, asset nghĩ là cần (CHƯA cài, cần duyệt)

| Mục | Dùng cho | Tên / phiên bản | Giấy phép | Dung lượng | Ghi chú |
|---|---|---|---|---|---|
| Font tiêu đề | Baloo 2 (SPEC mục 4) | `@fontsource/baloo-2` 5.3.0 (lấy file woff2 subset `latin` + `vietnamese`, tự host) | SIL OFL 1.1 | Chưa đo; sẽ đo khi cài | Thử dấu tiếng Việt trước khi chốt |
| Font nội dung | Nunito 600–900 | `@fontsource-variable/nunito` 5.3.0 (subset `latin` + `vietnamese`) | SIL OFL 1.1 | Chưa đo | Có thể cần ba cỡ chữ riêng cho Bé |
| Thời gian thực | P5 | `@stomp/stompjs` 7.5.0, `sockjs-client` 1.6.1 | Đã nằm trong danh sách đã duyệt sẵn của CLAUDE.md (kiểm lại giấy phép khi cài) | Chưa đo | Chỉ cài ở P5 |
| Quét QR trong trang (tùy chọn) | Hs-Join "Quét mã QR" | `jsqr` 1.4.0 | Apache-2.0 | ~280 KB chưa nén (gói `npm`); dự phòng khi `BarcodeDetector` không có | **Không bắt buộc**: QR là liên kết mở bằng ứng dụng máy ảnh. Ưu tiên `BarcodeDetector` có sẵn của trình duyệt, chỉ cài `jsqr` nếu nhóm muốn (Q13) |
| Nhân vật / theme | Linh vật theo theme (SPEC 1.5) | Chưa có; dùng SVG nội tuyến làm chỗ chừa | Cần nhóm quyết định nguồn (tự vẽ, hay bộ minh họa có giấy phép) | – | Q14 |
| Âm thanh | Đúng/sai/chạm/ăn mừng | Hiện có `correct.wav`, `try-again.wav`, `pair-matched.wav` là âm bíp tạm | Cần nguồn CC0 hoặc tự tạo cho bản thật | – | Giữ quy ước phản hồi nhẹ nhàng, không âm phạt |
| Không cần cài | Toàn màn hình, khóa hướng, in phiếu QR, lưu tạm | Fullscreen API, `screen.orientation`, `window.print()`, `sessionStorage` | – | 0 | Dùng sẵn của trình duyệt |

Các thư viện đã cài và đủ dùng: `canvas-confetti`, `howler`, `konva`, `react-konva`, `use-image`, `qrcode.react` (4.2.0 ghim); không cần thêm thư viện state, kéo thả, hay hoạt hình.

## 6. Câu hỏi cần nhóm trả lời

1. **Giới hạn v1**: có bắt buộc đủ 10 loại game cho học sinh, hay chỉ QUIZ + MATCHING và giới hạn bộ đề xuất kiểu chơi theo renderer đã có (M1)? Quyết định này làm P2b có hay không (8 bước).
2. **F5**: soạn sẵn nội dung cho cả 3 kiểu (gấp 3 lượt AI), hay chỉ đề xuất rồi soạn sau? Wireframe vẽ theo phương án đắt.
3. **Mã vào game**: tách hai đường (`/play/{shareCode}` cho tự luyện, `/join/{pin}` cho phòng), hay Backend đổi để hai loại mã không thể trùng định dạng?
4. **Bé trên `SELF`**: gửi biệt danh mặc định tự sinh (ví dụ "Bé 4821") có chấp nhận được, hay thêm một bước hỏi phụ huynh? Hình đại diện (Hs-Nickname) và biệt danh tự sinh (Hs-Result) lấy ở đâu?
5. **Trình chiếu trên lớp** (P4): chạy cục bộ ở máy giáo viên (renderer `preview`, tự so đáp án, không lưu gì) có đủ? Hay phải tạo phiên thật để có số liệu "Lớp mình cần ôn lại" từ buổi trình chiếu?
6. **Huy hiệu, kỷ lục, chuỗi đúng** (Hs-Result): bỏ khỏi v1, hay giữ cục bộ trên máy (mất khi đổi máy)?
7. **Phòng thi đấu** (D): đồng bộ theo câu do giáo viên điều khiển (như wireframe) hay nhịp riêng từng bạn (như contract hiện tại)? Ai viết tài liệu WebSocket và khi nào? Ai chịu kiểm thử 30 máy?
8. **Hạn chơi** (F7): phiên `SELF` hết hạn sau 24 giờ cố định (spec hiện tại) hay theo `expiresAt` của thông tin xuất bản?
9. **Phản hồi đúng/sai**: chuyển hẳn từ renderer lên khung (như SPEC mục 3), hay giữ renderer tự phản hồi và khung chỉ tổng hợp (như mã hiện có)? Chuyển sẽ đụng chơi thử ở editor.
10. **F4 "Đối chiếu chương trình"**: có chức năng này không? Nếu không, bỏ khỏi giao diện (Frontend không tự bịa bước).
11. **Mặc định thời gian/điểm cấp game** (M14): DSL không có chỗ lưu. Chấp nhận chỉ là thao tác nhập hàng loạt ở giao diện (ghi vào từng câu)?
12. **"Giữ đăng nhập trên máy này"** (F9): thời hạn cookie refresh do Backend quyết; có làm không?
13. **Quét QR trong trang**: có cần không, hay chỉ cần mã/liên kết/QR mở bằng máy ảnh? (quyết định có cài `jsqr`).
14. **Nhân vật theo theme**: nguồn hình (tự vẽ hay bộ có giấy phép), và có cần tối thiểu bao nhiêu theme cho v1?
15. **Ai phụ trách `/play/:shareCode` và `src/games/`** (SPEC mục 7.4), để tránh hai người cùng sửa renderer?
16. **Màu phía học sinh**: giữ xanh dương tạm như wireframe cho tới đợt sau (SPEC mục 1: làm sau) — xác nhận vì ảnh hưởng token ở P1.1.
17. **Giới hạn phần tử cho Mầm non trên điện thoại** (SPEC 7.3, ví dụ MEMORY_CARD 16 thẻ): renderer tự chia trang hay Backend giới hạn khi sinh?
18. **Sửa test giao diện cũ**: P3 phải sửa nhiều test trang (khoảng 30 file) vì đổi chữ/lớp CSS; chấp nhận tách mỗi bước một lượt sửa test cùng lượt?

## 7. Rủi ro chính

- **Không có Backend thật** cho mọi thứ ngoài đăng nhập: mọi kiểm chứng "chấm ở máy chủ, không lộ đáp án" chỉ là trên mô phỏng; rủi ro hiểu nhầm hành vi thật (như 409 khi xuất bản).
- **Số lượng việc ở P2b** (8 renderer Canvas) và **`WorkspaceEditor` 563 dòng** là hai nút thắt về khối lượng; nên tách nhỏ và dừng sau mỗi bước.
- **Chưa kiểm chứng trên thiết bị thật** (điện thoại, iPad, tivi): `ResponsiveStage` và vùng chạm mới chỉ có test thuần; cần máy thật hoặc `canvas-ux-checker` khi nhóm yêu cầu.
- **Hai hướng đồng bộ phòng thi đấu** chưa chốt (Q7) có thể buộc làm lại P5.
- **Thông số trẻ nhỏ** (cỡ chữ, vùng chạm, `hintAfterMs`) chỉ là mặc định để thử, chưa kiểm chứng với trẻ (SPEC mục 3).
- **Dữ liệu mô phỏng phía giáo viên còn trong bản build thật** (nợ, để sau): phía học sinh đã chặn (`getPlayerApi` import động, PROD luôn dùng API thật), nhưng `src/main.tsx` import tĩnh `services/mock/mockRuntime` và `WorkspaceEditor.tsx` import tĩnh `mockGames`, nên bộ game mẫu (có đáp án) vẫn nằm trong bundle. Sửa: import động sau điều kiện `!import.meta.env.PROD`, thêm kiểm tra bundle không chứa chuỗi mẫu.

## 8. Điều chưa kiểm tra trong lượt khảo sát này

- Chưa mở ảnh PNG wireframe (không có); đọc nội dung chữ trong `.dc.html` thay cho bản vẽ; một số chi tiết bố cục (khoảng cách, màu) chưa đối chiếu từng điểm với token.
- Chưa chạy `npm test`, `tsc`, `oxlint`, hay mở ứng dụng; số liệu mô tả mã đến từ đọc tệp.
- Chưa đo dung lượng font; số liệu `jsqr` lấy từ `npm view` (dung lượng chưa nén của gói).
- `docs/openapi/openapi.yaml` đọc các phần liên quan học sinh/phiên/xuất bản; chưa đọc hết phần Admin (ngoài phạm vi).
