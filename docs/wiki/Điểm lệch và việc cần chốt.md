# Điểm lệch và việc cần chốt

Nguồn: đối chiếu `docs/SRS-full.md` bản từ `everyone/UI` (commit `5d39f54`, 5 sơ đồ đã xem), `docs/Dinh_huong_de_tai.md`, `docs/decisions.md`, `docs/ui/PLAN.md`, `docs/game-json-dsl-v1.0.0.md`, `CLAUDE.md`.
Cập nhật: 2026-10-31

Đây là nhận định của người viết sau khi đối chiếu, không phải nội dung của tài liệu nguồn. Mỗi mục cần nhóm quyết định. Wiki chỉ ghi lại, không tự chọn.

## Quan trọng nhất

| # | Vấn đề | Vì sao quan trọng |
|---|---|---|
| 30 | NFR-01 đòi LLM p95 dưới 3 giây, timeout 5 giây; đo thật 5–12 giây cho một lần gọi 4 câu ([[Kết quả đo sinh game]]) | Với timeout 5 giây, phần lớn lần gọi sẽ bị coi là quá hạn. Cần đổi mục tiêu hoặc nói rõ đo đoạn nào |
| 31 | Câu hỏi: SRS 500 ký tự, DSL 200; thời gian: SRS 10–120 giây, DSL 5–600 giây | Nên sửa SRS theo DSL đã đóng băng |
| 32 | Đề xuất loại game: SRS 2–3 loại, chọn một; `decisions.md` 3–5 loại, chọn nhiều, tối đa 3 | Giao diện và SRS đang khác nhau |
| 33 | Khối lớp, môn: SRS và `openapi.yaml` bắt buộc; `decisions.md` tùy chọn | Được ghi là chặn khi nối backend thật |
| 34 | LLM lỗi hết lượt: SRS trả bộ khung mẫu; DSL trả 504, không nạp game mẫu | Hai cách xử lý đối nghịch |
| 35 | Bé không đếm giờ (SPEC); FLD-07, backend có TIMEOUT, thời gian bắt buộc | Mâu thuẫn M2 trong `docs/ui/PLAN.md` |
| 36 | Nhập mã: ShareCode 6 ký tự và PIN 6 số dùng chung một ô | Mâu thuẫn M4 trong `docs/ui/PLAN.md` |

## Phát hiện thêm khi đối chiếu lại

| # | Vấn đề | Cần chốt |
|---|---|---|
| 37 | FLD-30 ghi xuất bản lên "kho học liệu dùng chung"; UC-02, UC-04 ghi kho cá nhân; phạm vi loại trừ trao đổi học liệu | Có kho dùng chung không |
| 38 | Khóa đăng nhập: NFR-02 "sau 5 lần", UC-15 "vượt quá 5 lần", TS-07 "N lần" | Thống nhất một con số |
| 39 | Admin được giao quản lý từ điển từ cấm (Bảng 2.1) nhưng không có luồng UC | Thêm vào UC |

## Giữa tài liệu định hướng và SRS

| # | Định hướng | SRS | Cần chốt |
|---|---|---|---|
| 1 | FLD-15 chỉ có 4 loại, cần thống nhất | FLD-15 đã có đủ 10 loại | Định hướng đã cũ ở điểm này |
| 2 | Validation bằng luật "thay cho vòng LLM tự sửa" | Bản mới: validator quyết định đúng sai, nhưng vẫn có vòng LLM sinh lại phần lỗi (tối đa 2 lần gọi lại) | Khớp ở chỗ ai phán; còn lệch ở chỗ có vòng sinh lại |
| 3 | Curriculum-RAG bằng embedding và pgvector | Tra theo khối và môn; pgvector là hướng phát triển | Mức nào là cam kết |
| 4 | Có phụ huynh | Không có tác nhân phụ huynh | Có đưa vào đặc tả không |
| 5 | Lưu media trên S3 | Bảng công nghệ không có S3 (sơ đồ kiến trúc thì có) | Bổ sung SRS |
| 6 | Hướng thiết kế là đề xuất vài loại game kèm lý do | Bản mới có luồng 4c đề xuất 2–3 loại | **Đã khớp**; còn lệch với `decisions.md`, xem mục 32 |

## Trong nội bộ SRS

| # | Điểm lệch | Cần chốt |
|---|---|---|
| 7 | LLM pipeline p95 dưới 3 giây, trong khi KPI-01 cho 60 giây và luồng còn tìm ảnh, sinh giọng (xem mục 30) | 3 giây đo đoạn nào |
| 8 | UC-15 đã nói rõ 30 ngày thay vì 24 giờ; chỉ NFR-02 và bảng công nghệ chưa nhắc | Bổ sung vào NFR-02 |
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
| 17 | Mục 2.1.2: kiểm duyệt rồi mới media. UC-02 bước 5, 6 và luồng 6a: media rồi mới rà soát, nên phần chữ cũng tự lệch | Tuần tự UC-02 theo cách sau | Thứ tự nào; ảnh và giọng cũng cần kiểm duyệt |
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

- **Trình chiếu và mở phòng không có UC cho giáo viên:** phạm vi có nêu, FR-09 và UC-09 lại đặt tác nhân là học sinh. Luồng giáo viên tạo phòng, điều khiển, chia đội, xem tiến trình chưa có trong SRS. Thiết kế có ở `docs/ui/SPEC.md`, nhưng SRS chưa có FR hay UC tương ứng.
- **Báo cáo kết quả cho giáo viên:** sơ đồ luồng có bước này, giao diện F8 cũng có, nhưng SRS không có FR hay UC.
- **Giọng đọc chưa có chỗ lưu:** FLD-12 nói lưu cùng game, DSL 1.0.0 không có trường này.
- **Bước "Đối chiếu chương trình" trên giao diện chưa có chức năng thật:** mâu thuẫn M12 trong `docs/ui/PLAN.md`.
- **Kho học liệu:** xem, tìm, xóa game chưa có UC; phạm vi dùng chung chưa rõ, xem mục 37.
- **Quản lý từ cấm:** có FLD-25 và mục 3.5.2, chưa có luồng trong UC-12 đến UC-14.
- **Quản lý kho Yêu cầu cần đạt:** ai nhập và cập nhật chưa được nêu.
- **Lớp học:** sơ đồ lớp có `Classroom`, không có chức năng nào quản lý.
- **AI dự phòng:** nhiều chỗ nhắc nhưng chưa nêu nhà cung cấp nào; bảng công nghệ chỉ có Gemini.
- **Mô tả ngoài danh mục:** chưa có trong UC-02, xem [[Mô tả ngoài danh mục game]].

## Giới hạn của trang này

- Đã xem 5 sơ đồ; các sơ đồ tuần tự còn lại chưa đối chiếu.
- Chỉ đối chiếu code ở mức tiến độ, xem [[Trạng thái thực tế]]. Sơ đồ có thể đã cũ hơn chữ.
- Toàn bộ mâu thuẫn trong `docs/ui/PLAN.md` ở [[Mâu thuẫn giao diện và câu hỏi mở]].

Xem thêm: [[Tổng quan đề tài]], [[Kiến trúc và công nghệ]]
