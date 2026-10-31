# Mâu thuẫn giao diện và câu hỏi mở

Nguồn: `docs/ui/PLAN.md` mục 2 và mục 6, ngày khảo sát 2026-10-27.
Cập nhật: 2026-10-31

Danh sách đủ 19 mâu thuẫn và 18 câu hỏi, tóm tắt mỗi mục một dòng; lý do và cách xử lý tạm xem [[ui/PLAN|ui/PLAN]]. Chưa đối chiếu mục nào đã được giải quyết trong P1–P4.

## 19 mâu thuẫn

| # | Mâu thuẫn | Cách tạm thời hoặc liên quan |
|---|---|---|
| M1 | Wireframe và đề xuất cần đủ 10 loại, hiện mới 2 renderer | Q1; [[Trạng thái thực tế]] |
| M2 | Bé không đếm giờ, "Cho thử lại" so với `TIMEOUT` và kết quả cũ khi gửi lại | [[Điểm lệch và việc cần chốt]] mục 35 |
| M3 | Ai lo phản hồi đúng sai: SPEC nói khung, mã hiện có nói renderer | Cần lớp nối; Q9 |
| M4 | Hai loại mã, một ô nhập, có thể trùng định dạng | Mục 36; Q3 |
| M5 | Bé không nhập biệt danh nhưng API bắt buộc; hình đại diện không có trường | Q4 |
| M6 | Khung cần biết thông tin game trước khi có `participantId` | [[Bản đồ API]] |
| M7 | Xem lại cần đáp án đã chọn, học sinh chưa đọc được | Tạm lưu trong phiên |
| M8 | Kỷ lục, huy hiệu không có trong contract | Q6 |
| M9 | Phòng đồng bộ theo câu so với mỗi học sinh một nhịp | Q7 |
| M10 | Top 5 và hạng riêng so với `Leaderboard` | Cần mở rộng API |
| M11 | Xóa biệt danh không có endpoint | [[Bản đồ API]] |
| M12 | Bước "Đối chiếu chương trình" không có chức năng thật | Q10 |
| M13 | F5 soạn sẵn nội dung cho từng kiểu, chưa chốt | Q2 |
| M14 | Mặc định thời gian, điểm cấp game, DSL không có chỗ lưu | Q11 |
| M15 | Thông tin xuất bản chưa có API; phiên `SELF` cố định 24 giờ | Q8 |
| M16 | Token màu của SPEC khác `@theme` hiện có | Đổi ở một chỗ |
| M17 | Đăng nhập frontend còn theo contract cũ | Ghi cả trong `CLAUDE.md`; Q12 |
| M18 | MATCHING ở 390px dưới 64px | Sửa trước khi vào khung Bé |
| M19 | Bắt buộc xoay ngang, Safari iOS không khóa được hướng | Màn nhắc xoay |

## 18 câu hỏi cho nhóm

1. Bắt buộc đủ 10 loại, hay chỉ QUIZ, MATCHING và giới hạn đề xuất?
2. F5 soạn sẵn cả 3 kiểu (gấp 3 lượt AI), hay chỉ đề xuất?
3. Tách đường vào hai loại mã, hay đổi định dạng mã?
4. Bé tự luyện dùng biệt danh tự sinh có được không?
5. Trình chiếu chạy cục bộ có đủ, hay cần phiên thật để có số liệu?
6. Bỏ huy hiệu, kỷ lục, hay giữ cục bộ?
7. Phòng đồng bộ theo câu hay nhịp riêng? Ai viết tài liệu WebSocket, ai kiểm thử 30 máy?
8. Hạn chơi cố định 24 giờ hay theo thông tin xuất bản?
9. Phản hồi ở khung hay renderer?
10. Có chức năng "Đối chiếu chương trình" không?
11. Mặc định cấp game chỉ là thao tác nhập hàng loạt?
12. Có làm "Giữ đăng nhập trên máy này" không?
13. Có cần quét QR trong trang không?
14. Nguồn hình nhân vật, tối thiểu bao nhiêu theme?
15. Ai phụ trách `/play/:shareCode` và `src/games/`?
16. Giữ màu xanh dương tạm cho học sinh?
17. Giới hạn phần tử cho Mầm non trên điện thoại ở renderer hay Backend?
18. Chấp nhận sửa khoảng 30 file test cũ theo từng bước?

Câu 5 đã được chọn chạy cục bộ khi làm P4.

Xem thêm: [[Điểm lệch và việc cần chốt]], [[Kế hoạch và việc còn lại]]
