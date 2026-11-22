# Mục lục kho tài liệu

Cửa vào duy nhất của kho: cần tài liệu gì thì bắt đầu từ đây. Vault Obsidian là thư mục `docs/`. Quy tắc ở [[wiki/README|quy tắc wiki]], nhật ký ở [[log]].

## Bắt đầu từ đây

- [[Tổng quan đề tài]]: đề tài giải quyết gì, cho ai, phạm vi, rủi ro.
- [[Góp ý Thầy Thanh và 8 vấn đề]]: nhận xét chỉ đạo từ Thầy Thanh (buổi họp 13/10) và giải pháp cho 8 vấn đề cốt lõi.
- [[Cơ sở khoa học và GamED-AI]]: căn cứ học thuật quốc tế GamED.AI (arXiv 2024), chống ảo giác bằng Quality Gates (thiết kế; chưa nằm trên luồng chạy thật, xem [[Trạng thái thực tế]]).
- [[Trạng thái thực tế]]: đã làm tới đâu, đối chiếu từ code.
- [[Điểm lệch và việc cần chốt]]: các điểm lệch giữa tài liệu và khoảng trống đặc tả. Đọc trước khi sửa SRS hoặc viết báo cáo.
- [[Kế hoạch và việc còn lại]]: P0–P5, nợ, rủi ro, thứ tự nên ưu tiên.
- [[Mâu thuẫn giao diện và câu hỏi mở]]: đủ 19 mâu thuẫn, 18 câu hỏi cho nhóm.

## Sản phẩm

- [[Các luồng nghiệp vụ]]: 5 bước, hành trình giáo viên, học sinh, quản trị.
- [[Ca sử dụng]]: tóm tắt đầy đủ 18 UC (từ UC-01 đến UC-18) và nguyên tắc chung.
- [[Quy tắc nghiệp vụ]]: tra nhanh các con số, giới hạn, điểm số, xử lý sự cố.

## Định hướng & Nghiên cứu Đối thủ

- [[So sánh với web tool]]: hiện trạng, luận điểm khác biệt giữa Web tool tĩnh và AI-Native.
- [[Khảo sát 7 nhóm nền tảng đối thủ]]: phân loại và đánh giá 30+ công cụ (Wordwall, Kahoot, Canva, PhET, Genially...).
- [[24 Cơ chế game chuẩn hóa]]: danh mục 24 cơ chế preset chuẩn hóa (STT 1-24, mã DSL, hành vi tương tác, môn học, độ phức tạp renderer).
- [[Tiêu chuẩn Đồ họa và Asset Pipeline]]: 5 trụ cột đồ họa K-5, bảng đánh giá 16 nguồn asset quốc tế (CC0/MIT), 3 tầng Canvas 60 FPS, Toy Palette, Juiciness.
- [[Tìm và chọn assets phù hợp cho game]]: 6 phương án để hệ thống tìm và chọn đúng asset trong kho lớn: ba tầng (chỉ mục offline, danh sách ngắn, AI chọn) làm nền, cùng tầng khái niệm, gán hình sau, chọn theo vai trò trong game, nhãn bằng mô hình nhìn hình, học từ giáo viên. Đề xuất, chưa cài.
- [[Pipeline chọn hình bằng đồ thị khái niệm và vector]]: thiết kế chốt hướng thay cách chọn hình hiện tại: Gemini chỉ tả hình, bộ chọn tra nhãn, vector tìm khái niệm cho từ lạ, đồ thị ra hình ứng viên, rồi khóa một họ phong cách cho cả game và chọn hình nhiễu; quy tắc lùi họ phong cách khi thiếu. Đề xuất, chưa cài, chưa đo.
- [[Khảo sát kho asset và độ phủ]]: phân loại 69 gói đã tải và đo độ phủ 87 danh từ cần hình so với kho hiện tại (31 đã có, 12 có trong gói đã tải, 44 thiếu); ghi nhận bỏ dấu làm nhiều từ trùng nhau và kết quả giai đoạn 3; mục 14 đo nhu cầu hình từ 100 kịch bản và chuẩn mầm non (146 mục, phủ 82) và nhập 11 con vật vào danh mục; mục 15 tải 52 biểu tượng Fluent (danh mục 221 hình, phủ khoảng 123/146); mục 16 vẽ 16 hình tự vẽ (danh mục 237 hình, phủ khoảng 138/146).
- [[Mô tả ngoài danh mục game]]: giải pháp Composable Primitives Framework (CPF) 20 khối nguyên tử, ma trận bao phủ 10 game và 4 module chuyên sâu.
- [[Trải nghiệm cho trẻ]]: nguyên tắc theo lứa tuổi, đồ họa Candy Gloss, âm thanh, cách đo 60 FPS.

## Giao diện

- [[Giao diện và màn hình]]: nguyên tắc, bản đồ màn hình và wireframe.

## Kỹ thuật

- [[Kiến trúc và công nghệ]]: các tầng, công nghệ, mô hình miền.
- [[Sơ đồ hệ thống]]: Pipeline tạo game AI, kiến trúc N-Tier, activity, use case, class, 18 sơ đồ tuần tự.
- [[Chương trình GDPT 2018 và Curriculum RAG]]: tri thức sư phạm neo chuẩn kiến thức Bộ GD&ĐT K-5, kho 19 tài liệu kiểm toán SGK.
- [[Game JSON DSL]]: khái niệm của contract dữ liệu, không chép field.
- [[Bản đồ API]]: 49 operation, phần đã cài, phần frontend còn cần.
- [[Kiểm thử và vận hành]]: 4 tầng kiểm thử, 8 kịch bản, giám sát, sao lưu.
- [[Kết quả đo sinh game]]: số đo thực nghiệm prompt v4.

## Quyết định

- [[Các quyết định đã chốt]]: tóm tắt `docs/decisions.md` và việc chờ nhóm.

## Tài liệu gốc

Khi viết code hay test, đọc ở đây, không đọc bản tóm tắt.

| Tài liệu | Mở ở đâu |
|---|---|
| Danh sách bản trích SRS | [[srs/README]] |
| 18 ca sử dụng | [[UC-01]] đến [[UC-18]], `docs/srs/` |
| Yêu cầu chức năng | [[FR-summary]] (FR-01 đến FR-18) |
| Yêu cầu phi chức năng | [[NFR]] |
| Trường giao diện FLD | [[FLD]] (FLD-01 đến FLD-53) |
| KPI | [[KPI]] |
| SRS đầy đủ v3 | [[SRS-full]]; hình và bản gốc tại `docs/SRS.docx`, `docs/SRS_v3.docx` |
| Định hướng đề tài v10 | [[Dinh_huong_de_tai]]; bản gốc `docs/Dinh_huong_de_tai.docx` |
| Cơ sở khoa học & Dẫn chứng | [[Cơ sở khoa học và Dẫn chứng Kiến trúc]]; bản gốc `docs/Co_so_khoa_hoc.docx` |
| Góp ý Thầy Thanh & 8 Vấn đề | [[Góp ý Thầy Thanh và 8 vấn đề]]; trích xuất chi tiết tại `docs/Vấn đề tìm thấy sau khi được góp ý/` |
| 14 Báo cáo khảo sát đối thủ | [[Khảo sát 7 nhóm nền tảng đối thủ]]; trích xuất chi tiết tại `docs/khảo sát các nền tảng khác/` |
| Kiến trúc CPF & Cơ chế game ngoài danh mục | [[Mô tả ngoài danh mục game]]; chi tiết tại `docs/Giáo viên mô tả ngoài danh sách game có sẵn/` (`vấn đề/` & `giải pháp/`) |
| Danh mục 24 Cơ chế Game | [[24 Cơ chế game chuẩn hóa]]; chi tiết tại `docs/Giáo viên mô tả ngoài danh sách game có sẵn/giải pháp/Các cơ chế game.md` |
| Tiêu chuẩn Đồ họa & Asset | [[Tiêu chuẩn Đồ họa và Asset Pipeline]]; chi tiết tại `docs/Giáo viên mô tả ngoài danh sách game có sẵn/giải pháp/Đồ họa game.md` |
| Sơ đồ draw.io | `docs/diagrams/` (kèm `Pipeline_Tao_Tro_Choi_AI.drawio` và 18 sequence) |
| Game JSON DSL (contract) | [[game-json-dsl-v1.0.0]] |
| REST API (contract) | `docs/openapi/openapi.yaml` |
| Đặc tả giao diện | [[SPEC]] |
| Kế hoạch giao diện | [[ui/PLAN]] |
| API frontend cần | [[API-CONTRACT]] |
| Wireframe | `docs/ui/wireframes/` (không xem được trong Obsidian) |
| Quyết định | [[decisions]] |
| Số đo thí nghiệm sinh game | `docs/task-1-results/` |
| Thiết kế Pipeline tạo game v2 (đã duyệt hướng) | [[2026-11-07-pipeline-v2-design]] |
| CPF Game v2.0.0, contract game ngoài danh mục (đã duyệt) | [[cpf-game-v2.0.0]] |

## Nằm ngoài vault

Các file này phải ở đúng chỗ để công cụ hoạt động, nên không chuyển vào `docs/`.

| File | Vì sao ở đó |
|---|---|
| `CLAUDE.md` | Claude Code tự nạp từ gốc repo |
| `README.md` | GitHub hiển thị từ gốc repo |
| `ai-usage-log.md` | Log bắt buộc, quy ước ghi ở gốc repo |
| `.claude/agents/`, `.claude/lessons-inbox.md` | Định nghĩa subagent và hộp bài học |
| `.github/ai-review/` | Prompt, hướng dẫn và thiết kế AI review trên CI |
| `backend/src/main/resources/schema/` | JSON Schema, code nạp khi chạy |
| `backend/src/main/resources/moderation/blocked-words-vi.txt` | Danh sách từ cấm, code nạp khi chạy |
| `frontend/README.md` | Hướng dẫn riêng của frontend |
| `.github/PULL_REQUEST_TEMPLATE.md`, `.coderabbit.yaml` | GitHub và CodeRabbit đọc ở đúng chỗ |

## Chưa nạp vào tóm tắt

Nội dung từng wireframe, các sơ đồ trong SRS ngoài các sơ đồ chính, chi tiết `docs/task-1-results/`. Thư mục `experiments/` chưa được git theo dõi.
