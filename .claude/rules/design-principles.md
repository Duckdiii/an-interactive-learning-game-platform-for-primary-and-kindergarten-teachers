---
paths:
  - "backend/**"
  - "frontend/src/**"
---

# Nguyên tắc thiết kế: OOP, SOLID, GRASP

Áp dụng cho cả code mới lẫn khi sửa code cũ. Khi có nguyên tắc mâu thuẫn với "Kiến trúc domain đã chốt", ưu tiên kiến trúc đã chốt và báo user.

**OOP**
- **Đóng gói**: field `private` (hoặc `protected` nếu class diagram ghi `#`), truy cập qua getter/setter hoặc method nghiệp vụ. Không mở public field.
- **Kế thừa** chỉ khi quan hệ là "is-a" thật (ví dụ `QuizQuestion` là một `QuestionGame`). Ưu tiên composition khi chỉ để tái sử dụng code.
- **Đa hình**: gọi qua kiểu cha/interface, không dùng chuỗi `if/switch` theo `gameType` để rẽ nhánh hành vi. Thêm game type mới phải là thêm class mới, không sửa nhiều chỗ.
- **Trừu tượng**: `abstract`/interface cho khái niệm chung; lớp bên ngoài chỉ phụ thuộc vào phần public là "hợp đồng".

**SOLID**
- **S** (Single Responsibility): mỗi class một lý do để thay đổi. Controller chỉ nhận request/trả response, logic nghiệp vụ ở `service`, truy cập dữ liệu ở `repository`. Entity không chứa logic gọi API ngoài hay validate JSON.
- **O** (Open/Closed): mở rộng bằng class mới (Strategy, Factory, Validator mới), không sửa code đã chạy ổn để thêm case.
- **L** (Liskov): class con thay được class cha mà không đổi ý nghĩa. Không override để ném `UnsupportedOperationException` (ngoại lệ duy nhất: khung `TODO` tạm thời đã ghi rõ trong `service/strategy`).
- **I** (Interface Segregation): interface nhỏ, đúng vai trò; không ép class cài method không dùng.
- **D** (Dependency Inversion): phụ thuộc vào abstraction, inject qua constructor (Spring DI). Không `new` service/repository trong code nghiệp vụ; API ngoài (Gemini, TTS, Moderation) đi qua interface để mock được khi test.

**GRASP**
- **Information Expert**: đặt hành vi ở class đang giữ dữ liệu cần thiết.
- **Creator**: class nào chứa/sở hữu đối tượng thì chịu trách nhiệm tạo nó (khớp với composition trong class diagram, và các Factory đã chốt).
- **Controller**: lớp REST controller/WebSocket handler chỉ điều phối, ủy quyền cho service.
- **Low Coupling / High Cohesion**: ít phụ thuộc chéo giữa package, mỗi class gắn với một mục đích rõ.
- **Polymorphism, Pure Fabrication, Indirection, Protected Variations**: dùng Strategy, Factory, Registry đã chốt để cô lập điểm thay đổi (loại game, nhà cung cấp AI).
- Không thêm tầng trừu tượng "phòng xa" khi chưa có nhu cầu thật; chỉ tách khi thấy lặp lại hoặc điểm thay đổi rõ ràng.
