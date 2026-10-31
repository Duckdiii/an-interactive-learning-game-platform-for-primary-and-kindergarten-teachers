# Quyết định: memory và Obsidian

Nguồn: thảo luận với người dùng 2026-10-30 và 2026-10-31.
Cập nhật: 2026-10-31

## Đã chốt

- Memory của subagent dùng trường `memory: project` của Claude Code, file Markdown trong repo, commit lên git.
- Không dùng Mem0, Zep, Letta: quy mô quá nhỏ và mất khả năng xem qua git.
- Kế hoạch: bật thử cho `reviewer`, kèm hook `.claude/hooks/agent-guard.mjs`; đo sau 5 lần review rồi mới mở rộng.
- **Trạng thái:** mới xong hook. `memory` chưa bật, hook chưa gắn vào agent nào; các giai đoạn sau tạm dừng khi chuyển sang làm kho tài liệu.
- Kiến thức dự án để ở wiki này, mở bằng Obsidian. Vault ngoài repo không dùng vì cả nhóm không chia sẻ được.

## Phân biệt

| | Wiki này | Memory của agent | `lessons-inbox.md` |
|---|---|---|---|
| Lưu gì | Kiến thức dự án | Mẫu lỗi lặp lại trong code | Lỗi của phiên chính |
| Ai ghi | Phiên chính | Agent | Phiên chính |
| Ai duyệt | Người dùng qua `git diff` | Người dùng qua `git diff` | Người dùng duyệt từng mục |

## Lưu ý từ tài liệu

- Claude Code chỉ tự nạp 200 dòng đầu hoặc 25 KB đầu của `MEMORY.md`; bật `memory` thì tự bật `Read`, `Write`, `Edit`. Tài liệu không nói quyền ghi giới hạn trong thư mục nhớ.
- Hook thoát mã khác 2 hoặc không khởi động được thì lệnh vẫn chạy, nên khai báo hook phải có `onFailure: block`.
- Chưa thấy nghiên cứu đo memory giúp agent review tốt hơn, cũng chưa thấy số đo độc lập về Obsidian làm memory cho agent.

## Nguồn ngoài (đọc 2026-10-31)

- [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [LLM Wiki của Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [Memory for Autonomous LLM Agents](https://arxiv.org/abs/2603.07670)
- [obsidian-mind](https://github.com/breferrari/obsidian-mind): một phiên không có chỉ dẫn đã không gọi vault lần nào (số do dự án tự báo).

Xem thêm: [[Quyết định về subagent]]
