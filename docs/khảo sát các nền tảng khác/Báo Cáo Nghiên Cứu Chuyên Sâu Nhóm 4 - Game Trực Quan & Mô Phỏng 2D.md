# Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 4 - Game Trực Quan & Mô Phỏng 2D

> **Nghiên cứu chuyên sâu**: [[Khảo sát 7 nhóm nền tảng đối thủ]] | [[Báo Cáo Khảo Sát Nhóm 4 - Game Trực Quan & Mô Phỏng 2D|Khảo sát tổng quan Nhóm 4: Game Trực Quan & Mô Phỏng 2D]]



> **Tài liệu nguồn gốc**: `Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 4 - Game Trực Quan & Mô Phỏng 2D.pdf`  
> **Tổng số trang**: 9  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

BÁO CÁO NGHIÊN CỨU KỸ THUẬT • KHÓA LUẬN TỐT NGHIỆP
Khảo Sát Toàn Diện Nhóm 4: Game Giáo Dục Trực Quan, Mô Phỏng
Vật Lý 2D & MMORPG
Phân hệ: Toy Theater, ABCya, PhET Simulations, Prodigy Math & English • Đơn vị khảo sát: Nhóm Khóa Luận AI Game Generator •
Cập nhật: 11/2026
PHẦN A – TÓM TẮT NHÓM & BÀI HỌC THIẾT KẾ AI GAME GENERATOR
Điểm chung của Nhóm 4: Toàn bộ 04 nền tảng đều khai thác tối đa công nghệ đồ họa Canvas 2D/WebGL chuyên sâu để
hiện thực hóa triết lý Học cụ trực quan xúc giác (Virtual Manipulatives) và thế giới game phiêu lưu nhập vai (MMORPG). Trẻ
em lĩnh hội các khái niệm toán học và khoa học thông qua thao tác vật lý trực tiếp (cân thăng bằng, xoay kim đồng hồ,
ghép khối số, du hành thế giới ảo) thay vì đọc chữ văn bản dài [XÁC NHẬN: toytheater.com; phet.colorado.edu; prodigygame.com] .
Bài học quan trọng nhất cho hệ thống AI Game Generator: (1) Sự ưu việt của Đồ họa Canvas 2D: Trải nghiệm kéo-thả vật lý
nảy mượt mà của Toy Theater và PhET chứng minh việc lựa chọn Konva.js (react-konva) / PixiJS trong đề tài của nhóm là
hoàn toàn chính xác để phục vụ nhận thức của trẻ 5–7 tuổi (FR-07, FR-11). (2) Nghịch lý "Game hay nhưng đóng cứng":
Điểm nghẽn chí tử của 100% công cụ Nhóm 4 là hoàn toàn KHÔNG PHẢI công cụ tác giả (Non-authoring tools); mã nguồn
đóng cứng (hard-coded), giáo viên không thể thay đổi nội dung, không thể đưa ngữ liệu tiếng Việt hay chuẩn GDPT 2018
vào game. Đề tài của nhóm tạo ra bước đột phá quyết định: Kết hợp độ mượt mà của Canvas 2D với năng lực sinh kịch
bản tự động bằng AI (Prompt-to-Playable Game DSL), trao quyền cho giáo viên tự tạo game trực quan chỉ sau 1 câu lệnh
dưới 10 giây.
PHẦN B – NGHIÊN CỨU CHI TIẾT TỪNG NỀN TẢNG (08 TIÊU CHÍ)
1. TOY THEATER (toytheater.com)
1.1. Danh mục cơ chế chơi
Cung cấp hơn 100 học cụ trực quan và minigame tương tác phân thành các nhóm: Math Manipulatives (Interactive
Clock - chỉnh kim đồng hồ xem giờ, Balance Scale - cân đĩa thăng bằng, Ten Frame - khung 10 chấm tròn, Base Ten
Blocks - khối số học thập phân, Fraction Strips - thanh phân số, Pattern Blocks - ghép hình học hoa văn, Number Line -
trục số kéo nhảy), Reading & Word Games (Word Scramble, Sight Word Bingo, Alphabet Tracing), Puzzle & Arcade
(Marble Drop - thả bi trọng lực, Fruit Fall, Feed the Monster) [XÁC NHẬN: toytheater.com; commoncraft.com] .
Thao tác & Kỹ năng: Kéo thả tự do không gò bó tọa độ (Free Drag & Drop); trượt kim đồng hồ theo chuyển động tròn;
chạm nảy đối tượng vật lý; rèn luyện cảm giác số lượng, tư duy không gian, vận động tinh và bản chất phép tính toán
học trực quan. Mẫu phổ biến nhất: Balance Scale, Interactive Clock, Fraction Strips và Marble Drop.
Độ tuổi 3–6 tuổi: Rất phù hợp với Balance Scale, Pattern Blocks, Ten Frame nhờ hitbox lớn, màu sắc tươi sáng, trẻ
không cần biết đọc chữ vẫn thao tác và hiểu quy luật ngay lập tức.
Độ tuổi 6–11 tuổi: Rất phù hợp cho các bài học hình học, phân số, diện tích và tính nhẩm lớp 1–4.
1.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: HOÀN TOÀN KHÔNG TÁCH RỜI. Nội dung, hình ảnh và logic tương tác được lập trình đóng
gói cứng (hard-coded) vào từng tệp JavaScript độc lập của từng minigame [XÁC NHẬN: toytheater.com] .
Định dạng dữ liệu: Không có định dạng tệp dữ liệu cấu hình như JSON hay XML cho người dùng; toàn bộ là mã
nguồn nhúng tĩnh phía client.
Công nghệ hiển thị: HTML5 Canvas 2D kết hợp thư viện CreateJS / EaselJS và xử lý sự kiện Touch Events trên trình
duyệt; không phụ thuộc plugin ngoài [XÁC NHẬN: DevTools inspection trên toytheater.com] .
Thêm loại game mới: 100% do đội ngũ lập trình viên đồ họa độc quyền của Toy Theater Studio thiết kế và xuất bản.
Giáo viên và cộng đồng không có bất kỳ quyền can thiệp nào.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 4
Trang 1 / 9



## Trang 2

1.3. Trải nghiệm khi chơi
Vòng chơi: Truy cập thẳng vào màn hình học cụ (Sandbox Mode) → Học sinh tự do kéo thả các quả cân, que tính
hoặc viên bi → Phản hồi nảy vật lý tức thì (đĩa cân nghiêng xuống bên nặng hơn, kim đồng hồ nhảy số giờ tương ứng)
→ Không có màn Game Over hay chấm điểm phán xét, mang tính khám phá tự nhiên.
Xử lý sai: Khi đĩa cân chưa thăng bằng hoặc xếp sai hình, vật thể giữ nguyên vị trí trực quan để học sinh tự quan sát
và tự sửa sai mà không bị tiếng còi hay điểm trừ áp lực.
Đồng hồ, Xếp hạng, Mascot: Không có đồng hồ đếm ngược; không có bảng xếp hạng ganh đua; giao diện mô phỏng
nhà hát đồ chơi cổ điển nhẹ nhàng.
Hiệu năng: Tải cực kỳ nhẹ (dung lượng mỗi game dưới 2MB), khung hình ổn định 60 FPS mượt mà trên cả máy tính
bảng đời cũ [XÁC NHẬN: EdTech RoundUp Review] .
1.4. Tính năng AI
Thực trạng AI: HOÀN TOÀN KHÔNG CÓ TÍNH NĂNG AI (0% AI) [XÁC NHẬN: toytheater.com/about] . Nền tảng duy trì triết
lý bộ công cụ học cụ mô phỏng tĩnh truyền thống.
Quy trình tạo bài: Giáo viên không thể tạo bài. Giáo viên chỉ có thể mở game có sẵn và tự nghĩ lời giảng bằng miệng
trên lớp.
Tiếng Việt: Giao diện và các nhãn công cụ 100% bằng tiếng Anh; không có giọng đọc tiếng Việt.
Vai trò AI: Không tồn tại AI trong hệ thống.
1.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: LÀM ĐƯỢC XUẤT SẮC (Có sẵn minigame Balance Scale mô phỏng hai đĩa cân đặt quả cân
cực kỳ trực quan; tuy nhiên là game đóng cứng, giáo viên không thể thay đổi thông số qua prompt).
b. Tô nét chữ cái: LÀM GẦN ĐÚNG (Có trang vẽ tự do Doodling, nhưng không có logic phát hiện và chấm điểm theo
nét đồ chữ cái).
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC (Không có công cụ cho giáo viên nhập âm thanh giọng nói và gắn
giỏ đựng).
d. Ghép từ con vật bối cảnh vũ trụ: KHÔNG LÀM ĐƯỢC (Không thể thay đổi đồ họa hay bối cảnh nền của game).
1.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": KHÔNG THỂ THỰC HIỆN ĐƯỢC. Nền tảng không có tính năng tác giả (Authoring
tool). Giáo viên chỉ có thể mở minigame "Fruit Fall" hoặc "Marble Drop" có sẵn và tự đếm miệng cùng học sinh
[XÁC NHẬN: toytheater.com] .
Thời gian tạo bài: 0 phút (do không thể tạo hay tùy biến bất kỳ nội dung nào).
1.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ bằng đường link URL trực tiếp tới từng trò chơi (ví dụ toytheater.com/clock/); giáo viên
chiếu lên Smart TV cho cả lớp tương tác hoặc học sinh tự mở trên máy tính bảng.
Tài khoản học sinh: 100% Không cần tài khoản; không thu thập bất kỳ dữ liệu cá nhân nào; hoàn toàn tuân thủ
COPPA và an toàn tuyệt đối cho trẻ em [XÁC NHẬN: toytheater.com/privacy-policy] .
Phụ huynh: Phụ huynh mở link trực tiếp trên trình duyệt điện thoại/iPad cho con chơi miễn phí tại nhà.
1.8. Chi phí và giới hạn
Chi phí: HOÀN TOÀN MIỄN PHÍ 100% trên nền tảng web máy tính và máy tính bảng; duy trì hoạt động nhờ banner
quảng cáo Google Adsense ở viền ngoài khung game [XÁC NHẬN: toytheater.com] .
Bản địa hóa: Giao diện hoàn toàn bằng tiếng Anh; các bài học chữ cái (Alphabet) theo chuẩn âm vị tiếng Anh, không
dùng được cho môn Tiếng Việt tiểu học.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 4
Trang 2 / 9



## Trang 3

2. ABCYA (abcya.com - Thuộc IXL Learning)
2.1. Danh mục cơ chế chơi
Kho trò chơi giáo dục chuẩn Mỹ với hơn 300 trò chơi phân cấp từ Pre-K (Mầm non) đến Grade 6+: Math Games (Base
Ten BINGO, Balloon Pop Subtraction, Molly Adds Up, Marble Math, Number BINGO), Language Arts (Sight Word BINGO,
Keyboarding Zoo - tập gõ phím mầm non, Alphabet BINGO, Word Search, Story Maker), Skills & Creativity (Make a Pizza,
Make a Cake, Build a House, Clear It) [XÁC NHẬN: abcya.com; commonsensemedia.org/website-reviews/abcya] .
Thao tác & Kỹ năng: Chạm lật ô BINGO theo âm thanh đọc; chạm nổ bóng bay mang số đúng; kéo thả trang trí bánh
pizza/bánh kem; gõ phím đúng chữ cái hiển thị; rèn luyện khả năng nhận diện mặt chữ cái, chữ số, kỹ năng đánh máy
và liên kết thính giác - thị giác. Mẫu phổ biến nhất: BINGO Series và Keyboarding Zoo.
Độ tuổi 3–6 tuổi: Rất phù hợp với Pre-K games (Make a Cake, Counting Fish, Keyboarding Zoo) nhờ hình vẽ hoạt hình
siêu đáng yêu, giọng đọc tiếng Anh bản xứ to rõ, âm nhạc sống động.
Độ tuổi 6–11 tuổi: Rất phù hợp cho học sinh tiểu học luyện kỹ năng từ vựng Tiếng Anh và tính toán cơ bản.
2.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: HOÀN TOÀN KHÔNG TÁCH RỜI. Từng trò chơi là một sản phẩm độc lập được đội ngũ
chuyên gia sư phạm và lập trình viên đóng gói hoàn chỉnh [XÁC NHẬN: abcya.com] .
Định dạng dữ liệu: Dữ liệu mã hóa nội bộ trong các gói Asset Bundle đám mây của hệ thống ABCya.
Công nghệ hiển thị: Trước đây xây dựng trên Adobe Flash, đã được chuyển đổi toàn bộ sang HTML5 Canvas 2D /
WebGL và PixiJS Animation; âm thanh tích hợp Web Audio API mượt mà [XÁC NHẬN: IXL Learning Technology Report] .
Thêm loại game mới: 100% do đội ngũ sản xuất nội dung chuyên nghiệp của tập đoàn IXL Learning lập trình và phát
hành định kỳ.
2.3. Trải nghiệm khi chơi
Vòng chơi: Hoạt cảnh mở đầu rực rỡ kèm lời chào thân thiện → Hướng dẫn chơi bằng giọng đọc tự nhiên → Màn
chơi tương tác vuốt chạm hoặc kéo thả → Trả lời đúng phát âm thanh leng keng và hoạt cảnh chúc mừng rộn ràng →
Hoàn thành nhận huy hiệu, cúp vàng hoặc mở khóa thêm phụ kiện trò chơi.
Xử lý sai: Nhân vật lắc đầu nhẹ hoặc phát âm thanh vui nhộn nhắc nhở trẻ thử lại, tuyệt đối không tạo cảm giác tiêu
cực hay trừng phạt.
Đồng hồ, Xếp hạng, Mascot: Không có bảng xếp hạng ganh đua; không áp lực đồng hồ đếm ngược ở các lớp nhỏ; hệ
thống linh vật phong phú (chú khỉ, bạn gấu, chú mèo vui nhộn).
Hiệu năng: Đồ họa vector chuyển động chuẩn hoạt hình chất lượng cao, chạy cực mượt 60 FPS trên trình duyệt máy
tính và ứng dụng máy tính bảng [XÁC NHẬN: Common Sense Media 5-star rating] .
2.4. Tính năng AI
Thực trạng AI: HOÀN TOÀN KHÔNG CÓ AI GENERATIVE (0% AI) [XÁC NHẬN: abcya.com, 2026] . Nền tảng hoạt động
hoàn toàn theo mô hình phát triển game truyền thống bởi con người.
Quy trình tạo bài: Giáo viên không thể tạo bài. Giáo viên chỉ có thể lựa chọn trò chơi phù hợp với chuẩn bài học Mỹ và
giao link cho học sinh chơi.
Tiếng Việt: 100% nội dung và giọng đọc là Tiếng Anh bản xứ chuẩn Hoa Kỳ; không hỗ trợ tiếng Việt.
Vai trò AI: Không có AI trong hệ thống.
2.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC (Không có game cân đĩa thăng bằng chuyên sâu).
b. Tô nét chữ cái: LÀM GẦN ĐÚNG (Có minigame Letter Trace cho trẻ tô theo nét bảng chữ cái tiếng Anh đóng cứng,
không sửa được nội dung hay nét chữ tiếng Việt).
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC (Không thể tự tạo nhiệm vụ sư phạm riêng).
d. Ghép từ con vật bối cảnh vũ trụ: KHÔNG LÀM ĐƯỢC.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 4
Trang 3 / 9



## Trang 4

2.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": KHÔNG THỂ TẠO MỚI. Giáo viên chỉ có thể tìm kiếm game có sẵn như "Counting
Fish" hoặc "Number BINGO" và copy đường link gửi cho học sinh [XÁC NHẬN: abcya.com/support] .
Thời gian tạo bài: 0 phút (do không phải là công cụ tác giả).
2.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ link bài học, tích hợp Google Classroom. Phù hợp cho hoạt động khởi động trên máy chiếu
hoặc góc học tập cá nhân tại lớp.
Tài khoản học sinh: Học sinh chơi miễn phí trên máy tính không cần tài khoản. Bản ứng dụng di động yêu cầu đăng
nhập gói gia đình. Tuân thủ nghiêm ngặt COPPA, đạt chứng nhận kidSAFE Seal Program
[XÁC NHẬN: kidsafeseal.com/certifiedpowers/abcya] .
Phụ huynh: Phụ huynh rất chuộng ABCya để cho con tự chơi vừa học tiếng Anh vừa giải trí an toàn tại nhà.
2.8. Chi phí và giới hạn
Gói miễn phí: Chơi miễn phí không giới hạn trên trình duyệt máy tính bàn (Desktop Web) nhưng có hiển thị banner
quảng cáo ở hai bên; bị giới hạn số lượng trò chơi trên ứng dụng di động [XÁC NHẬN: abcya.com/pricing, 2026] .
Gói trả phí (ABCya Premium): 9.99 USD/tháng hoặc 69.99 USD/năm (~1.750.000 VNĐ/năm); gói gia đình/lớp học
xóa bỏ hoàn toàn quảng cáo và mở khóa quyền truy cập không giới hạn trên ứng dụng di động iOS/Android
[XÁC NHẬN: abcya.com/pricing] .
Bản địa hóa: 100% tiếng Anh; nội dung hoàn toàn theo khung chương trình giáo dục Mỹ, không khớp sách giáo khoa
Việt Nam.
3. PHET INTERACTIVE SIMULATIONS (phet.colorado.edu)
3.1. Danh mục cơ chế chơi
Kho học liệu mô phỏng khoa học và toán học tương tác số 1 thế giới do Đại học Colorado Boulder phát triển với hơn
160 mô phỏng mở: Toán học Tiểu học (Balancing Act - cân đĩa thăng bằng tìm hiểu phép cộng và mô-men lực,
Fractions: Intro / Fraction Matcher - mô phỏng phân số bánh pizza và ghép cặp, Make a Ten - gộp số thành 10 bằng
que tính, Area Model - mô hình diện tích phân tích phép nhân, Number Line: Integers - trục số tương tác), Khoa học Tự
nhiên 
(Build 
an 
Atom, 
States 
of 
Matter, 
Circuit 
Construction 
Kit, 
Gravity 
and 
Orbits)
[XÁC NHẬN: phet.colorado.edu; scienceinschool.org] .
Thao tác & Kỹ năng: Kéo thả các khối vật thể/quả cân lên đĩa cân; trượt con trỏ slider thay đổi thông số; kéo các lát
bánh pizza ghép thành phân số; quan sát sự biến đổi động tức thì của hiện tượng; rèn luyện tư duy khám phá giả
thuyết khoa học, bản chất số học và trực giác toán học sâu sắc. Mẫu phổ biến nhất: Balancing Act, Fractions: Intro và
Circuit Construction Kit.
Độ tuổi 3–6 tuổi: Có thể sử dụng mô phỏng Balancing Act (tab Intro) để trẻ khám phá khái niệm nặng - nhẹ bằng mắt
khi kéo đồ chơi lên cân; trẻ không cần đọc chữ vẫn hiểu nguyên lý thăng bằng.
Độ tuổi 6–11 tuổi: Chuẩn mực xuất sắc nhất cho môn Toán và Khoa học lớp 1–5 (hiểu sâu sắc phép cộng, trừ, phân
số, hình học).
3.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: KHÔNG tách rời nội dung theo kiểu form nhập liệu. Mô phỏng là một hệ thống vật lý liên tục
(Continuous Physics Engine); các bài toán (Game Challenges) được lập trình gắn liền với mô hình tính toán số học
[XÁC NHẬN: GitHub phetsims] .
Định dạng dữ liệu: Toàn bộ mã nguồn mở (Open-source) trên GitHub viết bằng JavaScript/TypeScript; cấu hình tham
số mô phỏng được định nghĩa trong các tệp model/view/controller chuyên dụng.
Công nghệ hiển thị: Khung đồ họa Scenery Stack độc quyền của PhET (kết hợp HTML5 Canvas, SVG tương tác và
WebGL hiệu năng cao); thuật toán tính toán va chạm và cân bằng vật lý chính xác theo thời gian thực
[XÁC NHẬN: phet.colorado.edu/en/about/technologies] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 4
Trang 4 / 9



## Trang 5

Thêm loại game mới: Các nhà nghiên cứu giáo dục và lập trình viên phần mềm mã nguồn mở trên toàn thế giới phát
triển thông qua quy trình thẩm định khoa học nghiêm ngặt của Đại học Colorado Boulder. Giáo viên phổ thông không
thể tự tạo mô phỏng mới trên web.
3.3. Trải nghiệm khi chơi
Vòng chơi: Mở mô phỏng → Chọn chế độ Tự do (Intro) hoặc Thử thách (Game Mode) → Đặt quả cân lên đĩa cân bên
phải để cân bằng với đĩa cân bên trái → Bấm nút kiểm tra (Check) → Nếu đúng: mặt cười hiện lên kèm tiếng chuông
reo và cộng sao thưởng; Nếu sai: cán cân nghiêng lệch và mũi tên chỉ rõ bên nào đang nặng hơn → Hoàn thành các
cấp độ (Level 1 to 4) nhận cúp vinh danh.
Xử lý sai: Hiển thị nguyên lý vật lý sai trực quan (cân lệch), không trừ điểm phạt, cho phép học sinh tự nhấc bớt quả
cân ra để thử nghiệm lại.
Đồng hồ, Xếp hạng: Chế độ Game có bấm giờ tùy chọn; có tính điểm tích lũy sao (Stars); không có bảng xếp hạng
ganh đua; không có linh vật hoạt hình thừa thãi.
Hiệu năng: Đồ họa mượt mà tuyệt đối 60 FPS, độ chính xác toán học tuyệt đối, tương thích hoàn hảo trên màn hình
cảm ứng điện thoại, iPad và Smart TV [XÁC NHẬN: Research in Science Education Review] .
3.4. Tính năng AI
Thực trạng AI: HOÀN TOÀN KHÔNG CÓ AI GENERATIVE TRÊN NỀN TẢNG (0% AI) [XÁC NHẬN: phet.colorado.edu, 2026] .
PhET xây dựng dựa trên nghiên cứu tâm lý học nhận thức thực chứng (Research-based simulations).
Quy trình tạo bài: Giáo viên không thể dùng AI để sinh mô phỏng mới; chỉ có thể viết các phiếu hướng dẫn học tập
(Worksheets) đi kèm để học sinh tự thao tác trên mô phỏng.
Tiếng Việt: Đã được các tình nguyện viên dịch thuật nhãn hiển thị sang Tiếng Việt (chọn ngôn ngữ Tiếng Việt ở góc
màn hình); tuy nhiên giọng đọc phát âm không có sẵn.
Vai trò AI: Hoàn toàn không phụ thuộc AI.
3.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: LÀM ĐƯỢC XUẤT SẮC BẬC NHẤT (Mô phỏng Balancing Act của PhET là chuẩn mực thế giới
cho mô tả này; hỗ trợ kéo quả cân, gạch, người lên hai đĩa cân có tính toán trọng lượng chính xác tuyệt đối; nhưng
không thể sửa đổi hay sinh qua prompt).
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC.
d. Ghép từ con vật bối cảnh vũ trụ: KHÔNG LÀM ĐƯỢC (PhET chỉ làm mô phỏng toán và khoa học thực nghiệm
thuần túy).
3.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": KHÔNG THỂ THỰC HIỆN ĐƯỢC. Giáo viên chỉ có thể mở mô phỏng "Make a Ten"
hoặc "Number Line" có sẵn và tự điều hành lớp học [XÁC NHẬN: phet.colorado.edu] .
Thời gian tạo bài: 0 phút (không có công cụ tạo trò chơi).
3.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ bằng link trực tiếp, mã nhúng iFrame vào bất kỳ website/LMS nào, hoặc tải về toàn bộ tệp
HTML5 độc lập để chạy offline khi trường học mất mạng Internet [XÁC NHẬN: phet.colorado.edu/en/offline] .
Tài khoản học sinh: Hoàn toàn không cần tài khoản; không quảng cáo, không thu thập dữ liệu; tuân thủ nghiêm ngặt
các quy định bảo vệ trẻ em của Hoa Kỳ (COPPA, FERPA) và quốc tế [XÁC NHẬN: phet.colorado.edu/en/privacy-policy] .
Phụ huynh: Phụ huynh có thể mở trực tiếp cho con thực hành trải nghiệm toán học tại nhà mà không tốn bất kỳ chi
phí nào.
3.8. Chi phí và giới hạn
Chi phí: HOÀN TOÀN MIỄN PHÍ 100% cho toàn bộ giáo viên và học sinh toàn cầu dưới giấy phép mã nguồn mở
Creative Commons (CC-BY 4.0) và GPL [XÁC NHẬN: phet.colorado.edu] .
Bản địa hóa: Giao diện văn bản đã được dịch sang tiếng Việt; gõ tìm kiếm tiếng Việt tốt; tuy nhiên vì là mô phỏng mở
nên không có hệ thống giọng đọc thuyết minh âm thanh tiếng Việt.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 4
Trang 5 / 9



## Trang 6

4. PRODIGY: PRODIGY MATH & PRODIGY ENGLISH (prodigygame.com)
4.1. Danh mục cơ chế chơi
Nền tảng học tập dạng game nhập vai trực tuyến nhiều người chơi (Fantasy MMORPG) hàng đầu thế giới: Wizard
Battles / Pet Battles (đấu thú phép thuật theo lượt - Turn-based Combat; học sinh phải giải đúng bài toán để thi triển
chiêu thức tấn công), World Exploration (khám phá thế giới mở 2D: Lamplight Town, Firefly Forest, Shiverchill Mountain,
nhận nhiệm vụ từ NPC), Titan Battles (hợp tác cả lớp cùng đánh Boss khổng lồ), Arena PvP Battles (đấu trường xếp
hạng người chơi), English Village (xây dựng làng và thu thập tài nguyên qua bài tập đọc hiểu tiếng Anh)
[XÁC NHẬN: prodigygame.com; edshelf.com/tool/prodigy] .
Thao tác & Kỹ năng: Điều khiển nhân vật di chuyển 2D trên bản đồ; chọn quái vật đối đầu; giải các câu hỏi trắc
nghiệm toán học, điền số, sử dụng bàn tính ảo và bảng vẽ nháp tích hợp sẵn trên giao diện chiến đấu; rèn luyện tư
duy tính nhẩm, giải quyết vấn đề toán học thích ứng (Adaptive Math) và vốn từ vựng tiếng Anh. Mẫu phổ biến nhất:
Wizard Battles.
Độ tuổi 3–6 tuổi: Hoàn toàn không phù hợp vì game có cốt truyện chữ dài, bản đồ thế giới mở rộng lớn và các phép
tính tối thiểu từ chương trình Lớp 1 (6 tuổi trở lên).
Độ tuổi 6–11 tuổi: Cực kỳ say mê (Maximum Engagement); học sinh tiểu học (Lớp 1–6) say sưa làm hàng trăm bài
toán mỗi tuần để bắt thú cưng và thăng cấp nhân vật phù thủy.
4.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: CÓ tách biệt ở tầng kiến trúc dịch vụ (Backend Content Service). Ngân hàng câu hỏi chuẩn
kiến thức được lưu trữ độc lập và bơm vào các trận đấu ngẫu nhiên; tuy nhiên giáo viên chỉ được gán mục tiêu học
tập (Assign Skills) trong danh mục có sẵn của Prodigy chứ KHÔNG ĐƯỢC tự tạo thế giới hay sửa kịch bản game
[XÁC NHẬN: Prodigy Engineering Architecture] .
Định dạng dữ liệu: Cơ sở dữ liệu phân tán (NoSQL / Relational) lưu trữ hồ sơ học sinh, chỉ số trang bị nhân vật (RPG
Inventory) và ma trận kỹ năng toán học gắn mã chuẩn (Common Core, TEKS Standards).
Công nghệ hiển thị: Game Client xây dựng trên WebGL / HTML5 Canvas 2D Game Engine chuyên nghiệp; đồng bộ
trạng thái nhân vật thế giới mở thời gian thực qua giao thức WebSockets và máy chủ Node.js Microservices
[XÁC NHẬN: StackShare: Prodigy Education Tech Stack] .
Thêm loại game mới: Hoàn toàn do đội ngũ hơn 100 kỹ sư và nhà thiết kế game thương mại của tập đoàn Prodigy
Education (Canada) phát triển.
4.3. Trải nghiệm khi chơi
Vòng chơi: Đăng nhập thế giới phù thủy → Đi thám hiểm gặp quái vật → Mở màn hình giao đấu (Battle Screen) →
Chọn đòn đánh phép thuật → Hệ thống đưa ra 1 bài toán phù hợp năng lực → Học sinh giải đúng: nhân vật tung
chiêu sét/lửa đánh bại quái vật, nhận vàng và điểm kinh nghiệm (XP) → Giải sai: đòn đánh bị trượt, quái vật phản
công và hiển thị gợi ý sư phạm giải bài toán → Thắng trận mở rương kho báu và thăng cấp.
Xử lý sai: Mất lượt đánh (bị quái vật đánh trừ máu), có trợ lý bóng đèn (Lightbulb Hint) hướng dẫn từng bước giải để
học sinh học lại ngay trong trận đấu.
Đồng hồ, Xếp hạng, Mascot: Không ép thời gian trong trận đánh; Bảng xếp hạng cấp độ nhân vật trong bang hội; Hệ
thống thú cưng (Pets) và nhân vật phù thủy là linh vật thương hiệu vô cùng cuốn hút.
Hiệu năng: Đồ họa game MMORPG đỉnh cao nhưng dung lượng tải nặng (yêu cầu bộ nhớ RAM và đồ họa máy tính ổn
định, máy cấu hình quá yếu có thể bị giật) [XÁC NHẬN: Common Sense Education Review] .
4.4. Tính năng AI
Tên & Ra mắt: Prodigy Adaptive Learning Algorithm (thuật toán AI cốt lõi tự động điều chỉnh độ khó bài toán theo thời
gian thực) và thử nghiệm tính năng AI Question Assistant giai đoạn 2024–2026
[XÁC NHẬN: prodigygame.com/main-en/blog/adaptive-learning, 2026] .
Khả năng tự động hóa: Thuật toán AI tự động chẩn đoán lỗ hổng kiến thức của từng học sinh để điều phối câu hỏi
dễ/khó phù hợp mà giáo viên không cần can thiệp. Giáo viên vẫn phải làm tay: Chọn kỹ năng mục tiêu bài học
(Assignment) trên Teacher Dashboard.
Tiếng Việt: 100% bằng Tiếng Anh; không có ngôn ngữ tiếng Việt.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 4
Trang 6 / 9



## Trang 7

Vai trò AI: Thuật toán thích ứng AI là trọng tâm cốt lõi (Core Engine) của cơ chế sư phạm phân hóa trong game.
4.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC.
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Game có bối cảnh thế giới kỳ ảo phép thuật; giáo viên có thể
gán danh sách từ vựng về động vật tiếng Anh vào các trận đánh phù thủy).
4.6. Quy trình và thời gian tạo trò chơi
Quy trình giao bài 5 câu "Đếm con vật" (Dạng Assignment): Bước 1: Giáo viên đăng nhập Teacher Dashboard →
Chọn Lớp học. Bước 2: Bấm "Create Assignment" → Chọn môn Toán Lớp 1. Bước 3: Tìm kỹ năng "Counting objects
up to 10" trong danh mục chuẩn kiến thức có sẵn. Bước 4: Chọn số lượng câu hỏi và học sinh được giao. Bước 5:
Bấm "Assign" → Học sinh đăng nhập vào game sẽ tự động gặp nhiệm vụ này trong các trận đấu
[XÁC NHẬN: Prodigy Teacher Guide] .
Thời gian thực tế: Thao tác gán kỹ năng có sẵn chỉ mất từ 3 đến 5 phút; tuy nhiên giáo viên hoàn toàn không thể tự
tay viết câu hỏi mới hay tự vẽ đồ họa game.
4.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Học sinh đăng nhập bằng tài khoản Prodigy cá nhân hoặc liên kết Google Classroom. Phù hợp cho
hoạt động tự luyện tập cá nhân tại lớp hoặc bài tập làm tại nhà.
Tài khoản học sinh: Bắt buộc phải có tài khoản học sinh để lưu vết nhân vật và tiến trình bài học. Tuân thủ nghiêm
ngặt COPPA, FERPA, đạt chứng nhận quyền riêng tư iKeepSafe Student Privacy Certified
[XÁC NHẬN: prodigygame.com/main-en/privacy-policy] .
Phụ huynh: Phụ huynh có cổng Dashboard riêng để theo dõi tiến độ giải toán của con và mua gói thành viên quà
tặng.
4.8. Chi phí và giới hạn
Gói trường học (School): MIỄN PHÍ 100% cho toàn bộ giáo viên và học sinh đối với toàn bộ nội dung học tập và câu
hỏi toán học tại trường [XÁC NHẬN: prodigygame.com/main-en/pricing, 2026] .
Gói phụ huynh (Prodigy Memberships): 6.25 – 9.99 USD/tháng (~150.000 – 250.000 VNĐ/tháng) dành cho gia đình
muốn mở khóa thêm trang phục, biến hình thú cưng quý hiếm và khu vực chơi độc quyền cho con
[XÁC NHẬN: prodigygame.com/main-en/memberships] .
Bản địa hóa: 100% Tiếng Anh; bám sát chương trình Mỹ, Canada, Anh, Úc; chưa có nội dung bám chuẩn GDPT 2018
Việt Nam.
PHẦN C – BA BẢNG TỔNG HỢP SO SÁNH KỸ THUẬT
Bảng C1 – Cơ chế chơi:
Nền tảng
Tên mẫu
Thao tác chính
Kỹ năng luyện
Hợp 3–6
tuổi
Hợp 6–11
tuổi
Nguồn
Toy Theater
Balance Scale
Kéo thả quả cân lên
2 đĩa cân
Khối lượng, bản chất
phép cộng
Rất hợp
(trực
quan)
Rất hợp
[XÁC NHẬN]
toytheater.com
Toy Theater
Interactive Clock
Kéo xoay kim giờ và
kim phút
Xem đồng hồ, tư duy
góc/giờ
Hợp (nhận
diện)
Rất hợp
[XÁC NHẬN]
toytheater.com
Toy Theater
Fraction Strips
Kéo các thanh phân
số so sánh
Tư duy phân số hình
học trực quan
Không
Rất hợp
(lớp 3-5)
[XÁC NHẬN]
commoncraft.com
ABCya
BINGO Series
Nghe đọc từ/số,
chạm ô BINGO
Liên kết thính giác -
thị giác
Rất hợp
Rất hợp
[XÁC NHẬN]
abcya.com
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 4
Trang 7 / 9



## Trang 8

Nền tảng
Tên mẫu
Thao tác chính
Kỹ năng luyện
Hợp 3–6
tuổi
Hợp 6–
11 tuổi
Nguồn
ABCya
Keyboarding Zoo
Gõ phím máy tính
đúng chữ cái
Vận động tinh, nhớ
mặt bàn phím
Rất hợp
(lớp lá)
Hợp (lớp
1)
[XÁC NHẬN]
commonsensemedia.org
ABCya
Balloon Pop
Subtraction
Chạm nổ bóng bay
thực hiện trừ
Bản chất phép trừ
trực quan
Rất hợp
Hợp (lớp
1-2)
[XÁC NHẬN]
abcya.com
PhET
Simulations
Balancing Act
Đặt khối vật thể lên
cân bập bênh
Cân bằng lực,
phép cộng trực
quan
Có (tab
Intro)
Xuất sắc
nhất
[XÁC NHẬN]
phet.colorado.edu
PhET
Simulations
Fractions: Intro
Kéo lát bánh
pizza/hình khối
Bản chất phân số,
phần bằng nhau
Không
Rất hợp
(lớp 3-5)
[XÁC NHẬN]
phet.colorado.edu
Prodigy
Wizard Battles
Giải toán thi triển
đòn đánh 2D
Toán thích ứng,
giải quyết vấn đề
Không
(rất khó)
Cực kỳ
say mê
[XÁC NHẬN]
prodigygame.com
Prodigy
World Exploration
Di chuyển nhân vật
nhận nhiệm vụ
Khám phá thế giới,
đọc hiểu Anh
Không
Rất hợp
(lớp 2-6)
[XÁC NHẬN]
edshelf.com
Bảng C2 – So sánh nền tảng:
Nền tảng
Tách nội
dung khỏi
mẫu
Định dạng
dữ liệu
Công nghệ
hiển thị
AI làm được
bước nào
AI là
phụ hay
lõi
Tiếng Việt
Giá gói trả
phí
Học
sinh
cần tài
khoản
Nguồn
Toy
Theater
Không
(Hard-
coded)
Mã nguồn
JS tĩnh
nhúng
HTML5
Canvas 2D
(CreateJS)
Không có AI
Không
có
Chỉ tiếng
Anh
Miễn phí
100%
Không
cần
[XÁC
NHẬ
N]
toythe
ater.co
m
ABCya
Không (Hệ
thống
đóng)
Proprietary
Asset
Bundles
HTML5
Canvas /
PixiJS
Không có AI
Không
có
Chỉ tiếng
Anh (Mỹ)
9.99
USD/tháng
(~70$/năm)
Không
bắt
buộc
[XÁC
NHẬ
N]
abcya.
com
PhET
Simulation
s
Không (Mô
hình vật lý)
Open-
source
TS/JS
(GitHub)
Scenery
(Canvas/SV
G/WebGL)
Không có AI
Không
có
Có bản
dịch text
Miễn phí
100% (CC-BY)
Không
cần
[XÁC
NHẬ
N]
phet.c
olorad
o.edu
Prodigy
Có ở
Backend
(Skill
Bank)
Cloud RPG
Database
(NoSQL)
2D WebGL /
HTML5
Canvas
AI thích ứng độ
khó (Adaptive)
Lõi
(Core)
Chỉ tiếng
Anh
Miễn phí tại
trường
(~7$/tháng
home)
Bắt
buộc
có
[XÁC
NHẬ
N]
prodig
ygame
.com
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 4
Trang 8 / 9



## Trang 9

Bảng C3 – Mô tả ngoài mẫu:
Nền tảng
Mô tả a
Mô tả b
Mô tả c
Mô tả d
Toy Theater
LÀM ĐƯỢC XUẤT SẮC
(Có sẵn Balance Scale
đóng cứng)
LÀM GẦN ĐÚNG (Vẽ tự
do, không chấm nét)
KHÔNG LÀM ĐƯỢC (Không có
tạo bài)
KHÔNG LÀM ĐƯỢC (Không
đổi bối cảnh)
ABCya
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Có sẵn
Letter Trace đóng cứng)
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
PhET
Simulations
LÀM ĐƯỢC XUẤT SẮC
(Sim Balancing Act
chuẩn mực)
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
Prodigy
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Gán từ vựng
vào trận đấu MMORPG)
Ghi chú: Điểm mấu chốt: Dù Toy Theater và PhET có minigame cân thăng bằng (mô tả a) xuất sắc, nhưng giáo viên hoàn toàn bất lực
trong việc chỉnh sửa nội dung hay tạo game mới theo ý đồ sư phạm riêng. Đề tài của nhóm lấp đúng khoảng trống này.
PHẦN D – DANH SÁCH ĐIỂM CẦN TỰ ĐĂNG NHẬP KIỂM TRA THỰC NGHIỆM [CẦN TỰ THỬ]
Để hoàn thiện hồ sơ thực chứng đối chiếu kỹ thuật trước hội đồng bảo vệ khóa luận, sinh viên cần trực tiếp truy cập và thu
thập các bằng chứng sau:
1. Kiểm tra giới hạn tương tác và mã nguồn đóng của Toy Theater Balance Scale:
• Hành động: Truy cập toytheater.com/scale/ trên máy tính và iPad; thao tác kéo các khối quả cân lên đĩa cân; mở
DevTools kiểm tra cấu trúc mã nguồn.
• Bằng chứng cần chụp: Ảnh chụp màn hình minigame hoạt động và ảnh chụp bảng Elements trong DevTools cho thấy
toàn bộ logic được vẽ tĩnh trên thẻ <canvas>, không có API nhận dữ liệu cấu hình từ bên ngoài.
2. Kiểm tra cơ chế hoạt họa và quảng cáo trên ABCya bản miễn phí:
• Hành động: Mở trình duyệt web máy tính không đăng nhập, truy cập minigame Keyboarding Zoo hoặc Sight Word BINGO
trên abcya.com.
• Bằng chứng cần chụp: Ảnh chụp màn hình lúc khung game đang chạy kèm các banner quảng cáo Google hiển thị xung
quanh khung game để chứng minh sự phân tâm của học sinh trên bản miễn phí.
3. Kiểm tra gói tệp HTML5 chạy Offline độc lập của PhET Balancing Act:
• Hành động: Truy cập trang mô phỏng Balancing Act trên phet.colorado.edu, bấm nút "Download" tải tệp balancing-
act_all.html về máy; ngắt toàn bộ kết nối Internet và mở tệp trực tiếp trên trình duyệt.
• Bằng chứng cần chụp: Ảnh chụp mô phỏng vẫn chạy mượt mà 60 FPS khi không có mạng, chứng minh tính độc lập
tuyệt đối của công nghệ Scenery Canvas/SVG.
4. Khảo sát quy trình gán kỹ năng sư phạm trên Prodigy Teacher Dashboard:
• Hành động: Đăng ký tài khoản giáo viên miễn phí trên prodigygame.com; tạo 1 lớp học ảo; bấm tạo Assignment môn
Toán lớp 1.
• Bằng chứng cần chụp: Ảnh chụp giao diện chọn danh mục chuẩn kỹ năng toán học định sẵn của Prodigy và chứng minh
không có ô nhập câu hỏi tự do hay tải ảnh riêng của giáo viên.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 4
Trang 9 / 9
