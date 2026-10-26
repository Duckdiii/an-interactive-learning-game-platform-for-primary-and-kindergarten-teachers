# Đối chiếu mẫu retrieval bằng cách đọc nội dung

Ngày 2026-10-23; người đối chiếu: Codex (AI). Đọc query, các outcome trả về và bản chữ nguồn có trang/hash. Đây là review nội dung do AI thực hiện, không phải giáo viên hoặc holdout độc lập.

Mẫu định trước: q01 và q05 cho mỗi môn/lớp, tổng 30/195 query. Dữ liệu là candidate từ lượt 14/10, được chạy lại verifier hiện tại trong `offline-candidate-replay-2026-10-23.json`; chưa có retrieval online mới. Tiêu chí: ít nhất một outcome trực tiếp hỗ trợ query, đúng môn/lớp và không vượt ràng buộc rõ ràng. Không yêu cầu mọi candidate lân cận đều là evidence trực tiếp.

| Môn/lớp | Query | Chủ đề | Outcome hỗ trợ | Nhận xét sau khi đọc | Kết luận |
|---|---|---|---|---|---|
| MATH/GRADE_1 | q01 | Phép cộng nhẩm trong phạm vi 10 | math-g1-007 | Cộng nhẩm trong phạm vi 10; evidence nêu đúng giới hạn 10. | PASS_SAMPLE |
| MATH/GRADE_1 | q05 | Tính nhẩm cộng trừ các số tròn chục | math-g1-008 | Nhẩm số tròn chục; evidence nêu trực tiếp số tròn chục. | PASS_SAMPLE |
| MATH/GRADE_2 | q01 | Đếm đọc viết số đến 1000 | math-g2-001 | Đếm/đọc/viết đến 1000; cùng phạm vi 1000. | PASS_SAMPLE |
| MATH/GRADE_2 | q05 | Cộng trừ nhẩm trong phạm vi 20 | math-g2-017 | Cộng/trừ nhẩm đến 20; có outcome trực tiếp. | PASS_SAMPLE |
| MATH/GRADE_3 | q01 | Đọc và viết số trong phạm vi một trăm nghìn | math-g3-001 | Đọc/viết đến 100000; outcome gồm phạm vi 10000 và 100000. | PASS_SAMPLE |
| MATH/GRADE_3 | q05 | Nhân số có một chữ số và không quá hai lượt nhớ | math-g3-012 | Nhân một chữ số, không quá hai lượt nhớ; outcome còn yêu cầu không liên tiếp. | PASS_SAMPLE |
| MATH/GRADE_4 | q01 | Số tự nhiên / Số và cấu tạo thập phân: Đọc, viết được các số có nhiều chữ số (đến lớp triệu). | math-g4-001 | Đọc/viết số nhiều chữ số đến lớp triệu; khớp nguyên outcome. | PASS_SAMPLE |
| MATH/GRADE_4 | q05 | Số tự nhiên / Giải quyết vấn đề với phép tính: Giải quyết được một số vấn đề gắn với việc giải các bài toán có đến hai hoặc ba bước tính (trong phạm vi các số và phép tính đã học) liên quan đến thành phần và kết quả của phép tính; liên quan đến các mối quan hệ so sánh trực tiếp hoặc các mối quan hệ phụ thuộc trực tiếp và đơn giản (ví dụ: bài toán liên quan đến tìm số trung bình cộng của hai số; tìm hai số khi biết tổng và hiệu của hai số đó; bài toán liên quan đến rút về đơn vị). | math-g4-019 | Bài toán hai/ba bước tính; khớp yêu cầu và ví dụ nguồn. | PASS_SAMPLE |
| MATH/GRADE_5 | q01 | Số tự nhiên / Ôn tập: Đọc, viết, so sánh, xếp thứ tự được các số tự nhiên. | math-g5-001 | Đọc/viết/so sánh/sắp thứ tự số tự nhiên; khớp outcome. | PASS_SAMPLE |
| MATH/GRADE_5 | q05 | Số thập phân / Làm tròn: Làm tròn được một số thập phân tới số tự nhiên gần nhất hoặc tới số thập phân có một hoặc hai chữ số ở phần thập phân. | math-g5-016 | Làm tròn số thập phân tới số tự nhiên hoặc một/hai chữ số; đúng mức yêu cầu. | PASS_SAMPLE |
| VIETNAMESE/GRADE_1 | q01 | Đọc đúng âm, vần, tiếng, từ, câu (có thể đọc chưa thật đúng một số tiếng có vần khó, ít dùng). | vietnamese-g1-001 | Đọc âm/vần/tiếng/từ/câu; có evidence trực tiếp. | PASS_SAMPLE |
| VIETNAMESE/GRADE_1 | q05 | Trả lời được các câu hỏi đơn giản về nội dung cơ bản của văn bản dựa vào gợi ý, hỗ trợ. | vietnamese-g1-005 | Trả lời nội dung cơ bản với gợi ý/hỗ trợ; đúng mức lớp 1. | PASS_SAMPLE |
| VIETNAMESE/GRADE_2 | q01 | Đọc đúng các tiếng (bao gồm cả một số tiếng có vần khó, ít dùng). Thuộc bảng chữ cái tiếng Việt; biết phân biệt tên chữ cái (a, bê, xê,...) và âm (a, bờ, cờ,...) mà chữ cái và con chữ biểu hiện. | vietnamese-g2-001 | Đọc tiếng, bảng chữ cái và phân biệt tên chữ/âm; khớp outcome. | PASS_SAMPLE |
| VIETNAMESE/GRADE_2 | q05 | Hiểu điều tác giả muốn nói qua văn bản đơn giản dựa vào gợi ý. | vietnamese-g2-005 | Hiểu ý tác giả với gợi ý; có evidence trực tiếp. | PASS_SAMPLE |
| VIETNAMESE/GRADE_3 | q01 | Đọc đúng và bước đầu biết đọc diễn cảm các đoạn văn miêu tả, câu chuyện, bài thơ; tốc độ đọc khoảng 70 – 80 tiếng trong 1 phút. Biết nghỉ hơi ở chỗ có dấu câu hay chỗ ngắt nhịp thơ. | vietnamese-g3-001 | Đọc diễn cảm bước đầu 70–80 tiếng/phút; đúng tốc độ lớp 3. | PASS_SAMPLE |
| VIETNAMESE/GRADE_3 | q05 | Nhận biết được thời gian, địa điểm và trình tự các sự việc trong câu chuyện. | vietnamese-g3-005 | Nhận biết thời gian/địa điểm/trình tự sự việc; khớp outcome. | PASS_SAMPLE |
| VIETNAMESE/GRADE_4 | q01 | Đọc đúng và diễn cảm các văn bản truyện, kịch, thơ, văn bản miêu tả: nhấn giọng đúng từ ngữ; thể hiện cảm xúc qua giọng đọc. Tốc độ đọc khoảng 80 – 90 tiếng trong 1 phút. | vietnamese-g4-001 | Đọc diễn cảm 80–90 tiếng/phút; khớp tốc độ và thể loại. | PASS_SAMPLE |
| VIETNAMESE/GRADE_4 | q05 | Nhận biết được chủ đề văn bản. | vietnamese-g4-005 | Nhận biết chủ đề văn bản; có evidence trực tiếp. | PASS_SAMPLE |
| VIETNAMESE/GRADE_5 | q01 | Đọc đúng và diễn cảm các văn bản truyện, kịch bản, bài thơ, bài miêu tả, tốc độ đọc khoảng 90 – 100 tiếng trong 1 phút. | vietnamese-g5-001 | Đọc diễn cảm 90–100 tiếng/phút; khớp tốc độ lớp 5. | PASS_SAMPLE |
| VIETNAMESE/GRADE_5 | q05 | Chỉ ra được mối liên hệ giữa các chi tiết. Biết tóm tắt văn bản. | vietnamese-g5-005 | Liên hệ chi tiết và tóm tắt; có evidence trực tiếp ở hai outcome. | PASS_SAMPLE |
| ENGLISH/GRADE_1 | q01 | Các chữ cái đã học bằng kỹ năng nghe | english-g1-001 | Nghe chữ cái khoảng 13 chữ; khớp kỹ năng nghe. | PASS_SAMPLE |
| ENGLISH/GRADE_1 | q05 | Phản hồi phi ngôn ngữ trong giao tiếp rất đơn giản | english-g1-005 | Phản hồi phi ngôn ngữ sau luyện tập; đúng điều kiện nguồn. | PASS_SAMPLE |
| ENGLISH/GRADE_2 | q01 | Nhận biết chữ cái đã học bằng kỹ năng nghe | english-g2-001 | Nghe/nhận biết chữ cái; có evidence trực tiếp. | PASS_SAMPLE |
| ENGLISH/GRADE_2 | q05 | Thực hiện hướng dẫn đơn giản trong lớp học | english-g2-006 | Nghe hiểu/thực hiện hướng dẫn trong lớp; có evidence trực tiếp. | PASS_SAMPLE |
| ENGLISH/GRADE_3 | q01 | Nghe hiểu từ và cụm từ quen thuộc | english-g3-001 | Nghe hiểu từ/cụm từ quen thuộc; có evidence nghe. Candidate đọc hiểu đi kèm không tự hỗ trợ kỹ năng nghe. | PASS_SAMPLE |
| ENGLISH/GRADE_3 | q05 | Hỏi đáp rất đơn giản về bản thân | english-g3-006 | Hỏi/đáp rất đơn giản về bản thân; đúng outcome nói. | PASS_SAMPLE |
| ENGLISH/GRADE_4 | q01 | Làm theo hướng dẫn trong lớp học | english-g4-001 | Làm theo chỉ dẫn đơn giản; hai outcome nghe hỗ trợ trực tiếp. Candidate nói chỉ dẫn chỉ là lân cận. | PASS_SAMPLE |
| ENGLISH/GRADE_4 | q05 | Nói cụm từ và câu đơn giản | english-g4-005 | Nói cụm từ/câu đơn giản; có evidence trực tiếp. | PASS_SAMPLE |
| ENGLISH/GRADE_5 | q01 | Nhận biết trọng âm từ bằng kỹ năng nghe | english-g5-001 | Nghe/nhận biết trọng âm từ; khớp kỹ năng. | PASS_SAMPLE |
| ENGLISH/GRADE_5 | q05 | Nghe hiểu nội dung chính của câu chuyện ngắn | english-g5-005 | Nghe hiểu ý chính chuyện ngắn, có trợ giúp; khớp điều kiện nguồn. | PASS_SAMPLE |

Kết quả mẫu: 30/30 có outcome trực tiếp liên quan và đúng scope. Có candidate lân cận khác kỹ năng trong một số top-k; không được dùng chúng làm bằng chứng thay cho kỹ năng được yêu cầu. Kết quả mẫu không phải tỷ lệ chất lượng được giáo viên xác nhận cho toàn corpus.

Hai miss lịch sử còn lại (English lớp 3/4 q03) được giữ nguyên: câu hỏi không nêu kỹ năng, evidence chưa đủ cho gold outcome. Không đổi nhãn/ngưỡng để làm đẹp số liệu. Teacher/pedagogical review: PENDING.
