# Điểm lệch và việc cần chốt

Nguồn: đối chiếu `docs/SRS.docx` (cả 5 sơ đồ đã xem), `docs/Dinh_huong_de_tai.docx`, `CLAUDE.md`.
Cập nhật: 2026-10-31

Đây là nhận định của người viết sau khi đối chiếu, không phải nội dung của tài liệu nguồn. Mỗi mục cần nhóm quyết định. Wiki chỉ ghi lại, không tự chọn.

## Giữa tài liệu định hướng và SRS

| # | Định hướng | SRS | Cần chốt |
|---|---|---|---|
| 1 | FLD-15 chỉ có 4 loại, cần thống nhất | FLD-15 đã có đủ 10 loại | Định hướng đã cũ ở điểm này |
| 2 | Validation bằng luật "thay cho vòng LLM tự sửa" | Mục 3.1.1 và TS-02: gọi lại LLM kèm lỗi, tối đa 3 lần | Có giữ vòng tự sửa không |
| 3 | Curriculum-RAG bằng embedding và pgvector | Tra theo khối và môn; pgvector là hướng phát triển | Mức nào là cam kết |
| 4 | Có phụ huynh | Không có tác nhân phụ huynh | Có đưa vào đặc tả không |
| 5 | Lưu media trên S3 | Bảng công nghệ không có S3 (sơ đồ kiến trúc thì có) | Bổ sung SRS |
| 6 | Hướng thiết kế là đề xuất vài loại game kèm lý do | Giáo viên chọn, không chọn thì tự xác định | Bổ sung bước đề xuất |

## Trong nội bộ SRS

| # | Điểm lệch | Cần chốt |
|---|---|---|
| 7 | LLM pipeline p95 dưới 3 giây, trong khi KPI-01 cho 60 giây và luồng còn tìm ảnh, sinh giọng | 3 giây đo đoạn nào |
| 8 | Refresh Token 24 giờ, UC-15 ghi nhớ 30 ngày | Ghi rõ hai chế độ |
| 9 | Dịch vụ ngoài giả định uptime 99,0%, hệ thống cam kết 99,5%, chạy gói miễn phí | Mục tiêu có thực tế không |
| 10 | Gói miễn phí nhưng cần 500 học sinh mỗi lớp, RTO 15 phút, WAL | Chọn con số đo được |
| 11 | Bảng 2.2 ghi Tika cho FR-03, trích giáo án thuộc FR-02 | Sửa số |
| 12 | Giọng đọc: UC-02 chỉ Mầm non và Lớp 1; FR-11 nói cả tiểu học | Quy tắc nào đúng |
| 13 | FLD-02 ghi danh mục theo Thông tư 32; UC-02 chỉ 3 môn | Ghi rõ 3 môn |
| 14 | UC-08 chỉ nói QR, đường dẫn; FR-08 có cả mã chia sẻ | Bổ sung UC-08 |
| 15 | KPI-05 có Likert 4,2 và SUS 80; NFR chỉ nhắc SUS | Thống nhất |
| 16 | Chương 5 trống cả 5 mục: RTM, DSL, Prompt, pháp lý, kiến trúc; sơ đồ tuần tự UC-10 chưa chèn | Bổ sung trước khi nộp |

## Giữa chữ và sơ đồ của SRS

| # | Chữ | Sơ đồ | Cần chốt |
|---|---|---|---|
| 17 | Thứ tự: kiểm duyệt rồi mới media (mục 2.1.2) | Tuần tự UC-02: gắn ảnh, giọng rồi mới kiểm tra | Thứ tự nào; ảnh và giọng cũng cần kiểm duyệt |
| 18 | Google Text-to-Speech | Sơ đồ luồng ghi Edge TTS | Sửa sơ đồ |
| 19 | OpenAI Moderation | Sơ đồ kiến trúc ghi Gemini kiểm duyệt; sơ đồ tuần tự ghi OpenAI | Sửa sơ đồ |
| 20 | Admin không nêu Ant Design | Sơ đồ kiến trúc có Ant Design | Chọn một |
| 21 | Có UC-10 | Sơ đồ ca sử dụng không vẽ UC-10 | Bổ sung |
| 22 | Phòng có 4 trạng thái | Sơ đồ lớp chỉ `ACTIVE`, `CLOSED` | Cập nhật sơ đồ |
| 23 | Phiên SELF, SOLO, TEAM | Sơ đồ lớp thêm phiên đấu cặp, phiên gia đình (có tên và liên hệ phụ huynh) | Phiên gia đình có thể đụng thông tin cá nhân |
| 24 | 6 khối lớp | Sơ đồ lớp chỉ 2 giá trị cấp học | Thống nhất |
| 25 | Bảng quan hệ, Flyway | Sơ đồ luồng và kiến trúc ghi JSONB | Sửa sơ đồ theo kiến trúc đã chốt |
| 26 | Spring Boot 4.1 | Sơ đồ kiến trúc ghi Spring Security 6 | Kiểm phiên bản |

## Giữa SRS và quy ước của repo

| # | SRS | `CLAUDE.md` | Cần chốt |
|---|---|---|---|
| 27 | Vùng chạm từ 48px | Tối thiểu 64px | Nên sửa SRS theo mức cao hơn |
| 28 | Canvas Confetti, Ant Design | Không có trong danh sách thư viện đã duyệt | Có dùng không |
| 29 | Sơ đồ lớp có một `PlayInteractionDetail` | 7 lớp con theo nhóm trả lời | Cập nhật sơ đồ |

## Khoảng trống trong đặc tả

- **Trình chiếu và mở phòng không có UC cho giáo viên:** phạm vi có nêu, FR-09 và UC-09 lại đặt tác nhân là học sinh. Luồng giáo viên tạo phòng, điều khiển, chia đội, xem tiến trình chưa được đặc tả. Màn trình chiếu tivi P4 cũng chưa có FR hay UC tương ứng.
- **Báo cáo kết quả cho giáo viên:** sơ đồ luồng có bước này, nhưng không có FR hay UC.
- **Kho học liệu:** xem, tìm, xóa game chưa có UC.
- **Quản lý từ cấm:** có FLD-25 và mục 3.5.2, chưa có luồng trong UC-12 đến UC-14.
- **Quản lý kho Yêu cầu cần đạt:** ai nhập và cập nhật chưa được nêu.
- **Lớp học:** sơ đồ lớp có `Classroom`, không có chức năng nào quản lý.
- **AI dự phòng:** nhiều chỗ nhắc nhưng chưa nêu nhà cung cấp nào; bảng công nghệ chỉ có Gemini.
- **Mô tả ngoài danh mục:** chưa có trong UC-02, xem [[Mô tả ngoài danh mục game]].

## Giới hạn của trang này

- Đã xem 5 trong 18 sơ đồ; 13 sơ đồ tuần tự còn lại chưa đối chiếu.
- Chưa đối chiếu với code. Sơ đồ có thể đã cũ hơn chữ.

Xem thêm: [[Tổng quan đề tài]], [[Kiến trúc và công nghệ]]
