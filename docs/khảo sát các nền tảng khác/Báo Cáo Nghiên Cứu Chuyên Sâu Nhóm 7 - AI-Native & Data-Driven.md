# Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 7 - AI-Native & Data-Driven

> **Nghiên cứu chuyên sâu**: [[Khảo sát 7 nhóm nền tảng đối thủ]] | [[Báo Cáo Khảo Sát Nhóm 7 - AI-Native & Data-Driven|Khảo sát tổng quan Nhóm 7: AI-Native & Data-Driven]]



> **Tài liệu nguồn gốc**: `Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 7 - AI-Native & Data-Driven.pdf`  
> **Tổng số trang**: 11  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

BÁO CÁO NGHIÊN CỨU KỸ THUẬT • KHÓA LUẬN TỐT NGHIỆP
Khảo Sát Toàn Diện Nhóm 7: AI-Native Sư Phạm & Tự Động Hóa
Hướng Dữ Liệu
Phân hệ: Diffit for Teachers, MagicSchool AI, Eduaide.ai, Edpuzzle, Flippity • Đơn vị khảo sát: Nhóm Khóa Luận AI Game Generator
• Cập nhật: 11/2026
PHẦN A – TÓM TẮT NHÓM & BÀI HỌC THIẾT KẾ AI GAME GENERATOR
Điểm chung của Nhóm 7: Đại diện cho làn sóng công nghệ tiên tiến nhất về Trí tuệ nhân tạo tạo sinh (GenAI/LLM) trong
giáo dục và kiến trúc phần mềm tách rời dữ liệu (Data-Driven Architecture). Các nền tảng này tập trung giải quyết khâu
thượng nguồn: tiếp nhận tài liệu đa định dạng (PDF/Doc/URL/Video) để tự động bóc tách kiến thức, phân cấp độ đọc hiểu
(Leveled 
text), 
hoặc 
ánh 
xạ 
bảng 
dữ 
liệu 
thô 
thành 
tài 
nguyên 
học 
tập 
tức 
thì
[XÁC NHẬN: diffit.me; magicschool.ai; eduaide.ai; flippity.net] .
Bài học quan trọng nhất cho hệ thống AI Game Generator: (1) Kế thừa triết lý Data-Driven của Flippity: Flippity chứng minh
việc tách rời dữ liệu nội dung khỏi giao diện trình diễn là kiến trúc tối ưu nhất. Đề tài của nhóm nâng tầm mô hình này lên
cấp độ AI: thay vì bắt giáo viên nhập liệu vào Google Sheets phức tạp, hệ thống sử dụng LLM để sinh thẳng cấu trúc Game
JSON DSL chuẩn hóa (schemaVersion: 1.0.0), sau đó Game Engine Canvas 2D (react-konva) sẽ render đồ họa tức thì. (2)
Vượt qua giới hạn "AI sinh văn bản tĩnh": Điểm hạn chế chí tử của Diffit, MagicSchool và Eduaide là chỉ sinh ra tài liệu phẳng
dạng văn bản, phiếu in hoặc biểu mẫu trắc nghiệm chữ (Google Forms/Docs), hoàn toàn thiếu Game Engine 2D tương tác
vật lý. Đề tài của nhóm tạo ra tính mới đột phá: Cầu nối trực tiếp từ GenAI sang Game Canvas 2D có va chạm vật lý, kéo
thả mượt mà và tích hợp giọng đọc TTS tiếng Việt bám sát chuẩn GDPT 2018 chỉ sau 1 câu lệnh dưới 10 giây.
PHẦN B – NGHIÊN CỨU CHI TIẾT TỪNG NỀN TẢNG (08 TIÊU CHÍ)
1. DIFFIT FOR TEACHERS (diffit.me - beta.diffit.me)
1.1. Danh mục cơ chế chơi & Học liệu
Nền tảng GenAI sư phạm phân cấp độ đọc hiểu hàng đầu thế giới: Leveled Text Reader (bài đọc được AI viết lại theo
cấp lớp từ Mầm non đến Lớp 12 dựa trên chỉ số Lexile), Vocabulary Words & Definitions (trích xuất từ vựng trọng tâm
kèm định nghĩa ngữ cảnh), Multiple Choice Questions (bộ câu hỏi trắc nghiệm tự động), Short Answer Questions (câu
hỏi tự luận ngắn), Open-Ended Prompts (chủ đề thảo luận mở), Interactive Digital Templates (xuất bản 1-click ra Google
Slides, Google Docs, Google Forms, bài tập in PDF, bảng tính Frayer Model) [XÁC NHẬN: diffit.me; techlearning.com 2025] .
Thao tác & Kỹ năng: Học sinh đọc đoạn văn bản đã phân hóa năng lực; làm bài kiểm tra trắc nghiệm trên Google
Forms hoặc phiếu in; điền từ vựng; rèn kỹ năng đọc hiểu chuyên sâu (Reading Comprehension), mở rộng vốn từ và
phân tích văn bản. Mẫu phổ biến nhất: Leveled Reading Passage và Multiple Choice Quiz.
Độ tuổi 3–6 tuổi: Không phù hợp; dù Diffit có tùy chọn "Kindergarten" nhưng sản phẩm đầu ra vẫn là các câu văn
ngắn dạng chữ viết, trẻ mầm non chưa biết đọc chữ không thể tự học.
Độ tuổi 6–11 tuổi: Rất phù hợp từ lớp 2–5; giúp giáo viên phân hóa bài đọc cho học sinh giỏi và học sinh đọc chậm
trong cùng một lớp học.
1.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt ở cấp độ cao nhất. Cùng một ngữ liệu bóc tách được, giáo viên có thể bấm 1-click
để xuất ra hàng chục mẫu hiển thị khác nhau (Google Slides flashcards, Google Forms quiz, phiếu bài tập Word,
Printable PDF) mà không làm thay đổi nội dung câu hỏi [XÁC NHẬN: diffit.me/how-it-works] .
Định dạng dữ liệu: JSON Backend Schema lưu trữ cấu trúc: {lexile_level, passage, vocabulary:
[{term, def}], questions: [{type, prompt, answers, correct}]}.
Công nghệ hiển thị: Ứng dụng web Single Page Application (SPA) xây dựng trên React.js; không có Game Engine đồ
họa nội bộ, việc hiển thị tương tác phụ thuộc vào hệ sinh thái Google Workspace (Forms/Slides) hoặc tài liệu PDF tải
về [XÁC NHẬN: DevTools inspection trên diffit.me] .
Thêm loại game mới: Đội ngũ kỹ sư Diffit trực tiếp phát triển các mẫu xuất bản (Export Templates) mới.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 7
Trang 1 / 11



## Trang 2

1.3. Trải nghiệm khi chơi
Vòng trải nghiệm: Giáo viên xuất bản liên kết Google Forms hoặc Google Slides → Học sinh mở tài liệu → Đọc bài
văn ngắn → Chọn đáp án trắc nghiệm hoặc gõ câu trả lời → Bấm Nộp bài (Submit) → Xem điểm số phản hồi tự động
trên Google Forms.
Xử lý sai: Hiển thị câu sai và câu đúng kèm đoạn trích dẫn giải thích từ bài đọc; không có âm thanh game hay hiệu
ứng hoạt họa.
Đồng hồ, Xếp hạng: Không có đồng hồ đếm ngược; không có bảng xếp hạng đối kháng; không có linh vật hoạt hình.
Hiệu năng: Tốc độ AI sinh tài liệu cực nhanh (dưới 15 giây cho một bộ tài liệu phân hóa hoàn chỉnh)
[XÁC NHẬN: Common Sense Education 2025 Review] .
1.4. Tính năng AI
Tên & Bản chất: Diffit AI Engine (ứng dụng mô hình ngôn ngữ lớn tiên tiến kết hợp RAG và công nghệ cân chỉnh độ
phức tạp văn bản) [XÁC NHẬN: diffit.me/about, 2026] .
Khả năng tự động hóa: Nhận đầu vào là: Bất kỳ từ khóa chủ đề, đường link bài viết website, video YouTube (AI tự bóc
phụ đề video), hoặc tải lên tệp PDF/DOCX giáo án → Tự động sinh trọn gói bài đọc, từ vựng và câu hỏi trắc nghiệm.
Giáo viên vẫn phải làm tay: Chọn khối lớp mục tiêu, kiểm duyệt nội dung và chọn mẫu xuất bản.
Tiếng Việt: Hỗ trợ tiếng Việt xuất sắc; dịch và sinh văn bản tiếng Việt mượt mà, đúng chuẩn ngữ pháp sư phạm.
Vai trò AI: AI là linh hồn và lõi sản phẩm 100% (AI-Native).
1.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC (Diffit chỉ sinh văn bản và bài tập chữ, không có Canvas hay physics
engine).
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC (Không có tương tác kéo thả xúc giác).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Sinh được bài đọc từ vựng về con vật du hành vũ trụ và bộ câu
hỏi trắc nghiệm chữ, nhưng không có đồ họa minigame không gian).
1.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Mở diffit.me → Chọn ô "A topic or question". Bước 2: Nhập "Đếm con vật
từ 1 đến 10 cho học sinh lớp 1" → Chọn khối lớp 1 (Grade 1). Bước 3: Bấm "Generate Resources" → Chờ 10 giây.
Bước 4: AI sinh bài đọc ngắn và 5 câu hỏi trắc nghiệm. Bước 5: Bấm "Get Student Activities" → Xuất ra Google Forms
hoặc PDF [XÁC NHẬN: Diffit Teacher Guide] .
Thời gian thực tế: Chỉ mất từ 30 giây đến 2 phút để tạo xong toàn bộ bộ học liệu (tốc độ sinh nhanh hàng đầu thế
giới).
1.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ link Google Forms, Google Slides, tải file PDF in giấy hoặc nhúng vào Google Classroom,
Canvas LMS. Học sinh làm bài độc lập dạng bài tập trên lớp hoặc về nhà.
Tài khoản học sinh: Học sinh không cần tài khoản Diffit; chỉ cần mở link Google Forms/Docs là làm bài được ngay.
Tuân thủ nghiêm ngặt FERPA, COPPA và GDPR [XÁC NHẬN: diffit.me/privacy] .
Phụ huynh: Phụ huynh có thể in phiếu bài tập PDF cho con tự luyện đọc và làm bài ở nhà.
1.8. Chi phí và giới hạn
Gói miễn phí: Cho phép sử dụng đầy đủ các tính năng sinh tài liệu cơ bản nhưng bị giới hạn một số mẫu xuất bản
nâng cao (Export Templates) [XÁC NHẬN: diffit.me/pricing] .
Gói trả phí (Diffit for Teachers): Khoảng 9.00 – 14.99 USD/tháng (thanh toán năm ~99.00 – 119.00 USD/năm ~
2.450.000 – 2.950.000 VNĐ/năm); mở khóa toàn bộ kho mẫu thiết kế cao cấp và tích hợp LMS trực tiếp
[XÁC NHẬN: diffit.me/pricing, 2026] .
Bản địa hóa: Giao diện trang web đã có bản dịch tiếng Việt; gõ dấu tiếng Việt tốt; hỗ trợ sinh ngữ liệu tiếng Việt tự
nhiên; không có giọng đọc TTS tiếng Việt tích hợp sẵn.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 7
Trang 2 / 11



## Trang 3

2. MAGICSCHOOL AI (magicschool.ai)
2.1. Danh mục cơ chế chơi & Công cụ sư phạm
Hệ sinh thái trợ lý AI sư phạm lớn nhất thế giới với hơn 60+ công cụ chuyên biệt cho giáo viên và phân hệ
MagicStudent: Multiple Choice Assessment Generator (tự động tạo bài kiểm tra trắc nghiệm 4 lựa chọn), Jeopardy
Game Review Generator (sinh bảng câu hỏi đấu trường Jeopardy phân tầng điểm 100–500), Decodable Text Generator
(sinh bài đọc luyện âm vần cho tiểu học), Raina AI Tutor (gia sư AI đàm thoại có rào chắn bảo vệ cho học sinh), Custom
Chatbot Maker (giáo viên tạo phòng chat AI đóng vai nhân vật lịch sử/văn học), Rubric Generator, 5E Lesson Plan
Generator [XÁC NHẬN: magicschool.ai; edweek.org 2025] .
Thao tác & Kỹ năng: Học sinh đàm thoại với AI Tutor có kiểm soát (MagicStudent); làm bài trắc nghiệm; giáo viên lấy
kịch bản câu hỏi tổ chức game show trong lớp; rèn tư duy phản biện, tự định hướng học tập và kỹ năng giải quyết vấn
đề. Mẫu phổ biến nhất: Multiple Choice Assessment và Jeopardy Generator.
Độ tuổi 3–6 tuổi: Hoàn toàn không phù hợp vì 100% đầu ra là văn bản chữ; trẻ mầm non không thể gõ phím chat với
AI hay đọc kịch bản bài học.
Độ tuổi 6–11 tuổi: Phù hợp từ lớp 3–5 khi học sinh sử dụng MagicStudent để hỏi đáp kiến thức bài học dưới sự giám
sát của giáo viên.
2.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Dữ liệu sinh ra ở dạng văn bản có cấu trúc (Structured Text/Markdown). Giáo viên có thể
copy nội dung sang Google Docs, xuất sang Google Forms hoặc tải về file Word; không có liên kết trực tiếp với một
game engine hiển thị cụ thể [XÁC NHẬN: magicschool.ai/features] .
Định dạng dữ liệu: JSON/Text Schema nội bộ điều phối các chuỗi prompt chuyên sâu (Prompt Engineering Chains).
Công nghệ hiển thị: Frontend hiện đại xây dựng trên React.js / Next.js; giao diện điều khiển dạng thẻ công cụ; hoàn
toàn không sở hữu Canvas 2D hay Game Engine để chạy trò chơi trực quan
[XÁC NHẬN: DevTools inspection trên magicschool.ai] .
Thêm loại game mới: Đội ngũ kỹ sư MagicSchool AI cập nhật và bổ sung các mẫu công cụ mới vào bảng điều khiển.
2.3. Trải nghiệm khi chơi
Vòng trải nghiệm: Giáo viên dùng công cụ tạo câu hỏi → Sao chép câu hỏi sang Google Forms hoặc in ra giấy →
Học sinh trả lời câu hỏi → Chấm điểm thủ công hoặc tự động qua Google Forms. Nếu dùng MagicStudent: học sinh
gõ chat với trợ lý Raina để nhận gợi ý bài học từng bước.
Xử lý sai: Trợ lý Raina không đưa ra đáp án ngay mà đặt câu hỏi gợi mở theo phương pháp Socratic để học sinh tự tư
duy lại.
Đồng hồ, Xếp hạng: Không có đồng hồ đếm ngược; không có bảng xếp hạng đối kháng; linh vật là chú chim ma thuật
MagicSchool.
Hiệu năng: Tốc độ sinh câu hỏi cực kỳ nhanh (dưới 5 giây cho 10 câu hỏi trắc nghiệm)
[XÁC NHẬN: Tech & Learning Review] .
2.4. Tính năng AI
Tên & Ra mắt: MagicSchool AI Core (thành lập bởi cựu hiệu trưởng Goran Algara năm 2023, nâng cấp toàn diện
2024–2026) [XÁC NHẬN: magicschool.ai/about, 2026] .
Khả năng tự động hóa: Nhập chủ đề, chuẩn kiến thức hoặc dán giáo án → AI tự động sinh kịch bản câu hỏi, bài
giảng, tiêu chí chấm điểm chuẩn mực sư phạm quốc tế. Giáo viên vẫn phải làm tay: Tự copy văn bản sang các nền
tảng khác nếu muốn biến thành trò chơi kéo thả hay thẻ bài.
Tiếng Việt: Hỗ trợ tiếng Việt rất tốt; mô hình AI hiểu sâu các yêu cầu bằng tiếng Việt tự nhiên.
Vai trò AI: AI là lõi sản phẩm 100% (AI-Native).
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 7
Trang 3 / 11



## Trang 4

2.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC (Chỉ sinh được lời giải toán bằng chữ, không có mô phỏng cân).
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC.
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Sinh được danh sách từ vựng con vật và câu hỏi trắc nghiệm
chủ đề không gian, nhưng không có game engine chạy màn chơi).
2.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Chọn công cụ "Multiple Choice Quiz". Bước 2: Chọn khối
lớp 1, nhập chủ đề "Đếm con vật từ 1 đến 10". Bước 3: Bấm "Generate" → Hệ thống tạo 5 câu hỏi trong 3 giây. Bước
4: Bấm nút sao chép sang Google Forms hoặc xuất bản ra Word [XÁC NHẬN: MagicSchool Training Center] .
Thời gian thực tế: Chỉ mất từ 1 đến 2 phút để có một bộ câu hỏi trắc nghiệm chữ hoàn chỉnh.
2.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Xuất sang Google Forms/Docs, chia sẻ mã phòng MagicStudent cho học sinh đăng nhập vào làm
bài.
Tài khoản học sinh: Không cần tài khoản nếu làm trên Google Forms; cần tài khoản trường học nếu dùng
MagicStudent. Đạt chứng chỉ bảo mật nghiêm ngặt iKeepSafe, tuân thủ tuyệt đối COPPA, FERPA
[XÁC NHẬN: magicschool.ai/privacy] .
Phụ huynh: Phụ huynh có thể đồng hành cùng con đọc các bài đọc phân hóa do MagicSchool sinh ra.
2.8. Chi phí và giới hạn
Gói miễn phí: Cho phép sử dụng miễn phí phần lớn các công cụ cơ bản nhưng có hạn ngạch sử dụng hàng tháng
[XÁC NHẬN: magicschool.ai/pricing] .
Gói trả phí (MagicSchool Plus): Khoảng 8.33 – 12.99 USD/tháng (thanh toán năm ~99.96 – 119.88 USD/năm ~
2.500.000 – 3.000.000 VNĐ/năm); mở không giới hạn lượt dùng AI, mở khóa MagicStudent đầy đủ tính năng
[XÁC NHẬN: magicschool.ai/pricing, 2026] .
Bản địa hóa: Giao diện hỗ trợ tiếng Việt; xử lý văn bản tiếng Việt mượt mà; các bài học mang chuẩn quốc tế.
3. EDUAIDE.AI (eduaide.ai)
3.1. Danh mục cơ chế chơi & Kịch bản lớp học
Nền tảng AI chuyên sâu về thiết kế bài giảng với mô-đun AI Game & Gamification Builder độc đáo: Jeopardy Review
Game (sinh bảng câu hỏi phân tầng cấp độ), Bingo Game Generator (sinh bảng ô số/từ khóa Bingo ngẫu nhiên cho cả
lớp), Tic-Tac-Toe Choice Board (bảng cờ ca-rô 9 ô nhiệm vụ học tập), Battleship Review Game (bắn tàu tri thức),
Trashketball Rules & Questions (ném bóng vào sọt rác khi trả lời đúng), Escape Room Clues Generator (sinh các câu đố
manh mối giải mã), Taboo / Pictionary Prompts (bộ thẻ từ khóa cấm đoán/vẽ hình đoán chữ)
[XÁC NHẬN: eduaide.ai; educatorstechnology.com 2025] .
Thao tác & Kỹ năng: Học sinh tham gia trò chơi trực tiếp trên lớp (vận động, giơ thẻ, thảo luận nhóm) theo kịch bản
và luật chơi do AI thiết kế; rèn luyện khả năng làm việc nhóm, giao tiếp xã hội, phản xạ tư duy và ôn tập kiến thức.
Mẫu phổ biến nhất: Jeopardy, Bingo và Escape Room Clues.
Độ tuổi 3–6 tuổi: Không phù hợp; trẻ mầm non không thể tham gia các trò chơi giải đố phức tạp như Battleship hay
Escape Room Clues chữ.
Độ tuổi 6–11 tuổi: Rất phù hợp khi giáo viên dùng kịch bản của Eduaide để tổ chức các hoạt động vận động và trò
chơi tập thể ngay trong lớp học.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 7
Trang 4 / 11



## Trang 5

3.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt theo mô hình kịch bản văn bản (Text Script). Nội dung câu hỏi và luật chơi được
lưu trữ độc lập; giáo viên có thể sao chép sang tài liệu Word hoặc xuất bản ra PDF in giấy [XÁC NHẬN: eduaide.ai] .
Định dạng dữ liệu: JSON/Markdown Schema lưu trữ luật chơi, bảng câu hỏi và đáp án chi tiết.
Công nghệ hiển thị: Giao diện Web SPA soạn thảo văn bản hiện đại; hoàn toàn không có Game Engine để học sinh
mở link chơi kéo thả trực tiếp trên web [XÁC NHẬN: DevTools inspection trên eduaide.ai] .
Thêm loại game mới: Đội ngũ sáng lập Eduaide.ai trực tiếp lập trình các mẫu prompt sinh trò chơi mới.
3.3. Trải nghiệm khi chơi
Vòng trải nghiệm: Giáo viên dùng AI tạo kịch bản game (ví dụ Jeopardy) → Chiếu bảng câu hỏi lên máy chiếu hoặc in
thẻ câu hỏi ra giấy → Giáo viên điều hành trò chơi trong lớp học vật lý → Học sinh giơ tay giành quyền trả lời miệng
hoặc ghi bảng con → Giáo viên cộng điểm trên bảng phấn.
Xử lý sai: Giáo viên trực tiếp giải thích và chuyển lượt chơi cho đội khác trong lớp.
Đồng hồ, Xếp hạng: Giáo viên tự quản lý thời gian và điểm số trên lớp học thực tế.
Hiệu năng: Tốc độ sinh kịch bản cực nhanh trong vòng 5–10 giây [XÁC NHẬN: EdTech Impact Review] .
3.4. Tính năng AI
Tên & Ra mắt: Eduaide Generative AI Engine (ra mắt năm 2023, nâng cấp liên tục 2024–2026)
[XÁC NHẬN: eduaide.ai/about, 2026] .
Khả năng tự động hóa: Nhập chủ đề hoặc chuẩn đầu ra kiến thức → AI tự động thiết kế luật chơi, chia bảng điểm và
biên soạn danh sách câu hỏi phù hợp. Giáo viên vẫn phải làm tay: Tự chuẩn bị đạo cụ và tự tổ chức điều phối trò
chơi trong phòng học.
Tiếng Việt: Hỗ trợ tiếng Việt ở mức khá tốt qua mô hình LLM tích hợp.
Vai trò AI: AI là nền tảng cốt lõi 100% (AI-Native).
3.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC.
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Sinh được kịch bản trò chơi đố chữ con vật vũ trụ dạng Bingo
hoặc Tic-Tac-Toe, nhưng không có minigame web tương tác).
3.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (Dạng Bingo/Jeopardy): Bước 1: Mở eduaide.ai → Chọn mục "Teaching Assistant"
→ Chọn "Gamification". Bước 2: Chọn mẫu "Jeopardy Game". Bước 3: Nhập chủ đề "Đếm con vật phạm vi 10 lớp 1" →
Bấm Generate. Bước 4: AI sinh bảng 5 câu hỏi phân tầng điểm trong 5 giây. Bước 5: Sao chép kịch bản sang Word để
trình chiếu [XÁC NHẬN: Eduaide User Manual] .
Thời gian thực tế: Chỉ mất từ 1 đến 3 phút để hoàn thành kịch bản văn bản.
3.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Giáo viên in ra giấy hoặc trình chiếu văn bản lên bảng; học sinh tương tác trực tiếp bằng lời nói
hoặc bút viết trong lớp học truyền thống.
Tài khoản học sinh: Học sinh hoàn toàn không cần tài khoản hay thiết bị điện tử. Tuân thủ chuẩn bảo vệ quyền riêng
tư học đường FERPA và COPPA [XÁC NHẬN: eduaide.ai/privacy] .
Phụ huynh: Phụ huynh có thể dùng kịch bản để tổ chức trò chơi đố vui gia đình.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 7
Trang 5 / 11



## Trang 6

3.8. Chi phí và giới hạn
Gói miễn phí: Cho phép dùng thử với hạn ngạch 15 lượt sinh tài liệu AI mỗi tháng [XÁC NHẬN: eduaide.ai/pricing] .
Gói trả phí (Eduaide Pro): 5.99 USD/tháng hoặc 49.99 USD/năm (~1.250.000 VNĐ/năm); mở không giới hạn lượt tạo
AI, lưu trữ không giới hạn tài liệu [XÁC NHẬN: eduaide.ai/pricing, 2026] .
Bản địa hóa: Giao diện bằng tiếng Anh; hỗ trợ sinh nội dung tiếng Việt có dấu chuẩn xác; phong cách kịch bản mang
tính sư phạm quốc tế.
4. EDPUZZLE (edpuzzle.com)
4.1. Danh mục cơ chế chơi & Tương tác
Nền tảng chuyển đổi video bài giảng thụ động thành bài học tương tác có kiểm soát: Multiple Choice Checkpoints
(video tự động dừng lại ở mốc giây định sẵn để hiện câu hỏi trắc nghiệm), Open-ended Questions (câu hỏi tự luận yêu
cầu gõ câu trả lời sau đoạn video), Notes with Voice Over (điểm dừng bổ sung lời giảng giải bằng giọng nói của cô
giáo), Prevent Skipping (khóa tính năng tua nhanh, học sinh bắt buộc phải xem trọn vẹn video mới được trả lời),
Edpuzzle Live Mode (giáo viên chiếu video trên màn hình lớn cả lớp cùng dừng lại trả lời câu hỏi trên máy cá nhân)
[XÁC NHẬN: edpuzzle.com; commonsense.org/education/reviews/edpuzzle] .
Thao tác & Kỹ năng: Xem video bài giảng; đọc câu hỏi tại điểm dừng; bấm chọn đáp án trắc nghiệm hoặc gõ câu trả
lời; rèn khả năng lắng nghe chủ động (Active Listening), quan sát chi tiết thị giác và tập trung tiếp thu kiến thức. Mẫu
phổ biến nhất: Multiple Choice Checkpoints.
Độ tuổi 3–6 tuổi: Không phù hợp; trẻ mầm non xem video như một câu chuyện liền mạch, việc video liên tục bị dừng
lại để hiện chữ trắc nghiệm gây đứt gãy cảm xúc và khó thao tác.
Độ tuổi 6–11 tuổi: Rất phù hợp từ lớp 3–5 trong mô hình lớp học đảo ngược (Flipped Classroom) hoặc tự học ở nhà.
4.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Gắn chặt với dòng thời gian (Timeline) của video. Các câu hỏi được ghim vào mốc thời gian
cụ thể (Timecode Markers); không thể chuyển đổi 1-click sang minigame thẻ bài [XÁC NHẬN: support.edpuzzle.com] .
Định dạng dữ liệu: JSON Video Lesson Schema: {video_url, stops: [{time_in_seconds, type,
question, choices: [{text, isCorrect}]}]} lưu trữ trên Google Cloud Platform.
Công nghệ hiển thị: Trình phát video HTML5 Video Player kết hợp iframe YouTube API; lớp phủ câu hỏi (Interaction
Overlay) dựng bằng HTML5 DOM và CSS3; đồng bộ điểm số trực tiếp vào Gradebook
[XÁC NHẬN: DevTools inspection trên edpuzzle.com] .
Thêm loại game mới: Hoàn toàn do đội ngũ kỹ sư Edpuzzle Inc. lập trình và phát hành.
4.3. Trải nghiệm khi chơi
Vòng chơi: Học sinh bấm xem video → Đến phút 01:15 video tự động đóng băng (Pause) → Hộp thoại câu hỏi trượt
ra bên cạnh → Học sinh bấm chọn đáp án đúng → Bấm "Submit" → Nếu đúng hiện màu xanh kèm điểm thưởng; Nếu
sai hiện màu đỏ và xuất hiện nút "Re-watch" (tự động tua lại đúng đoạn video vừa giảng để xem lại) → Bấm
"Continue" để video chạy tiếp → Kết thúc video hiển thị bảng điểm tổng kết.
Xử lý sai: Báo sai, cung cấp nút "Re-watch" để học sinh xem lại đoạn kiến thức bị hổng trước khi làm tiếp.
Đồng hồ, Xếp hạng: Không có đồng hồ đếm ngược; không có bảng xếp hạng đối kháng; tập trung vào sự tiếp thu cá
nhân.
Hiệu năng: Tải video cực nhanh từ nguồn YouTube/Vimeo, chuyển động mượt mà không bị giật hình
[XÁC NHẬN: EdTech Digest Review] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 7
Trang 6 / 11



## Trang 7

4.4. Tính năng AI
Tên & Ra mắt: Edpuzzle AI / Teacher Assist (ra mắt giai đoạn 2023–2024, nâng cấp toàn diện 2025–2026)
[XÁC NHẬN: edpuzzle.com/teacher-assist, 2026] .
Khả năng tự động hóa: Độc đáo nhất nhóm: AI tự động xem và phân tích toàn bộ phụ đề/nội dung âm thanh của
video YouTube, sau đó tự động xác định các đoạn kiến thức trọng tâm và tự động tạo các câu hỏi trắc nghiệm ghim
vào đúng mốc giây của video chỉ trong 10 giây. Giáo viên vẫn phải làm tay: Duyệt câu hỏi, chỉnh sửa nếu cần và gán
bài cho lớp.
Tiếng Việt: Hỗ trợ video tiếng Việt rất tốt nếu video có âm thanh rõ ràng hoặc phụ đề tiếng Việt.
Vai trò AI: AI là tính năng trợ lực đắc lực (Power Feature) giúp giảm 80% thời gian soạn bài cho giáo viên.
4.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC (Chỉ trả lời trắc nghiệm dừng video).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Chọn video phim hoạt hình các con vật du hành vũ trụ và dùng
Edpuzzle AI ghim câu hỏi từ vựng).
4.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (Dùng Edpuzzle AI): Bước 1: Dán link video YouTube dạy đếm con vật lớp 1 vào
Edpuzzle. Bước 2: Bấm nút "Generate Questions" (Teacher Assist AI). Bước 3: AI tự động phân tích video và ghim 5
câu hỏi trắc nghiệm vào đúng các thời điểm con vật xuất hiện. Bước 4: Giáo viên bấm duyệt từng câu. Bước 5: Bấm
"Assign" giao cho lớp học [XÁC NHẬN: Edpuzzle Help Center] .
Thời gian thực tế: Tạo thủ công mất từ 15 đến 25 phút; dùng Teacher Assist AI rút ngắn chỉ còn 2 đến 3 phút.
4.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ link bài học, mã lớp học, tích hợp sâu vào Google Classroom, Microsoft Teams, Canvas.
Hỗ trợ chế độ tự học ở nhà hoặc Edpuzzle Live trên lớp.
Tài khoản học sinh: Học sinh có thể tham gia qua mã lớp mà không cần email cá nhân. Đạt chứng nhận quyền riêng
tư iKeepSafe, tuân thủ nghiêm ngặt COPPA, FERPA [XÁC NHẬN: edpuzzle.com/privacy] .
Phụ huynh: Phụ huynh có thể cùng con xem video bài giảng và theo dõi kết quả trả lời.
4.8. Chi phí và giới hạn
Gói miễn phí (Basic): Giới hạn dung lượng lưu trữ tối đa 20 video bài giảng, mở đầy đủ tính năng AI Teacher Assist
[XÁC NHẬN: edpuzzle.com/pricing] .
Gói trả phí (Pro Teacher): 12.50 USD/tháng (~150.00 USD/năm ~ 3.750.000 VNĐ/năm); mở không giới hạn dung
lượng lưu trữ video; gói trường học cấp bản quyền toàn diện [XÁC NHẬN: edpuzzle.com/pricing, 2026] .
Bản địa hóa: Giao diện hỗ trợ tiếng Việt; hiển thị phông chữ tiếng Việt chuẩn xác; khai thác trực tiếp kho video tiếng
Việt khổng lồ trên YouTube.
5. FLIPPITY (flippity.net)
5.1. Danh mục cơ chế chơi & Trò chơi hướng dữ liệu
Nền tảng tiên phong về kiến trúc chuyển đổi dữ liệu bảng tính thành hơn 25 webgame tương tác giáo dục hoàn toàn
miễn phí: Flippity Flashcards (thẻ ghi nhớ 2 mặt có hỗ trợ phát âm và hình ảnh), Flippity Quiz Show (game show đố vui
kiểu Jeopardy 6 cột x 5 hàng), Flippity Random Name Picker (vòng quay may mắn, chia nhóm ngẫu nhiên, xếp hàng),
Flippity Scavenger Hunt (ổ khóa số mở mật mã từng chặng), Flippity Matching Game (lật thẻ tìm cặp hình/từ), Flippity
Bingo, Flippity Board Game (bàn cờ xúc xắc phiêu lưu), Flippity Word Search, Flippity Crossword, Flippity Timeline
[XÁC NHẬN: flippity.net; blog.tcea.org/flippity-templates] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 7
Trang 7 / 11



## Trang 8

Thao tác & Kỹ năng: Lật thẻ flashcard; quay bánh xe ngẫu nhiên; kéo ghép thẻ bài (Matching); gõ mật khẩu mở khóa
(Scavenger Hunt); tung xúc xắc ảo (Board Game); rèn luyện trí nhớ từ vựng, phản xạ nhận thức và kích thích sự hồi
hộp ngẫu nhiên trong lớp học. Mẫu phổ biến nhất: Flippity Flashcards, Quiz Show và Random Name Picker.
Độ tuổi 3–6 tuổi: Rất phù hợp với Random Name Picker (vòng quay tên gọi các bé lên bảng) và Matching Game
(ghép cặp hình ảnh con vật ngộ nghĩnh).
Độ tuổi 6–11 tuổi: Rất phù hợp cho toàn bộ học sinh tiểu học luyện từ vựng và tham gia các trò chơi ôn tập tập thể
trên lớp.
5.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: CHUẨN MỰC DATA-DRIVEN ARCHITECTURE TUYỆT ĐỐI. Toàn bộ nội dung trò chơi nằm
100% trong một trang tính Google Sheets (hoặc tệp CSV). Mẫu webgame (Template) hoàn toàn không chứa dữ liệu.
Khi thay đổi bất kỳ ô chữ nào trên Google Sheets, webgame tự động cập nhật ngay khi tải lại trang
[XÁC NHẬN: flippity.net/about.htm] .
Định dạng dữ liệu: Google Sheets Tables (cột Card 1, Card 2, Color, Audio Language, Image URL) được xuất bản công
khai qua Google Sheets API.
Công nghệ hiển thị: Frontend thuần Client-side (Vanilla HTML5, CSS3 và JavaScript); tải dữ liệu JSON bất đồng bộ từ
Google Sheets; không cần cơ sở dữ liệu server riêng [XÁC NHẬN: Source Code inspect trên flippity.net] .
Thêm loại game mới: Tác giả Steve Fortna trực tiếp lập trình và phát hành các mẫu HTML/JS mới.
5.3. Trải nghiệm khi chơi
Vòng chơi: Giáo viên/học sinh mở liên kết flippity.net/?k=... → Giao diện game xuất hiện ngay lập tức → Học sinh
bấm lật thẻ hoặc quay vòng quay → Phản hồi chuyển động và âm thanh tích tắc vui tai → Hoàn thành nhiệm vụ hiển
thị thời gian hoàn thành.
Xử lý sai: Thẻ bài lật úp lại (trong game Matching) hoặc khóa chưa mở (trong Scavenger Hunt), cho phép thử lại
không giới hạn.
Đồng hồ, Xếp hạng: Một số game có đồng hồ bấm giờ (Stopwatch); không có bảng xếp hạng máy chủ; linh vật mang
phong cách đồ họa phẳng tối giản.
Hiệu năng: Tải siêu tốc trong dưới 1 giây; cực kỳ nhẹ và tương thích trên mọi thiết bị từ điện thoại đến máy tính bảng
[XÁC NHẬN: TCEA EdTech Review] .
5.4. Tính năng AI
Thực trạng AI: HOÀN TOÀN KHÔNG CÓ TÍNH NĂNG AI (0% AI) [XÁC NHẬN: flippity.net, 2026] . Nền tảng hoạt động
thuần túy dựa trên các hàm logic JavaScript đọc dữ liệu bảng tính.
Quy trình biên tập: Giáo viên phải tự gõ từng hàng/cột dữ liệu vào Google Sheets thủ công.
Tiếng Việt: Hỗ trợ tiếng Việt hoàn hảo nhờ Google Sheets xử lý chuẩn Unicode UTF-8; hỗ trợ tự động phát âm Text-to-
Speech tiếng Việt (chỉ cần đặt mã ngôn ngữ là vi trong cột Audio) [XÁC NHẬN: flippity.net/Flashcards.htm] .
Vai trò AI: Không có AI trong hệ thống.
5.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC (Không có thao tác kéo thả vào vùng chứa linh hoạt).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Dùng Flippity Matching Game, dán ảnh con vật và ảnh vũ trụ vào
các thẻ bài).
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 7
Trang 8 / 11



## Trang 9

5.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (Flippity Matching): Bước 1: Truy cập flippity.net → Bấm "Template" mẫu
Matching Game để copy Google Sheets. Bước 2: Xóa dữ liệu mẫu, gõ 5 dòng: Cột Mặt trước là link ảnh con vật, Cột
Mặt sau là số lượng. Bước 3: Vào File → Share → Publish to web. Bước 4: Chuyển sang tab "Get the Link Here" để lấy
đường link chơi game [XÁC NHẬN: Flippity Instructions Guide] .
Thời gian thực tế: Nếu giáo viên thành thạo thao tác Google Sheets mất từ 5 đến 10 phút; nếu chưa thạo chia sẻ
web dễ bị lỗi mất 15 đến 20 phút.
5.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ bằng đường link web duy nhất, mã QR, chia sẻ vào Google Classroom. Giáo viên chiếu lên
máy chiếu hoặc gửi link cho học sinh tự chơi.
Tài khoản học sinh: 100% Không cần tài khoản; hệ thống không thu thập bất kỳ dữ liệu cá nhân nào; tuyệt đối an
toàn dữ liệu trẻ em theo COPPA và GDPR [XÁC NHẬN: flippity.net/about.htm] .
Phụ huynh: Phụ huynh mở link trên điện thoại cho con chơi mượt mà không cần cài đặt.
5.8. Chi phí và giới hạn
Chi phí: HOÀN TOÀN MIỄN PHÍ 100%, không có gói thương mại, không có quảng cáo, duy trì phi lợi nhuận bởi tác giả
Steve Fortna [XÁC NHẬN: flippity.net/about.htm] .
Bản địa hóa: Giao diện hướng dẫn bằng tiếng Anh; tuy nhiên hỗ trợ dữ liệu tiếng Việt có dấu chuẩn 100%; có giọng
đọc TTS tiếng Việt chuẩn Google Speech.
PHẦN C – BA BẢNG TỔNG HỢP SO SÁNH KỸ THUẬT
Bảng C1 – Cơ chế chơi:
Nền tảng
Tên mẫu
Thao tác chính
Kỹ năng luyện
Hợp 3–6
tuổi
Hợp 6–
11 tuổi
Nguồn
Diffit
Leveled Text
Reader
Đọc bài văn phân
hóa, chọn đáp án
Đọc hiểu phân
tích, từ vựng
Không
(nhiều
chữ)
Rất hợp
(lớp 2-5)
[XÁC NHẬN]  diffit.me
Diffit
Multiple Choice
Quiz
Bấm chọn đáp án
trên Forms/Docs
Tự kiểm tra đọc
hiểu
Không
Rất hợp
[XÁC NHẬN]
techlearning.com
MagicSchool
Multiple Choice
Assessment
Đọc đề, chọn đáp
án trắc nghiệm chữ
Kiểm tra kiến thức
chuẩn
Không
Rất hợp
(lớp 3-5)
[XÁC NHẬN]
magicschool.ai
MagicSchool
Raina AI Tutor
Gõ văn bản đàm
thoại gợi mở với AI
Tư duy phản biện,
tự học
Không
(cần gõ)
Rất hợp
(lớp 4-5)
[XÁC NHẬN]  edweek.org
Eduaide.ai
Jeopardy Review
Game
Trả lời câu hỏi theo
bảng điểm lớp
Phản xạ, làm việc
nhóm lớp
Không
(nhiều
chữ)
Rất hợp
(lớp 2-5)
[XÁC NHẬN]  eduaide.ai
Eduaide.ai
Bingo Game
Generator
Lắng nghe câu hỏi,
đánh dấu ô Bingo
Nhận diện khái
niệm, tập trung
Không
Rất hợp
[XÁC NHẬN]
educatorstechnology.com
Edpuzzle
Multiple Choice
Checkpoints
Xem video, dừng lại
chọn trắc nghiệm
Lắng nghe chủ
động, quan sát
Không
(khó thao
tác)
Rất hợp
(lớp 3-5)
[XÁC NHẬN]
edpuzzle.com
Edpuzzle
Open-ended
Questions
Xem video, gõ câu
trả lời tự luận
Diễn đạt ý tưởng,
tư duy sâu
Không
Rất hợp
[XÁC NHẬN]
commonsense.org
Flippity
Flippity Matching
Game
Chạm lật 2 thẻ bài
tìm cặp hình/từ
Ghi nhớ thị giác
ngắn hạn
Rất hợp
(dùng
ảnh)
Rất hợp
[XÁC NHẬN]  flippity.net
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 7
Trang 9 / 11



## Trang 10

Nền tảng
Tên mẫu
Thao tác chính
Kỹ năng luyện
Hợp 3–6
tuổi
Hợp 6–11
tuổi
Nguồn
Flippity
Random Name Picker
Chạm quay vòng bánh
xe ngẫu nhiên
Hào hứng, công bằng
lớp học
Rất hợp
(vui nhộn)
Rất hợp
[XÁC NHẬN]
blog.tcea.org
Bảng C2 – So sánh nền tảng:
Nền tảng
Tách nội
dung khỏi
mẫu
Định dạng
dữ liệu
Công nghệ
hiển thị
AI làm
được
bước
nào
AI là
phụ
hay lõi
Tiếng
Việt
Giá gói
trả phí
Học sinh
cần tài
khoản
Nguồn
Diffit
Có (1 Text
$\rightarrow$
Đa Template)
JSON
Leveled
Schema
React SPA
(Xuất
Docs/Forms)
AI bóc
tách tài
liệu, hạ
cấp, sinh
quiz
Lõi
(Core
AI)
Rất tốt
(Sinh
tiếng
Việt)
99.00 –
119.00
USD/năm
Không cần
(Link)
[XÁC NHẬN]
diffit.me
MagicSchool
Có
(Structured
Text)
JSON /
Markdown
Chains
React /
Next.js
Dashboard
AI sinh
câu hỏi,
giáo án,
rubric
Lõi
(Core
AI)
Rất tốt
(Hiểu
tiếng
Việt)
99.96 –
119.88
USD/năm
Không cần
(Forms)
[XÁC NHẬN]
magicschool.ai
Eduaide.ai
Có (Text
Script kịch
bản)
JSON /
Markdown
Schema
Web SPA
(Không
Game
Engine)
AI Game
Builder
sinh kịch
bản
Lõi
(Core
AI)
Khá
(Sinh
kịch
bản
TV)
49.99
USD/năm
(Pro)
Không cần
(Giấy/bảng)
[XÁC NHẬN]
eduaide.ai
Edpuzzle
Không
(Timecode
Video)
JSON
Video
Markers
Schema
HTML5 Video
+ DOM
Overlay
Teacher
Assist AI
ghim
câu hỏi
tự động
Phụ
(Power
Tool)
Tốt
(Nhận
diện
video
TV)
150.00
USD/năm
(Pro)
Không bắt
buộc
[XÁC NHẬN]
edpuzzle.com
Flippity
Có tuyệt đối
(Data-Driven)
Google
Sheets
Tables
Vanilla JS +
HTML5/CSS3
Không
có AI
Không
có
Rất tốt
(Có
TTS
tiếng
Việt)
Miễn phí
100%
Không cần
(Link)
[XÁC NHẬN]
flippity.net
Bảng C3 – Mô tả ngoài mẫu:
Nền tảng
Mô tả a
Mô tả b
Mô tả c
Mô tả d
Diffit
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Sinh bài đọc
và quiz chữ về con vật vũ trụ)
MagicSchool
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Sinh kịch
bản câu hỏi con vật vũ trụ)
Eduaide.ai
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Sinh bảng
Jeopardy/Bingo con vật vũ
trụ)
Edpuzzle
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Ghim câu
hỏi vào video phim hoạt hình
vũ trụ)
Flippity
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Dán ảnh con
vật vũ trụ lên thẻ Matching)
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 7
Trang 10 / 11



## Trang 11

Ghi chú: Nhóm 7 bộc lộ khoảng trống thị trường lớn nhất: AI rất thông minh nhưng chỉ sinh văn bản tĩnh (Diffit, MagicSchool, Eduaide);
còn Flippity tách dữ liệu xuất sắc nhưng thiếu AI sinh tự động. Đề tài của nhóm chính là điểm giao thoa: dùng AI sinh JSON DSL và kết
xuất thành Game Canvas 2D mượt mà.
PHẦN D – DANH SÁCH ĐIỂM CẦN TỰ ĐĂNG NHẬP KIỂM TRA THỰC NGHIỆM [CẦN TỰ THỬ]
Để hoàn thiện các luận cứ thực chứng phục vụ bảo vệ khóa luận tốt nghiệp trước hội đồng, sinh viên cần tiến hành các
bước kiểm thử thực tế và chụp màn hình lưu vết đối với 5 điểm kỹ thuật sau:
1. Kiểm tra năng lực sinh bài đọc phân cấp độ tiếng Việt của Diffit AI:
• Hành động: Truy cập beta.diffit.me; nhập chủ đề: "Sự tích quả dưa hấu và Mai An Tiêm"; chọn độ tuổi Lớp 1 (Grade 1) và
ngôn ngữ Vietnamese; bấm tạo bài học.
• Bằng chứng cần chụp: Bấm giờ thực tế (đối chiếu tiêu chí < 15 giây); chụp ảnh màn hình bài đọc tiếng Việt và bộ câu hỏi
trắc nghiệm sinh ra để chứng minh khả năng hiểu ngữ liệu văn hóa Việt Nam của Diffit.
2. Khảo sát tính năng AI Game Builder trên Eduaide.ai:
• Hành động: Đăng nhập eduaide.ai; vào phân hệ Gamification; chọn tạo trò chơi "Jeopardy Review Game" với chủ đề
phép cộng phạm vi 10.
• Bằng chứng cần chụp: Ảnh chụp màn hình kết quả sinh ra chỉ là bảng biểu văn bản chữ thuần túy (Text/Table), hoàn
toàn không có nút chạy minigame tương tác web để chứng minh sự thiếu hụt Game Engine.
3. Kiểm tra tốc độ tự động ghim câu hỏi của Edpuzzle Teacher Assist AI từ video YouTube:
• Hành động: Dán 1 link video YouTube hoạt hình dạy đếm số tiếng Việt vào Edpuzzle; kích hoạt nút Teacher Assist AI để
hệ thống tự quét và sinh điểm dừng câu hỏi.
• Bằng chứng cần chụp: Ảnh chụp thanh Timeline của video xuất hiện các chấm tròn mốc câu hỏi tự động và nội dung
câu hỏi trắc nghiệm tiếng Việt do AI sinh ra.
4. Kiểm nghiệm triết lý Data-Driven của Flippity qua Google Sheets:
• Hành động: Copy 1 mẫu Flippity Matching Game trên Google Sheets; sửa một ô chữ từ vựng tiếng Việt; tải lại liên kết
webgame Flippity.
• Bằng chứng cần chụp: Ảnh chụp trang tính Google Sheets và ảnh chụp màn hình webgame cập nhật ngay lập tức từ
vựng mới mà không cần biên dịch lại mã nguồn.
5. Kiểm tra tính năng phát âm Text-to-Speech tiếng Việt trên Flippity Flashcards:
• Hành động: Tạo 1 bộ thẻ Flashcards trên Flippity với cột Audio cài mã vi và nội dung từ vựng tiếng Việt có dấu (ví dụ:
"quả sầu riêng").
• Bằng chứng cần chụp: Video/Ảnh chụp màn hình lúc bấm vào biểu tượng loa phát âm và ghi chú chất lượng giọng đọc
tiếng Việt của Google Speech API.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 7
Trang 11 / 11
