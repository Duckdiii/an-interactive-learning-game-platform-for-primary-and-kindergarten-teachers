# NHẬT KÝ SỬ DỤNG AI (AI USAGE LOG)

> Ghi lại mỗi nội dung/code do AI sinh ra kèm mã commit tương ứng để xem lại và kiểm tra sau này.
> Mỗi lần dùng AI sinh code quan trọng: thêm 1 dòng vào bảng bên dưới **sau khi** đã đọc hiểu, chạy thử/review và commit.

## Quy ước ghi log

- **Mã Commit SHA**: ghi SHA ngắn (7 ký tự) của commit chứa code do AI sinh. Một commit không thể chứa SHA của chính nó, nên cập nhật file log này trong một commit sau đó.
- **Phạm vi / Module**: ghi tên module kèm đường dẫn file chính (ví dụ: `AuthContext` — `frontend/src/context/AuthContext.tsx`).
- **Công cụ AI**: ghi rõ phiên bản model (ví dụ: `Claude Sonnet 5`, không chỉ `Claude`).
- **Mức độ AI đóng góp**: chọn 1 trong `Sinh mới` / `Sửa - refactor` / `Gợi ý`.
- **Kiểm chứng**: ghi ai review và đã kiểm tra bằng cách nào (build, unit test, chạy thử thủ công...).
- Prompt quá dài: chỉ ghi phần chính vào bảng, lưu toàn bộ vào file riêng rồi để link.

## Bảng nhật ký chi tiết

| STT | Ngày | Người thực hiện | Công cụ AI (phiên bản) | Mức độ AI đóng góp | Phạm vi / Module | Câu lệnh chính (Main Prompt) | Mã Commit SHA | Sinh viên tinh chỉnh / Tối ưu | Người review / Cách kiểm chứng | Lỗi / Ảo giác AI & Cách xử lý |
| :---: | :---: | :--- | :--- | :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | 2026-09-25 | Nguyễn Đức Duy | Claude Sonnet 5 | Sinh mới | Entity theo class diagram — `backend/src/main/java/com/aigameplatform/backend/entity/**` | Gửi ảnh class diagram và yêu cầu AI nêu kế hoạch code trước, sau đó code toàn bộ entity theo sơ đồ (các enum, `Teacher`, `Classroom`, `Game`, `EditLog`, nhánh `QuestionGame` 10 loại câu hỏi + `OrderStep`, nhánh `GameSession` + `Team`/`Participant`, `PlayInteractionDetail`). Ràng buộc đã chốt: `id` kiểu String; `PlayInteractionDetail` giữ 1 class như sơ đồ; các trường list giữ đúng như sơ đồ; giữ cột `password` và thêm `passwordHash` cho `Teacher`; 1 `Team` chứa 1 hoặc nhiều `Participant`, mỗi `Participant` thuộc 1 `Team`; thư mục `entity/enums` cho enum; thể hiện rõ association / aggregation / composition trong code (cascade, orphanRemoval, JoinColumn); chưa viết migration, chưa chạy với DB, không push | `345b9b2` (code AI sinh gốc). Các tinh chỉnh bên cạnh chưa commit, cần SHA mới | Sau khi đọc lại code, chỉ ra và yêu cầu sửa: (1) `OrderingQuestion.steps` từ composition sang aggregation (bỏ cascade, orphanRemoval, nullable); (2) `PlayInteractionDetail.question` ghi chú lại thành aggregation; (3) các thuộc tính của `QuestionGame` đổi `private` sang `protected` theo ký hiệu `#`; (4) bổ sung `QuestionGame.editLogs` (`@OneToMany(mappedBy = "question")`) để có quan hệ hai chiều với `EditLog`; (5) ghi tường minh `fetch = FetchType.LAZY` cho 8 chỗ `@OneToMany`; (6) đổi tên cột khóa ngoại `session_id` thành `game_session_id` trong `GameSession.participants` | Đã chạy `./mvnw compile` thành công sau mỗi lần sửa; chưa validate với DB/Flyway | AI đọc nhầm ký hiệu hình thoi trong class diagram (hình thoi rỗng bị hiểu thành composition ở `OrderingQuestion`, mũi tên aggregation bị ghi là association ở `PlayInteractionDetail`) và bỏ sót phía `QuestionGame` của quan hệ với `EditLog`. Người dùng phát hiện khi đối chiếu sơ đồ và yêu cầu sửa |
| 2 | 2026-09-25 | Nguyễn Đức Duy | Claude Sonnet 5 | Sinh mới | `GameContentStrategy` và 10 class con — `backend/src/main/java/com/aigameplatform/backend/service/strategy/**` | Code `GameContentStrategy` (abstract) và 10 Strategy con theo class diagram (`buildPrompt`, `getStructuredSchema`, `buildTypeSpecificInstruction`, `parseToQuestions`, `getSupportedType`) | TODO | TODO | Đã chạy `./mvnw compile` thành công; chưa có unit test | Chưa có: `buildTypeSpecificInstruction`/`parseToQuestions` của 10 class con mới là khung (ném `UnsupportedOperationException`), vì chưa có tài liệu JSON DSL Schema v1.0.0 để không tự bịa tên field |

## Case study lỗi / ảo giác của AI

Chỉ điền khi gặp trường hợp thật. Sao chép khung dưới đây cho mỗi case.

### Case 1: [Tên ngắn gọn của lỗi]

- **Lỗi của AI:**
- **Nguyên nhân & Khắc phục:**
- **Minh chứng Commit SHA:**
