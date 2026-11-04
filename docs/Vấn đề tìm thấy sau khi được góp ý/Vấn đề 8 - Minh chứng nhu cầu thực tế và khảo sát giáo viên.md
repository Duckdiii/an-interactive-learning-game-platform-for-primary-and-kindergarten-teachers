# Vấn đề 8: Minh chứng Nhu cầu Thực tế và Khảo sát Giáo viên

> **Thuộc cụm tài liệu**: [[Góp ý Thầy Thanh và 8 vấn đề]] | [[00. Nhận xét Thầy Thanh - 13-10-2026 (Tổng quan 8 vấn đề)|Biên bản họp 13/10]]



> **Tài liệu nguồn gốc**: `a15325b1-3b20-414e-a899-6fd091fc4d07_Vn__8.pdf`  
> **Tổng số trang**: 5  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

Vấn đề #8
Từng yêu cầu nghĩa là gì
Yêu cầu
Thầy nói (mốc ghi)
Hiểu theo góc kỹ
sư
Nhóm đang ở đâu
Nhu cầu thực tế
1:16: đề tài không có
thông tin nhu cầu
thực tế thì xem lại
Phải có bằng
chứng người dùng
cần, không chỉ ý
tưởng hay
Khảo sát giáo viên
(Plan 1.4.x) mới bắt
đầu, hầu hết chưa
làm
Khách hàng và
dòng tiền
2:11–2:20: chỉ ra
khách hàng ở đâu,
cơ hội tạo dòng tiền
Ai trả tiền, trả bao
nhiêu, vì sao
Chưa có
Đặc tả bài toán, giải
pháp AI, yêu cầu, dữ
liệu, quy trình, giao
diện, kiến trúc
1:38–2:36
Bộ tài liệu thiết kế
đầy đủ
Phần lớn đã có
(SRS, kiến trúc,
Plan)
Kế hoạch: bao nhiêu
công việc, nguồn dữ
liệu tin cậy, thời gian
thử nghiệm
2:36–2:51
Plan có đầu việc,
mốc và thời gian
thử nghiệm
Có Plan, cần bổ
sung thời gian thử
nghiệm với người
dùng
Số người dùng đồng
thời và khả năng
scale
15:06–15:46: phải
tuyên bố trước con
số, rồi có test chứng
minh
Đặt mục tiêu tải và
chứng minh bằng
kiểm thử tải
Có mục tiêu 500
học sinh/lớp và
k6/JMeter, nhưng
muộn (4–17/12)
Chi phí và giá gói
15:46: từ đó định
hình kinh phí và giá
gói
Từ số liệu tải và
token suy ra chi phí
vận hành, rồi định
giá
Chưa có
Đối tượng tham gia
và vai trò
16:10–16:56: đối
tượng chính, đối
tượng khác, UI phù
hợp từng đối tượng
Mô hình tác nhân,
giao diện theo vai
trò
Có giáo viên, học
sinh, quản trị; phụ
huynh
Không chạy model
local
49:18–50:23: chạy
local ít giá trị, dùng
API bên thứ ba
Dùng dịch vụ đám
mây, tính chi phí để
các bên hợp tác
Đã khớp (Gemini
qua API)
Beta/MVP khoảng
100 người dùng
50:31–50:55: ít nhất
khoảng 100 bạn thì
Có phiên bản chạy
thật với người dùng
Deploy dự kiến 4–
8/12, hơi muộn
Vấn đề #8
1



## Trang 2

Yêu cầu
Thầy nói (mốc ghi)
Hiểu theo góc kỹ
sư
Nhóm đang ở đâu
mới thấy hiệu quả,
không còn là demo
thật
Đưa mọi thứ lên
workspace
4:13: đăng tất cả lên
workspace
Tài liệu và tiến độ
phải nằm ở nơi thầy
xem được
Cần xác nhận
workspace nào và
đã đăng đủ chưa
"Thực học, thực
hành, thực nghiệp,
thực tiền, thực
danh"
4:36–4:44
Tinh thần chung:
làm sản phẩm thật,
có thị trường
Định hướng chung
Thầy nói gì
Ý của thầy là: phần mềm thông thường có nút này nút kia, còn "bản chất AI sẽ
khác". Vì vậy giao diện phải thiết kế sao cho người ta nhìn vào thấy ngay "đây
là AI chứ không phải phần mềm thường". Thầy yêu cầu thêm: sản phẩm phải
chỉ ra được yếu tố AI khác gì một phần mềm AI thông thường, và giao diện cũng
phải khác.
Hiểu theo góc kỹ sư
Hai kiểu giao diện khác nhau ở cách người dùng ra lệnh và cách hệ thống
phản hồi:
Phần mềm thông
thường
Giao diện kiểu AI
Đầu vào
Form, dropdown, nút
Nói điều mình muốn bằng ngôn ngữ tự
nhiên
Quá trình xử lý
Bấm nút rồi chờ kết quả
Thấy AI đang làm gì từng bước
Kết quả
Một đầu ra cố định
AI đề xuất phương án kèm lý do
Chỉnh sửa
Sửa từng ô
Nhờ AI sửa bằng lời ("làm câu 3 dễ hơn")
Khi thiếu thông
tin
Báo lỗi bắt nhập lại
AI hỏi lại một câu làm rõ
Đây không nhất thiết là khung chat. Cốt lõi là giao diện xoay quanh ý định của
người dùng và sự tham gia của AI.
Hệ thống của nhóm đang ở đâu
Vấn đề #8
2



## Trang 3

SRS hiện thiết kế giống phần mềm thông thường nhiều hơn: màn hình có
dropdown (Khối lớp, Môn học), ô nhập, nút "Tạo game", rồi Workspace Editor
sửa từng trường. AI chạy phía sau, người dùng không thấy. Đây chính là chỗ
thầy muốn nhóm đổi. Mình cũng nên nói rõ: mình chưa thấy mô tả màn hình
thực tế nên đây là đánh giá từ SRS.
Cách đạt được, vừa sức và dùng lại thứ đã có
Thay đổi
Cách làm
Công sức
Màn hình tạo game
lấy ô mô tả làm
trung tâm
Dropdown thu nhỏ hoặc để AI tự suy ra
Thấp
Hiển thị tiến trình
của AI
Hiện các bước: phân tích ý tưởng → tra chuẩn
kiến thức → sinh nội dung → kiểm duyệt →
thêm hình và giọng đọc. Pipeline của nhóm đã
có sẵn các bước này, chỉ cần đẩy trạng thái về
giao diện (SSE hoặc WebSocket đã có
STOMP)
Trung bình
Thẻ đề xuất kèm lý
do
Chính là phần "đề xuất 3–5 loại game" đã bàn
Đã nằm trong kế
hoạch
Sửa bằng lời trong
Workspace Editor
Một ô "Nhờ AI chỉnh": giáo viên gõ yêu cầu, AI
trả về thay đổi theo schema rồi được validate
như bình thường. FR-10 (sinh lại một phần) đã
là nền
Trung bình
AI hỏi lại khi mô tả
mơ hồ
Khi mô tả quá ngắn hoặc thiếu thông tin quan
trọng, hỏi một câu thay vì báo lỗi
Thấp
Câu đó không phải nguyên văn của thầy. Mình ghi "chỉ dùng multi-agent nếu
thật sự cần" trong tóm tắt trước đó. Lần tra này mình thấy hai nguồn khác nhau:
Nguồn
Nói gì về multi-agent
Thầy Thanh (28:27–29:48,
nói với nhóm khác)
Hỏi "đa tác tử hay một vòng xử lý"; coi việc các agent
phối hợp là điểm kỹ thuật đáng khoe
Tài liệu BA của bạn Văn
Không nhất thiết phải xây multi-agent; ở MVP không
làm; nhưng nên tách bước sinh và bước đánh giá
Nên câu "chỉ khi thật sự cần" là quan điểm kỹ thuật hợp lý mà mình đã viết quá
chắc như lời thầy. Đính chính: thầy thiên về khuyến khích, và lời thầy nói với
nhóm khác.
Vấn đề #8
3



## Trang 4

Multi-agent là gì, theo góc kỹ sư
Một luồng xử lý (single
pipeline)
Multi-agent
Cấu trúc
Các bước chạy tuần tự, mỗi
bước là một hàm hoặc một
lần gọi LLM
Nhiều agent, mỗi agent có vai trò,
prompt riêng, tự quyết hành động và
có thể trao đổi với nhau
Ví dụ trong lời
thầy
Một AI viết bài
Một agent lập dàn ý, một agent phản
biện dàn ý, rồi sửa lại
Điều khiển
Lập trình viên quyết định thứ
tự
Agent hoặc bộ điều phối quyết định
bước tiếp theo
Hệ thống của nhóm hiện là single pipeline: phân tích ý tưởng → tra chuẩn kiến
thức → sinh JSON → validate → thêm hình và giọng đọc. Phần lớn các bước là
dịch vụ xác định, chỉ vài bước gọi LLM.
"Thật sự cần" nghĩa là gì
Multi-agent đổi lấy chất lượng bằng ba cái giá: thêm độ trễ, thêm chi phí token,
thêm độ phức tạp để gỡ lỗi. Vì vậy nó chỉ đáng khi trả lời "có" cho cả ba câu
hỏi:
1. Có một vai trò cần góc nhìn độc lập, mà bước sinh không tự làm tốt được
không?
2. Đo được chất lượng tăng lên không (ít lỗi hơn)?
3. Chịu được thêm thời gian và chi phí không?
Câu 3 là điểm đáng chú ý của nhóm: SRS đặt mục tiêu SLO dưới 3 giây cho cả
pipeline. Thêm một agent đánh giá bằng LLM sẽ làm chậm thêm.
Có chỗ nào của nhóm hợp với agent không
Có một ứng viên rõ: kiểm tra độ đúng đắn kiến thức sư phạm. Tài liệu nghiên
cứu của bạn xếp "sai lệch nội dung kiến thức" là rủi ro nghiêm trọng nhất, mà
validator rule-based chỉ kiểm tra được cấu trúc và quy tắc, không kiểm tra được
kiến thức có đúng không. Một agent đánh giá độc lập (khác với việc AI tự sửa
chính mình) có thể bắt thêm lỗi này.
Cách quyết định bằng số liệu
Làm một spike nhỏ so sánh hai cấu hình trên cùng tập bài mẫu:
Vấn đề #8
4



## Trang 5

Cấu hình
Đo
A. Single pipeline hiện tại
Tỷ lệ lỗi kiến thức, thời gian, chi phí token
B. Thêm agent đánh giá độc lập
Cùng ba chỉ số
Nếu B giảm lỗi rõ rệt với cái giá chấp nhận được: nhóm có cơ sở nói "hệ
thống dùng agent phối hợp", và đó là điểm kỹ thuật thầy muốn thấy.
Nếu không: nhóm nói đúng sự thật rằng single pipeline là lựa chọn có chủ
đích, có số liệu so sánh.
Cả hai kết quả đều dùng được trong báo cáo, miễn là có số liệu. Điều nên tránh
là gắn nhãn "multi-agent" mà không đo.
Bạn muốn mình thêm spike này vào Plan không? Hay mình hỏi lại bạn trước:
nhóm có sẵn ý định làm agent đánh giá nào chưa?
Vấn đề #8
5
