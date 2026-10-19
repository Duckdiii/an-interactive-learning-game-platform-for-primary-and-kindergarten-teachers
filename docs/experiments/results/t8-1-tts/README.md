# T8.1: giọng đọc bằng Google Cloud Text-to-Speech (script cục bộ) (2026-10-19)

**Trạng thái: script và test đã xong; CHƯA GỌI API THẬT lần nào** (tôi không có khóa và không tự nhập khóa). Chưa có tệp âm thanh, chưa nghe thử, chưa có số đo chi phí hay độ trễ thật. Việc gọi thật và nghe bằng tai là việc của bạn.

Theo lựa chọn của bạn: nhà cung cấp **Google Cloud Text-to-Speech**, mục tiêu **chỉ dùng hạn mức miễn phí**, bạn **tự điền khóa** vào tệp cục bộ. **Script không thể bảo đảm «chỉ dùng miễn phí»**: nó chỉ giới hạn số ký tự nó gửi đi (ước tính) và từ chối vài họ giọng; hạn mức thật nằm ở phía Google.

## Cách chạy

```bash
cd frontend
# 1) Đặt khóa (chỉ ở máy bạn). Tệp này đã bị .gitignore; KHÔNG có tiền tố VITE_, không bao giờ vào trình duyệt.
echo "GOOGLE_TTS_API_KEY=<khóa của bạn>" > .env.tts.local     # hoặc đặt biến môi trường GOOGLE_TTS_API_KEY

# 2) Chạy thử: chỉ lập kế hoạch (không tổng hợp, không tốn ký tự). Không có khóa vẫn chạy được.
node scripts/experiments/tts-google.mjs

# 3) Xem các giọng vi-VN và en-US có sẵn (cần khóa; gọi API liệt kê giọng, theo hiểu biết của tôi không tính ký tự nhưng chưa kiểm)
node scripts/experiments/tts-google.mjs --list-voices

# 4) Tổng hợp thật (tốn ký tự, có trần). Âm thanh ra frontend/.tts-out/ (đã bị .gitignore)
node scripts/experiments/tts-google.mjs --run
```

Cờ: `--voice=vi-VN-Standard-A` (lặp được; phải thuộc ngôn ngữ đang chạy), `--lang=vi|en|both`, `--max-chars=N` (trần mỗi lần, mặc định 3000), `--monthly-cap=N` (trần cộng dồn theo tháng UTC, mặc định 30000), `--out=`, `--ledger=`, `--manifest=`. Cờ `--run` và `--list-voices` **không nhận giá trị** (`--run=false` là lỗi, không phải «tắt»). Khi `--run`, bản kê (không chứa khóa, không chứa âm thanh) ghi vào `docs/experiments/results/t8-1-tts/manifest.json` trừ khi bạn chỉ định `--manifest=`.

Không có `--voice`: tự chọn tối đa hai giọng mỗi ngôn ngữ theo thứ tự Standard, rồi WaveNet, rồi Neural2 (rẻ trước theo hiểu biết của tôi, chưa kiểm bảng giá); thiếu loại thì bù bằng giọng còn lại **cùng danh sách trắng**; không chọn được giọng nào cho một ngôn ngữ thì báo lỗi.

## Cách kiểm soát chi phí và khóa

- **Trần theo ký tự:** trần mỗi lần chạy và trần cộng dồn theo tháng UTC trong sổ cái cục bộ `frontend/.tts-ledger.json`. Số ký tự được **ghi vào sổ cái TRƯỚC mỗi lần gọi** (gọi lỗi vẫn tính), chạm trần là dừng. Bộ câu mẫu mặc định chỉ 362 ký tự cho 20 lần gọi (10 câu × 2 giọng). Cách tính cước theo ký tự của Google và hạn mức miễn phí tôi **không xác minh được** (không có tài liệu trực tuyến trong phiên này); đếm của script là điểm mã Unicode cả khoảng trắng, ước tính thiên về dư.
- **Giới hạn của sổ cái (đọc kỹ):** chỉ đếm lượt chạy của chính script này trên máy này; **không** đếm lượng dùng của khóa từ nơi khác; tháng tính theo UTC (Google có thể reset theo múi giờ khác); bạn có thể tự nâng `--max-chars`/`--monthly-cap`, đổi `--ledger=` hoặc xóa sổ cái để bắt đầu từ 0; hai tiến trình chạy song song có thể đếm thiếu. Sổ cái **hỏng, thiếu tháng hoặc số âm thì script TỪ CHỐI chạy** (không coi là 0). **Trần thật phải đặt ở Google Cloud** (cảnh báo ngân sách, hạn mức API); trần trong script chỉ là chốt chặn chống nhầm.
- **Không có vòng thử lại tự động:** một lần gọi lỗi là dừng cả lượt (không gọi tiếp), tránh tốn phí do lặp.
- **Danh sách trắng loại giọng:** chỉ tên dạng `xx-XX-Standard|Wavenet|Neural2-...` và không khớp mẫu cao cấp (Studio, Chirp, Journey, Polyglot, News, Casual, HD). Loại giọng lạ (tên mới không chứa từ khóa) cũng bị từ chối, kể cả khi chỉ định bằng `--voice=`. **Việc Standard/WaveNet/Neural2 là họ «rẻ/miễn phí» và các họ kia là «cao cấp» là hiểu biết của tôi, chưa kiểm với bảng giá hiện tại.**
- **Khóa:** chỉ đọc từ biến môi trường hoặc ĐÚNG biến `GOOGLE_TTS_API_KEY` trong `frontend/.env.tts.local` (script không nạp biến nào khác trong tệp; biến đã có trong môi trường được ưu tiên), gửi bằng header `X-Goog-Api-Key` (không đưa vào URL), không in ra, không ghi vào tệp nào; mọi thông báo lỗi và dòng log đều bị lọc khóa; test khẳng định khóa không xuất hiện trong log, kết quả, bản kê, sổ cái hay URL. Hàm lọc chỉ so khớp khóa nguyên văn (không lọc dạng mã hóa URL hay bị cắt). Tên biến đã thêm vào `frontend/.env.example` (để trống).
- **Đường dẫn ghi** (`--out`, `--ledger`, `--manifest`) chỉ được nằm trong `frontend/` hoặc `docs/experiments/results/`, kiểm ngay đầu lượt chạy (trước khi tốn ký tự); lệch là báo lỗi.
- Mặc định là **dry-run**: phải có `--run` mới tổng hợp. Mọi lỗi (kể cả khi liệt kê giọng) được báo bằng thông báo `LỖI (...)` và mã thoát 1, không in stack trace.

## Bộ câu mẫu (10 câu, `SAMPLES` trong `tts-core.mjs`)

Tiếng Việt: «Đặt chú ong vào số bảy.», «Ghép tiếng chỉ con vật kêu meo meo.», «mèo», «Giỏi lắm!», «Thử lại nhé!». Tiếng Anh: «Put the cat under the table.», «Put the ball in the box.», «Put the dog next to the box.», «Great job!», «Good try!». Là lời cho ba game mới và phản hồi; chỉ văn bản thử, không có dữ liệu cá nhân.

## Việc bạn cần làm sau khi chạy (nghe bằng tai)

- Nghe từng tệp ở `frontend/.tts-out/`: tiếng Việt có đọc đúng dấu thanh và ngắt nhịp không (đặc biệt «mèo» đọc riêng một tiếng, vì lời đọc của SYLLABLE_BUILDER chính là đáp án), tiếng Anh có tự nhiên cho trẻ không, giọng Standard so với WaveNet.
- Xem `manifest.json` để biết số ký tự, kích thước (byte) và độ trễ mỗi lần gọi; so với phương án giọng của trình duyệt ở T2.3 (một máy: 1 giọng Việt và 3 giọng Anh).
- Đánh giá độ phù hợp lứa tuổi (mầm non, lớp 1) với thầy/Cô Thơ.
- Quyết có commit tệp âm thanh hay không (hiện bị `.gitignore` để khỏi commit nhầm; xem xét giấy phép và điều khoản dùng của Google cho âm thanh tạo ra trước khi đưa vào sản phẩm). Lưu ý `manifest.json` KHÔNG bị `.gitignore`; nó chứa thời điểm, tên giọng, số ký tự, byte, độ trễ và thông báo lỗi (đã lọc khóa, cắt 200 ký tự, có thể kèm chữ trong phản hồi lỗi của Google).

## Kiểm tra đã làm

- `tts-core.test.mjs`: 43 test (dùng `fetch` giả và `io` trong bộ nhớ; không gọi mạng thật, theo CLAUDE.md): đếm ký tự, sổ cái (kể cả sổ cái hỏng), chọn giọng và danh sách trắng, trần mỗi lần và theo tháng, khóa ở header không ở URL (cả synthesize và liệt kê giọng), lọc khóa khỏi lỗi và log, một lần gọi không thử lại, lỗi dừng cả lượt và vẫn tính ký tự, sổ cái ghi trước khi gọi, dry-run không gọi mạng và không ghi gì, cờ boolean có giá trị bị từ chối, giọng sai ngôn ngữ, danh sách giọng rỗng, lỗi khi liệt kê giọng, manifest mặc định, kiểm đường dẫn ngay đầu, đọc đúng biến khóa từ tệp env.
- Chạy CLI thật không có khóa: dry-run in kế hoạch (20 lần gọi, 362 ký tự) và thoát 0; `--run` thiếu khóa, `--run=false` và giọng cao cấp đều bị từ chối, thoát 1; không có lời gọi mạng nào. **`tts-google.mjs` (lớp CLI: đọc tệp env, ghi tệp thật, mã thoát) không có test tự động**, chỉ chạy tay như trên; phần logic quyết định nằm ở `tts-core.mjs` đã có test.
- Chèn lỗi thử 22 chỗ (khóa vào URL, bỏ lọc khóa ở nhiều nơi, bỏ dừng sau lỗi, biên trần, bỏ lọc giọng, bỏ kiểm dry-run, bỏ ghi sổ cái trước khi gọi, tháng sổ cái, bỏ kiểm cờ boolean, sổ cái hỏng, giọng sai ngôn ngữ, kiểm đường dẫn, danh sách trắng, manifest mặc định, đọc biến khóa): đều làm test đỏ, trừ một chỗ tương đương (điều kiện «0 việc» trùng với điều kiện «thiếu giọng»), sau khi thêm test cho các chỗ sống sót.
- `security-auditor` và `reviewer` đã rà; các điểm TRUNG BÌNH (danh sách đen giọng, sổ cái fail-open, cờ `--run=<giá trị>` vượt dry-run) và nhiều điểm THẤP đã sửa; chưa sửa: hai tiến trình chạy song song có thể đếm thiếu sổ cái (chỉ ghi chú).

## Giới hạn, chưa kiểm chứng

- **Hình dạng API (địa chỉ, tên trường, header khóa, định dạng phản hồi)** viết theo hiểu biết của tôi về Google Cloud Text-to-Speech v1 (`voices?languageCode=`, `text:synthesize`, `audioContent` base64), **chưa kiểm với API thật** và không có tài liệu trực tuyến trong phiên này. Nếu API trả lỗi 4xx, kiểm lại tên trường/quyền của khóa (API key có thể cần giới hạn theo API Text-to-Speech).
- Chưa biết: các giọng thực sự có cho vi-VN/en-US ở thời điểm bạn chạy, chất lượng tiếng Việt, độ trễ, kích thước tệp, chi phí thật (có thể bằng 0 nếu trong hạn mức), có cần bật thanh toán không.
- Chưa có tích hợp vào trình duyệt/renderer: tệp âm thanh sinh ra chỉ là thử nghiệm để nghe; chưa nối vào `audioUrl` của game, chưa có cơ chế dự phòng khi tệp thiếu (xem T7.4).
- Script dùng `fetch`, `node:fs`, `node:path` có sẵn (Node 20.19.6 ở máy này, chưa thử dưới Windows với mọi phiên bản Node); không thêm thư viện nào.
- T8.2 (ảnh AI) chưa làm.
