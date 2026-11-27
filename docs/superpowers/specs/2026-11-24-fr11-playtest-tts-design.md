# FR-11: TTS cho Chơi thử — đề xuất thiết kế

**Trạng thái:** Bản đề xuất, chờ giáo viên duyệt trước khi triển khai. Chưa có thay đổi sản phẩm hoặc kiểm thử nghiệm thu trong tài liệu này.

## 1. Người dùng và mục tiêu

Giáo viên soạn game cần nghe câu hỏi và phản hồi đúng/sai trong màn **Chơi thử** để kiểm tra lời đọc trước khi dùng game với học sinh. Hiện phần tạo lời đọc có thể trả URL nghe thử riêng, nhưng URL đó không được chuyển sang PlayTest; kết quả trong PlayTest chỉ hiển thị bằng chữ.

Mục tiêu là để giáo viên nghe lời đọc đã lưu cho từng câu hỏi và nghe phản hồi ngắn khi trả lời, đồng thời tiếp tục chơi được nếu TTS, mạng hoặc thiết bị phát âm thanh gặp lỗi. Kết quả PlayTest tiếp tục chỉ là dữ liệu tạm trên màn hình.

## 2. Hiện trạng có bằng chứng

### Đã kiểm chứng trong mã/tài liệu

- [GameNarrationService.java](../../../backend/src/main/java/com/aigameplatform/backend/service/narration/GameNarrationService.java) hiện gọi trực tiếp `ViettelTtsClient`, tính fingerprint cố định theo Viettel/voice và lưu MP3 câu hỏi vào Supabase Storage.
- [ViettelTtsClient.java](../../../backend/src/main/java/com/aigameplatform/backend/service/narration/ViettelTtsClient.java) giới hạn câu đọc 300 code point; [Mp3AudioValidator.java](../../../backend/src/main/java/com/aigameplatform/backend/service/narration/Mp3AudioValidator.java) giới hạn mỗi file 256 KiB và 30 giây. Game hiện giới hạn 20 file/5 MiB trong GameNarrationService.
- [NarrationPreviewControl.tsx](../../../frontend/src/components/editor/NarrationPreviewControl.tsx) giữ `audioUrl` trong state cục bộ và chỉ hiện thẻ nghe tại mục sửa câu hỏi.
- [WorkspaceEditor.tsx](../../../frontend/src/pages/WorkspaceEditor.tsx) mở [PlayTestPanel.tsx](../../../frontend/src/components/editor/PlayTestPanel.tsx) với bản nháp game, nhưng không truyền URL narration. PlayTest tự kiểm tra câu trả lời/hiển thị kết quả; không có luồng phát audio phản hồi.
- [Subject.java](../../../backend/src/main/java/com/aigameplatform/backend/entity/enums/Subject.java) và [game-dsl.types.ts](../../../frontend/src/types/game-dsl.types.ts) định nghĩa môn `MATH`, `VIETNAMESE`, `ENGLISH`.
- [UC-11.md](../../srs/UC-11.md) quy định nội dung vẫn dùng được nếu không phát được tiếng và cho phép thử phát lại.
- [V23__game_narration_assets.sql](../../../backend/src/main/resources/db/migration/V23__game_narration_assets.sql) lưu asset narration gắn với câu hỏi của từng game; chưa có cache dùng chung cho câu phản hồi.
- `backend/.env.example` có tên biến `ELEVENLABS_API_KEY`; giá trị thật nằm trong `backend/.env` của máy người dùng và không được đọc/in/commit.

### Do người dùng yêu cầu

- Khi chơi thử cần nghe lời đọc TTS của câu hỏi và biết qua tiếng đọc câu trả lời đúng hay sai.
- TTS tiếng Việt dùng Viettel; cần nhà cung cấp khác cho game tiếng Anh. Người dùng đã tạo và khai báo ElevenLabs API key trong `.env`.
- ElevenLabs nhận `audioText` đã lưu khi giáo viên chủ động tạo lời đọc; API key chỉ ở backend, không hiển thị hoặc log.
- Supabase thật cần được dùng, không mock cho nghiệm thu tích hợp.
- Không sửa luật của bất kỳ loại game nào trong 10 loại hiện có.

### Giả định/đề xuất cần duyệt

- `ENGLISH` được coi là ngôn ngữ đọc tiếng Anh và dùng ElevenLabs; `MATH`/`VIETNAMESE` đọc tiếng Việt bằng Viettel. Mã hiện không có trường ngôn ngữ riêng; game Toán có lời đọc tiếng Anh vẫn sẽ dùng Viettel theo giả định này.
- Dùng ElevenLabs `eleven_flash_v2_5` và một voice ID cấu hình ở backend. Đề xuất mặc định theo voice demo `JBFqnCBsd6RMkjVDRZzb`; có thể thay bằng `ELEVENLABS_VOICE_ID`. Voice/model không được cấu hình ở frontend.
- Câu phản hồi ngắn dùng cùng nội dung với trạng thái nhìn thấy: tiếng Việt `Đúng rồi!` / `Chưa đúng.`; tiếng Anh `Correct!` / `Not quite.`. Không đọc toàn bộ đoạn hướng dẫn dài khi sai.
- Audio phản hồi đúng/sai được cache dùng chung trong bucket Supabase hiện có, phân biệt ngôn ngữ, nhà cung cấp, voice, model và phiên bản câu nói. Audio cache không tính vào hạn mức file của từng game.

ElevenLabs API hiện dùng `POST /v1/text-to-speech/{voice_id}`, header `xi-api-key` và model được chỉ định rõ; tài liệu hiện liệt kê `eleven_flash_v2_5` hỗ trợ tiếng Anh và tiếng Việt. Nguồn: [Create speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert/), [Models](https://elevenlabs.io/docs/overview/models/).

## 3. Yêu cầu nghiệp vụ

### BR-01 — Tạo lời đọc theo môn

- **Kích hoạt:** Giáo viên bấm “Tạo giọng đọc” cho câu đã lưu và không dùng audio nguồn.
- **Hành vi:** Backend lấy `audioText` đã lưu; `ENGLISH` dùng ElevenLabs, `MATH`/`VIETNAMESE` dùng Viettel. API key chỉ ở backend. Fingerprint asset phải phân biệt nhà cung cấp, voice, model và văn bản để không trả lại MP3 cũ từ cấu hình khác.
- **Hành vi UI:** Nhãn mục tạo giọng đọc phải nói rõ ngôn ngữ/provider tương ứng, không luôn ghi “tiếng Việt”.
- **Thành công:** MP3 hợp lệ được lưu vào Supabase, câu hỏi nhận signed URL tạm thời và có thể phát.
- **Ngoại lệ:** Thiếu key, giới hạn provider, phản hồi không phải MP3, file quá 256 KiB/30 giây, hoặc lỗi Storage trả thông báo rõ; giữ nguyên game/audio cũ và không đưa secret vào response/log.
- **Vòng đời asset cũ:** Khi lời đọc đã sửa, PlayTest không dùng asset có fingerprint khác. Giữ asset cũ nếu lần tạo mới thất bại; chỉ thay và dọn asset cũ sau khi bản mới lưu thành công, theo cơ chế hiện có.

### BR-02 — Chơi thử đọc câu hỏi đã tạo

- **Kích hoạt:** Giáo viên mở PlayTest sau khi đã tạo lời đọc cho câu được lưu.
- **Hành vi:** PlayTest dùng đúng URL ứng với `questionId` và đúng snapshot `audioText`; tự phát khi vào câu, hỗ trợ phát lại. Bản nháp chưa lưu hoặc khác văn bản đã tạo không được lấy audio cũ.
- **Thành công:** Có thể nghe câu hỏi hiện tại; đổi câu/thoát không để audio cũ tiếp tục chồng lên câu mới.
- **Ngoại lệ:** Chưa tạo audio, signed URL hết hạn, mạng lỗi hoặc autoplay bị chặn: game vẫn chơi được, hiển thị nút/thông báo nghe lại phù hợp.

### BR-03 — Đọc phản hồi đúng/sai

- **Kích hoạt:** Giáo viên gửi đáp án trong PlayTest.
- **Hành vi:** Sau khi kết quả hiện ra, tự phát một câu phản hồi ngắn đúng ngôn ngữ: VI `Đúng rồi!`/`Chưa đúng.`; EN `Correct!`/`Not quite.`. Giáo viên có thể nghe lại; audio mới dừng audio đang phát để không chồng tiếng.
- **Thành công:** Tiếng nói phản ánh đúng `isCorrect` mà renderer gửi, nhưng không tự tính lại đáp án, không đổi điểm, retry, chuyển câu hay điều kiện hoàn tất.
- **Ngoại lệ:** Không có audio phản hồi hoặc phát lỗi thì thông báo lỗi âm thanh; trạng thái đúng/sai và nút chơi tiếp vẫn dùng được.

### BR-04 — Cache phản hồi và giới hạn chi phí/lưu trữ

- **Kích hoạt:** PlayTest cần tiếng phản hồi theo ngôn ngữ.
- **Hành vi:** Backend tạo tối đa hai asset dùng chung cho mỗi tổ hợp ngôn ngữ/provider/voice/model/phiên bản, lưu trong Supabase private bucket và trả signed URL tối đa 600 giây. Không gọi provider lại khi cache hợp lệ.
- **Thành công:** Cùng tổ hợp lấy lại URL/cache; thay voice/model/câu nói tạo cache key mới. Cache chung không tăng số file hoặc 5 MiB giới hạn của game.
- **Ngoại lệ:** Nếu DB/Storage/provider lỗi, trả lỗi TTS riêng và giữ PlayTest chạy với text.

### BR-05 — Giữ PlayTest cục bộ và bảo toàn luật

- **Kích hoạt:** Giáo viên vào, trả lời, retry, chuyển câu hoặc chơi lại trong PlayTest.
- **Hành vi:** Chỉ gọi API để lấy audio TTS; không tạo session, lưu đáp án/điểm, publish game hoặc sửa payload game. Hành vi tương tác, đúng/sai, điểm và hoàn tất của 10 renderer không thay đổi.
- **Thành công:** Kết thúc PlayTest vẫn theo logic hiện có và có chú thích kết quả mô phỏng.
- **Ngoại lệ:** TTS không khả dụng không được ngăn thao tác chơi hay khiến thông báo đúng/sai bị ghi đè.

## 4. Tiêu chí nghiệm thu

| Given | When | Then |
|---|---|---|
| Câu ENGLISH đã lưu có `audioText`, ElevenLabs key/voice cấu hình | Giáo viên bấm tạo giọng đọc | Backend gọi ElevenLabs bằng secret phía server, lưu MP3 hợp lệ lên Supabase và trả signed URL; nhãn UI là giọng tiếng Anh; không có key trong browser/log |
| Câu MATH/VIETNAMESE đã lưu | Giáo viên bấm tạo giọng đọc | Dùng Viettel như hiện tại; file, giới hạn và signed URL vẫn hợp lệ |
| Đã tạo audio, snapshot câu hỏi không đổi | Giáo viên mở Chơi thử | Câu hỏi tự đọc một lần; có thể nghe lại; không tạo session/result backend |
| `audioText` chưa lưu, bị sửa sau khi tạo, hoặc source audio đang được dùng | Mở Chơi thử | Không phát narration cũ/không phù hợp; vẫn chơi bằng UI hiện tại và báo cách tạo/cập nhật lời đọc |
| Game VI/MATH trả lời đúng hoặc sai | Renderer gọi `onResult` | Text hiện tại được giữ nguyên và audio `Đúng rồi!`/`Chưa đúng.` phát đúng trạng thái |
| Game ENGLISH trả lời đúng hoặc sai | Renderer gọi `onResult` | Audio `Correct!`/`Not quite.` phát đúng trạng thái |
| Cache phản hồi đã có | Mở PlayTest tiếp theo cùng cấu hình | Không gọi TTS provider lần nữa; trả signed URL mới hoặc URL còn hạn |
| Provider, Storage, signed URL hoặc thiết bị phát lỗi | Giáo viên tiếp tục chơi | Thấy trạng thái lỗi có thể hiểu; text và thao tác tiếp/retry/play again vẫn hoạt động |
| API key thiếu hoặc file TTS sai định dạng/quá giới hạn | Bấm tạo audio | Nhận lỗi có thể khắc phục; không trả nội dung secret; asset cũ còn nguyên |
| Bất kỳ loại trong 10 game được hỗ trợ | Chơi, sai/đúng, retry, chuyển câu, kết thúc | Kết quả/điểm/điều kiện hoàn tất giống trước thay đổi |

Kiểm thử local gồm unit/API/UI tests với provider/storage giả để kiểm tra nhánh lỗi. Nghiệm thu live riêng phải dùng ElevenLabs thật và Supabase thật, upload/download MP3 qua signed URL rồi dọn object test; không gọi mock. Test live có thể tiêu hao credit ElevenLabs và phải được gắn cờ opt-in.

## 5. Phạm vi và ưu tiên

### Bắt buộc đợt này

1. Routing Viettel/ElevenLabs cho narration câu hỏi, cấu hình backend và giữ giới hạn audio hiện có.
2. Cache audio phản hồi đúng/sai dùng chung trên Supabase, API có xác thực giáo viên.
3. Truyền URL và snapshot lời đọc sang PlayTest; tự phát câu hỏi/phản hồi, nút phát lại, trạng thái lỗi có thể truy cập.
4. Hồi quy các renderer đang hỗ trợ PlayTest và kiểm thử live ElevenLabs + Supabase.
5. Migration Flyway cho metadata cache và ví dụ cấu hình `.env`; không đưa giá trị thật vào Git.

### Để sau

- Cho học sinh chọn bật/tắt giọng đọc, thay đổi voice/speed từ UI.
- TTS cho game trình chiếu, phòng chơi nhiều người hoặc game ngoài PlayTest.
- Làm lại/gộp/xóa asset cũ của từng game. Cơ chế hiện có tiếp tục giữ file cũ an toàn; việc dọn dữ liệu tồn đọng xem xét riêng.
- Tự nhận diện ngôn ngữ của `audioText`; hiện dùng `subject` làm lựa chọn ngôn ngữ.

### Không làm

- Sửa luật tương tác, kiểm tra đúng/sai, tính điểm, retry hoặc hoàn tất của 10 loại game.
- Dùng Web Speech API/SpeechSynthesis thay cho dịch vụ TTS đã chọn.
- Lưu kết quả PlayTest hoặc gửi topic/prompt/output vào log/cache ngoài các trường game hiện có.

## 6. Phương án và đánh đổi

| Phương án | Ưu điểm | Đánh đổi |
|---|---|---|
| Dùng Viettel cho mọi môn | Ít code, giữ một nhà cung cấp | Không đáp ứng lời đọc tiếng Anh tự nhiên/được hỗ trợ |
| ElevenLabs cho mọi môn | Một API và một luồng cấu hình | Đổi provider tiếng Việt đang hoạt động, tăng rủi ro và chi phí |
| **Đề xuất: Viettel cho VI/MATH, ElevenLabs cho ENGLISH** | Giữ provider hiện tại; chỉ dùng quota ElevenLabs khi cần tiếng Anh | Cần cấu hình thêm key/voice, kiểm thử hai nhà cung cấp |

Phản hồi đúng/sai có thể được tạo mỗi lượt hoặc cache. Đề xuất cache dùng chung trong Supabase giúp không tính lại hai câu cố định mỗi lượt; cần một migration nhỏ và khóa cache theo provider/voice/model để tránh tái dùng audio sai cấu hình.

## 7. Truy vết

| Nghiệp vụ | Thành phần dự kiến | Task | Bằng chứng |
|---|---|---|---|
| BR-01 | `GameNarrationService`, `ElevenLabsTtsClient`, config | Task 1 | Unit test routing/MP3/errors; live synthesis |
| BR-04 | Shared feedback asset entity/repository, V31, service/API | Task 2 | Cache hit/miss/failure tests; Supabase upload/signed-download |
| BR-02, BR-03, BR-05 | `NarrationPreviewControl`, `WorkspaceEditor`, `PlayTestPanel`, `gamesApi` | Task 3 | Component test cho stale URL, auto/replay, feedback, lỗi, no session API |
| Tất cả | frontend/backend regression + live test | Task 4 | Lệnh test, log tổng hợp không chứa secret, asset test đã xóa |

## 8. Điều kiện hoàn tất và giới hạn

- Local: backend test liên quan narration/migration và frontend test PlayTest/editor/build đều đạt; test xác nhận không thay đổi luật ở renderer đã hỗ trợ.
- Live: với `ELEVENLABS_API_KEY` thật và Supabase thật, tạo audio EN, lưu signed asset, tải bytes MP3 thành công; tái sử dụng cache phản hồi không tạo thêm bản synthesis; xóa object test.
- Bằng chứng: kết quả lệnh test và báo cáo smoke test chỉ ghi status, provider, kích thước/thời lượng và object test; không ghi key hay lời đọc riêng của giáo viên.
- Kiểm tra schema: backend/Flyway áp dụng V31 thành công trước test live cache.
- Giới hạn: chất lượng giọng, latency và mức tiêu thụ credit phụ thuộc tài khoản/voice/provider; chưa đo và không cam kết SLA. Autoplay có thể bị browser chặn; UI phải cho phép nghe lại thủ công.
