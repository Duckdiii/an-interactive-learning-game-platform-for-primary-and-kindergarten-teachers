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
| 1 | | | | | | | | | | |

## Case study lỗi / ảo giác của AI

Chỉ điền khi gặp trường hợp thật. Sao chép khung dưới đây cho mỗi case.

### Case 1: [Tên ngắn gọn của lỗi]

- **Lỗi của AI:**
- **Nguyên nhân & Khắc phục:**
- **Minh chứng Commit SHA:**
