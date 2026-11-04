# Góp ý của Thầy Thanh và 8 Vấn đề Cốt lõi

> **Nguồn tài liệu gốc**:  
> - Biên bản tổng hợp: `docs/research/3a22128e-bfdb-4a56-aae3-93fe723482d7_Vn__tm_thy_-_13102026.md`  
> - Băng ghi âm cuộc họp: `docs/transcript.md`  
> - Trọn bộ 8 file phân tích chuyên sâu tại: `docs/research/`  
> **Cập nhật**: 2026-11-04  
> **Liên kết liên quan**: [[Tổng quan đề tài]], [[So sánh với web tool]], [[Cơ sở khoa học và GamED-AI]], [[Kế hoạch và việc còn lại]], [[Sơ đồ hệ thống]], [[index]]

---

## 1. Tinh thần Chỉ đạo Cốt lõi từ Thầy Thanh (Họp 13/10/2026)
* **Câu hỏi then chốt nhất của Thầy**: *"Chỉ hơn được chừng đó. AI tạo ra sự khác biệt gì so với Web tool?"*
* **Định vị bản chất**: Web tool là khung có sẵn, người dùng nhập dữ liệu vào. AI-Native phải là người dùng mô tả nhu cầu/bối cảnh $\to$ AI tự động quyết định cả cơ chế, luật chơi và nội dung $\to$ Hệ thống tự động kiểm chứng an toàn.
* **Yêu cầu thực tiễn**: Không làm lý thuyết suông; phải có kịch bản so sánh đối đầu (benchmark demo), số liệu chi phí token, mô hình kinh doanh, đạt tối thiểu 100 người dùng thử nghiệm trên môi trường Cloud (Beta/MVP).

---

## 2. Ma trận 8 Vấn đề & Giải pháp Kỹ thuật

| # | Vấn đề Thầy nêu | Bản chất yêu cầu | Giải pháp kỹ thuật của Nhóm | Tài liệu nghiên cứu chuyên sâu | Trạng thái |
|---|---|---|---|---|:---:|
| **1** | Hệ thống hiểu bối cảnh rộng hơn dropdown | Không bắt giáo viên chọn từng ô; AI phải hiểu bối cảnh lớp học | Xây dựng Context Model 4 tầng (Hồ sơ giáo viên, Hồ sơ lớp, Ngữ cảnh bài, Tín hiệu sở thích) $\to$ Đã đặc tả tại [[UC-16]]. | [[Vấn đề 1 - Bối cảnh sư phạm và Context Model 4 tầng|Chi tiết Vấn đề 1]] | `✅ Đã thiết kế` |
| **2** | Đề xuất một loạt game | Không chỉ sinh 1 câu hỏi, AI phải đề xuất bộ game kèm lý do sư phạm | Bước 4 trong Pipeline: AI gợi ý 5 tựa game đa dạng cơ chế kèm giải trình Bloom; giáo viên duyệt 1-click. | [[Vấn đề 2 - Đề xuất loạt game theo mục tiêu bài học|Chi tiết Vấn đề 2]] | `✅ Đã thiết kế` |
| **3** | Nền tảng dùng ở cả lớp học và ở nhà cho phụ huynh | Phải có luồng tiếp cận thực tế cho học sinh và phụ huynh | Tách 2 luồng: Live Arena (mã PIN qua STOMP [[UC-09]]) và Tự luyện ở nhà (mã ShareCode/QR qua Zalo/Camera, không bắt cài app [[UC-08]]). | [[00. Nhận xét Thầy Thanh - 13-10-2026 (Tổng quan 8 vấn đề)|Biên bản họp 13/10]] | `✅ Đã thiết kế` |
| **4** | Độ mượt và đồ họa phải hơn Web tool | Web tool đồ họa khô cứng; game trẻ em cần chuyển động sống động | Áp dụng Candy Gloss Style, bộ 3 asset itch.io + Kenney CC0 + Lottie, kiến trúc 3 tầng Canvas Konva 60 FPS ([[Tiêu chuẩn Đồ họa và Asset Pipeline]]). | [[Vấn đề 4 - Nâng cao chất lượng đồ họa và độ mượt so với Web Tool|Chi tiết Vấn đề 4]] | `✅ Đã thiết kế` |
| **5** | Làm demo so sánh với Web tool trước | Cần bằng chứng thực nghiệm định lượng, không chỉ nói suông | Kịch bản Benchmark Demo: Cùng 1 bài toán lớp 2 $\to$ Wordwall mất 15–20 phút vs Nền tảng AI mất 30 giây. | [[So sánh với web tool]] | `⚠️ Cần hoàn thiện slide/bảng` |
| **6** | "AI tạo ra sự khác biệt gì?" | Khác biệt về chất, không chỉ là nhanh hơn về lượng | 3 khẳng định: (1) Quyết định "làm gì" chứ không chỉ "điền gì", (2) Tự động đối chiếu chuẩn CTGDPT 2018 & chặn 100% ảo giác ([[Cơ sở khoa học và GamED-AI]]), (3) Tích hợp nội tại (Chơi = Học). | [[Vấn đề 6 - Chứng minh sự vượt trội về chất so với Web Tool|Chi tiết Vấn đề 6]] | `✅ Đã lập luận chặt` |
| **7** | "Tư duy CEO": Cắt lát 30% Tính năng MVP | Quy mô đề tài lớn, cần cẩn trọng quá tải trước ngày bảo vệ | Thu hẹp phạm vi hạt nhân: Tập trung làm xuất sắc 3 Use Case: [[UC-02]] (Tạo game), [[UC-05]] (Biên tập), [[UC-08]] / [[UC-09]] (Chơi game). | [[Vấn đề 7 - Đánh giá quy mô và tính khả thi của đề tài|Chi tiết Vấn đề 7]] | `⚠️ Cần chốt mốc code` |
| **8** | Tính toán kinh tế & Định giá gói dịch vụ | Phải chứng minh tính khả thi vận hành và thương mại | Tính toán token: $\approx 12$ VNĐ/game với Gemini Prompt Caching $\to$ Đề xuất Gói Free vs Gói Pro Giáo viên (99k/tháng), theo dõi tại [[UC-12]]. | [[Vấn đề 8 - Minh chứng nhu cầu thực tế và khảo sát giáo viên|Chi tiết Vấn đề 8]] | `⚠️ Cần lập bảng chi phí` |

---

## 3. Lời giải cho bài toán "Nếu giáo viên mô tả ngoài 10 loại có sẵn thì sao? Rồi sao nữa?"
* Nhóm đã giải quyết bằng **[[Mô tả ngoài danh mục game|Composable Primitives Framework (CPF)]]**:
  * 20 Khối Nguyên tử (Canvas, Motion, Interaction, Effects, Logic).
  * 4 Module điều phối độc lập: [[Module 1 Bộ Phân giải & Kiểm định Khối (Parser & Validator)]] $\to$ [[Module 2 Bộ Lắp ghép Đồ thị Trò chơi (Scene & Graph Assembler)]] $\to$ [[Module 3 Máy ảo Điều phối Đa năng (Virtual Runtime Engine)]] $\to$ [[Module 4 Tầng Kết xuất Phần cứng Canvas (Konva Driver)]].
  * Cơ chế Input Lock chống trẻ ấn loạn làm đơ máy.

---

## 4. Danh mục Tài liệu Gốc Tham chiếu
- Biên bản toàn văn cuộc họp: [[00. Nhận xét Thầy Thanh - 13-10-2026 (Tổng quan 8 vấn đề)]]
- Băng ghi âm và ghi chép chi tiết: [[transcript]]
- Tài liệu chuyên sâu Vấn đề 1: [[Vấn đề 1 - Bối cảnh sư phạm và Context Model 4 tầng]]
- Tài liệu chuyên sâu Vấn đề 2: [[Vấn đề 2 - Đề xuất loạt game theo mục tiêu bài học]]
- Tài liệu chuyên sâu Vấn đề 4: [[Vấn đề 4 - Nâng cao chất lượng đồ họa và độ mượt so với Web Tool]]
- Tài liệu chuyên sâu Vấn đề 6: [[Vấn đề 6 - Chứng minh sự vượt trội về chất so với Web Tool]]
- Tài liệu chuyên sâu Vấn đề 7: [[Vấn đề 7 - Đánh giá quy mô và tính khả thi của đề tài]]
- Tài liệu chuyên sâu Vấn đề 8: [[Vấn đề 8 - Minh chứng nhu cầu thực tế và khảo sát giáo viên]]
