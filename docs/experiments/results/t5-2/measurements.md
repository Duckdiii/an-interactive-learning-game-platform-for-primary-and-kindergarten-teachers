# T5.2: số đo tự động khu thử nghiệm (2026-10-18)

Chạy bằng `node scripts/experiments/measure.mjs`: Chrome 155.0.8059.80 (headless, playwright-core), Node v20.19.6, Windows, cửa sổ 1440×1000; "khung" là chiều rộng khung của trang thử nghiệm (390/768/1280px), nơi `ResponsiveStage` co theo. Số đo trên trình duyệt tự động ≠ máy trẻ em; không thay được thử trên điện thoại thật.

## 1. Dung lượng bundle (build thường so với `VITE_EXPERIMENTS=1`)

|  | Thường | Thử nghiệm | Chênh |
| --- | --- | --- | --- |
| JS+CSS thô | 751.6 KB | 854.0 KB | 102.4 KB |
| JS+CSS gzip | 228.3 KB | 261.6 KB | 33.3 KB |

| Tệp (bỏ băm) | Thường (gzip) | Thử nghiệm (gzip) | Chênh |
| --- | --- | --- | --- |
| ExperimentsPage.js | — | 26.8 KB | 26.8 KB |
| index.css | 5.4 KB | 5.4 KB | 0 B |
| index.js | 222.9 KB | 229.0 KB | 6.1 KB |
| rolldown-runtime.js | — | 428 B | 428 B |

Lưu ý: số đo trên cây làm việc hiện tại (node_modules cài khi ở nhánh khác), chưa lặp lại sau `npm ci` sạch; chênh lệch thường–thử nghiệm vẫn có nghĩa vì cùng điều kiện.

## 2. Từng ca (khung × loại game × theme)

| Ca | Tràn ngang (khung / trang) | Console | Tỉ lệ sân | Vùng chạm nhỏ nhất (px) | Trượt 64 / 56 / 48 | Nền họa tiết theme xuất hiện sau khi bấm | axe (luật:node) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 390-number-line-neutral | không / không | 0 | 0.445 | 32 | 3 / 3 / 1 | không có nền họa tiết | region:10, landmark-one-main:1 |
| 390-number-line-space | không / không | 0 | 0.445 | 32 | 3 / 3 / 1 | 29.5 ms | region:10, landmark-one-main:1 |
| 390-number-line-ocean | không / không | 0 | 0.445 | 32 | 3 / 3 / 1 | 30.2 ms | region:10, landmark-one-main:1 |
| 390-syllable-builder-neutral | không / không | 0 | 0.445 | 58.7 | 7 / 0 / 0 | không có nền họa tiết | region:13, landmark-one-main:1 |
| 390-syllable-builder-space | không / không | 0 | 0.445 | 58.7 | 7 / 0 / 0 | 30.3 ms | region:13, landmark-one-main:1 |
| 390-syllable-builder-ocean | không / không | 0 | 0.445 | 58.7 | 7 / 0 / 0 | 30.9 ms | region:13, landmark-one-main:1 |
| 390-preposition-scene-neutral | không / không | 0 | 0.445 | 44.5 | 2 / 1 / 1 | không có nền họa tiết | region:9, landmark-one-main:1 |
| 390-preposition-scene-space | không / không | 0 | 0.445 | 44.5 | 2 / 1 / 1 | 26.9 ms | region:9, landmark-one-main:1 |
| 390-preposition-scene-ocean | không / không | 0 | 0.445 | 44.5 | 2 / 1 / 1 | 34.7 ms | region:9, landmark-one-main:1 |
| 390-theme-lab | không / không | 0 | 0.445 | 42.7 | 7 / 7 / 1 | — | region:8, landmark-one-main:1 |
| 768-number-line-neutral | không / không | 0 | 0.918 | 66.1 | 0 / 0 / 0 | không có nền họa tiết | region:10, landmark-one-main:1 |
| 768-number-line-space | không / không | 0 | 0.918 | 66.1 | 0 / 0 / 0 | 28.5 ms | region:10, landmark-one-main:1 |
| 768-number-line-ocean | không / không | 0 | 0.918 | 66.1 | 0 / 0 / 0 | 30.6 ms | region:10, landmark-one-main:1 |
| 768-syllable-builder-neutral | không / không | 0 | 0.918 | 121.1 | 0 / 0 / 0 | không có nền họa tiết | region:13, landmark-one-main:1 |
| 768-syllable-builder-space | không / không | 0 | 0.918 | 121.1 | 0 / 0 / 0 | 33 ms | region:13, landmark-one-main:1 |
| 768-syllable-builder-ocean | không / không | 0 | 0.918 | 121.1 | 0 / 0 / 0 | 30 ms | region:13, landmark-one-main:1 |
| 768-preposition-scene-neutral | không / không | 0 | 0.918 | 91.8 | 0 / 0 / 0 | không có nền họa tiết | region:9, landmark-one-main:1 |
| 768-preposition-scene-space | không / không | 0 | 0.918 | 91.8 | 0 / 0 / 0 | 34.2 ms | region:9, landmark-one-main:1 |
| 768-preposition-scene-ocean | không / không | 0 | 0.918 | 91.8 | 0 / 0 / 0 | 33.5 ms | region:9, landmark-one-main:1 |
| 768-theme-lab | không / không | 0 | 0.918 | 88.1 | 0 / 0 / 0 | — | region:8, landmark-one-main:1 |
| 1280-number-line-neutral | không / không | 0 | 1 | 72 | 0 / 0 / 0 | không có nền họa tiết | region:10, landmark-one-main:1 |
| 1280-number-line-space | không / không | 0 | 1 | 72 | 0 / 0 / 0 | 30.5 ms | region:10, landmark-one-main:1 |
| 1280-number-line-ocean | không / không | 0 | 1 | 72 | 0 / 0 / 0 | 30.4 ms | region:10, landmark-one-main:1 |
| 1280-syllable-builder-neutral | không / không | 0 | 1 | 132 | 0 / 0 / 0 | không có nền họa tiết | region:13, landmark-one-main:1 |
| 1280-syllable-builder-space | không / không | 0 | 1 | 132 | 0 / 0 / 0 | 32.7 ms | region:13, landmark-one-main:1 |
| 1280-syllable-builder-ocean | không / không | 0 | 1 | 132 | 0 / 0 / 0 | 28 ms | region:13, landmark-one-main:1 |
| 1280-preposition-scene-neutral | không / không | 0 | 1 | 100 | 0 / 0 / 0 | không có nền họa tiết | region:9, landmark-one-main:1 |
| 1280-preposition-scene-space | không / không | 0 | 1 | 100 | 0 / 0 / 0 | 27.4 ms | region:9, landmark-one-main:1 |
| 1280-preposition-scene-ocean | không / không | 0 | 1 | 100 | 0 / 0 / 0 | 33.1 ms | region:9, landmark-one-main:1 |
| 1280-theme-lab | không / không | 0 | 1 | 96 | 0 / 0 / 0 | — | region:8, landmark-one-main:1 |

## 3. Vùng chạm trượt ngưỡng (đo thật, khung 390)

- **390-number-line-neutral** — mầm non (64): Circle 32px; + 53.4px; Xong rồi! 53.4px; lớp 1–2 (56): Circle 32px; + 53.4px; Xong rồi! 53.4px; lớp 3–5 (48): Circle 32px
- **390-number-line-space** — mầm non (64): Circle 32px; + 53.4px; Xong rồi! 53.4px; lớp 1–2 (56): Circle 32px; + 53.4px; Xong rồi! 53.4px; lớp 3–5 (48): Circle 32px
- **390-number-line-ocean** — mầm non (64): Circle 32px; + 53.4px; Xong rồi! 53.4px; lớp 1–2 (56): Circle 32px; + 53.4px; Xong rồi! 53.4px; lớp 3–5 (48): Circle 32px
- **390-syllable-builder-neutral** — mầm non (64): ▲ 58.7px; ▼ 58.7px; ▲ 58.7px; ▼ 58.7px; ▲ 58.7px; ▼ 58.7px; Xong rồi! 58.7px; lớp 1–2 (56): đạt; lớp 3–5 (48): đạt
- **390-syllable-builder-space** — mầm non (64): ▲ 58.7px; ▼ 58.7px; ▲ 58.7px; ▼ 58.7px; ▲ 58.7px; ▼ 58.7px; Xong rồi! 58.7px; lớp 1–2 (56): đạt; lớp 3–5 (48): đạt
- **390-syllable-builder-ocean** — mầm non (64): ▲ 58.7px; ▼ 58.7px; ▲ 58.7px; ▼ 58.7px; ▲ 58.7px; ▼ 58.7px; Xong rồi! 58.7px; lớp 1–2 (56): đạt; lớp 3–5 (48): đạt
- **390-preposition-scene-neutral** — mầm non (64): cat 44.5px; Done! 58.7px; lớp 1–2 (56): cat 44.5px; lớp 3–5 (48): cat 44.5px
- **390-preposition-scene-space** — mầm non (64): cat 44.5px; Done! 58.7px; lớp 1–2 (56): cat 44.5px; lớp 3–5 (48): cat 44.5px
- **390-preposition-scene-ocean** — mầm non (64): cat 44.5px; Done! 58.7px; lớp 1–2 (56): cat 44.5px; lớp 3–5 (48): cat 44.5px
- **390-theme-lab** — mầm non (64): 🔊 Nghe lại 42.7px; apple 49px; dog 49px; cat 49px; mèo 49px; táo 49px; chó 49px; lớp 1–2 (56): 🔊 Nghe lại 42.7px; apple 49px; dog 49px; cat 49px; mèo 49px; táo 49px; chó 49px; lớp 3–5 (48): 🔊 Nghe lại 42.7px

## 4. FPS khi kéo/chạm liên tục (theme Vũ trụ)

| Khung | Loại game | Thao tác | CPU | FPS (rAF) | Lần vẽ Konva/giây | p95 khung (ms) | Khung dài nhất (ms) | Khung rớt (>33,4ms) | Số khung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 | number-line | drag | thường | 120.2 | 120.3 | 8.9 | 9.9 | 0 | 365 |
| 390 | number-line | drag | chậm 4× | 119.6 | 80.3 | 14.1 | 20.5 | 0 | 458 |
| 390 | syllable-builder | tap | thường | 120.2 | 120 | 9.3 | 18.2 | 0 | 361 |
| 390 | syllable-builder | tap | chậm 4× | 77.3 | 77.3 | 19.8 | 28.3 | 0 | 235 |
| 390 | preposition-scene | drag | thường | 120.2 | 120.3 | 9.1 | 10.1 | 0 | 362 |
| 390 | preposition-scene | drag | chậm 4× | 120.1 | 80.3 | 14.3 | 20.3 | 0 | 468 |
| 768 | number-line | drag | thường | 119.9 | 120.3 | 8.9 | 13.7 | 0 | 363 |
| 768 | number-line | drag | chậm 4× | 119.8 | 80.3 | 14 | 18.1 | 0 | 435 |
| 768 | syllable-builder | tap | thường | 120.3 | 120 | 9.3 | 10.7 | 0 | 361 |
| 768 | syllable-builder | tap | chậm 4× | 61.5 | 60.3 | 22.2 | 26.9 | 0 | 186 |
| 768 | preposition-scene | drag | thường | 120.2 | 120.3 | 8.9 | 9.9 | 0 | 362 |
| 768 | preposition-scene | drag | chậm 4× | 119.9 | 60.3 | 14.2 | 21.1 | 0 | 368 |
| 1280 | number-line | drag | thường | 120.1 | 120.3 | 8.8 | 9.1 | 0 | 362 |
| 1280 | number-line | drag | chậm 4× | 119.7 | 80.3 | 13.8 | 19.5 | 0 | 448 |
| 1280 | syllable-builder | tap | thường | 120.2 | 119.7 | 9.4 | 13.6 | 0 | 361 |
| 1280 | syllable-builder | tap | chậm 4× | 56 | 53 | 24.8 | 32.9 | 0 | 169 |
| 1280 | preposition-scene | drag | thường | 120.2 | 120.3 | 8.9 | 9.5 | 0 | 362 |
| 1280 | preposition-scene | drag | chậm 4× | 119.9 | 60.3 | 14 | 17.3 | 0 | 367 |

FPS ở đây là tốc độ rAF của trang TRONG lúc kéo/chạm liên tục (không gồm lúc chuẩn bị); cột «Lần vẽ Konva/giây» cho biết thao tác có làm Konva vẽ lại thật. Kéo và chạm là hai thao tác khác nhau nên không so thẳng giữa các loại game. Ngưỡng «khung rớt» tính theo 60 Hz dù trình duyệt có thể chạy rAF ở 120 Hz.

## 5. Trợ năng (axe) gộp theo luật

| Luật | Mức | Số ca | Số node | Mô tả |
| --- | --- | --- | --- | --- |
| region | moderate | 30 | 312 | All page content should be contained by landmarks |
| landmark-one-main | moderate | 30 | 30 | Document should have one main landmark |

Giới hạn của công cụ: canvas Konva không có cây DOM nên axe chỉ kiểm phần DOM quanh canvas (nút, nhãn, tương phản chữ DOM, vùng ẩn cho bàn phím). Phần vẽ trong canvas do kiểm tra bố cục và vùng chạm ở trên đánh giá.

## 6. Tóm tắt

- 30 ca, 0 ca lỗi khi chạy, 0 ca tràn ngang, 0 ca có error/warning ở console.
