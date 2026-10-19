# T8.2: ảnh minh họa từ Pexels API (script cục bộ, duyệt tay) (2026-10-19)

**Trạng thái: script và test đã xong; CHƯA GỌI API THẬT lần nào** (chưa có khóa; bạn sẽ tự cung cấp). Chưa có ảnh nào được tải, chưa có ảnh nào được xem hay duyệt. Việc tạo khóa, chạy, **xem ảnh bằng mắt** và duyệt là việc của bạn (và của thầy/Cô Thơ).

**Vì sao Pexels (thay cho bản OpenAI Images trước đó):** thiết kế sản phẩm đã chốt là Backend lấy ảnh từ Pexels: AI chỉ sinh `visualPrompt` (từ khóa tiếng Anh), Backend gọi Pexels để điền `imageUrl` (`docs/game-json-dsl-v1.0.0.md` dòng 80, `docs/openapi/openapi.yaml`, entity `QuestionGame`). Bản OpenAI tôi tự chọn khi bạn chưa trả lời Q9 là lệch thiết kế và trả phí, nên đã bỏ (mã cũ còn trong lịch sử git). Script này làm đúng việc Backend sẽ làm sau này, nhưng chạy tay và có người duyệt.

## Cách chạy

```bash
cd frontend
# 1) Lấy khóa miễn phí ở trang Pexels API (cần tài khoản), rồi đặt chỉ ở máy bạn. Tệp này đã bị .gitignore; KHÔNG có tiền tố VITE_.
echo "PEXELS_API_KEY=<khóa của bạn>" > .env.pexels.local     # hoặc đặt biến môi trường PEXELS_API_KEY

# 2) Chạy thử: chỉ lập kế hoạch, không gọi mạng. Không có khóa vẫn chạy được.
node scripts/experiments/pexels-search.mjs

# 3) Tìm và tải thật (có trần số lần tìm). Ảnh ra frontend/.img-out/pending/ (đã bị .gitignore)
node scripts/experiments/pexels-search.mjs --run --only=cat --only=dog

# 4) Mở ảnh trong frontend/.img-out/pending/ và XEM BẰNG MẮT. Chọn ảnh phù hợp, rồi (khóa là tên tệp không có đuôi, ví dụ cat-1234567):
node scripts/experiments/pexels-search.mjs --approve=cat-1234567 --reviewer="Tên người đã xem"
```

Cờ: `--only=<id>` (lặp được; id: cat, dog, ball, box, table, bee), `--per-query=N` (số ảnh ứng viên mỗi từ khóa, 1 đến 5, mặc định 3), `--max-searches=N` (trần số lần tìm mỗi lần, mặc định 6), `--monthly-cap=N` (trần cộng dồn theo tháng UTC, mặc định 100), `--out=` (chỉ được là `.img-out` hoặc thư mục con của nó, sau khi chuẩn hóa `..`), `--ledger=` (chỉ được là `.img-ledger*.json` hoặc một tệp `.json` trong `.img-out`), `--approved-dir=` (chỉ được nằm trong `docs/experiments/results/t8-2-pexels/`). `--run` **không nhận giá trị** và **không dùng cùng `--approve`**. Không chọn `--only`: lấy các từ khóa đầu tiên trong giới hạn trần mỗi lần.

Từ khóa cố định trong mã: `cat`, `dog`, `beach ball`, `cardboard box`, `wooden table`, `bee` (từ các vật của ba game thử nghiệm). Dòng lệnh **không nhận văn bản tìm kiếm tự do**.

## Cách kiểm soát

- **Hạn mức API:** theo tài liệu Pexels tôi đọc ngày 2026-10-19, mặc định 200 lần mỗi giờ và 20.000 lần mỗi tháng (tôi chưa kiểm với tài khoản thật). Trần mặc định của script rất thấp (6 lần tìm mỗi lần, 100 mỗi tháng), ghi vào sổ cái cục bộ `frontend/.img-ledger.json` **trước** mỗi lần tìm (lỗi vẫn tính); sổ cái hỏng thì từ chối chạy; **không thử lại tự động**; một lỗi (kể cả 429) là dừng cả lượt. Sổ cái chỉ là rào chắn cho người dùng trung thực: bạn tự nâng trần được, hai tiến trình song song có thể đếm thiếu. Không ghi được sổ cái thì không gọi mạng. Số lần còn lại do Pexels báo (`X-Ratelimit-Remaining`) được **in ra màn hình** ở cuối lượt chạy (không ghi vào bản kê).
- **Khóa:** chỉ từ biến môi trường hoặc ĐÚNG biến `PEXELS_API_KEY` trong `frontend/.env.pexels.local` (không nạp biến khác); chỉ gửi tới `api.pexels.com` bằng header `Authorization` (không vào URL, không vào thân), **không bao giờ gửi tới máy chủ ảnh**; không in, không ghi; mọi lỗi và log đều bị lọc khóa; lỗi 401/403 chỉ in mã trạng thái. Tên biến đã thêm vào `frontend/.env.example` (để trống).
- **Dữ liệu từ API không được tin:** chỉ tải ảnh có địa chỉ `https://images.pexels.com/...` (không tài khoản, không cổng lạ), **không theo chuyển hướng**, giới hạn 8 MB mỗi ảnh (đọc theo luồng và ngắt ngay khi vượt, không chờ hết thân) và 30 ảnh mỗi lần chạy; nội dung phải bắt đầu bằng đúng đầu tệp JPEG/PNG/WebP (không tin `Content-Type`); id ảnh phải là số nguyên dương; trang ảnh và trang tác giả phải thuộc `pexels.com`; địa chỉ trang dài quá 300 ký tự bị bỏ; tên tác giả và mô tả (do người dùng Pexels đặt) được cắt độ dài và bỏ ký tự điều khiển, ký tự định dạng/ẩn (bidi, độ rộng 0). **Rủi ro chưa kiểm:** vì không theo chuyển hướng, nếu máy chủ ảnh thật trả 3xx thì việc tải sẽ báo lỗi (cần báo lại để cân nhắc cho phép chuyển hướng trong cùng máy chủ). Địa chỉ ảnh lạ trong phản hồi bị bỏ, không có lời gọi nào tới máy chủ khác.
- **KHÔNG có kiểm duyệt tự động.** Khác bản OpenAI, không có bước máy kiểm ảnh; Pexels là kho ảnh chọn lọc nhưng không phải bảo đảm an toàn cho trẻ. **Duyệt tay bắt buộc:** ảnh tải về chỉ nằm ở thư mục «chờ duyệt» (bị `.gitignore`). Chỉ khi bạn chạy `--approve=<khóa> --reviewer=<tên>` ảnh mới được sao sang `docs/experiments/results/t8-2-pexels/approved/` (kèm `approved.json`: tên tác giả, đường dẫn trang ảnh và trang tác giả, từ khóa, mô tả, người xem, thời điểm). Chỉ duyệt được ảnh đang «chờ duyệt» và **phải đúng ảnh đã tải** (bản kê lưu `sha256`, lúc duyệt tính lại hash của tệp chờ duyệt; lệch hoặc thiếu thì từ chối). Không tìm lại từ khóa đã có ảnh được duyệt (báo lỗi trước khi gọi mạng); tìm lại từ khóa khác đang chờ duyệt thì ảnh ứng viên cũ bị xóa. **Script không bao giờ tự commit**; thư mục «đã duyệt» không bị `.gitignore`, nên việc `git add` là quyết định của bạn.
- **Đường dẫn ghi** chỉ trong `frontend/` hoặc `docs/experiments/results/`, kiểm ngay đầu lượt và ghim hẹp theo loại (thư mục ra `.img-out`, sổ cái `.img-ledger*.json`/`.json` trong `.img-out`, thư mục đã duyệt `docs/experiments/results/t8-2-pexels/`); đường dẫn được chuẩn hóa `..` trước khi so. Kiểm theo chữ, không theo `realpath` (liên kết tượng trưng trong `.img-out` có thể trỏ ra ngoài). Mặc định **dry-run**.
- **`approved.json` được gộp theo khóa ảnh** (đọc tệp có sẵn rồi thêm/cập nhật), nên xóa `.img-out` rồi duyệt ảnh khác không làm mất dòng ghi nguồn của ảnh đã duyệt trước; tệp có sẵn mà hỏng thì từ chối duyệt (trước khi sao ảnh).
- **Tìm lại một từ khóa xóa ngay các ứng viên chờ duyệt cũ của từ khóa đó** (ngay khi lần tìm mới thành công, trước khi tải ảnh mới); nếu việc tải ảnh mới lỗi thì các ứng viên cũ đã mất. Ảnh đã duyệt thì không bị xóa và không cho tìm lại (dry-run cũng báo trước).

## Giấy phép, ghi nguồn (chưa kiểm chứng đầy đủ, việc của bạn)

Theo trang giấy phép Pexels tôi đọc ngày 2026-10-19: được tải và dùng miễn phí, chỉnh sửa được, dùng trong ứng dụng; **không bắt buộc ghi nguồn**; không được dùng ảnh có thể nhận ra người thật theo cách xấu hay xúc phạm, không được ngụ ý người hoặc thương hiệu trong ảnh bảo trợ sản phẩm, không được bán lại nguyên bản. Trang đó không nói gì về dùng cho dữ liệu AI hay sản phẩm trẻ em. Còn **tài liệu API** thì yêu cầu hiển thị liên kết rõ ràng tới Pexels cho mỗi yêu cầu API và ghi tên nhiếp ảnh gia kèm liên kết trang ảnh khi có thể (ví dụ «Photo by <tên> on Pexels»), và cấm sao chép chức năng cốt lõi của Pexels hay lách hạn mức. Tôi **không xác minh được** điều khoản hiện hành đầy đủ (bản tôi đọc là bản tóm tắt tự động của trang), nên trước khi đưa bất kỳ ảnh nào vào sản phẩm, bạn cần **đọc lại giấy phép và điều khoản API** và ghi kết luận ở đây. Script lưu sẵn tên tác giả và đường dẫn gốc của từng ảnh được duyệt để ghi nguồn sau này.

## Việc bạn cần làm sau khi chạy

- Xem từng ảnh ở `frontend/.img-out/pending/`: có phù hợp trẻ mầm non/lớp 1, đúng vật, **không có người nhận ra được** hay chi tiết đáng sợ, nền gọn, hợp với hai theme (Vũ trụ, Đại dương) và với trục số/ghép tiếng/giới từ hay không. Ảnh là **ảnh chụp thật**, khác phong cách hình vẽ phẳng của game; hãy đánh giá có đồng bộ được không (có thể cần khung/cắt ảnh khi tích hợp). Nhờ thầy/Cô Thơ xem.
- Xem `.img-out/manifest.json` (kích thước, độ trễ tải ảnh, tác giả) và số lần còn lại do Pexels báo (in ở cuối lượt chạy).
- Quyết duyệt/bỏ từng ảnh; quyết có commit ảnh đã duyệt hay không.

## Kiểm tra đã làm

- `pexels-core.test.mjs`: 48 test (dùng `fetch` giả và `io` trong bộ nhớ; không gọi mạng thật, theo CLAUDE.md): từ khóa cố định, trần mỗi lần/tải/tháng, sổ cái (kể cả hỏng), khóa ở header không ở URL/thân và không gửi tới máy chủ ảnh, lọc khóa khỏi lỗi và log, kiểm địa chỉ ảnh/trang (http, máy chủ giả mạo, tài khoản, cổng), kiểm đầu tệp ảnh và kích thước, không theo chuyển hướng, một lỗi là dừng (401/429/500, lỗi tải, lỗi ghi bản kê), sổ cái ghi trước khi tìm, dry-run không gọi mạng/không ghi, cờ boolean có giá trị bị từ chối, duyệt tay (cần người xem, chỉ ảnh đang chờ, tên tệp lạ bị từ chối, hash lệch/thiếu bị từ chối), kiểm đường dẫn ngay đầu.
- Chạy CLI thật không có khóa: dry-run (6 lần tìm, tối đa 18 ảnh), `--run` thiếu khóa, `--out=src` bị từ chối; không có lời gọi mạng. **Lớp CLI `pexels-search.mjs` (đọc tệp env, ghi/sao tệp thật, mã thoát) không có test tự động.**
- Chèn lỗi thử 48 chỗ có nghĩa (header, khóa lộ ở URL, theo chuyển hướng, kiểm máy chủ/giao thức, đầu tệp ảnh, giới hạn kích thước và đọc luồng, 429, sổ cái ghi sau/ghi lỗi, không dừng sau lỗi, không kiểm hash/trạng thái/người xem/tên tệp, chuẩn hóa `--out`, tên `--ledger`, gộp `approved.json`, ký tự điều khiển/bidi, độ dài URL, trần...): đều làm test đỏ, sau khi thêm test cho 4 chỗ sống sót ở hai vòng. `security-auditor` và `reviewer` đã rà; các điểm TRUNG BÌNH và các điểm THẤP đáng sửa đã sửa. Chưa sửa (ghi nhận): `--reviewer` chỉ là tên tự khai; không dùng `realpath`/`lstat` (liên kết tượng trưng); khe TOCTOU nhỏ giữa lúc kiểm hash và lúc sao ảnh; `sha256` nằm cùng bản kê trong `.img-out` nên không chống được người đã có quyền ghi ở đó; phản hồi tìm kiếm JSON không giới hạn kích thước đọc.

## Giới hạn, chưa kiểm chứng

- **Hình dạng API (địa chỉ `https://api.pexels.com/v1/search`, header `Authorization` chứa khóa trần, tham số `query`/`per_page`, phản hồi `photos[].id/url/photographer/photographer_url/alt/src.large`, máy chủ ảnh `images.pexels.com`) viết theo tài liệu Pexels tôi đọc ngày 2026-10-19, chưa kiểm với API thật.** Nếu API trả lỗi 4xx hoặc sai dạng, báo lại để sửa.
- Chưa biết: ảnh nào Pexels trả cho các từ khóa này, chất lượng và độ phù hợp trẻ em, kích thước tệp thật, độ trễ.
- Chưa có tích hợp vào theme/renderer; ảnh chỉ là thử nghiệm. Hai theme hiện dùng SVG vẽ bằng code, không dùng ảnh ngoài.
- Không thêm thư viện nào (dùng `fetch`, `node:fs`, `node:path`, `node:crypto`).
- **Giới hạn của chốt chặn (chỉ ghi chú):** trần chỉ là rào chắn cho người dùng trung thực; hai tiến trình chạy song song có thể đếm thiếu sổ cái và ghi đè bản kê; kiểm đường dẫn so sánh theo chữ, không theo `realpath`; `--reviewer` chỉ là tên tự khai, `approved.json` không phải bằng chứng an toàn với bên thứ ba.
