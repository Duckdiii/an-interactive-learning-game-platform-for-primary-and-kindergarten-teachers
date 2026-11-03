---
paths:
  - "backend/**"
---

# Backend (`backend/`)

- Package gốc: `com.aigameplatform.backend`. Giữ đúng cấu trúc package đã có (`entity`, `service`, `repository`, `controller`, `dto`, `config`, `exception`, `security`); thư mục con mới đặt đúng nhóm chức năng tương ứng, không tạo tràn lan ở root package. Những chỗ dễ đặt nhầm:
  - Entity gốc `Game`, `Teacher`, `Classroom`, `EditLog` nằm trực tiếp trong `entity/`; thành phần nhúng (cặp, vùng thả) ở `entity/question/embedded`.
  - `service/generation`: bộ điều phối sinh game bằng AI, cổng `GameContentGenerator` cùng bản cài đặt Gemini/LangChain4j, vòng thử lại có phản hồi lỗi.
  - `service/validation/rule` (luật Layer 2 từng loại game) và `service/validation/safety` (Layer 3: danh sách từ cấm, client OpenAI Moderation).
  - `dto/dsl`: các record của Game JSON DSL.
- **Schema do Flyway quản lý** — `jpa.hibernate.ddl-auto` luôn là `validate`, không được đổi sang `update`/`create`. Mọi thay đổi schema phải viết migration mới trong `src/main/resources/db/migration/` theo thứ tự version tăng dần (`V1__...sql`, `V2__...sql`), không sửa lại migration đã tồn tại.
- Database là **Supabase** (PostgreSQL managed) — không dùng Postgres local/Docker. Dùng Session Pooler hoặc Direct Connection; **không dùng Transaction Pooler (port 6543)** vì không tương thích với prepared statement của Hibernate.
- Hikari `maximum-pool-size: 5` — Supabase free tier giới hạn connection đồng thời, không tăng giá trị này mà không hỏi.
- Dùng Lombok cho entity/DTO thay vì viết getter/setter tay.
- Test Spring: backend dùng Spring Boot 4.x nên mock bean bằng `@MockitoBean` (`org.springframework.test.context.bean.override.mockito`), không dùng `@MockBean`. Bỏ qua mẫu Spring Boot 3.x trong skill `spring-boot-engineer`.
- Kiểm duyệt an toàn (Layer 3): mặc định `app.moderation.required=true`, thiếu `OPENAI_API_KEY` thì app không khởi động. Chỉ đặt `MODERATION_REQUIRED=false` (trong `.env` cá nhân) khi chạy thử ở máy mình, khi đó chỉ dùng danh sách từ cấm; môi trường triển khai thật phải có `OPENAI_API_KEY` và không được đặt cờ này. Trong `.env.example` để trống `OPENAI_API_KEY`, không điền giá trị mẫu (giá trị mẫu bị coi là key thật và làm mọi lần sinh game lỗi).
