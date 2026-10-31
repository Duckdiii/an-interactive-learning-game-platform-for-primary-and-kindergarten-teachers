# Quy tắc của wiki

Vault Obsidian là thư mục `docs/`, cửa vào là [[index]]. Mọi tài liệu mới phải có trong mục lục đó.

Wiki kiến thức của đề tài, theo mẫu [LLM Wiki của Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). Obsidian chỉ là nơi xem, mọi thứ vẫn là file Markdown trong git.

## Ba lớp

- **Nguồn:** file gốc trong repo (`docs/SRS-full.md`, `docs/Dinh_huong_de_tai.md`, `docs/srs/`, `docs/game-json-dsl-v1.0.0.md`, `docs/openapi/openapi.yaml`, `docs/subagents.md`...) và tài liệu ngoài. Wiki không sửa nguồn.
- **Wiki:** các trang trong thư mục này. Phiên chính viết, người dùng duyệt qua `git diff`. Wiki là bản tóm tắt, có thể chậm hơn nguồn: viết code hay test thì đọc nguồn gốc, khác nhau thì tin nguồn. Bảng tra nguồn ở mục Wiki của `CLAUDE.md`.
- **Quy tắc:** file này.

## Ai làm gì

- Phiên chính ghi wiki khi người dùng yêu cầu.
- Subagent chỉ đọc bằng `Read`, bắt đầu từ `index.md`. Không subagent nào ghi wiki.

## Không được đưa vào wiki

- Secret, API key, dữ liệu học sinh.
- Bản chép của contract đã freeze (DSL, REST, WebSocket): chỉ trỏ tới nguồn, vì hai bản sẽ lệch nhau.
- Nội dung lấy từ chính code: đọc code, không ghi lại ở đây.

## Cách viết trang

- Mỗi trang một chủ đề, ngắn, tên file là tiêu đề tiếng Việt có dấu.
- Đầu trang ghi `Nguồn:` và `Cập nhật:` (ngày).
- Liên kết trang khác bằng `[[tên trang]]`. Tên file trùng nhau trong `docs/` thì ghi cả thư mục, ví dụ `[[wiki/README|quy tắc wiki]]`.
- Mỗi cặp backtick chỉ ghi một đường dẫn tài liệu, để lệnh kiểm liên kết đọc đúng.
- Tách rõ điều nguồn nói với nhận định của người viết. Số liệu ngoài phải ghi ai đo và ngày đọc.
- Khi nguồn đổi, sửa trang tương ứng; khi hai nguồn mâu thuẫn, ghi rõ, không tự chọn.

## Ba thao tác

- **Nạp:** đọc một nguồn, viết hoặc sửa trang, cập nhật `index.md`, thêm một dòng vào `log.md`.
- **Hỏi:** đọc `index.md`, mở trang liên quan, trả lời kèm nguồn. Câu trả lời có giá trị lâu dài thì lưu thành trang.
- **Kiểm tra định kỳ:** tìm mâu thuẫn, thông tin cũ, trang mồ côi, ghi kết quả vào `log.md`.
