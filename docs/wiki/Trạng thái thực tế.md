# Trạng thái thực tế

Nguồn: đối chiếu code và lịch sử git trên nhánh `everyone/UI` ngày 2026-10-31, `docs/ui/PLAN.md`, `docs/openapi/openapi.yaml`.
Cập nhật: 2026-10-31

Trang này trả lời "đã làm tới đâu". Đã kiểm sự tồn tại của file, route và commit; **chưa chạy thử ứng dụng** nên chưa biết từng màn hoàn thiện đến đâu. Số phần trăm trong tài liệu định hướng không dùng được.

## Điểm mấu chốt

**Frontend đi trước backend rất xa.** Backend chỉ có `AuthController`. Toàn bộ game, xuất bản, phiên chơi, chấm điểm chưa có endpoint, nên phần lớn giao diện đang chạy trên dữ liệu mô phỏng. Muốn demo thật, đây là khoảng trống lớn nhất.

## So với bảng tiến độ của tài liệu định hướng

| Tài liệu định hướng ghi | Thực tế | Ghi chú |
|---|---|---|
| 2/10 loại có trình chơi | **Đúng** | Chỉ QUIZ, MATCHING trong `player/renderers/index.ts` |
| Giao diện học sinh chưa bắt đầu | **Đã cũ** | Có `/play/:shareCode`, `/join`, các màn chơi, nhưng dùng dữ liệu mô phỏng |
| Teacher Portal 50%, Editor mới là khung | **Đã cũ** | Có đủ F1–F10 theo commit P3 |
| Chưa có endpoint gọi sinh game | **Đúng** | Có service sinh game, chưa có controller |
| Kho YCCĐ chưa bắt đầu | Chưa kiểm | |
| Live Arena chưa bắt đầu | **Đúng** | Không có route hay thư mục phòng |

## Frontend

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| P1 | Nền tảng player | Đã commit `67add76` |
| P2.1–P2.6 | Chơi cá nhân | Đã commit `ec02b6f` |
| P2b | 8 renderer còn lại | **Chưa làm** |
| P3 | Giao diện giáo viên F1–F10 | Đã commit `5655278` |
| P4 | Trình chiếu Mầm non | Đã commit `ba88fb2` |
| P5 | Thi đấu theo phòng | **Chưa làm**, phụ thuộc spike WebSocket |

Có 178 file test trên `everyone/UI`.

## Backend

- Tầng sinh game có `GameGenerationService`, `GameContentGenerator`; chưa có `POST /games/generate`.
- OpenAPI: 49 operation; 2 `implemented`, 2 `extended-pending`, 45 `planned`. Xem [[Bản đồ API]].
- Diff backend giữa `main` và `everyone/UI` chỉ là một dòng `pom.xml`.

## Việc lớn còn lại

1. Backend cho game, xuất bản, phiên chơi, chấm điểm.
2. 8 renderer còn lại, hoặc giới hạn gợi ý AI về loại đã có.
3. Thi đấu theo phòng.
4. Kho YCCĐ.
5. Nối frontend với API thật, bỏ dữ liệu mô phỏng khỏi bản build.

Xem thêm: [[Kế hoạch và việc còn lại]], [[Điểm lệch và việc cần chốt]]
