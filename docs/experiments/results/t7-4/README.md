# T7.4: Howler và Web Audio (số đo ghi theo giờ UTC 2026-10-18/19)

Số liệu thô: [`measurements.md`](measurements.md), [`results.json`](results.json). Phòng thử: `/dev/experiments` → «Howler và Web Audio (T7.4)». Tệp này là phần diễn giải, đề xuất cho T2.1 và các giới hạn.

## So cái gì với cái gì

- **Howler 2.2.4** (đã cài từ trước, `games/common/sound.ts` và `useQuestionAudio.ts` đang dùng): phát **từ tệp**; ở đây là một tệp WAV 0,4 giây (≈ 17 KB) tự sinh trong trang bằng `wavTone.ts`, không tải tài nguyên ngoài.
- **Web Audio tổng hợp** (`AudioService` của T2.1): không có tệp, dựng âm «Đúng» (3 nốt) bằng bộ dao động; có tắt tiếng, âm lượng, giới hạn 8 nốt đồng thời, khoảng cách tối thiểu 60ms giữa hai lần cùng âm.
- Hai bên phát **hai âm khác nhau** (một nốt 660 Hz với ba nốt), nên chỉ so **cách phát**, không so tiếng; nghe thử bằng loa thật là việc của người dùng.

Chạy lại: `node scripts/experiments/compare-audio.mjs` (khoảng 5 phút, Chrome cài sẵn).

## Kết quả (Chrome headless, Windows, một lượt đo mỗi ca)

1. **Dung lượng (minify + gzip, mỗi bên tree-shake riêng):** Howler ≈ **10,4 KB** (thô 44,5 KB); `AudioService` + `tones` ≈ **1,9 KB** (thô 5,1 KB).
2. **Độ trễ từ lúc gọi phát đến mẫu âm đầu tiên ở đầu ra của đồ thị âm** (80 lần, 0 lần im lặng): Howler đã nạp p50 **5,8ms** (p95 10,1); Howler tạo mới mỗi lần (gồm tải blob + giải mã) p50 13,5ms (p95 21); Web Audio p50 **21,2ms** (p95 27,2). Web Audio chậm hơn Howler đã nạp khoảng 15ms ở p50; `AudioService` cố ý hẹn nốt đầu sau 20ms (`START_LEAD_SECONDS`, tính theo đồng hồ âm thanh), nhưng độ trễ này **không cộng thẳng** vào thời gian thực nên tôi không phân rã phần chênh. Với p95 của 20 đến 30 mẫu thì p95 gần bằng giá trị lớn nhất, ít ý nghĩa thống kê. **Chưa gồm độ trễ đầu ra phần cứng:** API báo `outputLatency` ≈ 40ms và `baseLatency` ≈ 10ms ở cả hai context, lớn hơn mọi chênh lệch giữa hai bên.
3. **Mở khóa (chính sách autoplay đặt bằng cờ Chrome; phát bằng CDP không cử chỉ):**
   - Cả hai **im lặng** khi chưa có cử chỉ (gần như hiển nhiên: context đang `suspended`).
   - **Howler** vẫn dựng `AudioContext` (trạng thái `suspended`) và Chrome in cảnh báo console; **âm đang chờ tự phát ở cử chỉ kế tiếp**, quan sát được ở 4/4 ca (chuột và giả lập cảm ứng, chờ 1,5 giây và 4 giây trước cử chỉ), nên một âm bị lỡ có thể bật lên muộn sau một lần chạm khác. Chưa thử chờ lâu hơn 4 giây hay cử chỉ ở chỗ khác ngoài điểm (5, 5).
   - **`AudioService`** không dựng context trước cử chỉ (0 context), nhưng **cũng xếp hàng**: lệnh phát chưa mở khóa được giữ tối đa 3 lệnh gần nhất trong 2 giây rồi xả khi mở khóa (thiết kế ở T2.1). Số đo cho thấy lần bấm tạo 3 dao động ở cả ba ca (chờ 1,5 giây, chờ 2,6 giây, không phát trước) nên **không phân biệt được** âm nghe thấy là của lần bấm hay âm xếp hàng cũ; chỉ chắc rằng không có hai âm cùng lúc. Vì vậy chưa thể nói `AudioService` «không để âm bật muộn»: nó có thể bật muộn tới 2 giây, Howler thì không có hạn (đã thử 4 giây).
   - **Từ một lần chạm vào nút đến có tiếng** (mốc `pointerdown` đo trong trang, 5 lần mỗi ca): chuột: Howler 79 đến 120ms, Web Audio 57 đến 92ms; giả lập cảm ứng: Howler 72 đến 142ms, Web Audio 40 đến 95ms. Khoảng giao nhau và lượt đo trước (đo bằng mốc khác) cho thứ tự ngược, nên **không có kết luận ai nhanh hơn**; cả hai gồm dựng context lần đầu, Howler gồm tải và giải mã.
4. **Phát chồng (20 lần gọi trong 1 giây):** Howler phát cả **20** lần (20 nguồn đệm, không giới hạn giọng đồng thời), đỉnh biên độ đo được **1,06** ở lượt này (0,93 ở lượt trước), tức có thể cắt đỉnh (méo) khi bấm dồn; `AudioService` chỉ phát **5** trong 20 lệnh (bỏ lệnh trong 60ms và lệnh khi đủ 8 nốt), đỉnh **0,23**. Đỉnh thấp của Web Audio một phần do **bỏ lệnh**, không chỉ do chừa khoảng trống ở master; hai bên dùng biên độ do tác giả chọn nên không so trực tiếp độ to.
5. **Tệp không tồn tại (Howler):** không ném lỗi, `play()` vẫn trả một mã giọng, chỉ có sự kiện `loaderror` và im lặng, không thông báo console. Ở lần đo máy chủ `vite preview` trả `200 text/html` (SPA) cho đường dẫn không có tệp nên lỗi là «Decoding audio data failed», không phải 404; máy chủ thật có thể cho lỗi khác. **Code hiện tại không có phương án dự phòng**: trẻ nhấn «nghe lại» sẽ không nghe gì và không thấy gì.
6. **Console và mạng:** không có yêu cầu mạng ra ngoài máy ở mọi ca (kể cả mở khóa và chồng âm). Không có lỗi console ngoài cảnh báo autoplay của Chrome ở các ca «không cử chỉ» (đúng kỳ vọng) và ca tệp thiếu.

## Đề xuất cho T2.1 (chỉ là đề xuất, chưa quyết)

- **Phản hồi ngắn (đúng, thử lại, hoàn thành): nghiêng về Web Audio tổng hợp.** Lý do mạnh nhất là **không cần tệp âm thanh**, nhẹ hơn (1,9 so với 10,4 KB, nếu Howler không còn dùng cho việc khác), và chặn được tràng âm khi bấm dồn (Howler có thể méo, mục 4). Điểm trừ: độ trễ p50 cao hơn Howler khoảng 15ms (khó nhận ra nhưng có), chỉ là âm tổng hợp (không có âm thu sẵn do nhà thiết kế làm), và hàng đợi có thể làm âm bật muộn tới 2 giây.
- **Lời đọc câu hỏi (tệp mp3/ogg từ TTS ở T8): vẫn cần Howler** (hoặc tự viết tải/giải mã/định dạng, chưa đáng): âm tổng hợp không đọc được lời. Cần thêm xử lý khi tệp thiếu hay lỗi (báo cho trẻ bằng chữ, hoặc dùng giọng đọc của trình duyệt ở T2.3) vì hiện không có gì.
- Hai thư viện thì có hai `AudioContext` riêng: cần một công tắc tắt tiếng/âm lượng chung gọi cả `Howler.mute` và `AudioService.setMuted`; **chưa đo** chuyện này.

## Giới hạn, chưa kiểm chứng

- Chrome **headless** trên Windows. Độ trễ đo là tới **đầu ra của đồ thị âm** (bộ phân tích gắn vào `destination`, đọc mỗi dưới 1ms, cùng độ lệch cho cả hai bên), chưa cộng `outputLatency` ≈ 40ms của API và độ trễ phần cứng thật (nhất là Bluetooth, điện thoại rẻ). Số «nhỏ nhất» dưới 1ms phản ánh đồ thị được dựng trước, chưa kiểm chứng thêm.
- «Giả lập Pixel 5» chỉ đổi kích thước/UA/sự kiện chạm của Chrome. **iOS Safari và Android thật chưa được thử**, nơi hành vi mở khóa, trạng thái `interrupted` và độ trễ khác hẳn; đây là lý do chính để thử trên điện thoại thật trước khi chốt.
- Chỉ một tệp WAV nhỏ; chưa thử tệp lớn (mp3/ogg hàng trăm KB đến MB: thời gian giải mã tăng), chế độ HTML5 Audio của Howler, sprite, nhiều tệp nạp trước, hay bộ nhớ lâu dài.
- Một lượt đo mỗi ca; chưa có khoảng tin cậy; hai lượt chạy đầy đủ cho số khác nhau ở độ trễ lần chạm và đỉnh chồng âm.
- Phép «mở khóa» dùng cờ `--autoplay-policy=document-user-activation-required` và CDP `userGesture:false`; Safari, Firefox và cấu hình thật của người dùng có chính sách riêng.
