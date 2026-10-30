# Bản đồ API

Nguồn: `docs/openapi/openapi.yaml` (REST API Contract v1.1.0), `docs/ui/API-CONTRACT.md`.
Cập nhật: 2026-10-31

Chỉ là bản đồ để định hướng. Field, kiểu và mã lỗi phải đọc từ `openapi.yaml`.

## Số lượng

| Nhóm | Số operation | Trạng thái |
|---|---|---|
| Auth | 6 | 2 `implemented` (refresh, logout), 2 `extended-pending` (register, login), 2 `planned` (quên, đặt lại mật khẩu) |
| Games | 8 | `planned` |
| Sessions | 10 | `planned` |
| Play | 9 | `planned` |
| Media | 1 | `planned` |
| Admin | 15 | `planned` |

Tổng 49: 2 `implemented`, 2 `extended-pending`, 45 `planned`. Realtime dùng STOMP over SockJS tại `/ws/live-arena`, nằm ngoài OpenAPI; **tài liệu message chưa viết**.

## Frontend cần gì từ backend

**Đã có trong spec, chỉ cần cài:** bản game qua mã chia sẻ, bắt đầu chơi, tra phòng theo mã, tham gia, lấy câu hỏi, nộp trả lời, kết quả cá nhân, bảng xếp hạng, xuất bản, vòng đời phiên, sinh game (SSE), quên mật khẩu.

**Thiếu hoặc cần mở rộng (đề xuất, chưa vào spec):**

- Thông tin game trước khi chơi; `PUT /games/{id}/publish-settings`.
- Dạng câu hỏi học sinh và thân trả lời cho 10 loại.
- `GET /sessions/{id}/my-interactions`.
- `GET /games/{id}/insights`, `GET /insights/review-needed`.
- SSE thêm bước sinh nội dung, `POST /games/suggest-types`.
- Lọc phiên theo trạng thái, xóa người tham gia.
- Các sự kiện WebSocket cho phòng.

**Yêu cầu bảo mật đã nêu:** `X-Participant-Id` là credential duy nhất của học sinh; chống dò mã bằng 429; không tin `timeSpentMs`; xáo đáp án bằng HMAC; lọc từ cấm biệt danh; trả 404 thay vì 403 với game của người khác.

**Không cần backend:** huy hiệu, chuỗi đúng, lời khích lệ, trình chiếu lớp (chạy cục bộ từ `GET /games/{id}`).

## Câu hỏi đang chặn

- `gradeLevel`, `subject` có bắt buộc khi sinh game không.
- Phiên `SELF` có tính là phiên chưa kết thúc gây 409 khi xuất bản không.
- Sửa game đã xuất bản có đổi nội dung ngay với học sinh đang chơi không.

Xem thêm: [[Game JSON DSL]], [[Trạng thái thực tế]], [[Các quyết định đã chốt]]
