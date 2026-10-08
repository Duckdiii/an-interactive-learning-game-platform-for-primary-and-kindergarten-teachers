# AI review: prompt và schema

- `prompt.md`: hướng dẫn cho agent. **Dòng đầu là `prompt_version: X.Y.Z`**; tăng số khi đổi nội dung (patch: sửa câu chữ; minor: thêm/bớt tiêu chí; major: đổi định dạng đầu ra).
- `review-result.schema.json`: schema JSON đầu ra, dùng cho `--json-schema` của `claude-code-action` và để script `post` kiểm tra lại. Chỉ dùng từ khóa mà `scripts/ai-review/schema-validate.mjs` hỗ trợ.
- Đổi `category`/`severity`/`mode` trong schema thì phải đổi `prompt.md`; `scripts/ai-review/review-result.test.mjs` kiểm tra hai bên khớp nhau.
- Khi chạy trong CI, các file này được lấy từ **nhánh base** (thư mục `trusted/`), không lấy từ PR. Muốn thử prompt mới trước khi merge, chạy `workflow_dispatch` với `ref` chỉ định.
- **Không đưa ví dụ lỗi cụ thể vào `prompt.md`** (đoạn code lỗi, tên lỗi mẫu của bộ PR thực nghiệm). Làm vậy sẽ thổi phồng recall khi đánh giá. Thiết kế đầy đủ: `docs/ai-auto-review.md`.
- Chạy test: `node --test scripts/ai-review/`.
- **Vòng 2** (PR có commit mới): `prompt.md` mục 8 hướng dẫn agent kiểm tra vấn đề cũ; schema có `round` và `previous_findings`. Đổi trạng thái (`resolved` / `still_present` / `unclear`) thì phải đổi cả hai; test kiểm tra hai bên khớp nhau. `scripts/ai-review/precheck.mjs` quyết định vòng nào chạy.
