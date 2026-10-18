# T7.1: Konva so với PixiJS trên NUMBER_LINE (2026-10-18)

Số liệu thô: [`measurements.md`](measurements.md), [`results.json`](results.json); ảnh canvas của cả ba cấu hình ở `shots/` (`konva-768.jpg`, `pixi-demand-768.jpg`...). Tệp này là phần diễn giải và các giới hạn. Phòng so engine: `/dev/experiments` → «So engine (T7.1)».

## Làm gì

Cùng một màn NUMBER_LINE (cùng câu hỏi mẫu, cùng chế độ preview / play / review, cùng theme, cùng luật chấm và cùng lối thay thế bàn phím/trình đọc màn hình) được vẽ bằng hai engine:

- **Konva** (đang dùng): `NumberLineRenderer` (react-konva).
- **PixiJS 8.21.0** (thử nghiệm, nạp lười): `PixiNumberLineRenderer`. Kiến trúc: cảnh được mô tả thành danh sách hình và vùng chạm bằng **hàm thuần** (`sceneShapes.ts`, test trong jsdom), `PixiSceneView` chỉ là «người vẽ» danh sách đó bằng Pixi (giữ đối tượng theo khóa, chỉ vẽ lại hình đổi), còn bắt chạm bằng hàm thuần `hitTest` trên toạ độ thiết kế. Hai chế độ vẽ: **vẽ khi cần** (tắt ticker, vẽ sau mỗi cập nhật, giống Konva) và **vẽ liên tục** (ticker mặc định).

Chạy lại: `node scripts/experiments/compare-engines.mjs` (khoảng 4 phút, Chrome cài sẵn).

Trong lúc so, tôi sửa luôn Konva `NumberLineRenderer`: trước đây nó vẽ vòng chỉ vạch đúng cả khi trẻ đã đặt ĐÚNG (nếu cha vẫn gửi `correctValue`), nay chỉ vẽ khi sai hoặc không trả lời, khớp các game khác và bản Pixi.

## Kết quả (lượt đo cuối, một lượt mỗi cấu hình)

1. **Chức năng tương đương, có kiểm tự động bằng chuột thật** (mục 3b của `measurements.md`, khung 1280, mẫu 0 đến 10): ba cấu hình cho **cùng kết quả ở cả 8 bước**: «+»×3 → 3, «−» → 2, chạm dải ở vạch 7 → 7, kéo điểm sang vạch 3 → 3, nộp sai → «Gần đúng rồi. Số đúng là 7.», sau khi nộp chạm dải không đổi số, thanh trượt bị khóa. **Chữ tiếng Việt có dấu** («Đặt chú ong vào số 7», «Xong rồi!») vẽ đúng trên Pixi (chữ Pixi là texture dựng từ canvas 2D của trình duyệt); hai ảnh Konva/Pixi giống nhau bằng mắt (chưa so từng điểm ảnh). Chưa kiểm tự động: xem lại, vòng nét đứt, nút nghe lại, chế độ play trên Chrome thật (chúng có test với Pixi giả và đã xem bằng mắt ở một lần thử tay).
2. **Kéo điểm 3 giây, CPU thường:** hai engine như nhau về độ mượt: 117 đến 120 fps (rAF), không khung nào rớt, khung dài nhất 17 đến 20ms. Pixi nhận nhiều sự kiện chuột hơn Konva ở lượt này (80 đến 120 so với 60 mỗi giây), nghĩa là tải đầu vào **không đều**.
3. **Kéo điểm, CPU chậm 4×:** lượt cuối: Konva 49 đến 51 fps, 71 đến 75 khung rớt (>33,4ms), khung dài nhất 108 đến 144ms; Pixi «vẽ khi cần» 104 đến 120 fps, 0 đến 6 khung rớt; Pixi «vẽ liên tục» 46 đến 94 fps, 1 đến 20 khung rớt. Ba lượt đo (hai lượt trước đã bị ghi đè, số lấy từ ghi chép lúc chạy) **cho cùng thứ tự nhưng độ lớn dao động mạnh**: Konva 4× từ 49 đến 78 fps và 7 đến 75 khung rớt giữa các lượt; Pixi «vẽ khi cần» 97 đến 120 fps. Kết luận chắc chắn chỉ là: **ở CPU chậm, Pixi «vẽ khi cần» luôn mượt hơn Konva trên cảnh này trong cả ba lượt; mức chênh chưa ước lượng được**. Chưa có profile nên chưa biết nguyên nhân; giả thuyết (chưa kiểm chứng): Konva đọc hit-graph theo pixel mỗi lần con trỏ di chuyển và react-konva đối chiếu cả cây, còn bản Pixi bắt chạm bằng hàm thuần. Ở 4× số sự kiện chuột nhận được của Konva và hai lượt Pixi thường bằng nhau (20 mỗi giây), nên so sánh ở đây công bằng hơn ở CPU thường; riêng Pixi «vẽ khi cần» có ca nhận tới 100 sự kiện/giây (vẫn ≥104 fps).
4. **Lúc đứng yên:** Konva và Pixi «vẽ khi cần» không vẽ gì (0 lần/giây); Pixi «vẽ liên tục» vẽ lại khoảng 121 lần/giây dù không có gì đổi (tốn CPU/pin với màn tĩnh).
5. **Thời gian sẵn sàng (CPU thường, cục bộ, không độ trễ mạng):** Konva 51 đến 59ms (từ lúc chọn phòng đến khi có canvas); Pixi 407 đến 451ms (từ lúc chọn Pixi: nạp lười gói + khởi tạo WebGL). Không đo ở CPU chậm (số đo được thực hiện trước khi bật giảm tốc).
6. **Bộ nhớ heap JS sau khi ép dọn rác:** Konva khoảng 5,5 MB, Pixi khoảng 7,5 MB. Không gồm bộ nhớ GPU/texture.
7. **Bundle (gzip):** bản build thường **không đổi** (228,3 KB, Pixi nằm ngoài vì nạp lười từ trang thử nghiệm). Bản thử nghiệm 419,9 KB, tăng khoảng **158 KB** so với bản thử nghiệm của T5.2 (261,6 KB); thô tăng khoảng 538 KB. Chi phí này chỉ phát sinh nếu dùng Pixi ở sản phẩm thật.
8. Không có lỗi hay cảnh báo console ở cả 18 ca đo. Bộ vẽ Pixi dùng là **WebGL** (Chrome headless trên máy này; phần mềm hay GPU thì chưa xác định).

## Phát hiện về Pixi cho dự án

- **Không có nét đứt sẵn** trong `Graphics` của Pixi 8: phải tự vẽ vòng gợi ý bằng nhiều cung (`dashedArcs`).
- **Không có bắt chạm theo hình như Konva:** ở đây dùng một trình xử lý cấp sân và `hitTest` thuần (dễ test, kiểm soát thứ tự ưu tiên điểm kéo/nút/dải), nhưng mọi renderer phải tự định nghĩa vùng chạm và tự xử lý `pointercancel`.
- **Trộn WebGL với React:** vòng đời bất đồng bộ (`init`/`destroy`) dễ rò rỉ hoặc gắn canvas muộn; đã xử lý gỡ trước/sau khi khởi tạo, đổi chế độ vẽ, khởi tạo lỗi (báo lỗi và giữ thanh trượt dùng được). **Không có đường lùi tự động sang Konva** khi thiết bị không có WebGL.
- **Hai bản mô tả cảnh trùng nhau:** logic vẽ NUMBER_LINE nay có hai nơi (JSX react-konva và `buildNumberLineScene`); thêm loại game cho cả hai engine nghĩa là viết đôi.
- **Hiệu năng Pixi phụ thuộc cách dùng:** bản đầu của tôi dựng lại mọi chữ/hình mỗi lần cập nhật và tụt nặng ở CPU 4× (bị rớt 43 đến 49 khung); thêm bộ nhớ chữ ký hình mới đạt số trên. Mặc định «vẽ liên tục» tốn CPU khi đứng yên.
- **Khác biệt cử chỉ nhỏ so với Konva** (chưa thống nhất): Pixi đặt điểm thẳng vào vị trí con trỏ lúc nhấn xuống (Konva giữ độ lệch lúc nắm); chạm dải đặt giá trị ngay lúc nhấn xuống (Konva khi nhả).
- **Vùng chạm nhỏ là vấn đề sẵn có, không do engine:** điểm kéo chỉ 32px ở khung 390 cho cả hai engine, dưới ngưỡng 48/56/64px (xem T5.2).

## Giới hạn, chưa kiểm chứng (đọc trước khi dùng số liệu)

- Bản Pixi **chưa có**: nền họa tiết SVG của theme (chỉ tô màu nền sân), hiệu ứng phản hồi `FeedbackOverlay` (vòng sáng/hạt), tương đương `QuestionAudioButton` ngoài nút vẽ giản lược. Cảnh Pixi vì thế **nhẹ hơn** Konva một chút, nên so sánh thiên lệch có lợi cho Pixi (mức độ chưa đo).
- Một cảnh nhỏ (khoảng 40 hình, vài chữ). Với cảnh nhiều sprite/hạt kết luận có thể đảo ngược; chưa thử.
- Chrome headless tự động trên một máy Windows; CPU «chậm 4×» là giả lập. Chưa thử điện thoại/máy yếu thật, cảm ứng thật, trình đọc màn hình thật, GPU thật.
- Tải đầu vào lúc kéo (số sự kiện chuột) do Playwright gửi không theo nhịp cố định nên **khác nhau giữa các ca**; xem cột «Sự kiện chuột nhận được/giây» trong `measurements.md`. Ngưỡng «khung rớt» tính theo 60 Hz dù rAF chạy 120 Hz. Mỗi cấu hình chỉ một lượt 3 giây, chưa có khoảng tin cậy, và các lượt cho thấy độ dao động lớn (mục 3).
- Thời gian sẵn sàng không tính độ trễ tải gói qua mạng thật (gói Pixi khoảng 158 KB gzip).
- Bản Pixi **chưa kiểm trên trình duyệt thật** ở các điểm sau (test dùng Pixi giả, chỉ kiểm vòng đời, bố cục, luồng logic và chuyển toạ độ khi co): API Pixi thật cho `arc`/`roundRect`/`anchor` (chỉ kiểm bằng mắt và các bước ở mục 1), `ResizeObserver` thật, StrictMode hai lần chạy effect.
- Bộ đo dùng tín hiệu `window.__pixiHarness` chỉ có ở bản dev hoặc `VITE_EXPERIMENTS=1`.
