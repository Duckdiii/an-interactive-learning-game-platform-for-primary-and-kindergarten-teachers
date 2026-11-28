# T06 — hiệu chỉnh severity, vòng BR-01…06 (17/11/2026)

Trạng thái: đang triển khai theo kế hoạch `docs/superpowers/plans/2026-11-17-t06-severity-calibration.md`; chưa nghiệm thu model hoặc source cuối. Dùng Codex có giám sát, không cấp quyền merge/deploy.

## BR-01: chuẩn tác động đã đối chiếu độc lập

- HIGH: lỗi trực tiếp làm sai chức năng chính/mất hoặc lộ dữ liệu; hoặc bypass kiểm soát bắt buộc về secret, dịch vụ ngoài, hay tính hợp lệ của bằng chứng. Phải có đường đầu vào → lỗi → hậu quả trong phạm vi ca. Với harness, việc cấp chứng nhận/cho thao tác bị cấm là chức năng chính, không chỉ là thiếu test.
- MEDIUM: lỗi ở nhánh thực tế hoặc thiếu test bảo vệ hành vi quan trọng, nhưng chưa có bằng chứng hậu quả HIGH. Không nâng mọi lỗi parser/hook lên HIGH.
- LOW: sai lệch trình bày/a11y nhỏ không làm sai thực thi, dữ liệu hay trạng thái chính. Không dùng để che lỗi bảo mật hoặc chặn sử dụng.
- CLEAN: không có finding; severity null/không có, không dùng MEDIUM placeholder.
- Thiếu chứng cứ thì nêu giới hạn; không giả định đã quan sát HTTP, mất dữ liệu hay lộ secret. BLOCKED không phải CLEAN.

| Nhóm | Quyết định rubric vòng mới | Căn cứ |
|---|---|---|
| r-k1 / A2-1 | Giữ HIGH | ERR có ANSI làm commit evidence gate bắt buộc cho qua; probe chạy thật xác nhận. Reconstructed, không replay original |
| r-k2 / A2-2 | Giữ HIGH | Source CI/config/client chứng minh đường gọi dịch vụ ngoài dù suite offline; chưa chạy Java/HTTP |
| r-k4 | Đổi HIGH cũ → MEDIUM trong rubric mới | Probe chứng minh parser không chặn eval sau separator; chưa chứng minh hậu quả HIGH từ guard chống mất escape. Independent audit challenge gold trước sửa role; không phải chỉnh sau nhìn model mới |
| r01 / r03 | HIGH | Nuốt child failure hoặc cho receipt cũ che lần mới lỗi: cấp chứng nhận sai ở chức năng chính của harness |
| Reviewer CLEAN | null | Không có finding để gán mức |
| Auditor/verifier | Không chấm severity trong vòng này | Giữ verdict scope riêng, không nhận vơ chứng nhận độ ưu tiên của các vai trò chưa được đo |

Baseline lịch sử vẫn là9/10 HIGH bị đánh MEDIUM theo rubric cũ. Việc đổi nhãn r-k4 không được báo như model đã cải thiện; nguồn/đáp án cũ giữ ở `backend/target/harness-evidence/t06-calibration-baseline/`. Kết quả mới phải ghi rõ rubric mới, không so tỷ lệ như cùng phép đo.

## Ca mới v1 và cách đánh giá

Tám ca n01…n08 đóng băng trước sửa prompt: ownership leak, invalid-edit data loss, partial pagination, retry boundary, copy defect và ba ca sạch. Independent audit đã chạy12 probe của nhóm này + r01…04, không thấy mâu thuẫn key. Source/probe không có nhãn severity/đáp án; intent chỉ nêu phạm vi nghiệp vụ. Key ở file rubric riêng, không giao cho agent làm ca.

Vòng v1 dùng hai catalog: core20 entries, history14 entries; tổng68 trial slots. Reviewer có40 trial mới (hai context/ca cho20 entries), trong đó16 trial từ ca mới;28 trial verifier/auditor chỉ được tái dùng sau khi kiểm role/case/brief/probe/native execution thật vẫn nguyên. Không báo cả68 là lượt mới hoặc34 tình huống độc lập: A2 trùng ba A1 subjects. Catalog hiện tại của vòng v2 có thêm p01…04, số liệu riêng ở dưới.

Ngưỡng nghiệm thu chọn trước khi nhìn kết quả mới: mọi verdict/severity được yêu cầu phải đúng, không thiếu impact/reason/evidence, không missed/down-rated HIGH hoặc false HIGH ở ca sạch trong bộ đã chốt. Ngưỡng này không bảo đảm tổng quát. Không tuning/gold edit sau khi xem held-out trong vòng này; không đạt thì giữ FAIL và giám sát.

## Bằng chứng và kết luận từng bước

- BR-01: audit độc lập source/probes hoàn tất; các quyết định ở trên được ghi trước BR-02. Chuyển BR-02 vì phạm vi và hậu quả đã rõ.
- BR-02: canonical reviewer nêu rõ hậu quả/phạm vi/giới hạn bằng chứng và HIGH/MEDIUM/LOW/null, JSON phải nhất quán phần chữ; adapter sinh lại, checker và3 adapter tests PASS. Chưa coi prompt đã có hiệu quả cho đến BR-05.
- BR-03/04: bốn test mới tái hiện RED (grader và CLI import vẫn PASS cho sai severity, brief/key chưa có validation). Sửa existing runner: wrong severity FAIL, missing rationale/impact/severity BLOCKED, CLEAN không mang finding severity.20 focused tests PASS/0skip gồm CLI import/stale-role và cả receipt regressions; catalogs20/14 validate. Các scope legacy báo severityRequired=0, không chứng nhận severity.
- BR-05 v1 đã chạy đủ: core PASS40/40, history FAIL28 verdict đúng nhưng4 severity sai; independent judge tổng68/68 verdict,36/40 severity,12/16 HIGH đúng,0 false HIGH/false CLEAN. Bốn lỗi r-k1 và A2-1 đều đòi caller/commit thật mới xếp HIGH. Judge xác nhận contract+quyết định gate đã đủ, không đổi gold. Raw/role/keys/source v1 giữ trong backend/target/harness-evidence/t06-calibration-round1; đây vẫn là FAIL, không được hồi tố thành PASS.
- BR-02/05 v2 tách riêng: bổ sung chuẩn bằng chứng (severity hậu quả khác execution confidence), không buộc thực hiện thao tác ngoài hoặc phá dữ liệu khi path đã được chứng minh trong contract. Thêm p01…04 prospective holdout đã đóng băng/audit trước sửa role: mandatory admission, copy-only, optional diagnostic, clean gate. V1 n01…08 giờ là regression đã thấy. Giữ mọi gold cũ nguyên, cần48 reviewer trial mới và28 unchanged-role verdict proofs, tổng76 slots trên24core+14history entries. Model chưa nghiệm thu cho đến khi đủ kết quả/semantic judge.
- BR-06 chờ kết quả v2 rồi source freeze và receipt mới; local fixture validation không thay model eval; verdict-only PASS không thay severity acceptance.

Runtime Claude, judge khác họ model, original snapshots bị thiếu, HTTP lịch sử, thiết bị thật và remote CI vẫn ngoài phạm vi vòng này. Bản ghi cuối trong ignored evidence/chat quyết định trạng thái aggregate sau source freeze.
