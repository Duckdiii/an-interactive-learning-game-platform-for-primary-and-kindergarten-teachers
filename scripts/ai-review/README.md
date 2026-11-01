# AI Review Tooling

Hệ thống rà soát mã nguồn tự động hỗ trợ bởi AI, tích hợp cùng GitHub Actions (`.github/workflows/ai-review.yml`). Hệ thống đối chiếu các thay đổi trong Pull Request với đặc tả yêu cầu phần mềm (SRS), kiểm tra tính đúng đắn của logic, phát hiện lỗ hổng bảo mật và định dạng nhận xét inline/tổng kết trên PR.

## Cấu trúc thư mục và mô-đun

- `precheck.mjs`: Kiểm tra điều kiện tiên quyết trước khi gọi AI (bỏ qua PR từ bot như Dependabot, PR chỉ sửa tài liệu, kiểm tra dung lượng diff và giới hạn số lần chạy tự động).
- `prepare-run.mjs`: Chuẩn bị ngữ cảnh chạy, xác định commit base, head và số vòng review.
- `diff.mjs`: Bộ phân tích (parser) git diff, đánh số thứ tự dòng thêm mới và ngữ cảnh theo commit mới để ghim nhận xét chính xác.
- `extract-srs.mjs`: Trích xuất từng Use Case (UC-01 .. UC-15) và phi chức năng (NFR) từ file `docs/SRS.docx` thành các file markdown trong `docs/srs/`.
- `extract-uc.mjs`: Đọc và nhận diện mã UC/FR từ mô tả Pull Request hoặc tự động suy luận để đưa phạm vi đặc tả phù hợp vào prompt.
- `docx-to-markdown.mjs`: Tiện ích chuyển đổi tài liệu Word (.docx) sang định dạng Markdown chuẩn.
- `sanitize.mjs`: Làm sạch dữ liệu trước khi gửi và lưu (che giấu secret, token JWT, private key, chuẩn hóa cú pháp markdown/HTML an toàn).
- `plan.mjs`: Dựng prompt gửi tới mô hình AI, đính kèm diff đã làm sạch và phần đặc tả SRS liên quan.
- `schema-validate.mjs`: Kiểm tra tính hợp lệ của cấu trúc JSON phản hồi từ AI so với schema định nghĩa trước.
- `state.mjs`: Quản lý trạng thái review qua các lần chạy (tracking các vấn đề còn mở, nhận xét đã sửa, hạn chế trùng lặp).
- `post.mjs`: Định dạng và đăng nhận xét tổng kết (summary comment) cùng các inline comment lên Pull Request qua GitHub API; sử dụng fingerprint để tránh đăng lặp.
- `usage-summary.mjs`: Thống kê token và chi phí thực thi mỗi phiên review.

## Kiểm thử hệ thống

Bộ kiểm thử được viết hoàn toàn bằng test runner chuẩn của Node.js (`node:test`):

```bash
node --test "scripts/ai-review/*.test.mjs"
```

Tất cả các kịch bản kiểm thử (bao gồm parser diff, sanitize secret, đối chiếu SRS, fingerprint trùng lặp, logic bảo mật workflow) cần được đảm bảo vượt qua thành công trước khi cập nhật mã nguồn trong thư mục này.
