# Kế hoạch hoàn thiện và nghiệm thu harness bằng Codex

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Phiên chính thực hiện tuần tự; subagent chỉ khảo sát, kiểm tra và review theo `CLAUDE.md`. Không hỏi duyệt chuyển task. Checklist dưới đây lưu kế hoạch ban đầu; trạng thái thực thi tiếp nối ở bảng sau và tasks/progress.md, không suy ra PASS từ kế hoạch.

## Trạng thái sau thực thi tiếp nối 17/11

| Task | Đã làm / kết luận trước source freeze |
|---|---|
| T02-Codex | Core trusted allow/deny/Stop + native child evidence PASS; Claude và hook thống kê cá nhân giữ giới hạn riêng |
| T05b | Đã viết matrix42 browser tests, sửa ORDERING/SPOT và callers, review sạch; nghiệm thu toàn bộ mã cuối theo receipt T09 mới |
| T06b-Codex | Chạy đủ52 lượt native,26 probes và judge mới; đúng verdict/lý do nhưng9/10 HIGH bị hạ mức. Không cấp nghiệm thu severity, không tự tuning vòng hai; giữ giám sát |
| T09 | Review toàn diff/follow-up và log audit sạch; sửa2 lỗi ghép nối có proof. Sau freeze chạy secret snapshot, all runner và check-report; receipt cuối trong ignored evidence/chat quyết định aggregate |

Sai khác kỹ thuật T06: original snapshots thiếu được ghi BLOCKED-original và dùng reconstructed có nhãn; moderation chỉ repro source facts, chưa Java/HTTP giả; A2 cùng subject/probe nhưng brief có thêm phương pháp, không phải plugin pstack hay cùng brief nguyên byte. Không giấu các giới hạn này bằng số52/52. Các checkbox lịch sử không được đổi sau receipt chỉ để làm tài liệu xanh.

**Goal:** Hoàn thiện hệ thống điều phối và kiểm soát AI cho phát triển có người giám sát bằng Codex, giữ cấu hình chung để sau này Claude tiếp tục các task sản phẩm.

**Architecture:** Giữ `.claude/agents/*.md` và `.claude/rules/` làm nguồn chung, sinh adapter Codex bằng checker hiện có. Dùng Git/CI và runner hiện tại để kiểm chứng; hook của từng host phải được chứng minh riêng. Thực hiện T02-Codex → T05b → T06b-Codex → T09; kết quả Claude và judge khác họ được theo dõi riêng.

**Tech Stack:** Node.js, Codex CLI đã cài, Playwright Chromium, React/TypeScript, Spring Boot/Maven/JDK21 và PostgreSQL Testcontainers; không thêm dependency.

**Spec:** [Kế hoạch gốc](../../../tasks/plan.md), [checklist hiện tại](../../../tasks/todo.md), [nghiệm thu hiện tại](../../harness-evals/acceptance.md), [bằng chứng T02](../../harness-evals/T02-host-smoke.md). Đây là kế hoạch tiếp nối, không thay thế lịch sử hoặc đánh dấu lại các task gốc.

**Trạng thái:** Đã lập kế hoạch theo yêu cầu ngày 2026-11-16; chưa triển khai các bước tiếp nối. Người dùng yêu cầu khi triển khai phải làm liên tục, tự đánh giá và chuyển task, không xin chấp nhận từng task.

## Người dùng, kết quả nghiệp vụ và hiện trạng

Người sử dụng là người phát triển dự án. Họ cần giao nhiệm vụ cho Codex, nhận thay đổi đã kiểm đúng phạm vi và biết chính xác lỗi, blocker, bước chưa chạy. Sau đợt này, họ chuyển sang Claude làm các nhiệm vụ khác mà không phải xây lại hệ thống quy tắc.

Đã đối chiếu mã/tài liệu trong worktree:

- Base Git đã xác nhận: `afb8f8b58f0be9846b470409bff6fa4e22eba8b5`; HEAD hiện trùng base, cây làm việc có nhiều thay đổi chưa commit và file untracked từ T01–T09. Không được bỏ chúng khỏi diff hoặc ghi đè bằng checkout sạch.
- `AGENTS.md`, `scripts/harness/check-agent-config.mjs`: nguồn vai trò chung và adapter Codex đã có; checker chạy trước đợt lập kế hoạch này trả PASS. Điều đó chưa chứng minh host thực thi hook.
- `docs/harness-evals/T02-host-smoke.md`: Codex gọi được model và shell read-only; native role mới có reported smoke. Host vẫn báo hook modified; lệnh dài vô hại đã thực thi thay vì bị chặn. Claude đã đăng nhập nhưng model bị quota ở lần kiểm gần nhất.
- `frontend/e2e/gameplay.spec.ts`: đã có QUIZ ở 360/768/1280 và CPF TAP tĩnh. `frontend/src/player/renderers/index.ts` đăng ký 10 renderer; đăng ký không tự chứng minh hành vi đã đạt.
- `frontend/src/components/editor/play/playTestRegistry.ts` cũng có 10 loại. `PlayTestPanel.tsx` chấm local, không tạo session/lưu điểm; `CpfWorkspace.tsx` chạy CPF preview. `frontend/src/player/api/realPlayerApi.ts` còn trả NotSupported; browser qua `/play/:shareCode` với mock không chứng nhận session/grading backend thật.
- `FakeAiConfiguration.java`: fake game generator hiện trả QUIZ; fake CPF loại motion khỏi ví dụ fishing. Vì vậy không thể dùng năm browser test hiện tại làm bằng chứng toàn renderer/motion.
- `evals/agents/{cases,rubric}.json` và `eval-agents.mjs`: 6 ca tổng hợp, hai lượt/ca; runner prepare/import và replay, không tự gọi model. Đây không phải bộ snapshot A1/A2 đầy đủ.
- A1 lịch sử có 5 ca reviewer và 6 ca log-auditor; A2 có 3 ca, so reviewer với plugin interrogate. Số lịch sử không phải kết quả mới của Codex; tính sẵn có của snapshot nguyên bản phải kiểm ở T06b.
- Receipt toàn bộ trước đó không chứng nhận cây mã sau các cập nhật T02. T09 phải tạo receipt mới sau lần sửa cuối.

## Global Constraints

- Phạm vi là harness phát triển có người giám sát; không phải hoàn thiện toàn sản phẩm, giáo dục học hay agent tự trị.
- Dùng worktree hiện tại; không tạo branch, stage, commit, push, merge, deploy; SHA nhật ký giữ `TODO`.
- Giữ DSL/REST, kiến trúc domain và dữ liệu người dùng; không gọi AI thật của sản phẩm hoặc database production.
- Không thêm dependency, tự mua quota, đổi tài khoản, sửa model/PATH toàn máy, trust store hoặc tắt sandbox.
- Giữ `.claude/` dùng được; không đổi quy tắc chung thành lời gọi chỉ Codex hiểu. Không triển khai router tự chuyển model/CLI.
- Checkout gốc D: chỉ có ngoại lệ hai command đã được người dùng duyệt trong đợt T02 trước. Không mở rộng ngoại lệ này thành quyền thay cấu hình cá nhân hay hook khác.
- Test sử dụng dữ liệu tổng hợp; không lưu secret, topic/prompt/output thật của giáo viên vào evidence. Raw evidence ở `backend/target/harness-evidence/`, không commit.
- Không dùng điểm số, số test lịch sử, mock hoặc xác nhận thao tác UI thay bằng chứng mới. Chỉ ghi PASS cho phạm vi thực sự đạt.
- Mỗi task: cập nhật tiến độ, tự đánh giá, sửa lỗi trong phạm vi, review theo routing, ghi nhật ký AI; sau đó tự chuyển bước.

## Yêu cầu, nghiệm thu và truy vết

Giữ ID nghiệp vụ của kế hoạch gốc; các dòng dưới cụ thể hóa cho đợt tiếp nối.

| BR | Kích hoạt → kết quả cần có | Thất bại / ngoại lệ | Task, thành phần và bằng chứng |
|---|---|---|---|
| BR-01 | Codex nhận task hoặc gọi agent → nhận đúng mục tiêu/base, đọc rule và xét cả staged/unstaged/untracked | Không đủ context hoặc không có native tool thì ghi thiếu, không giả hoạt động của child | T02, T06; role/adapter, transcript công cụ và diff inventory |
| BR-02 | Chạy công cụ/kiểm tra → đúng CLI và guard thật; cùng bộ kiểm của repo | Thiếu môi trường/auth/trust → BLOCKED; không bỏ guard hoặc test để xanh | T02, T09; hooks/list, allowed/denied control, lifecycle và report |
| BR-03, BR-04 | Chơi renderer đã hỗ trợ → input thật tạo feedback, chuyển màn, kết thúc/reset đúng; lỗi asset không làm flow treo | Dữ liệu sai bị từ chối; chức năng chưa cài có blocker cụ thể, không viết assertion coi lỗi là thành công | T05b; browser specs, fixture hợp lệ, trace và coverage matrix |
| BR-05 | Dùng vai trò AI → có các lượt mới độc lập, ca lỗi/ca sạch/ca giữ lại và bằng chứng repro | Bỏ sót nghiêm trọng hoặc báo sai ở ca sạch thì không cấp chứng nhận; thiếu snapshot/fresh session thì BLOCKED phần đó | T06b; manifest, rubric, raw verdict, judge và repro |
| BR-06 | Phát hiện lỗi do harness/agent → sửa tại tầng code/test mạnh nhất hợp lý | Không tự duyệt lesson hoặc thêm exemption; không tự biến lỗi sản phẩm thành tính năng mới | T02–T09; regression tập trung, corrections/known-gaps khi cần |
| BR-07 | Bàn giao hoặc chuyển task → kết luận gắn source và evidence; tự chuyển tiếp | Evidence cũ/thiếu bước/mã đổi sau test không thành PASS | Mọi task; progress/log/matrix; T09 receipt mới |

Các ca nghiệm thu bắt buộc:

1. **Host hoạt động:** lệnh ngắn vô hại chạy được; lệnh dài vi phạm bị hook deny trước thực thi, không in marker. Hook Stop phải có bằng chứng chạy thật hoặc ghi riêng BLOCKED.
2. **Context mới:** child tự đọc rule và nhận đúng base/diff, trả lệnh kiểm đúng; cần tool events/child evidence, không chỉ lời kể của parent.
3. **Browser thành công:** với mỗi renderer được nghiệm thu, thao tác qua UI → payload/feedback đúng → tiến trình/kết quả/reset đúng trong mode và luồng thật sự được hỗ trợ.
4. **Biên và lỗi:** viewport dọc cần xoay thì có thông báo đúng; asset ảnh/audio bị lỗi có hành vi fallback theo mã/đặc tả; dữ liệu fixture sai bị validator từ chối.
5. **Phụ thuộc lỗi:** Docker/browser/native agent thiếu thì BLOCKED đúng nhóm; quota Claude không chặn các bước Codex độc lập.
6. **Đánh giá mù:** agent không nhận rubric/đáp án; không đưa kết quả lượt trước vào lượt sau. Ca sạch không bị gán lỗi nghiêm trọng vô căn cứ.
7. **Ngoài phạm vi:** room/grading/persistence còn mock/planned được ghi đúng; không suy ra backend thật từ browser dùng mock.
8. **Bằng chứng cuối:** report mới khớp mã cuối; sửa mã hoặc có lượt verify mới lỗi/gián đoạn thì receipt cũ không còn được dùng.

## Phạm vi, lựa chọn và giới hạn

- **Bắt buộc:** khép hoặc chứng minh blocker T02-Codex; matrix browser T05b; đánh giá Codex mở rộng T06b; review/kiểm tổng hợp T09.
- **Để sau:** gọi model Claude và kiểm host Claude, judge khác họ model, thiết bị thật, remote CI khi chưa có commit/push được phép. Chúng vẫn hiện là chưa kiểm, không xóa khỏi nghiệm thu gốc.
- **Không làm:** tự động chuyển CLI, orchestration 24/7, tự merge/deploy, thêm endpoint test vào production, hoàn thiện API planned để làm test xanh.
- **Phương án chọn:** củng cố runner/fixture và adapter hiện có. Sửa prompt đơn thuần không giải quyết được hook chưa enforce; thay bằng framework mới làm tăng phạm vi và chưa chứng minh cần thiết.
- **Đánh đổi:** tiến độ Codex không phải chờ quota Claude, nhưng chỉ được kết luận nghiệm thu Codex có giám sát; không gọi là đã nghiệm thu đầy đủ cả hai host.

## Review Focus

| Điều kiện dễ bỏ sót | Task chịu trách nhiệm và phép kiểm |
|---|---|
| Linked worktree đọc hook ở checkout gốc | T02: đối chiếu source/path/hash của hooks/list với file thực tế trước khi thử |
| Exit0 của phiên model che việc hook không chặn | T02: kiểm tool event, deny và marker, không chỉ process exit |
| Input kéo/thả/chuyển động đúng ở desktop nhưng sai khi đổi tỉ lệ | T05b: pointer qua browser tại viewport hợp lệ và kiểm orientation ở dọc |
| Snapshot đánh giá rò đáp án hoặc dùng lại context | T06b: bundle trung tính, key ngoài bundle, session/role/source hashes cho từng lượt |
| Tài liệu/người review đổi source sau lượt all xanh | T09: cập nhật hết source trước freeze, re-run nếu còn thay đổi, check-report là kiểm cuối |

## Cách thực thi liên tục và tự đánh giá

Không có checkpoint xin người dùng duyệt giữa bốn task. Mỗi task chạy tuần tự theo chu trình: đọc phạm vi → thực hiện → kiểm → tự đánh giá/review → sửa và kiểm lại phần bị ảnh hưởng → ghi trạng thái → task tiếp theo.

- PASS → tự chuyển task tiếp theo.
- FAIL do phần vừa sửa → sửa nguyên nhân và chạy lại kiểm liên quan trước khi kết luận task; không lặp vô hạn cùng một cách thất bại.
- BLOCKED do host/quota/môi trường/quyền chưa có → lưu lỗi, phép thử và phần thiếu; tiếp tục phần độc lập của task kế. Bước phụ thuộc blocker được đánh dấu BLOCKED, không chạy giả. T09 vẫn tổng hợp được tình trạng nhưng không tuyên bố hoàn tất.
- Khi cần thao tác bảo mật chỉ người dùng làm được, không tự trust, không hỏi duyệt lặp lại và không biến yêu cầu “làm liên tục” thành quyền vượt bảo vệ. Ghi blocker và tiếp tục phần khác; tổng hợp việc cần người dùng ở báo cáo cuối.
- Chỉ được chủ động sửa code/test/config trong phạm vi đã chốt và quyền đã có. Thay đổi contract, dependency hoặc hạ tiêu chí không được tự suy diễn là được phép.
- Giữ một dòng tiến độ ngắn sau mỗi task; nếu phiên bị giới hạn/ngắt, phiên tiếp đọc plan, progress và Git để tiếp tục từ bước chưa xong, không giả tiến trình vẫn chạy nền.

### T02-Codex — Chứng minh CLI, vai trò và guard trên host thật

**BR / phụ thuộc:** BR-01,02,07; dùng T01 hiện có. Ưu tiên đầu tiên.

**Files:** kiểm `.codex/hooks.json`, `.codex/agents/*.toml`, nguồn `.claude/agents/*.md`, `AGENTS.md`, `CLAUDE.md`, `scripts/hooks/block-node-eval.{mjs,test.mjs}`, `scripts/ai-log/rotate.mjs`, `scripts/harness/check-agent-config.{mjs,test.mjs}`. Chỉ sửa nơi có nguyên nhân được chứng minh. Cập nhật `docs/harness-evals/T02-host-smoke.md`, `verification-matrix.md`, `acceptance.md`, `tasks/{todo,progress}.md`, nhật ký. Không sửa trust store; file nguồn checkout gốc phải giữ giới hạn quyền nêu trên.

**Input → output:** binary/model/sandbox đã kiểm, hooks metadata và lỗi thật → cách chạy tái lập được, kết quả từng ca host và blocker rõ. T05/T06 chỉ nhận những khả năng đã chứng minh, không nhận một cờ PASS chung.

- [ ] Ghi inventory ban đầu: HEAD/base, staged/unstaged/untracked liên quan, binary path/version, model có sẵn, sandbox và hook source/path/hash. Giữ mọi thay đổi đang có.
- [ ] Đọc tài liệu chính thức hiện hành và schema từ bản host đã cài về hook/trust; đối chiếu lại packaged launch với CLI npm cũ. Không sửa cấu hình toàn máy hoặc tải CLI khác chỉ để thử.
- [ ] Tái hiện lỗi bằng dữ liệu vô hại; phân biệt lỗi nạp config, trust không được lưu, khác scope, matcher và hook runtime. Tối thiểu một control được phép và một control phải bị chặn.
- [ ] Nếu lỗi nằm ở adapter/script được phép sửa: thêm regression nhỏ chứng minh lỗi trước sửa, sửa tối thiểu tại nguồn chung rồi sinh adapter; giữ hook/thiết lập người dùng khác. Nếu lỗi thuộc trust/host không thể sửa trong quyền hiện có: ghi BLOCKED, không bypass.
- [ ] Gọi native test-verifier với context mới; cung cấp mục tiêu/base, không đưa đáp án. Thu tool events/child result chứng minh đọc quy tắc và xét đủ diff. Không tái dùng kết quả “reported smoke” làm chứng nhận mới.
- [ ] Chạy phiên mới kiểm lại allowed/deny và Stop lifecycle. Với rotate, chỉ trigger phiên Stop bình thường, không thêm log giả hoặc sửa archive để ép nó hoạt động; nếu bảng chưa đến ngưỡng, chứng minh hook có chạy là đủ, không đòi phải rotate dữ liệu.
- [ ] Tự đánh giá từng ca; cập nhật evidence và tiếp tục T05b. Hook còn không enforce thì T02-Codex vẫn BLOCKED, không đổi thành PASS nhờ Git/CI.

**Lệnh kiểm local:** `node --test scripts/harness/check-agent-config.test.mjs scripts/hooks/block-node-eval.test.mjs`; `node scripts/harness/check-agent-config.mjs`. Kỳ vọng exit0 và không drift. Phép thử host cần CLI/model thật, lưu exact argv/cwd/version/exit/tool events trong evidence; không sao chép command cũ khi version/schema đã đổi.

**Done:** CLI và native role có bằng chứng trực tiếp; lệnh hợp lệ chạy, lệnh vi phạm bị deny trước thực thi, Stop có evidence; hoặc task có blocker cụ thể và chưa được nghiệm thu. Claude giữ trạng thái riêng.

### T05b — Bổ sung browser coverage cho renderer/CPF/asset failure

**BR / phụ thuộc:** BR-03,04,07; dùng T03/T04/T05a. Không phụ thuộc quota Claude; chỉ các phép thử host phụ thuộc T02.

**Files:** dùng lại `frontend/e2e/{gameplay,teacher-flow}.spec.ts`, `frontend/playwright.config.ts`, `backend/src/test/java/com/aigameplatform/backend/flow/{FakeAiConfiguration,FakeAiConfigurationTest,TeacherFlowVerificationTest}.java`, `backend/src/test/java/com/aigameplatform/backend/e2e/{E2eBackendApplication,E2eBackendApplicationTest}.java`; fixture `backend/src/test/resources/{ai-output-examples,cpf-examples}/`. Dự kiến thêm `frontend/e2e/{renderer-gameplay,cpf-gameplay}.spec.ts` để không phình một spec. Đọc `frontend/src/components/editor/{PlayTestPanel,CpfWorkspace}.tsx`, registry preview/player, `frontend/src/services/mock/gameFixtures.ts`, `frontend/src/player/api/{mockPlayerApi,realPlayerApi}.ts`. Cập nhật `docs/harness-evals/verification-matrix.md`, `route-matrix.json` khi liên kết test đổi; không tạo thêm một bản matrix trùng nguồn.

**Input → output:** dispatcher 10 gameType và CPF fixture đã qua validator → ma trận gameType/control/mode/viewport/error, browser tests và evidence; T09 dùng đúng matrix này để kết luận coverage.

- [ ] Chốt inventory từ registry và routes thực: QUIZ, ODD_ONE_OUT, MATCHING, MEMORY_CARD, VISUAL_CLOZE, DRAG_DROP, WORD_SCRAMBLE, ORDERING, AUDIO_VISUAL_MATCH, SPOT_THE_TARGET; ghi rõ preview/play/review nào có đường UI thật. CPF kiểm theo control/motion của engine hiện có, không coi mọi tổ hợp là đã hỗ trợ.
- [ ] Phân loại đường backend/Postgres thật, fake AI, session/grading mock và tính năng planned. Giữ nguyên nhãn; không thêm student/room API ngoài phạm vi để đổi nhãn thành thật.
- [ ] Dùng `/workspace/editor` cho 10 renderer chơi thử và CPF preview; dùng `/play/:shareCode` với fixture `MOCK00`…`MOCK09` cho 10 renderer player mock. Mỗi dòng phải ghi rõ chấm local/mock; không kỳ vọng persistence điểm ở PlayTestPanel hoặc gắn nhãn chấm backend thật khi realPlayerApi còn NotSupported.
- [ ] Tái dùng JSON ví dụ có sẵn; fake AI chọn fixture hữu hạn theo request hợp lệ và từ chối kịch bản không biết. Bổ sung fixture CPF theo ví dụ fishing/catch/archery/rabbit/sort/race khi cần; không còn bỏ motion ở ca đang đo motion. Trước dùng, chạy validator/test fixture, có ca sai bị từ chối.
- [ ] Với mỗi renderer: thao tác thật bằng mouse/touch/pointer phù hợp, nộp đáp án qua luồng hiện có, kiểm payload/phản hồi, chuyển câu, kết thúc và reset ở nơi hỗ trợ. Không đọc đáp án từ state nội bộ để tự xác nhận; key nằm trong fixture độc lập.
- [ ] Với CPF: phủ từng nhánh control TAP, DRAG_X, DRAG_FREE/SORT/DROP, AIM_SHOOT, TAP_MOVE và nhóm tiến trình PICK_ONE/PICK_ALL/SORT bằng ví dụ có sẵn; thêm motion FALL, FLOAT_UP, PATROL_X, BOB, SWAY_UP, ORBIT, CROSS và control STATIC. Mỗi nhánh có ít nhất một ca hợp lệ, không đòi tích Descartes mọi control/motion. Tái dùng biến thể trong `cpfScene.test.ts`/`cpfPlayability.test.ts` cho motion chưa có JSON mẫu. Ma trận không được đánh đồng drag pointer với API setState hoặc bắn trúng bằng gọi thẳng hàm engine.
- [ ] Kiểm responsive ở 360/768/1280 cho nhóm thích hợp; loại landscape-only phải có rotate prompt ở dọc và chơi được ở ngang. Thời gian/chuyển động dùng clock/pointer ổn định, không tăng retries hoặc sleep cố định để che flaky.
- [ ] Chặn request ảnh/audio bằng Playwright để đo lỗi asset; assert fallback/không crash theo mã/đặc tả, giữ khả năng thao tác. Bỏ assertion “ảnh phải hiện” đối với ca cố ý làm hỏng ảnh; thay bằng hành vi fallback cụ thể.
- [ ] Nếu phát hiện bug nhỏ trong luồng đã cài và thuộc phạm vi: regression đỏ rồi sửa tối thiểu, tìm callers và chạy review/test theo routing. Tính năng thiếu hoặc cần đổi contract: ghi blocker sản phẩm, không tự triển khai rộng.
- [ ] Chạy đủ bộ browser sau các ca tập trung; cập nhật matrix đến từng ca, tự đánh giá và chuyển T06b.

**Lệnh kiểm:** từ root: `node scripts/harness/verify.mjs browser --base afb8f8b58f0be9846b470409bff6fa4e22eba8b5`. Khi cần chạy riêng, từ `frontend`: `npm run e2e -- e2e/renderer-gameplay.spec.ts e2e/cpf-gameplay.spec.ts`. Nếu sửa Java fixture: từ `backend`, `.\mvnw.cmd --batch-mode test "-Dtest=FakeAiConfigurationTest,TeacherFlowVerificationTest,E2eBackendApplicationTest" "-Djacoco.skip=true"`; sau đó T09 vẫn chạy full backend. Cần JDK21, Docker, Chromium; không gọi AI sản phẩm thật.

**Done:** mọi dòng matrix trong phạm vi có test/evidence đạt hoặc blocker rõ, không còn ô “chưa biết”. BLOCKED không phải full browser PASS; unit test không thay browser; thiết bị thật và chất lượng giáo dục vẫn ngoài đợt này.

### T06b-Codex — Đánh giá mở rộng với context mới và đáp án tách riêng

**BR / phụ thuộc:** BR-01,05,07; dùng role/source cuối T02 và fixture T03. Nếu native fresh session chưa hoạt động, chỉ phần chuẩn bị/local tiếp tục; model trials liên quan BLOCKED.

**Files:** giữ `evals/agents/{cases,rubric}.json`, `scripts/harness/eval-agents.{mjs,test.mjs}` cho smoke hiện có. Thêm `evals/agents/history-manifest.json` và `history-rubric.json` cho nguồn/hash/case/repro của A1/A2; bundle không kèm key dựng ở target. Thêm `docs/harness-evals/agent-eval-codex-2026-11-16.md`; giữ nguyên số lịch sử trong `A1-agent-evals.md`, `A2-interrogate.md`, chỉ thêm liên kết kết quả mới. Role thay đổi tại `.claude/agents/`, sinh lại `.codex/agents/`.

**Input → output:** snapshot thật hoặc reconstructed được gắn nhãn, role/source hash và rubric → verdict các lượt mới, đánh giá bằng repro, lỗi bỏ sót/báo nhầm, quyền sử dụng có giám sát. Không ép historical diff vào importer vốn chỉ replay `subject.mjs`.

- [ ] Chốt 11 ca A1 (5 reviewer, 6 log-auditor), 3 ca A2 và nguồn Git/snapshot của từng ca. Kiểm SHA và nội dung thật; không mặc định bản đầu PR còn trong lịch sử. Snapshot không tìm được thì ghi BLOCKED-original; ca dựng lại phải ghi reconstructed và không tính là chạy lại nguyên bản.
- [ ] Ghi rõ ba ca A2 trùng nguồn A1 r-k1…r-k3; không báo 14 tình huống độc lập hoặc so sánh tỷ lệ cũ/mới mà bỏ khác biệt model, prompt và phương pháp.
- [ ] Tạo manifest trung tính, key riêng và repro không dùng secret thật. Với ca moderation/CI dùng server local giả và credential tổng hợp; không phát request đến dịch vụ thật. Ca hook dùng repo nháp/copy riêng, không chèn lỗi vào cây làm việc chính.
- [ ] Giữ bộ 6 smoke hiện có và bổ sung nhóm hard/held-out trước khi chỉnh prompt: evidence cũ, thiếu bước, model/tool lỗi, staged/unstaged/untracked và liên kết CI-config-hành vi. Tối thiểu một ca lỗi và một ca sạch cho mỗi vai trò reviewer/test-verifier/log-auditor trong nhóm bổ sung. Key/tiêu chí không nằm trong brief; độ mù không phải sandbox bảo mật, giới hạn đọc bundle phải ghi rõ.
- [ ] Chạy hai lượt độc lập cho mỗi ca bằng native Codex fresh context; lưu session ID, model thực tế, role/prompt/source hash, command, exit, raw verdict, runtime và tool evidence có sẵn. Không tái dùng agent đã xem ca khác khi hết slot; thiếu phiên mới thì ghi BLOCKED.
- [ ] Với A2: chạy reviewer và quy trình phản biện bằng Codex trên cùng bundle/brief, mỗi phương pháp hai lượt/ca; phản biện phải tái hiện phát hiện trước giữ lại. Ghi rõ đây là protocol Codex, không tự gọi nó là plugin `/pstack:interrogate` đã chạy hoặc phép đo y hệt plugin cũ.
- [ ] Smoke dùng `--prepare`/`--import` hiện có. Historical/held-out dùng native sessions và manifest/report riêng, tái chạy từng repro và chấm theo rubric; không xây model runner/SDK mới. Nếu sửa logic manifest/importer thật sự cần thiết thì có regression hẹp và giữ tương thích 6 smoke cũ.
- [ ] Judge ở context mới không nhận lý do tự biện hộ của người thực hiện. Ghi rõ cùng họ model; repro tất định xác nhận lỗi cụ thể, không giả là đã có judge khác họ. Không báo token/chi phí nếu host không cung cấp.
- [ ] Ngưỡng nghiệm thu dự kiến: đủ hai lượt độc lập cho mỗi ca bắt buộc, không bỏ sót CAO đã định nghĩa, không báo CAO sai ở ca sạch; giữ thang điểm 0/1/2 A1 riêng với pass/fail của probe. Đây là tiêu chí chọn cho đợt này, chưa có số đo mới và không bảo đảm tổng quát.
- [ ] Nếu không đạt: phân biệt role lỗi với fixture/key sai; sửa đúng nguồn có bằng chứng. Tối đa một vòng sửa prompt và chạy lại cả bộ bị ảnh hưởng trong đợt này, giữ mọi lượt xấu; held-out đã dùng để sửa không còn được gọi là chưa thấy. Chưa đạt tiếp thì FAIL/hạn vai trò, không điều chỉnh key/ngưỡng để qua.
- [ ] Cập nhật report, routing/giới hạn có giám sát và tiếp tục T09; không tự nâng quyền merge/deploy.

**Lệnh local:** `node --test scripts/harness/eval-agents.test.mjs scripts/harness/check-agent-config.test.mjs`; `node scripts/harness/eval-agents.mjs --validate`; `node scripts/harness/eval-agents.mjs --prepare`; sau các smoke thật: `node scripts/harness/eval-agents.mjs --import backend/target/harness-evidence/agent-trials-codex.json`; `node scripts/harness/check-agent-config.mjs`. Prepare/validate PASS không phải model-eval PASS. Historical commands/repro cụ thể phải có trong từng manifest entry trước khi gọi model.

**Done:** report mới đủ nguồn/ca/lượt/role và lỗi; tách smoke, historical, reconstructed, held-out, reviewer/phản biện. Mọi thiếu đầu vào/fresh session vẫn là blocker. Claude và judge khác họ giữ chưa kiểm.

### T09 — Review, kiểm tổng hợp và bàn giao mã cuối

**BR / phụ thuộc:** BR-01…07; nhận kết quả cả ba task, kể cả blocker. Chỉ cấp kết luận hoàn tất Codex khi mọi điều kiện bắt buộc Codex đạt.

**Files:** review toàn diff nhiệm vụ với base đã xác nhận và snapshot đầu đợt; `docs/harness-evals/{acceptance,README,verification-matrix}.md`, report T02/T06, `tasks/{todo,progress}.md`, `ai-usage-log.md`. Chỉ sửa `verify.{mjs,test.mjs}` nếu có bug thật; không thay runner để bỏ bước đỏ. Không sửa tay archive.

**Input → output:** source cuối, diff và evidence từng task → review độc lập, báo cáo all mới, receipt hợp lệ và danh sách giới hạn còn lại.

- [ ] Review diff với base gồm staged/unstaged/untracked; tách thay đổi đợt tiếp nối khỏi phần T01–T09 đã có, không coi tất cả là vừa viết. Reviewer chỉ nhận diff/tiêu chí và nguồn quy ước, không nhận lời giải thích để hướng kết luận.
- [ ] Chạy reviewer/test-verifier và reviewer chuyên môn theo file thực sự đổi trong `CLAUDE.md`; chỉ docs không chạy lại app build vô cớ. Sửa issue rồi chạy lại kiểm liên quan; log-auditor đối chiếu nhật ký, không tự commit.
- [ ] Đối chiếu matrix/contract/config/lessons; giữ trạng thái thật cho Claude, cross-family judge, remote CI, mock/planned, lint/PIT ngoài scope và thiết bị thật. Không biến phần để sau thành PASS.
- [ ] Cập nhật mọi tài liệu source, task state và nhật ký trước lần chạy tổng hợp cuối. Những task có kết quả phụ thuộc report cuối ghi “đợi receipt mới”, không ghi PASS trước bằng chứng.
- [ ] Kiểm gitleaks trên snapshot thực gồm uncommitted/untracked liên quan, không chỉ staged rỗng; không commit snapshot/evidence. Kiểm cleanup chỉ tài nguyên do lần chạy sở hữu, không kill theo tên process hoặc dọn container người dùng.
- [ ] Chốt source, dùng JDK21/Docker/Chromium và Git Bash của riêng process trên Windows; chạy `node scripts/harness/verify.mjs --base afb8f8b58f0be9846b470409bff6fa4e22eba8b5`.
- [ ] Đọc đủ log/count/skip và report mới. Nếu có sửa source sau đó, chạy lại; nếu nhóm kiểm khác chạy sau lượt all thì phải tạo lượt all mới theo latest-attempt policy. Không tái chạy PIT trừ khi Java validation/test/build/PIT config đã đổi hoặc có concern mới.
- [ ] Lệnh cuối nhận receipt: `node scripts/harness/verify.mjs --check-report <report.json-vừa-sinh>` → exit0. Đường dẫn thực được ghi ở báo cáo cuối chat/ignored evidence; không sửa tài liệu tracked sau đó chỉ để chép path rồi làm stale receipt.
- [ ] Báo một lần kết quả Codex, task nào đạt/không đạt/blocker, số kiểm/skip và evidence. Nếu còn T02/T05b/T06b bắt buộc chưa đạt thì kết luận “chưa hoàn tất”, dù runner all xanh.

**Done:** source cuối qua review và kiểm phù hợp, receipt all hợp lệ; từng yêu cầu Codex có bằng chứng tương ứng. Chưa có runtime Claude thì chỉ nghiệm thu Codex có giám sát, không nghiệm thu toàn bộ hai CLI.

## Bản tự đánh giá sau mỗi task

Ghi vào `tasks/progress.md`: mục tiêu đã chứng minh; file/diff đã đổi; lệnh và kết quả mới; ca còn fail/blocked/skipped; lỗi do mình gây ra và cách sửa nếu có; evidence; lý do tự chuyển task tiếp theo. Không cần người dùng duyệt bước chuyển.

## Kiểm kế hoạch và điểm kết thúc

- [ ] Khi triển khai xong T02-Codex, T05b, T06b-Codex và T09, đối chiếu toàn bộ BR với matrix và evidence.
- [ ] Không bỏ sót trạng thái native role/guard lifecycle, browser modes/mock boundaries và độ độc lập của eval.
- [ ] Giữ danh sách việc Claude/cross-family chờ kiểm riêng để lần chuyển công cụ sau không mất nhiệm vụ.
- [ ] Chỉ thông báo hoàn tất trong phạm vi có bằng chứng; không yêu cầu xác nhận chuyển task, không tự thực hiện sản phẩm ngoài phạm vi.

Tự rà soát khi lập kế hoạch: đã giữ nguồn chung Claude/Codex; giữ task gốc chưa hoàn tất; phân biệt local/host/browser/model trials; nêu đầu vào thiếu của A1/A2; không dùng quota hay thay kế hoạch để hợp thức hóa guard chưa chạy. Đây là kế hoạch thực thi, chưa phải nghiệm thu.
