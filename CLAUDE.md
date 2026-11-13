# CLAUDE.md

Hướng dẫn cho AI agent khi làm việc trong repo này. Đây là đồ án tốt nghiệp: AI-Game Platform (backend Spring Boot + frontend React), dùng Supabase làm PostgreSQL managed.

## Cấu trúc repo

- `backend/` — Spring Boot 4.1.x, Java 21, Maven (dùng `./mvnw`, không cần cài Maven local)
- `frontend/` — React + TypeScript (Vite), Tailwind CSS v4

## Quy tắc chung (áp dụng cả 2 phần)

- **Không tự ý thêm thư viện/dependency mới** nếu chưa hỏi lại user trước, kể cả khi có vẻ "cần thiết" cho task.
- **Không bao giờ hardcode secret** (connection string, password, API key) vào source code. Luôn đọc qua biến môi trường (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `VITE_API_BASE_URL`...). Nếu thêm biến env mới, cập nhật cả `.env.example` tương ứng.
- Việc UI giáo viên làm trực tiếp trên nhánh `everyone/UI`; không tự tạo nhánh mới khi chưa được cho phép.
- Comment ngắn gọn, chỉ giải thích phần không tự rõ nghĩa (ví dụ: lý do dùng Session Pooler thay vì Transaction Pooler).
- Trước khi `git add -A` hoặc commit, kiểm tra `git status`/diff để không lỡ commit `.env`, file build (`target/`, `node_modules/`, `dist/`) hay secret.

## Quy ước theo khu vực (`.claude/rules/`)

Claude Code tự nạp các file này khi đọc file khớp `paths`. Lập kế hoạch hoặc tạo file mới ở khu vực nào thì tự đọc trước file rule của khu vực đó.

- `backend.md` (`backend/**`): package, Flyway, Supabase, Hikari, Lombok, `@MockitoBean`, kiểm duyệt Layer 3.
- `frontend.md` (`frontend/**`): client state, react-query, `axiosInstance`, `useAuth()`, Tailwind v4, thư viện đã duyệt sẵn.
- `canvas-engine.md` (`frontend/src/games/**`): UX cho trẻ, prop `mode`, cách nộp bài, phần dùng chung của renderer.

## Kiến trúc domain đã chốt — KHÔNG tự ý thay đổi

- `QuestionGame` (10 subclass theo 10 loại game), `PlayInteractionDetail` (7 subclass theo nhóm cấu trúc câu trả lời — KHÔNG phải 1-1 với 10 game type, xem ánh xạ bên dưới), `GameSession` — cả 3 đều dùng **JPA JOINED inheritance**, không dùng SINGLE_TABLE hay TABLE_PER_CLASS.
- Ánh xạ game type → `PlayInteractionDetail` subclass:
  - SingleChoice: Quiz, Audio-Visual Match, Odd One Out
  - TargetTap: Spot the Target
  - PairMatch: Matching, Memory Card
  - Placement: Drag & Drop
  - ClozeFill: Visual Cloze
  - Sequence: Ordering
  - WordScramble: Word Scramble
- Design pattern bắt buộc, không tự ý đổi cách tiếp cận:
  - **Strategy**: `GameContentStrategy` — mỗi game type 1 class implement, KHÔNG chứa `validateBusinessLogic()` (thuộc trách nhiệm `GameValidationService`).
  - **Chain of Responsibility**: `AbstractGameValidator` → Layer 1 JSON Schema → Layer 2 Business Logic → Layer 3 Safety Moderation. Không bypass layer nào.
  - **Factory Method**: `GameSessionFactory` (tạo session), `InteractionDetailFactoryRegistry` (map gameType → đúng subclass factory).
- AI integration dùng **LangChain4j duy nhất** — không dùng Spring AI.
- Enum/discriminator `gameType` dùng `UPPER_SNAKE_CASE` (`QUIZ`, `SPOT_THE_TARGET`...).

## Contract đã freeze — mọi thay đổi field/endpoint phải đồng bộ cả Backend, Frontend và doc

- JSON DSL Schema v1.0.0 (cấu trúc field `QuestionGame` cho từng loại game). Đặc tả: `docs/game-json-dsl-v1.0.0.md`; JSON Schema: `backend/src/main/resources/schema/game-dsl/1.0.0/*.schema.json` (mỗi loại game một file, tự chứa); record Java: `dto/dsl`. Kiểu TypeScript: `frontend/src/types/game-dsl.types.ts`. Sửa DSL phải sửa đồng bộ cả bốn nơi và cập nhật test `GameDslSchemaTest`. "Dạng đầu ra của AI" (đơn giản hơn, dùng làm Structured Outputs): schema `backend/src/main/resources/schema/game-ai-output/1.0.0/*.schema.json`, record `dto/dsl/ai`, kiểm tra bằng `service/validation/ai/AiOutputValidator`; sửa thì cập nhật test `AiOutputValidatorTest`.
- REST API Contract v1.1.0 (endpoint, response envelope `{success, data}` / `{success, error}`, error code). Nguồn sự thật: `docs/openapi/openapi.yaml` (OpenAPI 3.1, thiết kế trước, code theo sau). Mỗi operation có `x-status`: `implemented` (đã cài), `extended-pending` (đã có nhưng phần mở rộng chưa cài), `planned` (chưa cài, code theo đúng spec). Sửa endpoint/field/mã lỗi phải sửa file này trước, rồi kiểm tra bằng `npx @redocly/cli lint docs/openapi/openapi.yaml` (chỉ để kiểm tra cú pháp spec, không phải để xem). **Đọc spec lớn (~4000 dòng): mở `docs/openapi/INDEX.md` trước** (operation/schema nằm ở dòng nào), rồi `Read` đúng đoạn bằng `offset`/`limit`; không nạp cả file. Sửa `openapi.yaml` xong chạy `node scripts/openapi/build-index.mjs` để làm mới INDEX (test `build-index.test.mjs` sẽ đỏ nếu quên). Xem API trực tiếp: chạy Backend rồi mở `http://localhost:8080/swagger-ui.html` (springdoc, sinh từ controller đã cài nên chỉ thấy endpoint đã có code, có nút Try it; tắt khi triển khai bằng `SWAGGER_ENABLED=false`). Code Frontend auth hiện còn theo contract cũ (refreshToken trong body, `AuthUser.id`), cần chuyển sang cookie và `teacherId`.
- WebSocket Message Format v1.0.0 (`/topic/session/{sessionId}/...`, `/app/session/{sessionId}/...`)

Link doc: DSL ở `docs/game-json-dsl-v1.0.0.md`, REST ở `docs/openapi/openapi.yaml`; tài liệu WebSocket Message Format riêng chưa viết (TODO, tạm xem tag `Realtime` trong `openapi.yaml`). Trước khi sinh code liên quan đến field JSON, endpoint mới hay message WebSocket mới, đọc đúng doc tương ứng; không tự đặt tên field/endpoint khác đi.

## Nguyên tắc thiết kế: OOP, SOLID, GRASP

Chi tiết ở `.claude/rules/design-principles.md` (tự nạp khi đụng `backend/**`, `frontend/src/**`; lập kế hoạch hoặc review thì đọc trước). Tóm tắt: đóng gói, đa hình thay cho `switch(gameType)`, mở rộng bằng class mới, DI qua constructor, API ngoài đi qua interface. Nguyên tắc mâu thuẫn với "Kiến trúc domain đã chốt" thì ưu tiên kiến trúc đã chốt và báo user.

## Testing & ngôn ngữ

- Unit test phần gọi API ngoài (Gemini, OpenAI Moderation, Google TTS) phải **mock**, không gọi API thật trong test (tránh tốn tiền/quota của team).
- Identifier/code viết tiếng Anh; comment có thể tiếng Việt.

## Ghi log sử dụng AI (bắt buộc)

- Mỗi khi bạn (agent) sinh hoặc sửa code/nội dung đáng kể trong repo (tính năng, module, config, migration, test...), phải thêm 1 dòng vào bảng trong `ai-usage-log.md` ở root trước khi báo hoàn thành. Không cần log cho thay đổi nhỏ như sửa typo hay format.
- Điền theo đúng quy ước ở đầu `ai-usage-log.md`: STT tiếp theo, ngày, công cụ AI kèm phiên bản model của bạn, mức độ đóng góp (`Sinh mới` / `Sửa - refactor` / `Gợi ý`), module kèm đường dẫn file chính, prompt của user, và kết quả kiểm chứng đã chạy (build/test).
- Cột "Câu lệnh chính": trình bày theo cấu trúc Bối cảnh / Mục tiêu / Ràng buộc và quyết định của user / Cách làm việc / Kiểm chứng, dựa đúng trên những gì user đã yêu cầu (không thêm thắt, không bịa yêu cầu); xuống dòng trong ô bằng `<br>`.
- Cột "Lỗi / Ảo giác AI & Cách xử lý": chỉ ghi lỗi của chính bạn (sai, ảo giác, bỏ sót, giả định sai) rồi tự sửa. Không ghi lỗi của user hay việc chưa làm được. Không có lỗi thì ghi "Không có lỗi của AI được ghi nhận ở phần này." và không bịa lỗi.
- Cột "Người thực hiện": ghi tên người đang ra lệnh cho agent, lấy từ `git config user.name` (chạy lệnh này để biết, không tự đoán). Cột "Sinh viên tinh chỉnh / Tối ưu" để user tự điền (ghi `TODO`).
- `ai-usage-log.md` chỉ giữ khoảng 25 dòng mới nhất (dòng cũ tự chuyển sang `docs/ai-usage-log-archive/` bằng `scripts/ai-log/rotate.mjs`: hook Stop của Claude Code, git pre-commit `.githooks/` cho mọi agent, và CI chặn nếu quá 60 dòng). Không đọc cả file: lấy STT cuối bằng `tail`/Grep rồi chèn dòng mới trước phần "Case study". Cột "Mã Commit SHA" của dòng đã vào archive cập nhật trong file archive tương ứng.
- Không tự commit. Cột "Mã Commit SHA" ghi `TODO` để user cập nhật sau khi commit; nhắc user làm việc này trong câu báo cáo cuối.

## Trước mỗi task: chọn công cụ

Ở tin nhắn đầu tiên của task, ghi bảng ngắn "Công cụ dự định": skill, MCP, subagent sẽ dùng và lý do một dòng; công cụ phù hợp mà không dùng thì nêu lý do. Repo có `.codegraph/`: tìm hiểu code bằng CodeGraph trước khi grep hay đọc file. Cuối task đối chiếu với dòng "Công cụ đã dùng".

## Subagent (`.claude/agents/`)

Nguyên tắc: **phiên chính viết code, subagent đọc, chạy và kiểm tra.** Phiên chính lập kế hoạch, quyết định thiết kế, viết code, ghi `ai-usage-log.md`, duyệt kết quả cuối. Khảo sát và kiểm tra giao cho subagent chỉ đọc (không có `Edit`/`Write`, nên chạy song song được).

Chỉ giao cài đặt cho agent thực thi khi có một trong hai điều kiện:
- Có spec đầy đủ (ví dụ `openapi.yaml`): đưa cho người mới là làm được, không cần hỏi lại.
- Các phần thật sự độc lập: không cần kết quả của nhau, không sửa chung file, không phải tự quyết định chung một thứ.

Người viết không tự xác nhận code của mình: code do phiên chính viết vẫn phải qua `reviewer`. `reviewer` chỉ nhận diff và tiêu chí, không nhận lời giải thích vì sao code viết như vậy, để giữ góc nhìn sạch.

Subagent chỉ biết `CLAUDE.md`, file agent, git status và bản giao việc: không thấy hội thoại, không thấy auto memory. Vì vậy **không giao** việc ghi `ai-usage-log.md` hay quyết định thiết kế; quy tắc nào subagent cần biết thì phải ghi ở một trong các nơi đó.

Mô tả từng agent nằm trong `.claude/agents/`, khi nào chạy xem bảng định tuyến. `canvas-ux-checker` và `mutation-checker` chỉ chạy khi người dùng yêu cầu rõ (tốn usage); các agent còn lại tự chạy theo bảng định tuyến. Agent có quyền ghi (`backend-implementer`, `frontend-implementer`, `test-writer`, `doc-syncer`) luôn chạy trong worktree riêng, không commit.

Agent mới hoặc file agent được sửa phải ghi rõ bước đọc đúng file trong `.claude/rules/`, không dựa vào việc tự nạp, vì chưa xác nhận rule có tự nạp cho subagent.

Bản giao việc cho agent thực thi phải có: mục tiêu, phạm vi file/class, quyết định đã chốt của người dùng cho việc này (agent không tự đổi), ràng buộc (kiến trúc, contract, không thêm dependency), tiêu chí xong kiểm được, lệnh kiểm chứng, và chỗ phải dừng lại hỏi. Chỉ dẫn đường tới tài liệu trong repo thay vì chép lại; phải ghi rõ những gì không có trong repo. Không giao quyết định thiết kế. Không giao hai agent thực thi sửa cùng file; nếu bắt buộc thì chạy tuần tự. Phiên chính phải xem diff trong worktree của agent, chạy agent kiểm tra theo bảng định tuyến rồi mới đưa thay đổi vào cây chính.

### Bảng định tuyến

**Luôn chạy:**

| Khi nào | Chạy |
|---|---|
| Có sửa code (`backend/**`, `frontend/src/**`) | `reviewer` + `test-verifier` |
| Mọi commit | `pre-commit-checker` (sau cùng) |

**Chạy thêm khi đụng phần liên quan:**

| Thay đổi đụng tới | Chạy |
|---|---|
| `backend/**/*.java` | `backend-architect-reviewer` |
| `dto/dsl`, `schema/game-dsl`, `schema/game-ai-output`, `game-dsl.types.ts`, `docs/openapi/openapi.yaml`, controller/DTO REST | `contract-guardian` |
| `backend/src/main/resources/db/migration/`, `entity/`, `application*.yml` | `migration-checker` |
| `security/`, `config/SecurityConfig`, controller/endpoint mới, WebSocket, đăng nhập/token ở frontend, trước khi triển khai | `security-auditor` (bổ sung, không thay `pre-commit-checker`) |
| `service/generation`, prompt, `schema/game-ai-output`, `dto/dsl/ai` | `ai-prompt-evaluator` (offline) |
| `ai-usage-log.md` | `log-auditor` |
| `frontend/src/games/**` (renderer mới hoặc đổi bố cục) | `canvas-ux-checker` và `mutation-checker` NẾU người dùng yêu cầu |
| Bắt đầu một tính năng cần hiểu code hiện có | `codebase-explorer` (có thể chạy song song nhiều câu hỏi) |
| Sắp sửa field DSL/endpoint/entity/game type và cần biết đụng tới đâu | `impact-analyzer`, rồi lập kế hoạch |
| Code đã xong, tài liệu có thể lỗi thời (`x-status`, mô tả, bảng agent) | `doc-syncer`, sau đó `contract-guardian` |
| Đã đủ điều kiện giao cài đặt (xem đầu mục Subagent) | `backend-implementer` / `frontend-implementer` |
| Mutant sống sót hoặc module thiếu test | `test-writer`, sau đó `mutation-checker` nếu người dùng yêu cầu |
| PR đã có review của bot/người | `pr-triage` |

Chỉ chạy agent đúng với phần đã đổi; thay đổi chỉ trong `*.md` hay docs không cần `test-verifier`.

## Wiki kiến thức (`docs/wiki/`)

`docs/wiki/index.md` là cửa vào của kho tài liệu (vault Obsidian là `docs/`). Wiki chỉ để định hướng: tóm tắt, nối các tài liệu lại với nhau, có thể chậm hơn nguồn. **Trước khi viết code hay test phải đọc nguồn gốc theo bảng dưới; wiki khác nguồn thì tin nguồn.** Phiên chính ghi wiki khi người dùng yêu cầu, theo `docs/wiki/README.md`; subagent chỉ đọc.

| Cần biết | Đọc |
|---|---|
| Tổng quan, trạng thái, lý do quyết định, điểm lệch | `docs/wiki/index.md` |
| Luồng đầy đủ của một ca sử dụng | `docs/srs/UC-xx.md` |
| Yêu cầu chức năng, phi chức năng | `docs/srs/FR-summary.md`, `docs/srs/NFR.md` |
| Trường FLD, KPI | `docs/srs/FLD.md`, `docs/srs/KPI.md` |
| Các mục SRS khác | `docs/srs/SRS-full.md`; hình trong SRS ở `docs/SRS.docx` |
| Sơ đồ kiến trúc, use case, class, tuần tự | `docs/wiki/Sơ đồ hệ thống.md`, `docs/diagrams/` (chỉ lấy nhãn, không đọc nguyên file `.drawio`) |
| Định hướng đề tài | `docs/Dinh_huong_de_tai.md` |
| Field DSL | `docs/game-json-dsl-v1.0.0.md` |
| Endpoint, mã lỗi | `docs/openapi/openapi.yaml` |
| Thiết kế màn hình | `docs/ui/SPEC.md`, `docs/ui/wireframes/` |

## Học từ lỗi của agent

Quy tắc đã duyệt (mỗi quy tắc rút từ một lỗi thật, chi tiết ở `.claude/lessons-inbox.md`):
- Agent/lệnh lấy diff phải gồm cả thay đổi chưa commit: `git diff main...HEAD` + `git diff` + `git diff --cached`, không chỉ so với `main`.
- Viết tiêu chí cho agent kiểm tra từ nội dung file thật, không từ giả định; chạy thử trên dữ liệu thật trước khi coi agent là xong.
- Máy không có `gh`; thao tác GitHub dùng công cụ `mcp__github__*`. Kiểm tra công cụ có sẵn trước khi đưa vào prompt agent.
- Agent vừa tạo chưa gọi theo tên được trong cùng phiên (chỉ nạp lúc bắt đầu phiên); thử bằng `general-purpose` kèm thân file agent.

Quy trình: khi gặp lỗi của chính mình (test/build fail do mình gây ra, bị người dùng sửa lại, subagent báo lệch), thêm một mục theo mẫu vào phần "Chờ duyệt" của `.claude/lessons-inbox.md` trước khi báo hoàn thành. Không tự chuyển vào `CLAUDE.md` hay prompt agent; người dùng duyệt trước. Khi lỗi có thể kiểm tra tự động, ưu tiên biến thành mục kiểm tra trong prompt agent hoặc test thay vì chỉ thêm chữ vào file này. Chỉ ghi lỗi có hậu quả hoặc lặp lại, không ghi typo/format.

## Trước khi báo hoàn thành

- Backend: build thử bằng `./mvnw clean install -DskipTests` (hoặc chạy test nếu có DB thật) trước khi báo xong.
- Frontend: chạy `npm run build` (type-check + build) và/hoặc mở thử bằng dev server trước khi báo xong.
- Chạy song song các agent theo bảng định tuyến; đợi tất cả xong rồi mới sửa theo kết quả, sau đó chạy lại `test-verifier`. Ngay trước khi đưa commit message, chạy `pre-commit-checker`. Khi sửa `ai-usage-log.md`, chạy `log-auditor`.
- Cuối mỗi tác vụ có làm việc thật (sửa file, chạy agent, dùng trình duyệt...), chạy `node scripts/tool-usage/summarize.mjs --current` và dán dòng kết quả "Công cụ đã dùng: Skill ... · MCP ... · Subagent ... · Tool ..." vào câu báo cáo cuối. Số liệu đọc từ transcript, không tự khai từ trí nhớ; có thể thiếu vài lệnh gọi cuối cùng vì transcript ghi chậm (nêu rõ nếu thấy lệch). Không dùng skill nào thì ghi `Skill: (không)`. Câu hỏi chỉ trò chuyện thì không cần dòng này.
