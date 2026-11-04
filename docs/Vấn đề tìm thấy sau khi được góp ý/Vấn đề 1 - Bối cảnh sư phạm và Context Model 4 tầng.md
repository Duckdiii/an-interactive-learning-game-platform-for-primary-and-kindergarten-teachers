# Vấn đề 1: Bối cảnh Sư phạm và Context Model 4 Tầng

> **Thuộc cụm tài liệu**: [[Góp ý Thầy Thanh và 8 vấn đề]] | [[00. Nhận xét Thầy Thanh - 13-10-2026 (Tổng quan 8 vấn đề)|Biên bản họp 13/10]]



> **Tài liệu nguồn gốc**: `695d74cb-0254-4b9b-bce3-5a4eedd2e381_Vn__1.pdf`  
> **Tổng số trang**: 4  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

Vấn đề #1
Cả hai vấn đề đều giải quyết được mà không phải bỏ kiến trúc hiện tại. Mình đề
xuất cho từng vấn đề một hướng cụ thể và một cách làm vừa sức trước 27/12.
Vấn đề 1: Hệ thống hiểu bối cảnh rộng hơn
dropdown
Ý của bạn ("như bạn hiểu cá nhân tôi qua giao tiếp") tương ứng với một kỹ thuật
có tên: context model nhiều tầng, thường gọi là personalization hoặc memory.
Mình chia thành 4 tầng, mỗi tầng cần một mức công sức khác nhau:
Tầng
Nội dung
Cách lấy
Công sức
1. Hồ sơ giáo
viên
Cấp dạy, môn, vùng miền, phong
cách dạy (vui nhộn / nghiêm túc)
Hỏi một lần khi
đăng ký
Thấp
2. Hồ sơ lớp
Số học sinh, trình độ chung, thiết
bị (TV, máy tính bảng), tiết học dài
bao lâu, dùng ở lớp hay ở nhà
Giáo viên khai
một lần cho
mỗi lớp
Thấp
3. Ngữ cảnh bài
hiện tại
Chủ đề, mục tiêu, giáo án đính
kèm
Giáo viên nhập
như hiện nay
Đã có
4. Sở thích học
được
Loại game giáo viên hay chọn,
kiểu câu hỏi hay bị sửa, độ khó
hay chỉnh
Tự suy ra từ
hành vi
Trung bình
Tầng 4 là phần giống "hiểu cá nhân" nhất, và nhóm đã có nguyên liệu: SRS đã
ghi nhận sự kiện "Update Field" (KPI-03) và việc giáo viên bấm "Tạo lại" (KPI-
04). Mỗi lần giáo viên chọn loại game hoặc sửa một trường, đó là một tín hiệu.
Ví dụ: giáo viên liên tục đổi câu hỏi dài thành câu ngắn, thì lần sau prompt tự
động thêm "ưu tiên câu ngắn".
Cách làm kỹ thuật (hợp với Spring Boot):
Bảng teacher_profile , class_profile , preference_signal  trong PostgreSQL.
Khi sinh game, backend ghép (assemble) một khối ngữ cảnh ngắn vào
prompt. Định kỳ cho LLM tóm tắt các tín hiệu thành vài dòng sở thích để
không phình số token.
AI hỏi lại khi thiếu: nếu mô tả quá mơ hồ, hệ thống hỏi 1–2 câu (ví dụ "Lớp
bạn khoảng bao nhiêu bé?") thay vì bắt điền form dài. Đây là điểm khác
Vấn đề #1
1



## Trang 2

web tool rất rõ.
Khối lớp và Môn học có thể để AI suy ra từ mô tả và chỉ hỏi xác nhận.
Hai lưu ý:
SRS đang cam kết không thu thập thông tin nhận dạng học sinh. Hồ sơ lớp
chỉ nên lưu thông tin tổng hợp (sĩ số, trình độ chung), không lưu tên hay dữ
liệu từng bé.
Đừng cam kết tầng 4 đầy đủ trong đồ án. Một phiên bản vừa sức là: tầng 1–
3 hoàn chỉnh, tầng 4 chỉ làm một tín hiệu (loại game hay chọn) để chứng
minh khái niệm.
Phần thưởng cho báo cáo: tầng ngữ cảnh cho phép làm thí nghiệm "có ngữ
cảnh so với không có ngữ cảnh" và đo bằng KPI-02 (tỷ lệ chấp nhận lần đầu).
Đây là bằng chứng cụ thể cho câu thầy hỏi "AI tạo ra khác biệt gì".
Vấn đề 2: Để hệ thống tự tạo game, không
bị khóa trong 10 loại
Có ba hướng:
Hướng
Cách hoạt động
Ưu điểm
Nhược điểm
A. Giữ 10 mẫu
AI chọn mẫu và điền
nội dung
An toàn, dễ
validate
Đúng là "chọn mẫu",
thầy sẽ hỏi lại
B. Ghép từ thành
phần cơ bản
AI mô tả game bằng
các "viên gạch" (đối
tượng, tương tác, luật
chơi), engine chạy
được
AI thật sự thiết kế
game; vẫn
validate được
Phải thiết kế lại DSL và
renderer
C. AI viết code
game
AI sinh JavaScript
chạy trong sandbox
Tự do nhất
Khó đảm bảo an toàn
cho trẻ em, khó
validate, khó đồng bộ
Live Arena và chấm
điểm
Mình khuyên hướng B, dùng C chỉ như hướng nghiên cứu để nói trong báo cáo.
Lý do: hướng C giống hệt "vibe code" mà thầy muốn nhóm khác biệt, lại phá vỡ
quyết định validation rule-based của nhóm.
Rủi ro
ể
Vấn đề #1
2



## Trang 3

Hướng B cụ thể
Tách game thành các thành phần:
Thành phần
Ví dụ
Đối tượng
thẻ, hình, ô chữ, vùng thả, nhân vật
Tương tác
chạm, kéo, lật, nối, sắp xếp, gõ
Luật
điều kiện thắng, cách tính điểm, giới hạn thời gian, số lượt
Bố cục
lưới, hàng, vòng tròn, cảnh có nền
Khi đó 10 loại hiện tại trở thành "preset", tức các tổ hợp dựng sẵn. AI có thể
chọn preset, hoặc ghép tổ hợp mới khi ý tưởng của giáo viên không khớp mẫu
nào (ví dụ "bé nhặt đúng chữ cái rơi xuống trong 30 giây").
Điều kiện để hướng B không vỡ:
Mọi tương tác phải phát ra một dạng sự kiện thống nhất (đúng/sai, thời
gian). Nhờ đó chấm điểm và Live Arena hoạt động cho mọi game, kể cả
game mới.
Validation thêm lớp thứ tư: kiểm tra có chơi được và có thắng được không
(mọi mục tiêu đều có chỗ thả hợp lệ, điều kiện thắng đạt được). Đây là kiểm
tra theo quy tắc, không nhờ LLM tự đánh giá.
Nếu game ghép mới thất bại validation, lùi về preset gần nhất. Giáo viên
không bao giờ nhận game hỏng.
Cách trình bày với thầy: "AI thiết kế cơ chế chơi bằng cách ghép thành phần,
engine xác định đảm bảo game chạy được và an toàn." Câu này trả lời được cả
"AI khác gì" lẫn "sao không để AI viết code".
Rủi ro thời gian
Hướng B là thay đổi lớn: DSL, renderer Konva và validator đều bị đụng. Hôm nay
là 14/10, hạn nộp 27/12, và 10 loại game vẫn đang trong Plan. Mình đề xuất chạy
Spike 7 (cùng kiểu với 6 spike hiện có) trước khi cam kết:
Câu hỏi: AI có ghép được game mới từ thành phần cơ bản không, và
renderer có chạy được không?
Tiêu chí đạt (ví dụ): thử 20 mô tả khác nhau, ít nhất 70% ra game chơi được
và qua validation. Con số 70% là mình gợi ý, nhóm chốt lại.
Nếu đạt: mở rộng DSL lên schema 2.0, 10 loại thành preset.
Vấn đề #1
3



## Trang 4

Nếu không đạt: giữ 10 loại, nói trung thực rằng đây là giới hạn đã thử
nghiệm. Báo cáo vẫn có giá trị vì có số liệu.
Tóm tắt đề xuất
Vấn đề
Hướng
Mức cam kết trong
đồ án
1. Bối cảnh
Context model 4 tầng, hỏi lại khi thiếu
Tầng 1–3 đầy đủ;
tầng 4 một tín hiệu
2. Tự tạo game
Ghép từ thành phần cơ bản, 10 loại thành preset
Chạy Spike 7 trước,
quyết định sau
Hai việc này liên quan nhau: ngữ cảnh càng giàu thì AI càng có cơ sở để chọn
hoặc ghép game phù hợp.
Vấn đề #1
4
