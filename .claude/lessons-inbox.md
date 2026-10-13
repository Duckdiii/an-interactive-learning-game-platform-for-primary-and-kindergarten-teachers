# Hộp bài học (lessons inbox)

Nơi agent ghi **lỗi của chính mình** để người dùng duyệt. Agent chỉ được THÊM mục mới ở phần "Chờ duyệt"; việc chuyển sang `CLAUDE.md`, prompt của agent hay test là do người dùng quyết định (hoặc agent làm sau khi được duyệt).

Chỉ ghi lỗi có tín hiệu rõ: test/build fail do agent gây ra, người dùng sửa lại, subagent kiểm tra báo lệch. Không ghi lỗi nhỏ (typo, format), không ghi thứ đã nằm trong code hay git history. Một lỗi chưa lặp lại và hậu quả nhẹ thì cứ để ở đây; chỉ nâng thành quy tắc khi lặp từ hai lần hoặc hậu quả nặng.

Mẫu một mục:

```
### YYYY-MM-DD — <tên ngắn>
- Lỗi: <điều đã sai, cụ thể>
- Phát hiện nhờ: <test/agent/người dùng>
- Nguyên nhân gốc: <vì sao agent sai>
- Cách chặn: <quy tắc / kiểm tra máy móc / test cần có>
- Trạng thái: CHỜ DUYỆT | ĐÃ ÁP DỤNG (nơi áp dụng) | BỎ QUA (lý do)
```

## Chờ duyệt

### 2026-10-13 — Tạo nhánh git trái ý người dùng
- Lỗi: tự tạo nhánh con `duy/ui-teacher-phase1` để làm UI, dù người dùng chỉ dùng nhánh `everyone/UI`.
- Phát hiện nhờ: người dùng ngắt và yêu cầu xóa.
- Nguyên nhân gốc: làm theo "mỗi đợt một nhánh" trong kế hoạch của chính mình mà chưa hỏi lại về nhánh.
- Cách chặn: không `git checkout -b` khi chưa được cho phép; kế hoạch có bước tạo nhánh phải hỏi lại. Đã ghi memory cá nhân.
- Trạng thái: CHỜ DUYỆT

### 2026-10-13 — Heredoc qua công cụ Bash làm mất dấu `\` khi ghi file JS
- Lỗi: ghi file test bằng `node - <<'EOF'` chứa `\n`, `\(`, `\\`: dấu `\` bị mất, file lỗi cú pháp và regex sai. Thử "sửa" bằng cùng cách lần nữa vẫn hỏng.
- Phát hiện nhờ: `node --check` và `node --test` báo lỗi.
- Nguyên nhân gốc: giả định heredoc giữ nguyên ký tự `\`; không kiểm tra trước. Ngoài ra không có Python trên máy.
- Cách chặn: sửa file có `\` bằng công cụ Edit/Write, không ghi qua heredoc; luôn chạy `node --check` sau khi sinh file bằng script.
- Lặp lại: 2026-10-13 (đợt 3 UI) mình lại ghi regex có `\r?\n` bằng `node - <<'EOF'` và file hỏng đúng như vậy; `tsc` bắt được. Đây là lần thứ hai nên nên nâng thành quy tắc trong `CLAUDE.md`.
- Lặp lại lần 3 và 4: đợt cải thiện UI/UX lớn (2026-10-13) mình lại ghi regex và chuỗi có `\` bằng heredoc, `node -e "..."` ở 4 chỗ; mỗi lần phải sửa lại bằng công cụ Edit. Bằng chứng đủ để nâng thành quy tắc trong `CLAUDE.md`: "không ghi file chứa dấu gạch chéo ngược bằng heredoc/`node -e`, dùng Write/Edit".
- Trạng thái: CHỜ DUYỆT

### 2026-10-13 — Chỉ kiểm tràn ngang ở điện thoại, bỏ sót máy tính
- Lỗi: khung ứng dụng dùng `w-full` cùng `lg:ml-72` nên ở màn hình máy tính nội dung rộng hơn khung (cuộn ngang, cột phải bị cắt). Mình chỉ đo tràn ngang ở 390px nên không thấy; lỗi lộ ra khi ảnh chụp ở 1280px rộng hơn khung nhìn.
- Phát hiện nhờ: xem ảnh chụp thật (thanh cuộn ngang và cột "Tóm tắt yêu cầu" bị cắt chữ).
- Nguyên nhân gốc: kiểm thử UI theo một kích thước; tin rằng bố cục "đúng" vì nhìn một ảnh.
- Cách chặn: mọi lần kiểm UI đo `scrollWidth - clientWidth` ở ít nhất 360, 768, 1024, 1280, 1920; cột phụ chỉ hiện từ độ rộng đủ chỗ (đã làm: cột tóm tắt từ 1280px).
- Trạng thái: CHỜ DUYỆT

### 2026-10-13 — Test sao chép bị clipboard giả của user-event ghi đè
- Lỗi: gán `navigator.clipboard` trước `userEvent.setup()` thì `setup()` thay bằng clipboard giả của nó, mock `writeText` không bao giờ được gọi.
- Phát hiện nhờ: test `GameCard` báo `writeText` chưa được gọi.
- Cách chặn: đặt mock clipboard SAU `userEvent.setup()` (ghi chú ngay tại test).
- Trạng thái: ĐÃ ÁP DỤNG (trong `GameCard.test.tsx`, `MyGamesPage.test.tsx`); chờ duyệt có đưa vào hướng dẫn test không.

### 2026-10-13 — Dữ liệu dùng chung không gắn danh tính người dùng, và hiệu ứng của layout đè lên tiêu điểm của trang con
- Lỗi: (1) khóa react-query `['games']` không có giáo viên, máy dùng chung ở trường sẽ cho cô đăng nhập sau thấy danh sách (kèm mã chơi) của cô trước; (2) effect của `AppLayout` luôn đưa tiêu điểm về `<main>`, đè lên ô khối lớp mà trang tạo game vừa tự focus (effect của con chạy trước effect của cha).
- Phát hiện nhờ: agent `reviewer`, không phải do mình tự rà; test cũ không bao phủ hai trường hợp này.
- Nguyên nhân gốc: chỉ kiểm luồng một người dùng một trang; viết hiệu ứng toàn cục mà không nghĩ tới thứ tự effect cha/con.
- Cách chặn: khóa cache mọi dữ liệu theo người dùng phải có định danh người dùng (đã có test hai giáo viên dùng chung cache); hiệu ứng ở layout phải kiểm tra tiêu điểm hiện tại trước khi đặt lại (đã có test đi qua `<App />`).
- Trạng thái: CHỜ DUYỆT

## Đã xử lý

### 2026-10-11 — Agent kiểm tra diff bỏ sót thay đổi chưa commit
- Lỗi: `contract-guardian` chỉ so `main...HEAD`, nên không thấy sửa đổi chưa commit; cùng mẫu còn ở `migration-checker` (kiểm migration cũ bị sửa) và `doc-syncer`.
- Phát hiện nhờ: agent tự rà lại khi kiểm thử fault injection.
- Nguyên nhân gốc: viết lệnh lấy diff theo trường hợp "đã commit" mà quên trường hợp đang làm dở.
- Cách chặn: mọi agent lấy diff phải gồm `git diff main...HEAD` + `git diff` + `git diff --cached`.
- Trạng thái: ĐÃ ÁP DỤNG (contract-guardian, migration-checker, doc-syncer; quy tắc trong CLAUDE.md).

### 2026-10-11 — Tiêu chí của `log-auditor` viết theo giả định, gây báo nhầm
- Lỗi: prompt ép định dạng "Claude" cho cột công cụ AI, coi tên/Codex của đồng đội là lỗi, đếm tổng sai, sót STT có SHA `TODO`.
- Phát hiện nhờ: chạy thử trên `ai-usage-log.md` thật, kết quả có nhiều báo nhầm.
- Nguyên nhân gốc: viết tiêu chí từ suy đoán, không đọc dữ liệu thật trước.
- Cách chặn: viết tiêu chí kiểm tra từ nội dung file thật, và chạy thử trên dữ liệu thật trước khi coi agent là xong.
- Trạng thái: ĐÃ ÁP DỤNG (prompt `log-auditor` đã sửa; quy tắc trong CLAUDE.md). Chưa chạy lại log-auditor sau khi sửa.

### 2026-10-11 — Giả định có `gh` CLI
- Lỗi: thiết kế `pr-triage` dùng `gh`, nhưng máy không cài `gh`.
- Phát hiện nhờ: lệnh chạy thất bại khi thử.
- Nguyên nhân gốc: giả định môi trường thay vì kiểm tra.
- Cách chặn: dùng công cụ `mcp__github__*`; kiểm tra công cụ có sẵn trước khi đưa vào prompt agent.
- Trạng thái: ĐÃ ÁP DỤNG (`pr-triage`; ghi chú trong CLAUDE.md).

### 2026-10-11 — Gọi agent theo tên ngay trong phiên vừa tạo
- Lỗi: gọi `log-auditor` ngay sau khi tạo file, báo "Agent type not found".
- Phát hiện nhờ: lỗi từ công cụ Agent.
- Nguyên nhân gốc: agent chỉ được nạp lúc bắt đầu phiên.
- Cách chặn: trong phiên vừa tạo agent, thử bằng `general-purpose` kèm thân file agent; chỉ kết luận "gọi được theo tên" ở phiên mới.
- Trạng thái: ĐÃ ÁP DỤNG (ghi chú trong CLAUDE.md).
