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

- Package gốc: `com.aigameplatform.backend`. Giữ đúng cấu trúc đã có: `entity/{question,session,interaction,enums}` (entity gốc `Game`, `Teacher`, `Classroom`, `EditLog` nằm trực tiếp trong `entity/`), `service/{strategy,validation,factory}`, `repository`, `controller`, `dto/{request,response}`, `config`, `exception`, `security`. Nếu cần thư mục con mới, đặt đúng nhóm chức năng tương ứng, không tạo tràn lan ở root package.
- **Schema do Flyway quản lý** — `jpa.hibernate.ddl-auto` luôn là `validate`, không được đổi sang `update`/`create`. Mọi thay đổi schema phải viết migration mới trong `src/main/resources/db/migration/` theo thứ tự version tăng dần (`V1__...sql`, `V2__...sql`), không sửa lại migration đã tồn tại.
- Database là **Supabase** (PostgreSQL managed) — không dùng Postgres local/Docker. Dùng Session Pooler hoặc Direct Connection; **không dùng Transaction Pooler (port 6543)** vì không tương thích với prepared statement của Hibernate.
- Hikari `maximum-pool-size: 5` — Supabase free tier giới hạn connection đồng thời, không tăng giá trị này mà không hỏi.
- Dùng Lombok cho entity/DTO thay vì viết getter/setter tay.

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
- AI integration dùng **LangChain4j duy nhất** — không dùng Spring AI, không dùng song song cả hai.
- Enum/discriminator `gameType` dùng `UPPER_SNAKE_CASE` (`QUIZ`, `SPOT_THE_TARGET`...).

## Contract đã freeze — mọi thay đổi field/endpoint phải đồng bộ cả Backend, Frontend và doc

- JSON DSL Schema v1.0.0 (cấu trúc field `QuestionGame` cho từng loại game)
- REST API Contract v1.0.0 (endpoint, response envelope `{success, data}` / `{success, error}`, error code)
- WebSocket Message Format v1.0.0 (`/topic/session/{sessionId}/...`, `/app/session/{sessionId}/...`)

Link doc: TODO — dán 3 link Claude Docs vào đây. Trước khi sinh code liên quan đến field JSON, endpoint mới hay message WebSocket mới, đọc đúng doc tương ứng; không tự đặt tên field/endpoint khác đi.

## Thư viện frontend đã duyệt sẵn

`react-konva`, `howler`, `qrcode.react`, `@stomp/stompjs`, `sockjs-client`, `use-image` (cùng axios, react-router-dom, @tanstack/react-query đã cài). Chỉ hỏi user khi cần thêm thư viện NGOÀI danh sách này.

## Quy ước UX cho Canvas Engine (đối tượng: trẻ mầm non/lớp 1)

- Touch target tối thiểu 64px.
- Trả lời sai: KHÔNG dùng màu đỏ gắt/rung mạnh/âm thanh phạt. Dùng phản hồi nhẹ nhàng (rung nhẹ, âm thanh trung tính) và ưu tiên chỉ luôn đáp án đúng để trẻ học được.
- Audio prompt luôn có nút "nghe lại" không giới hạn số lần.
- Renderer mới phải hỗ trợ prop `previewMode` (dùng cho Workspace Editor live preview).

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
- Điền theo đúng quy ước ở đầu `ai-usage-log.md`: STT tiếp theo, ngày, công cụ AI kèm phiên bản model của bạn, mức độ đóng góp (`Sinh mới` / `Sửa - refactor` / `Gợi ý`), module kèm đường dẫn file chính, tóm tắt prompt của user, và kết quả kiểm chứng đã chạy (build/test).
- Nếu trong quá trình làm bạn gặp lỗi/ảo giác của chính mình rồi tự sửa, ghi vào cột "Lỗi / Ảo giác AI & Cách xử lý". Không bịa lỗi nếu không có.
- Cột "Người thực hiện": ghi tên người đang ra lệnh cho agent, lấy từ `git config user.name` (chạy lệnh này để biết, không tự đoán). Cột "Sinh viên tinh chỉnh / Tối ưu" để user tự điền (ghi `TODO`).
- Không tự commit. Cột "Mã Commit SHA" ghi `TODO` để user cập nhật sau khi commit; nhắc user làm việc này trong câu báo cáo cuối.

## Trước khi báo hoàn thành

- Backend: build thử bằng `./mvnw clean install -DskipTests` (hoặc chạy test nếu có DB thật) trước khi báo xong.
- Frontend: chạy `npm run build` (type-check + build) và/hoặc mở thử bằng dev server trước khi báo xong, đừng chỉ dựa vào code trông "có vẻ đúng".
