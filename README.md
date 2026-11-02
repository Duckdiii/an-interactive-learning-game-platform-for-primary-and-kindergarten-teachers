# AI-Game Platform

Nền tảng trò chơi học tập tương tác cho giáo viên mầm non và tiểu học. Giáo viên mô tả bài học bằng lời (hoặc tải lên giáo án), AI sinh ra trò chơi học tập hoàn chỉnh, giáo viên chỉnh sửa rồi chia sẻ cho học sinh chơi ngay trên máy tính, máy tính bảng hoặc điện thoại. Đây là đồ án tốt nghiệp.

## Đề tài giải quyết vấn đề gì

Giáo viên mầm non và tiểu học muốn dạy bằng trò chơi vì trẻ nhỏ học tốt hơn qua hình ảnh, âm thanh và thao tác chạm. Nhưng tự thiết kế một trò chơi mất nhiều thời gian, đòi hỏi kỹ năng đồ họa và công nghệ mà phần lớn giáo viên không có. Đề tài đưa việc làm này về một bước: **nói điều muốn dạy, nhận lại trò chơi dùng được**.

Mục tiêu của đề tài:

- Giáo viên tạo được một trò chơi trong vòng dưới một phút từ một mô tả ngắn hoặc một tệp giáo án.
- Nội dung do AI sinh bám sát yêu cầu cần đạt của chương trình giáo dục, không ảo giác kiến thức và an toàn với trẻ nhỏ.
- Học sinh chơi không cần tài khoản, giao diện và phản hồi phù hợp với độ tuổi.
- Giáo viên giữ toàn quyền kiểm soát: xem trước, chỉnh sửa thủ công, yêu cầu AI làm lại từng câu rồi mới xuất bản.

## Ai dùng hệ thống

| Vai trò | Làm gì |
|---|---|
| **Giáo viên** | Đăng ký và đăng nhập, mô tả bài học để AI sinh trò chơi, chơi thử, chỉnh sửa trên không gian soạn thảo, xuất bản và chia sẻ cho học sinh, mở phòng chơi tập thể |
| **Học sinh** | Vào chơi bằng mã chia sẻ, mã QR hoặc đường dẫn (tự luyện tập), hoặc bằng mã PIN của phòng chơi do giáo viên mở (thi đấu cá nhân hoặc theo đội). Không cần đăng nhập |
| **Quản trị viên** | Theo dõi chi phí và tình trạng hệ thống, quản lý tài khoản giáo viên, điều chỉnh cấu hình AI |

## Các chức năng chính

- **Sinh trò chơi bằng AI** từ lời mô tả hoặc tệp giáo án (.docx, .pdf), có tra cứu yêu cầu cần đạt để nội dung đúng chương trình.
- **Chơi thử** ngay trên màn hình xem trước, không ghi điểm và không đổi trạng thái xuất bản.
- **Không gian soạn thảo**: sửa câu chữ, đáp án, hình ảnh, âm thanh của từng thẻ câu hỏi và thấy kết quả tức thì; yêu cầu AI làm lại riêng một câu mà giữ nguyên các câu còn lại.
- **Xuất bản và chia sẻ** bằng mã 6 ký tự, đường dẫn và mã QR.
- **Tự luyện tập** cá nhân tại nhà, có phản hồi khích lệ.
- **Phòng chơi tập thể (Live Arena)**: giáo viên điều khiển trực tiếp, bảng xếp hạng cập nhật theo thời gian thực, thi đấu cá nhân hoặc theo đội.
- **Giọng đọc AI** đọc to câu hỏi và hướng dẫn, giúp trẻ chưa đọc thạo vẫn chơi được.
- **Trang quản trị** cho chi phí AI, tài khoản giáo viên, nhật ký thao tác và cấu hình AI.

## 10 loại trò chơi

| Loại | Trẻ làm gì |
|---|---|
| Quiz | Chọn đáp án đúng trong 2 đến 4 lựa chọn |
| Audio-Visual Match | Nghe một âm thanh rồi chọn hình tương ứng |
| Odd One Out | Tìm vật khác loại trong nhóm |
| Spot the Target | Chạm vào đúng vật trong tranh |
| Matching | Nối các cặp tương ứng |
| Memory Card | Lật thẻ tìm các cặp giống nhau |
| Drag & Drop | Kéo vật vào đúng vùng |
| Ordering | Sắp xếp các bước theo đúng thứ tự |
| Visual Cloze | Điền từ còn thiếu vào câu dựa trên hình |
| Word Scramble | Sắp xếp lại chữ cái thành từ đúng |

## Điểm đặc trưng về kỹ thuật

- **AI chỉ sinh nội dung sư phạm, không sinh giao diện.** AI trả về một tệp JSON theo đặc tả riêng (*Game JSON DSL*), không có tọa độ, màu hay kích thước. Frontend tự tính bố cục theo màn hình, nên một trò chơi chạy được từ điện thoại đến máy chiếu.
- **Ba lớp kiểm duyệt trước khi lưu**: (1) đúng cấu trúc JSON Schema, (2) đúng logic nghiệp vụ của từng loại game, (3) kiểm duyệt an toàn nội dung bằng danh sách từ cấm kết hợp dịch vụ kiểm duyệt. JSON lỗi không bao giờ tới học sinh.
- **Thiết kế cho trẻ nhỏ**: nút chạm đủ lớn, khi trả lời sai chỉ phản hồi nhẹ nhàng và chỉ ra đáp án đúng, luôn có nút nghe lại lời đọc.
- **Không lưu thông tin nhận dạng cá nhân của học sinh**: học sinh tham gia ẩn danh bằng mã.

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Backend | Spring Boot 4, Java 21, Maven, Flyway, WebSocket (STOMP) |
| Cơ sở dữ liệu | PostgreSQL (Supabase) |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Đồ họa trò chơi | Konva (react-konva), Howler (âm thanh) |
| AI | Gemini qua LangChain4j |

## Cấu trúc thư mục

```
backend/   Spring Boot (API, sinh game bằng AI, kiểm duyệt, phòng chơi)
frontend/  React + TypeScript (giao diện giáo viên, trình chơi trên Canvas)
docs/      Tài liệu: đặc tả yêu cầu (SRS), Game JSON DSL, hợp đồng REST API
```

## Tài liệu

- Đặc tả yêu cầu phần mềm: [`docs/SRS.docx`](docs/SRS.docx) (bản trích dạng chữ ở [`docs/srs/`](docs/srs/README.md))
- Đặc tả Game JSON DSL: [`docs/game-json-dsl-v1.0.0.md`](docs/game-json-dsl-v1.0.0.md)
- Hợp đồng REST API (OpenAPI): [`docs/openapi/openapi.yaml`](docs/openapi/openapi.yaml)
- Hướng dẫn cho AI agent trong repo: [`CLAUDE.md`](CLAUDE.md)
