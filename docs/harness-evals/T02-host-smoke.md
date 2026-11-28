# T02 — CLI thực tế, 2026-11-16

Trạng thái nghiệm thu T02 gốc: **BLOCKED phần Claude**; phần Codex cốt lõi đã có bằng chứng mới đạt sau lần tiếp tục 2026-11-16. Không đánh dấu hoàn tất nghiệm thu cả hai host. Phạm vi là người phát triển/agent dùng được quy ước và guard trên host thật; không sửa sản phẩm, nâng quyền hay tự cấp trust.

## Cập nhật sau gián đoạn — Codex

Không sửa trust hoặc cấu hình cá nhân. Fresh hooks/list hiện trả `trusted` cho đúng hai hash gate/rotate đã được người dùng duyệt trước đó; binary vẫn 0.169.0-alpha.11.1, model gpt-6.1-sol, shell read-only và Windows package context giữ nguyên.

- **Guard live PASS:** `t02-resume-hook-live.{input.json,jsonl,reply.txt,process.json}`: allowed control in marker và exit0; command dài bị router báo `Command blocked by PreToolUse hook`, không có command_execution thành công/in marker dài. Phiên model exit0 không phải bằng chứng duy nhất; đã đọc tool output và deny thật.
- **Native CLI role PASS trong smoke:** app-server cùng binary tạo parent `01a1e46d-9b80-7692-99ab-09186876a2cd` và child `01a1e46d-f80a-7643-b52a-e2ecfaf2d372`. `thread/read` của chính child này trả agentRole=test-verifier, source=subAgent.thread_spawn; commandExecution trực tiếp chứng minh đọc AGENTS/role UTF8, Git HEAD và status exit0. Parent có subAgentActivity started/completed. Đây đã vượt giới hạn chỉ nghe parent kể ở lần trước; không đọc lịch sử chat không liên quan.
- **Native desktop role PASS:** fresh test-verifier riêng đọc AGENTS, CLAUDE, role và README, kiểm riêng HEAD/status/staged/unstaged/untracked, trả đúng lệnh scripts có explicit base và FAIL/BLOCKED/SKIPPED. Không chạy tests theo brief; không gọi đây là bằng chứng toàn bộ test-verifier luôn đúng.
- **Stop rotate PASS:** `t02-resume-lifecycle.events.jsonl` và `.summary.json` có `hook/completed`, source project, id `stop:2:…/.codex/hooks.json`, status=completed; đối chiếu displayOrder=2 trong hooks/list là rotate. Bảng chưa cần xoay, không ép thêm dòng giả/đụng archive.
- **Giới hạn host còn lại:** Stop thống kê công cụ riêng của người dùng (`stop:3`, lệnh dùng CLAUDE_PROJECT_DIR) failed exit1; plugin agentmemory cũng có thông báo approval riêng. Không tự sửa hoặc trust các hook đó. Kết luận PASS chỉ cho guard/rotate và native smoke cốt lõi, không phải mọi hook/plugin cá nhân hay toàn doctor.
- **Local:** 14 test adapter/shared gate đạt, 0 skip; checker adapter PASS. Claude không được gọi lại.

Bằng chứng kỹ thuật mới ở `backend/target/harness-evidence/t02-resume-*` gồm hooks-list, guard, lifecycle event/parent và child JSON. Các bảng và blocker dưới đây ghi lần kiểm trước, giữ để truy vết; blocker trust/guard cũ đã được giải quyết trong phạm vi Codex ở cập nhật này. Phần Claude vẫn chưa nghiệm thu.

## Yêu cầu và bằng chứng lần kiểm trước

| BR / ca | Kích hoạt → kết quả cần có | Kết quả quan sát |
|---|---|---|
| BR-02 / kết nối | CLI dùng model hợp lệ → nhận phản hồi thật | Codex PASS với binary có sẵn trong ứng dụng, 0.169.0-alpha.11.1, gpt-6.1-sol. Binary npm trong PATH vẫn0.135.0; model cá nhân gpt-5.5 bị tài khoản từ chối. Không thay cấu hình model/PATH toàn máy |
| BR-01,02 / thực thi | Host đọc AGENTS và HEAD qua công cụ thật trong read-only sandbox | PASS khi khởi chạy trong ngữ cảnh gói Windows bằng Invoke-CommandInDesktopPackage. Khởi chạy binary gói trực tiếp từ shell ngoài ngữ cảnh đó bị registered-Core identity rejection; không tắt backend/sandbox để né lỗi |
| BR-01 / vai trò | Native test-verifier ở context mới đọc quy ước, lấy metadata diff, chọn lệnh đúng base | Host báo spawn_agent agent_type=test-verifier, fork_turns=none; child /root/t02_native_role_smoke trả đúng .claude/rules và verify scripts --base afb8f8b58f0be9846b470409bff6fa4e22eba8b5. JSONL có báo cáo parent và wait events, chưa có trực tiếp spawn arguments/child tool transcript; đây là reported smoke, không chứng nhận độc lập toàn bộ child. Không giả vai trò khi spawn thất bại |
| BR-02 / tìm hook | Host phải dùng cấu hình đã review | hooks/list cho thấy source là .codex/hooks.json của checkout gốc D:, không phải file trong linked worktree. Đã sửa đúng hai command ở nguồn thật sau khi người dùng cho phép; giữ nguyên hook/thiết lập khác |
| BR-02 / trust | Hook mới được host ghi nhận trusted, không dùng bypass | **BLOCKED**: người dùng đã báo duyệt trong UI/CLI nhưng fresh hooks/list vẫn trả modified cho hai hash mới. Không sửa .hook-trust hay dùng dangerously-bypass-hook-trust |
| BR-02 / guard live | Node inline ngắn chạy; inline dài vô hại bị PreToolUse từ chối trước thực thi | Chẩn đoán thực tế: cả hai exit0, lần lượt in T02_HOOK_ALLOWED và T02_HOOK_SHOULD_NOT_RUN; **HOOK_NOT_ENFORCED**, chưa có bằng chứng deny trên host. Đây không phải PASS dù CLI/model turn exit0 |
| BR-02 / Claude | Đăng nhập → gọi được model → kiểm role/hook | Đăng nhập PASS sau thao tác của người dùng; model execution BLOCKED: is_error=true, exit1, weekly limit, thông báo hồi21/11 lúc02:00 Asia/Ho_Chi_Minh. Không coi subtype=success là thành công khi is_error=true |

## Cách chạy đã kiểm

Binary Codex được lấy từ package đã cài bằng Get-AppxPackage OpenAI.Codex, không tải binary không rõ nguồn. Chỉ định model có trong catalog của tài khoản. Giữ --sandbox read-only; prompt kỹ thuật gửi qua stdin UTF-8 để tránh lỗi truyền dấu nháy của Windows PowerShell. Không gọi API AI của sản phẩm hay gửi dữ liệu giáo viên.

Trong môi trường hiện tại, đường chẩn đoán Windows cần package identity. Invoke-CommandInDesktopPackage của Windows khởi tạo process có identity của gói, với PreventBreakaway giữ context ở process con. Đây là đường chẩn đoán đã quan sát, không cam kết mọi bản host/Windows đều hoạt động. Không thay Windows sandbox=elevated, registry, service, signed manifest hoặc cấu hình cá nhân. Doctor vẫn báo failure của sandbox helper; không suy ra doctor toàn bộ đã PASS từ một ca thực thi thành công.

Phiên ephemeral không có parent rollout cho spawn mặc định. Ca đầu bị lỗi no rollout; ca sau dùng fork_turns=none theo đúng yêu cầu fresh-context và thành công. Không mở rộng kết quả smoke này thành độ tin cậy tổng quát của agent.

Nguồn chính thức: [Codex hooks và trust](https://developers.openai.com/codex/hooks), [Windows package-context diagnostic](https://learn.microsoft.com/en-us/powershell/module/appx/invoke-commandindesktoppackage?view=windowsserver2025-ps), [Claude authentication](https://code.claude.com/docs/en/authentication). Trường hợp linked-worktree đọc hook từ checkout chính còn được mô tả trong [issue upstream](https://github.com/openai/codex/issues/23996); kết luận ở đây dựa trên hooks/list tại máy này.

## Thay đổi được người dùng cho phép

Chỉ hai trường command trong D:/Data/project/an-interactive-learning-game-platform-for-primary-and-kindergarten-teachers/.codex/hooks.json được đổi: block-node-eval và rotate. Chúng dùng git rev-parse --show-toplevel rồi chạy script tương ứng tại cwd của worktree; giữ nguyên timeout, matcher và hook thống kê khác. Có kiểm SHA trước áp dụng để không ghi đè sửa đổi đồng thời. Bản sao trước sửa và proposal nằm trong evidence; không sửa trust store.

Trong worktree, phần cập nhật là tài liệu/trạng thái/log T02. Không đổi canonical agent prompt, application dependency, DTO/DSL/REST hoặc backend/frontend source. Các config/adapter test là kiểm offline; không dùng kết quả của chúng thay smoke host.

## Truy vết và nơi lưu bằng chứng

BR-01 → native role + AGENTS/.claude → T02 context mới → t02-codex-native-role-fresh.{jsonl,reply.txt,process.json}.

BR-02 → hook source và trust thực tế → T02 → t02-hooks-list.json, t02-primary-hooks.proposal.json, t02-primary-hooks.before.json; guard live → t02-codex-hook-live-stdin.{input.json,jsonl,reply.txt,process.json}. Kết nối/đọc protected runtime → t02-codex-connect-supported.* và t02-codex-packaged.*. Claude quota → t02-claude-connect-stdin.json.

Các file trên ở backend/target/harness-evidence, gitignored. Chỉ dữ liệu tổng hợp/kỹ thuật; không commit raw session/doctor logs hay thông tin xác thực. Scope của receipt chạy lại sau tài liệu T02 là scripts; không tái sử dụng receipt all của mã trước thay đổi này để gọi checkout mới đã kiểm toàn bộ.

## Điều kiện còn phải đóng ở lần kiểm trước

1. Host ghi nhận đúng hai hash mới là trusted bằng luồng review bình thường của người vận hành. Hiện chưa xác định vì sao thao tác được người dùng xác nhận chưa xuất hiện trong fresh host metadata; cần thông báo thực tế từ cửa sổ CLI để phân biệt lỗi mở TUI, khác scope hay lỗi lưu trust. Không tiếp tục hỏi duyệt lặp lại mà không có dữ kiện mới.
2. Chạy lại guard live ở phiên mới: allowed control exit0; lệnh dài phải bị hook deny, không được in marker; kiểm thêm lifecycle Stop bằng evidence host nếu có.
3. Claude chạy được model khi quota hồi hoặc có nguồn truy cập hợp lệ do người dùng cấp, rồi chạy role/hook smoke riêng. Người dùng đã chọn để phần này BLOCKED; không tự mua quota/chuyển tài khoản.

Chỉ đóng T02 khi các ca bắt buộc có bằng chứng tương ứng. Không đổi BLOCKED thành PASS vì đã viết config hoặc người dùng đã thông báo hoàn tất thao tác UI.

Review độc lập T02: không có phát hiện actionable; kiểm byte/hash và semantic diff đúng2 command, hook long marker và trust modified, Claude is_error/quota khớp báo cáo. Giới hạn review: không có đầy đủ child tool transcript trong JSONL, không có trường process exit trong JSON Claude (exit1 được quan sát ở tool gọi ban đầu), không chạy lại full suites. Không mở global transcript/credentials để lấp khoảng trống này.
