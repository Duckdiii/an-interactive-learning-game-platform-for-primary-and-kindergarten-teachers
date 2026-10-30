# Game JSON DSL

Nguồn: `docs/game-json-dsl-v1.0.0.md`. Đây là contract đã freeze, trang này chỉ giải thích khái niệm. Field và ràng buộc phải đọc từ nguồn.
Cập nhật: 2026-10-31

## Vai trò

Hợp đồng dữ liệu giữa AI, Backend, Frontend. Mỗi `question` là một màn chơi trọn vẹn.

## Nguyên tắc

- AI chỉ lo nội dung và quan hệ sư phạm, không sinh tọa độ, kích thước, màu, URL, id.
- Frontend tự tính bố cục.
- Backend là chốt chặn: JSON lỗi không bao giờ tới Frontend.

## Hai dạng dữ liệu

| | Đầu ra của AI | DSL hoàn chỉnh |
|---|---|---|
| Ai tạo | LLM, qua Structured Outputs | Backend |
| Đặc điểm | Đơn giản, chọn đáp án bằng chỉ số | Có id, điểm, thời gian theo khối lớp, đáp án đã xáo, URL media |
| Dùng để | Sinh nội dung | Lưu trữ và trả về frontend |

Giáo viên sửa thì gửi dạng hoàn chỉnh, backend chạy lại 3 lớp kiểm tra. Bản cho học sinh bỏ các trường đáp án.

## Nhóm 10 loại game theo cấu trúc trả lời

| Nhóm | Loại game |
|---|---|
| SingleChoice | Quiz, Audio-Visual Match, Odd One Out |
| TargetTap | Spot the Target |
| PairMatch | Matching, Memory Card |
| Placement | Drag & Drop |
| ClozeFill | Visual Cloze |
| Sequence | Ordering |
| WordScramble | Word Scramble |

## Ba lớp kiểm tra

1. Cú pháp theo JSON Schema.
2. Logic theo từng loại game.
3. An toàn: từ cấm và OpenAI Moderation.

Lỗi lớp 1, 2: gọi lại LLM tối đa 2 lần kèm lỗi, vẫn lỗi thì trả 504, không nạp game mẫu. Lớp 3 phát hiện vi phạm: trả 422, không cho AI sinh lại. OpenAI lỗi hoặc hết giờ thì chặn, không coi là an toàn.

## Chấm điểm

Mỗi màn một kết quả; đúng toàn bộ mới `CORRECT`. Chấm từng phần để sau. Spot the Target chưa có vùng đúng thì không cho xuất bản.

## Việc để sau

Bản học sinh và endpoint riêng, chấm từng phần, hình cho đáp án Quiz và Odd One Out, sinh kiểu TypeScript từ schema, tương thích ngược từ v1.1.0.

Xem thêm: [[Kiến trúc và công nghệ]], [[Mô tả ngoài danh mục game]]
