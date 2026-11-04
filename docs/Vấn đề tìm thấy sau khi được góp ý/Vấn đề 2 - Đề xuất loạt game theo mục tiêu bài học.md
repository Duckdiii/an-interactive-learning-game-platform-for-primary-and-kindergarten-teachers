# Vấn đề 2: Đề xuất Loạt Game Theo Mục tiêu Bài học

> **Thuộc cụm tài liệu**: [[Góp ý Thầy Thanh và 8 vấn đề]] | [[00. Nhận xét Thầy Thanh - 13-10-2026 (Tổng quan 8 vấn đề)|Biên bản họp 13/10]]



> **Tài liệu nguồn gốc**: `c6fb0e8f-c8a7-42aa-9fd5-511d6b177084_Vn__2.pdf`  
> **Tổng số trang**: 2  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

Vấn đề #2
Kết luận: nhóm đang đúng một nửa. Phần "định nghĩa số loại game" đã đúng.
Phần "AI đề xuất một loạt game" mới đúng ở mức tối thiểu, và còn hai chỗ chưa
khớp ý thầy.
Đối chiếu từng vế của yêu cầu
Vế trong yêu
cầu của thầy
Nhóm hiện có
Đánh giá
Định nghĩa có
bao nhiêu loại
game
10 loại, đã chốt và liệt kê trong FLD-15
của SRS
Đúng
AI đề xuất loại
game
SRS_v2: giáo viên bỏ trống thể loại thì AI
đề xuất 2–3 loại kèm lý do
Đúng, nhưng mới trên
giấy
AI đề xuất "một
loạt" game
Mỗi lần tạo ra đúng một game; phần đề
xuất chỉ là chọn loại cho game đó
Chưa khớp
Hai chỗ chưa khớp
1. "Một loạt game" có thể không giống cách nhóm đang hiểu.
Nhóm hiểu là AI gợi ý 2–3 loại để giáo viên chọn một. Nhưng "một loạt game"
cũng có thể hiểu là AI đề xuất một bộ game cho cả bài học. Ví dụ bài "Đếm đến
5": game khởi động (Lật thẻ), game luyện tập (Ghép cặp), game củng cố (Trắc
nghiệm). Bản ghi không có đoạn nhóm trình bày nên mình không chắc thầy
hiểu theo nghĩa nào. Cách an toàn là hỗ trợ cả hai, hoặc hỏi lại thầy qua Cô Thơ.
2. Phần đề xuất chưa được đặc tả và chưa được kiểm chứng.
Trong SRS_v2, câu "AI đề xuất 2–3 thể loại kèm lý do" mới chỉ là mô tả hành vi.
Còn thiếu:
Còn thiếu
Vì sao quan trọng
Cách đề xuất
hoạt động thế
nào
Do LLM quyết định, hay có luật (ví dụ mục tiêu "ghi nhớ" thì ưu tiên Lật
thẻ)? Nếu chỉ hỏi LLM, thầy sẽ hỏi "khác gì ChatGPT chọn giùm?"
Căn cứ sư
phạm
Mỗi loại game hợp với mục tiêu nào, độ tuổi nào. Đây là kiến thức bạn
có thể đưa vào RAG hoặc bảng metadata
Vấn đề #2
1



## Trang 2

Còn thiếu
Vì sao quan trọng
Cách đo chất
lượng đề xuất
Chưa có KPI nào, ví dụ "tỷ lệ giáo viên chấp nhận loại game AI đề
xuất"
Spike kiểm
chứng
6 spike hiện tại không spike nào kiểm chứng riêng việc đề xuất loại
game
Hướng giải quyết
Vấn đề #2
2
