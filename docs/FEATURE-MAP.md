# FEATURE-MAP: tính năng ↔ endpoint ↔ code ↔ test

Bản đồ lập từ code thật ngày 2026-11-14 (nhánh `chore/harness-lauren-tan`, từ `dev` tại `2af3f0e`). Các ô code và test có file:dòng; ô
"—" nghĩa là đã tìm (grep cả repo) và không có. Nguồn sự thật của contract vẫn là `docs/openapi/openapi.yaml`; file này chỉ
ghi hiện trạng cài đặt. Đường dẫn rút gọn: `C/` = `backend/src/main/java/com/aigameplatform/backend/`,
`T/` = `backend/src/test/java/com/aigameplatform/backend/`, `F/` = `frontend/src/`.
Để tra OpenAPI, tìm cặp phương thức và đường dẫn ở cột Endpoint trong [chỉ mục OpenAPI](openapi/INDEX.md#operation). Đường dẫn trong chỉ mục bỏ tiền tố `/api`.

Trạng thái:
- **có đủ**: có controller + service ở backend và frontend gọi tới.
- **chỉ backend**: backend có, frontend chưa gọi.
- **chưa có backend**: frontend gọi (thường qua chế độ mock) nhưng backend chưa có endpoint.

## Đã có code

| Tính năng | Endpoint | Controller / service | Frontend gọi | Test | Trạng thái |
|---|---|---|---|---|---|
| Đăng ký | `POST /api/auth/register` | `C/controller/AuthController.java:40` → `C/service/AuthService.java:63` | `F/api/authApi.ts:22` | `T/controller/AuthControllerTest.java:68`, `T/service/AuthServiceTest.java:98` | có đủ |
| Đăng nhập | `POST /api/auth/login` | `C/controller/AuthController.java:45` → `C/service/AuthService.java:82` | `F/api/authApi.ts:31` | `T/controller/AuthControllerTest.java:97`, `T/service/AuthServiceTest.java:144` | có đủ |
| Làm mới token | `POST /api/auth/refresh` | `C/controller/AuthController.java:50` → `C/service/AuthService.java:95` | `F/api/axiosInstance.ts:118` (interceptor 401) | `T/controller/AuthControllerTest.java:130`, `T/service/AuthServiceTest.java:186` | có đủ |
| Đăng xuất | `POST /api/auth/logout` | `C/controller/AuthController.java:57` → `C/service/AuthService.java:128` | `F/api/authApi.ts:48` | `T/controller/AuthControllerTest.java:150` | có đủ |
| Quên mật khẩu | `POST /api/auth/forgot-password` | `C/controller/AuthController.java:49` → `C/service/PasswordResetService.java:65` | `F/api/authApi.ts:52` | `T/controller/AuthControllerTest.java:215`, `T/service/PasswordResetServiceTest.java:98` | có đủ |
| Đặt lại mật khẩu | `POST /api/auth/reset-password` | `C/controller/AuthController.java:54` → `C/service/PasswordResetService.java:73` | `F/api/authApi.ts:62` | `T/controller/AuthControllerTest.java:246`, `T/service/PasswordResetServiceTest.java:70` | có đủ |
| Hiểu yêu cầu (chat trước khi sinh) | `POST /api/games/understand` | `C/controller/GameUnderstandingController.java:25` → `C/service/understanding/GameUnderstandingService.java:44` | `F/api/gamesApi.ts:94` | `T/controller/GameUnderstandingControllerTest.java:41`, `T/service/understanding/GameUnderstandingServiceTest.java:67` | có đủ |
| Chuẩn bị ý tưởng từ giáo án (UC-02) | `POST /api/games/prepare` | `C/controller/LessonPreparationController.java:28` → `C/service/lesson/LessonPreparationService.java:32` | `F/api/lessonPreparationApi.ts:18` | `T/controller/LessonPreparationControllerTest.java:50` | có đủ |
| Sinh game bằng AI | `POST /api/games/generate` | `C/controller/GamesController.java:38` → `C/service/game/GameService.java:56` | `F/api/gamesApi.ts:107` | `T/controller/GamesControllerTest.java:69`, `T/service/game/GameServiceTest.java:89` | có đủ |
| Danh sách game | `GET /api/games` | `C/controller/GamesController.java:44` → `C/service/game/GameService.java:80` | `F/api/gamesApi.ts:20` | `T/controller/GamesControllerTest.java:112`, `T/service/game/GameServiceTest.java:204` | có đủ |
| Mở một game | `GET /api/games/{gameId}` | `C/controller/GamesController.java:53` → `C/service/game/GameService.java:91` | `F/api/gamesApi.ts:37` | `T/controller/GamesControllerTest.java:123`, `T/service/game/GameServiceTest.java:139` | có đủ |
| Lưu game đã sửa và ghi lịch sử (UC-04) | `PUT /api/games/{gameId}` | `C/controller/GamesController.java:74` → `C/service/game/GameService.java:157` | `F/api/gamesApi.ts:100` | `T/service/game/WorkspaceEditPersistenceTest.java:32` | có đủ |
| AI sửa game theo chat | `POST /api/games/{gameId}/revise` | `C/controller/GamesController.java:65` → `C/service/game/GameService.java:110` | `F/api/gamesApi.ts:85` | `T/controller/GamesControllerTest.java:147`, `T/service/game/GameServiceTest.java:222` | có đủ |
| Xoá game | `DELETE /api/games/{gameId}` | `C/controller/GamesController.java:71` → `C/service/game/GameService.java:128` | — (không có lời gọi DELETE trong `F/`) | `T/controller/GamesControllerTest.java:141`, `T/service/game/GameServiceTest.java:192` | chỉ backend |
| Đối chiếu chương trình của game | `GET /api/games/{id}/curriculum-review` | `C/controller/GameCurriculumReviewController.java:15` → `C/service/curriculum/review/GameCurriculumReviewService.java:64` | — | `T/controller/GameCurriculumReviewControllerTest.java:46`, `T/service/curriculum/GameCurriculumReviewServiceTest.java:15`, `T/flow/TeacherFlowVerificationTest.java:37`, `T/service/game/GameServiceTest.java:178` | chỉ backend (ghi ở `C/service/game/GameService.java:81`, thành STALE ở `:110`) |
| Xuất bản game | `POST /api/games/{gameId}/publish` | `C/controller/GamesController.java:72` → `C/service/GamePublicationService.java:74` | `F/api/gamesApi.ts:122` | `T/service/GamePublicationServiceTest.java:72` | có đủ |
| Danh mục hình Noto | `GET /api/catalog/noto` | `C/controller/NotoCatalogController.java:24` | `F/api/notoCatalogApi.ts:13` | `T/controller/NotoCatalogControllerTest.java:31` | có đủ |
| Học sinh mở game qua mã chia sẻ | `GET /api/games/shared/{shareCode}` | `C/controller/StudentPlayController.java:27` → `C/service/play/StudentPlayService.java:60` | `F/player/api/realPlayerApi.ts:14` | `T/service/play/StudentPlayServiceTest.java:53` | có đủ |
| Học sinh bắt đầu chơi | `POST /api/games/shared/{shareCode}/play` | `C/controller/StudentPlayController.java:32` → `C/service/play/StudentPlayService.java:75` | `F/player/api/realPlayerApi.ts:23` | `T/service/play/StudentPlayServiceTest.java:53` | có đủ |
| Câu hỏi của phiên chơi | `GET /api/sessions/{sessionId}/questions` | `C/controller/StudentPlayController.java:38` → `C/service/play/StudentPlayService.java:96` | `F/player/api/realPlayerApi.ts:33` | `T/service/play/StudentPlayServiceTest.java:106` | có đủ |
| Nộp câu trả lời | `POST /api/sessions/{sessionId}/interactions` | `C/controller/StudentPlayController.java:44` → `C/service/play/StudentPlayService.java:140` | `F/player/api/realPlayerApi.ts:42` | `T/service/play/StudentPlayServiceTest.java:116` | có đủ |
| Kiểm duyệt chữ trước khi áp vào bản nháp (UC-05 2a) | `POST /api/games/validate-text` | `C/controller/TextSafetyController.java:31` → `C/service/validation/ContentSafetyCheck.java:42` | `F/services/safetyService.ts:12` | `T/controller/TextSafetyControllerTest.java:30` | có đủ |
| Tải ảnh hoặc MP3 riêng (UC-04, UC-05) | `POST /api/media/upload` | `C/controller/MediaController.java:31` → `C/service/media/MediaUploadService.java:40` | `F/api/mediaApi.ts:19` | `T/controller/MediaControllerTest.java:1` | có đủ |
| Mở tệp đã lưu | `GET /media/{group}/{name}` | `C/controller/MediaController.java:38` | URL tệp trên Workspace và trình chơi | `T/controller/MediaControllerTest.java:1` | có đủ |
| Tìm ảnh Pexels để đổi ảnh | `GET /api/media/pexels-search` | `C/controller/PexelsController.java:23` | `F/services/mediaService.ts:20` | `T/controller/PexelsControllerTest.java:1` | có đủ |
| Làm lại toàn bộ game (UC-06 4a) | `POST /api/games/{gameId}/regenerate` | `C/controller/GamesController.java:93` | `F/api/gamesApi.ts:111` | `T/controller/GamesControllerRegenerateTest.java:67` | có đủ |
| Làm lại một thẻ câu hỏi (UC-06, FLD-14) | `POST /api/games/{gameId}/questions/{questionId}/regenerate` | `C/controller/GamesController.java:100` | `F/api/gamesApi.ts:132` | `T/controller/GamesControllerRegenerateTest.java:84` | có đủ |
| Giáo viên tạo phiên Live Arena (SOLO hoặc TEAM) | `POST /api/games/{gameId}/sessions` | `C/controller/SessionController.java:27` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Danh sách phiên của một game | `GET /api/games/{gameId}/sessions` | `C/controller/SessionController.java:37` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Bắt đầu phiên (WAITING sang ACTIVE) | `POST /api/sessions/{sessionId}/start` | `C/controller/SessionController.java:47` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Tạm dừng phiên (ACTIVE sang PAUSED) | `POST /api/sessions/{sessionId}/pause` | `C/controller/SessionController.java:55` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Tiếp tục phiên (PAUSED sang ACTIVE) | `POST /api/sessions/{sessionId}/resume` | `C/controller/SessionController.java:63` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Kết thúc phiên (bất kỳ trạng thái sang CLOSED) | `POST /api/sessions/{sessionId}/close` | `C/controller/SessionController.java:71` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Chi tiết phiên cho màn hình Host | `GET /api/sessions/{sessionId}` | `C/controller/SessionController.java:79` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Kết quả cả phiên (giáo viên) | `GET /api/sessions/{sessionId}/results` | `C/controller/SessionController.java:87` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Chi tiết từng câu của một học sinh (xem lại bài) | `GET /api/sessions/{sessionId}/participants/{participantId}/interactions` | `C/controller/SessionController.java:95` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Giáo viên xếp học sinh vào đội (phiên TEAM) | `PUT /api/sessions/{sessionId}/participants/{participantId}/team` | `C/controller/SessionController.java:104` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Tra phiên bằng mã PIN (học sinh, public) | `GET /api/sessions/by-code/{accessCode}` | `C/controller/SessionController.java:114` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Học sinh vào phòng (public) | `POST /api/sessions/{sessionId}/join` | `C/controller/SessionController.java:120` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Học sinh tự đổi đội (FREE_CHOICE) | `PUT /api/sessions/{sessionId}/my-team` | `C/controller/SessionController.java:129` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Bảng xếp hạng | `GET /api/sessions/{sessionId}/leaderboard` | `C/controller/SessionController.java:140` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Kết quả lượt chơi của chính mình | `GET /api/sessions/{sessionId}/my-result` | `C/controller/SessionController.java:151` | — | `T/controller/SessionControllerTest.java:1` | có đủ |
| Xem hồ sơ giảng dạy (UC-16) | `GET /api/teacher/profile` | `C/controller/TeacherProfileController.java:33` → `C/service/profile/TeacherProfileService.java:31` | `F/api/teacherProfileApi.ts:17` | `T/service/profile/TeacherProfilePersistenceTest.java:31` | có đủ |
| Lưu hồ sơ giảng dạy (UC-16) | `POST /api/teacher/profile` | `C/controller/TeacherProfileController.java:38` → `C/service/profile/TeacherProfileService.java:36` | `F/api/teacherProfileApi.ts:22` | `T/service/profile/TeacherProfilePersistenceTest.java:31` | có đủ |
| Xóa hồ sơ giảng dạy (UC-16) | `DELETE /api/teacher/profile` | `C/controller/TeacherProfileController.java:44` → `C/service/profile/TeacherProfileService.java:49` | `F/api/teacherProfileApi.ts:27` | `T/service/profile/TeacherProfilePersistenceTest.java:31` | có đủ |
| Xem gợi ý đã ghi nhớ (UC-16) | `GET /api/teacher/suggestions` | `C/controller/TeacherProfileController.java:50` → `C/service/profile/TeacherProfileService.java:60` | `F/api/teacherProfileApi.ts:31` | `T/service/profile/TeacherProfilePersistenceTest.java:31` | có đủ |
| Ghi nhớ chủ đề (UC-16) | `POST /api/teacher/suggestions` | `C/controller/TeacherProfileController.java:55` → `C/service/profile/TeacherProfileService.java:69` | `F/api/teacherProfileApi.ts:36` | `T/service/profile/TeacherProfilePersistenceTest.java:31` | có đủ |
| Xóa tất cả gợi ý (UC-16) | `DELETE /api/teacher/suggestions` | `C/controller/TeacherProfileController.java:61` → `C/service/profile/TeacherProfileService.java:86` | `F/api/teacherProfileApi.ts:40` | `T/service/profile/TeacherProfilePersistenceTest.java:31` | có đủ |
| Xóa một gợi ý (UC-16) | `DELETE /api/teacher/suggestions/{suggestionId}` | `C/controller/TeacherProfileController.java:67` → `C/service/profile/TeacherProfileService.java:86` | `F/api/teacherProfileApi.ts:40` | `T/service/profile/TeacherProfilePersistenceTest.java:31` | có đủ |
| Danh sách lớp học của giáo viên (UC-16) | `GET /api/classrooms` | `C/controller/ClassroomController.java:33` → `C/service/classroom/ClassroomService.java:1` | `F/api/classroomsApi.ts:6` | `T/controller/ClassroomControllerTest.java:1` | có đủ |
| Thêm lớp học (UC-16) | `POST /api/classrooms` | `C/controller/ClassroomController.java:38` → `C/service/classroom/ClassroomService.java:1` | `F/api/classroomsApi.ts:13` | `T/controller/ClassroomControllerTest.java:1` | có đủ |
| Sửa lớp học (UC-16) | `PUT /api/classrooms/{classroomId}` | `C/controller/ClassroomController.java:45` → `C/service/classroom/ClassroomService.java:1` | `F/api/classroomsApi.ts:19` | `T/controller/ClassroomControllerTest.java:1` | có đủ |
| Xóa lớp học (UC-16) | `DELETE /api/classrooms/{classroomId}` | `C/controller/ClassroomController.java:51` → `C/service/classroom/ClassroomService.java:1` | `F/api/classroomsApi.ts:26` | `T/controller/ClassroomControllerTest.java:1` | có đủ |
| Thống kê kết quả theo câu của một game (UC-18) | `GET /api/games/{gameId}/insights` | `C/controller/GameInsightsController.java:30` → `C/service/play/GameInsightsService.java:1` | `F/api/gamesApi.ts:56` | `T/controller/GameInsightsControllerTest.java:1` | có đủ |
| Chi tiết một câu: phân bố đáp án (UC-18) | `GET /api/games/{gameId}/questions/{questionId}/insights` | `C/controller/GameInsightsController.java:41` → `C/service/play/GameInsightsService.java:1` | `F/api/gamesApi.ts:66` | `T/controller/GameInsightsControllerTest.java:1` | có đủ |
| Các câu lớp cần ôn lại cho trang chủ (UC-18) | `GET /api/insights/review-needed` | `C/controller/GameInsightsController.java:53` → `C/service/play/GameInsightsService.java:1` | `F/api/gamesApi.ts:81` | `T/controller/GameInsightsControllerTest.java:1` | có đủ |
| Phiên bản cấu hình AI đang áp dụng và lịch sử (UC-14) | `GET /api/admin/ai-config` | `C/controller/AdminAiConfigController.java:39` | `F/services/adminService.ts:1` | `T/controller/AdminAiConfigControllerTest.java:1` | có đủ |
| Tạo và áp dụng phiên bản cấu hình mới | `POST /api/admin/ai-config/versions` | `C/controller/AdminAiConfigController.java:46` | `F/services/adminService.ts:1` | `T/controller/AdminAiConfigControllerTest.java:1` | có đủ |
| Đóng băng một phiên bản làm bản chuẩn | `POST /api/admin/ai-config/versions/{versionId}/freeze` | `C/controller/AdminAiConfigController.java:57` | `F/services/adminService.ts:1` | `T/controller/AdminAiConfigControllerTest.java:1` | có đủ |
| Khôi phục phiên bản làm bản đang áp dụng | `POST /api/admin/ai-config/versions/{versionId}/activate` | `C/controller/AdminAiConfigController.java:69` | `F/services/adminService.ts:1` | `T/controller/AdminAiConfigControllerTest.java:1` | có đủ |
| Danh sách từ cấm an toàn học đường (FLD-25) | `GET /api/admin/safety/blocked-words` | `C/controller/AdminAiConfigController.java:80` | `F/services/adminService.ts:1` | `T/controller/AdminAiConfigControllerTest.java:1` | có đủ |
| Thay toàn bộ danh sách từ cấm | `PUT /api/admin/safety/blocked-words` | `C/controller/AdminAiConfigController.java:87` | `F/services/adminService.ts:1` | `T/controller/AdminAiConfigControllerTest.java:1` | có đủ |
| Audit Log (FLD-28) | `GET /api/admin/audit-logs` | `C/controller/AdminAuditLogController.java:33` | `F/services/adminService.ts:1` | — | có đủ |
| Danh sách giáo viên (UC-13) | `GET /api/admin/teachers` | `C/controller/AdminTeacherController.java:37` | `F/services/adminService.ts:1` | `T/controller/AdminTeacherControllerTest.java:1` | có đủ |
| Thêm giáo viên (UC-13) | `POST /api/admin/teachers` | `C/controller/AdminTeacherController.java:48` | `F/services/adminService.ts:1` | `T/controller/AdminTeacherControllerTest.java:1` | có đủ |
| Chi tiết một giáo viên | `GET /api/admin/teachers/{teacherId}` | `C/controller/AdminTeacherController.java:59` | `F/services/adminService.ts:1` | `T/controller/AdminTeacherControllerTest.java:1` | có đủ |
| Sửa thông tin giáo viên | `PUT /api/admin/teachers/{teacherId}` | `C/controller/AdminTeacherController.java:66` | `F/services/adminService.ts:1` | `T/controller/AdminTeacherControllerTest.java:1` | có đủ |
| Khoá tài khoản giáo viên | `POST /api/admin/teachers/{teacherId}/lock` | `C/controller/AdminTeacherController.java:77` | `F/services/adminService.ts:1` | `T/controller/AdminTeacherControllerTest.java:1` | có đủ |
| Mở khoá tài khoản giáo viên | `POST /api/admin/teachers/{teacherId}/unlock` | `C/controller/AdminTeacherController.java:87` | `F/services/adminService.ts:1` | `T/controller/AdminTeacherControllerTest.java:1` | có đủ |
| Chi phí và trạng thái dịch vụ (UC-12) | `GET /api/admin/usage` | `C/controller/AdminUsageController.java:39` | `F/services/adminService.ts:1` | `T/controller/AdminUsageControllerTest.java:1` | có đủ |
| Sức khoẻ máy chủ (NFR-03) | `GET /api/admin/system-status` | `C/controller/AdminUsageController.java:50` | `F/services/adminService.ts:1` | `T/controller/AdminUsageControllerTest.java:1` | có đủ |
| Xem trần ngân sách AI tháng và mức cảnh báo (UC-12) | `GET /api/admin/budget-config` | `C/controller/AdminUsageController.java:57` | `F/services/adminService.ts:1` | `T/controller/AdminUsageControllerTest.java:1` | có đủ |
| Cập nhật trần ngân sách AI tháng và mức cảnh báo (UC-12) | `POST /api/admin/budget-config` | `C/controller/AdminUsageController.java:64` | `F/services/adminService.ts:1` | `T/controller/AdminUsageControllerTest.java:1` | có đủ |

## Frontend gọi nhưng backend chưa có

Các endpoint được frontend gọi trong bảng trên đã có backend. Công cụ gợi ý ảnh và tạo giọng đọc từ màn soạn thảo vẫn có chế độ mô phỏng.

## Đối chiếu với openapi.yaml

- **Có trong code, không có trong OA:** không có (`node scripts/openapi/compare-endpoints.mjs`). `curriculum-review` đã đưa vào
  OA ngày 2026-11-15 (operation `getGameCurriculumReview`), `data.status` theo `C/entity/enums/CurriculumReviewStatus.java:4`.
- Các operation đang ở trạng thái `planned` được liệt kê trong `docs/openapi/INDEX.md`.
- **`x-status` khớp code:** mọi operation `implemented`/`extended-pending` trong OA đều có controller tương ứng ở bảng trên;
  không operation `planned` nào đã có controller.
- **WebSocket/STOMP:** tra [định dạng thông điệp](websocket-message-format-v1.0.0.md) và `C/controller/LiveArenaController.java`.
  Bảng endpoint trên chỉ liệt kê REST.

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
và khi trích dẫn `C/` `T/` `F/` trỏ tới file không có hay vượt độ dài file; nó không kiểm nội dung dòng được trích.
