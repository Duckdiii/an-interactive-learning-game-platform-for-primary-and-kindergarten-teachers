# Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 6 - Đa Phương Thức & Phiếu Bài Tập

> **Nghiên cứu chuyên sâu**: [[Khảo sát 7 nhóm nền tảng đối thủ]] | [[Báo Cáo Khảo Sát Nhóm 6 - Đa Phương Thức & Phiếu Bài Tập|Khảo sát tổng quan Nhóm 6: Đa Phương Thức & Phiếu Bài Tập]]



> **Tài liệu nguồn gốc**: `Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 6 - Đa Phương Thức & Phiếu Bài Tập.pdf`  
> **Tổng số trang**: 14  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

BÁO CÁO NGHIÊN CỨU KỸ THUẬT • KHÓA LUẬN TỐT NGHIỆP
Khảo Sát Toàn Diện Nhóm 6: Đa Phương Thức Cho Mầm Non & Số Hóa
Phiếu Bài Tập
Phân hệ: TinyTap, Seesaw, Boom Cards, Liveworksheets, Topworksheets, Wizer.me • Đơn vị khảo sát: Nhóm Khóa Luận AI Game
Generator • Cập nhật: 11/2026
PHẦN A – TÓM TẮT NHÓM & BÀI HỌC THIẾT KẾ AI GAME GENERATOR
Điểm chung của Nhóm 6: Nhóm đại diện cho hai phân cực sư phạm: (1) Học tập đa phương thức (Multimodal Early
Learning - TinyTap, Seesaw, Boom Cards) dành cho trẻ mầm non và đầu tiểu học, ưu tiên giọng đọc thuyết minh, hình ảnh
trực quan và thao tác chạm/kéo thả; (2) Số hóa phiếu bài tập giấy (Interactive Worksheets - Liveworksheets, Topworksheets,
Wizer.me) 
chuyển 
đổi 
tệp 
PDF/Word 
tĩnh 
thành 
tài 
liệu 
tương 
tác 
tự 
chấm 
điểm 
trực 
tuyến
[XÁC NHẬN: tinytap.com; web.seesaw.me; boomlearning.com; liveworksheets.com] .
Bài học quan trọng nhất cho hệ thống AI Game Generator: (1) Triệt tiêu văn bản dài & Tích hợp giọng đọc AI: Học sinh 5–7
tuổi (Mầm non / Lớp 1) chưa đọc thông viết thạo. Từ bài học của TinyTap và Boom Cards, hệ thống bắt buộc phải loại bỏ
văn bản câu hỏi phức tạp, tự động truy vấn hình ảnh hoạt họa an toàn qua Pexels/Iconify API và tích hợp công nghệ Text-
to-Speech (Microsoft Edge TTS / FPT.AI Voice) để đọc to đề bài bằng tiếng Việt chuẩn ngữ âm (FR-07, FR-12). (2) Vượt qua
"Nỗi đau vẽ hộp tọa độ thủ công": Điểm hạn chế chí tử của Liveworksheets, Boom Cards và Wizer.me là giáo viên phải mất
30 đến 45 phút ngồi dùng chuột vẽ từng ô nhận diện (Hotspots / Drop zones) và căn chỉnh tọa độ x,y thủ công. Đề tài của
nhóm tạo ra bước đột phá cốt lõi: Ứng dụng LLM Structured Output sinh cấu trúc Game JSON DSL chuẩn hóa, Game
Engine Canvas 2D (react-konva) tự động tính toán layout, tự canh tọa độ và tự gắn hitbox thông minh trong dưới 3 giây.
PHẦN B – NGHIÊN CỨU CHI TIẾT TỪNG NỀN TẢNG (08 TIÊU CHÍ)
1. TINYTAP & TINYTAP AI (tinytap.com - Thuộc Animoca Brands)
1.1. Danh mục cơ chế chơi
Nền tảng số 1 thế giới về tạo sách nói tương tác và trò chơi giáo dục mầm non (2–8 tuổi): Ask a Question (bé nghe câu
hỏi âm thanh và chạm vào hình ảnh đúng trên màn hình), Sound Board (chạm vào các đối tượng trên tranh để nghe tên
gọi, tiếng con vật hoặc phát âm), Shape Puzzle / Cutout Puzzle (kéo các mảnh hình cắt ghép vào đúng vị trí khuyết trên
bức tranh), Say Something (sách tranh lật trang có giọng đọc dẫn dắt), Talk / Sound Matching (ghi âm giọng nói của bé
để so khớp), TinyTap AI Prompt-to-Game (tự động tạo chuỗi 5–7 màn hoạt động học tập từ một câu lệnh chủ đề)
[XÁC NHẬN: tinytap.com/about; animocabrands.com/tinytap-ai] .
Thao tác & Kỹ năng: Chạm nghe âm thanh (Sound Board, Ask a Question); kéo thả ghép mảnh hình (Puzzle); lật trang
sách (Say Something); rèn luyện khả năng phân biệt thính giác, liên kết âm thanh - hình ảnh, phối hợp tay - mắt và mở
rộng vốn từ vựng khởi đầu. Mẫu phổ biến nhất: Ask a Question và Sound Board.
Độ tuổi 3–6 tuổi: Hoàn hảo tuyệt đối; là chuẩn mực thiết kế UX/UI cho trẻ mầm non vì 100% hướng dẫn bằng giọng
nói, hình vẽ sinh động và vùng chạm rất rộng.
Độ tuổi 6–11 tuổi: Phù hợp cho lớp 1–2 học đọc tiếng Anh; từ lớp 3 trở lên các hoạt động trở nên quá đơn giản so với
nhận thức của học sinh.
1.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Ở chế độ biên tập thủ công truyền thống, tranh vẽ và vùng tương tác được vẽ đè trực tiếp
lên từng trang slide sách tranh. Tuy nhiên, ở phiên bản TinyTap AI Engine, nội dung được tách rời thành cấu trúc
JSON kịch bản (Narrative Scene DSL) rồi mới kết xuất thành các trang hoạt động
[XÁC NHẬN: TinyTap AI Whitepaper 2024] .
Định dạng dữ liệu: Dữ liệu gói bài học (TinyTap Course Format) lưu trữ đám mây bao gồm các trang sách, mảng tọa
độ vùng chạm (Hotspots: x, y, width, height), tệp âm thanh giọng đọc và nhãn phân loại độ tuổi.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 1 / 14



## Trang 2

Công nghệ hiển thị: HTML5 Canvas 2D / WebGL mượt mà trên nền Web; ứng dụng di động gốc (Native App
iOS/Android) tối ưu hóa cảm ứng chạm đa điểm cho trẻ nhỏ; tích hợp Web Audio API phát âm thanh tức thì
[XÁC NHẬN: DevTools inspection trên tinytap.com] .
Thêm loại game mới: Đội ngũ kỹ sư phần mềm của TinyTap Studio lập trình và phát hành qua các bản cập nhật ứng
dụng.
1.3. Trải nghiệm khi chơi
Vòng chơi: Bé mở bài học → Giọng đọc thuyết minh truyền cảm cất lên hướng dẫn nhiệm vụ (ví dụ: "Bé hãy chạm vào
chú gấu màu nâu nhé!") → Bé chạm ngón tay vào hình chú gấu → Hoạt cảnh rung rinh nảy múa kèm tiếng khen ngợi
vui vẻ ("Đúng rồi, bé giỏi quá!") → Tự động lật sang trang tiếp theo → Hoàn thành bài học nhận huy hiệu hoạt hình và
tiếng vỗ tay rộn rã.
Xử lý sai: Khi chạm sai đối tượng, âm thanh nhắc nhở nhẹ nhàng ("Chưa đúng rồi, bé thử lại xem sao") cất lên, không
có âm thanh còi báo gắt hay trừ điểm, cho phép bé thử lại không giới hạn.
Đồng hồ, Xếp hạng, Mascot: Tuyệt đối không có đồng hồ đếm ngược; không có bảng xếp hạng đối kháng; linh vật
hoạt hình chú chim xanh TinyTap đồng hành cùng trẻ.
Hiệu năng: Tối ưu hóa cực kỳ mượt mà trên iPad và máy tính bảng; hình ảnh vector sắc nét, âm thanh không bị trễ
nhịp [XÁC NHẬN: App Store 4.7-star rating] .
1.4. Tính năng AI
Tên & Ra mắt: TinyTap AI (AI Game Creator) (ra mắt phiên bản beta cuối 2022, thương mại hóa chính thức 2023–
2026) [XÁC NHẬN: animocabrands.com/tinytap-launches-ai-game-generator, 2024] .
Khả năng tự động hóa: Tiên phong trong mô hình Prompt-to-Activity: giáo viên/phụ huynh chỉ cần gõ một câu lệnh
chủ đề (ví dụ: "Vòng đời của bướm cho bé 4 tuổi"), AI tự động sinh kịch bản sư phạm, tự sinh hình ảnh minh họa bằng
Generative Diffusion AI, tự sinh giọng đọc AI TTS và tự tạo các màn chạm/ghép hình hoàn chỉnh trong dưới 1 phút.
Giáo viên chỉ cần làm tay: Kiểm duyệt nội dung và bấm xuất bản.
Tiếng Việt: Kho tài nguyên và mô hình AI của TinyTap được huấn luyện chủ đạo bằng Tiếng Anh; tính năng AI Prompt
tiếng Việt xử lý chưa hoàn thiện, giọng đọc AI tiếng Việt phát âm lơ lớ và sai dấu thanh ngữ điệu
[SUY LUẬN: từ kiểm thử LLM đa ngôn ngữ chưa bản địa hóa TTS] .
Vai trò AI: AI đang là trọng tâm chiến lược cốt lõi (Core Pillar) để xây dựng chợ học liệu mở Web3 của nền tảng.
1.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC (Không có physics engine cân bằng trọng lượng).
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC TỰ ĐỘNG (Chỉ hỗ trợ dạng bé chạm vào chữ cái khi nghe đọc, không có chấm
điểm nét đồ chữ).
c. Nghe đọc kéo táo vào giỏ: LÀM ĐƯỢC XUẤT SẮC (Có sẵn cơ chế Shape Puzzle / Sound Question: giọng đọc tự
động phát âm và bé kéo mảnh hình quả táo ghép vào khung giỏ).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM ĐƯỢC (TinyTap AI có thể tạo câu chuyện hoạt hình chủ đề các loài vật du
hành vũ trụ).
1.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (TinyTap AI): Bước 1: Mở app/web TinyTap → Chọn "Create with AI". Bước 2: Nhập
prompt "Counting animals from 1 to 5 for kindergarten" → Chọn độ tuổi 4–5. Bước 3: Chờ 45 giây để AI tự động vẽ
tranh, sinh câu hỏi và tạo giọng đọc cho 5 trang sách. Bước 4: Chơi thử nghiệm thu và bấm xuất bản
[XÁC NHẬN: TinyTap Creator Guide] .
Thời gian thực tế: Tạo thủ công bằng tay (tự vẽ vùng chạm và ghi âm từng câu) mất từ 25 đến 40 phút; dùng TinyTap
AI rút ngắn chỉ còn 1 đến 2 phút.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 2 / 14



## Trang 3

1.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua đường link web trực tiếp, mã PIN lớp học, chia sẻ lên TinyTap Marketplace. Phù hợp
cho trẻ chơi cá nhân trên iPad hoặc giáo viên trình chiếu trên Smart TV mầm non.
Tài khoản học sinh: Học sinh có thể chơi bài học được chia sẻ không cần tài khoản; nếu phụ huynh muốn lưu lịch sử
học tập thì đăng ký tài khoản gia đình. Đạt chứng nhận kidSAFE Certified, tuân thủ nghiêm ngặt COPPA
[XÁC NHẬN: tinytap.com/privacy] .
Phụ huynh: TinyTap thiết kế tối ưu cho phụ huynh đồng hành cùng con tự học tại nhà.
1.8. Chi phí và giới hạn
Gói miễn phí: Cho phép tạo và chơi thử một số lượng trò chơi rất hạn chế; thư viện bài học bị khóa phần lớn nội dung
trả phí [XÁC NHẬN: tinytap.com/pricing] .
Gói trả phí (TinyTap Premium / Family): Khoảng 8.25 – 12.00 USD/tháng (thanh toán năm ~99.00 – 144.00
USD/năm ~ 2.450.000 – 3.600.000 VNĐ/năm); chi phí rất đắt đỏ so với thu nhập của giáo viên mầm non công lập
Việt Nam [XÁC NHẬN: Apple App Store TinyTap Subscription, 2026] .
Bản địa hóa: Giao diện và 95% tài nguyên bằng tiếng Anh; không có giọng đọc tiếng Việt bản ngữ chuẩn; nội dung bài
học mang phong cách văn hóa phương Tây.
2. SEESAW (web.seesaw.me - Seesaw Learning)
2.1. Danh mục cơ chế chơi & Tương tác
Hệ sinh thái học tập đa phương thức (Multimodal Learning Experience) số 1 dành riêng cho bậc Mầm non và Tiểu học
(PreK–Grade 5): Multimodal Drawing Canvas (không gian tương tác tự do tích hợp: công cụ vẽ tay bút dạ/bút highlight,
hộp chữ Text Box, tải ảnh/chụp ảnh, quay video ngắn, ghi âm giọng nói giải thích Voice Recording), Draggable Elements
(kéo thả các đối tượng/nhãn dán sticker), Shape Stencils (khuôn hình học), Frames & Templates, Voice Labels (chạm
vào 
biểu 
tượng 
loa 
để 
nghe 
hướng 
dẫn 
của 
giáo 
viên), 
Formative 
Assessment 
Check-ins
[XÁC NHẬN: seesaw.com/features; commonsensemedia.org] .
Thao tác & Kỹ năng: Dùng ngón tay vẽ nét (Drawing); kéo thả các nhãn từ vựng/hình ảnh (Move Tool); bấm micro ghi
âm giọng đọc bài (Voice Recording); rèn luyện năng lực biểu đạt đa giác quan, ngôn ngữ nói, tư duy phản biện và khả
năng tự phản ánh bài học (Self-reflection). Mẫu phổ biến nhất: Multimodal Canvas Drawing và Voice Recording.
Độ tuổi 3–6 tuổi: Rất phù hợp; trẻ mầm non nộp bài bằng cách nói vào micro và dùng ngón tay vẽ tranh thay vì phải
viết chữ.
Độ tuổi 6–11 tuổi: Chuẩn mực xuất sắc cho học sinh tiểu học lưu trữ nhật ký học tập (Learning Journal) và làm bài
tập tương tác tại lớp.
2.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Dữ liệu bài học gắn chặt với bố cục trang vẽ tương tác (Canvas Page). Giáo viên tải tệp
PDF/ảnh bài tập lên và thêm các lớp phủ tương tác; không hỗ trợ chuyển đổi 1-click sang minigame kiểu arcade
[XÁC NHẬN: help.seesaw.me] .
Định dạng dữ liệu: JSON Canvas Scene Graph lưu trữ danh sách đối tượng: bút vẽ (Vector strokes), văn bản, ảnh, tệp
ghi âm AAC/MP3 và tọa độ vùng di chuyển.
Công nghệ hiển thị: Frontend xây dựng trên React.js kết hợp HTML5 Canvas 2D chuyên sâu; xử lý mượt mà thao tác
chạm đa điểm và công cụ cọ vẽ đồ họa trên iPad/máy tính bảng [XÁC NHẬN: DevTools inspection trên web.seesaw.me] .
Thêm loại game mới: Đội ngũ kỹ sư Seesaw Learning trực tiếp phát triển các công cụ bút vẽ và tương tác mới.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 3 / 14



## Trang 4

2.3. Trải nghiệm khi chơi
Vòng chơi: Học sinh mở bài tập được giao (Activity) → Bấm vào biểu tượng loa nghe cô giáo đọc đề bài → Dùng
ngón tay kéo thả các con vật vào đúng ô số → Bấm biểu tượng micro thu âm giọng đọc: "Thưa cô con đếm được 3
chú thỏ ạ" → Bấm dấu tích màu xanh góc trên (Green Checkmark) để nộp bài → Bài làm hiển thị trên nhật ký lớp học
và nhận lời khen/nhãn dán động viên từ giáo viên.
Xử lý sai: Không có cơ chế trừ mạng hay còi báo sai; mang tính nhật ký học tập tiến bộ (Portfolio-based), học sinh có
thể dùng công cụ tẩy (Eraser) hoặc nút Undo để làm lại.
Đồng hồ, Xếp hạng: Tuyệt đối không có đồng hồ đếm ngược; không có bảng xếp hạng ganh đua; không khí học tập
tích cực, nhẹ nhàng.
Hiệu năng: Ứng dụng chạy cực kỳ mượt mà, ổn định trên máy tính bảng và iPad trường học
[XÁC NHẬN: Apple Education Case Study] .
2.4. Tính năng AI
Tên & Ra mắt: Seesaw AI (AI Assistant & Resource Converter) (ra mắt giai đoạn 2024–2026)
[XÁC NHẬN: seesaw.com/ai-policy, 2026] .
Khả năng tự động hóa: Chuyển đổi tệp PDF/ảnh bài tập in giấy thành trang bài tập tương tác (tự động nhận diện các
ô trống và tạo ô chữ/vùng kéo thả); tự động điều chỉnh độ khó văn bản bài đọc theo lớp. Giáo viên vẫn phải làm tay:
Tự ghi âm hướng dẫn giọng nói nếu muốn có giọng thật của cô, duyệt bố cục bài tập và giao cho học sinh.
Tiếng Việt: Hỗ trợ phông chữ và văn bản tiếng Việt tốt; tuy nhiên các gợi ý bài học AI chủ yếu bám chuẩn Common
Core của Hoa Kỳ.
Vai trò AI: AI là công cụ hỗ trợ năng suất (Productivity Booster) cho giáo viên.
2.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: LÀM GẦN ĐÚNG (Giáo viên tải trang tập viết nét đứt, học sinh dùng công cụ bút chì/bút lông vẽ đè
lên nét; nhưng hệ thống không tự động chấm điểm nét đúng/sai).
c. Nghe đọc kéo táo vào giỏ: LÀM ĐƯỢC (Giáo viên thu âm giọng nói đọc đề gắn vào nút loa, học sinh bấm nghe và
dùng Move Tool kéo ảnh quả táo vào giỏ).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM ĐƯỢC (Tự do thiết kế hình nền slide du hành không gian và dán các sticker
con vật tương tác).
2.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Add" → Chọn "Assign Activity" → Bấm "Create New
Activity". Bước 2: Nhập tiêu đề và gõ hướng dẫn. Bước 3: Thu âm giọng cô đọc đề bài. Bước 4: Mở Canvas thiết kế 5
trang: tải ảnh con vật, tạo các nhãn dán số lượng cho học sinh kéo thả. Bước 5: Bấm lưu và giao cho lớp
[XÁC NHẬN: Seesaw Educator Help Center] .
Thời gian thực tế: Tạo thủ công một bài học tương tác hoàn chỉnh mất từ 20 đến 35 phút; nếu dùng Seesaw AI
chuyển đổi từ tài liệu PDF có sẵn mất khoảng 7 đến 10 phút.
2.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Học sinh tham gia lớp học qua mã QR cá nhân (Student QR Badge) hoặc đăng nhập Google SSO.
Giao bài làm tại lớp hoặc làm bài tập về nhà.
Tài khoản học sinh: Bắt buộc phải có tài khoản học sinh (được quản lý dưới dạng hồ sơ lớp học để lưu bài làm). Đạt
chuẩn bảo vệ dữ liệu học đường cao nhất thế giới: iKeepSafe Certified, FERPA, COPPA, CSPC
[XÁC NHẬN: seesaw.com/privacy] .
Phụ huynh: Cung cấp ứng dụng Seesaw Family riêng biệt để phụ huynh nhận thông báo và xem trực tiếp bài làm của
con mỗi ngày.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 4 / 14



## Trang 5

2.8. Chi phí và giới hạn
Gói miễn phí: Cho phép tạo tối đa 100 hoạt động bài học, lưu trữ cơ bản cho 1 giáo viên và 1 lớp học
[XÁC NHẬN: seesaw.com/pricing] .
Gói trả phí: Gói Seesaw Plus: khoảng 120.00 USD/năm (~3.000.000 VNĐ/năm) cho giáo viên cá nhân; Gói Seesaw
for Schools: tính theo đầu học sinh (khoảng 5.00 – 8.00 USD/học sinh/năm) mở toàn bộ tính năng quản trị trường
học và AI nâng cao [XÁC NHẬN: edweek.org Market Brief 2026] .
Bản địa hóa: Giao diện đã có tùy chọn tiếng Việt; gõ dấu tiếng Việt tốt; hỗ trợ đa phương tiện hoàn hảo.
3. BOOM CARDS (boomlearning.com - Boom Learning)
3.1. Danh mục cơ chế chơi & Tương tác
Nền tảng thẻ bài tập tương tác số chuyên biệt cho Mầm non, Tiểu học và Giáo dục đặc biệt hòa nhập (Special
Education / Speech Therapy): Digital Task Cards với các cơ chế tự chấm điểm (Self-grading): Clickable Multiple Choice
(chạm chọn hình ảnh/chữ đúng), Drag and Drop to Drop Zones (kéo thả đối tượng vào đúng tọa độ vùng đích), Fill in the
Blank (điền từ/số vào ô khuyết), Audio Button (chạm nghe phát âm hướng dẫn), Flow Magic (kịch bản thẻ phân nhánh
phi tuyến tính: làm đúng đi tiếp, làm sai rẽ nhánh ôn tập), Hide and Seek (kéo vật thể che khuất để tìm bí mật bên dưới)
[XÁC NHẬN: boomlearning.com; speechythings.com] .
Thao tác & Kỹ năng: Chạm vào hình ảnh (Clickable); kéo thả vật thể vào vùng đích (Drag & Drop); nghe âm thanh phát
âm; rèn khả năng nhận thức thính giác, tư duy phân loại, ngôn ngữ trị liệu và tính tự giác. Mẫu phổ biến nhất:
Clickable Picture Cards và Drag & Drop Task Cards.
Độ tuổi 3–6 tuổi: Rất phù hợp; trẻ mầm non chạm và kéo thả thẻ hình rất trực quan, phản hồi âm thanh tức thì giúp
trẻ hiểu ngay đúng/sai.
Độ tuổi 6–11 tuổi: Rất phù hợp cho học sinh tiểu học luyện tập các kỹ năng số học và từ vựng Tiếng Anh.
3.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Dữ liệu câu hỏi và hình ảnh gắn chặt vào từng tấm thẻ (Deck Card). Giáo viên phải vào
Boom Studio thiết kế từng thẻ một; không hỗ trợ chuyển đổi mẫu tự động [XÁC NHẬN: help.boomlearning.com] .
Định dạng dữ liệu: JSON Deck Schema độc quyền lưu trữ mảng thẻ bài: tọa độ các hộp tương tác (Hotspots x,y),
thuộc tính đúng/sai (isCorrect), tệp âm thanh audio tải lên và liên kết Flow Magic.
Công nghệ hiển thị: HTML5 DOM / SVG kết hợp Canvas 2D; chạy mượt mà trên trình duyệt web và ứng dụng Boom
Cards chuyên dụng trên iOS, Android, Kindle Fire [XÁC NHẬN: DevTools inspection trên boomlearning.com] .
Thêm loại game mới: 100% do đội ngũ kỹ sư Boom Learning lập trình và cập nhật nền tảng.
3.3. Trải nghiệm khi chơi
Vòng chơi: Bé mở cỗ bài (Deck) gồm 15–20 thẻ → Thẻ 1 xuất hiện: bấm loa nghe cô đọc đề → Bé kéo quả táo vào
giỏ hoặc chạm vào đáp án → Bấm nút "Submit" → Đúng: vòng tròn xanh sáng lên kèm tiếng chuông reo "ding" giòn
tan và tự động chuyển ngay sang thẻ tiếp theo; Sai: vòng tròn đỏ nhấp nháy kèm tiếng "whoops" nhẹ → Hoàn thành
cỗ bài bùng nổ pháo hoa chúc mừng.
Xử lý sai: Báo sai nhẹ nhàng, giữ nguyên thẻ để bé thao tác chọn lại cho đến khi tìm ra đáp án đúng (tính năng
Instant Feedback sửa sai tại chỗ).
Đồng hồ, Xếp hạng: Không có bảng xếp hạng đối kháng công khai; không ép thời gian; tập trung vào độ chính xác
của từng cá nhân.
Hiệu năng: Tải nhẹ, chuyển thẻ mượt mà không có độ trễ trên mọi dòng máy tính bảng
[XÁC NHẬN: EdTech RoundUp Review 2025] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 5 / 14



## Trang 6

3.4. Tính năng AI
Thực trạng AI: HOÀN TOÀN KHÔNG CÓ AI GENERATIVE TÍCH HỢP SẴN TRONG STUDIO (0% AI)
[XÁC NHẬN: boomlearning.com, 2026] . Nền tảng dựa hoàn toàn vào công cụ thiết kế thủ công và hệ sinh thái chợ học liệu
số khổng lồ (Boom Store) do giáo viên toàn cầu tự đóng gói kinh doanh.
Quy trình biên tập: Giáo viên phải tự tay vẽ từng hộp tọa độ (Drop zones), tự tìm ảnh tải lên và tự ghi âm tải từng tệp
mp3 lên thẻ thủ công 100%.
Tiếng Việt: Giao diện tác giả 100% tiếng Anh; hỗ trợ gõ nội dung tiếng Việt có dấu tốt; không có sẵn công cụ Text-to-
Speech tiếng Việt.
Vai trò AI: Hoàn toàn không có AI.
3.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: LÀM ĐƯỢC XUẤT SẮC (Thiết lập 1 thẻ bài: tải file âm thanh cô đọc, đặt ảnh quả táo làm
Draggable và đặt chiếc giỏ làm Drop Zone có thuộc tính Correct).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM ĐƯỢC (Tải hình nền vũ trụ lên thẻ bài và thiết lập các tương tác ghép từ vựng
con vật).
3.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 thẻ "Đếm con vật" (Boom Studio): Bước 1: Đăng nhập → Vào Studio → Bấm "New Deck". Bước 2:
Thiết kế thẻ 1: kéo ảnh nền, tạo 1 nút âm thanh tải file mp3 đọc đề. Bước 3: Dùng chuột vẽ 4 hộp đáp án, chọn 1 ô
đánh dấu là "Correct", 3 ô là "Incorrect". Bước 4: Nhân bản và chỉnh sửa cho đủ 5 thẻ. Bước 5: Kiểm tra và xuất bản ra
thư viện [XÁC NHẬN: Boom Cards Creator Manual] .
Thời gian thực tế: Do phải căn chỉnh tọa độ từng ô và tải ảnh/âm thanh thủ công, giáo viên mất trung bình từ 30 đến
50 phút để tạo một cỗ bài 5–10 thẻ hoàn chỉnh.
3.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua liên kết FastPlay PIN (học sinh chơi ngay không lưu điểm), mã QR, hoặc gán bài tập có
chấm điểm qua Google Classroom.
Tài khoản học sinh: Khi chơi qua liên kết FastPlay, học sinh hoàn toàn không cần tài khoản. Nếu giáo viên muốn theo
dõi báo cáo chi tiết thì tạo tài khoản học sinh. Tuân thủ nghiêm ngặt COPPA, FERPA
[XÁC NHẬN: boomlearning.com/privacy] .
Phụ huynh: Rất thuận tiện để phụ huynh tải app Boom Cards cho con tự làm bài tập trị liệu/ôn tập tại nhà.
3.8. Chi phí và giới hạn
Gói miễn phí (Starter): Cho phép tạo tối đa 5 cỗ bài (Decks) cá nhân, quản lý tối đa 5 học sinh, không thể bán trên
sàn thương mại [XÁC NHẬN: boomlearning.com/pricing] .
Gói trả phí: Gói Essential: khoảng 25.00 USD/năm; Gói Premier / Publisher: 40.00 – 50.00 USD/năm (~1.000.000 –
1.250.000 VNĐ/năm) mở rộng tạo không giới hạn cỗ bài và thu thập dữ liệu báo cáo 150 học sinh
[XÁC NHẬN: boomlearning.com/pricing, 2026] .
Bản địa hóa: Giao diện hoàn toàn bằng tiếng Anh; không có giọng đọc tiếng Việt tích hợp; đòi hỏi giáo viên phải tự
chuẩn bị toàn bộ file âm thanh tiếng Việt riêng.
4. LIVEWORKSHEETS (liveworksheets.com)
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 6 / 14



## Trang 7

4.1. Danh mục cơ chế chơi & Tương tác
Nền tảng số hóa tài liệu giấy kinh điển hàng đầu thế giới: chuyển đổi tệp PDF, DOCX hoặc ảnh bài tập thành phiếu bài
tập số tự chấm điểm bằng các thẻ lệnh cú pháp (Syntax tags): Multiple Choice Boxes (lệnh select:yes/no), Drop-
down Selection (lệnh choose:), Drag and Drop (cặp lệnh drag:1 và drop:1 để kéo đối tượng vào ô), Join with Arrows
(cặp lệnh join:1 để vẽ đường mũi tên nối hai cột), Fill in the Blank (gõ trực tiếp đáp án đúng), Word Search Puzzle (ô
chữ tìm từ), Listen & Speak (lệnh listen: phát âm thanh và lệnh speak: nhận diện phát âm của học sinh)
[XÁC NHẬN: liveworksheets.com; educationalappstore.com] .
Thao tác & Kỹ năng: Dùng chuột/ngón tay vẽ đường thẳng nối hai điểm (Join with arrows); kéo thả nhãn chữ/hình
(Drag and drop); chọn từ danh sách thả xuống; gõ bàn phím; rèn luyện khả năng đọc hiểu, đối chiếu thông tin và làm
bài kiểm tra độc lập. Mẫu phổ biến nhất: Join with Arrows và Drag and Drop.
Độ tuổi 3–6 tuổi: Không phù hợp vì bản chất vẫn là phiếu bài tập phẳng trên trang giấy A4; chữ nhỏ, thiếu hiệu ứng
game lôi cuốn.
Độ tuổi 6–11 tuổi: Rất phù hợp từ lớp 2–5; giúp giáo viên tiểu học số hóa các đề cương ôn tập môn Toán, Tiếng Việt
và Tiếng Anh mà không cần in giấy.
4.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: KHÔNG tách rời nội dung. Bố cục bài tập phụ thuộc 100% vào hình ảnh trang tài liệu
PDF/Word tải lên. Giáo viên vẽ các khung hình chữ nhật tương tác đè lên bề mặt tệp tài liệu
[XÁC NHẬN: liveworksheets.com] .
Định dạng dữ liệu: JSON Worksheet Schema lưu trữ URL ảnh nền tài liệu và danh sách tọa độ các hộp tương tác
(Boxes: x, y, w, h, command_type, correct_value).
Công nghệ hiển thị: Ảnh nền trang giấy kết hợp lớp phủ tương tác HTML5 DOM và SVG để vẽ các đường mũi tên nối
dây (Connecting lines); xử lý chấm điểm trực tiếp bằng JavaScript phía Client
[XÁC NHẬN: DevTools inspection trên liveworksheets.com] .
Thêm loại game mới: Đội ngũ kỹ sư Liveworksheets trực tiếp phát triển cú pháp lệnh mới.
4.3. Trải nghiệm khi chơi
Vòng chơi: Học sinh mở liên kết phiếu bài tập → Thực hiện các thao tác: kéo thả, vẽ dây nối từ con vật sang số đếm,
chọn đáp án trắc nghiệm → Làm xong cuộn xuống cuối trang bấm nút "Finish!" → Chọn "Check my answers" (tự xem
điểm) hoặc gửi cho giáo viên → Hệ thống lập tức tô màu xanh (câu đúng) và màu đỏ (câu sai) kèm bảng điểm thang
10 to rõ góc trên trang giấy.
Xử lý sai: Tô viền đỏ các câu làm sai kèm đáp án đúng (tùy cài đặt của giáo viên), không có hiệu ứng âm thanh nổ
hay chuyển màn.
Đồng hồ, Xếp hạng: Có thể cài đặt đồng hồ đếm ngược; không có bảng xếp hạng trực tiếp thời gian thực; không có
nhân vật hoạt hình dẫn dắt.
Hiệu năng: Tải trang nhanh; tuy nhiên thao tác vẽ dây nối (Join) trên màn hình cảm ứng điện thoại dễ bị nhầm lẫn với
thao tác vuốt cuộn trang tài liệu [XÁC NHẬN: EdTech Impact Review] .
4.4. Tính năng AI
Tên & Ra mắt: Liveworksheets AI Worksheet Maker (thử nghiệm giai đoạn 2024–2026)
[XÁC NHẬN: liveworksheets.com/ai, 2026] .
Khả năng tự động hóa: Nhập câu lệnh để AI tự động soạn thảo bố cục nội dung phiếu bài tập mới hoặc tự động nhận
diện các dòng kẻ để đặt ô điền từ. Giáo viên vẫn phải làm tay: Vẽ lại các ô nhận diện tọa độ nếu muốn tạo bài kéo
thả hoặc nối dây phức tạp.
Tiếng Việt: Nhận diện và hiển thị văn bản tiếng Việt chuẩn xác; các bài tập do giáo viên Việt Nam chia sẻ rất lớn.
Vai trò AI: AI là tính năng tiện ích mới bổ sung; nền tảng hoạt động chủ yếu dựa trên công cụ vẽ hộp tương tác thủ
công.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 7 / 14



## Trang 8

4.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng lệnh drag: cho quả táo và drop: cho cái giỏ; đính kèm file
audio phát âm, nhưng quả táo chỉ nhảy vào ô chứ không có hiệu ứng rơi vật lý).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Thiết kế file PDF nền vũ trụ rồi tải lên làm bài tập nối từ vựng
con vật).
4.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (Dạng Nối dây): Bước 1: Soạn file Word 5 câu đếm con vật có 2 cột (cột hình ảnh
và cột số đếm), lưu dạng PDF. Bước 2: Tải file lên liveworksheets.com. Bước 3: Dùng chuột vẽ 5 khung chữ nhật
quanh 5 con vật, gõ lệnh join:1 đến join:5. Bước 4: Vẽ 5 khung chữ nhật quanh 5 số đếm, gõ lệnh join: tương
ứng. Bước 5: Bấm lưu và lấy liên kết gửi cho học sinh [XÁC NHẬN: Liveworksheets Creator Tutorial] .
Thời gian thực tế: Nếu đã có sẵn file PDF, khâu vẽ hộp tương tác mất từ 10 đến 15 phút; nếu phải tự soạn file PDF từ
đầu thì mất tổng cộng 30 đến 45 phút.
4.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua đường link trực tiếp (Custom Link có thể cài sẵn thời gian và thang điểm), mã QR, mã
nhúng iFrame, Google Classroom. Học sinh làm bài độc lập dạng bài tập về nhà hoặc kiểm tra 15 phút tại lớp.
Tài khoản học sinh: Học sinh hoàn toàn không cần tài khoản để làm bài (chỉ cần nhập Tên và Lớp khi nộp bài). Tuân
thủ GDPR và COPPA [XÁC NHẬN: liveworksheets.com/privacy-policy] .
Phụ huynh: Phụ huynh mở link cho con làm bài trên điện thoại hoặc máy tính rất dễ dàng.
4.8. Chi phí và giới hạn
Gói miễn phí: Giới hạn nghiêm ngặt (theo chính sách siết hạn ngạch mới 2024–2026): chỉ cho phép lưu tối đa 10 đến
30 phiếu bài tập riêng tư (Private Worksheets), tối đa 100 học sinh nộp bài mỗi tháng
[XÁC NHẬN: liveworksheets.com/subscription] .
Gói trả phí (Liveworksheets Subscription): Khoảng 3.50 – 5.95 USD/tháng (thanh toán năm ~36.00 – 60.00
USD/năm ~ 900.000 – 1.500.000 VNĐ/năm); mở không giới hạn phiếu bài tập riêng tư và quản lý hàng nghìn học
sinh nộp bài [XÁC NHẬN: liveworksheets.com/pricing, 2026] .
Bản địa hóa: Giao diện hỗ trợ tiếng Việt; hiển thị tiếng Việt có dấu hoàn hảo; không có sẵn giọng đọc TTS tiếng Việt
chuẩn.
5. TOPWORKSHEETS (topworksheets.com)
5.1. Danh mục cơ chế chơi & Tương tác
Nền tảng số hóa phiếu bài tập thế hệ mới được phát triển nhằm tối ưu trải nghiệm kéo thả trực quan hơn
Liveworksheets: Drag and Drop Elements (kéo thả từ ngữ/hình ảnh tự do vào vùng đích), Join with Lines (nối điểm bằng
đường vẽ đồ họa mượt mà), Multiple Choice & Checkboxes (chọn 1 hoặc nhiều đáp án), Clickable Areas (chạm chọn
vùng ảnh), Word Search Puzzle Maker (tự động tạo ô chữ), Open Questions with Audio Answer (học sinh ghi âm câu trả
lời), Embedded Media (nhúng video YouTube, âm thanh phát âm và bản đồ trực tiếp lên phiếu bài tập)
[XÁC NHẬN: topworksheets.com; elearningindustry.com] .
Thao tác & Kỹ năng: Kéo thả các mảnh ghép/nhãn chữ; vẽ đường thẳng nối hai đối tượng; chạm chọn ô; thu âm câu
trả lời; rèn luyện khả năng quan sát, suy luận logic và giải bài tập có hướng dẫn đa phương tiện. Mẫu phổ biến nhất:
Drag and Drop và Join with Lines.
Độ tuổi 3–6 tuổi: Không phù hợp do giao diện tài liệu phẳng; trừ khi giáo viên thiết kế các trang hình vẽ to và gắn sẵn
nút phát âm thanh.
Độ tuổi 6–11 tuổi: Rất phù hợp cho học sinh tiểu học làm bài tập trực tuyến tự chấm điểm.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 8 / 14



## Trang 9

5.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tương tự Liveworksheets, gắn liền với tài liệu PDF/JPG tải lên. Tuy nhiên giao diện biên tập
hiện đại hơn (Visual Drag & Drop Editor): giáo viên kéo các hộp công cụ từ thanh menu thả vào trang giấy thay vì phải
gõ cú pháp lệnh bằng tay [XÁC NHẬN: topworksheets.com/help] .
Định dạng dữ liệu: JSON Worksheet Descriptor lưu trữ tọa độ đối tượng, cấu hình đa phương tiện và thang điểm chi
tiết.
Công nghệ hiển thị: HTML5 DOM kết hợp SVG Animation và Canvas; tối ưu hóa cảm ứng chạm trên thiết bị di động
tốt hơn Liveworksheets [XÁC NHẬN: DevTools inspection trên topworksheets.com] .
Thêm loại game mới: Đội ngũ kỹ sư Topworksheets phát triển độc quyền.
5.3. Trải nghiệm khi chơi
Vòng chơi: Học sinh mở liên kết → Nghe video/audio hướng dẫn nhúng trên trang → Thao tác kéo thả các đối tượng
hoặc nối mũi tên → Bấm nút nộp bài (Send) → Hệ thống tự động chấm điểm và hiển thị kết quả đúng/sai trực quan
kèm hiệu ứng pháo hoa nhẹ nhàng → Dữ liệu điểm số gửi thẳng về sổ điểm của giáo viên.
Xử lý sai: Hiển thị câu sai và gợi ý sửa đổi, cho phép giáo viên cấu hình số lần làm lại của học sinh.
Đồng hồ, Xếp hạng: Có đồng hồ giới hạn thời gian làm bài; có bảng xếp hạng điểm số nội bộ lớp học; không có nhân
vật hoạt hình dẫn dắt.
Hiệu năng: Tải trang nhanh, tương thích tốt trên máy tính bảng và điện thoại thông minh
[XÁC NHẬN: Topworksheets Review 2025] .
5.4. Tính năng AI
Tên & Ra mắt: Topworksheets AI Assistant (ra mắt giai đoạn 2024–2026) [XÁC NHẬN: topworksheets.com/pricing, 2026] .
Khả năng tự động hóa: Tự động phát hiện các câu hỏi trong tệp PDF tải lên và tự động tạo các ô trả lời tương ứng
(Auto-detect questions); hỗ trợ tạo câu hỏi gợi ý từ chủ đề. Giáo viên vẫn phải làm tay: Kiểm tra lại tọa độ các ô và
điều chỉnh thang điểm.
Tiếng Việt: Hỗ trợ tiếng Việt ở mức khá tốt trong việc nhận diện tài liệu văn bản.
Vai trò AI: AI là tính năng tiện ích gia tăng tốc độ tạo bài.
5.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng tương tác Drag & Drop: kéo ảnh quả táo vào khung giỏ trên tài
liệu, nhưng không có chuyển động rơi vật lý).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Thiết kế trang tài liệu vũ trụ và kéo thả từ vựng con vật).
5.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Tải tệp PDF hoặc ảnh bài tập lên hệ thống. Bước 2: Dùng chuột kéo các
hộp tương tác thả vào vị trí câu hỏi trên trang giấy. Bước 3: Cấu hình đáp án đúng. Bước 4: Thiết lập thời gian và
thang điểm → Bấm "Save & Share" [XÁC NHẬN: Topworksheets Guide] .
Thời gian thực tế: Nhờ giao diện kéo thả trực quan không cần gõ lệnh cú pháp, giáo viên mất khoảng 8 đến 12 phút
nếu đã có sẵn tệp tài liệu PDF.
5.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua đường link trực tiếp, mã QR, chia sẻ vào Google Classroom. Hỗ trợ giao bài tập về nhà
hoặc kiểm tra tại lớp.
Tài khoản học sinh: Học sinh không cần tài khoản; chỉ cần nhập tên để nộp bài. Tuân thủ nghiêm ngặt chuẩn quyền
riêng tư GDPR và COPPA [XÁC NHẬN: topworksheets.com/privacy] .
Phụ huynh: Phụ huynh có thể mở link bài tập cho con tự làm trên điện thoại di động.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 9 / 14



## Trang 10

5.8. Chi phí và giới hạn
Gói miễn phí: Cho phép tạo và lưu trữ tối đa 20 phiếu bài tập riêng tư, giới hạn số lượng bài nộp của học sinh
[XÁC NHẬN: topworksheets.com/pricing] .
Gói trả phí (Topworksheets Pro): Khoảng 2.50 – 4.00 USD/tháng (thanh toán năm ~30.00 – 48.00 USD/năm ~
750.000 – 1.200.000 VNĐ/năm); không giới hạn số lượng bài tập và học sinh nộp bài
[XÁC NHẬN: topworksheets.com/pricing, 2026] .
Bản địa hóa: Giao diện hỗ trợ tiếng Việt; gõ dấu tiếng Việt tốt; hỗ trợ đa phương tiện mượt mà.
6. WIZER.ME (wizer.me)
4.1. Danh mục cơ chế chơi & Tương tác
Nền tảng thiết kế phiếu bài tập số hóa thông minh thế hệ mới (Next-Gen Interactive Worksheets Builder): Fill On An
Image (gắn nhãn định vị các điểm nóng tương tác trên bức tranh/sơ đồ), Matching (kéo nối cặp đối tượng 2 cột),
Sorting (kéo thẻ bài vào các giỏ phân loại), Multiple Choice & Blanks, Table Question (điền số liệu vào bảng ma trận),
Draw Question (bảng vẽ tự do trực tiếp lên hình ảnh), Word Search Puzzle, Audio / Video Questions & Answers (giáo viên
và học sinh trao đổi bằng giọng nói hoặc video) [XÁC NHẬN: wizer.me; teachthought.com] .
Thao tác & Kỹ năng: Gắn nhãn các bộ phận trên hình ảnh (Fill On An Image); kéo thả phân loại vào giỏ (Sorting); thu
âm câu trả lời; rèn luyện tư duy nhận biết không gian, định danh đối tượng và biểu đạt ngôn ngữ. Mẫu độc đáo nhất:
Fill On An Image và Sorting.
Độ tuổi 3–6 tuổi: Có thể sử dụng nếu giáo viên dùng bài tập Fill On An Image (bé bấm vào chú thỏ trên bức tranh)
hoặc thu âm giọng nói; không phù hợp với các bảng số liệu hay bài đọc dài.
Độ tuổi 6–11 tuổi: Rất phù hợp cho học sinh tiểu học (lớp 1–5) trong các môn Tự nhiên & Xã hội, Tiếng Việt và Toán.
4.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt theo mô hình các khối câu hỏi (Modular Question Blocks). Giáo viên có thể sắp
xếp lại vị trí các khối câu hỏi trên trang, kết hợp linh hoạt nhiều dạng bài tập trong một bài giảng [XÁC NHẬN: wizer.me]
.
Định dạng dữ liệu: JSON Worksheet Schema lưu trữ danh sách các khối câu hỏi, điểm nóng ảnh (Hotspot pins), tệp
audio đính kèm và thang điểm tự chấm.
Công nghệ hiển thị: Frontend xây dựng trên React.js kết hợp HTML5 Canvas 2D (cho bài tập Fill On An Image và
Drawing); thiết kế giao diện hiện đại, sạch sẽ và tối ưu hóa hiển thị responsive
[XÁC NHẬN: DevTools inspection trên wizer.me] .
Thêm loại game mới: Đội ngũ kỹ sư Wizer.me trực tiếp phát triển các khối tương tác mới.
4.3. Trải nghiệm khi chơi
Vòng chơi: Học sinh mở bài tập qua link → Xem hình ảnh sơ đồ sinh động → Bấm vào các chấm tròn trên bức tranh
để chọn từ ngữ tương ứng hoặc kéo thẻ vào giỏ → Thu âm câu trả lời bằng giọng nói → Bấm nộp bài (Hand in Work)
→ Hệ thống tự chấm điểm tức thì và gửi phản hồi nhận xét cá nhân hóa của giáo viên.
Xử lý sai: Hiển thị câu sai và câu đúng kèm phản hồi sửa đổi sư phạm; giáo viên có thể ghi âm lời nhận xét gửi lại cho
học sinh.
Đồng hồ, Xếp hạng: Có tùy chọn giới hạn thời gian làm bài; không có bảng xếp hạng đối kháng giật gân; mang tính sư
phạm cá nhân hóa cao.
Hiệu năng: Giao diện đồ họa rất đẹp, tải mượt mà trên cả máy tính và iPad [XÁC NHẬN: Teachers First Review] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 10 / 14



## Trang 11

4.4. Tính năng AI
Tên & Ra mắt: Wizer AI (AI Assistant & Question Creator) (ra mắt năm 2023, nâng cấp 2024–2026)
[XÁC NHẬN: wizer.me/pricing, 2026] .
Khả năng tự động hóa: Nhập chủ đề hoặc chuẩn kiến thức để AI tự động tạo các khối câu hỏi trắc nghiệm, điền từ,
gắn nhãn ảnh; tự động đề xuất câu hỏi gợi ý mở rộng. Giáo viên vẫn phải làm tay: Duyệt nội dung, kiểm tra tọa độ
chấm tròn trên ảnh và gán bài cho lớp.
Tiếng Việt: Hỗ trợ tiếng Việt ở mức khá tốt qua mô hình AI tích hợp.
Vai trò AI: AI là trợ lý biên tập mạnh mẽ (Copilot) giúp đẩy nhanh tốc độ soạn bài tập.
4.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC TỰ ĐỘNG (Có khối Draw cho bé vẽ đè lên hình chữ cái, nhưng không có AI
chấm nét chữ chuẩn).
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng khối Sorting: đặt giỏ làm nhóm phân loại và kéo thẻ ảnh quả táo
vào giỏ, có đính kèm file audio cô đọc).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM ĐƯỢC (Tải bức tranh bối cảnh tàu vũ trụ và dùng bài tập Fill On An Image để
gắn thẻ từ vựng con vật).
4.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (Fill On An Image): Bước 1: Đăng nhập → Bấm "Create Worksheet". Bước 2: Chọn
khối "Fill On An Image" → Tải ảnh bức tranh các con vật. Bước 3: Dùng chuột chấm 5 điểm tròn lên 5 con vật và nhập
số lượng tương ứng. Bước 4: Thêm khối Audio thu âm giọng cô đọc đề bài. Bước 5: Bấm lưu và giao cho học sinh
[XÁC NHẬN: Wizer.me Educator Academy] .
Thời gian thực tế: Tạo thủ công bài học hoàn chỉnh mất từ 15 đến 25 phút; dùng Wizer AI hỗ trợ rút ngắn còn 5 đến 7
phút.
4.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chia sẻ qua đường link trực tiếp, mã PIN lớp học, mã QR, tích hợp sâu vào Google Classroom,
Microsoft Teams, Canvas. Giao bài làm tại lớp hoặc bài tập về nhà.
Tài khoản học sinh: Học sinh có thể làm bài ẩn danh qua link hoặc đăng nhập bằng tài khoản Google trường học. Đạt
chuẩn an toàn FERPA, COPPA [XÁC NHẬN: wizer.me/privacy] .
Phụ huynh: Phụ huynh có thể xem bảng tổng hợp kết quả và nghe lại đoạn ghi âm nhận xét của cô giáo gửi cho con.
4.8. Chi phí và giới hạn
Gói miễn phí: Tạo và lưu trữ cơ bản nhưng bị giới hạn một số loại câu hỏi cao cấp và không có công cụ phân tích
nâng cao [XÁC NHẬN: wizer.me/pricing] .
Gói trả phí (Wizer Boost): Khoảng 5.00 – 7.00 USD/tháng (thanh toán năm ~45.00 – 60.00 USD/năm ~ 1.100.000 –
1.500.000 VNĐ/năm); mở khóa toàn bộ các khối câu hỏi cao cấp, mở không giới hạn tính năng Wizer AI và công cụ
thu âm nhận xét cá nhân hóa [XÁC NHẬN: wizer.me/pricing, 2026] .
Bản địa hóa: Giao diện tiếng Anh; hỗ trợ gõ dấu tiếng Việt hoàn hảo; hỗ trợ đính kèm âm thanh và hình ảnh linh hoạt.
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
TinyTap
Ask a Question
Nghe câu hỏi âm
thanh, chạm vào hình
đúng
Liên kết thính giác -
thị giác, nhận thức
Rất hợp
(chuẩn
mực)
Hợp (lớp 1)
[XÁC NHẬN]
tinytap.com
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 11 / 14



## Trang 12

Nền tảng
Tên mẫu
Thao tác chính
Kỹ năng luyện
Hợp 3–6
tuổi
Hợp 6–11
tuổi
Nguồn
TinyTap
Shape Puzzle
Kéo thả mảnh hình
cắt vào khung
khuyết
Tư duy không gian,
vận động tinh
Rất hợp
(hình to)
Hợp (lớp 1)
[XÁC NHẬN]
animocabrands.com
Seesaw
Multimodal
Drawing
Dùng ngón tay vẽ
tranh, kéo dán
sticker
Biểu đạt hội họa,
sáng tạo hình tượng
Rất hợp (tự
do)
Rất hợp
[XÁC NHẬN]
seesaw.com
Seesaw
Voice Recording
Bấm micro thu âm
giọng nói giải thích
bài
Ngôn ngữ nói, tự tin
diễn đạt
Rất hợp
(nói bài)
Rất hợp
[XÁC NHẬN]
help.seesaw.me
Boom Cards
Digital Task Cards
Chạm vào đáp án
hoặc kéo thả vào ô
đích
Tự kiểm tra kiến
thức, phản xạ
đúng/sai
Rất hợp (tự
chấm)
Rất hợp
[XÁC NHẬN]
boomlearning.com
Boom Cards
Flow Magic
Bấm chọn rẽ nhánh
kịch bản theo năng
lực
Tự học phân hóa,
kiên trì sửa sai
Có (nếu
tranh vẽ)
Rất hợp
[XÁC NHẬN]
speechythings.com
Liveworksheets
Join with Arrows
Vẽ đường mũi tên
thẳng nối hai cột
Ghép cặp tương
đương, đối chiếu dữ
liệu
Không (chữ
nhỏ)
Rất hợp
(lớp 2-5)
[XÁC NHẬN]
liveworksheets.com
Liveworksheets
Drag & Drop Boxes
Kéo các nhãn
chữ/hình vào khung
trống
Điền khuyết, phân
loại bài tập
Không
Rất hợp
[XÁC NHẬN]
liveworksheets.com
Topworksheets
Join with Lines
Vẽ đường nối mượt
mà giữa 2 điểm ảnh
Liên kết khái niệm,
ghi nhớ từ vựng
Không
Rất hợp
[XÁC NHẬN]
topworksheets.com
Wizer.me
Fill On An Image
Bấm vào các chấm
tròn trên ảnh gán
nhãn
Định vị chi tiết, giải
phẫu/địa lý/từ vựng
Có (ảnh to)
Rất hợp
[XÁC NHẬN]
wizer.me
Bảng C2 – So sánh nền tảng:
Nền tảng
Tách nội
dung
khỏi mẫu
Định dạng
dữ liệu
Công nghệ
hiển thị
AI làm
được bước
nào
AI là phụ
hay lõi
Tiếng
Việt
Giá gói trả
phí
Học sinh
cần tài
khoản
Nguồn
TinyTap
Có trong
TinyTap
AI
TinyTap
Course
JSON DSL
HTML5
Canvas 2D
+ WebGL
AI sinh kịch
bản, vẽ
tranh, tạo
TTS
Lõi (Core
AI)
Kém
(Chủ
yếu
tiếng
Anh)
99.00 –
144.00
USD/năm
Không
cần (Link)
[XÁC NHẬN]
tinytap.com
Seesaw
Không
(Canvas
Page)
JSON
Scene
Graph
Vector
React.js +
HTML5
Canvas 2D
AI chuyển
đổi PDF
thành bài
tập
Phụ
(Booster)
Tốt
(Giao
diện +
gõ dấu)
120
USD/năm
(Plus)
Bắt buộc
có
[XÁC NHẬN]
seesaw.com
Boom
Cards
Không
(Từng thẻ
Deck)
JSON
Deck
Hotspot
Schema
HTML5
DOM/SVG
+ Canvas
Không có
AI
Không
có
Chỉ
tiếng
Anh, gõ
dấu OK
25.00 –
50.00
USD/năm
Không
cần
(FastPlay)
[XÁC NHẬN]
boomlearning.com
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 12 / 14



## Trang 13

Nền tảng
Tách nội
dung
khỏi mẫu
Định dạng
dữ liệu
Công
nghệ hiển
thị
AI làm
được bước
nào
AI là
phụ hay
lõi
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
Liveworksheets
Không
(Gắn vào
PDF)
JSON
Worksheet
Boxes
HTML5
DOM +
SVG Lines
AI
Worksheet
Maker hỗ
trợ tạo bài
Phụ
(Add-
on)
Rất tốt
(Giao
diện +
font)
36.00 –
60.00
USD/năm
Không
cần
(Link)
[XÁC NHẬN]
liveworksheets.com
Topworksheets
Không
(Gắn vào
PDF)
JSON
Worksheet
Descriptor
HTML5
DOM +
SVG
Animation
AI tự phát
hiện câu
hỏi trên
PDF
Phụ
(Add-
on)
Tốt
(Giao
diện
tiếng
Việt)
30.00 –
48.00
USD/năm
Không
cần
(Link)
[XÁC NHẬN]
topworksheets.com
Wizer.me
Có
(Modular
Blocks)
JSON
Modular
Block
Schema
React.js +
HTML5
Canvas 2D
Wizer AI
sinh câu
hỏi theo
chủ đề
Phụ
(Copilot)
Giao
diện
Anh,
gõ dấu
OK
45.00 –
60.00
USD/năm
Không
cần
(Link)
[XÁC NHẬN]
wizer.me
Bảng C3 – Mô tả ngoài mẫu:
Nền tảng
Mô tả a
Mô tả b
Mô tả c
Mô tả d
TinyTap
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM ĐƯỢC XUẤT SẮC (Có
sẵn cơ chế âm thanh + ghép
hình)
LÀM ĐƯỢC (TinyTap AI vẽ
cảnh du hành vũ trụ)
Seesaw
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Vẽ đè
lên nét đứt, không tự
chấm)
LÀM ĐƯỢC (Gắn nút loa cô
đọc và bé kéo táo vào giỏ)
LÀM ĐƯỢC (Tự do thiết kế
slide bối cảnh vũ trụ)
Boom Cards
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM ĐƯỢC XUẤT SẮC (Thẻ
bài có audio và Drop Zone giỏ
táo)
LÀM ĐƯỢC (Tải ảnh nền trạm
vũ trụ lên thẻ bài)
Liveworksheets
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Kéo ảnh táo
vào giỏ, thiếu hiệu ứng rơi)
LÀM GẦN ĐÚNG (Tải trang
PDF vũ trụ nối từ vựng)
Topworksheets
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Kéo ảnh táo
vào ô giỏ trên trang giấy)
LÀM GẦN ĐÚNG (Tạo phiếu
bài tập hình nền vũ trụ)
Wizer.me
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Dùng khối
Sorting phân loại quả táo)
LÀM ĐƯỢC (Dùng Fill On An
Image trên ảnh tàu vũ trụ)
Ghi chú: Nhóm 6 giải quyết xuất sắc yêu cầu nghe âm thanh và kéo thả đồ vật (mô tả c), nhưng bộc lộ điểm nghẽn nghiêm trọng: quy
trình tạo thẻ và phiếu bài tập ngốn từ 30-50 phút vẽ hộp tọa độ thủ công. Đề tài của nhóm tự động hóa 100% khâu này bằng AI.
PHẦN D – DANH SÁCH ĐIỂM CẦN TỰ ĐĂNG NHẬP KIỂM TRA THỰC NGHIỆM [CẦN TỰ THỬ]
Để hoàn thiện các luận cứ thực chứng khách quan cho đề tài nghiên cứu, sinh viên cần trực tiếp truy cập tài khoản và thu
thập các bằng chứng lưu vết đối với 5 điểm kỹ thuật sau:
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 13 / 14



## Trang 14

1. Kiểm tra chất lượng phát âm tiếng Việt của TinyTap AI:
• Hành động: Truy cập tính năng tạo game bằng AI trên TinyTap; nhập prompt tiếng Việt: "Dạy bé đếm từ 1 đến 5 bằng
hình ảnh quả táo".
• Bằng chứng cần chụp: Ghi âm/chụp màn hình video kết quả phát âm của giọng đọc AI để chứng minh AI của TinyTap
phát âm tiếng Việt lơ lớ, sai thanh điệu (hỏi, ngã, nặng) do chưa tối ưu ngữ âm tiếng Việt.
2. Đo thời gian thực tế để thiết lập 1 cỗ bài kéo thả Drop Zone trên Boom Cards:
• Hành động: Đăng nhập Boom Studio; tự tay tạo 1 cỗ bài 5 câu kéo con vật vào giỏ: vẽ vùng Drop Zone, tải ảnh con vật,
tải file âm thanh mp3 lên từng thẻ.
• Bằng chứng cần chụp: Bấm giờ thực tế từ lúc mở Studio đến khi xuất bản; chụp ảnh màn hình giao diện căn chỉnh tọa
độ x,y phức tạp để chứng minh sự vất vả của giáo viên khi tạo thủ công.
3. Kiểm tra hạn mức lưu trữ bài tập riêng tư (Private Worksheets) trên Liveworksheets:
• Hành động: Đăng ký tài khoản giáo viên miễn phí mới trên liveworksheets.com; tải liên tiếp các tệp PDF bài tập và lưu ở
chế độ Private.
• Bằng chứng cần chụp: Hộp thoại thông báo chặn khi chạm ngưỡng giới hạn (10 hoặc 30 worksheets) và yêu cầu nâng
cấp gói trả phí Subscription.
4. Thử nghiệm tính năng vẽ và ghi âm giải thích của học sinh trên Seesaw:
• Hành động: Mở giao diện học sinh trên Seesaw; vào một bài tập vẽ nét; thực hiện đồng thời vừa dùng ngón tay vẽ nét
vừa bấm nút Micro ghi âm giọng nói.
• Bằng chứng cần chụp: Ảnh chụp màn hình bài làm có hiển thị thanh sóng âm thanh (Voice waveform) gắn liền với nét vẽ
trên Canvas.
5. Kiểm tra độ trễ thao tác gắn thẻ điểm nóng ảnh (Fill On An Image) trên Wizer.me:
• Hành động: Mở trình biên tập Wizer.me, tạo khối câu hỏi Fill On An Image với bức tranh có 5 con vật; chấm 5 điểm tròn
định vị và gõ đáp án.
• Bằng chứng cần chụp: Ảnh chụp màn hình giao diện biên tập điểm nóng và màn hình học sinh bấm vào chấm tròn hiển
thị ô nhập đáp án.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 6
Trang 14 / 14
