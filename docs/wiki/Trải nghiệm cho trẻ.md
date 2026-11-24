# Trải nghiệm cho trẻ

Nguồn: `docs/Dinh_huong_de_tai.md` mục 6; `docs/SRS-full.md` mục 3.2.1, 3.2.2.
Cập nhật: 2026-10-31

Yêu cầu của thầy Thanh: độ mượt, sức hấp dẫn, đồ họa phải hơn web tool, nên phần này cần mục tiêu và cách đo cụ thể. Trẻ Mầm non chưa đọc được, nên hình ảnh và giọng đọc là kênh chính.

## Theo nhóm tuổi

Đây là đề xuất của nhóm, **chưa kiểm chứng với trẻ thật**. Được lưu thành hồ sơ lứa tuổi dạng dữ liệu, không viết cứng trong từng game.

| Khía cạnh | Mầm non | Tiểu học |
|---|---|---|
| Chữ | Rất ít, hình lớn | Có chữ, cỡ lớn |
| Điều khiển | Chạm, nút lớn, tránh kéo thả phức tạp | Kéo thả, nhiều bước hơn |
| Âm thanh | Tự đọc đề, phản hồi bằng tiếng | Đọc đề là tùy chọn |
| Phản hồi | Tức thì, tích cực; sai thì khuyến khích, không phạt | Có điểm, đếm giờ nhẹ |
| Số lượng | Ít câu, mỗi màn một nhiệm vụ | Nhiều câu, có thể thi đấu |

## Nguyên tắc cốt lõi

**AI không vẽ đồ họa.** LLM chỉ sinh JSON; hình dạng, màu, hoạt ảnh, âm thanh do renderer, theme và kho asset quyết định. Nhờ vậy chất lượng ổn định, và theme không cần sửa DSL. Nếu cần trường chọn theme trong JSON thì phải tăng phiên bản DSL.

## Đồ họa

- Một bộ màu, bo góc, bóng đổ, nhân vật dẫn dắt dùng chung.
- Pexels ít hợp trẻ nhỏ và văn hóa Việt; hướng đề xuất là bộ minh họa đóng gói sẵn theo chủ đề gần gũi. Ảnh do AI sinh chưa cam kết.
- Theme tách khỏi logic game. Dùng hoạt ảnh Konva cho đúng, sai, hoàn thành.

## Giao diện

- Vùng chạm lớn, Mầm non lớn hơn Tiểu học.
- Font đủ tiếng Việt có dấu, kiểm tra thật trên các trình duyệt.
- Ba ngữ cảnh: máy chiếu, máy tính bảng, điện thoại phụ huynh.
- Độ tương phản đủ rõ; không chỉ dùng màu để báo đúng sai, kèm biểu tượng và âm thanh.
- Thiết bị lớp học: bảng tương tác, tivi, máy chiếu qua HDMI hoặc không dây.

## Âm thanh

- Trình duyệt không cho phát trước lần chạm đầu, nên mỗi game cần màn "Bắt đầu".
- Có hiệu ứng đúng, sai, hoàn thành; nhạc nền nhẹ, có nút tắt.
- Kiểm tra chất lượng phát âm tiếng Anh; chỉ dùng âm thanh có giấy phép rõ ràng.

## Cách đo

- Cùng một bài chạy trên Wordwall và trên hệ thống; giáo viên chấm mức hấp dẫn; đo tỉ lệ trẻ hoàn thành, thời gian tải, độ mượt.
- Lighthouse và kiểm tra font trên nhiều thiết bị.

Thử nghiệm với trẻ cần được giáo viên và phụ huynh đồng ý; tài liệu nguồn chưa nêu quy trình này, đây là lưu ý của người viết.

Bản đầy đủ: [[Dinh_huong_de_tai]].

Xem thêm: [[Mô tả ngoài danh mục game]], [[Kiến trúc và công nghệ]]
