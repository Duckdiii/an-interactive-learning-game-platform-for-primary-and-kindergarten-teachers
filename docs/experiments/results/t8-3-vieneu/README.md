# T8.3: giọng đọc cục bộ bằng VieNeu-TTS (mã nguồn mở, không khóa, không thẻ) (2026-10-19)

**Trạng thái: script và test đã xong; CHƯA CHẠY VỚI MÔ HÌNH THẬT lần nào** (chưa cài `vieneu`). Chưa có tệp âm thanh nào được sinh, chưa nghe thử, chưa có số đo thời gian hay kích thước thật. Việc cài, chạy và **nghe bằng tai** là việc của bạn (và của thầy/Cô Thơ).

**Vì sao VieNeu-TTS:** bạn không muốn dùng thẻ và giọng Web Speech chưa tự nhiên; theo trang mô hình của tác giả, VieNeu-TTS v3 Turbo dùng giấy phép Apache-2.0 (kể cả giọng có sẵn), chạy được trên CPU, có nhiều giọng tiếng Việt. Chất lượng, tốc độ và «dùng thương mại được» đều là **lời tự nhận của tác giả, tôi chưa kiểm chứng**; dữ liệu huấn luyện không công khai (tập dữ liệu bị khóa), nên nếu sản phẩm có yêu cầu pháp lý chặt, bạn phải tự cân nhắc.

## Cài đặt (làm NGOÀI repo; không đụng `package.json`)

Theo hướng dẫn trên [GitHub của VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS) và [PyPI](https://pypi.org/project/vieneu/) (tôi chưa chạy thử các bước này; đối chiếu README của bản bạn cài, vì các nguồn không thống nhất về bản mô hình mặc định và yêu cầu eSpeak NG):

```powershell
# Tạo môi trường riêng ngoài repo, rồi cài gói (tải từ PyPI; lần chạy đầu thư viện tự tải mô hình, tôi chưa biết dung lượng)
uv venv D:\tools\vieneu-venv
uv pip install --python D:\tools\vieneu-venv\Scripts\python.exe vieneu
```

Nếu `pip install vieneu` báo lỗi build trên Windows, hãy gửi lỗi cho tôi trước. Một số nguồn gợi ý thêm một chỉ mục gói của bên thứ ba (`--extra-index-url ...`); **tôi không khuyến nghị** dùng nó khi chưa tự kiểm nguồn, vì chỉ mục phụ có thể cài nhầm gói giả cùng tên. Cần Python 3.10 trở lên (máy này có 3.13.5).

## Cách chạy

```bash
cd frontend
# BẮT BUỘC (trừ khi chỉ chạy thử): trỏ tới python.exe của môi trường đã cài vieneu. Script không tự đoán lệnh `python` (trên Windows nó có thể là bản giả của Microsoft Store).
export VIENEU_PYTHON="D:/tools/vieneu-venv/Scripts/python.exe"     # PowerShell: $env:VIENEU_PYTHON = "D:\tools\vieneu-venv\Scripts\python.exe"

node scripts/experiments/tts-vieneu.mjs                       # chạy thử: chỉ lập kế hoạch, không gọi Python
node scripts/experiments/tts-vieneu.mjs --list-voices         # liệt kê giọng (lần đầu có thể tải mô hình)
node scripts/experiments/tts-vieneu.mjs --run --voice="Tên giọng"   # sinh thật ra frontend/.tts-out/vieneu/*.wav
```

Cờ: `--voice=` (lặp được; không chỉ định thì dùng giọng mặc định của thư viện), `--only=<id câu>` (lặp được; id lấy từ `SAMPLES` trong `tts-core.mjs`; **khi có `--only` thì `--lang` không còn tác dụng**, câu được nêu luôn được chọn), `--lang=vi|en|both` (mặc định `vi`; VieNeu được tác giả nói là huấn luyện trên tiếng Việt và tiếng Anh, chất lượng tiếng Anh chưa kiểm), `--max-jobs=N` (trần số câu mỗi lần, mặc định 20), `--out=` (chỉ được là `frontend/.tts-out` hoặc thư mục con), `--manifest=` (chỉ được là tệp `.json` trong `docs/experiments/results/`). `--run` và `--list-voices` **không nhận giá trị**.

Âm thanh ra `frontend/.tts-out/vieneu/` (đã bị `.gitignore`); `--run` ghi thêm bản kê `docs/experiments/results/t8-3-vieneu/manifest.json` (không chứa âm thanh): thời gian sinh từng câu, kích thước tệp, số giây âm thanh. Bản kê vẫn được ghi khi Python không chạy được hoặc quá giờ (kèm lý do và các câu đã xong); các thông báo lỗi trong đó đã thay thư mục người dùng bằng `~`, nhưng bạn vẫn nên đọc lại trước khi commit.

## Cách kiểm soát

- **Không có khóa, không gọi API trả phí:** mô hình chạy trên máy bạn. Vì vậy không có sổ cái chi phí như T8.1/T8.2; chỉ còn trần số câu mỗi lần (CPU/thời gian) và thời hạn 15 phút cho cả lượt.
- **Văn bản cố định trong mã:** dòng lệnh không nhận văn bản tự do, chỉ chọn trong 10 câu mẫu của T8.1.
- **Không qua shell:** Node gọi Python bằng `spawn` (không `shell`), lệnh và đối số tách riêng; câu cần đọc và tên giọng đi qua tệp JSON (`jobs.json`), không vào dòng lệnh. Tên giọng chỉ nhận chữ, số, khoảng trắng và `_ . ' -`, tối đa 40 ký tự.
- **Môi trường tiến trình Python theo DANH SÁCH CHO PHÉP** (không phải danh sách cấm): chỉ chuyển các biến cần để chạy (`PATH`, `SystemRoot`, `TEMP`, `USERPROFILE`/`APPDATA`/`LOCALAPPDATA`, `HOME`, `VIRTUAL_ENV`, `LANG`/`LC_*`, `HF_HOME`/`HF_ENDPOINT`/`HF_HUB_CACHE`, `TORCH_HOME`, `CUDA_*`...). Khóa API, chuỗi kết nối, proxy có mật khẩu và các biến `PYTHON*` (`PYTHONPATH`, `PYTHONSTARTUP`, `PYTHONHOME`) **không** được chuyển. Nếu `vieneu` cần thêm biến nào (ví dụ proxy để tải mô hình), phải thêm vào danh sách trong `tts-vieneu-core.mjs`.
- **Thư mục script bị bỏ khỏi `sys.path`** trong bộ sinh Python, nên một tệp `json.py`/`vieneu.py` đặt cạnh script không thay được thư viện thật. Việc cài `vieneu` vào môi trường Python vẫn là quyết định của bạn: gói đó và các phụ thuộc của nó chạy với quyền của bạn (rủi ro chuỗi cung ứng thông thường của pip; `VIENEU_PYTHON` chỉ lấy từ biến môi trường, không từ cờ hay tệp trong repo).
- **Đường dẫn ghi** hẹp hơn các script trước: thư mục ra chỉ trong `frontend/.tts-out/`, bản kê chỉ là `.json` trong `docs/experiments/results/`, kiểm ngay đầu lượt; bộ sinh Python chỉ nhận tên tệp không chứa thư mục và đuôi `.wav`. Kiểm theo chữ, không theo `realpath` (liên kết tượng trưng/junction trong `.tts-out` có thể trỏ ra ngoài).
- **Hết giờ thì giết CẢ cây tiến trình** (`taskkill /T /F` trên Windows, nhóm tiến trình trên POSIX; trình khởi chạy venv trên Windows bật Python thật làm tiến trình con) và, nếu `close` không tới (cháu giữ pipe mở), vẫn trả kết quả sau 5 giây ân hạn. Chỉ giữ các dòng giao thức của stdout (log tự in lớn của thư viện không làm mất sự kiện); stderr chỉ giữ 64 KB cuối.
- **Một câu lỗi là dừng cả lượt**, không tự thử lại; bản kê ghi rõ câu nào xong, câu nào lỗi, câu nào chưa chạy.
- **Giao thức Node ↔ Python:** mỗi dòng kết quả có tiền tố `@@VIENEU@@ ` rồi JSON (bộ sinh xuống dòng trước tiền tố, Node vẫn đọc được khi tiền tố nằm giữa dòng); log tự in của thư viện bị bỏ qua; dòng hỏng bị bỏ qua (câu liên quan báo «không có phản hồi»). Một câu chỉ được tính là xong khi sự kiện `done` khớp cả id lẫn tên tệp, và lỗi cũng ghép theo cả hai (hai giọng cùng một câu không nhận nhầm lỗi của nhau). Con số trong sự kiện không phải số hữu hạn thì tính là 0. **Node tin các con số Python tự khai** (không kiểm tệp `.wav` có thật), vì Python đã là mã được tin.

## Kiểm tra đã làm

- 51 test, lint sạch: `tts-vieneu-core.test.mjs` (41) và `tts-vieneu-spawn.test.mjs` (10, chạy **tiến trình Node thật** làm tiến trình con để kiểm tra lớp chạy tiến trình: lọc dòng giao thức, log 3 MB, ký tự đa byte bị cắt giữa hai khối, môi trường không thừa kế, hết giờ giết cả cây tiến trình cháu, hạn ân hạn). Chèn lỗi thử 33 chỗ có nghĩa (danh sách môi trường, khớp id/tên tệp, biên trần, kiểm đường dẫn, taskkill, hạn ân hạn, `setEncoding`, dọn `sys.path`, thứ tự kiểm tham số/nạp mô hình, xuống dòng trước tiền tố...): cả 33 đều làm test đỏ, sau khi thêm test cho 8 chỗ sống sót ở hai vòng. Trong 41 test của lõi có 33 test với `spawnFn` và `io` giả (không cần cài vieneu) và 8 test chạy **bộ sinh Python thật** với một mô-đun `vieneu` GIẢ (tạo trong thư mục tạm, ghi tệp `.wav` hợp lệ; tự bỏ qua nếu máy không có Python 3). Các test này chứng minh giao thức, ghi tệp, đo số giây, xử lý giọng không có, lỗi giữa chừng và thiếu mô-đun; **không chứng minh gì về chất lượng giọng hay về API thật của `vieneu`**.
- Chạy CLI thật (không có Python nào được gọi): dry-run đúng kế hoạch (5 câu tiếng Việt, 82 ký tự); `--manifest=package.json`, `--out=src` bị từ chối; `--list-voices` khi chưa đặt `VIENEU_PYTHON` báo lỗi hướng dẫn. **Lớp CLI `tts-vieneu.mjs` (tạo thư mục, ghi `jobs.json` và bản kê thật, mã thoát) không có test tự động**; chưa có lần chạy đầy đủ với `vieneu` thật.

## Giới hạn, chưa kiểm chứng

- **Hình dạng API `vieneu` (viết theo trang PyPI):** `Vieneu()`, `list_preset_voices()` trả cặp `(nhãn, id)`, `infer(text, voice=...)`, `save(audio, path)`, và `voice` nhận nhãn hay id **chưa kiểm với thư viện thật**. Nếu lần chạy thật báo lỗi, gửi nguyên văn để tôi sửa.
- Tên mô hình mặc định (Turbo hay bản 0.3B), dung lượng tải về, thời gian sinh trên máy bạn, yêu cầu eSpeak NG: chưa biết.
- Theo trang tác giả, đầu ra là `.wav` 48 kHz (chưa kiểm với thư viện thật); tệp `.wav` như vậy thường lớn hơn nhiều so với `.mp3`; đổi sang `.mp3` cần công cụ như `ffmpeg` (máy này chưa có; sẽ hỏi bạn trước khi dùng) hoặc để nguyên `.wav` (Howler phát được `.wav`).
- Chưa tích hợp vào theme/renderer/`AudioService`; chỉ để nghe thử.
- Không thêm thư viện nào vào dự án (Node dùng `node:child_process`, `node:fs`, `node:path`; test thêm `node:os`); `vieneu` là công cụ ngoài, cài riêng.

## Việc bạn cần làm sau khi chạy

- Nghe các tệp trong `frontend/.tts-out/vieneu/`: giọng nào hợp trẻ mầm non; dấu thanh của «mèo» (tệp `vi-syllable-answer`), «Giỏi lắm!», «Thử lại nhé!»; câu dài có bị ngắt lạ không.
- Gửi tôi: thông báo lỗi nguyên văn (nếu có), tên giọng chọn, thời gian sinh và kích thước từ `manifest.json`.
- Cân nhắc giấy phép: đọc lại trang mô hình và điều khoản trước khi dùng giọng nào trong sản phẩm.
