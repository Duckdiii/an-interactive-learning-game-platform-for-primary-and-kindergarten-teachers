# Trạng thái thực tế

Nguồn: đối chiếu code và lịch sử git trên nhánh `everyone/UI` ngày 2026-10-31, `docs/ui/PLAN.md`, `docs/openapi/openapi.yaml`.
Cập nhật: 2026-11-07 (thêm mục nhánh `dev`)

Trang này trả lời "đã làm tới đâu". Đã kiểm sự tồn tại của file, route và commit; **chưa chạy thử ứng dụng** nên chưa biết từng màn hoàn thiện đến đâu. Số phần trăm trong tài liệu định hướng không dùng được.

## Điểm mấu chốt

**Frontend đi trước backend rất xa.** Backend chỉ có `AuthController`. Toàn bộ game, xuất bản, phiên chơi, chấm điểm chưa có endpoint, nên phần lớn giao diện đang chạy trên dữ liệu mô phỏng. Muốn demo thật, đây là khoảng trống lớn nhất.

## So với bảng tiến độ của tài liệu định hướng

| Tài liệu định hướng ghi                 | Thực tế   | Ghi chú                                                                   |
| --------------------------------------- | --------- | ------------------------------------------------------------------------- |
| 6/10 loại có trình chơi                 | **Đúng**  | QUIZ, ODD_ONE_OUT, MATCHING, VISUAL_CLOZE, DRAG_DROP, WORD_SCRAMBLE trong `player/renderers/index.ts` |
| Giao diện học sinh chưa bắt đầu         | **Đã cũ** | Có `/play/:shareCode`, `/join`, các màn chơi, nhưng dùng dữ liệu mô phỏng |
| Teacher Portal 50%, Editor mới là khung | **Đã cũ** | Có đủ F1–F10 theo commit P3                                               |
| Chưa có endpoint gọi sinh game          | **Đúng**  | Có service sinh game, chưa có controller                                  |
| Kho YCCĐ chưa bắt đầu                   | Chưa kiểm |                                                                           |
| Live Arena chưa bắt đầu                 | **Đúng**  | Không có route hay thư mục phòng                                          |

## Frontend

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| P1 | Nền tảng player | Đã commit `67add76` |
| P2.1–P2.6 | Chơi cá nhân | Đã commit `ec02b6f` |
| P2b | Renderer còn lại | **Còn 4 loại**: AUDIO_VISUAL_MATCH, MEMORY_CARD, ORDERING, SPOT_THE_TARGET |
| P3 | Giao diện giáo viên F1–F10 | Đã commit `5655278` |
| P4 | Trình chiếu Mầm non | Đã commit `ba88fb2` |
| P5 | Thi đấu theo phòng | Giao diện xong, chỉ chạy mô phỏng giữa các tab cùng máy ở bản dev; phòng thật chờ Backend (API phiên, WebSocket) |

Có 178 file test trên `everyone/UI`.

## Backend

- Tầng sinh game có `GameGenerationService`, `GameContentGenerator`; chưa có `POST /games/generate`.
- OpenAPI: 49 operation; 2 `implemented`, 2 `extended-pending`, 45 `planned`. Xem [[Bản đồ API]].
- Diff backend giữa `main` và `everyone/UI` chỉ là một dòng `pom.xml`.

## Nhánh `dev`: pipeline tạo game thử nghiệm (đối chiếu 2026-11-07)

Các mục trên là của `everyone/UI`. Nhánh `dev` (commit `6c71f36` cùng 18 file sửa chưa commit) thử pipeline tạo game ở `frontend/src/services/pipeline/`:

- Định tuyến Preset/CPF và chọn cơ chế bằng regex từ khóa, không gọi AI. Regex khớp nhầm chuỗi con (ví dụ "trò chơi" chứa "ro" nên ra game hứng quả).
- CPF có 3 cơ chế viết sẵn (bắn cung, hứng quả, chạm bong bóng), nội dung luôn là số chẵn/lẻ. Preset chỉ sinh Quiz cộng/trừ. Bộ gợi ý Bloom trả danh sách cố định.
- 3 cổng kiểm định nằm trong `runGamePipeline`, nhưng giao diện gọi thẳng `generateDynamicCpfSceneGraph` nên không đi qua cổng.
- Màn chơi và trình chiếu sinh lại scene graph mỗi lần mở (số ngẫu nhiên), không dùng bản giáo viên đã xem.
- Canvas CPF vẽ bằng hình học Konva, chưa dùng kho SVG.
- 64 test trong `services/pipeline` đều qua (chạy 2026-11-07), nhưng chỉ dùng câu mẫu.
- Backend có `GameGenerationController` và đường sinh DSL bằng Gemini, nhưng đường CPF không đi qua backend.

Đề xuất sửa: `docs/superpowers/specs/2026-11-07-pipeline-v2-design.md` (đã duyệt hướng 2026-11-07).

## Việc lớn còn lại

1. Backend cho game, xuất bản, phiên chơi, chấm điểm.
2. 4 renderer còn lại, hoặc giới hạn gợi ý AI về loại đã có.
3. Thi đấu theo phòng.
4. Kho YCCĐ.
5. Nối frontend với API thật, bỏ dữ liệu mô phỏng khỏi bản build.

Xem thêm: [[Kế hoạch và việc còn lại]], [[Điểm lệch và việc cần chốt]]
