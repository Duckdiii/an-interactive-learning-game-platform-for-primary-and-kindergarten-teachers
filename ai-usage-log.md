# NHẬT KÝ SỬ DỤNG AI (AI USAGE LOG)

> Ghi lại mỗi nội dung/code do AI sinh ra kèm mã commit tương ứng để xem lại và kiểm tra sau này.
> Mỗi lần dùng AI sinh code quan trọng: thêm 1 dòng vào bảng bên dưới **sau khi** đã đọc hiểu, chạy thử/review và commit.

## Quy ước ghi log

- **Mã Commit SHA**: ghi SHA ngắn (7 ký tự) của commit chứa code do AI sinh. Một commit không thể chứa SHA của chính nó, nên cập nhật file log này trong một commit sau đó.
- **Phạm vi / Module**: ghi tên module kèm đường dẫn file chính (ví dụ: `AuthContext` — `frontend/src/context/AuthContext.tsx`).
- **Công cụ AI**: ghi rõ phiên bản model (ví dụ: `Claude Sonnet 5`, không chỉ `Claude`).
- **Mức độ AI đóng góp**: chọn 1 trong `Sinh mới` / `Sửa - refactor` / `Gợi ý`.
- **Kiểm chứng**: ghi ai review và đã kiểm tra bằng cách nào (build, unit test, chạy thử thủ công...).
- Prompt quá dài: chỉ ghi phần chính vào bảng, lưu toàn bộ vào file riêng rồi để link.

## Bảng nhật ký chi tiết

| STT | Ngày | Người thực hiện | Công cụ AI (phiên bản) | Mức độ AI đóng góp | Phạm vi / Module | Câu lệnh chính (Main Prompt) | Mã Commit SHA | Sinh viên tinh chỉnh / Tối ưu | Người review / Cách kiểm chứng | Lỗi / Ảo giác AI & Cách xử lý |
| :---: | :---: | :--- | :--- | :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | 2026-09-25 | TODO | Codex GPT-5 | Sinh mới | Frontend scaffold — `frontend/src/App.tsx` | Dựng khung frontend chạy được, đọc `CLAUDE.md`, tạo routing/layout/context/component nền cho Login/Register/Dashboard/Workspace | 2b17044 | TODO | Agent chạy `npm run lint`, `npm run build`, `npm run dev` và kiểm tra route `/`, `/login`, `/register`, `/dashboard` trả 200 trên bản frontend verify sạch | Ban đầu tạo file context chỉ khác hoa/thường (`AuthContext.tsx`/`authContext.ts`) gây lỗi build trên Windows; đã đổi sang `authContextObject.ts`. `node_modules` thật bị Windows khóa thư mục generated `axios`, nên kiểm chứng bằng bản copy sạch. |
| 2 | 2026-09-25 | TODO | Codex GPT-5 | Sinh mới | Token refresh interceptor — `frontend/src/api/axiosInstance.ts` | Tự gắn access token, single-flight refresh khi nhiều request cùng 401, retry một lần và xóa session khi refresh thất bại | 2b17044 | TODO | Agent chạy `npm run lint`, `npm run build` và smoke test bằng Axios adapter: request đơn, 3 request đồng thời, refresh thất bại đều đạt (3/3) | Queue mẫu ban đầu chỉ có callback thành công, có thể làm request chờ treo khi refresh thất bại; đã bổ sung cả nhánh resolve/reject và đánh dấu `_retry` trước khi xếp hàng. |
| 3 | 2026-09-25 | TODO | Codex GPT-5 | Sinh mới | Auth pages và Teacher Dashboard — `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/RegisterPage.tsx`, `frontend/src/pages/Dashboard.tsx` | Dựng form login/register gọi REST API, ProtectedRoute và Dashboard tải/filter GameSummary | 2b17044 | TODO | Agent chạy `npm run lint`, `npm run build` và Axios adapter smoke test cho register/login/games đạt 3/3 | Khi rà luồng phát hiện 401 từ login có thể bị refresh interceptor bắt nhầm nếu còn token cũ; đã loại login/register khỏi Bearer và refresh flow. |

## Case study lỗi / ảo giác của AI

Chỉ điền khi gặp trường hợp thật. Sao chép khung dưới đây cho mỗi case.

### Case 1: [Tên ngắn gọn của lỗi]

- **Lỗi của AI:**
- **Nguyên nhân & Khắc phục:**
- **Minh chứng Commit SHA:**
