# Bàn giao harness — tiếp nối 2026-11-17

Phạm vi: phát triển có người giám sát trên worktree harness-completion, base afb8f8b58f0be9846b470409bff6fa4e22eba8b5. Không cấp quyền merge/deploy. Mã và tài liệu chưa commit; SHA nhật ký giữ TODO. Không coi các API planned hay dữ liệu mock là sản phẩm đã hoàn thành.

| Task / BR | Kết quả đã chứng minh | Giới hạn nghiệm thu |
|---|---|---|
| T01 / BR-02,07 | Entrypoint gọi kiểm tra thật, trạng thái fail/blocked/skip, vô hiệu live gates; baseline backend/frontend chạy được | PASS chỉ theo scope của report, phải đọc số skip trong log |
| T02 / BR-01,02 | 18 adapter; Codex0.169.0-alpha.11.1/gpt-6.1-sol: hai hash core đã trusted, lệnh thường được chạy, long-inline bị hook chặn trước thực thi, Stop rotate completed; native CLI child có transcript trực tiếp | Codex core PASS; T02 hai host vẫn mở vì Claude hết quota. Personal Stop summarizer lỗi riêng, plugin warnings chưa xử lý. Xem T02-host-smoke.md |
| T03 / BR-03,04 | 6 unit/HTTP test; fake từ chối instruction/history sai, giữ nội dung đã chỉnh, PUT/GET nhất quán | Fake hỗ trợ kịch bản hữu hạn, không chứng nhận mọi yêu cầu tự do |
| T04 / BR-01,03,07 | 8 map/route tests; kiểm 12 endpoint và 12 named routes, test reference và mock/planned rõ | Không thay kiểm hành vi bằng tồn tại file |
| T05 / BR-03,04,07 | Bổ sung37 browser cases:10 renderer preview qua HTTP/Postgres và10 player mock, CPF motion/drag/shoot/walk, viewport/image/audio failure. Sửa ORDERING independent-step persistence và SPOT sample; chi tiết verification-matrix.md | Kết quả toàn suite mã cuối chờ receipt T09 mới. Player grading/session vẫn mock; không chứng nhận thiết bị thật, mọi tổ hợp CPF hoặc chất lượng giáo dục |
| T06 / BR-01,05,07 | Đủ52 fresh native trials: core24, A1 22, A2 bổ sung6; verdict/lý do đều đúng theo judge mới,26 probe entries chạy lại khớp. Chi tiết agent-eval-codex-2026-11-17.md | **Chưa nghiệm thu toàn diện:**9/10 HIGH bị chấm TRUNG BÌNH; import PASS không chấm severity. Giữ người giám sát quyết định mức độ; không tuning vòng hai. Original snapshot thiếu, Claude/judge khác họ chưa kiểm |
| T07 / BR-02,06 | 24 extractor test đạt, CI không loại suite; bỏ override refs WorkspaceEditor, 13 test editor/autosave đạt; lint ratchet; PIT JDK21 đạt 286/294 với threshold97 | Còn102 warning; PIT chỉ ba nhóm validation, còn8 mutant chưa bị bắt; remote CI chưa chạy |
| T08 / BR-05,06 | Cập nhật corrections, enforcement, known-gaps và routing; checker thay phần đối chiếu SHA tất định, agent giữ review ngữ nghĩa | Giữ lessons chưa đủ bằng chứng ở CHỜ DUYỆT; không tự duyệt mọi đề xuất cũ |
| T09 / BR-01…07 | Diễn tập trên các thay đổi thật T03/T07; cố ý mất instruction → HTTP đỏ, bỏ replaceContent khi PUT → HTTP đỏ vì nội dung sửa chưa được giữ, tắt restart → browser đỏ đúng bước; khôi phục nguyên byte. Receipt mới xanh → thêm file nguồn → bị từ chối → khôi phục → xanh | Kết luận toàn bộ checkout lấy từ lần `verify ... --base ...` sau sửa cuối và `--check-report`, không lấy các baseline phía trên thay thế |

Lệnh tái kiểm chính:

```text
node scripts/harness/verify.mjs --base afb8f8b58f0be9846b470409bff6fa4e22eba8b5
node scripts/harness/verify.mjs --check-report <đường-dẫn-report.json-mới>
node scripts/harness/eval-agents.mjs --import backend/target/harness-evidence/agent-trials.json
cd backend
mvnw.cmd --batch-mode test-compile org.pitest:pitest-maven:mutationCoverage
```

Dùng JDK21, Docker và Chromium cho lần tổng hợp; thêm Git Bash vào PATH của riêng tiến trình trên Windows để chạy cả bốn shell test. Mỗi report chứa base, commit/hash mã trước-sau, từng lệnh, mã thoát, thời gian và hash log. Không loại bookkeeping khỏi hash. Bằng chứng thô, trace âm tính, log PIT và các lượt agent ở backend/target/harness-evidence (gitignored); giữ theo chính sách README/CI, không đưa topic/prompt/output thật của giáo viên vào đây. Không có số token hay số tiền đáng tin do host cung cấp; không khẳng định nhanh/rẻ hơn.

Reviewer độc lập từ context mới tìm hai lỗi TRUNG BÌNH (đổi case-role tái dùng kết quả cũ, adapter mồ côi); follow-up kiểm bản sửa tìm thêm nhánh thiếu manifest entry vẫn PASS. Cả ba có test tái hiện đỏ trước sửa, xanh sau sửa; ca thiếu manifest được chạy qua CLI import thật. Tự rà soát T09 bổ sung test và chặn trường hợp mã không đổi nhưng dùng biên bản xanh cũ sau lần chạy mới lỗi/bị ngắt: pointer ghi ngay khi bắt đầu, chỉ chấp nhận biên bản của lượt mới nhất. Gitleaks8.30.1 đã quét snapshot70 file thay đổi/untracked (770.58KB) và không phát hiện secret; snapshot ở target, không quét0 byte hay coi phần staged trống là đạt. Biên nhận không thay review nghiệp vụ hoặc là chữ ký chống giả mạo. Cleanup bình thường đã quan sát; cưỡng bức ngắt/timeout còn giới hạn được ghi trong README.

Quyết định phạm vi tiếp nối: mở rộng10 renderer và nhóm control/motion CPF được liệt kê trong matrix, dùng fixture tổng hợp qua fake AI và HTTP/DB thật. Phân biệt phiên chơi mock với backend chưa cài. Agent eval có nguồn commit và ca phục dựng được gắn nhãn; số lịch sử A1/A2 giữ nguyên, không so trực tiếp tỷ lệ qua các phương pháp khác nhau. Không nâng quyền agent theo tỷ lệ đúng key.

Nợ lint còn lại do người bảo trì frontend chịu trách nhiệm, frontend-implementer xử lý theo task và reviewer kiểm ngữ nghĩa; mọi anchor mới làm đỏ. Không gỡ override hàng loạt:

| Nhóm file còn override | Lý do giữ trong đợt này / điều kiện dọn |
|---|---|
| CpfUniversalCanvas | refs/purity/deps trong renderer chung; cần test motion, vòng đời và pointer trước khi đổi |
| FarmQuizCanvas, useRoomSeconds | purity liên quan thời gian/chuyển động; cần clock/animation và room regression |
| ConfettiEffect | refs và effect của animation; cần kiểm cleanup/reset |
| CreateGamePage | effect/deps trong luồng tạo; cần giữ draft và request lifecycle |
| useTeacherRoom | effect trong trạng thái phòng; backend phòng vẫn planned, không sửa theo mock rồi coi là thật |
| RoomStudentScreen | static component/lifecycle; cần kiểm reconnect và renderer state |
| AudioVisualMatchPlayable | deps của audio/interaction; cần kiểm phát lại, đổi câu và cleanup |

Không dùng hạn chế host làm lý do bỏ các kiểm tra tất định. Các phần BLOCKED/chưa phủ ở trên là phần còn lại thực sự; không có tuyên bố9/9 đã nghiệm thu toàn diện.

T09 tiếp nối: review độc lập tìm2 lỗi TRUNG BÌNH: wrapper đếm thiếu5 bước ORDERING và checker nhận route đã comment. Đã tái hiện, sửa, chạy wrapper thật PASS28/28 và9 test route/feature-map PASS; follow-up sạch. Nhật ký236–240 đã audit, không lỗi; sáu cảnh báo ngày lịch sử ngoài phạm vi. Gitleaks phải quét snapshot mới gồm file untracked sau khi chốt tài liệu. Kết quả backend/frontend/browser toàn mã cuối, secret scan và cleanup lấy từ evidence/receipt mới sau thời điểm chốt; các đoạn baseline lịch sử không thay kết quả này.

Điều kiện bàn giao: khi receipt all mới được check-report chấp nhận, mã trong phạm vi đã kiểm có thể dùng phát triển có giám sát. Điều đó không đóng blocker severity của T06 hoặc Claude của T02, không phải chứng nhận hệ thống tự trị hay sản phẩm game hoàn chỉnh. Không cần viết lại cấu hình chung khi đổi sang Claude; phải kiểm runtime host Claude riêng khi có quota.
