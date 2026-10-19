# T5.4: vùng chạm của renderer sản phẩm (QUIZ, MATCHING, nút «Nghe lại») ở khung 390px (2026-10-19)

Số liệu thô: [`measurements.md`](measurements.md), [`results.json`](results.json), ảnh sân ở `shots/`. Là lần đo lại phần vùng chạm sau khi sửa bố cục sản phẩm, bổ sung cho [`t5-3-touch-targets`](../t5-3-touch-targets/README.md) (ba game thử nghiệm); chạy bằng `node scripts/experiments/measure.mjs --skip-bundle --no-fps --out=t5-4-product-touch-targets`. Số T5.2 và T5.3 giữ nguyên để so sánh.

## Thay đổi (MÃ SẢN PHẨM trên nhánh thử nghiệm, KHÔNG merge vào `main`)

| Hằng số | Tệp | Trước | Sau |
| --- | --- | --- | --- |
| `AUDIO_BUTTON_HEIGHT` (nút «Nghe lại», dùng chung QUIZ, MATCHING và ba game thử nghiệm) | `frontend/src/games/common/mediaLayout.ts` | 96 | 144 |
| `CARD_MIN_HEIGHT` (thẻ MATCHING) | `frontend/src/games/matching/matchingLayout.ts` | 110 | 144 |
| `CONFIRM_BUTTON_HEIGHT` (nút «Xong rồi!» MATCHING) | `frontend/src/games/matching/matchingLayout.ts` | 96 | 144 |

QUIZ: các ô đáp án vốn cao 200 nên không đổi; chỉ nút nghe lại đổi (qua hằng chung). Chỉ đổi chiều cao hằng số bố cục, không đổi logic, không đổi chữ/màu.

## Kết quả

Ở khung 390 (sân co ×0,445) vùng chạm nhỏ nhất của mọi ca (ba game thử nghiệm × ba theme và ThemeLab) là **64,1px, 0/0/0 trượt 64/56/48px** (trước: ThemeLab 42,7px, 7/7/1 trượt). Ở 768 nhỏ nhất 132,1px, ở 1280 là 144px. Không tràn ngang, không lỗi console. Ảnh `shots/390-theme-lab.jpg` cho thấy bố cục MATCHING sau khi sửa: thẻ và nút to hơn, không đè nhau.

## Kiểm tra

- `vitest run` toàn bộ: 1750 test qua. Chỉ MỘT test gốc của `main` phải đổi: `matchingLayout.test.ts` «6 cặp thẻ thấp nhất vẫn có canvas hữu hạn hợp lý» (cận `stageHeight` từ 1500 lên 1650 vì thẻ và nút cao hơn). Các test bố cục (không đè nhau) của QUIZ/MATCHING vẫn qua nguyên.
- Test ma trận độ tuổi của hai renderer sản phẩm đổi từ «trượt ở 390» thành «đạt», cộng thêm test khẳng định ba hằng số trên ≥ 144 (ma trận lạc quan 0,4875 không thấy biên 64,08px).

## Giới hạn, chưa kiểm chứng

- **Đây là sửa mã renderer sản phẩm.** Trên nhánh khác (đặc biệt `everyone/UI`, đã sửa nhiều chỗ ở `games/`) các hằng số này có thể đã khác hoặc conflict. Đã làm theo yêu cầu «không merge `main`, tiếp tục trên nhánh thử nghiệm»; không có gì được đưa vào `main`.
- Chiều cao canvas MATCHING tăng (6 cặp, có ảnh và nút nghe lại: 1600 đơn vị thay vì 1300): trang cuộn dọc nhiều hơn trên điện thoại; chưa thử với trẻ, chưa xem trên thiết bị thật; chưa đánh giá thẩm mỹ bố cục mới (thẻ to, chữ giữ nguyên cỡ).
- Biên đạt 64px chỉ 0,08px (144 × 0,445); chỉ đúng khi sân rộng ≥ 356px.
- QUIZ chỉ được đo qua ThemeLab (một trạng thái mặc định), không phải từng màn; chưa đo MATCHING với chữ dài/ảnh trong thẻ (thẻ cao hơn mức tối thiểu thì vốn đã ≥ 144).
- Hai thay đổi trên không áp lên bản Pixi của NUMBER_LINE (T7.1, đề xuất bỏ).
