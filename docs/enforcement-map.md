# Bản đồ luật → thứ cưỡng chế (2026-11-15)

Mỗi luật rút từ `.claude/lessons-inbox.md` (44 mục), `docs/corrections.md` (29 dòng lúc lập, nay 30), `CLAUDE.md` và `.claude/rules/`, kèm tầng hiện tại theo "Thứ tự chặn lỗi" trong `CLAUDE.md`:
**1** kiến trúc/code, **2** lint/test/CI/hook, **3** chỉ có chữ (rule, prompt, lessons), **4** chỉ có review.
Tầng 2 chỉ ghi khi đã thấy đoạn kiểm thật (file:dòng); "một phần" là chỉ kiểm được một nhánh của luật.
Viết tắt: `AU#tênRule` = field rule trong `backend/src/test/java/com/aigameplatform/backend/ArchitectureRulesTest.java` (trích theo tên, không theo dòng, để thêm rule không làm lệch), `CC` = `scripts/hooks/check-config.mjs`,
`CM` = `scripts/db/check-migrations.mjs`, `CI` = `.github/workflows/ci-pr.yml`, `BNE` = `scripts/hooks/block-node-eval.mjs`.

Cập nhật khi: thêm mục `lessons-inbox`, thêm dòng `corrections`, hoặc đẩy một luật lên tầng khác. File này chỉ định hướng; chuyển trạng thái mục trong `lessons-inbox` cần người dùng duyệt.

## Tóm tắt

| | Số luật | Tầng 1–2 | Tầng 2 một phần | Tầng 3–4 |
|---|---|---|---|---|
| Từ `lessons-inbox` (gộp mục trùng) | 27 | 8 | 5 | 14 |
| Từ `CLAUDE.md` và `.claude/rules/` | 38 | 16 | 5 | 17 |

Phát hiện lớn nhất: CI chỉ chạy 5 trong 22 file test của script, nên các hook có test (`block-node-eval`, `agent-guard`, `check-links`, `compare-endpoints`…) vẫn chỉ là tầng 2 "trên giấy". Đã sửa ở PR #49 (mục "Đã làm"). Đề xuất 1–3 đã làm ở PR #50 (L8, R4, R11, R13, R24), đề xuất 4 ở PR sau (R28, R29).

## A. Luật từ `lessons-inbox`

| # | Luật | Mục gốc (lặp) | Tầng | Thứ cưỡng chế | Đẩy lên được? |
|---|---|---|---|---|---|
| L1 | Code có `\` ghi bằng Write/Edit, không qua `node -e`/heredoc | 10-13, 10-30, 11-12, 11-13, 11-14 (khoảng 9 lần kể cả dòng lặp) | 2 một phần | `BNE` (PreToolUse trong `.claude/settings.json`), test `block-node-eval.test.mjs` | Lỗ còn lại: heredoc không nháy, `$'...'` (KNOWN-GAPS #17). Cỡ S–M, cần chốt cách chặn |
| L2 | Sửa nhiều dòng bằng Edit, không thay chuỗi bằng script trên file CRLF | 11-11, 11-14 (2) | 3 | (gián tiếp: `BNE` chặn `node -e` nhiều dòng) | `.gitattributes` ép `eol=lf` toàn repo: cỡ M vì phải chuẩn hoá lại file |
| L3 | Test phải đỏ khi chưa sửa, đỏ đúng lý do; biến thể sai chỉ sai một chỗ | 10-14, 10-27, 10-30, 11-07, 11-09, 11-14 ×2 (7) | 4 | `reviewer` mục Test; `mutation-checker` khi được yêu cầu | Mutation testing (PIT/Stryker) là dependency mới, đã nằm trong giai đoạn D |
| L4 | Sửa thư mục nào cũng chạy test toàn bộ trước khi báo xong | 11-01, 11-09 (2) | 2 (CI) | `CI:48` `./mvnw test`, `CI:84-88` lint/test/build frontend | Đủ |
| L5 | Thêm tham số constructor cho bean thì sửa cả cấu hình test liệt kê bean tay | 11-11 | 2 (CI) | `./mvnw test` đỏ | Đủ |
| L6 | Bean trong chuỗi `@Order` không trùng giá trị | 11-13 | 2 | `AssetMeaningGameValidatorTest.java:52-54` | Đủ |
| L7 | So nhãn tiếng Việt giữ dấu/theo ranh giới từ; hàm đoán có test âm tính | 10-14, 11-13 (3) | 2 một phần | `frontend/src/utils/assetResolver.catalog.test.ts:20,52,62` | Thói quen thêm test cho mỗi hàm mới, không có kiểm chung |
| L8 | Từ khoá hình mới không trùng từ khoá hình khác, không dùng cụm động từ thông dụng | 11-13 (3) | 2 | `assetResolver.catalog.test.ts:69` (từ đơn ngắn), test "một từ khóa không thuộc hai hình khác tên" (`:78`), `AssetRetrieverEvalTest` | Đủ cho danh mục frontend. Không kiểm: `exactKeywords` có dấu so với từ khoá đã bỏ dấu của vật khác (ví dụ "chó"/"chợ" với "cho"), vì cách khớp hai loại do backend quyết; hai hình khác nghĩa nhưng đặt cùng `name` |
| L9 | Viết tiêu chí/checker từ dữ liệu thật, không từ giả định | 10-11, 11-14 (2) | 3 (luật) / 2 (checker đã có) | `scripts/ai-log/check-ai-usage-log.mjs` + test, `CI` | Không máy hoá được cho checker mới |
| L10 | Agent lấy diff gồm `main...HEAD` + `git diff` + `git diff --cached` | 10-11 | 3 | `CLAUDE.md`, prompt 6 agent | S: test quét `.claude/agents/*.md` |
| L11 | Không giả định công cụ có sẵn (`gh`, Python); agent mới chưa gọi theo tên được | 10-11 ×2, 11-11 (3) | 3 | `CLAUDE.md` mục "Học từ lỗi" | S cho phần `gh` (test grep prompt agent); hai ý còn lại là hành vi nền tảng |
| L12 | Không tạo nhánh khi chưa được phép | 10-13 | 3 | `CLAUDE.md`, memory | S: `permissions.ask` cho `git checkout -b`/`git switch -c` (đổi cấu hình, cần duyệt) |
| L13 | Không `cd` trong Bash, dùng đường dẫn tuyệt đối | 10-31 | 3 | (chưa có) | S: mở rộng hook PreToolUse; đổi hành vi mọi phiên, cần duyệt |
| L14 | Không `vi.unstubAllEnvs()` trong test player; mock clipboard sau `userEvent.setup()` | 10-13, 10-27 (2) | 3 | chú thích trong `mockPlayerApi.test.ts:49`, `PlayPage.test.tsx:21` | S: test grep dưới `frontend/src/player`; còn 4 file ngoài player dùng `unstubAllEnvs`, cần xác định phạm vi |
| L15 | Khoá cache react-query gắn danh tính người dùng | 10-13 | 2 | `frontend/src/hooks/useGames.test.tsx:99` | Đủ |
| L16 | Kiểm tràn ngang ở 360/768/1024/1280/1920 | 10-13 | 4 | (chưa có) | Cần trình duyệt thật (C1, Playwright) |
| L17 | Kích thước/hàm xáo chọn theo tính chất (nhãn theo độ dài chữ, derangement) | 10-27, 11-08 (2) | 3 | (chưa xác minh) | M: test hàm thuần cho bề rộng nhãn |
| L18 | Phiên chính tự tạo worktree từ đúng commit; chép về rồi mới xoá; đối chiếu báo cáo agent với `git status` | 10-27 ×2, 10-31 (3–5) | 3–4 | `CLAUDE.md`, prompt agent thực thi | Hành vi công cụ nền, không máy hoá |
| L19 | Phần chặn quyền dùng danh sách cho phép; mỗi rule có ca vi phạm thật | 10-31, 11-14 (2) | 2 | `.claude/hooks/agent-guard-rules.mjs:6-12` + test | Đủ về code, nhưng hook **không được nối** ở đâu (KNOWN-GAPS #19) |
| L20 | Script bằng chứng xoá kết quả cũ, FAIL khi thiếu bước | 11-14 ×2 | 2 | `scripts/verify-flow.mjs:25,38` | Đủ (script không chạy ở CI) |
| L21 | Số liệu ghi tài liệu lấy từ dòng tổng của script, không đếm từ output đã cắt | 11-14 | 2 một phần | `scripts/wiki/check-links.mjs` in dòng "Tổng: …" (PR #44) | Đủ cho check-links |
| L22 | Đổi tên symbol thì grep cả tên ngắn; không chạy kiểm cùng lượt với lệnh ghi có thể thất bại | 11-14 | 2 (CI biên dịch) / 3 | `./mvnw test` | Phần quy trình không máy hoá |
| L23 | Không sửa file khi verifier đang chạy; liệt kê đường trả lời sai khi thiết kế luật game; luật prompt khớp thứ tự schema | 11-07 ×2, 11-11, 11-13 (4) | 4 | `reviewer`, `ai-prompt-evaluator` | M cho test "prompt không chứa câu mâu thuẫn" |
| L24 | Màn `src/player` dùng token, không viết mã màu hex | 11-01 | 2 | `frontend/src/player/theme/tokens.test.tsx:26` | Đủ |
| L25 | Chứng minh nhánh chặn bằng công cụ thật, không bằng công cụ giả | 11-14 | 3 | `reviewer.md` bước 6 (sau A1) | Không máy hoá |
| L26 | Đọc quy ước của checker trước khi kết luận checker báo sai | 11-14 | 3 | `lessons-inbox` | Không máy hoá |
| L27 | Trước khi dùng công tắc toàn cục hay gỡ một người chặn, kiểm một ca của mỗi nhóm nó chạm tới | 11-14, 11-15 (2) | 3 | `lessons-inbox`; ca B2 đã đẩy luật mật khẩu lên `CC` | Không máy hoá chung |

## B. Luật trong `CLAUDE.md` và `.claude/rules/`

| # | Nguồn | Luật | Tầng | Thứ cưỡng chế | Đẩy lên được? |
|---|---|---|---|---|---|
| R1 | backend.md | `ddl-auto` luôn `validate`; migration chỉ thêm mới, version tăng | 2 | `CM:25-48`, `CI:106` | Đủ |
| R2 | backend.md | Không cổng 6543; Hikari pool = 5 | 2 | `CC` | Đủ |
| R3 | backend.md | `moderation.required` không tắt trong file dùng chung; `.env.example` để trống `OPENAI_API_KEY` | 2 | `CC`; `ModerationRequiredDefaultTest` | Đủ |
| R4 | backend.md | `@MockitoBean`, không `@MockBean` | 1 | Spring Boot 4.1.1 đã gỡ `@MockBean` (jar `spring-boot-test-4.1.1` không còn `org/springframework/boot/test/mock/mockito/`), dùng là lỗi biên dịch | Đủ |
| R5 | backend.md | Lombok, không getter/setter tay | 3 | — | Khó, giá trị thấp |
| R6 | backend.md | Giữ cấu trúc package | 3 | — | S: rule ArchUnit kèm danh sách package |
| R7 | design-principles | Đa hình thay `switch(gameType)` | 2 một phần | `AU#noSwitchOnGameType` (chỉ `switch` enum; KNOWN-GAPS #10) | M cho `if`/`==` |
| R8 | design-principles | DI qua constructor, không `new` bean | 2 | `AU#noFieldInjection`, `#servicesAndRepositoriesAreInjectedNotConstructed` | Đủ |
| R9 | design-principles | Không `UnsupportedOperationException` ngoài `service/strategy` | 2 | `AU#unsupportedOperationOnlyInStrategySkeletons` | Đủ |
| R10 | design-principles | Controller không gọi repository; entity không phụ thuộc service | 2 | `AU#controllersDoNotUseRepositories`, `#repositoriesAndServicesDoNotUseControllers`, `#entitiesStayIndependent` | Đủ |
| R11 | design-principles | Không mở public field | 2 | `AU#publicFieldsAreConstants` (public chỉ được `static final`) | Đủ |
| R12 | CLAUDE.md | `QuestionGame`, `GameSession`, `PlayInteractionDetail` dùng JOINED | 2 một phần | `AU#domainRootsUseJoinedInheritance`, `#everyEntityHierarchyUsesJoined`; `PlayInteractionDetail` chưa có lớp con (KNOWN-GAPS #5) | Đủ phần đã có |
| R13 | CLAUDE.md | `GameContentStrategy` không có `validateBusinessLogic()` | 2 | `AU#strategiesDoNotValidateBusinessLogic` (theo tên), `AU#strategiesDoNotCallValidationChain` (Strategy không phụ thuộc `GameValidationService`/`AbstractGameValidator`) | Đủ |
| R14 | CLAUDE.md | Chuỗi validator không bỏ layer | 2 một phần | `GameValidationWiringTest`, `AssetMeaningGameValidatorTest:52-54` | Chưa xác minh đủ thứ tự |
| R15 | CLAUDE.md | Chỉ LangChain4j, không Spring AI | 2 | `AU#onlyLangChain4jForAi` | Đủ |
| R16 | CLAUDE.md | `gameType` dạng `UPPER_SNAKE_CASE` | 3 (Java ép tên hằng) | `GameDslSchemaTest` bắt giá trị sai trong schema | S: test duyệt `GameType.values()` |
| R17 | CLAUDE.md | Sửa DSL đồng bộ schema, record Java, TS, doc | 2 một phần | `GameDslSchemaTest` (schema ↔ Java) | M: so khoá field TS với schema |
| R18 | CLAUDE.md | Sửa `openapi.yaml` thì làm mới INDEX | 2 | `build-index.test.mjs` ở `CI` | Đủ; `redocly lint` chưa ở CI (S, cần `npx` tải gói khi chạy) |
| R19 | CLAUDE.md | Code khớp contract REST | 4 | `contract-guardian` | B6: `compare-endpoints` ở CI sau việc 8 |
| R20 | CLAUDE.md | Không hardcode secret; không commit `.env`, file build | 2 | gitleaks (hook, CI), `CC` (gồm mật khẩu chữ cố định, B2) | Đủ |
| R21 | CLAUDE.md | Không thêm dependency khi chưa hỏi | 3 | quy trình | M: CI báo khi `pom.xml`/`package.json` đổi |
| R22 | CLAUDE.md | Test API ngoài phải mock | 2 một phần | test luồng tắt Gemini/OpenAI (`TeacherFlowVerificationTest.java:20-23`); `*LiveTest` gate bằng biến môi trường | S–M: ArchUnit cho test không dùng model thật |
| R23 | CLAUDE.md | Ghi `ai-usage-log.md` đúng định dạng | 2 | `check-ai-usage-log.mjs`, `rotate.mjs --check` ở `CI` | Chưa kiểm "có đổi code thì có dòng log" (S, cần cơ chế bỏ qua) |
| R24 | CLAUDE.md | SHA trong log là commit có thật | 2 | `check-ai-usage-log.mjs` (`gitShaMissing`, `git cat-file --batch-check`) ở `CI`; clone nông thì chỉ báo nghi ngờ | Đủ. Rebase/amend/squash sau khi ghi SHA làm CI đỏ (thông báo lỗi nhắc ghi lại SHA mới); repo hiện merge bằng merge commit |
| R25 | CLAUDE.md | Không tự commit, subagent không ghi log, agent ghi chạy trong worktree | 3 | quy trình; `agent-guard` có code nhưng chưa nối | Xem KNOWN-GAPS #19 |
| R26 | CLAUDE.md | File agent nhắc bước đọc `.claude/rules/` | 3 | — | S: test quét `.claude/agents/*.md` |
| R27 | CLAUDE.md | Liên kết wiki không hỏng | 3 | `check-links.mjs` (chạy tay, còn 10 lỗi) | S sau khi người dùng quyết 10 lỗi (KNOWN-GAPS #13) |
| R28 | frontend.md | Không Zustand/Redux/Jotai hay thư viện state khác | 2 | `frontend/src/api/frontendRules.test.ts` (danh sách thư viện đã biết trong `package.json`) | Đủ; thư viện state chưa có tên trong danh sách thì lọt |
| R29 | frontend.md | Chỉ `axiosInstance.ts` tạo axios instance hay gọi HTTP bằng axios trực tiếp | 2 | `frontendRules.test.ts` (`axiosMisuses`: theo import, kể cả tên đổi và `{ default as … }`; chỉ cho các tiện ích `isAxiosError`, `isCancel`, `CanceledError`, `AxiosError`, `AxiosHeaders`, `CancelToken` và `import type`) | Phần lớn. Lọt: `import * as ax`, `require('axios')`, gán lại biến (`const a = axios; a.get`), gọi HTTP bằng `fetch` (hiện không có lời gọi thật) |
| R30 | frontend.md | Session qua `useAuth()`, `localStorage` chỉ trong `utils/authStorage.ts` | 3 | — | S, cần chốt `authStorage.ts` là ngoại lệ |
| R31 | frontend.md | react-query chỉ cho data fetching; thư viện ngoài danh sách phải hỏi | 3–4 | quy trình | Không máy hoá nhỏ |
| R32 | canvas-engine.md | Touch target ≥ 64px | 3 | (chưa xác minh test bố cục) | S–M: assert trong test hàm bố cục |
| R33 | canvas-engine.md | Trả lời sai không đỏ gắt/rung/âm phạt | 4 | `canvas-ux-checker` khi được yêu cầu | M, dễ báo nhầm |
| R34 | canvas-engine.md | Audio prompt có nút nghe lại | 3 | `QuestionAudioButton` có sẵn | M |
| R35 | canvas-engine.md | Renderer có prop `mode`, `onAnswered` trả `boolean` | 3 | TypeScript nếu dùng chung interface (chưa kiểm) | S: test duyệt `games/*/*Renderer.tsx` |
| R36 | canvas-engine.md | PairMatch nộp một lần; dùng lại `games/common` | 4 | `reviewer` | Không máy hoá nhỏ |
| R37 | rules | Diff gồm thay đổi chưa commit | 3 | = L10 | |
| R38 | rules | Ghi `lessons-inbox`, `corrections` khi có lỗi | 3 | quy trình | Không máy hoá |

## C. `corrections.md`: thứ chặn còn tồn tại?

Lúc lập (PR #49) đã đối chiếu 29 dòng: mọi thứ chặn tầng 2 ghi trong bảng vẫn còn trong code (24 dòng đến 2026-11-14 do `codebase-explorer` đọc, 5 dòng mới hơn tự kiểm: nhánh chặn `ERR` trong `.githooks/pre-commit`, `KNOWN_BAD_ROWS` đã gỡ khỏi checker log, luật `check-links` giữ nguyên, prompt A1, luật mật khẩu trong `CC`). Ngoại lệ trước PR này: test của `block-node-eval` (dòng 2026-11-12…14, ReDoS, chặn nhầm commit message) có trong repo nhưng **không chạy ở CI**, nên chỉ chặn khi có người chạy tay.

## Đã làm

**PR #49** (lập bản đồ):

- `CI` job `docs-scripts` chạy mọi test script do git theo dõi (`git ls-files 'scripts/*.test.mjs' '.claude/hooks/*.test.mjs'`) thay cho danh sách viết tay (5/22 file). Test mới tự được chạy: lỗi kiểu "quên thêm test vào CI" không còn viết ra được.
  - Đỏ rồi xanh: cho `shouldBlock` của `BNE` luôn trả `false` → lệnh CI mới báo 4 test hỏng; hoàn tác → 290/290 pass. Với danh sách cũ, thay đổi này lọt CI.
  - Tạm loại `ai-review/extract-srs.test.mjs` và `extract-uc.test.mjs`: lỗi thời so với `docs/srs/` (KNOWN-GAPS #18).

**PR đề xuất 1–3** (L8, R4, R11, R13, R24): test từ khoá hình trùng giữa hai hình khác tên; checker log kiểm SHA có trong git; ba rule ArchUnit (`publicFieldsAreConstants`, `strategiesDoNotValidateBusinessLogic`, `strategiesDoNotCallValidationChain`); R4 đã ở tầng 1 vì Spring Boot 4.1.1 gỡ `@MockBean`. Mỗi kiểm tra đã thử đỏ (chèn vi phạm) rồi xanh, chi tiết ở `docs/corrections.md` 2026-11-15.

**PR đề xuất 4** (R28, R29): `frontend/src/api/frontendRules.test.ts`. Thử đỏ: thêm `zustand` vào `package.json` và một lời gọi `axios.get` vào `src/hooks/useGames.ts` → hai test đỏ, hoàn tác xanh.

## Đề xuất chờ duyệt (cỡ S, mỗi cái một PR nhỏ)

Ưu tiên theo số lần lặp và rủi ro:
1. ~~**L8** test báo từ khoá trùng giữa hai hình~~ (đã làm).
2. ~~**R24** checker log kiểm SHA có thật~~ (đã làm).
3. ~~**R4, R11, R13** rule ArchUnit~~ (đã làm; R4 hoá ra đã ở tầng 1 nên chỉ thêm hai rule).
4. ~~**R28, R29** chặn thư viện state và gọi axios trực tiếp ngoài `axiosInstance.ts`~~ (đã làm).
5. **L1** chặn heredoc không nháy và `$'...'` trong `BNE` (cần chốt có chặn `cat > f <<EOF` không).
6. **L12, L13** quyền `ask` cho tạo nhánh, chặn `cd` (đổi cấu hình mọi phiên).
7. **KNOWN-GAPS #19**: nối `agent-guard` vào frontmatter các agent chỉ đọc có `memory`, hoặc xoá.
