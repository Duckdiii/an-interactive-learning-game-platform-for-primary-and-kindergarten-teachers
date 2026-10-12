# Bằng chứng spike RAG Toán lớp 1

## Trạng thái đo

**Đã chạy retrieval live trên Gemini + Supabase.** Lần đầu với `minScore=0.75` đạt positive Hit@3 10/10 nhưng trượt negative gate: cả ba câu ngoài phạm vi nhận kết quả. Báo cáo gốc: `results/live-2026-10-10T16-35-07.114857800Z.json`.

## Bộ query cố định trước khi đo

Đáp án kỳ vọng được chọn từ bảng gốc, đối chiếu nội dung và trang, trước khi chạy Gemini embeddings. `math-g1-*` ở trang PDF 187–189. Query có nhiều đáp án đúng chỉ cần một đoạn liên quan trong top 3 để tính Hit@3.

| ID | Chủ đề query | Chunk kỳ vọng | Kết quả live | Nhận xét thủ công |
|---|---|---|---|---|
| q01 | Phép cộng nhẩm trong phạm vi 10 | math-g1-007 | Đạt; top 1 | Trang 188, đúng yêu cầu cộng/trừ nhẩm trong phạm vi 10 |
| q02 | Bé tập đọc và viết các số từ 0 đến 100 | math-g1-001 | Đạt; top 1 | Trang 187, giới hạn phạm vi 10, 20, 100 được giữ nguyên |
| q03 | So sánh và sắp xếp bốn số trong phạm vi 100 | math-g1-003 | Đạt; top 1 | Trang 188, có giới hạn nhóm không quá 4 số |
| q04 | Cộng trừ hai số không nhớ trong phạm vi 100 | math-g1-005 | Đạt; top 1 | Trang 188, giữ điều kiện không nhớ |
| q05 | Tính nhẩm cộng trừ các số tròn chục | math-g1-008 | Đạt; top 1 | Trang 188, đúng yêu cầu tính nhẩm số tròn chục |
| q06 | Nhận biết hình vuông, tròn, tam giác, chữ nhật | math-g1-012 | Đạt; top 1 | Trang 188, khối hình khác nằm ở top 2 nhưng vẫn cùng lớp/môn |
| q07 | Nhận biết khối lập phương, khối hộp chữ nhật qua vật thật | math-g1-013 | Đạt; top 1 | Trang PDF 188–189, yêu cầu được ghép qua trang |
| q08 | Dùng thước đo độ dài bằng xăng-ti-mét | math-g1-020 | Đạt; top 2 | Trang 189; chunk nhận biết cm ở top 1 cũng liên quan trực tiếp |
| q09 | Xem đồng hồ và đọc giờ đúng | math-g1-018 | Đạt; top 1 | Trang 189; nhận biết và đọc giờ đúng cùng xuất hiện |
| q10 | Số ngày và thứ tự các ngày trong tuần | math-g1-017 | Đạt; top 1 | Trang 189, đúng 7 ngày và thứ tự các ngày |

Ba negative queries: cộng/trừ phân số khác mẫu số; bảng cửu chương 7; lập trình vòng lặp Python. Lần chạy đầu trả các chunk gần nghĩa nhưng không hỗ trợ câu hỏi, với điểm cao nhất lần lượt là 0.839, 0.823 và 0.793. Positive có điểm chunk kỳ vọng thấp nhất 0.872. Vì vậy ngưỡng spike được thử ở `0.855`, giữa hai nhóm điểm.

Ngưỡng 0.855 được chọn sau khi xem bộ 10 positive và 3 negative, nên lần chạy tiếp theo là hiệu chỉnh exploratory trên cùng bộ, không phải kiểm tra holdout độc lập. Cần xác nhận kết quả ở bộ query mới trước khi coi ngưỡng phù hợp rộng hơn.

## Kết quả live lần đầu — ngưỡng 0.75

- Positive: 10/10 query tìm thấy chunk kỳ vọng trong top 3 (Hit@3 100%).
- Leakage: 0 chunk sai môn/lớp; cả 5 control probes tìm thấy control trong scope riêng và không rò vào Toán lớp 1.
- Negative: 0/3 bị từ chối. Đây là **fail** cho tiêu chí xử lý thiếu căn cứ.
- Đã xem thủ công 10 positive: nội dung và nguồn khớp query; kết quả nằm ở PDF trang 187–189, không vượt giới hạn đã ghi trong chunk. Các negative chỉ trả chunk Toán lớp 1 gần nghĩa nhưng không chứng minh được yêu cầu ngoài chương trình.
- Thời gian từng query và nguyên văn kết quả nằm trong JSON báo cáo.

## Tiêu chí pass/fail

- Có đủ 10 positive query; `Hit@3 = số query có ít nhất một chunk kỳ vọng trong top 3 / 10`, phải ≥ 0,8.
- Không trả chunk sai môn/lớp ở bất kỳ query/probe Toán lớp 1 nào.
- Các đối chứng thực sự đã nạp: 3 chunk Toán lớp 2 và 2 chunk Tiếng Việt lớp 1. Truy vấn trong scope của chúng phải tìm được chúng; truy vấn Toán lớp 1 không được nhận các chunk này.
- Negative gate riêng: 3/3 negative query phải nhận `INSUFFICIENT_EVIDENCE`. Báo cáo giữ riêng retrieval gate và negative gate để thấy rõ RAG tìm đúng ở các query hợp lệ nhưng có thể vẫn chấp nhận query ngoài chương trình.
- Một kết quả semantic gần nghĩa không được xem là căn cứ đủ.
- Đọc bằng mắt các đoạn trả về và trang nguồn trước khi đưa kết luận vào báo cáo. Score tương đồng không phải xác suất yêu cầu đó đúng chương trình.

## Các kiểm tra đã có

- Render bảng nguồn, xác định phụ lục Toán và ranh giới lớp.
- PDFBox xác minh 28/28 chunk trên 6 trang; giữ giới hạn kiến thức và ghép đúng yêu cầu qua trang.
- Unit tests dùng in-memory store thật và vector tổng hợp để kiểm tra filter trước ranking, loại phiên bản/model khác, ngưỡng thiếu căn cứ, ID ổn định/nạp lại, sai chiều vector, metric và contract prompt tương thích.
- Bộ backend không cần kết nối thật: 459 tests, 0 failure/error/skip; gate coverage 70% đạt. `AigameBackendApplicationTests` cần cấu hình JDBC/Spring đầy đủ và được loại khỏi lần chạy này. `clean install -DskipTests` cũng thành công.

## Phần còn thiếu trước khi kết luận spike

1. Đã cấu hình Gemini/Supabase; secret chỉ nằm trong `backend/.env`.
2. Đã chạy Flyway V5 trên Supabase.
3. Đã nạp 28 embedding; lần chạy lại ghi `written=0, skipped=28`.
4. Đã chạy 10 query, 3 negative query và 5 control probes; giữ JSON từng lần chạy.
5. Đã xem thủ công từng positive result, nguồn PDF/printed page và negative rejection. Kết quả trên bộ spike đạt tiêu chí đã định; ngưỡng được hiệu chỉnh trên cùng bộ và cần kiểm tra thêm bằng holdout trước khi khái quát hóa.

## Later independent holdout (2026-10-11)

The frozen `math-g1-holdout-v1` is separate from the exploratory 13-query fixture. At the existing threshold 0.855 it returned Hit@3 6/6, false rejection 0/6, negative rejection 3/3, near-miss rejection 1/3, false acceptance 2/6 and leakage 0. The holdout gate failed on two accepted near-miss queries. Calibration remains `NOT_RUN`; production threshold was not changed. Do not read the historical exploratory pass above as a holdout pass. See the [consolidated report](results/curriculum-rag-summary.md) and linked raw JSON/CSV.