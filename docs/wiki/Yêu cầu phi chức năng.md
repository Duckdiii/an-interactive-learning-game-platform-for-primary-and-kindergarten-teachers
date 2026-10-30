# Yêu cầu phi chức năng

Nguồn: `docs/SRS.docx` mục 1.2.3, 2.4, 2.5, 3.3, bản trích ở `docs/srs/NFR.md`.
Cập nhật: 2026-10-31

## Năm KPI nghiệp vụ

| KPI | Chỉ số | Baseline | Mục tiêu | Cách lấy minh chứng |
|---|---|---|---|---|
| KPI-01 | Thời gian tạo bài | 15–20 phút | Dưới 60 giây | Timestamp trong audit log |
| KPI-02 | Chấp nhận lần đầu | 0% | Từ 75% | Đếm game xuất bản không qua retry |
| KPI-03 | Sửa tay | 100% | Tối đa 25% trường nội dung | Đếm sự kiện Update Field |
| KPI-04 | Tạo lại toàn bộ | Không áp dụng | Tối đa 10% | Đếm nút Regenerate All |
| KPI-05 | Hài lòng | Thao tác phân mảnh | Likert từ 4,2/5; SUS từ 80/100 | Khảo sát giáo viên |

Muốn báo cáo được KPI-01 đến KPI-04, hệ thống phải **ghi các sự kiện đó ngay từ đầu**. Đây là lưu ý của người viết.

## Năm nhóm NFR

| NFR | Chỉ số | Giải pháp chính |
|---|---|---|
| NFR-01 Hiệu năng | LLM p95 dưới 3 giây; tra chuẩn dưới 500 ms; WebSocket dưới 100 ms; Canvas từ 60 FPS | SSE cho tiến trình, chỉ mục theo khối môn, batching Konva |
| NFR-02 Bảo mật | HTTPS/TLS 1.3, WSS; kiểm duyệt dưới 300 ms; 0% thông tin nhận dạng học sinh; ảo giác dưới 5%; rà 100% giáo án chống prompt injection; khóa sau 5 lần sai | JWT, Moderation song song từ cấm, lọc đầu vào, giáo viên chấm mẫu 50 câu |
| NFR-03 Khả dụng | Uptime từ 99,5%; ngắt lỗi dưới 100 ms | AI dự phòng khi quá 5 giây, nháp LocalStorage |
| NFR-04 Mở rộng | 320px đến 4K; từ 500 học sinh mỗi lớp | Responsive, 10 yêu cầu/phút/người dùng bằng Caffeine |
| NFR-05 Tuân thủ | Đóng băng Prompt v1.0.0 và schema 1.0.0 | Lưu vết SHA-256, audit log mọi giao dịch AI |

## Ràng buộc và giả định

- 100% tiếng Việt; tuân thủ Quyết định 830/QĐ-TTg, kiểm duyệt 100% hình ảnh và từ vựng.
- Ưu tiên gói miễn phí của dịch vụ đám mây trong giai đoạn đồ án.
- Giả định dịch vụ ngoài có uptime từ 99,0%, Internet ổn định, dữ liệu Yêu cầu cần đạt được cập nhật.

## Liên hệ với việc đang làm

- NFR-02 là lý do wiki và memory không chứa dữ liệu học sinh, xem [[README]].
- NFR-04 có 4K và máy chiếu, liên quan màn trình chiếu tivi.
- Một số chỉ số khó đạt cùng lúc, xem [[Điểm lệch và việc cần chốt]].

Xem thêm: [[Yêu cầu chức năng]], [[Kiểm thử và vận hành]]
