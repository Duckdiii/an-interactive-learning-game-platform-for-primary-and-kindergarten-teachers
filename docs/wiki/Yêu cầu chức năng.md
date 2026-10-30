# Yêu cầu chức năng

Nguồn: `docs/SRS.docx` mục 3.1.2, 3.1.3, bản trích ở `docs/srs/FR-summary.md`. Tiêu chí chấp nhận đúng từng chữ xem nguồn.
Cập nhật: 2026-10-31

Hệ thống có 15 yêu cầu chức năng, mỗi FR ứng với một UC cùng số, chia theo 3 phân hệ. Hỗ trợ cho chúng là 30 trường giao diện FLD, các con số ở [[Quy tắc nghiệp vụ]].

## Phân hệ Giáo viên (Teacher Portal, tối ưu cho PC)

| FR | Tên | Điều phải đạt |
|---|---|---|
| FR-01 | Đăng ký | Tài khoản mới; JWT, phân quyền theo vai trò |
| FR-15 | Đăng nhập | Đúng vai trò, từ chối khi sai hoặc bị khóa |
| FR-02 | Tạo game từ mô tả, giáo án | Tra Yêu cầu cần đạt, sinh bản nháp, hiện bản chơi thử |
| FR-03 | Chơi thử | Dưới góc nhìn học sinh; không ghi điểm, không đổi trạng thái |
| FR-04 | Workspace Editor | Quản lý thẻ câu hỏi, xem trước, lưu nháp |
| FR-05 | Sửa thủ công | Sửa chữ, đáp án, ảnh, âm thanh; vẽ lại ngay |
| FR-06 | AI làm lại | Sinh lại một thẻ, giữ nguyên các câu khác |
| FR-07 | Lưu, xuất bản | PUBLISHED, ShareCode 6 ký tự, URL, QR |

## Phân hệ Học sinh (Student Runtime, tối ưu cho máy tính bảng)

| FR | Tên | Điều phải đạt |
|---|---|---|
| FR-08 | Tự luyện | Không đăng nhập; phiên SELF ghi kết quả kèm tên; chơi lại; khích lệ |
| FR-09 | Phòng chơi tập thể | SOLO hoặc TEAM qua PIN, QR; tính điểm theo đáp án và tốc độ; bảng xếp hạng |
| FR-10 | Kéo thả, lật thẻ | Mượt trên Canvas 2D, phản hồi âm thanh tức thì |
| FR-11 | Giọng đọc | Đọc câu hỏi, từ vựng, hướng dẫn |

## Phân hệ Quản trị

| FR | Tên | Điều phải đạt |
|---|---|---|
| FR-12 | Chi phí, trạng thái | Token, chi phí Gemini, lưu lượng, sức khỏe máy chủ |
| FR-13 | Quản lý giáo viên | Lọc, tìm, khóa, mở khóa; Audit Log |
| FR-14 | Cấu hình AI | Temperature, Max Tokens, ngưỡng kiểm duyệt; đóng băng, khôi phục Prompt |

## Điều chưa được FR nào phủ

Mở phòng và điều khiển phòng từ phía giáo viên, trình chiếu, báo cáo kết quả, kho học liệu. Xem [[Điểm lệch và việc cần chốt]].

Xem thêm: [[Ca sử dụng]], [[Các luồng nghiệp vụ]], [[Yêu cầu phi chức năng]]
