# Review ràng buộc chương trình

Trạng thái: **APPROVED_BY_USER**. Người dùng đã chốt bản nhãn hiện tại trong phiên làm việc này. Các nhãn do Codex soạn từ YCCĐ đã xác minh PDF; việc chốt này không thay thế benchmark độc lập hoặc kiểm tra game thủ công.

SHA-256 của file constraints.jsonl hiện tại: `b44066d375f2f591800ded3c0fceaf89ef8c1a4992f9bac5e6e28396a19f189a`.

Dataset: `math-grade1-spike-v1`. Constraints version: `math-g1-constraints-v1`.

Mỗi nhãn cần đối chiếu với nguyên văn chunk và trang PDF. Xác nhận kỹ năng, giới hạn số, phương pháp nhẩm/tròn chục, điều kiện nhớ và đơn vị; không suy ra giới hạn từ môn/lớp khi YCCĐ không ghi rõ.

| Chunk | Capability được đề xuất |
|---|---|
| math-g1-001 | COUNT; max=100<br>READ_NUMBER; max=100<br>WRITE_NUMBER; max=100 |
| math-g1-002 | PLACE_VALUE |
| math-g1-003 | COMPARE; max=100 |
| math-g1-004 | ADD_MEANING<br>SUBTRACT_MEANING |
| math-g1-005 | ADD; max=100; NO_CARRY<br>SUBTRACT; max=100; NO_CARRY |
| math-g1-006 | ADD<br>SUBTRACT |
| math-g1-007 | ADD; max=10; mental<br>SUBTRACT; max=10; mental |
| math-g1-008 | ADD; mental; roundTens<br>SUBTRACT; mental; roundTens |
| math-g1-009 | ADD_MEANING<br>SUBTRACT_MEANING |
| math-g1-010 | WORD_PROBLEM |
| math-g1-011 | POSITION |
| math-g1-012 | SQUARE<br>CIRCLE<br>TRIANGLE<br>RECTANGLE |
| math-g1-013 | CUBE<br>CUBOID |
| math-g1-014 | ASSEMBLE |
| math-g1-015 | LENGTH_COMPARE |
| math-g1-016 | CM_READ; max=100; unit=cm |
| math-g1-017 | WEEK |
| math-g1-018 | TIME_HOUR |
| math-g1-019 | ESTIMATE |
| math-g1-020 | CM_MEASURE; unit=cm |
| math-g1-021 | TIME_HOUR |
| math-g1-022 | CALENDAR |
| math-g1-023 | CM_MEASURE<br>TIME_HOUR<br>CALENDAR |

YCCĐ gốc: [chunks.jsonl](../../backend/src/main/resources/curriculum/spike/math-grade1/chunks.jsonl). Nhãn đầy đủ: [constraints.jsonl](../../backend/src/main/resources/curriculum/spike/math-grade1/constraints.jsonl).

Khi duyệt: ghi tên người duyệt, thời điểm, SHA đã duyệt và quyết định cùng nhận xét ngay trong biên bản này. Chỉ sau quyết định APPROVED mới cấu hình `CURRICULUM_CONSTRAINTS_APPROVED_SHA256` bằng SHA đã duyệt. Việc chỉ biết hoặc copy checksum không phải là phê duyệt. Bất kỳ thay đổi byte nào cần checksum mới và duyệt lại.

Runtime mặc định không có SHA phê duyệt nên trả CURRICULUM_UNAVAILABLE trước khi gọi query embedding. Chưa có bộ benchmark độc lập được duyệt hoặc 20 game được kiểm tra thủ công; không coi triển khai mã là nghiệm thu phát hành.

## Quyết định phê duyệt

- Người phê duyệt: người dùng trong phiên làm việc này (không suy đoán danh tính/chức danh).
- Thời điểm ghi nhận (Asia/Saigon): 2026-10-30T23:08:13.0575096+07:00.
- Căn cứ: phản hồi trực tiếp “ok chốt” sau khi được bàn giao bản nhãn và các giới hạn còn lại.
- Quyết định: APPROVED — cho phép dùng bản nhãn hiện tại theo đúng checksum bên dưới.
- SHA-256 được duyệt: `b44066d375f2f591800ded3c0fceaf89ef8c1a4992f9bac5e6e28396a19f189a`.
- Phạm vi: bản nhãn hiện tại của math-grade1-spike-v1; không phê duyệt nội dung nhãn thay đổi trong tương lai hoặc nghiệm thu chất lượng game.
- Đã lưu SHA phê duyệt vào backend/.env local (file được Git ignore); không thay đổi feature flag RAG/generator.
