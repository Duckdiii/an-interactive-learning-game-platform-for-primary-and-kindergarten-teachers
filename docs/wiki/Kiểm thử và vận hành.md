# Kiểm thử và vận hành

Nguồn: `docs/SRS.docx` mục 3.4, 3.5.
Cập nhật: 2026-10-31

## Bốn tầng kiểm thử

| Tầng | Phạm vi | Mục tiêu | Công cụ |
|---|---|---|---|
| Unit | Hàm, class nghiệp vụ | Code coverage từ 75% | JUnit 5, Mockito |
| Integration | API, DB, LLM, Pexels, WebSocket | API thành công từ 99% | Spring Boot Test |
| E2E | Giáo án đến học sinh chơi | 0% sập giao diện | Playwright hoặc Cypress |
| UAT | Thử với giáo viên, học sinh | SUS từ 80/100 | Phiếu SUS |

## Tám kịch bản trọng yếu

| Mã | Kiểm gì | Đạt khi |
|---|---|---|
| TS-01 | Tra Yêu cầu cần đạt | Đúng mã, dưới 500 ms |
| TS-02 | Tự sửa lỗi AI | Sửa được dưới 3 giây, không sập giao diện |
| TS-03 | Kiểm duyệt an toàn | Chặn dưới 300 ms, nhắc giáo viên |
| TS-04 | 500 học sinh Live Arena | Đồng bộ dưới 100 ms, không rớt |
| TS-05 | Trích giáo án 5MB | Bóc đủ văn bản |
| TS-06 | Chuyển AI dự phòng | Chuyển dưới 1 giây, không gián đoạn |
| TS-07 | Đăng nhập sai, tài khoản khóa | Đúng thông báo, khóa tạm |
| TS-08 | Tham số AI sai | Từ chối, giữ cấu hình cũ |

## Giám sát và cảnh báo

| Thành phần | Ngưỡng | Hành động |
|---|---|---|
| Máy chủ | CPU trên 85% trong 5 phút, heap trên 90% | Actuator, Prometheus, Grafana, Webhook |
| AI | Lỗi trên 5%, timeout quá 5 giây | Chuyển dự phòng, ghi log |
| PostgreSQL | Pool trên 85%, truy vấn trên 1.000 ms | Ngắt kết nối treo |
| WebSocket | Mất trên 10% học sinh | Tự kết nối lại, cảnh báo |
| Kiểm duyệt | Trên 5 vi phạm mỗi phút | Khóa tạo game 15 phút, báo quản trị |

## Quản lý phiên bản

- Prompt: thay đổi phải tạo bản mới, gắn SHA-256, ghi vết trước khi áp dụng.
- Schema: nâng phiên bản phải tương thích ngược.
- Từ cấm: cập nhật nóng, không khởi động lại.

## Sao lưu

Full backup 02:00 hằng ngày, mã hóa AES-256; WAL liên tục. RTO dưới 15 phút, RPO dưới 1 giờ.

Các mục tiêu vận hành này cần đối chiếu với gói miễn phí đã nêu trong ràng buộc, xem [[Điểm lệch và việc cần chốt]].

Xem thêm: [[Yêu cầu phi chức năng]], [[Quy tắc nghiệp vụ]]
