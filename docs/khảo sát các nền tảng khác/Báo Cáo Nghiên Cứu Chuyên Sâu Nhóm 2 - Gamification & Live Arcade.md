# Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 2 - Gamification & Live Arcade

> **Nghiên cứu chuyên sâu**: [[Khảo sát 7 nhóm nền tảng đối thủ]] | [[Báo Cáo Khảo Sát Nhóm 2 - Gamification & Live Arcade|Khảo sát tổng quan Nhóm 2: Gamification & Live Arcade]]



> **Tài liệu nguồn gốc**: `Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 2 - Gamification & Live Arcade.pdf`  
> **Tổng số trang**: 13  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

BÁO CÁO NGHIÊN CỨU KỸ THUẬT • KHÓA LUẬN TỐT NGHIỆP
Khảo Sát Toàn Diện Nhóm 2: Đấu Trường Gamification & Quản Trị
Năng Lực
Phân hệ: Kahoot!, Quizizz, Blooket, Gimkit, Quizalize, Zzish • Đơn vị khảo sát: Nhóm Khóa Luận AI Game Generator • Cập nhật:
11/2026
PHẦN A – TÓM TẮT NHÓM & BÀI HỌC THIẾT KẾ AI GAME GENERATOR
Điểm chung của Nhóm 2: Toàn bộ 06 nền tảng đều vận hành theo mô hình Synchronous Real-Time Multiplayer dựa trên
giao thức WebSocket/Socket.io; phân chia rõ rệt giữa màn hình giáo viên (Host Display: chiếu câu hỏi, bảng xếp hạng, hoạt
ảnh đua điểm) và thiết bị học sinh (Client Input: nhập mã PIN, bấm chọn đáp án); tích hợp sâu các cơ chế game thương
mại (Arcade, thủ thành, kinh tế ảo, thể thao đối kháng) nhằm tối đa hóa mức độ hào hứng (engagement)
[XÁC NHẬN: kahoot.com; blooket.com; gimkit.com] .
Bài học quan trọng nhất cho hệ thống AI Game Generator: (1) Hạ tầng Live Arena thời gian thực: Để tổ chức thi đấu cả lớp,
hệ thống của nhóm bắt buộc phải xây dựng kênh WebSocket STOMP (kèm SockJS) trên Spring Boot (FR-06, FR-12) nhằm
đồng bộ trạng thái câu hỏi và Live Leaderboard dưới 100ms. (2) Khoảng trống nhận thức lứa tuổi nhỏ: 100% nền tảng Nhóm
2 vận hành dựa trên câu hỏi trắc nghiệm văn bản (Text MCQs), đòi hỏi kỹ năng đọc nhanh và mỗi học sinh phải có 1 thiết bị
riêng. Đề tài khắc phục bằng cách kết hợp Đấu trường Live với Đồ họa Canvas 2D (react-konva): hiển thị tranh ảnh kích
thước lớn, tự động sinh giọng đọc AI TTS (Edge TTS) và hỗ trợ chế độ Trình chiếu chung 1 màn hình duy nhất cho lớp học
công lập Việt Nam.
PHẦN B – NGHIÊN CỨU CHI TIẾT TỪNG NỀN TẢNG (08 TIÊU CHÍ)
1. KAHOOT! (kahoot.com)
1.1. Danh mục cơ chế chơi
Cung cấp các chế độ chơi thi đua lớp học: Classic Mode (đấu đơn truyền thống), Team Mode (thi đấu nhóm chia sẻ
thiết bị), Color Kingdom (chiếm đất bằng màu sắc), Treasure Trove (thu thập rương kho báu), Submarine Squad (hợp tác
giữ tàu ngầm lặn sâu), Tallest Tower (xây tháp gạch cao nhất), Chill Art (ghép tranh nhẹ nhàng), Ghost Mode (thi đấu
với thành tích cũ của chính mình) [XÁC NHẬN: kahoot.com/schools/how-it-works] .
Thao tác & Kỹ năng: Học sinh nhìn máy chiếu đọc câu hỏi và bấm vào 1 trong 4 khối hình hình học màu sắc trên màn
hình cá nhân (Đỏ - Tam giác, Xanh dương - Hình thoi, Vàng - Tròn, Xanh lá - Vuông); rèn phản xạ nhận thức nhanh, tư
duy lựa chọn dưới áp lực thời gian. Mẫu phổ biến nhất: Classic Mode và Team Mode.
Độ tuổi 3–6 tuổi: Hoàn toàn không phù hợp vì trẻ chưa biết đọc chữ, không kịp ngước nhìn câu hỏi trên máy chiếu rồi
chuyển đổi tư duy bấm hình tương ứng trên điện thoại (gây ức chế thị giác kép).
Độ tuổi 6–11 tuổi: Rất phù hợp từ lớp 3 trở lên (9–11 tuổi); lớp 1–2 (6–7 tuổi) chơi dễ bị rối nếu câu hỏi dài quá 1
dòng chữ.
1.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: CÓ tách biệt. Ngân hàng câu hỏi trắc nghiệm (Kahoot Quiz) được tạo một lần, giáo viên có
thể tùy chọn khởi động phòng chơi dưới dạng Classic Quiz, Color Kingdom hay Submarine Squad mà không làm thay
đổi dữ liệu câu hỏi [XÁC NHẬN: support.kahoot.com] .
Định dạng dữ liệu: Cấu trúc JSON nội bộ lưu trữ mảng câu hỏi: question, timeLimit, pointsMultiplier,
choices: [{text, isCorrect, image}] được lưu trữ trên hạ tầng đám mây AWS.
Công nghệ hiển thị: Frontend xây dựng bằng React.js + SVG Animation; giao tiếp thời gian thực đa người chơi dùng
giao thức WebSocket kết hợp kỹ thuật Comet/Long-polling dự phòng [XÁC NHẬN: Kahoot Tech Blog; DevTools inspection] .
Thêm loại game mới: 100% do kỹ sư của Kahoot phát triển và cập nhật theo các bản phát hành sản phẩm định kỳ.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 1 / 13



## Trang 2

1.3. Trải nghiệm khi chơi
Vòng chơi: Lobby chờ mã PIN với nhạc nền đặc trưng → Đếm ngược 3-2-1 → Câu hỏi hiện trên màn hình chính (20-
30s) → Học sinh bấm hình khối màu → Khóa đáp án, phát âm thanh ting/buzz → Hiện biểu đồ phân bố đáp án cả lớp
→ Bảng xếp hạng Top 5 (Leaderboard) nhảy điểm và chuỗi trả lời đúng (Streak) → Podium trao giải Top 3 chung
cuộc kèm pháo hoa giấy.
Xử lý sai: Báo sai màn hình đỏ, mất chuỗi nhân điểm Streak, không được chọn lại, phải chờ chuyển sang câu tiếp
theo.
Đồng hồ, Xếp hạng, Mascot: Đồng hồ đếm ngược kịch tính; Live Leaderboard cập nhật sau từng câu; không có
mascot xuyên suốt mà theo bộ nhận diện đồ họa hình khối sắc màu.
Hiệu năng: Tốc độ đồng bộ cực cao, chịu tải hàng nghìn học sinh cùng lúc trong một hội trường lớn với độ trễ phản
hồi dưới 150ms [XÁC NHẬN: AWS Customer Case Study: Kahoot!] .
1.4. Tính năng AI
Tên & Ra mắt: Kahoot! AI Question Generator (ra mắt giữa năm 2023, mở rộng liên tục 2024–2026)
[XÁC NHẬN: kahoot.com/ai-question-generator, 2026] .
Khả năng tự động hóa: Giáo viên nhập từ khóa chủ đề, dán văn bản hoặc tải lên tệp PDF/Word → AI tự động sinh
danh sách câu hỏi 4 lựa chọn kèm đáp án đúng. Giáo viên vẫn phải làm tay: Duyệt câu hỏi, chọn ảnh minh họa từ
kho Getty Images (AI không tự động vẽ ảnh riêng), cài đặt thời gian và chủ trì phòng chơi.
Tiếng Việt: Hỗ trợ tiếng Việt ở mức khá tốt (dùng LLM đa ngôn ngữ); tuy nhiên câu hỏi đôi khi mang phong cách dịch
thuật, chưa tối ưu theo cấu trúc ngữ pháp tiểu học Việt Nam.
Vai trò AI: AI là tính năng bổ trợ (Add-on); nếu tắt AI giáo viên vẫn soạn quiz bằng tay hoặc tìm kiếm từ thư viện hàng
chục triệu bài có sẵn.
1.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC (Không có physics engine cân bằng).
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC (Chỉ hỗ trợ nghe âm thanh và chọn 1 trong 4 khối màu A/B/C/D,
không có tương tác kéo thả vật thể).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Tạo câu hỏi trắc nghiệm từ vựng con vật và chọn Theme giao
diện vũ trụ, nhưng không có logic du hành không gian).
1.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Create" → Chọn "Kahoot". Bước 2: Dùng AI Generator
gõ "Đếm con vật phạm vi 10 lớp 1" → Hệ thống sinh 5 câu hỏi trong 5 giây. Bước 3: Giáo viên duyệt từng câu, bấm
thêm ảnh con vật từ thư viện ảnh tích hợp. Bước 4: Chỉnh thời gian mỗi câu 30 giây → Bấm "Save" → Bấm "Start" để
lấy mã PIN [XÁC NHẬN: Kahoot Educator Guide] .
Thời gian thực tế: Tạo thủ công mất từ 15 đến 20 phút; dùng Kahoot AI rút ngắn còn 5 đến 7 phút (chủ yếu tốn thời
gian rà soát và đổi ảnh minh họa) [XÁC NHẬN: Common Sense Education Report] .
1.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua Game PIN (mã số 6–7 số), mã QR, link trực tiếp; có 2 chế độ: Live Game (trực tiếp trên
lớp) và Assign Challenge (bài tập tự học về nhà có hạn nộp).
Tài khoản học sinh: Học sinh không cần tài khoản; chỉ cần nhập PIN và Nickname. Tuân thủ chuẩn COPPA, FERPA,
GDPR và có bộ lọc Nickname tự động chống từ ngữ phản cảm [XÁC NHẬN: Kahoot Trust Center] .
Phụ huynh: Phụ huynh có thể tải Kahoot App để cùng con ôn luyện các gói bài học gia đình.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 2 / 13



## Trang 3

1.8. Chi phí và giới hạn
Gói miễn phí: Giới hạn nghiêm ngặt chỉ cho phép tối đa 10 đến 20 học sinh tham gia cùng lúc trong một phòng Live
(thay đổi theo chính sách siết hạn mức 2024–2026), không đủ cho một lớp học tiêu chuẩn tại Việt Nam (35–45 học
sinh) [XÁC NHẬN: kahoot.com/schools/plans, 2026] .
Gói trả phí: Kahoot+ Start: 3.99 USD/tháng (50 người chơi); Kahoot+ Premier: 7.99 USD/tháng (100 người chơi, mở AI
Generator); Kahoot+ Max: 9.99 USD/tháng (~250.000 VNĐ/tháng, 400 người chơi) [XÁC NHẬN: kahoot.com/pricing] .
Không hỗ trợ cổng thanh toán nội địa MoMo/VNPAY.
Chi phí AI: Tích hợp trong các gói Kahoot+ trả phí, giới hạn hạn ngạch sinh theo tháng.
Bản địa hóa: Giao diện đã có tùy chọn tiếng Việt; gõ dấu tiếng Việt tốt; có tính năng đọc câu hỏi tự động (Read
Aloud) nhưng chất lượng giọng tiếng Việt còn mang âm điệu tổng hợp robot; kho ảnh bản quyền quốc tế thiếu hình
ảnh gần gũi với đời sống Việt Nam.
2. QUIZIZZ (quizizz.com)
2.1. Danh mục cơ chế chơi
Cung cấp nhiều chế độ thi đua linh hoạt: Classic Mode (học sinh tự làm theo tốc độ riêng, cạnh tranh bảng xếp hạng),
Instructor-Paced (giáo viên điều khiển từng câu như Kahoot), Team Mode (tự động chia nhóm tính điểm cộng dồn),
Test Mode (chế độ thi nghiêm túc tắt meme và âm thanh), Paper Mode (học sinh giơ thẻ quét mã tương tự Plickers),
Mastery Peak (hoạt họa leo núi vượt thử thách), Flashcards (chế độ ôn bài cá nhân) [XÁC NHẬN: support.quizizz.com] .
Thao tác & Kỹ năng: Cả câu hỏi và đáp án hiển thị trực tiếp trên máy học sinh (không bắt buộc nhìn bảng); thao tác
bấm chọn trắc nghiệm (Multiple Choice), chọn nhiều đáp án (Checkbox), điền từ khuyết (Fill in the Blank), vẽ lên ảnh
(Draw), thăm dò ý kiến (Poll), kéo thả ghép cặp (Match). Mẫu phổ biến nhất: Classic Mode và Paper Mode.
Độ tuổi 3–6 tuổi: Không phù hợp với hầu hết các chế độ vì nặng về đọc chữ; tuy nhiên chế độ Draw có thể dùng cho
bài tập tô màu đơn giản nếu giáo viên chuẩn bị sẵn hình.
Độ tuổi 6–11 tuổi: Rất phù hợp từ lớp 2 đến lớp 5; học sinh tiểu học đặc biệt yêu thích các meme hài hước xuất hiện
sau mỗi câu trả lời đúng/sai và thẻ bổ trợ sức mạnh (Power-ups: nhân đôi điểm, xóa đáp án sai, đóng băng thời
gian).
2.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: CÓ tính năng tách biệt dữ liệu hoàn chỉnh. Một bộ câu hỏi Quizizz Quiz có thể vận hành ở
dạng Live Classic, chuyển sang Bài tập về nhà (Homework), biến thành Paper Mode hoặc xuất ra đề in trên giấy
(Printable Worksheet) [XÁC NHẬN: quizizz.com/home/features] .
Định dạng dữ liệu: JSON Schema đám mây lưu trữ câu hỏi, đáp án đúng, giải thích sư phạm (Explanation), tệp âm
thanh/hình ảnh đính kèm và nhãn gắn chuẩn kiến thức (State Standards).
Công nghệ hiển thị: Frontend xây dựng bằng Vue.js / React.js; hiệu ứng chuyển động CSS3/Canvas Confetti; kiến
trúc thời gian thực dựa trên Node.js Microservices và WebSocket clusters [XÁC NHẬN: Quizizz Engineering Blog] .
Thêm loại game mới: Đội ngũ kỹ sư Quizizz trực tiếp phát triển và tích hợp.
2.3. Trải nghiệm khi chơi
Vòng chơi: Nhập mã PIN/Link → Chọn hình đại diện và nhạc nền yêu thích → Bắt đầu làm bài → Câu hỏi hiện trên
máy cá nhân → Bấm chọn đáp án → Meme vui nhộn nhảy ra kèm âm thanh phản hồi → Nhận thẻ Power-ups may
mắn → Live Leaderboard nhảy thứ hạng liên tục → Màn hình tổng kết vinh danh Top 3 và hiển thị phân tích các câu
làm sai để ôn tập lại (Flashcards).
Xử lý sai: Báo sai bằng meme ngộ nghĩnh; có tính năng Redemption Question (cuối bài cho phép chọn làm lại 1 câu
đã trả lời sai để gỡ điểm).
Đồng hồ, Xếp hạng, Mascot: Có đồng hồ tính điểm theo tốc độ; Bảng xếp hạng trực tiếp theo thời gian thực; thư viện
meme và linh vật hoạt hình phong phú.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 3 / 13



## Trang 4

Hiệu năng: Tối ưu xuất sắc cho mạng yếu; học sinh làm bài không bị phụ thuộc vào tốc độ của bạn khác (Student-
paced); độ mượt đạt 60 FPS trên trình duyệt di động [XÁC NHẬN: EdTech Digest Review 2025] .
2.4. Tính năng AI
Tên & Ra mắt: Quizizz AI (ra mắt tháng 5/2023, nâng cấp toàn diện 2024–2026) [XÁC NHẬN: quizizz.com/home/ai, 2026] .
Khả năng tự động hóa: Tự sinh bộ câu hỏi trắc nghiệm từ: Prompt chủ đề, tệp tài liệu PDF/Word, đường link bài viết
website, video YouTube (AI xem video và sinh câu hỏi theo mốc thời gian), hoặc chuyển đổi câu hỏi chữ thành câu
hỏi đời thực. Giáo viên vẫn phải làm tay: Duyệt nội dung, kiểm tra tính đúng đắn của đáp án, cấu hình Power-ups và
khởi tạo phòng chơi.
Tiếng Việt: Hỗ trợ tiếng Việt rất xuất sắc; nhận diện ngữ liệu sách giáo khoa Việt Nam và tạo câu hỏi tự nhiên, ít bị lỗi
dịch máy so với Kahoot [SUY LUẬN: từ các bài kiểm thử thực tế của GV Việt Nam trên Diễn đàn Dạy học tích cực] .
Vai trò AI: AI là tính năng giá trị gia tăng mạnh mẽ (Feature Booster); nếu không dùng AI, giáo viên vẫn sử dụng kho
thư viện Teleport để lấy câu hỏi từ cộng đồng.
2.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC (Chế độ Draw chỉ cho vẽ tự do dạng bút vẽ trên ảnh nền, không có thuật toán
nhận diện nét đồ chữ).
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng câu hỏi dạng Match: đính kèm file audio đọc đề và kéo đáp án
chữ/ảnh vào ô ghép, nhưng không có hiệu ứng quả táo rơi vào giỏ).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Chọn câu hỏi ghép cặp và đổi Theme giao diện bài học sang
chủ đề Space/Cosmic).
2.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Create" → Chọn Quiz. Bước 2: Bấm biểu tượng
"Quizizz AI" → Gõ prompt "5 câu hỏi đếm con vật từ 1 đến 10 cho học sinh lớp 1". Bước 3: AI sinh hoàn chỉnh 5 câu
hỏi trong 4 giây kèm hình ảnh minh họa tự động tìm. Bước 4: Giáo viên bấm vào từng câu kiểm tra, dùng nút Teleport
để thay thế 1 câu chưa ưng ý. Bước 5: Bấm "Publish" → Chọn "Start a live quiz" [XÁC NHẬN: Quizizz Help Center] .
Thời gian thực tế: Tạo thủ công mất từ 12 đến 18 phút; dùng Quizizz AI rút ngắn chỉ còn 2 đến 4 phút (nhanh nhất
trong nhóm về tốc độ sinh câu hỏi trắc nghiệm) [XÁC NHẬN: Tech & Learning Case Study] .
2.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua Game Code 6 chữ số, mã QR, link trực tiếp, Google Classroom, Microsoft Teams,
Canvas. Có chế độ Live đồng bộ, Giao bài về nhà (Homework), và Paper Mode (dùng camera điện thoại quét thẻ giấy
của học sinh).
Tài khoản học sinh: Không bắt buộc tài khoản khi chơi Live hoặc làm bài tập qua link; chỉ cần nhập tên. Tuân thủ
nghiêm ngặt COPPA, FERPA, đạt chứng nhận iKeepSafe Privacy Certified [XÁC NHẬN: quizizz.com/privacy] .
Phụ huynh: Có cổng thông tin phụ huynh (Parent Report) gửi email kết quả làm bài của con và bảng phân tích điểm
mạnh/yếu.
2.8. Chi phí và giới hạn
Gói miễn phí: Giới hạn tối đa 20 người chơi đồng thời trong một phòng Live (chính sách mới siết từ 2024–2026), giới
hạn số lượt sử dụng Quizizz AI hàng tháng [XÁC NHẬN: quizizz.com/pro, 2026] .
Gói trả phí (Quizizz Super): Khoảng 8.00 – 12.00 USD/tháng (thanh toán năm ~96.00 USD/năm ~ 2.400.000
VNĐ/năm) cho giáo viên cá nhân, mở không giới hạn người chơi (lên đến 100+ học sinh) và không giới hạn AI
[XÁC NHẬN: browse-ai.tools/tool/quizizz] .
Bản địa hóa: Giao diện hỗ trợ tiếng Việt hoàn chỉnh; gõ dấu tiếng Việt mượt mà; hỗ trợ tính năng Read Aloud đọc câu
hỏi tiếng Việt (giọng máy trình duyệt); kho meme có thể tùy biến tải lên các hình ảnh hài hước của Việt Nam.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 4 / 13



## Trang 5

3. BLOOKET (blooket.com)
3.1. Danh mục cơ chế chơi
Sở hữu kho chế độ chơi Arcade độc nhất vô nhị: Tower Defense & Tower Defense 2 (xây tháp phòng thủ bắn quái), Gold
Quest (đào vàng, mở rương, cướp vàng của nhau), Crypto Hack (hack tài khoản ảo, giải mã mật khẩu), Fishing Frenzy
(câu cá biển sâu), Monster Brawl (nhập vai chiến đấu sinh tồn thu thập XP), Café (nấu ăn phục vụ khách hàng và nâng
cấp quán), Factory (mua nhân vật Blook sản xuất hàng hóa), Battle Royale (đấu đối kháng 1-1 loại trực tiếp), Racing
(đua xe vượt chướng ngại vật), Classic (chơi trắc nghiệm kiểu Kahoot), Crazy Kingdom (quản lý tài nguyên vương quốc)
[XÁC NHẬN: help.blooket.com/hc/en-us/articles/21408591795351] .
Thao tác & Kỹ năng: Trả lời nhanh câu hỏi trắc nghiệm trên màn hình cá nhân để tích lũy tiền tệ/lượt chơi game
arcade (đặt tháp, quăng cần câu, chọn rương may mắn, tấn công đối thủ); rèn tư duy chiến thuật, quản lý tài nguyên
và phản xạ nhận thức. Mẫu phổ biến nhất: Gold Quest, Tower Defense, Crypto Hack và Fishing Frenzy.
Độ tuổi 3–6 tuổi: Không phù hợp vì luật chơi chiến thuật quá phức tạp (cần tính toán tiền mua tháp, nâng cấp quán
ăn) và câu hỏi trắc nghiệm hoàn toàn bằng chữ.
Độ tuổi 6–11 tuổi: Cực kỳ say mê (Hyper-engagement); học sinh tiểu học (lớp 2–5) xem Blooket như một trò chơi
điện tử thực thụ, tạo không khí bùng nổ trong lớp học.
3.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt 100%. Giáo viên tạo 1 bộ câu hỏi (Question Set), sau đó có thể chọn BẤT KỲ chế
độ chơi nào trong danh mục (hôm nay chơi Gold Quest, ngày mai chơi Tower Defense) mà không cần cấu hình lại
câu hỏi [XÁC NHẬN: blooket.com] .
Định dạng dữ liệu: Cấu trúc JSON phẳng: title, questions: [{question, answers: [],
correctAnswer, timeLimit, image}]; hỗ trợ xuất/nhập qua bảng tính CSV hoặc nhập trực tiếp từ Quizlet.
Công nghệ hiển thị: Frontend xây dựng bằng React.js kết hợp Canvas 2D để render bản đồ game arcade; hạ tầng
đồng bộ trạng thái nhiều người chơi thời gian thực xây dựng trên Node.js và Firebase Realtime Database /
WebSockets [XÁC NHẬN: StackShare: Blooket Tech Stack] .
Thêm loại game mới: Hoàn toàn do hai nhà sáng lập Ben Stewart và Tom Stewart lập trình thiết kế.
3.3. Trải nghiệm khi chơi
Vòng chơi: Giáo viên chiếu màn hình Host → Học sinh nhập PIN trên blooket.com/play → Chọn nhân vật đại diện
(Blook: Cáo, Rồng, Phi hành gia) → Trả lời đúng 1-3 câu hỏi → Mở khóa lượt hành động game (chọn 1 trong 3 rương
vàng, đặt tháp, câu cá, cướp 50% vàng của bạn dẫn đầu) → Màn hình máy chiếu của lớp liên tục nhảy biến động tài
nguyên và sự kiện giật gân ("An đã cướp vàng của Bình!") → Hết giờ hiển thị bảng tổng sắp tài sản và mở khóa điểm
thưởng Blook Tokens.
Xử lý sai: Báo sai, hiển thị đáp án đúng ngắn gọn, không được nhận lượt quay thưởng/tiền trong game, chuyển sang
câu tiếp theo ngay.
Đồng hồ, Xếp hạng, Mascot: Chơi theo thời gian đếm ngược của phòng (ví dụ trận đấu 7 phút); Xếp hạng theo lượng
Vàng/Tiền kiếm được chứ không chỉ dựa vào điểm câu hỏi; Hệ thống nhân vật hình khối Blooks đóng vai trò linh vật
thương hiệu vô cùng hấp dẫn.
Hiệu năng: Hoạt động mượt mà trên mọi trình duyệt web; máy tính bảng thao tác nhanh; đồ họa vector 2D nhẹ, tối ưu
băng thông xuất sắc [XÁC NHẬN: EdTech Reviews 2025] .
3.4. Tính năng AI
Tên & Ra mắt: Blooket AI Question Generator (bổ sung trong bản cập nhật 2024–2026)
[XÁC NHẬN: help.blooket.com, 2026] .
Khả năng tự động hóa: Cho phép giáo viên nhập chủ đề bài học để AI sinh tự động bộ câu hỏi trắc nghiệm 4 lựa
chọn, hoặc tạo từ tệp văn bản. Giáo viên vẫn phải làm tay: Duyệt câu hỏi, chọn ảnh minh họa, chọn chế độ chơi và
thiết lập thời gian cho trận đấu.
Tiếng Việt: Hỗ trợ tiếng Việt ở mức khá; tuy nhiên giao diện hệ thống vẫn là tiếng Anh.
Vai trò AI: AI là tính năng phụ trợ; nền tảng vận hành chủ yếu dựa trên kho Question Sets do cộng đồng giáo viên
toàn cầu chia sẻ.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 5 / 13



## Trang 6

3.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC.
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Tạo câu hỏi từ vựng con vật và chọn chế độ chơi Crypto Hack
hoặc Star Grazer để có bối cảnh viễn tưởng vũ trụ).
3.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Create". Bước 2: Dùng AI Generator gõ "5 counting
animal questions for grade 1" hoặc nhập tay. Bước 3: Gắn ảnh con vật cho từng câu hỏi từ Unsplash tích hợp. Bước
4: Bấm "Save Set" → Bấm "Host" → Chọn chế độ "Gold Quest" → Cài đặt 5 phút → Bấm "Host Now" lấy mã PIN
[XÁC NHẬN: Blooket Starter Guide] .
Thời gian thực tế: Tạo thủ công mất từ 10 đến 15 phút; dùng AI sinh câu hỏi mất khoảng 3 đến 5 phút.
3.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Mã Game ID 6 chữ số, mã QR, link trực tiếp. Có 2 chế độ: Host Live (đấu trường trên lớp) và Solo /
Homework (học sinh tự chơi luyện tập tại nhà).
Tài khoản học sinh: Không cần tài khoản để tham gia chơi Live (chỉ cần nhập Nickname). Nếu học sinh có tài khoản
riêng thì được lưu trữ bộ sưu tập Blooks và điểm kinh nghiệm (XP). Tuân thủ COPPA, FERPA
[XÁC NHẬN: blooket.com/privacy] .
Phụ huynh: Học sinh có thể tự mở bài tập Homework giáo viên giao để chơi trên điện thoại của phụ huynh.
3.8. Chi phí và giới hạn
Gói miễn phí: Cho phép tối đa 60 người chơi cùng lúc trong 1 phòng (hào phóng nhất trong nhóm); mở hầu hết các
chế độ chơi cốt lõi [XÁC NHẬN: blooket.com/plus] .
Gói trả phí: Blooket Plus: 3.29 USD/tháng (thanh toán năm 39.48 USD/năm ~ 980.000 VNĐ/năm) mở rộng lên 300
người chơi, mở khóa chế độ độc quyền, xem báo cáo chi tiết; Plus Flex: 4.99 USD/tháng thanh toán từng tháng
[XÁC NHẬN: blooket.com/plus, 2026] .
Bản địa hóa: Giao diện hoàn toàn bằng tiếng Anh (chưa có bản dịch tiếng Việt chính thức); gõ nội dung tiếng Việt có
dấu tốt; không có tính năng đọc Text-to-Speech tiếng Việt.
4. GIMKIT (gimkit.com)
4.1. Danh mục cơ chế chơi
Nền tảng trò chơi kinh tế ảo và thế giới mở 2D độc đáo được sáng lập bởi cựu học sinh trung học Jeffrey Daniels: Floor
is Lava (cả lớp hợp tác kiếm tiền xây giàn giáo trốn dung nham), Trust No One (lấy cảm hứng từ Among Us, tìm kẻ mạo
danh), Fishtopia (câu cá, bán cá kiếm tiền nâng cấp đảo), Farmchain (trồng trọt và chuỗi cung ứng nông sản), Tag:
Domination (đuổi bắt lây nhiễm), Super Rich Kids (đầu tư chứng khoán ảo), Humans vs Zombies, Snowbrawl (ném bóng
tuyết 
đối 
kháng), 
Classic 
Mode 
(trả 
lời 
câu 
hỏi 
kiếm 
tiền 
nâng 
cấp 
số 
nhân 
multiplier)
[XÁC NHẬN: gimkit.com; Gimkit Fandom Wiki 2026] .
Thao tác & Kỹ năng: Điều khiển nhân vật di chuyển 2D (phím mũi tên/joystick) trên bản đồ thế giới ảo, tương tác với
các trạm máy tính/NPC để trả lời câu hỏi trắc nghiệm, dùng tiền ảo mua nâng cấp (Upgrades: Streak Bonus,
Multiplier, Insurance); rèn tư duy tài chính, quản lý rủi ro và giải quyết vấn đề phối hợp nhóm. Mẫu phổ biến nhất:
Floor is Lava, Trust No One và Fishtopia.
Độ tuổi 3–6 tuổi: Hoàn toàn không phù hợp vì trẻ không thể vừa điều khiển nhân vật di chuyển vừa đọc hiểu các khái
niệm kinh tế ảo và câu hỏi văn bản.
Độ tuổi 6–11 tuổi: Phù hợp với học sinh từ lớp 3–5 có kỹ năng chơi game máy tính; học sinh lớp 1–2 gặp khó khăn
khi thao tác điều khiển 2D kết hợp đọc chữ.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 6 / 13



## Trang 7

4.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt hoàn hảo. Giáo viên tạo 1 bộ câu hỏi (gọi là 1 "Kit"), sau đó có thể chọn chạy trên
bất kỳ thế giới 2D nào (Fishtopia, Floor is Lava) mà không phải gõ lại câu hỏi [XÁC NHẬN: gimkit.com/features] .
Định dạng dữ liệu: JSON Schema quản lý mảng Kit Questions; hỗ trợ tính năng KitCollab (học sinh cùng đóng góp
câu hỏi vào bộ Kit theo thời gian thực).
Công nghệ hiển thị: Xây dựng trên Phaser.js (HTML5 2D Game Framework chuyên nghiệp chạy trên Canvas/WebGL);
đồng bộ chuyển động nhân vật và trạng thái nhiều người chơi qua WebSocket và Socket.io
[XÁC NHẬN: Jeffrey Daniels Creator Interview; GitHub phaser inspect] .
Thêm loại game mới: Đội ngũ Gimkit tự phát triển các game mode theo từng mùa giải (Seasons). Có công cụ Gimkit
Creative cho phép giáo viên/học sinh tự thiết kế bản đồ 2D bằng các khối trigger logic kéo thả.
4.3. Trải nghiệm khi chơi
Vòng chơi: Học sinh gia nhập phòng qua mã code → Xuất hiện trong thế giới 2D pixel art → Di chuyển nhân vật đến
trạm hỏi đáp → Trả lời đúng nhận tiền GimBucks → Mở cửa hàng trong game mua nâng cấp (nâng cấp gấp đôi tiền
mỗi câu, mua bảo hiểm khi trả lời sai) → Cả lớp cùng phối hợp đạt mục tiêu chung (ví dụ đạt 5.000.000$ trước khi
dung nham dâng ngập màn hình) → Màn hình vinh danh các cá nhân đóng góp nhiều nhất.
Xử lý sai: Bị trừ tiền trong game (nếu chưa mua bảo hiểm); hiển thị đáp án đúng; cho phép trả lời lại câu hỏi đó ở các
lượt tiếp theo để củng cố trí nhớ.
Đồng hồ, Xếp hạng, Mascot: Chơi theo đồng hồ đếm ngược hoặc mục tiêu tiền tệ; Bảng xếp hạng doanh thu và tài
sản; Nhân vật đại diện hình người pixel tùy biến trang phục.
Hiệu năng: Đồ họa Canvas 2D chuyển động 60 FPS rất mượt; tuy nhiên đòi hỏi thiết bị máy tính/máy tính bảng có
phần cứng xử lý đồ họa khá, thiết bị di động đời cũ có thể bị nóng máy [XÁC NHẬN: EdSurge Review] .
4.4. Tính năng AI
Tên & Ra mắt: Gimkit AI Generator (tích hợp trong công cụ tạo Kit giai đoạn 2024–2026) [XÁC NHẬN: gimkit.com, 2026] .
Khả năng tự động hóa: Tạo nhanh câu hỏi trắc nghiệm từ từ khóa chủ đề bài học, tài liệu văn bản hoặc tệp đính kèm.
Giáo viên vẫn phải làm tay: Duyệt câu hỏi, chọn chế độ chơi và cấu hình các thông số kinh tế của phòng chơi (mức
phạt khi sai, giá nâng cấp).
Tiếng Việt: Hỗ trợ sinh câu hỏi tiếng Việt cơ bản; hệ thống và giao diện game hoàn toàn bằng tiếng Anh.
Vai trò AI: AI là tính năng phụ; thế mạnh cốt lõi của Gimkit nằm ở Game Engine 2D Phaser.js và cơ chế kinh tế game.
4.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC.
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Tạo câu hỏi từ vựng con vật và chọn chế độ bản đồ Daystar
hoặc chủ đề trạm vũ trụ ngoài không gian).
4.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "New Kit". Bước 2: Dùng AI Generator nhập prompt
hoặc dùng tính năng KitCollab cho học sinh đóng góp. Bước 3: Tìm ảnh con vật từ Unsplash tích hợp gắn vào thẻ câu
hỏi. Bước 4: Bấm "Finish" → Bấm "Play Live" → Chọn chế độ "Floor is Lava" → Bấm "Continue" lấy mã PIN
[XÁC NHẬN: Gimkit Help Docs] .
Thời gian thực tế: Tạo thủ công mất từ 12 đến 20 phút; dùng AI hỗ trợ mất khoảng 4 đến 6 phút.
4.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Mã code 5-6 chữ số trên gimkit.com/join, link trực tiếp; có chế độ Live Game trong lớp và Chế độ
giao bài về nhà (Assignments).
Tài khoản học sinh: Không bắt buộc tài khoản khi chơi phòng Live. Tuân thủ COPPA, FERPA và không hiển thị quảng
cáo thương mại [XÁC NHẬN: gimkit.com/privacy] .
Phụ huynh: Học sinh có thể tự chơi lại các bài tập được giao về nhà trên trình duyệt máy tính cá nhân.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 7 / 13



## Trang 8

4.8. Chi phí và giới hạn
Gói miễn phí: Giới hạn nghiêm ngặt tối đa 05 người chơi trong 1 phòng Live (thực chất chỉ là bản dùng thử trải
nghiệm nhóm nhỏ, không thể tổ chức cho cả lớp) [XÁC NHẬN: gimkit.com/pricing, 2026] .
Gói trả phí (Gimkit Pro): 4.99 USD/tháng (thanh toán năm 59.88 USD/năm ~ 1.500.000 VNĐ/năm) hoặc 9.99
USD/tháng thanh toán từng tháng; mở không giới hạn người chơi và mở toàn bộ các chế độ game 2D
[XÁC NHẬN: gimkit.com/pricing] .
Bản địa hóa: Giao diện 100% tiếng Anh; gõ dấu tiếng Việt tốt; có hỗ trợ phát âm câu hỏi qua công cụ trợ năng hệ điều
hành nhưng không có TTS tiếng Việt chuyên biệt.
5. QUIZALIZE (quizalize.com)
5.1. Danh mục cơ chế chơi
Cung cấp các chế độ trò chơi thi đấu thể thao và đối kháng màn hình lớn: Hoop Shoot (bóng rổ ném bóng vào rổ khi trả
lời đúng), Archery (bắn cung tính điểm hồng tâm), Castle Defense (phòng thủ lâu đài chống quái vật), Batter Up (bóng
chày đánh bóng ghi điểm), Rock-Paper-Scissors (oẳn tù tì đối kháng), Bear Escape (chạy trốn gấu đuổi), Classic
Leaderboard, Quick Quiz [XÁC NHẬN: quizalize.com; ecml.at ICT Inventory] .
Thao tác & Kỹ năng: Học sinh trả lời trắc nghiệm trên thiết bị cá nhân; câu trả lời đúng và tốc độ phản hồi được
chuyển hóa thành các cú ném bóng rổ hoặc bắn cung hiển thị trực tiếp trên màn hình máy chiếu của giáo viên; rèn tư
duy tập trung, phản xạ và tinh thần thể thao đồng đội. Mẫu phổ biến nhất: Hoop Shoot và Castle Defense.
Độ tuổi 3–6 tuổi: Không phù hợp vì câu hỏi hiển thị dạng văn bản chữ.
Độ tuổi 6–11 tuổi: Rất phù hợp cho học sinh tiểu học (lớp 2–5); các màn thi đấu thể thao đối kháng 2 đội (Team vs
Team) tạo động lực thi đua rất lành mạnh.
5.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt hoàn toàn. Bộ câu hỏi quiz độc lập với hoạt cảnh trò chơi; giáo viên có thể gán 1
bài kiểm tra vào trò bắn cung, bóng rổ hoặc lâu đài tùy ý [XÁC NHẬN: quizalize.com] .
Định dạng dữ liệu: Cấu trúc JSON tích hợp siêu dữ liệu sư phạm (Curriculum Tags, Learning Objectives); liên kết trực
tiếp với hệ cơ sở dữ liệu Zzish.
Công nghệ hiển thị: HTML5 Canvas 2D/3D Sprites cho màn hình máy chiếu thi đấu; giao diện học sinh xây dựng
bằng HTML5/CSS3 chuẩn di động; đồng bộ thời gian thực qua WebSockets
[XÁC NHẬN: DevTools inspection trên quizalize.com] .
Thêm loại game mới: Đội ngũ kỹ sư Zzish / Quizalize trực tiếp phát triển.
5.3. Trải nghiệm khi chơi
Vòng chơi: Học sinh gia nhập qua mã lớp trên zzish.code → Máy chiếu chia đôi màn hình 2 đội (Đỏ vs Xanh) → Học
sinh làm bài trên điện thoại → Mỗi lần học sinh trả lời đúng, nhân vật trên máy chiếu tung cú ném bóng rổ chính xác
vào rổ hoặc bắn mũi tên trúng bia → Kết thúc hiển thị đội chiến thắng và màn hình phân tích lỗ hổng kiến thức.
Xử lý sai: Cú ném bóng bị trượt ra ngoài; hiển thị giải thích đáp án trên thiết bị cá nhân để học sinh đọc lại.
Đồng hồ, Xếp hạng: Có đồng hồ thời gian; Bảng xếp hạng điểm số đồng đội; Hoạt họa vận động viên thể thao ngộ
nghĩnh.
Hiệu năng: Đồ họa chuyển động máy chiếu rất mượt mà; độ trễ đồng bộ mạng dưới 200ms
[XÁC NHẬN: EdTech Impact Review] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 8 / 13



## Trang 9

5.4. Tính năng AI
Tên & Ra mắt: Quizalize Smart AI (tích hợp trong công cụ Quizalize Create năm 2023–2024, nâng cấp 2026)
[XÁC NHẬN: quizalize.com/smart-ai, 2026] .
Khả năng tự động hóa: Nhập chủ đề hoặc chuẩn kiến thức để AI sinh danh sách câu hỏi trắc nghiệm tự động. Giáo
viên vẫn phải làm tay: Duyệt nội dung, kiểm tra đáp án, chọn giao diện trò chơi thể thao và điều khiển bắt đầu trận
đấu.
Tiếng Việt: Hỗ trợ tiếng Việt ở mức khá; tuy nhiên hệ thống điều khiển vẫn là tiếng Anh.
Vai trò AI: AI là tính năng bổ trợ biên tập; nền tảng dựa trên nền tảng phân tích học tập Zzish.
5.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC.
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Tạo câu hỏi trắc nghiệm từ vựng con vật và chọn game mode
Castle Defense bối cảnh viễn tưởng).
5.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Create Quiz". Bước 2: Dùng Smart AI nhập prompt "5
câu hỏi đếm con vật lớp 1". Bước 3: Duyệt và tải ảnh con vật lên các thẻ câu hỏi. Bước 4: Bấm "Save & Give to class"
→ Chọn game mode "Hoop Shoot" → Lấy mã tham gia [XÁC NHẬN: Quizalize Help Center] .
Thời gian thực tế: Tạo thủ công mất từ 15 đến 20 phút; dùng Smart AI mất khoảng 4 đến 6 phút.
5.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Mã lớp (Class Code), đường dẫn trực tiếp, tích hợp Google Classroom. Hỗ trợ thi đấu trực tiếp trên
lớp và giao bài tập về nhà.
Tài khoản học sinh: Không bắt buộc tài khoản riêng khi tham gia chơi trực tiếp qua mã code. Tuân thủ chuẩn COPPA,
FERPA, GDPR [XÁC NHẬN: quizalize.com/privacy] .
Phụ huynh: Phụ huynh có thể xem báo cáo tiến độ học tập của con qua đường link tổng kết.
5.8. Chi phí và giới hạn
Gói miễn phí: Giới hạn tối đa 3 lớp học và 20 học sinh hoạt động cùng lúc, giới hạn tính năng báo cáo nâng cao
[XÁC NHẬN: quizalize.com/pricing, 2026] .
Gói trả phí (Quizalize Premium): Khoảng 4.99 – 7.99 USD/tháng (thanh toán năm ~60.00 – 95.00 USD/năm ~
1.500.000 – 2.400.000 VNĐ/năm); gói trường học cấp quyền đầy đủ cho toàn bộ giáo viên
[XÁC NHẬN: quizalize.com/pricing] .
Bản địa hóa: Giao diện tiếng Anh; gõ dấu tiếng Việt tốt; hỗ trợ phát âm Text-to-Speech đa ngôn ngữ (có tiếng Việt cơ
bản); hình ảnh hoạt họa thể thao phương Tây.
6. ZZISH (zzish.com)
6.1. Danh mục cơ chế chơi & Quản trị năng lực
Zzish là hệ thống nền tảng (Parent LMS & Real-time Analytics Engine) đứng sau vận hành Quizalize. Do đó, Zzish
không cung cấp minigame độc lập mà cung cấp các phân hệ quản trị năng lực và học tập thích ứng (Adaptive
Learning): Live Class Dashboard (giám sát lớp học thời gian thực), Mastery Matrix (ma trận làm chủ kiến thức theo
chuẩn đầu ra), Sub-grouping & Differentiation (tự động chia lớp thành 3 nhóm năng lực: Dưới 50%, 50–80%, Trên 80%),
Automated 
Follow-up 
Activities 
(tự 
động 
giao 
bài 
tập 
bù 
đắp 
kiến 
thức 
cho 
từng 
nhóm)
[XÁC NHẬN: zzish.com; EdSurge Product Profile] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 9 / 13



## Trang 10

Thao tác chính: Giáo viên quan sát bảng số liệu động, theo dõi các chấm tròn học sinh chuyển từ đỏ sang vàng và
xanh lá cây theo thời gian thực; bấm 1 click để phân nhóm và giao bài tập cá nhân hóa.
Độ tuổi 3–6 tuổi & 6–11 tuổi: Không áp dụng trực tiếp cho học sinh thao tác; là công cụ sư phạm dành riêng cho
giáo viên và nhà trường quản lý tiến độ học tập của học sinh tiểu học và phổ thông.
6.2. Cách nền tảng tạo trò chơi & Kiến trúc dữ liệu
Kiến trúc bên trong: Zzish hoạt động như một Data Hub trung tâm. Khi học sinh trả lời câu hỏi trên Quizalize, mỗi sự
kiện (tọa độ câu hỏi, thời gian phản hồi miligiây, số lần thử lại) được bắn về Zzish API qua WebSocket
[XÁC NHẬN: Zzish Developer Portal] .
Định dạng dữ liệu: JSON Schema định chuẩn theo các khung chương trình giáo dục quốc tế (Common Core, UK
National Curriculum): studentId, masteryLevel, gapIdentified, standardCode.
Công nghệ hiển thị: Single Page Application (SPA) xây dựng trên React.js / D3.js phục vụ trực quan hóa dữ liệu biểu
đồ; Backend Microservices trên Node.js/Java kết nối PostgreSQL và NoSQL.
6.3. Trải nghiệm khi vận hành
Vòng lặp nghiệp vụ: Bắt đầu phiên Live trên Quizalize → Dashboard Zzish hiển thị danh sách học sinh theo thời gian
thực → Khi học sinh gặp khó khăn ở câu hỏi cụ thể, tên học sinh lập tức đổi sang màu đỏ kèm cảnh báo "Cần hỗ trợ"
→ Sau khi kết thúc bài kiểm tra, thuật toán Zzish tự động xuất danh sách phân hóa: nhóm cần phụ đạo (giao video
bài giảng ngắn), nhóm đạt chuẩn (giao bài tập nâng cao).
Hiệu năng: Xử lý dữ liệu luồng tức thì (Stream processing); cập nhật biểu đồ không cần tải lại trang.
6.4. Tính năng AI & Thuật toán thích ứng
Tên & Bản chất: Zzish Adaptive Learning Algorithm (thuật toán phân tích năng lực và đề xuất học liệu bù đắp kiến
thức tự động) [XÁC NHẬN: zzish.com/schools] .
Khả năng tự động hóa: Tự động phân tích ma trận kết quả của 40 học sinh trong 1 giây; tự động gán bài học khắc
phục tương ứng mà giáo viên không phải chấm bài thủ công.
Vai trò AI/Thuật toán: Là trọng tâm cốt lõi của toàn bộ hệ sinh thái Zzish.
6.5. Giới hạn khi mô tả ngoài mẫu
Mô tả a, b, c, d: KHÔNG ÁP DỤNG TRỰC TIẾP (Zzish là hệ thống phân tích đánh giá dữ liệu và quản trị học tập hậu
trường, không phải game engine kết xuất đồ họa).
6.6. Quy trình và thời gian vận hành
Quy trình phân hóa học sinh: Bước 1: Giáo viên đồng bộ danh sách lớp từ Google Classroom vào Zzish. Bước 2:
Thiết lập ngưỡng đạt chuẩn (ví dụ 70%). Bước 3: Sau bài kiểm tra trên Quizalize, Zzish tự động phân lớp thành 3
nhóm và gửi bài tập phân hóa trong dưới 30 giây (thay vì giáo viên mất 1–2 giờ chấm và lọc bài thủ công)
[XÁC NHẬN: Zzish Case Study: UK Primary Schools] .
6.7. Phân phối và Quản trị an toàn
Tích hợp chặt chẽ với Google Classroom, Microsoft SDS, Clever. Đạt chuẩn bảo mật dữ liệu học đường quốc tế ISO
27001, tuân thủ GDPR và COPPA nghiêm ngặt [XÁC NHẬN: zzish.com/security] .
6.8. Chi phí và Bản địa hóa
Đi kèm trong các gói bản quyền trường học/học khu của Quizalize (School & District License từ 500 – 2.000+
USD/năm); giao diện quản trị bằng tiếng Anh; hỗ trợ gõ và lưu trữ dữ liệu tiếng Việt chuẩn UTF-8.
PHẦN C – BA BẢNG TỔNG HỢP SO SÁNH KỸ THUẬT
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 10 / 13



## Trang 11

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
Kahoot!
Classic Mode
Nhìn bảng, bấm 4
khối màu
Phản xạ nhanh, lựa
chọn tốc độ
Không (khó
đọc)
Rất hợp
(lớp 3-5)
[XÁC NHẬN]
kahoot.com
Kahoot!
Color Kingdom
Bấm đáp án để tô
màu chiếm đất
Tư duy chiến thuật
nhóm, phản xạ
Không (cần
đọc)
Rất hợp
[XÁC NHẬN]
support.kahoot.com
Quizizz
Classic Live Mode
Đọc đề, bấm chọn
trực tiếp trên máy
Tự kiểm tra kiến thức,
tốc độ
Không
(nhiều chữ)
Rất hợp
(lớp 2-5)
[XÁC NHẬN]
support.quizizz.com
Quizizz
Paper Mode
Giơ thẻ giấy in mã
QR 4 cạnh
Nhận biết đáp án
A/B/C/D
Hợp (nếu
cô đọc)
Rất hợp (0
máy)
[XÁC NHẬN]
quizizz.com/home
Blooket
Gold Quest
Trả lời quiz, mở
rương, cướp vàng
Ra quyết định, phản
xạ nhận thức
Không (khó
đọc)
Cực kỳ say
mê
[XÁC NHẬN]
help.blooket.com
Blooket
Tower Defense 2
Trả lời quiz kiếm tiền
đặt tháp
Tư duy chiến thuật,
quản lý tài nguyên
Không
(phức tạp)
Rất hợp
(lớp 3-5)
[XÁC NHẬN]
help.blooket.com
Gimkit
Floor is Lava
Di chuyển 2D, giải
quiz mua giàn giáo
Hợp tác đồng đội,
quản lý kinh tế ảo
Không (rất
khó)
Rất hợp
(lớp 3-5)
[XÁC NHẬN]
gimkit.com
Gimkit
Fishtopia
Di chuyển 2D câu
cá, bán cá kiếm tiền
Tư duy kinh tế, khám
phá thế giới
Không
Rất hợp
(lớp 3-5)
[XÁC NHẬN]
gimkit.fandom.com
Quizalize
Hoop Shoot
Bấm đáp án máy
khách ném bóng
máy chiếu
Thể thao hóa, thi đua
đồng đội
Không (cần
đọc)
Rất hợp
[XÁC NHẬN]
ecml.at
Quizalize
Castle Defense
Bấm đúng để bắn
tên thủ thành
Tập trung nhận thức,
phản xạ
Không
Rất hợp
[XÁC NHẬN]
quizalize.com
Zzish
Mastery Dashboard
Theo dõi số liệu,
phân nhóm tự động
Quản trị học tập, đánh
giá năng lực
Không áp
dụng
Dành cho
GV
[XÁC NHẬN]
zzish.com
Bảng C2 – So sánh nền tảng:
Nền
tảng
Tách nội
dung khỏi
mẫu
Định dạng
dữ liệu
Công nghệ
hiển thị
AI làm được
bước nào
AI là phụ
hay lõi
Tiếng
Việt
Giá gói trả
phí
Học
sinh
cần
tài
khoản
Nguồn
Kahoot!
Có (1 Quiz
$\rightarrow$
Đa mode)
Proprietary
JSON
Cloud
React.js +
SVG +
WebSockets
Sinh câu hỏi/đáp
án từ text/pdf
Phụ
(Add-on)
Giao
diện
có, TTS
máy
3.99 – 9.99
USD/tháng
Không
cần
[XÁC
NHẬN]
kahoot.com
Quizizz
Có (Live,
Test, Paper,
Worksheets)
JSON Quiz
Schema
Vue/React +
Canvas +
WebSockets
Sinh câu hỏi từ
URL/Doc/Prompt
Phụ
(Booster)
Rất tốt
(Giao
diện &
Text)
8.00 –
12.00
USD/tháng
Không
cần
[XÁC
NHẬN]
quizizz.com
Blooket
Có (1 Set
$\rightarrow$
10+ game
mode)
JSON
Question
Set
React.js +
Canvas 2D
+ Firebase
Sinh câu hỏi trắc
nghiệm từ text
Phụ
(Add-on)
Chỉ
tiếng
Anh, gõ
dấu OK
3.29 – 4.99
USD/tháng
Không
cần
[XÁC
NHẬN]
blooket.com
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 11 / 13



## Trang 12

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
Gimkit
Có (1 Kit
$\rightarrow$
Đa thế giới
2D)
JSON Kit
Format
Phaser.js
(Canvas 2D)
+ Socket.io
Sinh câu hỏi
Kit từ
prompt
Phụ
(Add-
on)
Chỉ tiếng
Anh, gõ
dấu OK
4.99 – 9.99
USD/tháng
Không
cần
[XÁC NHẬN]
gimkit.com
Quizalize
Có (Gán Quiz
vào game thể
thao)
JSON
Curriculum
Metadata
HTML5
Canvas +
WebSockets
Smart AI
sinh quiz từ
chủ đề
Phụ
(Add-
on)
Giao
diện
Anh, gõ
dấu OK
4.99 – 7.99
USD/tháng
Không
cần
[XÁC NHẬN]
quizalize.com
Zzish
Có (Hub dữ
liệu phân
tích)
JSON
Mastery
Analytics
React.js +
D3.js Charts
Thuật toán
phân tích lỗ
hổng
Lõi
(Core)
Giao
diện
Anh, lưu
dấu
UTF8
Đi kèm
Quizalize
(SaaS)
Cần
tài
khoản
lớp
[XÁC NHẬN]
zzish.com
Bảng C3 – Mô tả ngoài mẫu:
Nền tảng
Mô tả a
Mô tả b
Mô tả c
Mô tả d
Kahoot!
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC (Chỉ bấm
4 màu)
LÀM GẦN ĐÚNG (Quiz con vật
+ Theme Space)
Quizizz
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC (Chỉ
vẽ tự do)
LÀM GẦN ĐÚNG (Match nối
thẻ, thiếu vật lý giỏ)
LÀM GẦN ĐÚNG (Ghép thẻ +
Theme Space)
Blooket
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Quiz con vật
+ Mode Crypto/Star)
Gimkit
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Kit con vật +
Map Trạm vũ trụ)
Quizalize
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Quiz con vật
+ Castle Defense)
Zzish
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC (Là hệ
thống Dashboard LMS)
Ghi chú: Toàn bộ 06 nền tảng thuộc Nhóm 2 hoàn toàn bất lực trước tương tác vật lý xúc giác (cân thăng bằng, kéo táo vào giỏ) và luyện
viết chữ; điều này chứng minh tính mới và giá trị cốt lõi của Game Engine Canvas 2D (react-konva) trong đề tài khóa luận của nhóm.
PHẦN D – DANH SÁCH ĐIỂM CẦN TỰ ĐĂNG NHẬP KIỂM TRA THỰC NGHIỆM [CẦN TỰ THỬ]
Để hoàn thiện luận cứ khoa học thực chứng phục vụ phiên bảo vệ khóa luận trước hội đồng, sinh viên cần trực tiếp đăng
nhập tài khoản thực nghiệm và thu thập các bằng chứng sau:
1. Kiểm tra ngưỡng giới hạn người chơi đồng thời trên tài khoản Kahoot! Free:
• Hành động: Khởi tạo một phiên chơi Classic Live trên tài khoản Kahoot miễn phí; sử dụng các tab ẩn danh trên trình
duyệt để giả lập hơn 10 học sinh cùng nhập mã PIN vào phòng.
• Bằng chứng cần chụp: Ảnh chụp màn hình khi người chơi thứ 11 hoặc thứ 21 kết nối vào phòng xem hệ thống có thông
báo "Player limit reached" và khóa sảnh chờ hay không.
2. Đo độ trễ đồng bộ của Quizizz Paper Mode bằng camera điện thoại:
• Hành động: In bộ thẻ Paper Mode của Quizizz ra giấy A4; khởi động bài kiểm tra Paper Mode trên máy tính và mở ứng
dụng Quizizz Teacher trên điện thoại để quét một góc 10 thẻ mã QR cùng lúc.
• Bằng chứng cần chụp: Ảnh chụp giao diện nhận diện camera và thời gian tính bằng giây hiển thị kết quả đồng bộ lên
màn hình máy tính.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 12 / 13



## Trang 13

3. Kiểm tra khả năng hiển thị tiếng Việt có dấu trong các chế độ chơi Arcade của Blooket:
• Hành động: Tạo 1 Question Set trên Blooket gồm các từ tiếng Việt phức tạp: "Chim bồ câu", "Khủng long bạo
chúa", "Thuyền buồm"; khởi động chế độ Gold Quest và Tower Defense 2.
• Bằng chứng cần chụp: Ảnh chụp màn hình lúc câu hỏi hiển thị trong cửa sổ chơi game của học sinh xem có bị lỗi font
(tofu), vỡ dấu thanh hoặc đè chữ lên hitbox của game hay không.
4. Kiểm tra giới hạn số người chơi trong 1 Kit Live trên Gimkit tài khoản miễn phí:
• Hành động: Đăng nhập tài khoản Gimkit Free, tạo 1 bài trắc nghiệm 5 câu, bấm "Play Live" chọn chế độ "Floor is Lava".
• Bằng chứng cần chụp: Hộp thoại giới hạn người chơi tối đa (5 players) hiển thị trên màn hình trước khi bắt đầu tạo
phòng.
5. Kiểm tra cơ chế phân nhóm tự động của Zzish sau khi hoàn thành Quizalize:
• Hành động: Tạo một lớp học thử nghiệm trên Quizalize/Zzish với 6 học sinh ảo; cố tình trả lời đúng/sai để tạo 3 mức
điểm (30%, 65%, 100%).
• Bằng chứng cần chụp: Màn hình Zzish Live Dashboard hiển thị 3 cột phân hóa năng lực và hộp thoại đề xuất bài tập
khắc phục tự động.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 2
Trang 13 / 13
