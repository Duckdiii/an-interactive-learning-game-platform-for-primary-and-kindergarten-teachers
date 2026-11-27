# AI review: prompt và schema

- `prompt.md`: hướng dẫn cho agent. **Dòng đầu là `prompt_version: X.Y.Z`**; tăng số khi đổi nội dung (patch: sửa câu chữ; minor: thêm/bớt tiêu chí; major: đổi định dạng đầu ra).
- `review-result.schema.json`: schema JSON đầu ra, dùng cho `--json-schema` của `claude-code-action` và để script `post` kiểm tra lại. Chỉ dùng từ khóa mà `scripts/ai-review/schema-validate.mjs` hỗ trợ.
- Đổi `category`/`severity`/`mode` trong schema thì phải đổi `prompt.md`; `scripts/ai-review/review-result.test.mjs` kiểm tra hai bên khớp nhau.
- Khi chạy trong CI, các file này được lấy từ **nhánh base** (thư mục `trusted/`), không lấy từ PR. Muốn thử prompt mới trước khi merge, chạy `workflow_dispatch` với `ref` chỉ định.
- **Không đưa ví dụ lỗi cụ thể vào `prompt.md`** (đoạn code lỗi, tên lỗi mẫu của bộ PR thực nghiệm). Làm vậy sẽ thổi phồng recall khi đánh giá. Thiết kế đầy đủ: `.github/ai-review/ai-auto-review.md`.
- Chạy test: `node --test "scripts/ai-review/*.test.mjs"`.
- **Vòng 2** (PR có commit mới): `prompt.md` mục 8 hướng dẫn agent kiểm tra vấn đề cũ; schema có `round` và `previous_findings`. Đổi trạng thái (`resolved` / `still_present` / `unclear`) thì phải đổi cả hai; test kiểm tra hai bên khớp nhau. `scripts/ai-review/precheck.mjs` quyết định vòng nào chạy.

## Kiểm chứng workflow

- `prepare` tạo diff từ SHA của PR và đóng gói tối đa 10 file, 55.000 ký tự mỗi phần. File vượt ngân sách hoặc vượt giới hạn 24 phần được liệt kê để review tay. File sinh tự động thuộc danh sách loại trừ được ghi riêng trong artifact.
- Agent đọc gói được giao. Nếu thiếu file, workflow thử lại đúng phần đó một lần. Vòng 2 giữ các vấn đề cũ cùng phần diff mới trong một gói để kiểm tra đầy đủ.
- Bước đăng đối chiếu các artifact với manifest. Mở mục **AI review: độ phủ** và artifact `coverage.json` để xem SHA, vòng, số file đã xác nhận và lý do thiếu.
- Trong lúc kiểm chứng, chạy `workflow_dispatch` với `dry_run=true` từ nhánh bản sửa. Biến repo `AI_REVIEW_ENABLED=true` bật các lần chạy có ghi lên PR sau khi nghiệm thu.
- Để thử vòng 2 với một PR lịch sử, đặt `backtest_base` bằng SHA tổ tiên của head. Ca này dùng danh sách vấn đề cũ rỗng. Test tự động bao phủ trường hợp có vấn đề cũ.
