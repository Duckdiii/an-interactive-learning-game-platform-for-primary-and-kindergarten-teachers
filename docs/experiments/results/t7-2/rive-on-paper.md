# Rive: đánh giá trên giấy (T7.2, 2026-10-18)

**Phạm vi:** theo câu trả lời Q10 của user (chưa có tệp `.riv`), Rive **không được cài và không được chạy** trong thử nghiệm. Tệp này chỉ gồm (a) số liệu đọc từ metadata npm (chỉ đọc thông tin, không tải gói) và (b) nhận định chung. Phần (b) **chưa kiểm chứng** trong repo này; nó dựa trên hiểu biết chung, nên cần đối chiếu trước khi dùng để quyết định.

## (a) Số liệu từ metadata npm (đọc ngày 2026-10-18)

| Gói | Phiên bản | Giấy phép | Kích thước giải nén (metadata) |
|---|---|---|---|
| `@rive-app/canvas` | 2.45.0 | MIT | 5,7 MB (5 741 367 byte) |
| `@rive-app/canvas-lite` | 2.45.0 | MIT | 2,9 MB (2 914 989 byte), 23 tệp |

- Cả hai phát hành rất dày (2.44.1 ngày 09/10, 2.44.2 ngày 10/10, 2.45.0 ngày 17/10/2026): vài bản mỗi tuần.
- Kích thước giải nén là của cả gói (gồm bản dựng nhiều định dạng và WASM), **không phải** dung lượng người dùng tải; số gzip của riêng runtime chưa đo (cần cài, ngoài phạm vi Q10).
- So với số đo T7.2: `dotlottie-web` giải nén 7,4 MB nhưng người dùng chỉ tải khoảng 502 KB gzip (JS + WASM). Kích thước thật của Rive phải đo tương tự trước khi so.

## (b) Nhận định chung (chưa kiểm chứng ở đây)

- **Quy trình thiết kế:** tệp `.riv` là nhị phân tạo từ trình soạn thảo Rive bên ngoài; không sinh bằng code được như JSON Lottie. Hệ quả: cần một người có quyền dùng trình soạn thảo, và tệp nhị phân đưa vào repo phải rà nguồn gốc/giấy phép như mọi tài nguyên ngoài (quy tắc «không tải tài nguyên ngoài» của thử nghiệm).
- **Điểm mạnh thường được nêu:** máy trạng thái (state machine) và đầu vào (input) ngay trong tệp, nên một tệp có thể có nhiều trạng thái «đúng»/«thử lại»/«chờ» điều khiển bằng giá trị từ mã; hoạt ảnh tương tác (không chỉ phát một chiều). Với trẻ nhỏ, một nhân vật phản ứng theo trạng thái có thể hấp dẫn hơn một hiệu ứng phát một lần.
- **Điểm yếu thường được nêu:** thêm một runtime WASM nữa (cùng loại rủi ro nặng/nạp chậm như dotlottie trong đo T7.2); phụ thuộc công cụ soạn thảo và định dạng riêng (khóa nhà cung cấp); hệ sinh thái hoạt ảnh sẵn có nhỏ hơn Lottie.
- **Trợ năng:** như Lottie, hoạt ảnh vẽ vào canvas không có cây DOM; thông báo cho trình đọc màn hình vẫn phải do `role=status`. Không có gì để kiểm cho `prefers-reduced-motion` ngoài việc tự dừng/hiện khung tĩnh ở lớp bao (giống `FeedbackLottieOverlay`).

## Điều cần để đo thật (nếu user muốn)

1. Một tệp `.riv` có nguồn gốc/giấy phép rõ (do user cung cấp hoặc tự làm), kèm yêu cầu: hai trạng thái «đúng»/«thử lại», ≤ 2 giây, không đỏ gắt, không chớp quá 3 lần/giây.
2. Duyệt cài một gói Rive pin phiên bản (đề xuất đo `@rive-app/canvas-lite` trước vì nhẹ hơn).
3. Khi đó thêm một nguồn thứ năm vào `compare-lottie.mjs` để đo cùng chỉ số (dung lượng gzip + WASM, thời gian sẵn sàng, FPS, 12 bản cùng lúc).

## Kết luận tạm (trên giấy)

Chưa đủ cơ sở để chọn Rive. Với nhu cầu hiện tại (một phản hồi phát một lần, đúng hoặc thử lại), Konva hiện có hoặc `lottie-web` (SVG) đã đủ và nhẹ hơn; Rive chỉ đáng đo thật nếu nhóm muốn nhân vật tương tác nhiều trạng thái do nhà thiết kế làm.
