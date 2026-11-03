# RAG và sinh game có căn cứ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans khi triển khai trực tiếp, hoặc superpowers:subagent-driven-development nếu người dùng chọn cách làm qua agent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Củng cố backend pilot để chỉ sinh game khi có căn cứ phù hợp, phân biệt các nguyên nhân từ chối, giữ DSL và đo được chất lượng.

**Architecture:** Giữ retriever hiện tại, bổ sung catalog và provider kiểm chứng ràng buộc có cấu trúc trước generation. Readiness của corpus kiểm tra tại runtime; metrics không chứa nội dung giáo viên. Công cụ offline và tối ưu query là các đợt riêng sau P0/P1.

**Tech Stack:** Java 21, Spring Boot theo `backend/pom.xml`, LangChain4j hiện có, Gemini embedding, PostgreSQL/pgvector, JUnit/AssertJ, Micrometer nếu cần. Không nâng version dependency để làm task này.

**Spec:** [Brainstorm và yêu cầu nghiệp vụ](../specs/2026-10-30-rag-generation-business-design.md).

**Status:** Người dùng đã cho triển khai ngày 2026-10-30. P0/P1 đã được triển khai ở mức mã và kiểm thử local; các cổng duyệt dữ liệu/holdout/live chưa được nghiệm thu. Checklist gốc giữ nguyên để truy vết; trạng thái thực thi và bằng chứng tại [execution ledger](../../rag-spike/implementation-progress.md). P2 chưa triển khai.

## Global Constraints

- Giữ DSL 1.0.0; không thêm `metadata.curriculumReview`.
- Pilot chỉ `QUIZ / MATH / GRADE_1` cho tới khi scope mới có dữ liệu và generator được duyệt.
- Mỗi chunk là một YCCĐ; `control=true` không được truy xuất trong bất kỳ scope nào.
- Giữ Gemini `gemini-embedding-001`, `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY`, 768 chiều; không đổi embedding ID/text trong P0/P1.
- Giữ top 3 và cấu hình mặc định 0.855 làm baseline; ngưỡng là score của adapter, phải kiểm chứng mapping bằng fixture.
- Thiếu căn cứ: 422 `CURRICULUM_EVIDENCE_NOT_FOUND`; ngoài scope: 422 `GENERATION_SCOPE_UNSUPPORTED`; lỗi dịch vụ RAG: 503 `CURRICULUM_UNAVAILABLE`.
- Retrieve 1 lần, tối đa 2 retry mặc định, tối đa 10 lỗi phản hồi; UNSAFE dừng ngay.
- Không log/persist topic, prompt, output, secret; không dùng chúng làm metric label.
- Các số chất lượng/TTL/cỡ cache trong spec là cấu hình đề xuất chờ duyệt, không phải số đo đã đạt.
- Không triển khai endpoint/UI sinh game trong kế hoạch backend này. Kiểm thử HTTP ở exception handler không thay thế kiểm thử trải nghiệm đầu cuối.

## Review Focus

1. Topic có nhiều điều kiện/phủ định: không nhận chỉ vì một phần được hỗ trợ — T2, T3.
2. Có ứng viên sát nghĩa nhưng sai phạm vi số hoặc điều kiện nhớ: phải từ chối — T2, T5.
3. Ready cũ nhưng DB lỗi trong request hiện tại: trả 503, không trả 422 hoặc sinh thiếu context — T3.
4. Metadata thiếu, scope sai hoặc chunk đối chứng đứng đầu: không lọt context — T1, T3.
5. Retry hoặc instrumentation vô tình gọi lại retrieval/lộ topic: phải giữ 1 lần và không lưu nội dung — T4, T6.

## Thứ tự và phạm vi phát hành

`T1 → T2 → T3 → T4 → T5 → T6` là đợt P0/P1. T5 cần người duyệt đáp án/ràng buộc trước khi chạy live; không tự tạo nhãn để thông qua gate. `T7` và `T8` là đợt P2 độc lập, chưa bắt buộc triển khai khi duyệt P0/P1.

Mỗi task chạy vòng test thất bại → mã tối thiểu → test đạt → review. Chỉ commit đúng file của task sau kiểm tra diff, giữ các thay đổi pipeline đang có trong working tree; không reset hoặc gom nhầm thay đổi chưa commit vào một task khác.

Các đường dẫn Java bên dưới dùng:

- `C = backend/src/main/java/com/aigameplatform/backend/service/curriculum`
- `G = backend/src/main/java/com/aigameplatform/backend/service/generation`
- `CT = backend/src/test/java/com/aigameplatform/backend/service/curriculum`
- `GT = backend/src/test/java/com/aigameplatform/backend/service/generation`

Đây là ký hiệu đường dẫn trong tài liệu, không phải biến môi trường hoặc package mới.

## T1. Catalog scope và hợp đồng tương thích

**BR:** BR-01, BR-02, BR-08. **Phụ thuộc:** không.

**Files:** tạo `C/CurriculumCatalog.java`, `CT/CurriculumCatalogTest.java`; sửa `G/GameGenerationService.java`, `GT/GameGenerationServiceTest.java`; kiểm tra `backend/src/main/java/com/aigameplatform/backend/dto/dsl/GameMetadata.java` và các schema hiện có, không sửa chúng.

**Interfaces:** `CurriculumCatalog.requireSupported(GameType, Subject, GradeLevel) -> CurriculumDataset`; constructor nhận danh sách dataset đã duyệt và tập kiểu game được bật. Bản đầu dùng `CurriculumDataset.loadDefault()` và `Set.of(QUIZ)`; chỉ các chunk chính quyết định scope, control không làm lớp 2 thành supported. Ngoài scope ném `GenerationScopeUnsupportedException` hiện có.

- [ ] Viết test `controlsDoNotPublishAnExtraScope`: GRADE_2 chỉ có đối chứng vẫn bị từ chối. `unsupportedScopeCallsNoEmbeddingOrGenerator`: Mầm non và kiểu game ngoài pilot không gọi provider/generator. `dslMetadataRemainsVersionOneCompatible`: JSON sinh vẫn được schema hiện hành chấp nhận.
- [ ] Chạy từ `backend`: `mvn -B -Dtest=CurriculumCatalogTest,GameGenerationServiceTest -Djacoco.skip=true test`; xác nhận thất bại do thiếu hành vi catalog.
- [ ] Thay kiểm tra scope hardcode ở generation bằng catalog, giữ generator adapter tự bảo vệ scope. Không query DB để quyết định một scope đã được công bố.
- [ ] Chạy lại test trên và `CurriculumSpikeTest`; giữ test môn/lớp dùng distractor `control=false` để không bị bộ lọc control che khuất.
- [ ] Review/commit task sau khi test đạt. **Done:** scope chưa hỗ trợ dùng đúng mã lỗi và không phát sinh AI call.

## T2. Ràng buộc nghiệp vụ có cấu trúc và verifier

**BR:** BR-03, BR-04. **Phụ thuộc:** T1.

**Files:** tạo `C/CurriculumConstraints.java`, `C/CurriculumTopicParser.java`, `C/CurriculumEvidenceVerifier.java`, các test cùng tên trong `CT`; tạo `backend/src/main/resources/curriculum/spike/math-grade1/constraints.jsonl`; bổ sung khóa sidecar vào manifest cùng thư mục; không sửa nội dung chunks.

**Interfaces:**

- `CurriculumConstraints.load(CurriculumDataset) -> CurriculumConstraints`: đọc sidecar từ `constraintsResource`, kiểm SHA-256 theo `constraintsSha256`; version `math-g1-constraints-v1`. Mỗi chunk chính có đúng một bản ghi gồm `chunkId` và danh sách capability; không cấp capability cho control. Người duyệt gán nhãn từ YCCĐ, không lấy nhãn sinh tự động làm nguồn chuẩn.
- `CurriculumTopicParser.parse(String) -> ParsedTopic`: gồm danh sách yêu cầu và danh sách phần chưa phân tích được. Các kiểu miền gồm kỹ năng, đoạn số nguyên min/max, phép cộng/trừ, điều kiện nhớ và đơn vị. Dùng enum/record riêng trong file thích hợp, không map chuỗi tùy ý xuyên các tầng.
- `CurriculumEvidenceVerifier.verify(ParsedTopic, List<RetrievedChunk>, CurriculumConstraints) -> VerificationDecision`: status `SUPPORTED`, `UNSUPPORTED`, `NEEDS_CLARIFICATION`; có reason code và danh sách supportedChunkIds. Chỉ SUPPORTED khi mọi yêu cầu có chứng cứ tương ứng; context chỉ lấy các ID được xác nhận.

- [ ] Viết test literal: đếm 1–5 được phạm vi 100 hỗ trợ; cộng 1000 bị từ chối; cộng có nhớ không được chứng minh bằng không nhớ; kết hợp cộng + đơn vị không có chứng cứ bị từ chối; phân biệt “đếm/đem”, phủ định, câu không dấu, số âm/thập phân ngoài miền. `missingCapabilityOrUnknownClauseNeedsClarification` chặn mặc định khi không hiểu.
- [ ] Viết test sidecar: thiếu chunk chính, trùng chunkId, có control, sai SHA/version đều không được load thành ready. Case “max=100” không được ngầm áp dụng cho mọi phép tính nếu capability thuộc kỹ năng đếm.
- [ ] Chạy `mvn -B -Dtest=CurriculumTopicParserTest,CurriculumEvidenceVerifierTest,CurriculumConstraintsTest -Djacoco.skip=true test`, quan sát thất bại.
- [ ] Cài parser và so khớp bằng quan hệ bao hàm cho phạm vi số cùng kỹ năng; giữ dấu/NFC, không bỏ dấu làm biểu diễn duy nhất. Nhờ người duyệt nghiệp vụ duyệt sidecar và lưu biên bản gồm checksum, phiên bản, người duyệt, ngày duyệt tại `docs/rag-spike/constraints-review.md`; thiếu biên bản thì task chưa hoàn tất.
- [ ] Chạy lại tests và review với các ca nhiều điều kiện, không chỉ từ khóa đơn. **Done:** có chứng cứ cho từng điều kiện; không tự suy diễn các điều kiện chưa biểu diễn được.

## T3. Provider đã xác minh và readiness tại runtime

**BR:** BR-02, BR-03, BR-04, BR-06. **Phụ thuộc:** T1, T2.

**Files:** tạo `C/VerifiedCurriculumContextProvider.java`, `C/CurriculumAvailability.java`, tests tương ứng; sửa `C/CurriculumRagConfiguration.java`, `C/CurriculumRAGService.java` khi cần guard metadata; giữ interface `C/CurriculumContextProvider.java`.

**Interfaces:** provider vẫn `Evidence retrieve(String topic, Subject subject, GradeLevel gradeLevel)`. `CurriculumAvailability.requireReady(CurriculumDataset) -> void` dùng Clock được tiêm, TTL 30 giây; lỗi corpus/DB/config RAG chuyển thành `CurriculumServiceUnavailableException`. Catalog kiểm tra game type ở T1; provider kiểm tra subject/grade tồn tại. Với DSL lỗi ngoài scope phải dùng exception riêng, không để catch chung biến thành 503.

- [ ] Viết test: score cao nhưng verifier UNSUPPORTED/NEEDS_CLARIFICATION không trả sufficient; supported chỉ ghép chunk đã xác nhận và nguồn; metadata thiếu hoặc control không lọt context. Fake model/store chỉ thay ranh giới API/DB, giữ verifier thật.
- [ ] Viết test với Clock: DB lỗi trước lần ready đầu, lỗi sau ready, hết TTL rồi phục hồi; missing constraints không ready. `ragConfigurationDefersCorpusDbAccess` xác nhận tạo bean RAG không gọi SQL hoặc tự kết nối store; không mở full JPA context để khẳng định toàn app hoạt động khi DB lỗi.
- [ ] Chạy `mvn -B -Dtest=VerifiedCurriculumContextProviderTest,CurriculumAvailabilityTest,CurriculumSpikeTest -Djacoco.skip=true test` để thấy các ca chưa đáp ứng.
- [ ] Thay startup `requireCompleteDataset` riêng RAG bằng readiness khi request đến; tạo store lazily nếu builder hiện tại chạm DB. Vẫn kiểm tra lỗi kết nối từng truy vấn; TTL không che lỗi request hiện tại. Giữ fail-closed và không catch/gộp mọi domain exception thành thiếu căn cứ.
- [ ] Chạy lại tests. **Done:** lỗi kỹ thuật khác lỗi chương trình và không thể gọi sinh game với context chưa xác minh.

## T4. Hướng dẫn từ chối, retry và khóa DSL

**BR:** BR-05, BR-07, BR-08. **Phụ thuộc:** T3.

**Files:** tạo `C/CurriculumRejectionGuidance.java`, test tương ứng; sửa `G/GameGenerationService.java`, `GT/GameGenerationServiceTest.java`; sửa/bổ sung `backend/src/test/java/com/aigameplatform/backend/exception/GenerationExceptionsTest.java` và `GlobalExceptionHandlerTest.java` nếu cần. Giữ `ApiError(code,message)` và `GameMetadata` hiện có.

**Interfaces:** `CurriculumRejectionGuidance.message(VerificationDecision, CurriculumDataset) -> String`; thông báo theo template tiếng Việt, tối đa 3 chủ đề nguồn cùng scope. Không gợi ý nội dung do AI bịa hoặc dùng lại topic giáo viên trong log. Scope chưa hỗ trợ liệt kê scope catalog, không dùng cùng message với thiếu căn cứ.

- [ ] Viết tests: handler trả đúng 422/503 và code; message nêu bước sửa yêu cầu; không sửa topic/gọi generation thay giáo viên. Khi lỗi dịch vụ chỉ gợi ý thử lại, không gợi ý topic khác như thể lỗi thuộc chương trình.
- [ ] Viết tests generation: retrieve 1 lần dù có 2 retry; context giống nhau; 3 lần sinh tối đa; chỉ 10 lỗi phản hồi; UNSAFE không retry; 0 reviewer call bổ sung; output vẫn đúng DSL schema v1.0.0.
- [ ] Chạy `mvn -B -Dtest=CurriculumRejectionGuidanceTest,GameGenerationServiceTest,GenerationExceptionsTest,GlobalExceptionHandlerTest -Djacoco.skip=true test` và thấy lỗi kỳ vọng trước khi đổi hành vi.
- [ ] Cài guidance và luồng exception, giữ toàn bộ validator/factory/safety hiện có. Không thêm API endpoint, UI hay field review để hoàn thành task này.
- [ ] Chạy tests và rà lại prompt/citation qua `GeminiGameContentGeneratorTest`. **Done:** backend có contract từ chối hữu ích; đánh dấu rõ UI chưa tích hợp, không công bố trải nghiệm đầu cuối đã xong.

## T5. Benchmark độc lập và thang điểm pgvector

**BR:** BR-02, BR-03, BR-10. **Phụ thuộc:** T3, T4; người duyệt nghiệp vụ cho bộ query.

**Files:** sửa `C/CurriculumEvaluation.java`, `C/CurriculumSpikeRunner.java`, `scripts/rag-spike.ps1`; tạo `CT/CurriculumEvaluationTest.java`; tạo `backend/src/test/resources/curriculum/evaluation/tune.jsonl` và `holdout.jsonl`; cập nhật `docs/rag-spike/evaluation.md`.

**Interfaces:** `EvaluationQuery` mới có subject, gradeLevel, groupId, expectedDecision, expectedChunkIds và cohort. Giữ adapter đọc 13 query legacy; bộ đọc mới nhận resource/path rõ ràng. `evaluate(...)` đo riêng candidates, quyết định verifier và rejection; không dùng output verifier tạo đáp án kỳ vọng. CLI Evaluate nhận tập `legacy|tune|holdout` và ghi cấu hình/report version; không ghi topic request sản xuất vào báo cáo.

- [ ] Viết tests cho metric: 18/20 supported retrieval hits = 0.9; từ chối nhầm không thể cải thiện accuracy bằng cách từ chối tất cả; 1 false acceptance phải trượt gate; query trùng group qua tune/holdout bị phát hiện. Report ghi mẫu số từng nhóm, không hardcode 10 positive/3 negative cho tập mới.
- [ ] Tạo live integration opt-in với vector có cosine 1, 0, -1 trong bảng test riêng; khẳng định score mà adapter trả, ngưỡng cắt và metadata filter thực. Không ghi vào `curriculum_embeddings` sản xuất. Ghi lại mapping, sửa mô tả SQL nếu score được chuyển đổi.
- [ ] Chạy local `mvn -B -Dtest=CurriculumEvaluationTest,CurriculumSpikeTest -Djacoco.skip=true test`; quan sát fail, rồi triển khai evaluation/CLI. Đáp án holdout do người duyệt giữ riêng tới khi khóa cấu hình; tài nguyên commit sau lần đo độc lập trở thành regression, không tiếp tục gọi là holdout mới.
- [ ] Thu thập 30 tune/60 holdout theo spec, khóa model/ngưỡng/query format rồi chạy live. Gate đề xuất: Hit@3 ≥ 90% trên 30 supported, acceptance ≥ 90% trên 30 supported, false acceptance 0/30 unsupported, leakage 0. Lưu report và quyết định pass/fail; nếu trượt, hiệu chỉnh trên tune và cần bộ holdout mới để kết luận độc lập.
- [ ] Review nguồn, nhãn và giới hạn thống kê. **Done:** bằng chứng thật đáp ứng gate; thiếu key/DB/người duyệt thì ghi task chưa hoàn tất, không dùng mock thay cho kết quả live.

## T6. Quan sát vận hành và kiểm chứng phát hành P0/P1

**BR:** BR-06, BR-07, BR-09, BR-12. **Phụ thuộc:** T4, T5.

**Files:** tạo `C/CurriculumMetrics.java`, `CT/CurriculumMetricsTest.java`; sửa provider T3 và `G/GameGenerationService.java`; bổ sung dependency Micrometer core vào `backend/pom.xml` chỉ nếu chưa có API đo tương ứng; cập nhật `docs/rag-spike/verification.md`.

**Interfaces:** instrumentation ghi counter/timer cho `retrieval`, `verification`, `generation`, `total`, outcome hữu hạn. Không dùng raw exception message; adapter log chỉ tên lỗi/mã chẩn đoán đã chọn. Đo query embedding riêng khi wrapper model được dùng; không ghi số 0 thay cho số chưa đo được.

- [ ] Viết tests với registry trong RAM và captured log: đủ success/reject/unavailable, duration không âm; topic canary/secret giả/prompt/output không xuất hiện; không có nhãn query/user/chunkId. Failure path vẫn có metric và không gây thêm retrieval.
- [ ] Chạy `mvn -B -Dtest=CurriculumMetricsTest,GameGenerationServiceTest -Djacoco.skip=true test`, xác nhận fail rồi cài metrics. Không thêm query cache trong task này.
- [ ] Chạy toàn bộ `mvn -B test`; ghi rõ lỗi môi trường nếu có. Bộ không cần DB chạy thêm `mvn -B -Dtest=!AigameBackendApplicationTests -Djacoco.append=false test`, coverage gate hiện tại ≥ 70%; không sửa ngưỡng để thông qua.
- [ ] Chạy Extract với PDF thật, Ingest idempotency và Evaluate theo cấu hình được phép; lưu summary checksum/version. Đo p50/p95 và AI call counts, ghi chi phí dựa trên usage thực nếu provider cung cấp; số chưa có phải ghi chưa đo.
- [ ] Người duyệt kiểm tra ít nhất 20 game theo spec; review độc lập diff và các ca ranh giới. **Done:** có báo cáo release, giới hạn còn lại và cách rollback bằng feature flag RAG/generator hiện có; tắt RAG không được dùng để tuyên bố vẫn bảo đảm căn cứ.

## T7. Thử nghiệm query format và cache RAM có điều kiện — P2

**BR:** BR-09, BR-11. **Phụ thuộc:** T5, T6; chỉ làm khi được chọn triển khai P2.

**Files:** tạo `C/CurriculumQueryFormatter.java`, `CT/CurriculumQueryFormatterTest.java`; nếu được phép thử cache, tạo `C/CurriculumQueryEmbeddingCache.java`, test tương ứng; sửa wiring model và bổ sung báo cáo `docs/rag-spike/query-format-experiment.md`.

**Interfaces:** `format(String topic, Subject, GradeLevel) -> String` với format version rõ ràng. Bản A topic nguyên bản, bản B thêm môn/lớp bằng template cố định. Cache nếu cần chỉ RAM, key SHA-256 của model/dimension/task/query-format/query, TTL 15 phút, 1000 entry; Clock được tiêm; không lock toàn cục trong lúc network call, không cache failure. Không thay text tài liệu/embedding ID.

- [ ] So sánh A/B trên tune: Hit@3, false acceptance, latency, token/call usage; chỉ chọn B nếu không giảm các gate chất lượng đã duyệt. Không mở lại nhãn holdout cũ để tối ưu B rồi tuyên bố kiểm định độc lập.
- [ ] Nếu số đo không cho thấy lợi ích: ghi quyết định giữ A/không cache; task thí nghiệm hoàn tất mà không cần thêm mã cache.
- [ ] Nếu chọn B/cache: viết test khác subject/model/version không dùng chung key, TTL hết hạn, eviction và failure không cached; các key khác nhau không chặn nhau khi một network call chậm. Chạy test trước, triển khai tối thiểu, rồi chạy lại local và holdout mới.
- [ ] **Done:** có quyết định dựa trên dữ liệu, không file chứa topic, và không giảm chất lượng để đổi lấy cache hit rate.

## T8. Công cụ offline, mở rộng dữ liệu và ANN — P2

**BR:** BR-12. **Phụ thuộc:** P0/P1 ổn định; đây là roadmap có các cổng quyết định riêng.

**Files dự kiến:** root `pom.xml` aggregator (mới nếu chọn tách Maven module), `curriculum-tools/pom.xml`, `curriculum-tools/src/main/java/com/aigameplatform/curriculum/tools/`; chuyển runner/evaluation/ingest/extractor offline theo dependency thực; sửa `backend/pom.xml` và `scripts/rag-spike.ps1`. Runtime vẫn giữ model dữ liệu/retriever/provider cần dùng.

- [ ] Trước tách module, ghi dependency graph và test CLI hiện tại cho Extract/Ingest/Evaluate. Không chuyển class chỉ dựa tên “Spike”; `CurriculumSpikeDatabase` đang được Spring dùng nên cần tách helper runtime khỏi runner trước.
- [ ] Viết smoke CLI có fixture PDF/DB test; quan sát fail khi dùng module mới, rồi chuyển công cụ và cập nhật classpath script. Runtime backend không kéo PDFBox/CLI-only dependency sau khi tách; build reactor và các lệnh CLI phải giữ cùng ý nghĩa mã thoát.
- [ ] Dữ liệu Mầm non: lập spec/plan riêng khi có nguồn và người duyệt; chỉ bật catalog khi manifest, SHA, chunk, ràng buộc và benchmark scope đó đạt. Không tái dùng YCCĐ lớp 1 làm dữ liệu Mầm non.
- [ ] ANN: giữ exact search cho corpus hiện tại; chỉ lập thử nghiệm ANN khi số đo cho thấy retrieval DB là bottleneck. Kế hoạch đó phải có Recall@k so với exact và metadata isolation trước khi đổi index.
- [ ] **Done của từng nhánh:** CLI mới có smoke pass; scope mới có release evidence riêng; hoặc quyết định giữ exact có benchmark. Không đánh dấu toàn bộ roadmap xong khi chỉ tách xong module.

## Ma trận truy vết và bàn giao

Phụ lục mới theo lựa chọn người dùng: [plan thử nghiệm biến thể RAG](../../rag-spike/rag-variants-experiment.md), X1–X7, EX-01…05. Đây là roadmap thử nghiệm A–E sau khi có dữ liệu phù hợp; không thêm các task đó vào phạm vi nghiệm thu P0/P1 hiện tại và không tự thay retriever/verifier đang kiểm thử.

| Yêu cầu | Task | Bằng chứng nghiệm thu |
|---|---|---|
| BR-01 | T1 | Catalog/service tests: scope, call count 0 |
| BR-02 | T1, T3, T5 | In-memory distractors và pgvector integration |
| BR-03 | T2, T3, T5 | Capability/parser boundary tests và holdout |
| BR-04 | T2, T3, T4 | Insufficient evidence không gọi generation |
| BR-05 | T4 | Message và handler contract tests; UI ghi rõ còn ngoài scope |
| BR-06 | T3, T6 | DB failure/recovery tests, 503 mapping |
| BR-07 | T4, T6 | Retry/safety/call-count/log tests |
| BR-08 | T1, T4 | DSL schema/factory/generator regression |
| BR-09 | T6, T7 | Log canary và labels/cache privacy tests |
| BR-10 | T5 | Báo cáo độc lập và nhãn được người duyệt |
| BR-11 | T7 | A/B report, cache decision/TTL tests nếu thêm cache |
| BR-12 | T6, T8 | Benchmark exact, CLI smoke, release evidence scope mới |

Tài liệu bàn giao gồm spec, plan, diff đã review, kết quả test mới nhất, báo cáo live nếu đã chạy và danh sách giới hạn. Trước thực thi, người dùng duyệt lựa chọn P0/P1 hoặc cả P2, chỉ tiêu nghiệm thu và phương thức thực hiện. Việc hoàn tất hai tài liệu này không có nghĩa các task trên đã được triển khai.
