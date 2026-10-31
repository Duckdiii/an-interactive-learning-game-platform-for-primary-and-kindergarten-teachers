# Các luồng nghiệp vụ

Nguồn: `docs/SRS-full.md` mục 2.1.2, 2.6, 4.2 (sơ đồ luồng và tuần tự UC-02); `docs/Dinh_huong_de_tai.md` mục 5.1.
Cập nhật: 2026-10-31

## Luồng 5 bước

1. **Tiếp nhận:** chọn khối lớp, môn; thể loại là tùy chọn; nhập mô tả hoặc tải giáo án; trích văn bản.
2. **Phân tích ý định và tra chuẩn:** bóc chủ đề, mục tiêu, số câu, độ khó; tra Yêu cầu cần đạt. Chưa chọn thể loại thì đề xuất 2–3 loại kèm lý do để giáo viên xác nhận.
3. **Sinh cấu trúc và kiểm duyệt:** LLM trả JSON theo schema, kiểm tra và kiểm duyệt.
4. **Bổ sung media:** hình ảnh an toàn, giọng đọc.
5. **Soạn thảo, xuất bản, chơi:** chơi thử, chỉnh sửa, xuất bản, học sinh vào chơi.

Thứ tự bước 3 và 4 không thống nhất giữa các nguồn, xem [[Điểm lệch và việc cần chốt]].

## Hành trình giáo viên

| Bước | UC | Kết quả | Khi lỗi |
|---|---|---|---|
| Đăng ký, đăng nhập | UC-01, UC-15 | Có phiên làm việc theo vai trò | Sai quá 5 lần khóa 15 phút; tài khoản bị khóa thì từ chối |
| Tạo game | UC-02 | Bản nháp và màn chơi thử | Sai tệp, quá 10MB, không hợp tuổi, không an toàn, AI lỗi |
| Chơi thử | UC-03 | Kết quả không được lưu | Thiếu dữ liệu thì không vào được; thiếu ảnh phụ thì bỏ qua |
| Chỉnh sửa | UC-04, UC-05, UC-06 | Bản nháp mới nhất | Câu không có đáp án đúng thì không lưu |
| Xuất bản | UC-07 | Trạng thái PUBLISHED, ShareCode, URL, QR | Dữ liệu chưa hợp lệ thì quay lại sửa |

## Các lối vào khi tạo game (UC-02)

- Có mô tả, có thể kèm giáo án.
- **Chỉ giáo án (3a):** để trống mô tả, hệ thống trích văn bản.
- **Tạo ngẫu nhiên (3b):** chỉ chọn khối lớp và môn, hệ thống tự đề xuất chủ đề.
- **Chưa có:** mô tả không khớp loại game nào, xem [[Mô tả ngoài danh mục game]].

Không hợp tuổi thì hệ thống tạm dừng và gợi ý đổi khối lớp hoặc nội dung, giáo viên chọn rồi chạy lại. Nội dung không an toàn thì từ chối, về màn chuẩn bị. Ảnh hoặc âm thanh không an toàn thì hủy cấu hình và mời "Tạo lại". AI lỗi thì thử lại tối đa 2 lần, sau đó báo lỗi nhưng giữ ý tưởng.

## Hành trình học sinh

**Tự luyện (UC-08, phiên SELF):** quét QR hoặc mở đường dẫn → nhập biệt danh → chơi → xem kết quả và lời khích lệ → có thể chơi lại. Không cần tài khoản.

**Theo phòng (UC-09, phiên SOLO hoặc TEAM):** nhập mã phòng và tên → vào phòng chờ hoặc vào giữa chừng từ câu đầu → chơi theo tiến trình riêng → xem kết quả. Giáo viên điều khiển: Chờ, Đang diễn ra, Tạm dừng, Kết thúc. Thi đấu nhóm có 3 cách chia đội: ngẫu nhiên, thủ công, tự chọn.

Tương tác kéo thả, lật thẻ ở UC-10; giọng đọc và nghe lại ở UC-11. Không phát được âm thanh thì trò chơi vẫn tiếp tục.

## Hành trình quản trị

- **UC-12:** dashboard chi phí và trạng thái, lọc theo thời gian và dịch vụ. Không có billing chính thức thì ước tính từ dữ liệu sử dụng và bảng giá; không đủ dữ liệu mới ghi "Chưa có dữ liệu chi phí". Dịch vụ lỗi thì đánh dấu "Không thể kết nối", các phần khác vẫn hiện.
- **UC-13:** tìm, thêm, sửa, khóa, mở khóa giáo viên, có nhật ký.
- **UC-14:** sửa câu lệnh hệ thống và tham số, đóng băng và khôi phục phiên bản.

Chi tiết từng ca: [[Ca sử dụng]]. Con số và quy tắc: [[Quy tắc nghiệp vụ]].
