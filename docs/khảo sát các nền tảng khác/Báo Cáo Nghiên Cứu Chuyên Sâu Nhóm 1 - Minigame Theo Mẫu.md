# Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 1 - Minigame Theo Mẫu

> **Nghiên cứu chuyên sâu**: [[Khảo sát 7 nhóm nền tảng đối thủ]] | [[Báo Cáo Khảo Sát Nhóm 1 - Minigame Theo Mẫu & Học Liệu Mở|Khảo sát tổng quan Nhóm 1: Minigame Theo Mẫu]]



> **Tài liệu nguồn gốc**: `Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 1 - Minigame Theo Mẫu.pdf`  
> **Tổng số trang**: 13  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

BÁO CÁO NGHIÊN CỨU KỸ THUẬT • KHÓA LUẬN TỐT NGHIỆP
Khảo Sát Toàn Diện Nhóm 1: Minigame Theo Mẫu & Widget Học Liệu
Mở
Phân hệ: Wordwall, H5P, Educaplay, Educandy, LearningApps.org, BookWidgets • Đơn vị khảo sát: Nhóm Khóa Luận AI Game
Generator • Cập nhật: 11/2026
PHẦN A – TÓM TẮT NHÓM & BÀI HỌC THIẾT KẾ AI GAME GENERATOR
Điểm chung của Nhóm 1: Toàn bộ 06 nền tảng đều vận hành theo kiến trúc Template-Driven: tách rời dữ liệu thô (cặp từ,
câu hỏi, nhóm phân loại) khỏi mẫu giao diện trình diễn; người chơi chủ yếu thực hiện các thao tác vận động tinh (kéo thả,
ghép cặp, lật thẻ, chạm chọn) với phản hồi âm thanh - hình ảnh tức thì. Ngoại trừ H5P và BookWidgets mở rộng sang bài
tập học thuật, phần lớn tập trung vào minigame củng cố kiến thức từ 5–15 phút [XÁC NHẬN: content.wordwall.net; h5p.org] .
Bài học quan trọng nhất cho hệ thống AI Game Generator: (1) Kiến trúc tách rời Dữ liệu - Game Engine: Để xây dựng luồng
Prompt-to-Game [XÁC NHẬN: Notebook Sources] , LLM không cần sinh mã hiển thị Canvas phức tạp mà chỉ cần sinh đúng cấu
trúc Game JSON DSL chuẩn hóa (schemaVersion); Canvas Engine (react-konva) ở Client sẽ nhận JSON và render đồ họa.
(2) Khoảng trống "Nỗi đau nhập liệu": Các công cụ hiện tại bắt giáo viên tốn 15–30 phút nhập tay từng câu và tìm ảnh; AI
hiện nay chỉ sinh văn bản trắc nghiệm chữ rời rạc, chưa có công cụ nào tự động bồi đắp chuẩn GDPT 2018, tự tìm ảnh hoạt
hình và tự sinh giọng đọc TTS tiếng Việt trọn gói.
PHẦN B – NGHIÊN CỨU CHI TIẾT TỪNG NỀN TẢNG (08 TIÊU CHÍ)
1. WORDWALL (wordwall.net)
1.1. Danh mục cơ chế chơi
Sở hữu hơn 30 mẫu trò chơi tương tác (Interactive Templates). Các mẫu tiêu biểu: Match Up (kéo nối cặp), Quiz (trắc
nghiệm), Random Wheel (vòng quay), Whack-a-mole (đập chuột), Open the Box (mở hộp quà), Group Sort (phân loại
nhóm kéo thả), Gameshow Quiz (đấu trường truyền hình), Maze Chase (mê cung kiểu Pac-Man), Airplane (lái máy bay
bay qua mây), Find the Match (chọn cặp bài lật), Anagram (xếp chữ), Wordsearch (tìm từ), Crossword (ô chữ), Balloon
Pop (bắn bóng bay), True or False, Flip Tiles, Labelled Diagram (gắn nhãn tranh), Missing Word, Rank Order
[XÁC NHẬN: wordwall.net/features] .
Thao tác & Kỹ năng: Kéo thả (Match Up, Group Sort) rèn phân loại, vận động tinh; Chạm bấm nhanh (Whack-a-mole,
Airplane, Maze Chase) rèn phản xạ nhận thức và liên kết khái niệm; Chạm chọn (Quiz, Open the Box) rèn trí nhớ tái
hiện. Mẫu được dùng phổ biến nhất toàn cầu: Match Up, Quiz, Random Wheel và Whack-a-mole
[XÁC NHẬN: content.wordwall.net] .
Độ tuổi 3–6 tuổi: Rất phù hợp với Open the Box, Random Wheel, Match Up, Whack-a-mole vì hitbox lớn, âm thanh vui
nhộn, hình ảnh trực quan. Không hợp với Anagram, Crossword, Wordsearch vì trẻ chưa thạo chữ cái và chính tả.
Độ tuổi 6–11 tuổi: Rất phù hợp với hầu hết các mẫu, đặc biệt Maze Chase, Airplane, Group Sort, Gameshow Quiz vì
kích thích tính ganh đua tốc độ.
1.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: CÓ tính năng Switch Template độc quyền. Giáo viên tạo 1 bộ câu hỏi/cặp từ có thể đổi tức
thì từ Quiz sang Match Up, Whack-a-mole, Airplane. Dữ liệu gốc giữ nguyên text/ảnh, nhưng nếu đổi từ dạng có nhiều
đáp án sai sang dạng cặp từ 1-1 thì các đáp án nhiễu bị ẩn đi [XÁC NHẬN: wordwall.net/features] .
Định dạng dữ liệu: Dữ liệu lưu trữ dạng Proprietary JSON/Relational schema trên server Wordwall, không công khai
định dạng tệp để tải về offline (khác với gói .h5p) [SUY LUẬN: từ cấu trúc Network Payload khi biên tập] .
Công nghệ hiển thị: Kết hợp HTML5 Canvas/WebGL cho các arcade games (Airplane, Maze Chase) và CSS3/DOM
động cho các game thẻ bài (Open the box, Match up) [XÁC NHẬN: DevTools inspection trên wordwall.net] .
Thêm loại game mới: 100% do kỹ sư của Wordwall lập trình đóng gói. Người dùng và cộng đồng không thể tự code
hay nhúng logic game mới vào hệ thống.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 1 / 13



## Trang 2

1.3. Trải nghiệm khi chơi
Vòng chơi: Start Screen (nút Bắt đầu to, chọn Theme) → Màn chơi tương tác → Phản hồi đúng/sai tức thì (ting/buzz,
rung màn hình) → Tổng kết điểm & thời gian (Score/Time) → Leaderboard (nhập tên ghi danh).
Xử lý sai: Tùy game: Quiz hiển thị đáp án đúng màu xanh và chuyển câu; Arcade game (Whack-a-mole, Airplane) trừ
1 mạng (Lives/Tim), hết 3 mạng là Game Over.
Đồng hồ, Xếp hạng, Mascot: Có đồng hồ đếm xuôi hoặc đếm ngược; có Bảng xếp hạng Top 10/40; không có mascot
xuyên suốt mà thay đổi theo 10+ giao diện Theme (Classic, Wild West, Space, Jungle, Spooky)
[XÁC NHẬN: wordwall.net] .
Thiết bị & Hiệu năng: Tối ưu hoàn hảo cho Tivi/máy chiếu cảm ứng, iPad và điện thoại; tải trang dưới 2s, chuyển
động mượt 60 FPS [XÁC NHẬN: EdTech Reviews 2024] .
1.4. Tính năng AI
Tên & Ra mắt: Wordwall AI (nút ✨ "Generate with AI" trong trình biên tập, cập nhật mở rộng 2024–2026)
[XÁC NHẬN: content.wordwall.net, 07/2026] .
Khả năng tự động hóa: AI chỉ làm bước sinh câu hỏi/đáp án từ Topic, Paste text hoặc Upload tệp docx/pdf. Giáo viên
vẫn phải làm tay: chọn template, tìm và gắn ảnh minh họa (AI không tự động vẽ tranh), cấu hình thời gian/mạng
sống, bấm lưu và chia sẻ.
Tiếng Việt: Hỗ trợ tiếng Việt ở mức khá nhờ LLM đa ngôn ngữ; tuy nhiên câu chữ đôi khi dịch máy, chưa bám sát
chuẩn kiến thức sách giáo khoa Việt Nam [SUY LUẬN: từ phản hồi cộng đồng GV Tiểu học 4.0] .
Vai trò AI: AI là tính năng phụ (Add-on) giúp nhập liệu nhanh; nếu ngắt AI, nền tảng vẫn hoạt động 100% bình thường.
1.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC (Wordwall không có Physics Engine đĩa cân mô phỏng khối lượng).
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC (không có cơ chế Stroke Path Tracing trên Canvas).
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng mẫu Group Sort hoặc Labelled Diagram, tải file âm thanh lên
câu hỏi và kéo thẻ ảnh quả táo vào khung "Giỏ", nhưng không có chuyển động rơi vào lòng giỏ chân thực).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM ĐƯỢC (Chọn mẫu Match Up hoặc Maze Chase và đổi Theme sang "Space").
1.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Create Activity" → Chọn mẫu Quiz hoặc Match Up.
Bước 2: Nhập câu hỏi "Có mấy chú thỏ?", bấm biểu tượng ảnh tìm kiếm hình chú thỏ qua công cụ Bing tích hợp. Bước
3: Nhập đáp án đúng và 3 đáp án sai. Bước 4: Lặp lại đủ 5 câu. Bước 5: Bấm "Done", chọn Theme hoạt hình và bấm
Share [XÁC NHẬN: Wordwall Tutorial Guide] .
Thời gian thực tế: Theo khảo sát thực chứng của TCEA EdTech Blog (2024) và phản ánh của giáo viên, việc soạn thảo
thủ công 1 bài học 5 câu có tìm ảnh minh họa mất trung bình 15 đến 20 phút. Nếu dùng Wordwall AI sinh văn bản,
thời gian giảm còn 8 đến 10 phút do vẫn phải mất công tìm và thay từng hình ảnh thủ công.
1.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua Link, mã QR, Google Classroom, nhúng mã iFrame. Có 2 chế độ: (1) Trực tiếp trên lớp:
Giáo viên chiếu TV/máy chiếu, học sinh lên chạm hoặc trả lời miệng; (2) Set Assignment: Giao bài tập về nhà có hạn
nộp và ghi nhận kết quả [XÁC NHẬN: wordwall.net/community] .
Tài khoản học sinh & An toàn: Học sinh không cần tài khoản; chỉ cần nhập Tên/Biệt danh (Nickname). Nền tảng chỉ
lưu Tên + Điểm số + Thời gian làm bài; tuân thủ chuẩn bảo vệ dữ liệu trẻ em COPPA và GDPR
[XÁC NHẬN: Wordwall Privacy Policy] .
Phụ huynh: Phụ huynh mở link trực tiếp trên smartphone/máy tính bảng cho con chơi mà không cần cài đặt ứng
dụng.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 2 / 13



## Trang 3

1.8. Chi phí và giới hạn
Gói miễn phí: Giới hạn nghiêm ngặt tối đa 05 hoạt động (resources) được tạo vĩnh viễn; chỉ mở 18 mẫu cơ bản
(không có game arcade Whack-a-mole, Airplane) [XÁC NHẬN: wordwall.net/price-plans] .
Gói trả phí: Gói Standard: 7.20 USD/tháng (~180.000 VNĐ/tháng) tạo không giới hạn; Gói Pro: 10.80 USD/tháng
(~270.000 VNĐ/tháng) mở toàn bộ 30+ mẫu và in ấn bài tập PDF [XÁC NHẬN: wordwall.net/price-plans, 2026] . Không có
cổng thanh toán nội địa MoMo/VNPAY (phải dùng thẻ Visa/Mastercard quốc tế).
Chi phí AI: Tích hợp trong gói Standard/Pro, áp dụng chính sách Fair-use (giới hạn ngầm số lượt sinh mỗi tháng).
Bản địa hóa: Giao diện hỗ trợ tiếng Việt; gõ dấu tiếng Việt tốt; không có sẵn bộ giọng đọc TTS tiếng Việt (giáo viên
phải tự ghi âm rồi upload mp3); thư viện hình ảnh Bing tìm từ khóa tiếng Việt kém chính xác hơn tiếng Anh.
2. H5P (h5p.org / h5p.com)
2.1. Danh mục cơ chế chơi
Sở hữu hơn 50 loại nội dung tương tác (Content Types). Các mẫu tiêu biểu: Drag and Drop (kéo thả hình vào vùng đích),
Interactive Video (video chèn câu hỏi chặn dừng), Branching Scenario (kịch bản rẽ nhánh phi tuyến tính), Memory Game
(lật thẻ tìm cặp tranh), Drag the Words (kéo từ vào đoạn văn), Fill in the Blanks (điền khuyết), Image Choice (chọn hình
ảnh đúng), Find the Hotspot (chạm điểm nóng trên ảnh), Flashcards, Crossword, Dialog Cards, Speak the Words (nhận
diện 
phát 
âm 
giọng 
nói 
qua 
Web 
Speech 
API), 
Agamotto, 
Timeline, 
Virtual 
Tour 
360
[XÁC NHẬN: h5p.org/content-types-and-applications] .
Thao tác & Kỹ năng: Kéo thả tự do theo tọa độ (Drag and Drop); chạm chọn điểm ảnh (Hotspot); gõ phím điền từ.
Mẫu dùng nhiều nhất: Interactive Video, Drag and Drop, Multiple Choice, Branching Scenario [XÁC NHẬN: h5p.org] .
Độ tuổi 3–6 tuổi: Chỉ phù hợp với Memory Game, Image Choice, Drag and Drop tranh đơn giản. Không hợp với 80%
mẫu còn lại do nặng về đọc hiểu văn bản, xem video bài giảng dài.
Độ tuổi 6–11 tuổi: Phù hợp với Interactive Video, Flashcards, Drag the Words, Crossword.
2.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt ở cấp độ kiến trúc phần mềm cao nhất. Tệp đóng gói .h5p thực chất là file ZIP
chứa: (1) h5p.json (metadata, khai báo dependencies); (2) content/content.json (toàn bộ dữ liệu câu hỏi, đáp
án, tọa độ); (3) semantics.json (schema định nghĩa cấu trúc form biên tập); (4) thư mục chứa media (ảnh, audio,
video) [XÁC NHẬN: GitHub Lumieducation/H5P-Nodejs-library; edukatesg.com] . Tuy nhiên, không thể chuyển đổi 1-click giữa
các loại nội dung (không đổi được từ Drag and Drop sang Memory Game).
Công nghệ hiển thị: HTML5 DOM động kết hợp JavaScript/CSS3; giao tiếp iframe resizer với trang chủ LMS; hỗ trợ
chuẩn xAPI (Tin Can API) để bắn dữ liệu học tập ra LRS [XÁC NHẬN: h5p.org/documentation] .
Thêm loại game mới: Các kỹ sư phần mềm có thể tự lập trình module thư viện mới (bằng JavaScript/PHP), tuân thủ
đặc tả H5P Specification và tải lên H5P Hub để chia sẻ toàn cầu.
2.3. Trải nghiệm khi chơi
Vòng chơi: Tải nội dung → Học sinh tương tác kéo thả/chọn → Bấm nút "Check" → Hiển thị thanh điểm số
(ProgressBar/Stars) → Xuất hiện nút "Retry" (thử lại) hoặc "Show Solution" (xem giải thích) → Kết thúc.
Xử lý sai: Không trừ mạng, không game over kiểu arcade; cho phép thử lại tùy cấu hình sư phạm của giáo viên.
Đồng hồ, Xếp hạng: Hầu hết không có timer và không có Live Leaderboard (kết quả ghi thẳng vào sổ điểm LMS).
Không có linh vật dẫn dắt.
Hiệu năng: Tải nhẹ, phản hồi cục bộ phía Client cực nhanh, tương thích tốt trên mọi thiết bị qua iframe
[XÁC NHẬN: h5p.org] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 3 / 13



## Trang 4

2.4. Tính năng AI
Tên & Ra mắt: H5P Smart Import (ra mắt trên bản thương mại H5P.com SaaS giai đoạn 2023–2024, cập nhật lớn
2026) [XÁC NHẬN: help.h5p.com, 08/2026] .
Khả năng tự động hóa: Nhận tài liệu PDF, DOCX, Video YouTube, URL hoặc Text → AI bóc tách nội dung và tự tạo:
Multiple Choice, Drag the Words, Interactive Summary. Giáo viên vẫn phải làm tay: Tự cấu hình tọa độ vùng thả (Drop
Zones) cho game Drag and Drop, tải ảnh minh họa, thiết lập trọng số điểm.
Tiếng Việt: Smart Import cho phép chọn Output Language là Vietnamese, dịch và tạo câu hỏi trắc nghiệm tiếng Việt
khá chuẩn xác [XÁC NHẬN: PCC Instructional Support 2026] .
Vai trò AI: AI là tính năng phụ thuộc gói SaaS đám mây; bản mã nguồn mở H5P tự host hoàn toàn không có AI mặc
định.
2.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC (Không có physics engine cân bằng).
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC (Chỉ hỗ trợ vẽ tự do trên bảng vẽ, không có chấm điểm nét đồ chữ).
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng content type Drag and Drop: tải audio chỉ dẫn lên, đặt ảnh quả
táo làm Draggable và giỏ làm DropZone; nhưng thiếu giọng đọc AI tự sinh và hoạt ảnh vật lý nảy mượt mà).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Tự tải ảnh nền vũ trụ lên bài Drag and Drop, nhưng không có
hiệu ứng chuyển động không gian).
2.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (Drag and Drop): Bước 1: Mở H5P Editor → Chọn "Drag and Drop". Bước 2: Tải ảnh
nền kích thước chuẩn (ví dụ 800x600). Bước 3: Định nghĩa các vùng thả (Drop Zones: số 1, 2, 3, 4, 5). Bước 4: Tải từng
ảnh con vật, gán thuộc tính vào đúng DropZone tương ứng. Bước 5: Căn chỉnh tọa độ pixel từng ô bằng chuột. Bước
6: Thiết lập phản hồi điểm số và lưu [XÁC NHẬN: H5P Drag and Drop Tutorial] .
Thời gian thực tế: Theo nghiên cứu của nhóm phát triển E-learning Đại học Victoria (VU Collaborate) và Open
University, thiết lập 1 bài tập Drag and Drop hoàn chỉnh trên H5P tiêu tốn từ 30 đến 60 phút thao tác thủ công do phải
căn chỉnh tọa độ chi tiết.
2.7. Phân phối và sử dụng trong lớp
Chia sẻ: Xuất tệp đóng gói .h5p, mã nhúng iFrame, hoặc tích hợp chuẩn LTI v1.3 vào Canvas, Moodle, Blackboard,
WordPress [XÁC NHẬN: h5p.org] .
Tài khoản học sinh: Không cần tài khoản nếu xem công khai qua web; cần tài khoản trường học nếu đồng bộ điểm
số vào Gradebook của LMS. Tuân thủ tuyệt đối GDPR, FERPA, COPPA vì phục vụ các trường học chuẩn quốc tế.
Phụ huynh: Khó tiếp cận nếu bài học nằm trong LMS nội bộ của nhà trường.
2.8. Chi phí và giới hạn
Bản mã nguồn mở (h5p.org / Plugin Moodle, WordPress): Hoàn toàn MIỄN PHÍ 100%, không giới hạn số lượng bài
học, tự host trên máy chủ riêng [XÁC NHẬN: h5p.org/about-the-project] .
Bản đám mây thương mại (h5p.com): Gói tác giả cá nhân từ 19 USD/tháng (~470.000 VNĐ/tháng, thanh toán năm
229 USD/năm); gói tổ chức từ 500+ USD/năm [XÁC NHẬN: h5p.com/pricing] .
Chi phí AI: Tính năng Smart Import chỉ có trên H5P.com, tính theo đơn vị Credit tiêu thụ cho mỗi lần trích xuất tài liệu.
Bản địa hóa: Giao diện người dùng có gói dịch tiếng Việt do cộng đồng đóng góp; gõ tiếng Việt có dấu chuẩn UTF-8;
không có sẵn kho ảnh hay giọng đọc TTS tiếng Việt nội bộ.
3. EDUCAPLAY (educaplay.com)
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 4 / 13



## Trang 5

3.1. Danh mục cơ chế chơi
Sở hữu hơn 16 định dạng trò chơi tương tác HTML5: Froggy Jumps (ếch nhảy qua lá sen chọn đáp án), Memory Game
(lật thẻ ghi nhớ), Matching Pairs (nối cặp), Word Search (tìm từ ô chữ), Crossword, Riddle (câu đố gợi ý), Fill in the
Blanks, Cryptogram (giải mật mã chữ), Dialogue, Dictation (chính tả nghe - gõ), Map Quiz (chỉ định vị trí trên bản đồ/hình
ảnh), Video Quiz, Unscramble Letters/Words, Columns Matching [XÁC NHẬN: educaplay.com/types-of-activities] .
Thao tác & Kỹ năng: Nhảy lá sen trả lời nhanh (Froggy Jumps); chạm lật thẻ (Memory); chạm nối cột (Columns
Matching). Mẫu phổ biến nhất: Froggy Jumps, Word Search, Matching Pairs [XÁC NHẬN: educaplay.com] .
Độ tuổi 3–6 tuổi: Rất phù hợp với Froggy Jumps và Memory Game nhờ hình ảnh hoạt họa chú ếch ngộ nghĩnh, âm
thanh vui nhộn. Không hợp với Cryptogram, Crossword, Dictation do yêu cầu gõ phím chuẩn xác.
Độ tuổi 6–11 tuổi: Rất phù hợp với Froggy Jumps, Map Quiz, Columns Matching.
3.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Cho phép chuyển đổi linh hoạt câu hỏi trắc nghiệm sang mẫu Froggy Jumps hoặc Quiz
thông thường [XÁC NHẬN: educaplay.com] .
Định dạng dữ liệu: Dữ liệu lưu trữ dạng JSON đám mây; hỗ trợ xuất gói chuẩn SCORM để nhúng vào hệ thống LMS
chuyên nghiệp.
Công nghệ hiển thị: HTML5 Canvas 2D (cho minigame hoạt họa chuyển động như Froggy Jumps) kết hợp
DOM/CSS3 linh hoạt.
Thêm loại game mới: Do đội ngũ kỹ sư Educaplay phát triển và phát hành theo chu kỳ sản phẩm.
3.3. Trải nghiệm khi chơi
Vòng chơi: Nhấn Start → Chú ếch xuất hiện tại lá sen → Hiện câu hỏi và 3-4 lá sen đáp án → Chọn đúng: ếch nhảy
tiến lên an toàn kèm âm thanh rộn rã; Chọn sai: ếch rơi xuống nước 'tõm' và mất 1 mạng → Hết câu hỏi hoặc hết
mạng → Màn kết thúc vinh danh điểm và thời gian.
Xử lý sai: Rơi xuống nước, mất mạng (Lives), hiển thị đáp án đúng để học sinh ghi nhớ.
Đồng hồ, Xếp hạng, Mascot: Có đồng hồ đếm ngược; Bảng xếp hạng Top điểm cao; Chú ếch xanh Froggy là nhân vật
dẫn dắt thương hiệu.
Hiệu năng: Đồ họa mượt mà, nhưng bản miễn phí chèn quảng cáo Google Ads xung quanh khung game làm giảm
hiệu năng và gây mất tập trung [XÁC NHẬN: Common Sense Education Review] .
3.4. Tính năng AI
Tên & Ra mắt: Educaplay Ray (AI Activity Assistant - ra mắt năm 2023) [XÁC NHẬN: educaplay.com/premium] .
Khả năng tự động hóa: Giáo viên nhập Prompt chủ đề (ví dụ: "Phép cộng phạm vi 10") hoặc dán tài liệu → Ray AI tự
động sinh câu hỏi, đáp án đúng/nhiễu và cấu hình thẳng vào game Froggy Jumps. Giáo viên vẫn phải làm tay: Duyệt
câu hỏi, tự upload/thay thế hình ảnh, chỉnh thời gian trả lời.
Tiếng Việt: Ray AI hỗ trợ tiếng Việt ở mức khá tốt, tuy nhiên đôi khi dịch ngữ liệu từ văn hóa phương Tây.
Vai trò AI: AI là tính năng bổ trợ tăng tốc; nếu tắt AI, giáo viên vẫn tạo game bằng tay bình thường.
3.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng game Dictation hoặc Matching có đính kèm file audio phát âm,
nhưng không có mô phỏng chiếc giỏ vật lý).
d. Ghép từ con vật bối cảnh vũ trụ: KHÔNG LÀM ĐƯỢC HOÀN TOÀN (Chỉ cố định bối cảnh đầm lầy lá sen của Froggy,
không đổi sang giao diện trạm không gian được).
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 5 / 13



## Trang 6

3.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Bấm "New Activity" → Chọn Froggy Jumps. Bước 2: Dùng Ray AI gõ lệnh
"Tạo 5 câu hỏi đếm con vật cho lớp 1" → Hệ thống sinh 5 câu hỏi trong 5 giây. Bước 3: Giáo viên duyệt câu hỏi, bấm
chọn ảnh con vật từ kho hoặc máy tính. Bước 4: Thiết lập 3 mạng, thời gian 30 giây/câu → Bấm "Publish".
Thời gian thực tế: Tạo thủ công mất 15 đến 20 phút; dùng Ray AI mất khoảng 3 đến 5 phút (tiết kiệm 75% thời gian
tạo chữ) [XÁC NHẬN: Educaplay Official Case Study] .
3.7. Phân phối và sử dụng trong lớp
Chia sẻ: Chia sẻ qua URL, mã PIN (Game PIN chơi nhanh), mã QR, nhúng Google Classroom, LTI/Canvas.
Tài khoản học sinh: Học sinh không cần tài khoản; nhập Nickname hoặc mã PIN là chơi được ngay. Tuân thủ COPPA
và Safe Harbor privacy [XÁC NHẬN: educaplay.com/privacy-policy] .
Phụ huynh: Mở link trên điện thoại cho con chơi trực tiếp trên trình duyệt.
3.8. Chi phí và giới hạn
Gói miễn phí: Tạo game không giới hạn số lượng; tuy nhiên xuất hiện nhiều quảng cáo banner/video gây phiền; lượt
dùng Ray AI bị giới hạn hàng tháng.
Gói trả phí: Gói Advanced: 4.75 USD/tháng (57 USD/năm ~ 1.400.000 VNĐ) xóa quảng cáo, mở rộng Ray AI; Gói
Academic: 9.50 USD/tháng (114 USD/năm) tích hợp LMS; Gói Commercial: 47.50 USD/tháng (570 USD/năm)
[XÁC NHẬN: educaplay.com/premium, 2026] .
Bản địa hóa: Giao diện có bản dịch tiếng Việt; gõ tiếng Việt tốt; có công cụ Text-to-Speech tự động đọc câu hỏi bằng
tiếng Việt (giọng máy cơ bản); kho ảnh minh họa chưa có nét vẽ dân gian gần gũi Việt Nam.
4. EDUCANDY (educandy.com)
4.1. Danh mục cơ chế chơi
Sinh tự động 8–9 minigame phong cách kẹo ngọt từ 3 loại dữ liệu đầu vào: (1) Từ danh sách từ vựng (Words): Word
Search, Anagrams (xếp chữ kẹo), Hangman (thanh sô-cô-la tan chảy); (2) Từ cặp ghép (Matching Pairs): Noughts &
Crosses (cờ ca-rô trả lời câu hỏi), Crosswords, Match-up (kéo nối kẹo), Memory (lật thẻ kẹo); (3) Từ câu hỏi trắc nghiệm
(Quiz Questions): Multiple Choice Quiz [XÁC NHẬN: edtechpicks.org; blog.tcea.org] .
Thao tác & Kỹ năng: Chạm lật thẻ kẹo (Memory), kéo nối viên kẹo (Match-up), đánh cờ ca-rô (Noughts & Crosses).
Mẫu phổ biến nhất: Match-up và Noughts & Crosses.
Độ tuổi 3–6 tuổi: Rất phù hợp với Match-up và Memory nhờ giao diện bánh kẹo sặc sỡ, nút bấm bo tròn to, âm thanh
nhai kẹo vui nhộn. Không hợp với Anagrams, Crosswords do yêu cầu chính tả chữ cái.
Độ tuổi 6–11 tuổi: Rất phù hợp để học từ vựng Tiếng Anh tiểu học.
4.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: CÓ tính năng tự động hóa triệt để nhất nhóm: Giáo viên chỉ nhập duy nhất 1 danh sách từ
vựng/cặp ghép, hệ thống tự động sinh ra TẤT CẢ các minigame liên quan mà không mất dữ liệu
[XÁC NHẬN: educandy.com] .
Định dạng dữ liệu: Dữ liệu cấu trúc phẳng (Key-Value word pairs) lưu trữ trên cloud theo mã Educandy Code.
Công nghệ hiển thị: HTML5 WebGL / Canvas tích hợp trên nền tảng Web và ứng dụng di động đa nền tảng.
Thêm loại game mới: Hoàn toàn do nhà phát triển Educandy xây dựng.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 6 / 13



## Trang 7

4.3. Trải nghiệm khi chơi
Vòng chơi: Chọn minigame từ menu kẹo ngọt → Thao tác ghép thẻ kẹo → Âm thanh kẹo nổ "pop" giòn tan → Màn
hình chúc mừng với cơn mưa kẹo và thời gian hoàn thành.
Xử lý sai: Báo âm thanh "buzz" nhẹ, cho phép thử lại ngay tại chỗ, không tạo áp lực tâm lý.
Đồng hồ, Xếp hạng: Có đồng hồ đếm thời gian; không có bảng xếp hạng ganh đua công khai; linh vật là thế giới đồ
họa kẹo ngọt Candy World.
Hiệu năng: Hoạt động rất mượt mà trên iPad và ứng dụng di động; bản web tải tài nguyên âm thanh hơi lâu ở lần đầu
tiên.
4.4. Tính năng AI
Thực trạng AI: HOÀN TOÀN KHÔNG CÓ AI [XÁC NHẬN: educandy.com, 2026] . Nền tảng hoạt động hoàn toàn theo thuật
toán quy tắc (Rule-based procedural generation).
Quy trình biên tập: Giáo viên phải tự gõ từng cặp từ vựng/câu hỏi thủ công 100%.
Tiếng Việt: Không có AI tiếng Việt. Nhập văn bản tiếng Việt Unicode được nhưng phông chữ kẹo ngọt hiển thị dấu
tiếng Việt dễ bị lỗi vỡ chân chữ [SUY LUẬN: từ font glyph thiếu hỗ trợ ký tự tiếng Việt mở rộng] .
Vai trò AI: Không có AI trong hệ thống.
4.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC (Không hỗ trợ ghi âm riêng từng thẻ trên bản thường, không có
vùng kéo thả tự do).
d. Ghép từ con vật bối cảnh vũ trụ: KHÔNG LÀM ĐƯỢC (Giao diện cố định 100% phong cách kẹo ngọt, không thể thay
đổi chủ đề).
4.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Create a new activity" → Chọn "Matching Pairs".
Bước 2: Nhập tên bài. Bước 3: Gõ cặp 1 (Text: "1 con chó" - Text/Emoji: "🐶"). Lặp lại cho 5 con vật. Bước 4: Bấm
"Save" → Hệ thống lập tức sinh ra 5 trò chơi khác nhau có mã truy cập [XÁC NHẬN: Educandy Help Center] .
Thời gian thực tế: Nếu chỉ gõ chữ/emoji, giáo viên mất từ 5 đến 8 phút (nhanh nhất trong việc tạo thủ công). Nếu
phải upload hình ảnh tự tìm, thời gian kéo dài 15 phút.
4.7. Phân phối và sử dụng trong lớp
Chia sẻ: Chia sẻ qua mã code 5-6 chữ số (Educandy Code), đường link web trực tiếp, hoặc mã nhúng iFrame.
Tài khoản học sinh: Học sinh không cần tài khoản; chỉ cần mở web/app gõ mã Code là chơi được ngay. Tuân thủ
chuẩn bảo vệ trẻ em (không thu thập bất kỳ dữ liệu cá nhân nào) [XÁC NHẬN: Educandy Privacy Statement] .
Phụ huynh: Rất thuận tiện để phụ huynh tải App trên máy tính bảng cho con tự luyện tập từ vựng ở nhà.
4.8. Chi phí và giới hạn
Gói miễn phí: Miễn phí tạo danh sách cơ bản; tuy nhiên bị giới hạn tính năng (quảng cáo trên app/web, không tải
được ảnh chất lượng cao riêng).
Gói trả phí (Educandy Pro): Khoảng 2.99 USD/tháng hoặc 24.00 – 30.00 USD/năm (~600.000 – 750.000 VNĐ/năm)
mở khóa upload ảnh riêng, thêm âm thanh, xóa quảng cáo [XÁC NHẬN: TCEA Blog; Apple App Store] .
Bản địa hóa: Giao diện hoàn toàn bằng tiếng Anh; không có giọng đọc tiếng Việt; phông chữ kẹo ngọt chưa hỗ trợ
trọn vẹn bộ dấu thanh tiếng Việt.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 7 / 13



## Trang 8

5. LEARNINGAPPS.ORG
5.1. Danh mục cơ chế chơi
Cung cấp hơn 20 khối ứng dụng (Building Blocks) tương tác kinh điển: Matching Pairs (ghép cặp thẻ), Group
Assignment (kéo thẻ vào các nhóm), Number line / Order (sắp xếp trên trục số hoặc dòng thời gian), Simple Order (sắp
xếp thứ tự), Free text input (điền từ tự do), Matching grid (ma trận nối), Cloze text (bài tập điền khuyết), Mindmap, Guess
the word (người treo cổ), Millionaire Game (mô phỏng Ai là triệu phú), Puzzle (lật mảnh ghép trả lời câu hỏi), Crossword,
Word grid [XÁC NHẬN: learningapps.org; Frontiers in Education 2026] .
Thao tác & Kỹ năng: Kéo dán giấy ghi chú (Matching Pairs, Group Assignment); sắp xếp chuỗi (Simple Order); chọn 1
trong 4 đáp án (Millionaire). Mẫu dùng nhiều nhất: Matching Pairs, Group Assignment, Millionaire Game.
Độ tuổi 3–6 tuổi: Có thể dùng Matching Pairs và Group Assignment nếu giáo viên tải toàn bộ bằng hình ảnh to.
Không hợp với Cloze text, Crossword, Millionaire vì ngập tràn chữ viết học thuật.
Độ tuổi 6–11 tuổi: Rất phù hợp với môn Tự nhiên & Xã hội, Lịch sử, Địa lý lớp 4–5.
5.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt cấu hình nội dung độc lập trong cơ sở dữ liệu của Viện Sư phạm PH Bern. Tuy
nhiên, không hỗ trợ 1-click chuyển đổi mẫu (không đổi tự động từ Group Assignment sang Matching Pairs)
[XÁC NHẬN: learningapps.org] .
Định dạng dữ liệu: Cấu trúc JSON/XML nội bộ lưu trữ tham số các phần tử tương tác, đường dẫn media và phản hồi
văn bản.
Công nghệ hiển thị: HTML5 DOM truyền thống với thư viện jQuery UI (Draggable / Droppable), hiệu ứng phẳng phong
cách bảng ghim gỗ/giấy dán ghi chú.
Thêm loại game mới: Dự án nguồn mở học thuật phi lợi nhuận do các nhà nghiên cứu thuộc Viện Sư phạm Bern
(Thụy Sĩ) phát triển và duy trì.
5.3. Trải nghiệm khi chơi
Vòng chơi: Pop-up hiển thị hướng dẫn nhiệm vụ → Bấm OK vào màn hình bảng ghim → Thao tác kéo các mẩu
giấy/hình ảnh ghép vào nhau → Bấm dấu tích màu xanh góc dưới kiểm tra → Viền chuyển màu xanh (đúng) hoặc đỏ
(sai) → Hoàn thành hiện pop-up khen ngợi.
Xử lý sai: Thẻ bị viền đỏ, học sinh bấm kéo tách hai thẻ ra để ghép lại cho đến khi đạt điểm tối đa.
Đồng hồ, Xếp hạng: Một số mẫu hỗ trợ bấm giờ; không có bảng xếp hạng đối kháng trực tiếp; không có nhân vật
hoạt hình dẫn dắt.
Hiệu năng: Dung lượng cực nhẹ, tải siêu tốc; tuy nhiên thao tác cảm ứng chạm - kéo trên máy tính bảng dễ bị trượt
hoặc xung đột với thao tác cuộn màn hình của trình duyệt di động.
5.4. Tính năng AI
Thực trạng AI: HOÀN TOÀN KHÔNG CÓ TÍNH NĂNG AI [XÁC NHẬN: learningapps.org/about.php, 2026] . Nền tảng duy trì
triết lý công cụ sư phạm truyền thống.
Quy trình biên tập: Giáo viên nhập liệu từng trường dữ liệu, tự tải ảnh hoặc tìm link Wikipedia hoàn toàn thủ công.
Tiếng Việt: Giao diện có bản dịch tiếng Việt do cộng đồng giáo viên đóng góp; gõ dấu tiếng Việt chuẩn Unicode.
Vai trò AI: Hoàn toàn không phụ thuộc vào AI.
5.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng Group Assignment: tải tệp ghi âm giọng đọc làm hướng dẫn,
kéo ảnh quả táo vào nhóm "Giỏ", nhưng không có hiệu ứng hoạt họa rơi vào giỏ).
d. Ghép từ con vật bối cảnh vũ trụ: KHÔNG LÀM ĐƯỢC (Giao diện cố định bảng ghim ghi chú, chỉ cho phép đổi hình
nền phẳng tĩnh).
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 8 / 13



## Trang 9

5.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Bấm "Create App" → Chọn "Matching Pairs". Bước 2: Nhập tiêu đề và yêu
cầu bài. Bước 3: Cặp 1: Ảnh 3 chú thỏ + Thẻ ghi chữ/số 3. Lặp lại cho 5 cặp. Bước 4: Nhập phản hồi khi hoàn thành
("Em giỏi lắm!") → Bấm "Show preview" → Bấm "Save app".
Thời gian thực tế: Theo các bài nghiên cứu về ứng dụng LearningApps trong sư phạm phổ thông (ResearchGate
2024–2026), giáo viên mất từ 20 đến 35 phút để thiết kế một bài học hoàn chỉnh do giao diện biểu mẫu nhiều bước
kỹ thuật.
5.7. Phân phối và sử dụng trong lớp
Chia sẻ: Đường dẫn trực tiếp, liên kết toàn màn hình, mã QR, mã nhúng iFrame; hỗ trợ chức năng "My Classes" (tạo
lớp học ảo để quản lý tiến độ) [XÁC NHẬN: edusystem.app] .
Tài khoản học sinh: Không bắt buộc nếu chơi tự do qua link/QR. Nếu giáo viên dùng "My Classes", giáo viên tự tạo
tên đăng nhập/mật khẩu đơn giản cho học sinh mà không cần email. Tuân thủ tuyệt đối chuẩn bảo vệ quyền riêng tư
châu Âu (GDPR).
Phụ huynh: Phụ huynh mở link trên bất kỳ thiết bị nào có trình duyệt là chơi được ngay.
5.8. Chi phí và giới hạn
Chi phí: HOÀN TOÀN MIỄN PHÍ 100%, không có gói thương mại, không có quảng cáo, vận hành nhờ tài trợ giáo dục
của Thụy Sĩ [XÁC NHẬN: learningapps.org/about.php] .
Bản địa hóa: Giao diện có tiếng Việt; gõ tiếng Việt tốt; có công cụ Text-to-Speech tự động đọc văn bản (hỗ trợ tiếng
Việt ở mức giọng đọc cơ bản); hỗ trợ tìm nhanh hình ảnh từ kho mở Wikipedia/Wikimedia.
6. BOOKWIDGETS (bookwidgets.com)
6.1. Danh mục cơ chế chơi
Cung cấp hơn 40 mẫu tiện ích và trò chơi học tập chuyên sâu: (1) Trò chơi tương tác: Jigsaw Puzzle (ghép tranh mảnh
ghép), Memory Game, Crossword, Word Search, Pair Matching, Bingo, Spot the Difference (tìm điểm khác biệt), Mind
Map, Randomness Wheel; (2) Bài tập & Kiểm tra: Quiz, Interactive Worksheet, Split Worksheet (chia đôi màn hình), Exit
Ticket; 
(3) 
Toán 
học 
& 
Đồ 
thị: 
Arithmetic 
(luyện 
tính 
nhẩm), 
Chart, 
Spreadsheet, 
Active 
Plot
[XÁC NHẬN: bookwidgets.com; teachers-blog.com] .
Thao tác & Kỹ năng: Kéo xoay mảnh ghép (Jigsaw Puzzle); tìm điểm khác nhau (Spot the Difference); giải toán số
học; làm bài tập trên màn hình chia đôi (Split Worksheet). Mẫu dùng nhiều nhất: Interactive Worksheet, Quiz, Split
Worksheet, Jigsaw Puzzle [XÁC NHẬN: bookwidgets.com] .
Độ tuổi 3–6 tuổi: Rất phù hợp với Jigsaw Puzzle, Memory Game, Spot the Difference. Các widget dạng Worksheet,
Arithmetic, WebQuest quá phức tạp với trẻ mầm non.
Độ tuổi 6–11 tuổi: Rất phù hợp với Split Worksheet (một bên hiển thị tranh truyện/bài đọc, một bên trả lời câu hỏi).
6.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Dữ liệu cấu hình theo chuẩn Schema của từng loại Widget. Không chuyển đổi 1-click giữa
các game có logic khác nhau (như từ Jigsaw Puzzle sang Crossword), nhưng chuyển đổi tốt trong nhóm
Quiz/Worksheet [XÁC NHẬN: BookWidgets Knowledge Base] .
Định dạng dữ liệu: Lưu trữ cấu hình đám mây, hỗ trợ đóng gói chuẩn LTI Package để tích hợp sâu vào hệ thống quản
lý học tập.
Công nghệ hiển thị: HTML5 Canvas 2D (cho Jigsaw Puzzle cắt mảnh ghép theo thuật toán bezier, Spot the
Difference) kết hợp DOM/CSS nâng cao cho các biểu mẫu bài tập.
Thêm loại game mới: Đội ngũ kỹ sư BookWidgets (Kidimedia, Bỉ) trực tiếp phát triển.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 9 / 13



## Trang 10

6.3. Trải nghiệm khi chơi
Vòng chơi: Mở widget → Thực hiện tương tác (ghép mảnh tranh, điền số, nối thẻ) → Bấm "Submit" hoặc "Check" →
Phản hồi đúng sai kèm bảng điểm chi tiết → Tự động bắn dữ liệu điểm số về Live Monitoring Dashboard của giáo
viên.
Xử lý sai: Tùy cấu hình giáo viên: cho phép thử lại, hiển thị giải thích đáp án, hoặc khóa câu trả lời để chấm điểm thi
đua.
Đồng hồ, Xếp hạng: Có đồng hồ đếm thời gian; không có Live Arcade Leaderboard kiểu game show; không có linh
vật hoạt hình.
Hiệu năng: Cực kỳ mượt mà, tối ưu sâu cho máy tính bảng iPad và màn hình thông minh SMART Board
[XÁC NHẬN: Apple Education Case Studies] .
6.4. Tính năng AI
Tên & Ra mắt: BookWidgets AI Assist (ra mắt giai đoạn cuối 2023 – 2024, cập nhật lớn 2025–2026)
[XÁC NHẬN: teachers-blog.com, 09/2025] .
Khả năng tự động hóa: Giáo viên nhập prompt yêu cầu (ví dụ: "Tạo 5 bài toán đếm hình cho lớp 1") → AI Assist tự
động sinh câu hỏi, đáp án đúng/nhiễu và cấu hình thẳng vào Widget. Giáo viên vẫn phải làm tay: Duyệt lại câu hỏi,
thêm hình ảnh minh họa, cấu hình thang điểm và xuất bản.
Tiếng Việt: Hỗ trợ tiếng Việt ở mức khá tốt qua AI Assist; tuy nhiên câu hỏi mang tính đặc thù văn hóa Việt Nam vẫn
cần chỉnh sửa lại.
Vai trò AI: AI là tính năng phụ trợ (Copilot); không có AI nền tảng vẫn hoạt động bình thường.
6.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC (Chỉ có widget số học Arithmetic tính nhẩm số, không có cân mô phỏng).
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC (Có widget Whiteboard cho phép vẽ tự do, nhưng không có logic phát hiện và
chấm điểm theo nét chữ mẫu).
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng widget Drag & Drop trong Worksheet, chèn file âm thanh đọc đề
và kéo nhãn ảnh táo vào khung giỏ; không có chuyển động rơi tự do).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Dùng widget Pair Matching, tải ảnh nền trạm vũ trụ lên, nhưng
không có hiệu ứng chuyển động phi thuyền).
6.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Create new widget" → Chọn "Pair Matching" hoặc
"Quiz". Bước 2: Dùng AI Assist gõ prompt hoặc nhập tay từng câu hỏi. Bước 3: Tải ảnh con vật lên từng thẻ. Bước 4:
Thiết lập chế độ chấm điểm (chơi vui hay lấy điểm). Bước 5: Bấm "Share" → Xuất mã liên kết.
Thời gian thực tế: Tạo thủ công bài học hoàn chỉnh mất từ 20 đến 35 phút do hệ thống có rất nhiều tùy chọn cấu
hình bảo mật và thang điểm. Dùng AI Assist rút ngắn còn khoảng 7 đến 10 phút (vẫn mất thời gian tìm và gắn ảnh
minh họa).
6.7. Phân phối và sử dụng trong lớp
Chia sẻ: Chia sẻ qua Link ngắn, mã QR, mã widget code 6 ký tự, nhúng sâu vào Google Classroom, Microsoft Teams,
Canvas LMS, Schoology.
Tính năng lớp học đặc biệt: Có Live Monitoring (giáo viên theo dõi màn hình học sinh làm bài theo thời gian thực) và
Exam Mode (chế độ thi cử khóa chặt trình duyệt chống gian lận) [XÁC NHẬN: bookwidgets.com/features] .
Tài khoản học sinh: Không bắt buộc nếu làm bài ẩn danh qua mã widget; cần tài khoản trường học nếu gửi bài chấm
điểm chính thức. Đạt chứng nhận Student Privacy Pledge, tuân thủ COPPA, FERPA, GDPR nghiêm ngặt
[XÁC NHẬN: bookwidgets.com/privacy] .
Phụ huynh: Phụ huynh có thể mở link bài tập cho con tự ôn luyện ở nhà.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 10 / 13



## Trang 11

6.8. Chi phí và giới hạn
Gói miễn phí: Dùng thử đầy đủ tính năng trong 60 ngày; không có gói miễn phí vĩnh viễn (hết 60 ngày bắt buộc phải
nâng cấp bản quyền) [XÁC NHẬN: bookwidgets.com/pricing] .
Gói trả phí: Bản quyền giáo viên cá nhân: khoảng 65.00 – 75.00 USD/năm (~1.600.000 – 1.850.000 VNĐ/năm); gói
trường học từ 150+ USD/năm tùy quy mô học sinh [XÁC NHẬN: ivypanda.com; bookwidgets.com] . Không có cổng thanh
toán nội địa Việt Nam.
Chi phí AI: Tính năng AI Assist đi kèm theo gói đăng ký, có hạn ngạch sử dụng theo tháng.
Bản địa hóa: Giao diện dịch sang tiếng Việt một phần; gõ tiếng Việt tốt; hỗ trợ đa phương tiện mạnh nhưng không có
sẵn giọng đọc TTS tiếng Việt; kho ảnh tích hợp liên kết Pixabay/Unsplash.
PHẦN C – BA BẢNG TỔNG HỢP SO SÁNH KỸ THUẬT
Bảng C1 – Danh mục cơ chế chơi chi tiết
Nền tảng
Tên mẫu
Thao tác chính
Kỹ năng luyện
Hợp 3–6
tuổi
Hợp 6–11
tuổi
Nguồn
Wordwall
Match Up
Kéo thả nối cặp thẻ
Phân loại, liên kết
khái niệm
Có (ít chữ)
Rất hợp
[XÁC NHẬN]
wordwall.net
Wordwall
Whack-a-mole
Chạm đập nhanh
đối tượng đúng
Phản xạ nhận thức,
tập trung
Rất hợp
(vui nhộn)
Rất hợp
[XÁC NHẬN]
content.wordwall.net
Wordwall
Airplane
Điều khiển phi cơ
bay vào mây
Phản xạ, định
hướng không gian
Không (khó
lái)
Rất hợp
[XÁC NHẬN]
wordwall.net
H5P
Drag and Drop
Kéo thả vật thể vào
vùng đích
Vận động tinh, tư
duy vị trí
Có (nếu
dùng ảnh)
Rất hợp
[XÁC NHẬN]
h5p.org
H5P
Memory Game
Chạm lật 2 thẻ bài
tìm cặp
Ghi nhớ thị giác
ngắn hạn
Rất hợp
Hợp
[XÁC NHẬN]
h5p.org
H5P
Interactive Video
Xem video, trả lời
câu hỏi chặn
Tập trung, tự kiểm
tra kiến thức
Không (quá
dài)
Rất hợp
[XÁC NHẬN]
help.h5p.com
Educaplay
Froggy Jumps
Chạm lá sen đúng
để ếch nhảy
Phản xạ, liên tưởng
trắc nghiệm
Rất hợp
(hoạt họa)
Rất hợp
[XÁC NHẬN]
educaplay.com
Educaplay
Columns Matching
Chạm nối đối tượng
2 cột
Ghép cặp từ vựng -
hình ảnh
Hợp (nếu
có ảnh)
Rất hợp
[XÁC NHẬN]
educaplay.com
Educandy
Match-up
Kéo nối các viên
kẹo chữ/ảnh
Nhận diện từ vựng,
quan sát
Rất hợp
(bánh kẹo)
Rất hợp
[XÁC NHẬN]
edtechpicks.org
Educandy
Noughts & Crosses
Đánh cờ ca-rô trả lời
câu hỏi
Tư duy chiến thuật,
trí nhớ
Không
(chưa thạo
cờ)
Rất hợp
[XÁC NHẬN]
blog.tcea.org
LearningApps
Matching Pairs
Kéo dán mẩu giấy
ghi chú
Ghi nhớ, ghép nối
tương đương
Hợp (nếu
dùng ảnh)
Rất hợp
[XÁC NHẬN]
learningapps.org
LearningApps
Group Assignment
Kéo thẻ vào 2-4
nhóm phân loại
Tư duy phân loại
logic
Hợp (dùng
hình ảnh)
Rất hợp
[XÁC NHẬN]
learningapps.org
BookWidgets
Jigsaw Puzzle
Kéo xoay các mảnh
ghép tranh
Tư duy không gian,
hình học
Rất hợp
Hợp
[XÁC NHẬN]
bookwidgets.com
BookWidgets
Spot the Difference
Chạm điểm khác
nhau trên 2 ảnh
Quan sát tỉ mỉ, tập
trung thị giác
Rất hợp
Rất hợp
[XÁC NHẬN]
teachers-blog.com
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 11 / 13



## Trang 12

Bảng C2 – So sánh năng lực kiến trúc và hỗ trợ AI
Nền tảng
Tách nội
dung
Định dạng
dữ liệu
Công nghệ
hiển thị
AI làm được
bước nào
AI
phụ/lõi
Tiếng Việt
Giá gói trả
phí
Tài
khoản
HS
Nguồn
Wordwall
Có (Switch
Template)
Proprietary
JSON Cloud
HTML5
Canvas +
WebGL
Sinh câu hỏi/
đáp án từ
text/pdf
Phụ
(Add-
on)
Khá (Dịch
máy,
không
TTS)
7.20 – 10.80
USD/tháng
Không
cần
[XÁC
NHẬ
N]
wordw
all.net
H5P
Có
(content.js
on độc
lập)
Gói ZIP
chuẩn (.h5p,
JSON)
HTML5
DOM +
Canvas/SV
G
Smart Import
bóc tách
PDF/Video
Phụ
(SaaS)
Giao diện
dịch,
không TTS
Từ 19
USD/tháng
(Free tự host)
Không
cần
(Link)
[XÁC
NHẬ
N]
h5p.or
g
Educaplay
Có một
phần
JSON Cloud,
SCORM
export
HTML5
Canvas 2D +
DOM
Ray AI sinh câu
hỏi từ Prompt
Phụ
(Add-
on)
Khá (Có
TTS cơ
bản)
4.75 – 9.50
USD/tháng
Không
cần
[XÁC
NHẬ
N]
educa
play.co
m
Educandy
Có (1 List
→ 8
games)
Key-Value
Word Pairs
HTML5
WebGL /
Unity Web
Không có AI
Không
có
Kém (Lỗi
phông chữ
có dấu)
2.99
USD/tháng
(~24$/năm)
Không
cần
[XÁC
NHẬ
N]
blog.tc
ea.org
LearningA
pps
Có (Cấu
hình riêng)
Internal
JSON/XML
Schema
HTML5
DOM
(jQuery UI)
Không có AI
Không
có
Khá (Có
TTS đọc
cơ bản)
Miễn phí
100%
Không
cần
[XÁC
NHẬ
N]
learnin
gapps.
org
BookWidg
ets
Có một
phần
JSON
Widget
Schema, LTI
HTML5
Canvas 2D +
CSS3
AI Assist sinh
câu hỏi Widget
Phụ
(Copilot
)
Khá
(Không
TTS tự
sinh)
65.00 – 75.00
USD/năm
Không
bắt
buộc
[XÁC
NHẬ
N]
bookw
idgets.
com
Bảng C3 – Khả năng đáp ứng yêu cầu sư phạm ngoài mẫu
Nền tảng
Mô tả a (Đĩa cân thăng
bằng)
Mô tả b (Tô nét chữ cái)
Mô tả c (Nghe đọc kéo táo
vào giỏ)
Mô tả d (Ghép từ con vật vũ
trụ)
Wordwall
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Thiếu
chuyển động rơi)
LÀM ĐƯỢC (Đổi Theme sang
Space)
H5P
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Dùng
Drag&Drop, thiếu TTS AI)
LÀM GẦN ĐÚNG (Thay
background vũ trụ tĩnh)
Educaplay
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Dùng
Matching/Dictation)
KHÔNG LÀM ĐƯỢC (Cố định
đầm lầy Froggy)
Educandy
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC (Không có
custom audio thẻ)
KHÔNG LÀM ĐƯỢC (Cố định
phong cách kẹo ngọt)
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 12 / 13



## Trang 13

Nền tảng
Mô tả a (Đĩa cân thăng
bằng)
Mô tả b (Tô nét chữ cái)
Mô tả c (Nghe đọc kéo táo
vào giỏ)
Mô tả d (Ghép từ con vật vũ
trụ)
LearningApps
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Dùng
Grouping, thiếu hoạt họa)
KHÔNG LÀM ĐƯỢC (Cố định
bảng ghim corkboard)
BookWidgets
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Dùng
Worksheet kéo thả)
LÀM GẦN ĐÚNG (Tự tải ảnh
nền trạm vũ trụ)
Ghi chú: Toàn bộ 06 nền tảng đều bất lực trước các mô phỏng vật lý mở (đĩa cân) và nhận diện nét vẽ (tô chữ), chứng minh sự cần thiết
của Game Engine 2D chuyên biệt trong đề tài khóa luận.
PHẦN D – DANH SÁCH ĐIỂM CẦN TỰ ĐĂNG NHẬP KIỂM TRA THỰC NGHIỆM [CẦN TỰ THỬ]
Để đảm bảo độ tin cậy tuyệt đối cho báo cáo bảo vệ trước hội đồng phản biện, dưới đây là các phép kiểm tra thực chứng
cần trực tiếp đăng nhập tài khoản thực hiện và chụp ảnh màn hình lưu vết:
1. Kiểm tra hiển thị phông chữ tiếng Việt có dấu trên Educandy:
• Hành động: Đăng nhập tài khoản Educandy miễn phí, tạo 1 danh sách từ ghép có đầy đủ dấu tiếng Việt phức tạp: "con
bướm", "quả sầu riêng", "chú hươu cao cổ".
• Bằng chứng cần chụp: Ảnh chụp màn hình minigame Anagrams và Noughts & Crosses xem các chữ cái có dấu bị vỡ
phông, mất dấu hay nhảy dòng hay không.
2. Kiểm tra giới hạn hạn ngạch (Quota) tạo game trên Wordwall tài khoản Free:
• Hành động: Tạo liên tiếp 5 trò chơi trên tài khoản Wordwall mới; sau đó bấm tạo trò chơi thứ 6.
• Bằng chứng cần chụp: Hộp thoại thông báo giới hạn "You have used 5 of your 5 activities" và nút chặn bắt nâng cấp gói
Pro.
3. Đo độ trễ phản hồi và chất lượng sinh câu hỏi tiếng Việt của Educaplay Ray AI:
• Hành động: Nhập prompt tiếng Việt: "Tạo trò chơi ghép cặp từ vựng đồ dùng học tập lớp 1" vào Educaplay Ray.
• Bằng chứng cần chụp: Bấm giờ từ lúc gửi prompt đến khi ra kết quả; chụp màn hình các câu hỏi sinh ra để đánh giá mức
độ thuần Việt hay bị dịch máy ngô nghê.
4. Kiểm tra giọng đọc Text-to-Speech tiếng Việt trên LearningApps.org:
• Hành động: Tạo 1 bài tập Matching Pairs, chọn thuộc tính phát âm văn bản tự động (Speech synthesizer) cho thẻ chữ
tiếng Việt.
• Bằng chứng cần chụp: Video/Ảnh chụp màn hình cấu hình TTS và ghi chú chất lượng phát âm (giọng máy có tự nhiên
không, có bị ngắt quãng dấu câu không).
5. Thử nghiệm tính năng tạo câu hỏi AI Assist trên BookWidgets (bản Trial 60 ngày):
• Hành động: Kích hoạt bản dùng thử 60 ngày của BookWidgets, chọn widget "Pair Matching", kích hoạt AI Assist với
prompt toán lớp 1.
• Bằng chứng cần chụp: Giao diện gợi ý của AI Assist, các trường dữ liệu được AI điền tự động và các bước mà giáo viên
vẫn phải làm tay để hoàn thiện bài học.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 1
Trang 13 / 13
