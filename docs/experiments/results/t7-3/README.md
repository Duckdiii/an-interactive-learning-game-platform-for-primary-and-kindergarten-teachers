# T7.3: matter-js cho PREPOSITION_SCENE (số đo ghi theo giờ UTC 2026-10-18)

Số liệu thô: [`measurements.md`](measurements.md), [`results.json`](results.json); ảnh giữa lúc rơi (250ms sau khi nhả chuột) ở `shots/`. Phòng thử: `/dev/experiments` → «Vị trí (T4.3)» → bật «Thả rơi theo vật lý (matter-js)». Tệp này là phần diễn giải và các giới hạn.

## Làm gì

- **Thả rơi (tuỳ chọn):** renderer nhận thêm prop `dropSimulator` (cổng `DropSimulator`, kiểu ở `dropTypes.ts`). Có prop thì buông tay (kéo, chạm cảnh, hoặc nút bàn phím) là vật **rơi** tới chỗ nằm yên rồi mới nộp được; không có thì hành vi cũ. Renderer **không biết matter-js**: chỉ phụ thuộc cổng, nên thay hoặc giả được khi test.
- **`matterDrop.ts`** (matter-js 0.20.0, ghim chính xác): mô phỏng chạy **đồng bộ, bước cố định 1/60 giây, không đọc đồng hồ**, vật không xoay, tối đa 480 bước. Trả danh sách khung để vẽ và vị trí cuối (làm tròn 0,1).
- **`dropSolids.ts`** (hàm thuần, không phụ thuộc thư viện): khối đặc của vật mốc (bàn: mặt + hai chân khớp hình vẽ; hộp mở nắp: đáy + hai thành), mặt đất, hai vách; và `liftOutOfSolids`: buông tay lúc đang chồng khối thì đưa vật ra theo cách dịch ngắn nhất (trên, dưới, trái, phải) thay vì để thư viện đẩy văng.
- **Đáp án không đổi:** đúng/sai vẫn là hàm thuần `satisfies` trên **toạ độ cuối**. Vị trí nộp (`onAnswered`) là vị trí nằm yên; câu hỏi gửi học sinh vẫn không có quy tắc; DSL và API không đổi (không có trường mới). Giảm chuyển động (OS): nhảy thẳng tới chỗ nằm yên, không hoạt ảnh.
- **Kiểu cho matter-js:** gói không đi kèm kiểu và ràng buộc dự án không cho thêm gói, nên khai báo tối thiểu bằng tay ở `matter-js.d.ts` (chỉ phần API đang dùng) thay vì thêm `@types/matter-js`. Phải tự giữ cho khớp nếu mở rộng việc dùng.

Chạy lại số đo: `node scripts/experiments/compare-physics.mjs` (khoảng 2 phút, Chrome cài sẵn).

## Kết quả

1. **Cả bốn quy tắc trả lời đúng được bằng cách thả** (Chrome thật, chuột thật, 5 ca × CPU thường và chậm 4×): thả từ trên cao xuống mặt bàn → «on» đúng; thả vào gầm → «under»; thả trên miệng hộp → vật lọt vào đáy, «in»; thả bên cạnh hộp → «next to». Thả **lên bàn** khi đề là «under» → sai, hiện khung nét đứt chỉ chỗ đúng. Không lỗi console, không yêu cầu mạng ra ngoài máy.
2. **Tất định (phạm vi hẹp):** 55 điểm buông trên **bàn** × 5 lần = 275 lần chạy trong một trang Chrome, một máy, một tiến trình: **0** điểm cho kết quả khác nhau; 0 lần chưa nằm yên. Trong vitest (Node, cả bàn và hộp): cùng đầu vào ra đúng cùng từng khung, xen kẽ đầu vào khác vẫn vậy. **Chưa** kiểm giữa các trình duyệt hay máy khác nhau (số thực dấu phẩy động có thể lệch rất nhỏ; vị trí cuối đã làm tròn 0,1).
3. **Nhẹ:** một lần mô phỏng trung bình 0,15ms (p95 0,6; lớn nhất 3,9ms); ở CPU chậm 4×: 0,89ms (p95 1,9; lớn nhất 28ms một lần). Trung bình ≈ 35 bước (≈ 0,6 giây hoạt ảnh); luồng thật: vật rơi xong sau 550 đến 870ms; rAF ≈ 120 fps, không khung rớt (cả CPU chậm 4×).
4. **Dung lượng:** gói `matterDrop` (matter-js + mô phỏng) thô 83,8 KB, **gzip 26,2 KB**, chỉ tải khi bật công tắc (nạp xong sau ≈ 30ms, cục bộ). Bản build thường không đổi (228,3 KB).
5. **Phát hiện quan trọng: ở cảnh này matter-js không thêm gì cho KẾT QUẢ.** Vật là hình chữ nhật không xoay, không trượt ngang, nên rơi thẳng xuống khối đỡ cao nhất bên dưới. Test so sánh với một hàm rơi thẳng viết tay (khoảng 8 dòng, không thư viện; **dùng chung** ,  và  với bản matter-js, nên chỉ so phần trọng lực và va chạm, không so cả đường đi) trên lưới 576 điểm buông (288 trên bàn, 288 trên hộp): vị trí cuối **trùng trong 1 đơn vị cảnh ở mọi điểm**. Thứ matter-js thực sự đem lại chỉ là **quỹ đạo** (gia tốc, nảy nhẹ) — một tween rơi với gia tốc trên Konva làm được tương tự mà không thêm 26 KB và một thư viện.

## Phát hiện về thiết kế game

- **Thả rơi đổi cách chơi, chưa phải chỉ trang trí:** trẻ không cần đặt chính xác, chỉ cần buông đúng «phía» (trên bàn, trên miệng hộp); đổi lại «under» bắt buộc buông **ở dưới mặt bàn** vì vật không xuyên được mặt bàn. Chưa có trẻ nào chơi thử nên chưa biết cách nào dễ hiểu hơn.
- Vật buông đè lên khối (mặt bàn, chân bàn, thành hộp) được dịch ra theo hướng ngắn nhất trước khi rơi; bài quét lưới vị trí trong cảnh cho thấy kết quả luôn không chồng khối và nằm trong cảnh.
- Không phải vật lý thật: **không xoay, không lật**, nên vật chồng nửa trên mép bàn hay mép thành hộp vẫn «treo» ở đó (có test ghi nhận) và có thể không thuộc quy tắc nào. Cho vật xoay sẽ làm hộp bao dùng để chấm không còn đúng.

## Giới hạn, chưa kiểm chứng

- **Bàn phím/trình đọc màn hình:** nếu mỗi nút nhích đều làm vật rơi thì không bao giờ lên được mặt bàn hay vào hộp (vật rơi xuống đất ngay), nên khi bật vật lý nút «Move …» chỉ **dời** vật (nói rõ «held in the air»), chưa cho nộp; nút «Let go» mới thả. Đã kiểm bằng mô phỏng thật: chuỗi nhích + «Let go» tới được ON, UNDER, IN, NEXT_TO. Chưa thử với trình đọc màn hình thật.
- Hình **hộp** vẫn vẽ như khối đặc (nền sáng), nên vật «trong hộp» nhìn như nằm đè lên khối chứ không ở trong lòng hộp (xem `shots/in.jpg`). Muốn đúng nghĩa phải vẽ lại hộp (thành và đáy) — chưa làm.
- Trọng lực, ma sát, độ nảy chưa được chỉnh cho cảm giác «dễ chịu» với trẻ; chưa có âm thanh khi chạm; chưa thử màn hình cảm ứng thật hay điện thoại. Một lượt đo, Chrome headless/Windows, CPU chậm 4× là giả lập.
- Câu hỏi Backend: nếu sau này chấm phía Backend, vị trí gửi lên là vị trí **đã nằm yên** do trình duyệt tính; Backend không tái tạo được từ điểm buông nếu không chạy cùng mô phỏng, và vẫn chấm được bằng luật hình học như cũ. Chưa bàn vấn đề gian lận.
- `matter-js` 0.20.0 phát hành 06/2024 theo metadata npm đọc ngày 2026-10-19 (chưa kiểm lại trong repo): ít cập nhật.
- Chưa có giáo viên xác nhận các quy tắc «on/under/in/next to» (từ T4.3) hay trải nghiệm thả rơi.
- Nếu gói matter-js không nạp được, phòng thử báo «không nạp được thư viện vật lý» (chưa có test cho nhánh lỗi này).
