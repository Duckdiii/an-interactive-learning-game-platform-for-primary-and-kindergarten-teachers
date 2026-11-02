# Kế hoạch và việc còn lại

Nguồn: `docs/ui/PLAN.md`, `docs/ui/SPEC.md` (2026-10-27), `docs/Dinh_huong_de_tai.md` mục 7.
Cập nhật: 2026-11-02

Kế hoạch hiện hành là `docs/ui/PLAN.md` (P0–P5). Kế hoạch cũ đầu tháng 10 đã bỏ, các ý còn dùng được chép xuống dưới. Không tài liệu nào có phân công theo người hay hạn nộp.

## Thứ tự P0–P5

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| P0 | Backend: bản game học sinh, phiên chơi, chấm, lưu đáp án sai, thông tin xuất bản | Chưa có controller |
| P1 | Nền tảng player | Xong |
| P2 | Chơi cá nhân | P2.1–P2.6 xong; P2b còn 4 renderer |
| P3 | Giao diện giáo viên | Xong theo commit |
| P4 | Trình chiếu lớp | Xong theo commit |
| P5 | Thi đấu phòng | Giao diện xong, chỉ chạy mô phỏng giữa các tab cùng máy ở bản dev; phòng thật chờ Backend (API phiên, WebSocket) |

## Phụ thuộc giữa các bước

P1 rồi P2 (P2b song song với P3), rồi P4. P3.7 cần P1.10. P5 làm cuối. P3.0 (token, font) nên làm sớm.

## Việc chưa xong từ kế hoạch cũ

Chưa đối chiếu từng mục với code, một số mục có thể đã xong trong P3:

- A7: khôi phục khi AI làm lại cả game.
- B4 (lối tự luyện và mở phòng), C1–C4 (trang phòng, trạng thái, xếp hạng, kết nối), D1–D3 (trang kết quả, câu sai nhiều, lối vào kết quả).
- Form sửa tay còn thiếu: ORDERING, DRAG_DROP, SPOT_THE_TARGET.

## Việc từ tài liệu định hướng

- Phân loại mô tả A–D, phản hồi nhóm C, D. Xem [[Mô tả ngoài danh mục game]].
- Bổ sung tựa game mới cho nhóm C.

## Nợ và rủi ro đã ghi

- Mock còn nằm trong bundle build thật.
- 19 mâu thuẫn và 18 câu hỏi cần nhóm trả lời, xem [[Mâu thuẫn giao diện và câu hỏi mở]].
- `WorkspaceEditor` 563 dòng và 4 renderer còn lại là nút thắt.
- Thư viện cần duyệt: font Baloo 2, Nunito; `jsqr` (không bắt buộc). `@stomp/stompjs`, `sockjs-client` đã duyệt sẵn, chỉ chưa cài (P5). Âm thanh hiện là tiếng bíp tạm.
- Test chập chờn dưới tải cao: 17 test cũ rớt khi chạy hai tiến trình vitest cùng lúc, chủ yếu do độ trễ mô phỏng thật và `findBy` chờ 1 giây; hướng sửa là fake timers hoặc độ trễ 0. Đã chốt lấy tải một tiến trình làm chuẩn, CI dùng `--maxWorkers=2`.
- Mã form lặp: `MemoryCardForm` với `MatchingForm`, `OddOneOutForm` với `QuizForm`; gom khi thêm form cùng dạng.
- Hoãn: FLD-13 khối giải thích (chờ DSL 1.1.0), `React.lazy` cho mã QR, chia đội thủ công.
- Chưa thử trên thiết bị thật.

## Thứ tự nên ưu tiên

Nhận định của người viết: làm **P0 cho một đường chạy thật** (sinh QUIZ, xuất bản, học sinh chơi, chấm ở máy chủ) trước khi thêm renderer. Hiện chưa có luồng nào chạy thật từ đầu đến cuối, trong khi đó mới là thứ cần đo KPI và demo.

Xem thêm: [[Trạng thái thực tế]], [[Các quyết định đã chốt]], [[Điểm lệch và việc cần chốt]]
