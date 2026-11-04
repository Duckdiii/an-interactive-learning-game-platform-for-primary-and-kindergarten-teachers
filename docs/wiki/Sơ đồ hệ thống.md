# Sơ đồ hệ thống

Nguồn: `docs/diagrams/`, cập nhật toàn bộ từ `raw/` ngày 2026-11-04.
Cập nhật: 2026-11-04

Sơ đồ giúp hiểu luồng và cấu trúc. **Khi viết code, field, endpoint hay mã lỗi, tin contract và code, không tin tên trong sơ đồ.** Tên trang, service, repository trong sơ đồ tuần tự là tên thiết kế, có thể khác code (ví dụ `GameCreationPage`, `UserRepository`).

## 1. Sơ đồ Pipeline Tạo Trò chơi AI (Mới nhất)

* **File nguồn**: `docs/diagrams/Pipeline_Tao_Tro_Choi_AI.drawio`

```mermaid
flowchart TD
    subgraph S1 ["1. TIẾP NHẬN & PHÂN TÍCH"]
        Prompt["1. Giáo viên nhập mô tả (Prompt tự nhiên)<br/>• Môn học, Khối lớp & Yêu cầu bài giảng"]
        RAG[("TRI THỨC CTGDPT 2018<br/>(Curriculum-RAG Database)<br/>Chuẩn kỹ năng Toán/Tiếng Việt")]
        Intent["2. Phân tích Ý định & Bóc tách 3 tầng<br/>(Pedagogy - Interaction - Story)"]
        DecIntent{"Đủ dữ kiện?<br/>(Intent Check)"}
        Clarify["HỎI LÀM RÕ (Clarification Loop)<br/>AI chủ động hỏi lại"]
    end

    Prompt --> Intent
    RAG -.->|"Tra cứu chuẩn"| Intent
    Intent --> DecIntent
    DecIntent -- "Thiếu / Mơ hồ" --> Clarify
    Clarify -->|"Bổ sung thông tin"| Prompt

    subgraph S2 ["2. KẾ HOẠCH & TỔ HỢP CƠ CHẾ"]
        PatBank[("NGÂN HÀNG MẪU CƠ CHẾ<br/>(Pattern Bank 10+14)")]
        AgeProf[("HỒ SƠ LỨA TUỔI<br/>Luật <=15 từ & Vùng chạm >=56px")]
        Planner["3. Lập kế hoạch trò chơi (AI Game Planner)<br/>Nguyên tắc: Tích hợp nội tại (Học = Chơi)"]
        Prop["4. Đề xuất 5 tựa game & Giải trình sư phạm<br/>(Bloom Taxonomy Rationale)"]
        CPF["COMPOSABLE PRIMITIVES FRAMEWORK (CPF)<br/>• 20 Khối Nguyên tử & 4 Module"]
        ContentGen["5. Sinh nội dung bài học (Content Generator)<br/>• JSON DSL v1.0.0 Best-of-N"]
        Assets[("KHO THEME & ASSET ĐỒ HỌA<br/>SVG Vector & Audio CC0")]
    end

    DecIntent -- "Đủ dữ kiện" --> Planner
    PatBank -.->|"Khớp cơ chế"| Planner
    AgeProf -.->|"Luật lứa tuổi"| Planner
    Planner -- "Khớp 24 mẫu" --> Prop
    Prop -->|"Giáo viên duyệt"| ContentGen
    Prop -.->|"Đổi 5 ý tưởng khác"| Planner
    Planner -- "Ngoài danh mục (Bắn cung, Đua xe...)" --> CPF
    CPF -->|"JSON DSL Custom"| ContentGen
    Assets -.->|"Ghép Assets"| ContentGen

    subgraph S3 ["3. BỘ 3 LỚP KIỂM TRA TỰ ĐỘNG (QUALITY GATES)"]
        Gate1["CỔNG 1: KIỂM TRA CÚ PHÁP<br/>JSON Schema Validation"]
        Gate2["CỔNG 2: MÁY TÍNH TỰ GIẢI TOÁN (0% AI)<br/>Code Java tự tính lại 100% & Dò từ điển TV"]
        Gate3["CỔNG 3: THẢ BOT CHƠI THỬ TRÌNH DUYỆT<br/>Playwright Headless giả lập Click/Drag (0 crash)"]
        Gate1 -->|"Cú pháp OK"| Gate2
        Gate2 -->|"Toán chuẩn"| Gate3
    end

    ContentGen -->|"Ứng viên DSL"| Gate1

    subgraph S4 ["4. THẨM ĐỊNH & PHẢN HỒI"]
        DecAll{"Cả 3 Cổng<br/>đều đạt?"}
        Repair["BỘ PHẢN HỒI LỖI (FEEDBACK ENGINE)<br/>Gói lỗi cho AI sửa (Tối đa 3 lần)"]
        Fallback["DỰ PHÒNG AN TOÀN (SAFE FALLBACK)<br/>Chuyển sang Generic Hotspot"]
        Certified["KỊCH BẢN CHỨNG THỰC (CERTIFIED DSL)<br/>Chuẩn 100% cú pháp, toán học & 0 crash"]
    end

    Gate3 --> DecAll
    DecAll -- "Có lỗi" --> Repair
    Repair -->|"Repair Loop (<= 3 lần)"| ContentGen
    Repair -- "Quá 3 lần" --> Fallback
    Fallback --> Certified
    DecAll -- "Đạt 100%" --> Certified

    subgraph S5 ["5. TRÌNH DIỄN & XUẤT BẢN"]
        Engine["7. Trình hiển thị Đa năng (Hybrid Konva Engine)<br/>• Preset: Render 24 mẫu có sẵn<br/>• Custom: Vận hành CPF Runtime 60 FPS"]
        Preview["8. Chơi thử & Tùy biến 1-Click (Playable Preview)"]
        Publish["9. XUẤT BẢN GAME CHO HỌC SINH<br/>• Phòng Live Arena (Mã PIN)<br/>• Tự luyện ở nhà (Mã QR / ShareCode)"]
    end

    Certified --> Engine
    Engine --> Preview
    Preview --> Publish

## 2. Kiến trúc Tổng thể N-Tier

* **File**: `docs/diagrams/kien-truc-n-tier.jpg` & `docs/diagrams/AI-Native Game Platform - System Architecture.jpg`
* Bốn tầng: Presentation (Teacher Portal, Student Runtime, Admin Portal), Business Logic (Security Gateway, Auth, Game Management, Arena, Curriculum RAG, Content Generator, Validation Engine, Rate Limiter, Prompt Versioning, Media Asset Binder), Data (PostgreSQL, AWS S3), External (Gemini, OpenAI Moderation, Pexels, Google TTS).

## 3. Sơ đồ Tổng quát

| Sơ đồ | File | Ghi chú |
|---|---|---|
| Pipeline Tạo Game AI | `docs/diagrams/Pipeline_Tao_Tro_Choi_AI.drawio` | Mô hình Dual-Track 3 cột, chốt chặn Quality Gates & CPF |
| Activity toàn luồng | `docs/diagrams/activity-tong-quan.drawio` | Giáo viên, Backend, học sinh, CSDL: tạo, kiểm tra 3 lớp, xuất bản, chơi, kết quả |
| Use case | `docs/diagrams/use-case.drawio` | Bản đồ 18 Ca sử dụng tổng thể |
| Class | `docs/diagrams/class-diagram.drawio` | Mô hình miền, Strategy, kế thừa `QuestionGame`, `GameSession`, `PlayInteractionDetail` |

## 4. Danh mục 18 Sơ đồ Tuần tự (Sequence Diagrams)

Đọc cùng ca sử dụng tương ứng trong `docs/srs/`.

| Ca sử dụng | File Diagram |
|---|---|
| UC-01 Đăng ký | `docs/diagrams/sequence/UC-01_Register_SequenceDiagram.drawio` |
| UC-02 Gửi mô tả trò chơi | `docs/diagrams/sequence/UC-02_Submit_Game_Description_SequenceDiagram.drawio` |
| UC-03 Chơi thử | `docs/diagrams/sequence/UC-03_TrialPlay_SequenceDiagram.drawio` |
| UC-04 Chỉnh sửa trò chơi | `docs/diagrams/sequence/UC-04_Edit_Game_WorkspaceEditor_SequenceDiagram.drawio` |
| UC-05 Chỉnh sửa thủ công | `docs/diagrams/sequence/UC-05_Manual_Edit_SequenceDiagram.drawio` |
| UC-06 AI làm lại | `docs/diagrams/sequence/UC-06_AI_Regenerate_SequenceDiagram.drawio` |
| UC-07 Lưu và xuất bản | `docs/diagrams/sequence/UC-07_SaveAndPublishGame_SequenceDiagram.drawio` |
| UC-08 Tự luyện | `docs/diagrams/sequence/UC-08_SelfPractice_SequenceDiagram.drawio` |
| UC-09 Tham gia phòng | `docs/diagrams/sequence/UC-09_JoinGame_SequenceDiagram.drawio` |
| UC-11 Giọng đọc | `docs/diagrams/sequence/UC-11_NarrationAudio_SequenceDiagram.drawio` |
| UC-12 Theo dõi chi phí | `docs/diagrams/sequence/UC-12_CostMonitoring_SequenceDiagram.drawio` |
| UC-13 Quản lý giáo viên | `docs/diagrams/sequence/UC-13_TeacherManagement_SequenceDiagram.drawio` |
| UC-14 Cài đặt AI | `docs/diagrams/sequence/UC-14_AIBrainConfig_SequenceDiagram.drawio` |
| UC-15 Đăng nhập | `docs/diagrams/sequence/UC-15_Login_SequenceDiagram.drawio` |
| **UC-16 Quản lý hồ sơ lớp học** | `docs/diagrams/sequence/UC-16_ProfileClassManagement_SequenceDiagram.drawio` |
| **UC-17 Quản lý kho trò chơi** | `docs/diagrams/sequence/UC-17_GameLibraryManagement_SequenceDiagram.drawio` |
| **UC-18 Thống kê kết quả lớp** | `docs/diagrams/sequence/UC-18_ClassResultsStatistics_SequenceDiagram.drawio` |

## Liên kết liên quan
- [[Kiến trúc và công nghệ]]
- [[Ca sử dụng]]
- [[Cơ sở khoa học và GamED-AI]]
- [[Mô tả ngoài danh mục game]]
- [[Điểm lệch và việc cần chốt]]
