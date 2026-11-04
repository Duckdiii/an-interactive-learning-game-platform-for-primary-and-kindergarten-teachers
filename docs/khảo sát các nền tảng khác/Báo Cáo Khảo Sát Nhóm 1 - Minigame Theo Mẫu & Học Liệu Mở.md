# Báo Cáo Khảo Sát Nhóm 1 - Minigame Theo Mẫu & Học Liệu Mở

> **Khảo sát đối thủ**: [[Khảo sát 7 nhóm nền tảng đối thủ]] | [[Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 1 - Minigame Theo Mẫu|Nghiên cứu chuyên sâu Nhóm 1: Minigame Theo Mẫu]]



> **Tài liệu nguồn gốc**: `Báo Cáo Khảo Sát Nhóm 1 - Minigame Theo Mẫu & Học Liệu Mở.pdf`  
> **Tổng số trang**: 1  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---

BÁO CÁO KHẢO SÁT CHUYÊN ĐỀ • NHÓM 1/7
Minigame Tương Tác Theo Mẫu & Widget Học Liệu Mở
Khảo sát 06 nền tảng: Wordwall, H5P, Educaplay, Educandy, LearningApps.org, BookWidgets • Đề tài Nghiên cứu Nền tảng Tạo
Game Giáo Dục AI
1. BẢN CHẤT CƠ CHẾ & LUỒNG VẬN HÀNH CỐT LÕI
Nhóm công cụ này vận hành theo mô hình Template-Driven Architecture: hệ thống định nghĩa sẵn các khuôn mẫu mã
nguồn (kéo-thả, lật thẻ, đập chuột, nối từ, ô chữ). Giáo viên đóng vai trò biên soạn nội dung tĩnh theo biểu mẫu (Form
input). Khi lưu trữ, hệ thống khớp dữ liệu vào bộ khung có sẵn để render thành minigame trên nền tảng web.
2. PHÂN TÍCH CHUYÊN SÂU 06 NỀN TẢNG ĐẠI DIỆN
1. Wordwall (Chuẩn mực minigame lớp học)
Ưu điểm: 30+ thể loại minigame tương tác vật lý sống động
(Whack-a-mole, Wheel, Matching, Open the box), thư viện cộng
đồng 25M+ tài nguyên.
Hạn chế: Nhập liệu thủ công 100% từng từ và ảnh; gói Pro đắt
đỏ; bản miễn phí giới hạn 5 tài nguyên; không có cơ chế bóc
tách giáo án tự động.
2. H5P (HTML5 Package - Nguồn mở quốc tế)
Ưu điểm: 50+ loại nội dung tương tác (Interactive Video,
Branching Scenario, Accordion), chuẩn LTI tích hợp sâu vào
LMS Canvas/Moodle.
Hạn chế: Quy trình soạn thảo kỹ thuật phức tạp; thiên về bài
giảng lý thuyết thụ động hơn là minigame giải trí xúc giác cho
trẻ nhỏ.
3. Educaplay (Tích hợp AI Ray)
Ưu điểm: 16 định dạng HTML5 hấp dẫn (Froggy Jumps,
Matching Pairs); tích hợp AI Ray sinh câu hỏi theo chủ đề nhập
vào.
Hạn chế: Đồ họa hoạt hình còn thô cứng; AI chỉ sinh trắc
nghiệm chữ tiếng Anh; bản miễn phí ngập tràn quảng cáo làm
gián đoạn lớp học.
4. Educandy (Chuyên biệt Mầm non & Lớp 1)
Ưu điểm: Giao diện kẹo ngọt bắt mắt, hitbox lớn thân thiện với
trẻ nhỏ; nhập 1 danh sách từ khóa tự động chuyển hóa thành 8
minigame đơn giản.
Hạn chế: Chỉ xoay quanh khớp chữ và ghi nhớ cơ bản; không
xử lý được các bài toán phân loại logic đa tầng; không hỗ trợ
tải tệp giáo án.
5. LearningApps.org (Học viện Bern - Thụy Sĩ)
Ưu điểm: Hoàn toàn miễn phí, 20+ module (trục thời gian, sắp
xếp thứ tự, phân cặp), hỗ trợ lấy mã nhúng iFrame tiện lợi.
Hạn chế: Giao diện Web 2.0 lỗi thời; tương tác kéo-thả trên
iPad dễ bị giật lag hoặc trượt trang; không có AI sinh học liệu
tự động.
6. BookWidgets (Hệ thống Widget chuyên sâu)
Ưu điểm: 40+ tiện ích giáo dục (Jigsaw Puzzle, Whiteboard,
WebQuest); cơ chế tự chấm điểm mạnh mẽ tích hợp trong
Microsoft Teams/Google Classroom.
Hạn chế: Mô hình đóng phí bản quyền trường học đắt; cấu
hình nghiệp vụ mất hàng giờ kéo thả; thiếu bản địa hóa tiếng
Việt.
3. MA TRẬN ĐỐI SO SÁNH KỸ THUẬT & SƯ PHẠM
Nền tảng
Dạng tương tác chính
Cơ chế nhập liệu
Mức độ AI
Phí sử dụng
Wordwall
Minigame vật lý (Kéo-thả, đập
chuột)
Form thủ công từng thẻ/ảnh
Hỗ trợ tạo Quiz
chữ
Freemium (5
game)
H5P
Video tương tác, Flashcard,
Kịch bản
Form cấu hình phức tạp
Không có sẵn
Mã nguồn mở /
SaaS
Educaplay
Froggy Jumps, Ô chữ, Bản đồ
Form hoặc Prompt AI
AI Ray (Text
prompt)
Miễn phí có
quảng cáo
Educandy
Anagrams, Nối từ, Ghép tranh
kẹo
Nhập danh sách từ vựng
Không hỗ trợ
Freemium
LearningApps
Phân nhóm, Ghép đôi, Dòng
thời gian
Nhập tay từng ô dữ liệu
Không hỗ trợ
Miễn phí 100%
BookWidgets
Puzzle, Whiteboard, Quiz tự
chấm
Form tùy biến nâng cao
Gợi ý cơ bản
Trả phí thương
mại
Luận Điểm Bảo Vệ Cho Đề Tài Khóa Luận: Các công cụ Nhóm 1 chứng minh minigame kéo-thả là phương pháp tiếp thu trực
quan số 1 cho học sinh nhỏ tuổi. Tuy nhiên, rào cản lớn nhất là "Nỗi đau chuẩn bị thủ công": giáo viên mất từ 30-60 phút để
tìm ảnh, gõ từng chữ. Đề tài giải quyết triệt để vấn đề này bằng cơ chế Prompt-to-Physics Game: nhận prompt hoặc tệp giáo
án, bóc tách RAG và tự động sinh JSON Schema để render thẳng ra Canvas 2D mượt mà trong dưới 3 giây.
Tài Liệu Khảo Sát Khoa Học • Phân Hệ Minigame Template-Driven
Trang 1 / 1
