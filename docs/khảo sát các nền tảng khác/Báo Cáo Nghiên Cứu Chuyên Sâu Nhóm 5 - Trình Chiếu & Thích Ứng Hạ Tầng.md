# Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 5 - Trình Chiếu & Thích Ứng Hạ Tầng

> **Nghiên cứu chuyên sâu**: [[Khảo sát 7 nhóm nền tảng đối thủ]] | [[Báo Cáo Khảo Sát Nhóm 5 - Trình Chiếu & Thích Ứng Hạ Tầng|Khảo sát tổng quan Nhóm 5: Trình Chiếu & Thích Ứng Hạ Tầng]]



> **Tài liệu nguồn gốc**: `Báo Cáo Nghiên Cứu Chuyên Sâu Nhóm 5 - Trình Chiếu & Thích Ứng Hạ Tầng.pdf`  
> **Tổng số trang**: 13  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

BÁO CÁO NGHIÊN CỨU KỸ THUẬT • KHÓA LUẬN TỐT NGHIỆP
Khảo Sát Toàn Diện Nhóm 5: Bài Giảng Trình Chiếu & Thích Ứng Hạ
Tầng Lớp Học
Phân hệ: Nearpod, Lumio (by SMART), Pear Deck, ClassPoint, Baamboozle, Plickers • Đơn vị khảo sát: Nhóm Khóa Luận AI Game
Generator • Cập nhật: 11/2026
PHẦN A – TÓM TẮT NHÓM & BÀI HỌC THIẾT KẾ AI GAME GENERATOR
Điểm chung của Nhóm 5: Toàn bộ 06 nền tảng đều tập trung giải quyết bài toán Phương thức tổ chức dạy học đồng bộ và
thích ứng với rào cản phần cứng lớp học: (1) Nhóm tích hợp bài giảng số (Nearpod, Lumio, Pear Deck, ClassPoint) chèn các
điểm tương tác (Draggable, Drawing, Minigame) vào trang slide trình chiếu; (2) Nhóm thích ứng hạ tầng nghèo nàn
(Baamboozle, Plickers) tối ưu đặc thù cho các lớp học chỉ có 1 màn hình Tivi/máy chiếu duy nhất hoặc hoàn toàn không có
thiết bị cá nhân cho học sinh [XÁC NHẬN: nearpod.com; baamboozle.com; plickers.com] .
Bài học quan trọng nhất cho hệ thống AI Game Generator: (1) Kiến trúc Đa Chế Độ thích ứng hạ tầng (Presentation vs Live
Arena): Thực tế tại trường công lập Mầm non và Tiểu học Việt Nam, học sinh không được mang điện thoại/máy tính bảng
vào lớp. Kế thừa giải pháp của Baamboozle và Nearpod, hệ thống bắt buộc phải xây dựng song song 2 chế độ (FR-06 / UC-
06): Chế độ Trình chiếu chung (Presentation Mode) hiển thị toàn màn hình trên Smart TV để cả lớp cùng quan sát, thảo
luận và đại diện học sinh lên bảng vuốt chạm Canvas; đồng thời hỗ trợ Đấu trường Live Arena qua WebSocket khi lớp học
có trang bị phòng máy tính hoặc máy tính bảng. (2) Vượt qua rào cản công cụ cồng kềnh: ClassPoint phụ thuộc chặt vào
PowerPoint trên hệ điều hành Windows, Pear Deck là slide tĩnh thiếu hiệu ứng game nổ pháo hoa, còn Baamboozle chỉ là
bảng đố chữ đơn điệu. Đề tài của nhóm tạo ra bước đột phá: Xây dựng ứng dụng Web độc lập, chạy trên mọi hệ điều hành
(kể cả Smart TV Android/Tizen), dùng AI tạo trọn gói trò chơi 2D Canvas có chuyển động vật lý và giọng đọc TTS tiếng
Việt chỉ trong 10 giây.
PHẦN B – NGHIÊN CỨU CHI TIẾT TỪNG NỀN TẢNG (08 TIÊU CHÍ)
1. NEARPOD (nearpod.com - Thuộc Renaissance Learning)
1.1. Danh mục cơ chế chơi
Cung cấp hệ sinh thái bài giảng tương tác tích hợp đa dạng các hoạt động số: Time to Climb (minigame leo núi
tuyết/vũ trụ/rừng rậm trả lời trắc nghiệm tốc độ), Draw It (bảng vẽ tự do trực tiếp lên ảnh nền slide), Matching Pairs (lật
mở ghép cặp hình ảnh và từ ngữ), Drag & Drop (kéo thả nhãn chữ/hình vào vị trí phân loại), Collaborate Board (bảng
ghim giấy ghi chú tương tác cả lớp), VR Field Trip (chuyến du ngoạn thực tế ảo 360 độ), Interactive Video (video chặn
dừng câu hỏi), Fill in the Blanks, Poll, Open-Ended Question [XÁC NHẬN: nearpod.com/features; educationalappstore.com 2025] .
Thao tác & Kỹ năng: Bấm đáp án nhanh đua leo núi (Time to Climb); vẽ tay bằng ngón tay hoặc bút cảm ứng (Draw
It); kéo thả đối tượng (Drag & Drop); xoay góc nhìn 360 độ (VR); rèn phản xạ nhận thức, vận động tinh và biểu đạt hình
tượng. Mẫu phổ biến nhất: Time to Climb và Draw It.
Độ tuổi 3–6 tuổi: Có thể sử dụng Draw It (tô màu tranh có sẵn) và VR Field Trip; không phù hợp với Time to Climb vì
chữ trên điện thoại nhỏ, áp lực đếm ngược thời gian gây rối loạn thao tác ở trẻ mầm non.
Độ tuổi 6–11 tuổi: Rất phù hợp từ lớp 1–5; học sinh tiểu học đặc biệt say mê trò chơi leo núi Time to Climb tranh tài
bục vinh danh.
1.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Nội dung được tổ chức theo từng slide bài giảng độc lập. Hoạt động Time to Climb hay
Draw It là một trang slide chuyên dụng (Activity Slide); không hỗ trợ 1-click chuyển đổi qua lại giữa Draw It và Time to
Climb [XÁC NHẬN: nearpod.zendesk.com] .
Định dạng dữ liệu: Cấu trúc JSON bài giảng đa phương tiện (Presentation Schema) lưu trữ đám mây trên hạ tầng
AWS.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 1 / 13



## Trang 2

Công nghệ hiển thị: Frontend xây dựng trên React.js; minigame Time to Climb dựng bằng HTML5 Canvas 2D / CSS3
Animations; phân hệ VR sử dụng WebGL 360 viewer; đồng bộ trạng thái bài giảng giữa máy giáo viên và học sinh qua
WebSockets [XÁC NHẬN: DevTools inspection trên nearpod.com] .
Thêm loại game mới: 100% do đội ngũ kỹ sư tập đoàn Renaissance Learning lập trình phát triển và phát hành theo
quý.
1.3. Trải nghiệm khi chơi
Vòng chơi (Time to Climb): Giáo viên chuyển đến slide trò chơi → Học sinh chọn nhân vật đại diện (gấu trúc, cáo,
chim cánh cụt) và chọn chủ đề bối cảnh (Himalayas, Space, Carnival) → Bắt đầu đếm ngược 3-2-1 → Câu hỏi hiện
trên máy học sinh và màn hình lớn → Trả lời đúng và nhanh: nhân vật leo thoăn thoắt lên đỉnh núi kèm tiếng nhạc dồn
dập → Hết câu hỏi: Top 3 học sinh xuất sắc bước lên bục huy chương (Podium) nhận cúp vàng và pháo hoa rực rỡ.
Xử lý sai: Nhân vật đứng yên tại chỗ, bị các bạn khác vượt qua, không bị trừ điểm âm; hệ thống hiển thị đáp án đúng
sau khi hết giờ.
Đồng hồ, Xếp hạng, Mascot: Đồng hồ đếm ngược từng câu (10–30s); Bảng xếp hạng trực tiếp nhân vật leo vách núi;
Linh vật thú cưng hoạt hình phong phú.
Hiệu năng: Đồ họa chuyển động rất mượt mà; tuy nhiên bài giảng chứa nhiều slide VR và video nặng có thể mất 5–
10 giây để nạp trên đường truyền Wi-Fi yếu [XÁC NHẬN: EdTech Impact Review] .
1.4. Tính năng AI
Tên & Ra mắt: Nearpod AI Create / Content Assistant (ra mắt giai đoạn 2024–2026, hợp tác cùng MagicSchool và hệ
sinh thái Renaissance) [XÁC NHẬN: nearpod.com/blog, 2026] .
Khả năng tự động hóa: Nhập chủ đề hoặc dán văn bản để AI tự động tạo slide bài giảng, tạo bộ câu hỏi Time to
Climb hoặc sinh câu hỏi mở. Giáo viên vẫn phải làm tay: Tự rà soát đáp án, chèn ảnh minh họa, căn chỉnh thứ tự các
slide trong giáo án.
Tiếng Việt: Hỗ trợ tiếng Việt ở mức khá qua mô hình dịch tự động; giao diện điều khiển hệ thống vẫn là tiếng Anh.
Vai trò AI: AI là tính năng bổ trợ biên soạn (Authoring Copilot); hệ thống bài giảng tương tác vẫn là giá trị cốt lõi.
1.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC NỘI TẠI (Chỉ có thể chèn link mô phỏng PhET Simulation qua tính năng
Web Content).
b. Tô nét chữ cái: LÀM GẦN ĐÚNG (Dùng hoạt động Draw It: giáo viên tải ảnh nét đứt chữ cái làm hình nền, học sinh
dùng ngón tay đồ lên nét chữ; nhưng hệ thống không có thuật toán tự chấm điểm đúng nét).
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng hoạt động Drag & Drop: tải file ghi âm cô đọc và kéo nhãn ảnh
quả táo vào ô giỏ; không có hiệu ứng rơi tự do vật lý).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM ĐƯỢC (Tạo câu hỏi từ vựng con vật trong game Time to Climb và chọn bối
cảnh giao diện Space Theme).
1.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (Time to Climb): Bước 1: Đăng nhập → Bấm "Create Lesson" → Bấm "Add
Activity". Bước 2: Chọn "Time to Climb". Bước 3: Dùng AI Create gõ prompt hoặc nhập tay câu 1 ("Có mấy chú mèo?"),
bấm tìm ảnh mèo qua Google Images tích hợp. Bước 4: Nhập đáp án đúng/sai, lặp lại cho đủ 5 câu. Bước 5: Cài thời
gian 30s/câu → Bấm "Save" → Bấm "Live Participation" để lấy mã phòng [XÁC NHẬN: Nearpod Teacher Tutorial] .
Thời gian thực tế: Tạo thủ công bài giảng có game mất từ 15 đến 25 phút; dùng AI sinh câu hỏi rút ngắn còn 5 đến 7
phút.
1.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Mã bài học 5 chữ cái (CODE) nhập trên nearpod.com hoặc ứng dụng Nearpod, mã QR, link trực
tiếp, nhúng Google Classroom/Canvas. Hỗ trợ 2 chế độ: Live Participation (giáo viên điều khiển chuyển slide đồng bộ
cả lớp) và Student-Paced (học sinh tự mở bài tập làm tại nhà).
Tài khoản học sinh: Học sinh hoàn toàn không cần tài khoản; chỉ cần nhập mã CODE và Tên khi vào lớp. Tuân thủ
nghiêm ngặt các quy chuẩn an toàn bảo vệ trẻ em COPPA, FERPA, đạt chứng nhận CSPC
[XÁC NHẬN: nearpod.com/privacy-policy] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 2 / 13



## Trang 3

Phụ huynh: Học sinh có thể dùng mã Student-Paced để mở lại bài học trên máy tính bảng ở nhà cùng phụ huynh.
1.8. Chi phí và giới hạn
Gói miễn phí (Silver): Giới hạn dung lượng lưu trữ 100MB, tối đa 40 học sinh tham gia/phiên học, đầy đủ các loại
hoạt động cơ bản [XÁC NHẬN: educationalappstore.com 2025; nearpod.com/pricing] .
Gói trả phí cá nhân: Gói Gold: 120.00 – 159.00 USD/năm (~3.000.000 – 3.900.000 VNĐ/năm, 1GB lưu trữ, 75 học
sinh); Gói Platinum: 349.00 – 397.00 USD/năm (5GB lưu trữ, 90 học sinh); Gói School & District: liên hệ báo giá
trường học [XÁC NHẬN: saasworthy.com/product/nearpod/pricing, 09/2025] .
Bản địa hóa: Giao diện hệ thống bằng tiếng Anh; gõ dấu tiếng Việt mượt mà; tích hợp sẵn công cụ Microsoft
Immersive Reader hỗ trợ đọc to văn bản tiếng Việt trên các slide bài đọc.
2. LUMIO BY SMART (lumio.com - Thuộc SMART Technologies)
2.1. Danh mục cơ chế chơi
Nền tảng chuyển đổi bài giảng thành không gian tương tác số hóa kế thừa di sản của bảng tương tác thông minh
SMART Board: Monster Quiz (chia lớp thành các đội ấp trứng quái vật; trả lời đúng trứng nở quái vật nhanh hơn), Super
Sort (kéo thả đối tượng vào 2 lồng phân loại: Rừng rậm vs Biển, Thuyền trưởng vs Khủng long), Rank Order (kéo sắp xếp
thứ tự chuỗi sự kiện hoặc số học), Speedy Thinker (trả lời nhanh xoay vòng), Flip Out (thẻ bài lật 2 mặt flashcards),
Game Show (vòng quay kỳ diệu và câu đố tính điểm), Match It Up! (nối cặp 2 cột), Shout It Out! (học sinh gửi ảnh và chữ
từ máy cá nhân bay lên bảng thông minh), Group Workspace (không gian làm việc nhóm trực tiếp)
[XÁC NHẬN: smarttech.com/lumio; support.smarttech.com] .
Thao tác & Kỹ năng: Bấm đáp án trắc nghiệm trên thiết bị (Monster Quiz); kéo thả phân loại vật thể vào 2 hộp (Super
Sort); lật thẻ bài (Flip Out); kéo xếp thứ tự (Rank Order); rèn tư duy phân loại logic, ghi nhớ thị giác và phản xạ đồng
đội. Mẫu phổ biến nhất: Monster Quiz, Super Sort và Shout It Out!.
Độ tuổi 3–6 tuổi: Rất phù hợp với Super Sort (kéo thả hình ảnh trực quan vào lồng có hoạt họa vui nhộn) và Flip Out;
Monster Quiz có hình quái vật hoạt hình cực kỳ lôi cuốn trẻ nhỏ.
Độ tuổi 6–11 tuổi: Rất phù hợp cho học sinh tiểu học thao tác trực tiếp trên bảng thông minh hoặc máy tính bảng.
2.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: CÓ tính năng chuyển đổi mẫu linh hoạt trong nhóm Game-based activities. Giáo viên tạo 1
danh sách phân loại có thể dễ dàng chuyển đổi qua lại giữa Super Sort và Match It Up mà không phải nhập lại dữ liệu
[XÁC NHẬN: support.smarttech.com] .
Định dạng dữ liệu: Định dạng tệp SMART Notebook (.notebook) hoặc JSON Lesson Schema đám mây lưu trữ trên
nền tảng Microsoft Azure / AWS.
Công nghệ hiển thị: HTML5 Canvas 2D kết hợp CSS3 Animations; tối ưu hóa cảm ứng chạm đa điểm (Multi-touch)
chuyên sâu cho phần cứng SMART Board và màn hình cảm ứng di động [XÁC NHẬN: SMART Technologies Tech Specs] .
Thêm loại game mới: Đội ngũ kỹ sư phần mềm của SMART Technologies trực tiếp lập trình và cập nhật định kỳ.
2.3. Trải nghiệm khi chơi
Vòng chơi (Monster Quiz): Giáo viên kích hoạt hoạt cảnh trên màn hình lớn → Học sinh tham gia qua mã lớp
hellosmart.com → Hệ thống tự động chia lớp thành 2–4 đội và gán các quả trứng quái vật màu sắc → Học sinh trả
lời câu hỏi trên máy cá nhân → Mỗi câu trả lời đúng làm vỏ trứng rạn nứt dần → Đội nào hoàn thành trước thì quái
vật nở bung ra nhảy múa chúc mừng kèm tiếng nhạc chiến thắng rộn rã.
Xử lý sai: Vỏ trứng không nứt, rung lắc nhẹ, học sinh được xem lại câu trả lời đúng trên màn hình cá nhân.
Đồng hồ, Xếp hạng, Mascot: Không ép thời gian gay gắt; Bảng tiến độ ấp trứng quái vật trực quan trên màn hình
chính; Hệ sinh thái quái vật ngộ nghĩnh (Monsters) là linh vật đặc trưng.
Hiệu năng: Đồ họa chuyển động cực kỳ bắt mắt, cảm ứng siêu nhạy trên màn hình lớn; chuyển động 60 FPS không
giật lag [XÁC NHẬN: EdTech Digest Review] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 3 / 13



## Trang 4

2.4. Tính năng AI
Tên & Ra mắt: Lumio AI Activity Generator (bổ sung trong giai đoạn 2024–2026)
[XÁC NHẬN: smarttech.com/en/lumio, 2026] .
Khả năng tự động hóa: Nhập chủ đề bài học để AI tự động đề xuất câu hỏi trắc nghiệm hoặc phân loại các cặp khái
niệm vào game Super Sort. Giáo viên vẫn phải làm tay: Duyệt nội dung, tải thêm hình ảnh nếu cần và gắn bài vào tiến
trình giảng dạy.
Tiếng Việt: Hỗ trợ tiếng Việt cơ bản; giao diện đã có bản địa hóa tiếng Việt một phần.
Vai trò AI: AI là tính năng tiện ích bổ trợ; giá trị cốt lõi là hệ thống hoạt động tương tác nhóm và khả năng kết nối
phần cứng.
2.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC (Chỉ hỗ trợ nhúng công cụ toán học mô phỏng Desmos hoặc GeoGebra).
b. Tô nét chữ cái: LÀM GẦN ĐÚNG (Dùng chế độ Individual Handout trên slide cho học sinh dùng bút mực kỹ thuật
số đồ lên nét chữ, nhưng không có AI chấm điểm chuẩn nét).
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Dùng mẫu Super Sort: đặt 2 nhóm giỏ và kéo thả ảnh táo, nhưng thiếu
hiệu ứng rơi vật lý).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM ĐƯỢC (Game Super Sort và Monster Quiz có sẵn tùy chọn giao diện Theme
Space ngoài không gian).
2.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (Super Sort): Bước 1: Mở Lumio → Bấm "Add Activities" → Chọn "Game-based
Activities". Bước 2: Chọn mẫu "Super Sort". Bước 3: Đặt tên 2 nhóm (ví dụ: "Dưới 5 con vật" và "Từ 5 con vật trở lên").
Bước 4: Tải ảnh các con vật vào 2 cột tương ứng. Bước 5: Chọn Theme Rừng rậm hoặc Vũ trụ → Bấm "Finish"
[XÁC NHẬN: Lumio Quick Start Guide] .
Thời gian thực tế: Tạo thủ công mất từ 10 đến 15 phút; nếu dùng AI gợi ý câu hỏi mất khoảng 4 đến 6 phút.
2.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Học sinh truy cập trang hellosmart.com, nhập mã Class ID (6 chữ số), quét mã QR hoặc liên kết
Google Classroom. Hỗ trợ chế độ điều khiển tập trung trên lớp và chế độ tự học cá nhân.
Tài khoản học sinh: Học sinh có thể tham gia với tư cách Khách (Guest) không cần tài khoản; nếu đăng nhập tài
khoản trường học sẽ lưu được bài làm cá nhân. Tuân thủ chuẩn COPPA, FERPA, GDPR
[XÁC NHẬN: smarttech.com/privacy] .
Phụ huynh: Phụ huynh có thể mở lại bài học cho con tự ôn tập trên trình duyệt web tại nhà.
2.8. Chi phí và giới hạn
Gói miễn phí (Standard): Lưu trữ tối đa 50MB dung lượng bài giảng, mở đầy đủ các hoạt động trò chơi game-based
cơ bản [XÁC NHẬN: smarttech.com/pricing] .
Gói trả phí (Lumio Plan): Khoảng 59.00 – 79.00 USD/năm (~1.500.000 – 1.950.000 VNĐ/năm) cho giáo viên cá
nhân không giới hạn dung lượng; thường được cấp miễn phí khi trường học trang bị màn hình thông minh SMART
Board [XÁC NHẬN: smarttech.com/lumio/pricing, 2026] .
Bản địa hóa: Giao diện hỗ trợ tiếng Việt; gõ dấu tiếng Việt tốt; hỗ trợ đa phương tiện mạnh mẽ.
3. PEAR DECK (peardeck.com - Thuộc GoGuardian)
3.1. Danh mục cơ chế chơi & Tương tác
Hệ thống bổ trợ biến bài thuyết trình tĩnh thành slide tương tác nhiều lớp (Interactive Presentation Overlays): Draggable
(kéo thả các chấm tròn định vị, biểu tượng ngôi sao, cờ, thuyền lên bất kỳ vị trí nào trên slide bản đồ/hình vẽ), Drawing
(vẽ tay tự do, tô màu hoặc viết chữ trực tiếp lên slide bài giảng), Text Response (nhập văn bản trả lời câu hỏi mở),
Multiple Choice (bình chọn hoặc trả lời trắc nghiệm), Number (nhập số toán học), Web Site Embedding (nhúng trang
web/mô phỏng tương tác) [XÁC NHẬN: peardeck.com; goguardian.com/pear-deck] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 4 / 13



## Trang 5

Thao tác & Kỹ năng: Kéo thả chấm tròn định vị (Draggable); dùng ngón tay/bút vẽ cảm ứng (Drawing); rèn khả năng
định vị không gian, chú ý chi tiết thị giác và phản xạ trả lời câu hỏi bài học. Mẫu độc đáo và phổ biến nhất: Draggable
và Drawing.
Độ tuổi 3–6 tuổi: Có thể sử dụng tính năng Drawing (cho bé tô màu hình có sẵn) hoặc Draggable (bé kéo chấm tròn
đặt vào chú gấu đúng); không phù hợp với Text và Number.
Độ tuổi 6–11 tuổi: Rất phù hợp cho học sinh tiểu học tương tác trong suốt tiến trình giáo viên giảng bài trên lớp.
3.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Gắn chặt với tiến trình slide. Pear Deck hoạt động dưới dạng Add-on trên Google Slides
hoặc Add-in trên Microsoft PowerPoint. Dữ liệu câu hỏi và tọa độ tương tác được lưu trữ dưới dạng Slide Metadata
bên trong tệp bài giảng [XÁC NHẬN: peardeck.zendesk.com] .
Định dạng dữ liệu: JSON Metadata gắn trực tiếp vào các đối tượng trang chiếu (Google Slides API / Office
OpenXML).
Công nghệ hiển thị: Frontend học sinh chạy trên nền Web HTML5/SVG responsive; lớp phủ tương tác (Interaction
Overlay) vẽ bằng Canvas/SVG; đồng bộ màn hình giáo viên (Teacher Dashboard) và máy học sinh qua WebSockets
[XÁC NHẬN: DevTools inspection trên peardeck.com] .
Thêm loại game mới: Hoàn toàn do đội ngũ kỹ sư GoGuardian phát triển.
3.3. Trải nghiệm khi chơi
Vòng chơi: Giáo viên trình chiếu bài giảng trên máy chiếu → Đến slide tương tác → Màn hình thiết bị học sinh tự
động mở công cụ tương ứng (chấm tròn hoặc bút vẽ) → Học sinh kéo chấm tròn đặt vào vị trí con vật trên màn hình
của mình → Giáo viên bấm nút "Show Responses" trên máy chiếu: tất cả các chấm tròn của 40 học sinh xuất hiện
đồng thời dưới dạng bản đồ nhiệt (Overlay Grid) ẩn danh trên màn hình lớn → Cả lớp cùng quan sát và tranh luận
sôi nổi.
Xử lý sai: Bản chất là công cụ đánh giá hình thành (Formative Assessment), không có tiếng còi báo sai hay trừ điểm
game; mang tính sư phạm thảo luận lớp học.
Đồng hồ, Xếp hạng, Mascot: Không có bảng xếp hạng đối kháng; không có đồng hồ đếm ngược ép buộc; linh vật là
quả lê xanh Pear Mascot thân thiện.
Hiệu năng: Hoạt động ổn định trên nền tảng Google Workspace; đồng bộ thời gian thực mượt mà
[XÁC NHẬN: Common Sense Education Review] .
3.4. Tính năng AI
Tên & Ra mắt: Pear Deck AI / GoGuardian Generative Tools (ra mắt giai đoạn 2024–2026)
[XÁC NHẬN: peardeck.com/ai, 2026] .
Khả năng tự động hóa: Tự động gợi ý câu hỏi kích thích tư duy, tạo các slide trắc nghiệm và câu hỏi mở từ văn bản
giáo án sẵn có. Giáo viên vẫn phải làm tay: Tự thiết kế bố cục slide trên Google Slides, chọn biểu tượng cho công cụ
Draggable và điều khiển buổi học.
Tiếng Việt: Hỗ trợ tiếng Việt rất tốt nhờ nền tảng Google Workspace xử lý phông chữ và văn bản tiếng Việt hoàn hảo.
Vai trò AI: AI là tính năng bổ trợ tăng tốc soạn slide.
3.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: LÀM GẦN ĐÚNG (Tạo slide chứa ảnh chữ cái nét đứt, học sinh dùng công cụ Drawing để đồ nét lên;
hệ thống không chấm điểm đúng nét tự động).
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Thiết kế slide có cây táo và chiếc giỏ, học sinh dùng công cụ
Draggable kéo chấm tròn từ quả táo vào giỏ).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM ĐƯỢC (Tự do thiết kế hình nền slide du hành vũ trụ bằng Google Slides và
chèn từ vựng con vật).
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 5 / 13



## Trang 6

3.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật" (Draggable): Bước 1: Mở Google Slides → Soạn 5 slide có ảnh con vật. Bước 2:
Mở tiện ích Pear Deck Add-on. Bước 3: Chọn tính năng "Draggable" cho từng slide. Bước 4: Chọn biểu tượng chấm
tròn hoặc icon số và đặt tọa độ. Bước 5: Bấm "Start Lesson" → Chọn chế độ Instructor-Paced
[XÁC NHẬN: Pear Deck Help Center] .
Thời gian thực tế: Do phải tự tay thiết kế và dàn trang từng slide trên Google Slides, giáo viên mất từ 20 đến 35 phút
để hoàn thành một bài học tương tác hoàn chỉnh.
3.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Mã lớp 5 chữ cái trên joinpd.com, liên kết trực tiếp, chia sẻ Google Classroom. Có 2 chế độ:
Instructor-Paced (cô chuyển slide thì máy trò chuyển theo) và Student-Paced (học sinh tự lướt slide làm bài tập).
Tài khoản học sinh: Học sinh đăng nhập bằng tài khoản Google hoặc Microsoft trường học (bản Premium cho phép
vào ẩn danh). Đạt chuẩn bảo mật nghiêm ngặt iKeepSafe, tuân thủ COPPA và FERPA [XÁC NHẬN: peardeck.com/privacy]
.
Phụ huynh: Học sinh có thể mở lại slide bài học ở chế độ Student-Paced trên máy tính gia đình.
3.8. Chi phí và giới hạn
Gói miễn phí: Cho phép sử dụng các dạng câu hỏi cơ bản (Text, Multiple Choice, Number, Web); khóa hoàn toàn 2
tính năng tương tác tốt nhất là Drawing và Draggable [XÁC NHẬN: peardeck.com/pricing] .
Gói trả phí (Pear Deck Premium): 149.99 USD/năm (~3.750.000 VNĐ/năm) cho giáo viên cá nhân; gói trường học
tích hợp toàn diện trong hệ thống GoGuardian [XÁC NHẬN: peardeck.com/pricing, 2026] .
Bản địa hóa: Giao diện điều khiển tiếng Anh; gõ dấu tiếng Việt chuẩn 100% trên slide; không có giọng đọc TTS tiếng
Việt tích hợp sẵn.
4. CLASSPOINT (classpoint.io - Thuộc Inknoe)
4.1. Danh mục cơ chế chơi & Tương tác
Công cụ tương tác tất cả trong một (All-in-one Interactive Teaching Tool) nhúng trực tiếp vào Microsoft PowerPoint:
Multiple Choice (trắc nghiệm với chế độ Quiz Mode tự động chấm điểm và trao sao), Word Cloud (đám mây từ ngữ thời
gian thực), Short Answer (trả lời ngắn), Slide Drawing (học sinh vẽ trực tiếp lên slide bài giảng của cô), Image Upload
(chụp ảnh bài làm gửi lên bảng), Audio Record (ghi âm giọng nói phát âm), Video Upload, Fill in the Blanks (điền
khuyết). Đặc biệt có tính năng Draggable Objects (biến bất kỳ hình ảnh/chữ nào trên slide PowerPoint thành vật thể kéo
thả trực tiếp trong lúc trình chiếu) và Interactive Whiteboard [XÁC NHẬN: classpoint.io; playquizzo.com 2026] .
Thao tác & Kỹ năng: Bấm đáp án trắc nghiệm trên điện thoại; dùng ngón tay vẽ lên slide (Slide Drawing); thu âm
giọng nói (Audio Record); giáo viên kéo thả vật thể trực tiếp trên màn hình Tivi (Draggable Objects); rèn tư duy ngôn
ngữ, phát âm, sáng tạo hội họa và phản xạ tương tác lớp học. Mẫu phổ biến nhất: Multiple Choice, Word Cloud và
Slide Drawing.
Độ tuổi 3–6 tuổi: Rất phù hợp với Slide Drawing (bé tô màu tranh) và Audio Record (bé thu âm giọng đọc phát âm từ);
giáo viên dùng Draggable Objects để kéo thả quả táo, que tính trực quan trên Smart TV cho cả lớp xem.
Độ tuổi 6–11 tuổi: Rất phù hợp cho học sinh tiểu học Việt Nam trong các tiết học có trình chiếu PowerPoint.
4.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Gắn chặt 100% vào tệp slide trình chiếu PowerPoint (.pptx). Hoạt động ClassPoint là một
nút lệnh (Action Button) được chèn trực tiếp lên trang slide hiện tại [XÁC NHẬN: classpoint.io] .
Định dạng dữ liệu: Dữ liệu lưu trong cấu trúc nhúng VSTO (Visual Studio Tools for Office) bên trong tệp PowerPoint
và đồng bộ phiên làm việc qua máy chủ đám mây ClassPoint Cloud API.
Công nghệ hiển thị: Phần mềm cài đặt trên máy tính (Client Add-in) viết bằng C# / .NET tương tác sâu với tiến trình
PowerPoint của Windows; giao diện học sinh là trang web HTML5 mobile responsive mượt mà kết nối qua
WebSockets [XÁC NHẬN: Inknoe Technical Architecture] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 6 / 13



## Trang 7

Thêm loại game mới: Đội ngũ kỹ sư Inknoe (Singapore) trực tiếp phát triển và phát hành qua các bản cập nhật phần
mềm cài đặt.
4.3. Trải nghiệm khi chơi
Vòng chơi: Giáo viên bật F5 trình chiếu slide PowerPoint → Bấm nút kích hoạt câu hỏi trên slide → Màn hình điện
thoại/máy tính bảng của học sinh hiện giao diện trả lời → Học sinh thao tác gửi bài → Máy chiếu lớp học lập tức hiển
thị biểu đồ hoặc bài vẽ của từng em → Giáo viên bấm tặng Sao (Stars) trực tiếp cho các câu trả lời hay → Hiệu ứng
âm thanh tinh tang rộn rã, học sinh tích sao thăng cấp (Level Up) và mở khóa các huy hiệu (Badges) vinh danh trên
lớp.
Xử lý sai: Giáo viên có thể giấu đáp án sai hoặc mở xem ai chọn sai để giảng lại bài nhẹ nhàng.
Đồng hồ, Xếp hạng, Mascot: Có đồng hồ bấm giờ (Timer); Bảng xếp hạng Leaderboard tích lũy sao suốt học kỳ; Hệ
thống cấp bậc Level và huy hiệu vinh danh độc đáo.
Hiệu năng: Chạy cực kỳ mượt và ổn định vì chạy trực tiếp trên phần mềm PowerPoint cài sẵn trong máy giáo viên
[XÁC NHẬN: DigitalAiRole 2026 Review] .
4.4. Tính năng AI
Tên & Ra mắt: ClassPoint AI (AI Quiz Generator) (ra mắt năm 2023, nâng cấp toàn diện 2024–2026)
[XÁC NHẬN: classpoint.io/blog/top-ai-quiz-generators-for-teachers, 01/2026] .
Khả năng tự động hóa: Độc đáo nhất nhóm: Tự động đọc và phân tích toàn bộ nội dung văn bản và hình ảnh trên
trang slide PowerPoint đang mở, áp dụng Thang đo nhận thức Bloom (Bloom's Taxonomy) để tự sinh câu hỏi trắc
nghiệm, tạo đáp án đúng/sai và chèn thẳng thành một slide mới trong PowerPoint chỉ trong 3 giây. Mở hoàn toàn
miễn phí không giới hạn. Giáo viên vẫn làm tay: Duyệt lại câu hỏi và chuẩn bị sẵn slide bài giảng ban đầu.
Tiếng Việt: Hỗ trợ tiếng Việt xuất sắc nhất; nhận diện chuẩn xác 100% ngữ liệu tiếng Việt trên slide của giáo viên.
Vai trò AI: Tính năng AI là vũ khí then chốt (Key Differentiator) giúp ClassPoint cạnh tranh trực diện với Kahoot và
Quizizz.
4.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC TỰ ĐỘNG (Giáo viên có thể dùng Draggable Objects để kéo các quả cân
bằng tay trên màn hình, nhưng không có physics engine tính trọng lượng cân bằng).
b. Tô nét chữ cái: LÀM GẦN ĐÚNG (Dùng hoạt động Slide Drawing: học sinh dùng ngón tay đồ lên nét chữ cái có sẵn
trên slide, giáo viên xem bài vẽ trên máy chiếu nhưng hệ thống không tự chấm điểm).
c. Nghe đọc kéo táo vào giỏ: LÀM GẦN ĐÚNG (Giáo viên dùng tính năng Draggable Objects để kéo quả táo vào giỏ
trên màn hình Tivi lớp học).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM ĐƯỢC (Tự do thiết kế slide PowerPoint chủ đề phi thuyền vũ trụ và chèn câu
hỏi từ vựng con vật).
4.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Mở PowerPoint → Soạn slide có hình ảnh con vật. Bước 2: Bấm F5 trình
chiếu → Bấm nút "ClassPoint AI" trên thanh công cụ → Chọn dạng Multiple Choice và mức độ Bloom → AI tự sinh
câu hỏi và tạo slide mới trong 3 giây. Bước 3: Lặp lại cho 5 slide. Bước 4: Lưu file PowerPoint
[XÁC NHẬN: ClassPoint AI Official Guide] .
Thời gian thực tế: Nhờ AI đọc trực tiếp slide PowerPoint có sẵn, giáo viên chỉ mất từ 3 đến 5 phút để hoàn thành bộ
câu hỏi (nhanh nhất trong việc tạo tương tác trên slide) [XÁC NHẬN: playquizzo.com, 10/2026] .
4.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Học sinh vào classpoint.app trên bất kỳ trình duyệt nào, nhập mã Class Code (5 chữ số) hiển thị ở
góc slide, hoặc quét mã QR. Chỉ hoạt động ở chế độ Live trực tiếp trên lớp (không có chế độ giao bài tập về nhà làm
độc lập).
Tài khoản học sinh: Học sinh không cần tài khoản; chỉ cần nhập tên. Tuân thủ COPPA, FERPA, đạt chuẩn bảo mật dữ
liệu giáo dục [XÁC NHẬN: classpoint.io/privacy-policy] .
Phụ huynh: Không hỗ trợ phụ huynh chơi cùng con ở nhà vì bài giảng chỉ chạy khi giáo viên mở PowerPoint trình
chiếu.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 7 / 13



## Trang 8

4.8. Chi phí và giới hạn
Gói miễn phí (Basic): Tối đa 25 học sinh/lớp, lưu trữ tối đa 3 lớp học, tối đa 5 hoạt động tương tác trong 1 bài thuyết
trình, mở không giới hạn tính năng ClassPoint AI [XÁC NHẬN: playquizzo.com 2026; classpoint.io/pricing] .
Gói trả phí (ClassPoint Pro): 96.00 USD/năm (thanh toán năm ~8.00 USD/tháng ~ 2.400.000 VNĐ/năm); mở rộng
lên 200 học sinh/lớp, không giới hạn số lượng hoạt động, mở khóa toàn bộ tính năng cao cấp
[XÁC NHẬN: digitalairole.com 2026; classpoint.io/pricing] .
Bản địa hóa: Giao diện phần mềm đã có bản dịch tiếng Việt hoàn chỉnh; gõ dấu tiếng Việt tốt; cộng đồng giáo viên
tiểu học Việt Nam ứng dụng cực kỳ phổ biến.
5. BAAMBOOZLE (baamboozle.com)
5.1. Danh mục cơ chế chơi
Nền tảng trò chơi chuyên biệt số 1 thế giới cho mô hình 1 màn hình duy nhất (Single-Screen / Whole-Class Games):
Classic Baamboozle Game (bảng lưới 16–24 ô số bí mật; chia lớp thành 2–4 đội; đội chọn ô số để trả lời câu hỏi lật mở;
lồng ghép các ô quyền năng gián đoạn - Power-ups: Steal 20 points, Give 15 points, Swap scores, Go to 0, Double
points), Baamboozle+ Arcade Games (chế độ chơi độc quyền cho bản trả phí: World Pup Soccer - sút phạt đền vào lưới
khi trả lời đúng, Bowling - ném đổ ki bowling tính điểm, Snakes & Ladders - cờ cá ngựa leo thang gặp rắn thụt lùi, Tic-
Tac-Toe, Memory, 4 in a Row) [XÁC NHẬN: baamboozle.com; premiumvns.com 2026] .
Thao tác & Kỹ năng: Học sinh hoàn toàn KHÔNG CẦN chạm vào bất kỳ thiết bị nào; học sinh thảo luận nhóm sôi nổi
rồi cử đại diện trả lời miệng hoặc lên bảng chỉ tay; giáo viên điều khiển chuột bấm lật ô và xác nhận Đúng/Sai (nút
Check hoặc Oops); rèn tinh thần làm việc nhóm, kỹ năng diễn đạt ngôn ngữ miệng, khả năng chấp nhận rủi ro và gắn
kết tập thể. Mẫu phổ biến nhất: Classic Baamboozle Game.
Độ tuổi 3–6 tuổi: Rất phù hợp; giáo viên mầm non tạo các ô số lật mở hình ảnh con vật, đồ vật để cả lớp cùng đồng
thanh đọc to; không khí lớp học cực kỳ vui nhộn và không gây ức chế thiết bị.
Độ tuổi 6–11 tuổi: Rất phù hợp cho các hoạt động khởi động (Warm-up) hoặc củng cố kiến thức 5–10 phút đầu/cuối
tiết học.
5.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt hoàn hảo 100%. Giáo viên chỉ cần tạo 1 bộ câu hỏi (Game Content: gồm các thẻ
câu hỏi + câu trả lời + hình ảnh + số điểm); sau đó có thể chọn chơi bất kỳ chế độ nào (Classic, Soccer, Bowling,
Snakes & Ladders) mà không bị mất dữ liệu [XÁC NHẬN: baamboozle.com/knowledge-base] .
Định dạng dữ liệu: Cấu trúc JSON phẳng lưu trữ mảng thẻ bài: cards: [{question, answer, points,
image_url}] trên máy chủ đám mây.
Công nghệ hiển thị: Frontend xây dựng trên nền tảng Web HTML5/CSS3 animations gọn nhẹ; hoạt họa thẻ bài lật
xoay CSS 3D Transforms; không cần giao thức thời gian thực phức tạp vì toàn bộ logic xử lý cục bộ trên máy tính
giáo viên [XÁC NHẬN: DevTools inspection trên baamboozle.com] .
Thêm loại game mới: 100% do đội ngũ kỹ sư Baamboozle (Canada) thiết kế và phát hành.
5.3. Trải nghiệm khi chơi
Vòng chơi: Giáo viên chiếu màn hình bảng ô số lên Smart TV/máy chiếu → Chia lớp thành Team 1 và Team 2 → Đội
1 chọn ô số 5 → Ô số lật mở câu hỏi kèm hình ảnh con vật → Đội 1 thảo luận và trả lời miệng → Giáo viên bấm nút
"Check" nếu đúng (cộng điểm) hoặc "Oops" nếu sai (không có điểm) → Bất ngờ mở trúng ô "Swap Points" (hoán đổi
điểm 2 đội) khiến cả lớp ồ lên phấn khích → Kết thúc trò chơi màn hình bùng nổ cúp vàng và pháo hoa trao cho đội
thắng cuộc.
Xử lý sai: Bấm nút Oops (sai), tiếng kêu "boing" vui nhộn vang lên, không bị trừ điểm âm nặng, chuyển lượt chọn ô
cho đội tiếp theo.
Đồng hồ, Xếp hạng, Mascot: Có tùy chọn đồng hồ đếm ngược; Bảng điểm số các đội nhảy số to rõ ở hai bên màn
hình; Hoạt họa các chú cún và hình khối vui nhộn.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 8 / 13



## Trang 9

Hiệu năng: Tải trang tức thì trong 1 giây; hoàn toàn không lo nghẽn mạng lớp học vì chỉ có duy nhất 1 luồng kết nối
Internet từ máy tính giáo viên [XÁC NHẬN: Weekend EdTech Review 2025] .
5.4. Tính năng AI
Thực trạng AI: Hầu như chưa có công cụ GenAI chính thức độc lập (đang trong lộ trình thử nghiệm AI Assistant giai
đoạn 2025–2026) [XÁC NHẬN: baamboozle.com, 2026] . Nền tảng dựa trên kho thư viện cộng đồng khổng lồ với hơn 2
triệu trò chơi do giáo viên toàn cầu chia sẻ.
Quy trình biên tập: Giáo viên nhập câu hỏi và câu trả lời vào biểu mẫu thủ công.
Tiếng Việt: Giao diện web hoàn toàn bằng tiếng Anh; hỗ trợ gõ nội dung tiếng Việt có dấu chuẩn Unicode; thư viện
cộng đồng có hàng nghìn bộ câu hỏi tiếng Việt do giáo viên Việt Nam chia sẻ.
Vai trò AI: Không phụ thuộc vào AI.
5.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC (Không có thao tác cảm ứng kéo thả của học sinh).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Tạo câu hỏi từ vựng con vật và tổ chức trò chơi với không khí thi
đua sôi nổi).
5.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập → Bấm "Make Game". Bước 2: Nhập tiêu đề "Đếm con vật lớp
1". Bước 3: Gõ câu 1 (Question: "Có bao nhiêu chú khỉ?", Answer: "4 chú khỉ", tải ảnh minh họa). Bước 4: Lặp lại cho
đủ 5 câu. Bước 5: Bấm "Save" → Bấm "Play" → Chọn chế độ "Baamboozle Classic" → Bắt đầu chơi
[XÁC NHẬN: Baamboozle Knowledge Base] .
Thời gian thực tế: Quy trình nhập liệu cực kỳ tối giản, giáo viên chỉ mất từ 5 đến 8 phút để tạo xong một trò chơi
hoàn chỉnh.
5.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Chỉ cần giáo viên mở đường link bài học trên trình duyệt máy tính kết nối màn hình Tivi/máy chiếu
lớp học. Học sinh 0% cần thiết bị số, 0% cần tài khoản. Tuyệt đối an toàn dữ liệu trẻ em vì hệ thống không thu thập
bất kỳ thông tin nào của học sinh [XÁC NHẬN: baamboozle.com/privacy-policy] .
Phụ huynh: Phụ huynh có thể mở link bài học trên điện thoại hoặc máy tính ở nhà để đố vui cùng con vào dịp cuối
tuần.
5.8. Chi phí và giới hạn
Gói miễn phí (Basic): Chơi chế độ Classic tối đa 4 đội, bị giới hạn chỉ tạo được 1 thư mục (Folder) lưu trữ, có xuất
hiện banner quảng cáo viền ngoài [XÁC NHẬN: premiumvns.com 2026; baamboozle.com] .
Gói trả phí (Baamboozle+): 4.99 USD/tháng (thanh toán năm ~59.88 USD/năm ~ 1.500.000 VNĐ/năm) hoặc 7.99
USD/tháng; xóa sạch quảng cáo, không giới hạn thư mục, mở tối đa 8 đội và mở khóa toàn bộ các chế độ chơi
Arcade độc quyền (Soccer, Bowling, Snakes & Ladders) [XÁC NHẬN: weekend.com/post/kahoot-alternatives, 12/2025] .
Bản địa hóa: Giao diện tiếng Anh; hỗ trợ gõ dấu tiếng Việt tốt; kho tài nguyên cộng đồng giáo viên Việt Nam rất
phong phú.
6. PLICKERS (plickers.com)
6.1. Danh mục cơ chế chơi & Tương tác
Hệ thống đánh giá lớp học độc nhất vô nhị trên thế giới ứng dụng công nghệ thị giác máy tính (Computer Vision) kết
hợp thẻ giấy in mã hóa: Paper-based Student Response System (học sinh cầm thẻ giấy in mã hình học độc bản có 4
cạnh tương ứng 4 đáp án A, B, C, D); Scoresheet (bảng tổng hợp điểm số toàn diện của lớp), Now Playing Live View
(màn hình hiển thị câu hỏi và nhận diện thẻ theo thời gian thực) [XÁC NHẬN: plickers.zendesk.com; teachfloor.com 2026] .
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 9 / 13



## Trang 10

Thao tác & Kỹ năng: Học sinh đọc câu hỏi trên bảng máy chiếu; xoay cạnh thẻ có chữ cái đáp án lựa chọn (A, B, C
hoặc D) hướng lên trên đỉnh và giơ trước ngực; giáo viên dùng camera điện thoại/iPad quét một lượt cả phòng học
trong 2–3 giây; rèn tính tự chủ, tư duy độc lập (chống nhìn trộm bài bạn vì mã hình học rất khó đọc từ xa) và bảo vệ
quan điểm cá nhân. Mẫu duy nhất và cốt lõi: Plickers Card Scanning.
Độ tuổi 3–6 tuổi: Có thể sử dụng cho trẻ 5–6 tuổi (Lớp Lá) đối với câu hỏi Đúng/Sai (A/B) đơn giản nếu giáo viên
hướng dẫn các con cách cầm cạnh thẻ thẳng đứng.
Độ tuổi 6–11 tuổi: Giải pháp cứu cánh số 1 cho các trường tiểu học công lập Việt Nam nơi học sinh không được trang
bị máy tính bảng hay điện thoại.
6.2. Cách nền tảng tạo trò chơi (Kiến trúc bên trong)
Tách nội dung khỏi mẫu: Tách biệt hoàn toàn. Bộ câu hỏi trắc nghiệm (Question Set) độc lập với danh sách học sinh
và thẻ bài; có thể tái sử dụng một bộ câu hỏi cho nhiều lớp học khác nhau [XÁC NHẬN: plickers.com] .
Định dạng dữ liệu: JSON Question Set lưu trữ câu hỏi, 4 đáp án và ảnh đính kèm; cơ sở dữ liệu ánh xạ danh sách học
sinh theo từng Card ID (từ Card 1 đến Card 40).
Công nghệ hiển thị & Nhận diện: Màn hình máy chiếu chạy ứng dụng web HTML5 Now Playing; ứng dụng di động
Plickers (iOS/Android) tích hợp thuật toán thị giác máy tính (Computer Vision / OpenCV) quét và giải mã đồng thời
hàng chục thẻ mã giấy trong 1 khung hình camera, bắn dữ liệu kết quả tức thì về máy chủ đám mây qua WebSockets
[XÁC NHẬN: Plickers Patent & Tech Specs] .
Thêm loại game mới: Đội ngũ kỹ sư Plickers Inc. (Hoa Kỳ) duy trì độc quyền.
6.3. Trải nghiệm khi chơi
Vòng chơi: Giáo viên chiếu câu hỏi lên bảng lớp → Học sinh đọc đề và giơ thẻ giấy mã hóa của mình lên → Giáo viên
cầm điện thoại quét một vòng từ bục giảng → Trên màn hình máy chiếu, tên các em học sinh lần lượt sáng đèn xanh
báo hiệu "Đã nhận bài" → Sau 2–3 giây quét xong cả lớp, giáo viên bấm nút hiển thị kết quả (Reveal Answers) → Màn
hình hiện biểu đồ phần trăm học sinh chọn A, B, C, D kèm đáp án đúng màu xanh → Giáo viên phân tích lỗi sai ngay
tại lớp.
Xử lý sai: Thể hiện bằng số liệu thống kê tổng thể, không bêu tên học sinh làm sai trên màn hình lớn; bảo vệ tâm lý tự
tin của trẻ.
Đồng hồ, Xếp hạng: Không có bảng xếp hạng giật gân; tập trung vào độ chính xác và mức độ hiểu bài của từng cá
nhân.
Hiệu năng: Tốc độ nhận diện camera siêu tốc; quét cả lớp 40 học sinh chỉ trong 2–3 giây; hoạt động hoàn hảo ngay
cả khi phòng học không có Wi-Fi cho học sinh [XÁC NHẬN: Educational Technology Journal Review] .
6.4. Tính năng AI
Thực trạng AI: Không sử dụng GenAI để sinh kịch bản câu hỏi; tuy nhiên trọng tâm công nghệ chính là thuật toán Trí
tuệ Nhân tạo Thị giác Máy tính (Computer Vision AI) nhận dạng mẫu hình học đa hướng theo thời gian thực
[XÁC NHẬN: plickers.com/about] .
Quy trình biên tập: Giáo viên tự nhập câu hỏi và đáp án vào trình soạn thảo web.
Tiếng Việt: Giao diện web/app tiếng Anh; hỗ trợ gõ câu hỏi tiếng Việt có dấu chuẩn xác 100%.
Vai trò AI: Thị giác máy tính AI là nền tảng cốt lõi vận hành sản phẩm.
6.5. Giới hạn khi mô tả nằm ngoài mẫu
a. Đĩa cân thăng bằng: KHÔNG LÀM ĐƯỢC.
b. Tô nét chữ cái: KHÔNG LÀM ĐƯỢC.
c. Nghe đọc kéo táo vào giỏ: KHÔNG LÀM ĐƯỢC (Chỉ chọn 1 trong 4 đáp án A/B/C/D).
d. Ghép từ con vật bối cảnh vũ trụ: LÀM GẦN ĐÚNG (Tạo câu hỏi trắc nghiệm A/B/C/D từ vựng con vật và chiếu lên
bảng).
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 10 / 13



## Trang 11

6.6. Quy trình và thời gian tạo trò chơi
Quy trình tạo 5 câu "Đếm con vật": Bước 1: Đăng nhập web Plickers → Bấm "New Set". Bước 2: Nhập 5 câu hỏi trắc
nghiệm (chọn đáp án đúng A, B, C hoặc D) và tải ảnh con vật minh họa. Bước 3: Gán bộ câu hỏi vào Lớp học (Add to
Queue). Bước 4: Tải tệp PDF bộ thẻ Plickers Cards (bộ 40 thẻ) in ra giấy A4 phát cố định cho học sinh trong lớp. Bước
5: Mở app điện thoại chọn bài và mở Now Playing trên máy tính [XÁC NHẬN: Plickers Getting Started Guide] .
Thời gian thực tế: Nhập câu hỏi mất từ 8 đến 12 phút; khâu in và ép nhựa thẻ giấy cho cả lớp mất khoảng 30 phút
một lần đầu năm học và dùng lại suốt cả năm.
6.7. Phân phối và sử dụng trong lớp
Chia sẻ & Chế độ: Sử dụng thẻ giấy in mã QR cá nhân hóa. Học sinh 0% cần thiết bị điện tử, 0% cần tài khoản. Giáo
viên là người duy nhất sử dụng điện thoại để quét. Đạt chuẩn an toàn tuyệt đối COPPA, FERPA
[XÁC NHẬN: plickers.com/privacy] .
Phụ huynh: Giáo viên có thể xuất báo cáo bảng điểm Scoresheet định dạng PDF gửi cho phụ huynh theo dõi.
6.8. Chi phí và giới hạn
Gói miễn phí: Giới hạn tối đa 5 câu hỏi trong một bộ câu hỏi (Question Set), tạo lớp học không giới hạn, in bộ thẻ
chuẩn 40 em miễn phí trên web [XÁC NHẬN: plickers.com/pricing] .
Gói trả phí (Plickers Pro): 8.99 USD/tháng hoặc 71.88 USD/năm (~5.99 USD/tháng ~ 1.800.000 VNĐ/năm); mở
không giới hạn số câu hỏi trong một Set, mở bảng phân tích điểm số chi tiết Scoresheet
[XÁC NHẬN: teachfloor.com/blog/best-classtime-alternatives, 02/2026] .
Bản địa hóa: Giao diện tiếng Anh; hiển thị phông chữ tiếng Việt trên slide to rõ; không cần giọng đọc âm thanh vì giáo
viên trực tiếp đọc đề cho học sinh.
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
Nearpod
Time to Climb
Bấm đáp án đua
nhân vật leo núi
Phản xạ nhanh, trí
nhớ tức thì
Không
(nhiều chữ)
Rất hợp
(lớp 1-5)
[XÁC NHẬN]
nearpod.com
Nearpod
Draw It
Dùng ngón tay/bút
vẽ trực tiếp lên slide
Hội họa, vận động
tinh, biểu đạt
Rất hợp (tô
màu)
Rất hợp
[XÁC NHẬN]
nearpod.zendesk.com
Lumio
Monster Quiz
Trả lời quiz theo đội
ấp nở trứng quái vật
Tương tác nhóm,
phản xạ nhận thức
Hợp (hoạt
họa đẹp)
Rất hợp
[XÁC NHẬN]
smarttech.com
Lumio
Super Sort
Kéo thả đối tượng
vào 2 hộp phân loại
Tư duy phân loại
logic, quan sát
Rất hợp
(ảnh to)
Rất hợp
[XÁC NHẬN]
support.smarttech.com
Pear Deck
Draggable
Kéo chấm tròn định
vị lên ảnh slide
Định vị không gian,
chú ý thị giác
Có (nếu
ảnh to)
Rất hợp
[XÁC NHẬN]
peardeck.com
Pear Deck
Drawing
Vẽ tay tự do hoặc
viết lên slide bài
giảng
Biểu đạt hình ảnh,
giải toán nháp
Hợp (vẽ tự
do)
Rất hợp
[XÁC NHẬN]
goguardian.com
ClassPoint
Slide Drawing
Vẽ lên slide
PowerPoint và gửi
bài
Hội họa, giải toán,
viết chữ
Hợp (vẽ
nét)
Rất hợp
[XÁC NHẬN]
classpoint.io
ClassPoint
Draggable Objects
GV kéo thả vật thể
trực tiếp trên
PowerPoint
Minh họa trực quan
bài giảng
Rất hợp
(GV kéo)
Rất hợp
[XÁC NHẬN]
playquizzo.com
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 11 / 13



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
Baamboozle
Baamboozle Classic
Trả lời miệng lật ô số
trên 1 màn hình Tivi
Giao tiếp miệng, làm
việc nhóm
Rất hợp (rất
vui)
Rất hợp
(khởi động)
[XÁC NHẬN]
baamboozle.com
Plickers
Plickers Card
Scanning
Xoay cạnh thẻ giấy
A/B/C/D giơ trước
ngực
Tư duy độc lập, chọn
đáp án
Có (thẻ
A/B)
Rất hợp (0
máy)
[XÁC NHẬN]
plickers.com
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
Nearpod
Một phần
(Slide
Activity)
JSON
Presentatio
n Schema
React.js +
Canvas 2D +
WebGL
AI Create sinh
câu hỏi/slide
Phụ
(Add-
on)
Khá
(Immersiv
e Reader)
120 – 159
USD/năm
(Gold)
Không
cần
(PIN)
[XÁC
NHẬ
N]
nearpo
d.com
Lumio
Có trong
Game-
based
SMART
Notebook /
JSON
HTML5
Canvas +
Multi-touch
AI sinh câu hỏi
phân loại
Phụ
(Add-
on)
Khá (Giao
diện dịch 1
phần)
59.00 – 79.00
USD/năm
Không
cần
(Guest
)
[XÁC
NHẬ
N]
smartt
ech.co
m
Pear Deck
Không
(Metadata
Slide)
Google
Slides /
PPTX
Metadata
SVG
Overlays +
Canvas
AI gợi ý câu hỏi
tương tác
Phụ
(Add-
on)
Rất tốt
(Font
Google)
149.99
USD/năm
(Premium)
Cần tài
khoản
(bản
Free)
[XÁC
NHẬ
N]
pearde
ck.co
m
ClassPoint
Không
(Gắn vào
PPTX)
VSTO / .NET
OpenXML +
Cloud
C# Desktop
+ HTML5
Web client
AI đọc slide sinh
quiz 3s
Tính
năng
mũi
nhọn
Rất xuất
sắc (Giao
diện + AI)
96.00
USD/năm
(Pro)
Không
cần
(Code)
[XÁC
NHẬ
N]
classp
oint.io
Baambooz
le
Có (1
Game
$\rightarro
w$ Đa
Arcade)
JSON Game
Cards
Schema
HTML5 /
CSS 3D
Transforms
Chưa có GenAI
chính thức
Không
có
Chỉ tiếng
Anh, gõ
dấu OK
59.88
USD/năm
(Plus)
0 thiết
bị HS
[XÁC
NHẬ
N]
baamb
oozle.
com
Plickers
Có
(Question
Set độc
lập)
JSON Set +
Card Map
DB
Computer
Vision +
Web Canvas
Thị giác máy
tính (CV AI)
Lõi
(Core
CV)
Giao diện
Anh, hiển
thị tốt
71.88
USD/năm
(Pro)
0 thiết
bị HS
[XÁC
NHẬ
N]
plicker
s.com
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 12 / 13



## Trang 13

Bảng C3 – Mô tả ngoài mẫu:
Nền tảng
Mô tả a
Mô tả b
Mô tả c
Mô tả d
Nearpod
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Draw It
đồ nét, không tự chấm)
LÀM GẦN ĐÚNG (Drag & Drop
có audio, thiếu rơi)
LÀM ĐƯỢC (Time to Climb có
Space Theme)
Lumio
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Viết
mực số lên slide, không
tự chấm)
LÀM GẦN ĐÚNG (Super Sort
phân loại quả táo)
LÀM ĐƯỢC (Super Sort /
Monster Quiz có Theme
Space)
Pear Deck
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG
(Drawing đồ nét lên
slide)
LÀM GẦN ĐÚNG (Draggable
kéo chấm tròn táo vào giỏ)
LÀM ĐƯỢC (Tự vẽ slide nền
dải ngân hà vũ trụ)
ClassPoint
KHÔNG LÀM ĐƯỢC
LÀM GẦN ĐÚNG (Slide
Drawing đồ nét chữ)
LÀM GẦN ĐÚNG (Cô kéo quả
táo bằng Draggable Objects)
LÀM ĐƯỢC (Thiết kế slide
PowerPoint vũ trụ)
Baamboozle
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC (Không có
thao tác kéo thả)
LÀM GẦN ĐÚNG (Quiz từ
vựng con vật thi đua sôi nổi)
Plickers
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC
KHÔNG LÀM ĐƯỢC (Chỉ xoay
thẻ A/B/C/D)
LÀM GẦN ĐÚNG (Quiz
A/B/C/D về chủ đề vũ trụ)
Ghi chú: Nhóm 5 thể hiện sự phân hóa rõ rệt: các công cụ trình chiếu (Nearpod, Pear Deck, ClassPoint) hỗ trợ vẽ tự do trên slide nhưng
hoàn toàn thiếu engine nhận diện nét chữ chuẩn; trong khi Baamboozle và Plickers giải quyết triệt để bài toán 0 thiết bị nhưng không thể
thực hiện tương tác xúc giác 2D. Đề tài của nhóm lấp khoảng trống này bằng cơ chế đa chế độ Canvas 2D.
PHẦN D – DANH SÁCH ĐIỂM CẦN TỰ ĐĂNG NHẬP KIỂM TRA THỰC NGHIỆM [CẦN TỰ THỬ]
Để hoàn thiện hồ sơ khoa học thực chứng phục vụ bảo vệ khóa luận tốt nghiệp trước hội đồng, sinh viên cần tiến hành các
bước kiểm thử thực tế và chụp màn hình lưu vết đối với 5 điểm kỹ thuật sau:
1. Kiểm tra tốc độ sinh câu hỏi trắc nghiệm của ClassPoint AI trực tiếp trong PowerPoint:
• Hành động: Cài đặt ClassPoint Add-in trên Microsoft PowerPoint (Windows); mở 1 slide chứa văn bản bài học Tiếng
Việt lớp 1; bấm nút ClassPoint AI trong chế độ trình chiếu.
• Bằng chứng cần chụp: Bấm giờ thực tế (đối chiếu tiêu chí 3 giây); chụp ảnh màn hình hộp thoại ClassPoint AI phân tích
nội dung slide và tạo ra slide câu hỏi mới.
2. Kiểm tra cơ chế hoạt động của Baamboozle trên một màn hình duy nhất (Single-Screen):
• Hành động: Tạo 1 trò chơi đố vui miễn phí trên baamboozle.com; mở chế độ Classic Game chia 2 đội; bấm lật 1 ô câu
hỏi bình thường và 1 ô quyền năng (Swap Points).
• Bằng chứng cần chụp: Ảnh chụp giao diện màn hình hiển thị toàn bộ bảng ô số và hộp thoại hoán đổi điểm để chứng
minh học sinh không cần bất kỳ thiết bị cá nhân nào.
3. Kiểm tra khả năng nhận diện thẻ giấy của Plickers bằng camera điện thoại:
• Hành động: In 4 thẻ Plickers mẫu ra giấy A4; mở màn hình Now Playing trên máy tính; dùng ứng dụng Plickers trên điện
thoại quét đồng thời 4 thẻ ở các khoảng cách khác nhau (2m, 5m).
• Bằng chứng cần chụp: Ảnh chụp màn hình điện thoại nhận diện thẻ và màn hình máy tính sáng đèn xanh tên học sinh,
ghi chú độ trễ nhận diện thực tế.
4. Kiểm tra giới hạn khóa tính năng Draggable và Drawing trên Pear Deck tài khoản miễn phí:
• Hành động: Mở Google Slides, cài đặt tiện ích Pear Deck; mở thanh công cụ Pear Deck Sidebar và bấm chọn tính năng
"Draggable" hoặc "Draw".
• Bằng chứng cần chụp: Hộp thoại thông báo khóa tính năng có biểu tượng ngôi sao màu tím kèm yêu cầu nâng cấp gói
Premium ($149.99/năm).
5. Kiểm tra dung lượng lưu trữ tối đa của Nearpod bản miễn phí (Silver):
• Hành động: Đăng nhập tài khoản Nearpod Silver; truy cập phần quản lý tài khoản (Storage Settings).
• Bằng chứng cần chụp: Thanh hiển thị hạn ngạch dung lượng lưu trữ 100MB và giới hạn tối đa 40 học sinh/lớp.
Tài Liệu Nghiên Cứu Khoa Học & Khảo Sát Hệ Thống Webtool • Nhóm 5
Trang 13 / 13
