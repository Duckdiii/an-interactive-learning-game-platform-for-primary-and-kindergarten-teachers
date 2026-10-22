# Tài nguyên (asset) của frontend

Sổ kiểm kê mọi tệp hình, âm thanh, font và hiệu ứng **không do nhóm tự viết**. Mỗi nguồn phải có dòng ở đây **trước** khi tệp vào repo. Phần ghi nguồn cho người dùng cuối nằm ở [`../../CREDITS.md`](../../CREDITS.md).

Phạm vi: nhánh thử nghiệm `experiment/themes-and-new-games` (không merge vào `main`).

## Cấu trúc thư mục

| Thư mục | Nội dung | Trạng thái |
|---|---|---|
| `ui/` | Sprite/khung nút (nếu sau này dùng tệp thật) | Trống. Hiện nút là vector tự vẽ theo phong cách Kenney (xem dưới) |
| `emoji/` | `keywords.json`: 299 từ khóa (slug, tên Việt, bí danh): 296 duyệt ngày 2026-10-20 + 3 (loa, khúc gỗ, bóng thoại) duyệt ở đợt cải tiến cảnh | Có |
| `emoji/fluent/` | 299 tệp SVG (`<slug>.svg`, 383 KB) kèm `LICENSE` gốc | Có. Sinh bằng `node scripts/assets/extract-fluent-emoji.mjs` (chạy lại được, không gọi mạng); không sửa tay |
| `sfx/` | Âm thanh/nhạc nền từ nguồn CC0 | Trống: chưa tải tệp nào. Tiếng đúng/sai/hoàn thành và nốt đếm 0–10 là âm tổng hợp bằng Web Audio (`AudioService`), không cần tệp. Nhạc nền là hook im lặng cho tới khi có tệp `public/experiments-demo-audio/bee-garden-music.mp3` (gitignore) |
| `fonts/nunito/` | 4 tệp woff2 (latin + vietnamese, đậm 700 và 800; 45 KB), `nunito.css` (@font-face), `OFL.txt` | Có (Bước 3); chỉ nạp ở trò Vườn hoa |
| `effects/` | Dữ liệu hiệu ứng khác nếu cần | Trống |

Ngoài ra thư mục này còn 3 tệp mẫu của Vite (`hero.png`, `react.svg`, `vite.svg`), không thuộc kế hoạch asset.

## Sổ nguồn

| Nguồn | Dùng cho | Giấy phép | Cần ghi nguồn? | Phiên bản / ngày lấy | Cách lấy | Người chịu trách nhiệm |
|---|---|---|---|---|---|---|
| **Fluent Emoji Flat** (Microsoft) https://github.com/microsoft/fluentui-emoji | Hình nội dung (con vật, trái cây, đồ vật...) | MIT, `Copyright (c) Microsoft Corporation.` | **Có**: kèm thông báo bản quyền và nội dung giấy phép MIT (đã có ở `emoji/fluent/LICENSE`, ghi công ở `CREDITS.md`) | Gói `@iconify-json/fluent-emoji-flat` 1.2.6 (devDependency, chỉ dùng để trích tệp; 3.145 hình); LICENSE gốc đọc ngày 2026-10-20 | Trích SVG cần dùng từ gói bằng script, lưu bản sao trong dự án; **không** hotlink, **không** gọi Iconify API lúc chạy | Nguyễn Đức Duy |
| **Nunito** (The Nunito Project Authors) https://github.com/googlefonts/nunito | Font bo tròn, hỗ trợ tiếng Việt | SIL Open Font License 1.1 | **Có**: kèm thông báo bản quyền và OFL; không bán font riêng lẻ; không dùng tên «Nunito» cho bản đã sửa | woff2 của `@fontsource/nunito` 5.3.0 (chỉ lấy tệp, không thêm gói); LICENSE đọc ngày 2026-10-20; tệp dùng: latin + vietnamese, đậm 700 và 800 (~45 KB) | Đã copy 4 tệp woff2 vào `fonts/nunito/` (kèm `OFL.txt` gốc) | Nguyễn Đức Duy |
| **Kenney UI Pack** https://kenney.nl/assets/ui-pack | **Chỉ tham chiếu phong cách** cho nút/khung vector tự vẽ | CC0 1.0 (theo trang Kenney, đọc 2026-10-20) | Không bắt buộc (nhưng nên cảm ơn) | **Không tải, không sao chép tệp nào** | — | Nguyễn Đức Duy |
| **Kenney Music Jingles / Interface Sounds** (ĐỀ XUẤT, chưa tải) https://kenney.nl/assets/music-jingles , https://kenney.nl/assets/interface-sounds | Nhạc nền / tiếng giao diện | CC0 (theo trang Kenney, đọc 2026-10-20) | Không bắt buộc | **Chưa tải: chờ bạn duyệt.** Music Jingles ghi 85 tệp (là đoạn nhạc ngắn, không phải bản lặp dài); Interface Sounds ghi 100 tệp; trang không nói định dạng hay dung lượng. Trang `music-loops` trả 404 | — | — |
| **Twemoji** (dự phòng) | — | CC-BY-4.0 (bắt buộc ghi nguồn) | Có | **Chưa dùng, chưa tải** (bạn quyết định chưa thêm) | — | — |

## Quy tắc

1. **Không trộn hai bộ emoji trong cùng một màn hình.** Hiện chỉ có một bộ (Fluent Emoji Flat).
2. **Không dùng OpenMoji** (CC-BY-SA, share-alike).
3. **Không hotlink:** mọi tệp phải là bản sao trong dự án.
4. Thêm nguồn mới: thêm dòng vào bảng trên và vào `CREDITS.md` **trước** khi đưa tệp vào repo; đọc LICENSE gốc (không tin trang tổng hợp).
5. Ảnh từ Pexels/Pixabay không nằm ở đây: chúng có quy trình riêng (duyệt tay từng ảnh, xem `docs/experiments/results/t8-2-pixabay/`).
