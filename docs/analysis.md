# Phân tích: hoàn thiện giao diện giáo viên theo SRS

Ngày: 2026-10-14. Giai đoạn 1 (chỉ đọc, chưa sửa mã). Tài liệu này là đầu vào cho `docs/plan.md` và `docs/decisions.md`.

## 0. Nguồn và phạm vi

- **Nguồn sự thật:** `docs/SRS.docx` (bản cập nhật ngày 2026-10-14, đã thay bản cũ), các file trích `docs/srs/UC-01..15.md`, `docs/srs/FR-summary.md`, `docs/srs/NFR.md`, và contract `docs/openapi/openapi.yaml`.
- **Lưu ý:** bảng trường giao diện **FLD-01 đến FLD-30** (mục 3.1.4) và mục KPI chỉ có trong `SRS.docx`, **không** nằm trong các file `docs/srs/*.md` (script trích chỉ lấy UC, FR và NFR). Phân tích này đọc FLD trực tiếp từ docx.
- **Thay đổi của SRS mới so với bản cũ** (đã so từng dòng, 8 vùng khác biệt, gom lại thành 3 nhóm):
  1. UC-02 và bước 1, 2 của quy trình AI: **Thể loại trò chơi là tùy chọn**; nếu giáo viên không chọn, hệ thống đề xuất **2 đến 3 thể loại** kèm lý do sư phạm ngắn, giáo viên **chọn một** hoặc tự chọn loại khác (luồng 4c, FLD-15 đổi từ "Có" sang "Không").
  2. Cơ chế kiểm tra 3 lớp được mô tả là **rule-based** (validator quyết định đúng/sai, không để LLM tự phán định), tối đa 3 lần gọi tính cả lần đầu (TS-02).
  3. KPI-01: mô tả đối chứng thủ công đổi từ "soạn thảo, cắt ảnh, kéo thả" sang "chọn mẫu, nhập từng câu, chèn ảnh trên PPT/Wordwall/Kahoot/H5P".
- **Trong phạm vi task:** A (Workspace Editor: UC-03/04/05/06), B (xuất bản và chia sẻ: UC-07), C (phòng Live Arena phía giáo viên: UC-09 phần giáo viên), D (xem kết quả chơi).
- **Ngoài phạm vi:** backend thật, game engine Canvas/Konva, giao diện học sinh, giao diện admin.

## 1. Hiện trạng kỹ thuật (frontend)

| Hạng mục | Hiện trạng |
|---|---|
| Khung | React 19, Vite 8, TypeScript 6 (strict), Tailwind v4 (`@tailwindcss/vite`), oxlint, Vitest + Testing Library (jsdom) |
| Định tuyến | `react-router-dom` v7; `App.tsx` dùng `lazy` + `Suspense`; `ProtectedRoute` + `AppLayout` (sidebar từ `lg`, thanh dưới ở điện thoại); đường dẫn ở `routes/paths.ts`: `dashboard`, `createGame`, `workspace`, `workspaceEditor` (`/workspace/editor?gameId=`), `login`, `register` |
| State | `AuthContext` (Context API); `useState`/`useReducer` cục bộ; `@tanstack/react-query` chỉ cho dữ liệu từ API (`useGames`, `useMutation` cho đề xuất loại game). CLAUDE.md cấm thêm thư viện state |
| Gọi API | `api/axiosInstance.ts` (gắn token, xử lý 401); `api/gamesApi.ts` chỉ có `getGames`. **Chưa có** `getGame`, `updateGame`, `publishGame`, `regenerate*`, `uploadMedia`, `createSession`, `session*`, `results` |
| Mock hiện có | `services/gameTypeSuggestionService.ts` (đề xuất loại game, trễ 1 giây), `utils/lessonContext.ts`, `utils/topicSuggestions.ts`. **Chưa có** cờ `USE_MOCK` và chưa có nhãn "Dữ liệu mô phỏng" |
| Design tokens | `index.css` `@theme`: `paper`, `ink`, `ink-soft`, `brand`, `brand-strong`, `brand-soft`, `sun`, `sun-soft`, bộ màu môn (`math`, `viet`, `eng`); vòng focus 3px; hoạt ảnh `.page-in` tắt khi `prefers-reduced-motion` |
| Chuỗi tiếng Việt | Tập trung ở `constants/viText.ts` và `constants/labels.ts` (nhãn enum, có dự phòng cho giá trị lạ); lỗi API ở `constants/errorMessages.ts` + `utils/apiError.ts` |
| Test | Vitest + jsdom, 448 test; helper `test/renderWithApp.tsx` (`renderWithProviders`, `loginAsTeacher`, `makeGame`); timeout test 20 giây |
| Thư viện đã cài | axios, react-query, react-router-dom, konva, react-konva, use-image, howler, canvas-confetti |
| Thư viện được CLAUDE.md duyệt sẵn nhưng **chưa cài** | `qrcode.react`, `@stomp/stompjs`, `sockjs-client` |
| Backend (theo `x-status`) | Chỉ `auth/refresh` và `auth/logout` là `implemented`; đăng nhập, đăng ký là `extended-pending`; **mọi endpoint về game, phiên, kết quả đều `planned`** |

## 2. Tái sử dụng được và còn thiếu

### Tái sử dụng được

- **Khung và thành phần dùng chung:** `AppLayout`, `Button`, `ButtonLink`, `buttonStyles`, `ErrorNotice`, `LoadingSpinner`, `FormField`, `formStyles`, `Icon` (thiếu vài biểu tượng, xem dưới), `FileDropZone`, `PasswordInput`, `GameCard`, `GameTypeCover` (10 hình), `SubjectCover`, `LetterTiles`.
- **Hook:** `useAuth`, `useGames`, `usePageTitle`, `useCopyToClipboard` (dùng cho sao chép ShareCode, URL), `useGameTypeSuggestions`, `useLessonContext`.
- **Kiểu và nhãn:** `types/game-dsl.types.ts` (đủ kiểu `GameDsl`, `QuestionDsl` cho 10 loại), `labels.ts` (nhãn loại game, môn, khối, trạng thái), `relativeTime`.
- **Renderer thật (đã có chế độ `preview` | `play` | `review`):** `QuizRenderer`, `MatchingRenderer` cùng `games/common/*`. Đây là thứ để làm "Chơi thử" (UC-03) cho **2 trong 10 loại**.
- **Mẫu mock tách service:** cách `gameTypeSuggestionService` được viết (hàm thuần + hàm async có độ trễ + test) là mẫu để làm các service mock còn lại.
- **Test:** helper render, `makeGame`.

### Còn thiếu

| Nhóm | Thiếu |
|---|---|
| Nền tảng | Cờ `USE_MOCK` (biến môi trường, cập nhật `.env.example`); nhãn "Dữ liệu mô phỏng"; kho mock trong bộ nhớ có dữ liệu mẫu cho cả 10 loại game; lớp service có cùng chữ ký với API thật (`getGame`, `updateGame`, `publishGame`, `regenerateQuestion`, `regenerateGame`, `uploadMedia`, `createSession`, `getSession`, các lệnh điều khiển phòng, `getSessionResults`, `getParticipantInteractions`, `listGameSessions`); kiểu cho `GameResponse`, `PublishResult`, `Session*`, `Leaderboard*` |
| A | Màn hình soạn thảo 2 khung (danh sách câu ở trái, chơi thử ở phải); trạng thái chỉnh sửa (đang sửa, chưa lưu); hàm kiểm tra dữ liệu theo từng loại (chế độ lưu nháp và chế độ xuất bản); form sửa từng loại câu hỏi; tải ảnh/âm thanh lên; hộp thoại "Yêu cầu AI làm lại" (một câu, cả game); sao lưu nháp vào trình duyệt khi mất mạng (NFR-03); màn hình tổng kết chơi thử "không lưu kết quả" |
| B | Hộp thoại xuất bản (ShareCode, URL, sao chép); mã QR (cần `qrcode.react`); soạn tin cho phụ huynh; tạo phiên Live (tên, SOLO/TEAM, số người tối đa, số đội) |
| C | Trang chủ phòng (PIN lớn, QR, trạng thái, danh sách học sinh); máy trạng thái phòng (WAITING/ACTIVE/PAUSED/CLOSED) và các nút điều khiển; bảng xếp hạng thời gian thực; huy hiệu kết nối (FLD-24); cổng realtime có thể thay mock bằng STOMP thật |
| D | Trang kết quả phiên; bảng học sinh; thống kê câu sai nhiều; chi tiết từng học sinh; lối vào từ thẻ game và danh sách phiên |
| Chung | Biểu tượng mới (`play`, `qr`, `trash`, `plus`, `users`, `trophy`, `refresh`, `wifi`...); chuỗi tiếng Việt trong `viText` cho từng màn hình; test cho mọi hàm kiểm tra |

## 3. Bản đồ yêu cầu

| Nhóm | UC | FLD | Contract (`x-status` đều `planned`) |
|---|---|---|---|
| A. Soạn thảo | UC-03 chơi thử, UC-04 soạn thảo, UC-05 sửa tay, UC-06 AI làm lại | FLD-05 nội dung câu (tối đa 500 ký tự), FLD-06 đáp án (2 đến 4, đúng 1), FLD-07 thời gian (10 đến 120 giây, mặc định 30), FLD-11 ảnh (JPG/PNG/WebP, tối đa 5MB), FLD-12 giọng đọc Nam/Nữ, FLD-13 giải thích (dự kiến schema 1.1.0), FLD-14 nút tạo lại | `GET/PUT /games/{id}`, `POST /games/{id}/regenerate`, `POST /games/{id}/questions/{qid}/regenerate`, `POST /media/upload` |
| B. Xuất bản | UC-07 | FLD-30 | `POST /games/{id}/publish` (trả `shareCode` 6 ký tự, `shareUrl`) |
| C. Live Arena (giáo viên) | UC-09 (phía giáo viên) | FLD-08 PIN 6 chữ số, FLD-19 bảng xếp hạng, FLD-20 trạng thái phòng, FLD-24 trạng thái kết nối | `POST/GET /games/{id}/sessions`, `POST /sessions/{id}/start|pause|resume|close`, `GET /sessions/{id}`, `GET /sessions/{id}/leaderboard`; WebSocket STOMP `/ws/live-arena`, tài liệu message format **chưa viết** |
| D. Kết quả | (không có UC riêng cho giáo viên) | FLD-16 điểm và thời gian | `GET /sessions/{id}/results`, `GET /sessions/{id}/participants/{pid}/interactions` (ghi "Đề xuất, chưa được xác nhận riêng") |

## 4. Điểm mơ hồ hoặc mâu thuẫn, kèm đề xuất mặc định

Cột "Cần bạn xác nhận" đánh dấu những điểm ảnh hưởng thiết kế. Phần còn lại tôi sẽ làm theo mặc định và ghi vào `docs/decisions.md`.

| # | Điểm | Chi tiết | Đề xuất mặc định | Cần bạn xác nhận |
|---|---|---|---|---|
| 1 | **Số lượng đề xuất loại game và cách chọn** | SRS mới (UC-02 4c, FLD-15): đề xuất **2 đến 3** loại, giáo viên chọn **một**. Giao diện hiện có (theo yêu cầu thầy hướng dẫn): **3 đến 5** loại, chọn **nhiều, tối đa 3** và tạo nhiều game một lần | Giữ giao diện hiện có (hằng số `SUGGESTION_MAX`, `MAX_GAMES_PER_REQUEST` đổi được một chỗ). Ghi nhận để cập nhật SRS cho khớp, hoặc đổi giao diện về 2–3 và chọn một nếu SRS là chuẩn | **Có** |
| 2 | **Khối lớp, môn học bắt buộc hay không** | SRS (FLD-01, FLD-02 "Có"; UC-02 bước 3 "thông số bắt buộc") và `openapi.yaml` (`required: [subject, gradeLevel]`) bắt buộc. Giao diện hiện để tùy chọn (AI đoán) theo yêu cầu gần đây | Giữ tùy chọn ở giao diện (đã ghi chú lệch contract trong `generateRequest.ts`); **không** gọi API thật bằng yêu cầu thiếu hai trường này. Cần nhóm thống nhất sửa SRS và `openapi.yaml` | **Có** |
| 3 | **"Chọn chế độ LIVE hoặc SOLO" khi xuất bản** | SRS không có lựa chọn này lúc xuất bản. Xuất bản chỉ cấp ShareCode, URL, QR cho **tự luyện** (phiên `SELF`, UC-08). Phòng Live là bước **riêng** do giáo viên tạo từ game đã xuất bản, có kiểu `SOLO` (cá nhân) hoặc `TEAM` (nhóm) (UC-09, `createSession`) | Sau khi xuất bản, hộp thoại hiện hai lối: **"Cho học sinh tự luyện"** (ShareCode, URL, QR; phiên SELF) và **"Mở phòng Live"** (chọn `SOLO` hoặc `TEAM`). Hiểu "LIVE hoặc SOLO" của bạn là hai lối này | **Có** |
| 4 | **Soạn tin gửi phụ huynh** | SRS không đề cập (FLD-30 chỉ là nút xuất bản). Không có contract | Chỉ soạn **văn bản mẫu có thể sửa** (tên game, link, mã) kèm nút sao chép; **không gửi** đi đâu và không lưu thông tin phụ huynh (NFR-02: không lưu PII). Đánh dấu là tính năng ngoài SRS | Không |
| 5 | **"Xem kết quả chơi", thống kê câu sai nhiều** | Không có UC cho giáo viên. `SessionResults` có điểm, số đúng/sai/hết giờ từng học sinh, **không** có thống kê theo câu. Chi tiết từng câu nằm ở `participants/{id}/interactions` (đề xuất, chưa xác nhận) | Mock tự tính tỉ lệ sai từng câu từ các lượt trả lời; ghi rõ cần backend thêm trường thống kê theo câu (hoặc chấp nhận gọi nhiều lần). Gắn nhãn "Dữ liệu mô phỏng" | **Có** (cần thêm vào contract?) |
| 6 | **Chơi thử cho 8 loại game chưa có renderer** | Chỉ có `QuizRenderer` và `MatchingRenderer`; engine Canvas ngoài phạm vi | Chơi thử thật cho QUIZ và MATCHING; 8 loại còn lại hiện khung nói rõ "chưa hỗ trợ xem thử" kèm bản xem trước dạng chữ của nội dung câu. Không giả lập. Khi renderer mới có, chỉ cần đăng ký thêm vào một bảng ánh xạ | Không |
| 7 | **Phạm vi form soạn tay** | Có 10 loại, mỗi loại cấu trúc khác (cặp, bước thứ tự, vùng thả, vùng chạm trên ảnh...). Làm hết sẽ rất lớn | Làm đầy đủ cho **QUIZ** (FLD-05/06/07) và **MATCHING** (hai loại có renderer); với loại khác sửa được các trường chung (thời gian, điểm, lời đọc, ảnh) và xem nội dung. Các form loại còn lại để subtask tùy chọn sau khi bạn duyệt | **Có** |
| 8 | **Giới hạn dữ liệu: SRS và DSL không khớp** | SRS: câu hỏi tối đa **500** ký tự, thời gian **10 đến 120** giây, đáp án **2 đến 4**. DSL schema (đã đóng băng): câu hỏi tối đa **200**, thời gian **5 đến 600**, điểm **1 đến 100**, 1 đến 20 câu, 2 đến 4 đáp án | Dùng **giao của hai bên** (khắt khe hơn): câu hỏi ≤ 200, thời gian 10 đến 120, điểm 1 đến 100, đáp án 2 đến 4. Ghi quyết định; đề nghị nhóm sửa SRS cho khớp | Không |
| 9 | **FLD-13 Khối giải thích** | Ghi "dự kiến schema 1.1.0" trong khi DSL đang đóng băng 1.0.0 (không có trường này) | **Bỏ qua**, không làm; ghi vào danh sách hoãn | Không |
| 10 | **Lưu nháp vào trình duyệt** | NFR-03 yêu cầu lưu nháp vào LocalStorage khi mất mạng. CLAUDE.md: không thao tác `localStorage` ngoài `AuthContext` (quy định cho phiên đăng nhập) | Tạo **một** tiện ích riêng `draftStorage` chỉ cho bản nháp trình soạn thảo (khóa theo `gameId`, xóa khi lưu thành công). Ghi quyết định | Không |
| 11 | **Quyền khóa khi có phiên đang chạy** | Contract: sửa, xóa, làm lại game bị `409 CONFLICT` nếu còn phiên `WAITING/ACTIVE/PAUSED` | Giao diện bắt mã 409, báo "Game đang có phòng chơi chưa kết thúc" kèm lối sang phòng đó; mock mô phỏng được tình huống này | Không |
| 12 | **Chia đội trong TEAM** | SRS có 3 cách: ngẫu nhiên (mặc định), giáo viên xếp tay, học sinh tự chọn | Hỗ trợ **ngẫu nhiên** trước; hai cách còn lại ghi hoãn (cần giao diện học sinh để có nghĩa) | Không |
| 13 | **WebSocket** | Tài liệu message format **chưa viết**; `@stomp/stompjs`, `sockjs-client` chưa cài | Viết **giao diện cổng realtime** (`LiveArenaGateway`) với bản mock (hẹn giờ giả lập người vào, trả lời); chưa cài thư viện. Khi có tài liệu và backend, viết bản STOMP thật | Không |
| 14 | **Mã QR cần thư viện** | CLAUDE.md đã duyệt `qrcode.react` nhưng chưa cài; quy tắc task: không thêm thư viện nếu chưa nêu lý do và được duyệt | Xin duyệt cài **`qrcode.react`** (lý do: vẽ QR cho ShareCode và PIN, tự viết bộ tạo QR là không thực tế). Nếu chưa duyệt, B2 để cuối và hiện mã, URL, bỏ QR | **Có** |
| 15 | **Đường dẫn mới** | Hiện `/workspace/editor?gameId=` | Giữ đường dẫn editor cũ; thêm `/rooms/:sessionId` (phòng Live) và `/results/:sessionId` (kết quả) | Không |
| 16 | **Tạo nhiều game một lần** (từ bước đề xuất) | Mỗi loại là một game riêng; sau tạo đi đâu? | Một game thì mở thẳng trình soạn thảo; nhiều game thì về "Trò chơi của tôi" kèm thông báo. Hiện bước này vẫn chỉ báo "đang hoàn thiện"; nối vào mock ở nhóm A | Không |
| 17 | **Dữ liệu mô phỏng cho danh sách game** | `GET /games` chưa có ở backend nên Trang chủ và Trò chơi của tôi báo lỗi khi chạy thật | Đưa `getGames` qua cùng lớp service có `USE_MOCK` (mặc định bật ở môi trường phát triển) | Không |

## 5. Rủi ro

- **Phạm vi lớn, nhiều phụ thuộc:** nhóm A chiếm một nửa khối lượng. Giảm thiểu bằng lát cắt dọc: QUIZ đi hết luồng (soạn, chơi thử, lưu, xuất bản) trước, rồi mới mở rộng loại khác.
- **Mock giống thật quá mức:** có thể bị tưởng là AI thật. Quy tắc: nhãn "Dữ liệu mô phỏng" cố định ở mọi kết quả AI (đề xuất loại game, làm lại câu, kết quả phòng), tắt được bằng `USE_MOCK=false` khi có backend.
- **Lệch contract tích lũy:** (1) khối lớp, môn tùy chọn; (2) thống kê câu sai nhiều; (3) lựa chọn chế độ. Giảm thiểu bằng cách ghi từng chỗ vào `docs/decisions.md` và gom lại thành một danh sách đề nghị sửa contract cho nhóm.
- **Renderer chỉ có 2 loại:** chơi thử không đủ cho 8 loại còn lại; chấp nhận theo điểm 6.
- **Hiệu năng realtime:** bảng xếp hạng cập nhật dưới 100 ms (NFR-01) khó kiểm bằng mock; chỉ kiểm được logic cập nhật, không kiểm được độ trễ mạng.
- **Chất lượng kiểm chứng trình duyệt:** cần chụp nhiều trạng thái (bình thường, tải, trống, lỗi, desktop, mobile) cho mỗi subtask; kịch bản kiểm thử lưu ở `.playwright-mcp/` (ngoài git).
