# Hoàn thiện UC-04 Workspace Editor

Giáo viên cần chỉnh sửa bản nháp, bổ sung học liệu và xem lại đúng phiên bản đã lưu. Khi một lớp hoặc học sinh đang chơi, nội dung phải ổn định cho đến khi phiên kết thúc. Hiện Workspace dùng API thật để tự lưu. Tại mốc `11407c6`, PUT chưa khóa theo phiên, chưa ghi EditLog, upload đang ở trạng thái planned và làm lại câu game ảnh trả 400.

| Yêu cầu | Hành vi và nghiệm thu | Thành phần và kiểm thử |
| --- | --- | --- |
| BR-01 | Khi phiên đang chờ, chơi hoặc tạm dừng, lưu trả 409, bản đã lưu và bản đang soạn được giữ nguyên. Nếu phiên kết thúc hoặc tự luyện đã hết hạn, nội dung hợp lệ lưu được. Khi mở phiên và lưu đồng thời, hai giao dịch phải thấy kết quả theo thứ tự khóa. | GameService, GameRepository, GameSessionRepository, SessionService và StudentPlayService. WorkspaceEditPersistenceTest kiểm thử hai giao dịch PostgreSQL, ba trạng thái và phiên hết hạn. |
| BR-02 | Với lần lưu có thay đổi, lưu nội dung và một EditLog trong cùng giao dịch. Nhật ký chứa tài khoản, thời điểm và đường dẫn trường thay đổi. Bản không đổi hoặc bị từ chối không sinh lịch sử. Kết quả cũ phải giữ tham chiếu đến câu mà học sinh đã chơi. | Game, QuestionGame, EditLog và migration V28. GameServiceTest kiểm tra đường dẫn và trường hợp bị chặn. WorkspaceEditPersistenceTest kiểm tra dữ liệu sau khi mở lại và tham chiếu của kết quả đã lưu. |
| BR-03 | Giáo viên tải PNG, JPG, WebP tối đa 5 MB hoặc MP3 tối đa 10 MB, dùng URL để xem trước và mở lại game. Ưu tiên an toàn khi định dạng sai, kiểm duyệt từ chối hoặc nhà cung cấp lỗi. | MediaController, MediaUploadService, storage và UI tải tệp hiện có. Test upload kiểm chứng định dạng, kiểm duyệt, lỗi và tải lại tệp đã lưu. |
| BR-04 | AI làm lại đúng một câu, giữ chế độ chơi, tài nguyên ảnh phù hợp và ID câu. Giáo viên còn toàn quyền xem lại bản nháp. Lần gọi hết thời gian hoặc lỗi dịch vụ dùng giới hạn thử lại cùng luồng kiểm tra đầu ra. Nếu vẫn lỗi, giữ nội dung hiện tại. | DslGameContentHandler, GameGenerationService, cấu hình Gemini, luồng làm lại câu của editor. Test kiểm chứng cấu hình ảnh, số lần thử, lỗi kiểm duyệt và bảo toàn các câu khác. |

## Lựa chọn triển khai

- BR-01 dùng khóa hàng của game ở cả thao tác lưu và mở phiên. Chỉ kiểm tra trạng thái trước khi lưu tạo khoảng trống giữa kiểm tra và ghi. Dùng khóa lưu và mở phiên cũng bảo vệ hai yêu cầu đến các tiến trình ứng dụng khác nhau.
- BR-02 so sánh nội dung đã chuẩn hóa từ backend để bỏ qua thay đổi chỉ do biểu diễn request. Log giữ đường dẫn, tài khoản và thời điểm. Bản câu hỏi đã xuất bản được giữ khi bị thay để tham chiếu của lịch sử chơi còn hợp lệ.
- BR-03 dùng dịch vụ storage của dự án và kiểm duyệt trước khi công bố URL. Tệp ảnh được kiểm tra nội dung thực tế. Âm thanh được kiểm tra qua phiên âm và kiểm duyệt phần lời nhận dạng được. Production cần cấu hình volume bền vững, URL HTTPS và khóa nhà cung cấp kiểm duyệt.
- BR-04 dùng pipeline sinh và kiểm duyệt hiện có, thêm ngữ cảnh ảnh của câu và kiểm tra nguyên vẹn chế độ. Giữ thao tác làm lại ở bản đang soạn và dùng tự lưu hiện có. Visual Cloze IMAGE giữ audioText và cho nghe thử bằng giọng của trình duyệt vì DSL của chế độ này chưa có audioUrl.

Phạm vi bắt buộc gồm bốn yêu cầu và tài liệu phản ánh tự lưu. Xuất bản game CUSTOM, sửa tất cả câu bằng trò chuyện ở chế độ ảnh và giao diện đọc lịch sử thuộc ca sử dụng khác. Phiên âm tiếng Việt với âm thanh thực và nhà cung cấp AI thật là phép thử môi trường triển khai, cần cấu hình riêng. Thời gian xử lý và chi phí chưa đo.

## Kiểm chứng

Chạy `mvnw.cmd test` trong backend để kiểm tra cả unit và tích hợp. Kiểm thử PostgreSQL cần Docker và chạy Flyway trên pgvector:pg17. Chạy Vitest liên quan trong frontend, sau đó chạy `npm run e2e` với cấu hình AI thử nghiệm. Kỳ vọng luồng giáo viên mở, sửa, tự lưu và tải lại đúng nội dung. Mỗi kết quả kiểm thử được ghi trong nhật ký AI sau khi chạy.
