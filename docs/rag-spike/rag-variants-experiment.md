# Thử nghiệm các biến thể RAG — chưa thay pipeline nghiệm thu

Ngày 2026-10-30. Người dùng chọn: **cập nhật brainstorm/plan thử nghiệm, tiếp tục nghiệm thu pipeline hiện có**. Tài liệu này không cho phép tự bật thuật toán mới hoặc dùng kết quả của nó làm bằng chứng cho phiên bản hiện tại.

## Kết quả nghiệp vụ cần chứng minh

| ID | Yêu cầu | Nghiệm thu |
|---|---|---|
| EX-01 | Hiểu cách diễn đạt tự nhiên hơn nhưng không chấp nhận nhầm chương trình | Acceptance >=90% trên câu có căn cứ, false acceptance=0 trên tập ngoài phạm vi đã khóa; báo cáo riêng ranh giới và mơ hồ |
| EX-02 | Mọi căn cứ đều đến từ nguồn đã duyệt đúng môn/lớp | Leakage=0, không dùng đối chứng hoặc YCCĐ do HyDE sinh làm nguồn; source/checksum/version truy vết được |
| EX-03 | Viết lại không làm đổi yêu cầu giáo viên | Kiểm trên câu gốc: số, phép tính, điều kiện nhớ, đơn vị, phủ định và mọi điều kiện đồng thời; rewrite thay đổi một điều kiện không được làm yêu cầu sai thành đúng |
| EX-04 | Từ chối có gợi ý trung thực | Chỉ nêu lớp khác khi có YCCĐ chính được duyệt ở lớp đó; nếu chưa có dữ liệu thì báo chưa đủ dữ liệu, không tự khẳng định lớp3 |
| EX-05 | Độ trễ, chi phí và độ ổn định được đo | Cùng tập query/model/settings; ghi số call, tokens nếu có usage, p50/p95, lỗi và độ dao động của judge; mục tiêu cải thiện chất lượng phải đi kèm đánh đổi đo được |

## Đối chiếu đề xuất với hiện trạng và tài liệu gốc

- Checkout hiện có verifier ràng buộc có kiểu và grammar giới hạn; không có bộ verifier616 dòng như mô tả cũ. Không ghi nhiệm vụ “xóa616 dòng regex” nếu class đó không tồn tại.
- **Hybrid/RRF:** đáng thử, chưa có bằng chứng chắc chắn tốt hơn với23 YCCĐ. PostgreSQL cung cấp `tsvector`, `tsquery` và ranking, nhưng cấu hình parser/dictionary quyết định token; không mặc định đã hỗ trợ ngôn ngữ tiếng Việt đầy đủ. Thử `simple` với NFC và bảo toàn số, kiểm tra cách xử lý dấu/từ ghép. Tìm đúng chuỗi100 không tự chứng minh yêu cầu đếm1–5; kiểm phạm vi vẫn cần quan hệ bao hàm. [PostgreSQL17 text search](https://www.postgresql.org/docs/17/textsearch-controls.html), [dictionaries](https://www.postgresql.org/docs/17/textsearch-dictionaries.html).
- **HyDE:** bản gốc sinh tài liệu giả định rồi embedding; không đồng nhất với mọi phép paraphrase câu hỏi. Tài liệu giả có thể chứa thông tin sai. Dùng nó để mở rộng tìm kiếm, không thay câu gốc hoặc nguồn YCCĐ. Đây là thí nghiệm tùy chọn sau các baseline rẻ hơn. [HyDE](https://arxiv.org/abs/2212.10496).
- **LLM judge:** “judge+JSON” chỉ là một thiết kế evaluator, chưa phải toàn bộ CRAG nguyên bản (có chiến lược sửa retrieval, web augmentation và refinement). Với chương trình đóng, không tự mở web làm nguồn thay corpus. JSON hợp lệ không đảm bảo phán quyết đúng; kiểm guard bằng code phải giữ số, phép, nhớ/không nhớ, đơn vị, phủ định và quan hệ điều kiện, không chỉ con số. [CRAG](https://arxiv.org/abs/2401.15884).
- **Long context:** đưa toàn bộ23 YCCĐ chính của đúng scope vào prompt là baseline phù hợp để đo. Chỉ gọi là CAG theo nghĩa nghiên cứu khi thực sự có cơ chế preload/cache tương ứng; nhét toàn corpus vào mỗi prompt chưa chứng minh đã có cache. [CAG](https://arxiv.org/abs/2412.15605).
- **Graph nhẹ/gợi ý lớp:** metadata mạch/chủ đề có thể hữu ích; chưa có corpus chính lớp2/3 để công bố gợi ý lớp khác. Đối chứng lớp2 không phải dataset lớp2 đã được hỗ trợ. Không suy ra grade chỉ từ một ví dụ số1000.
- **Reranker:** chưa ưu tiên vì tăng thêm một thành phần cần đánh giá, không phải vì có ít ứng viên thì reranker không thể hữu ích. Judge và reranker không tự động có cùng mục tiêu/chất lượng.
- **Self-RAG:** nghiên cứu gốc huấn luyện reflection tokens; một workflow prompt tự phản tư không tương đương mô hình gốc. Chưa đề xuất huấn luyện thêm trong đợt này. [Self-RAG](https://arxiv.org/abs/2310.11511).
- **Agentic:** chưa ưu tiên; có thể xây bằng mô hình sẵn có nhưng tăng số vòng gọi và phạm vi lỗi, cần một đợt đánh giá riêng.

## Ma trận thí nghiệm

| Arm | Retrieval/context | Quyết định đủ căn cứ | Mục đích |
|---|---|---|---|
| A | Pipeline hiện tại: vector top3 | Verifier hiện tại | Baseline đang nghiệm thu |
| B | Toàn bộ YCCĐ chính đúng scope | Judge + hard guards | Đối chứng có cần retrieval không |
| C | Vector + full-text, RRF, top8 đề xuất | Verifier hiện tại | Tách tác dụng hybrid khỏi judge |
| D | Như C | Judge + hard guards | Đo lợi ích/thất bại của judge |
| E | Như D, thêm HyDE cho nhánh vector | Judge luôn đọc câu gốc + hard guards | Đo lợi ích tăng thêm của HyDE |

RRF gộp theo hạng: sum(1/(k+rank)); thử k=60, top8 trên tập tune, chưa phải tham số đã được duyệt/phát hành. RRF score khác thang relevance của LangChain4j: không áp ngưỡng0.855 hiện tại lên RRF. Full-text và vector đều lọc scope/control/source/version/model trước khi gộp. Loại trùng theo chunkId; chỉ dùng source text thật.

Judge trả `SUPPORTED|UNSUPPORTED|NEEDS_CLARIFICATION`, `selectedChunkIds`, điều kiện và đoạn trích nguồn liên quan. Server xác nhận ID thuộc candidate chính đúng scope, trích dẫn nằm trong nguồn và hard guards khớp. Output lỗi/timeout/không rõ không được mở đường sinh game. Không biến lỗi nhà cung cấp thành khẳng định chủ đề ngoài chương trình. Mọi kết quả generation giữ DSL1.0.0, không thêm review vào metadata.

## Plan thử nghiệm (chỉ sau khi chuẩn bị dữ liệu đánh giá)

1. **X1 — Khóa baseline/dữ liệu (EX-01/02/05):** lưu commit hoặc diff hash, source/constraints SHA, model, query-format, score mapping và cấu hình. Có tập tune/holdout được duyệt riêng; paraphrase cùng ý định không rò giữa tập. Đáp án không lấy từ output judge/verifier. Thiếu dữ liệu thì không chạy báo cáo “holdout đạt”.
2. **X2 — Baseline B (EX-01/02/05):** viết runner offline dùng tất cả YCCĐ chính đúng scope; đo token/latency và so với A. Test control/source/grade isolation, prompt injection và unknown IDs. Không sửa luồng runtime.
3. **X3 — Hybrid C (EX-01/02):** adapter full-text có cùng filter; fixture số100/1000, có dấu/không dấu, không nhớ/có nhớ. Test RRF/tie/dedup và recall trước judge. Dùng temporary data để kiểm SQL; chỉ đề xuất migration riêng nếu đã có kết quả cần index.
4. **X4 — Judge D (EX-01/02/03):** structured output, câu gốc và đầy đủ điều kiện. Hard guards không chỉ kiểm số. Test đầu ra JSON sai, bịa chunkId/quote, lược điều kiện, phủ định và dịch vụ lỗi; chạy lại boundary nhiều lần để thấy độ dao động.
5. **X5 — HyDE E (EX-03/05):** flag offline riêng, giữ cả original/rewrite; test rewrite đổi1000 thành100, bỏ“có nhớ” hoặc đơn vị. Chỉ dùng rewrite trong retrieval; evaluator quyết định dựa câu gốc.
6. **X6 — Gợi ý lớp (EX-04):** chỉ thực hiện sau khi có dataset chính cho lớp khác; fixture “chưa có nguồn” phải trả chưa đủ dữ liệu. Không bật lớp mới cho generation vì đã tìm thấy gợi ý.
7. **X7 — Quyết định (EX-01…05):** chọn bằng số đo chất lượng/false acceptance/độ trễ/cost trên cấu hình khóa. So sánh các arm cùng điều kiện, không đổi tất cả cùng lúc. Báo cáo chưa đạt cũng là kết quả thí nghiệm hợp lệ. Phương án thắng cần thiết kế triển khai, review và chấp thuận riêng trước khi thay A.

Các path mới/adapter/migration cụ thể được chốt trong plan triển khai sau khi chọn arm, tránh viết nhiều subsystem trước khi chứng minh nhu cầu. Đợt hiện tại chỉ cập nhật tài liệu này; không thêm HyDE, judge hoặc hybrid vào mã sản phẩm.
