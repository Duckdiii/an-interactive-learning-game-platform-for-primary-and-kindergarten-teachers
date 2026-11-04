> **Định hướng Đề tài**: [[srs/README|Mục lục SRS]] | [[Tổng quan đề tài]]

﻿ĐỊNH HƯỚNG ĐỀ TÀI

# 0. Tóm tắt

Giáo viên hiện làm game học tập bằng các web tool theo mẫu như Wordwall, H5P, Kahoot. Họ chọn một mẫu có sẵn rồi nhập từng câu hỏi, từng hình ảnh, nên gánh nặng nằm ở khâu chuẩn bị nội dung chứ không ở thao tác giao diện. Đề tài chuyển trọng tâm sang một cách làm khác. Giáo viên mô tả nhu cầu dạy học, AI đề xuất và sinh trò chơi phù hợp, hệ thống kiểm tra chất lượng, còn giáo viên chỉ duyệt và chỉnh.

Phạm vi gồm ba môn Toán, Tiếng Việt, Tiếng Anh cho Mầm non và Tiểu học. Hệ thống hiện có các cơ chế chơi và phần lõi sinh game theo JSON DSL. Vấn đề đang được giải quyết tiếp theo là cách xử lý khi giáo viên mô tả một trò chơi nằm ngoài thiết kế hiện tại (mục 5).

Hệ thống được thiết kế theo hướng AI Native ở cấp 3, với bốn thành phần ngữ cảnh, bộ nhớ, điều phối và rào chắn (mục 4).

# 1. Bài toán và đối tượng

## 1.1 Vấn đề

Trò chơi giúp trẻ Mầm non và Tiểu học tập trung và nhớ bài lâu hơn, nhưng mỗi trò chơi tốn khá nhiều công chuẩn bị. Lấy ví dụ một trò chơi ôn tập 5 câu “đếm con vật” cho lớp 1 làm trên Wordwall. Giáo viên phải nghĩ 5 câu hỏi và đáp án hợp với bài đang dạy, tìm và tải 5 hình phù hợp, chọn mẫu trò chơi, nhập từng câu, cài đặt đúng sai và thời gian, rồi chơi thử để sửa lỗi. Phần thao tác trên giao diện chỉ mất vài phút, phần tốn thời gian là nghĩ nội dung và tìm hình. Theo ước tính khi nhóm tự làm thử, mỗi trò chơi mất khoảng 15–30 phút tùy độ quen tay. Con số này sẽ được đo lại với giáo viên thật ở thí nghiệm E1 (mục 8).

Khó khăn thứ hai là nội dung phải khớp với lớp mình. Giáo viên dạy theo sách giáo khoa và kế hoạch bài dạy, nên câu hỏi phải dùng đúng từ vựng của bài, con số trong phạm vi lớp đã học, và câu chữ vừa sức trẻ. Web tool không biết lớp đang học đến đâu, nên giáo viên phải tự nghĩ từng câu. Các công cụ AI như ChatGPT hay tính năng AI của Wordwall sinh được câu hỏi nhưng không biết bối cảnh lớp, nên dễ ra số vượt phạm vi, từ chưa học, hoặc câu quá dài với trẻ chưa đọc thạo, và giáo viên lại phải kiểm tra, sửa từng câu.

Khó khăn thứ ba đến từ chính các công cụ nước ngoài. Gói trả phí có giá cao so với thu nhập giáo viên, thư viện hình ảnh thiên về văn hóa phương Tây, và tính năng AI được tối ưu cho tiếng Anh.

Hệ quả là giáo viên khó dùng trò chơi thường xuyên trong các tiết học hằng ngày, dù biết trò chơi có ích cho trẻ.

## 1.2 Đối tượng

| Nhóm | Vai trò | Ghi chú |
| --- | --- | --- |
| Giáo viên Mầm non, Tiểu học | Người tạo game: mô tả ý tưởng hoặc tải giáo án, duyệt, chỉnh sửa, xuất bản, trình chiếu | Người dùng chính của hệ thống |
| Học sinh | Người chơi, vào bằng mã, QR hoặc đường dẫn, không cần tài khoản | Hệ thống không lưu thông tin nhận dạng cá nhân |
| Quản trị viên | Theo dõi chi phí và trạng thái dịch vụ, quản lý tài khoản giáo viên, cấu hình kiểm duyệt | Vai trò vận hành |
| Phụ huynh | Chơi cùng con ở nhà bằng mã chia sẻ do giáo viên gửi | Luồng dự kiến, chưa nằm trong đặc tả hiện tại |


# 2. Hiện trạng và cách web tool tạo trò chơi

## 2.1 Các công cụ hiện có

Nhóm đã dùng thử trực tiếp Wordwall, Kahoot, H5P và tìm hiểu thêm khoảng 30 công cụ khác qua tài liệu và trang giới thiệu của nhà cung cấp. Khi dùng web tool, giáo viên thường đi qua các bước sau.

Đăng nhập → chọn một mẫu có sẵn → nhập thủ công từng câu hỏi, đáp án → tự tìm và tải hình minh họa → cấu hình đúng/sai, thời gian, độ khó → xem trước và xuất bản

Hai bước tốn công nhất là nhập nội dung và tìm hình. Bảng dưới gom các công cụ thành sáu nhóm theo cách hoạt động. Mô tả từng công cụ ở Phụ lục A.

| Nhóm | Công cụ đại diện | Đặc điểm chung | Hạn chế chung so với đề tài |
| --- | --- | --- | --- |
| 1. Game theo mẫu | Wordwall, Educaplay, Educandy, LearningApps, BookWidgets, Flippity | Chọn mẫu rồi nhập nội dung; một số có AI gợi ý câu hỏi | Nhập tay; đồ họa theo mẫu cố định |
| 2. Thi đua lớp học | Kahoot, Blooket, Gimkit, Quizalize, Classtime, Quizlet Live | Câu hỏi bọc trong cơ chế thi đua hoặc hợp tác | Chủ yếu trắc nghiệm chữ; mỗi học sinh cần một thiết bị |
| 3. Mầm non và lớp một màn hình | TinyTap, Boom Cards, Baamboozle, Plickers | Giọng đọc, thao tác chạm; hoặc chơi trên một màn hình chung | Dựng thủ công hoặc chỉ có dạng câu hỏi đơn giản; nội dung theo ngữ cảnh nước ngoài |
| 4. Bài giảng và phiếu số | H5P, Genially, Nearpod, Pear Deck, ClassPoint, Edpuzzle, Liveworksheets, Wizer.me, Seesaw | Tương tác gắn vào slide, video hoặc phiếu bài tập | Thiên về bài giảng và kiểm tra, ít tính trò chơi; dựng tốn thời gian |
| 5. Game và mô phỏng đóng | Toy Theater, ABCya, PhET, Prodigy, Deck.Toys, Breakout EDU | Tương tác trực quan, đồ họa tốt | Giáo viên không sửa được nội dung, hoặc mất hàng giờ để dựng một màn |
| 6. Công cụ AI | Canva Magic Activities, Curipod, Gameer.io, Worky Genie, Diffit, MagicSchool, Eduaide, Gemini Canvas | AI sinh câu hỏi, văn bản, slide, kịch bản hoặc code | Phần lớn chỉ sinh nội dung tĩnh, không có phần chạy trò chơi; một số vẫn bắt chọn định dạng trước |


Ngoài các nền tảng trên, nhiều giáo viên đã tự "vibe code" công cụ riêng để luyện Toán, Tiếng Việt hoặc làm trò chơi. Vì vậy, việc tạo được game bằng AI tự nó không còn là điểm khác biệt. Giá trị của đề tài phải nằm ở những thứ một công cụ tự viết khó có được: bám chương trình, kiểm tra chất lượng, an toàn cho trẻ nhỏ, và quy trình tạo, chỉnh sửa, xuất bản liền một mạch (mục 3).

## 2.2 Bốn công cụ tiêu biểu tạo trò chơi như thế nào

Bảng ở mục 2.1 cho biết các công cụ làm được gì. Để thiết kế quy trình tạo game bằng AI, nhóm cần hiểu thêm cách chúng tạo trò chơi bên trong. Nhóm chọn bốn công cụ, mỗi công cụ đại diện cho một cách làm, và đặt cùng năm câu hỏi cho cả bốn. Nội dung của giáo viên được lưu thế nào, có tách khỏi phần hiển thị không? Ai định nghĩa khuôn dữ liệu, gồm các trường, kiểu và giới hạn? Thành phần nào hiển thị trò chơi? Thêm một loại trò chơi mới tốn những công gì? AI, nếu có, nằm ở bước nào?

| Câu hỏi | H5P (khung theo mẫu, mã nguồn mở) | Wordwall (khung theo mẫu, đổi mẫu giữ nội dung) | PhET (mô phỏng viết cứng, mã nguồn mở) | Gemini Canvas (AI viết code) |
| --- | --- | --- | --- | --- |
| 1. Lưu nội dung | Mỗi bài là một tệp dữ liệu riêng (content.json), tách khỏi phần hiển thị | Cùng bộ nội dung chuyển được sang mẫu khác (quan sát khi dùng); mẫu nào giữ, mẫu nào mất nội dung đang tìm hiểu | Nội dung nằm trong mã nguồn mô phỏng; đang tìm hiểu thêm | Không tách: nội dung và logic nằm chung trong code AI sinh ra |
| 2. Khuôn dữ liệu | Tệp semantics.json khai báo trường, kiểu, giới hạn; trình soạn thảo sinh form từ tệp này | Đang tìm hiểu | Đang tìm hiểu | Không có khuôn cố định |
| 3. Phần hiển thị | Thư viện JavaScript và CSS riêng cho từng loại nội dung | Đang tìm hiểu | Mã nguồn công khai trên GitHub; thư viện hiển thị đang tìm hiểu | Chính đoạn HTML/JS do AI viết |
| 4. Thêm loại mới | Viết thư viện mới kèm tệp khai báo trường | Đang tìm hiểu | Lập trình viên viết mô phỏng mới | Không cần; mỗi lần sinh là một game mới |
| 5. Vị trí của AI | Không có trong lõi; giáo viên điền form | Có tính năng AI; AI làm ở bước nào đang tìm hiểu | Không có | AI viết toàn bộ; đang chạy thử cùng một mô tả 3 lần để so sánh |


Thông tin về H5P cần được xác nhận bằng một gói .h5p thật. Các ô đang tìm hiểu sẽ được bổ sung sau khi nhóm thử trực tiếp: giải nén một gói H5P, dùng chức năng đổi mẫu của Wordwall, đọc mã nguồn một mô phỏng PhET (ví dụ cân thăng bằng) trên GitHub, và chạy cùng một mô tả ba lần trên Gemini Canvas. Phần việc này ước tính khoảng 2 ngày công, mỗi công cụ nửa buổi.

## 2.3 Năm cách làm và bài học cho đề tài

Các web tool theo mẫu có chung bốn đặc điểm. Thứ nhất, nhà phát triển dựng sẵn khung trò chơi và giáo viên nhập thông tin vào khung đó, nên trải nghiệm dựa trên cái có sẵn ("ready to use"). Thứ hai, cơ chế chơi cố định theo mẫu, giáo viên phải tự chọn mẫu hợp với mục tiêu bài học. Thứ ba, nội dung do giáo viên cung cấp từng câu, còn AI nếu có chỉ là tính năng phụ. Theo "phép thử tháo gỡ" trong research của nhóm, gỡ AI khỏi Wordwall hay Kahoot thì nền tảng vẫn chạy bình thường ở chế độ thủ công. Thứ tư, nội dung là tĩnh, tạo một lần và mọi học sinh chơi như nhau.

Từ bốn công cụ ở mục 2.2 và các công cụ khác, nhóm rút ra năm cách làm phổ biến.

| Cách làm | Đại diện | Nhóm học được gì |
| --- | --- | --- |
| Khung theo mẫu, dữ liệu tách khỏi giao diện | H5P, Wordwall, LearningApps | Giữ kiến trúc lược đồ, dữ liệu, trình hiển thị; chỉ thay người điền dữ liệu bằng AI và kiểm tra bằng chính lược đồ đó |
| Một bộ dữ liệu, nhiều kiểu chơi | Wordwall (đổi mẫu), Educandy, Flippity | Các cơ chế có cùng dạng dữ liệu (ví dụ dạng "cặp") dùng chung một bộ nội dung, làm cơ sở cho bước đề xuất nhiều cơ chế chơi |
| Game viết cứng | PhET, Toy Theater | Nguồn cơ chế thao tác trực quan (cân thăng bằng, que tính, đồng hồ) cho ngân hàng cơ chế; viết một lần thành khối dùng chung |
| AI sinh văn bản tĩnh | Diffit, Eduaide | AI phân tích tài liệu tốt, nhưng phải có phần chạy trò chơi thì mới ra game chơi được |
| AI viết code | Gemini Canvas | Linh hoạt nhưng khó kiểm soát chất lượng, an toàn và chấm điểm; tương ứng mức sinh 4 (mục 5.3) |


## 2.4 Khoảng trống

|  | Giáo viên nhập thủ công | Tự động bằng AI |
| --- | --- | --- |
| Tương tác trực quan cao | Toy Theater, PhET (không sửa được); Boom Cards, Genially (dựng mất nhiều giờ) | Vị trí đề tài nhắm tới |
| Tương tác thấp (chữ, trắc nghiệm) | Kahoot, LearningApps, Liveworksheets | Diffit, Eduaide, tính năng AI của Kahoot và Wordwall |


Trong các công cụ nhóm khảo sát, chưa có công cụ nào cùng lúc nhận mô tả bằng tiếng Việt, sinh ra trò chơi thao tác trực quan chơi được ngay, và bám Yêu cầu cần đạt của chương trình Việt Nam.

# 3. Giải pháp và điểm khác biệt

## 3.1 Hướng tiếp cận

Đề tài chuyển từ cách nhập thông tin vào khung có sẵn sang cách giáo viên mô tả bối cảnh, hệ thống đề xuất và tạo trò chơi phù hợp. Áp "phép thử tháo gỡ" cho chính sản phẩm của nhóm thì thấy, nếu gỡ AI ra, hệ thống không còn tạo được game từ mô tả. AI vì vậy là bộ phận chính của hệ thống, không phải tính năng phụ.

Về kiến trúc, nhóm giữ cách làm đã được kiểm chứng của H5P và Wordwall, trong đó lược đồ dữ liệu (schema), dữ liệu bài học và trình hiển thị (renderer) tách riêng. AI chỉ sinh JSON theo lược đồ, giao diện chơi tự hiển thị độc lập từ JSON đó. Chỗ thay đổi là người tạo ra dữ liệu. Thay vì giáo viên gõ từng ô, AI sinh dữ liệu từ mô tả tiếng Việt, và dữ liệu phải qua nhiều lớp kiểm tra trước khi đến với học sinh.

## 3.2 Ví dụ đi qua toàn bộ quy trình

Giáo viên nhập "Cho bé lớp 1 ôn đếm con vật từ 1 đến 5, chơi trong bối cảnh nông trại", chọn môn Toán, lớp 1. Bảng dưới mô tả cách hệ thống xử lý mô tả này qua tám bước, kèm thành phần phụ trách và trạng thái hiện tại.

| Bước | Hệ thống làm gì (theo ví dụ) | Thành phần | Trạng thái |
| --- | --- | --- | --- |
| 1. Nhận mô tả | Nhận câu mô tả, môn Toán, khối lớp 1. Giáo viên cũng có thể tải giáo án .docx hoặc .pdf (tối đa 10MB); hệ thống trích xuất văn bản bằng Apache Tika | Teacher Portal (màn tạo game) | Đang làm |
| 2. Phân tích ý định | Tách thành mục tiêu "đếm số lượng trong phạm vi 5", chủ đề "nông trại", các con số 1 và 5, môn MATH, lớp GRADE_1, cùng số câu và độ khó nếu giáo viên có nêu | Intent Parser | Đã thiết kế |
| 3. Tra chương trình | Tìm Yêu cầu cần đạt Toán lớp 1 "Đếm, đọc, viết được các số trong phạm vi 10…" và đưa vào ngữ cảnh sinh. Đủ căn cứ nên đi tiếp; nếu giáo viên ghi "phạm vi 1000" thì hệ thống từ chối và giải thích | Curriculum-RAG (pgvector) | Đang kiểm chứng kỹ thuật |
| 4. Sinh dữ liệu bài học | Gemini trả về JSON đúng lược đồ: 5 câu, mỗi câu có hình con vật, số lượng, đáp án và các lựa chọn nhiễu. Hình minh họa lấy từ kho ảnh an toàn | Content Generator (LangChain4j + Gemini, đầu ra theo lược đồ) | Đang làm |
| 5. Kiểm tra dữ liệu | Lớp 1 kiểm tra đủ trường, đúng kiểu. Lớp 2 kiểm tra đáp án nằm trong các lựa chọn và đủ 5 câu. Lớp 3 đếm lại số con vật bằng code, so với đáp án, và kiểm tra mọi số nằm trong 1–5. Sau đó áp dụng kiểm duyệt an toàn và hồ sơ lứa tuổi Bé. Sai thì gửi lỗi cụ thể cho AI sửa, tối đa 2 lần | Validator 3 lớp, kiểm duyệt an toàn, kiểm chứng Toán | Validator khoảng 90%; kiểm chứng Toán là đề xuất |
| 6. Đề xuất cơ chế chơi | Cùng bộ dữ liệu "số lượng – con số" dùng được cho ba cơ chế: chạm chọn số đúng (Quiz), nối nhóm con vật với số (Matching), lật thẻ tìm cặp (Memory Card). Hệ thống đề xuất 3 cơ chế kèm lý do. Giáo viên chọn, chơi thử và chỉnh sửa trong Workspace Editor, rồi xuất bản bằng mã, URL hoặc QR | Màn chọn cơ chế chơi, Workspace Editor | Đã thiết kế giao diện |
| 7. Hiển thị trò chơi | Trình hiển thị Konva vẽ cơ chế đã chọn với chủ đề đồ họa nông trại, nút to, tự đọc đề bằng giọng đọc tiếng Việt vì là khung Bé | Trình hiển thị Konva, chủ đề đồ họa, hồ sơ lứa tuổi, Google TTS |  |
| 8. Giao cho học sinh | Học sinh nhận bản game đã bỏ đáp án, chơi cá nhân hoặc thi đấu theo phòng. Mỗi lần chọn được gửi lên máy chủ chấm và trả về đúng hay sai | API chơi và chấm điểm | Đã đặc tả, chưa làm backend |


Dữ liệu AI sinh ở bước 4 có dạng như sau. Đoạn này rút gọn để minh họa, không phải đúng cú pháp DSL v1.0.0.

{

  "subject": "MATH", "gradeLevel": "GRADE_1",

  "yccdRef": "<chunkId từ Curriculum-RAG>",

  "items": [

    { "prompt": "Có mấy con gà?", "image": "chicken", "count": 3,

      "answer": 3, "choices": [2, 3, 4] },

    { "prompt": "Có mấy con vịt?", "image": "duck", "count": 5,

      "answer": 5, "choices": [4, 5, 1] }

  ]

}


Ở bước 5, luật kiểm chứng Toán chỉ là vài dòng code xác định, không cần gọi AI.

for (Item item : game.items()) {

  if (item.answer() != item.count())

      error("Đáp án khác số lượng hình");

  if (!item.choices().contains(item.answer()))

      error("Đáp án không có trong lựa chọn");

  if (item.count() < 1 || item.count() > 5)

      error("Số vượt phạm vi giáo viên yêu cầu");

}


## 3.3 So với ba nhóm đối thủ

Câu hỏi "AI tạo ra khác biệt gì" cần được trả lời với ba nhóm đối thủ, vì mỗi nhóm đã làm được một phần.

| Đối thủ | Họ làm được gì | Đề tài khác ở đâu |
| --- | --- | --- |
| Web tool theo mẫu (Wordwall, H5P) | Game đẹp, ổn định; giáo viên nhập tay từng câu | AI tạo dữ liệu bài học từ một câu mô tả tiếng Việt |
| Công cụ AI sinh nội dung (Diffit, Eduaide, AI của Kahoot) | AI sinh câu hỏi, văn bản, slide | Đầu ra là trò chơi chơi được ngay, không chỉ là chữ |
| Giáo viên tự "vibe code" (Gemini Canvas, ChatGPT) | Tự tạo game mới bằng AI | Bám Yêu cầu cần đạt; đáp án được kiểm chứng; hợp lứa tuổi; ổn định giữa các lần tạo; có quy trình chỉnh sửa, xuất bản và chấm điểm |


Nhóm thứ ba khó nhất, vì giáo viên biết dùng AI đã tự tạo được game. Do đó luận điểm của đề tài cụ thể hơn việc "AI tạo được game". AI phải tạo ra game đủ tin cậy để dùng với trẻ nhỏ, tức là đúng chương trình, đúng đáp án, hợp lứa tuổi và ổn định giữa các lần tạo.

## 3.4 So sánh chi tiết với web tool theo mẫu

| Khía cạnh | Web tool theo mẫu | Đề tài | Chức năng tương ứng |
| --- | --- | --- | --- |
| Đầu vào | Chọn mẫu rồi nhập nội dung | Mô tả bằng tiếng Việt kèm khối lớp và môn, hoặc tải giáo án .docx/.pdf (tối đa 10MB) | FR-02, UC-02, FLD-01 đến FLD-04 |
| Nội dung câu hỏi | Giáo viên gõ từng câu, từng đáp án | AI sinh câu hỏi, đáp án, lời giải thích; giáo viên sửa tay hoặc yêu cầu AI làm lại riêng một thẻ mà giữ nguyên các thẻ khác | FR-05, FR-06, UC-05, UC-06 |
| Chọn cơ chế chơi | Giáo viên tự chọn mẫu | Hệ thống phân tích ý định để xác định cơ chế phù hợp; hướng thiết kế là đề xuất vài cơ chế kèm lý do để giáo viên chọn | UC-02 bước 4, FLD-15 |
| Bám chương trình | Giáo viên tự đối chiếu | Curriculum-RAG tra cứu Yêu cầu cần đạt (YCCĐ) bằng embedding và pgvector, đưa vào ngữ cảnh sinh; không đủ căn cứ thì từ chối và nói rõ lý do | FR-02, UC-02 bước 4 |
| Kiểm tra chất lượng | Không có hoặc rất ít; form chỉ bắt điền đủ ô bắt buộc | Validation 3 lớp bằng luật (Jackson, JSON Schema, Hibernate Validator) thay cho vòng LLM tự sửa; tính lại đáp án bằng code; kiểm duyệt an toàn nhiều lớp (moderation và danh mục từ cấm cập nhật nóng) | NFR-02, UC-02 bước 6 |
| Phù hợp lứa tuổi | Giáo viên tự cân nhắc; một giao diện cho mọi lứa tuổi | Cảnh báo khi kiến thức không hợp lứa tuổi, gợi ý đổi khối lớp hoặc đổi nội dung; khung Bé hoặc Học sinh tự chọn theo khối lớp; nút bấm lớn, ít câu cho trẻ nhỏ | UC-02 luồng 4a, mục 3.2.1 SRS |
| Hình ảnh, giọng đọc | Giáo viên tự tìm ảnh, tự tải lên, thường không có giọng đọc | Ảnh từ Pexels (SafeSearch) lưu trên S3; giọng đọc Google TTS giọng Nam hoặc Nữ | UC-02 bước 5, UC-11 |
| Đưa vào lớp học | Tách khỏi công cụ tạo | Xuất bản bằng mã, URL, QR; chơi cá nhân hoặc thi đấu theo phòng thời gian thực | FR-07 đến FR-09 |
| Trải nghiệm của trẻ | Hình ảnh phương Tây, có thể lỗi font, ít giọng đọc | Đồ họa và chủ đề đồ họa thống nhất, giọng đọc tiếng Việt, hồ sơ lứa tuổi (mục 6) | UC-11, mục 3.2.1 SRS |
| Mô tả nằm ngoài mẫu | Không làm được | Xem mục 5 | UC-02 (cần bổ sung luồng) |

# 4. Ngữ cảnh, bộ nhớ, điều phối và rào chắn

Hệ thống được thiết kế theo hướng AI Native: sản phẩm xoay quanh AI, và nếu gỡ AI ra thì mất phần lớn giá trị cốt lõi. Bốn thành phần làm nên một hệ thống AI Native là ngữ cảnh (context), bộ nhớ (memory), điều phối (orchestration) và rào chắn (guardrails). Các mục 4.2 đến 4.5 lần lượt mô tả cách đề tài hiện thực từng thành phần.

## 4.1 Vị trí trên thang mức độ ứng dụng AI

Thang mức độ ứng dụng AI gồm năm cấp. Cấp 0 là phần mềm truyền thống chưa có AI. Cấp 1 dùng AI như một lớp bổ sung qua API. Cấp 2 cho AI tham gia nhiều quy trình nghiệp vụ. Cấp 3 (AI Native) đặt AI vào nhân kiến trúc và giá trị cốt lõi của sản phẩm. Cấp 4 cho nhiều AI agent phối hợp, tự xử lý từ đầu đến cuối.

Đề tài nhắm cấp 3 và có một phần đặc điểm của cấp 4, vì hệ thống biết lập kế hoạch (bản thiết kế trò chơi), gọi công cụ, tự kiểm chứng và sửa lỗi. Hệ thống không tự trị hoàn toàn. Đối tượng là trẻ em, nên giáo viên luôn duyệt trước khi trò chơi đến tay học sinh.

| Dấu hiệu của cấp 3 | Ở đề tài |
| --- | --- |
| Sản phẩm được thiết kế xoay quanh AI | Mọi trò chơi đều được sinh từ mô tả qua AI; màn tạo game xoay quanh ô mô tả và bước duyệt (mục 3.1, 3.2) |
| Có ngữ cảnh, bộ nhớ, điều phối, rào chắn | Mục 4.2 đến 4.5 |
| Không có AI thì mất phần lớn giá trị cốt lõi | Theo phép thử tháo gỡ, gỡ AI ra thì hệ thống không còn tạo được game từ mô tả (mục 2.3, 3.1) |


## 4.2 Ngữ cảnh: AI được cung cấp những gì

Ngữ cảnh là toàn bộ thông tin AI nhận được trong một lần gọi. Câu mô tả của giáo viên chỉ là một phần nhỏ. Một giáo viên khi tự soạn trò chơi cho lớp mình đã biết sẵn lớp dùng bộ sách nào, đã học đến bài nào, các em thích gì và trò chơi dùng vào lúc nào trong tiết. Hệ thống cần những hiểu biết đó để tạo game hợp với đúng lớp ấy. Vì vậy ngữ cảnh được ghép từ bốn nguồn. Nguồn thứ nhất là hồ sơ giáo viên và hồ sơ lớp, khai một lần. Nguồn thứ hai là tài liệu giáo viên tải lên. Nguồn thứ ba là bộ nhớ (mục 4.3). Nguồn cuối là mô tả của lần tạo hiện tại.

Ngữ cảnh chia làm hai phần. Phần thứ nhất nói về con người và tình huống dạy học, giúp game hợp với lớp. Phần thứ hai là ngữ cảnh kỹ thuật do hệ thống tự ghép, giúp game đúng chương trình và đúng khuôn.

Bảng dưới liệt kê phần ngữ cảnh về giáo viên, lớp học và tình huống dùng.

| Nhóm | Thông tin | Lấy từ đâu | Ảnh hưởng đến game |
| --- | --- | --- | --- |
| Giáo viên | Trường, địa phương, môn dạy; bộ sách giáo khoa đang dùng; phương ngữ của giọng đọc | Hồ sơ giáo viên, khai một lần | Chọn đúng bài theo bộ sách; giọng đọc Bắc hoặc Nam; hình ảnh gần với địa phương |
| Lớp học | Khối lớp, sĩ số; lớp đã học đến đâu (ví dụ số đến 10, 20 từ vựng chủ đề con vật); đặc điểm chung như nhiều em chưa đọc được | Hồ sơ lớp; suy ra từ giáo án tải lên | Giới hạn số, phép tính, từ vựng trong phạm vi đã học; tăng hình ảnh và lời đọc khi lớp chưa đọc tốt |
| Tình huống dùng | Mục đích (khởi động, dạy bài mới, củng cố, ôn tập); hình thức (trình chiếu cả lớp hay mỗi em một máy); thời lượng; có loa hay không | Giáo viên chọn khi tạo game, có giá trị mặc định | Số câu, độ khó, có hay không đồng hồ, cỡ chữ và nút bấm |
| Người chơi | Hồ sơ lứa tuổi; lỗi lớp hay gặp; chủ đề đã chơi gần đây | Cấu hình luật; bộ nhớ của lớp (mục 4.3) | Tập trung vào phần lớp còn yếu; tránh lặp chủ đề |
| Mong muốn về trò chơi | Mức thi đua; nhân vật, chủ đề lớp thích; sự kiện sắp tới như Trung thu, Tết, 20/11; điều giáo viên không muốn | Hồ sơ lớp; mô tả lần này | Chọn cơ chế và chủ đề đồ họa; bật hoặc tắt bảng xếp hạng |
| Tài liệu tải lên | Giáo án, danh sách từ vựng, hình ảnh | Tải lên khi tạo game, tối đa 10MB | Dùng đúng từ vựng và ví dụ của bài |


Giáo viên không phải nhập lại những thông tin này mỗi lần. Hồ sơ giáo viên và hồ sơ lớp chỉ có 6–8 trường, điền một lần và có giá trị mặc định. Một phần được suy ra từ giáo án hoặc từ bộ nhớ. Ví dụ giáo án ghi "Bài 12" thì hệ thống biết lớp đã học đến đâu. Khi thiếu một thông tin làm thay đổi kết quả, hệ thống hỏi lại tối đa 2 câu, kèm lựa chọn sẵn để bấm. Khi các nguồn mâu thuẫn, hệ thống ưu tiên theo thứ tự mô tả lần này, hồ sơ lớp, hồ sơ giáo viên, bộ nhớ, rồi giá trị mặc định. Ví dụ hồ sơ lớp ghi lớp thích thi đua, nhưng lần này giáo viên viết "chơi nhẹ nhàng", thì hệ thống bỏ bảng xếp hạng.

Một phần ngữ cảnh được chuyển thành luật cho validator, không chỉ nằm trong prompt. Hồ sơ lớp ghi đã học số đến 10 thì validator từ chối câu hỏi có số 15. Từ vựng tiếng Anh ngoài danh sách lớp đã học bị đánh dấu để giáo viên xem lại. Cách làm này không đổi DSL v1.0.0, vì ngữ cảnh chỉ tác động lên prompt và luật kiểm tra.

Phần ngữ cảnh kỹ thuật phần lớn đã có trong mã nguồn. Dịch vụ sinh game hiện truyền vào mô hình mô tả của giáo viên, môn, khối lớp, lược đồ của cơ chế, ngữ cảnh chương trình, số thứ tự lần thử, và khi cần sửa thì thêm kết quả lần trước cùng tối đa 10 lỗi.

| Thành phần | Lấy từ đâu | Vì sao cần | Trạng thái |
| --- | --- | --- | --- |
| Mô tả gốc của giáo viên | Màn tạo game, hoặc văn bản trích từ giáo án | Giữ bối cảnh và ý đồ dạy học, ví dụ nông trại, con vịt | Đã có |
| Kết quả phân tích ý định | Intent Parser | Mục tiêu học tập, chủ đề, con số, số câu, độ khó ở dạng có cấu trúc | Đã thiết kế |
| Môn, khối lớp | Giáo viên chọn | Chọn đúng phạm vi chương trình và hồ sơ lứa tuổi | Đã có |
| Yêu cầu cần đạt (YCCĐ) | Curriculum-RAG, kèm nguồn (trang PDF, phiên bản chương trình) | Neo nội dung vào chương trình, không bịa kiến thức vượt lớp | Đang kiểm chứng |
| Lược đồ của cơ chế chơi | JSON Schema trong DSL v1.0.0 | Ép đầu ra đúng khuôn để validator kiểm tra được | Đã có |
| Hồ sơ lứa tuổi | Cấu hình luật (Phụ lục B.3) | Ví dụ Mầm non tối đa 3 lựa chọn, không có đồng hồ | Đề xuất |
| Ví dụ mẫu của cơ chế | Ngân hàng cơ chế, bộ nhớ (mục 4.3) | Cho AI thấy một game đúng chuẩn trông thế nào | Đề xuất |
| Kết quả lần trước và danh sách lỗi | Validator, khi đang sửa | Sửa đúng chỗ thay vì sinh lại từ đầu | Đã có (tối đa 10 lỗi, tối đa 2 lần thử lại) |
| Game hiện tại và thẻ cần làm lại | Workspace Editor | Làm lại một thẻ mà giữ nguyên các thẻ khác (UC-06) | Đã đặc tả |


Mỗi lời gọi AI chỉ nhận phần ngữ cảnh nó cần. Cách làm này giảm nhiễu, giảm chi phí và giữ cho bước kiểm chứng độc lập với bước sinh.

| Agent và lời gọi | Nhận ngữ cảnh gì | Không nhận gì |
| --- | --- | --- |
| Planner: hiểu ý, phân loại | Mô tả gốc, môn, khối lớp, hồ sơ lớp, tình huống dùng | YCCĐ, lược đồ |
| Công cụ tra YCCĐ | Mục tiêu học tập đã tách, không kèm bối cảnh trang trí vì bối cảnh làm nhiễu việc tìm | Chủ đề như "nông trại" |
| Planner: lập kế hoạch (GDD) | Mục tiêu, YCCĐ, hồ sơ lứa tuổi, các cơ chế ứng viên, tình huống dùng, mong muốn về trò chơi | Lỗi của lần trước |
| Generator: sinh | Mô tả gốc, YCCĐ, lược đồ, hồ sơ lứa tuổi, ví dụ mẫu, bộ sách, phạm vi đã học | Dữ liệu học sinh |
| Generator: sinh lại sau khi bị báo lỗi | Kết quả lần trước, danh sách lỗi cụ thể, cùng ngữ cảnh như lần đầu | Dữ liệu học sinh |
| Pedagogy Critic | Câu hỏi, đáp án, YCCĐ, phạm vi đã học | Lý giải của lần sinh, để kiểm tra độc lập |
| Editing Assistant | Game hiện tại, yêu cầu sửa bằng lời, hồ sơ lớp | Dữ liệu học sinh |


Ngữ cảnh tuân theo năm nguyên tắc. Mô tả gốc của giáo viên luôn được giữ; nếu có bước viết lại câu để tìm kiếm, câu viết lại chỉ dùng cho truy xuất, còn bước sinh và bước kiểm tra căn cứ vẫn dùng câu gốc. Mỗi phần ngữ cảnh có nguồn, ví dụ YCCĐ ghi rõ trang và phiên bản chương trình. Mỗi lời gọi chỉ nhận phần tối thiểu. Dữ liệu học sinh như biệt danh hay kết quả cá nhân không được đưa vào lời gọi mô hình bên ngoài, và thông tin về lớp chỉ ở dạng tổng hợp, không có tên học sinh. Prompt và lược đồ có phiên bản và mã băm, nên kết quả đo lại được. Ví dụ một ngữ cảnh được ghép hoàn chỉnh ở Phụ lục B.7.

## 4.3 Bộ nhớ: hệ thống học từ những lần trước

Bộ nhớ gồm hai loại. Bộ nhớ ngắn hạn là trạng thái của một phiên tạo game, gồm yêu cầu, bản nháp, nhận xét của Pedagogy Critic và số lượt đã thử. Orchestrator giữ phần này trong phiên và ghi vào log khi phiên kết thúc. Bộ nhớ dài hạn lưu qua nhiều lần dùng và chia ba tầng như bảng dưới. Kho Yêu cầu cần đạt truy xuất qua RAG không thuộc bộ nhớ. Đó là kiến thức tra cứu chung cho mọi người dùng, còn bộ nhớ là hiểu biết về từng giáo viên, từng lớp và về chính hệ thống.

| Tầng | Nhớ gì | Dùng để làm gì | Ví dụ |
| --- | --- | --- | --- |
| Giáo viên | Môn, khối đang dạy; chủ đề đã dùng; cơ chế hay chọn; kiểu chỉnh sửa hay làm | Điền sẵn môn và khối; xếp hạng cơ chế đề xuất; tránh lặp chủ đề | "Lớp cô đã chơi chủ đề con vật 3 lần trong tuần, gợi ý chủ đề trái cây?" |
| Lớp, game đã xuất bản | Kết quả chơi tổng hợp theo câu: tỷ lệ đúng, số lần thử, đáp án sai hay gặp | Màn kết quả "Lớp mình cần ôn lại"; tạo game ôn tập từ chính các lỗi đó | 60% lớp chọn 6 thay vì 9 ở câu "4 + 5", game ôn tập tập trung phép cộng qua 5 |
| Hệ thống | Game giáo viên giữ nguyên không sửa; câu bị sửa hoặc xóa nhiều; lỗi validator hay gặp; mô tả nhóm C, D | Lấy game tốt làm ví dụ mẫu; bổ sung bộ mô tả chuẩn và ngân hàng cơ chế; cải thiện prompt | Khi sinh Quiz lớp 1, đưa vào 1–2 game Quiz lớp 1 giáo viên đã dùng nguyên văn |


Bộ nhớ được nuôi bằng một vòng phản hồi. Sau mỗi lần sinh, hành động của giáo viên trở thành tín hiệu. Dùng ngay không sửa cho thấy game tốt, có thể làm ví dụ mẫu. Sửa một số trường cho thấy chỗ AI làm chưa tốt. Làm lại toàn bộ cho thấy lần sinh thất bại. Xuất bản và cho lớp chơi cho thấy game được dùng thật. Ba tín hiệu đầu trùng với KPI-02, KPI-03 và KPI-04, nên dữ liệu dùng để đo KPI cũng là dữ liệu nuôi bộ nhớ. Kết quả chơi của học sinh được tổng hợp theo câu và quay lại bộ nhớ của lớp.

Bộ nhớ không được đưa toàn bộ vào prompt. Khi sinh, hệ thống chỉ truy xuất 1–2 game cùng cơ chế, cùng khối lớp mà giáo viên đã dùng nguyên văn, một dòng tóm tắt sở thích của giáo viên, và tóm tắt lỗi của lớp khi giáo viên chọn tạo game ôn tập. Việc tìm game ví dụ dùng pgvector, vốn đã có trong hệ thống.

Bộ nhớ có thể khiến hệ thống tự học sai, nên được giới hạn bằng sáu luật. Chỉ game vừa qua validator vừa được giáo viên duyệt mới trở thành ví dụ mẫu. Bộ nhớ chỉ gợi ý, không ghi đè Yêu cầu cần đạt. Kết quả của lớp chỉ lưu dạng tổng hợp theo câu, không lưu dữ liệu cá nhân học sinh, và biệt danh bị xóa khi đóng phòng. Giáo viên xem và xóa được bộ nhớ của mình. Việc thêm mục vào ngân hàng cơ chế hoặc bộ mô tả chuẩn phải có người duyệt. Bộ nhớ làm ở mức lớp, không điều chỉnh độ khó theo từng học sinh. Các bảng dữ liệu cho bộ nhớ ở Phụ lục B.8; mức cam kết của từng phần ở mục 9.

## 4.4 Điều phối: hệ đa tác tử có kiểm soát

Hệ thống là một tiến trình đa tác tử (multi-agent). Bốn agent chuyên trách là Planner, Generator, Pedagogy Critic và Editing Assistant cùng xử lý một yêu cầu tạo game. Mỗi agent là một LLM có prompt riêng, được gọi công cụ và chạy trong vòng lặp có số lượt tối đa và điều kiện dừng. Các agent phối hợp qua một bộ điều phối (Orchestrator) dạng máy trạng thái viết bằng code.

| Agent | Nhiệm vụ | Công cụ được gọi | Phối hợp với | Mức cam kết |
| --- | --- | --- | --- | --- |
| Planner | Hiểu ý định và bối cảnh; phân loại mô tả vào nhóm A–D (mục 5.3); đề xuất 3–5 loại game kèm lý do; hỏi lại khi mô tả mơ hồ; lập kế hoạch sinh, chính là bản thiết kế trò chơi GDD (Phụ lục B.1) | Đọc hồ sơ giáo viên, hồ sơ lớp và bộ nhớ sở thích; bảng đặc tính các loại game | Giáo viên (hỏi lại, chọn loại game); Generator (nhận kế hoạch) | Cam kết phần phân tích, phân loại, đề xuất; thử nghiệm phần hỏi lại |
| Generator | Sinh dữ liệu game theo loại đã chọn và theo lược đồ; sinh lại đúng các mục bị báo lỗi | RAG Yêu cầu cần đạt; quy tắc từng loại game; tìm ảnh | Validator; Pedagogy Critic | Cam kết |
| Pedagogy Critic | Chấm độc lập chất lượng sư phạm: đúng kiến thức, hợp lứa tuổi, bám Yêu cầu cần đạt; trả danh sách lỗi cụ thể cho từng mục | Giải bài để kiểm tra đáp án; RAG Yêu cầu cần đạt | Generator | Cam kết |
| Editing Assistant | Giáo viên sửa bằng lời, ví dụ "câu 3 khó quá, đổi hình con gà"; agent chọn công cụ để sửa đúng chỗ (UC-05, UC-06) | Sinh lại một câu; đổi độ khó; đổi ảnh; thêm hoặc xóa mục | Giáo viên; mọi bản sửa đi qua Validator và Safety | Cam kết |


Các thành phần còn lại không phải agent. Orchestrator, Input Guardrail, Validator (lớp 1 kiểm tra cấu trúc, lớp 2 kiểm tra nghiệp vụ), Safety (lớp 3 và kiểm duyệt), Media Preparer và Memory Service đều là dịch vụ xác định viết bằng code. Đây là các chốt chất lượng và an toàn, nên cùng một đầu vào phải luôn cho cùng một kết quả. Việc tra Yêu cầu cần đạt qua RAG cũng là công cụ để agent gọi, không phải một agent.

Các agent phối hợp với nhau ở hai vòng lặp chính. Vòng thứ nhất là Generator và Pedagogy Critic. Generator sinh nội dung, Critic phản biện và trả danh sách lỗi, rồi Generator sinh lại đúng các mục lỗi, tối đa 2 lượt. Vòng này giống cách một agent lập dàn ý đi cùng một agent phản biện trong các hệ viết nội dung nhiều lớp. Critic dùng prompt và ngữ cảnh riêng, không nhận lý giải của Generator, nên agent không tự chấm bài của mình. Vòng thứ hai là Planner và giáo viên. Planner hỏi lại khi thiếu thông tin quan trọng và đề xuất loại game, giáo viên trả lời hoặc chọn, rồi Planner chốt kế hoạch. Sau khi có bản nháp, Editing Assistant tạo thêm một vòng với giáo viên; mỗi bản sửa là một bản vá (patch) đi qua Validator và Safety trước khi hiện lại.


Hình 1. Luồng phối hợp của bốn agent. Ô xanh viền đậm là agent, ô xanh viền nét đứt là công cụ agent gọi, ô xám là dịch vụ xác định, ô vàng là giáo viên. Toàn bộ luồng do Orchestrator điều khiển.

Bảng dưới mô tả từng bước của luồng trên, kèm ngữ cảnh được dùng và rào chắn ở mỗi bước.

| Bước | Thành phần | Loại | Ngữ cảnh, bộ nhớ dùng | Rào chắn |
| --- | --- | --- | --- | --- |
| 1. Tiếp nhận | Input Guardrail | Xác định | — | Kiểm duyệt; giới hạn độ dài, ngôn ngữ, tần suất gọi |
| 2. Hiểu ý, phân loại, đề xuất | Planner | Agent | Hồ sơ giáo viên và lớp, sở thích đã học, bảng đặc tính loại game | Chỉ đề xuất trong danh mục; nhóm D nhận phương án thay thế; giáo viên chốt |
| 3. Kiểm tra kế hoạch | Validator | Xác định | Hồ sơ lứa tuổi | Kế hoạch sai luật thì Planner lập lại |
| 4. Sinh nội dung | Generator | Agent | Kế hoạch, Yêu cầu cần đạt qua RAG, ví dụ mẫu từ bộ nhớ | Đầu ra theo lược đồ; phiên bản prompt đóng băng |
| 5. Kiểm tra luật | Validator lớp 1, lớp 2 | Xác định | Phạm vi đã học của lớp | Lỗi thì không đi tiếp; sinh lại tối đa 2 lần |
| 6. Phản biện sư phạm | Pedagogy Critic | Agent | Khối lớp, Yêu cầu cần đạt, phạm vi đã học | Giới hạn lượt; kết quả là tham khảo có ngưỡng; hết lượt thì gắn cờ cho giáo viên |
| 7. An toàn | Safety lớp 3, kiểm duyệt | Xác định | — | Bắt buộc, không có đường vòng |
| 8. Media | Media Preparer | Xác định | Giọng đọc, phương ngữ | SafeSearch; kiểm duyệt hình |
| 9. Duyệt | Giáo viên | Con người | — | Bắt buộc xem thử trước khi xuất bản |
| 10. Sửa bằng lời | Editing Assistant | Agent | Game hiện tại, yêu cầu sửa, hồ sơ lớp | Mọi bản vá qua Validator và Safety |
| 11. Sử dụng | Live Arena, chơi ở nhà | Dịch vụ | — | Ẩn danh; không thu thông tin nhận dạng học sinh |
| 12. Học dần | Memory Service | Xác định | Tín hiệu hành vi | Chỉ dữ liệu tổng hợp; có thời hạn lưu |


Tám bước ở mục 3.2 được thực hiện bởi các thành phần này. Bước phân tích ý định do Planner đảm nhận, bước tra chương trình là công cụ RAG mà Generator và Critic gọi, bước sinh dữ liệu do Generator, còn bước kiểm tra dữ liệu do Validator và Pedagogy Critic cùng làm.

Orchestrator là một máy trạng thái. Mỗi yêu cầu đi qua các trạng thái tiếp nhận, lập kế hoạch, chờ giáo viên chọn, sinh, kiểm tra, phản biện, kiểm tra an toàn, chờ duyệt và đã xuất bản. Việc chuyển trạng thái do code quyết định dựa trên kết quả có cấu trúc của bước trước. Mỗi vòng lặp có số lượt tối đa, và mỗi game có ngân sách về số lần gọi model và thời gian, với mục tiêu dưới 60 giây theo KPI-01. Vượt ngân sách thì hệ thống dừng và báo giáo viên thay vì lặp tiếp. Vì luồng có nhiều lượt gọi LLM, tiến trình từng bước được đẩy lên giao diện để giáo viên thấy hệ thống đang làm gì.

Đề tài không để LLM tự quyết luồng như agent tự trị ở cấp 4, vì bốn lý do. Đối tượng là trẻ em nên cần đoán trước được hệ thống sẽ làm gì. Từng bước test được. Chi phí và độ trễ khống chế được. Giá trị của từng agent đo được, ví dụ số lỗi Critic bắt được mà Validator bỏ sót.

Luồng này kết hợp sáu mẫu điều phối phổ biến khi xây hệ thống dùng LLM.

| Mẫu điều phối | Ở đâu trong đề tài |
| --- | --- |
| Chuỗi bước (prompt chaining) | Planner, Generator, Critic nối tiếp nhau; đầu ra bước trước là đầu vào bước sau |
| Định tuyến (routing) | Planner phân loại A–D để chọn nhánh xử lý |
| Chạy song song (parallelization) | Gọi các công cụ độc lập cùng lúc, ví dụ tra Yêu cầu cần đạt và tìm ảnh; sinh nhiều bản để chọn bản tốt nhất (thử nghiệm) |
| Bộ điều phối và các agent (orchestrator–workers) | Orchestrator giao việc cho bốn agent |
| Đánh giá và sửa (evaluator–optimizer) | Generator và Pedagogy Critic |
| Con người trong vòng lặp (human-in-the-loop) | Planner hỏi lại; giáo viên chọn loại game, duyệt bản nháp, sửa bằng lời |


Mỗi agent có lược đồ đầu vào và đầu ra riêng, có phiên bản, gồm kế hoạch sinh (GenerationPlan), bản nháp game (GameDraft), danh sách lỗi (Issue) và bản vá. Nhờ vậy thay model hoặc prompt của một agent không ảnh hưởng agent khác. Mỗi lần sinh có một mã truy vết. Log ghi lại agent nào chạy, dùng model nào, mất bao lâu và tốn bao nhiêu; log này cũng là dữ liệu cho bảng generation_log của bộ nhớ.

## 4.5 Rào chắn: giữ hệ thống an toàn với trẻ nhỏ

Các rào chắn đã được nhắc ở nhiều mục được gom lại theo tám nhóm.

| Nhóm | Rào chắn | Mục liên quan |
| --- | --- | --- |
| Đầu vào | Input Guardrail kiểm duyệt nội dung không an toàn trong mô tả, giới hạn độ dài, ngôn ngữ và tần suất gọi; tệp giáo án .docx/.pdf tối đa 10MB | 3.2, 3.4 |
| Căn cứ chương trình | Không đủ YCCĐ làm căn cứ thì từ chối và nói rõ lý do | 3.2 bước 3 |
| Đầu ra; Pedagogy Critic phản biện sư phạm (tham khảo có ngưỡng) | Lược đồ cưỡng bức; validator 3 lớp; tính lại đáp án Toán bằng code; kiểm duyệt an toàn (moderation, danh mục từ cấm); hồ sơ lứa tuổi | 3.2 bước 5, Phụ lục B.3, B.4 |
| Thực thi | Đáp án chấm ở máy chủ; học sinh nhận bản game đã bỏ đáp án; không chạy code do AI viết trên máy học sinh | 3.2 bước 8, 5.3 |
| Dữ liệu học sinh | Vào chơi ẩn danh bằng biệt danh; không đưa dữ liệu học sinh vào lời gọi mô hình; kết quả lưu dạng tổng hợp theo câu | 1.2, 4.2, 4.3 |
| Con người; bản sửa của Editing Assistant cũng hiện lại để giáo viên duyệt | Giáo viên duyệt bản thiết kế và bản nháp trước khi xuất bản; hệ thống không thay thế âm thầm | 5.4 |
| Chi phí và vòng lặp | Sửa tối đa 2 lần; ngân sách số lần gọi model và thời gian cho mỗi game; timeout cho mỗi lời gọi; khi lỗi model thì chuyển sang model Gemini nhẹ hơn hoặc mẫu an toàn dự phòng | 3.2 bước 5, 4.4 |
| Truy vết | Mã truy vết, audit log và phiên bản prompt cho từng lần sinh | 4.4 |


# 5. Danh mục trò chơi và mô tả ngoài danh mục

## 5.1 Danh mục ba tầng

Hệ thống hiện có 10 cơ chế chơi, tương ứng 10 loại game trong DSL: Quiz, Matching, Drag & Drop phân loại, Memory Card, Ordering, Odd One Out, Word Scramble, Visual Cloze, Audio-Visual Match, Spot the Target. Mười cơ chế này là tập mẫu để so sánh với web tool, chưa phải giới hạn cuối cùng. Nhóm sẽ tìm thêm trò chơi cho Toán, Tiếng Việt và Tiếng Anh, kèm chủ đề và đồ họa tương ứng để trò chơi sinh động hơn.

Để trả lời rõ câu hỏi hệ thống có bao nhiêu loại trò chơi và để kiểm soát công sức mở rộng, danh mục được tách thành ba tầng.

| Tầng | Nội dung | Ví dụ | Công sức khi thêm mới |
| --- | --- | --- | --- |
| Cơ chế chơi | Cách trẻ thao tác và cách hệ thống chấm điểm; mỗi cơ chế là một loại game trong DSL | Kéo thả phân loại; cân thăng bằng | Cao: phiên bản DSL mới, factory, validator, trình hiển thị, prompt và bộ kiểm thử |
| Tựa game | Một cơ chế gắn với một kỹ năng môn học và cách trình bày cụ thể | "Câu cá số" = Quiz + đếm số + bối cảnh ao cá | Trung bình: chủ yếu là prompt và cấu hình |
| Chủ đề đồ họa (theme) | Lớp hình ảnh, nhân vật, âm thanh phủ lên cơ chế | Vũ trụ, đại dương, nông trại | Thấp: thêm chủ đề và asset, không thay đổi DSL |


Với cách tách này, nhiều ý tưởng "game mới" thực chất chỉ là đổi chủ đề đồ họa (nhóm B ở mục 5.3) và làm được ngay. Chỉ những ý tưởng cần thao tác mới hẳn mới phải bổ sung cơ chế.

Một tựa game mới được chọn khi thỏa năm điều kiện. Tựa game phải ứng với một Yêu cầu cần đạt cụ thể của môn và khối lớp. Trẻ Mầm non phải chơi được chỉ bằng thao tác chạm, không bắt buộc đọc chữ. Máy chủ phải xác định được đúng, sai rõ ràng để chấm tự động. Ràng buộc nội dung phải kiểm tra được bằng code, ví dụ tính lại đáp án Toán, để AI sinh nội dung ổn định. Cuối cùng, tựa game phải làm được điều mà công cụ theo mẫu không làm được hoặc làm kém. Bảng dưới là các ví dụ ban đầu, nhóm đang tìm thêm.

| Môn | Tựa game | Kỹ năng | Cơ chế |
| --- | --- | --- | --- |
| Toán | Đếm và chạm số đúng | Đếm, nhận biết số | Dùng lại Quiz |
| Toán | Cân thăng bằng | Cộng, so sánh | Cơ chế mới |
| Toán | Tia số nhảy cóc | Thứ tự số, cộng trừ | Cơ chế mới |
| Tiếng Việt | Ghép vần thành tiếng | Âm, vần | Dùng lại Word Scramble |
| Tiếng Việt | Sắp xếp từ thành câu | Câu | Dùng lại Ordering |
| Tiếng Việt | Tô nét chữ | Tập viết | Cơ chế mới; khó chấm tự động nên xếp vào nhóm D |
| Tiếng Anh | Nghe lệnh rồi làm theo | Nghe hiểu | Cơ chế mới |
| Tiếng Anh | Nghe âm, chọn hình | Phát âm | Dùng lại Audio-Visual Match |
| Tiếng Anh | Bingo từ vựng | Từ vựng | Cơ chế mới; hợp thi đấu theo phòng |


Mục tiêu dự kiến như sau. Cơ chế chơi tăng từ 10 (2 đã có trình hiển thị) lên 13–14, tức thêm 3–4 cơ chế mới, mỗi môn ít nhất một. Tựa game tăng từ 10 (mỗi cơ chế một tựa) lên 20–25 tựa cho ba môn, phần lớn dùng lại cơ chế có sẵn. Chủ đề đồ họa hiện đang thiết kế, mục tiêu 6–8 chủ đề, mỗi chủ đề dùng được cho nhiều cơ chế.

Về thứ tự, nhóm hoàn thiện trình hiển thị cho 10 cơ chế hiện có trước khi thêm cơ chế mới, vì mỗi cơ chế mới đều cần thêm một trình hiển thị. Tựa game và chủ đề đồ họa làm song song ngay vì không phụ thuộc trình hiển thị. Chủ đề được gắn vào cơ chế qua bảng tương thích cơ chế × chủ đề. AI nhận diện chủ đề từ mô tả của giáo viên, ví dụ "bối cảnh du hành vũ trụ", rồi đề xuất chủ đề đồ họa phù hợp, và giáo viên đổi được khi xuất bản. DSL v1.0.0 không thêm trường chủ đề. Mỗi cơ chế mới đi qua một quy trình cố định gồm DSL phiên bản mới, validator, trình hiển thị, prompt và bộ kiểm thử, để danh mục mở rộng mà không ảnh hưởng chất lượng.

## 5.2 Khi mô tả của giáo viên nằm ngoài danh mục

Hệ thống chỉ có một số cơ chế chơi đã định nghĩa, còn giáo viên mô tả theo nhu cầu dạy học chứ không theo danh sách đó. Khi mô tả không khớp cơ chế nào, hệ thống cần một cách xử lý rõ ràng, thay vì lặng lẽ ép vào cơ chế gần nhất hoặc để AI tự bịa ra một cơ chế không kiểm soát được. Thầy Thanh cũng nhấn mạnh điểm này. Web tool chỉ làm được trong khung có sẵn, còn AI tạo sinh phải tạo được trò chơi phù hợp với bối cảnh giáo viên mô tả, kể cả khi bối cảnh đó nằm ngoài kịch bản dựng sẵn.

Các ví dụ dưới đây do nhóm đặt ra để minh họa từng tình huống, chưa phải dữ liệu khảo sát thực tế.

| Môn | Giáo viên mô tả | So với hệ thống hiện tại | Nhóm tình huống |
| --- | --- | --- | --- |
| Tiếng Anh | "Ghép từ vựng con vật tiếng Anh cho lớp 2, nhưng cho các em chơi trong bối cảnh du hành vũ trụ" | Cơ chế Matching có sẵn; khác ở chủ đề và hình thức | B: cùng cơ chế, khác chủ đề |
| Tiếng Anh | "Bé nghe cô đọc put the apple in the basket rồi kéo quả táo vào giỏ" | Gần Drag & Drop kết hợp Audio-Visual Match, nhưng chưa có đúng cơ chế | C: gần mẫu, cần biến thể hoặc tựa mới |
| Toán | "Bé kéo các quả cân lên hai đĩa cân sao cho cân thăng bằng để hiểu phép cộng" | Cần mô phỏng cân và tính toán thăng bằng; không có trong 10 loại | D: ngoài mẫu |
| Tiếng Việt | "Bé tô theo nét để tập viết chữ cái đầu tiên" | Cần nhận nét vẽ; không có trong 10 loại | D: ngoài mẫu |


Đặc tả hiện tại chưa xử lý được tình huống này. UC-02 có luồng ngoại lệ cho tệp sai định dạng, kiến thức không hợp lứa tuổi, nội dung không an toàn và lỗi AI, nhưng chưa có luồng nào cho mô tả không khớp cơ chế chơi hiện có. Trường chọn thể loại (FLD-15) trong SRS mới liệt kê 4 loại cơ bản là Quiz, Matching, Drag & Drop, Memory Card, trong khi DSL và backend đã có 10 loại, nên hai tài liệu cần thống nhất. Ngoài ra, mới 2 trong 10 cơ chế (Quiz, Matching) có trình hiển thị, nên nhiều mô tả nằm trong danh sách cũng chưa chơi thử được trên giao diện. Khoảng trống này có thật trong đặc tả và cần bổ sung, không phải một tình huống hiếm có thể bỏ qua.

## 5.3 Nhóm mô tả A–D và mức sinh 1–4

Nhóm mô tả (A–D) trả lời câu hỏi giáo viên muốn gì. Mức sinh (1–4) trả lời câu hỏi hệ thống tạo game bằng cách nào. Hai thang đo dùng tên khác nhau để tránh nhầm lẫn. Mỗi mô tả được xếp vào một nhóm dựa trên mức độ khớp với danh mục cơ chế hiện có.

| Nhóm | Tình huống | Hệ thống làm gì | Mức sinh |
| --- | --- | --- | --- |
| A | Khớp với một loại game có sẵn | Sinh game theo luồng UC-02 | Mức 1 |
| B | Khớp cơ chế, khác chủ đề hoặc bối cảnh | Sinh theo cơ chế có sẵn và áp chủ đề đồ họa tương thích | Mức 2 |
| C | Gần một hoặc nhiều cơ chế, cần biến thể | Ghép các khối cơ chế trong ngân hàng cơ chế thành trò chơi mới | Mức 3 |
| D | Ngoài hẳn mọi cơ chế và khối có sẵn | Đề xuất 2–3 phương án gần nhất bằng mức 1–3; sinh code mới là hướng nghiên cứu | Mức 4 (nghiên cứu) |


| Mức | Cách tạo | AI được làm gì | Kiểm soát chất lượng | Trạng thái |
| --- | --- | --- | --- | --- |
| 1. Mẫu có sẵn | Sinh dữ liệu cho 10 loại game theo DSL v1.0.0 | Điền nội dung | Lược đồ và validator 3 lớp | Đang có |
| 2. Mẫu, tham số và chủ đề | Như mức 1, thêm tham số và chủ đề đồ họa | Chọn tham số trong biên cho phép, chọn chủ đề | Như mức 1, thêm bảng tương thích cơ chế × chủ đề | Thử nghiệm |
| 3. Ghép khối cơ chế | Lắp game từ các khối dựng sẵn trong bộ khối dựng Game Kit (thả vật, hứng, kéo vào đích, bộ đếm...) | Chọn, ghép khối và điền tham số; chỉ sinh JSON mô tả cách ghép | Luật tương thích giữa các khối, validator, QA tự động | Thử nghiệm |
| 4. Sinh code | AI viết HTML/JS chạy trong sandbox | Viết cả logic và giao diện | Sandbox, QA tự động; chỉ dùng để chơi thử | Hướng nghiên cứu |


Mức 1–3 giữ ba nguyên tắc nền của dự án: AI chỉ sinh JSON, giao diện chơi do trình hiển thị và chủ đề đồ họa quyết định, đáp án được chấm ở máy chủ. Mức 4 không giữ được cả ba nguyên tắc, vì code do AI viết chạy trên máy học sinh, đáp án nằm phía trình duyệt và đồ họa không thống nhất. Mức 4 vì vậy chỉ được xếp vào hướng nghiên cứu.

## 5.4 Luồng xử lý đề xuất và phản hồi cho giáo viên

Với mô tả nằm ngoài danh mục, luồng ở mục 3.2 được mở rộng thành các bước sau. Chi tiết kỹ thuật của từng thành phần ở Phụ lục B.

- Phân tích ý định, bóc tách mục tiêu học tập, môn, khối lớp, cơ chế chơi và chủ đề mà giáo viên mô tả.
- Xếp mô tả vào nhóm A, B, C hoặc D, kèm mức tin cậy và lý do.
- AI lập bản thiết kế trò chơi (GDD) có cấu trúc trước khi sinh game. Mục tiêu học tập trích dẫn Yêu cầu cần đạt lấy từ Curriculum-RAG.
- Bản thiết kế được kiểm tra bằng luật về cấu trúc, tính nhất quán, hồ sơ lứa tuổi và tích hợp nội tại. Lỗi được sửa ngay ở bản thiết kế, rẻ hơn nhiều so với sửa game đã sinh.
- Hệ thống chọn cơ chế từ ngân hàng cơ chế theo kỹ năng và độ tuổi, có thể ghép hai cơ chế tương thích.
- AI sinh DSL JSON (mức 1–2) hoặc JSON ghép khối (mức 3).
- Kết quả đi qua validator 3 lớp, kiểm chứng nội dung và kiểm duyệt an toàn. Lỗi cụ thể được gửi lại cho AI sửa, tối đa 2–3 vòng.
- Giáo viên xem tóm tắt "game này dạy gì, chơi thế nào", chơi thử, chỉnh sửa rồi xuất bản.
- Các mô tả nhóm C và D được lưu lại làm căn cứ bổ sung cơ chế mới vào ngân hàng cơ chế.
Phản hồi cho giáo viên khác nhau theo nhóm. Với nhóm A và B, giáo viên thấy tóm tắt bản thiết kế và bản nháp game như bình thường, rồi chơi thử, chỉnh sửa, xuất bản. Với nhóm C, hệ thống báo trước cách ghép kèm tóm tắt bản thiết kế, ví dụ "Hệ thống sẽ ghép trò chơi mới từ cơ chế Nghe lệnh và Kéo vào đích: bé nghe cô đọc rồi kéo đúng đồ vật vào giỏ." Giáo viên có thể duyệt bản thiết kế, chỉnh mô tả, hoặc dùng cơ chế gần nhất có sẵn. Với nhóm D, hệ thống báo "Hệ thống chưa hỗ trợ kiểu chơi này. Dưới đây là 2–3 cách khác đạt cùng mục tiêu học tập." Giáo viên chọn phương án thay thế hoặc gửi yêu cầu bổ sung cơ chế.

Luồng này tuân theo sáu nguyên tắc. Ở mức 1–3, AI chỉ sinh JSON; giao diện, đồ họa và âm thanh do trình hiển thị và chủ đề đồ họa quyết định; đáp án được chấm ở máy chủ. Mọi game đều đi qua bản thiết kế đã được kiểm tra bằng luật trước khi sinh. Hành động chơi phải là hành động học (tích hợp nội tại). Hệ thống không thay thế âm thầm, giáo viên luôn biết mô tả của mình được hiểu thành loại game nào và vì sao. Kiểm duyệt và validation áp dụng như nhau cho mọi nhóm mô tả. DSL v1.0.0 giữ nguyên; định dạng ghép khối và cơ chế mới được đưa vào phiên bản DSL mới, tương thích ngược.

# 6. Trải nghiệm cho trẻ: đồ họa, giao diện, âm thanh

Người chơi là trẻ nhỏ. Trẻ Mầm non chưa đọc được nên hình ảnh và giọng đọc là kênh chính, không phải chữ. Research của nhóm ghi nhận các điểm yếu của công cụ hiện có, gồm hình ảnh thiên về văn hóa phương Tây, lỗi font tiếng Việt có dấu và nội dung tĩnh. Thầy Thanh yêu cầu chất lượng về độ mượt, sức hấp dẫn và đồ họa phải hơn các web tool đã có, nên phần này cần mục tiêu, cách làm và cách đo cụ thể. Cách đo nằm ở thí nghiệm E6 (mục 8).

## 6.1 Nguyên tắc theo nhóm tuổi

Các nguyên tắc dưới đây là đề xuất thiết kế của nhóm, chưa kiểm chứng với trẻ thật. Chúng được lưu thành hồ sơ lứa tuổi (age profile) dạng dữ liệu để trình hiển thị áp dụng, không viết cứng trong từng game.

| Khía cạnh | Mầm non | Tiểu học |
| --- | --- | --- |
| Chữ | Rất ít, ưu tiên hình ảnh lớn | Có chữ, cỡ lớn, dễ đọc |
| Điều khiển | Chạm, nút lớn, ít thao tác, tránh kéo thả phức tạp | Kéo thả và nhiều bước hơn |
| Âm thanh | Tự đọc đề bằng giọng đọc, phản hồi bằng tiếng | Đọc đề là tùy chọn |
| Phản hồi | Tức thì và tích cực; sai thì khuyến khích thử lại, không phạt | Có điểm, bộ đếm thời gian nhẹ |
| Số lượng | Ít câu, mỗi màn hình một nhiệm vụ | Nhiều câu hơn, có thể thi đấu theo phòng |


## 6.2 Đồ họa, giao diện và âm thanh

Mọi game dùng chung một phong cách gồm một bộ bảng màu, kiểu bo góc, bóng đổ và nhân vật dẫn dắt, để sản phẩm trông có chủ đích thay vì ghép ảnh rời rạc. Hình ảnh hiện lấy từ Pexels (bật SafeSearch) và lưu trên S3. Ảnh stock ít phù hợp với trẻ nhỏ và văn hóa Việt Nam, nên nhóm đề xuất bổ sung một bộ minh họa SVG hoặc hình vẽ đóng gói sẵn theo các chủ đề gần gũi như con vật, trái cây, phương tiện, đồ dùng học tập. Hình do AI sinh chỉ được xem là hướng nghiên cứu, chưa cam kết. Chủ đề đồ họa là một lớp tách khỏi logic game, cho phép cùng một cơ chế hiển thị nhiều chủ đề (mục 5.1). Hoạt ảnh dùng khả năng của Konva cho phản hồi khi chọn đúng, chọn sai và khi hoàn thành màn chơi.

Vùng chạm phải đủ lớn, ở Mầm non lớn hơn Tiểu học, và khoảng cách giữa các nút đủ rộng để tránh bấm nhầm. Font phải hỗ trợ đầy đủ tiếng Việt có dấu và được kiểm tra thực tế trên các trình duyệt, vì lỗi font là vấn đề đã được ghi nhận. Giao diện phải hiển thị tốt trên ba ngữ cảnh là máy chiếu lớp học, máy tính bảng và điện thoại của phụ huynh. Độ tương phản đủ rõ, và đúng sai được báo bằng cả biểu tượng và âm thanh chứ không chỉ bằng màu.

Giọng đọc dùng Google Text-to-Speech, giọng Nam hoặc Nữ. Ở Mầm non hệ thống tự đọc đề; với tiếng Anh cần kiểm tra chất lượng phát âm. Hiệu ứng âm thanh dùng cho lúc đúng, sai và hoàn thành; nhạc nền nhẹ và có nút tắt tiếng. Trình duyệt không cho tự phát âm thanh trước lần chạm đầu tiên của người dùng, nên mỗi game cần một màn hình "Bắt đầu" để mở khóa âm thanh. Hiệu ứng và nhạc chỉ dùng loại có giấy phép rõ ràng.

## 6.3 Hiện thực trong kiến trúc

AI không vẽ đồ họa. LLM chỉ sinh JSON dữ liệu theo DSL; hình dạng, màu sắc, hoạt ảnh và âm thanh do trình hiển thị Konva, chủ đề đồ họa và kho asset có sẵn quyết định. Nhờ vậy chất lượng thị giác ổn định và kiểm soát được, không phụ thuộc vào kết quả của mỗi lần sinh, và có cơ sở để giữ chất lượng đồ họa khi mở rộng sang game mới (nhóm C, D ở mục 5.3). Chủ đề đồ họa và hồ sơ lứa tuổi nằm ở lớp riêng, không phải sửa DSL v1.0.0 đang đóng băng. Nếu cần thêm trường chọn chủ đề vào JSON thì phải tăng phiên bản DSL.

# 7. Kiến trúc và tiến độ

Luồng xử lý chính đã trình bày qua ví dụ ở mục 3.2. Bảng dưới liệt kê công nghệ thực tế của dự án.

| Tầng | Công nghệ thực tế của dự án |
| --- | --- |
| Backend | Spring Boot 4.1 trên Java 21, modular monolith; JWT cho giáo viên và quản trị |
| AI | LangChain4j với Gemini (structured output theo schema); không dùng OpenAI GPT |
| Dữ liệu | PostgreSQL, pgvector cho tra cứu YCCĐ; S3 lưu hình và âm thanh, cơ sở dữ liệu chỉ giữ khóa đối tượng |
| Frontend | React 19, TypeScript, Vite; trình hiển thị game bằng Konva; không dùng PixiJS hay @dnd-kit |
| Giọng đọc | Google Text-to-Speech, giọng Nam hoặc Nữ |
| Thời gian thực | Spring WebSocket với STOMP (broker trong bộ nhớ, đủ cho quy mô đồ án) |


JSON DSL phiên bản 1.0.0 và System Prompt phiên bản 1.0.0 đã đóng băng để phục vụ đo đạc thực nghiệm. Mọi thay đổi phải tạo phiên bản mới có mã băm SHA-256 và ghi nhật ký. Tiến độ các thành phần lõi theo Plan như sau.

| Thành phần | Trạng thái | Ghi chú |
| --- | --- | --- |
| Xác thực JWT, phân quyền giáo viên và quản trị | Hoàn thành | Đăng ký, đăng nhập, làm mới phiên, đăng xuất |
| Game JSON DSL v1.0.0 | Hoàn thành, đã đóng băng | Lược đồ cùng các ví dụ; thay đổi sau này phải tăng phiên bản và tương thích ngược |
| Thiết kế pipeline sinh game | Hoàn thành | Intent Parser, tra YCCĐ, Generator, Validation, Safety, Media |
| Dịch vụ sinh game và factory các loại game | Đang làm (khoảng 60%) | Đã có factory cho 10 loại game; chưa có endpoint gọi từ giao diện |
| Validation 3 lớp | Đang làm (khoảng 90%) | Kiểm tra cú pháp, lược đồ và logic trước khi lưu |
| Kiểm duyệt an toàn | Đang làm (khoảng 70%) | Đã có moderation và danh mục từ cấm; chưa cập nhật nóng |
| Trình hiển thị trên Konva | Mới 2/10 loại: Quiz, Matching | 8 loại còn lại (kéo thả phân loại, lật thẻ, ghép thứ tự, tìm điểm khác biệt, ghép âm thanh hình ảnh, tìm mục tiêu, sắp xếp chữ, điền khuyết hình) chưa có trình hiển thị |
| Kho YCCĐ và Curriculum-RAG | Chưa bắt đầu | Đang ở bước kiểm chứng kỹ thuật (spike) |
| Teacher Portal và Workspace Editor | Đang làm | Portal khoảng 50%; Workspace Editor mới là khung |
| Chơi theo phòng (Live Arena) và giao diện học sinh | Chưa bắt đầu | Phụ thuộc kết quả kiểm chứng WebSocket |


# 8. Kế hoạch chứng minh

Đề tài đưa ra bốn khẳng định khác biệt. Đến thời điểm hiện tại, cả bốn còn là giả thuyết; số liệu sẽ có sau các thí nghiệm E1 đến E6. Thí nghiệm E7 đo riêng giá trị của bộ nhớ (mục 4.3).

- K1. Từ một câu mô tả ra game chơi được, nhanh hơn làm trên web tool. Chứng minh bằng E1; chưa đo.
- K2. Nội dung đúng chương trình và đúng đáp án, không bịa nội dung vượt lớp. Chứng minh bằng E2, E3, E4; chưa đo, RAG mới chạy ngoại tuyến.
- K3. Lần nào cũng ra game chơi được và hợp lứa tuổi, ổn định và an toàn hơn tự vibe code. Chứng minh bằng E5; chưa đo.
- K4. Thiết kế trò chơi chứ không chỉ gắn câu hỏi, một bộ dữ liệu ra nhiều cơ chế chơi và thao tác chơi cũng là thao tác học. Chứng minh bằng E6; chưa đo.
| Thí nghiệm | Cách làm | Chỉ số | Ngưỡng đạt | Điều kiện cần |
| --- | --- | --- | --- | --- |
| E1. Thời gian tạo (K1) | 5 bài mẫu, 3–5 người làm trên Wordwall và trên hệ thống, bấm giờ | Thời gian trung bình mỗi bài | Hệ thống dưới 60 giây (KPI-01) | Luồng sinh chạy được từ đầu đến cuối |
| E2. Chất lượng nội dung (K2) | Sinh tối thiểu 50 câu hỏi, giáo viên chấm theo YCCĐ | Tỷ lệ ảo giác; tỷ lệ dùng được ngay; tỷ lệ trường phải sửa; tỷ lệ phải tạo lại | Ảo giác dưới 5%; dùng ngay ≥75% (KPI-02); sửa ≤25% (KPI-03); tạo lại ≤10% (KPI-04) | Giáo viên chấm; bảng chấm thống nhất |
| E3. Kiểm chứng Toán (K2) | 100 câu Toán do AI sinh, chạy qua bộ kiểm chứng bằng code | Số câu sai đáp án trước và sau kiểm chứng | Không câu sai nào lọt qua | Code kiểm chứng Toán |
| E4. Truy xuất chương trình (K2) | Bộ câu giáo viên viết tự nhiên, nhãn do người khác gắn, chia tập dev và test | Hit@3; tỷ lệ từ chối oan; tỷ lệ chấp nhận sai | Nhóm chốt ngưỡng trước khi chạy tập test | Kết nối Supabase ổn định; bộ đánh giá mới |
| E5. So với vibe code (K3) | 20 mô tả từ bộ mô tả chuẩn, chạy trên Gemini Canvas và trên hệ thống | Tỷ lệ game chạy được; lỗi đáp án; vi phạm luật lứa tuổi; độ khác nhau giữa các lần chạy | Hệ thống tốt hơn ở cả bốn chỉ số | Bộ mô tả chuẩn (Phụ lục B.6) |
| E6. Sức hấp dẫn (K4) | Cùng một bài (ví dụ ghép từ vựng) trên Wordwall và trên hệ thống; giáo viên, nếu được thì vài trẻ, chơi thử | Điểm hấp dẫn, đúng bài, dễ dùng (thang 1–5); tỷ lệ hoàn thành màn chơi; thời gian tải và độ mượt; Lighthouse (hiệu năng, khả năng tiếp cận) và hiển thị font tiếng Việt trên nhiều thiết bị | Hệ thống không thấp hơn Wordwall | Ít nhất 2 trình hiển thị có đồ họa hoàn chỉnh |
| E7. Giá trị của bộ nhớ (mục 4.3) | Cùng bộ mô tả chuẩn, sinh có và không có ví dụ lấy từ bộ nhớ | Tỷ lệ dùng được ngay; số vòng sửa trung bình | Có ví dụ từ bộ nhớ cho kết quả tốt hơn | Bộ nhớ đã có đủ game được giáo viên duyệt |


Phần mô tả nằm ngoài danh mục (mục 5) và luồng điều phối (mục 4.4) có thêm các chỉ số riêng, hiện ở mức đề xuất.

- Tỷ lệ xếp đúng nhóm A–D trên bộ mô tả chuẩn có nhãn.
- Tỷ lệ ba cơ chế được chọn đầu tiên (top-3) có chứa cơ chế đúng.
- Tỷ lệ bản thiết kế qua kiểm tra luật ngay lần đầu và số vòng sửa trung bình.
- Số câu Toán sai đáp án trước và sau bước kiểm chứng.
- 100% mô tả nhóm D nhận phản hồi rõ ràng, không sinh game sai cơ chế.
- Số lượt gọi model, thời gian và chi phí cho mỗi game, so với KPI-01 (dưới 60 giây).
- Cùng bộ mô tả chạy trên Wordwall, Gemini Canvas và hệ thống; giáo viên chấm mức đúng bài, hấp dẫn và dễ dùng.
- Độ trễ và chi phí theo từng agent trong luồng điều phối (mục 4.4).
- Số lỗi Pedagogy Critic bắt được mà Validator bỏ sót, trên bộ mô tả chuẩn.
Với 3–5 giáo viên, kết quả chỉ là bằng chứng ban đầu, chưa phải kết luận thống kê. Báo cáo sẽ ghi số liệu thô và nói rõ cỡ mẫu. E3 làm trước vì dễ làm và có số liệu ngay, sau đó E5 vì trả lời trực tiếp câu hỏi về vibe code, rồi E1. E2 và E6 cần giáo viên thật nên làm khi luồng sinh đã ổn định. E4 làm song song cùng nhánh RAG. E7 làm khi bộ nhớ đã có đủ game được giáo viên duyệt. Tiếng Việt có dấu, hình ảnh gần gũi và việc bám GDPT 2018, chương trình Giáo dục mầm non được kiểm tra gián tiếp qua E2 và E6.

# 9. Phạm vi, cam kết và rủi ro

Trong phạm vi gồm ba môn Toán, Tiếng Việt, Tiếng Anh ở Mầm non và Tiểu học; sinh game theo mô tả hoặc giáo án, chơi thử, chỉnh sửa, xuất bản bằng mã, URL, QR, với học sinh vào ẩn danh; kiểm duyệt an toàn và kiểm tra chất lượng nội dung nhiều lớp.

Ngoài phạm vi gồm quản lý hành chính nhà trường, điểm danh, sổ điểm; chấm tự luận; trò chơi 3D, VR, AR; thanh toán và mua bán học liệu; điều chỉnh độ khó theo từng học sinh.

Phần mở rộng danh mục, xử lý mô tả ngoài danh mục và các thành phần AI Native (mục 4) được chia ba mức cam kết.

| Mức | Nội dung |
| --- | --- |
| Cam kết | Nhóm A đầy đủ; nhận diện nhóm A–D và phản hồi đúng; bản thiết kế trò chơi (GDD) và kiểm tra bằng luật; ngân hàng cơ chế khởi đầu từ 10 loại hiện có, gắn nhãn kỹ năng và độ tuổi; hồ sơ lứa tuổi dùng chung; kiểm chứng Toán bằng code; bộ mô tả chuẩn. Bộ điều phối bằng code với mã truy vết và log từng bước; ghi log sinh game, log chỉnh sửa, thống kê kết quả theo câu và yêu cầu cơ chế mới; điền sẵn môn và khối lớp từ hồ sơ giáo viên. Hồ sơ lớp gồm bộ sách và phạm vi đã học; mục đích và hình thức chơi. Agent Generator, Pedagogy Critic, Editing Assistant; phần phân tích, phân loại và đề xuất của Planner. |
| Thử nghiệm | Nhóm B (mức 2: chủ đề); nhóm C (mức 3: ghép khối trên bộ khối dựng Konva); vòng sửa có phản hồi lỗi; sinh nhiều bản và chọn bản tốt nhất (best-of-N) nếu ngân sách cho phép; LLM chấm tích hợp nội tại (chỉ cảnh báo). Bộ nhớ, theo thứ tự ưu tiên: tạo game ôn tập từ lỗi của lớp; ví dụ mẫu lấy từ bộ nhớ (đo bằng E7); gợi ý chủ đề và cơ chế theo lịch sử của giáo viên. Hỏi lại khi thiếu thông tin; suy ra phạm vi đã học từ giáo án. |
| Hướng nghiên cứu | Nhóm D bằng mức 4 (sinh code trong sandbox, chỉ để chơi thử); VLM chấm ảnh chụp game. Để LLM tự lập kế hoạch luồng (agent tự trị); tự cải thiện prompt và tự bổ sung ngân hàng cơ chế từ log. Gợi ý cho phụ huynh sau khi trẻ chơi ở nhà. |


| Rủi ro | Cách giảm |
| --- | --- |
| Mới 2/10 loại game có trình hiển thị | Ưu tiên hoàn thiện nhóm P0; nói rõ phần còn lại là mở rộng |
| Chất lượng nội dung do AI sinh | Validation nhiều lớp, tính lại đáp án Toán bằng code, bộ mô tả chuẩn để kiểm hồi quy khi đổi prompt hoặc mô hình |
| Mô tả ngoài danh mục cơ chế | Phân loại nhóm A–D và phản hồi rõ cho giáo viên (mục 5) |
| Chi phí gọi mô hình và số người dùng đồng thời | Dự toán chi phí, tuyên bố con số mục tiêu rồi kiểm tra tải |
| Mở rộng quá phạm vi khi đòi sinh game tự do | Chọn mức cam kết rõ ràng như bảng trên và có điểm dừng an toàn |
| Bộ nhớ học sai từ game kém chất lượng | Chỉ học từ game vừa qua validator vừa được giáo viên duyệt; thêm vào ngân hàng cơ chế phải có người duyệt (mục 4.3) |
| Chi phí và độ trễ tăng khi thêm agent | Ngân sách lời gọi và thời gian cho mỗi game; đo độ trễ, chi phí theo từng agent; chỉ bật agent thử nghiệm khi số liệu cho thấy đáng (mục 4.4) |


# Phụ lục A. Mô tả các công cụ khảo sát

Thông tin về sản phẩm bên ngoài lấy từ trang giới thiệu và tài liệu của nhà cung cấp. Cột "Hạn chế" là đánh giá của nhóm.

| Công cụ | Cơ chế chính | Điểm học hỏi | Hạn chế so với đề tài |
| --- | --- | --- | --- |
| Wordwall | Mẫu có sẵn, nhiều định dạng trò chơi | Phổ biến ở Việt Nam; đổi mẫu giữ nội dung | Giáo viên vẫn tự soạn nội dung |
| Kahoot | Quiz thi đua trực tiếp theo thời gian thực | Mạnh ở lớp học đồng bộ | Chủ yếu trắc nghiệm |
| H5P | Mã nguồn mở, nội dung tương tác lồng trong bài giảng | Kiến trúc tách dữ liệu và hiển thị | Thiên về video, trình chiếu hơn là game độc lập |
| Canva Education | Thiết kế đa năng, có AI (Magic Activities) | Học liệu trực quan | Ít trò chơi thao tác |
| Curipod | Sinh bài thuyết trình, thăm dò ý kiến | AI sinh bài giảng | Không sinh trò chơi kéo thả |
| Gameer.io, Worky Genie | Sinh game hoặc quiz từ prompt | Hướng tiếp cận prompt-to-game | Vẫn bắt chọn định dạng trước (đánh giá của nhóm) |
| Educaplay | Nhiều định dạng HTML5; AI sinh câu hỏi gán vào mẫu | Nhúng được vào LMS | Đồ họa cứng; AI tối ưu cho tiếng Anh; bản miễn phí có quảng cáo |
| Educandy | Một danh sách từ sinh ra nhiều trò chơi nhỏ | Một nội dung, nhiều trò chơi | Chỉ xoay quanh từ vựng; không có AI |
| Blooket | Câu hỏi lồng vào các thể loại game (thủ thành, đào vàng) | Gắn câu hỏi vào cơ chế hấp dẫn | Bản chất trắc nghiệm chữ; thiếu kéo thả |
| Gimkit | Kinh tế ảo, chế độ nhập vai 2D | Tạo động lực qua phần thưởng | Cần thiết bị riêng; phức tạp với trẻ nhỏ |
| Quizalize | Thi đấu trực tiếp; chia nhóm theo kết quả | Phân hóa theo kết quả làm bài | Hướng tới học sinh lớn |
| TinyTap | Sách nói, trò chơi chạm và nghe cho trẻ nhỏ; AI tạo chuỗi hoạt động | Giọng đọc, hình minh họa cho trẻ chưa biết đọc | Nội dung theo ngữ cảnh nước ngoài; chi phí thuê bao |
| Boom Cards | Thẻ nhiệm vụ số: kéo thả, chọn hình, âm thanh, tự chấm | Tương tác chạm và giọng đọc hướng dẫn | Dựng thủ công từng vùng tương tác, tự ghi âm |
| Baamboozle | Thi đấu theo đội trên một màn hình chung | Không cần thiết bị cho học sinh | Chỉ dạng lật ô câu hỏi; không chơi cá nhân ở nhà |
| Plickers | Thẻ giấy in mã, giáo viên quét bằng camera | Giải pháp cho lớp không có thiết bị | Chỉ trắc nghiệm A/B/C/D |
| Genially | Escape room, board game tương tác, đồ họa đẹp | Chất lượng hình ảnh và hiệu ứng | Dựng thủ công rất lâu |
| Nearpod, Lumio | Bài giảng đồng bộ, chèn trò chơi nhỏ giữa các slide | Đồng bộ màn hình giáo viên và học sinh | Bản quyền cấp trường; phụ thuộc đường truyền |
| ClassPoint | Add-in PowerPoint: câu hỏi, kéo thả trên slide | Tận dụng slide có sẵn | Phụ thuộc PowerPoint; không xuất thành game web |
| Pear Deck | Add-on Slides/PowerPoint: kéo chấm, vẽ trên slide | Bảng điều khiển của giáo viên | Slide tĩnh; mỗi học sinh cần một thiết bị |
| Edpuzzle | Chèn câu hỏi vào điểm dừng của video | Kiểm soát việc xem video | Không có tương tác thao tác |
| Liveworksheets | Biến phiếu PDF thành bài tập số tự chấm | Số hóa tài liệu giấy | Tĩnh, thiếu tính trò chơi |
| Wizer.me | Phiếu bài tập số nhiều dạng tương tác; AI gợi ý câu hỏi | Gắn nhãn vị trí trên tranh | Mang tính phiếu kiểm tra |
| Seesaw | Vẽ, ghi âm, kéo thả; AI chuyển tài liệu thành hoạt động | Hiểu tâm lý trẻ nhỏ | Mô hình LMS, cần tài khoản; không có thi đấu trực tiếp |
| LearningApps | Hơn 20 khối tương tác, nhúng bằng iFrame | Tách dữ liệu và hiển thị; phản hồi tức thì | Giao diện cũ; nhập tay |
| BookWidgets | Nhiều widget tương tác nhúng vào LMS | Bảng vẽ cho Toán; tự chấm nhiều dạng | Theo mẫu, nhập tay; chi phí cao |
| Flippity | Bảng tính Google Sheets thành nhiều hoạt động | Dữ liệu tách rời giao diện | Đồ họa thô; nhập sai cú pháp làm hỏng game |
| Classtime | Thử thách hợp tác: cả lớp cùng mở dần một bức tranh trên màn hình chung | Giảm áp lực cạnh tranh | Trắc nghiệm chữ; cần thiết bị riêng |
| Quizlet, Quizlet Live | Flashcard; đấu đội phải trao đổi để tìm đáp án | Đồng bộ thời gian thực, hợp tác nhóm | Hướng tới học sinh lớn, nhiều chữ |
| Toy Theater, ABCya | Trò chơi thao tác trực quan: cân, đồng hồ, que tính | Tương tác trực quan cho trẻ chưa biết đọc | Game viết cứng, giáo viên không sửa được |
| PhET | Mô phỏng toán và khoa học, mã nguồn mở | Chuẩn mực sư phạm trực quan | Viết cứng, giáo viên không tạo mới được |
| Prodigy | Game nhập vai, giải toán để ra chiêu | Giữ chân học sinh tốt | Hệ thống đóng; đồ họa nặng |
| Deck.Toys | Bài học dạng bản đồ phiêu lưu, mở khóa từng chặng | Dẫn dắt bằng cốt truyện | Dựng mất nhiều giờ; quá tải với trẻ nhỏ |
| Breakout EDU | Phòng thoát hiểm số với các ổ khóa ảo | Tư duy logic, hợp tác | Dựng thủ công; hợp với lớp 4–5 trở lên |
| Diffit, MagicSchool | AI điều chỉnh độ khó văn bản, sinh câu hỏi, xuất Forms/Slides | Phân tích và phân cấp tài liệu | Chỉ sinh nội dung tĩnh |
| Eduaide.ai | AI sinh kịch bản trò chơi lớp học (Jeopardy, Bingo...) | Tổ chức câu hỏi thành luật chơi | Đầu ra là văn bản hoặc PDF, không có phần chạy trò chơi |
| Gemini Canvas | AI viết code HTML/JS cho từng game | Linh hoạt, sinh được game mới | Khó kiểm soát chất lượng và an toàn (mục 2.2) |


# Phụ lục B. Chi tiết kỹ thuật cho phần mô tả ngoài danh mục

## B.1 Bản thiết kế trò chơi (GDD) và tích hợp nội tại

Thay vì sinh thẳng game, AI sinh trước một bản thiết kế ngắn theo lược đồ cố định. Bản thiết kế chỉ vài chục dòng JSON, được kiểm tra trong mili-giây bằng code Java, có unit test, và giáo viên đọc được. Ví dụ với mô tả "game cho bé lớp 1 học phép cộng trong phạm vi 10":

{

  "title": "Hái táo cho thỏ",

  "audience": { "gradeLevel": "GRADE_1" },

  "learningObjective": { "yccdRef": "<chunkId từ Curriculum-RAG>",

                         "statement": "Cộng hai số có tổng không quá 10" },

  "coreLoop": { "playerAction": "Kéo táo vào giỏ cho đủ số thỏ yêu cầu",

                "learningAction": "Cộng để đạt tổng mục tiêu" },

  "mechanics": ["drag-to-target", "counter"],

  "winCondition": "Hoàn thành 5 yêu cầu của thỏ",

  "failureHandling": { "mode": "GENTLE_RETRY", "timer": false, "lives": false }

}


Quy tắc quan trọng nhất của bản thiết kế là tích hợp nội tại, nghĩa là thao tác người chơi làm để chơi phải đồng thời là thao tác học. Ở tích hợp ngoại lai, nhân vật chạy nhảy và thỉnh thoảng hiện câu hỏi "2 + 3 = ?"; chơi và học tách rời, bé dễ đoán bừa để qua ải. Ở tích hợp nội tại, bé kéo táo vào giỏ cho đủ tổng thỏ yêu cầu, nên chơi tốt nghĩa là hiểu phép cộng.

Kahoot và Wordwall gắn câu hỏi vào một khung trò chơi có sẵn. Hệ thống của nhóm thiết kế trò chơi sao cho thao tác chơi cũng là thao tác học, và điểm khác biệt này kiểm tra được bằng máy. Bản thiết kế bắt buộc có hai trường playerAction và learningAction, được so khớp qua bảng tương thích giữa kỹ năng và hành động. Thêm một lượt LLM chấm theo câu hỏi "nếu bỏ nội dung học đi, game còn chơi được không?", chỉ dùng để cảnh báo.

## B.2 Ngân hàng cơ chế (pattern bank)

Ngân hàng cơ chế là kho công thức cơ chế chơi đã được tuyển chọn. AI không nghĩ từ đầu mà chọn công thức phù hợp rồi biến tấu, giống cách kỹ sư áp dụng design pattern. 10 cơ chế hiện có là các mục đầu tiên của kho. Mỗi mục gồm nhãn kỹ năng (đếm, phân loại, sắp xếp...) và cấp học phù hợp; dạng nội dung phù hợp, để tránh gán nội dung không hợp với cơ chế; các tham số AI được phép chỉnh, có biên để validator kiểm tra được; các khối dựng trong bộ khối dựng Game Kit mà cơ chế sử dụng, để AI lắp ráp thay vì viết lại logic; và các điều cần tránh cùng một game mẫu chạy được để làm ví dụ cho AI.

Mục tiêu khởi đầu là 15–25 mục. Khi kho còn dưới 30 mục, hệ thống lọc theo nhãn và để LLM chọn, chưa cần tìm kiếm vector. Ngân hàng cơ chế tương ứng với tầng cơ chế chơi trong danh mục ở mục 5.1.

## B.3 Hồ sơ lứa tuổi kiểm tra được bằng máy

Kinh nghiệm thiết kế cho trẻ nhỏ được viết thành dữ liệu cấu hình, gồm bốn nhóm luật. Nhóm đọc quy định số chữ và lời đọc. Nhóm thao tác quy định vùng chạm và cử chỉ. Nhóm nhịp độ và xử lý khi sai quy định đồng hồ, mạng sống và cách phạt. Nhóm nhận thức quy định số lựa chọn và số đối tượng cùng lúc. Luật chia hai mức. ERROR chặn những gì ảnh hưởng an toàn hoặc khả năng dùng được; WARNING là gợi ý, giáo viên có thể ghi đè. Mỗi luật ghi nguồn và độ tin cậy. Các giá trị số hiện là giá trị khởi điểm, cần kiểm chứng với cô Thơ và giáo viên.

Cùng một hồ sơ được dùng ở ba chỗ: kiểm tra bản thiết kế, đưa vào prompt khi sinh, và QA sau sinh. Hồ sơ này cũng là nguồn cho cấu hình giao diện phía học sinh, nên luật và giao diện không mâu thuẫn nhau. Hồ sơ luật chia mịn hơn khung giao diện, nhưng cả hai đều suy ra từ cùng trường gradeLevel.

| Khối lớp (DSL) | Hồ sơ luật | Khung giao diện |
| --- | --- | --- |
| KINDERGARTEN (3–6 tuổi) | Mầm non | Bé |
| GRADE_1 | Lớp 1–2 | Bé |
| GRADE_2 | Lớp 1–2 | Học sinh |
| GRADE_3 đến GRADE_5 | Lớp 3–5 | Học sinh |


## B.4 Kiểm chứng nội dung độc lập

Thành phần tạo ra nội dung không được tự chấm nội dung đó. Càng chắc chắn thì càng chặn cứng; càng không chắc thì càng gắn cờ cho giáo viên xem.

| Loại nội dung | Cách kiểm chứng | Khi phát hiện sai |
| --- | --- | --- |
| Toán: tính toán, đếm, thứ tự, so sánh | Tính lại bằng code | Chặn và sinh lại |
| Chính tả, quy tắc rõ ràng | Code, regex và từ điển | Chặn |
| Kiến thức có nguồn chuẩn (YCCĐ, từ vựng SGK) | Đối chiếu nguồn | Gắn cờ hoặc sinh lại |
| Kiến thức tổng quát | Lượt kiểm tra thứ hai bằng một model Gemini khác, prompt độc lập | Gắn cờ cho giáo viên |


Dự án chỉ dùng Gemini, nên mô hình khác ở đây là một model Gemini khác với prompt và ngữ cảnh độc lập. Nhóm ghi nhận điểm này là một giới hạn đã biết.

## B.5 Kỹ thuật hấp dẫn

Mỗi thao tác có phản hồi nhìn hoặc nghe thấy trong khoảng 200 ms. Hiệu ứng và âm thanh nhẹ, chuyển động mượt, âm ngắn dễ chịu, không nhấp nháy mạnh và có nút tắt tiếng. Bé luôn biết mình đang ở câu mấy và còn bao nhiêu câu. Mỗi phiên chơi chỉ vài phút và có điểm kết thúc tự nhiên.

Hệ thống tránh đồng hồ gây áp lực và mạng sống với Mầm non, mất chuỗi ngày chơi, phần thưởng ngẫu nhiên, phạt nặng khi sai và tự chạy ván tiếp. Có một ngoại lệ có chủ đích. Thi đấu theo phòng ở lớp 2–5 vẫn có bảng xếp hạng nhưng giới hạn: tivi chỉ hiện top 5, thứ hạng riêng chỉ hiện trên máy từng học sinh, và khung Bé không có xếp hạng. Các luật này nằm sẵn trong bộ khối dựng và hồ sơ lứa tuổi để mọi game tự tuân thủ.

## B.6 Quy trình nhiều bước và bộ mô tả chuẩn

Pipeline được chia thành các bước nhỏ, mỗi bước có đầu vào, đầu ra và cách kiểm tra riêng, gồm đầu ra có lược đồ cưỡng bức, lập bản thiết kế, sinh game, kiểm tra, và sửa có phản hồi lỗi. Kỹ thuật sinh nhiều biến thể rồi chọn bản điểm cao nhất (best-of-N) chỉ bật khi số liệu cho thấy đáng chi phí.

Bộ mô tả chuẩn (golden prompts) gồm 30–50 mô tả mẫu, phủ ba môn, hai cấp học, mô tả rõ và mơ hồ, ý tưởng quen và độc đáo, kèm vài ca xấu. Bộ này được chạy lại mỗi khi đổi prompt, bộ khối dựng hoặc model để phát hiện hồi quy, đồng thời đo giá trị của từng bước được thêm vào pipeline.

## B.7 Ví dụ ngữ cảnh được ghép khi sinh game

Với ví dụ "đếm con vật" ở mục 3.2, ngữ cảnh gửi cho bước sinh dữ liệu game có dạng sau (rút gọn).

[Vai trò] Sinh dữ liệu trò chơi Quiz theo lược đồ, không thêm trường ngoài lược đồ.

[Yêu cầu của giáo viên] "Cho bé lớp 1 ôn đếm con vật từ 1 đến 5,

                         chơi trong bối cảnh nông trại"

[Phân tích] mục tiêu: đếm trong phạm vi 5; chủ đề: nông trại; số câu: 5

[Chương trình] [math-g1-001] Đếm, đọc, viết được các số trong phạm vi 10…

               Nguồn: Thông tư 32/2018, trang in 21

[Hồ sơ lớp] Bộ sách Kết nối tri thức; đã học số đến 10; nhiều em chưa đọc được

[Tình huống] Củng cố cuối tiết, trình chiếu cả lớp, khoảng 5 phút

[Hồ sơ lứa tuổi Bé] tối đa 3 lựa chọn; câu ngắn; có lời đọc

[Lược đồ] { … JSON Schema của Quiz … }

[Ví dụ mẫu] { … một game Quiz lớp 1 giáo viên đã dùng nguyên văn … }


## B.8 Dữ liệu lưu cho bộ nhớ

Các bảng dưới nằm trong PostgreSQL, cùng cơ sở dữ liệu với hệ thống.

| Bảng | Nội dung |
| --- | --- |
| generation_log | Mỗi lần sinh: mã truy vết, mô tả, phiên bản prompt, model, thời gian, chi phí, số lần sửa, kết quả |
| edit_log | Trường nào bị giáo viên sửa, sửa thành gì, có làm lại toàn bộ hay không |
| item_play_stats | Thống kê tổng hợp theo câu: số lượt, tỷ lệ đúng, số lần thử, đáp án sai phổ biến |
| teacher_profile | Môn, khối lớp, chủ đề đã dùng, cơ chế hay chọn |
| accepted_examples | Game được giáo viên dùng nguyên văn, kèm vector để tìm ví dụ |
| mechanic_requests | Mô tả nhóm C, D, phục vụ bổ sung cơ chế mới |


# Phụ lục C. Thuật ngữ

| Thuật ngữ | Nghĩa trong tài liệu |
| --- | --- |
| Cơ chế chơi | Cách trẻ thao tác và cách hệ thống chấm điểm; tương ứng một loại game trong DSL |
| Tựa game | Một cơ chế chơi gắn với kỹ năng môn học và cách trình bày cụ thể |
| Chủ đề đồ họa (theme) | Lớp hình ảnh, nhân vật, âm thanh phủ lên cơ chế chơi |
| Lược đồ dữ liệu (schema) | Khuôn quy định các trường, kiểu và giới hạn của dữ liệu game |
| Trình hiển thị (renderer) | Thành phần đọc dữ liệu game và vẽ trò chơi bằng Konva |
| Ngân hàng cơ chế (pattern bank) | Kho công thức cơ chế chơi đã tuyển chọn (Phụ lục B.2) |
| Bản thiết kế trò chơi (GDD) | Bản mô tả có cấu trúc mà AI lập trước khi sinh game (Phụ lục B.1) |
| Bộ mô tả chuẩn (golden prompts) | 30–50 mô tả mẫu dùng để kiểm thử hồi quy (Phụ lục B.6) |
| Bộ khối dựng (Game Kit) | Các khối cơ chế dựng sẵn để AI lắp ráp game ở mức sinh 3 |
| Nhóm mô tả A–D | Mức độ khớp giữa mô tả của giáo viên và danh mục cơ chế (mục 5.3) |
| Mức sinh 1–4 | Cách hệ thống tạo game, từ mẫu có sẵn đến sinh code (mục 5.3) |
| Ngữ cảnh (context) | Toàn bộ thông tin AI nhận được trong một lần gọi (mục 4.2) |
| Bộ nhớ (memory) | Dữ liệu hệ thống lưu từ những lần trước để dùng lại khi sinh (mục 4.3) |
| Điều phối (orchestration) | Cách hệ thống chia việc cho các agent và quyết định bước tiếp theo (mục 4.4) |
| Rào chắn (guardrails) | Các luật và bước kiểm tra giữ cho đầu ra an toàn, đúng và trong ngân sách (mục 4.5) |
| Agent | LLM có prompt riêng, được gọi công cụ và chạy trong vòng lặp có điều kiện dừng (mục 4.4) |
| Máy trạng thái (state machine) | Cách Orchestrator quản lý các bước: mỗi yêu cầu ở một trạng thái, code quyết định trạng thái tiếp theo |
| Agentic workflow | Luồng do code quyết định, trong đó LLM thực hiện từng bước |
| Mã truy vết | Mã gắn với một lần sinh game, dùng để ghi log và lần lại từng bước |
| YCCĐ | Yêu cầu cần đạt trong chương trình giáo dục |
