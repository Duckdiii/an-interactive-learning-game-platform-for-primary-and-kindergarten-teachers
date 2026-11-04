# Danh mục 24 Cơ chế Game Học tập Chuẩn hóa (Preset Catalog)

> **Nguồn tài liệu gốc**: [[Các cơ chế game|Báo cáo 24 Cơ chế game gốc]], [[Đề xuất các game khác|Nghiên cứu Đề xuất mở rộng]]  
> **Cập nhật**: 2026-11-04  
> **Liên kết liên quan**: [[Game JSON DSL]], [[Mô tả ngoài danh mục game]], [[Sơ đồ hệ thống]], [[Kiến trúc và công nghệ]]

---

## 1. Tổng quan Bộ 24 Cơ chế Chuẩn hóa (Preset Mechanisms)

Hệ thống phân định rõ ràng giữa **24 Cơ chế chuẩn có sẵn (Preset Engines)** và **Cơ chế tùy biến ngoài danh mục (Composable Primitives Framework - CPF)**. Khi yêu cầu của giáo viên khớp với 1 trong 24 cơ chế này, hệ thống sẽ đi theo **Đường ray 1 (Preset Fast-Path)**:
- Tốc độ sinh JSON DSL siêu tốc ($\le 5\text{s}$).
- Kết xuất trực tiếp qua các Template Component tối ưu sẵn trên Konva Canvas.
- Đạt tỷ lệ đúng đắn cú pháp và nghiệp vụ gần như $100\%$.

---

## 2. Bảng Ma trận Chi tiết 24 Cơ chế Game

| STT | Mã cơ chế (DSL) | Tên cơ chế tiếng Việt | Hành vi tương tác của trẻ (Player Action) | Môn học & Khối lớp | Độ phức tạp kỹ thuật & Renderer |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | `QUIZ` | Trắc nghiệm chọn đáp án | Đọc/nghe câu hỏi $\to$ Chạm chọn 1 đáp án đúng trong các phương án. | Mọi môn (K-5) | Thấp (Standard Buttons) |
| **2** | `MATCHING` | Ghép cặp / Nối đôi | Nối cặp 1-1 giữa 2 cột (hoặc chạm liên tiếp 2 ô có mối liên hệ logic). | Toán, Tiếng Việt, Tiếng Anh | Thấp (Line Connector) |
| **3** | `DRAG_AND_DROP` | Kéo - thả phân loại | Kéo các vật thể thả vào đúng nhóm/vùng quy định (chuồng, giỏ, bảng). | Mọi môn (K-5) | Trung bình (DropZone AABB) |
| **4** | `MEMORY_CARD` | Lật thẻ ghi nhớ | Chạm lật mở 2 thẻ bài úp để tìm cặp hình/từ giống nhau. | Tiếng Anh, Tự nhiên & Xã hội | Thấp (Flip Card 2.5D) |
| **5** | `ORDERING` | Sắp xếp thứ tự | Kéo thả hoặc chạm xếp các thẻ theo thứ tự (từ trái qua phải, từ bé đến lớn). | Toán (Dãy số), Tiếng Việt (Cốt truyện) | Thấp (Horizontal Slot Array) |
| **6** | `ODD_ONE_OUT` | Tìm điểm khác biệt | Nhìn một tập hợp 4–5 đối tượng $\to$ Chạm vào 1 đối tượng khác quy luật. | Tư duy logic, Toán 1-3 | Thấp (Grid Select) |
| **7** | `WORD_SCRAMBLE` | Xếp chữ / Ghép từ | Nhìn gợi ý $\to$ Chạm/kéo các chữ cái rời rạc xếp thành từ có nghĩa. | Tiếng Việt 1-3, Tiếng Anh | Thấp (Letter Snap Slot) |
| **8** | `VISUAL_CLOZE` | Điền khuyết có hình | Một câu văn hoặc phép tính có ô trống $\to$ Chọn số/từ điền vào chỗ khuyết. | Toán, Tiếng Việt (K-5) | Thấp (Text Fill Slot) |
| **9** | `AUDIO_VISUAL_MATCH` | Nghe - chọn hình | Nghe âm thanh phát ra (tiếng con vật, từ tiếng Anh) $\to$ Chạm vào hình đúng. | Mầm non, Tiếng Anh, Âm nhạc | Thấp (TTS / Web Audio + Grid) |
| **10** | `SPOT_THE_TARGET` | Tìm vật trong tranh | Quan sát một bức tranh lớn nhiều chi tiết $\to$ Tìm và chạm vào vật yêu cầu. | Mầm non, Tiếng Anh, Kỹ năng sống | Trung bình (Hit-box Masking) |
| **11** | `TARGET_TAP` | Chạm mục tiêu di động | Các đối tượng bay/di chuyển ngẫu nhiên $\to$ Chạm trúng để ghi điểm. (*Dùng cho: Bắn bong bóng phép tính MATH_BUBBLE, Bong bóng tìm tiếng SOUND_BUBBLE, Bắn phi thuyền*). | Toán phản xạ, Tiếng Việt phản xạ | Trung bình (Particle / Moving Sprite) |
| **12** | `BALANCE_SCALE` | Cân đĩa thăng bằng | Kéo các quả cân/vật thể đặt lên 2 đĩa cân sao cho 2 vế bằng nhau. (*Dùng cho: Học bản chất phép cộng, so sánh lớn hơn/bé hơn/bằng nhau*). | Toán 1-3 | Trung bình (Torque / Tilt Angle) |
| **13** | `NUMBER_LINE` | Tia số nhảy cóc | Điều khiển nhân vật nhảy tiến/lùi từng bước trên trục số. (*Dùng cho: Thứ tự số, phép cộng/trừ trong phạm vi 10–20*). | Toán 1-2 | Trung bình (Step Hop Animation) |
| **14** | `PREPOSITION_SCENE` | Đặt vật theo chỉ dẫn âm thanh | Nghe lệnh (tiếng Anh/tiếng Việt) $\to$ Kéo vật đặt đúng vị trí không gian (trên, dưới, trong, ngoài bàn). (*Dùng cho: Giới từ tiếng Anh, nhận biết không gian mầm non*). | Tiếng Anh, Mầm non | Trung bình (Spatial Anchor Snapping) |
| **15** | `PATTERN_COMPLETE` | Điền khuyết quy luật | Quan sát một chuỗi hình/số theo chu kỳ có ô trống $\to$ Chọn phần tử tiếp theo. (*Dùng cho: Hoàn thành quy luật hình học, tư duy logic*). | Toán 1-3, Tư duy logic | Thấp (Sequence Slot) |
| **16** | `BAR_MODEL` | Kéo thả sơ đồ đoạn thẳng | Kéo dãn hoặc ráp các đoạn thẳng có độ dài tỉ lệ để giải bài toán có lời văn. (*Dùng cho: Toán mô hình đoạn thẳng lớp 3–5 theo phương pháp Singapore Math*). | Toán 3-5 | Trung bình (Resizable Bar Graph) |
| **17** | `BASE_TEN_BLOCKS` | Khối Hàng Chục - Trăm (Dienes) | Kéo ghép các khối đơn vị (Unit), thanh chục (Rod), tấm trăm (Flat) để học cấu tạo số thập phân. | Toán 1-3 | Thấp (Grid Rect) |
| **18** | `FRACTION_PIE` | Cắt ghép phân số trực quan | Chọn các miếng bánh hình quạt (Wedge) ghép lại thành hình tròn hoàn chỉnh để học phân số. | Toán 4-5 | Trung bình (Wedge Shape Snap) |
| **19** | `CLOCK_DIAL` | Xoay kim đồng hồ xem giờ | Xoay kim giờ và kim phút trên mặt đồng hồ để chỉ đúng thời gian yêu cầu. | Toán 1-3 | Trung bình (Rotation Drag) |
| **20** | `SKIP_COUNT_MAZE` | Mê cung đếm cách / Cửu chương | Dẫn đường cho nhân vật đi qua các ô theo bước nhảy cố định (+2, +3, +5) để ra khỏi mê cung. | Toán 1-4 | Thấp (Tile Grid) |
| **21** | `PHONICS_WHEEL` | Bánh xe xoay ghép vần | Xoay 2–3 vòng tròn đồng tâm (Âm đầu, Vần, Dấu thanh) để tạo thành từ có nghĩa. | Tiếng Việt 1 | Trung bình (Concentric Circles Drag) |
| **22** | `SENTENCE_TRAIN` | Đoàn tàu ghép câu và dấu câu | Kéo các toa tàu mang từ ngữ và dấu câu ghép nối vào đầu tàu theo đúng ngữ pháp. | Tiếng Việt 2-4 | Thấp (Horizontal Snap Array) |
| **23** | `CYCLE_LOOP` | Vòng tuần hoàn chu kỳ | Sắp xếp các giai đoạn vào vòng tròn khép kín (Vòng đời của bướm, Vòng tuần hoàn của nước, Chuỗi thức ăn). | Tự nhiên & Xã hội 1-5 | Thấp (Circular Array) |
| **24** | `TANGRAM_SNAP` | Ghép đa giác theo bóng đen | Kéo, xoay 7 miếng ghép hình học Tangram thả khớp vào bóng đen của con vật/đồ vật. | Toán / Mỹ thuật 1-5 | Trung bình (Polygon Snap & Rotate) |

---

## 3. Kiến trúc Tích hợp Sư phạm (Intrinsic Integration)

Điểm cốt lõi khiến 24 cơ chế này vượt trội hơn các công cụ web tool thông thường:
1. **Gắn liền bản chất toán học**: Trẻ học cộng trừ bằng cách nhìn thấy cán cân nghiêng lệch (`BALANCE_SCALE`) hoặc bước nhảy trực quan trên tia số (`NUMBER_LINE`), không phải học vẹt qua phép tính khô khan.
2. **Khái niệm trừu tượng hóa hình học**: Phân số được sờ chạm qua miếng bánh (`FRACTION_PIE`), giá trị hàng chữ số được cảm nhận qua khối lượng mảng hình khối (`BASE_TEN_BLOCKS`).
3. **Chuẩn hóa công thái học mầm non**: Toàn bộ các vùng chạm (Touch Area) trên từng cơ chế đều được cố định kích thước an toàn $\ge 48\text{px} \times 48\text{px}$, chống tình trạng trẻ mầm non chạm trượt gây ức chế tâm lý.

---

## 4. Tài liệu Nghiên cứu Gốc
- [[Các cơ chế game|Chi tiết phân tích 24 cơ chế game]]
- [[Đề xuất các game khác|Đề xuất danh mục mở rộng các thể loại game]]
