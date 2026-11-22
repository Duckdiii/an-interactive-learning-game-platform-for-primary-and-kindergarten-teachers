# FEATURE-MAP: tính năng ↔ endpoint ↔ code ↔ test

Bản đồ lập từ code thật ngày 2026-11-14 (nhánh `chore/harness-lauren-tan`, từ `dev` tại `2af3f0e`). Mọi ô có file:dòng; ô
"—" nghĩa là đã tìm (grep cả repo) và không có. Nguồn sự thật của contract vẫn là `docs/openapi/openapi.yaml`; file này chỉ
ghi hiện trạng cài đặt. Đường dẫn rút gọn: `C/` = `backend/src/main/java/com/aigameplatform/backend/`,
`T/` = `backend/src/test/java/com/aigameplatform/backend/`, `F/` = `frontend/src/`, `OA` = `docs/openapi/openapi.yaml`.

Trạng thái:
- **có đủ**: có controller + service ở backend và frontend gọi tới.
- **chỉ backend**: backend có, frontend chưa gọi.
- **chưa có backend**: frontend gọi (thường qua chế độ mock) nhưng backend chưa có endpoint.

## Đã có code

| Tính năng | Endpoint | Controller / service | Frontend gọi | Test | OA (`x-status`) | Trạng thái |
|---|---|---|---|---|---|---|
| Đăng ký | `POST /api/auth/register` | `C/controller/AuthController.java:40` → `C/service/AuthService.java:63` | `F/api/authApi.ts:22` | `T/controller/AuthControllerTest.java:68`, `T/service/AuthServiceTest.java:98` | `OA:74` (extended-pending) | có đủ |
| Đăng nhập | `POST /api/auth/login` | `C/controller/AuthController.java:45` → `C/service/AuthService.java:82` | `F/api/authApi.ts:31` | `T/controller/AuthControllerTest.java:97`, `T/service/AuthServiceTest.java:144` | `OA:109` (extended-pending) | có đủ |
| Làm mới token | `POST /api/auth/refresh` | `C/controller/AuthController.java:50` → `C/service/AuthService.java:95` | `F/api/axiosInstance.ts:118` (interceptor 401) | `T/controller/AuthControllerTest.java:130`, `T/service/AuthServiceTest.java:186` | `OA:161` (implemented) | có đủ |
| Đăng xuất | `POST /api/auth/logout` | `C/controller/AuthController.java:57` → `C/service/AuthService.java:128` | `F/api/authApi.ts:48` | `T/controller/AuthControllerTest.java:150` | `OA:190` (implemented) | có đủ |
| Quên mật khẩu | `POST /api/auth/forgot-password` | `C/controller/AuthController.java:49` → `C/service/PasswordResetService.java:65` | `F/api/authApi.ts:52` | `T/controller/AuthControllerTest.java:215`, `T/service/PasswordResetServiceTest.java:98` | `OA:208` (implemented) | có đủ |
| Đặt lại mật khẩu | `POST /api/auth/reset-password` | `C/controller/AuthController.java:54` → `C/service/PasswordResetService.java:73` | `F/api/authApi.ts:62` | `T/controller/AuthControllerTest.java:246`, `T/service/PasswordResetServiceTest.java:70` | `OA:261` (implemented) | có đủ |
| Hiểu yêu cầu (chat trước khi sinh) | `POST /api/games/understand` | `C/controller/GameUnderstandingController.java:25` → `C/service/understanding/GameUnderstandingService.java:44` | `F/api/gamesApi.ts:94` | `T/controller/GameUnderstandingControllerTest.java:41`, `T/service/understanding/GameUnderstandingServiceTest.java:67` | `OA:368` (implemented) | có đủ |
| Sinh game bằng AI | `POST /api/games/generate` | `C/controller/GamesController.java:38` → `C/service/game/GameService.java:56` | `F/api/gamesApi.ts:107` | `T/controller/GamesControllerTest.java:69`, `T/service/game/GameServiceTest.java:89` | `OA:292` (extended-pending) | có đủ |
| Danh sách game | `GET /api/games` | `C/controller/GamesController.java:44` → `C/service/game/GameService.java:80` | `F/api/gamesApi.ts:20` | `T/controller/GamesControllerTest.java:112`, `T/service/game/GameServiceTest.java:204` | `OA:410` (extended-pending) | có đủ |
| Mở một game | `GET /api/games/{gameId}` | `C/controller/GamesController.java:53` → `C/service/game/GameService.java:91` | `F/api/gamesApi.ts:37` | `T/controller/GamesControllerTest.java:123`, `T/service/game/GameServiceTest.java:139` | `OA:453` (implemented) | có đủ |
| Lưu game đã sửa | `PUT /api/games/{gameId}` | `C/controller/GamesController.java:59` → `C/service/game/GameService.java:97` | `F/api/gamesApi.ts:47` | `T/controller/GamesControllerTest.java:132`, `T/service/game/GameServiceTest.java:159` | `OA:471` (extended-pending) | có đủ |
| AI sửa game theo chat | `POST /api/games/{gameId}/revise` | `C/controller/GamesController.java:65` → `C/service/game/GameService.java:110` | `F/api/gamesApi.ts:85` | `T/controller/GamesControllerTest.java:147`, `T/service/game/GameServiceTest.java:222` | `OA:651` (implemented) | có đủ |
| Xoá game | `DELETE /api/games/{gameId}` | `C/controller/GamesController.java:71` → `C/service/game/GameService.java:128` | — (không có lời gọi DELETE trong `F/`) | `T/controller/GamesControllerTest.java:141`, `T/service/game/GameServiceTest.java:192` | `OA:517` (extended-pending) | chỉ backend |
| Đối chiếu chương trình của game | `GET /api/games/{id}/curriculum-review` | `C/controller/GameCurriculumReviewController.java:15` → `C/service/curriculum/review/GameCurriculumReviewService.java:64` | — | `T/controller/GameCurriculumReviewControllerTest.java:46`, `T/service/curriculum/GameCurriculumReviewServiceTest.java:15`, `T/flow/TeacherFlowVerificationTest.java:37`, `T/service/game/GameServiceTest.java:178` | `OA:695` (implemented) | chỉ backend (ghi ở `C/service/game/GameService.java:81`, thành STALE ở `:110`) |
| Xuất bản game | `POST /api/games/{gameId}/publish` | `C/controller/GamesController.java:72` → `C/service/GamePublicationService.java:74` | `F/api/gamesApi.ts:122` | `T/service/GamePublicationServiceTest.java:72` | `OA:576` (implemented) | có đủ |
| Danh mục hình Noto | `GET /api/catalog/noto` | `C/controller/NotoCatalogController.java:24` | `F/api/notoCatalogApi.ts:13` | `T/controller/NotoCatalogControllerTest.java:31` | `OA:295` (implemented) | có đủ |
| Học sinh mở game qua mã chia sẻ | `GET /api/games/shared/{shareCode}` | `C/controller/StudentPlayController.java:27` → `C/service/play/StudentPlayService.java:60` | `F/player/api/realPlayerApi.ts:14` | `T/service/play/StudentPlayServiceTest.java:53` | `OA:1566` (implemented) | có đủ |
| Học sinh bắt đầu chơi | `POST /api/games/shared/{shareCode}/play` | `C/controller/StudentPlayController.java:32` → `C/service/play/StudentPlayService.java:75` | `F/player/api/realPlayerApi.ts:23` | `T/service/play/StudentPlayServiceTest.java:53` | `OA:1597` (implemented) | có đủ |
| Câu hỏi của phiên chơi | `GET /api/sessions/{sessionId}/questions` | `C/controller/StudentPlayController.java:38` → `C/service/play/StudentPlayService.java:96` | `F/player/api/realPlayerApi.ts:33` | `T/service/play/StudentPlayServiceTest.java:106` | `OA:1380` (implemented) | có đủ |
| Nộp câu trả lời | `POST /api/sessions/{sessionId}/interactions` | `C/controller/StudentPlayController.java:44` → `C/service/play/StudentPlayService.java:140` | `F/player/api/realPlayerApi.ts:42` | `T/service/play/StudentPlayServiceTest.java:116` | `OA:1432` (implemented) | có đủ |
| Tìm ảnh Pexels để đổi ảnh | `GET /api/media/pexels-search` | `C/controller/PexelsController.java:23` | `F/services/mediaService.ts:20` | `T/controller/PexelsControllerTest.java:1` | `OA:835` (implemented) | có đủ |

## Frontend gọi nhưng backend chưa có

Frontend gọi qua lớp service có công tắc mock `VITE_USE_MOCK`; tắt mock thì các lời gọi này trả 404.

| Tính năng | Endpoint | Frontend gọi | Nơi bật mock | OA (`x-status`) | Trạng thái |
|---|---|---|---|---|---|
| Sinh lại một câu hỏi | `POST /api/games/{gameId}/questions/{questionId}/regenerate` | `F/api/gamesApi.ts:67` | `F/services/aiService.ts:18` | `OA:735` (planned) | chưa có backend |
| Tải ảnh/âm thanh | `POST /api/media/upload` | `F/api/mediaApi.ts:19` | `F/services/mediaService.ts:12` | `OA:887` (planned) | chưa có backend |

## Đối chiếu với openapi.yaml

- **Có trong code, không có trong OA:** không có (`node scripts/openapi/compare-endpoints.mjs`). `curriculum-review` đã đưa vào
  OA ngày 2026-11-15 (`OA:695`), `data.status` theo `C/entity/enums/CurriculumReviewStatus.java:4`.
- **Có trong OA, chưa có code (đều `x-status: planned`):** `POST /auth/forgot-password` (`OA:210`), `POST /auth/reset-password`
  (`OA:261`), `POST /games/{gameId}/publish` (`OA:542`), `POST /games/{gameId}/regenerate` (`OA:597`),
  `POST /games/{gameId}/questions/{questionId}/regenerate` (`OA:735`), `POST /media/upload` (`OA:801`), toàn bộ nhóm phiên
  chơi `/games/{gameId}/sessions`, `/sessions/**` (`OA:862`–`OA:1526`), game chia sẻ `/games/shared/**` (`OA:1531`–`OA:1598`),
  toàn bộ `/admin/**` (`OA:1601`–`OA:2118`). Chi tiết dòng ở `docs/openapi/INDEX.md`.
- **`x-status` khớp code:** mọi operation `implemented`/`extended-pending` trong OA đều có controller tương ứng ở bảng trên;
  không operation `planned` nào đã có controller.
- **Chưa có ở backend:** WebSocket/STOMP (không có `@MessageMapping` trong `C/`), nên chơi thử chạy hoàn toàn ở frontend
  (`F/components/editor/play/*PlayTest.tsx`).

## Luồng chính và kiểm tra tự động

Luồng giáo viên: register → login → understand → generate → get → put → get → revise. Các bước nằm ở
`T/flow/AbstractTeacherFlowTest.java`, chạy thật qua HTTP (cổng ngẫu nhiên) bởi `T/flow/TeacherFlowVerificationTest.java`
(AI giả, chạy trên CI, bằng chứng tải lên artifact `verify-flow-evidence`) và `T/flow/TeacherFlowLiveTest.java` (Gemini thật,
chỉ chạy khi đặt `RUN_LIVE_TEACHER_FLOW=true`). Chạy tay: `node scripts/verify-flow.mjs [--live]`, bằng chứng ở
`backend/target/verify-evidence/`. Test `generatedGameHasCurriculumReviewThatGoesStaleAfterEdit` kiểm sinh game xong có bản
đối chiếu (`UNAVAILABLE` vì profile test tắt truy xuất chương trình) và PUT xong thành `STALE`; `verify-flow` AI giả đếm 15 bước.
Giới hạn: DB trong test là H2 (Flyway tắt), nên chưa kiểm schema Supabase thật.

Cập nhật file này khi thêm/xoá endpoint; số dòng có thể lệch khi file nguồn đổi. `node scripts/verify/check-feature-map.mjs`
(chạy ở CI) báo khi endpoint của controller thiếu trong mục "Đã có code", khi endpoint ghi ở đây không còn hoặc đã có backend,
và khi trích dẫn `C/` `T/` `F/` `OA:` trỏ tới file không có hay vượt độ dài file; nó không kiểm nội dung dòng được trích.
