# Các quyết định đã chốt

Nguồn: `docs/decisions.md` (2026-10-14 đến 2026-10-16). Tóm tắt theo chủ đề; đủ chi tiết và lý do xem nguồn.
Cập nhật: 2026-10-31

Các quyết định này ra đời trước đợt P1–P4, và thuộc giai đoạn giao diện cũ. Một phần có thể đã bị `docs/ui/SPEC.md` thay thế, ví dụ soạn thảo nay tự lưu. **Chưa đối chiếu từng mục với code.**

## Dữ liệu mô phỏng

- Mock nằm ở `services/`, luôn có nhãn. Cờ `VITE_USE_MOCK` theo nhóm endpoint; nhóm có backend thật luôn gọi thật; bật khi dev, tắt khi build.

## Tạo game

- Khối lớp và môn tùy chọn; cần sửa SRS và `openapi.yaml`. Thiếu hai trường thì không gọi API thật.
- Đề xuất 3–5 loại, chọn nhiều, tối đa 3. **Khác SRS** (2–3 loại, chọn một).
- Nhiều loại chạy song song; không tự thử lại; hủy được.

## Soạn thảo

- Giới hạn lấy giao của SRS và DSL: câu tối đa 200 ký tự, 10–120 giây, điểm 1–100, 1–20 câu, 2–4 đáp án, 3–6 cặp ghép.
- FLD-13 (giải thích) đưa vào backlog chờ DSL 1.1.0.
- Nháp ở `localStorage` gắn với `teacherId`; đăng xuất xóa hết; máy trường dùng chung nên ưu tiên riêng tư.
- AI làm lại một câu: frontend không tự thử lại; có hoàn tác trong phiên; câu AI trả về phải qua `validateGame`; bấm ra ngoài hộp thoại không đóng.
- Chỉ kiểm duyệt đầu ra AI; gợi ý của giáo viên là đầu vào không tin cậy, xử lý ở Backend.
- Chơi thử thật chỉ QUIZ, MATCHING; 8 loại còn lại hiện "chưa hỗ trợ". Hệ quả: 8 loại này xuất bản được nhưng chưa chơi được.

## Media

- Xác định loại tệp bằng magic bytes, cấm SVG, ảnh tối đa 5MB, MP3 tối đa 10MB. Chỉ chặn sớm ở giao diện, Backend vẫn là chốt thật.
- Rà an toàn tệp hiện là **giả lập**.
- Không đưa tệp nhị phân vào `localStorage`.

## Xuất bản

- `DRAFT` sang `PUBLISHED`; xuất bản lại giữ mã; "Tạo lại toàn bộ" về `DRAFT`; không có hủy xuất bản.
- `qrcode.react` 4.2.0; QR chỉ vẽ cho địa chỉ http, https an toàn.
- Tin nhắn phụ huynh chỉ là văn bản mẫu để sao chép, không gửi, không lưu.

## Phiên chơi

- Sau xuất bản có 2 lối: tự luyện và mở phòng. Chia đội làm ngẫu nhiên trước. Cổng realtime có bản mock, chờ tài liệu WebSocket.

## Đang chờ nhóm quyết định

- Nơi lưu giọng đọc: thêm trường DSL 1.1.0 hay metadata backend.
- Khôi phục bản trước khi AI tạo lại toàn bộ.
- Phân công trang học sinh và Canvas engine.
- Cách xử lý 8 loại chưa có renderer.

Xem thêm: [[Kế hoạch và việc còn lại]], [[Điểm lệch và việc cần chốt]]
