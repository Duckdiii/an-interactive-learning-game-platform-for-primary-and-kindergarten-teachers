# 0. Tóm tắt

Giáo viên hiện làm game học tập bằng các web tool theo mẫu (Wordwall, H5P, Kahoot...): chọn mẫu có sẵn rồi nhập từng câu hỏi, từng hình ảnh. Gánh nặng nằm ở khâu chuẩn bị nội dung, không nằm ở thao tác giao diện. Đề tài chuyển trọng tâm từ "điền nội dung vào khung có sẵn" sang "mô tả nhu cầu dạy học, AI đề xuất và sinh trò chơi phù hợp, hệ thống kiểm tra chất lượng, giáo viên chỉ duyệt và chỉnh".

Phạm vi: Toán, Tiếng Việt, Tiếng Anh cho Mầm non và Tiểu học. Hệ thống hiện có 10 loại game và lõi sinh game theo JSON DSL; vấn đề đang được giải quyết tiếp theo là khi giáo viên mô tả một game nằm ngoài thiết kế hiện tại thì hệ thống phải xử lý thế nào (mục 7).

# 1. Bài toán và đối tượng

## 1.1 Vấn đề

- Giáo viên mất nhiều thời gian chuẩn bị học liệu tương tác. Baseline đang dùng trong bộ KPI là 15–20 phút cho mỗi bài (soạn nội dung, cắt ảnh, kéo thả trên PowerPoint hoặc web tool) và cần xác nhận bằng khảo sát giáo viên.
- Công cụ nước ngoài có chi phí nâng cấp cao so với thu nhập giáo viên, thư viện hình ảnh thiên về văn hóa phương Tây, có thể lỗi font tiếng Việt có dấu (theo khảo sát nhu cầu trên mạng của nhóm).
- Việc bám Chương trình GDPT 2018 và chương trình Giáo dục mầm non, cũng như mức độ nhận thức phù hợp lứa tuổi, vẫn do giáo viên tự đối chiếu.

## 1.2 Đối tượng

| Nhóm | Vai trò | Ghi chú |
| --- | --- | --- |
| Giáo viên Mầm non, Tiểu học | Người tạo game: mô tả ý tưởng hoặc tải giáo án, duyệt, chỉnh sửa, xuất bản, trình chiếu | Người dùng chính của hệ thống |
| Học sinh | Người chơi, vào bằng mã, QR hoặc đường dẫn, không cần tài khoản | Hệ thống không lưu thông tin nhận dạng cá nhân |
| Quản trị viên | Theo dõi chi phí và trạng thái dịch vụ, quản lý tài khoản giáo viên, cấu hình kiểm duyệt | Vai trò vận hành |
| Phụ huynh | Chơi cùng con ở nhà bằng mã chia sẻ do giáo viên gửi | Luồng dự kiến, chưa nằm trong đặc tả hiện tại |

# 2. Hiện trạng: giáo viên đang làm thế nào

Nhóm đã khảo sát trực tiếp Wordwall, Kahoot, H5P và tìm hiểu thêm Canva Education (Magic Activities), Curipod, Gameer.io, Worky Genie. Quy trình chung quan sát được:

Đăng nhập → chọn một mẫu có sẵn → nhập thủ công từng câu hỏi, đáp án → tự tìm và tải hình minh họa → cấu hình đúng/sai, thời gian, độ khó → xem trước và xuất bản.

Hai bước tốn công nhất là nhập nội dung và tìm hình. Các tính năng AI hiện có (Wordwall AI, Kahoot AI) chỉ hỗ trợ một phần bước nhập nội dung.

| Công cụ | Cơ chế | Điểm cần lưu ý cho đề tài |
| --- | --- | --- |
| Wordwall | Mẫu có sẵn, nhiều định dạng trò chơi | Phổ biến ở Việt Nam; giáo viên vẫn tự soạn nội dung |
| H5P | Mã nguồn mở, nội dung tương tác lồng trong bài giảng | Thiên về video và trình chiếu tương tác hơn là game độc lập |
| Kahoot | Quiz thi đua trực tiếp theo thời gian thực | Mạnh ở lớp học đồng bộ; chủ yếu dạng câu hỏi trắc nghiệm |
| Canva Education | Thiết kế đa năng, có AI (Magic Activities) | Học liệu trực quan, ít minigame thao tác |
| Curipod | Sinh bài thuyết trình, thăm dò ý kiến | Không sinh minigame kéo thả |
| Gameer.io, Worky Genie | "Prompt to game / quiz" bằng AI | Theo đánh giá của nhóm: vẫn bắt chọn định dạng trước; không phải minigame ôn tập nhanh |

Ngoài các nền tảng, nhiều giáo viên đã tự "vibe code" công cụ riêng (luyện toán, tiếng Việt, trò chơi). Vì vậy việc "tạo được game bằng AI" tự nó không còn là điểm khác biệt. Giá trị của đề tài phải nằm ở những thứ mà một công cụ tự code khó có: bám chương trình, kiểm tra chất lượng, an toàn cho trẻ nhỏ và quy trình tạo, chỉnh, xuất bản trọn vẹn (mục 4).

# 3. Web tool hoạt động thế nào

- Bản chất "ready to use": nhà phát triển dựng sẵn khung trò chơi; giáo viên nhập thông tin vào khung đó.
- Cơ chế chơi cố định theo mẫu: giáo viên phải tự chọn mẫu nào hợp với mục tiêu bài học.
- Nội dung do giáo viên cung cấp từng câu: AI nếu có chỉ là tính năng phụ. Theo "phép thử tháo gỡ" trong research của nhóm, nếu gỡ AI khỏi Wordwall hay Kahoot thì nền tảng vẫn chạy bình thường ở chế độ thủ công.
- Nội dung tĩnh: tạo một lần, mọi học sinh chơi như nhau.

Nói gọn: xu thế của web tool là trải nghiệm dựa trên cái có sẵn.

# 4. AI generative khác ở đâu

Sự dịch chuyển: từ nhập thông tin vào khung có sẵn sang giáo viên mô tả bối cảnh, hệ thống đề xuất và tạo trò chơi phù hợp. Áp dụng "phép thử tháo gỡ" cho sản phẩm của mình: nếu gỡ AI ra thì hệ thống không còn tạo được game từ mô tả, tức AI là bộ máy lõi chứ không phải tính năng phụ. Nguyên tắc kiến trúc nền tảng: AI chỉ sinh JSON theo schema, giao diện chơi tự render độc lập từ JSON đó.

| Khía cạnh | Web tool theo mẫu | Nền tảng của đề tài | Chức năng tương ứng |
| --- | --- | --- | --- |
| Đầu vào | Chọn mẫu rồi nhập nội dung | Mô tả bằng tiếng Việt kèm khối lớp và môn, hoặc tải giáo án .docx/.pdf (tối đa 10MB) | FR-02, UC-02, FLD-01 đến FLD-04 |
| Chọn cơ chế chơi | Giáo viên tự chọn | Hệ thống phân tích ý định để xác định thể loại phù hợp; hướng thiết kế là đề xuất vài loại kèm lý do để giáo viên chọn | UC-02 bước 4, FLD-15 |
| Nội dung câu hỏi | Giáo viên soạn từng câu | AI sinh câu hỏi, đáp án, lời giải thích; giáo viên sửa tay hoặc yêu cầu AI làm lại riêng một thẻ mà giữ nguyên các thẻ khác | FR-05, FR-06, UC-05, UC-06 |
| Bám chương trình | Giáo viên tự đối chiếu | Curriculum-RAG: tra cứu Yêu cầu cần đạt (YCCĐ) bằng embedding và pgvector, đưa vào ngữ cảnh sinh | FR-02, UC-02 bước 4 |
| Kiểm tra chất lượng | Không có hoặc rất ít | Validation 3 lớp bằng luật (Jackson, JSON Schema, Hibernate Validator) thay cho vòng LLM tự sửa; kiểm duyệt an toàn nhiều lớp (moderation và danh mục từ cấm cập nhật nóng) | NFR-02, UC-02 bước 6 |
| Phù hợp lứa tuổi | Giáo viên tự cân nhắc | Cảnh báo khi kiến thức không hợp lứa tuổi và gợi ý đổi khối lớp hoặc đổi nội dung; nút bấm lớn, ít câu cho trẻ nhỏ | UC-02 luồng 4a, mục 3.2.1 SRS |
| Hình ảnh, giọng đọc | Giáo viên tự tìm ảnh, thường không có giọng đọc | Ảnh từ Pexels (SafeSearch) lưu trên S3; giọng đọc Google TTS giọng Nam hoặc Nữ | UC-02 bước 5, UC-11 |
| Đưa vào lớp học | Tách khỏi công cụ tạo | Xuất bản bằng mã, URL, QR; chơi cá nhân hoặc thi đấu theo phòng thời gian thực | FR-07 đến FR-09 |
| Trải nghiệm của trẻ | Hình ảnh phương Tây, có thể lỗi font, ít giọng đọc | Đồ họa và theme thống nhất, giọng đọc tiếng Việt, hồ sơ lứa tuổi (mục 6) | UC-11, mục 3.2.1 SRS |
| Mô tả nằm ngoài mẫu | Không làm được | Xem mục 7 | UC-02 (cần bổ sung luồng) |

## 4.1 Giá trị cụ thể mà đề tài tạo ra

- Giảm công chuẩn bị: KPI-01 dưới 60 giây cho một bài (so với baseline 15–20 phút).
- Chất lượng chấp nhận được ngay: KPI-02 từ 75% trở lên nội dung dùng được ngay; KPI-03 không quá 25% trường nội dung cần sửa tay; KPI-04 không quá 10% lượt phải tạo lại toàn bộ.
- Sức hấp dẫn với trẻ: giáo viên chấm mức hấp dẫn so với web tool trên cùng một bài (mục 6.7).
- An toàn kiến thức: tỷ lệ ảo giác dưới 5% khi giáo viên chấm mẫu từ 50 câu hỏi so với YCCĐ.
- Phù hợp ngữ cảnh Việt Nam: tiếng Việt có dấu, hình ảnh và ngữ cảnh gần gũi, bám GDPT 2018 và chương trình Giáo dục mầm non.

# 5. Hệ thống hiện tại làm được gì

## 5.1 Luồng nghiệp vụ 5 bước (theo SRS)

- Tiếp nhận: giáo viên chọn khối lớp, môn, nhập mô tả hoặc tải giáo án; hệ thống trích xuất văn bản (Apache Tika).
- Phân tích ý định và tra cứu chuẩn: bóc tách chủ đề, mục tiêu, số câu, độ khó; tra YCCĐ tương ứng và đưa vào ngữ cảnh.
- Sinh cấu trúc game và kiểm duyệt: LLM (Gemini, qua LangChain4j) trả về JSON theo schema; validation 3 lớp và kiểm duyệt an toàn.
- Bổ sung media: hình ảnh minh họa an toàn và giọng đọc tiếng Việt.
- Soạn thảo, xuất bản, chơi: Workspace Editor để chơi thử và chỉnh sửa; xuất bản bằng mã, URL, QR; học sinh vào chơi cá nhân hoặc thi đấu theo phòng.

## 5.2 Tiến độ các thành phần lõi (theo Plan)

| Thành phần | Trạng thái | Ghi chú |
| --- | --- | --- |
| Xác thực JWT, phân quyền giáo viên và quản trị | Hoàn thành | Đăng ký, đăng nhập, làm mới phiên, đăng xuất |
| Game JSON DSL v1.0.0 | Hoàn thành, đã đóng băng | Schema cùng các ví dụ; thay đổi sau này phải tăng phiên bản và tương thích ngược |
| Thiết kế pipeline sinh game | Hoàn thành | Intent Parser, tra YCCĐ, Generator, Validation, Safety, Media |
| Dịch vụ sinh game và factory các loại game | Đang làm (khoảng 60%) | Đã có factory cho 10 loại game; chưa có endpoint gọi từ giao diện |
| Validation 3 lớp | Đang làm (khoảng 90%) | Kiểm tra cú pháp, schema và logic trước khi lưu |
| Kiểm duyệt an toàn | Đang làm (khoảng 70%) | Đã có moderation và danh mục từ cấm; chưa cập nhật nóng |
| Trình chơi trên Konva | Mới 2/10 loại: Quiz, Matching | 8 loại còn lại (kéo thả phân loại, lật thẻ, ghép thứ tự, tìm điểm khác biệt, ghép âm thanh hình ảnh, tìm mục tiêu, sắp xếp chữ, điền khuyết hình) chưa có trình chơi |
| Kho YCCĐ và Curriculum-RAG | Chưa bắt đầu | Đang ở bước kiểm chứng kỹ thuật (spike) |
| Teacher Portal và Workspace Editor | Đang làm | Portal khoảng 50%; Workspace Editor mới là khung |
| Chơi theo phòng (Live Arena) và giao diện học sinh | Chưa bắt đầu | Phụ thuộc kết quả kiểm chứng WebSocket |

10 loại game: Quiz, Matching, Drag & Drop phân loại, Memory Card, Ordering, Odd One Out, Word Scramble, Visual Cloze, Audio-Visual Match, Spot the Target. Nhóm coi 10 loại này là tập mẫu để so sánh với web tool, không phải giới hạn cuối cùng; sẽ bổ sung tựa game mới cho ba môn đã chọn.

# 6. Trải nghiệm cho trẻ: đồ họa, giao diện, âm thanh

## 6.1 Vì sao cần nêu riêng

- Người chơi là trẻ nhỏ. Trẻ Mầm non chưa đọc được nên hình ảnh và giọng đọc là kênh chính, không phải chữ.
- Research của nhóm ghi nhận các điểm yếu của công cụ hiện có: hình ảnh thiên văn hóa phương Tây, lỗi font tiếng Việt có dấu, nội dung tĩnh.
- Thầy Thanh yêu cầu chất lượng (độ mượt, sức hấp dẫn, đồ họa) phải hơn các web tool đã có. Vì vậy phần này cần mục tiêu, cách làm và cách đo cụ thể.

## 6.2 Nguyên tắc theo nhóm tuổi

Các nguyên tắc dưới đây là đề xuất thiết kế của nhóm, chưa kiểm chứng với trẻ thật. Chúng được lưu thành hồ sơ lứa tuổi (age profile) dạng dữ liệu để renderer áp dụng, không viết cứng trong từng game.

| Khía cạnh | Mầm non | Tiểu học |
| --- | --- | --- |
| Chữ | Rất ít, ưu tiên hình ảnh lớn | Có chữ, cỡ lớn, dễ đọc |
| Điều khiển | Chạm, nút lớn, ít thao tác, tránh kéo thả phức tạp | Kéo thả và nhiều bước hơn |
| Âm thanh | Tự đọc đề bằng giọng đọc, phản hồi bằng tiếng | Đọc đề là tùy chọn |
| Phản hồi | Tức thì và tích cực; sai thì khuyến khích thử lại, không phạt | Có điểm, bộ đếm thời gian nhẹ |
| Số lượng | Ít câu, mỗi màn hình một nhiệm vụ | Nhiều câu hơn, có thể thi đấu theo phòng |

## 6.3 Đồ họa

- Phong cách thống nhất: một bộ bảng màu, kiểu bo góc, bóng đổ và nhân vật dẫn dắt dùng chung cho mọi game, để sản phẩm trông có chủ đích thay vì ghép ảnh rời rạc.
- Nguồn hình ảnh: hiện dùng Pexels (bật SafeSearch) và lưu trên S3. Hạn chế: ảnh stock ít phù hợp với trẻ nhỏ và văn hóa Việt Nam. Hướng đề xuất là bổ sung một bộ minh họa (SVG hoặc hình vẽ) đóng gói sẵn theo chủ đề gần gũi (con vật, trái cây, phương tiện, đồ dùng học tập). Hình do AI sinh chỉ xem là hướng nghiên cứu, chưa cam kết.
- Theme: lớp đồ họa tách khỏi logic game, cho phép cùng một cơ chế chơi hiển thị nhiều chủ đề
- Hoạt ảnh: dùng khả năng hoạt ảnh của Konva cho phản hồi khi chọn đúng, chọn sai, hoàn thành màn chơi.

## 6.4 Giao diện

- Vùng chạm đủ lớn, Mầm non lớn hơn Tiểu học; khoảng cách giữa các nút đủ rộng để tránh bấm nhầm.
- Font hỗ trợ đầy đủ tiếng Việt có dấu; cần kiểm tra thực tế trên các trình duyệt, vì lỗi font là một pain point đã ghi nhận.
- Hiển thị tốt trên ba ngữ cảnh: máy chiếu lớp học, máy tính bảng, điện thoại của phụ huynh.
- Độ tương phản đủ rõ; không chỉ dùng màu để báo đúng hoặc sai, mà kèm biểu tượng và âm thanh.

## 6.5 Âm thanh

- Giọng đọc: đã có Google Text-to-Speech (giọng Nam hoặc Nữ). Mầm non tự đọc đề; với tiếng Anh cần kiểm tra chất lượng phát âm.
- Hiệu ứng: âm thanh cho đúng, sai, hoàn thành; nhạc nền nhẹ và có nút tắt tiếng.
- Ràng buộc kỹ thuật: trình duyệt không cho tự phát âm thanh trước lần chạm đầu tiên của người dùng, nên mỗi game cần một màn hình "Bắt đầu" để mở khóa âm thanh.
- Bản quyền: chỉ dùng hiệu ứng và nhạc có giấy phép rõ ràng; cần nhóm kiểm tra nguồn cụ thể trước khi chốt.

## 6.6 Hiện thực trong kiến trúc

Nguyên tắc cốt lõi: AI không "vẽ" đồ họa. LLM chỉ sinh JSON dữ liệu theo DSL; hình dạng, màu sắc, hoạt ảnh và âm thanh do renderer Konva, theme và kho asset có sẵn quyết định. Nhờ đó:

- Chất lượng thị giác ổn định và kiểm soát được, không phụ thuộc mỗi lần LLM sinh ra điều gì.
- Đây là cơ sở để bảo đảm chất lượng đồ họa khi sau này mở rộng sang game mới (nhóm C, D ở mục 7).
- Theme và hồ sơ lứa tuổi nằm ở lớp riêng, không phải sửa DSL v1.0.0 đang đóng băng. Nếu cần thêm trường chọn theme vào JSON thì phải tăng phiên bản DSL (việc nhóm cần quyết định).

## 6.7 Cách đo (gắn với yêu cầu so sánh demo)

- Cho cùng một bài (ví dụ ghép từ vựng) chạy trên Wordwall và trên hệ thống, để giáo viên và một số trẻ dùng thử.
- Chỉ số: giáo viên chấm mức hấp dẫn theo thang điểm; tỷ lệ trẻ hoàn thành màn chơi; thời gian tải và độ mượt khi chơi.
- Kiểm tra kỹ thuật: Lighthouse (hiệu năng, khả năng tiếp cận), hiển thị font tiếng Việt trên nhiều thiết bị.

# 7. Vấn đề đang được giải quyết: mô tả của giáo viên nằm ngoài thiết kế hiện tại

## 7.1 Phát biểu vấn đề

Hệ thống chỉ có một số cơ chế chơi đã định nghĩa (10 loại game theo DSL). Giáo viên thì mô tả theo nhu cầu dạy học của họ, không theo danh sách đó. Khi mô tả không khớp với bất kỳ loại nào, hệ thống cần một cách xử lý rõ ràng, thay vì lặng lẽ ép vào loại gần nhất hoặc để AI tự bịa ra một cơ chế không kiểm soát được.

Đây cũng là chỗ thầy Thanh nhấn mạnh: web tool chỉ làm được trong khung có sẵn, còn AI generative phải có khả năng tạo ra trò chơi phù hợp với bối cảnh mà giáo viên mô tả, kể cả khi nó nằm ngoài kịch bản dựng sẵn.

## 7.2 Ví dụ minh họa

Các ví dụ dưới đây do nhóm đặt ra để minh họa từng tình huống, chưa phải dữ liệu khảo sát thực tế.

| Môn | Giáo viên mô tả | So với hệ thống hiện tại | Nhóm tình huống |
| --- | --- | --- | --- |
| Tiếng Anh | "Ghép từ vựng con vật tiếng Anh cho lớp 2, nhưng cho các em chơi trong bối cảnh du hành vũ trụ" | Cơ chế Matching có sẵn; khác ở chủ đề và hình thức | B: cùng cơ chế, khác chủ đề |
| Tiếng Anh | "Bé nghe cô đọc put the apple in the basket rồi kéo quả táo vào giỏ" | Gần Drag & Drop kết hợp Audio-Visual Match, nhưng chưa có đúng cơ chế | C: gần mẫu, cần biến thể hoặc tựa mới |
| Toán | "Bé kéo các quả cân lên hai đĩa cân sao cho cân thăng bằng để hiểu phép cộng" | Cần mô phỏng cân và tính toán thăng bằng; không có trong 10 loại | D: ngoài mẫu |
| Tiếng Việt | "Bé tô theo nét để tập viết chữ cái đầu tiên" | Cần nhận nét vẽ; không có trong 10 loại | D: ngoài mẫu |

## 7.3 Hệ thống hiện xử lý thế nào

- Đặc tả UC-02 có các luồng ngoại lệ cho: tệp sai định dạng, kiến thức không hợp lứa tuổi, nội dung không an toàn, lỗi AI. Chưa có luồng nào cho trường hợp mô tả không khớp cơ chế chơi nào hiện có.
- Trường chọn thể loại (FLD-15) trong SRS hiện liệt kê 4 loại cơ bản (Quiz, Matching, Drag & Drop, Memory Card), trong khi DSL và backend đã có 10 loại. Hai tài liệu cần thống nhất.
- Chỉ 2 trong 10 loại (Quiz, Matching) đã có trình chơi, nên ngay cả mô tả "trong danh sách" nhiều trường hợp chưa chơi thử được trên giao diện.

Kết luận: đây là khoảng trống thật trong đặc tả hiện tại và cần bổ sung, không phải một tình huống hiếm có thể bỏ qua.

## 7.4 Cách phân loại mô tả của giáo viên

| Nhóm | Tình huống | Hệ thống làm gì | Trạng thái |
| --- | --- | --- | --- |
| A | Khớp với một loại game có sẵn | Sinh game bình thường theo luồng UC-02 | Là lõi hiện tại |
| B | Khớp cơ chế, khác chủ đề hoặc bối cảnh | Sinh game theo cơ chế có sẵn và áp lớp chủ đề (theme) tương thích | Đề xuất, sẽ thử nghiệm trên nhánh riêng |
| C | Gần một hoặc nhiều loại có sẵn, cần biến thể | Đề xuất loại gần nhất kèm phần khác biệt; hoặc ghi nhận để bổ sung thành tựa game mới vào danh mục | Đề xuất, bổ sung theo từng tựa game |
| D | Ngoài hẳn mọi cơ chế có sẵn | Hướng mục tiêu: sinh game mới trực tiếp, với bảo đảm chất lượng đồ họa. Chi tiết kỹ thuật tạm gác. Trong lúc đó hệ thống báo rõ chưa hỗ trợ và đề xuất phương án thay thế | Hướng nghiên cứu, chưa cam kết |

## 7.5 Luồng xử lý đề xuất

- Phân tích ý định (Intent Parser): bóc tách mục tiêu học tập, môn, khối lớp, cơ chế chơi mà giáo viên mô tả.
- Đánh giá độ phủ: so khớp mô tả với danh mục cơ chế và chủ đề đang có, cho ra một trong các kết luận A, B, C, D kèm mức tin cậy và lý do.
- Quyết định và phản hồi: nhóm A và B sinh game ngay; nhóm C và D không tự sinh âm thầm mà hiển thị lựa chọn cho giáo viên.
- Kiểm tra sau sinh: mọi game, dù thuộc nhóm nào, đều đi qua validation 3 lớp và kiểm duyệt an toàn trước khi lưu.
- Ghi nhận: lưu lại các mô tả thuộc nhóm C và D để làm căn cứ chọn tựa game mới cần bổ sung.

## 7.6 Phản hồi cho giáo viên

| Kết luận | Thông điệp hiển thị (ví dụ) | Giáo viên chọn được |
| --- | --- | --- |
| A, B | Hệ thống sinh bản nháp như bình thường | Chơi thử, chỉnh sửa, xuất bản |
| C | "Mô tả của bạn gần với trò chơi Kéo thả phân loại, khác ở phần nghe lệnh. Bạn muốn dùng bản gần nhất không?" | Dùng bản gần nhất, chỉnh lại mô tả, hoặc gửi yêu cầu bổ sung trò chơi |
| D (khi chưa hỗ trợ) | "Hệ thống chưa hỗ trợ kiểu chơi này. Dưới đây là 2–3 cách khác đạt cùng mục tiêu học tập." | Chọn một phương án thay thế hoặc gửi yêu cầu để nhóm xem xét |

## 7.7 Nguyên tắc thiết kế

- Không bịa cơ chế: kết quả sinh ra phải thuộc tập cơ chế đã định nghĩa và kiểm chứng được. Mô tả vượt ra ngoài thì phải nói rõ.
- Không thay thế âm thầm: giáo viên luôn biết hệ thống đã hiểu mô tả của mình thành loại game nào và vì sao.
- An toàn trước: kiểm duyệt và validation áp dụng như nhau cho mọi nhóm, kể cả khi sau này có game sinh mới.
- Chất lượng đồ họa phải được bảo đảm trước khi mở rộng sang sinh tự do, vì đối tượng là trẻ nhỏ.
- Giữ nguyên DSL v1.0.0 đang đóng băng; mở rộng bằng phiên bản mới và tương thích ngược.

## 7.8 Tiêu chí đánh giá (đề xuất)

- Xây bộ mô tả mẫu cho ba môn, gắn nhãn A, B, C, D do nhóm xác định; đo tỷ lệ hệ thống phân loại đúng nhóm.
- 100% mô tả thuộc nhóm C và D nhận được phản hồi rõ ràng, không lỗi giao diện và không sinh game sai cơ chế.
- Đo tỷ lệ mô tả thực của giáo viên rơi vào từng nhóm trong khảo sát và thử nghiệm với người dùng, làm căn cứ quyết định mở rộng.

## 7.9 Phạm vi cam kết

| Mức | Nội dung |
| --- | --- |
| Cam kết | Nhóm A hoàn chỉnh. Nhận diện được nhóm B, C, D và phản hồi đúng cách cho giáo viên. |
| Thử nghiệm | Nhóm B (chủ đề) và một số tựa game mới cho nhóm C, thực hiện trên nhánh riêng; giữ hay bỏ tùy kết quả. |
| Hướng nghiên cứu | Nhóm D: sinh game hoàn toàn mới. Phần kỹ thuật đang tạm gác để tập trung mở rộng danh mục tựa game trước. |

## 7.10 Tài liệu cần cập nhật

- SRS, UC-02: thêm luồng rẽ nhánh hoặc ngoại lệ cho mô tả ngoài danh mục cơ chế.
- SRS, FLD-15: thống nhất danh sách thể loại với 10 loại trong DSL.
- Plan: thêm công việc cho phần này (đã có nhóm công việc 7 trong bản Plan cập nhật).

# 8. Kiến trúc tóm tắt

Luồng xử lý chính (theo thiết kế trong Plan):

Giáo viên mô tả → Intent Parser → tra cứu YCCĐ (Curriculum-RAG) → Content Generator (LangChain4j + Gemini) → Validation (JSON Schema, luật nội dung) → kiểm duyệt an toàn → gắn media (hình, giọng đọc) → game JSON → trình chơi Konva.

| Tầng | Công nghệ thực tế của dự án |
| --- | --- |
| Backend | Spring Boot 4.1 trên Java 21, modular monolith; JWT cho giáo viên và quản trị |
| AI | LangChain4j với Gemini (structured output theo schema); không dùng OpenAI GPT |
| Dữ liệu | PostgreSQL, pgvector cho tra cứu YCCĐ; S3 lưu hình và âm thanh, cơ sở dữ liệu chỉ giữ khóa đối tượng |
| Frontend | React 19, TypeScript, Vite; trình chơi game bằng Konva; không dùng PixiJS hay @dnd-kit |
| Giọng đọc | Google Text-to-Speech, giọng Nam hoặc Nữ |
| Thời gian thực | Spring WebSocket với STOMP (broker trong bộ nhớ, đủ cho quy mô đồ án) |

JSON DSL phiên bản 1.0.0 và System Prompt phiên bản 1.0.0 đã đóng băng để phục vụ đo đạc thực nghiệm; mọi thay đổi phải tạo phiên bản mới có mã băm SHA-256 và ghi nhật ký.

# 9. Phạm vi và rủi ro

## 9.1 Trong phạm vi

- Môn: Toán, Tiếng Việt, Tiếng Anh; cấp học: Mầm non và Tiểu học.
- Sinh game theo mô tả hoặc giáo án, chơi thử, chỉnh sửa, xuất bản bằng mã, URL, QR; học sinh vào ẩn danh.
- Kiểm duyệt an toàn và kiểm tra chất lượng nội dung nhiều lớp.

## 9.2 Ngoài phạm vi

- Quản lý hành chính nhà trường, điểm danh, sổ điểm; chấm tự luận; trò chơi 3D, VR, AR; thanh toán và mua bán học liệu.

## 9.3 Rủi ro chính

| Rủi ro | Cách giảm |
| --- | --- |
| Mới 2/10 loại game có trình chơi | Ưu tiên hoàn thiện nhóm P0; nói rõ phần còn lại là mở rộng |
| Chất lượng nội dung do AI sinh | Validation nhiều lớp, tính lại đáp án Toán bằng code, bộ mô tả mẫu để kiểm hồi quy khi đổi prompt hoặc mô hình |
| Mô tả ngoài danh mục cơ chế | Phân loại nhóm A–D và phản hồi rõ cho giáo viên (mục 7) |
| Chi phí gọi mô hình và số người dùng đồng thời | Dự toán chi phí, tuyên bố con số mục tiêu rồi kiểm tra tải |
| Mở rộng quá phạm vi khi đòi sinh game tự do | Chọn mức cam kết rõ ràng ở mục 7.9 và có điểm dừng an toàn |
