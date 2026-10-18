# T7.2: hoạt ảnh phản hồi Konva so với Lottie (2026-10-18)

Chạy bằng `node scripts/experiments/compare-lottie.mjs`: Chrome 155.0.8059.80 (headless, playwright-core), Node v20.19.6, Windows, khung 768px. Hoạt ảnh Lottie do code tự sinh; không tệp ngoài, không mạng ngoài máy.

## 1. Dung lượng (gzip)

| Bản build | Tổng JS+CSS+WASM gzip | Số tệp |
| --- | --- | --- |
| Thường (không có trang thử nghiệm) | 228.3 KB | 2 |
| Thử nghiệm (VITE_EXPERIMENTS=1) | 1002.9 KB | 22 |

| Tệp bản thử nghiệm (bỏ băm) | Thô | Gzip |
| --- | --- | --- |
| dotlottie-player.wasm | 1209.1 KB | 487.7 KB |
| index.js | 369.5 KB | 117.1 KB |
| useQuestionAudio.js | 366.4 KB | 110.1 KB |
| PixiNumberLineRenderer.js | 278.0 KB | 82.5 KB |
| LottieWebPlayer.js | 301.2 KB | 76.1 KB |
| Geometry.js | 107.1 KB | 32.0 KB |
| ExperimentsPage.js | 99.9 KB | 32.0 KB |
| RenderTargetSystem.js | 76.3 KB | 21.3 KB |
| DotLottiePlayer.js | 61.6 KB | 14.0 KB |
| browserAll.js | 41.7 KB | 10.8 KB |
| index.css | 24.3 KB | 5.4 KB |
| init.js | 15.0 KB | 4.7 KB |
| jsx-runtime.js | 8.0 KB | 3.0 KB |
| BufferResource.js | 10.8 KB | 2.8 KB |
| canvasUtils.js | 5.9 KB | 2.0 KB |
| rolldown-runtime.js | 716 B | 428 B |
| getTextureBatchBindGroup.js | 342 B | 269 B |
| lottieHarness.js | 452 B | 256 B |
| CanvasRenderer.js | 85 B | 94 B |
| WebGPURenderer.js | 85 B | 94 B |
| WebGLRenderer.js | 84 B | 93 B |
| webworkerAll.js | 72 B | 83 B |

Các tệp có thể liên quan Lottie: dotlottie-player.wasm, LottieWebPlayer.js, DotLottiePlayer.js, lottieHarness.js. Mỗi bộ phát nạp lười: người dùng không mở phòng Lottie thì không tải gì; bản build thường không đổi.

## 2. Nạp và khung hình đầu

| Phản hồi | Số bản | Nguồn | CPU | Sẵn sàng sau khi bấm chọn nguồn (ms) | Độ trễ đến khung đầu sau «Phát» (ms) | Chạy hết sau (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| correct | 1 | konva | thường | 35.2 | — | — |
| correct | 1 | konva | chậm 4× | — (đo ở CPU thường) | — | — |
| correct | 1 | lottie-svg | thường | 51.1 | 40.3 | 1232 |
| correct | 1 | lottie-svg | chậm 4× | — (đo ở CPU thường) | 57 | 1241 |
| correct | 1 | lottie-canvas | thường | 52.6 | 41.2 | 1233 |
| correct | 1 | lottie-canvas | chậm 4× | — (đo ở CPU thường) | 48.7 | 1235 |
| correct | 1 | dotlottie | thường | 381.4 | 52.5 | 1228 |
| correct | 1 | dotlottie | chậm 4× | — (đo ở CPU thường) | 59.1 | 1274 |
| tryAgain | 1 | konva | thường | 36.2 | — | — |
| tryAgain | 1 | konva | chậm 4× | — (đo ở CPU thường) | — | — |
| tryAgain | 1 | lottie-svg | thường | 44.3 | 40 | 1532 |
| tryAgain | 1 | lottie-svg | chậm 4× | — (đo ở CPU thường) | 45.6 | 1534 |
| tryAgain | 1 | lottie-canvas | thường | 55.4 | 40.9 | 1534 |
| tryAgain | 1 | lottie-canvas | chậm 4× | — (đo ở CPU thường) | 44.1 | 1535 |
| tryAgain | 1 | dotlottie | thường | 378.1 | 50.5 | 1525 |
| tryAgain | 1 | dotlottie | chậm 4× | — (đo ở CPU thường) | 57.9 | 1547 |
| correct | 12 | konva | thường | 38 | — | — |
| correct | 12 | konva | chậm 4× | — (đo ở CPU thường) | — | — |
| correct | 12 | lottie-svg | thường | 83.4 | 47.5 | 1243 |
| correct | 12 | lottie-svg | chậm 4× | — (đo ở CPU thường) | 286 | 1368 |
| correct | 12 | lottie-canvas | thường | 53.4 | 42.7 | 1232 |
| correct | 12 | lottie-canvas | chậm 4× | — (đo ở CPU thường) | 294.8 | 1340 |
| correct | 12 | dotlottie | thường | 378.5 | 65.6 | — |
| correct | 12 | dotlottie | chậm 4× | — (đo ở CPU thường) | 493.4 | — |

## 3. Trong lúc phát (cửa sổ 2.5 giây kể từ «Phát»)

| Phản hồi | Số bản | Nguồn | CPU | FPS (rAF) | p95 khung (ms) | Khung dài nhất (ms) | Khung rớt (>33,4ms) | Khung hình thư viện báo | Lần vẽ Konva | Số nút DOM vùng xem | Heap JS sau GC (MB) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| correct | 1 | konva | thường | 119.8 | 9.2 | 16.5 | 0 | — | 55 | 4 | 5.5 |
| correct | 1 | konva | chậm 4× | 119.2 | 11.4 | 22.1 | 0 | — | 56 | 4 | 5 |
| correct | 1 | lottie-svg | thường | 119.3 | 8.7 | 16.7 | 0 | 143 | — | 20 | 6 |
| correct | 1 | lottie-svg | chậm 4× | 117.9 | 12.9 | 19.9 | 0 | 143 | — | 20 | 5.5 |
| correct | 1 | lottie-canvas | thường | 119 | 8.7 | 16.7 | 0 | 143 | — | 3 | 6 |
| correct | 1 | lottie-canvas | chậm 4× | 117.6 | 11.9 | 18.9 | 0 | 143 | — | 3 | 5.5 |
| correct | 1 | dotlottie | thường | 118.7 | 8.7 | 16.7 | 0 | 142 | — | 2 | 5.7 |
| correct | 1 | dotlottie | chậm 4× | 111.2 | 16.4 | 36.7 | 1 | 126 | — | 2 | 5.3 |
| tryAgain | 1 | konva | thường | 119.2 | 8.7 | 16.7 | 0 | — | 43 | 4 | 5.8 |
| tryAgain | 1 | konva | chậm 4× | 118.8 | 11.3 | 22 | 0 | — | 43 | 4 | 5.3 |
| tryAgain | 1 | lottie-svg | thường | 119.3 | 8.7 | 16.8 | 0 | 179 | — | 15 | 6 |
| tryAgain | 1 | lottie-svg | chậm 4× | 114.9 | 12 | 27.2 | 0 | 172 | — | 15 | 5.5 |
| tryAgain | 1 | lottie-canvas | thường | 117.3 | 8.8 | 19 | 0 | 178 | — | 3 | 6.1 |
| tryAgain | 1 | lottie-canvas | chậm 4× | 116.2 | 10.9 | 22.5 | 0 | 172 | — | 3 | 5.7 |
| tryAgain | 1 | dotlottie | thường | 118.5 | 8.8 | 30 | 0 | 177 | — | 2 | 6 |
| tryAgain | 1 | dotlottie | chậm 4× | 103.8 | 19.4 | 34.1 | 1 | 141 | — | 2 | 5.6 |
| correct | 12 | konva | thường | 114.3 | 11.9 | 19.1 | 0 | — | 1096 | 48 | 6.4 |
| correct | 12 | konva | chậm 4× | 54 | 135.2 | 218.4 | 10 | — | 91 | 48 | 6.1 |
| correct | 12 | lottie-svg | thường | 118.2 | 8.9 | 16.7 | 0 | 1716 | — | 240 | 8 |
| correct | 12 | lottie-svg | chậm 4× | 74.6 | 44.2 | 123.2 | 11 | 552 | — | 240 | 8 |
| correct | 12 | lottie-canvas | thường | 117.1 | 9.1 | 17.2 | 0 | 1692 | — | 36 | 8.2 |
| correct | 12 | lottie-canvas | chậm 4× | 84.9 | 26.9 | 145.4 | 7 | 792 | — | 36 | 8.2 |
| correct | 12 | dotlottie | thường | 118.1 | 9 | 16.9 | 0 | 1269 | — | 24 | 6.4 |
| correct | 12 | dotlottie | chậm 4× | 57.2 | 87.6 | 192.3 | 14 | 108 | — | 24 | 6.4 |

Ngưỡng «khung rớt» tính theo 60 Hz dù trình duyệt có thể chạy rAF ở 120 Hz. Một lượt đo, 2,5 giây mỗi ca; chưa có khoảng tin cậy. Với nhiều bản cùng lúc, «khung hình thư viện báo» là TỔNG của mọi bộ phát, «số nút DOM» là của cả vùng xem, «sẵn sàng» và «chạy hết» chỉ tính khi TẤT CẢ bộ phát đã xong («—» = chưa xong trong cửa sổ đo). Mốc thời gian «độ trễ đến khung đầu» tính từ lúc bấm, nên gồm cả thời gian lệnh bấm đi qua trình điều khiển; «sẵn sàng» của Konva chỉ là thời gian dựng canvas; heap JS không gồm bộ nhớ WASM của dotlottie.

## 4. Lỗi console và yêu cầu ra ngoài máy

Không có lỗi hay cảnh báo console.

Không có yêu cầu mạng ra ngoài máy (WASM của dotlottie dùng tệp cục bộ).
