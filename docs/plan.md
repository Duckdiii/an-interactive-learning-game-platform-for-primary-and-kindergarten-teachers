# Kế hoạch thực hiện (Giai đoạn 2)

Trạng thái: **ĐÃ DUYỆT (2026-10-14). Đang thực hiện nhóm F**, dừng sau F4 để bạn xem trước khi sang nhóm A. Căn cứ: `docs/analysis.md`. Quyết định kèm lý do: `docs/decisions.md`.

Toàn bộ 16 đề xuất đã được bạn chốt, chi tiết và điều kiện kèm theo ở `docs/decisions.md`. Điều chỉnh so với bản kế hoạch đầu: cờ mô phỏng **theo từng endpoint** (F1), khung "chưa hỗ trợ xem thử" **có ảnh tĩnh minh họa loại game** (A2), `draftStorage` **bọc try/catch và xóa nháp sau khi lưu** (A1), đánh dấu **"Mới"** trên game vừa tạo (A8), FLD-13 vào backlog chờ DSL 1.1.0.

## Quy ước chung cho mọi subtask

- **Quy trình:** nói rõ subtask, viết mã đúng phạm vi, chạy `tsc -b`, `npm run lint`, `vitest run`, `npm run build`, chạy thật trên trình duyệt và chụp ảnh các trạng thái (bình thường, đang tải, trống, lỗi) ở desktop và mobile, tích dấu ở đây, **commit riêng** (chỉ stage đúng đường dẫn, không `git add -A`), rồi báo cáo ngắn.
- **Dừng và hỏi** sau mỗi nhóm A, B, C, D; dừng ngay nếu test không qua sau 2 lần sửa, cần đổi thiết kế đã duyệt, hoặc phát hiện yêu cầu mâu thuẫn.
- **Mock:** nằm trong lớp `services/`, bật bằng `USE_MOCK` (biến `VITE_USE_MOCK`, thêm vào `.env.example`), mọi kết quả do AI hoặc phòng giả lập phải có nhãn **"Dữ liệu mô phỏng"**.
- **Kỷ luật mã:** TypeScript chặt, không `any`; dùng lại component sẵn có; không thêm thư viện ngoài danh sách (xem B2); mọi hành động có thể thất bại có trạng thái lỗi và nút thử lại; khi lỗi giữ nguyên nội dung cũ.
- **Sổ ghi AI (`ai-usage-log.md`):** một dòng cho mỗi nhóm (F, A, B, C, D), SHA điền ở commit riêng sau khi commit; chạy `log-auditor` khi sửa file này. Trước mỗi commit chạy `pre-commit-checker`; sau mỗi subtask chạy `reviewer` (và `test-verifier` ở cuối nhóm).
- **Kích thước:** mỗi subtask tối đa khoảng 300 dòng thay đổi (không tính test sinh theo bảng); nếu vượt thì tách.

Ký hiệu: `[ ]` chưa làm, `[x]` xong. "Phụ thuộc" ghi mã subtask phải xong trước.

---

## Nhóm F: nền tảng dùng chung

### [x] F1. Cờ mô phỏng và nhãn "Dữ liệu mô phỏng"
- **Mục tiêu:** có một chỗ duy nhất quyết định dùng mock hay API thật, **theo từng nhóm endpoint** (nhóm đã có backend thật như đăng nhập luôn gọi thật); `getGames` đi qua lớp service; có banner "Đang dùng dữ liệu mô phỏng", cảnh báo console và nhãn "Dữ liệu mô phỏng" dùng chung; có kịch bản mô phỏng (bình thường, trống, lỗi, chậm) chỉ ở môi trường phát triển để kiểm các trạng thái.
- **File dự kiến:** `config/mockMode.ts`, `services/mock/{mockRuntime,mockGames}.ts`, `components/ui/{MockBadge,MockBanner}.tsx`, `services/gamesService.ts` (bọc `api/gamesApi.ts`), `hooks/useGames.ts` (đổi nguồn), `layouts/AppLayout.tsx` (banner), `main.tsx` (cảnh báo console), `frontend/.env.example`, `src/test-setup.ts`, `constants/viText.ts`, tests.
- **Phụ thuộc:** không.
- **Hoàn thành khi:** `VITE_USE_MOCK=all` (mặc định ở `npm run dev`) thì Trang chủ và "Trò chơi của tôi" hiện danh sách mẫu có tên có nghĩa, không cần backend; `none` hoặc không có nhóm `games` thì gọi API thật như cũ; đăng nhập không bao giờ bị mô phỏng; banner và cảnh báo console chỉ hiện khi có nhóm đang mô phỏng; test cho từng nhánh cờ.
- **Kiểm tra:** `vitest` (hai nhánh cờ); mở trình duyệt với cờ bật và tắt (tắt thì báo lỗi kết nối như hiện nay).

### [x] F2. Kiểu dữ liệu và kho mock cho game
- **Mục tiêu:** có kiểu `GameResponse` (envelope DSL + `gameId`, `status`, `updatedAt`), kho game trong bộ nhớ có mẫu cho cả 10 loại, và `gameService` với `getGame`, `updateGame`, có thể bơm lỗi (không tìm thấy, 409, quá thời gian) cho test.
- **File dự kiến:** `types/game-response.types.ts`, `services/mock/mockGames.ts` (kho game, thay cho gameStore.ts dự kiến), `services/mock/mockErrors.ts`, `services/mock/gameFixtures.ts`, `services/gameService.ts`, `api/gamesApi.ts` (thêm `getGame`, `updateGame` thật), tests.
- **Phụ thuộc:** F1.
- **Hoàn thành khi:** `getGame(id)` trả game đúng kiểu cho mọi loại; `updateGame` ghi đè và cập nhật `updatedAt`; lỗi được mô hình hóa bằng `ApiError` có mã; test phủ các nhánh lỗi.
- **Kiểm tra:** `vitest`; kiểm kiểu bằng `tsc -b` (fixture khớp `GameDsl`).

### [x] F3. Hàm kiểm tra dữ liệu game (thuần)
- **Mục tiêu:** `validateGame(game, mode)` với `mode = 'save' | 'publish'` trả danh sách lỗi theo câu và theo trường: giới hạn của SRS giao DSL (câu ≤ 200 ký tự, thời gian 10 đến 120, điểm 1 đến 100, 1 đến 20 câu, đáp án 2 đến 4 và đúng 1 đáp án đúng); SPOT_THE_TARGET thiếu `hitRegion` chỉ lỗi khi xuất bản.
- **File dự kiến:** `utils/questionSpecs.ts` (bảng mô tả trường theo loại game rút từ schema: nhãn, kiểu, giới hạn, trường nào là đáp án), `utils/gameValidation.ts` (đọc bảng này), `utils/gameValidation.test.ts`, chuỗi lỗi trong `viText`.
- **Thiết kế mở rộng:** giới hạn và quy tắc của mỗi loại nằm ở **một bảng mô tả**, không rải trong mã; thêm loại mới là thêm một mục vào bảng. Phạm vi kiểm tra hôm nay: QUIZ và MATCHING đầy đủ; các loại khác kiểm các trường chung.
- **Phụ thuộc:** F2 (kiểu).
- **Hoàn thành khi:** test duyệt mọi loại game ở ranh giới (đủ, thiếu, thừa); thông báo đúng câu của SRS (UC-04 5a, UC-07 2c).
- **Kiểm tra:** `vitest` (bảng ca cho từng loại).

### [x] F4. Khung trang soạn thảo (đọc, chưa sửa)
- **Mục tiêu:** thay trang giữ chỗ bằng trình soạn thảo 2 khung: danh sách câu hỏi ở trái, vùng xem ở phải; điện thoại dùng hai tab. Có trạng thái đang tải, lỗi (kèm thử lại), không tìm thấy game.
- **File dự kiến:** `pages/WorkspaceEditor.tsx`, `components/editor/{EditorLayout,QuestionList}.tsx`, `hooks/useGame.ts`, `routes/paths.ts` (nếu cần), `viText`, tests.
- **Phụ thuộc:** F2.
- **Hoàn thành khi:** mở `/workspace/editor?gameId=...` thấy tiêu đề game, trạng thái, danh sách đủ số câu với tóm tắt nội dung; chọn câu thì làm nổi bật; thiếu `gameId` hoặc 404 hiện thông báo rõ.
- **Kiểm tra:** `vitest` + ảnh 4 trạng thái, desktop và mobile.

---

## Nhóm A: Workspace Editor (UC-03, 04, 05, 06)

### [x] A1. Trạng thái soạn thảo và lưu bản nháp
- **Mục tiêu:** `useReducer` giữ bản đang soạn, cờ chưa lưu, nút **Lưu bản nháp** (UC-04), cảnh báo khi rời trang chưa lưu, báo lỗi 5a (câu chưa có đáp án đúng) và lỗi lưu có nút thử lại; sao lưu nháp vào trình duyệt khi mất mạng (NFR-03).
- **File dự kiến:** `components/editor/editorReducer.ts`, `utils/draftStorage.ts`, `components/editor/SaveBar.tsx`, tests.
- **Phụ thuộc:** F3, F4.
- **Hoàn thành khi:** sửa tiêu đề thì hiện "chưa lưu"; lưu thành công hiện đúng câu "Bạn đã lưu bản nháp thành công." và **xóa bản sao lưu**; lỗi giữ nguyên nội dung đang soạn; tải lại trang khôi phục bản nháp sao lưu (có hỏi); `draftStorage` **bọc try/catch** (bị chặn thì bỏ qua), chỉ lưu nội dung game, **không lưu dữ liệu học sinh**.
- **Kiểm tra:** `vitest` (reducer, draftStorage); ảnh trạng thái lưu, lỗi, 409.

### [x] A2. Chơi thử (UC-03)
- **Mục tiêu:** nút **Chơi thử**; QUIZ và MATCHING dùng renderer thật ở chế độ `preview`; loại khác hiện khung "chưa hỗ trợ xem thử" **kèm ảnh tĩnh minh họa loại game đó (`GameTypeCover`, không để trống)** và bản chữ; màn tổng kết mô phỏng ghi rõ "không lưu vào báo cáo học sinh"; thoát giữa chừng, "Quay lại chỉnh sửa"; lỗi 2a khi dữ liệu thiếu.
- **File dự kiến:** `components/editor/PlayTestPanel.tsx`, `components/editor/play/playTestRegistry.ts` (bảng loại game đến renderer, kèm `QuizPlayTest`/`MatchingPlayTest`), `PlayTestSummary.tsx`, tests.
- **Phụ thuộc:** F3, F4.
- **Hoàn thành khi:** chơi hết QUIZ mẫu thấy tổng kết; game thiếu đáp án bị từ chối bằng đúng câu UC-03 2a; loại chưa hỗ trợ không giả lập.
- **Kiểm tra:** `vitest` (registry, tổng kết); ảnh chơi thử Quiz, Matching, loại chưa hỗ trợ, lỗi.

### [x] A3. Sửa tay QUIZ (UC-05, FLD-05/06/07)
- **Thiết kế mở rộng:** dựng khung form chung đọc `questionSpecs` (nhãn, giới hạn, bộ đếm ký tự, thông báo lỗi từng trường); `QuizForm` chỉ là phần riêng của loại này. Loại mới sau này = thêm mô tả trường + một thành phần nhỏ, không sửa khung.
- **Mục tiêu:** form sửa câu QUIZ: nội dung, 2 đến 4 đáp án (thêm, bớt, chọn đáp án đúng), thời gian, điểm; kiểm tra trực tiếp từng trường; vùng xem bên phải cập nhật ngay; lọc từ không phù hợp (mock, có nhãn) giữ nguyên nội dung cũ khi từ chối.
- **File dự kiến:** `components/editor/forms/{QuizForm,TimeLimitField}.tsx`, `services/mock/safetyCheck.ts`, `utils/` (nếu cần), tests.
- **Phụ thuộc:** A1, A2.
- **Hoàn thành khi:** không thể có 5 đáp án hoặc 1 đáp án; đổi đáp án đúng thì chơi thử thấy ngay; nhập từ cấm bị chặn bằng đúng câu UC-05 2a.
- **Kiểm tra:** `vitest` (form, ranh giới 200 ký tự, 10 đến 120 giây); ảnh bình thường, lỗi từng trường.

### [ ] A4. Sửa tay MATCHING và trường chung các loại khác
- **Mục tiêu:** form sửa cặp ghép (thêm, bớt, sửa chữ); các loại còn lại sửa được trường chung (thời gian, điểm, lời đọc) và xem nội dung.
- **File dự kiến:** `components/editor/forms/{MatchingForm,CommonFieldsForm}.tsx`, `components/editor/QuestionEditor.tsx` (chọn form theo loại), tests.
- **Phụ thuộc:** A3.
- **Hoàn thành khi:** MATCHING giữ 3 đến 6 cặp hợp lệ (theo schema); mọi loại mở được không vỡ; loại chưa có form hiện thông báo rõ.
- **Kiểm tra:** `vitest`; ảnh MATCHING và một loại chưa có form.

### [ ] A5. Tải ảnh và âm thanh (UC-05, FLD-11/12)
- **Mục tiêu:** nút tải tệp trên thẻ câu: kiểm tra định dạng và dung lượng (ảnh PNG/JPG/WebP ≤ 5MB, MP3 ≤ 10MB), mock tải lên và mock từ chối nội dung không an toàn, lỗi giữ nguyên tệp cũ; chọn giọng đọc Nam/Nữ của game.
- **File dự kiến:** `components/editor/MediaField.tsx`, `utils/mediaFile.ts`, `services/mediaService.ts` (mock), tests.
- **Phụ thuộc:** A3.
- **Hoàn thành khi:** tệp sai định dạng hoặc quá lớn bị từ chối bằng đúng câu UC-05 3a; tệp không an toàn bị từ chối bằng câu 3b; ảnh mới hiện ở vùng xem.
- **Kiểm tra:** `vitest` (kiểm tra tệp, mock); ảnh các nhánh.

### [ ] A6. AI làm lại một câu (UC-06, FLD-14)
- **Mục tiêu:** nút **Yêu cầu AI làm lại** trên thẻ câu; hộp thoại nhập gợi ý (tối đa 500 ký tự); mock AI trễ, thử lại tối đa 2 lần, quá 5 giây tính timeout, từ chối nội dung không an toàn thì khôi phục câu cũ; câu mới vào bản đang soạn, **chưa lưu** cho tới khi bấm Lưu; nhãn "Dữ liệu mô phỏng".
- **File dự kiến:** `components/editor/RegenerateQuestionDialog.tsx`, `services/aiService.ts` (mock), tests.
- **Phụ thuộc:** A3.
- **Hoàn thành khi:** câu khác không bị đổi; lỗi 5b, 5a đều giữ câu cũ và báo đúng câu của SRS; số lần thử lại đúng 2.
- **Kiểm tra:** `vitest` (mock với bơm lỗi); ảnh tải, thành công, quá tải, không an toàn.

### [ ] A7. AI làm lại cả game (UC-06 4a)
- **Mục tiêu:** nút **Tạo lại toàn bộ trò chơi** có hộp thoại cảnh báo, ô định hướng chung; thay toàn bộ câu, đặt về nháp; chặn khi có phiên chưa kết thúc (409).
- **File dự kiến:** `components/editor/RegenerateGameDialog.tsx`, mở rộng `aiService`, tests.
- **Phụ thuộc:** A6.
- **Hoàn thành khi:** đồng ý thì danh sách câu mới; hủy hoặc lỗi giữ nguyên bản cũ.
- **Kiểm tra:** `vitest`; ảnh cảnh báo, thành công, lỗi.

### [ ] A8. Nối bước đề xuất vào mock và đánh dấu "Mới"
- **Mục tiêu:** bấm "Tạo N trò chơi" ở trang Tạo game mới gọi `createGames` mock (mỗi loại một game nháp, nhãn "Dữ liệu mô phỏng"); một game thì mở trình soạn thảo, nhiều game thì về "Trò chơi của tôi" kèm thông báo; các game vừa tạo có **đánh dấu "Mới"** trên thẻ game; lỗi giữ nguyên lựa chọn và có nút thử lại.
- **File dự kiến:** `services/gamesService.ts` (`createGames`), `components/GameCard.tsx` (đánh dấu "Mới"), `pages/CreateGamePage.tsx`, `utils/newGames.ts` (trạng thái "mới" trong phiên làm việc, không lưu máy), tests.
- **Phụ thuộc:** F2, A1.
- **Hoàn thành khi:** chọn 1 loại thì vào editor của game mới; chọn 3 loại thì thấy 3 thẻ "Mới" ở danh sách; đánh dấu mất sau khi mở game hoặc khi tải lại trang.
- **Kiểm tra:** `vitest`; ảnh luồng 1 game, nhiều game, lỗi.

> **Dừng sau nhóm A để bạn duyệt.**

---

## Nhóm B: Xuất bản và chia sẻ (UC-07, FLD-30)

### [ ] B1. Xuất bản trong trình soạn thảo
- **Mục tiêu:** nút **Xuất bản**: kiểm tra chế độ `publish` (UC-07 2c), mock `publishGame`, hộp thoại kết quả có ShareCode, URL, nút sao chép; lỗi 2a, 2b đúng câu SRS và không đổi trạng thái; gọi lại khi đã xuất bản vẫn thành công.
- **File dự kiến:** `components/editor/{PublishButton,SharePanel}.tsx`, `services/publishService.ts`, `api/gamesApi.ts` (`publishGame` thật), tests.
- **Phụ thuộc:** A1, F3.
- **Hoàn thành khi:** game thiếu đáp án không xuất bản được và liệt kê câu cần sửa; thành công đổi trạng thái sang "Đã đăng" và thẻ game có mã.
- **Kiểm tra:** `vitest`; ảnh thành công, lỗi 2a/2b/2c.

### [ ] B2. Mã QR (`qrcode.react` ĐÃ ĐƯỢC DUYỆT)
- **Mục tiêu:** hiện QR cho `shareUrl` (và cho `joinUrl` ở nhóm C).
- **File dự kiến:** `package.json` + lock (thêm `qrcode.react`), `components/ui/QrCode.tsx`, tests.
- **Phụ thuộc:** B1. Bạn đã duyệt cài `qrcode.react` (có trong danh sách duyệt sẵn của `CLAUDE.md`); lý do: vẽ QR cho ShareCode và PIN, tự viết bộ tạo QR là không thực tế.
- **Hoàn thành khi:** QR quét được ra đúng URL; có tên truy cập cho trình đọc màn hình.
- **Kiểm tra:** `vitest` (render, giá trị); ảnh; (nếu có) thử quét bằng điện thoại.

### [ ] B3. Soạn tin gửi phụ huynh
- **Mục tiêu:** hộp văn bản mẫu có thể sửa (tên game, link, mã), nút sao chép; không gửi đi đâu.
- **File dự kiến:** `components/editor/ParentMessage.tsx`, `utils/parentMessage.ts`, tests.
- **Phụ thuộc:** B1.
- **Hoàn thành khi:** mẫu điền đúng dữ liệu game; sửa được; sao chép được; có lời nhắc không nhập thông tin cá nhân của học sinh.
- **Kiểm tra:** `vitest`; ảnh.

### [ ] B4. Lối "tự luyện" và "mở phòng Live" sau khi xuất bản
- **Mục tiêu:** hộp thoại sau xuất bản có hai lối: tự luyện (ShareCode) và mở phòng Live với tên phòng, `SOLO`/`TEAM`, số người tối đa, số đội (2 đến 6); gọi `createSession` mock rồi chuyển sang trang phòng (nhóm C).
- **File dự kiến:** `components/editor/CreateSessionForm.tsx`, `services/sessionService.ts` (mock `createSession`), `types/session.types.ts`, tests.
- **Phụ thuộc:** B1, F2.
- **Hoàn thành khi:** chỉ tạo được phòng từ game đã xuất bản; kiểm tra số người và số đội; tạo xong có PIN 6 chữ số.
- **Kiểm tra:** `vitest` (kiểm tra form, mock); ảnh.

> **Dừng sau nhóm B để bạn duyệt.**

---

## Nhóm C: Phòng Live Arena phía giáo viên (UC-09, FLD-08/19/20/24)

### [ ] C1. Trang phòng: PIN, QR, trạng thái, người vào
- **Mục tiêu:** trang `/rooms/:sessionId` hiển thị PIN lớn, QR/joinUrl, huy hiệu trạng thái (Chờ, Đang diễn ra, Tạm dừng, Kết thúc), số người; khôi phục khi tải lại bằng `getSession`.
- **File dự kiến:** `pages/LiveRoomPage.tsx`, `components/room/{PinDisplay,RoomStatusBadge,ParticipantList}.tsx`, `hooks/useSession.ts`, `routes/paths.ts`, tests.
- **Phụ thuộc:** B4.
- **Hoàn thành khi:** mở theo `sessionId` thấy PIN và trạng thái đúng; phòng không tồn tại hay đã kết thúc báo rõ.
- **Kiểm tra:** `vitest`; ảnh 4 trạng thái, desktop và mobile.

### [ ] C2. Điều khiển phòng (máy trạng thái)
- **Mục tiêu:** nút Bắt đầu, Tạm dừng, Tiếp tục, Kết thúc theo máy trạng thái thuần; nút không hợp lệ bị khóa; lỗi 409 (ví dụ còn học sinh chưa có đội) báo rõ; xác nhận trước khi kết thúc.
- **File dự kiến:** `utils/sessionStateMachine.ts` (+ test bảng chuyển trạng thái), `components/room/RoomControls.tsx`, mở rộng `sessionService`, tests.
- **Phụ thuộc:** C1.
- **Hoàn thành khi:** chỉ cho phép WAITING→ACTIVE, ACTIVE↔PAUSED, mọi→CLOSED; gọi lại lệnh đã ở trạng thái đích vẫn thành công.
- **Kiểm tra:** `vitest` (máy trạng thái, toàn bộ cặp trạng thái và lệnh); ảnh các nút theo trạng thái.

### [ ] C3. Bảng xếp hạng và tiến trình thời gian thực (mock)
- **Mục tiêu:** cổng realtime `LiveArenaGateway` (giao diện) và bản mock (hẹn giờ: người vào, trả lời, điểm); bảng xếp hạng cá nhân (và đội với `TEAM`) cập nhật theo sự kiện, tiến trình từng học sinh; nhãn "Dữ liệu mô phỏng".
- **File dự kiến:** `services/liveArena/{gateway.ts,mockGateway.ts}`, `hooks/useLeaderboard.ts`, `components/room/{Leaderboard,TeamLeaderboard}.tsx`, tests.
- **Phụ thuộc:** C2.
- **Hoàn thành khi:** sự kiện mô phỏng làm bảng đổi thứ hạng đúng điểm (sắp giảm dần, hòa theo thứ tự đã quy ước); đội tính điểm trung bình thành viên.
- **Kiểm tra:** `vitest` (reducer bảng xếp hạng, ca hòa điểm); ảnh bảng có dữ liệu, rỗng.

### [ ] C4. Trạng thái kết nối và tự kết nối lại (FLD-24)
- **Mục tiêu:** huy hiệu Connected, Reconnecting, Disconnected; tự kết nối lại có giới hạn lần; mất kết nối thì giữ dữ liệu cuối cùng và báo; nút thử lại thủ công.
- **File dự kiến:** `hooks/useConnection.ts`, `components/room/ConnectionBadge.tsx`, mở rộng mock gateway (bơm ngắt kết nối), tests.
- **Phụ thuộc:** C3.
- **Hoàn thành khi:** ngắt mạng giả lập chuyển trạng thái đúng thứ tự và khôi phục; không mất danh sách đang hiển thị.
- **Kiểm tra:** `vitest` (máy trạng thái kết nối); ảnh 3 trạng thái.

> **Dừng sau nhóm C để bạn duyệt.**

---

## Nhóm D: Xem kết quả chơi

### [ ] D1. Trang kết quả của một phiên
- **Mục tiêu:** `/results/:sessionId`: số học sinh tham gia, số hoàn thành, điểm trung bình; bảng học sinh (điểm, đúng, sai, hết giờ, trạng thái); kết quả đội (với `TEAM`); phiên đang chạy vẫn xem được.
- **File dự kiến:** `pages/SessionResultsPage.tsx`, `components/results/{ResultsSummary,ParticipantTable}.tsx`, `hooks/useSessionResults.ts`, `services/resultsService.ts` (mock), tests.
- **Phụ thuộc:** C1 (kiểu phiên), F2.
- **Hoàn thành khi:** số liệu tổng đúng với dữ liệu mock; sắp theo điểm giảm dần; trạng thái rỗng khi chưa ai tham gia; nhãn mô phỏng.
- **Kiểm tra:** `vitest` (tính tổng, ca rỗng, hòa điểm); ảnh 4 trạng thái.

### [ ] D2. Câu sai nhiều và chi tiết từng học sinh
- **Mục tiêu:** bảng "câu sai nhiều" (tỉ lệ sai theo câu, sắp giảm dần) tính từ các lượt trả lời; mở chi tiết một học sinh (từng câu: đúng, sai, hết giờ, thời gian).
- **File dự kiến:** `utils/questionStats.ts` (+ test), `components/results/{HardQuestions,ParticipantDetail}.tsx`, mở rộng `resultsService`, tests.
- **Phụ thuộc:** D1.
- **Hoàn thành khi:** tỉ lệ sai tính đúng, bỏ qua học sinh chưa trả lời câu đó; có ghi chú cần backend bổ sung trường thống kê theo câu.
- **Kiểm tra:** `vitest` (tính toán); ảnh.

### [ ] D3. Lối vào kết quả
- **Mục tiêu:** từ thẻ game (đã xuất bản) mở danh sách phiên của game (`listGameSessions`) và vào kết quả hoặc phòng đang mở; từ phòng đã kết thúc có nút "Xem kết quả".
- **File dự kiến:** `components/GameCard.tsx` (nút mới), `components/results/SessionList.tsx`, `pages/GameSessionsPage.tsx`, `routes/paths.ts`, tests.
- **Phụ thuộc:** D1, C1.
- **Hoàn thành khi:** phiên chưa kết thúc dẫn tới phòng, phiên đã kết thúc dẫn tới kết quả; phân biệt SELF với phòng Live.
- **Kiểm tra:** `vitest`; ảnh.

> **Dừng sau nhóm D, báo cáo tổng kết.**

---

## Việc phải làm lại khi điều kiện cho phép

- **Hạn chế đã biết của chơi thử (A2), nằm ở engine `frontend/src/games/` nên chưa sửa trong A2:**
  - *Cảm ứng:* đã kiểm bằng giả lập chạm của trình duyệt (CDP) ở 390px và 768px, chưa kiểm trên máy thật; cần thử trên một điện thoại và một máy tính bảng thật.
  - *Cỡ vùng chạm MATCHING trên điện thoại 390px:* sân chơi co theo chiều rộng (hệ số khoảng 0,45) nên thẻ cao khoảng 49px, dưới mức 64px của `CLAUDE.md`; từ khoảng 470px trở lên mới đủ 64px (máy tính bảng ở 768px thẻ cao khoảng 92px). Cần một subtask cho `ResponsiveStage` hoặc `matchingLayout` (bố cục dọc cho màn hẹp hoặc hệ số co tối thiểu).
  - *Bàn phím:* QUIZ và MATCHING chỉ trả lời được bằng chạm hoặc chuột trên canvas; người chỉ dùng bàn phím chưa chơi thử được (vẫn dùng được nút Thoát). Cần phương án thay thế (nút trả lời ẩn cho trình đọc màn hình) ở engine.

- **Chạy lại `reviewer` cho F4** (khung trang soạn thảo: `pages/WorkspaceEditor.tsx`, `components/editor/*`, `hooks/useGame.ts`, `utils/questionSummary.ts`). Lần chạy ngày 2026-10-14 lỗi 529 (máy chủ quá tải) ba lần liên tiếp nên F4 mới chỉ được tự rà. Tối thiểu chạy lại ở cuối nhóm A, gộp với review của các subtask A.

## Giai đoạn sau (đã thống nhất làm sau task này)

- **Form sửa tay cho 8 loại game còn lại** (AUDIO_VISUAL_MATCH, ODD_ONE_OUT, SPOT_THE_TARGET, WORD_SCRAMBLE, MEMORY_CARD, DRAG_DROP, ORDERING, VISUAL_CLOZE): mỗi loại thêm mô tả trường vào `questionSpecs` và một thành phần form nhỏ nhờ khung ở A3.
- Renderer chơi thử của 8 loại đó (renderer thuộc engine Canvas, ngoài phạm vi).

## Việc ngoài danh sách (hoãn, chờ bạn quyết)
- **Backlog:** FLD-13 khối giải thích (chờ DSL 1.1.0).
- Chia đội thủ công, học sinh tự chọn đội (cần giao diện học sinh).
- Cổng STOMP thật (`@stomp/stompjs`, `sockjs-client`) khi **backend cung cấp tài liệu định dạng message WebSocket** và có backend.
- Đồng bộ SRS, `openapi.yaml` và backend cho các điểm lệch contract đã liệt kê ở `docs/decisions.md`.
