# Sổ ghi lô harness #1 (chạy tự động, 2026-11-14)

Worktree `D:/Data/project/aigame-batch1`, nhánh `chore/harness-batch-1`, tách từ `origin/dev` = `44a47a8` (đã có PR #41, #42).

## Báo cáo cuối

- **Xong:** T2 `0f6ae8e`, T3 `4c70229`, T4 (a+b) `f2b1596`, T5 `98f37c6`; sổ ghi `de50b2f`. PR #44 vào `dev`, chưa merge.
- **Bỏ qua:** T1, vì yêu cầu còn chỗ giữ chỗ `<ĐIỀN_TAY_TRƯỚC_KHI_GỬI>` (nội dung tương tự đã có ở PR #43).
- **CI của PR #44** (commit `de50b2f`, run 43587298301): Backend test xanh (1 m 10 s), Frontend lint & build xanh (3 m 28 s), Log AI và chỉ mục OpenAPI xanh, Secret scan (Gitleaks) xanh, Scan repository history for secrets ×2 xanh; CodeRabbit bỏ qua (không review PR vào nhánh khác nhánh mặc định).
- **Bằng chứng T3:** annotation của CI PR #40 là "15 warnings and 4 notices", có "Node.js 20 is deprecated" và "setup-java v4 is deprecated"; PR #44 là "10 warnings and 4 notices", 0 cảnh báo Node.js 20, 0 cảnh báo setup-java v4 (10 cảnh báo còn lại là lint React ở frontend, có từ trước).
- **Câu hỏi cho Duy:** 6 câu, xem mục bên dưới.
- **`git status` cuối của worktree:** sạch, không có file thay đổi hay chưa track (sau commit sổ ghi này).

## Tiến độ

| Việc | Trạng thái | SHA | Bằng chứng |
|---|---|---|---|
| T1 (việc 5B) | Bỏ qua | — | Dòng điều kiện trong yêu cầu vẫn còn `<ĐIỀN_TAY_TRƯỚC_KHI_GỬI>`. Cùng nội dung sửa đã có ở PR #43 (chưa merge, CI xanh 6 check; cột 10 STT 186 = `TODO` theo lựa chọn trước đó của Duy). |
| T2 (việc 16) | Xong | `0f6ae8e` | `check-links` 36 dòng → "Tổng: 31 trang, 522 liên kết và đường dẫn đã kiểm, 10 lỗi."; test mới đỏ trên bản cũ (12/13), xanh sau sửa (13/13, rồi 14/14 thêm nhánh "Đạt"). |
| T3 (việc 17) | Xong | `4c70229` | actionlint 0 cảnh báo; SHA trùng SHA đã ghim ở workflow khác. Bằng chứng fail→pass: CI PR #40 có cảnh báo "Node.js 20 is deprecated" và "setup-java v4 is deprecated"; xem CI của PR này. |
| T4 (a) | Xong | `f2b1596` | KNOWN-GAPS #14, trích dẫn đã được `reviewer` đối chiếu đúng. |
| T4 (b) | Xong | `f2b1596` | Với `OPENAI_API_KEY=sk-fake-ci-hermetic`: bỏ ghi đè riêng mà chưa có cấu hình chung → `TeacherFlowVerificationTest` đỏ ("Gọi OpenAI Moderation thất bại: Unauthorized", "expected: 200 but was: 504"); có cấu hình chung → xanh, log "KHÔNG gọi OpenAI Moderation"; cả bộ backend: 990 test, 0 fail, 0 error, 10 skipped. |
| T5 (việc 14) | Xong | `98f37c6` | 10 test; endpoint giả `GET /api/games/zz-fake-endpoint` thêm tạm vào `GamesController` bị bắt, hoàn tác xong còn 0 thay đổi. |

`reviewer` (một lượt cho T2–T5, trước khi commit): CAO 0, TRUNG BÌNH 2, THẤP 4. Đã sửa cả 2 TRUNG BÌNH (comment/Javadoc làm lệch `compare-endpoints`; tiền tố class không đọc được gây báo lệch giả) và 4 THẤP (tiền tố thiếu `/`, test `stalePlanned`, URL `servers` tương đối, assert nhánh "Đạt" của `check-links`).

### T2: 10 liên kết còn hỏng (không có đích rõ ràng, không sửa)

- `Cơ sở khoa học và GamED-AI.md`: `docs/Co_so_khoa_hoc.md`; `index.md`: `docs/Co_so_khoa_hoc.docx` (không có lịch sử git đổi tên; ứng viên có thể là `docs/Cơ sở khoa học và Dẫn chứng Kiến trúc.md` nhưng chưa có bằng chứng).
- `index.md`: `docs/SRS_v3.docx` (chỉ có `docs/SRS.docx`).
- `Góp ý Thầy Thanh và 8 vấn đề.md`: `docs/research/3a22128e-…_Vn__tm_thy_-_13102026.md`, `docs/research` (thư mục không có trong repo).
- `Khảo sát 7 nhóm nền tảng đối thủ.md`: `docs/research/khảo sát các nền tảng khác`.
- `log.md`: `docs/SRS-full.md` (đã chuyển sang `docs/srs/`), `docs/context and memory system` ×2 (nhật ký lịch sử, không viết lại).
- `Tiêu chuẩn Đồ họa và Asset Pipeline.md`: `[[experiments/results/t10-bee-garden/README]]` (ngoài vault, không có trong repo).

### T5: chênh lệch thật giữa openapi.yaml và controller

- openapi.yaml: 51 operation; controller: 12 endpoint.
- Có trong code, không có trong openapi.yaml (1): `GET /api/games/{id}/curriculum-review` (`GameCurriculumReviewController.java:15`, trùng KNOWN-GAPS #1).
- Có trong openapi.yaml, không có trong code (40), tất cả `x-status: planned`: auth `forgot-password`, `reset-password`; games `publish`, `regenerate`, `questions/{questionId}/regenerate`, `shared/{shareCode}` (GET), `shared/{shareCode}/play`; `media/upload`; sessions (17 operation: tạo/liệt kê theo game, start/pause/resume/close, xem, results, interactions của participant, đổi team, by-code, join, my-team, questions, gửi interaction, leaderboard, my-result); admin (14 operation: teachers ×6, audit-logs, usage, system-status, ai-config ×4, safety/blocked-words ×2).
- Ghi đã cài (`implemented`/`extended-pending`) mà không có trong code: 0. Ghi `planned` mà code đã có: 0.

## Câu hỏi cho Duy

1. **T1** bỏ qua vì còn dấu `<>`. PR #43 đã làm đúng các sửa tay của T1; muốn điền người review cho STT 186 thì sửa trong PR #43 hoặc sau khi merge.
2. **T2, quy tắc tiền tố**: yêu cầu là "sửa lỗi so sai tiền tố `docs/`" ở checker. Đọc `docs/wiki/README.md` thì vault là `docs/` và đường dẫn tính từ vault, nên 20 liên kết `[[docs/rag-spike/…]]` hỏng thật (lượt trước tôi phân loại nhầm). Mặc định an toàn đã dùng: **giữ quy tắc checker, sửa 20 liên kết**. Nếu muốn checker chấp nhận cả `[[docs/…]]`, đó là đổi quy ước wiki, cần Duy quyết.
3. **T2, 10 liên kết còn hỏng** (danh sách ở trên): xoá, trỏ sang tài liệu khác, hay đưa file gốc vào repo?
4. **T3, secret-scan trùng `gitleaks.yml`**: mỗi PR quét secret 2 lần (job `secret-scan` của `ci-pr` và workflow `gitleaks.yml`, cùng gitleaks-action v3.0.0). Giữ nguyên theo yêu cầu. Gợi ý: bỏ một trong hai nếu muốn CI gọn; `gitleaks.yml` chạy cả khi push nên nên giữ nó.
5. **T3, setup-java**: chọn v6.2.0 thay vì v6.3.0 vì v6.3.0 phát hành sáng 2026-11-14 và đổi mặc định (problem matcher thành opt-in). Có thể nâng sau.
6. **Nhật ký AI**: lô này chưa có dòng `ai-usage-log.md`. Không thêm vì PR #43 (chưa merge) đã thêm STT 202; thêm STT 203 ở đây sẽ làm checker trên nhánh này báo "STT không liên tục". Nên thêm sau khi #43 merge.

## Chưa kiểm chứng

- Liên kết `[[docs/rag-spike/…]]` hỏng trong Obsidian: suy ra từ quy ước ở `docs/wiki/README.md`, chưa mở Obsidian để thử.
- 5 file `.md` thay `.pdf`: chỉ xác nhận cùng tên và tồn tại, chưa đối chiếu nội dung với bản PDF gốc.
- Inputs của setup-java v6 / setup-node v7 / upload-artifact v7 / gitleaks-action v3 chưa đọc `action.yml`; xác nhận bằng CI của PR.
- `TeacherFlowLiveTest` (cần `RUN_LIVE_TEACHER_FLOW=true` và khoá thật) chưa chạy; giữ hành vi cũ là suy luận từ thứ tự ưu tiên thuộc tính của Spring (`reviewer` đồng ý).
