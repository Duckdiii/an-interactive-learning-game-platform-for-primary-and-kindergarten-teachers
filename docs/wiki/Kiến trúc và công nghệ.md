# Kiến trúc và công nghệ

Nguồn: `docs/SRS.docx` mục 2.3, 2.7, 4.3, 3.2; `docs/Dinh_huong_de_tai.docx` mục 5.2, 8. Kiến trúc đã chốt để code theo nằm ở `CLAUDE.md`.
Cập nhật: 2026-10-31

## Tổng quan

Modular monolith, chia tầng: trình bày (Teacher Portal, Student Runtime, Admin Portal), nghiệp vụ, dữ liệu, dịch vụ ngoài.

Các khối nghiệp vụ trên sơ đồ: Auth, Game Management, Arena, Curriculum RAG, Content Generator, Validation Engine, Rate Limiter, Prompt Versioning, Media Asset Binder.

Nguyên tắc nền tảng: AI chỉ sinh JSON theo schema, giao diện chơi tự vẽ từ JSON.

## Luồng sinh game

Giáo viên mô tả → Intent Parser → tra Yêu cầu cần đạt → Content Generator → Validation → kiểm duyệt → gắn media → lưu → trình chơi. Thứ tự giữa kiểm duyệt và media khác nhau giữa các nguồn, xem [[Điểm lệch và việc cần chốt]].

## Ngăn xếp công nghệ theo SRS

| Tầng | Công nghệ |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Game | Konva.js (react-konva), Howler.js, qrcode.react |
| Backend | Spring Boot 4.1, Java 21, Spring Security, JWT |
| AI | LangChain4j, Google Gemini (Structured Outputs) |
| Kiểm duyệt | OpenAI Moderation, danh sách từ cấm |
| Tài liệu | Apache Tika, Apache PDFBox |
| Validation | Jackson, JSON Schema Validator |
| Thời gian thực | Spring WebSocket, STOMP, SockJS |
| Media | Pexels, Google Text-to-Speech |
| Dữ liệu | PostgreSQL 15+ (Supabase), Flyway |
| Triển khai | Vercel, Render hoặc Railway |

Tra Yêu cầu cần đạt: SRS dùng tra theo khối và môn; pgvector là hướng phát triển.

## Mô hình miền

Theo sơ đồ lớp mục 4.3, chỉ ghi ở mức khái niệm; bản đã chốt để code theo nằm ở `CLAUDE.md`.

- `Game` thuộc `Teacher`, chứa nhiều `QuestionGame` (10 lớp con theo loại game), mỗi câu có nhiều `EditLog`.
- `GameContentStrategy`: 10 chiến lược tạo prompt và đọc kết quả theo loại game.
- `GameSession`: lớp cha của phiên giáo viên tổ chức, tự luyện và phiên gia đình; phiên giáo viên gồm cá nhân, đội, đấu cặp.
- `Participant` tham gia phiên; `PlayInteractionDetail` ghi từng lượt trả lời; `Team` gồm các thành viên; `Classroom` thuộc giáo viên.

## 10 loại game

Quiz, Matching, Drag & Drop, Memory Card, Ordering, Odd One Out, Word Scramble, Visual Cloze, Audio-Visual Match, Spot the Target. Nhóm coi đây là tập mẫu, không phải giới hạn cuối cùng.

## Quản lý phiên bản

Prompt ACTIVE v1.0.0 và `schemaVersion` 1.0.0 đóng băng để phục vụ đo đạc. Đổi prompt phải tạo phiên bản mới có SHA-256 và ghi vết. Nâng schema phải tương thích ngược. Xem [[Kiểm thử và vận hành]].

## Tiến độ theo tài liệu định hướng

Tài liệu này ghi 2/10 loại có trình chơi, chưa có giao diện học sinh, Workspace Editor mới là khung. **Số liệu này có vẻ cũ** so với nhánh `everyone/UI`, chưa đối chiếu với code nên không dùng để báo cáo tiến độ.

Xem thêm: [[Điểm lệch và việc cần chốt]]
