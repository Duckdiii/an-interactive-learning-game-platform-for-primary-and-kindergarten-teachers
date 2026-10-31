# Quy tắc nghiệp vụ

Nguồn: `docs/srs/FLD.md`, `docs/srs/FR-summary.md`, `docs/srs/NFR.md`, các file UC; mục 3.1.1 ở `docs/SRS-full.md`.
Cập nhật: 2026-10-31

Tra nhanh các con số. Khi viết code hay test, đối chiếu lại nguồn và contract, xem [[wiki/README|quy tắc wiki]].

## Tài khoản

- Mật khẩu 8–72 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt.
- Access Token 15 phút, Refresh Token 24 giờ; "Ghi nhớ đăng nhập" 30 ngày.
- Sai quá 5 lần liên tiếp thì khóa tạm 15 phút (các mục trong SRS ghi chưa thống nhất).
- Liên kết đặt lại mật khẩu dùng một lần, hết hạn sau 30 phút; thông báo giống nhau dù email có tồn tại hay không; đặt lại xong thì đăng xuất các phiên cũ.
- Vai trò: `ROLE_TEACHER`, `ROLE_ADMIN`. Tài khoản quản trị do hệ thống cấp sẵn.

## Tạo và soạn game

| Mục | Quy tắc |
|---|---|
| Khối lớp | Mầm non (3–5 tuổi), Lớp 1 đến Lớp 5 |
| Mô tả | 10–2.000 ký tự |
| Giáo án | `.pdf`, `.docx`, tối đa 10MB |
| Thể loại | Tùy chọn, 10 loại; không chọn thì hệ thống đề xuất 2–3 loại kèm lý do |
| Nội dung câu | SRS 500 ký tự, DSL 200; giao diện dùng 200 |
| Đáp án | 2–4 đáp án, đúng 1 đáp án đúng |
| Thời gian câu | SRS 10–120 giây, mặc định 30; DSL 5–600 giây |
| Ảnh | JPG, PNG, WebP, tối đa 5MB |
| Âm thanh tải lên | MP3, dưới 10MB |
| Giọng đọc | Nam hoặc Nữ, lưu cùng game |
| Lời giải thích | Tối đa 300 ký tự, dự kiến ở schema 1.1.0 |

Giọng đọc tự sinh cho Mầm non và Lớp 1 theo UC-02.

## Chia sẻ và tham gia

- **ShareCode:** 6 ký tự chữ và số, cấp khi xuất bản, dùng cho tự luyện.
- **PIN phòng:** 6 chữ số, duy nhất trong các phòng chưa kết thúc, chỉ có hiệu lực trong một phiên. Hai mã này khác nhau.
- **Tên người chơi:** 1–20 ký tự, không trùng trong phiên, lọc từ không phù hợp. Chỉ dùng biệt danh.

## Điểm số

- Đúng: `điểm_câu × (1 − 0,5 × tỉ lệ thời gian đã dùng)`. Đúng ngay được trọn điểm, sát giờ còn 50%.
- Sai, bỏ qua, hết giờ: 0 điểm.
- Điểm đội là trung bình điểm thành viên.

## Mã Yêu cầu cần đạt

Mã YCCĐ chỉ dùng nội bộ để làm giàu câu lệnh, không hiển thị trong cấu trúc trò chơi.

## Phòng chơi

Trạng thái `WAITING`, `ACTIVE`, `PAUSED`, `CLOSED`. Các loại phiên: SELF (tự luyện), SOLO và TEAM (theo phòng). Sĩ số tối đa do giáo viên đặt. Chia đội ngẫu nhiên là mặc định, cân bằng số người khi bắt đầu. Máy học sinh hiện trạng thái kết nối Connected, Reconnecting, Disconnected và tự nối lại.

## Cấu hình AI

| Tham số | Giá trị |
|---|---|
| Ngưỡng kiểm duyệt | 0.0–1.0, mặc định 0.85 |
| Temperature | 0.0–1.0, mặc định 0.3 |
| Max Tokens | 500–4.000 |
| System Prompt | Mặc định ACTIVE v1.0.0, có SHA-256 |
| Từ cấm | Cập nhật nóng trong bộ nhớ |

Phiên bản đóng băng không sửa trực tiếp: thay đổi tạo bản mới kế thừa. Khôi phục đặt bản đã chọn làm bản đang dùng. Cấu hình mới áp dụng cho các lượt sinh kế tiếp.

Audit Log lưu IP, thời điểm, Actor ID, thao tác API, kết quả kiểm duyệt. Giọng đọc lưu cùng game để dùng khi tạo lại từng câu.

## Xử lý sự cố toàn cục

| Sự cố | Cách xử lý |
|---|---|
| Mất mạng | Lưu nháp vào LocalStorage, báo, tự đồng bộ lại |
| LLM quá 5 giây | Thanh chờ, chuyển nhà cung cấp dự phòng, quá hạn thì trả bộ khung mẫu |
| JSON sai | Validator theo quy tắc phát hiện dưới 100 ms và quyết định đúng sai; LLM sinh lại phần lỗi, tối đa 3 lần tính cả lần đầu |
| Quá hạn mức 429 | Xếp hàng, đếm ngược rõ ràng |
| Lỗi máy chủ | Thông báo thân thiện, nút Thử lại, giữ dữ liệu đã nhập, ghi log |

Giới hạn gọi API: 10 yêu cầu mỗi phút mỗi người dùng. Quá 5 lần vi phạm từ khóa mỗi phút từ một tài khoản thì khóa tạo game 15 phút.

Bản đầy đủ của 30 trường: [[FLD]].

Xem thêm: [[Ca sử dụng]], [[Yêu cầu phi chức năng]]
