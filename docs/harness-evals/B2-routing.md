# B2: bỏ subagent trùng việc với máy khỏi bảng định tuyến (2026-11-15)

Mục tiêu: bảng định tuyến trong `CLAUDE.md` chỉ gọi agent cho việc cần phán đoán. Không xoá file agent. Luật nào chưa có script chặn thì giữ agent cho luật đó.

## Luật → thứ đang chặn

| Agent | Luật | Chặn bởi | Còn cần agent? |
|---|---|---|---|
| `pre-commit-checker` | Tên file cấm: `.env*` (trừ `.example`), `application-local.yml`, `*.pem/.key/.p12/.jks`, `target/`, `node_modules/`, `dist/` | `scripts/hooks/check-config.mjs` (hook với file đã stage, CI với `--tracked`) | Không |
| | `*.log` | `.gitignore:40` | Không (trừ `git add -f`) |
| | Secret entropy cao (khoá API, token) | gitleaks (hook nếu máy đã cài, CI luôn chạy) | Chỉ khi máy chưa cài gitleaks |
| | Mật khẩu/secret chữ cố định trong file cấu hình, connection string có mật khẩu | **Mới:** `check-config.mjs` (gitleaks bỏ sót mật khẩu yếu, xem dưới) | Không |
| | Secret trong code nguồn có entropy thấp | (chưa có; `check-config` chỉ đọc file cấu hình) | `reviewer` mục An toàn khi review code |
| | Tắt kiểm duyệt trong file dùng chung, `OPENAI_API_KEY` có giá trị trong `.env.example`, `:6543`, `maximum-pool-size` khác 5 | `check-config.mjs` | Không |
| | `ddl-auto` khác `validate`, sửa/xoá migration cũ | `scripts/db/check-migrations.mjs` (CI) | Không |
| | File lớn bất thường | (chưa có) | **Có**: khi thêm file nhị phân/lớn |
| | Lệnh in gỡ lỗi để quên (THẤP) | (chưa có) | **Chuyển sang** `reviewer` (thêm vào mục An toàn của `reviewer.md`) |
| `migration-checker` | Không sửa/xoá/đổi tên migration đã có, tên `V<n>__mo_ta.sql`, version không trùng và lớn hơn base, `ddl-auto: validate` | `check-migrations.mjs` (CI) | Không |
| | Entity khớp migration, quy ước JOINED, an toàn dữ liệu (DROP, NOT NULL không DEFAULT), trùng version giữa hai nhánh đang mở | (chưa có) | **Có**: khi đổi migration hoặc entity |
| `log-auditor` | STT, số cột, ngày, phiên bản công cụ, mức độ, câu "không có lỗi", định dạng SHA | `scripts/ai-log/check-ai-usage-log.mjs` (CI) | Không |
| | SHA có thật, Phạm vi khớp `git show --stat`, nội dung 5 mục đúng yêu cầu của user, cột lỗi chỉ ghi lỗi của AI | (chưa có; ứng viên tầng 2: kiểm SHA có thật, xem `docs/corrections.md` 2026-11-15) | **Có**: khi thêm/sửa dòng log |

Bằng chứng script chặn thật (chạy ngày 2026-11-15 trên nhánh `chore/routing-b2`, vi phạm có chủ đích rồi hoàn tác):
- `check-migrations.mjs`: sửa `V1__enable_extensions.sql` và đổi `ddl-auto: update` → hai dòng `[CHẶN]`, exit 1; hoàn tác → "hợp lệ", exit 0.
- `check-config.mjs`: stage `.env.local` và một yml có `:6543`, `maximum-pool-size: 10`, `moderation.required: false` → bốn dòng `[CHẶN]`, exit 1; bỏ stage → exit 0.
- gitleaks 8.30.1 (rule mặc định, repo không có `.gitleaks.toml`): bắt mật khẩu ngẫu nhiên 12 ký tự chữ-số lẫn hoa thường (rule `generic-api-key`) nhưng **"no leaks found"** với `password: hocsinh2026` và `postgresql://postgres:hocsinh2026@db…`. Vì vậy thêm hai luật vào `check-config.mjs`; test mới đỏ trước khi thêm luật, xanh sau (5/5), và `check-config --tracked` trên cả repo không báo nhầm (đã loại chỗ điền mẫu `<...>` và quyền workflow `id-token: write`).
- Hook chặn khi gitleaks thấy secret hoặc báo dòng ERR: logic ở `.githooks/pre-commit`, kiểm ở PR #41, #42.

`reviewer` (chạy trên diff này) tìm ra hai lỗ trong bản đầu: `check-config.mjs` không tham số chỉ đọc phần đã stage nên chạy lúc chưa stage là "sạch giả"; và luật mật khẩu chữ cố định mất người chặn. Cả hai đã sửa ở trên.

## Thay đổi bảng định tuyến

| Trước | Sau |
|---|---|
| Mọi commit → `pre-commit-checker` | Hook và CI; agent chỉ khi thêm file nhị phân/lớn, sửa `.gitignore`, hoặc máy chưa có gitleaks |
| `db/migration/`, `entity/`, `application*.yml` → `migration-checker` | Bỏ `application*.yml` (`ddl-auto` do script, `:6543`/pool/mật khẩu do `check-config`); agent chỉ còn phần entity và an toàn dữ liệu |
| `ai-usage-log.md` → `log-auditor` | Giữ, agent chỉ còn phần đối chiếu với git; định dạng lấy từ checker |

Số agent bắt buộc cho một commit chỉ sửa code thường: 3 (`reviewer`, `test-verifier`, `pre-commit-checker`) → 2.

## Hạn chế

- Hook chỉ chạy `check-config` và gitleaks; `check-migrations` và checker log chỉ chạy ở CI, nên lỗi migration hay định dạng log lộ ra khi đẩy PR, không phải lúc commit.
- Agent sửa xong chỉ có hiệu lực ở phiên Claude Code mới.
