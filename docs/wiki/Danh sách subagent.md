# Danh sách subagent

Nguồn: `CLAUDE.md` mục Subagent, `docs/subagents.md`, định nghĩa ở `.claude/agents/`.
Cập nhật: 2026-10-31

Dự án có 18 subagent. Bảng định tuyến và bản giao việc nằm ở `CLAUDE.md`; chi tiết từng agent ở [[subagents]]. Lý do chọn cách dùng này ở [[Quyết định về subagent]].

| Nhóm | Agent |
|---|---|
| Kiểm tra, luôn chạy | `reviewer`, `test-verifier`, `pre-commit-checker` |
| Kiểm tra theo phần liên quan | `backend-architect-reviewer`, `contract-guardian`, `migration-checker`, `security-auditor`, `ai-prompt-evaluator`, `log-auditor`, `pr-triage` |
| Chỉ chạy khi người dùng yêu cầu | `canvas-ux-checker`, `mutation-checker` |
| Khảo sát | `codebase-explorer`, `impact-analyzer` |
| Tài liệu | `doc-syncer` |
| Thực thi | `backend-implementer`, `frontend-implementer`, `test-writer` |

Xem thêm: [[AI review trên CI]], [[Quyết định về memory]]
