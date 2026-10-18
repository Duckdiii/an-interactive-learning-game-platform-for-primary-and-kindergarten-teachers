# T7.2: Lottie và Rive cho hoạt ảnh phản hồi (2026-10-18)

Số liệu thô: [`measurements.md`](measurements.md), [`results.json`](results.json); ảnh giữa hoạt ảnh (0,6 giây sau «Phát», **chỉ theme mặc định**) ở `shots/`. Phòng thử: `/dev/experiments` → «Lottie (T7.2)». Tệp này là phần diễn giải và các giới hạn. Rive chỉ đánh giá **trên giấy** (user trả lời Q10: chưa có tệp `.riv`): xem [`rive-on-paper.md`](rive-on-paper.md).

## Làm gì

- **Hoạt ảnh tự sinh bằng code, không tải tệp ngoài:** `lottieAnimations.ts` dựng JSON Lottie cho «đúng» (sao nảy 1,2 giây, ba chấm hiện dần) và «thử lại» (gương mặt gật đầu nhẹ 1,5 giây). Màu lấy từ theme.
- **`validateLottie`** kiểm giới hạn an toàn dùng chung với hiệu ứng Konva hiện có: thời lượng ≤ 2 giây, nảy ≤ 115% và không co dưới 90% sau đỉnh, dịch ≤ 6px, nghiêng ≤ 15 độ, không chớp quá 3 lần/giây, không đỏ gắt (mọi khung hình khóa), ≤ 8 lớp, khung ≤ 400, khung hình khóa hợp lệ. Cổng này **chỉ đáng tin cho JSON do code sinh ra** (lớp hình đơn giản): với tính năng nó không kiểm được (biểu thức, tài nguyên ngoài/precomp, lớp không phải hình, lớp cha, gradient) nó **báo `UNSUPPORTED_FEATURE` và từ chối**, nên tệp do nhà thiết kế xuất từ After Effects gần như chắc chắn bị từ chối cho tới khi mở rộng bộ kiểm. Test chạy cổng trên hoạt ảnh sinh ra ở cả ba theme (đạt); ảnh chụp thì chỉ theme mặc định.
- **Ba bộ phát** (mỗi bộ nạp lười): `lottie-web` 5.13.0 vẽ **SVG**, `lottie-web` vẽ **canvas** (cả hai dùng **bản đầy đủ** của lottie-web, không phải `lottie_light`, nên gói ~76 KB là cận trên), `@lottiefiles/dotlottie-web` 0.80.0 (ThorVG chạy bằng **WASM**, vẽ canvas). WASM của dotlottie ép dùng bản đi kèm gói (`?url`), không tải từ CDN. Mọi bộ phát chỉ phát lại khi `replayKey` đổi (đổi bộ vẽ, theme, hoặc giảm chuyển động không tự phát lại).
- **Lớp phủ DOM** (`FeedbackLottieOverlay`) đặt lên màn Konva (NUMBER_LINE): `pointer-events: none`, `aria-hidden` (thông báo vẫn do `role=status` của renderer). Thời gian hiển thị tính **từ lúc bộ phát nạp xong** (lần đầu phải nạp lười thư viện, dotlottie còn nạp WASM), có hạn chờ tối đa 5 giây để không treo lớp phủ trống; theo «giảm chuyển động» (OS hoặc công tắc phòng): chỉ hiện khung cuối, tĩnh.
- **Lưu ý tích hợp:** renderer NUMBER_LINE vẫn tự phát hiệu ứng Konva và âm thanh của nó; khi đặt lớp phủ Lottie lên, trẻ thấy **cả hai cùng lúc**. Tổ hợp này chưa được kiểm bằng giới hạn an toàn; muốn dùng thật phải tắt phản hồi Konva của renderer.
- **Mốc so sánh:** hiệu ứng Konva hiện có (`FeedbackOverlay`).

Chạy lại: `node scripts/experiments/compare-lottie.mjs` (khoảng 5 phút, Chrome cài sẵn).

## Kết quả (một lượt đo, khung 768px)

1. **Cả ba bộ phát chạy trên Chrome thật, không lỗi console, không yêu cầu mạng ra ngoài máy** (kể cả WASM dotlottie). Chạy hết đúng thời lượng: ~1,23 giây (sao), ~1,53 giây (gật đầu).
2. **Dung lượng (gzip):** `lottie-web` ≈ **76 KB**; `dotlottie-web` ≈ 14 KB JS + **WASM ≈ 488 KB** (thô 1,2 MB) ≈ **502 KB**, gấp ≈ 6,6 lần. Bản build thường **không đổi** (228,3 KB) vì hai bộ phát nạp lười từ trang thử nghiệm.
3. **Sẵn sàng sau khi bấm chọn nguồn** (CPU thường, cục bộ, không độ trễ mạng): Konva 35 đến 38ms (chỉ là dựng canvas), lottie-web 44 đến 55ms, **dotlottie ≈ 380ms**. Độ trễ từ lúc bấm «Phát» đến khung đầu: lottie-web 40 đến 57ms, dotlottie 50 đến 59ms (gồm cả thời gian lệnh bấm đi qua trình điều khiển).
4. **Một hoạt ảnh: khác biệt nhỏ.** Cả bốn nguồn ≈ 117 đến 120 fps ở CPU thường; ở CPU chậm 4× vẫn ≈ 115 đến 119 fps, riêng **dotlottie thấp nhất (104 đến 111 fps, 1 khung rớt, khung dài nhất 34 đến 37ms)**. Số nút DOM vùng xem: Konva 4, lottie-web SVG 15 đến 20, canvas 3, dotlottie 2. Heap JS sau GC ≈ 5 đến 6 MB cho tất cả (**không gồm bộ nhớ WASM** của dotlottie).
5. **Thử tải: 12 hoạt ảnh cùng lúc, CPU chậm 4×** (tình huống giả lập, không phải cách dùng thật): Konva 54 fps (10 khung rớt, dài nhất 218ms); lottie-web SVG 75 fps (11, 123ms); canvas 85 fps (7, 145ms); dotlottie 57 fps (14, 192ms; trong cửa sổ đo thư viện mới báo 108 khung và chưa chạy hết, tức 12 bản WASM vẫn đang nạp/vẽ). Ở CPU thường cả bốn ≈ 114 đến 118 fps, không khung rớt. **Chiều hướng, không phải mức chênh:** lottie-web ≥ Konva ≈ dotlottie ở tải nặng, nhưng lượt đo trước cho số khác (Konva 52, lottie-web 75/74, dotlottie 58 fps), nên chưa có người thắng rõ ràng.
6. **Lớp phủ DOM lên canvas Konva hoạt động** (test + đã kiểm bằng trình duyệt thật): phát khi trả lời, không chắn chạm, không lộ cho trình đọc màn hình.

## Phát hiện về Lottie cho dự án

- **Hợp với quy trình thiết kế** (xuất từ After Effects/LottieFiles) nhưng ở đây hoạt ảnh phải tự sinh vì quy tắc «không tải tài nguyên ngoài»; viết JSON Lottie bằng tay dài dòng, dễ sai (khung hình khóa, thứ tự vẽ nét/tô), cần bộ kiểm. Với hiệu ứng đơn giản như hiệu ứng Konva hiện có (vòng sáng, hạt) Konva **gọn hơn và không thêm thư viện**; Lottie chỉ đáng khi cần hình phức tạp do nhà thiết kế làm **và** bộ kiểm được mở rộng cho tệp của họ.
- **lottie-web (SVG) là lựa chọn nhẹ nhất cho một phản hồi**; canvas ít nút DOM hơn; **dotlottie nặng nhất** (WASM gần nửa MB, nạp chậm hơn) và không cho lợi thế hiệu năng rõ ràng trong cảnh này.
- Lottie JSON **không thay được thông báo cho trình đọc màn hình**: lớp phủ phải `aria-hidden` và dựa vào `role=status` có sẵn.
- Theo metadata npm đọc ngày 2026-10-18 (chưa kiểm lại trong repo): `lottie-web` 5.13.0 phát hành lần cuối 05/2025 (ít cập nhật); `dotlottie-web` phát hành dày.

## Giới hạn, chưa kiểm chứng (đọc trước khi dùng số liệu)

- Một lượt đo, 2,5 giây mỗi ca, Chrome headless/Windows (WebGL/canvas có thể chạy phần mềm); CPU «chậm 4×» là giả lập; chưa thử điện thoại thật. Ngưỡng «khung rớt» tính theo 60 Hz dù rAF chạy 120 Hz; chưa có khoảng tin cậy.
- Mốc thời gian có sai số phương pháp: «độ trễ khung đầu» tính từ lúc bấm (gồm lệnh qua trình điều khiển); «sẵn sàng» của Konva chỉ là dựng canvas nên không cùng loại với của Lottie.
- Hoạt ảnh chưa qua mắt nhà thiết kế/giáo viên: hình đơn giản (sao, mặt cười), mức «vui» và «dịu» chưa được đánh giá. Giới hạn an toàn là đề xuất của thử nghiệm, chưa có chuyên gia xác nhận. Chưa thử âm thanh đi kèm.
- Mốc Konva là hiệu ứng hiện có (vòng sáng, hạt) chứ không phải sao nảy/gương mặt, nên không cùng hình để so thẩm mỹ.
- Tín hiệu đo `window.__lottieHarness` chỉ có ở bản dev hoặc `VITE_EXPERIMENTS=1`.
- Rive: chỉ trên giấy, không có số đo.
