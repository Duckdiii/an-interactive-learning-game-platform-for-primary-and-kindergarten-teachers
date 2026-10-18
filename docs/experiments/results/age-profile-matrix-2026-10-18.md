# Kiểm hồ sơ độ tuổi lên renderer hiện có (T5.1), 2026-10-18

Kết quả của `validateAgainstProfile` (`frontend/src/experiments/age/`) áp lên màn QUIZ và MATCHING **mẫu** (fixture của renderer), tính vùng chạm bằng **px màn hình sau khi sân co giãn**. Xem được trực tiếp ở `/dev/experiments`, mục "Hồ sơ độ tuổi (T5.1)".

## Ngưỡng dùng

| Nhóm | Vùng chạm tối thiểu | Đồng hồ | Xếp hạng sống | Chữ/thẻ | Chữ/câu | Lựa chọn |
|---|---|---|---|---|---|---|
| Mầm non | **64px** | không | không | 12 | 60 | 3 |
| Lớp 1 đến 2 | **56px** | được | được | 20 | 100 | 4 |
| Lớp 3 đến 5 | **48px** | được | được | 30 | 200 | 4 |

64 / 56 / 48px do người dùng chốt. **Các số còn lại là đề xuất của thử nghiệm, chưa được chuyên gia sư phạm xác nhận.**

## Cách đo (và giới hạn)

- Kích thước vùng chạm lấy từ **hằng số bố cục thật** của renderer (`optionGrid`, `mediaLayout`, `matchingLayout`), không gõ lại số. Hệ số co = `min(1, rộng khung / 800)`, giống `ResponsiveStage`.
- Giả định **lạc quan**: sân chiếm trọn chiều rộng khung (bỏ qua lề trang, thực tế còn hẹp hơn: khung 390 trong trang xem thử cho sân rộng 356 px). Ô nào trượt ở đây thì chắc chắn trượt ngoài thực tế.
- Thẻ MATCHING lấy chiều cao **tối thiểu** (110); thẻ có nhiều chữ hoặc có ảnh cao hơn nên kết quả là cận dưới đúng cho các thẻ trượt.
- **Đối chiếu với trình duyệt thật** (trang xem thử, khung 390, hệ số co đọc từ Konva là 0,445): thẻ MATCHING cao 49,0px và hai nút cao 42,7px, đúng bằng `cạnh ngắn × 0,445` (110 × 0,445 và 96 × 0,445); với hệ số lạc quan 0,4875 của bảng dưới ra 53,6 và 46,8. Công thức khớp thực tế; chỉ có lề trang làm số thật thấp hơn một chút.
- Chỉ đo kích thước, không đo khoảng cách giữa các vùng chạm, không thử trên cảm ứng thật.
- Đồng hồ và bảng xếp hạng: hai renderer này hiện **không có** nên đạt; mục này chỉ có nghĩa khi có renderer có đồng hồ/xếp hạng.

## Kết quả

| Cơ chế | Khung | Mầm non | Lớp 1 đến 2 | Lớp 3 đến 5 |
|---|---|---|---|---|
| QUIZ | 390 | trượt: nút Nghe lại | trượt: nút Nghe lại | trượt: nút Nghe lại |
| QUIZ | 768 | đạt | đạt | đạt |
| QUIZ | 1280 | đạt | đạt | đạt |
| MATCHING | 390 | trượt: 6 thẻ, Nghe lại, Xong rồi! | trượt: 6 thẻ, Nghe lại, Xong rồi! | trượt: Nghe lại, Xong rồi! |
| MATCHING | 768 | đạt | đạt | đạt |
| MATCHING | 1280 | đạt | đạt | đạt |

Theme: cả ba theme (neutral, Vũ trụ, Đại dương) đạt mọi nhóm tuổi và cả hai cơ chế (đều khai báo đủ nhóm tuổi và QUIZ/MATCHING). Đây chỉ là kiểm khai báo, không kiểm nội dung.

## Phát hiện đáng chú ý

1. **Ở khung 390px (điện thoại dọc), hai nút 96 đơn vị («Nghe lại» và «Xong rồi!») chỉ còn 46,8px** nên trượt cả nhóm dễ nhất (48px). Chú thích trong mã nói nút "cao 96 (≥ 64px quy ước)" chỉ đúng khi chưa co; sau khi co nó không còn đúng.
2. **Thẻ MATCHING ở 390px còn 53,6px** (cao tối thiểu 110): đạt lớp 3 đến 5 nhưng trượt mầm non và lớp 1 đến 2.
3. Các ô đáp án QUIZ (cao 200) đạt ở mọi khung.
4. Sân MATCHING cần rộng ít nhất **466px** để thẻ đạt 64px; nút cao 96 cần **534px** để đạt 64px, **400px** để đạt 48px (`minContainerWidthFor`).
5. Bảng chỉ xét chế độ chơi/xem trước (có nút «Xong rồi!»); ở chế độ xem lại renderer ẩn nút đó. Chú thích trong `games/common/mediaLayout.ts` coi 96 đơn vị là đủ 64px (đúng khi chưa co); bây giờ có phép đo tự động để theo dõi. Chưa sửa renderer (ngoài phạm vi T5.1); hướng sửa gợi ý: bố cục dọc cho khung hẹp hoặc hệ số co tối thiểu.

## Chưa làm

- Áp hồ sơ lên ba loại game mới: chưa có (T4); khi có, mỗi renderer cung cấp một hàm `…Facts` tương tự `quizFacts`/`matchingFacts`.
- Kiểm độ tương phản theo nhóm tuổi (ví dụ chặt hơn cho mầm non): chưa có cơ sở để đặt ngưỡng, nên chưa làm.
