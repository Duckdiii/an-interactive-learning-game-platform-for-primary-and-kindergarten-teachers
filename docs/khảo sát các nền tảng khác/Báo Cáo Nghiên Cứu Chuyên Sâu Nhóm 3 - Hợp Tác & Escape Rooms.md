# Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 3 - Hợp Tác & Escape Rooms

> **Nghiên cứu chuyên sâu**: [[Khảo sát 7 nhóm nền tảng đối thủ]] | [[Báo Cáo Khảo Sát Nhóm 3 - Hợp Tác & Escape Rooms|Khảo sát tổng quan Nhóm 3: Hợp Tác & Escape Rooms]]



> **Tài liệu nguồn gốc**: `Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 3 - Hợp Tác & Escape Rooms.pdf`  
> **Tổng số trang**: 12  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

BÁO CÁO NGHIÊN CỨU KỸ THUẬT • KHÓA LUẬN TỐT NGHIỆP
Khảo Sát Toàn Diện Nhóm 3: Học Tập Hợp Tác, Bản Đồ Khám Phá &
Phòng Thoát Hiểm Số
Phân hệ: Classtime, Quizlet (Quizlet Live), Deck.Toys, Breakout EDU, Genially • Đơn vị khảo sát: Nhóm Khóa Luận AI Game
Generator • Cập nhật: 11/2026
PHẦN A – TÓM TẮT NHÓM & BÀI HỌC THIẾT KẾ AI GAME GENERATOR
Điểm chung của Nhóm 3: Toàn bộ 05 nền tảng đều hướng tới việc triệt tiêu áp lực thi đua thứ hạng cá nhân loại trừ (zero-
sum) bằng cách thay thế bằng: (1) Cơ chế hợp tác tập thể (cả lớp cùng chung sức ghép hình, giải cứu phi thuyền như
Classtime); (2) Phân tán thông tin theo đội buộc phải giao tiếp trực diện (Quizlet Live); (3) Tiến trình phi tuyến tính qua bản
đồ phân nhánh và giải mã mở ổ khóa số (Escape Rooms / Learning Paths trên Deck.Toys, Breakout EDU, Genially)
[XÁC NHẬN: hundred.org; deck.toys; breakoutedu.com] .
Bài học quan trọng nhất cho hệ thống AI Game Generator: (1) Định hướng Gamification hợp tác nhân văn: Tại chế độ Trình
chiếu chung (Presentation Mode / FR-06), thay vì chỉ hiển thị Top điểm cao dễ gây mặc cảm cho học sinh yếu, hệ thống
nên bổ sung cơ chế Thanh tiến độ chung của lớp (Whole-class Progress Goal) – mỗi bạn làm đúng sẽ mở thêm một mảnh
ghép bức tranh bài học trên Smart TV. (2) Bài toán "Nghịch lý phức tạp": Các nền tảng phòng thoát hiểm/bản đồ (Deck.Toys,
Breakout EDU, Genially) tuy hấp dẫn nhưng ngốn từ 2 đến 4 giờ thiết lập thủ công của giáo viên và quá tải nhận thức với trẻ
5–7 tuổi. Đề tài của nhóm cần kiên định với mô hình AI-Native tinh gọn: tạo trò chơi 2D Canvas có chuyển động và cốt
truyện nhẹ nhàng chỉ sau 1 câu prompt dưới 10 giây, phục vụ đúng hoạt động khởi động 10–15 phút trên lớp.
PHẦN B – NGHIÊN CỨU CHI TIẾT TỪNG NỀN TẢNG (08 TIÊU CHÍ)
1. CLASSTIME (classtime.com)
1.1. Danh mục cơ chế chơi
Nổi tiếng thế giới với phân hệ Collaborative Challenges (Thử thách hợp tác tập thể) bên cạnh chế độ kiểm tra truyền
thống: Jungle Rollercoaster (cả lớp xây tàu lượn siêu tốc xuyên rừng), Space Station Resupply (tiếp tế nhiên liệu cho
trạm vũ trụ), Ocean Pollution Cleanup (làm sạch rác thải đại dương), City Infrastructure (xây dựng thành phố thông
minh), Dinosaur Rescue (khai quật và giải cứu khủng long), Landmarks Puzzle (ghép kỳ quan thế giới), Individual
Formative Mode (kiểm tra tiến độ cá nhân) [XÁC NHẬN: clever.com/blog; hundred.org/innovations/classtime] .
Thao tác & Kỹ năng: Học sinh trả lời các dạng câu hỏi: Chọn 1 đáp án (Multiple Choice), Chọn nhiều đáp án
(Checkboxes), Điền từ (Free text), Phân loại (Categorizer), Sắp xếp (Sorter), Bôi đen từ (Highlight text). Mỗi câu trả lời
đúng trên thiết bị cá nhân sẽ tự động kích hoạt một hoạt ảnh xây dựng hoặc giải cứu trên màn hình máy chiếu; rèn
luyện tinh thần trách nhiệm tập thể, tư duy suy luận và kiên trì. Mẫu phổ biến nhất: Jungle Rollercoaster và Space
Station Resupply.
Độ tuổi 3–6 tuổi: Không phù hợp vì các định dạng câu hỏi trên màn hình học sinh thuần là văn bản chữ; trẻ mầm non
không thể tự đọc đề.
Độ tuổi 6–11 tuổi: Rất phù hợp từ lớp 2–5; học sinh tiểu học cực kỳ hào hứng khi thấy đóng góp của mình giúp cả lớp
hoàn thành bức tranh chung mà không sợ bị bêu tên khi làm sai.
1.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt hoàn toàn. Bộ câu hỏi (Question Set) được soạn riêng biệt; giáo viên có thể gắn
bộ câu hỏi đó vào bất kỳ hoạt cảnh Collaborative Challenge nào (hôm nay xây tàu lượn rừng xanh, ngày mai tiếp tế
trạm vũ trụ) mà không mất dữ liệu [XÁC NHẬN: classtime.com] .
Định dạng dữ liệu: Cấu trúc JSON đám mây lưu trữ mảng câu hỏi, định dạng câu trả lời, gắn thẻ năng lực
(Taxonomy/Standards) và trạng thái hiển thị real-time.
Công nghệ hiển thị: Frontend xây dựng trên nền tảng Web SPA hiện đại (Vue.js / React); màn hình máy chiếu
Collaborative Challenge sử dụng Canvas 2D / WebGL để render chuyển động ghép nối các bộ phận cơ khí; đồng bộ
thời gian thực qua WebSockets [XÁC NHẬN: DevTools inspection trên classtime.com] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 1 / 12



## Trang 2

Thêm loại game mới: Hoàn toàn do đội ngũ kỹ sư Classtime AG (Thụy Sĩ) lập trình đồ họa và tích hợp vào kho hoạt
cảnh.
1.3. Trải nghiệm khi chơi
Vòng chơi: Giáo viên chiếu màn hình thử thách lên TV/máy chiếu → Học sinh nhập mã Session Code trên thiết bị →
Bắt đầu trả lời câu hỏi → Khi lớp có học sinh trả lời đúng, một toa tàu lượn được lắp thêm hoặc một mảnh pin mặt
trời của trạm vũ trụ được gắn vào kèm hiệu ứng âm thanh rộn rã → Nếu làm sai, thanh tiến độ không bị lùi mà chỉ
tạm dừng → Cả lớp đạt 100% câu đúng, hoạt cảnh hoàn thành bùng nổ pháo hoa chúc mừng toàn bộ phòng học.
Xử lý sai: Hệ thống không trừ điểm công khai của học sinh trên màn hình lớn (tránh làm bẽ mặt trẻ); hiển thị phản hồi
sửa sai riêng tư trên máy cá nhân.
Đồng hồ, Xếp hạng, Mascot: Có đồng hồ thời gian; không có bảng xếp hạng cá nhân loại trừ mà chỉ có thanh tiến độ
hợp tác chung; nhân vật và cốt truyện thay đổi theo từng chủ đề câu chuyện.
Hiệu năng: Đồng bộ mạng cực nhanh, hoạt động ổn định trên cả đường truyền Wi-Fi trường học có băng thông hạn
chế [XÁC NHẬN: Education Alliance Finland Certification] .
1.4. Tính năng AI
Tên & Ra mắt: Classtime AI Question Generator (ra mắt năm 2023, nâng cấp 2024–2026)
[XÁC NHẬN: classtime.com, 2026] .
Khả năng tự động hóa: Nhập chủ đề, độ tuổi, tiêu chuẩn hoặc dán văn bản bài học → AI tự động sinh danh sách câu
hỏi trắc nghiệm, phân loại, sắp xếp. Giáo viên vẫn phải làm tay: Kiểm tra đáp án, tải thêm hình ảnh nếu cần, chọn
hoạt cảnh Collaborative Challenge và bấm bắt đầu phiên chơi.
Tiếng Việt: Hỗ trợ tiếng Việt ở mức khá; nhận diện tốt ngữ liệu văn bản nhưng câu hỏi dịch đôi khi hơi cứng nhắc.
Vai trò AI: AI là tính năng bổ trợ biên soạn; bản sắc của Classtime nằm ở cơ chế đồng đội và bảng phân tích sư
phạm.
1.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC (Chỉ hỗ trợ dạng câu hỏi Sorter/Categorizer chọn khung, không có
tương tác vật lý rơi vào giỏ).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Tạo câu hỏi từ vựng con vật và chọn thử thách Space Station
Resupply để có bối cảnh trạm không gian vũ trụ).
1.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Create Question Set". Bước 2: Dùng Classtime AI
nhập "5 câu hỏi đếm con vật lớp 1" → Hệ thống tạo 5 câu hỏi trong 5 giây. Bước 3: Giáo viên duyệt câu hỏi, bấm thêm
ảnh con vật minh họa. Bước 4: Bấm "Start Session" → Chọn Collaborative Challenge "Dinosaur Rescue" → Mở mã
tham gia cho cả lớp [XÁC NHẬN: Classtime Educator Academy] .
Thời gian thực tế: Tạo thủ công mất từ 15 đến 20 phút; dùng Classtime AI rút ngắn còn 4 đến 6 phút.
1.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua Session Code 6 chữ số, mã QR, link trực tiếp, Google Classroom. Có chế độ chơi trực
tiếp trên lớp và chế độ giao bài về nhà (Student-paced session).
Tài khoản học sinh: Học sinh không cần tài khoản; chỉ cần nhập tên/biệt danh khi vào phiên Live. Đạt chứng chỉ bảo
mật và quyền riêng tư châu Âu, tuân thủ nghiêm ngặt FERPA và COPPA [XÁC NHẬN: classtime.com/privacy] .
Phụ huynh: Phụ huynh có thể mở link bài tập về nhà trên trình duyệt điện thoại để con làm bài độc lập.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 2 / 12



## Trang 3

1.8. Chi phí và giới hạn
Gói miễn phí: Giới hạn tối đa 40 học sinh tham gia trong một phiên Live, cho phép dùng thử một số Collaborative
Challenges cơ bản [XÁC NHẬN: classtime.com/pricing, 2026] .
Gói trả phí: Gói Premium cá nhân: khoảng 8.00 – 10.00 USD/tháng (~200.000 – 250.000 VNĐ/tháng, thanh toán theo
năm); Gói School & District: từ 500+ USD/năm mở khóa toàn bộ kho Collaborative Challenges và tính năng chống
gian lận nâng cao [XÁC NHẬN: teachfloor.com/blog/best-classtime-alternatives] .
Bản địa hóa: Giao diện hệ thống hỗ trợ tiếng Việt; gõ dấu tiếng Việt tốt; hỗ trợ Text-to-Speech đa ngôn ngữ của trình
duyệt; thư viện thử thách mang phong cách đồ họa quốc tế.
2. QUIZLET & QUIZLET LIVE (quizlet.com)
2.1. Danh mục cơ chế chơi
Nền tảng học tập qua thẻ ghi nhớ lớn nhất thế giới với chế độ thi đấu nhóm độc đáo Quizlet Live: Quizlet Live Classic
(Team Mode) (chia nhóm ngẫu nhiên bằng tên con vật, phân tán đáp án), Quizlet Live Individual Mode (thi đấu cá nhân
trực tiếp), Checkpoint (đánh giá nhanh điểm dừng giữa giờ), Flashcards (chế độ lật thẻ truyền thống), Learn (thuật toán
lặp lại ngắt quãng thích ứng Spaced Repetition), Test (tạo đề thi thử tự động), Match (trò chơi kéo ghép thẻ bài tính thời
gian) [XÁC NHẬN: quizlet.com/features/live; atomisystems.com 2026] .
Thao tác & Kỹ năng: Trong Quizlet Live Team Mode: Cả nhóm nhìn thấy cùng một câu hỏi, nhưng 4 lựa chọn đáp án
được xáo trộn và chia ngẫu nhiên trên màn hình của 3–4 thành viên; chỉ có DUY NHẤT một thành viên cầm đáp án
đúng. Học sinh buộc phải nhìn bài nhau và trao đổi: "Ai đang cầm thẻ từ này? Bấm đi!"; rèn kỹ năng giao tiếp xã hội,
hợp tác đội nhóm và phản xạ từ vựng tức thì. Mẫu phổ biến nhất: Quizlet Live Team Mode và Match.
Độ tuổi 3–6 tuổi: Hoàn toàn không phù hợp vì 100% ngữ liệu là thẻ từ vựng và định nghĩa văn bản; trẻ mầm non chưa
biết đọc chữ.
Độ tuổi 6–11 tuổi: Rất phù hợp từ lớp 3–5 trong các tiết học Tiếng Anh tiểu học; các nhóm học sinh thi đấu cực kỳ
sôi động khi đua nhau đạt 12 câu đúng liên tiếp.
2.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt ở mức độ triệt để nhất. Giáo viên/học sinh chỉ tạo duy nhất 1 danh sách Thuật
ngữ - Định nghĩa (Term - Definition), hệ thống tự động sinh ra tất cả các chế độ: Flashcards, Match, Learn, Test và
Quizlet Live mà không mất dữ liệu [XÁC NHẬN: quizlet.com] .
Định dạng dữ liệu: JSON Key-Value data schema: terms: [{word, definition, image_url, audio_url}]
lưu trữ trên Google Cloud Platform.
Công nghệ hiển thị: Frontend xây dựng trên React.js; đồng bộ trạng thái phân phối đáp án và tiến trình đua ngựa giữa
các đội theo thời gian thực qua giao thức WebSockets [XÁC NHẬN: Quizlet Engineering Blog] .
Thêm loại game mới: Hoàn toàn do đội ngũ kỹ sư Quizlet Inc. phát triển.
2.3. Trải nghiệm khi chơi
Vòng chơi: Giáo viên tạo phòng Live → Học sinh nhập mã PIN 6 số trên quizlet.live → Hệ thống tự động chia nhóm 3-
4 bạn và gán linh vật (Team Pandas, Team Tigers...) → Học sinh đứng dậy tìm vị trí ngồi chung với đồng đội → Bắt
đầu đua: trả lời đúng tiến lên 1 bước trên đường đua 12 mốc → Nếu 1 người bấm sai: toàn bộ nhóm bị trả về vạch
xuất phát 0 điểm (Reset Streak) → Nhóm nào đạt 12/12 điểm đầu tiên sẽ giành chiến thắng trong sự reo hò của cả
lớp.
Xử lý sai: Rất quyết liệt: bị reset điểm về 0; hệ thống hiển thị đáp án đúng trên máy cả đội để cùng rút kinh nghiệm
trước khi bắt đầu lại.
Đồng hồ, Xếp hạng, Mascot: Bảng đua thời gian thực trên màn hình máy chiếu; Linh vật đại diện là các loài động vật
ngộ nghĩnh (Bison, Toucan, Koala).
Hiệu năng: Tải cực nhanh, kết nối đồng thời hàng trăm học sinh trong trường học mà không bị nghẽn mạng
[XÁC NHẬN: EdTech Digest 2025] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 3 / 12



## Trang 4

2.4. Tính năng AI
Tên & Ra mắt: Q-Chat (AI Tutor) & Magic Notes (ra mắt giai đoạn 2023–2024, ứng dụng GPT-4 và mô hình AI chuyên
sâu) [XÁC NHẬN: quizlet.com/features/magic-notes; penseum.com 2026] .
Khả năng tự động hóa: Tự động bóc tách tài liệu ghi chú bài giảng (PDF/ảnh chụp vở ghi chép) thành các bộ
Flashcard hoàn chỉnh; Q-Chat đóng vai trò gia sư AI hỏi đáp phản biện với người học. Giáo viên vẫn phải làm tay:
Duyệt bộ thẻ, khởi tạo phòng chơi Live và điều phối học sinh chia nhóm trong lớp.
Tiếng Việt: Hỗ trợ tiếng Việt rất xuất sắc trong việc bóc tách tài liệu và đàm thoại Q-Chat; phát âm từ vựng tiếng Việt
tự nhiên nhờ giọng đọc AI TTS.
Vai trò AI: AI đang trở thành trọng tâm chuyển dịch sản phẩm (Core Evolution) của Quizlet từ năm 2024–2026.
2.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC.
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Tạo bộ thẻ từ vựng con vật và chơi minigame Match hoặc
Quizlet Live, nhưng không có đồ họa du hành không gian).
2.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Create study set". Bước 2: Dùng Magic Notes dán văn
bản hoặc gõ tay 5 cặp: "1 chú chó" - "🐶". Bước 3: Hệ thống tự động gợi ý ảnh minh họa có sẵn. Bước 4: Bấm "Create"
→ Bấm biểu tượng "Live" → Chọn "Teams" → Máy chiếu hiện mã PIN [XÁC NHẬN: Quizlet Help Center] .
Thời gian thực tế: Tạo thủ công mất từ 5 đến 8 phút (rất nhanh nhờ cấu trúc bảng phẳng); dùng Magic Notes mất
khoảng 2 đến 3 phút.
2.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua link quizlet.live, mã PIN 6 số, mã QR, chia sẻ vào Google Classroom. Chơi Live tại lớp
hoặc giao bài tự học về nhà.
Tài khoản học sinh: Khi chơi Quizlet Live, học sinh không cần tài khoản (chỉ nhập tên). Nếu muốn tự ôn tập ở nhà thì
cần đăng ký tài khoản. Tuân thủ chuẩn bảo vệ trẻ em COPPA, FERPA [XÁC NHẬN: quizlet.com/privacy] .
Phụ huynh: Phụ huynh có thể tải ứng dụng Quizlet trên điện thoại để con tự ôn bài qua Flashcard.
2.8. Chi phí và giới hạn
Gói miễn phí: Cho phép tạo bộ học liệu cơ bản và tổ chức Quizlet Live miễn phí; tuy nhiên bị giới hạn số lượt dùng
tính năng Magic Notes và xuất hiện quảng cáo.
Gói trả phí (Quizlet Plus): Khoảng 6.99 USD/tháng hoặc 31.99 – 35.99 USD/năm (~800.000 – 900.000 VNĐ/năm);
không quảng cáo, mở không giới hạn AI Magic Notes, tạo bài kiểm tra thực hành nâng cao
[XÁC NHẬN: penseum.com/blog/quizlet-expensive-best-ai-study-tool-alternatives-under-10-q4-2025] .
Bản địa hóa: Giao diện tiếng Việt hoàn chỉnh; gõ dấu tiếng Việt mượt mà; tích hợp sẵn bộ phát âm Text-to-Speech
tiếng Việt chuẩn xác cho từng thẻ từ vựng.
3. DECK.TOYS (deck.toys)
3.1. Danh mục cơ chế chơi
Nền t状 biến tiến trình bài học thành bản đồ kho báu phiêu lưu (Gamified Learning Paths / Breakout Paths): Digital
Locks (5 loại ổ khóa ảo: Text Lock, Number Lock, Key Lock, Direction Lock, Voice Lock phát âm đúng mới mở), Arcade
Game Widgets (hơn 20 minigame tích hợp trên các trạm: Maze mê cung, Jigsaw Puzzle, Memory, Crossword, Treasure
Hunt, Flashcard, Dealer chia bài, Quiz), Branching Paths (đường đi rẽ nhánh phân hóa theo năng lực), Entry/Exit Points,
Wormholes (cổng dịch chuyển tức thời) [XÁC NHẬN: deck.toys/pricing; blog.tcea.org] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 4 / 12



## Trang 5

Thao tác & Kỹ năng: Học sinh di chuyển con trỏ nhân vật trên bản đồ kho báu, bấm vào từng nút trạm thử thách để
mở khóa nội dung (giải mật mã ổ khóa, đi qua mê cung, ghép mảnh tranh, thu thập chìa khóa ảo); rèn tư duy logic
giải quyết vấn đề, định hướng không gian và tự chủ học tập (Self-paced learning). Mẫu phổ biến nhất: Digital Locks,
Maze, Jigsaw Puzzle và Treasure Hunt.
Độ tuổi 3–6 tuổi: Hoàn toàn không phù hợp vì mật độ thông tin trên bản đồ dày đặc, quy tắc rẽ nhánh phức tạp và các
ổ khóa yêu cầu nhập chữ/số chính xác.
Độ tuổi 6–11 tuổi: Phù hợp từ lớp 3–5; học sinh tiểu học lớn cực kỳ thích thú với cảm giác khám phá bản đồ kho báu
và giải mật mã để mở rương.
3.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt một phần qua tính năng Study Set. Giáo viên tạo danh sách câu hỏi có thể tái sử
dụng vào các tiện ích Arcade (Maze, Memory), nhưng cấu trúc bản đồ (Nodes & Paths) và liên kết ổ khóa phải vẽ thủ
công trên từng Deck [XÁC NHẬN: deck.toys] .
Định dạng dữ liệu: JSON Schema đám mây quản lý đồ thị bản đồ (Graph-based Data: tọa độ Nodes, Edges, Locks
logic, App triggers).
Công nghệ hiển thị: HTML5 Canvas 2D kết hợp SVG để vẽ sơ đồ mạng lưới bản đồ và đường đi rẽ nhánh; giao diện
minigame chạy trên nền tảng web responsive tương thích cảm ứng.
Thêm loại game mới: Đội ngũ kỹ sư Deck.Toys trực tiếp phát triển các ứng dụng tiện ích (Apps/Widgets) mới vào thư
viện định kỳ.
3.3. Trải nghiệm khi chơi
Vòng chơi: Học sinh mở bản đồ bài học → Nhân vật xuất hiện tại điểm xuất phát (Start Node) → Bấm vào trạm 1:
đọc hướng dẫn hoặc chơi minigame giải mật khẩu → Mở khóa thành công: đoạn đường tiếp theo sáng lên dẫn sang
trạm 2 → Nếu gặp ngã rẽ (Branching), học sinh tự chọn đường dễ hoặc khó → Hoàn thành trạm cuối (Goal Node)
nhận kho báu và cúp vinh danh.
Xử lý sai: Khóa không mở, báo lỗi rung lắc ổ khóa, học sinh phải tư duy thử lại hoặc quay lại trạm trước để tìm manh
mối.
Đồng hồ, Xếp hạng: Có chế độ theo dõi trực tiếp vị trí của từng học sinh trên bản đồ (Teacher Live View); không có
bảng xếp hạng giật gân mà tập trung vào hành trình khám phá cá nhân.
Hiệu năng: Đồ họa bản đồ phức tạp nên lần tải đầu tiên tốn từ 3–5 giây; sau khi tải xong chuyển động tương đối
mượt [XÁC NHẬN: TCEA TechNotes Review] .
3.4. Tính năng AI
Thực trạng AI: HOÀN TOÀN KHÔNG CÓ TÍNH NĂNG AI GENERATIVE [XÁC NHẬN: deck.toys/features, 2026] . Nền tảng
dựa hoàn toàn vào công cụ dựng bản đồ thủ công (Map Visual Editor) và thuật toán tạo đường đi tự động (Learning
Paths Wizard dựa trên quy tắc).
Quy trình biên tập: Giáo viên phải tự tay kéo thả từng nút trạm, cấu hình logic ổ khóa và liên kết đường đi 100% bằng
tay.
Tiếng Việt: Giao diện chỉ có tiếng Anh; hỗ trợ gõ nội dung câu hỏi tiếng Việt có dấu tốt; có Voice Lock hỗ trợ nhận
diện phát âm một số ngôn ngữ nhưng tiếng Việt chưa chuẩn xác.
Vai trò AI: Không có AI trong hệ thống.
3.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC.
d. Ghép từ con vật bối cảnh vũ trụ: LÀM ĐƯỢC (Tải hình nền bản đồ dải ngân hà vũ trụ, đặt các trạm thử thách là các
hành tinh và cấu hình minigame ghép từ vựng con vật).
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 5 / 12



## Trang 6

3.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Create Deck" → Đặt tên. Bước 2: Tải ảnh nền bản đồ
rừng xanh. Bước 3: Tạo 5 trạm thử thách (Activity Nodes), mỗi trạm nhúng 1 câu hỏi đếm con vật hoặc 1 khóa số
(Number Lock). Bước 4: Vẽ đường dây liên kết giữa 5 trạm theo thứ tự. Bước 5: Cấu hình điều kiện mở khóa → Bấm
"Launch Classroom" [XÁC NHẬN: Deck.Toys Master Guide] .
Thời gian thực tế: Để xây dựng một bản đồ bài học hoàn chỉnh có liên kết logic, theo khảo sát thực tế từ TCEA Blog
và cộng đồng giáo viên, giáo viên phải mất từ 90 đến 180 phút (1.5 – 3 giờ) thao tác kỹ thuật tỉ mỉ.
3.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua đường link lớp học (deck.toys/yourclass), mã QR, tích hợp Google Classroom,
Microsoft Teams. Hỗ trợ 2 chế độ: Teacher Sync (giáo viên điều khiển bước đi cả lớp) và Free Mode (học sinh tự do
khám phá theo tốc độ riêng).
Tài khoản học sinh: Học sinh không bắt buộc tài khoản; có thể tham gia dạng Khách (Guest Access) bằng cách nhập
tên. Dữ liệu lưu vết 7 ngày trên bản Free; tuân thủ COPPA và FERPA [XÁC NHẬN: deck.toys/privacy] .
Phụ huynh: Học sinh có thể dùng link bài học để tiếp tục mở khóa bản đồ tại nhà.
3.8. Chi phí và giới hạn
Gói miễn phí: Giới hạn tối đa 2 lớp học (Classrooms), 1 Deck riêng tư (Private Deck), và tối đa 40 học sinh/lớp; lưu
trữ dữ liệu lớp trong 7 ngày [XÁC NHẬN: deck.toys/pricing, 2026] .
Gói trả phí (Deck.Toys Pro): 8.00 USD/tháng (thanh toán năm 96.00 USD/năm ~ 2.400.000 VNĐ/năm); mở rộng 10
lớp học, 100 private decks, 60 học sinh/lớp và lưu dữ liệu 30 ngày [XÁC NHẬN: deck.toys/pricing] .
Bản địa hóa: Giao diện hoàn toàn bằng tiếng Anh; không có giọng đọc tiếng Việt; đòi hỏi giáo viên phải có kỹ năng
công nghệ thông tin vững vàng.
4. BREAKOUT EDU (breakoutedu.com)
4.1. Danh mục cơ chế chơi
Nền tảng tiên phong về phòng thoát hiểm giáo dục (Educational Escape Rooms) kết hợp giữa hộp giải mã thực tế và
nền tảng số: Digital Locks Platform với 5 loại ổ khóa ảo tiêu chuẩn: (1) Number Lock (ổ khóa số từ 3–5 chữ số); (2)
Letter / Text Lock (ổ khóa chữ cái từ 3–6 ký tự); (3) Color Lock (ổ khóa màu sắc: Đỏ, Xanh, Vàng, Cam, Tím); (4)
Directional Lock (ổ khóa phương hướng: Lên, Xuống, Trái, Phải); (5) Shape Lock (ổ khóa hình học: Tròn, Vuông, Tam
giác, Sao, Thoi). Ngoài ra có chế độ Lock of the Day (câu đố mở khóa hàng ngày), Tag Team (chơi theo cặp) và Non-
linear 
Clues 
Inspection 
(soi 
tìm 
manh 
mối 
trên 
hình 
ảnh/văn 
bản)
[XÁC NHẬN: blog.tcea.org/category/digital-breakout; ResearchGate 2026] .
Thao tác & Kỹ năng: Đọc kỹ các văn bản manh mối (Clue cards), quan sát chi tiết ẩn trên bức tranh, giải câu đố tư
duy logic rồi bấm xoay các vòng khóa ảo để mở hộp quà; rèn luyện tư duy phản biện (Critical Thinking), suy luận
chứng cứ, hợp tác giải quyết vấn đề và tính kiên trì. Mẫu phổ biến nhất: Digital Breakout Kit Games và Lock of the Day.
Độ tuổi 3–6 tuổi: Hoàn toàn không phù hợp vì các câu đố đòi hỏi tư duy logic trừu tượng cao, xâu chuỗi thông tin và
đọc hiểu chứng cứ văn bản.
Độ tuổi 6–11 tuổi: Phù hợp từ lớp 4–5 (9–11 tuổi); học sinh lớp 1–2 thường bị nản lòng vì các câu đố đòi hỏi nhiều
bước suy luận trung gian.
4.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Dữ liệu câu đố và mật mã ổ khóa liên kết chặt chẽ với kịch bản phòng giải đố; không thể
tách rời để chuyển đổi 1-click sang minigame khác [XÁC NHẬN: breakoutedu.com] .
Định dạng dữ liệu: JSON Game Definition lưu trữ cấu hình phòng chơi: mảng manh mối, quy tắc kết hợp ổ khóa (Lock
combinations), hình ảnh và tài liệu đính kèm.
Công nghệ hiển thị: Giao diện ổ khóa ảo xây dựng bằng HTML5 Canvas 2D và mô phỏng 3D tương tác cảm ứng;
kiểm tra mật mã trực tiếp phía client và đồng bộ tiến độ mở khóa qua máy chủ đám mây.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 6 / 12



## Trang 7

Thêm loại game mới: Đội ngũ thiết kế trò chơi chuyên nghiệp của Breakout EDU sáng tạo và thẩm định trước khi đưa
lên thư viện.
4.3. Trải nghiệm khi chơi
Vòng chơi: Chiếu video giới thiệu cốt truyện nhiệm vụ (ví dụ: "Giải cứu phòng thí nghiệm trước khi virus phát tán") →
Mở màn hình với 3–5 ổ khóa ảo bị khóa chặt → Học sinh bấm vào từng manh mối (bài thơ, bức tranh, đoạn mật mã
Morse, bảng số liệu) → Thảo luận tìm ra quy luật → Nhập mã vào ổ khóa → Ổ khóa bật mở kèm tiếng "click" giòn tan
và sáng đèn xanh → Mở hết tất cả ổ khóa sẽ hiện màn hình chúc mừng "We Broke Out!" kèm thời gian phá đảo.
Xử lý sai: Ổ khóa lắc mạnh màu đỏ kèm âm thanh kẹt khóa, học sinh phải đọc lại manh mối và thử lại (không giới
hạn số lần thử nhưng mất thời gian).
Đồng hồ, Xếp hạng: Đồng hồ đếm ngược 45 phút kịch tính; bảng thành tích thời gian giải mã nhanh nhất lớp; linh vật
là chiếc hộp giải mã bí mật Breakout Box.
Hiệu năng: Ổ khóa ảo phản hồi chạm xoay rất mượt mà trên máy tính bảng và màn hình cảm ứng
[XÁC NHẬN: Tech & Learning Review] .
4.4. Tính năng AI
Thực trạng AI: Tính năng AI còn rất sơ khai, chủ yếu thử nghiệm tính năng gợi ý manh mối giải đố (Clue Assistant)
giai đoạn 2024–2026; chưa có công cụ AI sinh trọn vẹn kịch bản phòng thoát hiểm
[XÁC NHẬN: resources.breakoutedu.com/blog, 2026] .
Quy trình biên tập: Giáo viên phải tự nghĩ cốt truyện, tự giấu mật mã vào hình ảnh/bài văn, và cấu hình từng ổ khóa
hoàn toàn thủ công.
Tiếng Việt: Toàn bộ kho tài nguyên chính thức viết bằng tiếng Anh chuẩn văn hóa Mỹ; giáo viên Việt Nam phải tự tạo
phòng số từ đầu bằng tiếng Việt.
Vai trò AI: Hoàn toàn là tính năng thử nghiệm phụ trợ.
4.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC.
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Dựng kịch bản phòng thoát hiểm trên trạm vũ trụ, manh mối là
tên các con vật để mở khóa chữ cái Letter Lock).
4.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (Dạng Breakout): Bước 1: Đăng nhập → Bấm "Create Game". Bước 2: Viết cốt
truyện "Mở khóa chuồng thú". Bước 3: Tạo 5 manh mối (ví dụ bức tranh có 3 con mèo, 4 con chó để tìm ra mật mã số
"34..."). Bước 4: Thiết lập 1 ổ khóa số Number Lock và 1 ổ khóa hình Shape Lock. Bước 5: Kiểm tra liên kết và xuất
bản phòng chơi số [XÁC NHẬN: Breakout EDU Game Creation Guide] .
Thời gian thực tế: Theo nghiên cứu Integrating Immersive Experiences (ResearchGate), để giáo viên tự thiết kế một
kịch bản Breakout hoàn chỉnh mất trung bình từ 120 đến 240 phút (2 đến 4 giờ) suy nghĩ câu đố và cài đặt logic.
4.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua đường link game số, mã lớp học (Class Code), tích hợp Google Classroom. Học sinh
có thể chơi cá nhân hoặc chơi theo nhóm nhỏ (Team Breakout).
Tài khoản học sinh: Có thể chơi ẩn danh qua link bài học không cần tài khoản; nếu nhà trường quản lý thì học sinh
đăng nhập qua Google SSO. Đạt chứng nhận Student Privacy Certified, tuân thủ tuyệt đối COPPA và FERPA
[XÁC NHẬN: breakoutedu.com/terms] .
Phụ huynh: Phụ huynh có thể mua bộ kịch bản gia đình để cùng con giải đố vào dịp cuối tuần.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 7 / 12



## Trang 8

4.8. Chi phí và giới hạn
Gói miễn phí: Không có gói miễn phí vĩnh viễn; chỉ cho phép giáo viên dùng thử một vài game mẫu trong thời gian
ngắn [XÁC NHẬN: breakoutedu.com/pricing] .
Gói trả phí: Bản quyền kỹ thuật số giáo viên (Digital Only): 99.00 USD/năm (~2.450.000 VNĐ/năm); Gói Kit vật lý kèm
bản quyền phần mềm: 238.00 USD/năm; gói trường học từ 1.000+ USD/năm
[XÁC NHẬN: ResearchGate 2026; breakoutedu.com] .
Bản địa hóa: Giao diện 100% tiếng Anh; nội dung kho game bám chuẩn học đường Mỹ; giáo viên Việt Nam gặp rào
cản ngôn ngữ rất lớn khi tiếp cận.
5. GENIALLY (genial.ly)
5.1. Danh mục cơ chế chơi
Nền tảng thiết kế nội dung đồ họa tương tác và gamification cao cấp hàng đầu thế giới: Escape Games / Breakout
Rooms (phòng thoát hiểm đồ họa hoạt cảnh tương tác), Interactive Board Games (cờ tỷ phú, cờ cá ngựa tương tác),
Quiz & Trivia Games (đấu trường tri thức hoạt họa), Interactive Images (ảnh điểm nóng tương tác), Interactive
Infographics 
& 
Mindmaps, 
Gamified 
Presentations 
(bài 
thuyết 
trình 
trò 
chơi 
hóa), 
Video 
Quizzes
[XÁC NHẬN: genially.com; G2 Reviews 2026] .
Thao tác & Kỹ năng: Học sinh nhấp chuột/chạm vào các vật thể tương tác trên màn hình để kích hoạt 4 tầng hành
động (Tooltips: chú giải nổi; Windows: cửa sổ thông tin; Go to page: chuyển cảnh phi tuyến tính; Link: mở tài nguyên
ngoài); kéo thả các đối tượng (Drag & Drop objects); nhập mật khẩu mở trang; rèn luyện khả năng quan sát chi tiết thị
giác, tư duy thẩm mỹ, xâu chuỗi thông tin và khám phá tự định hướng. Mẫu phổ biến nhất: Escape Games và
Interactive Board Games.
Độ tuổi 3–6 tuổi: Có thể sử dụng nếu giáo viên thiết kế các trang truyện tranh tương tác chạm nghe âm thanh
(Interactive Storytelling); không phù hợp với các game Escape Room phức tạp.
Độ tuổi 6–11 tuổi: Rất phù hợp; học sinh tiểu học bị cuốn hút mạnh mẽ bởi chuyển động đồ họa vector sắc nét chuẩn
phim hoạt hình Disney/Pixar.
5.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: KHÔNG tách rời nội dung khỏi giao diện. Genially vận hành tương tự Canva/PowerPoint: nội
dung, hình ảnh, trigger tương tác và hiệu ứng hoạt ảnh được nhúng cứng vào từng trang slide của sản phẩm
[XÁC NHẬN: genially.com] .
Định dạng dữ liệu: JSON Canvas Data độc quyền lưu trữ cây phân cấp phần tử đồ họa (Vector Paths, Animation
Keyframes, Interactivity Actions, Coordinate Transform).
Công nghệ hiển thị: Công nghệ đồ họa vector HTML5 SVG kết hợp Canvas và CSS3 Animations đỉnh cao; hỗ trợ xuất
bản web HTML5 độc lập, nhúng iFrame hoặc xuất gói chuẩn SCORM/LTI cho LMS
[XÁC NHẬN: DevTools inspection trên genial.ly] .
Thêm loại game mới: Người dùng có thể tự tạo bất kỳ logic game nào bằng cách kết hợp các khối trigger, trang ẩn và
hiệu ứng kéo thả tự do.
5.3. Trải nghiệm khi chơi
Vòng chơi: Mở bìa game hoạt họa hoành tráng → Bấm nút Play chuyển cảnh mượt mà → Tương tác tìm chìa
khóa/trả lời câu hỏi → Nhận mật mã → Mở cảnh tiếp theo → Màn kết thúc vinh danh chiến thắng với hiệu ứng âm
thanh và đồ họa động rực rỡ.
Xử lý sai: Chuyển sang trang "Thất bại - Game Over" kèm nút "Thử lại" để đưa người chơi quay về trạm trước đó.
Đồng hồ, Xếp hạng: Có thể chèn tiện ích đồng hồ đếm ngược; không có bảng xếp hạng trực tiếp nhiều người chơi
thời gian thực; linh vật thay đổi linh hoạt theo hàng nghìn bộ mẫu thiết kế.
Hiệu năng: Đồ họa rất đẹp nhưng tệp chứa nhiều hiệu ứng vector nặng có thể gây giật khung hình trên điện thoại cấu
hình yếu hoặc đường truyền mạng chập chờn [XÁC NHẬN: Capterra Review 2026] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 8 / 12



## Trang 9

5.4. Tính năng AI
Tên & Ra mắt: Genially AI (AI Builder & AI Assist) (ra mắt cuối 2023, nâng cấp toàn diện 2025–2026)
[XÁC NHẬN: blog.genially.com/en/ai-for-content-creation, 2026] .
Khả năng tự động hóa: Cho phép nhập Prompt để AI tự động tạo bài thuyết trình, trắc nghiệm tương tác, infographic;
tự động tạo hình ảnh bằng AI và dịch nội dung sang 100+ ngôn ngữ. Giáo viên vẫn phải làm tay: Tự cấu hình kịch bản
Escape Room nhiều chặng, vẽ đường đi phân nhánh và tinh chỉnh từng trigger hành động thủ công.
Tiếng Việt: Hỗ trợ dịch và tạo nội dung tiếng Việt khá tốt qua mô hình AI tích hợp.
Vai trò AI: AI là trợ lý sáng tạo (Creative Copilot) đẩy nhanh quá trình thiết kế; lõi sản phẩm vẫn là công cụ biên tập đồ
họa tương tác.
5.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC (Không có physics engine tính trọng lượng cân bằng).
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng tính năng Draggable Elements: tải ảnh quả táo và chiếc giỏ, bật
chức năng kéo thả; học sinh kéo được quả táo đè lên chiếc giỏ nhưng không tự động kiểm tra đúng/sai).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM ĐƯỢC XUẤT SẮC (Có sẵn hàng chục mẫu Escape Room và Gamification chủ
đề vũ trụ không gian tuyệt đẹp).
5.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (Dạng Game): Bước 1: Đăng nhập → Bấm "Create Genially" → Chọn mục
"Gamification". Bước 2: Chọn một mẫu game có sẵn (ví dụ mẫu Đua xe hoặc Rừng xanh). Bước 3: Thay văn bản 5 câu
hỏi và chèn ảnh con vật vào các slide. Bước 4: Kiểm tra liên kết chuyển trang đúng/sai. Bước 5: Bấm "All set" để xuất
bản liên kết công khai [XÁC NHẬN: Genially Academy] .
Thời gian thực tế: Nếu dùng mẫu game trắc nghiệm có sẵn, giáo viên mất từ 25 đến 45 phút; nếu tự tay thiết kế một
Escape Room hoàn chỉnh nhiều màn, thời gian kéo dài từ 60 đến 180 phút (1 đến 3 giờ)
[XÁC NHẬN: EdTechTeacher Review] .
5.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua Link xem công khai, mã nhúng iFrame, mã QR, Google Classroom, Microsoft Teams,
xuất tệp HTML5 xem offline. Phù hợp cho giáo viên trình chiếu trên Smart TV hoặc gửi link cho học sinh tự khám
phá.
Tài khoản học sinh: Học sinh hoàn toàn không cần tài khoản; mở link trên bất kỳ trình duyệt nào là tương tác được
ngay. Đạt chứng chỉ bảo mật quốc tế, tuân thủ GDPR, COPPA và FERPA [XÁC NHẬN: genially.com/privacy] .
Phụ huynh: Rất thuận tiện để phụ huynh cùng con đọc sách tương tác hoặc chơi board game giáo dục trên máy tính
bảng.
5.8. Chi phí và giới hạn
Gói miễn phí: Cho phép tạo và chia sẻ không giới hạn số lượng sản phẩm; tuy nhiên bị dính logo mờ (watermark) của
Genially, không tải được file offline và bị giới hạn quyền truy cập các mẫu thiết kế cao cấp
[XÁC NHẬN: capterra.com/p/146861/Genially/pricing, 2026] .
Gói trả phí (Dành cho Giáo dục): Gói Genius / Edu Pro: 12.50 – 15.00 USD/tháng (~310.000 – 370.000 VNĐ/tháng,
thanh toán theo năm); Gói Edu 360: 25.00 USD/tháng mở quyền tải SCORM, AI nâng cao và công cụ cộng tác nhóm
[XÁC NHẬN: capterra.com; G2 2026] .
Bản địa hóa: Giao diện hỗ trợ nhiều ngôn ngữ (có tiếng Anh, Tây Ban Nha, Pháp; bản tiếng Việt đang hoàn thiện); gõ
dấu tiếng Việt tốt; có tính năng Text-to-Audio hỗ trợ đọc văn bản đa ngôn ngữ; kho đồ họa vector mang tính quốc tế
cao cấp.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 9 / 12



## Trang 10

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
Classtime
Collaborative
Challenges
Trả lời câu hỏi cá
nhân mở hoạt
cảnh chung
Hợp tác đồng đội,
trách nhiệm chung
Không
(nhiều
chữ)
Rất hợp
(lớp 2-5)
[XÁC NHẬN]  clever.com
Classtime
Categorizer /
Sorter
Chọn nhóm phân
loại, sắp xếp thứ
tự
Tư duy phân loại
logic, suy luận
Không
Rất hợp
[XÁC NHẬN]
classtime.com
Quizlet
Quizlet Live (Team
Mode)
Trao đổi nhóm,
bấm đáp án trên 1
máy duy nhất
Giao tiếp xã hội,
phản xạ từ vựng
Không
(thuần
chữ)
Rất hợp
(lớp 3-5)
[XÁC NHẬN]  quizlet.com
Quizlet
Match
Kéo ghép các thẻ
thuật ngữ và định
nghĩa
Liên kết khái niệm,
tốc độ nhận thức
Không
(cần đọc)
Rất hợp
[XÁC NHẬN]
atomisystems.com
Deck.Toys
Digital Locks (5
loại khóa)
Xoay vòng số,
nhập chữ, chọn
hướng mở khóa
Giải quyết vấn đề,
tư duy logic
Không
(quá khó)
Rất hợp
(lớp 3-5)
[XÁC NHẬN]  deck.toys
Deck.Toys
Learning Paths
Map
Di chuyển nhân
vật qua các trạm
rẽ nhánh
Tự định hướng học
tập, kiên trì
Không
Hợp (lớp
4-5)
[XÁC NHẬN]  blog.tcea.org
Breakout
EDU
Digital Escape
Room
Soi manh mối, giải
mã mở 5 ổ khóa
ảo
Tư duy phản biện,
suy luận chứng cứ
Không
Hợp (lớp
4-5)
[XÁC NHẬN]
breakoutedu.com
Breakout
EDU
Lock of the Day
Giải câu đố mở 1
ổ khóa hàng ngày
Tư duy logic nhanh,
tạo thói quen
Không
Rất hợp
[XÁC NHẬN]
resources.breakoutedu.com
Genially
Escape Rooms
Chạm điểm nóng,
tìm manh mối,
chuyển cảnh
Quan sát thị giác,
liên tưởng không
gian
Không
Rất hợp
(lớp 2-5)
[XÁC NHẬN]  genially.com
Genially
Interactive Board
Games
Tung xúc xắc ảo,
di chuyển quân cờ,
giải đố
Học qua chơi, tư
duy chiến thuật
Có (nếu
tranh vẽ)
Rất hợp
[XÁC NHẬN]  genial.ly
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
phụ
hay lõi
Tiếng
Việt
Giá gói trả
phí
Học
sinh
cần tài
khoản
Nguồn
Classtime
Có (Question
Set độc lập)
JSON
Session
Schema
Vue/React +
Canvas 2D
+
WebSockets
AI sinh câu
hỏi từ chủ
đề/doc
Phụ
(Add-
on)
Giao
diện có,
text tốt
8.00 – 10.00
USD/tháng
Không
cần
(PIN)
[XÁC NHẬN]
classtime.com
Quizlet
Có (1 Set
$\rightarrow$
Đa mode)
JSON Key-
Value
Pairs
React.js +
WebSockets
Magic Notes
bóc tách tài
liệu
Đang
thành
Lõi
Rất tốt
(Giao
diện +
TTS)
31.99 –
35.99
USD/năm
Không
cần
(Live)
[XÁC NHẬN]
quizlet.com
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 10 / 12



## Trang 11

Nền tảng
Tách nội
dung
khỏi
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
Tiếng
Việt
Giá gói trả
phí
Học
sinh
cần tài
khoản
Nguồn
Deck.Toys
Một
phần
(Study
Sets)
Graph-
based
JSON
Schema
HTML5
Canvas 2D
+ SVG
Không có AI
Không
có
Chỉ
tiếng
Anh, gõ
dấu OK
8.00
USD/tháng
(~96$/năm)
Không
cần
(Guest)
[XÁC NHẬN]
deck.toys
Breakout
EDU
Không
(Gắn
chặt kịch
bản)
JSON
Game
Definition
HTML5
Canvas +
CSS 3D
Locks
Thử nghiệm
Clue
Assistant
Phụ
(Thử
nghiệm)
Chỉ
tiếng
Anh, gõ
dấu OK
99.00
USD/năm
(Digital)
Không
bắt
buộc
[XÁC NHẬN]
breakoutedu.com
Genially
Không
(Nhúng
vào
slide)
JSON
Canvas
Data
(Vector)
SVG
Animations
+ HTML5
Canvas
AI Builder
sinh
slide/quiz
Phụ
(Copilot)
Dịch tốt,
Text-to-
Audio
12.50 –
25.00
USD/tháng
Không
cần
(Link)
[XÁC NHẬN]
genially.com
Bảng C3 – Mô tả ngoài mẫu:
Nền tảng
Mô tả a
Mô tả b
Mô tả c
Mô tả d
Classtime
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Quiz con vật
+ Thử thách Trạm vũ trụ)
Quizlet
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Thẻ con vật
chơi Match/Live)
Deck.Toys
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM ĐƯỢC (Vẽ bản đồ dải
ngân hà + Trạm con vật)
Breakout EDU
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Escape
Room trạm vũ trụ + Mở khóa
chữ)
Genially
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Kéo táo đè
lên giỏ, không tự chấm)
LÀM ĐƯỢC XUẤT SẮC (Có
sẵn mẫu Escape vũ trụ tuyệt
đẹp)
Ghi chú: Nhóm 3 làm rất tốt bối cảnh kể chuyện (Storytelling như mô tả d), nhưng hoàn toàn bất lực trước mô phỏng vật lý có tính toán
(đĩa cân) và chấm nét đồ chữ; khẳng định tính tất yếu của Game Engine 2D chuyên biệt trong đề tài khóa luận.
PHẦN D – DANH SÁCH ĐIỂM CẦN TỰ ĐĂNG NHẬP KIỂM TRA THỰC NGHIỆM [CẦN TỰ THỬ]
Để hoàn thiện các luận cứ thực chứng khách quan cho đề tài nghiên cứu, tác giả khóa luận cần tiến hành kiểm nghiệm
thực tế và lưu trữ hình ảnh minh chứng đối với 5 điểm kỹ thuật sau:
1. Kiểm tra cơ chế đồng bộ màn hình lớn của Classtime Collaborative Challenge:
• Hành động: Tạo 1 tài khoản Classtime giáo viên miễn phí; khởi động thử thách "Jungle Rollercoaster" trên máy tính
(đóng vai máy chiếu); mở 2 tab ẩn danh trên điện thoại để trả lời 1 câu đúng và 1 câu sai.
• Bằng chứng cần chụp: Ảnh chụp màn hình máy chiếu lúc toa tàu lượn được lắp thêm khi câu trả lời đúng được gửi lên và
giao diện phản hồi sửa sai riêng tư trên màn hình điện thoại học sinh.
2. Kiểm nghiệm cơ chế phân tán đáp án độc quyền của Quizlet Live (Team Mode):
• Hành động: Tạo một bộ thẻ 12 từ vựng tiếng Anh trên Quizlet; khởi tạo phiên Quizlet Live Team Mode; dùng 3 thiết
bị/trình duyệt giả lập 1 đội 3 học sinh cùng tham gia.
• Bằng chứng cần chụp: Chụp song song màn hình của 3 thiết bị tại cùng 1 câu hỏi để chứng minh: câu hỏi hiển thị giống
nhau nhưng danh sách 4 lựa chọn đáp án bị xáo trộn và chỉ có duy nhất 1 máy hiển thị đáp án đúng.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 11 / 12



## Trang 12

3. Đo thời gian thực tế để thiết lập một bản đồ bài học rẽ nhánh trên Deck.Toys:
• Hành động: Tự tay tạo 1 bài học 5 câu đếm con vật trên Deck.Toys gồm: tải ảnh nền, đặt 5 trạm thử thách (Nodes), nối
dây rẽ nhánh (Paths) và cấu hình 1 ổ khóa số (Number Lock).
• Bằng chứng cần chụp: Bấm giờ thực tế từ lúc bắt đầu kéo thả đến khi học sinh vào chơi được; chụp màn hình giao diện
Map Builder với mạng lưới liên kết dây nối phức tạp.
4. Khảo sát khả năng truy cập tài nguyên miễn phí trên Breakout EDU:
• Hành động: Đăng ký tài khoản giáo viên mới trên breakoutedu.com; tìm kiếm các trò chơi số (Digital Games) trong thư
viện bộ môn Toán và Tiếng Anh.
• Bằng chứng cần chụp: Hộp thoại yêu cầu nâng cấp gói trả phí ($99/năm) khi bấm vào các kịch bản hoàn chỉnh để
chứng minh nền tảng không có gói miễn phí vĩnh viễn cho giáo viên phổ thông.
5. Đánh giá năng lực sinh trò chơi Gamification của Genially AI Builder:
• Hành động: Mở Genially, chọn tính năng "Create with AI", nhập prompt tiếng Việt: "Tạo trò chơi trắc nghiệm 5 câu về các
hành tinh trong hệ mặt trời cho học sinh lớp 3".
• Bằng chứng cần chụp: Đánh giá chất lượng slide sinh ra (nội dung có thuần Việt không, các liên kết nút bấm chuyển
trang đúng/sai có được AI cấu hình tự động hay giáo viên vẫn phải nối trigger bằng tay).
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 3
Trang 12 / 12
