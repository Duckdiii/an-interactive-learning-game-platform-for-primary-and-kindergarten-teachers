# Mô tả ngoài danh mục game

Nguồn: `docs/Dinh_huong_de_tai.md` mục 7.
Cập nhật: 2026-10-31

Đây là vấn đề đang được giải quyết tiếp theo, và là nơi thầy Thanh nhấn mạnh: AI phải tạo được trò chơi hợp bối cảnh giáo viên mô tả, kể cả ngoài kịch bản dựng sẵn.

## Vấn đề

Hệ thống có 10 cơ chế chơi, còn giáo viên mô tả theo nhu cầu dạy học. Khi không khớp, hệ thống phải xử lý rõ ràng, không lặng lẽ ép vào loại gần nhất, cũng không để AI tự bịa cơ chế. UC-02 hiện **chưa có luồng** cho tình huống này. Trang này là đề xuất, chưa phải đặc tả.

## Bốn nhóm

| Nhóm | Tình huống | Ví dụ (do nhóm đặt ra) | Hệ thống làm gì | Mức cam kết |
|---|---|---|---|---|
| A | Khớp loại có sẵn | | Sinh bình thường | Cam kết |
| B | Cùng cơ chế, khác chủ đề | Ghép từ tiếng Anh trong bối cảnh du hành vũ trụ | Sinh theo cơ chế có sẵn, áp theme | Nhận diện: cam kết; theme: thử nghiệm |
| C | Gần loại có sẵn, cần biến thể | Nghe lệnh rồi kéo quả táo vào giỏ | Đề xuất loại gần nhất, nói rõ khác biệt; ghi nhận tựa mới | Nhận diện: cam kết; tựa mới: thử nghiệm |
| D | Ngoài hẳn | Cân thăng bằng; tô theo nét chữ | Báo chưa hỗ trợ, đề xuất 2–3 cách đạt cùng mục tiêu | Nhận diện: cam kết; sinh game mới: hướng nghiên cứu |

## Luồng đề xuất

1. Phân tích ý định: mục tiêu học tập, môn, khối, cơ chế được mô tả.
2. Đánh giá độ phủ: so với danh mục, cho kết luận A, B, C, D kèm mức tin cậy và lý do.
3. Quyết định: A, B sinh ngay; C, D không tự sinh âm thầm mà cho giáo viên chọn.
4. Kiểm tra: mọi nhóm đều qua validation và kiểm duyệt.
5. Ghi nhận: lưu mô tả nhóm C, D để chọn tựa game mới.

## Giáo viên được chọn gì

| Kết luận | Lựa chọn |
|---|---|
| A, B | Chơi thử, chỉnh sửa, xuất bản |
| C | Dùng bản gần nhất, chỉnh lại mô tả, hoặc gửi yêu cầu bổ sung trò chơi |
| D | Chọn 1 trong 2–3 phương án thay thế, hoặc gửi yêu cầu để nhóm xem xét |

## Nguyên tắc

- Không bịa cơ chế.
- Không thay thế âm thầm: giáo viên biết hệ thống đã hiểu mô tả thành loại nào và vì sao.
- An toàn trước, áp dụng như nhau cho mọi nhóm.
- Bảo đảm chất lượng đồ họa trước khi mở rộng sang sinh tự do.
- Giữ nguyên DSL v1.0.0, mở rộng bằng phiên bản mới, tương thích ngược.

## Tiêu chí đánh giá đề xuất

- Bộ mô tả mẫu ba môn gắn nhãn A–D, đo tỉ lệ phân loại đúng.
- 100% mô tả nhóm C, D được phản hồi rõ, không lỗi giao diện, không sinh sai cơ chế.
- Đo tỉ lệ mô tả thật rơi vào từng nhóm khi khảo sát.

## Việc cần làm

- Thêm luồng vào UC-02 trong SRS.
- Xác định chỗ lưu "ghi nhận nhóm C, D": chưa có trong SRS.
- Luồng 4c đề xuất 2–3 trong 10 loại, chưa nói khi không loại nào phù hợp. Đây là chỗ nên nối nhóm C, D vào.
- Tài liệu định hướng còn ghi FLD-15 cần thống nhất, nhưng SRS đã có 10 loại, xem [[Điểm lệch và việc cần chốt]].

Bản đầy đủ: [[Dinh_huong_de_tai]].

Xem thêm: [[Trải nghiệm cho trẻ]], [[Kiến trúc và công nghệ]]
