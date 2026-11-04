# Báo Cáo Khảo Sát Nhóm 4 - Game Trực Quan & Mô Phỏng 2D

> **Khảo sát đối thủ**: [[Khảo sát 7 nhóm nền tảng đối thủ]] | [[Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 4 - Game Trực Quan & Mô Phỏng 2D|Nghiên cứu chuyên sâu Nhóm 4: Game Trực Quan & Mô Phỏng 2D]]



> **Tài liệu nguồn gốc**: `Báo Cáo Khảo Sát Nhóm 4 - Game Trực Quan & Mô Phỏng 2D.pdf`  
> **Tổng số trang**: 1  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---

BÁO CÁO KHẢO SÁT CHUYÊN ĐỀ • NHÓM 4/7
Game Giáo Dục Trực Quan, Mô Phỏng Vật Lý 2D & MMORPG
Khảo sát 04 nền tảng: Toy Theater, ABCya, PhET Simulations, Prodigy Math & English • Đề tài Nghiên cứu Nền tảng Tạo Game
Giáo Dục AI
1. BẢN CHẤT CƠ CHẾ & LUỒNG VẬN HÀNH CỐT LÕI
Nhóm này ứng dụng công nghệ đồ họa Canvas 2D/WebGL chuyên sâu để trực quan hóa kiến thức thông qua thao tác
vật lý xúc giác (Manipulatives). Trẻ em không cần đọc các định nghĩa trừu tượng mà lĩnh hội khái niệm toán học, khoa
học thông qua việc cân thăng bằng, kéo que tính hoặc du hành giải đố.
2. PHÂN TÍCH CHUYÊN SÂU 04 NỀN TẢNG ĐẠI DIỆN
1. Toy Theater (Kho minigame thao tác trực quan mẫu mực)
Ưu điểm: Thiết kế hoàn hảo cho trẻ 4-7 tuổi: cân thăng bằng học phép cộng, đồng hồ chỉnh kim, kéo cá vào bể đếm số lượng, xếp
khối hình học. Vùng va chạm (hitbox) lớn, phản hồi vật lý nảy mượt mà.
Khoảng trống cốt lõi: Hoàn toàn không phải công cụ tác giả (Authoring Tool). Game được lập trình đóng cứng (hard-coded), giáo
viên không thể thay đổi ngữ liệu hay đưa bài dạy của mình vào.
2. ABCya (Thế giới game hoạt họa mầm non chuẩn Mỹ)
Ưu điểm: Đồ họa hoạt hình bắt mắt, âm thanh rực rỡ; giúp trẻ làm quen chữ cái và số đếm một cách tự nhiên thông qua tương tác
vuốt chạm.
Khoảng trống cốt lõi: Hệ thống đóng độc quyền; toàn bộ nội dung theo chuẩn tiếng Anh; giáo viên không thể tùy biến nội dung theo
chuẩn GDPT Việt Nam.
3. PhET Interactive Simulations (Đại học Colorado Boulder)
Ưu điểm: Chuẩn mực quốc tế về mô phỏng toán và khoa học trên HTML5/WebGL; mô hình mở giúp học sinh tự do thử nghiệm giả
thuyết trực quan.
Khoảng trống cốt lõi: Mã nguồn đóng cố định; không có cơ chế tích hợp ngân hàng câu hỏi hay kịch bản sư phạm cho từng tiết học
cụ thể.
4. Prodigy Math & English (Game nhập vai phiêu lưu thế giới mở)
Ưu điểm: Cơ chế MMORPG lôi cuốn; học sinh tạo nhân vật, thuần hóa thú cưng và đấu phép thuật thông qua việc giải toán theo
thuật toán thích ứng (Adaptive Learning).
Khoảng trống cốt lõi: Đồ họa quá nặng, yêu cầu thiết bị mạnh; không thể phục vụ các hoạt động khởi động 5-10 phút tại lớp; giáo
viên không biên tập được đồ họa game.
3. MA TRẬN ĐỐI SO SÁNH KỸ THUẬT & SƯ PHẠM
Nền tảng
Công nghệ Render
Mức độ tùy biến của
GV
Đối tượng phù hợp
Hỗ trợ tiếng Việt
Toy Theater
HTML5 Canvas 2D
0% (Hard-coded)
Mầm non, Lớp 1-2
Không (Tiếng
Anh)
ABCya
HTML5 / WebGL Animation
0% (Hệ thống đóng)
Mầm non, Tiểu học
Không (Chuẩn
Mỹ)
PhET Simulations
Canvas / WebGL Engine
0% (Cố định mô phỏng)
Tiểu học, Phổ thông
Có bản dịch text
Prodigy
Game Engine 2D MMORPG
Gán mục tiêu có sẵn
Lớp 1 - Lớp 6
Không (Tiếng
Anh)
Luận Điểm Trọng Tâm Cho Báo Cáo Khóa Luận: Sự thành công của Toy Theater và PhET khẳng định: Học qua thao tác vật lý
trực quan 2D là con đường nhận thức tự nhiên nhất của trẻ nhỏ. Tuy nhiên, thị trường lại tồn tại mâu thuẫn lớn: game hay thì
đóng cứng, còn công cụ cho giáo viên tạo lại chỉ cho nhập trắc nghiệm chữ. Đề tài của nhóm lấp đúng khoảng trống này: Xây
dựng Game Engine 2D Canvas (Konva.js) cho phép AI tự động biên dịch giáo án thành trò chơi tương tác vật lý trực quan có
thể tùy biến 100%.
Tài Liệu Khảo Sát Khoa Học • Phân Hệ Game Trực Quan & Mô Phỏng 2D
Trang 1 / 1
