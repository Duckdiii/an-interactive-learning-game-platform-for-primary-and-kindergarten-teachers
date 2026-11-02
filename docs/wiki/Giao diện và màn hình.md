# Giao diện và màn hình

Nguồn: `docs/ui/SPEC.md`, `docs/ui/wireframes/` (37 file), ngày 2026-10-27.
Cập nhật: 2026-10-31

Danh sách lấy từ tài liệu; chưa mở từng wireframe để so với màn đã cài. Tiến độ xem [[Trạng thái thực tế]].

## Nguyên tắc

- **Hai khung:** Bé (Mầm non, Lớp 1) và Học sinh (Lớp 2–5). Khung do game quyết định qua khối lớp, trẻ không tự chuyển; giáo viên ghi đè được khi xuất bản, lưu ở thông tin xuất bản, không lưu trong JSON game.
- **Một trình chơi, ba tầng:** cấu hình, chính sách, hai khung. Renderer dùng chung, không rải điều kiện theo tuổi.
- **Mầm non ở lớp là trình chiếu tivi:** giáo viên dùng chuột, bàn phím. Điều khiển bằng điện thoại để sau.
- **Ở nhà:** thiết bị chỉ đổi bố cục, không đổi khung.
- **Thi đấu (Lớp 2–5):** câu hỏi trên máy học sinh; tivi chỉ hiện đồng hồ, số bạn đã trả lời, top 5, bục vinh danh. Hạng riêng chỉ hiện trên máy bạn đó. Đóng phòng xóa biệt danh và bảng xếp hạng, chỉ giữ số liệu tổng hợp.
- **Phản hồi cho Bé:** luôn tích cực, không "thua", không đếm giờ, không điểm cá nhân trên tivi.
- **Chấm ở máy chủ:** học sinh không nhận trường đáp án.
- **Giáo viên:** phong cách "Lớp học ấm áp". Soạn thảo 3 cột, tự lưu. Xuất bản có 3 lựa chọn: Trình chiếu, Mở phòng, Giao về nhà. Kết quả có nút "Tạo game ôn tập".

Giả định chưa chốt: bé trên điện thoại bắt buộc xoay ngang. Giá trị số trong hồ sơ tuổi chỉ là mặc định để thử.

## Bản đồ màn hình

Lưu ý: mã nhóm trong SPEC khác tiền tố tên file. File `A-*` là màn giáo viên (F1–F10), còn nhóm A trong SPEC là tivi.

| Nhóm SPEC | Đối tượng                       | Wireframe                                                                                                        |
| --------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A1–A3     | Tivi lớp Mầm non                | Tv-Lobby, Tv-Play, Tv-Result                                                                                     |
| B1–B5     | Bé ở nhà, tablet ngang          | Main, Be-Intro, Be-Play, Be-Result, Be-Error                                                                     |
| C1–C7     | Học sinh trên điện thoại        | Hs-Join, Hs-Nickname, Hs-Intro, Hs-Play, Hs-Result, Hs-Review, Hs-Error                                          |
| D1–D4     | Phòng thi đấu trên tivi         | Room-Lobby, Room-Question, Room-Board, Room-Podium                                                               |
| D5–D7     | Phòng thi đấu trên máy học sinh | Room-Wait, Room-Feedback, Room-Final                                                                             |
| E1–E2     | Học sinh trên máy tính          | Hs-Desk-Join, Hs-Desk-Play                                                                                       |
| E3–E5     | Bé trên điện thoại              | Be-Phone-Rotate, Be-Phone-Play, Be-Phone-Result                                                                  |
| F1–F10    | Giáo viên                       | A-Home, A-Games, A-Create, A-Create-Progress, A-Create-Pick, A-Editor, A-Publish, A-Results, A-Login, A-Register |

## Trạng thái lỗi bắt buộc

Mã sai; game chưa xuất bản, hết hạn, bị tắt; phòng đóng, đã bắt đầu, đủ người; mất mạng (giữ tiến độ, tự nối lại); âm thanh bị chặn; máy dọc khi game cần ngang.

## Token và hợp đồng

- Giáo viên: nền `#FBF6EC`, xanh lá `#0E7A57`, vàng `#F6B93B`, font Baloo 2 và Nunito.
- Học sinh tạm dùng xanh dương `#1F5BD8`, cam `#FF9F1C`. Mọi màu lấy từ token.
- Renderer nhận câu hỏi đã bỏ đáp án, hồ sơ tuổi và `onSubmit`; khung lo đồng hồ, điểm, phản hồi, chuyển câu, âm thanh. Mã hiện có còn lệch, xem M3 ở [[Mâu thuẫn giao diện và câu hỏi mở]].

Bản đầy đủ: [[SPEC]].

## Rủi ro đã ghi trong kế hoạch

Thẻ MATCHING trên điện thoại 390px cao khoảng 49px, dưới mức 64px, phải sửa trước khi dùng cho khung Bé. Giao diện chưa thử trên thiết bị thật.

Xem thêm: [[Trải nghiệm cho trẻ]], [[Kế hoạch và việc còn lại]]
