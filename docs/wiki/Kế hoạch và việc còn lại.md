# Kế hoạch và việc còn lại

Nguồn: `docs/ui/PLAN.md`, `docs/ui/SPEC.md` (2026-10-27), `docs/plan.md`, `docs/analysis.md`, `docs/progress-2026-10-16.md`, `docs/Dinh_huong_de_tai.docx` mục 7.
Cập nhật: 2026-10-31

Có hai kế hoạch nối tiếp: `docs/plan.md` (nhóm F, A, B, C, D, tháng 10 đầu) và `docs/ui/PLAN.md` (P0–P5, mới hơn). Khi khác nhau, ưu tiên kế hoạch mới. Không tài liệu nào có phân công theo người hay hạn nộp.

## Thứ tự P0–P5

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| P0 | Backend: bản game học sinh, phiên chơi, chấm, lưu đáp án sai, thông tin xuất bản | Chưa có controller |
| P1 | Nền tảng player | Xong |
| P2 | Chơi cá nhân | P2.1–P2.6 xong; P2b (8 renderer) chưa |
| P3 | Giao diện giáo viên | Xong theo commit |
| P4 | Trình chiếu lớp | Xong theo commit |
| P5 | Thi đấu phòng | Chưa, phụ thuộc spike WebSocket |

## Việc chưa xong từ kế hoạch cũ

Đối chiếu tài liệu, chưa đối chiếu code, nên một số mục có thể đã xong trong P3:

- A7: khôi phục khi AI làm lại cả game.
- Form sửa tay: ORDERING, DRAG_DROP, SPOT_THE_TARGET. Các nguồn lệch nhau về WORD_SCRAMBLE, AUDIO_VISUAL_MATCH.

## Việc từ tài liệu định hướng

- Phân loại mô tả A–D, phản hồi nhóm C, D. Xem [[Mô tả ngoài danh mục game]].
- Bổ sung tựa game mới cho nhóm C.

## Nợ và rủi ro đã ghi

- Mock còn nằm trong bundle build thật.
- 19 mâu thuẫn M1–M19 và 18 câu hỏi trong `docs/ui/PLAN.md` cần nhóm trả lời.
- `WorkspaceEditor` 563 dòng và 8 renderer là nút thắt.
- Thư viện chưa cài cần duyệt: font Baloo 2, Nunito; `@stomp/stompjs`, `sockjs-client` (P5); `jsqr` (không bắt buộc). Âm thanh hiện là tiếng bíp tạm.
- Test chập chờn dưới tải cao; CI dùng `--maxWorkers=2`.
- Chưa thử trên thiết bị thật.

## Ước lượng làm form 8 loại

Theo `docs/plan.md`, tính ngày làm của một người: MEMORY_CARD, ODD_ONE_OUT 0,5–1; VISUAL_CLOZE, WORD_SCRAMBLE 1; AUDIO_VISUAL_MATCH 1–1,5; ORDERING 1,5–2; DRAG_DROP 2; SPOT_THE_TARGET 2,5–3. Đây là form sửa, không phải renderer.

## Thứ tự nên ưu tiên

Nhận định của người viết: làm **P0 cho một đường chạy thật** (sinh QUIZ, xuất bản, học sinh chơi, chấm ở máy chủ) trước khi thêm renderer. Hiện chưa có luồng nào chạy thật từ đầu đến cuối, trong khi đó mới là thứ cần đo KPI và demo.

Xem thêm: [[Trạng thái thực tế]], [[Các quyết định đã chốt]], [[Điểm lệch và việc cần chốt]]
