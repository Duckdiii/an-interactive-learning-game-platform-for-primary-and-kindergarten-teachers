# T7.4: Howler và Web Audio (2026-10-18, giờ UTC)

Chạy bằng `node scripts/experiments/compare-audio.mjs`: Chrome 155.0.8059.80 (headless, playwright-core), Node v20.19.6, Windows. «Tệp» âm thanh là WAV tự sinh trong trang; không tải tài nguyên ngoài. Độ trễ đo là tới ĐẦU RA của đồ thị âm (trước thiết bị); `outputLatency` do API báo (bảng dưới) KHÔNG được cộng vào.

## 1. Dung lượng đóng gói (minify + gzip, tree-shake riêng từng bên)

| Bên | Thô | Gzip |
| --- | --- | --- |
| Howler 2.2.4 | 44.5 KB | 10.4 KB |
| AudioService + tones (Web Audio tổng hợp, T2.1) | 5.1 KB | 1.9 KB |

## 2. Độ trễ từ lúc gọi phát đến mẫu âm đầu tiên ở đầu ra (ms)

| Cách phát | Số lần | Nhỏ nhất | p50 | p95 | Lớn nhất | Không nghe thấy |
| --- | --- | --- | --- | --- | --- | --- |
| Howler (đã nạp, phát lại) | 30 | 0.8 | 5.8 | 10.1 | 11.6 | 0 |
| Howler (tạo mới: tải + giải mã + phát) | 20 | 7.6 | 13.5 | 21 | 24.3 | 0 |
| Web Audio (AudioService, tổng hợp) | 30 | 12 | 21.2 | 27.2 | 27.8 | 0 |

Mốc đầu là lúc gọi hàm phát trong trang, mốc cuối là lúc bộ phân tích gắn vào `destination` thấy biên độ > 0,001 (đọc mỗi < 1ms); cả hai bên cùng chịu một độ trễ cố định của bộ phân tích (khoảng một khối 128 mẫu). Web Audio tự cố ý trễ 20ms (`START_LEAD_SECONDS`) để lịch envelope kịp áp dụng. Howler «tạo mới» gồm cả tải blob và giải mã.

| Ngữ cảnh | Trạng thái | Sample rate | baseLatency (s) | outputLatency (s) |
| --- | --- | --- | --- | --- |
| #1 | closed | 48000 | 0.01 | 0 |
| #2 | running | 48000 | 0.01 | 0.04 |
| #3 | running | 48000 | 0.01 | 0.04 |

## 3. Phát chồng: 20 lần gọi trong 1 giây (cách nhau 50ms)

| Bên | Số lần gọi | Số lần thực sự phát | Đỉnh biên độ ở đầu ra | Dao động tạo | Nguồn đệm tạo |
| --- | --- | --- | --- | --- | --- |
| Howler (tệp đỉnh 0,5, âm lượng 1) | 20 | 20 | 1.06 | 0 | 20 |
| Web Audio (AudioService) | 20 | 5 | 0.23 | 15 | 0 |

«Số lần thực sự phát» của Web Audio nhỏ hơn số lần gọi vì `AudioService` bỏ lệnh cùng âm trong 60ms và lệnh khi đã đủ 8 nốt; Howler phát cả 20. Đỉnh thấp của Web Audio vì thế một phần do bỏ lệnh, không chỉ do chừa khoảng trống ở master. Hai bên dùng biên độ khác nhau (do tác giả chọn) nên không so trực tiếp được mức to nhỏ. Đỉnh > 1,0 nghĩa là bị cắt đỉnh.

## 4. Mở khóa âm thanh (chính sách autoplay)

Bốn ca không cử chỉ dùng CDP `userGesture:false`, rồi một cử chỉ thật tại điểm (5, 5) của trang; mốc «sau cử chỉ» là sự kiện `pointerdown` đo TRONG trang (không gồm thời gian Playwright kiểm khả thao tác).

### Desktop (chuột)

| Howler: chờ trước cử chỉ (ms) | Có tiếng trước cử chỉ | Trạng thái ngữ cảnh trước | Âm chờ tự phát sau cử chỉ | Trễ sau cử chỉ (ms) | Trạng thái sau |
| --- | --- | --- | --- | --- | --- |
| 1500 | không | suspended | có | 37.4 | running |
| 4000 | không | suspended | có | 86.2 | running |

| Web Audio: chờ giữa lệnh phát bằng mã và lần bấm (ms) | Có tiếng trước cử chỉ | Số context dựng trước cử chỉ | Có tiếng sau khi bấm | Trễ sau pointerdown (ms) | Dao động tạo ra do lần bấm (3 = chỉ âm của lần bấm; 6 = cả âm xếp hàng cũ) |
| --- | --- | --- | --- | --- | --- |
| 1500 | không | 0 | có | 69.2 | 3 |
| 2600 | không | 0 | có | 63.3 | 3 |
| (không phát trước) | — | 0 | có | 60.7 | 3 |

Một cử chỉ vào nút rồi có tiếng (ms, 5 lần, mốc pointerdown): Howler 78.6, 103.2, 120.4, 103.6, 104.1; Web Audio 61.2, 91.7, 57.2, 88.2, 67.8.

### Giả lập Pixel 5 (cảm ứng)

| Howler: chờ trước cử chỉ (ms) | Có tiếng trước cử chỉ | Trạng thái ngữ cảnh trước | Âm chờ tự phát sau cử chỉ | Trễ sau cử chỉ (ms) | Trạng thái sau |
| --- | --- | --- | --- | --- | --- |
| 1500 | không | suspended | có | 45.3 | running |
| 4000 | không | suspended | có | 86.7 | running |

| Web Audio: chờ giữa lệnh phát bằng mã và lần bấm (ms) | Có tiếng trước cử chỉ | Số context dựng trước cử chỉ | Có tiếng sau khi bấm | Trễ sau pointerdown (ms) | Dao động tạo ra do lần bấm (3 = chỉ âm của lần bấm; 6 = cả âm xếp hàng cũ) |
| --- | --- | --- | --- | --- | --- |
| 1500 | không | 0 | có | 52.6 | 3 |
| 2600 | không | 0 | có | 60.6 | 3 |
| (không phát trước) | — | 0 | có | 81.1 | 3 |

Một cử chỉ vào nút rồi có tiếng (ms, 5 lần, mốc pointerdown): Howler 106.4, 134.3, 132.6, 72.2, 141.5; Web Audio 39.7, 72.5, 56.4, 89.5, 95.2.

Giả lập cảm ứng chỉ đổi kích thước, UA và sự kiện chạm của Chrome; KHÔNG thay được iOS Safari (nơi chính sách mở khóa và trạng thái `interrupted` khác). iOS/Android thật chưa được thử.

## 5. Tệp âm thanh không tồn tại (Howler)

- Ném lỗi: không; `play()` trả: 1002.
- Máy chủ trả cho đường dẫn không có tệp: 200 text/html (nếu là text/html thì Howler gặp lỗi giải mã chứ không phải 404).
- Sự kiện Howler thấy: loaderror: Decoding audio data failed.
- Thông báo console của trang: (không có).

## 6. Lỗi console và yêu cầu ra ngoài máy (mọi ca trừ «tệp thiếu»; ca «không cử chỉ» có cảnh báo autoplay của Chrome là đúng kỳ vọng)

- The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page. https://developer.chrome.com/blog/autoplay/#web_audio

Không có yêu cầu mạng ra ngoài máy.
