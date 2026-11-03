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

Ghi chú renderer trong lượt nghiệm thu lịch sử chỉ là quan sát tích hợp sản phẩm, không phải tiêu chí nghiệm thu Curriculum RAG. Việc tạo/hiển thị media và chạy frontend suite nằm ngoài phạm vi task RAG; nội dung câu hỏi cần hình ảnh vẫn được xem là chưa thể xác minh nếu bản thân đầu ra không cung cấp bằng chứng hình ảnh tương ứng.

## Hành động tiếp theo theo ưu tiên

1. Giữ các mẫu sai làm regression; thiết kế cách kiểm nội dung đầu ra, tính duy nhất của đáp án và bám đúng yêu cầu. Không sửa trực tiếp file game mẫu rồi coi pipeline đã sửa.
2. Điều tra ca đếm1–5 bị retrieval bỏ sót trên baseline cố định; thử nghiệm variant theo ma trận A–E, chưa thay production trong đợt nghiệm thu này.
3. Có key OpenAI Moderation hợp lệ rồi kiểm thử lại kiểm duyệt đầy đủ. Không lấy blocklist pass thay moderation pass.
4. Chuẩn bị tập tune/holdout được người duyệt độc lập xác nhận, có cả ca dương/âm sát ranh giới; không chuyển90 ca AI-authored thành “holdout đã duyệt”.
5. Có ít nhất20 game hợp lệ và giáo viên review theo rubric nội dung: đúng đáp án, duy nhất đáp án, phù hợp YCCĐ, giữ điều kiện và tiếng Việt phù hợp. Hiện chỉ18 game và có lỗi nên cổng review nội dung chưa đạt; media/UI không thuộc cổng nghiệm thu RAG.

Không commit/push hoặc tuyên bố phát hành từ báo cáo này. Các kết quả không đạt được giữ nguyên để có thể tái kiểm tra.

## Current code recheck — 2026-11-01

This addendum checks the preserved samples against the current generation gate; it does not replace or rewrite the historical 2026-10-30 run.

| Sample / issue | Current finding | Classification |
| --- | --- | --- |
| sample-1: natural counting query was rejected before generation | Not rerun as a teacher-style retrieval case in this change; no claim of fixed false rejection | Not addressed |
| sample-2: counting depends on animal images, but the sample has only `visualPrompt` | Current verifier cannot prove visual counting and returns unverified; renderer/media integration is outside this RAG report | Gated, not fixed |
| sample-3: Gemini HTTP 503 | Provider availability was not altered | Not addressed |
| samples-4/5: awkward Vietnamese and reading/writing skill drift | Language/visual semantics are outside the deterministic arithmetic pilot; unverified forms are not returned as grounded | Gated, not fixed |
| sample-6: report described giving away 25 and asking what remained | The checked-in JSON instead says “cho em thêm 25” and asks for the total; 30+25=55 is correct. The old narrative is inaccurate. The current gate still leaves its word-problem form unverified | Historical description corrected; semantic parser still unsupported |
| samples-7–12: arithmetic examples | Some forms fit the deterministic gate, but these preserved outputs were not replayed through live generation in this turn | Not freshly evaluated |
| sample-13–15 and 17–20: geometry, visual evidence, language or media issues | No semantic/visual validator was added; such outputs remain unverified | Gated, not fixed |
| sample-16: rectangle/square ambiguity and unaccented text | A semantic geometry question cannot pass the arithmetic-only verifier, so generation is blocked as unverified; ambiguity itself is not resolved | Gated, not fixed |

New regression tests cover a wrong arithmetic answer, two choices with the same numeric value, a requested-range violation, the adversarial “30 give away 25 but answer 55” form as unverified, and carry/borrow edge cases. They do not retroactively turn the historical samples into passing outputs.

Live smoke against the isolated local database: the unsupported-scope rejection passed; one in-scope generation remained unverified after the configured retry and returned `GENERATED_CONTENT_UNVERIFIED` with `QUESTION_NOT_MACHINE_CHECKABLE`. The positive live-generation check therefore did not pass, and no current positive game is claimed. Remote Supabase was not used.

## Curriculum RAG corpus discovery — 2026-11-01

The dataset loader now discovers and validates every packaged curriculum manifest without making discovery a publication decision. Regression coverage loads 16 datasets (653 chunks total, including 34 controls). Controls remain corpus evidence for leakage checks and must not become retrieval evidence.

This does not change the runtime catalog or imply that 16 datasets were ingested into a live database. Runtime publication, independent evaluation and expert review remain governed by each dataset's readiness state. The historical live results above are unchanged.

After scope cleanup, `mvn verify` completed successfully: 584 tests, 0 failures, 0 errors, 8 opt-in skips; JaCoCo gate passed. The 8 focused corpus/provider tests also passed. The local pgvector/Gemini live evaluation was not rerun because the required local database endpoint and API credentials are unavailable in this environment.

## Scope cleanup — 2026-11-01

| Change from commit `2a92628` | Decision | Basis |
| --- | --- | --- |
| `CurriculumDataset.loadPackaged()` and corpus-discovery test | Keep | RAG corpus discovery/validation; does not publish datasets |
| Game-generation controller, request DTO, application service and their tests | Retract | Product/API flow outside the assigned RAG work; existing generation service contract is left intact |
| Frontend game-create API, UI, preview and page test | Retract | UI and game workflow belong to other project work, not this RAG task |
| Acceptance claims about create/save/UI and whole-product completion | Retract | Out of RAG acceptance scope; historical RAG evidence/results remain unchanged |

## Cross-scope Curriculum RAG implementation recheck — 2026-11-01

This addendum records the current code state after the 2026-10-30 findings. The 2026-10-30 measurement artifacts and outcomes are unchanged. A local test run is not a replacement for live pgvector evaluation or specialist approval.

### Finding disposition

| Finding | Current disposition | Evidence / remaining limit |
|---|---|---|
| 1. `curriculumReview` in frozen DSL v1.0.0 | Addressed in prior scope-cleanup work | Review remains outside DSL; this turn did not change DSL/schema. |
| 2. Kindergarten blocked by primary-only catalog | Partially addressed technically; not publishable | Age/domain-filtered retrieval and semantic verifier path are implemented. Feature is disabled by default and requires exact source hash; specialist approval and live evaluation remain pending. |
| 3. Evaluation queries too close to curriculum text | Open | Existing sets remain exploratory/AI-authored; no independent natural-language benchmark was run. |
| 4. No current online results on current code | Open | No new live pgvector + Gemini semantic evaluation in this run. Prior results remain historical. |
| 5. 616-line Math rules may reject other subjects | Addressed for non-pilot path, unmeasured | Math Grade 1 retains its deterministic rules. Other primary scopes and Kindergarten use a constrained semantic verifier that can select only exact retrieved IDs. Live false-accept/false-reject rates are unknown. |
| 6. Persistent serialized query embedding cache | Runtime persistence remains disabled | Runtime configuration does not persist teacher topic/query vectors. No cache behavior change was needed here. |
| 7. Added serial reviewer latency / NFR | Deferred as previously agreed | No current p50/p95 live measurement; no async redesign in this scope. |
| 8. Evaluation runners in application source | Addressed in prior cleanup | Offline runner tooling remains in test scope and is invoked by the PowerShell script. |
| 9. Database failure can affect startup | Partially isolated, not removed from application | RAG model/store are lazy and readiness is per source; the backend still depends on its configured application database. No local pgvector endpoint was available for this run. |
| 10. Hard rejection lacks guidance | Addressed for retrieval evidence rejection | Existing context provider returns nearest-candidate guidance; clarification has a distinct 422 code. |
| 11. Only teacher topic is queried | Open / unchanged | No lesson-plan summarization was introduced. |
| 12. No ANN index | Intentional for the current small corpus | Exact filtered scan remains; no new scale data warrants ANN. |

### Scope and evidence

The runtime RAG catalog now discovers the 15 primary datasets and selects the dataset matching the request. `CurriculumAvailability` caches readiness per source instead of allowing a request for one dataset to evict another scope's readiness. Primary retrieval filters exact subject, grade, content type, source SHA, curriculum version, dataset version, embedding model, and `control=false`; Kindergarten additionally filters allowed domain and the requested age band before semantic verification. The Grade 1 Math verifier remains specialized; it is not applied to other subjects/grades.

The packaged corpus has 15 primary scopes (485 non-control outcomes, 34 controls) and one Kindergarten dataset (134 outcomes: 38 age 3–4, 47 age 4–5, 49 age 5–6). A new in-memory regression traverses all 16 datasets and checks source/scope filtering, control exclusion, and Kindergarten age/domain filtering. It does not measure real embedding ranking or semantic decision quality.

End-to-end game generation remains only implemented for QUIZ / MATH / GRADE_1. `GeminiGameContentGenerator` has an explicit pilot guard and `QuizGameStrategy` hardcodes Mathematics Grade 1 and throws for other grades. Those components are owned outside this RAG change; widening their prompt contract is a coordination dependency. Therefore 14 other primary scopes and Kindergarten are **not** claimed as supported end-to-end generation, despite their retrieval/verifier implementation. Kindergarten also remains disabled pending subject-matter review.

Current run evidence: focused RAG/provider/generation suite passed 62 tests with no failures/errors. Full backend `mvn verify` then passed the current tree at 595 tests, 0 failures/errors, 8 skipped, JaCoCo passed. No new live evaluation was run because an authorized local pgvector endpoint was unavailable; remote Supabase was not written. Independent benchmark labels, human/specialist review, live false-accept/false-reject rates, and Kindergarten publication remain pending.

Scope-by-scope outcome counts and pipeline details are in the [current implementation recheck](README.md#current-cross-scope-implementation-recheck-2026-11-01); the sanitized machine-readable status is in [local-acceptance-2026-11-01.json](results/local-acceptance-2026-11-01.json).

## Backend runtime remediation execution — 2026-11-01 (latest)

The latest implementation/pipeline/finding disposition is recorded in [README](README.md#backend-rag-remediation-and-execution--2026-11-01-latest), with per-scope status in [corpus-expansion-status.md](corpus-expansion-status.md). Prior 30/10 samples and measurements above remain unchanged. Context integrity and semantic grounding checks were extended; refusal of an old sample is still not proof its content defect was repaired. Current model-quality evaluation is blocked by absent process credentials/local PostgreSQL; no historical live PASS substitutes for it. No UI/controller/CRUD/strategy/schema was changed.
