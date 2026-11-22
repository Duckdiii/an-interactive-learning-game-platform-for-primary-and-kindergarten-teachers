# A2: so `/pstack:interrogate` với subagent `reviewer` (2026-11-14)

Mục tiêu: đo xem công cụ review nào bắt được lỗi đã biết, với chi phí bao nhiêu, trước khi quyết định giữ, thay hay kết hợp (giai đoạn A của kế hoạch harness theo cách Lauren Tan "go deep first").

## Cách làm

- 3 ca có đáp án, mỗi ca là một worktree tên trung tính (`w-k1`, `w-k2`, `w-k3`) chứa diff ở dạng staged, không commit. Đáp án để ngoài repo cho tới khi chấm xong.
- Hai công cụ nhận **cùng** đường dẫn và **cùng** mô tả ý định (dưới), không có gợi ý về lỗi.
- `reviewer`: subagent của repo (`.claude/agents/reviewer.md`), chạy ở phiên chính.
- `/pstack:interrogate`: plugin pstack 0.15.36 (`cursor/plugins`), chạy ở phiên mới. Mỗi ca 2 adversary (Opus xhigh và model của phiên); ghế Grok mặc định không chạy được trong Claude Code nên thay bằng model phiên, tức **cả hai đều là Claude**. Nó tự chạy lại lệnh của mọi phát hiện trước khi giữ.

| Ca | Nguồn | Ý định đưa cho công cụ |
|---|---|---|
| w-k1 | Bản sửa đầu của hook ở PR #42 (nền `874eb21`) | Sửa hook pre-commit để gitleaks không nuốt lỗi khi stage `.docx` trên Windows: đặt `GIT_ATTR_NOSYSTEM` cho riêng lệnh gitleaks và chặn khi gitleaks exit khác 0 hoặc ghi log mức ERR. |
| w-k2 | Commit `bfaacb0` (test luồng giáo viên; CI của PR #37 đỏ vì nó) | Thêm test luồng giáo viên qua HTTP với AI giả, chạy được trên CI và ghi bằng chứng từng bước; thêm script verify-flow và FEATURE-MAP. |
| w-k3 | Commit `4c70229` (ghim action CI), ca đối chứng sạch | Nâng các action trong `ci-pr.yml` lên bản hiện hành, ghim bằng SHA, để hết cảnh báo lỗi thời; không đổi hành vi. |

## Đáp án

- **w-k1, CAO:** regex `(^|[^A-Za-z])ERR(...)` không bao giờ khớp output thật vì gitleaks in mã màu ANSI (`\033[31mERR`, ký tự trước `ERR` là `m`) kể cả khi gom vào biến, nên nhánh chặn theo ERR vô hiệu. Phụ (TRUNG BÌNH): có thể bắt nhầm chữ ERR đứng riêng trong output.
- **w-k2, CAO:** job backend của CI truyền secret `OPENAI_API_KEY`; test chỉ đặt `app.moderation.required=false` (không ngăn gọi API khi có key) nên Layer 3 gọi OpenAI Moderation thật; key sai thì 504, CI đỏ.
- **w-k3:** không có lỗi đã biết; báo CAO hay TRUNG BÌNH là báo nhầm.

## Kết quả

| Ca | `reviewer` | `/pstack:interrogate` |
|---|---|---|
| w-k1 | **Bắt được** lỗi CAO (tự chạy gitleaks thật, `cat -v` thấy mã màu, chỉ `pre-commit:26-35`); sót ý phụ | **Bắt được** lỗi CAO (cả 2 adversary; tái hiện bằng repo nháp có `*.docx diff=astextplain` cấp repo: 3 dòng ERR, `no leaks found`, hook exit 0, key AWS giả lọt). **Thêm 1 lỗi thật ngoài đáp án**: `GIT_ATTR_NOSYSTEM=1` làm mất textconv cho `.odt` (hook cũ `scanned ~53 bytes`, `leaks found: 1`; hook mới `scanned ~0 bytes`, exit 0) |
| w-k2 | **Bỏ sót** lỗi CAO; báo 1 TRUNG BÌNH thật khác (FEATURE-MAP nói có artifact mà workflow lúc đó chưa có bước upload) | **Bắt được** lỗi CAO (server giả thay OpenAI nhận 3 lần `POST /v1/moderations` có `Bearer`). **Thêm 1 lỗi thật ngoài đáp án**: AI giả trả "con gà" mỗi khi `revision() != null` mà không đọc instruction, nên mutant đổi instruction thành `"x"` và bỏ history vẫn qua (`Tests run: 2, Failures: 0`). Còn: artifact, FEATURE-MAP ghi lập "tại `2af3f0e`" nhưng dẫn file không có ở commit đó, `--live` chỉ đọc `process.env.GEMINI_API_KEY` |
| w-k3 | 0 phát hiện, **0 báo nhầm** (tự kiểm 5 SHA bằng `git ls-remote`) | 0 mục act on, **0 báo nhầm** mức CAO/TB; Consider: setup-java v6.2.0 thêm `-ntp` vào `MAVEN_ARGS` (log mất dòng tải artifact, pass/fail không đổi); 3 bản ghim chưa phải mới nhất |
| **Tổng lỗi CAO đã biết** | **1/2** | **2/2** |
| Lỗi thật ngoài đáp án | 1 (TRUNG BÌNH, k2) | 3 trở lên (`.odt`, mutant revise, `-ntp`, cùng vài sai lệch tài liệu) |
| Báo nhầm ở ca sạch | 0 | 0 |
| Thời gian | khoảng 2,2 phút (47 s + 44 s + 41 s) | khoảng 25 phút (21:25 → 21:50) |
| Token | 121,4k (35,2k + 48,9k + 37,3k) | không đo được (6 subagent, 1 adversary Opus xhigh mỗi ca) |

## Kết luận

- `interrogate` bắt được nhiều hơn rõ rệt (2/2 lỗi CAO, cộng nhiều lỗi thật ngoài đáp án) vì **chạy lại để chứng minh** từng phát hiện và dám dựng môi trường giả (server OpenAI giả, repo nháp, mutant). `reviewer` mạnh với lỗi nằm gọn trong diff, yếu với lỗi cần ghép thông tin ngoài diff (ở w-k2: phải biết `ci-pr.yml` truyền secret).
- Đổi lại, `interrogate` chậm khoảng **11 lần** và tốn hơn nhiều. Không ca nào có báo nhầm, nên độ chính xác của cả hai đều tốt; khác biệt nằm ở **độ phủ**.
- Hạn chế của phép đo: chỉ 3 ca, mỗi công cụ chạy một lần; ghế "khác họ model" của `interrogate` bị thay bằng Claude nên chưa đo được lợi ích review chéo họ model.

**Đề xuất (chờ người dùng quyết):** giữ `reviewer` cho PR thường; dùng `/pstack:interrogate` cho PR rủi ro cao (hook, CI, bảo mật, hạ tầng test, luồng sinh game). Các lỗi `interrogate` tìm ra được đưa vào bộ ca của A1 để đo lại `reviewer` sau khi sửa prompt.

## Lỗi thật mới phát hiện trên `dev`

- **`.githooks/pre-commit:26`**: `GIT_ATTR_NOSYSTEM=1` (thêm ở PR #42) làm git bỏ `astextplain` cho `.odt`, `.ods`, `.docx`, `.pdf` (đã kiểm bằng `git check-attr diff`: hệ thống là `astextplain`, có `GIT_ATTR_NOSYSTEM` là `unspecified`), nên hook không còn đọc nội dung chữ của các file này trên Windows. CI trên Linux vốn không có textconv nên hành vi mới trùng CI. Ghi ở KNOWN-GAPS #15.
- **`FakeAiConfiguration.java:26`**: AI giả ở nhánh revise không phụ thuộc instruction, nên test luồng không bắt được lỗi làm mất yêu cầu của giáo viên khi sửa game. Ghi ở KNOWN-GAPS #16.
- Nhỏ, chỉ ghi nhận: `FEATURE-MAP.md:3` ghi lập "tại `2af3f0e`" nhưng dẫn `CurriculumReviewStatus.java` (thêm sau commit đó); `scripts/verify-flow.mjs:20` (`--live`) chỉ kiểm `process.env.GEMINI_API_KEY`, không đọc `backend/.env`; setup-java v6.2.0 thêm `-ntp`.
