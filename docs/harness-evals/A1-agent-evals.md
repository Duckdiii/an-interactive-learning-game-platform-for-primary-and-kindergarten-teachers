# A1: eval "mù" cho subagent `reviewer` và `log-auditor` (2026-11-15)

Tiếp nối Codex ngày17/11: [report mới](agent-eval-codex-2026-11-17.md). Số liệu dưới đây là lịch sử; snapshot draft/log gốc không còn đủ để replay nguyên bản. Report mới phân biệt nguồn commit, ca dựng lại và context/model/phương pháp khác.

Mục tiêu: đo hai subagent dùng nhiều nhất bằng các ca có đáp án, sửa prompt ở chỗ bỏ sót, rồi đo lại (giai đoạn A của kế hoạch harness, "unit test cho agent" theo cách Lauren Tan).

## Cách làm

- **Ca:** mỗi ca là một worktree tên trung tính (`w-k*`, `w-l*`) chứa thay đổi chưa commit. Agent chỉ nhận bản giao việc như khi dùng thật; không có chữ nào nói là đang bị chấm. Đáp án và tiêu chí chỉ đưa cho judge.
- **Chạy:** gọi subagent trong phiên Claude Code (Agent tool). `reviewer` chạy Sonnet, `log-auditor` chạy Haiku (đúng model trong file agent). Lượt 2 dùng `general-purpose` cùng model, đọc file agent đã sửa làm chỉ dẫn (agent chỉ nạp lúc bắt đầu phiên).
- **Chấm:** một agent Opus riêng, khác model với cả hai agent, chấm 0/1/2 theo tiêu chí và ghi riêng khẳng định sai sự thật.
- **Đã thử và bỏ:** `claude plugin eval` (có sẵn trong Claude Code 2.1.314, chấm được cả judge model) từ chối mọi ca cần Bash trên Windows vì không có sandbox ("sandbox required but unavailable"); gọi `claude -p --agent` từ script thì CLI hết phiên đăng nhập. Ghi chú: `plugin eval` mặc định đăng báo cáo lên claude.ai, phải thêm `--no-publish`.

| Ca | Agent | Loại | Nguồn | Lỗi đã biết |
|---|---|---|---|---|
| r-k1 | reviewer | lỗi | bản sửa đầu hook gitleaks (PR #42) | regex `ERR` không khớp output có màu ANSI |
| r-k2 | reviewer | lỗi | `bfaacb0` (test luồng) | CI truyền `OPENAI_API_KEY` nên test gọi OpenAI thật |
| r-k3 | reviewer | sạch | `4c70229` (ghim action) | không có |
| r-k4 | reviewer | lỗi | bản sửa đầu `block-node-eval` (PR #39) | code không nháy nuốt `;node`/`&&node` phía sau |
| r-k5 | reviewer | sạch | `f2b1596` (khoá OpenAI rỗng ở cấu hình test) | không có |
| l-1…l-4 | log-auditor | lỗi | `ai-usage-log.md` trên `dev`, sửa có chủ đích | lệch cột (203), câu "không lỗi" sai chuẩn (203), trùng STT (204 thành 203), SHA không tồn tại (`deadbee`) |
| l-5, l-6 | log-auditor | sạch | không đổi; thêm một dòng 205 hợp lệ | không có |

Checker `check-ai-usage-log.mjs` (tầng 2) tự bắt được l-1, l-2, l-3; không bắt được l-4 vì chỉ kiểm định dạng SHA.

## Kết quả

| Ca | Lượt 1 (prompt cũ) | Lượt 2 (prompt mới) |
|---|---|---|
| r-k1 | 0: không chạy gitleaks, còn khẳng định nhánh ERR hoạt động | **2**: chạy gitleaks thật, thấy `ESC[31mERR` và NOMATCH |
| r-k2 | 0: coi `moderation.required=false` là đủ | **2**: nối `ci-pr.yml:40`, `application.yml`, `ContentSafetyCheck` |
| r-k3 | 1: một TRUNG BÌNH suy đoán (gitleaks-action v3) | **2** |
| r-k4 | 1: thấy lỗ gần đó (`$'...'`, nháy ghép), sót ca không nháy | 0: chỉ thử ca có nháy, kết luận "có thể mở PR" |
| r-k5 | 2 | 1: nâng gợi ý thêm test thành TRUNG BÌNH |
| **reviewer** | **4/10** | **7/10** |
| l-1 | 2, nhưng khẳng định sai "HEAD có 12 ô" | **2**, không khẳng định sai |
| l-2 | 2, nhưng khẳng định sai "STT 202 có 13 ô, vỡ bảng" | **2**, không khẳng định sai |
| l-3 | 2 | (không chạy lại) |
| l-4 | 2 (kiểm bằng `git log`) | **2** (kiểm bằng `git cat-file`) |
| l-5 | 2 | **2** |
| l-6 | 2 | (không chạy lại) |
| **log-auditor** | **12/12, 2 khẳng định sai** | **8/8, 0 khẳng định sai** |

Ở A2 (2026-11-14), `reviewer` với prompt cũ từng bắt được r-k1 vì tự chạy gitleaks dù prompt chỉ cho Bash với lệnh git. Cùng ca, cùng prompt mà lúc bắt lúc không: hành vi "chạy thử để chứng minh" là ngẫu nhiên cho tới khi prompt yêu cầu rõ.

Chi phí (token của từng subagent): `reviewer` lượt 1 khoảng 34k–50k mỗi ca, lượt 2 khoảng 110k–128k (chạy lệnh nhiều hơn; một phần do `general-purpose`); `log-auditor` khoảng 86k–150k mỗi ca ở cả hai lượt; judge khoảng 115k mỗi lượt.

## Đã sửa prompt (`.claude/agents/`)

- **`reviewer.md`:** cho Bash chạy thử để chứng minh (không ghi vào repo, file tạm ngoài repo); thêm bước đọc ngữ cảnh ngoài diff mà thay đổi phụ thuộc (CI, secret truyền vào job, cấu hình, nơi gọi); thêm bước chạy công cụ ngoài thật với ca lỗi để xem output thật (màu ANSI, stderr, mã thoát) và tự thử đầu vào biên; ghi rõ phát hiện nào đã chạy, phát hiện nào suy luận.
- **`log-auditor.md`:** sửa mâu thuẫn cũ (chỉ cho `git log/status/diff` nhưng lại yêu cầu `git cat-file`); bắt chạy `check-ai-usage-log.mjs` trước và lấy lỗi định dạng từ checker, không đếm `|` bằng tay; phần của agent là đối chiếu với git (SHA có thật, `git show --stat` khớp Phạm vi).

## Còn lại

- r-k4 bị sót ở cả hai lượt (lỗi chỉ lộ với code không nháy). Không thêm luật riêng cho ca này để tránh "học tủ"; đây là loại lỗi `/pstack:interrogate` (A2) hợp hơn vì nó dựng mutant và đầu vào đối nghịch.
- **Lỗ thật mới trên `dev`** (r-k4 lượt 1 tìm ra, đã xác nhận lại): `block-node-eval` không chặn `node -e $'a<xuống dòng>…'` (cú pháp nháy `$'...'` của bash), vì `readWord` chỉ nhận nháy ở ký tự đầu. Ghi ở KNOWN-GAPS #17.
- Gợi ý (r-k5 lượt 2): dòng `api-key: ""` trong `application-test.yml` không có test nào khoá lại; chỉ CI có secret mới lộ nếu ai xoá nó.
- Hạn chế: 5 ca cho `reviewer`, 6 ca cho `log-auditor`; lượt 2 chỉ chạy lại 9 ca, mỗi ca một lần; judge cũng là Claude.
