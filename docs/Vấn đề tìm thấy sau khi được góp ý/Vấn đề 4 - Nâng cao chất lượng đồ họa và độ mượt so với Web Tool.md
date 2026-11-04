# Vấn đề 4: Nâng cao Chất lượng Đồ họa và Độ mượt so với Web Tool

> **Thuộc cụm tài liệu**: [[Góp ý Thầy Thanh và 8 vấn đề]] | [[00. Nhận xét Thầy Thanh - 13-10-2026 (Tổng quan 8 vấn đề)|Biên bản họp 13/10]]



> **Tài liệu nguồn gốc**: `7b5a0e73-e0fc-410f-a88c-ca7c4a5a07fc_Vn__4.pdf`  
> **Tổng số trang**: 4  
> **Chuyển đổi từ PDF sang Markdown**: 2026-11-04

---


## Trang 1

Vấn đề #4
Kết luận: stack hiện tại (Konva.js + Tailwind + Canvas Confetti + Howler.js) đủ
để chạy mượt cho 10 loại game. Nhưng riêng nó chưa đủ để thắng web tool về
đồ họa. Chất lượng trực quan phụ thuộc vào hiệu ứng, hình ảnh và thiết kế
nhiều hơn là thư viện, nên cần bổ sung một lớp riêng cho phần này.
1. Stack hiện tại làm được gì và không làm
được gì
Thư viện
Làm tốt
Hạn chế cần biết
Konva.js (react-
konva)
Hình, ảnh, văn bản, kéo-thả,
chạm, tween cơ bản, hit
detection. Số đối tượng của game
trẻ em (vài chục node) nằm trong
tầm xử lý mượt
Là canvas 2D, không có WebGL;
bộ lọc (blur, bóng đổ) dùng CPU
nên nặng; không có hệ thống hạt
(particle), vật lý, hoạt ảnh nhân
vật
Canvas Confetti
Hiệu ứng chúc mừng
Chỉ một hiệu ứng
Howler.js
Âm thanh, audio sprite
Không liên quan đồ họa
Tailwind CSS
Giao diện bao quanh game
Không ảnh hưởng đến phần
canvas
Điểm quan trọng nhất: thư viện giúp vẽ và chạy mượt, không giúp trông đẹp.
Trông đẹp đến từ ba thứ: phong cách hình ảnh nhất quán, hiệu ứng phản hồi
tinh tế (juice) và nhân vật hoặc hoạt ảnh. Hiện nhóm mới giải quyết phần đầu
tiên về mặt kỹ thuật.
2. Những chỗ có thể thua web tool
Khía cạnh
Rủi ro với thiết kế hiện tại
Hình minh họa
Pexels trả về ảnh chụp thật. Game trẻ nhỏ thường dùng tranh minh
họa dễ thương, thống nhất phong cách. Ảnh chụp ngẫu nhiên từ nhiều
nguồn sẽ trông rời rạc
Nhân vật, linh
vật
Chưa có. Đây thường là thứ khiến trẻ thích game
Hiệu ứng phản
hồi
Chỉ có confetti và âm thanh. Thiếu hiệu ứng khi chạm, khi đúng/sai,
chuyển cảnh
Vấn đề #4
1



## Trang 2

Khía cạnh
Rủi ro với thiết kế hiện tại
Chủ đề giao
diện (theme)
Chưa có chủ đề theo lứa tuổi hay bài học (rừng, biển, vũ trụ...)
AI sinh nội
dung đa dạng
Vì AI sinh game theo nhiều chủ đề, bố cục phải tự thích nghi, dễ ra
giao diện chung chung
Mình chưa kiểm chứng đồ họa thực tế của Wordwall, Kahoot hay Quizizz, nên
đừng khẳng định hơn thua khi chưa xem. Chính vì vậy cần benchmark (mục 4).
3. Hướng giải quyết: giữ Konva, thêm lớp
"trải nghiệm trực quan"
Mình không khuyên đổi sang PixiJS hay Phaser lúc này. Nhóm đã có Renderer
Quiz bằng Konva, và đổi engine tốn nhiều tuần nhưng không chắc đẹp hơn.
Thay vào đó:
Lớp bổ sung
Công cụ gợi ý
Tác dụng
Hoạt ảnh nhân
vật, hiệu ứng
ăn mừng
Lottie hoặc
Rive, chồng lên
canvas
Linh vật vẫy tay, nhảy khi trả lời đúng, mặt buồn khi
sai. Dùng file hoạt ảnh dựng sẵn, không cần tự lập
trình
Tween và nhịp
chuyển động
Konva Tween,
hoặc GSAP
Thẻ lật mềm, nảy nhẹ khi thả đúng chỗ, lắc khi sai
Bộ chủ đề
(theme pack)
Cấu hình JSON:
màu, nền, linh
vật, âm thanh
AI chọn theme theo bài học và độ tuổi, đồng bộ
phong cách
Kho hình minh
họa thống nhất
Bộ
sticker/vector
có giấy phép
phù hợp, thay
hoặc bổ sung
Pexels
Phong cách đồng nhất; cần kiểm tra giấy phép từng
nguồn
Hạt và hiệu
ứng nâng cao
(nếu cần)
Thư viện hạt,
hoặc cân nhắc
PixiJS cho
riêng phần này
Chỉ khi benchmark cho thấy thiếu
Khi nào mới nên cân nhắc PixiJS: nếu cần nhiều sprite, hạt, bộ lọc đồ họa lớn,
hoặc thấy FPS tụt trên máy tablet phổ thông. Với số đối tượng của game mầm
non và tiểu học, khả năng này thấp.
Vấn đề #4
2



## Trang 3

Liên hệ với AI: lớp theme có thể thành điểm khác biệt, vì AI chọn theme, linh vật
và giọng điệu theo bài học. Web tool buộc giáo viên tự chọn giao diện.
4. Biến "đẹp hơn" thành thứ đo được
Thầy yêu cầu "hơn web tool", nên cần tiêu chí và bằng chứng:
Tiêu chí
Cách đo
Độ mượt
FPS trung bình và thấp nhất trên một tablet phổ thông, mục tiêu 60
FPS (SRS đã ghi)
Thời gian vào
chơi
Từ lúc mở link đến lúc chơi được
Độ phản hồi
Từ lúc chạm đến lúc có phản hồi nhìn thấy, tính bằng mili giây
Cảm nhận đồ
họa
So sánh mù: cho giáo viên xem video cùng nội dung chạy trên web
tool và trên hệ thống nhóm, không nói bên nào là bên nào, rồi chấm
Likert
Phù hợp trẻ
nhỏ
Kích thước vùng chạm, độ tương phản, cỡ chữ
Cách đo "chấm mù" thuyết phục hơn nhiều so với tự nhận xét.
5. Việc nên làm
1. Spike hình ảnh (Spike 8): dựng một game Ghép cặp hoàn chỉnh với theme,
linh vật Lottie, tween, âm thanh. So sánh với Wordwall cùng nội dung. Chấm
mù với 5–10 giáo viên hoặc bạn bè, đo FPS trên tablet.
2. Chốt phong cách hình ảnh (minh họa vector thống nhất) trước khi nhóm
làm 10 renderer, để khỏi phải làm lại.
3. Thêm vào SRS: NFR về hiệu năng đồ họa (FPS, độ trễ phản hồi), yêu cầu bộ
theme, và thay "Pexels" bằng chiến lược nguồn hình có phong cách thống
nhất.
4. Thêm vào Plan: task spike hình ảnh, task thiết kế theme pack, tiêu chí đồ
họa trong UAT.
6. Rủi ro
Vấn đề #4
3



## Trang 4

Đồ họa đẹp tốn nhiều công sức thiết kế, không chỉ lập trình. Nhóm có ai làm
UI/đồ họa không, hay phải dùng tài nguyên có sẵn?
Giấy phép hình ảnh và hoạt ảnh: phải kiểm tra từng nguồn, vì dự án có thể
công khai.
Bộ đo "chấm mù" cần người thật, nên phải lên lịch cùng đợt khảo sát giáo
viên.
Vấn đề #4
4
