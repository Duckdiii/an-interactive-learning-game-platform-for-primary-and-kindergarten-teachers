# 1.2.3. Các Chỉ số KPI Nghiệp vụ Định lượng (Key Business KPIs)

Nhằm nâng cao năng suất tạo lập học liệu sư phạm, bảo đảm hiệu quả vận hành và đáp ứng trọn vẹn tiêu chí đánh giá định lượng đồ án, hệ thống thiết lập năm chỉ số KPI nghiệp vụ định lượng cốt lõi được đặc tả tại Bảng 1.1.

Bảng 1.1: Bảng Chỉ số Hiệu quả Nghiệp vụ Định lượng (Key Business KPIs)

| Mã KPI | Tên Chỉ số Nghiệp vụ | Hiện trạng Thủ công (Baseline) | Mục tiêu Phần mềm (Target) | Phương pháp Thu thập Minh chứng |
| --- | --- | --- | --- | --- |
| KPI-01 | Thời gian tạo một bài học (Time to Create) | 15 – 20 phút (chọn mẫu có sẵn, nhập từng câu, chèn ảnh trên PPT/Wordwall/Kahoot/H5P) | < 60 giây với sự hỗ trợ của AI pipeline | Ghi nhận tự động bằng Event Timestamp trong Server Audit Log. |
| KPI-02 | Tỷ lệ chấp nhận lần đầu (First-Gen Acceptance) | 0% (Hoàn toàn thiết kế thủ công) | ≥ 75% nội dung bài học dùng được ngay không cần tạo lại | Thống kê số lượng phiên xuất bản game không qua lệnh retry trên DB. |
| KPI-03 | Tỷ lệ tinh chỉnh thủ công (Manual Edit Rate) | 100% (Phải tự gõ/chọn từng câu chữ) | ≤ 25% tổng số trường nội dung giáo viên cần can thiệp | Ghi nhận số lượt click sự kiện "Update Field" trên Workspace Editor. |
| KPI-04 | Tỷ lệ yêu cầu tạo lại (Regeneration Rate) | Không áp dụng | ≤ 10% trên tổng số lượt sinh bài học | Đếm số lượt người dùng nhấn nút tạo lại toàn bộ bài học (Regenerate All). |
| KPI-05 | Độ hài lòng & Khả dụng (Satisfaction & Usability) | Thao tác phân mảnh, tốn thời gian | Điểm Likert ≥ 4.2/5.0; Điểm SUS ≥ 80/100 | Khảo sát định lượng giáo viên thử nghiệm & đo đạc thang SUS. |
