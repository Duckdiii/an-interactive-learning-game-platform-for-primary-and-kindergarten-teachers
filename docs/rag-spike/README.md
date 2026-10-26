# Curriculum RAG

## Trạng thái ngày 23/10/2026

Phạm vi: **Toán, Tiếng Việt, Tiếng Anh lớp 1–5**, đủ 15 môn/lớp. Tiếng Anh lớp 1–2 là chương trình làm quen tự chọn. Mầm non chưa nằm trong corpus này.

Đã sửa cách đọc số hàng nghìn (`1.000`, `10.000`, khoảng trắng thường/không ngắt), gồm số quá lớn gây tràn `int`. Ingest bắt buộc xác minh toàn bộ PDF/hash/trang/nội dung trước khi truy cập embedding hoặc database. Công cụ so sánh Gemini chọn đúng corpus và query theo môn/lớp, thay vì luôn lấy Toán lớp 1.

**Chưa hoàn tất online:** Supabase trả `XX000: FATAL: (ENOTFOUND) tenant/user … not found` với cấu hình local. Ingest mới chưa hoàn tất; cần cập nhật kết nối trong `.env`, ingest Toán lớp 3 v2 rồi chạy lại retrieval/live generation. Không gửi secret vào chat hoặc Git.

## Tài liệu nguồn hoàn toàn bằng chữ

- [Mục lục 15 môn/lớp](evidence/text/README.md): nội dung đầy đủ, môn/lớp/chủ đề, hash PDF và trang nguồn.
- `evidence/text/*-pdf-*.md`: 63 tài liệu trang nguồn; `evidence/text/raw-pages/*.txt`: text PDFBox nguyên trạng.
- Đã thay cả 22 ảnh bằng tài liệu chữ; `docs/rag-spike` không còn file ảnh. PDF gốc được giữ nguyên làm nguồn đối chiếu.
- Corpus: 497 outcome + 61 controls = 558 chunk. PDFBox kiểm tra trực tiếp 552 chunk; 6 bản chép phân số/ký hiệu có hồ sơ chữ riêng trong `backend/src/main/resources/curriculum/spike/text-transcriptions.jsonl`.
- Hồ sơ ghi hash nguồn, chunk, trang PDF/trang in, văn bản, người đối chiếu và ngày. Thiếu hồ sơ hoặc khác nội dung thì không được ingest. Đối chiếu do Codex AI thực hiện, **không phải giáo viên phê duyệt**.
- `math-g3-022` được khôi phục từ “về” theo nguồn; dataset đổi sang `math-grade3-outcomes-v2`. Chỉ mục v1 không được coi là v2.

## Kiểm chứng hiện tại và kết quả lịch sử

**Backend hiện tại: 575 tests, 0 failures, 0 errors, 1 live opt-in class skipped; JaCoCo gate 70% đạt.** Live opt-in được mở rộng thành 30 ca: một ca có evidence và một ca thiếu evidence cho mỗi môn/lớp; chưa có kết quả online mới.

[Replay verifier hiện tại](results/offline-candidate-replay-2026-10-23.json) trên 195 bộ candidate lịch sử: 15/15 scope đạt gate, Hit@3 148/150 (98,67%), negative rejection 45/45, false accept 0, leakage 0. **Replay không chạy lại vector retrieval hoặc gọi provider; không phải holdout độc lập.**

[Bảng đọc/đối chiếu mẫu](results/manual-retrieval-review-2026-10-23.md): Codex AI đọc q01/q05 của cả 15 scope, tổng 30 query; 30/30 có ít nhất một outcome trực tiếp liên quan và đúng môn/lớp. Một số top-k có candidate lân cận khác kỹ năng; không dùng chúng thay bằng chứng trực tiếp. Đây là review AI, không thay teacher review.

[Lượt online ngày 14/10](results/live-2026-10-14T05-46-12.101293900Z.json): Hit@3 148/150, negatives 45/45, controls 15/15, leakage 0. Kết quả này **là lịch sử**, fingerprint cũ `105bbe82d4af2136c5027ea0a926ba10d85993a0a8991fcc4050bf51938d2781`, không chứng minh mã/corpus hiện tại đã chạy online. Hai miss English lớp 3/4 q03 được giữ nguyên; không sửa nhãn/ngưỡng để làm đẹp số liệu.

Giữ `gemini-embedding-001`, dimension 768, topK 3, minScore 0.855. [Trạng thái hiện tại](results/verification-2026-10-23.json) và [status đầy đủ](results/status.json) phân biệt lịch sử/offline/online.

## Chạy lại

Từ repository root của worktree này, dùng file cấu hình local có kết nối hợp lệ:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Extract -EnvFile "C:\path\to\local.env"
node scripts/export-rag-text.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Ingest -SkipBuild -EnvFile "C:\path\to\local.env"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Evaluate -SkipBuild -EnvFile "C:\path\to\local.env"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-rag-live.ps1 -EnvFile "C:\path\to\local.env"
```

`Extract` chỉ đọc PDF; `Ingest` ghi embedding sau khi xác minh nguồn. Chỉ chạy `Migrate` khi cần setup schema. Live test tắt Flyway, không tạo schema và dùng datasource read-only; đi qua service, strategy, Gemini thật, factory và chuỗi kiểm duyệt. Kết quả JSON/Markdown ở `results/live-generation-*`; đây là service integration, chưa phải HTTP API E2E. Launcher yêu cầu `OPENAI_API_KEY` để kiểm tra safety đầy đủ.

## Các phần còn cần xác nhận

Teacher/pedagogical review vẫn pending. Đối chiếu nguồn của AI không chứng minh mọi game đều phù hợp sư phạm. Checker claim vẫn advisory; cảnh báo hoặc checker không dùng được không tự biến thành curriculum approval.

`metadata.curriculumReview` đã có ở Backend, schema, TypeScript và đặc tả DSL. Quyết định product/FE và xác nhận của Duy về semantics/versioning còn pending; không tự coi là đồng đội đã phê duyệt. Không thêm endpoint hoặc tự gửi tin nhắn cho đồng đội.

Holdout độc lập chưa xác lập: bộ đã lộ có overlap development và thiếu lịch sử review/freeze độc lập. Không tính replay hoặc bộ đã lộ là holdout. Các kết quả/audit cũ được giữ như lịch sử; dùng `evidence/text/` cho bản nguồn hiện tại.

Không commit, push hoặc tạo PR trong lượt sửa này.
