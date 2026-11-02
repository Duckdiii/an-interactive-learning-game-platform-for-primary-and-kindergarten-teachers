# Hệ thống Auto Review Code bằng AI

> **Phiên bản tài liệu:** 4.6 (sửa lỗi bước `boot` gặp ở lần chạy thật đầu tiên) · **Cập nhật:** 2026-10-08 · **Nhánh:** `duy/ai-auto-review`
>
> **Trạng thái:** phần code, prompt, schema, template và test đã viết xong (**203 test đạt**, khoảng 3.200 dòng script và test). **Workflow mới được chạy trên GitHub thật một lần** (PR đầu tiên) và lộ ra một lỗi ở bước `boot` (đã sửa, xem dưới); các điểm còn lại chưa kiểm chứng được đánh dấu **[cần kiểm chứng]**; xem mục 12. Chưa có review độc lập cho `post.mjs`, `precheck.mjs` và workflow.
>
> **Cách đọc:** muốn hiểu nhanh thì đọc mục 1-3 và mục 12. Muốn cài hoặc sửa thì đọc mục 4-9. Muốn làm thực nghiệm cho đề tài thì đọc mục 10-11. Mục 16 giải thích các thuật ngữ.
>
> **Thay đổi ở bản 4.6 so với 4.5:** lần chạy thật đầu tiên (PR đưa hệ thống vào `main`) làm job `analyze` **đỏ** ở bước `boot`, đúng ca bước này sinh ra để xử lý. Nguyên nhân: GitHub chạy `run` bằng `bash -e`, và phép gán `err=$(gh api …)` trả mã lỗi khi file chưa có (404) nên script thoát ngay, trước khi kịp phân biệt 404. Đã sửa (`set +e` và `|| rc=$?`). Bài học: test chỉ so khớp chữ không bắt được lỗi này, nên đã thêm test **chạy thật** đoạn lệnh của bước `boot` bằng `bash -e` với hàm `gh` giả (bốn ca: 404, 5xx, đủ file, dependabot).
>
> **Thay đổi ở bản 4.5 so với 4.4** (CodeRabbit review PR đầu tiên, đã đối chiếu từng nhận xét với code):
>
> - **Tác giả PR thay cho người kích hoạt:** loại PR của dependabot theo `pull_request.user.login` (với sự kiện `labeled`, `github.actor` là người gắn label); chạy tay cũng kiểm tra tác giả ở bước `ctx` và `boot`.
> - **`boot` phân biệt 404 với lỗi khác:** chỉ 404 mới là "nhánh base chưa có hệ thống"; lỗi xác thực, giới hạn tốc độ hay 5xx làm job thất bại để chạy lại, không bị hiểu nhầm.
> - **Chạy thật bằng `workflow_dispatch` chỉ từ nhánh mặc định:** từ nhánh khác chỉ được `dry_run` (vì chạy tay dùng script từ chính ref được chọn).
> - **`post` từ chối kết quả không khớp đầu vào của job `analyze`:** `mode` và `prompt_version` phải khớp, và trạng thái trong comment (số lần chạy, mốc commit ở vòng 2) không được đổi từ lúc phân tích.
> - **Mọi lần chạy có ghi lên PR dùng chung một nhóm `concurrency`** (kể cả chạy tay với `dry_run=false`); chỉ `dry_run` mới có nhóm riêng.
> - **Sửa lỗi `escCell`** trong `docx-to-markdown.mjs`: ký tự `|` trong ô bảng không được escape (lỗi của tôi do lệnh shell làm mất dấu `\`). SRS hiện tại không có ô nào chứa `|` nên bản trích không đổi, nhưng đã có test.
>
> Các thay đổi ở bản 4.4 (so với 4.3):
>
> **Thay đổi ở bản 4.4 so với 4.3:** thêm bước `boot` ở đầu job `analyze`: nếu nhánh base **chưa có** hệ thống (thiếu `precheck.mjs`, `prompt.md` hoặc schema) thì **bỏ qua nhẹ nhàng** với một dòng giải thích trong job summary, thay vì báo lỗi đỏ. Nhờ vậy chính PR đầu tiên đưa hệ thống vào `main` không hiện dấu đỏ gây nhầm.
>
> **Thay đổi ở bản 4.3 so với 4.2: hướng giải quyết bằng lời** (theo góp ý của một thành viên nhóm: nhóm có thể có BA không đọc được code, và gợi ý bằng code tốn token):
>
> - **`fix` đổi thành "hướng giải quyết bằng lời"** (1-2 câu, tối đa 400 ký tự, không viết code). Code tự bỏ mọi khối code agent lỡ viết. **Bắt buộc với `blocker` và `major`**: thiếu thì comment ghi "(AI chưa đưa ra hướng giải quyết)" và được đếm trong thống kê. Prompt lên **2.1.0**.
> - **Hướng giải quyết luôn hiển thị**, kể cả với nhận xét không gắn dòng (trước đây `fix` bị mất ở các nhận xét nằm trong tổng kết) và với vấn đề cũ ở vòng 2.
> - **Mục "Bước tiếp theo"** trong comment tổng kết do **code sinh** từ vấn đề còn mở (tối đa 10 mục, xếp blocker → major → minor), không tốn token.
> - **Trường `impact`** (tùy chọn): một câu tác động bằng ngôn ngữ thường cho `blocker`/`major`, để người không phải lập trình viên hiểu vì sao đáng sửa.
>
> Các thay đổi ở bản 4.2 (so với 4.1):
>
> - **Tự chạy khi có commit mới** (`synchronize`): chờ 3 phút để gom push liền nhau, rồi bước `precheck.mjs` ở **đầu job 1** quyết định *trước khi tốn token*: bỏ qua / vòng 2 / review toàn bộ (mục 5.5, 8).
> - **Vòng 2**: agent nhận danh sách vấn đề của lần trước và phần thay đổi mới (`ai-review-input/previous.json`, `incremental.diff`), trả trạng thái từng vấn đề cũ (`resolved` / `still_present` / `unclear`, "đã xử lý" bắt buộc có căn cứ) và vấn đề mới. Force-push, rebase, lần đầu, đổi chế độ hoặc đổi prompt lớn thì review toàn bộ.
> - **Trạng thái lưu trong comment tổng kết** (commit đã review, số lần chạy, danh sách vấn đề còn mở), coi là dữ liệu không tin cậy và kiểm tra schema khi đọc (mục 5.5). **Giới hạn 5 lần tự động mỗi PR**; label hoặc chạy tay bỏ qua giới hạn.
> - Prompt lên **2.0.0**, schema thêm `round` và `previous_findings`; phép "bỏ qua nếu đã review commit này" chuyển lên đầu job 1 (trước đây nằm ở job 2, sau khi đã tốn token).
> - Kết luận Đạt/Chưa đạt tính trên **vấn đề còn mở**; nhận xét không gắn dòng không còn bị gộp thành một (fingerprint dùng lời nhận xét).
>
> Các thay đổi ở bản 4.1 (so với 4.0, bản mà Claude AI đã đọc trước đó):
>
> 1. **Review hoàn toàn tự động**: tự chạy khi PR được mở/mở lại/ready, không còn bắt gắn label hay điền UC; label `ai-review` chỉ còn là nút "chạy lại" (mục 8.1). (Ở bản 4.1 push thêm commit không tự chạy lại; bản 4.2 đã thay bằng vòng 2.)
> 2. **UC tự suy luận** theo ba tầng (`declared` / `inferred` / `none`), có trường `uc_source` trong schema; các quy tắc về `gap`/`suggestion` được **ép bằng code** (`normalizeFindings`), không nhờ agent tự giác (mục 4.5).
> 3. **Đã xóa `claude-review.yml`**; `ai-review.yml` là workflow review duy nhất (mục 2.3).
> 4. **Mô hình đe dọa** nêu rõ phạm vi bảo vệ của `trusted/` (mục 7.2).
> 5. **Chế độ A có thể là "diff + `CLAUDE.md`"** chứ không phải diff thuần; thêm vào danh sách cần kiểm chứng (mục 4.4, 12.2).
> 6. **Fingerprint** thêm thứ tự xuất hiện của dòng, sửa lỗi hai dòng giống hệt nhau (ví dụ hai chỗ `return null;`) bị coi là trùng và mất một nhận xét (mục 5.2). Đã có test và đã kiểm tra test thất bại khi bỏ phần sửa.
> 7. **Bốn nhãn gán nhãn** (`TP_seeded`, `valid_unseeded`, `FP`, `trùng/nit`), quy tắc về lần chạy chưa hoàn thành và gán nhãn mù (mục 11).
> 8. Khi bỏ qua vì đã có kết quả, job summary **ghi rõ lý do** (mục 5.2).
> 9. **`docs/SRS.docx` là bản gốc** của SRS; có test chặn `docs/srs/` lệch khỏi docx (mục 9.3, 15.2).
> 10. PR template gọn lại (bỏ Acceptance Criteria, UC chỉ tùy chọn).

## Mục lục

1. Tóm tắt
2. Bối cảnh: repo đã có gì, và vai trò của từng công cụ
3. Kiến trúc tổng thể
4. Nội dung một lần review
5. Cách đăng kết quả và chống trùng
6. Nguồn tài liệu nạp cho agent
7. Bảo mật
8. Workflow chi tiết
9. Cấu trúc file và script
10. Cách dùng và vận hành
11. Thực nghiệm cho đề tài (giai đoạn B)
12. Trạng thái triển khai và những điểm cần kiểm chứng
13. Lộ trình và việc còn lại
14. Những việc cố ý không làm
15. Rủi ro, hạn chế và quyết định còn mở
16. Thuật ngữ

---

## 1. Tóm tắt

### 1.1. Hệ thống làm gì

Khi một Pull Request (PR) nhắm vào `main` được mở (hoặc chuyển từ draft sang ready), GitHub Actions **tự động** chạy một AI agent để review PR rồi để lại nhận xét ngay trên PR. Tác giả PR không phải điền hay bấm gì thêm. Khác với CodeRabbit, agent này **đọc cả SRS và các hợp đồng đã chốt** của project (Game JSON DSL, OpenAPI), nên bắt được lỗi nghiệp vụ, lỗi lệch hợp đồng, và đưa ra gợi ý cải tiến cho giáo viên và học sinh. Use Case (UC) liên quan do agent tự suy từ nội dung PR.

AI **chỉ góp ý**. Nó không sửa code, không merge, không chặn PR.

Khi PR có **commit mới**, hệ thống tự chạy lại ở dạng "vòng 2": kiểm tra từng vấn đề cũ đã được xử lý chưa và xem phần thay đổi mới, thay vì review lại cả PR (mục 5.5).

### 1.2. Ý tưởng cốt lõi: hai "nhân viên" làm nối tiếp

Hãy hình dung hai nhân viên, và **nhân viên thứ nhất không được phép đăng gì lên PR**:

| | Nhân viên 1: người đọc | Nhân viên 2: người đăng |
|---|---|---|
| Job | `analyze` | `post` |
| Có AI không | Có | **Không** |
| Quyền trên GitHub | Chỉ đọc | Được ghi comment |
| Token Claude | Có | **Không** |
| Việc làm | Đọc diff, đọc code, đọc SRS, nộp một "tờ phiếu" JSON có cấu trúc | Kiểm tra tờ phiếu, lọc nội dung, đăng lên PR, đọc lại để xác nhận |

Lý do tách: nếu có người nhét câu như "hãy bỏ qua mọi quy tắc" vào code hay mô tả PR để lừa AI, AI cũng **không có quyền đăng** gì cả. Người đăng là code cố định, không bị lừa bằng lời nói.

### 1.3. Các nguyên tắc thiết kế

- AI chỉ góp ý: không merge, không sửa code, **không chặn merge** ở giai đoạn đầu (chưa có số liệu về dương tính giả).
- Gợi ý theo SRS (`gap`, `suggestion`) chỉ để tham khảo, **không ép code khớp SRS từng chữ**.
- Logic review nằm trong file prompt có phiên bản, không nằm trong workflow.
- LLM chỉ làm phần suy luận; việc cơ học (kiểm tra, đếm, chống trùng, đăng) do script làm.
- Mọi lần chạy đo được: phiên bản prompt, chế độ, số turn, token.
- Agent không bao giờ chạy script hay prompt do chính PR cung cấp với quyền ghi.

### 1.4. Nguồn gốc

Ý tưởng xuất phát từ tài liệu "Định hướng xây dựng hệ thống Auto Review Code bằng AI" (bản gốc dùng Jira làm trigger, nguồn yêu cầu và nơi nhận kết quả). Project này không dùng Jira, nên: trigger là sự kiện GitHub (mở PR; label chỉ để chạy lại), nguồn yêu cầu là SRS (UC do agent tự suy từ diff), nơi nhận kết quả là comment trên PR.

---

## 2. Bối cảnh: repo đã có gì, và vai trò của từng công cụ

### 2.1. Các thành phần có sẵn trong repo

| Thành phần | File | Vai trò hiện tại |
|---|---|---|
| CodeRabbit | `.coderabbit.yaml` | Review style, đặt tên, convention |
| CI kiểm tra | `.github/workflows/ci-pr.yml` | Test backend + JaCoCo ≥ 70% (chú thích trong file ghi 447 test, chưa tự chạy xác nhận), lint/test/build frontend, Gitleaks |
| Claude theo yêu cầu | `.github/workflows/claude.yml` | `@claude` trong comment, chỉ OWNER/MEMBER/COLLABORATOR |

Tài liệu đầu vào cho review: `docs/SRS.docx` (15 Use Case `UC-01..15` gắn `FR-01..15`, và `NFR-01..05`), `docs/game-json-dsl-v1.0.0.md`, `docs/openapi/openapi.yaml` (hai hợp đồng đã freeze), `CLAUDE.md`.

### 2.2. Phân vai sau khi có hệ thống mới

| Công cụ | Lo việc gì |
|---|---|
| CodeRabbit | Style, đặt tên, convention nhỏ |
| `ci-pr.yml` | Test, lint, build, quét secret |
| **AI review (hệ thống này)** | Logic nghiệp vụ, bảo mật, `@Transactional`, N+1, xử lý exception, kiến trúc đã chốt (Strategy / Chain / Factory, JOINED), lệch DSL/OpenAPI, UX cho trẻ nhỏ, **đối chiếu SRS** |
| `@claude` | Trao đổi qua lại trong PR |

AI review **không nhận xét style và đặt tên** vì CodeRabbit đã lo. Điều này giảm trùng lặp giữa hai bot.

### 2.3. Quan hệ với `claude-review.yml` (đã gỡ)

`ai-review.yml` **thay thế** `claude-review.yml`, và bản cũ đã bị xóa khỏi repo (quyết định ngày 2026-10-08). Bản cũ chạy tự động khi `opened` / `ready_for_review` và để agent tự đăng comment (`--max-turns 8`, xác thực qua Claude GitHub App). Có thể xem lại bằng lịch sử git nếu cần.

Hệ quả cần nhớ: `ai-review.yml` tự chạy khi PR được mở/mở lại/ready hoặc có commit mới, nhưng **chỉ có hiệu lực sau khi merge vào `main`** và **chưa được chạy thử trên GitHub thật**. Trước lúc đó repo không có AI review nào. Nên chạy thử bằng `workflow_dispatch` với `dry_run` ngay sau khi merge.

---

## 3. Kiến trúc tổng thể

### 3.1. Sơ đồ luồng

```
Dev mở PR vào main (không draft)  — hoặc gắn label "ai-review" để chạy lại / workflow_dispatch (dry_run)
        │
        ├─► CodeRabbit ──► style, đặt tên                         [có sẵn, không đổi]
        ├─► ci-pr.yml ───► test, lint, build, Gitleaks            [có sẵn, không đổi]
        │
        └─► ai-review.yml  (mới, thay thế claude-review.yml đã gỡ)
              Bỏ qua: PR draft · PR từ fork · PR của dependabot · PR chỉ đụng .md/docs · label khác ai-review
              PR đã đóng chỉ chạy được khi dry_run

  Cả hai job: checkout nhánh BASE vào thư mục trusted/
              → script, prompt, schema, SRS lấy từ đây (không lấy từ PR)

  ┌─ Job 1: analyze ───────────────────────────────────────────────────────┐
  │ Quyền: contents: read, pull-requests: read (KHÔNG có quyền ghi)         │
  │ github_token tường minh (ép dùng token hạn chế)       [cần kiểm chứng]  │
  │ 1. Xác định PR, SHA đầu PR; lấy mô tả PR                                │
  │ 2. Commit mới: chờ 3 phút gom push; bị commit mới hơn thay thì dừng    │
  │ 3. precheck.mjs: bỏ qua / vòng 2 / review toàn bộ (trước khi tốn token)│
  │ 4. Trích UC khai báo (extract-uc.mjs); dựng prompt (prepare-run.mjs)   │
  │ 5. Agent chỉ đọc (vòng 2: đọc vấn đề cũ + diff phần mới), trả JSON      │
  │ 6. Lưu artifact; ghi turn, token, thời gian vào job summary             │
  └──────────────────────────────┬─────────────────────────────────────────┘
                                 ▼
  ┌─ Job 2: post ──────────────────────────────────────────────────────────┐
  │ Quyền: pull-requests: write. KHÔNG chạy agent, KHÔNG có token Claude    │
  │ Chạy post.mjs (Node, không thư viện) từ trusted/:                       │
  │  1. Kiểm tra schema; từ chối nếu chưa xong / thiếu trường / files rỗng  │
  │  2. So SHA đầu PR: nếu PR có commit mới thì không đăng inline           │
  │  3. Chỉ giữ finding có dòng nằm trong diff (định vị lại nếu agent lệch) │
  │  4. blocker/major → inline (tối đa 8); phần còn lại → comment tổng kết  │
  │  5. Lọc đầu ra: secret, @mention, link lạ, ảnh, HTML                    │
  │  6. Đăng bằng Review API một lần; tổng kết là comment riêng có marker   │
  │  7. Đọc lại để xác nhận đã đăng; không thấy thì job đỏ                  │
  │  8. dry_run: chỉ ghi artifact, không đăng gì                            │
  └────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Vì sao thiết kế như vậy

| Quyết định | Lý do |
|---|---|
| Tách hai job theo quyền | Agent đọc nội dung không tin cậy (diff, mô tả PR) nên không được có quyền ghi |
| Agent trả JSON thay vì tự đăng | Giới hạn số comment, chống trùng, lọc đầu ra đều làm bằng code, không phụ thuộc agent tuân thủ prompt; dữ liệu thống kê khớp 100% với những gì đã đăng |
| Dùng `claude-code-action` thay vì tự viết `claude -p` | Action đã xử lý sandbox, xác thực và công cụ; hỗ trợ `--json-schema` và trả `structured_output` (đã xác nhận qua tài liệu của action) |
| Script và prompt lấy từ nhánh base | Nếu lấy từ PR, tác giả PR sửa được script rồi chạy với quyền ghi |
| Không thêm thư viện | Quy tắc của repo; toàn bộ script dùng Node.js thuần |

---

## 4. Nội dung một lần review

### 4.1. Một nhận xét (finding)

| Trường | Ý nghĩa |
|---|---|
| `id` | `F1`, `F2`...; chỉ duy nhất **trong một lần chạy**, dùng để gán nhãn khi làm thực nghiệm |
| `file`, `line` | Vị trí; `line` là số dòng trên phiên bản **mới** của file, nằm trong diff. `null` nếu không gắn dòng cụ thể |
| `code` | **Nguyên văn** dòng code bị nhận xét (rỗng nếu `line` là `null`). Script đối chiếu với diff và dùng để tính fingerprint |
| `severity` | `blocker` / `major` / `minor` |
| `category` | Xem 4.2 |
| `message` | Nội dung nhận xét bằng tiếng Việt |
| `fix` (bắt buộc với `blocker`/`major`) | **Hướng giải quyết bằng lời**, 1-2 câu: cần làm gì và ở đâu. Không viết code; khối code bị code bỏ tự động |
| `impact` (tùy chọn) | Tác động bằng ngôn ngữ thường, một câu, cho người không phải lập trình viên; có cho `blocker`/`major` |
| `uc` (tùy chọn) | Mã UC/FR/NFR liên quan |

Cấp cao nhất của JSON (schema `.github/ai-review/review-result.schema.json`): `schema_version`, `prompt_version`, `mode`, `status` (`complete` / `incomplete`), `files_reviewed`, `summary`, `conclusion`, `uc_source` (`declared` / `inferred` / `none`), `uc_detected[]`, `findings[]`.

### 4.2. Các loại nhận xét

| Nhóm | `category` | Ý nghĩa |
|---|---|---|
| Lỗi code | `bug` | Sai điều kiện, thiếu xử lý biên/null, race condition, sai logic nghiệp vụ |
| | `security` | Xác thực/phân quyền, lộ secret, injection, dữ liệu nhạy cảm trong log/response |
| | `transaction` | `@Transactional` sai chỗ, thiếu rollback, tự gọi trong cùng class |
| | `n_plus_one` | Truy vấn JPA kém hiệu quả, truy vấn trong vòng lặp |
| | `exception` | Nuốt lỗi, sai mã lỗi/envelope, rò rỉ stack trace |
| | `architecture` | Vi phạm phân lớp hoặc kiến trúc đã chốt trong `CLAUDE.md` |
| | `contract` | Lệch DSL v1.0.0 hoặc `openapi.yaml`; hoặc PR sửa hợp đồng cần người duyệt xác nhận |
| | `ux` | Chỉ code giao diện/Canvas cho trẻ nhỏ (touch target 64px, phản hồi sai nhẹ nhàng, nút nghe lại) |
| Đối chiếu SRS (**chỉ góp ý**) | `gap` | Code thiếu luồng rẽ nhánh hoặc luồng ngoại lệ mà UC đã mô tả rõ |
| | `suggestion` | Cải tiến thực tế cho giáo viên/học sinh mà SRS chưa nêu, hoặc chỗ SRS có vẻ chưa hợp lý |

`gap` và `suggestion` mặc định `minor` (hoặc `major` khi thiếu hẳn một luồng quan trọng), **không bao giờ là `blocker`** và không làm kết luận thành "Chưa đạt".

### 4.3. Mức độ và kết luận

- `blocker`: chắc chắn gây sai kết quả, mất dữ liệu, lỗ hổng bảo mật hoặc phá kiến trúc/hợp đồng đã chốt. Dùng rất hạn chế.
- `major`: lỗi hoặc rủi ro đáng kể nhưng chưa chắc gây hỏng.
- `minor`: cải thiện nhỏ.
- Kết luận **Đạt / Chưa đạt** do **code tính lại** từ các finding (không tin trường agent tự điền): Chưa đạt chỉ khi có ít nhất một `blocker`. Kết luận chỉ mang tính thông tin.

### 4.4. Ba chế độ chạy

| Chế độ | Agent được dùng | Mục đích |
|---|---|---|
| **A** | Diff và mô tả PR (`gh pr view`, `gh pr diff`), **cộng `CLAUDE.md` nếu Claude Code tự nạp** (xem lưu ý dưới) | Mốc cơ sở |
| **B** | A + đọc repo (`Read`, `Grep`, `Glob`) | Đo giá trị của ngữ cảnh code |
| **C** | B + SRS, DSL, OpenAPI | Đo giá trị của SRS; **`gap` chỉ có ở chế độ này** |

Chạy tự động (khi mở PR) hoặc bằng label luôn là chế độ C. Muốn A hoặc B phải chạy tay bằng `workflow_dispatch`.

Khác biệt giữa B và C **chỉ nằm ở prompt** (B không được dùng SRS), vì thư mục repo ở gốc vẫn chứa `docs/srs/`. Do đó `usage-summary.mjs` quét các lần gọi công cụ và **cảnh báo khi chế độ A/B đã truy cập SRS**; lần chạy bị cảnh báo không dùng để so sánh A/B/C.

**Lưu ý: chế độ A có thể không phải "chỉ diff" thuần.** Claude Code thường tự nạp `CLAUDE.md` trong thư mục làm việc, và `claude-code-action` khôi phục `CLAUDE.md`, `.claude/` từ nhánh base. Nếu đúng như vậy thì **mọi chế độ đều biết kiến trúc và quy ước của repo**, nên mốc cơ sở A thực chất là "diff + CLAUDE.md". Điều này **chưa được kiểm chứng** (mục 12.2). Khi báo cáo thực nghiệm phải ghi A là "diff + CLAUDE.md" nếu xác nhận có, hoặc chạy A/B trong một checkout không có `CLAUDE.md`.

### 4.5. UC liên quan được xác định thế nào

Tác giả PR **không bắt buộc làm gì**. UC được xác định theo ba tầng:

| Tầng | Khi nào | `uc_source` | Cách xử lý |
|---|---|---|---|
| 1. Khai báo | Tác giả PR tình cờ điền mã dưới mục tùy chọn "Liên quan UC/FR" của PR template | `declared` | Dùng đúng mã đó; `gap`/`suggestion` không bao giờ là `blocker` |
| 2. Tự suy luận | Không khai báo (trường hợp thường gặp), chế độ C | `inferred` | Agent đọc `docs/srs/FR-summary.md`, chọn tối đa 2 UC mà PR rõ ràng triển khai, nêu căn cứ. **Code ép `gap`/`suggestion` tối đa `minor`** và comment ghi "suy luận tự động, có thể sai" |
| 3. Không đủ chắc | PR hạ tầng, cấu hình, test, refactor; hoặc chế độ A/B | `none` | **Bỏ qua phần đối chiếu SRS**: các `gap`/`suggestion` (nếu agent vẫn nêu) bị code loại bỏ |

Cơ chế khai báo (tầng 1):

- `extract-uc.mjs` trích mã bằng code từ mục "Liên quan UC/FR" (cho phép chữ đi kèm tiêu đề như "(tùy chọn)"). FR-nn quy về UC-nn (SRS ánh xạ 1-1; có test đối chiếu với `docs/srs/FR-summary.md`).
- Bỏ bình luận HTML, nên ví dụ mẫu trong template không bị tính. Chỉ giữ mã có file `docs/srs/UC-nn.md` ở nhánh base; mã lạ (ví dụ `UC-99`) bị tách riêng.
- Mã hợp lệ đi vào prompt qua dòng `UC:`. Mô tả PR là dữ liệu không tin cậy nên agent **không tự suy UC từ chữ trong mô tả PR**; việc tự suy chỉ dựa vào diff và danh mục SRS.

Việc ép quy tắc nằm ở `normalizeFindings` trong `plan.mjs`, không phụ thuộc agent tuân thủ prompt. Độ chính xác của tầng 2 là một số liệu đáng đo trong thực nghiệm (so UC suy luận với UC khai báo trên các PR có khai báo).

`path-to-uc.md` (ánh xạ path code → UC) **không còn dùng** và sẽ không tạo: bảng này phải tự bảo trì và nhanh lỗi thời.

---

## 5. Cách đăng kết quả và chống trùng

### 5.1. Hai nơi đăng

| Nơi | Nội dung |
|---|---|
| **Inline** (Review API, `event: COMMENT`, một lần) | Chỉ `blocker`/`major` có dòng khớp với diff, tối đa **8** nhận xét, ưu tiên blocker rồi major |
| **Comment tổng kết** (issue comment riêng) | Kết luận, tóm tắt, bảng đếm, **"Bước tiếp theo"** (vấn đề còn mở kèm hướng giải quyết, xếp theo mức độ), danh sách inline đã đăng, các nhận xét khác kèm hướng giải quyết và lý do không inline, mục "Đối chiếu SRS (chỉ để tham khảo)", ghi chú |

Một nhận xét **không** được đăng inline sẽ nằm trong comment tổng kết kèm lý do: mức độ nhỏ hoặc gợi ý, không gắn dòng cụ thể, dòng không khớp với diff, vượt giới hạn 8, PR đã có commit mới, hoặc GitHub từ chối vị trí inline.

### 5.2. Chống trùng

- **Fingerprint:** hash của `file` + `category` + nội dung dòng code (đã chuẩn hóa khoảng trắng) + **thứ tự xuất hiện của dòng đó trong diff của file** (để hai dòng giống hệt nhau như hai chỗ `return null;` không bị coi là một nhận xét; có test). Không dùng số dòng (dịch sau push) và không dùng `message` (LLM diễn đạt khác nhau mỗi lần). Script tính, không phải agent.
- **Marker ẩn** trong mỗi inline comment (`<!-- ai-review:fp=... -->`), thêm **sau** khi lọc HTML. Lần sau gặp fingerprint đã có thì không đăng lại.
- **Marker của comment tổng kết** (`<!-- ai-review:summary -->` và `<!-- ai-review:sha=... prompt=... mode=... -->`): đã có thì **cập nhật** comment cũ thay vì tạo mới.
- **Chạy lại cùng commit, cùng version prompt, cùng chế độ** thì bỏ qua; job summary ghi rõ dòng "Bỏ qua: đã có kết quả cho commit này" để người gắn lại label không tưởng hệ thống hỏng (thông báo này chỉ nằm trong tab Actions, không đăng lên PR để tránh nhiễu). Muốn ép chạy lại dùng `workflow_dispatch` với `force`.
- **Chỉ tin marker trong comment do `github-actions[bot]` đăng.** Người khác giả marker không làm mất nhận xét (có test).

### 5.3. Xử lý các tình huống

| Tình huống | Hành vi |
|---|---|
| Dev push thêm commit giữa hai job | `post` so SHA đầu PR hiện tại với SHA đã phân tích; khác nhau thì không đăng inline, tổng kết ghi "kết quả cho commit cũ" |
| Agent nêu sai số dòng nhưng `code` khớp một dòng khác trong diff | Định vị lại về dòng gần nhất khớp |
| `code` không khớp dòng nào | Chuyển vào tổng kết |
| Review API trả 422 (một vị trí sai làm cả request lỗi) | Chuyển mọi nhận xét sang tổng kết kèm lý do, **không** để job đỏ |
| Lỗi khác của GitHub (ví dụ 500) | Báo lỗi, job đỏ |
| Agent trả kết quả rỗng, thiếu trường, `status: incomplete`, hoặc `files_reviewed` rỗng dù PR có thay đổi | **Từ chối đăng**, job đỏ (chống "thành công giả": CI xanh mà không có gì được đăng) |
| Đăng xong nhưng không đọc lại thấy comment tổng kết | Job đỏ |
| Kết quả có `mode` hoặc `prompt_version` khác đầu vào của job `analyze` | **Từ chối đăng**, job đỏ |
| Trạng thái trong comment đã đổi từ lúc phân tích (số lần chạy khác, hoặc mốc commit khác ở vòng 2): lần chạy khác đang ghi cùng lúc | **Không đăng** để tránh ghi đè, job đỏ; chạy lại |
| Diff quá lớn, GitHub từ chối trả diff | Job đỏ (chưa có xử lý riêng) |

### 5.4. Làm sạch nội dung agent trước khi đăng

Nội dung agent sinh ra là **dữ liệu không tin cậy**. `sanitize.mjs` thực hiện:

- Che secret (token GitHub, khóa `sk-...`, `AKIA...`, JWT, private key, `password=...`, `Bearer ...`), kể cả trong khối code.
- Xóa bình luận HTML và thẻ HTML; thay ảnh markdown bằng ghi chú; giữ chữ của liên kết markdown nhưng bỏ URL.
- Bỏ URL ngoài repo (chỉ giữ URL trỏ vào `github.com/<repo>/`).
- Vô hiệu hóa `@mention` (chèn ký tự độ rộng bằng 0), trừ trong code span.
- Giữ nguyên nội dung trong code span và code fence (ví dụ `List<String>`).
- Cắt độ dài; comment tổng kết tối đa khoảng 60.000 ký tự.

### 5.5. Khi PR có commit mới: vòng 2

**Bước `precheck.mjs`** chạy ngay đầu job 1 (trước khi tốn token) và quyết định theo thứ tự:

| Điều kiện | Quyết định |
|---|---|
| Chưa có comment tổng kết của bot (lần đầu, hoặc PR vừa chuyển từ draft sang ready) | Review **toàn bộ** |
| Cùng commit, prompt, chế độ với lần trước (và không `force`) | **Bỏ qua** |
| Chạy tự động mà đã đủ **5** lần (label và chạy tay bỏ qua giới hạn) | **Bỏ qua**, ghi rõ trong job summary |
| Chế độ A, đổi chế độ, đổi prompt phiên bản lớn, cùng commit nhưng prompt đổi, `force` | Review **toàn bộ** |
| Không đọc được danh sách vấn đề lần trước (thiếu, sai schema) | Review **toàn bộ** |
| Commit đã review lần trước không còn trên nhánh (force-push, rebase, squash): so sánh trả 404/422 hoặc không phải `ahead` | Review **toàn bộ** |
| Commit mới không đổi code, hoặc diff phần mới trống | **Bỏ qua** |
| Diff phần mới quá lớn (> 300.000 ký tự) | Review **toàn bộ** |
| Còn lại: có commit mới nằm sau commit đã review | **Vòng 2** |

**Dữ liệu lưu trong comment tổng kết** (marker ẩn, do `state.mjs` ghi và đọc): commit đã review, version prompt, chế độ, số lần chạy, và danh sách vấn đề còn mở (tối đa 40 vấn đề, tối đa 20.000 ký tự, giữ vấn đề nặng trước; mỗi vấn đề gồm file, loại, mức độ, dòng code, nhận xét và hướng giải quyết, đều đã làm sạch). Khi đọc lại, dữ liệu được kiểm tra schema và **chỉ tin comment của bot**; dữ liệu hỏng hoặc bị sửa thì bị bỏ qua và hệ thống quay về review toàn bộ.

**Vòng 2 gửi cho agent:** `ai-review-input/previous.json` (vấn đề cũ, mỗi vấn đề có `ref`), `ai-review-input/incremental.diff` (phần thay đổi từ commit đã review đến commit mới) và quyền đọc repo như chế độ B/C. Cả hai file là dữ liệu không tin cậy. Agent trả `previous_findings` (một mục cho mỗi vấn đề cũ) cùng các vấn đề **mới**.

**Code ép (không nhờ agent tự giác):**

- Báo `resolved` mà không có căn cứ (`evidence` rỗng) thì bị hạ xuống `unclear`.
- Agent bỏ sót một vấn đề cũ thì mặc định là `unclear`, không bao giờ tự coi là đã xử lý.
- `ref` agent bịa ra (không có trong danh sách cũ) bị bỏ qua.
- Agent báo lại vấn đề cũ như thể mới thì không đăng lại và không tính là "mới".
- Danh sách còn mở sau lần này = vấn đề cũ chưa xử lý + vấn đề mới; kết luận Đạt/Chưa đạt và bảng đếm tính trên danh sách này.

**Hiển thị:** comment tổng kết có mục "Vòng 2: kiểm tra vấn đề cũ" (bảng Đã xử lý / Vẫn còn / Chưa rõ / Mới, kèm căn cứ). Chỉ vấn đề **mới** được đăng inline, nên người dùng chỉ nhận thông báo cho nhận xét mới.

**Hạn chế đã biết:** "đã xử lý" là ý kiến của AI; commit mới có thể gây lỗi ở đoạn code không đổi mà vòng 2 bắt kém hơn review toàn bộ; nếu dev merge `main` vào nhánh thì diff phần mới lẫn cả thay đổi của `main`; vấn đề được ghi ở trạng thái "PR đã có commit mới" chỉ nằm trong tổng kết và không bao giờ được gắn lên dòng ở các vòng sau.

---

## 6. Nguồn tài liệu nạp cho agent

| Tài liệu | Lấy từ | Lý do |
|---|---|---|
| `prompt.md`, schema, script, SRS (`docs/srs/`) | **Nhánh base** (thư mục `trusted/`) | PR không tự hạ tiêu chuẩn đối chiếu; SRS đổi qua PR vẫn hiện trong diff và có người duyệt |
| `docs/game-json-dsl-v1.0.0.md`, `docs/openapi/openapi.yaml` | **Cả base và PR** | Quy trình của nhóm là sửa spec rồi mới sửa code, nên PR hợp lệ có thể đổi cả hai. Nếu PR sửa spec: đối chiếu code với spec mới của PR **và** gắn nhận xét `contract` yêu cầu người duyệt xác nhận thay đổi hợp đồng. Chỉ lấy từ base sẽ báo lệch sai ở mọi PR đổi hợp đồng |
| Mã của PR (để đọc ở chế độ B/C) | Checkout PR ở thư mục gốc (`refs/pull/N/merge` cho PR đang mở, `refs/pull/N/head` cho chạy tay) | Agent cần xem code thật |

`workflow_dispatch` dùng `github.sha` (ref đang chạy workflow) làm nguồn `trusted/`, nên muốn thử prompt mới trước khi merge thì chạy workflow từ nhánh đó.

---

## 7. Bảo mật

### 7.1. Các biện pháp

| Biện pháp | Mục đích |
|---|---|
| Agent chỉ đọc; job đăng không có agent và không có token Claude | Agent bị prompt injection cũng không đăng được gì; ranh giới nằm ở token và code |
| Script, prompt, schema, SRS lấy từ nhánh base (`trusted/`) | Action chỉ khôi phục từ base một danh sách cố định (`.claude/`, `CLAUDE.md`, `.mcp.json`...); mọi file khác ở phiên bản PR. Không có biện pháp này, tác giả PR sửa được script rồi chạy với quyền ghi |
| `github_token` tường minh cho job `analyze` | Mặc định action dùng Claude GitHub App (quyền đọc-ghi Contents/PR/Issues) và **không bị giới hạn bởi khối `permissions:`** của workflow **[cần kiểm chứng]** |
| `--allowedTools` hẹp: không `Bash` tự do, không `Write`, không công cụ đăng | Giảm bề mặt tấn công |
| Script coi JSON của agent là dữ liệu không tin cậy | Kiểm tra schema, lọc đầu ra (mục 5.4). Action chỉ làm sạch đầu vào, không làm sạch đầu ra; ảnh markdown có thể rò dữ liệu qua URL |
| Mô tả PR chỉ đi vào prompt qua mã `UC-nn` đã kiểm tra | Mô tả PR là dữ liệu không tin cậy |
| Bỏ qua PR từ fork và PR do `dependabot[bot]` tạo (xét theo tác giả PR, cả khi chạy tay); không dùng `pull_request_target` | Code không tin cậy không chạy cùng secret; dependabot không có secret nên job chỉ đỏ vô ích |
| OAuth token chỉ truyền cho bước agent; job `post` chỉ có `GITHUB_TOKEN` | Tách quyền |
| Pin action theo SHA; `persist-credentials: false` cho mọi checkout; không nội suy `${{ }}` trong khối `run` (dữ liệu đi qua `env`) | Giảm rủi ro chuỗi cung ứng và injection |
| PR đã đóng chỉ chạy được khi `dry_run=true` | Không đăng nhận xét lên PR cũ |
| Chạy thật (`dry_run=false`) bằng `workflow_dispatch` chỉ được từ nhánh mặc định | Chạy tay dùng script từ chính ref được chọn (để thử prompt mới); không có biện pháp này, người có quyền ghi chạy được script tự sửa với quyền đăng. Đây vẫn không chặn được thành viên có quyền ghi cố ý phá (mục 7.2) |
| `post` đối chiếu `mode`, `prompt_version`, số lần chạy và mốc commit với job `analyze` | Agent không tự đổi được thông tin đi vào trạng thái lưu; hai lần chạy không ghi đè trạng thái của nhau |
| Prompt ghi rõ nội dung PR là dữ liệu, không phải lệnh | Chỉ là lớp bổ sung, không phải lớp chính |

Các bất biến này được kiểm tra tự động bằng `scripts/ai-review/workflow.test.mjs`. Đây **không thay thế `actionlint`**.

### 7.2. Mô hình đe dọa: hệ thống bảo vệ trước điều gì

Với sự kiện `pull_request`, GitHub dùng file `ai-review.yml` **của chính PR**. Vì vậy **ai có quyền push nhánh trong repo đều sửa được workflow** (kể cả quyền của token và bước `post`). Hệ quả cần nói thẳng để không hứa quá mức:

| Hệ thống **có** bảo vệ trước | Hệ thống **không** bảo vệ trước |
|---|---|
| Nội dung PR bị đầu độc (prompt injection trong code, mô tả, comment) | Thành viên có quyền ghi **cố ý** phá: sửa workflow hoặc `scripts/ai-review/` trong nhánh của họ |
| PR do AI khác sinh ra, hoặc thay đổi vô tình vào `scripts/ai-review/` hay prompt | Quyền ghi vào chính nhánh `main` |
| Người ngoài (fork, dependabot) | |

Thư mục `trusted/` (script, prompt, schema, SRS lấy từ base) vẫn có giá trị cho cột trái, nhưng **không phải rào chắn trước người trong nhóm có quyền ghi**. Với nhóm sinh viên thì mức này chấp nhận được. Nếu muốn chặt hơn: bật Branch protection cho `main` kèm yêu cầu người duyệt, và dùng CODEOWNERS cho `.github/` và `scripts/ai-review/` để mọi thay đổi ở đó cần được duyệt.

### 7.3. Hạn chế còn lại

- Prompt injection chỉ giảm thiểu được, không loại bỏ hoàn toàn.
- Agent đọc được mọi file trong checkout. Gitleaks trong `ci-pr.yml` giảm rủi ro, và `post.mjs` lọc thêm các chuỗi giống secret trước khi đăng.
- Nội dung sai (dương tính giả) vẫn xảy ra, nhưng chỉ là sai nội dung, không phải mất an toàn.

---

## 8. Workflow chi tiết

File `.github/workflows/ai-review.yml`.

### 8.1. Trigger và đầu vào

| Trigger | Mô tả |
|---|---|
| `pull_request`: `opened`, `reopened`, `ready_for_review`, `synchronize` | **Tự chạy.** PR nhắm vào `main`, không phải draft, cùng repo (không fork), tác giả không phải dependabot, và không chỉ đụng `.md`/`docs` **[cần kiểm chứng]**: với `synchronize`, GitHub lọc `paths-ignore` theo toàn bộ PR hay chỉ theo commit vừa push. Luôn chế độ C. `synchronize` (commit mới) chờ 3 phút trước khi chạy |
| `pull_request`: `labeled` | Chỉ khi label là `ai-review` (nút "chạy tiếp": **bỏ qua giới hạn số lần tự động**; gỡ rồi gắn lại nếu đã có label). Label khác bị bỏ qua |
| `workflow_dispatch` | Chạy tay, có các input bên dưới |

| Input (`workflow_dispatch`) | Mặc định | Ý nghĩa |
|---|---|---|
| `pr_number` | (bắt buộc) | Số PR |
| `mode` | `C` | A / B / C |
| `dry_run` | **true** | Chỉ ghi kết quả ra artifact, không đăng |
| `force` | false | Chạy lại dù đã có kết quả cho cùng commit/prompt/chế độ |
| `max_turns` | để trống | Mặc định A=6, B/C=15; tối đa 40 |

### 8.2. Chi tiết kỹ thuật

- **Concurrency:** khóa theo số PR; mọi lần chạy có ghi lên PR (tự động, label `ai-review`, chạy tay với `dry_run=false`) dùng chung một nhóm, lần mới hủy lần cũ, để hai lần chạy không ghi đè trạng thái của nhau. Label khác có nhóm riêng nên không hủy run đang chạy (điều kiện `concurrency` được đánh giá trước điều kiện `if` của job). Chạy tay với `dry_run=true` không ghi gì nên mỗi lần có nhóm riêng (các lần chạy lặp để đo độ ổn định không hủy lẫn nhau). **Lưu ý:** `cancel-in-progress` áp dụng cho cả workflow nên lần chạy mới có thể hủy job `post` đang ghi giữa chừng (ví dụ review inline đã đăng nhưng comment tổng kết chưa cập nhật). Trạng thái vẫn tự sửa ở lần chạy sau nhờ fingerprint (không đăng trùng) và việc ghi lại comment tổng kết; đây là đánh đổi có chủ ý **[cần kiểm chứng]** khi chạy thật. Nếu gây phiền, chuyển `concurrency` xuống riêng job `analyze`.
- **Thời gian tối đa:** `analyze` 30 phút (đã tính 3 phút chờ gom push), `post` 10 phút.
- **Chờ gom push (`synchronize`):** job ngủ 180 giây rồi hỏi lại GitHub; nếu SHA đầu PR đã đổi thì dừng. Lần chạy cũ còn bị `concurrency` hủy ngay khi có lần mới, nên thực tế chỉ commit cuối của một chuỗi push được review. Bước ngủ không tốn token.
- **`precheck.mjs`:** chạy sau hai bước checkout (cần script ở `trusted/`) và trước mọi bước tốn token; kết quả (`run`, `round`, `base_sha`, `runs`, `reason`) đi vào job summary và vào các bước sau. Vòng và mốc commit do bước này quyết định; job `post` nhận từ đây chứ không lấy từ kết quả của agent.
- **`boot`:** bước đầu tiên sau khi xác định PR; bỏ qua nhẹ nhàng (job vẫn thành công, có dòng giải thích trong job summary) khi PR do dependabot tạo, hoặc khi API GitHub trả **404** cho một trong `scripts/ai-review/precheck.mjs`, `.github/ai-review/prompt.md`, `.github/ai-review/review-result.schema.json` ở nhánh base (hoặc ref chạy workflow). Lỗi khác 404 (xác thực, giới hạn tốc độ, 5xx) làm job thất bại để chạy lại. Khi bỏ qua, bước chờ, hai checkout và `precheck` đều không chạy. Bước này **cố ý tắt `bash -e`** (GitHub bật `-e` mặc định) để đọc được mã lỗi của `gh api`; có test chạy thật đoạn lệnh này.
- **`ai-review-input/`:** thư mục trong workspace của PR do `precheck.mjs` ghi ở vòng 2 để agent đọc bằng `Read`.
- **Artifact:** kết quả JSON, `usage.md`, `plan.json`, giữ 14 ngày. Không upload file execution của agent (có thể chứa nội dung file).
- **Job summary:** turn, token, thời gian, cảnh báo lẫn chế độ, UC khai báo, kết quả đăng.
- **Kiểm tra trước khi đăng:** `structured_output` phải khác rỗng và là JSON hợp lệ, nếu không job `analyze` đỏ.
- **PR đang mở theo label** lấy code qua `refs/pull/N/merge`; **chạy tay** (kể cả PR đã đóng, để backtest) lấy qua `refs/pull/N/head`.

---

## 9. Cấu trúc file và script

### 9.1. Cây thư mục

```
.github/
  workflows/
    ai-review.yml                 # workflow hai job (mới)
  ai-review/
    prompt.md                     # quy trình + tiêu chí review (prompt_version 2.1.0)
    review-result.schema.json     # schema JSON kết quả
    README.md                     # quy tắc tăng version, không đưa ví dụ lỗi vào prompt
  PULL_REQUEST_TEMPLATE.md        # Mục tiêu, Cách kiểm tra, Ghi chú; mục "Liên quan UC/FR" chỉ tùy chọn
docs/
  SRS.docx                        # NGUỒN GỐC của SRS (quyết định 2026-10-08), phải commit
  srs/                            # sinh tự động từ SRS.docx, không sửa tay; PHẢI commit (workflow đọc từ nhánh base)
    UC-01.md … UC-15.md, NFR.md, FR-summary.md, README.md
  ai-auto-review.md               # tài liệu này
scripts/ai-review/                # Node.js thuần, test bằng node:test
```

Các file **chưa tạo** (đã dự kiến): `scripts/ai-review/stats.mjs` (thống kê từ CSV, thuộc giai đoạn B), `known-false-positives.md` (hoãn).

### 9.2. Các script

| Script | Việc | Có test |
|---|---|---|
| `post.mjs` | Điều phối: kiểm tra → lập kế hoạch → đăng → kiểm tra cuối. Cờ `--dry-run`, `--force`, `--out`, `--round 2 --base-sha`, `--expect-mode`, `--expect-prompt`, `--expect-runs` | `post.test.mjs` |
| `plan.mjs` | Hàm thuần: fingerprint, định vị dòng, chọn inline, dựng comment tổng kết | `plan.test.mjs` |
| `diff.mjs` | Phân tích unified diff, biết dòng nào comment được | `diff.test.mjs` |
| `sanitize.mjs` | Làm sạch đầu ra của agent | `sanitize.test.mjs` |
| `github.mjs` | Client REST tối thiểu, có phân trang, không lộ token trong lỗi | trong `post.test.mjs` |
| `schema-validate.mjs` | Kiểm tra JSON theo tập con JSON Schema; **ném lỗi khi gặp từ khóa chưa hỗ trợ** | `review-result.test.mjs` |
| `prepare-run.mjs` | Dựng prompt và `claude_args`, kiểm tra tham số | `run-support.test.mjs` |
| `extract-uc.mjs` | Trích mã UC khai báo từ mô tả PR | `extract-uc.test.mjs` |
| `precheck.mjs` | Chạy đầu job 1: bỏ qua / vòng 2 / review toàn bộ, ghi file đầu vào vòng 2 | `precheck.test.mjs` |
| `state.mjs` | Ghi và đọc trạng thái trong comment tổng kết (commit, số lần chạy, vấn đề còn mở), kiểm tra schema khi đọc | `state.test.mjs` |
| `usage-summary.mjs` | Tóm tắt turn/token, phát hiện lẫn chế độ; không bao giờ làm job thất bại | `run-support.test.mjs` |
| `docx-to-markdown.mjs` | Chuyển `.docx` sang Markdown chỉ bằng `node:zlib` | `extract-srs.test.mjs` |
| `extract-srs.mjs` | Tách SRS thành từng UC, NFR, bảng FR↔UC | `extract-srs.test.mjs` |
| (kiểm tra workflow) | Các bất biến bảo mật của `ai-review.yml` | `workflow.test.mjs` |

Tổng cộng khoảng 3.200 dòng (cả test) và **203 test**, chạy bằng:

```bash
node --test scripts/ai-review/
```

### 9.3. Bản trích SRS

`docs/SRS.docx` (7,4 MB, chủ yếu font và ảnh) agent không đọc được, nên được trích bằng `extract-srs.mjs` thành 18 file Markdown nhỏ. Hạn chế:

- Ảnh và sơ đồ không chuyển sang chữ được, chỉ còn dòng `[hình ảnh]` (nằm trong UC-02 đến UC-06 và UC-11). Sơ đồ tuần tự ở mục 4.4 của SRS nằm ngoài các file đã trích.
- Mục 5.1 (RTM) trong SRS đang để trống nên không sinh file.
- Bản trích mới được kiểm tra bằng test và đọc qua UC-01; **bạn cần đọc lướt vài UC để chắc bảng không bị lệch**.

---

## 10. Cách dùng và vận hành

| Việc | Cách làm |
|---|---|
| Review một PR | Chỉ cần mở PR (không draft) vào `main`; hệ thống tự chạy. Có thể điền tùy chọn "Liên quan UC/FR" để UC chính xác hơn |
| Push thêm commit | **Hệ thống tự chạy** (sau 3 phút chờ gom push): vòng 2 nếu có thể, review toàn bộ nếu bị force-push/rebase. Tối đa 5 lần tự động mỗi PR; sau đó gắn label `ai-review` (gỡ rồi gắn lại nếu đã có, vì sự kiện `labeled` chỉ bắn khi label được gắn mới) để chạy tiếp. Cùng commit, prompt và chế độ thì được bỏ qua và job summary ghi lý do; muốn ép chạy lại dùng `workflow_dispatch` với `force`. Việc tự gỡ label sau khi chạy chưa làm **[cần kiểm chứng quyền]** |
| Thử mà không đăng lên PR | `workflow_dispatch` với `dry_run=true` (mặc định); xem artifact |
| Backtest bằng PR cũ | `workflow_dispatch` với số PR đã đóng, `dry_run=true` |
| Chọn chế độ A/B/C | Input `mode` của `workflow_dispatch` |
| Chạy test cục bộ | `node --test scripts/ai-review/` |
| Tạo lại bản trích SRS | `node scripts/ai-review/extract-srs.mjs` |
| Đổi tiêu chí review | Sửa `.github/ai-review/prompt.md` và tăng `prompt_version` (patch: sửa câu chữ; minor: thêm/bớt tiêu chí; major: đổi định dạng đầu ra) |
| Đổi `category`/`severity`/`mode` | Sửa cả schema và `prompt.md`; test kiểm tra hai bên khớp nhau |

**Lưu ý quan trọng khi chạy thử lần đầu:** script, prompt, schema và SRS được lấy từ **nhánh base** (thư mục `trusted/`, xem mục 6). Vì vậy trên chính PR đầu tiên thêm hệ thống này, `main` chưa có các file đó. Bước `boot` phát hiện điều này bằng API (không cần checkout) và **bỏ qua nhẹ nhàng**: check "AI Review" xanh, job summary ghi "nhánh base chưa có hệ thống AI review", không tốn token. Sau khi **merge PR đó vào `main`**, PR kế tiếp (ví dụ PR của một task) sẽ được review thật; có thể chạy thử trước bằng `workflow_dispatch` (có `dry_run`). `workflow_dispatch` chỉ hiện trên giao diện GitHub khi file workflow đã nằm ở nhánh mặc định.

---

## 11. Thực nghiệm cho đề tài (giai đoạn B)

**Chưa bắt đầu.** Chỉ làm khi giai đoạn A chạy ổn trên GitHub thật.

### 11.1. Sơ đồ

```
PR cũ đã merge (backtest, dry_run)  +  PR lỗi cố ý trên bản mirror repo (có đáp án)
        ├─► Chế độ A: chỉ diff ─────────┐
        ├─► Chế độ B: diff + repo ──────┼─► CSV gán nhãn ─► thống kê
        ├─► Chế độ C: diff + repo + SRS ┤
        └─► CodeRabbit (đối sánh) ──────┘
```

### 11.2. Câu hỏi nghiên cứu và cách đo

| Câu hỏi | Cách đo |
|---|---|
| Bao nhiêu % nhận xét đúng? | **Gán nhãn thủ công vào CSV, tham chiếu `id` finding trong JSON** (không gán trên comment đã đăng, vì giới hạn 8 inline làm lệch recall). Bốn nhãn: `TP_seeded` (đúng lỗi đã bơm), `valid_unseeded` (lỗi thật có sẵn trong code mirror nhưng không phải lỗi bơm), `FP` (báo sai), `trùng/nit` (trùng hoặc quá vặt). Cần nhãn `valid_unseeded` vì mirror chứa code thật; nếu gộp vào FP thì precision thấp giả tạo. Script chỉ tính số liệu từ CSV |
| Thêm ngữ cảnh tăng bao nhiêu lỗi thật, tốn thêm bao nhiêu? | So A, B, C: precision/recall + token |
| Kết quả có ổn định không? | Chạy lặp cùng một PR (4-5 PR, chế độ C); so khớp giữa các lần theo cụm `file` + `category` (gán thủ công, vì lời giải thích của LLM khác nhau giữa các lần) |
| Chỉ đăng nhận xét nghiêm trọng có tốt hơn không? | So tỷ lệ nhận xét đúng theo `severity` |
| So với công cụ có sẵn? | Đối sánh trùng/khác với CodeRabbit trên cùng bộ PR |
| `gap` dùng được đến mức nào? | Đo **tỷ lệ PR có điền UC** trong template; "ít `gap`" có thể chỉ là "ít PR có UC" |

### 11.3. Thiết kế thực nghiệm đã chốt

- **Bản mirror** của repo tại một commit cố định để bơm lỗi (giữ SRS và code thật, không làm bẩn lịch sử). Cần secret `CLAUDE_CODE_OAUTH_TOKEN` và CodeRabbit trên mirror.
- **Cỡ mẫu:** mẫu số của recall là **số lỗi được bơm**, không phải số PR. Bơm **≥ 30 lỗi** (khoảng 12-15 PR, 2-3 lỗi mỗi PR), phân bổ qua các `category`. Báo cáo bằng số đếm và mô tả, không dùng kiểm định thống kê.
- **Đo `gap`:** thêm 3-5 PR cố ý bỏ sót một luồng ngoại lệ đã mô tả trong UC. `suggestion` không có đáp án nên nhóm chấm thủ công "hữu ích / không".
- **Chống thiên lệch lỗi cố ý:** lấy lỗi từ OWASP Top 10 và lỗi Spring phổ biến; giữ riêng một nhóm lỗi không xuất hiện trong ví dụ của prompt; ưu tiên nhờ người ngoài nhóm bơm lỗi.
- **Quy tắc chốt trước khi chạy** (để không thiên lệch chọn mẫu): (1) lần chạy `status: incomplete` hoặc hết turn **không bị loại âm thầm**: báo riêng "tỷ lệ hoàn thành" theo từng chế độ, tính precision/recall trên các lần hoàn thành, và đưa thêm bản "xấu nhất" coi lần chưa hoàn thành là bỏ sót; (2) **gán nhãn mù**: người gán nhãn không biết nhận xét đến từ chế độ nào hay từ CodeRabbit (vì họ cũng là người bơm lỗi).
- **Số lượt chạy:** mọi PR chạy một lần mỗi chế độ (~45 lượt); chạy lặp chỉ với 4-5 PR ở chế độ C (~15 lượt); chạy rải nhiều ngày để không cạn quota. `--max-turns` có thể thấp cho chế độ B/C, chốt bằng thử nghiệm.
- **Backtest:** dùng `dry_run`, lấy code PR qua `refs/pull/N/head` (nhánh nguồn có thể đã bị xóa), ghi lại `base.sha` của PR thời điểm đó. Backtest **chỉ đo nhiễu, token, độ ổn định**, không đo precision/recall vì không có đáp án.
- **Không đưa ví dụ lỗi cụ thể vào `prompt.md`**, nếu không recall bị thổi phồng.

---

## 12. Trạng thái triển khai và những điểm cần kiểm chứng

### 12.1. Bảng trạng thái

| Hạng mục | Trạng thái |
|---|---|
| Bước 1: trích SRS thành `docs/srs/` | Xong; **chờ bạn rà lại** bảng và sơ đồ |
| Bước 2: prompt, schema, validator | Xong, có test |
| Bước 3: `post.mjs` và các module | Xong, test với GitHub giả trong bộ nhớ (gồm test fingerprint va chạm) |
| Bước 4: workflow `ai-review.yml` | Đã viết, có test bất biến bảo mật; **chưa chạy trên GitHub thật, chưa chạy `actionlint`** |
| Bước 5: PR template, UC khai báo/tự suy, trigger tự động | Xong, có test; **chưa thử trên một PR thật** |
| Bước 6: review khi có commit mới (vòng 2, `precheck.mjs`, `state.mjs`) | Xong, có test với GitHub giả; đã thử làm hỏng có chủ ý 5 chỗ quan trọng và test đều bắt được; **chưa chạy thật** |
| Review độc lập cho `post.mjs` và workflow | **Chưa có** |
| Giai đoạn B (thực nghiệm) | **Chưa bắt đầu** |
| Commit | **Chưa commit**; cần commit cả `docs/SRS.docx` (nguồn gốc, 7,4 MB) lẫn `docs/srs/` (bản trích) |

### 12.2. Những điểm chỉ xác nhận được bằng một lần chạy thật

1. `github_token` tường minh có thực sự ép dùng token hạn chế không, và có cần `id-token: write` không.
2. `structured_output` có đúng định dạng và kích thước (đi qua biến môi trường, giới hạn khoảng 128KB; kết quả thật thường nhỏ hơn nhiều).
3. `execution_file` có đúng cấu trúc cho `usage-summary.mjs`.
4. `--json-schema` (schema nhúng trong `claude_args`, bọc dấu nháy đơn) có được action phân tích đúng.
5. Việc tự gỡ label `ai-review` sau khi chạy có đủ quyền không.
6. Độ chính xác của việc agent tự suy UC (`uc_source: inferred`) và mức độ nhiễu của `gap` khi UC đoán sai.
7. Trigger tự động (`opened`/`ready_for_review`) có hiệu lực ngay trên mọi PR sau khi merge; kiểm tra bằng `dry_run` trước.
8. Claude Code có tự nạp `CLAUDE.md` (và `.claude/`) vào mọi chế độ không. Nếu có thì chế độ A là "diff + CLAUDE.md", cần ghi rõ trong báo cáo hoặc chạy A/B trong checkout không có `CLAUDE.md`.
9. API so sánh commit (`compare`) có trả `status: ahead` đúng với commit mới nằm sau commit cũ, trả 404/422 khi mất mốc do force-push; media type `diff` cho `compare` có chạy; và `pull-requests: read` có đủ để đọc comment của PR trong `precheck.mjs`.
10. Bước chờ 3 phút kết hợp `cancel-in-progress` có thực sự hủy lần chạy cũ khi push liên tiếp.
11. Agent đọc được `ai-review-input/previous.json` và `incremental.diff` bằng `Read`, và trả đủ, đúng `ref` trong `previous_findings`; mức độ "đã xử lý" mà AI nêu có căn cứ thật hay không.
12. Kích thước comment tổng kết kèm dữ liệu ẩn (hiện giới hạn 60.000 ký tự cho cả comment, dữ liệu ẩn tối đa 20.000) có nằm trong giới hạn 65.536 của GitHub không.

---

## 13. Lộ trình và việc còn lại

### 13.1. Giai đoạn A (hệ thống)

| Bước | Việc | Trạng thái |
|---|---|---|
| 1 | Trích SRS | Xong |
| 2 | Prompt + schema | Xong |
| 3 | Script `post` + test | Xong |
| 4 | Workflow hai job | Viết xong, chưa chạy thật |
| 5 | PR template + UC tự suy + trigger tự động | Viết xong, chưa chạy thật |

### 13.2. Việc cần làm tiếp, theo thứ tự đề xuất

1. Rà lại bản trích SRS (`docs/SRS.docx` là nguồn gốc, commit cùng `docs/srs/`).
2. Chạy `pre-commit-checker`, review độc lập `post.mjs` và workflow, chạy `actionlint` (có bản binary tải về chạy trực tiếp, không bắt buộc Docker; cả hai cách đều cần tải từ bên ngoài nên cần bạn cho phép).
3. Commit, mở PR và **merge vào `main`** (vì `trusted/` lấy từ nhánh base, chạy thử trước khi merge sẽ lỗi), rồi chạy thử thật (xem mục 10 và 12.2) và xử lý các điểm cần kiểm chứng.
4. Theo dõi token trong job summary khoảng 2 tuần, rồi chỉnh số lần tự động tối đa (hiện 5) và thời gian chờ gom push (hiện 3 phút) theo số liệu quota thật.
5. Giai đoạn B: backtest bằng PR cũ ở `dry_run` (rẻ nhất, làm trước) → dựng mirror và bộ PR lỗi cố ý → chạy A/B/C và chạy lặp → viết `stats.mjs` → đối sánh với CodeRabbit.

### 13.3. Ưu tiên nếu thiếu thời gian

Giữ bắt buộc: trích SRS, tách quyền hai job, kiểm tra cuối, chống trùng, job summary, prompt có version. Hoãn: `known-false-positives.md`, đọc comment CodeRabbit. Giai đoạn B: làm ít PR nhưng đo kỹ, ưu tiên chạy cả A/B/C trên ít PR hơn là một chế độ trên nhiều PR.

---

## 14. Những việc cố ý không làm

- Bản `review.sh` + `claude -p` độc lập (trùng với action, thêm thứ phải bảo trì).
- Chặn merge ở giai đoạn đầu; chỉ cân nhắc khi precision của `blocker` đạt ngưỡng đặt trước (sẽ chốt từ số liệu).
- Để AI sửa code hoặc merge.
- Chạy SpotBugs / PMD / SonarQube (thêm dependency, phải hỏi lại; CodeRabbit đã là đối chứng).
- Review đa agent (PR hiện chưa đủ lớn). Review nhiều vòng đã được làm ở dạng vòng 2 (mục 5.5).
- Đọc comment CodeRabbit để tránh lặp: chỉ là cờ tùy chọn, **tắt** khi chạy thực nghiệm để giữ đối sánh độc lập, và chưa cài.

---

## 15. Rủi ro, hạn chế và quyết định còn mở

### 15.1. Rủi ro và hạn chế

- LLM không tất định và có dương tính giả.
- `gap` chỉ đúng khi SRS đúng; **SRS có thể lỗi thời so với code**. Bản trích có thể mất sơ đồ/ảnh.
- Lỗi cố ý do nhóm tự nghĩ có thể thiên lệch.
- **Quota:** workflow dùng `CLAUDE_CODE_OAUTH_TOKEN` (quota gói đăng ký, dùng chung với `@claude` hằng ngày). Với OAuth token, **chỉ số token đáng tin còn số tiền thì không**.
- Điều kiện gói của CodeRabbit cho repo private chưa được xác nhận; kiểm tra trước khi cam kết phần đối sánh CodeRabbit.
- Script `post` và các module khác phải được bảo trì (khoảng 2.000 dòng cùng test).
- Prompt injection chỉ giảm thiểu được.
- Vòng 2: "đã xử lý" là ý kiến của AI; có thể bỏ sót lỗi do tương tác giữa commit mới và code không đổi; trạng thái lưu trong comment nên chịu giới hạn kích thước (40 vấn đề, 20.000 ký tự).

### 15.2. Quyết định còn mở

1. Dùng API key riêng cho thực nghiệm hay tiếp tục OAuth token (ảnh hưởng độ tin cậy số liệu chi phí).
2. Mirror để private (cần kiểm tra gói CodeRabbit) hay public (lộ code và SRS của nhóm).
3. Giai đoạn B làm toàn bộ hay một phần, tùy thời gian.
4. Ngưỡng precision của `blocker` để cân nhắc chuyển sang chặn merge.
5. ~~Nguồn chân lý của SRS~~ **Đã chốt (2026-10-08): `docs/SRS.docx` là bản gốc.** Quy trình: sửa SRS trong Word, chạy `node scripts/ai-review/extract-srs.mjs`, commit **cả hai** (`SRS.docx` và `docs/srs/`). `extract-srs.test.mjs` có một test so `docs/srs/` với kết quả trích từ docx, nên sửa docx mà quên chạy lại script (hoặc sửa tay `docs/srs/`) sẽ làm `node --test` thất bại. Git LFS chưa cần cho một file 7,4 MB ít sửa; nếu SRS được sửa thường xuyên (mỗi lần thêm khoảng 7 MB vào lịch sử) thì cân nhắc LFS sau.

---

## 16. Thuật ngữ

| Thuật ngữ | Giải thích |
|---|---|
| **PR** (Pull Request) | Yêu cầu đưa thay đổi code vào nhánh chính, nơi diễn ra review |
| **Diff** | Phần chênh lệch giữa hai phiên bản code: dòng thêm (`+`), dòng xóa (`-`) và vài dòng ngữ cảnh. Chế độ A chỉ thấy diff |
| **Agent** | AI có thể tự mở file, tìm kiếm, đọc tài liệu, khác với gọi LLM một lần với một đoạn diff |
| **Job** | Một nhóm bước chạy trên một máy riêng trong GitHub Actions; hai job có quyền khác nhau |
| **Review API** | API của GitHub để đăng nhiều comment inline trong một lần (một review) |
| **Inline comment** | Nhận xét gắn vào một dòng code cụ thể trong PR |
| **UC / FR / NFR** | Use Case (ca sử dụng), Functional Requirement (yêu cầu chức năng), Non-Functional Requirement (yêu cầu phi chức năng) trong SRS. Trong SRS này FR-nn tương ứng UC-nn |
| **SRS** | Tài liệu đặc tả yêu cầu phần mềm, ở đây là `docs/SRS.docx` |
| **DSL / OpenAPI** | Hai hợp đồng kỹ thuật đã chốt: định dạng JSON của game, và đặc tả REST API |
| **`trusted/`** | Thư mục checkout nhánh **base**, nơi lấy script, prompt, schema, SRS đáng tin |
| **Structured output** | Kết quả của agent buộc phải đúng schema JSON, action trả qua `structured_output` |
| **Fingerprint** | Mã băm của file, loại nhận xét, nội dung dòng code và thứ tự xuất hiện của dòng đó, dùng nhận ra một nhận xét đã đăng dù số dòng đã đổi |
| **Marker** | Chuỗi ẩn (`<!-- ai-review:... -->`) trong comment để script nhận ra comment của mình |
| **`dry_run`** | Chạy toàn bộ nhưng chỉ ghi kết quả ra artifact, không đăng lên PR |
| **Backtest** | Chạy hệ thống trên PR cũ đã merge để đo nhiễu, token, độ ổn định |
| **Prompt injection** | Nội dung độc hại trong dữ liệu (code, mô tả PR) cố điều khiển AI làm sai chỉ dẫn |
| **Dương tính giả (FP)** | AI báo lỗi nhưng thực tế không phải lỗi |
| **Precision / Recall** | Precision: trong số nhận xét AI đưa ra, bao nhiêu % đúng. Recall: trong số lỗi thật, AI bắt được bao nhiêu % |
| **"Thành công giả"** | CI xanh nhưng thực tế không có gì được đăng; hệ thống chặn bằng cách từ chối kết quả rỗng và đọc lại sau khi đăng |
| **Idempotent** | Chạy lại nhiều lần cho cùng kết quả, không đăng trùng |
| **Vòng 2** | Lần review khi PR có commit mới: kiểm tra từng vấn đề cũ đã xử lý chưa và xem phần thay đổi mới, không review lại toàn bộ |
| **`precheck`** | Bước ở đầu job 1 quyết định bỏ qua, vòng 2 hay review toàn bộ, trước khi tốn token |
| **Chờ gom push (debounce)** | Chờ vài phút sau commit mới để nếu dev push thêm thì chỉ commit cuối được review |
