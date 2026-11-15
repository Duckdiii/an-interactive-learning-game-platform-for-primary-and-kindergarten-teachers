# C1 nấc 1: đi luồng giáo viên trên trình duyệt thật (2026-11-15)

Mục tiêu: đi tay một lần luồng giáo viên trên giao diện thật, nối với backend thật và Supabase thật. Ghi lại các bước, selector và vấn đề gặp phải để làm đầu vào cho C1 nấc 2 (e2e `@playwright/test` trên CI).

## Môi trường

| Thành phần | Cấu hình |
|---|---|
| Backend | `./mvnw spring-boot:run` trong worktree, `SERVER_PORT=8088`, DB Supabase (Session Pooler `:5432`), Flyway validate thành công, schema ở version 9 (khớp V1–V9 trong repo). Gemini thật (`GEMINI_GAME_GENERATION_ENABLED=true`, `gemini-3-flash-preview`). |
| Frontend | `npm run dev` (Vite, cổng 5173), `VITE_API_BASE_URL=http://localhost:8088/api`, `VITE_USE_MOCK=media,sessions,results` (tải tệp, phòng chơi và kết quả vẫn là mock vì backend chưa có). |
| Trình duyệt | Trình duyệt dựng sẵn của Claude Code, viewport 1280×800. |
| Tài khoản | Mỗi lần chạy tạo tài khoản mới `c1-<timestamp>@example.test`. Mật khẩu ngẫu nhiên lưu ở `frontend/.env.e2e.local` (gitignore `*.local`), không ghi vào repo. |

## Các bước và selector

Selector viết theo role/nhãn/placeholder (dùng được thẳng cho `getByRole`/`getByPlaceholder` của Playwright).

| # | Bước | Thao tác (selector) | Request | Kết quả |
|---|---|---|---|---|
| 1 | Đăng ký | `/register`: textbox placeholder `Nguyễn Văn An`, `giaovien@example.com`, ô mật khẩu nhãn `Mật khẩu`, placeholder `Nhập lại mật khẩu`; nút `Tạo tài khoản` | `POST /api/auth/register` → 201 | Chuyển về `/login`, hiện "Đăng ký thành công, mời đăng nhập" |
| 2 | Đăng nhập | `/login`: placeholder `giaovien@example.com`, `Nhập mật khẩu`; nút `Đăng nhập` (hoặc Enter) | `POST /api/auth/login` → 200, `GET /api/games` → 200 | Vào `/dashboard` "Chào cô C1…" |
| 3 | Chọn ý tưởng | Link `Toán · Mầm non · Đếm đồ vật từ 1 đến 5` | (không) | `/games/new?idea=…&grade=KINDERGARTEN&subject=MATH`, ý tưởng đã điền sẵn |
| 4 | Gửi ý tưởng | Nút `Để AI soạn giúp` | `POST /api/games/understand` → 200 (~8 giây) | Khung "Hệ thống hiểu như sau" (mục tiêu, nội dung, kiểu chơi đề xuất có `aria-pressed`), nút `Đúng rồi, tạo game` |
| 5 | Sinh game | Nút `Đúng rồi, tạo game` | `POST /api/games/generate` → 200 (~10 giây) | Chuyển sang `/workspace/editor?gameId=<uuid>` |
| 6 | Chơi thử | Editor: canvas Konva 865×486, nút `Chơi lại từ đầu`; HUD hiện câu hỏi, `1/5`, `⭐ 0` | (không) | Chạm đáp án đúng thì sang màn tiếp (`2/5`) và tên lửa tiến lên |
| 7 | Sửa bằng trò chuyện | Textarea placeholder `Cô muốn sửa gì?`, nút `Gửi` | revise (~6 giây) | "Đang xem bản trợ lý vừa sửa (chưa lưu)", nút `Giữ bản sửa` / `Bỏ bản sửa` |
| 8 | Lưu bản sửa | Nút `Giữ bản sửa` | `PUT /api/games/{id}` | "Đã lưu bản sửa."; `GET /api/games/{id}` có nội dung mới |
| 9 | Danh sách game | Link `Trò chơi của tôi` (`/workspace`) | `GET /api/games` | Thẻ game "Bản nháp", link `Soạn tiếp`, nút aria-label `Thêm thao tác cho <tên game>` (menu chỉ có `Sửa`) |
| 10 | Đối chiếu chương trình | Không có màn hình; gọi `GET /api/games/{id}/curriculum-review` bằng token của phiên | xem dưới | |

Đã chạy hai game:

| Game | Loại | Bước 10 sau khi sinh | Sau khi sửa (PUT) |
|---|---|---|---|
| `950185e8…` "Bé Tập Đếm Số 1 Đến 5" | `CUSTOM` (CPF, trò chơi tự do) | 404 `NOT_FOUND` "Không tìm thấy game hoặc kết quả đối chiếu" | (không đổi) |
| `61e79cb6…` | `QUIZ` (DSL) | 200, `status: UNAVAILABLE` | 200, `status: STALE` |

Trên Postgres, `evidence` là object, `claims` và `warnings` là mảng, cả trước lẫn sau PUT. Vậy KNOWN-GAPS #22 (trả về dạng chuỗi JSON) chỉ xảy ra trên H2.

## Vấn đề gặp phải

| # | Mức | Vấn đề | Bằng chứng | Xử lý |
|---|---|---|---|---|
| 1 | Cao | Game CPF đếm đồ vật không có đồ vật để đếm. Câu hỏi "Bé đếm xem có bao nhiêu quả cam?" nhưng CPF chỉ có hai entity (`num_button` là biển số gắn vào `choices`, `rocket_progress`), không có entity quả cam. Bé chỉ đoán được. Layer 2 không bắt được lỗi này. | `GET /api/games/950185e8…`: `cpf.entities` có 2 phần tử; ảnh canvas chỉ có biển số, nông trại và tên lửa | KNOWN-GAPS #23 |
| 2 | Trung bình | Game CPF không có bản đối chiếu chương trình: `CpfGameContentHandler` tạo `GeneratedContent` với 4 tham số (curriculum = null), nên `GameService` lưu game mà không có review. Việc 8 chỉ phủ đường DSL. | `CpfGameContentHandler.java:48`; bước 10 trả 404 | KNOWN-GAPS #24 |
| 3 | Trung bình | Frontend chưa có màn hình nào hiện kết quả đối chiếu chương trình (không có chỗ gọi `curriculum-review` trong `frontend/src`). | Grep `curriculum-review` trong `frontend/src`: 0 kết quả | KNOWN-GAPS #24 |
| 4 | Thấp | HUD CPF luôn hiện `⭐ 0` vì luật do AI sinh không có hành động `SCORE`; điểm chỉ tăng ở `case 'SCORE'`. | `CpfRenderer.tsx:160`; `cpf.rules[0].do[0].onCorrect` chỉ có `ADVANCE`, `EFFECT`, `SOUND` | Ghi ở đây; xem lại khi sửa prompt CPF |
| 5 | Thấp | `CreateGamesProgress` dùng tiêu đề "Có trò chơi chưa tạo được" cho mọi trường hợp đã có kết quả, kể cả khi tất cả đều thành công. Khi tạo một loại thì trang chuyển ngay sang editor nên chỉ thoáng thấy. | `CreateGamesProgress.tsx:42` | Ghi ở đây |
| 6 | Thông tin | AI tự chọn kiểu chơi: cùng một ý tưởng, lần 1 sinh CPF, lần 2 đề xuất `Trắc nghiệm`. | Hai lần chạy bước 4 | Ràng buộc cho nấc 2 (dưới) |
| 7 | Thông tin | Frontend giữ `accessToken`, `refreshToken` trong `localStorage` (contract cũ, CLAUDE.md đã ghi cần chuyển sang cookie). | `Object.keys(localStorage)` | Đã biết |
| 8 | Thông tin | Lần đăng ký đầu bị 400 vì mật khẩu thiếu ký tự đặc biệt. Quy tắc: 8–72 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt. | `POST /api/auth/register` → 400, rồi 201 | Bộ sinh tài khoản e2e phải theo quy tắc này |

## Ràng buộc cho C1 nấc 2 (e2e trên CI)

- Không gọi Gemini thật trên CI (tốn quota, kết quả không cố định, xem vấn đề 6). Cần backend chạy với AI giả và trả nội dung cố định.
- Canvas Konva không có DOM cho từng đáp án. Bấm theo toạ độ dễ hỏng vì biển số có chuyển động `BOB`: ở lần thử chạm đáp án sai, kết quả không rõ ràng. E2e nên kiểm qua HUD/DOM, hoặc cần một móc kiểm thử cho renderer (phải hỏi người dùng trước).
- Phòng chơi, kết quả và tải tệp vẫn là mock (`VITE_USE_MOCK`), nên e2e nấc 2 chỉ phủ được bước 1–9.
