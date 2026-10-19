# T5.2: đo tự động khu thử nghiệm (2026-10-18)

> **Cập nhật 2026-10-19:** vùng chạm ở khung 390px của ba game mới đã được sửa và đo lại ở [`../t5-3-touch-targets`](../t5-3-touch-targets/README.md); các số vùng chạm của ba game ở dưới là số **trước khi sửa** (giữ để so sánh). QUIZ/MATCHING sản phẩm chưa sửa.

Số liệu thô: [`measurements.md`](measurements.md) (bảng đầy đủ) và [`results.json`](results.json); ảnh sân từng ca ở `shots/` (JPEG, tên `khung-loại game-theme`). Tệp này là phần diễn giải và các giới hạn.

## Cách chạy lại

```bash
cd frontend
npm run measure:experiments            # build 2 bản, 30 ca, FPS (khoảng 5 phút)
node scripts/experiments/measure.mjs --skip-bundle --no-fps --lab=number-line   # chạy nhanh một loại game
```

Cần Chrome cài sẵn (playwright-core dùng `channel: 'chrome'`, không tải trình duyệt). Phần phân tích thuần (`scripts/experiments/analysis.mjs`) có test (`analysis.test.mjs`); phần chạy trong trình duyệt (bộ đọc vùng chạm Konva, đo nền họa tiết, đo FPS) **không có test tự động**, chỉ được kiểm bằng cách chạy thật và đối chiếu số. Sơ đồ bundle: `ANALYZE=1 ANALYZE_OUT=stats.html npx vite build --outDir <thư mục tạm>` (chạy được với Vite 8 / Rolldown trên Node 20 dù metadata của `rollup-plugin-visualizer` (≥ 22) và `@axe-core/playwright` (≥ 22.12, theo lockfile) khai báo Node cao hơn Node 20.19.6 của máy này (npm chỉ cảnh báo EBADENGINE; máy/CI dùng Node thấp hơn nữa chưa thử); không đưa `stats.html` vào repo).

## Kết quả chính

1. **Không tràn ngang (cả trong khung thử nghiệm lẫn cả trang), không có lỗi hay cảnh báo console** ở cả 30 ca (3 khung × 3 loại game × 3 theme, cộng ThemeLab ở 3 khung). Lưu ý: `ResponsiveStage` tự co theo khung nên tràn ngang vốn khó xảy ra; phép đo không phát hiện được việc nội dung trong canvas bị đè hay bị cắt (phần đó do test bố cục thuần và ảnh chụp).
2. **Vùng chạm ở khung 390px (đo thật, tỉ lệ sân 0,445, không tính nét viền)** là chỗ yếu duy nhất:

   | Loại game | Vùng nhỏ nhất | Chi tiết | Trượt 64 / 56 / 48 |
   |---|---|---|---|
   | NUMBER_LINE | 32,0px | điểm kéo 32,0; «+» và «Xong rồi!» 53,4 | 3 / 3 / 1 |
   | SYLLABLE_BUILDER | 58,7px | sáu nút ▲▼ và «Xong rồi!» 58,7 | 7 / 0 / 0 |
   | PREPOSITION_SCENE | 44,5px | vật kéo 44,5; «Done!» 58,7 | 2 / 1 / 1 |
   | ThemeLab (QUIZ, MATCHING sản phẩm) | 42,7px | «Nghe lại» 42,7; thẻ 49,0 | 7 / 7 / 1 |

   Nút «−» của NUMBER_LINE đang tắt ở đầu thang nên không có trình xử lý và không được tính (ở giá trị khác kết quả có thể khác). Ở khung 768 và 1280 mọi ca đạt cả ba nhóm tuổi (nhỏ nhất 66,1px).
3. **Đối chiếu với ma trận T5.1 (dự đoán): ma trận lạc quan hơn thực tế.** Ma trận giả định sân chiếm trọn khung (tỉ lệ 390/800 = 0,4875); thực tế lab có lề `p-4` và viền khung nên sân chỉ rộng 356px (tỉ lệ 0,445). Hai bên đều không tính nét viền, nên chênh lệch là do tỉ lệ:

   | Loại game, khung 390 | Dự đoán T5.1 (trượt 64 / 56 / 48) | Đo thật |
   |---|---|---|
   | NUMBER_LINE | 4 / 1 / 1 | 3 / 3 / 1 |
   | SYLLABLE_BUILDER | 0 / 0 / 0 | 7 / 0 / 0 |
   | PREPOSITION_SCENE | 1 / 1 / 0 | 2 / 1 / 1 |

   Hệ quả: câu «đạt mầm non ở khung 390» ghi ở T4.2 (nút 132 đơn vị → 64,4px) **chỉ đúng khi sân chiếm trọn khung**; trong trang có lề 16px mỗi bên thì còn 58,7px. Để đạt 64px thật cần nút khoảng 144 đơn vị (144 × 0,445 ≈ 64,1) hoặc để sân chiếm trọn chiều rộng. Đây là phát hiện của T5.2, chưa sửa mã (ngoài phạm vi).
4. **FPS khi kéo/chạm liên tục (theme Vũ trụ):** vòng rAF chỉ chạy trong lúc thao tác (3 giây), kèm đếm số lần Konva vẽ lại thật. Trình duyệt headless trên máy này chạy rAF khoảng 120 Hz, và Konva vẽ lại gần như mỗi khung hình trong lúc thao tác (thao tác có tác dụng). CPU thường: ở cả 9 ca khung dài nhất ≤ 18,2ms, không khung nào rớt. **CPU chậm 4×:** kéo vật (NUMBER_LINE, PREPOSITION_SCENE) vẫn giữ khoảng 120 fps, khung dài nhất 17 đến 21ms; chạm nút liên tục (SYLLABLE_BUILDER) giảm còn 56 đến 77 fps, khung dài nhất 27 đến 33ms, vẫn không khung nào vượt 33,4ms. Đây là hai thao tác khác nhau (kéo so với chạm, mỗi lần chạm gồm cả vòng gửi sự kiện và dựng lại React) nên **không so thẳng giữa các loại game**, và chưa có profile để nói nguyên nhân sụt fps ở SYLLABLE_BUILDER (có thể do dựng lại cả cảnh mỗi lần chạm, mới là giả thuyết). Ngưỡng «khung rớt» (>33,4ms) tính theo 60 Hz.
5. **Nền họa tiết của theme:** từ lúc bấm đổi theme đến khi `Rect` có `fillPatternImage` xuất hiện: 26,9 đến 34,7ms ở cả 18 ca Vũ trụ/Đại dương (ảnh SVG nhúng dạng data URI, không có mạng); «Trung tính» không có nền họa tiết. Số rất nhỏ nên **chưa thấy lý do thêm bước tải trước** trong điều kiện này; điều kiện có mạng/ảnh thật chưa đo (T8). Ghi chú: lần đo trước trong ngày dùng cách đếm node `Image` sai (nền không phải node `Image`) và đã bị thay.
6. **Trợ năng (axe):** chỉ còn hai luật mức vừa là của **chính trang thử nghiệm** (`region`, `landmark-one-main`: trang chưa có landmark `<main>`), không phải của game; vùng ẩn cho bàn phím/trình đọc màn hình (thanh trượt, hộp chọn, nút nhích, `role=status`) không bị báo lỗi nào. Canvas Konva không có cây DOM nên axe không nhìn thấy bên trong canvas (giới hạn của công cụ).
7. **Bundle (gzip, JS + CSS):** build thường của nhánh này 228,3 KB so với `main` 227,6 KB (+0,7 KB; thô 751,6 so với 749,6 KB, +2,0 KB): hạ tầng theme mà `games/` nhập vào gần như không tốn ở sản phẩm. Bản bật `VITE_EXPERIMENTS=1` 261,6 KB (+33,3 KB; trang thử nghiệm tách chunk riêng nạp lười 26,8 KB). Số của `main` được đo **tay** (build trong worktree tạm, dùng chung `node_modules`), không phải bằng script.

## Giới hạn, chưa kiểm chứng

- Chrome headless tự động trên một máy Windows; không phải máy/điện thoại của trẻ. FPS chỉ có nghĩa so sánh tương đối; CPU «chậm 4×» là giả lập, không thay được thử máy thật.
- Số bundle đo trên cây làm việc hiện tại (`node_modules` cài khi ở nhánh khác), chưa lặp lại sau `npm ci` sạch. Phép so thường–thử nghiệm dùng `envDir: false` nên không bị `.env` của máy làm lệch.
- QUIZ và MATCHING sản phẩm chỉ được đo qua ThemeLab (một trạng thái mặc định), không phải từng màn.
- Vùng chạm đọc từ node Konva đang hiện, có trình xử lý nhấp/chạm/nhấn xuống hoặc kéo được, kích thước không gồm nét viền (vùng bắt chạm thật của Konva lớn hơn nửa nét viền mỗi cạnh). Nhãn trong bảng là chữ đầu tiên trong node, nên điểm kéo của NUMBER_LINE hiện là «Circle».
- Cảm ứng thật, trình đọc màn hình thật, âm thanh thật: chưa kiểm.
- Ảnh sân chụp từ canvas Konva (`.konvajs-content`), không gồm phần DOM quanh nó.
- Thời hạn mỗi test được nâng lên 15 giây ở `vite.config.ts` (`test.testTimeout`): test đầu tiên của vài file dựng nhiều thành phần (các Lab, ThemeLab) có lúc vượt 5 giây mặc định khi cả bộ chạy song song (gặp 5 lần trong ngày, qua khi chạy riêng). Đây là cách giảm triệu chứng, chưa tìm ra nguyên nhân gốc của sự chậm lúc nạp đầu.
