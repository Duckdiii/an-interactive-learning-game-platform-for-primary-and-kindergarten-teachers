# AI review trên CI

Nguồn: `docs/ai-auto-review.md` (bản 4.6, 2026-10-08), `.github/ai-review/README.md`, `.github/ai-review/prompt.md`.
Cập nhật: 2026-10-31

Hệ thống review code tự động trên pull request. Trang này chỉ giúp định hướng; chưa đọc hết các mục 2–10 của nguồn. Bản đầy đủ: [[ai-auto-review]].

## Những điều cần nhớ

- Hai job tách biệt: `analyze` chỉ đọc và có AI, `post` có quyền ghi và không có AI.
- AI chỉ góp ý, không chặn merge.
- Giới hạn 5 lần tự động mỗi PR, có vòng 2 khi có commit mới.
- Không đưa ví dụ lỗi vào `prompt.md`.
- Chọn UC theo khai báo trong PR, đọc `docs/srs/UC-xx.md` tương ứng.
- Quyết định: `docs/SRS.docx` là bản gốc, `docs/srs/` sinh tự động.

## Liên quan tới đề tài

Nguồn có thiết kế thực nghiệm giai đoạn B: từ 30 lỗi bơm, khoảng 45 lượt chạy. Đây là thiết kế, **chưa phải kết quả đo**. Nguồn cũng liệt kê các điểm chưa kiểm chứng ở mục 12.

Không chuyển `docs/srs/` đi nơi khác, vì workflow đang dùng đường dẫn này.

Xem thêm: [[Quyết định về subagent]]
