# Ca sử dụng

Nguồn: `docs/SRS.docx` mục 4.2, bản trích ở `docs/srs/UC-01.md` đến `UC-15.md`.
Cập nhật: 2026-10-31

Trang này tóm tắt điều cần nhớ của từng ca. Thông báo đúng từng chữ và các bước đầy đủ xem nguồn.

| UC | Tác nhân | Luồng chính | Rẽ nhánh và ngoại lệ đáng nhớ |
|---|---|---|---|
| UC-01 Đăng ký | Giáo viên | Nhập họ tên, email, mật khẩu, trường (tùy chọn), đồng ý chính sách | Email trùng; thiếu thông tin; chưa đồng ý |
| UC-02 Gửi mô tả | Giáo viên | Chọn khối, môn, mô tả → phân tích, đối chiếu → sinh, media → rà soát → lưu nháp → chơi thử | Chỉ giáo án; tạo ngẫu nhiên; đề xuất 2–3 thể loại (4c); sai định dạng; quá 10MB; không hợp tuổi; không an toàn; AI lỗi |
| UC-03 Chơi thử | Giáo viên | Mở môi trường thử, chơi hết, xem tổng kết mô phỏng | Thoát giữa chừng không lưu; thiếu tài nguyên bắt buộc thì đóng phiên |
| UC-04 Chỉnh sửa | Giáo viên | Danh sách câu bên trái, chơi thử bên phải, lưu nháp | Sửa tay; AI làm lại một thẻ; xuất bản ngay; câu không có đáp án đúng thì không lưu |
| UC-05 Sửa thủ công | Giáo viên | Sửa chữ, đáp án đúng; xem lại ngay | Tải ảnh hoặc MP3; nội dung không an toàn thì giữ bản cũ; tệp sai hoặc quá cỡ bị từ chối |
| UC-06 AI làm lại | Giáo viên | Nhập gợi ý → sinh lại một câu → kiểm tra, media → đưa vào bản đang soạn | Làm lại toàn bộ; không an toàn thì khôi phục câu cũ; AI lỗi thử lại 2 lần |
| UC-07 Lưu, xuất bản | Giáo viên | Lưu, chuyển Đã xuất bản, tạo mã, đường dẫn, QR | Chỉ lưu nháp; không tạo được mã thì chưa xuất bản; dữ liệu chưa hợp lệ thì quay lại sửa |
| UC-08 Tự luyện | Học sinh | QR hoặc đường dẫn → biệt danh → chơi → kết quả | Chơi lại; game không còn; mất mạng giữ trạng thái; không ghi được kết quả thì cho chơi lại |
| UC-09 Tham gia | Học sinh | Mã, tên → kiểm tra phòng → chơi → kết quả | Chờ; vào muộn; thi đấu nhóm; tạm dừng; trùng tên; phòng đầy; phiên đã kết thúc; mất mạng |
| UC-10 Kéo thả, lật thẻ | Học sinh | Thao tác → kiểm tra → phản hồi → tiếp | Lật không khớp thì úp lại; không ghi nhận được thì cho làm lại |
| UC-11 Giọng đọc | Học sinh | Phát giọng đọc, nghe rồi làm tiếp | Nghe lại; không phát được thì vẫn chơi tiếp |
| UC-12 Chi phí | Quản trị | Tổng hợp chỉ số, chi phí, trạng thái lên dashboard | Lọc thời gian, dịch vụ; một dịch vụ lỗi thì các phần khác vẫn hiện; thiếu dữ liệu thì không đoán |
| UC-13 Quản lý giáo viên | Quản trị | Xem, tìm, thao tác, lưu, thông báo | Thêm, sửa, khóa, mở khóa đều có xác nhận và nhật ký |
| UC-14 Bộ não AI | Quản trị | Sửa câu lệnh, tham số; lưu thành phiên bản mới | Đóng băng; khôi phục; giá trị sai thì giữ cấu hình cũ |
| UC-15 Đăng nhập | Giáo viên, Quản trị | Xác thực, chuyển màn theo vai trò | Quên mật khẩu; ghi nhớ 30 ngày; sai mật khẩu; bị khóa; sai quá 5 lần |

## Quan hệ giữa các ca

Theo sơ đồ ca sử dụng: UC-05 và UC-06 mở rộng UC-04; UC-11 mở rộng UC-08 và UC-09. Sơ đồ này không vẽ UC-10.

## Nguyên tắc chung rút ra

- Lỗi của AI hay kiểm duyệt **không làm mất việc của giáo viên**: giữ ý tưởng, giữ câu cũ.
- Cái gì không an toàn thì hủy, không lưu.
- Phụ trợ hỏng (ảnh phụ, âm thanh) thì trò chơi vẫn chạy.

Xem thêm: [[Các luồng nghiệp vụ]], [[Yêu cầu chức năng]], [[Quy tắc nghiệp vụ]]
