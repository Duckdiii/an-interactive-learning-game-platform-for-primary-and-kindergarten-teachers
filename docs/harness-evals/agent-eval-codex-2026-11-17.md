# T06b — Codex, bộ mở rộng và nguồn A1/A2

Bản ghi baseline trước vòng sửa severity. Lượt BR-01…06 tiếp theo được ghi riêng tại [T06-severity-calibration.md](T06-severity-calibration.md); giữ nguyên các kết quả và giới hạn lịch sử bên dưới, không sửa chúng thành PASS sau khi đổi role.

Trạng thái: **đã đánh giá đủ lượt; phát hiện đúng nhưng hiệu chỉnh severity chưa đạt**. Base `afb8f8b58f0be9846b470409bff6fa4e22eba8b5`, có thay đổi chưa commit. Giữ phát triển có người giám sát; không tự dùng nhãn severity để bỏ qua lỗi, không tự merge/deploy. Không gọi đây là nghiệm thu toàn bộ T06 gốc.

## Bộ ca và ranh giới

| Bộ | Đầu vào | Lượt cần có | Giới hạn |
|---|---|---|---|
| Smoke/held-out | 6 ca cũ +6 ca mới: receipt cũ che lỗi mới, scope thiếu/đúng, SHA đúng nhưng phạm vi sai, TODO cho plan-only | 24, hai context độc lập mỗi ca | Ca mới đóng băng trước khi chỉnh ngoại lệ probe; không phải mẫu thống kê bảo đảm tổng quát |
| A1 nguồn/phục dựng | 5 reviewer +6 log-auditor | 22, hai lượt/ca | Ba patch có nguồn Git; hai draft và sáu snapshot log thiếu nguyên bản, chỉ có ca dựng lại theo mô tả |
| A2 protocol Codex | Ba nguồn trùng A1 r-k1…r-k3; arm reviewer dùng lại chính các lượt A1 trên cùng input, arm phản biện có brief riêng | 6 lượt arm phản biện; reviewer arm không đếm thành ca độc lập mới | Không phải plugin pstack; không chứng minh lợi ích của judge khác họ |

Tổng catalog là12 +14 case entries,52 lượt, không phải26 tình huống độc lập. Chỉ `--validate`/`--prepare` hoặc local probe PASS không chứng minh model đã làm đúng.

## Nguồn lịch sử

- r-k2/w-k2: commit `bfaacb07fc31ff6025aacef61b591a921b567432`, base `46843f97908659102e7316a4b76d4b2a858f08ac`; patch luồng HTTP và ngữ cảnh CI/application/safety. Probe chỉ cung cấp bằng chứng source về key và cấu hình, không chạy Java/HTTP.
- r-k3/w-k3: commit `4c70229f6e435d16c44f9bb4e993deef5d85a042`, base `0f6ae8e82b5a874f6fc77c2cdad9e79ff2c0f550`; pin workflow. Probe kiểm hình dạng SHA, không xác nhận tag/upstream hiện tại.
- r-k5: commit `f2b15962512b6bfb7220cbc818dea3b836b79351`, base `4c70229f6e435d16c44f9bb4e993deef5d85a042`; key rỗng trong test profile và opt-in live riêng.
- r-k1/w-k1: `3c00558` đã có no-color/ANSI stripping nên không phải draft lỗi cũ. Case là hàm gate dựng lại từ mô tả ANSI ERR, gắn nhãn RECONSTRUCTED.
- r-k4: `6e7352a` đã dừng từ không nháy ở ký tự nối lệnh và có regression; không nhận vơ là draft lỗi. Case dựng lại bằng bỏ điều kiện dừng nối lệnh, probe chỉ gọi parser.
- l-1…l-6: bảng tổng hợp mới dùng metadata giả, mô phỏng thiếu cột/câu không lỗi/STT/SHA/ca sạch/thêm dòng. Không có raw mutation/baseline của worktree cũ; không gọi đây là replay nguyên bản.

`history-manifest.json` đóng băng patch, context và provenance; `history-rubric.json` ở ngoài brief. Reviewer độc lập đã đối chiếu patch và tất cả file của ba nguồn với Git, không thấy lệch. Source commit có thật không tự chứng minh staged/unstaged state của lần eval cũ đã khôi phục.

Sai khác với kỹ thuật repro dự kiến trong plan: ca moderation dùng phân tích source đóng băng, chưa dựng lại Java với HTTP server giả. Vì vậy chỉ đo khả năng đọc liên kết CI/config/safety, không nghiệm thu runtime HTTP của commit cũ. Các ca log là dữ liệu tổng hợp; A2 giữ cùng subject/probe nhưng thêm chỉ dẫn hoài nghi, không phải hai phương pháp nhận brief nguyên byte giống nhau.

## Cơ chế chạy và kiểm bằng chứng

- Native children gọi đúng role, context mới, sandbox read-only trên CLI đã cài/model thực tế có trong tool events. Không dùng tên Claude trong frontmatter để suy ra model Codex.
- Chỉ giao thư mục case/brief, không giao đáp án hoặc verdict lượt trước. Giới hạn đọc do chỉ dẫn không phải sandbox bảo mật ngăn tuyệt đối đọc key; raw tool trace dùng để kiểm phạm vi quan sát được.
- Thu parent/child history của chính ca tổng hợp: native role/parent ID, model, command/exit/stdout, role/case hashes. Collector chỉ nhận probe execution thành công có stdout JSON khớp khai báo; giữ raw incomplete/failed attempts riêng.
- Import dùng runner hiện có: kiểm metadata, subject/probe/brief nguyên byte, role/case version và replay probe. Lượt source/role cũ không được recertify bằng cách prepare lại manifest.
- Native refusal cũ cho thấy whitelist lệnh không khớp brief eval. Chỉ sửa hai nguồn verifier/auditor để cho phép probe chỉ đọc được giao rõ trong thư mục đã chuẩn bị; không đổi sandbox/quyền, không cho probe ghi file/gọi mạng. Verifier scripts command cũng nhận explicit base. Adapter được sinh lại; vai trò đổi phải chạy mới.
- Lượt trước quota ở parent `01a1e4a3-ead1-74b0-8773-16b3490ac608` có `usageLimitExceeded`; incomplete children không thành PASS. Bốn lượt reviewer còn đúng role/case version được giữ; các lượt verifier/auditor phải recertify, không tái dùng agent đã xem ca khác.

## Lệnh tái lập

```text
node --test scripts/harness/eval-agents.test.mjs scripts/harness/verify.test.mjs
node scripts/harness/check-agent-config.mjs
node scripts/harness/eval-agents.mjs --validate
node scripts/harness/eval-agents.mjs --history --validate
node scripts/harness/eval-agents.mjs --prepare
node scripts/harness/eval-agents.mjs --history --prepare
node scripts/harness/eval-agents.mjs --import backend/target/harness-evidence/agent-trials-codex.json
node scripts/harness/eval-agents.mjs --history --import backend/target/harness-evidence/agent-trials-history.json
```

Prepare không gọi model. Live native runs cần tài khoản/host thật và full Git history cho ca reachability; không dùng CI mặc định gọi model. `verify` kiểm cả hai catalog offline, không lấy local validation làm bằng chứng live eval.

## Kết quả và giới hạn bàn giao

Core import PASS24/24 và history/protocol import PASS28/28, không missing hoặc wrong verdict; model thực tế cả52 lượt là gpt-6.1-sol. Fresh independent judge đã kiểm source, raw evidence và chạy lại26 entry probes (23 subject độc lập); stdout khớp52/52, đủ52 child khác nhau. Core24 EXECUTED; history28 EXECUTED và2 UNVERIFIED không có command bị loại. Không tính incomplete attempts thành PASS.

Thang0/1/2 chỉ chấm verdict và lý do:2 = cả hai thực chất đúng,1 = đúng một phần,0 = sai/bỏ sót/không có căn cứ. Hai lượt của mỗi ca đều2 điểm: core r01/r02/v01/v02/l01/l02/r03/r04/v03/v04/l03/l04 (48/48 điểm); A1 r-k1…r-k5/l-1…l-6 (44/44); A2 adversarial-1…3 (12/12). Tổng104/104 không bao gồm hiệu chỉnh severity. False positive0/22 trial CLEAN, bỏ sót phát hiện HIGH0/10; không chứng minh độ đúng ngoài mẫu này.

| Ca rubric HIGH | Trial1 | Trial2 | Raw evidence trong target/harness-evidence |
|---|---|---|---|
| r-k1 | TRUNG BÌNH | TRUNG BÌNH | t06-history-20261117-batch-1.results.json |
| r-k2 | TRUNG BÌNH | TRUNG BÌNH | t06-history-20261117-batch-1.results.json |
| r-k4 | TRUNG BÌNH | TRUNG BÌNH | t06-history-20261117-batch-2.results.json |
| a2-adversarial-1 | TRUNG BÌNH | CAO | t06-history-20261117-batch-9.results.json |
| a2-adversarial-2 | TRUNG BÌNH | TRUNG BÌNH | t06-history-20261117-batch-10.results.json |

**Severity chưa đạt:9/10 lỗi HIGH bị hạ mức.** Import không chấm trường severity nên import PASS không phải chứng nhận mức ưu tiên đúng. Không đổi rubric/điểm để che sai khác; một vòng sửa role cho probe đã dùng hết, không tự chỉnh prompt vòng hai trong đợt này. Người giám sát phải đọc phát hiện và quyết định mức độ; T06 toàn diện còn mở. A2 không đủ chứng minh phương pháp phản biện cải thiện tổng quát vì cùng nguồn, mẫu nhỏ và khác chỉ dẫn.

Judge xác nhận các trial moderation công khai chưa chạy Java/HTTP; pin probe chỉ chứng minh10 tham chiếu dạng SHA40 ký tự, không upstream identity. Các số synthetic trong stdout không phải số test sản phẩm đã thực thi. Bộ held-out đã được dùng trong chu kỳ kiểm/sửa này; không còn gọi là dữ liệu chưa thấy cho lần tuning sau.

Một lần quota nữa dừng ở20/28 history trials; giữ bản raw/batch4 và halt record. Sau khi người dùng tiếp tục, chỉ chạy8 lượt còn thiếu trong batch9/10, không ghi đè lượt cũ. Các incomplete/rejected attempts vẫn được giữ nhưng không tính vào mẫu52 hợp lệ.

Evidence kỹ thuật ở `backend/target/harness-evidence/t06-*`, `agent-trials-{codex,history}.json`; source/brief tổng hợp, không dữ liệu giáo viên thật. Không có chi phí/token đáng tin cậy cho toàn lượt, không khẳng định nhanh/rẻ hơn. Claude runtime, judge khác họ, raw snapshot lịch sử thiếu và agent tự trị vẫn chưa được chứng minh, dù catalog/model trials có đạt.
