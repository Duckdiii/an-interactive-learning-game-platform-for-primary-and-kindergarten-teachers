# T5.2: số đo tự động khu thử nghiệm (2026-10-19)

Chạy bằng `node scripts/experiments/measure.mjs`: Chrome 155.0.8059.80 (headless, playwright-core), Node v20.19.6, Windows, cửa sổ 1440×1000; "khung" là chiều rộng khung của trang thử nghiệm (390/768/1280px), nơi `ResponsiveStage` co theo. Số đo trên trình duyệt tự động ≠ máy trẻ em; không thay được thử trên điện thoại thật.

## 2. Từng ca (khung × loại game × theme)

| Ca | Tràn ngang (khung / trang) | Console | Tỉ lệ sân | Vùng chạm nhỏ nhất (px) | Trượt 64 / 56 / 48 | Nền họa tiết theme xuất hiện sau khi bấm | axe (luật:node) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 390-number-line-neutral | không / không | 0 | 0.445 | 64.1 | 0 / 0 / 0 | không có nền họa tiết | region:10, landmark-one-main:1 |
| 390-number-line-space | không / không | 0 | 0.445 | 64.1 | 0 / 0 / 0 | 48.1 ms | region:10, landmark-one-main:1 |
| 390-number-line-ocean | không / không | 0 | 0.445 | 64.1 | 0 / 0 / 0 | 38.5 ms | region:10, landmark-one-main:1 |
| 390-syllable-builder-neutral | không / không | 0 | 0.445 | 64.1 | 0 / 0 / 0 | không có nền họa tiết | region:13, landmark-one-main:1 |
| 390-syllable-builder-space | không / không | 0 | 0.445 | 64.1 | 0 / 0 / 0 | 36.3 ms | region:13, landmark-one-main:1 |
| 390-syllable-builder-ocean | không / không | 0 | 0.445 | 64.1 | 0 / 0 / 0 | 36.1 ms | region:13, landmark-one-main:1 |
| 390-preposition-scene-neutral | không / không | 0 | 0.445 | 64.1 | 0 / 0 / 0 | không có nền họa tiết | region:10, landmark-one-main:1 |
| 390-preposition-scene-space | không / không | 0 | 0.445 | 64.1 | 0 / 0 / 0 | 37.2 ms | region:10, landmark-one-main:1 |
| 390-preposition-scene-ocean | không / không | 0 | 0.445 | 64.1 | 0 / 0 / 0 | 39.6 ms | region:10, landmark-one-main:1 |
| 390-theme-lab | không / không | 0 | 0.445 | 42.7 | 7 / 7 / 1 | — | region:8, landmark-one-main:1 |
| 768-number-line-neutral | không / không | 0 | 0.918 | 132.1 | 0 / 0 / 0 | không có nền họa tiết | region:10, landmark-one-main:1 |
| 768-number-line-space | không / không | 0 | 0.918 | 132.1 | 0 / 0 / 0 | 43.3 ms | region:10, landmark-one-main:1 |
| 768-number-line-ocean | không / không | 0 | 0.918 | 132.1 | 0 / 0 / 0 | 42.2 ms | region:10, landmark-one-main:1 |
| 768-syllable-builder-neutral | không / không | 0 | 0.918 | 132.1 | 0 / 0 / 0 | không có nền họa tiết | region:13, landmark-one-main:1 |
| 768-syllable-builder-space | không / không | 0 | 0.918 | 132.1 | 0 / 0 / 0 | 27.6 ms | region:13, landmark-one-main:1 |
| 768-syllable-builder-ocean | không / không | 0 | 0.918 | 132.1 | 0 / 0 / 0 | 40 ms | region:13, landmark-one-main:1 |
| 768-preposition-scene-neutral | không / không | 0 | 0.918 | 132.1 | 0 / 0 / 0 | không có nền họa tiết | region:10, landmark-one-main:1 |
| 768-preposition-scene-space | không / không | 0 | 0.918 | 132.1 | 0 / 0 / 0 | 35.1 ms | region:10, landmark-one-main:1 |
| 768-preposition-scene-ocean | không / không | 0 | 0.918 | 132.1 | 0 / 0 / 0 | 36.1 ms | region:10, landmark-one-main:1 |
| 768-theme-lab | không / không | 0 | 0.918 | 88.1 | 0 / 0 / 0 | — | region:8, landmark-one-main:1 |
| 1280-number-line-neutral | không / không | 0 | 1 | 144 | 0 / 0 / 0 | không có nền họa tiết | region:10, landmark-one-main:1 |
| 1280-number-line-space | không / không | 0 | 1 | 144 | 0 / 0 / 0 | 31 ms | region:10, landmark-one-main:1 |
| 1280-number-line-ocean | không / không | 0 | 1 | 144 | 0 / 0 / 0 | 38.2 ms | region:10, landmark-one-main:1 |
| 1280-syllable-builder-neutral | không / không | 0 | 1 | 144 | 0 / 0 / 0 | không có nền họa tiết | region:13, landmark-one-main:1 |
| 1280-syllable-builder-space | không / không | 0 | 1 | 144 | 0 / 0 / 0 | 38.6 ms | region:13, landmark-one-main:1 |
| 1280-syllable-builder-ocean | không / không | 0 | 1 | 144 | 0 / 0 / 0 | 38.4 ms | region:13, landmark-one-main:1 |
| 1280-preposition-scene-neutral | không / không | 0 | 1 | 144 | 0 / 0 / 0 | không có nền họa tiết | region:10, landmark-one-main:1 |
| 1280-preposition-scene-space | không / không | 0 | 1 | 144 | 0 / 0 / 0 | 29.9 ms | region:10, landmark-one-main:1 |
| 1280-preposition-scene-ocean | không / không | 0 | 1 | 144 | 0 / 0 / 0 | 24.6 ms | region:10, landmark-one-main:1 |
| 1280-theme-lab | không / không | 0 | 1 | 96 | 0 / 0 / 0 | — | region:8, landmark-one-main:1 |

## 3. Vùng chạm trượt ngưỡng (đo thật, khung 390)

- **390-theme-lab** — mầm non (64): 🔊 Nghe lại 42.7px; apple 49px; dog 49px; cat 49px; mèo 49px; táo 49px; chó 49px; lớp 1–2 (56): 🔊 Nghe lại 42.7px; apple 49px; dog 49px; cat 49px; mèo 49px; táo 49px; chó 49px; lớp 3–5 (48): 🔊 Nghe lại 42.7px

## 4. FPS khi kéo/chạm liên tục (theme Vũ trụ)

Không chạy (`--no-fps`).

## 5. Trợ năng (axe) gộp theo luật

| Luật | Mức | Số ca | Số node | Mô tả |
| --- | --- | --- | --- | --- |
| region | moderate | 30 | 321 | All page content should be contained by landmarks |
| landmark-one-main | moderate | 30 | 30 | Document should have one main landmark |

Giới hạn của công cụ: canvas Konva không có cây DOM nên axe chỉ kiểm phần DOM quanh canvas (nút, nhãn, tương phản chữ DOM, vùng ẩn cho bàn phím). Phần vẽ trong canvas do kiểm tra bố cục và vùng chạm ở trên đánh giá.

## 6. Tóm tắt

- 30 ca, 0 ca lỗi khi chạy, 0 ca tràn ngang, 0 ca có error/warning ở console.
