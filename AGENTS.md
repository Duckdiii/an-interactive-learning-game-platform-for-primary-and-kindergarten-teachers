# Quy tắc làm việc trong repository

## Brainstorming phải xác định kết quả nghiệp vụ

Áp dụng khi thiết kế tính năng, sửa hành vi hoặc lập kế hoạch triển khai. Đọc mã và tài liệu liên quan trước khi kết luận hiện trạng.

Mỗi bản brainstorm phải có:

1. **Người dùng và mục tiêu:** ai sử dụng, họ cần hoàn thành việc gì, vấn đề hiện tại gây ảnh hưởng gì.
2. **Hiện trạng có bằng chứng:** dẫn đường dẫn mã/tài liệu; tách điều đã kiểm chứng, mô tả do người dùng cung cấp và giả định đề xuất.
3. **Yêu cầu nghiệp vụ có ID:** dùng `BR-01`, `BR-02`…; mỗi yêu cầu ghi tình huống kích hoạt, hành vi mong đợi, điều kiện thành công và cách xử lý thất bại/ngoại lệ.
4. **Tiêu chí nghiệm thu:** ví dụ đầu vào → kết quả quan sát được, hoặc Given/When/Then. Bao gồm luồng thành công, ngoài phạm vi, dữ liệu không hợp lệ và dịch vụ phụ thuộc lỗi khi có liên quan.
5. **Phạm vi và ưu tiên:** bắt buộc cho đợt này, để sau, không làm; ghi lý do và phụ thuộc.
6. **Phương án và đánh đổi:** so sánh các cách giải quyết thực tế, đề xuất phương án đáp ứng yêu cầu với mức phức tạp phù hợp.
7. **Truy vết:** `BR → thành phần thay đổi → task → kiểm thử/bằng chứng nghiệm thu`.
8. **Điều kiện hoàn tất:** kết quả nào cần được chứng minh, bằng chứng lưu ở đâu và giới hạn nào vẫn còn.

Yêu cầu nghiệp vụ mô tả kết quả cho người dùng, không chỉ tên công nghệ. Ví dụ: “Giáo viên chọn lớp chưa có dữ liệu thì nhận thông báo rõ ràng và hệ thống không gọi AI sinh game”, thay vì chỉ “thêm CurriculumCatalog”.

Gắn nhãn **đề xuất/chưa đo** cho ngưỡng chất lượng, độ trễ, chi phí hoặc chỉ tiêu chưa được xác nhận. Không trình bày mục tiêu như kết quả đã đạt. Không tự giả định đã có dữ liệu chương trình được duyệt.

## Kế hoạch phải giúp AI thực thi và tự kiểm tra

- Mỗi task liên kết các ID nghiệp vụ; ghi file hiện có/file dự kiến tạo, đầu vào/đầu ra, phụ thuộc và tiêu chí xong.
- Với thay đổi hành vi, nêu kiểm thử hồi quy có ý nghĩa, lệnh chạy và kết quả kỳ vọng. Tách kiểm thử local khỏi kiểm thử cần database/API thật.
- Nêu quyết định đã chọn và giả định còn cần xác nhận; không để AI tự suy diễn quy tắc nghiệp vụ quan trọng từ tên class.
- Nếu người dùng chỉ yêu cầu brainstorm và plan, hoàn thành tài liệu để họ xem xét; trạng thái là bản đề xuất, chưa triển khai và chưa được nghiệm thu. Không tự chuyển sang sửa sản phẩm.
- Không ghi task đã hoàn tất chỉ vì đã viết xong kế hoạch. Báo cáo đúng các kiểm thử chưa chạy hoặc bị chặn bởi môi trường.

## Ràng buộc nghiệp vụ RAG của dự án

- Mỗi chunk là một YCCĐ đã đối chiếu nguồn; đối chứng được lưu nhưng bị loại khỏi truy xuất ở mọi môn/lớp.
- Điểm tương đồng cao không tự chứng minh chủ đề hoặc nội dung game đúng chương trình.
- Khi bật RAG, thiếu căn cứ phải dừng sinh game; lỗi dịch vụ phải phân biệt với ngoài phạm vi chương trình.
- Giữ tương thích DSL đang công bố. Đề xuất thêm dữ liệu đánh giá/căn cứ phải làm rõ contract và tác động đến bên tiêu thụ.
- Không lưu topic, prompt, output của giáo viên hoặc secret vào log/cache bền vững nếu chưa có yêu cầu lưu trữ và chính sách truy cập/thời hạn phù hợp.
