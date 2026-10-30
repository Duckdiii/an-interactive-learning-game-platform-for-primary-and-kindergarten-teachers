# Yêu cầu phi chức năng

Nguồn: `docs/srs/NFR.md` (trích từ `docs/SRS.docx`).
Cập nhật: 2026-10-31

Năm nhóm NFR để bảo đảm các KPI đã chốt: tạo game dưới 60 giây, chấp nhận ngay lần sinh đầu từ 75%, tỉ lệ sửa tối đa 25%, tỉ lệ sinh lại tối đa 10%, điểm SUS từ 80/100. Giải pháp và công cụ kiểm thử xem nguồn.

| NFR | Hạng mục | Chỉ số chính |
|---|---|---|
| NFR-01 | Hiệu năng | LLM pipeline p95 dưới 3.000 ms; tra YCCĐ dưới 500 ms; đồng bộ Live Arena dưới 100 ms; Canvas từ 60 FPS |
| NFR-02 | Bảo mật, an toàn | HTTPS/TLS 1.3 và WSS; kiểm duyệt dưới 300 ms; 0% lưu thông tin nhận dạng học sinh; ảo giác kiến thức dưới 5% |
| NFR-03 | Khả dụng | Uptime từ 99,5%; phát hiện và ngắt lỗi dưới 100 ms |
| NFR-04 | Mở rộng, tương thích | Màn hình 320px đến 4K; chịu tải từ 500 học sinh mỗi lớp |
| NFR-05 | Quản trị prompt | Đóng băng System Prompt v1.0.0 và `schemaVersion` 1.0.0 |

## Liên hệ với việc đang làm

- NFR-02 về thông tin học sinh là lý do wiki và memory không được chứa dữ liệu học sinh, xem [[README]].
- NFR-04 có màn hình 4K và máy chiếu, liên quan màn trình chiếu tivi.

Xem thêm: [[Yêu cầu chức năng]]
