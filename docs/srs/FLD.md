# 3.1.4. Ma trận Đặc tả Trường Giao diện Tương tác (Interface Field Specs - FLD-01 đến FLD-30)

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
