# T3: hai theme Vũ trụ và Đại dương (ảnh chụp)

Ảnh là **nội dung canvas Konva** (`stage.toDataURL`, JPEG chất lượng 0,85) của trang `/dev/experiments` mục "Theme (T3)", chạy trong trình duyệt nhúng của Claude desktop. Khung xem thử 390 / 768 / 1280 px dùng nút chọn chiều rộng của trang; hệ số co của `ResponsiveStage` đọc từ `stage.scaleX()` lúc chụp là 0,445 / 0,917 / 1 (sân thiết kế rộng 800 px). Dữ liệu mẫu cục bộ: `mockMatchingQuestion` và `mockQuizQuestion`.

| Theme | Cơ chế | 390 | 768 | 1280 |
|---|---|---|---|---|
| Trung tính (mốc) | MATCHING | `neutral_matching_390.jpg` | `neutral_matching_768.jpg` | `neutral_matching_1280.jpg` |
| Trung tính (mốc) | QUIZ | `neutral_quiz_390.jpg` | `neutral_quiz_768.jpg` | `neutral_quiz_1280.jpg` |
| Vũ trụ | MATCHING | `space_matching_390.jpg` | `space_matching_768.jpg` | `space_matching_1280.jpg` |
| Vũ trụ | QUIZ | `space_quiz_390.jpg` | `space_quiz_768.jpg` | `space_quiz_1280.jpg` |
| Đại dương | MATCHING | `ocean_matching_390.jpg` | `ocean_matching_768.jpg` | `ocean_matching_1280.jpg` |
| Đại dương | QUIZ | `ocean_quiz_390.jpg` | `ocean_quiz_768.jpg` | `ocean_quiz_1280.jpg` |

Trạng thái sau khi trả lời (chỉ ở 1280 px), cho từng theme: `*_quizanswered_1280.jpg` (chọn sai đáp án "2": ô chọn màu "thử lại", đáp án đúng màu "đúng") và `*_matchingresult_1280.jpg` (nối sai hai cặp, đúng một cặp: đường đúng liền, đường sai màu "thử lại", đáp án đúng bị bỏ sót nét đứt).

## Giới hạn của bộ ảnh (trung thực)

- **Chưa chụp màn hình thật của trình duyệt**: cửa sổ nhúng bị ẩn nên không chụp được; ảnh lấy thẳng từ canvas nên **không có phần DOM** quanh canvas (nút, bảng) và không phản ánh bố cục trang.
- Ảnh minh họa của câu hỏi QUIZ (ba chú mèo) **không phải lúc nào cũng hiện** ở các ảnh `*_quiz_*`: nạp ảnh của `use-image` không ổn định trong cửa sổ bị ẩn, giống cả ở theme neutral, không liên quan đến theme (xem `ai-usage-log.md` mục T1.4).
- Không có ảnh trên thiết bị cảm ứng thật. Đánh giá thẩm mỹ (nét vẽ SVG, độ phù hợp lứa tuổi) là việc của người dùng và chuyên gia.
- Ngày chụp: 2026-10-18. Việc chụp lại bằng Playwright (Chrome có giao diện) là dự định của T5.2, **chưa có**.
- Cách lấy ảnh: trang gửi `toDataURL` của canvas tới một máy chủ nhận ảnh tạm trên máy (đã tắt, không nằm trong repo).
