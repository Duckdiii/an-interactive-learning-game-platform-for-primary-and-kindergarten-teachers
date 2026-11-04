# Vấn đề 6: Chứng minh Sự Vượt trội Về Chất so với Web Tool

> **Thuộc cụm tài liệu**: [[Góp ý Thầy Thanh và 8 vấn đề]] | [[00. Nhận xét Thầy Thanh - 13-10-2026 (Tổng quan 8 vấn đề)|Biên bản họp 13/10]]



> **Tài liệu nguồn gốc**: `75a93a23-5ae5-4511-96f1-42b0ad8a141b_Vn__6.pdf`  
> **Tổng số trang**: 3  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

Vấn đề #6
Hướng giải quyết: đừng trả lời bằng lời mô tả tính năng. Hãy trả lời bằng ba
khẳng định có thể kiểm chứng, mỗi khẳng định đi kèm cách đo, rồi dùng
benchmark làm bằng chứng. Hiện nhóm có kiến trúc để làm điều đó, nhưng
chưa có số liệu.
Vì sao câu thầy hỏi khó
"Chỉ hơn được chừng đó" nghĩa là thầy lo lợi thế của nhóm chỉ là nhanh hơn
một chút, tức khác biệt về số lượng, không phải về chất. Nếu chỉ nói "nhanh
hơn" thì web tool gắn thêm nút "AI tạo" là đuổi kịp. Vì vậy câu trả lời phải chỉ ra 
khác biệt về chất mà việc gắn thêm nút khó đạt được.
Khác biệt về chất nằm ở đâu
Web tool, kể cả khi có nút AI, đi theo quy trình: giáo viên chọn mẫu trước, sau
đó AI điền nội dung vào mẫu. Hệ thống của nhóm đảo ngược: giáo viên nói 
mục tiêu, AI quyết định cả mẫu lẫn nội dung, rồi hệ thống kiểm tra trước khi
giao. Từ đó có ba khẳng định:
#
Khẳng định
Cơ chế trong hệ thống
Web tool thường
1
AI quyết định
"làm gì",
không chỉ
"điền gì"
Đề xuất 3–5 loại game
kèm lý do theo ngữ
cảnh bài; giáo viên
không phải biết trước
mình cần loại nào
Giáo viên chọn mẫu rồi mới
nhập
2
Nội dung bám
chương trình
và an toàn cho
trẻ
RAG tra YCCĐ theo
cấp/khối/môn;
validation 3 lớp (cấu
trúc, nghiệp vụ, an
toàn); kiểm duyệt từ
ngữ, hình ảnh
Giáo viên tự đối chiếu
chương trình và tự kiểm tra
nội dung
3
Từ ý tưởng đến
dùng được ở cả
lớp và nhà
Sinh nội dung, hình,
giọng đọc tiếng Việt,
chạy được ngay ở Live
Arena và ở nhà, kèm
gợi ý cho phụ huynh
Nhiều công đoạn rời rạc,
nhiều công cụ
Vấn đề #6
1



## Trang 2

Ý nghĩa của khẳng định 1 và 2 là: AI không chỉ tiết kiệm công mà còn thay một
phần quyết định chuyên môn (chọn dạng bài, đối chiếu chương trình, kiểm tra
an toàn) mà giáo viên vốn phải tự làm.
Phản biện mà thầy có thể nêu, và câu trả lời
Phản biện
Trả lời gợi ý
"Giáo viên dùng
ChatGPT/Gemini
tạo quiz hoặc
game được rồi"
Chat AI trả văn bản hoặc mã chưa kiểm chứng. Hệ thống của nhóm
trả về game đã qua validation, đúng chương trình, chạy được ở lớp,
không cần giáo viên biết lập trình
"Wordwall,
Kahoot đã có
nút AI"
Nút đó điền nội dung vào mẫu đã chọn. Khác biệt là bước chọn mẫu
và kiểm tra chương trình (cần xác minh bằng benchmark, không nên
khẳng định khi chưa thử)
"Giáo viên vibe
code được"
Vibe code cho kết quả không ổn định, không có kiểm duyệt trẻ em,
không có Live Arena, mỗi lần phải làm lại từ đầu
Hai câu trả lời đầu chưa được chứng minh. Mình chưa kiểm tra tính năng AI
hiện tại của các nền tảng đó, nên nhóm phải tự thử trước khi nói.
Cách chứng minh: benchmark có đo lường
Một bảng so sánh cùng nội dung bài học trên: Wordwall (hoặc Kahoot/H5P),
một chat AI, và hệ thống của nhóm.
Tiêu chí
Cách đo
Ứng với khẳng
định
Thời gian từ ý tưởng đến game chơi
được
Bấm giờ
Tổng thể
Số thao tác thủ công
Đếm số lần nhập/chọn
1, 3
Giáo viên có phải tự chọn loại game
không
Quan sát
1
Độ khớp YCCĐ của nội dung
Giáo viên chấm theo tiêu
chí
2
Số lỗi và nội dung không phù hợp trẻ
Đếm trên 20–30 game
2
Dùng được ngay ở lớp, ở nhà
Có/không
3
Cảm nhận đồ họa
Chấm mù bằng video
Vấn đề 4
Vấn đề #6
2



## Trang 3

Điểm trung thực cần giữ: nếu có tiêu chí nhóm không hơn (ví dụ đồ họa), hãy
ghi đúng. Báo cáo có số liệu trung thực thuyết phục hơn bản khẳng định chỉ
toàn thắng.
Những điều không nên dùng làm lập luận
"Bỏ AI đi thì hệ thống không chạy" (đã bị nhận xét là chưa thuyết phục).
"Nhanh hơn X lần" khi chưa đo.
Gắn nhãn "multi-agent" hay "AI-native" nếu không có bằng chứng kỹ thuật
đi kèm.
Việc cần làm
Việc
Ở đâu
Viết một đoạn "Giá trị khác biệt của AI" gồm 3 khẳng
định, đặt ở đầu báo cáo và slide
Báo cáo, tóm tắt đề tài
Thêm task benchmark, bảng tiêu chí trên
Plan
Cập nhật KPI-01 và bảng KPI làm tiêu chí so sánh
SRS (KPI-01 đã đổi baseline)
Thử thật các nền tảng đối thủ trên cùng một bài học,
ghi lại
Làm trước 21/10 càng sớm càng
tốt
Chuẩn bị 3 câu trả lời phản biện ở trên, bổ sung số liệu
khi có
Chuẩn bị bảo vệ
Phần quan trọng nhất là bước thử đối thủ: nếu kết quả cho thấy nút AI của họ
làm tốt hơn nhóm nghĩ, nhóm cần biết sớm để điều chỉnh khẳng định.
Vấn đề #6
3
