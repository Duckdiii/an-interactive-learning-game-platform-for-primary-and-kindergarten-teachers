# Ảnh chụp màn hình giao diện soạn thảo (A3, A4, A5)

Chụp trên trình duyệt thật ở chế độ dữ liệu mô phỏng (`VITE_USE_MOCK` bỏ trống khi chạy `npm run dev`), nhóm giáo viên "Nguyễn Thị Lan". Màn hình rộng, bố cục hai cột (danh sách câu và form sửa).

| Ảnh | Subtask | Nội dung |
|---|---|---|
| `a3-quiz-edit-desktop.png` | A3 | Form sửa câu Trắc nghiệm (QUIZ): nội dung câu, ba đáp án, chọn đáp án đúng, thời gian và điểm; ghi chú "từ ngữ được kiểm tra" kèm nhãn "Dữ liệu mô phỏng" |
| `a4-matching-edit-desktop.png` | A4 | Form sửa câu Nối cặp (MATCHING): mỗi cặp có hai bên, mỗi bên có ô chữ và ô mô tả hình ảnh, nút xóa cặp |
| `a5-upload-progress-cancel-desktop.jpg` | A5 (UC-05 1a) | Đã chọn ảnh, đang tải lên 20% với thanh tiến trình và nút "Hủy tải lên"; nút "Gợi ý ảnh" bị khóa trong lúc tải |
| `a5-upload-unsafe-file-error-desktop.jpg` | A5 (UC-05 3b) | Tệp không đạt rà an toàn: đúng câu của SRS, ảnh cũ vẫn được giữ, lựa chọn còn đó để chọn tệp khác |
| `a5-image-suggestions-desktop.jpg` | A5 (FLD-11) | Gợi ý ảnh theo mô tả (mô phỏng Pexels SafeSearch), mỗi ảnh ghi nguồn và có nút "Dùng ảnh này" |
| `a5-voice-picker-generating-desktop.jpg` | A5 (FLD-12) | Chọn giọng đọc nam hoặc nữ và đang tạo giọng đọc từ "Lời đọc" (có nút "Hủy") |

Ảnh mobile và các trạng thái lỗi khác của A3, A4 (lỗi nhập, không an toàn) nằm trong `.playwright-mcp/` trên máy phát triển (thư mục này không đưa lên kho mã). Ảnh mobile và lỗi 3a, mất mạng của A5 đã xem trực tiếp trên trình duyệt khi kiểm tra, chưa lưu thành tệp.
