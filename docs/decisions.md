# Nhật ký quyết định

Mỗi dòng: **quyết định**, lý do. Trạng thái: `ĐÃ CHỐT` (bạn đã quyết hoặc là quy tắc dự án) và `ĐỀ XUẤT` (mặc định tôi chọn, **chưa áp dụng** cho tới khi bạn trả lời).

## Đã chốt

| Ngày | Quyết định | Lý do |
|---|---|---|
| 2026-10-14 | Cập nhật `docs/SRS.docx` bằng bản bạn gửi và chạy lại `scripts/ai-review/extract-srs.mjs` | Bạn yêu cầu; `docs/srs/*.md` sinh tự động, không sửa tay |
| 2026-10-14 | Dữ liệu mô phỏng nằm trong lớp `services/`, bật bằng `USE_MOCK` (`VITE_USE_MOCK`), luôn có nhãn "Dữ liệu mô phỏng" ở chỗ có kết quả AI | Quy tắc chung của task; để mock không trông như AI thật và thay bằng API thật được |
| 2026-10-14 | Không thêm thư viện nếu chưa nêu lý do và được duyệt | Quy tắc chung của task và `CLAUDE.md` |
| 2026-10-14 | Mỗi subtask một commit riêng, chỉ stage đường dẫn cụ thể | Quy tắc task; tránh lọt `.env`, `dist/`, file tạm |
| 2026-10-14 | Giao diện đề xuất loại game giữ **3 đến 5 loại, chọn nhiều, tối đa 3**; **SRS sẽ được cập nhật theo giao diện** (UC-02 luồng 4c, FLD-15 hiện ghi 2 đến 3 loại, chọn một) | Bạn quyết (đề xuất 1) |
| 2026-10-14 | Giữ **Khối lớp và Môn học tùy chọn** trên giao diện tạo game. **Cần sửa SRS (FLD-01, FLD-02, UC-02 bước 3) và `openapi.yaml` (`GenerateGameRequest.required`)**, nhóm sẽ thống nhất; trong lúc chờ, giao diện không gọi API thật bằng yêu cầu thiếu hai trường này | Bạn quyết (đề xuất 2); hiện lệch contract có chủ đích, đã ghi chú trong `utils/generateRequest.ts` |
| 2026-10-14 | Sau xuất bản có hai lối: **"Cho học sinh tự luyện"** (phiên `SELF`, ShareCode, URL, QR) và **"Mở phòng Live"** (`SOLO` hoặc `TEAM`, mã PIN) | Bạn xác nhận cách hiểu "LIVE hoặc SOLO" (đề xuất 2 cũ); SRS tách UC-07/08 khỏi UC-09 |
| 2026-10-14 | Form sửa tay **đầy đủ cho QUIZ và MATCHING**; **8 loại còn lại làm ở giai đoạn sau**. Thiết kế form **theo bảng mô tả trường rút từ schema của game** để thêm loại mới chỉ cần thêm mô tả trường và một thành phần nhỏ | Bạn quyết (đề xuất 6); tránh task phình, giảm chi phí mở rộng |
| 2026-10-14 | Thống kê "câu sai nhiều" **tự tính từ dữ liệu mô phỏng**; ghi rõ **cần backend bổ sung trường thống kê theo câu** (hiện `SessionResults` không có, `GET .../interactions` còn là đề xuất) | Bạn đồng ý (đề xuất 4) |
| 2026-10-14 | **Duyệt cài `qrcode.react`** cho subtask B2 | Bạn duyệt (đề xuất 13); thư viện đã nằm trong danh sách duyệt sẵn của `CLAUDE.md` |

## Đề xuất chờ bạn trả lời (chưa áp dụng)

Bảng ngắn theo yêu cầu có ở phần trả lời; phần dưới là bản đầy đủ để tra cứu. Các mục 3, 5, 7, 8, 9, 10, 11, 12, 14, 15, 16 chưa được bạn quyết.

| # | Quyết định đề xuất | Lý do |
|---|---|---|
| 3 | Tin nhắn gửi phụ huynh chỉ là văn bản mẫu có thể sửa kèm nút sao chép, không gửi và không lưu thông tin phụ huynh | Ngoài SRS; NFR-02 cấm lưu PII; không có contract để gửi |
| 5 | Chơi thử thật cho QUIZ và MATCHING; 8 loại còn lại hiện khung "chưa hỗ trợ xem thử" kèm bản chữ | Chỉ có hai renderer; engine Canvas ngoài phạm vi; không giả lập |
| 7 | Giới hạn dữ liệu dùng giao của SRS và DSL: câu ≤ 200 ký tự, thời gian 10 đến 120 giây, điểm 1 đến 100, 1 đến 20 câu, đáp án 2 đến 4 (đúng 1), cặp ghép 3 đến 6 | SRS (500 ký tự, 10 đến 120 giây) và DSL schema đóng băng (200 ký tự, 5 đến 600 giây) khác nhau; chọn phía khắt khe để dữ liệu hợp lệ với cả hai |
| 8 | Bỏ FLD-13 (khối giải thích) | Ghi "dự kiến schema 1.1.0" trong khi DSL đang đóng băng 1.0.0 |
| 9 | Một tiện ích riêng `draftStorage` dùng `localStorage` chỉ để sao lưu bản nháp trình soạn thảo | NFR-03 yêu cầu; quy tắc "không thao tác localStorage" của `CLAUDE.md` dành cho phiên đăng nhập |
| 10 | Bắt `409 CONFLICT` khi game có phiên chưa kết thúc và dẫn giáo viên tới phòng đó | Contract quy định; tránh giáo viên mất công sửa rồi mới biết |
| 11 | Chia đội `TEAM` chỉ làm ngẫu nhiên trước | Hai cách còn lại (xếp tay, học sinh tự chọn) cần giao diện học sinh |
| 12 | Cổng realtime `LiveArenaGateway` với bản mock; chưa cài `@stomp/stompjs`, `sockjs-client` | Tài liệu message format chưa viết, backend chưa có; không thêm thư viện sớm |
| 14 | Đường dẫn mới: `/rooms/:sessionId`, `/results/:sessionId`; giữ `/workspace/editor?gameId=` | Không phá liên kết hiện có; id nằm trong đường dẫn cho trang mới |
| 15 | `getGames` (và các lệnh mới) đi qua lớp service có `USE_MOCK`, mặc định bật ở môi trường phát triển | Backend chưa có `GET /games` nên Trang chủ và "Trò chơi của tôi" đang báo lỗi khi chạy thật |
| 16 | Tạo nhiều game từ bước đề xuất: một game thì mở trình soạn thảo, nhiều game thì về "Trò chơi của tôi" | Tránh bắt giáo viên chọn game nào mở trước; nối vào mock ở nhóm A |

## Danh sách lệch contract cần nhóm xử lý (tích lũy)

1. Khối lớp, môn học tùy chọn ở giao diện, trong khi SRS (FLD-01/02, UC-02) và `openapi.yaml` (`GenerateGameRequest`) bắt buộc. **Đã chốt: sửa SRS và `openapi.yaml`.**
2. Số lượng và cách chọn loại game đề xuất khác SRS (3 đến 5 nhiều lựa chọn so với 2 đến 3 chọn một). **Đã chốt: cập nhật SRS theo giao diện.**
3. Giới hạn câu hỏi 500 so với 200 ký tự, thời gian 10 đến 120 so với 5 đến 600 giây giữa SRS và DSL (đề xuất 7 chờ duyệt).
4. `SessionResults` thiếu thống kê theo câu; `GET .../interactions` chưa được xác nhận. **Đã chốt: ghi nhận cần backend bổ sung.**
5. Tài liệu WebSocket Message Format chưa viết.
