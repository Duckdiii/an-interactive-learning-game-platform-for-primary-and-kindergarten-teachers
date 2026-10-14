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
| 2026-10-14 | **Sao lưu nháp luôn gắn với MÃ giáo viên** (`teacherId`); chưa có mã thì **không sao lưu và không khôi phục**; **xóa sạch mọi bản sao lưu khi đăng xuất**, đồng thời xóa bộ nhớ đệm truy vấn (danh sách game, game đang mở). Khóa bộ nhớ đệm dùng mã giáo viên (hoặc email khi phiên cũ chưa có mã); chưa đăng nhập thì truy vấn không chạy, không còn khóa chung `anonymous` | Bạn yêu cầu (máy tính ở trường dùng chung); mục 11 của review A1 |
| 2026-10-14 | **Phiên hết hạn (401) KHÔNG xóa bản sao lưu** (để giáo viên đăng nhập lại còn khôi phục công việc), nhưng **bản sao lưu của người khác bị xóa khi có người đăng nhập** và mọi bản bị xóa khi đăng xuất. Hệ quả chấp nhận: bản của A nằm lại trên máy (đọc được bằng devtools) từ lúc hết hạn tới khi có người đăng nhập hoặc đăng xuất; và nếu B đăng nhập trước khi A kịp quay lại thì A mất bản sao lưu đó. Việc ghi sao lưu bị chặn khi phiên đã hết (dọn dẹp lúc rời trang không ghi lại sau đăng xuất, kể cả khi đăng xuất ở tab khác). Phiên thiếu cả mã giáo viên lẫn email bị coi là chưa đăng nhập | Nhận xét review (máy tính ở trường dùng chung: ưu tiên riêng tư hơn tiện lợi) |
| 2026-10-14 | **Nút Quay lại của trình duyệt không bị chặn** khi còn thay đổi chưa lưu vì ứng dụng dùng `BrowserRouter` (không có `useBlocker`). Đã bù bằng cảnh báo khi đóng tab hoặc bấm liên kết trong ứng dụng, cùng bản sao lưu tự động khôi phục được. Cân nhắc chuyển data router sau (xem Backlog) | Bạn ghi nhận (mục 3 phản hồi A1); đổi router ngoài phạm vi A1 |

## Backlog

- **FLD-13 khối giải thích / gợi ý sư phạm:** chờ DSL 1.1.0.
- **Form sửa tay và renderer chơi thử cho 8 loại game còn lại** (giai đoạn sau, xem `docs/plan.md`).
- **Chia đội thủ công và học sinh tự chọn đội** (cần giao diện học sinh).
- **Cổng STOMP thật** (cần tài liệu message format từ backend).
- **Trường thống kê theo câu** ở `SessionResults` (cần backend bổ sung).
- **Chuyển sang data router (`createBrowserRouter`) để chặn được nút Quay lại của trình duyệt** khi còn thay đổi chưa lưu (`useBlocker`); hiện chưa làm vì đổi cách khởi tạo router ảnh hưởng toàn ứng dụng.

## Danh sách lệch contract cần nhóm xử lý (tích lũy)

1. Khối lớp, môn học tùy chọn ở giao diện, trong khi SRS (FLD-01/02, UC-02) và `openapi.yaml` (`GenerateGameRequest`) bắt buộc. **Sửa SRS và `openapi.yaml`.**
2. Số lượng và cách chọn loại game đề xuất khác SRS (3 đến 5 nhiều lựa chọn so với 2 đến 3 chọn một). **Cập nhật SRS theo giao diện.**
3. Giới hạn câu hỏi 500 (SRS) so với 200 ký tự (DSL), thời gian 10 đến 120 (SRS) so với 5 đến 600 giây (DSL). **Nhóm sửa SRS cho khớp DSL.**
4. `SessionResults` thiếu thống kê theo câu; `GET .../interactions` chưa được xác nhận. **Backend bổ sung.**
5. Tài liệu WebSocket Message Format chưa viết. **Backend cung cấp.**
6. **Đã xử lý (2026-10-14):** `GameDefaults` của Backend đặt thời gian 90 × 1,5 = 135 giây cho MEMORY_CARD mầm non: hợp lệ theo DSL (5 đến 600 giây, mọi loại game) nhưng vượt 120 giây của SRS. Giao diện giờ phân biệt hai nguồn: giá trị Backend sinh ra mà giáo viên chưa sửa chỉ kiểm theo DSL; giá trị giáo viên nhập hoặc sửa phải trong 10 đến 120 giây (`validateGame(game, mode, { baseline })`, ghép câu theo `id`). Nhóm vẫn nên thống nhất lại SRS cho khớp DSL; khi đó chỉ cần đổi `QUESTION_LIMITS`.
7. **Khóa lạc quan khi lưu game (cần Backend hỗ trợ).** Hiện `PUT /games/{id}` ghi đè bản mới nhất: hai tab hoặc hai máy cùng sửa một game thì lần lưu sau âm thầm đè lần lưu trước. Backend cần trả `updatedAt` (hoặc `version`) trong `GET`/`PUT`, nhận lại giá trị đó khi lưu và trả `409 CONFLICT` kèm mã riêng khi bản trên máy chủ đã khác. Giao diện đã xử lý 409 (giữ nguyên nội dung đang soạn); khi Backend sẵn sàng chỉ cần gửi kèm mốc phiên bản và thêm thông báo "Bản này đã được sửa ở nơi khác" (nút tải bản mới, hoặc giữ bản của mình), không phải làm lại luồng lưu. **Thêm vào danh sách yêu cầu cho nhóm Backend.**
8. **Bộ lọc từ cấm (FLD-25) phải so khớp theo TỪ NGUYÊN VẸN và GIỮ DẤU tiếng Việt (Backend, Layer 3).** Không bỏ dấu rồi so chuỗi con hoặc so cả cụm đã bỏ dấu: sẽ chặn nhầm tên người và từ vô hại (ví dụ tên "Bảo Lực" bị coi là trùng cụm "bạo lực" sau khi bỏ dấu; "tử sát" và "tự sát", "tù tù" và "từ từ" cũng lẫn). Yêu cầu: chuẩn hóa Unicode NFC, hạ chữ thường, tách theo ranh giới từ, so khớp từ/cụm có dấu; thêm danh sách "ngoại lệ" (tên riêng) nếu cần. Bộ lọc giả lập ở giao diện (`services/mock/safetyCheck.ts`) hiện phải tránh các cụm trùng chữ khi bỏ dấu vì lý do này. **Thêm vào danh sách yêu cầu cho nhóm Backend.**
