# Mục lục kho tài liệu

Cửa vào duy nhất của kho: cần tài liệu gì thì bắt đầu từ đây. Vault Obsidian là thư mục `docs/`. Quy tắc ở [[wiki/README|quy tắc wiki]], nhật ký ở [[log]].

## Bắt đầu từ đây

- [[Tổng quan đề tài]]: đề tài giải quyết gì, cho ai, phạm vi, rủi ro.
- [[Trạng thái thực tế]]: đã làm tới đâu, đối chiếu từ code.
- [[Điểm lệch và việc cần chốt]]: các điểm lệch giữa tài liệu và khoảng trống đặc tả. Đọc trước khi sửa SRS hoặc viết báo cáo.
- [[Kế hoạch và việc còn lại]]: P0–P5, nợ, rủi ro, thứ tự nên ưu tiên.
- [[Mâu thuẫn giao diện và câu hỏi mở]]: đủ 19 mâu thuẫn, 18 câu hỏi cho nhóm.

## Sản phẩm

- [[Các luồng nghiệp vụ]]: 5 bước, hành trình giáo viên, học sinh, quản trị.
- [[Ca sử dụng]]: tóm tắt 15 UC và nguyên tắc chung.
- [[Yêu cầu chức năng]]: 15 FR theo 3 phân hệ.
- [[Yêu cầu phi chức năng]]: 5 KPI, 5 nhóm NFR, ràng buộc.
- [[Quy tắc nghiệp vụ]]: tra nhanh các con số, giới hạn, điểm số, xử lý sự cố.

## Định hướng

- [[So sánh với web tool]]: hiện trạng, luận điểm khác biệt.
- [[Mô tả ngoài danh mục game]]: phân loại A–D, mức cam kết.
- [[Trải nghiệm cho trẻ]]: nguyên tắc theo lứa tuổi, đồ họa, âm thanh, cách đo.

## Giao diện

- [[Giao diện và màn hình]]: nguyên tắc, bản đồ màn hình và wireframe.

## Kỹ thuật

- [[Kiến trúc và công nghệ]]: các tầng, công nghệ, mô hình miền.
- [[Game JSON DSL]]: khái niệm của contract dữ liệu, không chép field.
- [[Bản đồ API]]: 49 operation, phần đã cài, phần frontend còn cần.
- [[Kiểm thử và vận hành]]: 4 tầng kiểm thử, 8 kịch bản, giám sát, sao lưu.
- [[Kết quả đo sinh game]]: số đo thực nghiệm prompt v4.

## Quyết định

- [[Các quyết định đã chốt]]: tóm tắt `docs/decisions.md` và việc chờ nhóm.
- [[Quyết định về subagent]]: vì sao phiên chính viết code, subagent đọc, chạy và kiểm tra.
- [[Quyết định về memory]]: memory cho subagent, Obsidian và wiki được chọn thế nào.

## Quy trình

- [[Danh sách subagent]]: 18 agent theo nhóm.
- [[AI review trên CI]]: hệ thống review tự động trên PR.

## Tài liệu gốc

Khi viết code hay test, đọc ở đây, không đọc bản tóm tắt.

| Tài liệu | Mở ở đâu |
|---|---|
| Danh sách bản trích SRS | [[srs/README\|srs/README]] |
| 15 ca sử dụng | [[UC-01]] đến [[UC-15]], `docs/srs/` |
| Yêu cầu chức năng | [[FR-summary]] |
| Yêu cầu phi chức năng | [[NFR]] |
| Trường giao diện FLD | [[FLD]] |
| KPI | [[KPI]] |
| SRS đầy đủ | [[SRS-full]]; sơ đồ chỉ có ở `docs/SRS.docx` |
| Định hướng đề tài | [[Dinh_huong_de_tai]]; bản gốc `docs/Dinh_huong_de_tai.docx` |
| Game JSON DSL (contract) | [[game-json-dsl-v1.0.0]] |
| REST API (contract) | `docs/openapi/openapi.yaml` |
| Đặc tả giao diện | [[SPEC]] |
| Kế hoạch giao diện | [[ui/PLAN\|ui/PLAN]] |
| API frontend cần | [[API-CONTRACT]] |
| Wireframe | `docs/ui/wireframes/` (không xem được trong Obsidian) |
| Quyết định | [[decisions]] |
| Kế hoạch và phân tích cũ | [[plan]], [[analysis]], [[progress-2026-10-16]] |
| Thí nghiệm sinh game | [[task-1-quiz-spike-plan]], `docs/task-1-results/` |
| Subagent | [[subagents]] |
| AI review trên CI | [[ai-auto-review]] |

## Không dùng để viết code

[[json-dsl/v1.0.0/README|json-dsl/README]] và `docs/json-dsl/v1.0.0/examples/` là ví dụ cũ, khác DSL hiện hành.

## Nằm ngoài vault

Các file này phải ở đúng chỗ để công cụ hoạt động, nên không chuyển vào `docs/`.

| File | Vì sao ở đó |
|---|---|
| `CLAUDE.md` | Claude Code tự nạp từ gốc repo |
| `README.md` | GitHub hiển thị từ gốc repo |
| `ai-usage-log.md` | Log bắt buộc, quy ước ghi ở gốc repo |
| `.claude/agents/`, `.claude/lessons-inbox.md` | Định nghĩa subagent và hộp bài học |
| `.github/ai-review/` | Prompt và hướng dẫn của CI |
| `backend/src/main/resources/schema/` | JSON Schema, code nạp khi chạy |
| `backend/src/main/resources/moderation/blocked-words-vi.txt` | Danh sách từ cấm, code nạp khi chạy |
| `frontend/README.md` | Hướng dẫn riêng của frontend |
| `.github/PULL_REQUEST_TEMPLATE.md`, `.coderabbit.yaml` | GitHub và CodeRabbit đọc ở đúng chỗ |

## Chưa nạp vào tóm tắt

Nội dung từng wireframe, các sơ đồ trong SRS ngoài 5 sơ đồ chính, mục 2–10 của AI review, chi tiết `docs/task-1-results/`. Ảnh `screenshots/` chỉ có trên `everyone/UI`. Thư mục `experiments/` chưa được git theo dõi.
