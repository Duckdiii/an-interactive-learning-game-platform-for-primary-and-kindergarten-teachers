# CLAUDE.md

Hướng dẫn cho AI agent khi làm việc trong repo này. Đây là đồ án tốt nghiệp: AI-Game Platform (backend Spring Boot + frontend React), dùng Supabase làm PostgreSQL managed.

## Cấu trúc repo

- `backend/` — Spring Boot 4.1.x, Java 21, Maven (dùng `./mvnw`, không cần cài Maven local)
- `frontend/` — React + TypeScript (Vite), Tailwind CSS v4

## Quy tắc chung (áp dụng cả 2 phần)

- **Không tự ý thêm thư viện/dependency mới** nếu chưa hỏi lại user trước, kể cả khi có vẻ "cần thiết" cho task.
- **Không bao giờ hardcode secret** (connection string, password, API key) vào source code. Luôn đọc qua biến môi trường (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `VITE_API_BASE_URL`...). Nếu thêm biến env mới, cập nhật cả `.env.example` tương ứng.
- Comment ngắn gọn, chỉ giải thích phần không tự rõ nghĩa (ví dụ: lý do dùng Session Pooler thay vì Transaction Pooler).
- Trước khi `git add -A` hoặc commit, kiểm tra `git status`/diff để không lỡ commit `.env`, file build (`target/`, `node_modules/`, `dist/`) hay secret.

## Backend (`backend/`)

- Package gốc: `com.aigameplatform.backend`. Giữ đúng cấu trúc package đã có (`entity`, `service`, `repository`, `controller`, `dto`, `config`, `exception`, `security`); thư mục con mới đặt đúng nhóm chức năng tương ứng, không tạo tràn lan ở root package. Những chỗ dễ đặt nhầm:
  - Entity gốc `Game`, `Teacher`, `Classroom`, `EditLog` nằm trực tiếp trong `entity/`; thành phần nhúng (cặp, vùng thả) ở `entity/question/embedded`.
  - `service/generation`: bộ điều phối sinh game bằng AI, cổng `GameContentGenerator` cùng bản cài đặt Gemini/LangChain4j, vòng thử lại có phản hồi lỗi.
  - `service/validation/rule` (luật Layer 2 từng loại game) và `service/validation/safety` (Layer 3: danh sách từ cấm, client OpenAI Moderation).
  - `dto/dsl`: các record của Game JSON DSL.
- **Schema do Flyway quản lý** — `jpa.hibernate.ddl-auto` luôn là `validate`, không được đổi sang `update`/`create`. Mọi thay đổi schema phải viết migration mới trong `src/main/resources/db/migration/` theo thứ tự version tăng dần (`V1__...sql`, `V2__...sql`), không sửa lại migration đã tồn tại.
- Database là **Supabase** (PostgreSQL managed) — không dùng Postgres local/Docker. Dùng Session Pooler hoặc Direct Connection; **không dùng Transaction Pooler (port 6543)** vì không tương thích với prepared statement của Hibernate.
- Hikari `maximum-pool-size: 5` — Supabase free tier giới hạn connection đồng thời, không tăng giá trị này mà không hỏi.
- Dùng Lombok cho entity/DTO thay vì viết getter/setter tay.
- Kiểm duyệt an toàn (Layer 3): mặc định `app.moderation.required=true`, thiếu `OPENAI_API_KEY` thì app không khởi động. Chỉ đặt `MODERATION_REQUIRED=false` (trong `.env` cá nhân) khi chạy thử ở máy mình, khi đó chỉ dùng danh sách từ cấm; môi trường triển khai thật phải có `OPENAI_API_KEY` và không được đặt cờ này. Trong `.env.example` để trống `OPENAI_API_KEY`, không điền giá trị mẫu (giá trị mẫu bị coi là key thật và làm mọi lần sinh game lỗi).

## Frontend (`frontend/`)

- **Chỉ dùng Context API + `useState`/`useReducer` của React cho client state** — tuyệt đối không thêm Zustand, Redux, Jotai, hay bất kỳ state-management library nào khác.
- `@tanstack/react-query` chỉ dùng cho data fetching/cache từ API (loading, error, retry), không dùng để thay thế client state.
- Gọi API qua `src/api/axiosInstance.ts` (đã có interceptor đính token + xử lý 401), không tạo thêm axios instance khác trừ khi có lý do rõ ràng.
- Đọc/ghi session qua `useAuth()` (từ `AuthContext`), không thao tác trực tiếp `localStorage` ở nơi khác.
- Tailwind v4: cấu hình qua `@tailwindcss/vite` plugin + `@import "tailwindcss"` trong `index.css`. `tailwind.config.js` được nạp qua `@config` — nếu sửa `content` globs thì sửa ở đây.

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
- REST API Contract v1.1.0 (endpoint, response envelope `{success, data}` / `{success, error}`, error code). Nguồn sự thật: `docs/openapi/openapi.yaml` (OpenAPI 3.1, thiết kế trước, code theo sau). Mỗi operation có `x-status`: `implemented` (đã cài), `extended-pending` (đã có nhưng phần mở rộng chưa cài), `planned` (chưa cài, code theo đúng spec). Sửa endpoint/field/mã lỗi phải sửa file này trước, rồi kiểm tra bằng `npx @redocly/cli lint docs/openapi/openapi.yaml` (chỉ để kiểm tra cú pháp spec, không phải để xem). Xem API trực tiếp: chạy Backend rồi mở `http://localhost:8080/swagger-ui.html` (springdoc, sinh từ controller đã cài nên chỉ thấy endpoint đã có code, có nút Try it; tắt khi triển khai bằng `SWAGGER_ENABLED=false`). Code Frontend auth hiện còn theo contract cũ (refreshToken trong body, `AuthUser.id`), cần chuyển sang cookie và `teacherId`.
- WebSocket Message Format v1.0.0 (`/topic/session/{sessionId}/...`, `/app/session/{sessionId}/...`)

Link doc: DSL ở `docs/game-json-dsl-v1.0.0.md`, REST ở `docs/openapi/openapi.yaml`; tài liệu WebSocket Message Format riêng chưa viết (TODO, tạm xem tag `Realtime` trong `openapi.yaml`). Trước khi sinh code liên quan đến field JSON, endpoint mới hay message WebSocket mới, đọc đúng doc tương ứng; không tự đặt tên field/endpoint khác đi.

## Thư viện frontend đã duyệt sẵn

`react-konva`, `howler`, `qrcode.react`, `@stomp/stompjs`, `sockjs-client`, `use-image` (cùng axios, react-router-dom, @tanstack/react-query đã cài). Chỉ hỏi user khi cần thêm thư viện NGOÀI danh sách này.

## Quy ước UX cho Canvas Engine (đối tượng: trẻ mầm non/lớp 1)

- Touch target tối thiểu 64px.
- Trả lời sai: KHÔNG dùng màu đỏ gắt/rung mạnh/âm thanh phạt. Dùng phản hồi nhẹ nhàng (rung nhẹ, âm thanh trung tính) và ưu tiên chỉ luôn đáp án đúng để trẻ học được.
- Audio prompt luôn có nút "nghe lại" không giới hạn số lần.
- Renderer mới phải hỗ trợ prop `mode: 'preview' | 'play' | 'review'` (`preview` cho Workspace Editor live preview tự so đáp án cục bộ; `play` cho học sinh chơi thật, không tự lộ đáp án đúng, báo kết quả lên component cha qua callback `onAnswered` (bắt buộc ở mode này và PHẢI trả `boolean` hoặc `Promise<boolean>` là đúng/sai thật do Backend chấm; kiểu prop là union theo `mode` nên thiếu là lỗi lúc build); `review` xem lại câu đã trả lời, khoá sẵn, nhận thêm prop `selectedOptionId` cho biết đáp án đã chọn trước đó).
- Renderer nhiều phần tử (Matching, Memory Card — cùng nhóm `PairMatch`, xem ánh xạ ở trên) nộp **một lần** sau khi trẻ hoàn thành cả màn, không nộp từng lượt chạm. Payload khác nhau giữa hai loại: Matching là `matches: [{ leftPairId, rightPairId }]`, Memory Card là `matchedPairIds` + `flips`. `MatchingRenderer` ở mode `play` nhận câu hỏi dạng học sinh (`MatchingStudentQuestion`, id mờ, cột đã do Backend xáo, KHÔNG xáo lại ở client); callback trả `MatchingAnswerResult` (`isCorrect` + `correctAnswer.matches` nếu có) để hiện đáp án đúng khi trẻ sai.
- Renderer mới dùng lại phần chung trong `frontend/src/games/common/` (`ResponsiveStage`, `QuestionAudioButton`, `useQuestionAudio`, `useIllustration`/`QuestionIllustration`, `playSound`, `useFeedback`, `measureWrappedTextHeight`) thay vì viết lại. Bố cục tính bằng hàm thuần có test duyệt mọi tổ hợp (`computeQuizLayout`, `computeMatchingLayout`) để không phần nào đè lên phần khác; logic trạng thái tách thành reducer/hàm thuần để test được trong jsdom (không có Canvas).

## Nguyên tắc thiết kế: OOP, SOLID, GRASP

Áp dụng cho cả code mới lẫn khi sửa code cũ. Khi có nguyên tắc mâu thuẫn với "Kiến trúc domain đã chốt", ưu tiên kiến trúc đã chốt và báo user.

**OOP**
- **Đóng gói**: field `private` (hoặc `protected` nếu class diagram ghi `#`), truy cập qua getter/setter hoặc method nghiệp vụ. Không mở public field.
- **Kế thừa** chỉ khi quan hệ là "is-a" thật (ví dụ `QuizQuestion` là một `QuestionGame`). Ưu tiên composition khi chỉ để tái sử dụng code.
- **Đa hình**: gọi qua kiểu cha/interface, không dùng chuỗi `if/switch` theo `gameType` để rẽ nhánh hành vi. Thêm game type mới phải là thêm class mới, không sửa nhiều chỗ.
- **Trừu tượng**: `abstract`/interface cho khái niệm chung; lớp bên ngoài chỉ phụ thuộc vào phần public là "hợp đồng".

**SOLID**
- **S** (Single Responsibility): mỗi class một lý do để thay đổi. Controller chỉ nhận request/trả response, logic nghiệp vụ ở `service`, truy cập dữ liệu ở `repository`. Entity không chứa logic gọi API ngoài hay validate JSON.
- **O** (Open/Closed): mở rộng bằng class mới (Strategy, Factory, Validator mới), không sửa code đã chạy ổn để thêm case.
- **L** (Liskov): class con thay được class cha mà không đổi ý nghĩa. Không override để ném `UnsupportedOperationException` (ngoại lệ duy nhất: khung `TODO` tạm thời đã ghi rõ trong `service/strategy`).
- **I** (Interface Segregation): interface nhỏ, đúng vai trò; không ép class cài method không dùng.
- **D** (Dependency Inversion): phụ thuộc vào abstraction, inject qua constructor (Spring DI). Không `new` service/repository trong code nghiệp vụ; API ngoài (Gemini, TTS, Moderation) đi qua interface để mock được khi test.

**GRASP**
- **Information Expert**: đặt hành vi ở class đang giữ dữ liệu cần thiết.
- **Creator**: class nào chứa/sở hữu đối tượng thì chịu trách nhiệm tạo nó (khớp với composition trong class diagram, và các Factory đã chốt).
- **Controller**: lớp REST controller/WebSocket handler chỉ điều phối, ủy quyền cho service.
- **Low Coupling / High Cohesion**: ít phụ thuộc chéo giữa package, mỗi class gắn với một mục đích rõ.
- **Polymorphism, Pure Fabrication, Indirection, Protected Variations**: dùng Strategy, Factory, Registry đã chốt để cô lập điểm thay đổi (loại game, nhà cung cấp AI).
- Không thêm tầng trừu tượng "phòng xa" khi chưa có nhu cầu thật; chỉ tách khi thấy lặp lại hoặc điểm thay đổi rõ ràng.

## Testing & ngôn ngữ

- Unit test phần gọi API ngoài (Gemini, OpenAI Moderation, Google TTS) phải **mock**, không gọi API thật trong test (tránh tốn tiền/quota của team).
- Identifier/code viết tiếng Anh; comment có thể tiếng Việt.

## Ghi log sử dụng AI (bắt buộc)

- Mỗi khi bạn (agent) sinh hoặc sửa code/nội dung đáng kể trong repo (tính năng, module, config, migration, test...), phải thêm 1 dòng vào bảng trong `ai-usage-log.md` ở root trước khi báo hoàn thành. Không cần log cho thay đổi nhỏ như sửa typo hay format.
- Điền theo đúng quy ước ở đầu `ai-usage-log.md`: STT tiếp theo, ngày, công cụ AI kèm phiên bản model của bạn, mức độ đóng góp (`Sinh mới` / `Sửa - refactor` / `Gợi ý`), module kèm đường dẫn file chính, prompt của user, và kết quả kiểm chứng đã chạy (build/test).
- Cột "Câu lệnh chính": trình bày theo cấu trúc Bối cảnh / Mục tiêu / Ràng buộc và quyết định của user / Cách làm việc / Kiểm chứng, dựa đúng trên những gì user đã yêu cầu (không thêm thắt, không bịa yêu cầu); xuống dòng trong ô bằng `<br>`.
- Cột "Lỗi / Ảo giác AI & Cách xử lý": chỉ ghi lỗi của chính bạn (sai, ảo giác, bỏ sót, giả định sai) rồi tự sửa. Không ghi lỗi của user hay việc chưa làm được. Không có lỗi thì ghi "Không có lỗi của AI được ghi nhận ở phần này." và không bịa lỗi.
- Cột "Người thực hiện": ghi tên người đang ra lệnh cho agent, lấy từ `git config user.name` (chạy lệnh này để biết, không tự đoán). Cột "Sinh viên tinh chỉnh / Tối ưu" để user tự điền (ghi `TODO`).
- Không tự commit. Cột "Mã Commit SHA" ghi `TODO` để user cập nhật sau khi commit; nhắc user làm việc này trong câu báo cáo cuối.

## Subagent (`.claude/agents/`)

Phiên chính điều phối, giao việc kiểm tra cho subagent chỉ đọc (không có `Edit`/`Write`, nên chạy song song được). Subagent không thấy hội thoại, nên **không giao** việc ghi `ai-usage-log.md`, quyết định thiết kế hay việc nhỏ.

Tự chạy (chỉ đọc, rẻ):
- `test-verifier`: chạy `tsc`/lint/test/build (frontend), `./mvnw test` (backend) và báo kết quả gọn.
- `contract-guardian`: kiểm tra đồng bộ DSL (4 nơi + test) và `openapi.yaml` (`x-status`, Redocly lint).
- `reviewer`: review diff độc lập theo các quy ước trong file này (trọng tâm frontend, Canvas Engine, UX, secret).
- `backend-architect-reviewer`: review kiến trúc backend (Strategy/Chain/Factory, JOINED inheritance, SOLID/GRASP, phân tầng).
- `migration-checker`: kiểm tra Flyway (không sửa migration cũ, version, `ddl-auto: validate`, entity khớp migration).
- `pr-triage`: phân loại nhận xét của bot/người trên một PR (Đúng / Sai / Hoãn), không đăng bình luận.
- `log-auditor`: kiểm định dạng `ai-usage-log.md` (STT, cột, cấu trúc, SHA `TODO`).
- `pre-commit-checker`: soi lần cuối file nhạy cảm, secret, cấu hình nguy hiểm trước khi commit.

Chỉ chạy khi người dùng yêu cầu rõ (tốn usage):
- `canvas-ux-checker`: mở sandbox trên trình duyệt, đo touch target 64px sau co giãn, đè khối, phản hồi, nút nghe lại.
- `mutation-checker`: chèn lỗi vào module trong worktree riêng để chứng minh test bắt được lỗi.

### Bảng định tuyến (thay đổi đụng tới → agent chạy)

| Thay đổi đụng tới | Chạy |
|---|---|
| `dto/dsl`, `schema/game-dsl`, `schema/game-ai-output`, `game-dsl.types.ts`, `docs/openapi/openapi.yaml`, controller/DTO REST | `contract-guardian` |
| `backend/src/main/resources/db/migration/`, `entity/`, `application*.yml` | `migration-checker` |
| `backend/**/*.java` | `backend-architect-reviewer` + `test-verifier` |
| `frontend/src/**` | `reviewer` + `test-verifier` |
| `frontend/src/games/**` (renderer mới hoặc đổi bố cục) | thêm `canvas-ux-checker` và `mutation-checker` NẾU người dùng yêu cầu |
| `ai-usage-log.md` | `log-auditor` |
| PR đã có review của bot/người | `pr-triage` |
| Mọi commit | `pre-commit-checker` (sau cùng) |

Chỉ chạy agent đúng với phần đã đổi; thay đổi chỉ trong `*.md` hay docs không cần `test-verifier`.

## Trước khi báo hoàn thành

- Backend: build thử bằng `./mvnw clean install -DskipTests` (hoặc chạy test nếu có DB thật) trước khi báo xong.
- Frontend: chạy `npm run build` (type-check + build) và/hoặc mở thử bằng dev server trước khi báo xong.
- Chạy song song các agent theo bảng định tuyến; đợi tất cả xong rồi mới sửa theo kết quả, sau đó chạy lại `test-verifier`. Ngay trước khi đưa commit message, chạy `pre-commit-checker`. Khi sửa `ai-usage-log.md`, chạy `log-auditor`.
