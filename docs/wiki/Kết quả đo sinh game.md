# Kết quả đo sinh game

Nguồn: `docs/task-1-quiz-spike-plan.md` (cập nhật 2026-10-04), `docs/task-1-results/`.
Cập nhật: 2026-10-31

Thí nghiệm cô lập: sinh 4 câu Quiz đếm con vật tiếng Việt cho Mầm non, không lưu DB, không qua endpoint. Giới hạn 4 câu là ràng buộc thí nghiệm. **Không đại diện cho toàn pipeline.** Đây chưa phải số đo KPI.

## Kết quả với prompt v4 (2026-10-04)

| Lần đo | Kết quả | Độ trễ thành công (ms) |
|---|---|---|
| Initial | 1 thành công | 8.640 |
| Đo 1 (`measurement-20261003-172353`) | 7 thành công, lần 8 lỗi QUOTA | min 5.241, median 7.950, mean 7.377,7, max 8.752 |
| Đo 2 (`measurement-20261003-173803`) | 7 thành công, lần 8 lỗi QUOTA | min 5.482, median 8.265, mean 7.688,0, max 12.095 |

Cả hai lần chưa đủ 10 lần; nguyên nhân QUOTA chưa xác định.

## Chất lượng

- Mọi lần thành công đều đúng cấu trúc: 4 câu, 4 lựa chọn khác nhau, đáp án hợp lệ.
- Đáp án đúng về số học ở toàn bộ 28 câu của mỗi lần đo.
- Lệch prompt về nội dung: lần 1 có 16/28 câu dùng chữ số thay vì viết chữ, 5 cảnh con vật ngủ, 5 câu đặt chung một chỗ; lần 2 có 9 câu dùng chữ số, 4 cảnh ngủ, 4 câu đặt chung một chỗ.

Cấu hình: prompt `quiz-count-animals-v4`, chỉ `KINDERGARTEN`, `maxRetries(0)`, không đặt temperature. Không được kết luận lỗi QUOTA là hết hạn mức ngày.

Rà soát tay không phải tỉ lệ giáo viên chấp nhận, nên chưa kết luận được KPI-02.

## Ý nghĩa với yêu cầu

Nhận định của người viết:

- Chỉ riêng một lần gọi Gemini cho 4 câu đã mất khoảng 5–12 giây, **vượt xa mục tiêu p95 dưới 3 giây** của NFR-01, và vượt cả ngưỡng timeout 5 giây. Mục tiêu này cần xem lại, xem [[Điểm lệch và việc cần chốt]].
- KPI-01 dưới 60 giây vẫn khả thi về độ trễ gọi mô hình, nhưng chưa tính tra chuẩn, ảnh, giọng đọc, kiểm duyệt.
- Lỗi QUOTA ở lần thứ 8 là tín hiệu cần tính khi demo cho cả lớp.

Lịch sử 2026-09-27 dùng đường gọi cũ, không phải bằng chứng cho v4: 9/10 thành công, 1 lỗi HTTP 503, độ trễ 5.098–8.020 ms.

Xem thêm: [[Yêu cầu phi chức năng]], [[Kiểm thử và vận hành]]
