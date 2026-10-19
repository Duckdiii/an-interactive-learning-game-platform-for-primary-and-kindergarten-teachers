# T8.2: ảnh minh họa do AI sinh (script cục bộ, kiểm duyệt tự động + duyệt tay) (2026-10-19)

**Trạng thái: script và test đã xong; CHƯA GỌI API THẬT lần nào** (chưa có khóa; bạn sẽ tự cung cấp sau). Chưa có ảnh nào được sinh, chưa có ảnh nào được xem hay duyệt, chưa có số đo chi phí hay độ trễ thật. Việc gọi thật, **xem ảnh bằng mắt** và duyệt là việc của bạn (và của thầy/Cô Thơ).

**Quyết định của tôi (bạn chưa trả lời Q9, và bạn bảo tôi cứ làm):** dùng **OpenAI Images** để sinh ảnh và **OpenAI Moderation** để kiểm duyệt tự động. Lý do: dự án đã dùng OpenAI Moderation ở Backend (Layer 3) và tôi quen API này (nhưng chưa kiểm với API thật, xem «Giới hạn»). **Khác với TTS, ảnh không có hạn mức miễn phí mà tôi biết**: mỗi ảnh tốn tiền. Vì vậy trần mặc định rất thấp (3 ảnh mỗi lần, 10 ảnh mỗi tháng) và **bạn quyết định chi phí** khi tự điền khóa và chạy `--run`. Nếu bạn muốn nhà cung cấp khác (ví dụ Google Imagen), hãy nói; phần lõi (trần, kiểm duyệt, duyệt tay) dùng lại được, chỉ thay hai hàm gọi API.

## Cách chạy

```bash
cd frontend
# 1) Đặt khóa (chỉ ở máy bạn). Tệp này đã bị .gitignore; KHÔNG có tiền tố VITE_; khác tên với OPENAI_API_KEY của backend.
echo "OPENAI_IMAGES_API_KEY=<khóa của bạn>" > .env.image.local     # hoặc đặt biến môi trường OPENAI_IMAGES_API_KEY

# 2) Chạy thử: chỉ lập kế hoạch (không sinh, không tốn phí). Không có khóa vẫn chạy được.
node scripts/experiments/img-openai.mjs

# 3) Sinh thật (ẢNH TRẢ PHÍ, có trần số ảnh). Ảnh ra frontend/.img-out/pending/ (đã bị .gitignore)
node scripts/experiments/img-openai.mjs --run --only=cat --only=dog

# 4) Mở ảnh trong frontend/.img-out/pending/ và XEM BẰNG MẮT. Chỉ khi bạn thấy ảnh phù hợp trẻ nhỏ:
node scripts/experiments/img-openai.mjs --approve=cat --reviewer="Tên người đã xem"
```

Cờ: `--only=<id>` (lặp được; id: cat, dog, ball, box, table, bee), `--max-images=N` (trần mỗi lần, mặc định 3), `--monthly-cap=N` (trần cộng dồn theo tháng UTC, mặc định 10), `--model=` (chỉ nhận `gpt-image-1`, danh sách trắng trong mã), `--out=` (chỉ được là `.img-out` hoặc thư mục con của nó), `--ledger=`, `--approved-dir=`. `--run` **không nhận giá trị** và **không dùng cùng `--approve`**. Không chọn `--only`: lấy các lời nhắc đầu tiên trong giới hạn trần mỗi lần (không sinh cả bộ ngoài ý muốn).

## Cách kiểm soát

- **Lời nhắc cố định trong mã** (6 vật từ ba game mới: mèo, chó, bóng, hộp, bàn, ong), dặn rõ: hình vẽ phẳng cho trẻ nhỏ, một vật, nền sáng, **không chữ, không số, không logo, không người**. Dòng lệnh **không nhận văn bản tự do**, nên không thể sinh nội dung ngoài danh sách này.
- **Trần theo số ảnh** (mỗi lần và theo tháng UTC, sổ cái cục bộ `frontend/.img-ledger.json`): ghi vào sổ cái **trước** mỗi lần gọi (lỗi vẫn tính); sổ cái hỏng thì từ chối chạy; **không thử lại tự động**; một lỗi là dừng cả lượt. Giới hạn sổ cái giống T8.1: chỉ đếm lượt chạy của script này trên máy này, bạn có thể nâng trần hoặc xóa sổ cái, hai tiến trình song song có thể đếm thiếu. **Trần thật phải đặt ở OpenAI (giới hạn chi tiêu/ngân sách trong tài khoản).**
- **Kiểm duyệt tự động bắt buộc** cho MỌI ảnh (OpenAI Moderation, gửi cả lời nhắc lẫn ảnh): ảnh bị đánh dấu **không được lưu**; **lỗi mạng, HTTP lỗi hoặc phản hồi sai dạng đều bị coi là KHÔNG an toàn** (đóng-an-toàn, như Backend). Kiểm duyệt tự động **không thay được mắt người**: nó không đánh giá thẩm mỹ, độ phù hợp lứa tuổi hay lỗi vẽ.
- **Duyệt tay bắt buộc:** ảnh qua kiểm duyệt tự động chỉ nằm ở thư mục «chờ duyệt» (bị `.gitignore`). Chỉ khi bạn chạy `--approve=<id> --reviewer=<tên>` ảnh mới được sao sang `docs/experiments/results/t8-2-images/approved/` (kèm `approved.json`: lời nhắc, mô hình, kết quả kiểm duyệt, người xem, thời điểm). Chỉ duyệt được ảnh đang «chờ duyệt» và đã qua kiểm duyệt tự động, và **phải đúng ảnh đã lưu lúc sinh**: bản kê lưu `sha256` của ảnh, lúc duyệt tính lại hash của tệp chờ duyệt, lệch hoặc thiếu thì từ chối (chống thay ảnh sau khi kiểm duyệt). **Không sinh lại id đã duyệt** (báo lỗi trước khi tốn phí); sinh lại id đang chờ duyệt mà lần này bị từ chối hoặc lỗi thì ảnh chờ duyệt cũ bị xóa. Lỗi ghi bản kê sau khi đã trả tiền không làm sập script (báo lỗi và dừng). **Script không bao giờ tự commit**; thư mục «đã duyệt» không bị `.gitignore`, nên việc `git add` là quyết định của bạn.
- **Khóa:** chỉ từ biến môi trường hoặc ĐÚNG biến `OPENAI_IMAGES_API_KEY` trong `frontend/.env.image.local` (không nạp biến khác); gửi bằng header `Authorization: Bearer` (không đưa vào URL hay thân yêu cầu); không in, không ghi; mọi lỗi và log đều bị lọc khóa (chỉ khớp khóa nguyên văn; lỗi 401/403 chỉ in mã trạng thái, không in thân lỗi vì thân có thể nhắc lại khóa dạng che). Tên biến đã thêm vào `frontend/.env.example` (để trống).
- **Đường dẫn ghi** chỉ trong `frontend/` hoặc `docs/experiments/results/`, kiểm ngay đầu lượt chạy. Mặc định **dry-run**.

## Giấy phép, điều khoản, bản quyền (chưa kiểm chứng, việc của bạn)

Tôi **không xác minh được** điều khoản sử dụng hiện hành của OpenAI về quyền sử dụng ảnh do API sinh ra trong sản phẩm cho trẻ em, về dữ liệu gửi đi (lời nhắc và ảnh gửi sang kiểm duyệt), hay về độ tuổi người dùng. Trước khi đưa bất kỳ ảnh nào vào sản phẩm, **bạn cần đọc điều khoản hiện hành** và ghi lại kết luận ở đây. Ảnh do AI sinh có thể có lỗi vẽ (chi tiết lạ, chữ vô nghĩa dù đã dặn không chữ); cần người xem kỹ từng ảnh.

## Việc bạn cần làm sau khi chạy

- Xem từng ảnh ở `frontend/.img-out/pending/`: có phù hợp trẻ mầm non/lớp 1, đúng vật, không chữ lạ, không chi tiết đáng sợ, hợp với hai theme (Vũ trụ, Đại dương) và với trục số/ghép tiếng/giới từ hay không. Nhờ thầy/Cô Thơ xem.
- Xem `.img-out/manifest.json` (kích thước, độ trễ, kết quả kiểm duyệt) và ghi chi phí thật theo hóa đơn của bạn.
- Quyết duyệt/bỏ từng ảnh; quyết có commit ảnh đã duyệt hay không.

## Kiểm tra đã làm

- `img-core.test.mjs`: 33 test (dùng `fetch` giả và `io` trong bộ nhớ; không gọi mạng thật, theo CLAUDE.md): lời nhắc cố định, trần mỗi lần/tháng, sổ cái (kể cả hỏng), khóa ở header không ở URL/thân, lọc khóa khỏi lỗi và log, **kiểm duyệt đóng-an-toàn** (7 dạng lỗi/sai dạng), ảnh bị đánh dấu không được lưu, sổ cái ghi trước khi gọi, một lỗi là dừng không thử lại, dry-run không gọi mạng/không ghi, cờ boolean có giá trị bị từ chối, duyệt tay (cần người xem, chỉ ảnh đang chờ và đã qua kiểm duyệt, tên tệp lạ bị từ chối), kiểm đường dẫn ngay đầu.
- Chạy CLI thật không có khóa: dry-run (3 ảnh: cat, dog, ball), `--run` thiếu khóa, đường dẫn ngoài thư mục cho phép, duyệt khi chưa có bản kê đều đúng, không có lời gọi mạng. **Lớp CLI `img-openai.mjs` (đọc tệp env, ghi/sao tệp thật, mã thoát) không có test tự động.**
- Chèn lỗi thử 28 chỗ có nghĩa (khóa lộ ở lỗi/log, kiểm duyệt mở khi lỗi, bỏ kiểm phản hồi, lưu ảnh dù bị đánh dấu, bỏ ghi sổ cái trước, bỏ dừng sau lỗi, biên trần, bỏ điều kiện duyệt, tên tệp, người xem, cờ boolean, hash ảnh, sinh lại ảnh đã duyệt, xóa ảnh cũ, lỗi ghi bản kê, danh sách trắng mô hình, hạn chế thư mục ra, thân lỗi 401/403...): đều làm test đỏ sau khi thêm test cho các chỗ sống sót; `security-auditor` và `reviewer` đã rà và các điểm TRUNG BÌNH/THẤP đáng sửa đã sửa (một test «sổ cái ghi trước» ban đầu không chứng minh được điều đó vì không ghi lời gọi API; nay đã so thứ tự với lời gọi của từng ảnh).

## Giới hạn, chưa kiểm chứng

- **Hình dạng API (địa chỉ, tên mô hình `gpt-image-1`, tham số `quality`, `size`, định dạng phản hồi `b64_json`, mô hình `omni-moderation-latest` nhận cả ảnh) viết theo hiểu biết của tôi, chưa kiểm với API thật** và không có tài liệu trực tuyến trong phiên này; tài khoản có thể cần xác minh tổ chức để dùng mô hình ảnh. Nếu API trả lỗi 4xx, báo lại để sửa. Chi phí mỗi ảnh và việc kiểm duyệt có tính phí hay không **chưa biết**.
- Chưa biết: chất lượng thẩm mỹ, độ phù hợp trẻ em, thời gian sinh (đã để hạn 90 giây mỗi lần), kích thước tệp.
- Chưa có tích hợp vào theme/renderer; ảnh chỉ là thử nghiệm. Hai theme hiện dùng SVG vẽ bằng code, không dùng ảnh ngoài.
- Không thêm thư viện nào (dùng `fetch`, `node:fs`, `node:path`, `node:crypto`).
- **Giới hạn của chốt chặn (chưa sửa, chỉ ghi chú):** trần chi phí chỉ là rào chắn cho người dùng trung thực (bạn tự nâng được `--max-images`, `--monthly-cap`, đổi `--ledger=`); hai tiến trình chạy song song có thể đếm thiếu sổ cái và ghi đè bản kê; kiểm đường dẫn so sánh theo chữ, không theo `realpath` (liên kết tượng trưng trong thư mục chờ duyệt có thể trỏ ra ngoài); `--reviewer` chỉ là tên tự khai, `approved.json` không phải bằng chứng an toàn với bên thứ ba; kiểm duyệt tự động không thay mắt người.
