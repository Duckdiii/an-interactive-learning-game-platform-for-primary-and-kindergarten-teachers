# Tổng quan đề tài

Nguồn: `docs/Dinh_huong_de_tai.docx` mục 0, 1, 9; `docs/SRS.docx` chương 1, 2.
Cập nhật: 2026-10-31

## Đề tài là gì

Nền tảng sáng tạo trò chơi học tập tương tác từ ngôn ngữ tiếng Việt cho giáo viên Mầm non và Tiểu học. Trọng tâm chuyển từ "điền nội dung vào khung có sẵn" sang "mô tả nhu cầu dạy học, AI đề xuất và sinh trò chơi, hệ thống kiểm tra chất lượng, giáo viên chỉ duyệt và chỉnh".

Phép thử của đề tài: gỡ AI khỏi Wordwall hay Kahoot thì nền tảng vẫn chạy thủ công; gỡ AI khỏi hệ thống này thì không còn tạo được game từ mô tả. AI là bộ máy lõi, không phải tính năng phụ. Xem [[So sánh với web tool]].

## Bài toán

- Giáo viên mất 15–20 phút cho mỗi bài. Con số này là baseline trong KPI, **cần xác nhận bằng khảo sát**.
- Công cụ nước ngoài có chi phí nâng cấp cao, hình ảnh thiên về phương Tây, có thể lỗi font tiếng Việt (theo khảo sát trên mạng của nhóm).
- Việc bám Chương trình GDPT 2018 và Giáo dục mầm non vẫn do giáo viên tự đối chiếu.

## Đối tượng

| Nhóm | Vai trò | Ghi chú |
|---|---|---|
| Giáo viên | Mô tả, duyệt, chỉnh, xuất bản, trình chiếu | Người dùng chính |
| Học sinh | Chơi bằng mã, QR, đường dẫn | Không tài khoản, không lưu thông tin nhận dạng |
| Quản trị viên | Chi phí, tài khoản, cấu hình AI, kiểm duyệt | Vận hành |
| Phụ huynh | Chơi cùng con bằng mã chia sẻ | Chỉ có trong tài liệu định hướng, chưa có trong SRS |

## Phạm vi

- **Trong phạm vi:** Toán, Tiếng Việt, Tiếng Anh; Mầm non đến Lớp 5; sinh game từ mô tả hoặc giáo án, chơi thử, chỉnh sửa, xuất bản; kiểm duyệt an toàn; trình chiếu và chơi theo phòng.
- **Ngoài phạm vi:** quản lý trường, điểm danh, sổ điểm; chấm tự luận; game 3D, VR, AR; hạ tầng phần cứng; thanh toán, mua bán học liệu.

## Mục tiêu đo được

Năm KPI chi tiết ở [[Yêu cầu phi chức năng]]. Ngoài ra có yêu cầu của thầy Thanh: chất lượng (độ mượt, sức hấp dẫn, đồ họa) phải hơn web tool, và AI phải xử lý được mô tả nằm ngoài khung có sẵn, xem [[Mô tả ngoài danh mục game]] và [[Trải nghiệm cho trẻ]].

## Rủi ro chính

| Rủi ro | Cách giảm |
|---|---|
| Mới 2/10 loại có trình chơi | Ưu tiên nhóm P0, nói rõ phần còn lại là mở rộng |
| Chất lượng nội dung AI | Validation nhiều lớp, tính lại đáp án Toán bằng code, bộ mô tả mẫu kiểm hồi quy |
| Mô tả ngoài danh mục | Phân loại A–D, phản hồi rõ |
| Chi phí mô hình, người dùng đồng thời | Dự toán chi phí, nêu con số mục tiêu rồi kiểm tra tải |
| Mở rộng quá phạm vi | Chốt mức cam kết, có điểm dừng an toàn |

Xem thêm: [[Trạng thái thực tế]], [[Các luồng nghiệp vụ]], [[Điểm lệch và việc cần chốt]]
