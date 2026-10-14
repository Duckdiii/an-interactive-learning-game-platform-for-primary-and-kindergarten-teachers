# Nhật ký quyết định

Mỗi dòng: **quyết định**, lý do. Tất cả mục dưới đây đã được bạn chốt (kế hoạch được duyệt ngày 2026-10-14).

## Đã chốt

| Ngày | Quyết định | Lý do |
|---|---|---|
| 2026-10-14 | Cập nhật `docs/SRS.docx` bằng bản bạn gửi và chạy lại `scripts/ai-review/extract-srs.mjs` | Bạn yêu cầu; `docs/srs/*.md` sinh tự động, không sửa tay |
| 2026-10-14 | Dữ liệu mô phỏng nằm trong lớp `services/`, luôn có nhãn "Dữ liệu mô phỏng" ở chỗ có kết quả AI | Quy tắc chung của task; để mock không trông như AI thật và thay bằng API thật được |
| 2026-10-14 | **Cờ mô phỏng theo từng endpoint** (`VITE_USE_MOCK`: `all`, `none` hoặc danh sách nhóm endpoint). Nhóm đã có backend thật (đăng nhập) luôn gọi thật. Khi có bất kỳ nhóm nào đang mô phỏng: hiện **banner "Đang dùng dữ liệu mô phỏng"** và **cảnh báo trên console** | Bạn quyết (đề xuất 15); tránh nhầm mock với dữ liệu thật và để bật dần từng endpoint khi backend sẵn sàng |
| 2026-10-14 | Mặc định bật mô phỏng ở môi trường phát triển (`npm run dev`), tắt ở bản build | Backend chưa có `GET /games` nên Trang chủ và "Trò chơi của tôi" đang báo lỗi khi chạy thật |
| 2026-10-14 | Không thêm thư viện nếu chưa nêu lý do và được duyệt | Quy tắc chung của task và `CLAUDE.md` |
| 2026-10-14 | Mỗi subtask một commit riêng, chỉ stage đường dẫn cụ thể | Quy tắc task; tránh lọt `.env`, `dist/`, file tạm |
| 2026-10-14 | Giao diện đề xuất loại game giữ **3 đến 5 loại, chọn nhiều, tối đa 3**; **SRS sẽ được cập nhật theo giao diện** (UC-02 luồng 4c, FLD-15 hiện ghi 2 đến 3 loại, chọn một) | Bạn quyết (đề xuất 1) |
| 2026-10-14 | Giữ **Khối lớp và Môn học tùy chọn** trên giao diện tạo game. **Cần sửa SRS (FLD-01, FLD-02, UC-02 bước 3) và `openapi.yaml` (`GenerateGameRequest.required`)**, nhóm sẽ thống nhất; trong lúc chờ, giao diện không gọi API thật bằng yêu cầu thiếu hai trường này | Bạn quyết (đề xuất 2) |
| 2026-10-14 | Sau xuất bản có hai lối: **"Cho học sinh tự luyện"** (phiên `SELF`, ShareCode, URL, QR) và **"Mở phòng Live"** (`SOLO` hoặc `TEAM`, mã PIN) | Bạn xác nhận cách hiểu "LIVE hoặc SOLO"; SRS tách UC-07/08 khỏi UC-09 |
| 2026-10-14 | Tin nhắn gửi phụ huynh chỉ là **văn bản mẫu có thể sửa kèm nút sao chép**, không gửi và không lưu thông tin phụ huynh | Bạn đồng ý (đề xuất 3); ngoài SRS, NFR-02 cấm lưu thông tin cá nhân |
| 2026-10-14 | Thống kê "câu sai nhiều" **tự tính từ dữ liệu mô phỏng**; ghi rõ **cần backend bổ sung trường thống kê theo câu** (hiện `SessionResults` không có, `GET .../interactions` còn là đề xuất) | Bạn đồng ý (đề xuất 4) |
| 2026-10-14 | **Chơi thử thật cho QUIZ và MATCHING**; 8 loại còn lại hiện khung "chưa hỗ trợ xem thử" **kèm ảnh tĩnh minh họa loại game đó (dùng `GameTypeCover`) và bản chữ, không để trống** | Bạn đồng ý (đề xuất 5); chỉ có hai renderer, engine Canvas ngoài phạm vi |
| 2026-10-14 | Form sửa tay **đầy đủ cho QUIZ và MATCHING**; **8 loại còn lại làm ở giai đoạn sau**. Form dựng **theo bảng mô tả trường rút từ schema** (`questionSpecs`) để thêm loại mới ít tốn công | Bạn quyết (đề xuất 6) |
| 2026-10-14 | Giới hạn dữ liệu dùng **giao của SRS và DSL**: câu ≤ 200 ký tự, thời gian 10 đến 120 giây, điểm 1 đến 100, 1 đến 20 câu, đáp án 2 đến 4 (đúng 1), cặp ghép 3 đến 6. **SRS (câu hỏi ≤ 500 ký tự) lệch DSL (≤ 200), cần nhóm sửa SRS** | Bạn đồng ý (đề xuất 7); chọn phía khắt khe để dữ liệu hợp lệ với cả hai |
| 2026-10-14 | **Bỏ FLD-13 (khối giải thích)**, ghi vào **backlog chờ DSL 1.1.0** | Bạn quyết (đề xuất 8); DSL đang đóng băng 1.0.0 nên không có chỗ lưu |
| 2026-10-14 | Tiện ích `draftStorage` dùng `localStorage` **chỉ cho bản nháp của trình soạn thảo**: **bọc `try/catch`** (trình duyệt chặn lưu thì bỏ qua, không làm hỏng trang), **xóa nháp sau khi lưu thành công**, **không lưu dữ liệu học sinh** | Bạn đồng ý với điều kiện (đề xuất 9); NFR-03 yêu cầu sao lưu khi mất mạng, quy tắc cấm `localStorage` của `CLAUDE.md` dành cho phiên đăng nhập |
| 2026-10-14 | Bắt `409 CONFLICT` khi game có phiên chưa kết thúc và dẫn giáo viên tới phòng đó | Bạn đồng ý (đề xuất 10); contract quy định |
| 2026-10-14 | Chia đội `TEAM` chỉ làm **ngẫu nhiên** trước | Bạn đồng ý (đề xuất 11); hai cách còn lại cần giao diện học sinh |
| 2026-10-14 | Cổng realtime `LiveArenaGateway` với bản mock; chưa cài `@stomp/stompjs`, `sockjs-client`. **Cần backend cung cấp tài liệu định dạng message WebSocket** trước khi viết bản STOMP thật | Bạn đồng ý (đề xuất 12); tài liệu message format chưa viết |
| 2026-10-14 | **Duyệt cài `qrcode.react`** cho subtask B2 | Bạn duyệt (đề xuất 13); thư viện đã nằm trong danh sách duyệt sẵn của `CLAUDE.md` |
| 2026-10-14 | Đường dẫn mới: `/rooms/:sessionId`, `/results/:sessionId`; giữ `/workspace/editor?gameId=` | Bạn đồng ý (đề xuất 14); không phá liên kết hiện có |
| 2026-10-14 | Tạo nhiều game từ bước đề xuất: một game thì mở trình soạn thảo, nhiều game thì về "Trò chơi của tôi". **Các game vừa tạo có đánh dấu "Mới"** ở trang "Trò chơi của tôi" | Bạn đồng ý (đề xuất 16) và thêm đánh dấu "Mới" để giáo viên thấy ngay game vừa sinh |

## Backlog

- **FLD-13 khối giải thích / gợi ý sư phạm:** chờ DSL 1.1.0.
- **Form sửa tay và renderer chơi thử cho 8 loại game còn lại** (giai đoạn sau, xem `docs/plan.md`).
- **Chia đội thủ công và học sinh tự chọn đội** (cần giao diện học sinh).
- **Cổng STOMP thật** (cần tài liệu message format từ backend).
- **Trường thống kê theo câu** ở `SessionResults` (cần backend bổ sung).

## Danh sách lệch contract cần nhóm xử lý (tích lũy)

1. Khối lớp, môn học tùy chọn ở giao diện, trong khi SRS (FLD-01/02, UC-02) và `openapi.yaml` (`GenerateGameRequest`) bắt buộc. **Sửa SRS và `openapi.yaml`.**
2. Số lượng và cách chọn loại game đề xuất khác SRS (3 đến 5 nhiều lựa chọn so với 2 đến 3 chọn một). **Cập nhật SRS theo giao diện.**
3. Giới hạn câu hỏi 500 (SRS) so với 200 ký tự (DSL), thời gian 10 đến 120 (SRS) so với 5 đến 600 giây (DSL). **Nhóm sửa SRS cho khớp DSL.**
4. `SessionResults` thiếu thống kê theo câu; `GET .../interactions` chưa được xác nhận. **Backend bổ sung.**
5. Tài liệu WebSocket Message Format chưa viết. **Backend cung cấp.**
6. `GameDefaults` của Backend tự đặt thời gian 90 × 1,5 = **135 giây** cho MEMORY_CARD khối mầm non, vượt giới hạn 120 giây (SRS) mà giao diện đang chặn: game AI sinh ra không lưu được cho tới khi giáo viên hạ thời gian. **Nhóm chọn một: Backend giới hạn mặc định ≤ 120, hoặc nâng giới hạn thời gian của SRS/giao diện** (test `gameValidation.test.ts` đang ghi nhận xung đột này).
