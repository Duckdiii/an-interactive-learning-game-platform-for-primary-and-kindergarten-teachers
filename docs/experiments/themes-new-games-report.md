# Báo cáo thử nghiệm: theme, loại game mới và thư viện (T6)

Ngày 2026-10-19. Nhánh `experiment/themes-and-new-games` (tạo từ `main` `61201cd`, 21 commit từ T0 đến T9.1, chưa tính commit của báo cáo này). Kế hoạch: [`themes-new-games-plan.md`](themes-new-games-plan.md). Số đo: thư mục [`results/`](results/). Đây là thử nghiệm để biết «hợp hay không», **không phải tính năng chính thức**; việc merge vào `main` do bạn quyết sau khi đọc báo cáo này.

**Cách đọc:** mỗi kết luận ghi rõ dựa trên đo (Chrome headless một máy Windows, một lượt đo mỗi ca) hay trên suy luận. Những gì **chưa kiểm chứng** nằm ở mục 7; đọc mục đó trước khi dùng bất kỳ con số nào.

## 1. Tóm tắt

1. **Konva đủ cho phần lớn nhu cầu đã thử.** Cả 3 loại game mới (trục số, ghép tiếng, đặt vật theo giới từ), hai theme có nền họa tiết SVG, hiệu ứng phản hồi và kéo-thả đều chạy tốt bằng Konva ở CPU thường (≈ 120 fps, không khung rớt); chữ tiếng Việt có dấu vẽ đúng. **Ở CPU giả lập chậm 4× kết quả mâu thuẫn giữa hai phép đo** (49 đến 120 fps khi kéo, 56 đến 77 fps khi chạm nút liên tục), nên **chưa chứng minh Konva đủ trên máy yếu** (mục 2). Vùng chạm ở khung hẹp 390px đã được sửa (ba game mới ở T5.3; QUIZ, MATCHING và nút «Nghe lại» ở T5.4); điều **chưa** có là thử trên thiết bị cảm ứng, trình đọc màn hình, iOS thật (mục 2 và 7).
2. **Chưa có lý do đủ mạnh để thêm thư viện đồ họa/vật lý cho sản phẩm** (đề xuất bỏ, mục 5). PixiJS mượt hơn Konva ở CPU chậm 4× (mức chênh chưa ước lượng được) nhưng thêm ≈ 158 KB gzip, phải viết mỗi cảnh hai lần và không có đường lùi khi thiếu WebGL; việc bỏ Pixi dựa vào chi phí đó, **không** phải vào chuyện Konva đã chứng minh đủ; Lottie/dotlottie không đem lại gì cho hiệu ứng đơn giản; `matter-js` cho **cùng** vị trí cuối với một hàm 8 dòng. Khuyến nghị bỏ bốn thư viện này; Rive thì hoãn vì chưa có dữ liệu (mục 5).
3. **Nên giữ** hạ tầng theme, hiệu ứng phản hồi chung, `AudioService` (âm tổng hợp), hồ sơ độ tuổi và bộ đo tự động; Howler vẫn cần cho lời đọc từ tệp. Hạ tầng theme phải **dời ra khỏi `experiments/`** trước khi merge vì mã renderer thật đã import nó.
4. **Vấn đề lớn nhất phát hiện (đã sửa một phần):** ở khung 390px (điện thoại dọc) vùng chạm của cả 3 game mới và của ThemeLab (QUIZ, MATCHING) **có chỗ trượt** ngưỡng 64/56/48px bạn chốt (NUMBER_LINE trượt cả ba ngưỡng với điểm kéo 32px; PREPOSITION_SCENE và ThemeLab trượt cả ba; SYLLABLE_BUILDER chỉ trượt 64px, 58,7px); ma trận dự đoán ở T5.1 lạc quan hơn thực tế vì lề trang. **T5.3 (2026-10-19) đã sửa ba game mới** (nút 144 đơn vị, vùng bắt chạm điểm kéo/vật kéo 144) và **T5.4 đã sửa QUIZ, MATCHING và nút «Nghe lại» dùng chung** (mã sản phẩm, trên nhánh thử nghiệm, không merge `main`); đo lại: mọi ca đạt ở 390px (nhỏ nhất 64,1px, không trượt ngưỡng nào). Còn lại là thử trên thiết bị thật.
5. **Đưa 3 loại game vào sản phẩm là việc lớn và chưa chạy được đầu-cuối:** phải đổi DSL đã đóng băng (4 nơi) cùng `openapi.yaml`, thêm migration V5, ~70 tệp (ước lượng thô), và Backend hiện chưa có controller game, phiên chơi hay chấm điểm (mục 6 và `dsl-1.1-proposal.md`). Chỉ làm khi nhóm đồng ý.
6. **Chưa làm:** T8 (giọng đọc đám mây, ảnh AI; chờ Q8/Q9 của bạn), T9.2 (đổi DSL thật; chờ nhóm), Rive (chưa có tệp `.riv`, chỉ đánh giá trên giấy).

## 2. Konva có đủ không? Bằng chứng theo từng tiêu chí

| Tiêu chí | Bằng chứng | Kết luận |
| --- | --- | --- |
| **FPS khi kéo/chạm** | T5.2 (Chrome headless, rAF ≈ 120 Hz): CPU thường mọi ca không khung rớt; CPU chậm 4×: kéo vật vẫn ≈ 120 fps (T5.2, đo bằng rAF; Konva chỉ vẽ ≈ 80 lần/giây), chạm nút liên tục giảm còn 56 đến 77 fps (không khung nào > 33,4ms). T7.1: ở CPU chậm 4× Konva kéo điểm 49 đến 78 fps (7 đến 75 khung rớt, dao động mạnh giữa các lượt) (cùng thao tác kéo điểm NUMBER_LINE ở CPU 4× nhưng **T5.2 đo ≈ 120 fps, 0 khung rớt còn T7.1 đo ≈ 50 fps, 71 khung rớt**: hai phép đo mâu thuẫn; khác biệt có thể do số sự kiện chuột Playwright gửi (T7.1 ghi Konva nhận ≈ 20 sự kiện/giây ở ca đó) và cách đếm khung, chưa kiểm) so với Pixi «vẽ khi cần» 97 đến 120 fps | Đủ ở CPU thường. **Ở máy chậm Konva chưa chứng minh đủ**: T7.1 cho Pixi «vẽ khi cần» mượt hơn trong cả ba lượt (mức chênh chưa ước lượng được, nguyên nhân chưa profile, bản Pixi nhẹ hơn nên thiên lệch có lợi cho Pixi), T5.2 lại cho Konva ≈ 120 fps; chưa ai thử tối ưu Konva. Máy trường học/điện thoại rẻ là đối tượng thật của dự án và **chưa được thử** |
| **Kéo-thả cảm ứng** | Chỉ có chuột thật trong Chrome headless (Playwright) và giả lập Pixel 5 (chỉ đổi kích thước/UA/sự kiện chạm). Có bản kéo + lối thay thế (chạm dải, nút +/−, thanh trượt, nút nhích) | **Chưa chứng minh trên cảm ứng thật.** Vùng chạm nhỏ ở khung 390px là rủi ro thật cho trẻ nhỏ (xem dưới) |
| **Đo chữ / tiếng Việt có dấu** | `measureWrappedTextHeight` (có sẵn) dùng cho bố cục; ở jsdom không có Canvas nên dùng ước lượng dự phòng. T7.1: «Đặt chú ong vào số 7», «Xong rồi!» vẽ đúng ở cả Konva và Pixi; so bằng mắt, chưa so từng điểm ảnh | Đủ. Chưa kiểm font và dấu ở máy khác (font hệ thống khác nhau) |
| **SVG** | Hai theme dùng SVG vẽ bằng code, nhúng dạng data URI làm `fillPatternImage`; dựng nền sau 27 đến 35ms ở cả 18 ca (T5.2, không mạng) | Đủ cho nền họa tiết; chưa thử ảnh/SVG lớn hay tải qua mạng thật (T8) |
| **Truy cập bàn phím / trình đọc màn hình** | Canvas Konva không có cây DOM; cả 3 game có vùng DOM ẩn (thanh trượt, hộp chọn, nút nhích, `role=status`) làm lối thay thế. axe (T5.2): hai lỗi còn lại là của **trang thử nghiệm** (thiếu `<main>`), không phải game; axe không nhìn thấy bên trong canvas | Lối thay thế có và qua axe, nhưng **chưa thử trình đọc màn hình thật**. Đây vẫn là điểm yếu cấu trúc của canvas, không phải thứ đo được là «đủ» |
| **Bố cục không đè nhau** | Hàm bố cục thuần có test duyệt mọi tổ hợp (kích thước, theme, chữ dài) cho từng game | Đủ ở mức test; ảnh chụp chỉ ở một số trạng thái |
| **Bundle** | Build thường của nhánh 228,3 KB gzip so với `main` 227,6 KB (+0,7 KB; số của `main` đo tay) | Hạ tầng theme gần như không tốn ở sản phẩm |

**Vùng chạm ở khung 390px (đo thật, T5.2, TRƯỚC khi sửa ở T5.3):** nhỏ nhất NUMBER_LINE 32,0px (điểm kéo), PREPOSITION_SCENE 44,5px (vật kéo), SYLLABLE_BUILDER 58,7px (sáu nút ▲▼), ThemeLab 42,7px («Nghe lại»); ở 768 và 1280 mọi ca đạt cả ba nhóm tuổi (nhỏ nhất 66,1px). Chi tiết: SYLLABLE_BUILDER (nút 132 đơn vị) cần nút khoảng 144 đơn vị (hoặc sân chiếm trọn khung) để đạt 64px; còn **điểm kéo NUMBER_LINE (32px) và vật kéo PREPOSITION_SCENE (44,5px) không đạt chỉ bằng cách bỏ lề**: phải phóng to vùng bắt chạm hoặc đổi bố cục ở khung hẹp. Đây là **thiếu sót của bố cục**, không phải của Konva. **Sau T5.3** (`results/t5-3-touch-targets/`) ba game mới đạt 64,1px ở 390 (nút 144 đơn vị; điểm kéo và vật kéo nới vùng bắt chạm bằng `hitStrokeWidth`, kiểm bằng chuột thật) và **sau T5.4** (`results/t5-4-product-touch-targets/`) QUIZ, MATCHING và nút «Nghe lại» dùng chung cũng đạt 64,1px (nâng ba hằng số bố cục sản phẩm lên 144; canvas MATCHING cao hơn, chưa thử với trẻ).

## 3. Kết quả theo từng phần

| Phần | Commit / thư mục | Kết quả chính (đo hay suy luận) |
| --- | --- | --- |
| **Theme: hạ tầng** (T1.1 đến T1.4: `ThemeManifest`, `validateTheme`, `ThemeProvider`, `useTheme`, theme trung tính, trình nạp tài sản, áp theme vào MATCHING) | `acd17bc`…`f5dbb0c` | Theme «trung tính» giữ nguyên diện mạo hiện tại (kiểm bằng so màu); `validateTheme` kiểm tương phản, nhóm tuổi, đỏ gắt, SVG. QUIZ và MATCHING sản phẩm dùng theme qua `ThemeContext` |
| **Hai theme Vũ trụ, Đại dương** (T3) | `af3cccd`, `results/t3-themes/` | SVG vẽ bằng code, không tệp ngoài; dùng được ở QUIZ, MATCHING, 3 game mới. **Thẩm mỹ chưa được ai đánh giá**; ảnh chụp lấy từ canvas (không phải màn hình thật) |
| **Hiệu ứng phản hồi** (T2.2: nảy, gật, vòng sáng, hạt) | `be29823` | Giới hạn an toàn: ≤ 2 giây, không chớp quá 3 lần/giây, không đỏ gắt, theo «giảm chuyển động». Giới hạn là đề xuất, chưa chuyên gia xác nhận |
| **Âm thanh tổng hợp** (T2.1: `AudioService`) | `e640a08` | Không cần tệp, có tắt tiếng/âm lượng/giới hạn đồng thời/mở khóa bằng cử chỉ; **chưa nghe thử bằng loa thật** |
| **Giọng đọc trình duyệt** (T2.3) | `cd9bafa`, `results/tts-probe-2026-10-18.md` | Một máy, trong cửa sổ nhúng của Claude desktop (Chromium 152, không phải Chrome cá nhân): 1 giọng Việt + 3 giọng Anh (en-US), khai là chạy trên máy; **chưa đánh giá chất lượng, chưa thử máy khác**. Chỉ nên là phương án dự phòng |
| **Hồ sơ độ tuổi** (T5.1: 64/56/48px, giới hạn chữ/lựa chọn) | `1a718ba`, `results/age-profile-matrix-2026-10-18.md` | `validateAgainstProfile` hoạt động; **ngưỡng 64/56/48 do bạn chốt, các số còn lại là đề xuất chưa chuyên gia xác nhận**. Ma trận dự đoán lạc quan hơn thực tế (T5.2) |
| **Ba loại game mới** (T4.1 đến T4.3: NUMBER_LINE, SYLLABLE_BUILDER, PREPOSITION_SCENE) | `6b8189d`, `0005529`, `8bc53e3` | Đủ `preview`/`play`/`review`, lối bàn phím, theme, chấm bằng hàm thuần, dạng học sinh không lộ đáp án. **Chấm ở client trong thử nghiệm**; luật chính tả/dấu thanh và giới từ **chưa có người chuyên môn xác nhận** |
| **Đo tự động** (T5.2) | `674429e`, `results/t5-2/` | Một lệnh đo vùng chạm, tràn ngang, console, axe, FPS, nền theme, bundle bằng Chrome thật |
| **PixiJS** (T7.1) | `fcb75b4`, `results/t7-1/` | Chức năng tương đương Konva (8/8 bước); mượt hơn ở CPU 4×; +158 KB gzip (nạp lười); 407 đến 451ms để sẵn sàng; cảnh phải viết hai lần; không có đường lùi khi thiếu WebGL; bản Pixi thiếu nền theme và hiệu ứng nên so sánh **thiên lệch có lợi cho Pixi** |
| **Lottie/dotlottie, Rive** (T7.2) | `b1f7de8`, `results/t7-2/` | lottie-web ≈ 76 KB gzip; dotlottie ≈ 502 KB (có WASM, nạp ≈ 380ms); với một hoạt ảnh cả bốn nguồn (Konva + 3 bộ phát) khác biệt nhỏ; mốc Konva là hiệu ứng hiện có (vòng sáng, hạt), không cùng hình với sao/mặt cười nên không so thẩm mỹ được, và ở thử tải 12 hoạt ảnh cùng lúc ở CPU 4× lottie-web (75 đến 85 fps) có chiều hướng ≥ Konva (54 fps) nhưng giữa các lượt số đã đổi; với một hoạt ảnh thì Konva gọn hơn vì không thêm thư viện; bộ kiểm an toàn từ chối tệp có tính năng nó không kiểm được (biểu thức, ảnh ngoài...). **Rive: chỉ trên giấy** |
| **matter-js** (T7.3) | `e8c8c68`, `results/t7-3/` | Mô phỏng ≈ 0,15ms/lần, tất định (275/275), gói ≈ 26 KB gzip nạp lười; **vị trí cuối trùng (trong 1 đơn vị cảnh) một hàm rơi thẳng viết tay** trên lưới 576 điểm; hàm đó dùng chung `liftOutOfSolids`, `landmarkSolids` và `sceneBounds` với bản matter nên chỉ so phần trọng lực/va chạm, và chỉ đúng cho vật chữ nhật không xoay; «tất định 275/275» chỉ trên 55 điểm trên bàn, một trình duyệt. Thả rơi **đổi cách chơi** («under» bắt buộc buông dưới mặt bàn), hộp vẫn vẽ như khối đặc, bàn phím phải tách «dời» và «thả» |
| **Howler và Web Audio** (T7.4) | `a93c950`, `results/t7-4/` | Howler ≈ 10,4 KB, `AudioService` ≈ 1,9 KB; độ trễ phát 6 so với 21ms (p50); cả hai im lặng khi chưa có cử chỉ; Howler giữ âm chờ và phát ở cử chỉ sau (không giới hạn thời gian, đã thử 4 giây), còn `AudioService` cũng xếp hàng (tối đa 3 lệnh, 2 giây) và phép đo không phân biệt được âm xếp hàng với âm lần bấm; Howler chồng 20 lần gọi có thể cắt đỉnh (đo được 1,06); chênh độ trễ ≈ 15ms nhỏ hơn `outputLatency` ≈ 40ms do API báo; thứ tự độ trễ lần chạm đầu không kết luận được; tệp thiếu thì Howler im lặng, **code hiện tại không có dự phòng** |
| **Đề xuất DSL 1.1** (T9.1) | `9341615`, [`dsl-1.1-proposal.md`](dsl-1.1-proposal.md) | Chỉ tài liệu, chưa trao đổi nhóm; nêu phương án đánh phiên bản, nhóm `PlayInteractionDetail`, tác động ~70 tệp (ước lượng thô) |

Kiểm thử của nhánh: 72 tệp test, 1746 test qua (164 test gốc của `main` không sửa); chèn lỗi thử sau mỗi subtask (hàng chục chỗ) đều làm test đỏ, trừ vài chỗ tương đương đã ghi trong `ai-usage-log.md`.

## 4. Vấn đề gặp và bài học

- **Môi trường đo:** cửa sổ trình duyệt nhúng của Claude desktop bị ẩn nên rAF bị giảm nhịp và `Konva` hit canvas cũ; từ T5.2 chuyển sang Chrome thật qua Playwright. Trình duyệt headless có thể không dùng loa thật nên độ trễ phần cứng không có trong số đo.
- **Số đo sai phải làm lại:** T7.1 (Pixi dựng lại mọi hình mỗi lần cập nhật làm số tụt; cột «sẵn sàng» đo nhầm; heap không ép dọn rác), T7.2 (tín hiệu đo chỉ gắn với bộ phát cuối nên 12 bản dotlottie vô nghĩa; thời gian gỡ lớp phủ tính từ lúc có phản hồi thay vì lúc sẵn sàng), T7.4 (Playwright `evaluate` tự tính là cử chỉ người dùng nên ca «không cử chỉ» sai). Cả ba đã sửa và ghi vào `ai-usage-log.md`; hộp bài học `.claude/lessons-inbox.md` có 3 mục chờ bạn duyệt.
- **README ghi số sai hoặc nói quá bằng chứng** (T7.2, T7.4 sai số/kết luận từ một lượt đo dao động; T7.3, T9.1 thiếu hạn chế quan trọng): `reviewer` bắt được ở cả bốn lần; đã sửa. Hộp bài học chỉ ghi hai lần có sai số cụ thể (T7.2, T7.4). Bài học: chỉ nêu «chiều hướng» khi các lượt đo cho số khác nhau.
- **Lỗi thật của sản phẩm tìm ra khi thử nghiệm:** Konva `NumberLineRenderer` từng vẽ vòng chỉ vạch đúng cả khi trẻ đã đúng (đã sửa); vật nằm yên lún 0,1 vào đất làm bộ đưa vật ra khỏi khối ném đi xa (đã sửa, T7.3).
- **Giảm triệu chứng thay vì tìm nguyên nhân gốc:** thời hạn mỗi test nâng lên 15 giây (`vite.config.ts`) vì test đầu của vài file Lab có lúc vượt 5 giây khi cả bộ chạy song song. **Chưa tìm ra nguyên nhân gốc**; nếu merge, nên quyết giữ hay bỏ thay đổi này.
- **Thư viện ghim chính xác, hợp lệ theo quy tắc «không thêm thư viện nếu chưa hỏi»:** devDependency `playwright-core` 1.63.0, `@axe-core/playwright` 4.14.0, `rollup-plugin-visualizer` 7.1.1; dependency `pixi.js` 8.21.0, `lottie-web` 5.13.0, `@lottiefiles/dotlottie-web` 0.80.0, `matter-js` 0.20.0 (kiểu khai báo tay, không thêm `@types`). Tất cả đã được bạn duyệt.

## 5. Khuyến nghị giữ/bỏ (đề xuất, bạn quyết)

| Phần | Khuyến nghị | Lý do |
| --- | --- | --- |
| Hạ tầng theme (T1.1 đến T1.4) | **Giữ**, dời `experiments/theme` ra ngoài trước khi merge | Chi phí bundle gần 0; mã renderer thật đã import nó |
| Hai theme Vũ trụ, Đại dương | **Giữ có điều kiện** | Cần bạn/thầy cô đánh giá thẩm mỹ và độ phù hợp lứa tuổi |
| Hiệu ứng phản hồi chung (T2.2) | **Giữ** | Konva đủ; giới hạn an toàn có sẵn; cần chuyên gia xác nhận giới hạn |
| `AudioService` (âm tổng hợp) | **Giữ** cho âm phản hồi ngắn | Không cần tệp âm thanh, chặn được tràng âm khi bấm dồn; **không** vì tiết kiệm kích thước (Howler vẫn phải giữ cho lời đọc); cần nghe thử bằng loa thật |
| Howler | **Giữ** cho lời đọc câu hỏi từ tệp (+ thêm xử lý tệp thiếu) | Âm tổng hợp không đọc được lời; hiện tệp thiếu thì im lặng, không dự phòng |
| Web Speech API (T2.3) | **Chỉ làm dự phòng** | Giọng khác nhau theo thiết bị, chỉ có 1 giọng Việt trên máy đã thử |
| Hồ sơ độ tuổi + bộ đo T5.2 | **Giữ** | Bắt được lỗi vùng chạm mà test không thấy; ngưỡng cần chuyên gia xác nhận |
| 3 loại game mới | **Giữ như thử nghiệm**; đưa vào sản phẩm khi nhóm duyệt đổi DSL | Chạy tốt nhưng chấm ở client, luật chưa xác nhận, Backend chưa có phiên chơi |
| **PixiJS** | **Bỏ** (có điều kiện) | Lý do là chi phí: +158 KB, cảnh viết hai lần, không đường lùi khi thiếu WebGL. **Không** phải vì Konva đã chứng minh đủ ở máy chậm (chưa chứng minh; chưa thử tối ưu Konva). Xem lại nếu máy thật của lớp học cho thấy Konva giật hoặc nếu có cảnh nhiều sprite/hạt |
| **Lottie / dotlottie** | **Bỏ** (giữ lottie-web chỉ nếu nhà thiết kế giao tệp Lottie **và** mở rộng bộ kiểm) | Hiệu ứng đơn giản Konva làm không thêm thư viện; dotlottie nặng 6,6 lần lottie-web; ở thử tải nặng lottie-web có chiều hướng nhỉnh hơn nhưng không ổn định giữa các lượt |
| **Rive** | **Hoãn** (không đánh giá) | Chưa có tệp `.riv` nên chỉ đánh giá trên giấy, không có số đo; chưa đủ dữ liệu để kết luận giữ hay bỏ |
| **matter-js** | **Bỏ** | Ở cảnh này vị trí cuối trùng một hàm 8 dòng (xem hạn chế ở mục 3); nếu muốn cảm giác rơi, thử tween gia tốc trên Konva (**chưa thử**) |

## 6. Công sức tích hợp vào `main` (ước tính thô của tôi, chưa kiểm bằng thực tế)

| Gói | Nội dung | Ước tính | Phụ thuộc/rủi ro |
| --- | --- | --- | --- |
| A. Hạ tầng dùng chung | Dời theme ra ngoài `experiments/`; giữ `AudioService`, hiệu ứng, hồ sơ độ tuổi, bộ đo (và 3 devDependency của bộ đo: `playwright-core`, `@axe-core/playwright`, `rollup-plugin-visualizer`); nếu bỏ 4 thư viện (Pixi, lottie-web, dotlottie, matter-js) thì phải gỡ cả renderer Pixi, phòng so engine/Lottie, prop `dropSimulator` và các script `compare-*.mjs` phụ thuộc chúng (hoặc giữ chúng ở nhánh thử nghiệm riêng để còn chạy lại số đo) | 3 đến 5 ngày **chưa tính** phần gỡ này | Conflict với `everyone/UI` (đã sửa nhiều chỗ khác); mã renderer thật ở T1.4/T3 đã sửa |
| B. Sửa vùng chạm khung hẹp | **Đã làm xong (T5.3 cho ba game mới, T5.4 cho QUIZ, MATCHING và nút «Nghe lại» dùng chung)**; khi merge phải đối chiếu ba hằng số (`AUDIO_BUTTON_HEIGHT`, `CARD_MIN_HEIGHT`, `CONFIRM_BUTTON_HEIGHT` của MATCHING) với nhánh đích và chấp nhận một test gốc đổi cận | đã xong; còn công đối chiếu khi merge | Đổi bố cục renderer sản phẩm; cần đo lại bằng `measure.mjs` |
| C. Lời đọc | Xử lý tệp âm thanh thiếu/lỗi cho `useQuestionAudio`; (T8.1) giọng đọc đám mây nếu bạn chọn | 1 ngày (xử lý thiếu) + T8.1 chưa ước | T8.1 chờ Q8; cần khóa API đặt ngoài Frontend |
| D. Ba loại game vào sản phẩm | DSL 1.1 (4 nơi) + `openapi.yaml` + migration V5 + entity/strategy/factory/luật Layer 2 + cổng luật chấm sang Java + chuyển renderer sang `games/` (đổi sang Backend chấm) | 5 đến 8 ngày theo kế hoạch T9.2; **có thể hơn** vì còn cổng luật chấm tiếng Việt và chưa có phiên chơi | Phải được nhóm duyệt đổi 2 contract đã đóng băng; chưa chạy đầu-cuối vì Backend chưa có controller game |

Tổng của kế hoạch ban đầu là 17 đến 22 ngày, sau khi mở rộng 35 đến 45 ngày; phần đã làm trong nhánh này nằm trong phạm vi đó, chưa đo lại thời gian thật.

## 7. Chưa làm / chưa kiểm chứng (đọc trước khi dùng số liệu)

- **Không có thiết bị thật:** chưa thử cảm ứng thật, điện thoại/máy tính bảng thật, iOS Safari/Android, trình đọc màn hình thật, loa/tai nghe thật, máy yếu thật. Mọi FPS/độ trễ là Chrome headless một máy Windows; «CPU chậm 4×» là giả lập.
- **Một lượt đo mỗi ca**, chưa có khoảng tin cậy; ở nhiều ca (Pixi 4×, chạm 12 hoạt ảnh, độ trễ lần chạm) các lượt cho số khác nhau nên chỉ có «chiều hướng».
- **Nội dung sư phạm/ngôn ngữ chưa ai xác nhận:** quy tắc ghép vần, kiểu đặt dấu `modern`, từ điển nhỏ, quy tắc on/under/in/next to, giới hạn chữ/lựa chọn theo tuổi, giới hạn an toàn của hiệu ứng và âm thanh.
- **Thẩm mỹ:** hai theme, hoạt ảnh, âm thanh chưa được đánh giá bởi người; ảnh chụp lấy từ canvas.
- **T8 chưa làm** (giọng đọc đám mây, ảnh AI): chờ Q8, Q9; cần khóa API (script Node cục bộ, không bao giờ trong mã Frontend/biến `VITE_*`).
- **T9.2 chưa làm** và chưa trao đổi nhóm (Q11); `dsl-1.1-proposal.md` mới là đề xuất.
- **Chưa `npm ci` sạch** để lặp lại số bundle; Node 20.19.6 (một số devDependency khai báo Node cao hơn, chỉ cảnh báo).
- Thư mục `.playwright-mcp/` (244 tệp, ≈ 12 MB) nay đã nằm trong `.gitignore` (T5.3); chưa bao giờ được commit.

## 8. Câu hỏi mở

**Cho bạn:**
1. Giữ/bỏ từng phần ở mục 5; có merge vào `main` không, và gói nào trước (A, B)?
2. Q8: nhà cung cấp, hạn mức chi phí và nơi để khóa cho TTS đám mây (T8.1); Q9: nhà cung cấp, hạn mức và quy tắc duyệt ảnh AI (T8.2). Nếu không có thì T8 bỏ.
3. Q11: đã trao đổi nhóm về đổi DSL chưa?
4. Giữ hay bỏ `testTimeout` 15 giây? Chấp nhận canvas MATCHING cao hơn (thẻ và nút 144 đơn vị) đổi lấy vùng chạm đạt 64px? (`.playwright-mcp/` đã được ignore ở T5.3.)
5. Duyệt 3 mục trong `.claude/lessons-inbox.md`?

**Cho thầy/Cô Thơ (chuyên môn):**
1. Ngưỡng độ tuổi: tối đa chữ trên thẻ/câu và số lựa chọn (mầm non 12 chữ/60 ký tự/3 lựa chọn; lớp 1 đến 2 20/100/4; lớp 3 đến 5 30/200/4) có hợp lý không?
2. Ghép tiếng: kiểu đặt dấu `modern` (hòa) hay `traditional` (hoà) mặc định; bộ luật chính tả và từ điển nhỏ có đủ/đúng không; có nên cho trẻ mầm non ghép từng phần hay cho tiếng có sẵn?
3. Giới từ: quy tắc «on» khi vật hơi nổi/chìm, «under» phải chui hẳn dưới mặt bàn, «next to» có khoảng hở bao xa; thả rơi có phù hợp trẻ mầm non không?
4. Âm thanh và hiệu ứng phản hồi: giới hạn (≤ 2 giây, ≤ 3 lần chớp/giây, âm không phạt) có đủ nhẹ nhàng; trẻ có thích/gây phân tâm?
5. Hai theme (Vũ trụ, Đại dương): có phù hợp lứa tuổi và nội dung từng môn không?
6. Trục số: «đếm cách 2», dung sai `tolerance` có nên cho trẻ nhỏ không?

**Cho nhóm (nếu làm T9.2):** 8 câu (đánh số 0 đến 7) ở cuối `dsl-1.1-proposal.md`.

## 9. Cách chạy lại các phép đo

```bash
cd frontend
npm run measure:experiments                      # T5.2: vùng chạm, tràn ngang, console, axe, FPS, nền theme, bundle
node scripts/experiments/compare-engines.mjs     # T7.1: Konva so với Pixi
node scripts/experiments/compare-lottie.mjs      # T7.2: hoạt ảnh phản hồi
node scripts/experiments/compare-physics.mjs     # T7.3: thả rơi matter-js
node scripts/experiments/compare-audio.mjs       # T7.4: Howler so với Web Audio
```

Cần Chrome cài sẵn (`playwright-core` dùng `channel: 'chrome'`, không tải trình duyệt). Xem thử bằng tay: chạy `npm run dev` rồi mở `/dev/experiments` (chỉ có ở bản dev hoặc `VITE_EXPERIMENTS=1`).
