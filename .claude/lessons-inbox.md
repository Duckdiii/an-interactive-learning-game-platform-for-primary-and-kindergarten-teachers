# Hộp bài học (lessons inbox)

Nơi agent ghi **lỗi của chính mình** để người dùng duyệt. Agent chỉ được THÊM mục mới ở phần "Chờ duyệt"; việc chuyển sang `CLAUDE.md`, prompt của agent hay test là do người dùng quyết định (hoặc agent làm sau khi được duyệt).

Chỉ ghi lỗi có tín hiệu rõ: test/build fail do agent gây ra, người dùng sửa lại, subagent kiểm tra báo lệch. Không ghi lỗi nhỏ (typo, format), không ghi thứ đã nằm trong code hay git history. Một lỗi chưa lặp lại và hậu quả nhẹ thì cứ để ở đây; chỉ nâng thành quy tắc khi lặp từ hai lần hoặc hậu quả nặng.

Mẫu một mục:

```
### YYYY-MM-DD — <tên ngắn>
- Lỗi: <điều đã sai, cụ thể>
- Phát hiện nhờ: <test/agent/người dùng>
- Nguyên nhân gốc: <vì sao agent sai>
- Cách chặn: <quy tắc / kiểm tra máy móc / test cần có>
- Trạng thái: CHỜ DUYỆT | ĐÃ ÁP DỤNG (nơi áp dụng) | BỎ QUA (lý do)
```

## Chờ duyệt

(trống)

## Đã xử lý

### 2026-10-11 — Agent kiểm tra diff bỏ sót thay đổi chưa commit
- Lỗi: `contract-guardian` chỉ so `main...HEAD`, nên không thấy sửa đổi chưa commit; cùng mẫu còn ở `migration-checker` (kiểm migration cũ bị sửa) và `doc-syncer`.
- Phát hiện nhờ: agent tự rà lại khi kiểm thử fault injection.
- Nguyên nhân gốc: viết lệnh lấy diff theo trường hợp "đã commit" mà quên trường hợp đang làm dở.
- Cách chặn: mọi agent lấy diff phải gồm `git diff main...HEAD` + `git diff` + `git diff --cached`.
- Trạng thái: ĐÃ ÁP DỤNG (contract-guardian, migration-checker, doc-syncer; quy tắc trong CLAUDE.md).

### 2026-10-11 — Tiêu chí của `log-auditor` viết theo giả định, gây báo nhầm
- Lỗi: prompt ép định dạng "Claude" cho cột công cụ AI, coi tên/Codex của đồng đội là lỗi, đếm tổng sai, sót STT có SHA `TODO`.
- Phát hiện nhờ: chạy thử trên `ai-usage-log.md` thật, kết quả có nhiều báo nhầm.
- Nguyên nhân gốc: viết tiêu chí từ suy đoán, không đọc dữ liệu thật trước.
- Cách chặn: viết tiêu chí kiểm tra từ nội dung file thật, và chạy thử trên dữ liệu thật trước khi coi agent là xong.
- Trạng thái: ĐÃ ÁP DỤNG (prompt `log-auditor` đã sửa; quy tắc trong CLAUDE.md). Chưa chạy lại log-auditor sau khi sửa.

### 2026-10-11 — Giả định có `gh` CLI
- Lỗi: thiết kế `pr-triage` dùng `gh`, nhưng máy không cài `gh`.
- Phát hiện nhờ: lệnh chạy thất bại khi thử.
- Nguyên nhân gốc: giả định môi trường thay vì kiểm tra.
- Cách chặn: dùng công cụ `mcp__github__*`; kiểm tra công cụ có sẵn trước khi đưa vào prompt agent.
- Trạng thái: ĐÃ ÁP DỤNG (`pr-triage`; ghi chú trong CLAUDE.md).

### 2026-10-11 — Gọi agent theo tên ngay trong phiên vừa tạo
- Lỗi: gọi `log-auditor` ngay sau khi tạo file, báo "Agent type not found".
- Phát hiện nhờ: lỗi từ công cụ Agent.
- Nguyên nhân gốc: agent chỉ được nạp lúc bắt đầu phiên.
- Cách chặn: trong phiên vừa tạo agent, thử bằng `general-purpose` kèm thân file agent; chỉ kết luận "gọi được theo tên" ở phiên mới.
- Trạng thái: ĐÃ ÁP DỤNG (ghi chú trong CLAUDE.md).
