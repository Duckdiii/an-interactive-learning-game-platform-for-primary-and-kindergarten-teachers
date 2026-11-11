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

### 2026-11-11 — Thay chuỗi bằng script Node trên file CRLF, không kiểm kết quả nên mất một chỗ sửa
- Lỗi: dùng `node -e` với `s.replace("...\n...")` để sửa `QuizRenderer.tsx` và `quizLayout.ts`. Hai file dùng CRLF nên chuỗi có `\n` không khớp, `replace` lặng lẽ không làm gì; script không in MISS. Kết quả `computeQuizLayout` không nhận `optionLayout`, canvas tính chiều cao theo lưới cũ trong khi ô đã lệch xuống. Test bố cục vẫn xanh vì test tự truyền `optionLayout`.
- Phát hiện nhờ: `reviewer` (đọc chỗ gọi thật trong renderer); `tsc` chỉ bắt được một nửa (biến không dùng ở `quizLayout.ts`).
- Nguyên nhân gốc: tin script đã chạy mà không kiểm từng chỗ thay; repo trộn LF và CRLF.
- Cách chặn: sửa nhiều dòng thì dùng công cụ Edit (báo lỗi khi không khớp); nếu dùng script thì chuẩn hóa CRLF trước và in MISS cho mọi chỗ không khớp, rồi grep lại kết quả. Test bố cục phải có ít nhất một ca đi qua component thật hoặc assert chỗ gọi.
- Trạng thái: CHỜ DUYỆT

### 2026-11-11 — Thêm phụ thuộc constructor mà quên context Spring liệt kê bean tay; viết luật prompt trái thứ tự Structured Outputs
- Lỗi: thêm `GameAssetCatalog` vào constructor của 10 factory và `GeminiGameContentGenerator`, chỉ sửa chỗ `new` trong test, quên `GameCreationPipelineTest` (`@SpringJUnitConfig` liệt kê class) và `CurriculumRagConfigurationTest` (`context.register(...)`): 12 test đỏ. Cùng lượt, thêm luật "đặt title sau cùng" trong prompt dù schema đặt `title` đầu `properties` và Structured Outputs sinh theo thứ tự đó.
- Phát hiện nhờ: `test-verifier`, `ai-prompt-evaluator`.
- Nguyên nhân gốc: chỉ grep `new XFactory(` mà không grep tên class trong cấu hình Spring của test; viết luật cho mô hình mà không đối chiếu với cách giải mã có ràng buộc schema.
- Cách chặn: thêm tham số constructor cho `@Component` thì grep cả `XFactory.class` trong `src/test`; luật về thứ tự sinh phải khớp thứ tự `properties` của schema đầu ra (hoặc không viết).
- Trạng thái: CHỜ DUYỆT

### 2026-11-11 — Nối `git rm` sau lệnh `python` bằng `&&`, máy không có Python nên file bị xóa ngoài ý muốn
- Lỗi: chạy `python - <<EOF ... EOF && git rm ThemedQuizCanvas.tsx` để sửa `LivePreview.tsx` rồi mới xóa file. Python trên máy này chỉ là lối tắt mở Microsoft Store, in "Python was not found" nhưng trả mã 0, nên `git rm` vẫn chạy và đưa việc xóa vào index trong khi `LivePreview.tsx` chưa được sửa. Một luật mới thêm vào prompt cũng mâu thuẫn với dòng ngay trên ("Chỉ dùng từ tiếng Việt có thật" so với cho phép từ tiếng Anh).
- Phát hiện nhờ: lần `git rm` sau báo không thấy file, `git status` hiện `D ` trong index; luật mâu thuẫn do `reviewer` và `ai-prompt-evaluator` báo.
- Nguyên nhân gốc: giả định có Python và tin `&&` sẽ chặn lệnh sau; thêm luật mới mà không đọc lại cả khối luật xung quanh.
- Cách chặn: máy này không có Python, sửa file bằng Edit hoặc sed; không nối lệnh xóa/ghi git sau một lệnh chưa chắc chạy được, chạy riêng sau khi kiểm kết quả. Thêm luật vào prompt thì đọc lại toàn khối và có test `doesNotContain` câu mâu thuẫn.
- Trạng thái: CHỜ DUYỆT

### 2026-11-09 — Thêm `description` vào schema đầu ra AI, không chạy test kiểm từ khóa của schema
- Lỗi: khi thêm trường `title` vào 10 schema `game-ai-output`, có kèm `"description"`; `AiOutputSchemasTest.llmSchemaUsesOnlyKeywordsAnLlmAccepts` chỉ cho từ khóa LLM chấp nhận nên 10 test đỏ. Bộ test con mình chọn chạy không có `AiOutputSchemasTest`. Cùng lượt, các luật Lớp 2 mới bản đầu chặn nhầm bài hợp lệ ("A" ↔ "a", điền khuyết đáp án 1 chữ cái, Đúng/Sai cùng đáp án, "lớn hơn hoặc bằng 10").
- Phát hiện nhờ: `test-verifier` (chạy toàn bộ), `ai-prompt-evaluator`, `reviewer`.
- Nguyên nhân gốc: chọn test theo tên lớp mình nhớ thay vì theo thư mục/gói bị đổi; viết luật chặn từ một ca lỗi mà không liệt kê ca hợp lệ gần giống.
- Cách chặn: sửa file trong `schema/` thì chạy cả gói `service/validation/ai`; mỗi luật Lớp 2 mới phải có ít nhất một test ca hợp lệ gần giống không bị chặn (có thể thành mục kiểm của `reviewer`).
- Trạng thái: CHỜ DUYỆT

### 2026-11-07 — Test schema "chặn biến thể sai" xanh vì lý do khác lý do muốn kiểm
- Lỗi: trong `CpfGameSchemaTest`, các biến thể sai chỉ assert `isNotEmpty()`; ba biến thể bị chặn nhờ ràng buộc khác (thêm 1 zone vấp `minItems: 2` thay vì luật "không có zones ở màn PICK"; CHECK lồng thiếu `onWrong` nên vấp `required`). Xóa đúng ràng buộc cần bảo vệ thì test vẫn xanh. Lặp lại mẫu lỗi của mục 2026-10-14 "Test hồi quy qua cả khi chưa có bản sửa".
- Phát hiện nhờ: `reviewer` (2 lượt), `backend-architect-reviewer`.
- Nguyên nhân gốc: viết biến thể sai mà không kiểm biến thể đó chỉ sai đúng một chỗ.
- Cách chặn: mỗi test biến thể sai phải assert vị trí lỗi (`getInstanceLocation`) hoặc từ khóa, và biến thể phải hợp lệ ở mọi chỗ khác (đủ số phần tử tối thiểu, đủ trường bắt buộc). Có thể đưa thành mục kiểm của `reviewer` cho mọi test schema.
- Trạng thái: CHỜ DUYỆT

### 2026-11-07 — Thiết kế luật kết thúc game không xét trường hợp trẻ trả lời sai
- Lỗi: bản nháp CPF v2 đầu tiên có `finish: PROGRESS_REACHED_GOAL` (đích = số màn) trong khi màn PICK_ONE kết thúc sau một lần chọn; trẻ sai một màn thì xe không bao giờ tới đích, game treo. Màn PICK_ALL dạng hứng quả cũng không nói vật rơi mất có sinh lại không.
- Phát hiện nhờ: `reviewer`.
- Nguyên nhân gốc: chỉ kiểm ví dụ theo đường chơi đúng, không lần theo đường trẻ chọn sai.
- Cách chặn: khi thiết kế luật chơi/runtime, liệt kê cả đường sai cho từng loại màn và chứng minh game luôn đi tới cuối; ở Pha 1 có test runtime giả lập trẻ chọn sai mọi lần.
- Trạng thái: CHỜ DUYỆT

### 2026-11-07 — Decoder phẳng cho hành động CPF làm Gemini sai cả 3 lần thử
- Lỗi: schema decoder `cpf-game.ai-decoder.schema.json` gộp mọi loại hành động thành một object phẳng (bỏ `oneOf`). Chạy thật, Gemini điền `add` cho EFFECT/SOUND và bỏ `at` của EFFECT ở mọi lần thử; vòng tự sửa không sửa được, có lần còn sinh 98 luật. Test offline không phát hiện vì chỉ dùng ví dụ viết tay đúng hình dạng.
- Phát hiện nhờ: chạy thật trên trình duyệt với Gemini (log lỗi chi tiết).
- Nguyên nhân gốc: thiết kế decoder chỉ kiểm "schema chặt vẫn bắt lỗi", không lường hình dạng đầu ra thực tế của decoder phẳng; log retry chỉ ghi số lỗi nên khó chẩn đoán.
- Cách chặn: khi nới schema cho decoder, liệt kê trường nào decoder sẽ cho phép mà schema chặt cấm và chuẩn hóa sẵn ở lớp sinh (đã làm: `keepFieldsOfType`, có test đối chiếu với schema); chạy thử thật một lần trước khi coi pipeline sinh là xong; log retry kèm vài lỗi đầu.
- Trạng thái: CHỜ DUYỆT

### 2026-11-01 — Chỉ chạy test thư mục đang sửa nên sót luật kiểm toàn repo
- Lỗi: ba bước P5 chỉ chạy `src/player/room`, nên không thấy `tokens.test.tsx` cấm mã màu hex trong `src/player`; màu viết cứng trong 5 file tới bước thứ tư mới lộ.
- Phát hiện nhờ: `test-verifier` chạy toàn bộ test.
- Nguyên nhân gốc: chạy test hẹp để nhanh và không đọc quy ước màu trước khi viết màn mới; `test-verifier` bước 2, 3 bị bỏ qua.
- Cách chặn: kết thúc mỗi bước có sửa code thì chạy `test-verifier` toàn bộ như bảng định tuyến; viết màn mới trong `src/player` thì dùng token `play-*`.
- Trạng thái: CHỜ DUYỆT.

### 2026-10-31 — `cd` trong Bash làm memory của subagent lệch chỗ
- Lỗi: chạy `cd frontend/...` trong Bash, thư mục làm việc giữ nguyên qua các lệnh sau; subagent `reviewer` chạy từ `frontend/` nên Claude Code tạo thư mục nhớ ở `frontend/.claude/agent-memory/`, hook chặn ghi và file nhớ rỗng, trong khi `reviewer` báo đã cập nhật bộ nhớ.
- Phát hiện nhờ: đối chiếu đường dẫn trong báo cáo với file thật.
- Nguyên nhân gốc: không chú ý thư mục làm việc trước khi gọi subagent; tin báo cáo của agent mà chưa kiểm file.
- Cách chặn: không `cd`, dùng đường dẫn tuyệt đối hoặc `npm --prefix`; sau mỗi lần `reviewer` chạy, kiểm file nhớ thật ở gốc repo. Có thể dặn trong `reviewer.md`: bị hook chặn ghi nhớ thì phải báo.
- Trạng thái: CHỜ DUYỆT.

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
- Lặp lại lần 5 (2026-10-14, F3): ghi script sửa nhiều file bằng heredoc `cat > ... <<'EOF'` dài trong Bash, lệnh lỗi "unexpected EOF"; phải viết lại bằng công cụ Write rồi chạy `node`.
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

### 2026-10-14 — Hàm "đoán" bằng so khớp chuỗi con trên văn bản đã bỏ dấu
- Lỗi: đoán môn học từ ý tưởng bằng `text.includes('toan')` trên chữ đã bỏ dấu nên "hoàn toàn", "ban đêm", "nghề nghiệp", "điện thoại" bị đoán thành Toán hoặc nghe-chọn-hình; chip còn tự điền sẵn cho giáo viên.
- Phát hiện nhờ: agent `reviewer`; test của mình chỉ có ví dụ đúng, không có ví dụ âm tính.
- Nguyên nhân gốc: bỏ dấu làm nhiều từ khác nghĩa trùng nhau ("toán/toàn", "tìm/tim", "điền/điện"), mình chỉ nghĩ tới trường hợp khớp đúng.
- Cách chặn: so khớp từ khóa theo ranh giới từ bằng cụm từ đủ nghĩa (`utils/phraseMatch.ts`); mọi hàm đoán, phân loại theo từ khóa phải có test âm tính với từ gần giống; kiểm bằng ảnh chụp khi hình SVG co giãn (`slice` cắt mất hình ở khung hẹp, phải dùng `meet`).
- Trạng thái: ĐÃ ÁP DỤNG (đã đổi sang ranh giới từ và thêm test âm tính); chờ duyệt đưa nguyên tắc "test âm tính cho hàm đoán" vào hướng dẫn test.

### 2026-10-14 — Test hồi quy "qua" cả khi chưa có bản sửa
- Lỗi: viết test cho lỗi "tải lại nền thất bại không được thay game đang xem bằng màn lỗi" nhưng test qua cả khi chèn lại lỗi: react-query báo thay đổi bằng `setTimeout(0)` nên giao diện chưa kịp vẽ lại lúc kiểm; lần đầu còn dùng sự kiện `focus` mà react-query không nghe.
- Phát hiện nhờ: tự chèn lại lỗi (đổi điều kiện về như cũ) rồi chạy test: vẫn xanh.
- Nguyên nhân gốc: tin test đúng vì nó xanh với bản đã sửa, chưa chứng minh nó đỏ với bản chưa sửa.
- Cách chặn: mỗi test hồi quy phải được chạy một lần với bản chưa sửa (hoặc chèn lỗi) để thấy nó đỏ; test bất đồng bộ phải chờ một nhịp (hoặc `waitFor`) trước khi kiểm.
- Trạng thái: CHỜ DUYỆT

### 2026-10-27 — `vi.unstubAllEnvs()` trong test làm mất cấu hình độ trễ 0 của test-setup
- Lỗi: test mô phỏng đầu tiên của P1 dùng `afterEach(vi.unstubAllEnvs)`; nó gỡ luôn `VITE_MOCK_LATENCY_MS=0` do `test-setup.ts` đặt, nên mỗi lời gọi mô phỏng chờ 400 ms và 31 test chạy 90 giây thay vì 3 giây.
- Phát hiện nhờ: thời gian chạy `vitest` bất thường (tests 91 giây), không phải do test đỏ.
- Nguyên nhân gốc: không biết `test-setup.ts` đặt biến môi trường bằng `vi.stubEnv` nên `unstubAllEnvs` gỡ cả phần này.
- Cách chặn: trong test không dùng `vi.unstubAllEnvs()`; đặt lại từng biến đã đổi bằng `vi.stubEnv(tên, giá trị mặc định)`; để ý thời gian chạy test mới.
- Trạng thái: CHỜ DUYỆT

### 2026-10-27 — Dùng xáo "không phần tử nào ở yên" (derangement) cho mọi loại game
- Lỗi: mock dùng `seededDerangement` cho AUDIO_VISUAL_MATCH, VISUAL_CLOZE, ORDERING (đáp án đúng đặt đầu mảng rồi xáo): đáp án đúng không bao giờ đứng đầu; id bước ORDERING đánh theo thứ tự đúng nên tự lộ đáp án.
- Phát hiện nhờ: `reviewer` đọc mã, không phải test (test kiểm khóa JSON không bắt được).
- Nguyên nhân gốc: dùng lại hàm sẵn có mà không xét tính chất của nó; test chỉ kiểm tên khóa, không kiểm lộ qua vị trí/id.
- Cách chặn: derangement chỉ dùng khi hợp đồng yêu cầu (MATCHING); loại khác dùng `seededShuffle`; test chống lộ phải kiểm cả vị trí/id qua nhiều phiên, và phải chèn lỗi để thấy đỏ.
- Trạng thái: CHỜ DUYỆT

### 2026-10-27 — Giao agent thực thi khi code còn chưa commit
- Lỗi: giao `frontend-implementer` (chạy trong worktree riêng) sửa code P1 đang chưa commit; worktree tạo từ `main` nên không có code đó, lệnh `git -C <cây chính>` trong bản giao việc bị chặn, agent phải tự `git reset --hard` nhánh worktree về `everyone/UI` rồi chép tệp bằng `diff -rq`.
- Phát hiện nhờ: báo cáo của agent.
- Nguyên nhân gốc: giả định worktree có trạng thái giống cây chính; không kiểm `isolation: worktree` tạo từ đâu.
- Cách chặn: trước khi giao agent thực thi, nếu phần cần sửa chưa commit thì hỏi người dùng commit trước (sau `pre-commit-checker`), hoặc trong bản giao việc chỉ rõ nhánh gốc và danh sách tệp cần chép; không dựa vào `git -C`.
- Trạng thái: CHỜ DUYỆT

### 2026-10-27 — `isolation: worktree` luôn tạo từ `main`, kể cả khi đã commit trên nhánh làm việc
- Lỗi: đã commit P1 lên `everyone/UI` (67add76) rồi giao P2.1 cho `frontend-implementer` với `isolation: worktree`, nhưng worktree vẫn tạo từ `main` (e09913d), không có `frontend/src/player/`. Agent dừng hỏi; lúc được duyệt reset thì worktree đã bị tự xóa (không có thay đổi), mất hai lượt.
- Phát hiện nhờ: báo cáo của agent.
- Nguyên nhân gốc: mục trên chỉ chặn "code chưa commit"; giả định sai rằng worktree tạo từ HEAD của nhánh đang làm.
- Cách chặn: phiên chính tự tạo worktree từ đúng commit ở đường dẫn ngắn (`git worktree add C:/wt-<bước> -b tmp/<bước> <sha>`, tránh lỗi "Filename too long"), giao agent KHÔNG kèm `isolation`, chỉ làm trong đường dẫn đó; xong thì phiên chính xem diff, chép vào cây chính, gỡ junction `node_modules` bằng `rmdir` rồi `git worktree remove` và xóa nhánh tạm. Có thể ghi điều này vào prompt `frontend-implementer`/`backend-implementer`.
- Bổ sung (P3.5, có hậu quả): phiên chính gửi lệnh chép kết quả về cây chính (Bash) và lệnh xóa worktree (PowerShell `git worktree remove --force`) SONG SONG trong cùng một lượt; lệnh chép bị kiểm tra an toàn chặn (`rm -f "$M/$f"` có biến), lệnh xóa vẫn chạy, mất toàn bộ kết quả F3 của agent (khoảng 10 phút làm việc), phải làm lại. Cách chặn: chép về → kiểm `git status` ở cây chính thấy đủ tệp → MỚI xóa worktree, luôn tuần tự trong hai lượt gọi công cụ khác nhau; xóa tệp theo danh sách dùng `"${M:?}/${f:?}"`.
- Bổ sung (P3.1): `frontend-implementer` báo đã tạo `Card.test.tsx` và `SubjectChip.test.tsx` nhưng hai tệp không có trong worktree (phiên chính phát hiện khi đối chiếu danh sách tệp trước khi chép); đã tự viết. Cách chặn: trước khi chép về, so danh sách tệp agent báo với `git status --short` của worktree; tệp báo mà không có là dấu hiệu báo cáo sai.
- Bổ sung (P2.2): agent thực thi vẫn bị cô lập trong worktree riêng của nó nên lệnh `cmd`/`powershell` tạo junction `node_modules` ở worktree phiên chính tạo bị chặn; phiên chính phải tự tạo junction trước khi giao (`New-Item -ItemType Junction`), và tự gỡ bằng `cmd /c rmdir` sau khi chép kết quả.
- Trạng thái: CHỜ DUYỆT

### 2026-10-30 — Regex trong test mất dấu `\` vì ghi qua heredoc, test thành vô tác dụng
- Lỗi: ở P4.4 sửa test bằng `node - <<'EOF'`, regex `/\d+\s*điểm/i` thành `/d+s*điểm/i` nên không bao giờ khớp "10 điểm"; test vẫn xanh nên không ai thấy. Nằm ở `PresentPlay.test.tsx` trên nhánh `everyone/UI`.
- Phát hiện nhờ: chạy thử prompt mới của `reviewer` (mục kiểm test), các lần review trước bỏ sót.
- Nguyên nhân gốc: lặp lại lỗi heredoc đã ghi ngày 2026-10-13; test xanh nên tin là đúng, không đọc lại dòng vừa ghi.
- Cách chặn: chuỗi có `\` luôn sửa bằng Edit/Write, không dùng heredoc hay `node -e`; sau khi ghi test mới, thử làm code sai xem test có hỏng không.
- Trạng thái: CHỜ DUYỆT

### 2026-10-31 — Code an ninh viết bằng danh sách cấm, hook có đường im lặng cho qua
- Lỗi: hook `agent-guard` bản đầu dùng danh sách cấm nên `git diff "--output=CLAUDE.md"` lọt, và chỉ chạy khi `argv[1]` khớp đúng đường dẫn nên có thể thoát 0 mà không kiểm tra; test vẫn xanh 13/13.
- Phát hiện nhờ: `reviewer` được giao thử vượt qua hook.
- Nguyên nhân gốc: chỉ nghĩ tới dạng lệnh viết thẳng, quên shell xử lý chuỗi trước khi git nhận; test do chính người viết nghĩ ra nên cùng điểm mù.
- Cách chặn: phần chặn quyền dùng danh sách cho phép; mặc định là chặn; mọi code an ninh phải có người khác thử vượt qua.
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

### 2026-11-08 — Ô nhãn game tự do cố định 64px cắt mất chữ
- Lỗi: `LabelBadge` trong `CpfRenderer.tsx` dùng bề rộng cố định 64px cho nhãn ≤3 ký tự; chữ đậm cỡ 36 của "bàn" rộng hơn nên hiện thành "b…".
- Phát hiện nhờ: chạy thật kịch bản 006 (nhóm A) trên trình duyệt.
- Nguyên nhân gốc: chọn kích thước theo số ký tự mà không đo/ước lượng bề rộng chữ, chỉ kiểm bằng mắt với nhãn số ("6").
- Cách chặn: kích thước khung chữ trên canvas phải tính từ độ dài chữ và cỡ chữ (hoặc đo bằng Konva), kiểm với nhãn có dấu và chữ rộng; có thể thêm test hàm thuần cho bề rộng nhãn.
- Trạng thái: CHỜ DUYỆT
