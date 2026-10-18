# T7.1: so Konva với PixiJS trên NUMBER_LINE (2026-10-18)

Chạy bằng `node scripts/experiments/compare-engines.mjs`: Chrome 155.0.8059.80 (headless, playwright-core), Node v20.19.6, Windows. Số đo trên trình duyệt tự động; WebGL của Chrome headless chạy bằng phần mềm hoặc GPU của máy này, không đại diện máy của trẻ.

## 1. Dung lượng bundle (gzip)

| Bản build | Tổng JS+CSS gzip | Số tệp |
| --- | --- | --- |
| Thường (không có trang thử nghiệm) | 228.3 KB | 2 |
| Thử nghiệm (VITE_EXPERIMENTS=1) | 419.9 KB | 17 |

| Tệp (bản thử nghiệm, bỏ băm) | Thô | Gzip |
| --- | --- | --- |
| index.js | 369.5 KB | 117.1 KB |
| useQuestionAudio.js | 374.4 KB | 112.7 KB |
| PixiNumberLineRenderer.js | 278.0 KB | 82.5 KB |
| Geometry.js | 107.1 KB | 32.0 KB |
| ExperimentsPage.js | 88.4 KB | 27.7 KB |
| RenderTargetSystem.js | 76.3 KB | 21.3 KB |
| browserAll.js | 41.7 KB | 10.8 KB |
| index.css | 23.9 KB | 5.4 KB |
| init.js | 15.0 KB | 4.7 KB |
| BufferResource.js | 10.8 KB | 2.8 KB |
| canvasUtils.js | 5.9 KB | 2.0 KB |
| rolldown-runtime.js | 716 B | 428 B |
| getTextureBatchBindGroup.js | 342 B | 269 B |
| CanvasRenderer.js | 85 B | 94 B |
| WebGPURenderer.js | 85 B | 94 B |
| WebGLRenderer.js | 84 B | 93 B |
| webworkerAll.js | 72 B | 83 B |

Gói Pixi nằm trong các tệp nạp lười riêng (nhập động từ `EngineCompareLab`): bản build thường không chứa Pixi và người dùng không mở phòng so engine thì không tải.

## 2. Thời gian sẵn sàng và lúc đứng yên

| Khung | Engine | CPU | Sẵn sàng sau khi bấm (ms) | rAF lúc đứng yên (fps) | Số lần vẽ/giây lúc đứng yên |
| --- | --- | --- | --- | --- | --- |
| 390 | konva | thường | 56.3 | 119.5 | 0 |
| 390 | konva | chậm 4× | — (đo ở CPU thường) | 119.5 | 0 |
| 390 | pixi-demand | thường | 440.1 | 118.5 | 0 |
| 390 | pixi-demand | chậm 4× | — (đo ở CPU thường) | 116.3 | 0 |
| 390 | pixi-continuous | thường | 432.3 | 119.9 | 121.5 |
| 390 | pixi-continuous | chậm 4× | — (đo ở CPU thường) | 110.5 | 111 |
| 768 | konva | thường | 51.2 | 119 | 0 |
| 768 | konva | chậm 4× | — (đo ở CPU thường) | 117.9 | 0 |
| 768 | pixi-demand | thường | 451.4 | 116.5 | 0 |
| 768 | pixi-demand | chậm 4× | — (đo ở CPU thường) | 117.5 | 0 |
| 768 | pixi-continuous | thường | 430.1 | 120 | 121 |
| 768 | pixi-continuous | chậm 4× | — (đo ở CPU thường) | 104.3 | 106 |
| 1280 | konva | thường | 59.1 | 119.6 | 0 |
| 1280 | konva | chậm 4× | — (đo ở CPU thường) | 119.2 | 0 |
| 1280 | pixi-demand | thường | 435.2 | 118.5 | 0 |
| 1280 | pixi-demand | chậm 4× | — (đo ở CPU thường) | 120 | 0 |
| 1280 | pixi-continuous | thường | 406.6 | 120 | 121.5 |
| 1280 | pixi-continuous | chậm 4× | — (đo ở CPU thường) | 119.6 | 121 |

## 3. Kéo điểm liên tục (3 giây)

| Khung | Engine | CPU | FPS (rAF) | Số lần vẽ/giây | Sự kiện chuột nhận được/giây | p95 khung (ms) | Khung dài nhất (ms) | Khung rớt (>33,4ms) | Bộ nhớ JS sau GC (MB) | Điểm kéo (px) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 | konva | thường | 119 | 60.3 | 60.3 | 11.8 | 19.1 | 0 | 5.6 | 32 |
| 390 | konva | chậm 4× | 50.6 | 20.3 | 20.3 | 56 | 107.9 | 71 | 5.4 | 32 |
| 390 | pixi-demand | thường | 117.4 | 64.3 | 80.3 | 10.1 | 17 | 0 | 7.6 | 32 |
| 390 | pixi-demand | chậm 4× | 104.3 | 18.3 | 20.3 | 21.9 | 59.5 | 4 | 7.4 | 32 |
| 390 | pixi-continuous | thường | 120 | 138.3 | 80.3 | 9.4 | 18.1 | 0 | 7.7 | 32 |
| 390 | pixi-continuous | chậm 4× | 46.2 | 60 | 20.3 | 34.8 | 103.5 | 13 | 7.5 | 32 |
| 768 | konva | thường | 120.3 | 60.3 | 60.3 | 11.4 | 19.2 | 0 | 5.5 | 66.1 |
| 768 | konva | chậm 4× | 49 | 20.3 | 20.3 | 54.2 | 143.6 | 75 | 5.4 | 66.1 |
| 768 | pixi-demand | thường | 119.3 | 50.3 | 80.3 | 9.6 | 18.5 | 0 | 7.6 | 66.1 |
| 768 | pixi-demand | chậm 4× | 105.2 | 27.7 | 40.3 | 21.1 | 122 | 6 | 7.5 | 66.1 |
| 768 | pixi-continuous | thường | 119.9 | 128.7 | 80.3 | 9.5 | 19.5 | 0 | 7.7 | 66.1 |
| 768 | pixi-continuous | chậm 4× | 47.7 | 66.7 | 20.3 | 37.3 | 104.1 | 20 | 7.5 | 66.1 |
| 1280 | konva | thường | 118.2 | 60.3 | 60.3 | 11.5 | 18.7 | 0 | 5.5 | 72 |
| 1280 | konva | chậm 4× | 51 | 20.3 | 20.3 | 53.7 | 123.6 | 74 | 5.4 | 72 |
| 1280 | pixi-demand | thường | 117.9 | 58.7 | 100.3 | 9.4 | 17.1 | 0 | 7.6 | 72 |
| 1280 | pixi-demand | chậm 4× | 120.4 | 58.7 | 100.3 | 10.8 | 17.8 | 0 | 7.6 | 72 |
| 1280 | pixi-continuous | thường | 120 | 142.3 | 120.3 | 9.3 | 17.5 | 0 | 7.7 | 72 |
| 1280 | pixi-continuous | chậm 4× | 94.1 | 161.3 | 40.3 | 19.2 | 50.4 | 1 | 7.6 | 72 |

Ngưỡng «khung rớt» tính theo 60 Hz dù trình duyệt có thể chạy rAF ở 120 Hz. «Sự kiện chuột nhận được» cho biết tải đầu vào thật sự của từng ca: Playwright gửi sự kiện không theo nhịp cố định nên trang chậm hơn thì nhận ít hơn, vì vậy số vẽ/giây và FPS giữa các engine **không cùng tải** khi cột này khác nhau.

Bộ vẽ Pixi: webgl. Bộ nhớ là heap JS sau khi ép dọn rác, không gồm bộ nhớ GPU/texture.

## 3b. Kiểm chức năng tương đương (chuột thật, khung 1280, mẫu «0 đến 10», chế độ preview)

| Bước | konva | pixi-demand | pixi-continuous |
| --- | --- | --- | --- |
| start | "0" | "0" | "0" |
| afterPlus3 | "3" | "3" | "3" |
| afterMinus | "2" | "2" | "2" |
| afterBandTap7 | "7" | "7" | "7" |
| afterDrag3 | "3" | "3" | "3" |
| statusWrong | "Gần đúng rồi. Số đúng là 7." | "Gần đúng rồi. Số đúng là 7." | "Gần đúng rồi. Số đúng là 7." |
| afterLockedBandTap9 | "3" | "3" | "3" |
| sliderDisabled | true | true | true |

Cả ba cấu hình cho cùng kết quả ở mọi bước.

## 4. Lỗi/cảnh báo console

Không có.
