# Tra cứu tài liệu dự án

Chọn tài liệu theo tác vụ. Mở đúng mục cần đọc trước khi tra cứu thêm.

| Cần làm gì | Mở trước |
|---|---|
| Hiểu luồng nghiệp vụ hoặc tiêu chí của một UC | [Mục lục UC](srs/README.md). Mở đúng file UC và ghi chú triển khai được dẫn từ đó. |
| Tìm code, frontend gọi API và test của một tính năng | [FEATURE-MAP](FEATURE-MAP.md). Tìm theo tính năng hoặc phương thức và đường dẫn API. |
| Sửa hoặc xác minh API REST | [Chỉ mục OpenAPI](openapi/INDEX.md) → đoạn operation và schema liên quan trong [hợp đồng OpenAPI](openapi/openapi.yaml). Đối chiếu controller, DTO và test tương ứng qua FEATURE-MAP. |
| Sửa JSON game hoặc đầu ra AI | [DSL v1.0.0](game-json-dsl-v1.0.0.md), [giải thích Visual Cloze dạng ảnh v1.1.0](game-json-dsl-v1.1.0.md), [schema DSL theo phiên bản](../backend/src/main/resources/schema/game-dsl), [schema đầu ra AI](../backend/src/main/resources/schema/game-ai-output), [kiểu TypeScript](../frontend/src/types/game-dsl.types.ts) và [test schema DSL](../backend/src/test/java/com/aigameplatform/backend/dto/dsl/GameDslSchemaTest.java). Chọn phiên bản từ `schemaVersion`. |
| Sửa game CPF hoặc thông điệp WebSocket | [Hợp đồng CPF](cpf-game-v2.0.0.md), [schema CPF](../backend/src/main/resources/schema/cpf), [test schema CPF](../backend/src/test/java/com/aigameplatform/backend/dto/cpf/CpfGameSchemaTest.java) hoặc [định dạng WebSocket](websocket-message-format-v1.0.0.md). |
| Tra yêu cầu, trường dữ liệu và chỉ số | [FR](srs/FR-summary.md), [NFR](srs/NFR.md), [FLD](srs/FLD.md) và [KPI](srs/KPI.md). |
| Tra màn hình, kiến trúc hoặc quyết định | [Đặc tả giao diện](ui/SPEC.md), [wireframe](ui/wireframes/), [sơ đồ hệ thống](<wiki/Sơ đồ hệ thống.md>) và [nhật ký quyết định](decisions.md). |
| Đọc bối cảnh nghiên cứu hoặc bản gốc | [Wiki](wiki/index.md), [Định hướng v10](Dinh_huong_de_tai.md) và [SRS v3 gốc](SRS-full.md). |

Dùng hợp đồng và schema đúng phiên bản khi sửa interface. Dùng trang UC để đọc yêu cầu theo mục, rồi đối chiếu code và test để xác nhận hiện trạng. SRS v3 và wiki cung cấp bối cảnh. Các ghi chú trong đó có thể phản ánh thời điểm tài liệu được viết.

Khi thêm endpoint, cập nhật FEATURE-MAP và sinh lại chỉ mục OpenAPI. Khi thêm UC, cập nhật bảng FR và mục lục UC.
