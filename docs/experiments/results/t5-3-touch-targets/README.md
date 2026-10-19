# T5.3: sửa vùng chạm ở khung điện thoại 390px (2026-10-19)

Số liệu thô: [`measurements.md`](measurements.md), [`results.json`](results.json), ảnh sân ở `shots/`. Đây là lần đo lại **chỉ phần vùng chạm** của [`t5-2`](../t5-2/README.md) (không đo FPS, không đo bundle) sau khi sửa bố cục; chạy bằng `node scripts/experiments/measure.mjs --skip-bundle --no-fps --out=t5-3-touch-targets`. Kết quả T5.2 giữ nguyên để so sánh.

## Vấn đề (từ T5.2)

Ở khung 390px (sân co ×0,445 vì lề trang) vùng chạm nhỏ nhất của ba game mới là 32,0px (điểm kéo trục số), 44,5px (vật kéo giới từ), 58,7px (nút ghép tiếng), đều dưới ngưỡng 64/56/48px bạn chốt; ThemeLab (QUIZ, MATCHING sản phẩm) 42,7px.

## Đã sửa (chỉ ba game thử nghiệm)

| Game | Thay đổi | Ở 390px |
| --- | --- | --- |
| NUMBER_LINE | Nút −, + và «Xong rồi!» cao/rộng 144 đơn vị (trước 140×120 và 300×120); **điểm kéo** nới vùng bắt chạm lên 144 đơn vị (bán kính 72) bằng `hitStrokeWidth` của Konva, **hình vẽ giữ nguyên 72** | 32,0 → 64,1px |
| SYLLABLE_BUILDER | Sáu nút ▲▼ và «Xong rồi!» cao 144 (trước 132) | 58,7 → 64,1px |
| PREPOSITION_SCENE | Nút «Done!» cao 144 (trước 132); **vật kéo** nới vùng bắt chạm lên 144 đơn vị (vật 100 + `hitStrokeWidth` 44), hình vẽ giữ nguyên 100 | 44,5 → 64,1px |

Kết quả đo lại: **cả 9 ca ba game × ba theme ở khung 390 đạt 0/0/0 (không trượt 64/56/48px), vùng chạm nhỏ nhất 64,1px** (144 × 0,445); ở 768 và 1280 cũng đạt. Không tràn ngang, không lỗi console. Vùng chạm nhỏ nhất còn lại ở khung 390 là của **ThemeLab (42,7px)**, tức renderer QUIZ/MATCHING sản phẩm và nút «Nghe lại» dùng chung: **chưa sửa** (xem dưới).

## Kiểm tra

- Ma trận độ tuổi, hàm `*Facts` và test bố cục đã cập nhật theo số mới; có test riêng khẳng định mọi vùng chạm của ba game có cạnh ngắn ≥ 144 đơn vị (để bắt cả trường hợp ma trận lạc quan 0,4875 vẫn cho qua nút 132).
- Bộ đo `measure.mjs` nay cộng thêm `hitStrokeWidth` (số) của node và con cháu vào vùng chạm đo được; trước đó nó chỉ đọc hình vẽ nên sẽ không thấy vùng bắt chạm mở rộng.
- **Kiểm bằng chuột thật trên Chrome** (đo thủ công một lần bằng script tạm, **không lưu nên không tái lập được**; khung 768, chỉ lệch theo phương ngang): kéo bắt đầu cách tâm điểm kéo trục số 0, 50 và 66 đơn vị đều kéo được (hình vẽ chỉ bán kính 36), cách 90 thì không; với vật giới từ: cách tâm 0, 60 và 70 đơn vị kéo được (nửa cạnh vật 50), cách 90 thì không. Đúng với vùng bắt chạm 72 đơn vị thiết kế.

> **Cập nhật:** phần «chưa sửa» về QUIZ, MATCHING và nút «Nghe lại» dùng chung đã được xử lý ở [`T5.4`](../t5-4-product-touch-targets/README.md).

## Giới hạn, chưa kiểm chứng

- **Chưa sửa QUIZ, MATCHING và nút «Nghe lại» dùng chung** (`games/common/mediaLayout.ts`, nút 96 đơn vị; thẻ MATCHING 110): đó là mã renderer sản phẩm, đổi chúng sẽ động tới bố cục và test đang chạy của `main`; cần bạn đồng ý. Cũng vì nút nghe lại chưa sửa, **ba game mới khi có `audioUrl` vẫn có nút «Nghe lại» 96 đơn vị → 42,7px ở khung 390** (có test cho NUMBER_LINE; hai game kia dùng cùng nút nên cùng kết quả, chưa có test riêng).
- **Tác dụng phụ của vùng bắt chạm lớn hơn hình vẽ:** (a) ở GIỚI TỪ, vật nuốt lần chạm (`cancelBubble`, để vật không nhảy theo con trỏ) nên một dải 22 đơn vị quanh vật không còn nhận chạm «đặt vật tại điểm chạm» như trước; (b) ở TRỤC SỐ, vùng điểm kéo phủ ít nhất hai vạch lân cận, bấm xuống rồi nhích vài px sẽ kéo điểm thay vì chọn vạch (chạm đứng yên vẫn vào dải thang); nó che các vật cạnh bên trong bán kính 72 (vạch trục số cách nhau 62 đơn vị với thang 0 đến 10; tâm điểm kéo hay chạm cạnh có thể nhầm điểm kéo với dải thang). Chưa thử với trẻ; chưa thử cảm ứng thật.
- Vùng chạm đo ở khung 390 theo **tỉ lệ sân 0,445** (lề trang của phòng thử); trang thật có lề khác thì số khác. Nút 144 đơn vị đạt 64px khi sân co ≥ 0,444, tức sân rộng ≥ 356px.
- Nút «−» của NUMBER_LINE ở đầu thang đang tắt (không có trình xử lý) nên **không được đo** trong 9 ca; ca đo không có `audioUrl`.
- Biên đạt 64px chỉ 0,08px (144 × 0,445 = 64,08); các test ma trận độ tuổi dùng tỉ lệ lạc quan 0,4875 (70,2px) nên không thấy biên này, chỉ phép đo thật và test «mọi vùng chạm ≥ 144 đơn vị» (so hằng số với hằng số) bù một phần.
- Bản Pixi của NUMBER_LINE (T7.1) **không** được sửa (đề xuất bỏ).
- Chữ trên nút (cỡ chữ) không đổi nên nút to hơn hình ảnh chữ; chưa đánh giá thẩm mỹ bố cục mới.
