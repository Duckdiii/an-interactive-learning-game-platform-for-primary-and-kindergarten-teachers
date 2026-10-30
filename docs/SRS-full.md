# CHƯƠNG 1. GIỚI THIỆU (INTRODUCTION)

## 1.1. Mục đích tài liệu (Purpose)

Tài liệu Đặc tả Yêu cầu Phần mềm (SRS) này xác định đầy đủ, chi tiết và chính thức các yêu cầu chức năng, phi chức năng, quy trình kiểm thử, kế hoạch bảo trì và mô hình hóa hệ thống của Nền tảng sáng tạo trò chơi học tập tương tác từ ngôn ngữ tiếng Việt. Tài liệu làm căn cứ kỹ thuật tối cao giữa Nhóm phát triển, Giảng viên hướng dẫn và Hội đồng phản biện.

## 1.2. Phạm vi sản phẩm (Product Scope)

### 1.2.1. Phạm vi thực thi (In-Scope)

Sáng tạo trò chơi học tập tự động: Tiếp nhận ý tưởng bài giảng hoặc nội dung giáo án dạng văn bản do giáo viên cung cấp để tự động chuyển đổi thành cấu trúc trò chơi học tập tương tác; Tự động đề xuất câu hỏi, phương án trả lời, hình ảnh minh họa sinh động phù hợp lứa tuổi và giọng đọc thuyết minh tiếng Việt chuẩn truyền cảm cho từng bài học.

Đối chiếu và chuẩn hóa kiến thức: Hỗ trợ câu mô tả, ý tưởng trò chơi của giáo viên được đối chiếu và liên kết nội dung bài học với Yêu cầu cần đạt trong Chương trình Giáo dục Phổ thông và Chương trình Giáo dục Mầm non do Bộ Giáo dục và Đào tạo ban hành.

Soạn thảo và tinh chỉnh học liệu trực quan: Cung cấp không gian làm việc trực quan giúp giáo viên rà soát, chơi thử trải nghiệm bài học, tự tay chỉnh sửa câu chữ, thay đổi hình ảnh/âm thanh hoặc yêu cầu hệ thống thiết kế lại từng câu hỏi/toàn bộ trò chơi theo ý đồ sư phạm riêng.

Tổ chức trình chiếu và tương tác lớp học: Hỗ trợ giáo viên trình chiếu bài học tương tác trên màn hình lớn tại lớp học; Hỗ trợ học sinh tham gia chơi cá nhân hoặc thi đấu nhóm trực tiếp theo thời gian thực thông qua mã tham gia đơn giản, không yêu cầu khai báo thông tin cá nhân phức tạp.

Kiểm duyệt an toàn nội dung học đường: Tự động rà quét và ngăn chặn các ngữ liệu, hình ảnh hoặc âm thanh không đạt chuẩn sư phạm, chứa yếu tố nhạy cảm hoặc không phù hợp với nhận thức của trẻ nhỏ mầm non và tiểu học.

Quản trị vận hành và giám sát hệ thống: Cho phép ban quản trị theo dõi tổng quan mức độ sử dụng tài nguyên hệ thống, quản lý danh sách tài khoản người dùng, thiết lập ngưỡng an toàn nội dung và lưu vết nhật ký hoạt động.

Điều chỉnh cấu hình bộ não AI: Cho phép quản trị viên tinh chỉnh các tham số kỹ thuật điều khiển AI (Temperature, Max Tokens, ngưỡng kiểm duyệt an toàn), đóng băng hoặc khôi phục phiên bản Prompt chuẩn phục vụ lưu vết dữ liệu thực nghiệm.

### 1.2.2. Ngoài phạm vi thực thi (Out-of-Scope)

Không quản lý hành chính nhà trường (LMS/SMS): Hệ thống không thực hiện các nghiệp vụ quản lý nhà trường như: xếp thời khóa biểu, điểm danh, quản lý hồ sơ học sinh, sổ điểm chính thức hay đánh giá xếp loại thi đua.

Không chấm điểm tự luận chuyên sâu: Hệ thống tập trung vào các dạng trò chơi tương tác trực quan (trắc nghiệm, kéo thả, ghép cặp, lật thẻ), không hỗ trợ chấm điểm các bài tập tự luận mở hoặc phân tích tâm lý chiều sâu của học sinh.

Không phát triển thể loại trò chơi không gian 3D/VR/AR: Hệ thống tối ưu cho các trò chơi hai chiều (2D) tương tác nhẹ nhàng trên thiết bị phổ thông, không phát triển các trò chơi mô phỏng 3D hay thực tế ảo yêu cầu phần cứng chuyên dụng.

Không cung cấp hạ tầng phần cứng và đường truyền: Hệ thống không bao gồm việc cung cấp các thiết bị hiển thị (tivi, máy tính, máy tính bảng) hoặc hạ tầng đường truyền Internet tại các cơ sở giáo dục.

Không hỗ trợ giao dịch thương mại điện tử: Hệ thống không tích hợp cổng thanh toán trực tuyến hay mua bán, trao đổi học liệu có thu phí giữa các người dùng.

### 1.2.3. Các Chỉ số KPI Nghiệp vụ Định lượng (Key Business KPIs)

Nhằm nâng cao năng suất tạo lập học liệu sư phạm, bảo đảm hiệu quả vận hành và đáp ứng trọn vẹn tiêu chí đánh giá định lượng đồ án, hệ thống thiết lập năm chỉ số KPI nghiệp vụ định lượng cốt lõi được đặc tả tại Bảng 1.1.

Bảng 1.1: Bảng Chỉ số Hiệu quả Nghiệp vụ Định lượng (Key Business KPIs)

| Mã KPI | Tên Chỉ số Nghiệp vụ | Hiện trạng Thủ công (Baseline) | Mục tiêu Phần mềm (Target) | Phương pháp Thu thập Minh chứng |
| --- | --- | --- | --- | --- |
| KPI-01 | Thời gian tạo một bài học (Time to Create) | 15 – 20 phút (chọn mẫu có sẵn, nhập từng câu, chèn ảnh trên PPT/Wordwall/Kahoot/H5P) | < 60 giây với sự hỗ trợ của AI pipeline | Ghi nhận tự động bằng Event Timestamp trong Server Audit Log. |
| KPI-02 | Tỷ lệ chấp nhận lần đầu (First-Gen Acceptance) | 0% (Hoàn toàn thiết kế thủ công) | ≥ 75% nội dung bài học dùng được ngay không cần tạo lại | Thống kê số lượng phiên xuất bản game không qua lệnh retry trên DB. |
| KPI-03 | Tỷ lệ tinh chỉnh thủ công (Manual Edit Rate) | 100% (Phải tự gõ/chọn từng câu chữ) | ≤ 25% tổng số trường nội dung giáo viên cần can thiệp | Ghi nhận số lượt click sự kiện "Update Field" trên Workspace Editor. |
| KPI-04 | Tỷ lệ yêu cầu tạo lại (Regeneration Rate) | Không áp dụng | ≤ 10% trên tổng số lượt sinh bài học | Đếm số lượt người dùng nhấn nút tạo lại toàn bộ bài học (Regenerate All). |
| KPI-05 | Độ hài lòng & Khả dụng (Satisfaction & Usability) | Thao tác phân mảnh, tốn thời gian | Điểm Likert ≥ 4.2/5.0; Điểm SUS ≥ 80/100 | Khảo sát định lượng giáo viên thử nghiệm & đo đạc thang SUS. |

## 1.3. Đối tượng sử dụng (Intended Audience)

Tài liệu được thiết kế phục vụ bốn nhóm đối tượng chính trong chu trình phát triển sản phẩm. Chi tiết vai trò và mục đích tra cứu của từng nhóm được trình bày cụ thể tại Bảng 1.2.

Bảng 1.2: Phân loại Đối tượng Sử dụng & Mục đích Tra cứu Tài liệu SRS

| Nhóm đối tượng tra cứu | Mục đích sử dụng tài liệu SRS |
| --- | --- |
| Giảng viên Hướng dẫn & Hội đồng | Đánh giá tính đúng đắn, mức độ hoàn thiện kỹ thuật và khối lượng thực hiện đồ án. |
| Nhóm Lập trình viên Backend / AI | Căn cứ thiết kế API, viết Logic Pipeline, Validation Engine và tra cứu Yêu cầu cần đạt (YCCĐ). |
| Nhóm Lập trình viên Frontend | Căn cứ thiết kế giao diện Workspace Editor, Canvas 2D Engine và WebSocket Client. |
| Nhóm Kiểm thử (Tester / QA) | Căn cứ xây dựng Test Cases, Test Scenarios và kịch bản nghiệm thu BDD. |

## 1.4. Định nghĩa và từ viết tắt (Definitions & Acronyms)

Hệ thống các thuật ngữ kỹ thuật, tiêu chuẩn ngành và danh mục từ viết tắt sử dụng xuyên suốt tài liệu được chuẩn hóa tại Bảng 1.3.

Bảng 1.3: Bảng Định nghĩa & Danh mục Từ viết tắt Kỹ thuật

| Từ viết tắt | Định nghĩa & Ý nghĩa nghiệp vụ |
| --- | --- |
| SRS | Software Requirements Specification — Tài liệu Đặc tả Yêu cầu Phần mềm. |
| LLM | Large Language Model — Mô hình Ngôn ngữ Lớn (Google Gemini). |
| RAG | Retrieval-Augmented Generation — Kỹ thuật sinh dữ liệu kết hợp tra cứu tri thức. |
| YCCĐ | Yêu cầu cần đạt - Tiêu chuẩn đầu ra kiến thức trong chương trình của Bộ GD&ĐT. |
| DSL | Domain-Specific Language - Ngôn ngữ định dạng cấu trúc trò chơi (Game JSON DSL). |
| NFR | Non-Functional Requirement - Yêu cầu Phi chức năng (Hiệu năng, Bảo mật, Khả dụng). |
| PII | Personally Identifiable Information - Thông tin Nhận dạng Cá nhân. |
| STOMP | Simple/Streaming Text Oriented Messaging Protocol - Giao thức nhắn tin qua WebSocket dùng cho kênh real-time (Live Arena). |
| SSE | Server-Sent Events - Cơ chế máy chủ đẩy dữ liệu một chiều qua HTTP, dùng hiển thị tiến trình xử lý AI (progress bar). |
| HNSW | Hierarchical Navigable Small World - Thuật toán lập chỉ mục Vector Database cho tìm kiếm ngữ nghĩa (hướng phát triển). |
| RTO / RPO | Recovery Time / Point Objective - Chỉ số thời gian khôi phục tối đa (<15 phút) và điểm mất mát dữ liệu tối đa (<1 giờ). |
| RTM | Requirements Traceability Matrix - Ma trận Truy xuất Yêu cầu Phần mềm. |
| SUS | System Usability Scale - Thang đo tiêu chuẩn đánh giá độ khả dụng phần mềm và trải nghiệm người dùng (0-100). |
| KPI | Key Performance Indicator - Chỉ số Hiệu quả Nghiệp vụ Định lượng dùng đo lường hiệu quả vận hành (xem Bảng 1.1). |
| FR | Functional Requirement - Yêu cầu Chức năng của hệ thống (FR-01 đến FR-15, xem Mục 3.1). |
| UC | Use Case - Ca sử dụng, mô tả một tương tác cụ thể giữa Actor và hệ thống (xem Mục 4.2). |
| FLD | Field — Trường dữ liệu/giao diện tương tác cụ thể trong hệ thống (FLD-01 đến FLD-30, xem Mục 3.1.4). |
| SLO | Service Level Objective - Mục tiêu định lượng về mức độ dịch vụ kỹ thuật (hiệu năng, độ trễ, khả dụng). |

## 1.5. Tài liệu tham chiếu (References)

• Thông tư số 27/2020/TT-BGDĐT quy định đánh giá học sinh tiểu học.

• Thông tư số 32/2018/TT-BGDĐT ban hành Chương trình Giáo dục phổ thông mới.

• Thông tư số 51/2020/TT-BGDĐT sửa đổi, bổ sung Chương trình Giáo dục mầm non.

• Thông tư số 37/2021/TT-BGDĐT quy định Danh mục thiết bị dạy học tối thiểu cấp Tiểu học.

• Quyết định số 830/QĐ-TTg phê duyệt Chương trình "Bảo vệ và hỗ trợ trẻ em tương tác lành mạnh, sáng tạo trên môi trường mạng giai đoạn 2021-2025".

• IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications.

• ISO/IEC/IEEE 29148: Systems and software engineering — Life cycle processes — Requirements engineering.

• The Unified Modeling Language (UML) Specification — Object Management Group (OMG).

## 1.6. Tổng quan cấu trúc tài liệu (Document Overview)

Tài liệu Đặc tả Yêu cầu Phần mềm (SRS) này được cấu trúc chặt chẽ thành 5 chương chính, được sắp xếp theo trình tự logic kỹ thuật từ tổng quan bối cảnh, đặc tả chi tiết, kiểm thử, bảo trì đến mô hình hóa UML và ma trận phụ lục:

• Chương 1. Giới thiệu (Introduction): Xác định mục đích xây dựng tài liệu, định ranh giới phạm vi thực thi sản phẩm (In-Scope, Out-of-Scope & Bảng 1.1 Chỉ số KPI Nghiệp vụ Định lượng), phân loại đối tượng tra cứu, cung cấp bảng chuẩn hóa thuật ngữ/từ viết tắt và hệ thống các văn bản pháp lý, quy chuẩn sư phạm làm căn cứ chiếu ứng.

• Chương 2. Mô tả tổng quan (Overall Description): Phác họa vị trí hệ thống, dòng chảy dữ liệu nghiệp vụ 5 bước (Workflow Dataflow), ma trận phân loại tác nhân người dùng (Giáo viên, Học sinh, Admin), hạ tầng môi trường vận hành & ma trận stack công nghệ, các giả định/sự phụ thuộc API bên thứ ba, các ràng buộc thiết kế kỹ thuật, Sơ đồ Luồng Nghiệp vụ Hệ thống (Mục 2.6) và Sơ đồ Kiến trúc Tổng quan Dự án (Mục 2.7).

• Chương 3. Yêu cầu Cụ thể (Specific Requirements): Trình bày chi tiết Yêu cầu Chức năng (Mục 3.1: FR-01 đến FR-15 kèm ma trận trường giao diện FLD-01 đến FLD-30), Yêu cầu Giao diện Ngoại vi (Mục 3.2), Yêu cầu Phi Chức năng (Mục 3.3: NFR-01 đến NFR-05), Quy trình Kiểm thử & Thẩm định (Mục 3.4) và Kế hoạch Bảo trì & Hỗ trợ Vận hành (Mục 3.5).

• Chương 4. Yêu cầu Mô hình hóa (Modeling Requirements): Tổng hợp toàn bộ các mô hình thiết kế hướng đối tượng (OOAD/UML) bao gồm Sơ đồ Ca sử dụng (Use Case Diagram), Bảng Đặc tả Chi tiết Ca sử dụng (Use Case Specification), Sơ đồ Lớp (Class Diagram) và các Sơ đồ Tuần tự (Sequence Diagrams).

• Chương 5. Phụ lục và Ma trận Truy xuất (Appendices & Traceability Matrix): Bao gồm Ma trận Truy xuất Yêu cầu 2 chiều (RTM), Cấu trúc Game JSON DSL Schema, System Prompt ACTIVE v1.0.0, Danh mục Văn bản Pháp lý và Sơ đồ Kiến trúc Hạ tầng.

# CHƯƠNG 2. MÔ TẢ TỔNG QUAN (OVERALL DESCRIPTION)

Hệ thống cung cấp bốn nhóm chức năng cốt lõi: (1) Sáng tạo trò chơi học tập từ mô tả ý tưởng hoặc giáo án có sẵn bằng AI; (2) Không gian soạn thảo trực quan giúp giáo viên rà soát, chỉnh sửa và yêu cầu AI thiết kế lại nội dung; (3) Tổ chức trình chiếu và tương tác lớp học theo thời gian thực giữa giáo viên và học sinh; (4) Quản trị, kiểm duyệt an toàn nội dung và điều phối cấu hình AI dành cho Quản trị viên. Các mục từ 2.1 đến 2.7 mô tả chi tiết bối cảnh, tác nhân, môi trường vận hành và các ràng buộc liên quan đến các nhóm chức năng này; đặc tả đầy đủ từng yêu cầu chức năng được trình bày tại Chương 3.

## 2.1. Bối cảnh hệ thống & Dòng chảy dữ liệu 5 bước (System Perspective & Workflow Dataflow)

### 2.1.1. Vị trí và bản chất hệ thống (System Perspective)

Nền tảng đóng vai trò là trung tâm chuyển đổi và tương tác học liệu số thông minh, đứng ở vị trí cầu nối trực tiếp giữa 4 thành tố cốt lõi trong môi trường giáo dục thế hệ mới:

• Giáo viên (Người sáng tạo): Nhóm người dùng có ý tưởng sư phạm dồi dào nhưng thường gặp rào cản về thời gian và kỹ năng thiết kế phần mềm.

• Chuẩn kiến thức Giáo dục (Căn cứ pháp lý & Sư phạm): Hệ thống các Yêu cầu cần đạt thuộc Chương trình Giáo dục Phổ thông và Giáo dục Mầm non do Bộ Giáo dục và Đào tạo ban hành.

• Học sinh (Người thụ hưởng): Lứa tuổi mầm non và tiểu học cần tiếp thu kiến thức qua các hình thức tương tác trực quan, sinh động và an toàn.

• Quản trị viên (Người giám sát): Vai trò vận hành hệ thống, đảm bảo an toàn nội dung học đường và tối ưu hóa chi phí hạ tầng vận hành.

Hệ thống tiếp nhận ngữ liệu tiếng Việt tự nhiên của giáo viên, tự động bóc tách ý định sư phạm ngầm, đối chiếu chuẩn kiến thức, kiểm duyệt an toàn học đường và biên dịch thành bài học tương tác hai chiều trên các thiết bị hiển thị tại lớp học hoặc học tập từ xa.

### 2.1.2. Dòng chảy dữ liệu nghiệp vụ 5 bước (5-Step Business Dataflow)

Dữ liệu trong hệ thống di chuyển theo một chu trình 5 bước khép kín và liên tục:

• Bước 1 - Tiếp nhận và chuẩn hóa ngữ liệu đầu vào: Giáo viên lựa chọn Khối lớp, Môn học và cung cấp ý tưởng bài giảng (nhập câu chữ tiếng Việt trực tiếp hoặc tải tệp tài liệu giáo án nếu có); Thể loại trò chơi là thông tin tùy chọn, nếu giáo viên không chọn thì hệ thống sẽ đề xuất ở Bước 2. Hệ thống tiếp nhận, trích xuất toàn bộ nội dung văn bản thô, tự động phân lập các đoạn nội dung cốt lõi và chuẩn bị ngữ liệu cho khâu phân tích ý định sư phạm.

• Bước 2 - Phân tích ý định sư phạm & Trích xuất chuẩn kiến thức: Hệ thống phân tích bóc tách ý định của giáo viên: chủ đề bài học, mục tiêu cần đạt, số lượng câu hỏi và độ khó phù hợp với lứa tuổi. Tự động tra cứu và đối chiếu ngữ liệu với Kho dữ liệu Chuẩn kiến thức Giáo dục Phổ thông và Mầm non để tìm ra các Yêu cầu cần đạt tương ứng, bơm bổ sung bối cảnh kiến thức chuẩn xác vào nội dung bài học. Nếu giáo viên chưa chọn Thể loại trò chơi, hệ thống dựa trên chủ đề, mục tiêu và độ tuổi để đề xuất 2–3 thể loại phù hợp nhất trong 10 thể loại được hỗ trợ, kèm lý do sư phạm ngắn gọn; giáo viên xác nhận hoặc đổi thể loại trước khi hệ thống sinh nội dung.

• Bước 3 - Khởi tạo cấu trúc trò chơi & Kiểm duyệt an toàn 3 lớp: Hệ thống chuyển đổi ngữ liệu đã được làm giàu thành cấu trúc bài học hoàn chỉnh (bao gồm danh sách câu hỏi, phương án trả lời đúng/sai và phản hồi tương tác (lời giải thích sư phạm dự kiến bổ sung ở phiên bản schema 1.1.0)). Ngay lập tức, bài học được đưa qua lá chắn kiểm duyệt an toàn: rà quét toàn bộ từ vựng qua Bộ từ điển hạn chế dành cho lứa tuổi mầm non/tiểu học và kiểm tra tính hợp lệ của cấu trúc trò chơi. Ngăn chặn triệt để các nội dung lệch chuẩn trước khi chuyển sang khâu bổ sung đa phương tiện.

• Bước 4 - Bổ sung tài nguyên đa phương tiện & Giọng đọc: Hệ thống tự động phân tích ngữ cảnh từng câu hỏi để tìm kiếm các hình ảnh minh họa sinh động, tươi sáng, đạt chuẩn an toàn từ thư viện tài nguyên trực tuyến. Tự động tạo giọng đọc thuyết minh tiếng Việt chuẩn, truyền cảm cho toàn bộ nội dung câu hỏi và đáp án, giúp trẻ nhỏ dễ dàng tiếp thu bài học qua cả thị giác lẫn thính giác.

• Bước 5 - Trình chiếu trực quan & Tương tác Lớp học theo thời gian thực: Cấu hình trò chơi hoàn chỉnh được gửi đến Màn hình soạn thảo để giáo viên rà soát, chơi thử và tự tay tinh chỉnh nếu cần. Khi xuất bản, hệ thống cấp Mã tham gia trực tiếp. Giáo viên trình chiếu bài học trên màn hình lớn tại lớp, học sinh sử dụng máy tính bảng hoặc thiết bị cá nhân nhập mã để tham gia chơi tương tác hoặc thi đấu nhóm theo thời gian thực với bảng xếp hạng điểm số tức thì.

## 2.2. Đặc tả Tác nhân (User Characteristics)

Hệ thống xác định ba nhóm tác nhân chính tham gia trực tiếp vào chu trình khởi tạo, tương tác và quản trị học liệu số. Ma trận phân quyền và nhiệm vụ cốt lõi của từng tác nhân được đặc tả trong Bảng 2.1.

Bảng 2.1: Bảng Đặc tả Tác nhân & Phân quyền Vai trò Hệ thống

| Tác nhân (Actor) | Phân loại Tác nhân | Nhiệm vụ & Vai trò chính trong Hệ thống |
| --- | --- | --- |
| Giáo viên (Teacher) | Tác nhân người dùng chính (Primary User) | • Đăng ký & Xác thực tài khoản: Khởi tạo tài khoản mới và đăng nhập an toàn vào hệ thống.<br>• Cung cấp ý tưởng & Học liệu: Nhập mô tả ý tưởng bằng tiếng Việt tự nhiên hoặc tải tệp giáo án để khởi tạo trò chơi học tập.<br>• Tra cứu & Chuẩn hóa sư phạm: Ý tưởng trò chơi cần đạt thuộc Chương trình GDPT và Mầm non do Bộ GD&ĐT ban hành để liên kết trực tiếp vào bài học.<br>• Rà soát & Tinh chỉnh học liệu: Chơi thử trực quan, trực tiếp sửa câu chữ, chọn lại hình ảnh/âm thanh hoặc yêu cầu hệ thống thiết kế lại từng câu hỏi/toàn bộ trò chơi.<br>• Tổ chức tương tác lớp học: Trình chiếu trò chơi trên màn hình lớn tại lớp, khởi tạo phòng chơi và điều phối các trận thi đấu nhóm theo thời gian thực. |
| Học sinh (Student) | Tác nhân thụ hưởng trực tiếp (End User) | • Tham gia tương tác bài học: Nhập mã phòng chơi để tham gia bài học tương tác trên thiết bị cá nhân hoặc máy tính bảng mà không cần đăng ký tài khoản cá nhân.<br>• Thực hiện thao tác học tập: Thao tác trực tiếp trên giao diện tương tác hai chiều (kéo-thả, ghép cặp, lật thẻ, chọn đáp án trắc nghiệm).<br>• Lắng nghe & Nhận phản hồi: Tiếp thu nội dung qua giọng đọc thuyết minh tiếng Việt chuẩn, nhận phản hồi đúng/sai tức thì và theo dõi bảng xếp hạng thi đấu. |
| Quản trị viên (System Admin) | Tác nhân quản trị hệ thống (System Administrator) | • Giám sát an toàn học đường: Thiết lập ngưỡng kiểm duyệt nội dung, quản lý từ điển từ ngữ hạn chế và xử lý các cảnh báo vi phạm an toàn trẻ em.<br>• Quản lý hạ tầng & Chi phí: Theo dõi lưu lượng tiêu thụ tài nguyên dịch vụ, kiểm tra trạng thái sức khỏe máy chủ và tối ưu hóa ngân sách vận hành.<br>• Điều phối bộ não AI: Tinh chỉnh các tham số kỹ thuật điều khiển AI, đóng băng phiên bản Prompt chuẩn (v1.0.0) phục vụ lưu vết dữ liệu thực nghiệm.<br>• Quản lý người dùng & Nhật ký: Cấp phát, điều phối trạng thái (khóa/mở khóa) tài khoản giáo viên và lưu vết nhật ký thao tác an ninh hệ thống. |

Lưu ý: Cơ chế xác thực JWT Token (Access Token 15 phút, Refresh Token 24 giờ) áp dụng chung cho cả Giáo viên và Quản trị viên — chi tiết xem NFR-02 (Mục 3.3).

## 2.3. Môi trường vận hành & Ma trận Stack Công nghệ (Operating Environment & Technology Stack)

### 2.3.1. Kiến trúc Công nghệ Đề xuất (Proposed Technology Architecture)

Hệ thống được thiết kế theo kiến trúc AI-Native Modular Monolith linh hoạt, lựa chọn các công nghệ và thư viện chuyên biệt cho từng tầng xử lý nhằm tối ưu hóa hiệu năng, trải nghiệm tương tác trẻ em và khả năng mở rộng. Chi tiết vai trò chuyên biệt của từng công nghệ được tổng hợp tại Bảng 2.2.

Bảng 2.2: Bảng Ma trận Stack Công nghệ Hệ thống (Technology Stack Matrix)

| Tầng hệ thống | Công nghệ / Thư viện đề xuất | Vai trò chuyên biệt trong Hệ thống |
| --- | --- | --- |
| Frontend | React 19 (TypeScript & Vite) | Xây dựng giao diện Giáo viên (Teacher Portal) và giao diện chơi Học sinh (Student Runtime) mượt mà, quản lý state nhất quán. |
| Frontend (Game Engine) | Konva.js (react-konva) | Engine đồ họa 2D Canvas hiệu năng cao cho các tương tác chọn đáp án, kéo-thả, ghép cặp, lật thẻ trên màn hình cảm ứng/máy tính bảng. |
| Frontend (UI & Anim) | Tailwind CSS v4 + Canvas Confetti | Tạo giao diện trực quan, màu sắc bắt mắt và hiệu ứng chúc mừng khi trẻ trả lời đúng hoặc hoàn thành bài học. |
| Frontend (Mã QR) | qrcode.react | Vẽ mã QR cho đường dẫn vào phòng chơi và liên kết chia sẻ trò chơi. |
| Frontend (Âm thanh) | Howler.js | Quản lý audio sprites và hiệu ứng âm thanh game (tiếng "ting" khi đúng, "boing" khi kéo thẻ, âm thanh cổ vũ). |
| Backend Framework | Spring Boot 4.1 (Java 21 LTS) | Xử lý API RESTful, quản lý các phân hệ nghiệp vụ tách biệt (Intent Parser, Content Generator, Validation Engine, Rate Limiter). |
| Backend (AI Orchestration) | LangChain4j | Tích hợp vào Spring Boot để gọi LLM API với Structured Outputs theo JSON Schema đã chốt. |
| Backend (Tài liệu) | Apache Tika / Apache PDFBox | Trích xuất văn bản từ tệp Word (.docx) và PDF giáo án do giáo viên tải lên (FR-03). |
| Backend (Bảo mật) | Spring Security + JWT (jjwt) | Cấp quyền đăng nhập cho giáo viên và quản trị viên; hỗ trợ khởi tạo mã tham gia ẩn danh (PIN phòng chơi, ShareCode trò chơi) cho học sinh vào chơi. |
| Backend (Validation) | Jackson + JSON Schema Validator | Kiểm tra nghiêm ngặt tính toàn vẹn cú pháp và logic (3 lớp validation) của JSON do LLM sinh ra trước khi lưu vào cơ sở dữ liệu. |
| Backend (Real-time) | Spring WebSocket + STOMP (kèm SockJS) | Kết nối Socket hai chiều theo thời gian thực giữa thiết bị giáo viên và máy khách học sinh. |
| AI & Safety | Google Gemini (Structured Outputs) | Phân tích yêu cầu tiếng Việt tự nhiên và ép mô hình AI trả về kết quả tuân thủ định dạng Game Schema định trước. |
| AI & Safety (Kiểm duyệt) | OpenAI Moderation API + danh sách từ cấm học đường | Kiểm duyệt nội dung tự động đa tầng cho câu lệnh đầu vào và kết quả sinh ra. |
| AI & Safety (Hình ảnh) | Pexels API | Truy vấn hình ảnh an toàn theo từ khóa với chế độ SafeSearch tối đa. |
| AI & Safety (Giọng đọc) | Google Text-to-Speech | Tạo giọng đọc AI chuẩn phát âm tiếng Việt, hỗ trợ chọn giọng Nam/Nữ. |
| Dữ liệu & DevOps | PostgreSQL 15+ (Supabase), Flyway | Lưu trữ tài khoản, trò chơi (các bảng quan hệ kèm trường schemaVersion), phiên chơi và kết quả lượt chơi; schema do Flyway quản lý. |
| Dữ liệu & DevOps (Deploy) | Vercel (FE) + Render / Railway (BE) | Triển khai hạ tầng điện toán đám mây tự động hóa quy trình CI/CD. |

### 2.3.2. Yêu cầu Môi trường Vận hành Khách & Máy chủ (Runtime Requirements)

• Môi trường máy khách (Client Runtime): Thiết bị (Máy tính, Máy tính bảng, Tivi thông minh) chạy các trình duyệt web hiện đại (Google Chrome, Microsoft Edge, Mozilla Firefox) có hỗ trợ chuẩn HTML5 Canvas 2D, WebGL và Web Audio API.

• Môi trường máy chủ (Server Runtime): Hạ tầng điện toán đám mây Dockerized Container (Java 21, Spring Boot 4.1), hỗ trợ kết nối mạng băng thông rộng HTTPS/TLS 1.3 và WebSocket STOMP bảo mật.

## 2.4. Giả định và Sự phụ thuộc (Assumptions & Dependencies)

Dịch vụ AI bên thứ ba (Google Gemini API, Pexels API, Google Text-to-Speech) duy trì tỉ lệ khả dụng (Uptime >= 99.0%).

Trình duyệt phía máy khách của giáo viên và học sinh duy trì kết nối Internet ổn định trong suốt phiên học.

Dữ liệu Chuẩn YCCĐ GDPT 2018 và Mầm non được cập nhật đồng bộ trong hệ thống cơ sở dữ liệu.

## 2.5. Các ràng buộc thiết kế & vận hành (Constraints)

- Ràng buộc ngôn ngữ: Giao diện và toàn bộ nội dung trò chơi hỗ trợ 100% tiếng Việt chuẩn.
- Ràng buộc an toàn trẻ em: Tuân thủ nghiêm ngặt Quyết định 830/QĐ-TTg, kiểm duyệt 100% hình ảnh và từ vựng.
- Ràng buộc Prompt Versioning: Đóng băng (Freeze) phiên bản Prompt ACTIVE v1.0.0 phục vụ lưu vết dữ liệu thực nghiệm Chương 4 luận văn.
- Ràng buộc Hạ tầng & Chi phí: Ưu tiên sử dụng gói miễn phí (Free Tier) của các dịch vụ Cloud (Vercel, Render/Railway, Supabase/Neon) trong giai đoạn đồ án, giới hạn tài nguyên CPU/RAM/Storage và băng thông theo chính sách nhà cung cấp.

## 2.6. Sơ đồ Luồng Nghiệp vụ Hệ thống (Business Flow Diagram)

[hình ảnh]

## 2.7. Kiến trúc Tổng quan Dự án (Project Architecture Overview & Layered Design)

[hình ảnh]

# CHƯƠNG 3. YÊU CẦU CỤ THỂ (SPECIFIC REQUIREMENTS)

## 3.1. Functional Requirements (Yêu cầu Chức năng)

### 3.1.1. Chiến lược Xử lý Lỗi Hạ tầng & Mạng Toàn cục (Global Error Handling Strategy)

Để tối ưu hóa trải nghiệm người dùng và đảm bảo hệ thống vận hành liên tục, toàn bộ các sự cố kỹ thuật hạ tầng được quy chuẩn xử lý tự động theo 5 kịch bản sau:

1. Sự cố Mất kết nối Mạng (Network Disconnect / Offline): Tự động lưu bản nháp trạng thái vào LocalStorage, hiển thị cảnh báo "Đang mất kết nối - Dữ liệu đã lưu an toàn", tự động đồng bộ lại khi có kết nối.

2. Sự cố Quá thời gian phản hồi AI (LLM Timeout > 5s): Hệ thống phân định rõ ràng giữa mục tiêu thời gian phản hồi chuẩn (SLO < 3 giây) và ngưỡng giới hạn chờ tối đa (Timeout > 5 giây). Khi gọi LLM Pipeline, mục tiêu chuẩn là hoàn tất dưới 3 giây; nếu phản hồi bị trễ vượt quá ngưỡng chờ tối đa (> 5s), hệ thống sẽ hiển thị thanh chờ linh hoạt và tự động kích hoạt chuyển sang tuyến AI dự phòng (Fallback Provider); nếu quá hạn trả về bộ khung mẫu an toàn đóng gói sẵn.

3. Sự cố Dữ liệu AI sinh ra bị lỗi cấu trúc (Invalid JSON Schema): Áp dụng cơ chế kiểm tra 3 lớp theo quy tắc xác định (rule-based): (1) JSON Schema, (2) quy tắc nghiệp vụ theo từng thể loại (ví dụ: có đúng 1 đáp án đúng, số cặp ghép hợp lệ), (3) an toàn nội dung. Lỗi được phát hiện trong < 100ms bởi validator, hệ thống ngắt luồng (Fail-Fast) và yêu cầu LLM sinh lại phần bị lỗi kèm danh sách lỗi do validator chỉ ra (tối đa 2 lần gọi lại, tức tối đa 3 lần gọi tính cả lần đầu); việc phán định đúng/sai do validator quyết định, không dựa vào LLM tự đánh giá. Cam kết 100% không để dữ liệu lỗi làm sập giao diện (Crash UI).

4. Sự cố Quá hạn mức lượt gọi / Quá tải (Rate Limit 429): Xếp hàng chờ thông minh (Request Queueing), hiển thị đếm ngược thời gian chờ rõ ràng (vd: "Hệ thống đang quá tải, vui lòng chờ 15s...").

5. Sự cố Máy chủ Backend (Error): Hiển thị thông báo thân thiện kèm nút "Thử lại", bảo toàn dữ liệu giáo viên vừa nhập và tự động lưu vết nhật ký lỗi (Error Log).

### 3.1.2. Tổng quan các Phân hệ Hệ thống (System Subsystems Overview)

Chương trình được chia thành các phân hệ giao diện và xử lý độc lập nhưng kết nối chặt chẽ:

• Phân hệ Giáo viên (Teacher Portal): Tối ưu cho PC/Laptop với 4 khối chức năng (Khởi tạo trò chơi từ văn bản/giáo án, Soạn thảo trực quan Workspace Editor, Trình chiếu & Điều khiển Live Arena).

• Phân hệ Học sinh (Student Runtime Engine): Tối ưu cho Tablet/Cảm ứng với 3 khối chức năng (Tham gia 1-Click nhập mã PIN phòng chơi hoặc mã chia sẻ trò chơi, không cần tài khoản, Thao tác Canvas 2D mượt mà 60 FPS, Hỗ trợ giọng đọc AI và Bảng xếp hạng điểm số).

• Phân hệ Quản trị & Kiểm duyệt (Admin & Moderation Portal): Dành cho Quản trị viên theo dõi sức khỏe hệ thống, chi phí API, quản lý tài khoản giáo viên, điều chỉnh bộ não AI và kiểm duyệt an toàn nội dung học đường.

### 3.1.3. Danh mục Yêu cầu Chức năng Chi tiết (Functional Requirements Summary - FR-01 đến FR-15)

Để đáp ứng đầy đủ các mục tiêu nghiệp vụ sư phạm đã đề ra và tối ưu hóa trải nghiệm của giáo viên lẫn học sinh, hệ thống quy định 15 yêu cầu chức năng cốt lõi (FR-01 đến FR-15). Danh mục chi tiết các chức năng, ca sử dụng ánh xạ, tác nhân chính và tiêu chí chấp nhận tương ứng được trình bày cụ thể tại Bảng 3.1.

Bảng 3.1: Bảng Tổng hợp Yêu cầu Chức năng & Ánh xạ Ca sử dụng (FR vs UC Mapping)

| Mã FR | Tên Yêu cầu Chức năng | Ánh xạ Mã UC | Tên Use case chuẩn hóa | Tác nhân chính | Tiêu chí Chấp nhận (Acceptance Criteria) |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Đăng ký Tài khoản Người dùng | UC-01 | Đăng ký | Giáo viên | Cho phép giáo viên đăng ký tài khoản mới; giáo viên và quản trị viên đăng nhập xác thực an toàn vào hệ thống (tài khoản quản trị viên do hệ thống cấp sẵn, không đăng ký công khai). Hệ thống sử dụng cơ chế JWT Token với Access Token hiệu lực 15 phút và Refresh Token duy trì phiên tự động trong 24 giờ, phân quyền chính xác theo vai trò (ROLE_TEACHER, ROLE_ADMIN). |
| FR-02 | Sáng tạo Trò chơi từ Mô tả Ý tưởng & Giáo án | UC-02 | Gửi mô tả trò chơi | Giáo viên | Tiếp nhận câu lệnh mô tả bài học hoặc tệp giáo án (.docx, .pdf); gọi phân hệ AI và tra cứu YCCĐ để sinh cấu trúc trò chơi mới dạng bản nháp và hiển thị bản chơi thử trực quan cho giáo viên. |
| FR-03 | Trải nghiệm & Kiểm thử Trực quan Bài học | UC-03 | Chơi thử | Giáo viên | Cho phép giáo viên trải nghiệm trực tiếp trò chơi dưới góc nhìn học sinh trên màn hình Interactive Preview mà không làm ghi nhận điểm số hay làm thay đổi trạng thái xuất bản. |
| FR-04 | Quản lý & Soạn thảo Trò chơi trên Workspace Editor | UC-04 | Chỉnh sửa trò chơi (Không gian soạn thảo Workspace Editor) | Giáo viên | Cho phép giáo viên mở không gian soạn thảo Workspace Editor, quản lý toàn bộ danh sách thẻ câu hỏi, xem trước giao diện và lưu trữ bản nháp cập nhật nhất. |
| FR-05 | Tinh chỉnh Nội dung & Thuộc tính Thẻ thủ công | UC-05 | Chỉnh sửa thủ công | Giáo viên | Cho phép giáo viên tự tay chỉnh sửa câu chữ, điều chỉnh đáp án đúng/sai, thay đổi hình ảnh và âm thanh minh họa; hệ thống vẽ lại giao diện xem trước ngay lập tức. |
| FR-06 | Tái tạo & Thiết kế lại Câu hỏi bằng AI | UC-06 | Yêu cầu AI làm lại trò chơi | Giáo viên | Gửi yêu cầu AI sinh lại riêng lẻ 1 thẻ câu hỏi/nội dung chưa ưng ý theo câu lệnh điều chỉnh mới, bảo toàn nguyên vẹn các câu hỏi còn lại và cập nhật lên màn hình chơi thử. |
| FR-07 | Đóng gói, Lưu trữ & Xuất bản Học liệu | UC-07 | Lưu và Xuất bản trò chơi | Giáo viên | Lưu cấu hình bài học vào cơ sở dữ liệu; khi xuất bản, chuyển trạng thái game sang PUBLISHED, tự động sinh mã chia sẻ trò chơi (ShareCode, 6 ký tự chữ và số), liên kết URL và mã QR để gửi cho học sinh tự luyện tập. |
| FR-08 | Tự Luyện tập & Tương tác Cá nhân tại Nhà | UC-08 | Tự luyện tập cá nhân | Học sinh | Cho phép học sinh tham gia trò chơi đã xuất bản qua mã chia sẻ / mã QR / URL mà không cần đăng nhập; mỗi lượt chơi là một phiên tự luyện (SELF) ghi nhận kết quả kèm tên hiển thị, cho phép chơi lại và đưa ra phản hồi khích lệ phù hợp. |
| FR-09 | Tham gia Phòng chơi Tập thể (Live Arena) | UC-09 | Tham gia trò chơi | Học sinh | Cho phép học sinh tham gia vào phòng chơi do giáo viên mở (phiên SOLO chơi cá nhân hoặc phiên TEAM thi đấu nhóm) qua mã PIN/QR; ghi nhận tiến trình, câu trả lời; tính điểm theo đáp án và tốc độ phản hồi; cập nhật bảng xếp hạng (theo cá nhân hoặc theo đội) đồng bộ trong phạm vi phòng chơi trực tiếp; giáo viên điều khiển phòng qua các trạng thái Chờ, Đang diễn ra, Tạm dừng, Kết thúc. |
| FR-10 | Tương tác Đồ họa Kéo-thả & Lật thẻ trên Canvas 2D | UC-10 | Tương tác kéo thả, lật thẻ trên màn hình | Học sinh | Tiếp nhận thao tác chạm/chuột kéo-thả, lật thẻ mượt mà trên Student Runtime Canvas 2D Engine; xác định kết quả đúng/sai và phát phản hồi âm thanh tức thì. |
| FR-11 | Thuyết minh Giọng đọc Trợ lý AI (Text-to-Speech) | UC-11 | Nghe giọng đọc thuyết minh | Học sinh | Tự động phát âm thanh giọng đọc AI đọc to câu hỏi, từ vựng hoặc hướng dẫn trò chơi, hỗ trợ học sinh mầm non và tiểu học tiếp thu kiến thức dễ dàng. |
| FR-12 | Giám sát Hạ tầng Máy chủ & Chi phí Vận hành AI | UC-12 | Theo dõi chi phí và trạng thái hoạt động | Quản trị viên | Hiển thị báo cáo thống kê trực quan về mức độ tiêu thụ token AI, chi phí API Gemini, biểu đồ lưu lượng và bảng trạng thái sức khỏe máy chủ cho quản trị viên. |
| FR-13 | Quản lý Tài khoản Giáo viên & Audit Log Hệ thống | UC-13 | Quản lý danh sách giáo viên | Quản trị viên | Hiển thị danh sách tài khoản giáo viên theo bộ lọc/tìm kiếm; điều phối trạng thái (Hoạt động / Bị khóa) và ghi vết nhật ký thao tác quản trị (Audit Log) đầy đủ. |
| FR-14 | Điều chỉnh Cấu hình Bộ não AI | UC-14 | Điều chỉnh cài đặt bộ não AI | Quản trị viên | Cho phép quản trị viên tinh chỉnh các tham số kỹ thuật điều khiển AI (Temperature, Max Tokens, ngưỡng kiểm duyệt an toàn), đóng băng hoặc khôi phục phiên bản Prompt chuẩn và ghi nhận đầy đủ vào nhật ký thao tác quản trị. |
| FR-15 | Đăng nhập Hệ thống | UC-15 | Đăng nhập | Giáo viên, Quản trị viên | Cho phép Actor đã có tài khoản đăng nhập an toàn vào hệ thống, xác thực đúng vai trò và được chuyển đến màn hình chính tương ứng; từ chối đăng nhập khi sai thông tin hoặc tài khoản đang bị khóa. |

### 3.1.4. Ma trận Đặc tả Trường Giao diện Tương tác (Interface Field Specs - FLD-01 đến FLD-30)

Chi tiết về loại điều khiển giao diện, kiểu dữ liệu và quy tắc kiểm tra logic cho 30 trường thành phần tương tác cốt lõi được đặc tả tại Bảng 3.2.

Bảng 3.2: Ma trận Đặc tả Trường Giao diện Tương tác (FLD-01 đến FLD-30)

| Mã FLD | Tên Component | Loại Control | Kiểu dữ liệu | Bắt buộc | Quy tắc Kiểm tra Logic |
| --- | --- | --- | --- | --- | --- |
| FLD-01 | Khối lớp | Dropdown Select | String | Có | Chọn 1 trong các khối: Mầm non (3-5 tuổi), Lớp 1, Lớp 2, Lớp 3, Lớp 4, Lớp 5. |
| FLD-02 | Môn học | Dropdown Select | String | Có | Danh mục môn học chuẩn theo Thông tư 32/2018/TT-BGDĐT. |
| FLD-03 | Mô tả ý tưởng bài học | Textarea | String | Có | Tối thiểu 10 ký tự, tối đa 2.000 ký tự tiếng Việt. |
| FLD-04 | Tệp giáo án đính kèm | File Upload | Binary (.pdf/.docx) | Không | Dung lượng tệp tối đa 10MB, tự động trích xuất qua Apache Tika. |
| FLD-05 | Nội dung câu hỏi | Rich Text Editor | String | Có | Tối đa 500 ký tự, hỗ trợ đính kèm hình ảnh/âm thanh. |
| FLD-06 | Danh sách đáp án | Dynamic List Input | Array of Objects | Có | Tối thiểu 2 đáp án, tối đa 4 đáp án; bắt buộc chọn đúng 1 đáp án đúng. |
| FLD-07 | Thời gian trả lời câu hỏi | Number Input / Slider | Integer (giây) | Có | Giá trị từ 10 giây đến 120 giây (mặc định 30 giây). |
| FLD-08 | Mã phòng chơi (PIN) | Text Display / PIN | String (6 chữ số) | Có | Tự động sinh ngẫu nhiên, duy nhất trong các phòng chưa kết thúc; chỉ có hiệu lực trong một phiên Live Arena do giáo viên mở. Khác với mã chia sẻ trò chơi (ShareCode, 6 ký tự) được cấp khi xuất bản. |
| FLD-09 | Tên người chơi (Học sinh) | Text Input | String | Có | Từ 1 đến 20 ký tự; không trùng với người chơi khác trong cùng phiên; tự động từ chối từ ngữ không phù hợp. Chỉ dùng biệt danh, hệ thống không thu thập thông tin nhận dạng cá nhân của học sinh. |
| FLD-10 | Ngưỡng kiểm duyệt an toàn | Slider Control | Float (0.0 - 1.0) | Có | Mặc định 0.85 (nghiêm ngặt cho lứa tuổi mầm non/tiểu học). |
| FLD-11 | URL/Tệp Hình ảnh minh họa | Image Picker / Upload | String / Binary | Không | Định dạng JPG/PNG/WebP, dung lượng <= 5MB, truy vấn SafeSearch qua Pexels API hoặc tải lên từ máy. |
| FLD-12 | Tùy chọn Giọng đọc AI TTS | Radio Select | String | Có | Lựa chọn giọng đọc Nam/Nữ (giọng tiếng Việt chuẩn của dịch vụ Google Text-to-Speech); lựa chọn được lưu cùng trò chơi để dùng khi tạo lại từng câu. |
| FLD-13 | Khối Giải thích / Gợi ý Sư phạm (dự kiến schema 1.1.0) | Rich Text Editor | String | Không | Tối đa 300 ký tự, hiển thị sau khi học sinh trả lời hoặc khi bấm nút gợi ý. |
| FLD-14 | Nút Tạo lại câu hỏi AI (Regenerate) | Button Action | Trigger | Không | Gửi prompt yêu cầu LLM sinh lại 1 câu hỏi cụ thể, giữ nguyên các câu hỏi khác. |
| FLD-15 | Thể loại trò chơi (Game Type) | Radio Group / Card Select | Enum | Không | Giao diện yêu cầu chọn 1 trong 10 loại trò chơi: Trắc nghiệm (Quiz), Nghe chọn hình (Audio-Visual Match), Tìm điểm khác loại (Odd One Out), Tìm vật trong ảnh (Spot the Target), Xếp chữ (Word Scramble), Ghép cặp (Matching), Lật thẻ ghi nhớ (Memory Card), Kéo-thả phân loại (Drag & Drop), Sắp xếp thứ tự (Ordering), Điền vào chỗ trống có hình (Visual Cloze). Trường không bắt buộc: nếu giáo viên không chọn, hệ thống đề xuất 2–3 thể loại phù hợp nhất kèm lý do ngắn gọn (dựa trên chủ đề, mục tiêu và độ tuổi) để giáo viên chọn. |
| FLD-16 | Điểm số & Thời gian hoàn thành | Number Display | Integer | Tự động | Điểm cộng dồn dựa trên đáp án đúng và tốc độ phản hồi (ms) trong lượt chơi. Trả lời đúng được điểm_câu × (1 − 0,5 × tỉ lệ thời gian đã dùng), tức đúng ngay lập tức được trọn điểm, đúng sát giờ còn 50%; trả lời sai, bỏ qua hoặc hết giờ được 0 điểm. Điểm của đội trong chế độ thi đấu nhóm là điểm trung bình của các thành viên. |
| FLD-17 | Thanh tiến trình bài học (Progress) | Progress Bar | Float (%) | Tự động | Tỉ lệ % số câu hỏi đã hoàn thành trong trò chơi tương tác Canvas 2D. |
| FLD-18 | Vùng tương tác Kéo-thả (Canvas Zone) | Interactive Area | Event Object | Có | Xử lý tọa độ x,y mượt mà 60 FPS qua Konva.js Engine (kéo-thả trực tiếp trên Canvas). |
| FLD-19 | Bảng xếp hạng Live Arena | Real-time Table | Array of Objects | Tự động | Cập nhật thứ hạng top học sinh thời gian thực qua Spring WebSocket STOMP. |
| FLD-20 | Trạng thái phòng chơi (Live Arena State) | Toggle Switch | Enum | Có | Các trạng thái của phòng chơi: Chờ (WAITING), Đang diễn ra (ACTIVE), Tạm dừng (PAUSED), Kết thúc (CLOSED). Giáo viên chuyển trạng thái bằng các thao tác Bắt đầu, Tạm dừng, Tiếp tục và Kết thúc. |
| FLD-21 | Tham số Nhiệt độ AI (Temperature) | Slider Control | Float (0.0 - 1.0) | Có | Mặc định 0.3 (đảm bảo tính chính xác sư phạm), tối đa 1.0 cho tính sáng tạo. |
| FLD-22 | Giới hạn Token tối đa (Max Tokens) | Number Input | Integer | Có | Giới hạn từ 500 đến 4.000 tokens cho mỗi yêu cầu gọi LLM API. |
| FLD-23 | Phiên bản System Prompt | Dropdown Select | String | Có | Khóa định danh phiên bản Prompt (mặc định ACTIVE v1.0.0, SHA-256 Hash). |
| FLD-24 | Trạng thái Kết nối WebSocket | Status Badge | Enum | Tự động | Hiển thị Connected / Reconnecting / Disconnected kèm cơ chế Auto-reconnect. |
| FLD-25 | Danh mục Từ cấm (Safety Blacklist) | Tag Input / Textarea | Array of Strings | Không | Danh sách từ ngữ nhạy cảm cập nhật bộ nhớ tạm (In-Memory Cache) Hot Reload. |
| FLD-26 | Trạng thái Tài khoản Giáo viên | Toggle Switch | Boolean | Có | Active (Kích hoạt) / Locked (Tạm khóa) do Quản trị viên điều phối. |
| FLD-27 | Phân quyền Tài khoản (Role) | Dropdown Select | Enum | Có | Phân quyền: ROLE_TEACHER (Giáo viên) hoặc ROLE_ADMIN (Quản trị viên). |
| FLD-28 | Nhật ký Thao tác An ninh (Audit Log) | Data Grid Table | Array of Objects | Tự động | Lưu vết IP, Timestamp, Actor ID, Thao tác API và kết quả kiểm duyệt an toàn. |
| FLD-29 | Biểu đồ Chi phí & Token API | Line / Bar Chart | Array of Metrics | Tự động | Thống kê lượng token tiêu thụ và chi phí API quy đổi theo ngày/tháng. |
| FLD-30 | Nút Xuất bản & Chia sẻ Trò chơi | Button Group | Trigger | Có | Đóng gói Game JSON DSL, cấp mã chia sẻ trò chơi (ShareCode) và xuất bản lên kho học liệu dùng chung. |

## 3.2. External Interface Requirements (Yêu cầu Giao diện Ngoại vi)

Mục Yêu cầu Giao diện Ngoại vi quy định chi tiết các chuẩn kết nối, hình thức tương tác giao diện người dùng, phương thức giao tiếp phần cứng, hợp đồng giao tiếp dịch vụ phần mềm bên thứ ba và giao thức truyền thông mạng. Việc chuẩn hóa các giao diện này đảm bảo tính khả dụng, tính tương thích hệ thống cao và trải nghiệm mượt mà cho đối tượng học sinh mầm non/tiểu học và giáo viên.

### 3.2.1. Giao diện Người dùng (User Interfaces)

• Phân hệ Giáo viên (Teacher Portal): Thiết kế giao diện không gian làm việc Workspace Editor trực quan, hiện đại trên trình duyệt PC/Laptop. Giao diện tích hợp bộ công cụ kéo-thả (Drag & Drop), vùng xem trước bài học thời gian thực (Live Preview) và bảng điều khiển trực quan cho phép giáo viên rà soát, chỉnh sửa câu hỏi, thay đổi hình ảnh/âm thanh hoặc kích hoạt AI sinh lại bài học chỉ với một thao tác nhấp chuột.

• Phân hệ Học sinh (Student Runtime Engine): Tối ưu hóa giao diện tương tác trên nền đồ họa Canvas 2D (sử dụng Konva.js). Giao diện sử dụng tông màu tươi sáng, sinh động, biểu tượng icon trực quan (vector stickers), phông chữ chuẩn tiểu học nét lớn, phối hợp nút bấm chạm kích thước lớn (Large Touch Targets >= 48px) giúp trẻ nhỏ mầm non và tiểu học dễ dàng thao tác chạm, chọn đáp án, lật thẻ và kéo-thả ghép cặp mà không gặp rào cản kỹ thuật.

### 3.2.2. Giao diện Phần cứng (Hardware Interfaces)

• Thiết bị di động & Máy tính bảng: Tương thích 100% với màn hình cảm ứng điện dung đa điểm (Capacitive Touchscreen) trên các thiết bị iPad, máy tính bảng Android, điện thoại thông minh (độ phân giải tối thiểu 320x568px đến 2K/4K).

• Thiết bị trình chiếu Lớp học: Tương thích hoàn hảo với Bảng tương tác thông minh (Smart Interactive Whiteboard), Màn hình Tivi cảm ứng kích thước lớn (Smart TV) và Máy chiếu hỗ trợ kết nối qua cổng HDMI hoặc truyền chiếu không dây (Wireless Display / Chromecast / AirPlay) phục vụ tổ chức Đấu trường Live Arena tại lớp học.

### 3.2.3. Giao diện Phần mềm & Dịch vụ Bên thứ ba (Software Interfaces)

• Giao diện Dịch vụ Trí tuệ Nhân tạo (AI LLM API): Giao tiếp với Google Gemini API thông qua định dạng chuẩn RESTful HTTP JSON. Phân hệ Backend sử dụng LangChain4j để quản lý kết nối, áp dụng chế độ Structured Outputs nhằm ép mô hình AI trả về đúng 100% cấu trúc Game JSON DSL.

• Giao diện Kho Tài nguyên Đa phương tiện (Media APIs): Kết nối trực tiếp Pexels REST API với tham số SafeSearch = True để truy vấn hình ảnh an toàn; Tích hợp Google Text-to-Speech API để tự động chuyển đổi câu hỏi văn bản thành tệp âm thanh thuyết minh tiếng Việt (.mp3) truyền cảm.

• Giao diện Cơ sở Dữ liệu & Lưu trữ (Database & Storage): Kết nối cơ sở dữ liệu PostgreSQL 15+ thông qua Spring Data JPA và JDBC Driver; Tra cứu Yêu cầu cần đạt (YCCĐ) theo khối lớp và môn học từ kho dữ liệu chuẩn kiến thức trong cơ sở dữ liệu, đưa vào câu lệnh gửi cho AI để bám sát chương trình; mã YCCĐ chỉ dùng nội bộ để làm giàu câu lệnh, không hiển thị trong cấu trúc trò chơi. Nâng cấp lên tìm kiếm ngữ nghĩa bằng vector (pgvector, HNSW) là hướng phát triển.

### 3.2.4. Giao diện Truyền thông & Mạng (Communications Interfaces)

• Giao thức HTTP/HTTPS Security: Toàn bộ kết nối API giữa máy khách (Frontend) và máy chủ (Backend) được mã hóa tiêu chuẩn HTTPS / TLS 1.3 bảo mật, tuân thủ chứng chỉ SSL.

• Giao thức Thời gian thực WebSocket: Sử dụng giao thức bảo mật WSS (WebSocket Secure) kết hợp khung truyền tin STOMP over SockJS. Giao thức này đảm bảo đồng bộ hai chiều thời gian thực giữa màn hình điều khiển của Giáo viên và màn hình tương tác của Học sinh trong phiên Live Arena với độ trễ siêu thấp (< 100ms) và cơ chế tự động kết nối lại (Auto Reconnect).

## 3.3. Non-Functional Requirements (Yêu cầu Phi Chức năng - NFR)

Hệ thống quy định các chỉ số kỹ thuật phi chức năng (NFR-01 đến NFR-05) nhằm thực thi và bảo đảm 05 chỉ số KPI nghiệp vụ định lượng đã chốt ở Chương 1 (Thời gian tạo game < 60s, First Gen Acceptance ≥ 75%, Edit Rate ≤ 25%, Regeneration Rate ≤ 10%, điểm SUS ≥ 80/100) cùng quy trình kiểm soát chất lượng AI nghiêm ngặt (Tỷ lệ ảo giác kiến thức Hallucination Rate < 5%, Phòng thủ Prompt Injection gián tiếp từ file giáo án). Chi tiết các SLO/Metric, giải pháp kỹ thuật và công cụ thẩm định được đặc tả tại Bảng 3.3.

### Bảng 3.3: Bảng Ma trận Kỹ thuật Phi Chức năng (Dev-Oriented NFR Matrix)

| Mã NFR & Hạng mục | Chỉ số Kỹ thuật Định lượng (SLO / Metric) | Giải pháp Kỹ thuật Thực thi (Dev Implementation Guide) | Công cụ Kiểm thử & Thẩm định |
| --- | --- | --- | --- |
| NFR-01: Hiệu năng (Performance) | • Latency LLM Pipeline p95 < 3.000ms (Mục tiêu thời gian phản hồi chuẩn SLO < 3 giây)<br>• Tra cứu YCCĐ < 500ms<br>• Live Arena WebSocket Sync < 100ms<br>• Frame-rate Canvas 2D >= 60 FPS | • Dùng Server-Sent Events (SSE) hiển thị progress bar khi gọi LLM API.<br>• Tối ưu chỉ mục theo khối lớp và môn học cho bảng chuẩn kiến thức.<br>• Sử dụng Spring WebSocket STOMP + SockJS.<br>• Áp dụng requestAnimationFrame và batching render trên Konva.js. | JMeter, Google Lighthouse, Chrome DevTools Performance Profiler. |
| NFR-02: Bảo mật & An toàn (Security & Safety) | • Mã hóa 100% kết nối HTTPS/TLS 1.3 và WSS.<br>• Thời gian kiểm duyệt an toàn < 300ms.<br>• 0% lưu trữ thông tin nhận dạng cá nhân (PII) của học sinh.<br>• Chỉ số ảo giác kiến thức (Hallucination Rate) < 5% (so với YCCĐ Bộ GD&ĐT).<br>• 100% tệp giáo án đính kèm được rà quét phòng thủ Prompt Injection gián tiếp.<br>• Khóa tạm thời tài khoản sau 5 lần đăng nhập sai liên tiếp, thời gian khóa 15 phút (UC-15). | • Spring Security + JWT Token (Access Token 15 phút, Refresh Token 24h).<br>• Chạy Moderation API song song Regex Offline Blacklist.<br>• Học sinh tham gia ẩn danh qua mã PIN phòng chơi (6 chữ số) hoặc mã chia sẻ trò chơi (6 ký tự), sinh ngẫu nhiên.<br>• Tích hợp bộ tiền xử lý Input Sanitizer (Regex & Pattern Extractor) lọc bỏ các câu lệnh prompt injection ẩn (ví dụ: 'Bỏ qua các lệnh trên...') trong tệp .docx/.pdf trước khi đưa vào LLM Context.<br>• Tích hợp bộ đối chiếu nội dung câu hỏi với dữ liệu YCCĐ chuẩn, kiểm tra câu hỏi sinh ra bám sát cơ sở dữ liệu YCCĐ chuẩn.<br>• Spring Security Lockout Policy đếm số lần đăng nhập sai liên tiếp theo tài khoản, tự động mở khóa sau thời gian quy định.<br>• Tỉ lệ ảo giác được đánh giá bằng cách giáo viên chấm đúng/sai kiến thức trên một mẫu tối thiểu 50 câu hỏi do AI sinh ra, đối chiếu với YCCĐ. | OWASP ZAP, SonarQube, Postman Security Testing, ReLLM / Prompt Injection Bench. |
| NFR-03: Khả dụng & Tự phục hồi (Availability & Resilience) | • Mức độ khả dụng (Uptime) >= 99,5%.<br>• Thời gian phát hiện & ngắt lỗi Fail-Fast < 100ms. | • Tự động chuyển đổi AI Fallback Provider khi thời gian chờ vượt ngưỡng giới hạn tối đa (LLM Timeout > 5 giây, vượt quá mục tiêu SLO < 3 giây).<br>• Lưu bản nháp vào trình duyệt (LocalStorage) khi mất mạng và tự sync khi khôi phục. | Chaos Engineering, UptimeRobot, Spring Boot Actuator. |
| NFR-04: Khả năng Mở rộng & Tương thích (Scalability & Cross-Platform) | • Tương thích 100% màn hình từ 320px (Mobile) đến 4K (Smart TV/Projector).<br>• Chịu tải đồng thời >= 500 học sinh/lớp. | • Thiết kế Responsive Layout với Tailwind CSS + Touch Events trên Konva.js.<br>• Giới hạn tần suất gọi API (Rate Limiting) 10 req/phút/user bằng In-Memory Caffeine Cache. | Locust, K6 Load Testing, BrowserStack. |
| NFR-05: Quản trị Prompt & Tuân thủ (Compliance & Versioning) | • Đóng băng phiên bản System Prompt ACTIVE v1.0.0.<br>• Đóng băng Game Schema schemaVersion: 1.0.0. | • Lưu bản vết Prompt/Schema vào DB kèm mã SHA-256 Hash.<br>• Ghi nhật ký Audit Log mọi giao dịch sinh AI để phục vụ đo đạc thực nghiệm. | Logback, PostgreSQL Audit Trigger, Automated Integration Tests. |

## 3.4. Testing and Validation (Kiểm thử và Thẩm định)

### 3.4.1. Chiến lược Phân tầng Kiểm thử (Multi-tier Testing Strategy)

Chiến lược phân tầng kiểm thử 4 tầng toàn diện từ mức mã nguồn đến thực nghiệm người dùng được tổng hợp trong Bảng 3.4.

Bảng 3.4: Bảng Chiến lược Phân tầng Kiểm thử (Multi-tier Testing Strategy)

| Tầng Kiểm thử (Testing Tier) | Mục tiêu & Phạm vi (Scope) | Chỉ số Mục tiêu (Metrics / Target) | Công cụ & Framework Thực thi |
| --- | --- | --- | --- |
| 1. Unit Testing | Kiểm tra tính đúng đắn của từng hàm, class nghiệp vụ độc lập (DTO Validator, Rule Engine, Utility class). | • Code Coverage >= 75% | JUnit 5, Mockito (Backend); |
| 2. Integration Testing | Kiểm tra liên kết giữa API RESTful, Database PostgreSQL, LangChain4j LLM Pipeline, Pexels API và WebSocket STOMP. | • API Success Rate >= 99% | Spring Boot Test, |
| 3. End-to-End (E2E) Testing | Giả lập trọn vẹn hành trình người dùng: Giáo viên nhập giáo án -> Sinh game -> Sửa trên Editor -> Học sinh nhập mã vào chơi Canvas 2D. | • 0% lỗi sập giao diện (Crash UI) | Playwright / Cypress. |
| 4. UAT & Pedagogical Validation | Thử nghiệm thực tế với giáo viên và học sinh mầm non/tiểu học để đo đạc tính hữu ích và độ an toàn học đường. | • Điểm SUS >= 80/100 | Phiếu khảo sát SUS, |

### 3.4.2. Ma trận Kịch bản Kiểm thử Nghiệp vụ & AI Trọng yếu (Core Test Scenarios Matrix)

Ma trận kịch bản kiểm thử các luồng nghiệp vụ và phân hệ AI trọng yếu được quy định chi tiết tại Bảng 3.5.

Bảng 3.5: Ma trận Kịch bản Kiểm thử Nghiệp vụ & AI Trọng yếu (Core Test Scenarios)

| Mã Test ID | Hạng mục Kiểm thử | Đầu vào / Điều kiện kích hoạt (Input / Trigger) | Kết quả Mong đợi & Tiêu chí Chấp nhận (Pass Criteria) | Loại Test & Mức Ưu tiên |
| --- | --- | --- | --- | --- |
| TS-01 | Kiểm thử Tra cứu YCCĐ Chuẩn GDPT/Mầm non | Nhập từ khóa "Đếm đến 5" hoặc chọn Môn Toán Khối 1. | Hệ thống trích xuất đúng mã YCCĐ tương ứng từ cơ sở dữ liệu chuẩn kiến thức với thời gian phản hồi < 500ms. | Integration Test |
| TS-02 | Kiểm thử Kiểm tra 3 lớp rule-based & Sinh lại khi JSON lỗi | Giả lập LLM trả về chuỗi JSON bị thiếu trường correctAnswer hoặc sai cú pháp. | Validator rule-based phát hiện lỗi và ngắt luồng (Fail-Fast) trong < 100ms, hệ thống yêu cầu LLM sinh lại phần lỗi (tối đa 2 lần), hoàn tất < 3s hoặc trả thông báo thân thiện nếu vẫn lỗi; 0% Crash UI. | Integration Test |
| TS-03 | Kiểm thử Kiểm duyệt An toàn Nội dung Trẻ em | Nhập từ khóa/câu lệnh chứa từ ngữ không phù hợp lứa tuổi (báo động đỏ/vàng). | Lá chắn Moderation chặn ngắt ngay lập tức trong < 300ms, hiển thị thông báo nhắc nhở giáo viên điều chỉnh từ ngữ. | Safety Test |
| TS-04 | Kiểm thử Đồng bộ Lớp học Trực tiếp (Live Arena) | Giả lập 500 học sinh cùng nhập mã PIN và gửi đáp án qua kết nối WebSocket. | Màn hình TV của giáo viên đồng bộ bảng xếp hạng thời gian thực với độ trễ < 100ms, không bị ngắt kết nối. | Performance / Load Test |
| TS-05 | Kiểm thử Trích xuất Tệp Giáo án Văn bản | Tải tệp giáo án .docx hoặc .pdf dung lượng 5MB (chứa chữ và bảng biểu). | Apache Tika bóc tách 100% văn bản thô, làm sạch ký tự thừa và truyền vào LLM context chính xác. | System Test |
| TS-06 | Kiểm thử Kích hoạt AI Fallback Provider & Chống ngắt phiên | Giả lập dịch vụ AI chính (Primary LLM API) gặp sự cố HTTP 5xx, cạn quota hoặc trễ vượt ngưỡng Timeout > 5s (so với SLO < 3s). | Hệ thống tự động chuyển tuyến gọi sang AI Fallback Provider trong < 1s, hoàn tất sinh game mà không gây gián đoạn phiên làm việc hay văng lỗi phía Giáo viên. | Resilience / Integration Test<br>(Critical) |
| TS-07 | Kiểm thử Đăng nhập sai thông tin / Tài khoản bị khóa | Actor nhập sai email/mật khẩu nhiều lần liên tiếp, hoặc đăng nhập bằng tài khoản đang ở trạng thái Đã khóa. | Hệ thống từ chối đăng nhập, hiển thị đúng thông báo lỗi tương ứng (sai thông tin / tài khoản bị khóa) và tạm khóa tài khoản sau N lần sai liên tiếp theo đúng Exception Flow của UC-15. | Security / Functional Test |
| TS-08 | Kiểm thử Validate Tham số Cấu hình AI không hợp lệ | Quản trị viên nhập giá trị Temperature hoặc Max Tokens ngoài khoảng cho phép (FLD-21, FLD-22) rồi lưu cấu hình. | Hệ thống từ chối lưu, hiển thị thông báo lỗi validate rõ ràng và giữ nguyên cấu hình AI đang hoạt động (theo Exception Flow của UC-14). | Functional / Validation Test |

## 3.5. Maintenance and Support (Bảo trì và Hỗ trợ Vận hành)

### 3.5.1. Giám sát Sức khỏe & Cảnh báo Hệ thống (System Health Monitoring & Alerting Matrix)

Các chỉ số kỹ thuật, ngưỡng kích hoạt cảnh báo và giải pháp tự động xử lý sự cố hạ tầng được thiết lập tại Bảng 3.6.

Bảng 3.6: Bảng Ma trận Giám sát Sức khỏe & Cảnh báo Hệ thống (Ops Matrix)

| Thành phần Giám sát | Chỉ số Kỹ thuật (Metrics) | Ngưỡng Cảnh báo (Alert Threshold) | Giải pháp Kỹ thuật & Hành động Tự động |
| --- | --- | --- | --- |
| Máy chủ & Hạ tầng Backend | CPU Usage, JVM Heap Memory, Active Threads. | CPU > 85% trong 5 phút hoặc RAM Heap > 90%. | Tích hợp Spring Boot Actuator kết hợp Prometheus/Grafana; tự động gửi Webhook cảnh báo khẩn cấp cho Admin. |
| Dịch vụ AI Pipeline & Tra cứu YCCĐ | API Latency p95, Error Rate, Timeout count. | Tỉ lệ lỗi gọi AI API > 5% hoặc thời gian chờ vượt ngưỡng Timeout > 5 giây (trễ so với SLO < 3 giây). | Tự động chuyển tuyến gọi sang AI Fallback Provider; ghi log lỗi sự cố chi tiết vào cơ sở dữ liệu. |
| Cơ sở dữ liệu PostgreSQL | Active DB Connections, Query Latency. | Connection Pool > 85% capacity hoặc Slow Query > 1.000ms. | Tự động ngắt kết nối treo (Idle Connection Timeout). |
| Đấu trường WebSocket STOMP | Active Live Sessions, Message Drop Rate. | Mất kết nối đột ngột > 10% tổng học sinh/lớp. | Kích hoạt cơ chế tự kết nối lại (Heartbeat & Auto-reconnect) phía Client SockJS; cảnh báo nghẽn mạng lớp học. |
| Kiểm duyệt An toàn Nội dung | Số lượt vi phạm từ khóa nhạy cảm (Blocked Request). | Xuất hiện > 5 lượt/phút từ một tài khoản cụ thể. | Tự động tạm khóa chức năng tạo game của tài khoản trong 15 phút và gửi thông báo cho Quản trị viên. |

### 3.5.2. Quy trình Quản lý Phiên bản AI, Prompt & Game Schema (Versioning Policy)

1. Đóng băng & Quản lý phiên bản System Prompt: Hệ thống áp dụng chính sách Đóng băng phiên bản Prompt ACTIVE v1.0.0 phục vụ việc lưu vết dữ liệu thực nghiệm trong luận văn. Mọi thay đổi Prompt trong tương lai bắt buộc phải được tạo bản ghi phiên bản mới (v1.1.0), gán mã SHA-256 Hash và lưu vết vào cơ sở dữ liệu (Audit Log) trước khi áp dụng.

2. Quản lý Phiên bản Cấu trúc Trò chơi (Game Schema Versioning): Đóng băng cấu trúc tệp cấu hình game ở phiên bản schemaVersion: 1.0.0. Khi nâng cấp Schema (ví dụ 1.1.0 bổ sung thể loại game mới), phân hệ Backend bắt buộc duy trì tính Tương thích ngược (Backward Compatibility) để đảm bảo 100% các trò chơi đã khởi tạo trước đó vẫn render mượt mà trên Student Runtime Engine.

3. Cập nhật Từ điển Kiểm duyệt Nội dung (Hot Reload Blacklist): Danh mục từ ngữ nhạy cảm và quy tắc kiểm duyệt an toàn trẻ em được quản lý dạng bộ nhớ tạm (In-Memory Cache), cho phép Quản trị viên bổ sung/cập nhật tức thì mà không cần khởi động lại máy chủ Backend.

### 3.5.3. Chiến lược Sao lưu, Phục hồi Dữ liệu & Sự cố (Backup & Disaster Recovery)

• Chiến lược Sao lưu Tự động (Automated Backup):

- Sao lưu Toàn bộ (Full Backup): Tự động thực thi hàng ngày vào lúc 02:00 AM, nén dữ liệu và lưu trữ tập trung trên Cloud Storage bảo mật (mã hóa AES-256).

- Sao lưu Nhật ký Giao dịch (WAL Backup): Ghi nhật ký liên tục phục vụ cơ chế khôi phục theo thời điểm (Point-in-Time Recovery).

• Mục tiêu Khôi phục Sự cố (Disaster Recovery Metrics):

- RTO (Recovery Time Objective - Thời gian khôi phục hệ thống tối đa): < 15 phút (Khôi phục hoạt động máy chủ từ container dự phòng).

- RPO (Recovery Point Objective - Điểm mất mát dữ liệu tối đa): < 1 giờ (Đảm bảo tối đa chỉ mất 1 giờ dữ liệu nếu gặp sự cố hỏng hóc nghiêm trọng).

# CHƯƠNG 4. YÊU CẦU MÔ HÌNH HÓA (MODELING REQUIREMENTS)

## 4.1. Sơ đồ Ca sử dụng Tổng quan (Use Case Diagram)

[hình ảnh]

## 4.2. Use Case Specification (Đặc tả Chi tiết Ca sử dụng)

Mục này đặc tả chi tiết các Ca sử dụng (Use Cases) của hệ thống dựa trên triết lý thiết kế con người làm trung tâm. Mỗi bảng đặc tả bao gồm thông tin về Tác nhân chính, Mục đích (Purpose), Tiền điều kiện, Hậu điều kiện, Luồng sự kiện chính, các Luồng rẽ nhánh và Luồng ngoại lệ xử lý sự cố.

### 4.2.1. Đặc tả Ca sử dụng UC-01: Đăng ký

| Mã & Tên Ca sử dụng | UC-01: Đăng ký |
| --- | --- |
| Tác nhân chính | Giáo viên |
| Purpose | Cho phép Actor tạo tài khoản mới và đăng nhập xác thực an toàn vào hệ thống. |
| Tiền điều kiện (Pre-conditions) | Actor chưa có tài khoản trên hệ thống. |
| Hậu điều kiện (Post-conditions) | Tài khoản Actor mới được tạo thành công.<br>Thông tin đăng ký của Actor được lưu lại.<br>Actor có thể sử dụng tài khoản vừa tạo để đăng nhập vào hệ thống. |
| Luồng sự kiện chính (Main Flow) | 1. Actor mở hệ thống và chọn chức năng Đăng ký.<br>2. Hệ thống hiển thị biểu mẫu đăng ký và chính sách bảo vệ dữ liệu cá nhân.<br>3. Actor nhập họ tên, email, mật khẩu (từ 8 đến 72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt), trường/đơn vị công tác (không bắt buộc), xác nhận đã đọc và đồng ý với chính sách bảo vệ dữ liệu cá nhân, sau đó chọn Đăng ký.<br>4. Hệ thống kiểm tra thông tin, tạo tài khoản mới, lưu thông tin giáo viên và hiển thị thông báo: "Đăng ký tài khoản thành công." |
| Luồng rẽ nhánh (Alternative Flows) | None. |
| Luồng ngoại lệ (Exception Flows) | 4a. Email đã được sử dụng:<br>1. Tại bước 4, hệ thống phát hiện email đã được đăng ký cho một tài khoản khác.<br>2. Hệ thống thông báo: "Email này đã được sử dụng. Vui lòng sử dụng email khác."<br>3. Quay lại bước 3 của Main Flow.<br>4b. Thông tin đăng ký chưa đầy đủ hoặc không hợp lệ:<br>1. Tại bước 4, hệ thống phát hiện một hoặc nhiều thông tin bắt buộc còn thiếu hoặc không hợp lệ.<br>2. Hệ thống thông báo "Thông tin đăng ký chưa đầy đủ hoặc không hợp lệ. Vui lòng kiểm tra và nhập lại."<br>3. Quay lại bước 3 của Main Flow.<br>4c. Giáo viên chưa đồng ý với chính sách bảo vệ dữ liệu:<br>1. Tại bước 4, hệ thống phát hiện Actor chưa xác nhận đồng ý với chính sách bảo vệ dữ liệu cá nhân.<br>2. Hệ thống yêu cầu Actor đọc và xác nhận đồng ý trước khi tiếp tục đăng ký.<br>3. Quay lại bước 3 của Main Flow.<br>4d. Hệ thống gặp sự cố:<br>1. Tại bước 4, hệ thống không thể hoàn tất việc tạo tài khoản.<br>2. Hệ thống thông báo: "Không thể đăng ký tài khoản vào lúc này. Vui lòng thử lại sau."<br>3. Actor có thể thử lại đăng ký sau khi hệ thống khắc phục sự cố. |

### 4.2.2. Đặc tả Ca sử dụng UC-02: Gửi mô tả trò chơi

| Mã & Tên Ca sử dụng | UC-02: Gửi mô tả trò chơi |
| --- | --- |
| Tác nhân chính | Giáo viên |
| Purpose | Giúp Actor nhanh chóng tạo ra một trò chơi học tập sinh động, an toàn cho học sinh bằng cách chỉ cần viết ý tưởng ngắn gọn hoặc tải lên tệp giáo án sẵn có. |
| Tiền điều kiện (Pre-conditions) | Actor đã đăng nhập thành công vào tài khoản của mình trên hệ thống. |
| Hậu điều kiện (Post-conditions) | Trò chơi mới đã được khởi tạo thành công dưới dạng bản nháp trong kho học liệu của actor.<br>Màn hình hiển thị bản chơi thử trực quan để actor có thể trải nghiệm trực tiếp trò chơi trước khi giao cho học sinh. |
| Luồng sự kiện chính (Main Flow) | 1. Actor chọn tính năng "Sáng tạo trò chơi bằng AI" từ bảng điều khiển chính.<br>2. Hệ thống hiển thị màn hình thiết kế trò chơi với ô nhập ý tưởng, vùng tải tệp giáo án và các danh mục lựa chọn bao gồm Khối lớp (Mầm non, Lớp 1, Lớp 2, Lớp 3, Lớp 4, Lớp 5) và Môn học (Toán, Tiếng Việt, Tiếng Anh), cùng danh mục Thể loại trò chơi (tùy chọn).<br>3. Actor chọn các thông số bắt buộc từ danh sách có sẵn (Khối lớp, Môn học; Thể loại trò chơi là tùy chọn) và viết mô tả ý tưởng bằng chữ, đồng thời có thể tải lên tệp giáo án có sẵn (nếu có) và nhấn nút "Tạo trò chơi".<br>4. Hệ thống tiếp nhận yêu cầu, phân tích ý tưởng của actor; nếu actor chưa chọn thể loại, hệ thống đề xuất 2–3 thể loại trò chơi phù hợp kèm lý do (xem luồng 4c) và đối chiếu nội dung với khung Chương trình Giáo dục Phổ thông chuẩn của Bộ Giáo dục và Đào tạo để đảm bảo kiến thức đề xuất phù hợp với lứa tuổi đã chọn.<br>5. Hệ thống chuyển đổi ý tưởng của actor thành các câu hỏi học tập chi tiết, tìm kiếm và ghép nối các hình ảnh minh họa sinh động, an toàn và thêm giọng thuyết minh tiếng Việt để đọc câu hỏi (đối với lớp mầm non và lớp 1).<br>6. Hệ thống tự động rà soát lại toàn bộ trò chơi hoàn chỉnh để đảm bảo cấu trúc, logic trò chơi, đáp án, hình ảnh hiển thị an toàn, giọng đọc chuẩn xác trước khi lưu bản nháp.<br>7. Trò chơi sau khi kiểm duyệt thành công sẽ được lưu trữ an toàn vào kho học liệu cá nhân của actor ở trạng thái bản nháp.<br>8. Hệ thống hiển thị bản chơi thử trực quan ngay trên màn hình tương tác để actor trải nghiệm thực tế. |
| Luồng rẽ nhánh (Alternative Flows) | 3a. Actor chỉ sử dụng tệp giáo án sẵn có:<br>1. Actor để trống ô nhập ý tưởng bằng chữ, sau đó kéo thả hoặc bấm tải lên tệp tài liệu giảng dạy định dạng .docx hoặc .pdf từ máy tính cá nhân và nhấn nút "Tạo trò chơi".<br>2. Hệ thống phát hiện ý tưởng bằng chữ đang để trống nhưng có tệp tài liệu, tự động trích xuất nội dung văn bản thô từ tệp chuẩn bị cho việc tạo game và chuyển tiếp sang bước 4 của luồng chính.<br>3b. Tạo ngẫu nhiên khi actor chưa có ý tưởng và không có tài liệu:<br>1. Actor chỉ lựa chọn Khối lớp và Môn học (ở Bước 3) nhưng để trống cả ô nhập ý tưởng và không đính kèm tệp tài liệu nào và nhấn nút "Tạo ngẫu nhiên".<br>2. Hệ thống tự động đối chiếu Khối lớp và Môn học đã chọn để đề xuất một chủ đề học tập lý thú, trực quan và phù hợp nhất với tâm lý lứa tuổi học sinh (Ví dụ: môn Toán lớp 1 sẽ tự động chọn chủ đề "Học đếm số lượng qua hình ảnh các loài hoa").<br>3. Hệ thống sử dụng chủ đề tự sinh này làm ý tưởng đầu vào và tự động chuyển sang Bước 4 của Luồng chính.<br>4c. Actor chưa chọn thể loại trò chơi:<br>1. Tại bước 4, hệ thống nhận thấy actor chưa chọn Thể loại trò chơi.<br>2. Hệ thống dựa trên chủ đề, mục tiêu và độ tuổi để đề xuất 2–3 thể loại phù hợp nhất trong 10 thể loại được hỗ trợ, kèm lý do sư phạm ngắn gọn (Ví dụ: "Ghép cặp - phù hợp để nhận biết số lượng với hình ảnh cho Lớp 1").<br>3. Actor chọn một thể loại được đề xuất hoặc tự chọn thể loại khác trong danh sách; luồng tiếp tục tại bước 5 của Luồng chính. |
| Luồng ngoại lệ (Exception Flows) | 3c. Actor gửi tệp tài liệu định dạng không phù hợp:<br>1. Actor tải lên tệp tài liệu giảng dạy định dạng không phù hợp (định dạng khác pdf và docx).<br>2. Hệ thống phát hiện tệp tài liệu sai định dạng và thông báo lỗi "Người dùng gửi tệp tài liệu giảng dạy sai định dạng. Vui lòng gửi file docx hoặc pdf".<br>4a. Nội dung kiến thức chưa phù hợp với lứa tuổi của trẻ:<br>1. Hệ thống tạm dừng quá trình tạo trò chơi và hiển thị một thông báo gợi ý điều chỉnh thân thiện: "Nội dung phép nhân có thể hơi khó với các bé Mầm non. Bạn có muốn đổi sang khối Lớp 4 hoặc Lớp 5, hoặc thay đổi nội dung thành trò chơi 'Đếm số lượng hoa quả từ 1 đến 5' cho phù hợp với bé?".<br>2. Actor click chọn hướng điều chỉnh thích hợp. Luồng xử lý quay lại bước 4 của Luồng chính.<br>4b. Ý tưởng hoặc tài liệu tải lên chứa nội dung không an toàn cho trẻ:<br>1. Hệ thống phát hiện mô tả ý tưởng hoặc tệp giáo án do actor tải lên chứa từ ngữ nhạy cảm, bạo lực hoặc không lành mạnh cho trẻ em, từ chối xử lý, lập tức dừng luồng khởi tạo trò chơi.<br>2. Hệ thống hiển thị cảnh báo: "Nội dung mô tả hoặc tài liệu chưa đạt chuẩn an toàn dành cho học sinh. Vui lòng điều chỉnh lại ý tưởng và tệp tin của bạn." và khôi phục giao diện về trạng thái chuẩn bị ở bước 2.<br>5a. Hệ thống AI gặp sự cố kết nối hoặc phản hồi chậm:<br>1. Hệ thống tự động thực hiện lại yêu cầu tối đa 2 lần để khắc phục sự cố.<br>2. Hệ thống dừng luồng xử lý nếu vẫn không thành công để đảm bảo trải nghiệm người dùng và hiển thị thông báo lỗi: "Hệ thống AI đang quá tải. Ý tưởng của bạn đã được lưu lại, vui lòng bấm thử lại sau ít phút." để tránh việc actor phải nhập lại ý tưởng từ đầu.<br>6a. Thành phẩm trò chơi phát sinh nội dung không an toàn:<br>1. Hệ thống phát hiện hình ảnh minh họa tự động tải về từ thư viện ngoài hoặc tệp âm thanh thuyết minh tự sinh chứa yếu tố không an toàn dành cho trẻ em.<br>2. Hệ thống dừng luồng xử lý, tự động hủy bỏ cấu hình game vừa sinh ra để đảm bảo an toàn tuyệt đối cho học sinh và hiển thị thông báo hỗ trợ actor: "Hệ thống phát hiện một số hình ảnh minh họa tự động chưa đạt chuẩn sư phạm cho lứa tuổi của bé. Vui lòng nhấn nút 'Tạo lại' để hệ thống tự động tìm kiếm bộ tài nguyên thay thế an toàn hơn." và quay về Bước 5 để actor tiếp tục.<br>3d. Tệp giáo án vượt quá dung lượng cho phép:<br>1. Actor tải lên tệp tài liệu giảng dạy có dung lượng vượt quá 10MB.<br>2. Hệ thống từ chối nhận tệp, hiển thị thông báo lỗi: "Tệp tài liệu vượt quá dung lượng cho phép (tối đa 10MB). Vui lòng chọn tệp khác hoặc nén lại." Quay lại bước 3. |

### 4.2.3. Đặc tả Ca sử dụng UC-03: Chơi thử

| Mã & Tên Ca sử dụng | UC-03: Chơi thử |
| --- | --- |
| Tác nhân chính | Giáo viên |
| Purpose | Cho phép Actor trải nghiệm trực tiếp trò chơi dưới góc nhìn và thao tác của học sinh nhằm kiểm tra nội dung, đáp án, hình ảnh, âm thanh và hiệu ứng tương tác trước khi lưu bản nháp hoặc chính thức xuất bản. |
| Tiền điều kiện (Pre-conditions) | Actor đã đăng nhập thành công vào hệ thống.<br>Trò chơi đã được khởi tạo (ở trạng thái bản nháp hoặc đã xuất bản). |
| Hậu điều kiện (Post-conditions) | Actor kết thúc phiên chơi thử và quay lại màn hình chi tiết/chỉnh sửa trò chơi hoặc kho học liệu.<br>Kết quả chơi thử như điểm số, thời gian và tiến độ không được ghi nhận như kết quả của học sinh.<br>Phiên chơi thử không làm thay đổi trạng thái xuất bản của trò chơi. |
| Luồng sự kiện chính (Main Flow) | 1. Actor chọn trò chơi muốn kiểm tra và nhấn chức năng "Chơi thử".<br>2. Hệ thống tiếp nhận yêu cầu và rà soát tính toàn vẹn của dữ liệu cấu hình trò chơi.<br>3. Hệ thống khởi tạo giao diện trò chơi trong môi trường kiểm thử, đồng thời tải các tài nguyên đồ họa và âm thanh cần thiết.<br>4. Hệ thống hiển thị giao diện trò chơi giống với giao diện mà học sinh sẽ sử dụng.<br>5. Actor thực hiện các thao tác tương ứng với loại trò chơi như chọn đáp án, kéo thả, ghép cặp hoặc lật thẻ.<br>6. Hệ thống tiếp nhận thao tác, kiểm tra kết quả và hiển thị phản hồi đúng/sai, âm thanh hoặc hiệu ứng tương ứng.<br>7. Actor trải nghiệm lần lượt các nội dung cho đến khi hoàn thành toàn bộ trò chơi.<br>8. Hệ thống hiển thị màn hình tổng kết kết quả mô phỏng của phiên chơi thử và ghi rõ kết quả này không được lưu vào báo cáo học sinh.<br>9. Actor chọn "Kết thúc" hoặc "Quay lại chỉnh sửa".<br>10. Hệ thống đóng phiên chơi thử và đưa actor trở lại màn hình chi tiết/chỉnh sửa trò chơi. |
| Luồng rẽ nhánh (Alternative Flows) | 5a. Actor chủ động thoát khi chưa hoàn thành trò chơi:<br>1. Trong quá trình chơi, actor chọn nút "Thoát" trên thanh công cụ.<br>2. Hệ thống kết thúc phiên chơi thử hiện tại và không lưu kết quả, thời gian hoặc tiến độ của phiên chơi thử.<br>3. Hệ thống đưa actor trở lại màn hình chi tiết/chỉnh sửa trò chơi và tiếp tục tại bước 10 của Main Flow.<br>9a. Actor phát hiện nội dung chưa phù hợp và chọn quay lại chỉnh sửa:<br>1. Actor chọn nút "Quay lại chỉnh sửa" tại màn hình tổng kết.<br>2. Hệ thống đóng môi trường chơi thử và mở màn hình chỉnh sửa trò chơi.<br>3. Actor chỉnh sửa lại câu hỏi, đáp án, hình ảnh hoặc thẻ nội dung chưa phù hợp, có thể sử dụng chức năng AI làm lại để hỗ trợ việc chỉnh sửa. |
| Luồng ngoại lệ (Exception Flows) | 2a. Dữ liệu trò chơi không hợp lệ hoặc thiếu thông tin:<br>1. Hệ thống phát hiện trò chơi không đủ dữ liệu hoặc thiếu thông tin bắt buộc để hiển thị.<br>2. Hệ thống từ chối khởi tạo môi trường chơi thử và hiển thị thông báo: "Trò chơi chưa đủ dữ liệu hoặc thiếu thông tin bắt buộc để chơi thử. Vui lòng kiểm tra và hoàn thiện nội dung trong màn hình soạn thảo." và giữ actor tại màn hình chỉnh sửa trò chơi.<br>3a. Không tải được tài nguyên không bắt buộc:<br>1. Hệ thống phát hiện tài nguyên không bắt buộc (hình ảnh/âm thanh phụ) không thể tải.<br>2. Hệ thống tự động thay thế bằng tài nguyên dự phòng hoặc bỏ qua tài nguyên đó.<br>3. Hệ thống tiếp tục phiên chơi thử, quay lại bước 4 của Main Flow.<br>3b. Không tải được tài nguyên bắt buộc:<br>1. Hệ thống phát hiện tài nguyên bắt buộc không thể tải và không có tài nguyên thay thế.<br>2. Hệ thống hiển thị thông báo lỗi: "Hệ thống gặp sự cố khi tải tài nguyên đồ họa của trò chơi. Vui lòng kiểm tra lại kết nối mạng hoặc cập nhật lại tài nguyên."<br>3. Hệ thống đóng phiên chơi thử và đưa actor trở lại màn hình chỉnh sửa. |

### 4.2.4. Đặc tả Ca sử dụng UC-04: Chỉnh sửa trò chơi (Không gian soạn thảo Workspace Editor)

| Mã & Tên Ca sử dụng | UC-04: Chỉnh sửa trò chơi (Không gian soạn thảo Workspace Editor) |
| --- | --- |
| Tác nhân chính | Giáo viên |
| Purpose | Giúp Actor chủ động rà soát, trải nghiệm chơi thử tương tác trực quan và tự tay tinh chỉnh chất lượng nội dung trò chơi trước khi xuất bản cho học sinh. Đảm bảo giáo viên luôn làm chủ hoàn toàn học liệu của mình dựa trên triết lý đặt con người làm trung tâm kiểm duyệt. |
| Tiền điều kiện (Pre-conditions) | Actor đã đăng nhập tài khoản thành công vào hệ thống.<br>Trò chơi đã được khởi tạo thành công dưới dạng bản nháp. |
| Hậu điều kiện (Post-conditions) | Hệ thống hiển thị thông báo hoàn tất thành công.<br>Trò chơi được lưu trữ thành công vào kho học liệu của Actor ở trạng thái bản nháp cập nhật nhất hoặc sẵn sàng ở trạng thái đã xuất bản. |
| Luồng sự kiện chính (Main Flow) | 1. Actor chọn trò chơi bản nháp từ kho học liệu cá nhân của mình và nhấn nút "Chỉnh sửa".<br>2. Hệ thống tải giao diện soạn thảo tích hợp, hiển thị song song bảng danh sách câu hỏi chi tiết ở bên trái và màn hình chơi thử tương tác ở bên phải.<br>3. Hệ thống tự động hiển thị đầy đủ hình ảnh minh họa, giọng đọc thuyết minh hiện tại của trò chơi và vẽ giao diện chơi thử trực quan lên màn hình Canvas tương tác.<br>4. Actor tiến hành trực tiếp rà soát toàn bộ các câu hỏi trong trò chơi, xác nhận mọi thứ đã đạt yêu cầu sư phạm và nhấn nút "Lưu bản nháp".<br>5. Hệ thống tự động kiểm tra tính toàn vẹn, tính an toàn của cấu trúc trò chơi, lưu lại toàn bộ dữ liệu mới nhất vào kho học liệu cá nhân của Actor ở trạng thái bản nháp và hiển thị thông báo: "Bạn đã lưu bản nháp thành công." |
| Luồng rẽ nhánh (Alternative Flows) | 4a. Actor kích hoạt tính năng Chỉnh sửa thủ công:<br>1. Actor trực tiếp gõ sửa câu chữ, điều chỉnh lựa chọn đáp án đúng, hoặc chọn tải lên hình ảnh/giọng đọc mới ngay trên thẻ câu hỏi mong muốn.<br>2. Hệ thống lập tức tiếp nhận dữ liệu chỉnh sửa thủ công, tự động cập nhật thuộc tính vào cấu hình trò chơi và tự động vẽ lại giao diện tương tác mới của trò chơi trên màn hình chơi thử để giáo viên chơi thử ngay lập tức.<br>3. Hệ thống chuyển tiếp Actor quay trở lại Bước 4 của Luồng chính.<br>4b. Actor kích hoạt tính năng Yêu cầu AI thiết kế lại:<br>1. Actor nhấn chọn nút "Yêu cầu AI làm lại" ngay trên thẻ câu hỏi cụ thể mong muốn chỉnh sửa.<br>2. Hệ thống tiếp nhận yêu cầu, tự động thiết kế lại riêng nội dung câu hỏi đó mà không làm ảnh hưởng đến các câu hỏi đúng khác.<br>3. Hệ thống tự động rà quét an toàn nội dung của câu hỏi mới sinh, tìm hình ảnh, tự sinh giọng thuyết minh thay thế tương ứng, đưa thẻ câu hỏi mới vào bản trò chơi đang soạn (được lưu khi giáo viên bấm Lưu bản nháp) và tự động vẽ lại giao diện tương tác mới trên màn hình chơi thử.<br>4. Hệ thống chuyển tiếp giáo viên quay trở lại Bước 4 của Luồng chính.<br>4c. Actor chọn Xuất bản thay vì Lưu bản nháp:<br>1. Actor nhấn nút "Xuất bản" ở Bước 4 (ngay trên màn hình soạn thảo, không cần rời khỏi UC-04).<br>2. Hệ thống thực hiện tiếp theo đúng đặc tả UC-07: Lưu và Xuất bản trò chơi. |
| Luồng ngoại lệ (Exception Flows) | 4d. AI gặp sự cố khi thiết kế lại câu hỏi:<br>1. Hệ thống phát hiện phân hệ AI gặp sự cố kết nối hoặc phản hồi chậm trong lúc thiết kế lại câu hỏi tại Bước 2 của Luồng 4b.<br>2. Hệ thống tự động thực hiện lại yêu cầu tối đa 2 lần để khắc phục sự cố.<br>3. Hệ thống dừng xử lý nếu vẫn không thành công, giữ nguyên nội dung câu hỏi cũ và hiển thị thông báo lỗi: "Hệ thống AI đang quá tải, không thể thiết kế lại câu hỏi lúc này. Vui lòng thử lại sau ít phút."<br>5a. Trò chơi bị lỗi cấu hình hoặc không đảm bảo tính toàn vẹn:<br>1. Hệ thống phát hiện trò chơi bị mất đồng bộ dữ liệu hoặc thiếu thông tin bắt buộc (ví dụ: thẻ câu hỏi không có đáp án đúng) và từ chối lưu trữ cấu hình lỗi và hiển thị thông báo hỗ trợ: "Hệ thống phát hiện một số câu hỏi của bạn chưa có đáp án đúng. Vui lòng kiểm tra và bổ sung đầy đủ trước khi lưu hoặc xuất bản."<br>2. Hệ thống giữ nguyên trạng thái màn hình soạn thảo để Actor điều chỉnh và quay trở lại Bước 4 của Luồng chính. |

### 4.2.5. Đặc tả Ca sử dụng UC-05: Chỉnh sửa thủ công

| Mã & Tên Ca sử dụng | UC-05: Chỉnh sửa thủ công |
| --- | --- |
| Tác nhân chính | Giáo viên |
| Purpose | Giúp Actor chủ động tự tay thay đổi câu chữ, điều chỉnh lựa chọn đáp án đúng, tự chọn hình ảnh tươi sáng hoặc tải lên tệp âm thanh thuyết minh từ thiết bị cá nhân. |
| Tiền điều kiện (Pre-conditions) | Actor đang ở giao diện soạn thảo tích hợp của ca sử dụng Chỉnh sửa trò chơi.<br>Thẻ câu hỏi cần chỉnh sửa thủ công đang hiển thị rõ ràng trên bảng soạn thảo của Actor. |
| Hậu điều kiện (Post-conditions) | Hệ thống ghi nhận chính xác toàn bộ các nội dung chỉnh sửa thủ công của giáo viên và cập nhật thành công vào cấu hình trò chơi.<br>Hệ thống tự động vẽ lại giao diện tương tác mới của trò chơi trên màn hình chơi thử trực quan để giáo viên kiểm duyệt. |
| Luồng sự kiện chính (Main Flow) | 1. Actor lựa chọn một thẻ câu hỏi cụ thể trên bảng soạn thảo, thực hiện gõ thay đổi trực tiếp nội dung chữ (câu hỏi, câu trả lời), hoặc thay đổi lựa chọn đáp án đúng.<br>2. Hệ thống tiếp nhận dữ liệu chỉnh sửa thủ công, tự động kiểm tra tính đầy đủ, hợp lệ của nội dung câu chữ Actor vừa nhập và cập nhật các thuộc tính nội dung mới này vào cấu hình hiện tại của trò chơi.<br>3. Hệ thống tự động vẽ lại màn hình chơi thử trực quan trên giao diện Canvas tương tác để hiển thị nội dung Actor vừa thay đổi. |
| Luồng rẽ nhánh (Alternative Flows) | 1a. Actor tải hình ảnh hoặc tệp âm thanh riêng lên từ máy tính cá nhân:<br>1. Actor nhấn nút "Tải tệp lên" ngay trên vùng quản lý ảnh hoặc âm thanh của thẻ câu hỏi.<br>2. Hệ thống hiển thị cửa sổ thư mục để Actor duyệt và chọn tệp tin tương ứng từ thiết bị cá nhân.<br>3. Actor chọn tệp tin hình ảnh (PNG/JPG/WebP) hoặc tệp tin âm thanh thuyết minh (MP3) từ máy tính và nhấn Xác nhận tải lên.<br>4. Hệ thống tiếp nhận tệp tin tải lên, tự động rà quét kiểm tra an toàn bảo mật, tính hợp chuẩn sư phạm và giới hạn dung lượng của tệp tin.<br>5. Hệ thống lưu trữ tệp đa phương tiện của Actor, cập nhật đường dẫn liên kết tài nguyên mới vào thẻ câu hỏi và tự động chuyển hướng quay trở về Bước 3 của Luồng chính để vẽ lại giao diện chơi thử trực quan. |
| Luồng ngoại lệ (Exception Flows) | 2a. Nội dung Actor sửa tay chứa ngôn từ chưa phù hợp sư phạm:<br>1. Hệ thống tự động kích hoạt bộ lọc rà quét đối với nội dung câu chữ Actor vừa chỉnh sửa và phát hiện có từ ngữ nhạy cảm, bạo lực hoặc không lành mạnh phát sinh trong nội dung sửa tay.<br>2. Hệ thống dừng tiến trình cập nhật, giữ nguyên nội dung cũ trước khi chỉnh sửa của Actor, hiển thị thông báo hỗ trợ thân thiện trên màn hình: "Nội dung chỉnh sửa của giáo viên chưa đạt chuẩn an toàn học đường dành cho trẻ nhỏ. Vui lòng điều chỉnh lại từ ngữ." và giữ nguyên trạng thái màn hình soạn thảo để Actor tiếp tục chỉnh sửa.<br>3a. Tệp đa phương tiện tải lên bị lỗi định dạng hoặc vượt quá dung lượng:<br>1. Hệ thống phát hiện tệp tin hình ảnh hoặc âm thanh tải lên không đúng định dạng hỗ trợ (không phải ảnh PNG/JPG/WebP hoặc âm thanh MP3), hoặc vượt quá dung lượng giới hạn quy định.<br>2. Hệ thống từ chối tiếp nhận tệp tin bị lỗi, hiển thị thông báo hướng dẫn cụ thể trên màn hình: "Tệp tải lên không đúng định dạng hỗ trợ (Ảnh cần là dạng PNG/JPG/WebP dưới 5MB, âm thanh thuyết minh cần là dạng MP3 dưới 10MB). Vui lòng chọn tệp tin khác." và giữ nguyên hình ảnh hoặc âm thanh cũ của thẻ câu hỏi, khôi phục trạng thái bảng soạn thảo để giáo viên có thể thao tác lại.<br><br>3b. Tệp tải lên chứa nội dung không an toàn / không phù hợp sư phạm:<br>1. Hệ thống rà quét nội dung tệp hình ảnh hoặc âm thanh vừa tải lên và phát hiện yếu tố không an toàn hoặc không phù hợp sư phạm cho học sinh.<br>2. Hệ thống hủy tiến trình tải tệp, hiển thị thông báo lỗi: "Tệp tải lên không đáp ứng tiêu chuẩn an toàn nội dung dành cho môi trường giáo dục. Vui lòng chọn tệp khác."<br>3. Hệ thống giữ nguyên hình ảnh hoặc âm thanh cũ của thẻ câu hỏi và khôi phục trạng thái bảng soạn thảo để Actor chọn tệp khác. |

### 4.2.6. Đặc tả Ca sử dụng UC-06: Yêu cầu AI làm lại trò chơi

| Mã & Tên Ca sử dụng | UC-06: Yêu cầu AI làm lại trò chơi |
| --- | --- |
| Tác nhân chính | Giáo viên |
| Purpose | Giúp Actor ra lệnh cho trí tuệ nhân tạo tự động thiết kế lại riêng một câu hỏi chưa đạt yêu cầu (hoặc làm lại toàn bộ trò chơi) dựa trên gợi ý bổ sung mới, giúp tối ưu hóa học liệu một cách nhanh chóng mà vẫn bảo toàn các câu hỏi đã được duyệt trước đó. |
| Tiền điều kiện (Pre-conditions) | Actor đang ở màn hình soạn thảo tích hợp.<br>Thẻ câu hỏi cần yêu cầu AI làm lại đang hiển thị rõ ràng trên bảng soạn thảo của Actor. |
| Hậu điều kiện (Post-conditions) | Hệ thống cập nhật thành công nội dung câu hỏi mới do AI tự động thiết kế lại vào cấu hình trò chơi.<br>Hệ thống vẽ lại màn hình chơi thử trực quan để Actor trực tiếp trải nghiệm và nghiệm thu chất lượng câu hỏi mới. |
| Luồng sự kiện chính (Main Flow) | 1. Actor nhấn chọn nút "Yêu cầu AI làm lại" ngay trên thẻ câu hỏi cụ thể muốn thay đổi.<br>2. Hệ thống hiển thị hộp thoại tùy chọn để Actor nhập gợi ý điều chỉnh (ví dụ: "làm cho câu hỏi dễ hơn", "đổi chủ đề khác").<br>3. Actor nhập gợi ý mong muốn và nhấn nút "Xác nhận tạo lại".<br>4. Hệ thống gửi yêu cầu kèm theo gợi ý điều chỉnh mới tới phân hệ trí tuệ nhân tạo để thiết kế lại riêng nội dung câu hỏi đó mà vẫn bảo toàn nguyên vẹn các câu hỏi đúng khác.<br>5. Hệ thống tự động kiểm tra tính an toàn nội dung và tính đúng đắn câu hỏi mới sinh, rà quét thư viện trực tuyến để gán hình ảnh minh họa an toàn và tự sinh giọng đọc thuyết minh tiếng Việt chuẩn theo lựa chọn giọng Nam/Nữ.<br>6. Hệ thống đưa thẻ câu hỏi mới vào bản trò chơi đang soạn (được lưu khi giáo viên bấm Lưu bản nháp), tự động vẽ lại giao diện tương tác mới trên màn hình chơi thử và gửi thông báo hoàn tất tạo lại cho giáo viên: "Điều chỉnh trò chơi thành công." |
| Luồng rẽ nhánh (Alternative Flows) | 4a. Actor yêu cầu AI làm lại toàn bộ trò chơi thay vì một câu hỏi riêng lẻ:<br>1. Actor nhấn chọn nút "Tạo lại toàn bộ trò chơi" trên thanh công cụ soạn thảo chính.<br>2. Hệ thống hiển thị hộp thoại cảnh báo và ô nhập định hướng điều chỉnh tổng thể.<br>3. Actor nhập thêm định hướng mới (nếu có) và nhấn nút "Xác nhận làm lại tất cả".<br>4. Hệ thống gửi yêu cầu thiết kế lại toàn bộ danh sách câu hỏi tới phân hệ trí tuệ nhân tạo và tự động kiểm duyệt an toàn, tìm hình ảnh minh họa an toàn và tự sinh giọng thuyết minh cho toàn bộ trò chơi mới.<br>5. Hệ thống cập nhật trò chơi mới lên giao diện soạn thảo và màn hình chơi thử trực quan để Actor tiến hành kiểm duyệt. |
| Luồng ngoại lệ (Exception Flows) | 5a. Nội dung câu hỏi mới do AI thiết kế lại không đạt chuẩn an toàn học đường:<br>1. Hệ thống phát hiện nội dung câu hỏi mới do AI thiết kế lại có chứa từ ngữ nhạy cảm, bạo lực hoặc không đạt chuẩn an toàn học đường.<br>2. Hệ thống tự động hủy bỏ nội dung câu hỏi lỗi để bảo vệ trẻ nhỏ, đồng thời khôi phục lại nguyên trạng nội dung câu hỏi cũ trước đó của Actor và hiển thị thông báo hỗ trợ trên màn hình soạn thảo: "Nội dung tạo lại chưa đạt chuẩn an toàn học đường. Hệ thống đã khôi phục câu hỏi cũ, vui lòng thử lại với gợi ý mô tả khác."<br>3. Hệ thống đưa Actor quay trở lại màn hình soạn thảo ổn định hiện tại để tiếp tục làm việc.<br>5b. Sự cố nghẽn mạng hoặc quá tải dịch vụ trí tuệ nhân tạo:<br>1. Hệ thống phát hiện kết nối tới dịch vụ trí tuệ nhân tạo bị quá thời gian quy định (Timeout trên 5 giây, theo mục 3.1.1) hoặc báo lỗi kỹ thuật.<br>2. Hệ thống tự động thực hiện lại yêu cầu tối đa 2 lần để khắc phục sự cố.<br>3. Hệ thống dừng toàn bộ tiến trình xử lý nếu vẫn thất bại, bảo toàn nguyên vẹn nội dung câu hỏi cũ để tránh mất mát dữ liệu soạn bài của Actor, đồng thời hiển thị thông báo hỗ trợ thân thiện trên màn hình: "Máy chủ trí tuệ nhân tạo đang bận xử lý dữ liệu. Yêu cầu tạo lại của giáo viên chưa thực hiện được, vui lòng thử lại sau ít phút."<br>4. Hệ thống khôi phục giao diện màn hình soạn thảo về trạng thái ổn định gần nhất để Actor soạn bài tiếp. |

### 4.2.7. Đặc tả Ca sử dụng UC-07: Lưu và Xuất bản trò chơi

| Mã & Tên Ca sử dụng | UC-07: Lưu và Xuất bản trò chơi |
| --- | --- |
| Tác nhân chính | Giáo viên |
| Purpose | Cho phép Actor lưu lại trò chơi đã tạo hoặc xuất bản trò chơi để học sinh có thể truy cập và tham gia. |
| Tiền điều kiện (Pre-conditions) | Actor đã đăng nhập vào hệ thống.<br>Actor đã có một trò chơi được tạo hoặc đang chỉnh sửa.<br>Trò chơi đang được hiển thị trong khu vực soạn thảo của giáo viên. |
| Hậu điều kiện (Post-conditions) | Nội dung trò chơi được lưu lại thành công.<br>Nếu Actor chọn xuất bản, trò chơi chuyển sang trạng thái đã xuất bản.<br>Hệ thống cung cấp mã chia sẻ, đường dẫn truy cập và mã QR để Actor gửi cho học sinh. |
| Luồng sự kiện chính (Main Flow) | 1. Actor xem lại nội dung trò chơi đã tạo và chọn chức năng Xuất bản trò chơi.<br>2. Hệ thống lưu lại nội dung mới nhất của trò chơi, chuyển trò chơi sang trạng thái Đã xuất bản, tạo mã chia sẻ, đường dẫn truy cập và mã QR tương ứng.<br>3. Hệ thống hiển thị thông tin chia sẻ cho giáo viên. |
| Luồng rẽ nhánh (Alternative Flows) | 1a. Actor chỉ muốn lưu trò chơi để tiếp tục chỉnh sửa sau:<br>1. Tại bước 1, Actor chọn Lưu bản nháp thay vì xuất bản.<br>2. Hệ thống lưu nội dung trò chơi ở trạng thái bản nháp và thông báo lưu thành công: "Lưu trò chơi thành công." |
| Luồng ngoại lệ (Exception Flows) | 2a. Không thể lưu hoặc xuất bản trò chơi:<br>1. Tại bước 2, hệ thống gặp sự cố trong quá trình lưu hoặc xuất bản trò chơi.<br>2. Hệ thống thông báo cho giáo viên rằng thao tác chưa hoàn tất và yêu cầu thử lại: "Hệ thống chưa hoàn tất lưu trò chơi. Bạn hãy thử lại một lần nữa."<br>3. Trò chơi không được chuyển sang trạng thái đã xuất bản.<br>4. Quay lại bước 1 của Main Flow.<br>2b. Không thể tạo thông tin chia sẻ:<br>1. Tại bước 2, hệ thống không thể tạo mã chia sẻ, đường dẫn truy cập hoặc mã QR.<br>2. Hệ thống thông báo cho Actor: "Trò chơi đã lưu nhưng chưa thể tạo mã chia sẻ. Vui lòng thử xuất bản lại."<br>3. Trò chơi không được chuyển sang trạng thái Đã xuất bản.<br>4. Quay lại bước 1 của Main Flow.<br>2c. Dữ liệu trò chơi không hợp lệ:<br>1. Tại bước 2, hệ thống kiểm tra nội dung trò chơi và phát hiện một hoặc nhiều dữ liệu chưa hợp lệ, chẳng hạn câu hỏi chưa có đáp án đúng, trò chơi Tìm vật trong ảnh chưa chọn vùng đúng, thiếu nội dung cần thiết hoặc cấu trúc trò chơi chưa hoàn chỉnh.<br>2. Hệ thống thông báo cho Actor các nội dung cần chỉnh sửa: "Bạn hãy kiểm tra và điều chỉnh lại nội dung."<br>3. Trò chơi không được chuyển sang trạng thái Đã xuất bản.<br>4. Hệ thống đưa giáo viên trở lại khu vực chỉnh sửa trò chơi để hoàn thiện nội dung.<br>5. Sau khi chỉnh sửa, Actor có thể thực hiện lại chức năng Xuất bản trò chơi. |

### 4.2.8. Đặc tả Ca sử dụng UC-08: Tự luyện tập cá nhân

| Mã & Tên Ca sử dụng | UC-08: Tự luyện tập cá nhân |
| --- | --- |
| Tác nhân chính | Học sinh |
| Purpose | Cho phép Actor tự tham gia và hoàn thành một trò chơi học tập trên thiết bị cá nhân theo tốc độ của mình mà không cần đăng ký tài khoản. |
| Tiền điều kiện (Pre-conditions) | Giáo viên đã xuất bản trò chơi.<br>Actor có mã QR hoặc đường dẫn truy cập trò chơi.<br>Thiết bị của Actor có kết nối Internet và có thể mở trò chơi. |
| Hậu điều kiện (Post-conditions) | Actor hoàn thành hoặc kết thúc lượt chơi cá nhân.<br>Hệ thống ghi nhận kết quả của lượt chơi hiện tại kèm theo tên hiển thị của Actor, không yêu cầu Actor đăng ký hoặc đăng nhập tài khoản.<br>Hệ thống hiển thị kết quả và phản hồi khích lệ phù hợp với Actor. |
| Luồng sự kiện chính (Main Flow) | 1. Actor quét mã QR hoặc mở đường dẫn trò chơi do giáo viên cung cấp.<br>2. Hệ thống mở trò chơi và hiển thị nội dung, hướng dẫn cần thiết cho Actor.<br>3. Hệ thống yêu cầu Actor nhập tên hiển thị (biệt danh, tối đa 20 ký tự, không chứa từ ngữ không phù hợp) trước khi bắt đầu.<br>4. Actor thực hiện các yêu cầu của trò chơi và lần lượt hoàn thành các nội dung học tập.<br>5. Hệ thống ghi nhận câu trả lời, phản hồi kết quả trong quá trình chơi và tiếp tục hiển thị nội dung tiếp theo cho đến khi hoàn thành.<br>6. Hệ thống tổng hợp kết quả của lượt chơi và hiển thị phản hồi khích lệ cho Actor. |
| Luồng rẽ nhánh (Alternative Flows) | 4a. Actor muốn chơi lại:<br>1. Sau khi hoàn thành trò chơi, Actor chọn chức năng Chơi lại.<br>2. Hệ thống bắt đầu một lượt chơi mới và hiển thị lại trò chơi từ đầu.<br>3. Quay lại bước 4 của Main Flow. |
| Luồng ngoại lệ (Exception Flows) | 2a. Trò chơi không còn khả dụng:<br>1. Tại bước 2, hệ thống không tìm thấy hoặc không thể mở trò chơi từ mã QR hoặc đường dẫn mà học sinh sử dụng.<br>2. Hệ thống thông báo rằng trò chơi hiện không thể truy cập: "Trò chơi hiện không thể truy cập." và yêu cầu Actor kiểm tra lại thông tin do giáo viên cung cấp.<br>4a. Mất kết nối, khôi phục lại được:<br>1. Tại bước 5, hệ thống phát hiện kết nối Internet bị gián đoạn.<br>2. Hệ thống thông báo cho Actor rằng kết nối đã bị mất: "Kết nối hiện tại đã bị mất." và giữ trạng thái hiện tại của lượt chơi trên thiết bị.<br>3. Kết nối được khôi phục, Actor tiếp tục lượt chơi hiện tại.<br>4b. Mất kết nối, không khôi phục được trạng thái:<br>1. Hệ thống không thể khôi phục trạng thái lượt chơi đã lưu sau khi mất kết nối.<br>2. Hệ thống yêu cầu Actor tải lại trò chơi và bắt đầu lại lượt chơi.<br>5a. Không thể ghi nhận kết quả:<br>1. Tại bước 6, hệ thống gặp sự cố và không thể ghi nhận kết quả lượt chơi.<br>2. Hệ thống thông báo cho Actor: "Hệ thống chưa thể ghi nhận kết quả. Vui lòng thử lại lượt chơi." và cho phép thực hiện lại lượt chơi. |

### 4.2.9. Đặc tả Ca sử dụng UC-09: Tham gia trò chơi

| Mã & Tên Ca sử dụng | UC-09: Tham gia trò chơi |
| --- | --- |
| Tác nhân chính | Học sinh |
| Purpose | Cho phép Actor tham gia trò chơi do giáo viên tổ chức trong lớp học, thực hiện các yêu cầu của trò chơi và theo dõi kết quả trong quá trình tham gia. |
| Tiền điều kiện (Pre-conditions) | Giáo viên đã tạo và mở phòng chơi.<br>Actor có mã QR hoặc thông tin truy cập phòng chơi do giáo viên cung cấp.<br>Thiết bị của Actor có kết nối Internet và có thể mở trò chơi.<br>Phiên chơi chưa kết thúc. |
| Hậu điều kiện (Post-conditions) | Actor tham gia thành công vào phòng chơi.<br>Các câu trả lời, tiến trình và trạng thái của Actor được ghi nhận trong phòng chơi.<br>Kết quả và điểm số của Actor được cập nhật trong phạm vi phòng chơi hiện tại. |
| Luồng sự kiện chính (Main Flow) | 1. Actor quét mã QR hoặc mở thông tin truy cập phòng chơi, nhập tên đại diện (tối đa 20 ký tự, không trùng với người chơi khác trong phòng) và chọn Tham gia.<br>2. Hệ thống kiểm tra phòng chơi và trạng thái phiên chơi.<br>3. Actor lần lượt thực hiện các yêu cầu và trả lời các nội dung của trò chơi theo tiến trình của mình.<br>4. Hệ thống ghi nhận câu trả lời, cập nhật tiến trình, điểm số và trạng thái của Actor; đồng thời hiển thị trạng thái và tiến trình của Actor trên giao diện theo dõi của giáo viên.<br>5. Actor tiếp tục thực hiện trò chơi cho đến khi hoàn thành.<br>6. Hệ thống tổng hợp kết quả, cập nhật trạng thái Actor thành Đã hoàn thành và hiển thị kết quả lượt chơi cho Actor. |
| Luồng rẽ nhánh (Alternative Flows) | 2a. Actor tham gia khi trò chơi chưa bắt đầu:<br>1. Tại bước 2, hệ thống xác định trò chơi chưa bắt đầu, đưa Actor vào màn hình chờ và hiển thị trạng thái đã tham gia thành công.<br>2. Khi giáo viên bắt đầu trò chơi, hệ thống hiển thị nội dung đầu tiên và tiếp tục tại bước 3 của Main Flow.<br>2b. Actor tham gia sau khi trò chơi đã bắt đầu:<br>1. Tại bước 2, hệ thống xác định trò chơi đang diễn ra, cho phép Actor tham gia từ nội dung đầu tiên, tạo tiến trình chơi riêng và cập nhật trạng thái Actor thành Đang chơi trên giao diện theo dõi của giáo viên.<br>2. Actor thực hiện trò chơi theo tiến trình riêng và tiếp tục tại bước 3 của Main Flow.<br>3. Actor có thể hoàn thành trò chơi muộn hơn các học sinh đã tham gia trước đó.<br>3a. Giáo viên tổ chức thi đấu nhóm:<br>1. Khi mở phòng chơi, giáo viên chọn chế độ Thi đấu nhóm, số lượng đội và cách chia đội: ngẫu nhiên (mặc định), giáo viên xếp thủ công hoặc học sinh tự chọn đội khi tham gia.<br>2. Hệ thống gán học sinh vào đội theo cách đã chọn; với cách chia ngẫu nhiên, hệ thống chia cân bằng số người khi giáo viên bắt đầu trò chơi.<br>3. Trong quá trình chơi, hệ thống cập nhật bảng xếp hạng theo đội; điểm của đội là điểm trung bình của các thành viên.<br>4. Tiếp tục tại bước 5 của Main Flow.<br>4a. Giáo viên tạm dừng trò chơi:<br>1. Trong quá trình chơi, giáo viên tạm dừng trò chơi.<br>2. Hệ thống thông báo trạng thái tạm dừng cho Actor: "Trò chơi tạm dừng, thử lại lần sau." và giữ nguyên tiến trình hiện tại.<br>3. Khi giáo viên tiếp tục trò chơi, hệ thống cho phép Actor tiếp tục từ nội dung đang thực hiện. |
| Luồng ngoại lệ (Exception Flows) | 1a. Tên đại diện không hợp lệ hoặc bị trùng:<br>1. Tại bước 1, hệ thống phát hiện tên đại diện để trống, quá 20 ký tự, đã có người dùng trong phòng hoặc chứa từ ngữ không phù hợp.<br>2. Hệ thống thông báo lý do cụ thể và yêu cầu Actor nhập tên khác; Actor chưa được vào phòng.<br>3. Quay lại bước 1 của Main Flow.<br>2c. Không tìm thấy phòng chơi:<br>1. Tại bước 2, hệ thống không tìm thấy phòng chơi tương ứng với thông tin truy cập, thông báo cho Actor kiểm tra lại thông tin do giáo viên cung cấp và không cho phép tham gia.<br>2d. Phiên chơi đã kết thúc:<br>1. Tại bước 2, hệ thống xác định phiên chơi đã kết thúc, thông báo phòng chơi không còn nhận người tham gia và không đưa Actor vào phòng.<br>2e. Phòng chơi đã đủ số lượng người tham gia:<br>1. Tại bước 2, hệ thống xác định phòng chơi đã đạt số lượng người tham gia tối đa do giáo viên đặt.<br>2. Hệ thống thông báo phòng đã đủ người và không đưa Actor vào phòng.<br>4b. Mất kết nối, kết nối lại thành công:<br>1. Tại bước 4, hệ thống phát hiện kết nối của Actor bị gián đoạn, thông báo kiểm tra kết nối mạng: "Kết nối bị gián đoạn." và giữ trạng thái hiện tại.<br>2. Actor kết nối lại trong khi phiên chơi vẫn còn hoạt động, hệ thống cho phép Actor tiếp tục từ trạng thái hiện tại.<br>4c. Mất kết nối, không kết nối lại được:<br>1. Actor không thể kết nối lại và giáo viên đã kết thúc phiên chơi trước khi Actor quay lại được.<br>2. Hệ thống ghi nhận kết quả hiện có của Actor tại thời điểm mất kết nối và đánh dấu trạng thái lượt chơi là Đã kết thúc. |

### 4.2.10. Đặc tả Ca sử dụng UC-10: Tương tác kéo thả, lật thẻ trên màn hình

| Mã & Tên Ca sử dụng | UC-10: Tương tác kéo thả, lật thẻ trên màn hình |
| --- | --- |
| Tác nhân chính | Học sinh |
| Purpose | Cho phép Actor trực tiếp tương tác với các đối tượng trong trò chơi bằng thao tác kéo thả hoặc lật thẻ để thực hiện yêu cầu học tập. |
| Tiền điều kiện (Pre-conditions) | Actor đã truy cập vào một trò chơi.<br>Trò chơi đang hiển thị nội dung có yêu cầu tương tác kéo thả hoặc lật thẻ. |
| Hậu điều kiện (Post-conditions) | Thao tác của Actor được hệ thống ghi nhận.<br>Hệ thống xác định kết quả đúng hoặc sai và đưa ra phản hồi tương ứng.<br>Tiến trình của lượt chơi được cập nhật. |
| Luồng sự kiện chính (Main Flow) | 1. Actor quan sát yêu cầu của trò chơi và thực hiện thao tác kéo thả hoặc lật thẻ theo nội dung đang hiển thị.<br>2. Hệ thống ghi nhận thao tác, kiểm tra kết quả và hiển thị phản hồi phù hợp cho Actor.<br>3. Actor tiếp tục thực hiện các thao tác cần thiết cho đến khi hoàn thành yêu cầu của màn chơi.<br>4. Hệ thống ghi nhận việc hoàn thành và chuyển sang nội dung tiếp theo hoặc hiển thị kết quả của màn chơi. |
| Luồng rẽ nhánh (Alternative Flows) | 1a. Actor thực hiện thao tác kéo thả:<br>1. Tại bước 1, Actor kéo một đối tượng và thả vào vị trí mà mình cho là phù hợp.<br>2. Hệ thống kiểm tra vị trí thả và hiển thị phản hồi đúng hoặc sai.<br>3. Tiếp tục tại bước 3 của Main Flow.<br>1b. Actor thực hiện thao tác lật thẻ, khớp đúng:<br>1. Tại bước 1, Actor lần lượt chọn hai thẻ để lật lên.<br>2. Hệ thống kiểm tra hai thẻ khớp đúng và giữ nguyên các thẻ đã ghép đúng.<br>3. Tiếp tục tại bước 3 của Main Flow.<br>1c. Actor thực hiện thao tác lật thẻ, không khớp:<br>1. Tại bước 1, Actor lần lượt chọn hai thẻ để lật lên.<br>2. Hệ thống kiểm tra hai thẻ không khớp và úp các thẻ lại để Actor tiếp tục.<br>3. Tiếp tục tại bước 3 của Main Flow. |
| Luồng ngoại lệ (Exception Flows) | 2a. Hệ thống không ghi nhận được thao tác:<br>1. Tại bước 2, hệ thống không thể ghi nhận thao tác kéo thả hoặc lật thẻ của Actor.<br>2. Hệ thống giữ nguyên trạng thái hiện tại và cho phép học sinh thực hiện lại thao tác.<br>3. Quay lại bước 1 của Main Flow.<br>4a. Trò chơi gặp sự cố trong quá trình tương tác:<br>1. Tại bước 4, hệ thống không thể tiếp tục màn chơi do xảy ra sự cố.<br>2. Hệ thống thông báo cho Actor: "Trò chơi gặp sự cố, không thể tiếp tục. Vui lòng tải lại trò chơi."<br>3. Quay lại bước 1 của Main Flow sau khi tải lại. |

### 4.2.11. Đặc tả Ca sử dụng UC-11: Nghe giọng đọc thuyết minh

| Mã & Tên Ca sử dụng | UC-11: Nghe giọng đọc thuyết minh |
| --- | --- |
| Tác nhân chính | Học sinh |
| Purpose | Cho phép Actor nghe hệ thống đọc to câu hỏi, từ vựng hoặc hướng dẫn trong trò chơi nhằm hỗ trợ việc tiếp nhận nội dung học tập, đặc biệt đối với Actor nhỏ tuổi hoặc chưa đọc thành thạo. |
| Tiền điều kiện (Pre-conditions) | Actor đã truy cập vào trò chơi.<br>Nội dung đang hiển thị có hỗ trợ giọng đọc thuyết minh.<br>Thiết bị của học sinh có thể phát âm thanh. |
| Hậu điều kiện (Post-conditions) | Nội dung cần thuyết minh được phát cho Actor nghe.<br>Actor có thể tiếp tục thực hiện yêu cầu của trò chơi sau khi nghe nội dung. |
| Luồng sự kiện chính (Main Flow) | 1. Actor mở màn chơi có nội dung cần nghe thuyết minh hoặc chọn chức năng phát giọng đọc.<br>2. Hệ thống phát giọng đọc tương ứng với câu hỏi, từ vựng hoặc hướng dẫn đang hiển thị.<br>3. Actor nghe nội dung và tiếp tục thực hiện yêu cầu của trò chơi. |
| Luồng rẽ nhánh (Alternative Flows) | 2a. Actor muốn nghe lại nội dung:<br>1. Sau khi giọng đọc kết thúc, Actor chọn chức năng phát lại.<br>2. Hệ thống phát lại nội dung thuyết minh tương ứng.<br>3. Tiếp tục tại bước 3 của Main Flow. |
| Luồng ngoại lệ (Exception Flows) | 2c. Không thể phát giọng đọc:<br>1. Tại bước 2, hệ thống không thể phát nội dung thuyết minh.<br>2. Hệ thống vẫn hiển thị nội dung trò chơi để Actor tiếp tục thực hiện.<br>3. Hệ thống cho phép Actor thử phát lại giọng đọc.<br>2d. Thiết bị không phát được âm thanh:<br>1. Tại bước 2, âm thanh không thể phát trên thiết bị của học sinh.<br>2. Hệ thống thông báo cho Actor kiểm tra âm lượng hoặc khả năng phát âm thanh của thiết bị.<br>3. Hệ thống cho phép Actor tiếp tục trò chơi dựa trên nội dung hiển thị (hình ảnh, chữ) hiện có. |

### 4.2.12. Đặc tả Ca sử dụng UC-12: Theo dõi chi phí và trạng thái hoạt động

| Mã & Tên Ca sử dụng | UC-12: Theo dõi chi phí và trạng thái hoạt động |
| --- | --- |
| Tác nhân chính | Quản trị viên |
| Purpose | Cho phép Actor theo dõi trực quan mức độ tiêu thụ tài nguyên của các dịch vụ AI/API, chi phí phát sinh hoặc ước tính và trạng thái hoạt động của các thành phần trong hệ thống nhằm bảo đảm tính sẵn sàng và tối ưu hóa ngân sách vận hành. |
| Tiền điều kiện (Pre-conditions) | Actor đã đăng nhập thành công với quyền Quản trị viên và hệ thống đã có dữ liệu vận hành cần thiết. |
| Hậu điều kiện (Post-conditions) | Các thông tin thống kê chi phí, biểu đồ lưu lượng tiêu thụ và bảng trạng thái hoạt động của hệ thống được hiển thị đầy đủ và trực quan cho Quản trị viên. |
| Luồng sự kiện chính (Main Flow) | 1. Actor chọn chức năng "Theo dõi chi phí và trạng thái hoạt động" từ menu quản trị hệ thống.<br>2. Hệ thống truy xuất dữ liệu nhật ký vận hành từ các dịch vụ AI/API và tự động tổng hợp các chỉ số sử dụng cốt lõi như số lượt yêu cầu API, số lần tương tác AI, tỷ lệ thành công/thất bại và mức tiêu thụ hạn mức.<br>3. Hệ thống tính toán chi phí phát sinh hoặc chi phí ước tính dựa trên lượng tài nguyên tiêu thụ, đồng thời rà soát trạng thái hoạt động và độ ổn định của các dịch vụ chính.<br>4. Hệ thống hiển thị Dashboard trực quan gồm các thẻ chỉ số tổng quan, biểu đồ xu hướng chi phí và bảng thống kê trạng thái hoạt động của từng dịch vụ.<br>5. Actor xem các thông tin trên Dashboard để đánh giá tình trạng vận hành của hệ thống. |
| Luồng rẽ nhánh (Alternative Flows) | 5a. Actor thay đổi khoảng thời gian thống kê:<br>1. Actor chọn khoảng thời gian cần xem như hôm nay, 7 ngày, 30 ngày hoặc khoảng thời gian tùy chỉnh.<br>2. Hệ thống truy xuất lại dữ liệu theo khoảng thời gian đã chọn.<br>3. Hệ thống tự động cập nhật các chỉ số và biểu đồ trên Dashboard.<br>5b. Actor lọc dữ liệu theo một dịch vụ cụ thể:<br>1. Actor chọn một dịch vụ cụ thể từ bộ lọc, ví dụ Generative AI, Image API, TTS hoặc Moderation.<br>2. Hệ thống lọc dữ liệu và cập nhật Dashboard để chỉ hiển thị các số liệu, chi phí và trạng thái liên quan đến dịch vụ được chọn. |
| Luồng ngoại lệ (Exception Flows) | 2a. Không lấy được dữ liệu từ một dịch vụ bên thứ ba:<br>1. Dịch vụ trả về lỗi kết nối hoặc vượt quá thời gian phản hồi.<br>2. Hệ thống đánh dấu trạng thái dịch vụ là "Không thể kết nối" hoặc "Chưa xác định trạng thái", đồng thời hiển thị cảnh báo trực quan cho Actor.<br>3. Hệ thống tiếp tục tải và hiển thị dữ liệu từ các dịch vụ khác để Dashboard không bị gián đoạn hoàn toàn.<br>3a. Đủ dữ liệu để ước tính chi phí:<br>1. Hệ thống không nhận được dữ liệu billing chính thức từ nhà cung cấp API.<br>2. Hệ thống xác định có đủ dữ liệu sử dụng và bảng giá được cấu hình, tự động tính toán và hiển thị mức chi phí ước tính.<br>3b. Không đủ dữ liệu để ước tính chi phí:<br>1. Hệ thống xác định không đủ dữ liệu để tính toán chi phí ước tính.<br>2. Hệ thống hiển thị trạng thái "Chưa có dữ liệu chi phí" thay vì tự đưa ra giá trị giả định. |

### 4.2.13. Đặc tả Ca sử dụng UC-13: Quản lý danh sách giáo viên

| Mã & Tên Ca sử dụng | UC-13: Quản lý danh sách giáo viên |
| --- | --- |
| Tác nhân chính | Quản trị viên |
| Purpose | Cho phép Actor theo dõi và quản lý các tài khoản giáo viên trong hệ thống thông qua các chức năng xem danh sách, tìm kiếm, xem chi tiết, thêm mới, chỉnh sửa thông tin cá nhân, khóa/mở khóa trạng thái tài khoản nhằm bảo đảm an ninh hệ thống và hỗ trợ người dùng. |
| Tiền điều kiện (Pre-conditions) | Actor đã đăng nhập thành công vào hệ thống với quyền Quản trị viên. |
| Hậu điều kiện (Post-conditions) | Danh sách giáo viên được hiển thị đầy đủ, chính xác theo bộ lọc và từ khóa tìm kiếm.<br>Các thay đổi về thông tin tài khoản hoặc trạng thái Hoạt động/Bị khóa được lưu thành công vào cơ sở dữ liệu.<br>Nhật ký thao tác quản trị (Audit Log) được hệ thống ghi nhận đầy đủ. |
| Luồng sự kiện chính (Main Flow) | 1. Actor chọn chức năng "Quản lý danh sách giáo viên" từ menu quản trị hệ thống.<br>2. Hệ thống truy xuất dữ liệu từ cơ sở dữ liệu và hiển thị danh sách tài khoản giáo viên dưới dạng bảng trực quan, có hỗ trợ phân trang, bộ lọc trạng thái và thanh tìm kiếm.<br>3. Actor tìm kiếm, xem thông tin chi tiết hoặc lựa chọn một thao tác quản lý tài khoản phù hợp như thêm mới, chỉnh sửa thông tin, khóa hoặc mở khóa tài khoản.<br>4. Hệ thống thực hiện thao tác xử lý tương ứng, lưu dữ liệu cập nhật vào cơ sở dữ liệu và tự động tải lại danh sách giáo viên mới nhất.<br>5. Hệ thống hiển thị thông báo kết quả cho actor. |
| Luồng rẽ nhánh (Alternative Flows) | 3a. Actor tìm kiếm giáo viên:<br>1. Actor nhập tên hoặc email giáo viên vào thanh tìm kiếm.<br>2. Hệ thống thực hiện lọc và hiển thị danh sách các tài khoản phù hợp với từ khóa tìm kiếm.<br>3b. Actor thêm giáo viên mới:<br>1. Actor chọn "Thêm giáo viên".<br>2. Hệ thống hiển thị biểu mẫu tạo tài khoản giáo viên.<br>3. Actor nhập Họ tên, Email, Trường/Đơn vị, Mật khẩu khởi tạo và các thông tin bắt buộc khác, sau đó chọn "Tạo mới".<br>4. Hệ thống kiểm tra tính hợp lệ của dữ liệu, tạo tài khoản mới trong cơ sở dữ liệu, tự động cập nhật lại danh sách và hiển thị thông báo thành công: "Bạn đã thêm giáo viên thành công."<br>3c. Actor chỉnh sửa thông tin giáo viên:<br>1. Actor chọn "Chỉnh sửa" tại dòng thông tin giáo viên tương ứng.<br>2. Hệ thống hiển thị thông tin hiện tại của giáo viên.<br>3. Actor cập nhật các thông tin cần thiết và chọn "Lưu".<br>4. Hệ thống kiểm tra dữ liệu, lưu các thay đổi vào cơ sở dữ liệu, tự động cập nhật lại danh sách và hiển thị thông báo: "Bạn đã cập nhật thông tin giáo viên thành công."<br>3d. Actor khóa tài khoản giáo viên:<br>1. Actor chọn "Khóa tài khoản" tại tài khoản tương ứng.<br>2. Hệ thống hiển thị hộp thoại yêu cầu xác nhận thao tác.<br>3. Actor chọn "Xác nhận".<br>4. Hệ thống cập nhật trạng thái tài khoản thành "Đã khóa" trong cơ sở dữ liệu, cập nhật lại danh sách và hiển thị thông báo thành công: "Bạn đã khóa tài khoản của giáo viên [Tên giáo viên] thành công."<br>3e. Actor mở khóa tài khoản giáo viên:<br>1. Actor chọn tài khoản đang ở trạng thái "Đã khóa" và chọn "Mở khóa".<br>2. Hệ thống hiển thị hộp thoại yêu cầu xác nhận thao tác.<br>3. Actor chọn "Xác nhận".<br>4. Hệ thống cập nhật trạng thái tài khoản thành "Hoạt động", cập nhật lại danh sách và hiển thị thông báo: "Bạn đã mở khóa tài khoản giáo viên thành công." |
| Luồng ngoại lệ (Exception Flows) | 3a. Không tìm thấy giáo viên phù hợp với tiêu chí tìm kiếm:<br>1. Hệ thống không tìm thấy dữ liệu phù hợp với từ khóa hoặc tiêu chí lọc hiện tại.<br>2. Hệ thống hiển thị thông báo: "Không tìm thấy giáo viên phù hợp."<br>4a. Email giáo viên mới đã tồn tại khi tạo tài khoản:<br>1. Hệ thống phát hiện địa chỉ Email vừa nhập đã được sử dụng bởi một tài khoản khác.<br>2. Hệ thống từ chối tạo tài khoản mới và hiển thị thông báo: "Email này đã tồn tại trong hệ thống."<br>3. Hệ thống giữ nguyên các thông tin Actor đã nhập để actor chỉnh sửa lại.<br>4b. Thông tin chỉnh sửa không hợp lệ hoặc thiếu trường bắt buộc:<br>1. Hệ thống phát hiện dữ liệu không đúng định dạng hoặc thiếu trường thông tin bắt buộc.<br>2. Hệ thống từ chối lưu thay đổi, đánh dấu trường bị lỗi và hiển thị thông báo yêu cầu Actor chỉnh sửa.<br>4c. Không thể cập nhật trạng thái tài khoản:<br>1. Hệ thống gặp lỗi kết nối hoặc sự cố kỹ thuật trong quá trình cập nhật trạng thái tài khoản vào cơ sở dữ liệu.<br>2. Hệ thống giữ nguyên trạng thái hiện tại của tài khoản và không làm thay đổi dữ liệu.<br>3. Hệ thống hiển thị thông báo: "Không thể cập nhật trạng thái tài khoản. Vui lòng thử lại." |

### 4.2.14. Đặc tả Ca sử dụng UC-14: Điều chỉnh cài đặt bộ não AI

| Mã & Tên Ca sử dụng | UC-14: Điều chỉnh cài đặt bộ não AI |
| --- | --- |
| Tác nhân chính | Quản trị viên |
| Purpose | Cho phép Actor tinh chỉnh các tham số kỹ thuật điều khiển AI và nội dung câu lệnh hệ thống (System Instructions/Prompt) dùng để sinh trò chơi, quản lý phiên bản của các cấu hình này nhằm bảo đảm chất lượng nội dung sinh ra và phục vụ truy vết thực nghiệm. |
| Tiền điều kiện (Pre-conditions) | Actor đã đăng nhập thành công vào hệ thống với quyền Quản trị viên. |
| Hậu điều kiện (Post-conditions) | Cấu hình bộ não AI (câu lệnh hệ thống, các tham số kỹ thuật) được cập nhật và áp dụng cho các yêu cầu sinh nội dung AI tiếp theo.<br>Lịch sử các phiên bản cấu hình được lưu trữ đầy đủ.<br>Thao tác thay đổi cấu hình được ghi nhận vào nhật ký thao tác quản trị. |
| Luồng sự kiện chính (Main Flow) | 1. Actor chọn chức năng "Điều chỉnh cài đặt bộ não AI" từ menu quản trị hệ thống.<br>2. Hệ thống hiển thị cấu hình hiện đang áp dụng: nội dung câu lệnh hệ thống, các tham số kỹ thuật điều khiển AI (ví dụ: ngưỡng kiểm duyệt an toàn nội dung, mức độ sáng tạo trong câu trả lời, giới hạn độ dài nội dung sinh ra), cùng danh sách lịch sử các phiên bản cấu hình trước đó.<br>3. Actor chỉnh sửa nội dung câu lệnh hệ thống và/hoặc các tham số kỹ thuật, sau đó chọn "Lưu thay đổi".<br>4. Hệ thống kiểm tra tính hợp lệ của cấu hình mới, lưu thành một phiên bản cấu hình mới, ghi nhận thao tác vào nhật ký thao tác quản trị và áp dụng cấu hình này cho các yêu cầu sinh nội dung AI kế tiếp.<br>5. Hệ thống hiển thị thông báo: "Cập nhật cài đặt bộ não AI thành công." |
| Luồng rẽ nhánh (Alternative Flows) | 3a. Actor đóng băng một phiên bản cấu hình làm chuẩn:<br>1. Tại bước 3, Actor chọn phiên bản cấu hình hiện tại và chọn chức năng "Đóng băng phiên bản" (ví dụ gắn nhãn v1.0.0).<br>2. Hệ thống đánh dấu phiên bản này là bản chuẩn, không cho phép chỉnh sửa trực tiếp nội dung của phiên bản đã đóng băng; mọi thay đổi tiếp theo phải tạo thành một phiên bản mới kế thừa từ đó.<br>3. Hệ thống ghi nhận thao tác vào nhật ký thao tác quản trị và hiển thị thông báo "Đã đóng băng phiên bản cấu hình hiện tại làm phiên bản chuẩn."<br>3b. Actor khôi phục một phiên bản cấu hình trước đó:<br>1. Tại bước 3, Actor chọn một phiên bản trong lịch sử và chọn "Khôi phục".<br>2. Hệ thống thiết lập phiên bản được chọn thành phiên bản đang áp dụng và ghi nhận thao tác vào nhật ký thao tác quản trị.<br>3. Tiếp tục tại bước 5 của Main Flow. |
| Luồng ngoại lệ (Exception Flows) | 4a. Cấu hình không hợp lệ:<br>1. Tại bước 4, hệ thống phát hiện một hoặc nhiều tham số nhập vào không hợp lệ (ví dụ giá trị ngưỡng nằm ngoài phạm vi cho phép, nội dung câu lệnh hệ thống để trống).<br>2. Hệ thống thông báo "Giá trị cấu hình không hợp lệ. Vui lòng kiểm tra lại các tham số (ngưỡng kiểm duyệt, mức độ sáng tạo, giới hạn độ dài nội dung) hoặc nội dung câu lệnh hệ thống." và giữ nguyên cấu hình đang áp dụng.<br>3. Quay lại bước 3 của Main Flow để Actor kiểm tra, nhập lại cấu hình.<br>4b. Hệ thống gặp sự cố khi lưu cấu hình:<br>1. Tại bước 4, hệ thống không thể hoàn tất việc lưu cấu hình mới do sự cố kỹ thuật.<br>2. Hệ thống thông báo: "Không thể lưu cài đặt vào lúc này. Vui lòng thử lại sau." và giữ nguyên cấu hình đang áp dụng trước đó. |

### 4.2.15. Đặc tả Ca sử dụng UC-15: Đăng nhập

| Mã & Tên Ca sử dụng | UC-15: Đăng nhập |
| --- | --- |
| Tác nhân chính | Giáo viên, Quản trị viên |
| Purpose | Cho phép Actor đã có tài khoản đăng nhập vào hệ thống một cách an toàn để sử dụng các chức năng phù hợp với vai trò của mình. |
| Tiền điều kiện (Pre-conditions) | Actor đã có tài khoản hợp lệ trong hệ thống. |
| Hậu điều kiện (Post-conditions) | Actor đăng nhập thành công với đúng vai trò và được cấp quyền truy cập các chức năng tương ứng.<br>Actor được chuyển đến màn hình chính phù hợp với vai trò của mình. |
| Luồng sự kiện chính (Main Flow) | 1. Actor mở hệ thống và chọn chức năng Đăng nhập.<br>2. Hệ thống hiển thị biểu mẫu đăng nhập (email, mật khẩu).<br>3. Actor nhập email, mật khẩu, chọn Đăng nhập.<br>4. Hệ thống kiểm tra thông tin đăng nhập, xác thực tài khoản và xác định vai trò của Actor.<br>5. Hệ thống chuyển hướng Actor đến màn hình chính tương ứng với vai trò của Actor. |
| Luồng rẽ nhánh (Alternative Flows) | 2a. Actor quên mật khẩu:<br>1. Tại bước 2, Actor chọn chức năng "Quên mật khẩu" thay vì nhập thông tin đăng nhập.<br>2. Hệ thống yêu cầu Actor nhập email đã đăng ký và gửi liên kết đặt lại mật khẩu đến email đó (thông báo hiển thị giống nhau dù email có tồn tại hay không; liên kết chỉ dùng được một lần và hết hạn sau 30 phút).<br>3. Actor đặt mật khẩu mới (đạt yêu cầu về độ mạnh như khi đăng ký) qua liên kết; hệ thống đăng xuất các phiên đăng nhập cũ của tài khoản, sau đó Actor quay lại bước 1 của Main Flow để đăng nhập bằng mật khẩu mới.<br>3a. Actor chọn "Ghi nhớ đăng nhập":<br>1. Tại bước 3, Actor chọn thêm tùy chọn "Ghi nhớ đăng nhập" trước khi chọn Đăng nhập.<br>2. Hệ thống giữ Actor ở trạng thái đăng nhập trong 30 ngày (thay vì 24 giờ) trên thiết bị hiện tại, giúp Actor không phải đăng nhập lại mỗi lần truy cập.<br>3. Tiếp tục tại bước 4 của Main Flow. |
| Luồng ngoại lệ (Exception Flows) | 2b. Liên kết đặt lại mật khẩu hết hạn hoặc không hợp lệ:<br>1. Tại bước 3 của luồng 2a, hệ thống phát hiện liên kết đã hết hạn, đã được sử dụng hoặc không hợp lệ.<br>2. Hệ thống thông báo: "Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu gửi lại liên kết đặt lại mật khẩu."<br>3. Actor quay lại bước 1 của luồng 2a để yêu cầu liên kết mới.<br>4a. Sai email hoặc mật khẩu:<br>1. Tại bước 4, hệ thống phát hiện email không tồn tại hoặc mật khẩu không khớp.<br>2. Hệ thống thông báo: "Email hoặc mật khẩu không chính xác. Vui lòng thử lại." Quay lại bước 3 của Main Flow.<br>4b. Tài khoản đã bị khóa:<br>1. Tại bước 4, sau khi xác thực đúng email và mật khẩu, hệ thống xác định tài khoản của Actor đang ở trạng thái "Đã khóa".<br>2. Hệ thống từ chối đăng nhập, thông báo: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ."<br>3. Actor không thể tiếp tục đăng nhập cho đến khi tài khoản được quản trị viên mở khóa.<br>4c. Đăng nhập sai liên tiếp nhiều lần:<br>1. Tại bước 4, hệ thống ghi nhận Actor nhập sai thông tin đăng nhập liên tiếp vượt quá 5 lần.<br>2. Hệ thống tạm thời không cho phép tài khoản đăng nhập trong 15 phút nhằm bảo vệ tài khoản khỏi các lần đăng nhập bất thường.<br>3. Hệ thống thông báo: "Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau."<br>4. Actor không thể đăng nhập lại cho đến khi hết thời gian khóa tạm.<br>4d. Hệ thống gặp sự cố:<br>1. Tại bước 4, hệ thống không thể hoàn tất việc đăng nhập do sự cố kỹ thuật.<br>2. Hệ thống thông báo: "Không thể đăng nhập vào lúc này. Vui lòng thử lại sau."<br>3. Actor có thể thử lại đăng nhập sau khi hệ thống khắc phục sự cố. |

## 4.3. Sơ đồ Lớp Thực thể Dữ liệu (Domain Class Diagram)

[hình ảnh]

## 4.4. Sequence Diagrams (Sơ đồ Tuần tự)

Mục này trình bày các Sơ đồ Tuần tự (Sequence Diagram) mô tả trình tự trao đổi thông điệp theo thời gian giữa Actor và các thành phần của hệ thống cho từng Ca sử dụng đã đặc tả tại Mục 4.2. Mỗi sơ đồ bám sát Luồng sự kiện chính (Main Flow) của Ca sử dụng tương ứng.

### 4.4.1. Sơ đồ Tuần tự UC-01: Đăng ký

[hình ảnh]

### 4.4.2. Sơ đồ Tuần tự UC-02: Gửi mô tả trò chơi

[hình ảnh]

### 4.4.3. Sơ đồ Tuần tự UC-03: Chơi thử

[hình ảnh]

### 4.4.4. Sơ đồ Tuần tự UC-04: Chỉnh sửa trò chơi (Không gian soạn thảo Workspace Editor)

[hình ảnh]

### 4.4.5. Sơ đồ Tuần tự UC-05: Chỉnh sửa thủ công

[hình ảnh]

### 4.4.6. Sơ đồ Tuần tự UC-06: Yêu cầu AI làm lại trò chơi

[hình ảnh]

### 4.4.7. Sơ đồ Tuần tự UC-07: Lưu và Xuất bản trò chơi

[hình ảnh]

### 4.4.8. Sơ đồ Tuần tự UC-08: Tự luyện tập cá nhân

[hình ảnh]

### 4.4.9. Sơ đồ Tuần tự UC-09: Tham gia trò chơi

[hình ảnh]

### 4.4.10. Sơ đồ Tuần tự UC-10: Tương tác kéo thả, lật thẻ trên màn hình

[Chèn hình Sơ đồ Tuần tự UC-10 tại đây]

### 4.4.11. Sơ đồ Tuần tự UC-11: Nghe giọng đọc thuyết minh

[hình ảnh]

### 4.4.12. Sơ đồ Tuần tự UC-12: Theo dõi chi phí và trạng thái hoạt động

[hình ảnh]

### 4.4.13. Sơ đồ Tuần tự UC-13: Quản lý danh sách giáo viên

[hình ảnh]

### 4.4.14. Sơ đồ Tuần tự UC-14: Điều chỉnh cài đặt bộ não AI

[hình ảnh]

### 4.4.15. Sơ đồ Tuần tự UC-15: Đăng nhập

[hình ảnh]

# CHƯƠNG 5. PHỤ LỤC VÀ MA TRẬN TRUY XUẤT (APPENDICES & TRACEABILITY MATRIX)

## 5.1. Ma trận Truy xuất Yêu cầu 2 chiều (Requirements Traceability Matrix - RTM)

[Nội dung Ma trận Truy xuất Yêu cầu để trống — Sẽ được bổ sung sau]

## 5.2. Phụ lục A: Cấu trúc Cấu hình Mẫu Game JSON DSL (schemaVersion: 1.0.0)

[Nội dung Cấu trúc Game JSON DSL Schema để trống — Sẽ được bổ sung sau]

## 5.3. Phụ lục B: Đóng băng Phiên bản System Prompt chuẩn (System Prompt ACTIVE v1.0.0)

[Nội dung System Prompt Spec để trống — Sẽ được bổ sung sau]

## 5.4. Phụ lục C: Danh mục Văn bản Pháp lý & Quy chuẩn Sư phạm

[Nội dung Danh mục Văn bản Pháp lý để trống — Sẽ được bổ sung sau]

## 5.5. Phụ lục D: Sơ đồ Tổng quan Kiến trúc & Luồng Dữ liệu Hệ thống (System Architecture Overview)

[Nội dung Sơ đồ Kiến trúc Hạ tầng để trống — Sẽ được bổ sung sau]
