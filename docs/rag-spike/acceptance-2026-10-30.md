# Kết quả nghiệm thu pipeline A — 2026-10-30

**Kết luận: NOT_ACCEPTED.** Có bằng chứng kỹ thuật đạt, nhưng nội dung game và một số ca online chưa đạt. Không thay thuật toán, ngưỡng hoặc model để làm đẹp số liệu trong lúc chạy. Hybrid/HyDE/LLM judge chỉ nằm trong [plan thử nghiệm](rag-variants-experiment.md).

## Điều kiện và phạm vi

- Pipeline A: vector top3 + verifier có kiểu, nguồn/dataset/constraints đã khóa theo [manifest của lượt chạy](results/acceptance-2026-10-30T16-28-55.775506800Z/evaluation-manifest.json).
- 90 query do Codex soạn từ yêu cầu và YCCĐ; **AI_AUTHORED_EXPLORATORY_NOT_INDEPENDENT_HOLDOUT**, nhãn chưa được người duyệt độc lập phê chuẩn. Không dùng thay tập30 tune/60 holdout đã quy định.
- 30 ca supported,30 boundary âm và30 unsupported. Có thiếu sót: cohort boundary chưa có ca dương sát ranh giới; kết quả không đại diện mọi cách diễn đạt.
- OpenAI Moderation preflight trả401. Lượt sinh này dùng **BLOCKLIST_ONLY**, không kiểm định đường OpenAI Moderation và không chứng nhận nội dung đủ an toàn bằng AI.
- Lưu topic/context/output **của ca kiểm thử tổng hợp** theo yêu cầu nghiệm thu, không lấy dữ liệu giáo viên production.

## Bằng chứng tự động

| Bước | Kết quả | Giới hạn |
|---|---|---|
| Backend + DB context + pgvector | Lượt cuối496 test,0 failure/error,5 skipped (491 đạt); coverage70% đạt | Log `backend/target/rag-acceptance-full-suite-final.log`;5 opt-in test/method được bỏ qua trong regression, live acceptance đã chạy riêng và không đạt |
| Retrieval + verification thăm dò90 ca | Hit@3=29/30; acceptance=29/30; false acceptance=0/60; leakage=0;0 provider error | [Report](results/acceptance-2026-10-30T16-28-55.775506800Z/exploratory-retrieval.json); không phải holdout độc lập |
| 20 lần sinh game | 18 generated,2 failed;22 test (20 mẫu + retrieval suite + unsupported scope),0 assertion failure,2 error | [Generation summary](results/acceptance-2026-10-30T16-28-55.775506800Z/generation-summary.json); GENERATED chỉ là vận hành/schema/validator thành công |
| Moderation thật | HTTP401, chưa đạt | [Preflight](results/moderation-preflight-2026-10-30.json); không in key |

20 lần sinh có median4200ms và p95=9949ms (nearest-rank, tính cả ca lỗi). Đây là thời gian của một lượt chạy nhỏ, không phải SLA. Chưa đo chi phí vì báo cáo không thu được usage/tariff đủ tin cậy; không ghi chi phí bằng0. Regression chạy lại đạt không xóa hai lỗi đã xảy ra ở lượt live; artifact giữ nguyên `releaseAccepted=false`.

### Hai ca lỗi online

1. `sample-1`: “Đếm số con vật từ1 đến5” — `CURRICULUM_EVIDENCE_NOT_FOUND`. Cùng ca p001 trong90 query có `retrievalHit=false`, `accepted=false`. Nội dung nằm trong YCCĐ math-g1-001 nhưng YCCĐ mong đợi không có trong tập trả về phù hợp; unit test bao hàm phạm vi có candidate đó vẫn đạt. Cần phân tích retrieval/threshold bằng thí nghiệm khóa dữ liệu, không hạ ngưỡng ngay trên báo cáo nghiệm thu này.
2. `sample-3`: “Đếm trong phạm vi20” — `AI_GENERATION_TIMEOUT`; exception gốc Gemini trả503 `UNAVAILABLE`, thông báo model high demand. Đây là lỗi nhà cung cấp, không phải chủ đề thiếu căn cứ. Không loại ca này khỏi mẫu số để báo thành công20/20.

## Review nội dung có hỗ trợ AI

Reviewer độc lập đã đọc18 game/72 câu hỏi và đối chiếu topic + context được ghi lại. Người điều phối kiểm tra lại các lỗi tiêu biểu bên dưới. **Đây không phải review của giáo viên hoặc nghiệm thu bằng người có chuyên môn**, không đánh dấu cổng20 game đã đạt.

| Mẫu | Kết quả review sơ bộ | Vấn đề/chú thích |
|---|---|---|
| [1](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-1.json) | Không có game | Bị từ chối thiếu căn cứ |
| [2](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-2.json) | Chưa dùng được làm bằng chứng trò chơi đếm | Cả4 câu cần hình con vật nhưng chỉ có visualPrompt, không có imageUrl; renderer hiện chỉ nạp imageUrl |
| [3](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-3.json) | Không có game | Gemini503 |
| [4](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-4.json) | Đáp án văn bản đúng, cần sửa diễn đạt | q4 “Số mười mấy viết là14?” khó hiểu; q2 nghiêng về viết thay vì đọc |
| [5](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-5.json) | Cần sửa | q2 “bảy mươi mươi mốt”; một số câu nghiêng sang đọc/số liền sau thay vì viết |
| [6](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-6.json) | **Lỗi quan trọng** | q2 bà có30 kẹo, cho em25, hỏi số kẹo của bà nhưng chọn55;5 không có trong đáp án |
| [7](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-7.json) | Chưa thấy sai trong văn bản |4 câu trừ đúng, không mượn, trong100; chưa được giáo viên duyệt |
| [8](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-8.json) | Chưa thấy sai trong văn bản | Cộng nhẩm trong10 |
| [9](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-9.json) | Chưa thấy sai trong văn bản | Trừ nhẩm trong10 |
| [10](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-10.json) | Chưa thấy sai trong văn bản | Cộng số tròn chục |
| [11](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-11.json) | Chưa thấy sai trong văn bản | Trừ số tròn chục |
| [12](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-12.json) | Chưa thấy sai trong văn bản | So sánh trong100, nhóm sắp xếp4 số |
| [13](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-13.json) | Cần sửa/thiếu bằng chứng trực quan | Thiếu hình; q4 chỉ có4 cạnh bằng nhau chưa phân biệt được hình vuông với mọi tứ giác khác |
| [14](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-14.json) | Bằng chứng hạn chế | Đáp án tên hình hợp lý; chưa chứng minh nhận biết bằng hình/đồ vật thực tế |
| [15](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-15.json) | Bằng chứng hạn chế | Thiếu hình; một số câu lặp tên “tam giác” |
| [16](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-16.json) | **Lỗi quan trọng** | q4 có cả hình chữ nhật và hình vuông đều thỏa mô tả; toàn bộ câu/options không dấu |
| [17](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-17.json) | Cần sửa/thiếu hình | q3 “Hộp quà hình vuông” lẫn cách mô tả hình phẳng/khối; q4 chủ yếu lặp tên |
| [18](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-18.json) | Bằng chứng hạn chế | Chọn đồ vật có hình khối hợp lý, chưa nghiệm thu trực quan |
| [19](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-19.json) | Đáp án văn bản đúng | Tính độ dài từ hai đầu mút đúng; ảnh thước chưa nghiệm thu |
| [20](results/acceptance-2026-10-30T16-28-55.775506800Z/sample-20.json) | Đáp án văn bản đúng | Đọc giờ đúng dựa mô tả đúng; hình đồng hồ chưa nghiệm thu |

Renderer được kiểm tra ở `frontend/src/games/quiz/QuizRenderer.tsx`: nạp question.imageUrl, không hiển thị visualPrompt. Trong phạm vi backend hiện tại chưa có chuỗi tạo media/UI hoàn chỉnh; đây là giới hạn tích hợp, không được bỏ qua khi tuyên bố game đã chơi được. Frontend chưa có node_modules ở checkout nên chưa chạy lại frontend suite trong lượt này.

## Hành động tiếp theo theo ưu tiên

1. Giữ các mẫu sai làm regression; thiết kế cách kiểm nội dung đầu ra, tính duy nhất của đáp án và bám đúng yêu cầu. Không sửa trực tiếp file game mẫu rồi coi pipeline đã sửa.
2. Điều tra ca đếm1–5 bị retrieval bỏ sót trên baseline cố định; thử nghiệm variant theo ma trận A–E, chưa thay production trong đợt nghiệm thu này.
3. Có key OpenAI Moderation hợp lệ rồi kiểm thử lại kiểm duyệt đầy đủ. Không lấy blocklist pass thay moderation pass.
4. Chuẩn bị tập tune/holdout được người duyệt độc lập xác nhận, có cả ca dương/âm sát ranh giới; không chuyển90 ca AI-authored thành “holdout đã duyệt”.
5. Có ít nhất20 game hợp lệ và giáo viên review theo rubric: đúng đáp án, duy nhất đáp án, phù hợp YCCĐ, giữ điều kiện, tiếng Việt phù hợp, media hiển thị đủ. Hiện chỉ18 game và có lỗi nên cổng này chưa đạt.

Không commit/push hoặc tuyên bố phát hành từ báo cáo này. Các kết quả không đạt được giữ nguyên để có thể tái kiểm tra.
