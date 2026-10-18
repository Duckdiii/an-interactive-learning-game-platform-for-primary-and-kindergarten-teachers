# T7.3: thả rơi theo vật lý (matter-js) cho PREPOSITION_SCENE (2026-10-18)

Chạy bằng `node scripts/experiments/compare-physics.mjs`: Chrome 155.0.8059.80 (headless, playwright-core), Node v20.19.6, Windows, khung 768px. Không mạng ngoài máy.

## 1. Dung lượng (gzip)

| Bản build | Tổng JS+CSS gzip | Số tệp |
| --- | --- | --- |
| Thường (không có trang thử nghiệm) | 228.3 KB | 2 |
| Thử nghiệm (VITE_EXPERIMENTS=1) | 1029.8 KB | 23 |

| Tệp liên quan matter-js (bỏ băm) | Thô | Gzip |
| --- | --- | --- |
| matterDrop.js | 83.8 KB | 26.2 KB |

Tệp thật sự được tải thêm khi bật «Thả rơi theo vật lý»: matterDrop-kTnF12LF.js. Chưa bật thì không tải gì; bản build thường không đổi.

## 2. Một lần mô phỏng (ms)

| CPU | Nạp gói sau khi bật (ms) | Số lần gọi | Trung bình | p95 | Lớn nhất | Số bước trung bình | Chưa nằm yên | Điểm buông không tất định |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| thường | 24 | 275 | 0.15 | 0.6 | 3.9 | 34.53 | 0 | 0 |
| chậm 4× | 23 | 275 | 0.89 | 1.9 | 27.6 | 34.53 | 0 | 0 |

Mỗi điểm trong lưới 55 điểm buông (bàn) được chạy 5 lần; «không tất định» = số điểm mà 5 lần cho kết quả khác nhau.

## 3. Luồng thật bằng chuột (kéo → buông → rơi → «Done!»)

| Ca | Quy tắc | CPU | Điểm buông (cảnh) | Rơi xong sau (ms) | FPS lúc rơi | Khung rớt | Vị trí nộp | Kết quả |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| on | ON | thường | 360, 40 | 583 | 121.5 | 0 | 361, 100 | The cat is on the table. Great job! |
| under | UNDER | thường | 360, 250 | 555 | 121.9 | 0 | 361, 290 | The cat is under the table. Great job! |
| in | IN | thường | 360, 40 | 865 | 120.2 | 0 | 361, 274 | The ball is in the box. Great job! |
| next-to | NEXT_TO | thường | 590, 100 | 823 | 118.9 | 0 | 591, 290 | The dog is next to the box. Great job! |
| wrong-on-for-under | UNDER (cố ý thả lên bàn) | thường | 360, 40 | 584 | 121.1 | 0 | 361, 100 | The cat is on the table. Good try! The dashed place is the r |
| on | ON | chậm 4× | 360, 40 | 569 | 120.1 | 0 | 361, 100 | The cat is on the table. Great job! |
| under | UNDER | chậm 4× | 360, 250 | 575 | 121.6 | 0 | 361, 290 | The cat is under the table. Great job! |
| in | IN | chậm 4× | 360, 40 | 896 | 120.8 | 0 | 361, 274 | The ball is in the box. Great job! |
| next-to | NEXT_TO | chậm 4× | 590, 100 | 843 | 121 | 0 | 591, 290 | The dog is next to the box. Great job! |
| wrong-on-for-under | UNDER (cố ý thả lên bàn) | chậm 4× | 360, 40 | 570 | 120 | 0 | 361, 100 | The cat is on the table. Good try! The dashed place is the r |

Ngưỡng «khung rớt» tính theo 60 Hz dù trình duyệt có thể chạy rAF ở 120 Hz. Một lượt đo; «rơi xong sau» tính từ lúc nhả chuột đến khi nút «Done!» mở lại.

## 4. Lỗi console và yêu cầu ra ngoài máy

Không có lỗi hay cảnh báo console.

Không có yêu cầu mạng ra ngoài máy.
