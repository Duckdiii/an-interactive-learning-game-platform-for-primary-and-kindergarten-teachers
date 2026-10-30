# Quyết định: cách dùng subagent

Nguồn: thảo luận với người dùng 2026-10-30; quy tắc hiện hành ở `CLAUDE.md`, mục Subagent.
Cập nhật: 2026-10-31

## Đã chốt

- Phiên chính viết code; subagent đọc, chạy và kiểm tra.
- Chỉ giao agent cài đặt khi có spec đầy đủ hoặc các phần thật sự độc lập.
- Người viết không tự xác nhận: code phiên chính viết vẫn qua `reviewer`, chỉ đưa diff và tiêu chí.
- Bảng định tuyến chia hai mức: luôn chạy, và chạy khi đụng phần liên quan.
- Bản giao việc phải có quyết định đã chốt, tiêu chí kiểm được, chỗ phải dừng hỏi.
- Không làm script thay `log-auditor`: người dùng quyết định bỏ.

## Vì sao

Tài liệu Anthropic (đọc 2026-10-30) cho rằng chia theo vai trò dễ mất context ở mỗi lần bàn giao, còn kiểm tra độc lập cần ít context. Cognition cũng kết luận mô hình một agent ghi, các agent khác phân tích là hiệu quả.

Dữ liệu của repo: đếm thô từ `ai-usage-log.md` cho thấy `reviewer` có nhiều phát hiện nhất. Đây là ước lượng từ log do AI viết, không phải phép đo.

## Bằng chứng trong dự án

- Chạy thử prompt mới của `reviewer` tìm ra regex mất dấu gạch ngược ở test P4, lỗi mà các lần review trước bỏ sót.
- `reviewer` tìm ra 2 lỗi mức Cao ở hook `agent-guard` trong khi test của người viết xanh hết.

## Nguồn ngoài

- [Building multi-agent systems](https://www.claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them)
- [How and when to use subagents](https://claude.com/blog/how-and-when-to-use-subagents-in-claude-code)
- [Multi-Agents: What's Actually Working](https://cognition.com/blog/multi-agents-working)

Xem thêm: [[quyet-dinh-memory]]
