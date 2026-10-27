# SPEC giao diện – AI Game Platform

Phiên bản: 27/10/2026 · Trạng thái: đã chốt hướng, chờ triển khai theo giai đoạn

Tài liệu này gom các quyết định thiết kế giao diện phía **học sinh** và phía **giáo viên** để Claude Code (và cả nhóm) triển khai đúng. Wireframe nằm trong `docs/ui/wireframes/`.

> Cách đọc wireframe: mỗi file `*.dc.html` là một màn hình viết bằng HTML + style inline. Hãy đọc như **bản vẽ tham khảo** (bố cục, cỡ chữ, màu, khoảng cách, nội dung). Bỏ qua dòng `<script src="./support.js">`, thẻ `<x-dc>`, `<sc-for>`, `<sc-if>` và cú pháp `{{...}}`: đó là định dạng của công cụ vẽ, không phải code của dự án. Các ô viền đứt có chữ "Khu vực trò chơi" hay "Nhân vật theo theme" là chỗ chừa, không phải nội dung thật. Nếu có ảnh PNG cùng tên thì ưu tiên nhìn ảnh.

---

## 1. Quyết định đã chốt

### Phía học sinh
1. **Hai khung giao diện**: **Bé** (Mầm non, lớp 1) và **Học sinh** (lớp 2 – 5). Không làm thêm nhóm tuổi riêng; khác biệt nhỏ hơn là tham số trong hồ sơ lứa tuổi.
2. **Khung do game quyết định**, lấy từ `metadata.gradeLevel` (DSL v1.0.0). **Trẻ không có nút chuyển khung.** Giáo viên có thể ghi đè khi xuất bản (Tự động / Bé / Học sinh); giá trị ghi đè lưu ở **thông tin xuất bản**, không lưu trong JSON game.
3. **Một trình chơi duy nhất**: không làm hai ứng dụng hay hai file lớn. Khác biệt chia ba tầng: cấu hình (token, tham số) → chính sách (strategy) → hai component shell.
4. **Renderer game dùng chung** cho cả hai khung, chỉ đọc profile. Không viết `if (age === ...)` rải rác.
5. **Linh vật/nhân vật đổi theo theme của game.** Khung chỉ có chỗ chừa cho nhân vật với các trạng thái chuẩn (chào, nói, hỏi, vui, an ủi, ăn mừng). Theme chưa có nhân vật thì dùng biểu tượng nền tảng.
6. **Mầm non ở lớp = chế độ trình chiếu trên tivi**, giáo viên điều khiển bằng chuột/bàn phím (tivi không cảm ứng). Bé nói hoặc chỉ đáp án, giáo viên bấm chọn thay. Thanh điều khiển nằm dưới màn hình, tự ẩn sau 3 giây. Điều khiển bằng điện thoại của giáo viên để sau.
7. **Ở nhà**: bé chơi trên điện thoại, iPad, laptop (khung Bé); học sinh lớp 2 – 5 chơi trên điện thoại hoặc máy tính (khung Học sinh). Thiết bị chỉ đổi **bố cục**, không đổi khung.
8. **Vào game**: mỗi lần một game qua mã, QR hoặc đường dẫn. Không có danh sách game, không cần tài khoản. Học sinh dùng biệt danh, **không dùng tên thật**.
9. **Thi đấu theo phòng (lớp 2 – 5)**: câu hỏi và game hiện **trên máy từng học sinh**; tivi chỉ hiện đồng hồ, số bạn đã trả lời, bảng xếp hạng **top 5**, bục vinh danh. Thứ hạng của từng bạn chỉ hiện trên máy bạn đó. Đóng phòng thì xóa biệt danh và bảng xếp hạng, chỉ giữ số liệu tổng hợp.
10. **Phản hồi cho Bé**: luôn tích cực, sai thì gợi ý và thử lại, không có trạng thái "thua", không đếm giờ, không điểm cá nhân trên tivi.
11. **Chấm ở máy chủ.** Học sinh **không bao giờ** nhận JSON có trường đáp án [ĐA] (xem mục 5.1).
12. **Giả định chưa chốt**: bé chơi trên điện thoại thì **bắt buộc xoay ngang cho mọi loại game** ở bản đầu (màn E3 nhắc xoay máy). Để renderer tự khai báo hướng màn hình ở phiên bản sau.

### Phía giáo viên
13. **Phong cách "Lớp học ấm áp"** (mục 4): nền kem, xanh lá + vàng, màu theo môn, tiêu đề Baloo 2, khối chữ số 1 A B 2 làm họa tiết. Thay toàn bộ giao diện giáo viên hiện tại.
14. **Ba khoảnh khắc ưu tiên đánh bóng**: AI tạo game (có tiến trình từng bước + đề xuất kiểu chơi kèm lý do), soạn và xem trước, đưa vào lớp và xem kết quả.
15. **Soạn thảo 3 cột**: danh sách câu | form gọn | xem trước như học sinh (chính renderer + khung của phía học sinh, đổi được thiết bị). Tự lưu; bỏ nút "Lưu bản nháp". Thời gian và điểm đặt mặc định ở cấp game, câu nào khác mới ghi đè.
16. **Xuất bản mở hộp thoại 3 lựa chọn**: Trình chiếu trên lớp / Mở phòng thi đấu / Giao về nhà (mã, QR, link, in phiếu QR). Có tùy chọn giao diện học sinh, chủ đề hình ảnh, hạn chơi.
17. **Kết quả dẫn tới hành động**: chỉ ra câu nhiều bạn sai và lỗi hay gặp, có nút "Tạo game ôn tập" từ lỗi đó.

### Chưa làm trong đợt này
- Đổi màu phía học sinh (nhóm A – E đang xanh dương) sang cùng hệ với giáo viên: **làm sau**, nhưng code phải dùng token để đổi một chỗ.
- Bản điện thoại của các màn giáo viên mới.

---

## 2. Danh sách màn hình và wireframe

### Phía học sinh
| Mã | Màn | File | Ghi chú |
|---|---|---|---|
| A1 | Tivi lớp – chờ bắt đầu | `Tv-Lobby.dc.html` | 1280×720, thanh giáo viên |
| A2 | Tivi lớp – chơi | `Tv-Play.dc.html` | Câu trước/sau, đọc lại, cho thử lại, gợi ý, tạm dừng, kết thúc; phím ← → R |
| A3 | Tivi lớp – kết quả cả lớp | `Tv-Result.dc.html` | Không điểm từng bé |
| B1–B5 | Bé ở nhà (máy tính bảng ngang): đang tải, giới thiệu, chơi, kết quả, lỗi | `Main`, `Be-Intro`, `Be-Play`, `Be-Result`, `Be-Error` | Khóa phụ huynh: nhấn giữ 3 giây; kết quả có gợi ý cho phụ huynh |
| C1–C7 | Học sinh điện thoại: vào game, biệt danh, giới thiệu, chơi, kết quả, xem lại, lỗi | `Hs-Join`, `Hs-Nickname`, `Hs-Intro`, `Hs-Play`, `Hs-Result`, `Hs-Review`, `Hs-Error` | Xem lại chỉ có đáp án đúng (DSL chưa có trường giải thích) |
| D1–D4 | Phòng thi đấu trên tivi: phòng chờ, đang trả lời, top 5, vinh danh | `Room-Lobby`, `Room-Question`, `Room-Board`, `Room-Podium` | Giáo viên xóa được biệt danh không phù hợp |
| D5–D7 | Phòng thi đấu trên máy học sinh: chờ, sau mỗi câu, kết thúc | `Room-Wait`, `Room-Feedback`, `Room-Final` | |
| E1–E2 | Học sinh trên máy tính: vào game, chơi | `Hs-Desk-Join`, `Hs-Desk-Play` | Gộp mã + biệt danh; phím tắt Enter/R/Esc |
| E3–E5 | Bé trên điện thoại: nhắc xoay máy, chơi ngang, kết quả | `Be-Phone-Rotate`, `Be-Phone-Play`, `Be-Phone-Result` | Chừa vùng an toàn tai thỏ |

Trạng thái lỗi bắt buộc: mã sai, game chưa xuất bản/hết hạn/bị tắt, phòng đã đóng/đã bắt đầu/đủ người, mất mạng giữa chừng (giữ tiến độ, tự nối lại), âm thanh bị trình duyệt chặn (màn "chạm để bắt đầu"), máy dọc khi game cần ngang.

### Phía giáo viên (phong cách mới)
| Mã | Màn | File |
|---|---|---|
| F1 | Trang chủ: ô mô tả nhanh, "Đang diễn ra", "Lớp mình cần ôn lại", soạn dở | `A-Home.dc.html` |
| F2 | Kệ trò chơi: ảnh bìa theo môn, lọc theo môn có màu, nút chính theo trạng thái | `A-Games.dc.html` |
| F3 | Tạo game – mô tả: chọn môn/khối, gợi ý theo môn và khối, đính kèm giáo án | `A-Create.dc.html` |
| F4 | Tạo game – AI đang soạn: 5 bước + thanh tiến độ | `A-Create-Progress.dc.html` |
| F5 | Tạo game – chọn kiểu chơi: 3 đề xuất có lý do, "Phù hợp nhất" | `A-Create-Pick.dc.html` |
| F6 | Soạn thảo 3 cột | `A-Editor.dc.html` |
| F7 | Xuất bản và chia sẻ | `A-Publish.dc.html` |
| F8 | Kết quả + "Cần ôn lại" | `A-Results.dc.html` |
| F9 | Đăng nhập (có lối "Học sinh? Vào chơi bằng mã", quên mật khẩu, giữ đăng nhập) | `A-Login.dc.html` |
| F10 | Đăng ký (độ mạnh mật khẩu, "Cô dạy cấp nào?" tùy chọn) | `A-Register.dc.html` |

---

## 3. Kiến trúc frontend phía học sinh

```
src/player/
├── profile/
│   ├── types.ts              # AgeBand = 'be' | 'hocSinh'; UiProfile
│   ├── profiles.ts           # cấu hình cho từng band
│   ├── resolveUiProfile.ts   # giáo viên ghi đè → gradeLevel → mặc định (hàm thuần, có test)
│   └── UiProfileContext.tsx  # Provider + useUiProfile()
├── shells/                   # BeShell.tsx, StudentShell.tsx, PresentShell.tsx, index.ts (registry)
├── policies/                 # feedback.ts (garden | score), interaction.ts (tapToSubmit, hintAfterMs…)
├── theme/                    # theme registry: nền, nhân vật, biểu tượng tiến độ, âm thanh
├── components/               # nút, thẻ, thanh tiến độ… có variant theo profile
├── games/                    # renderer từng loại game, DÙNG CHUNG
└── pages/                    # PlayPage (/play/:shareCode), PresentPage, RoomPage…
```

- `gradeLevel` thuộc `KINDERGARTEN`, `GRADE_1` → band `be`; còn lại → `hocSinh`.
- `UiProfile` gồm tối thiểu: `tokens` (fontScale, minTouch, decoration), `interaction` (tapToSubmit, hintAfterMs, timer), `audio` (autoReadPrompt), `feedback` ('garden' | 'score'). Giá trị số chỉ là mặc định để thử, chưa kiểm chứng với trẻ.
- `hitboxScale` của DSL vẫn áp dụng trong renderer.
- **Hợp đồng khung ↔ renderer**: renderer nhận một `question` (bản đã bỏ đáp án), profile và hàm `onSubmit(answer)`; khung lo đồng hồ, điểm, phản hồi đúng/sai (theo kết quả máy chủ trả về `isCorrect`, `correctAnswer`), chuyển câu, âm thanh chung. Renderer có thể khai báo phím tắt riêng.
- Token: phần DOM dùng CSS variables; phần Konva đọc giá trị qua `useUiProfile()`.
- Theme: frontend có theme registry, mặc định chọn theo loại game + môn; giáo viên chọn theme thì lưu ở thông tin xuất bản. **Không thêm trường theme vào DSL v1.0.0.**

---

## 4. Design token (giáo viên, phong cách "Lớp học ấm áp")

| Token | Giá trị |
|---|---|
| Nền trang | `#FBF6EC` (kem) |
| Bề mặt thẻ | `#FFFFFF`, bo góc 20–30px, bóng `0 10px 26px rgba(80,55,10,0.08)` |
| Chữ chính / phụ | `#1B2333` / `#4A5568` |
| Màu chính (xanh lá) | `#0E7A57`, đậm `#0A6847`, đế nút `#095C41`, nền nhạt `#E3F3EC` |
| Màu nhấn (vàng) | `#F6B93B`, chữ trên vàng `#3B2600`, đế nút `#C98A12` |
| Viền nhạt | `#E7DCC5` |
| Toán | nền `#E3ECFD`, viền `#2F6FED`, chữ `#1F4FC4` |
| Tiếng Việt | nền `#FDEBD3`, viền `#E07B12`, chữ `#9A4A00` |
| Tiếng Anh | nền `#EEE6FC`, viền `#7A4CD9`, chữ `#5B2DB8` |
| Cảnh báo / cần ôn | nền `#FFF4E5`, chữ `#7A3E00` |
| Font | Tiêu đề **Baloo 2** (600–800), nội dung **Nunito** (600–900). Phải thử dấu tiếng Việt trước khi chốt, tự host woff2 subset latin + vietnamese |
| Nút chính | Nền màu chính, có "đế" bằng `box-shadow: 0 5px 0 <màu đậm>` |

Phía học sinh tạm dùng màu trong wireframe (xanh dương `#1F5BD8`, cam `#FF9F1C`), sẽ chuyển sang hệ trên ở đợt sau. Vì vậy **mọi màu phải lấy từ token**, không viết cứng.

---

## 5. Yêu cầu backend / API

1. **Bản game cho học sinh** (DSL mục 9): endpoint lấy game theo mã chia sẻ, **bỏ mọi trường [ĐA]**, cấp lại id lựa chọn đã xáo để không lộ đáp án qua thứ tự hay `pairId`.
2. **Phiên chơi và chấm**: tạo phiên (biệt danh, không tên thật), `POST /sessions/{id}/interactions` nộp câu trả lời theo dạng ở DSL mục 5, trả `{ isCorrect, correctAnswer }`. Ghi `attemptsCount` và **lưu cả đáp án sai** (cần cho F1 "Lớp mình cần ôn lại" và F8 "lỗi hay gặp").
3. **Thông tin xuất bản**: mã chơi, trạng thái bật/tắt, hạn chơi, `uiOverride` (auto | be | hocSinh), `themeId`.
4. **Tiến trình sinh game** cho F4: gửi sự kiện từng bước (ví dụ Server-Sent Events). Nếu chưa làm được, frontend tạm chạy theo thời gian ước tính và ghi rõ là tạm thời.
5. **Đề xuất kiểu chơi (F5)**: chưa chốt cách. Phương án rẻ: AI chỉ đề xuất kiểu + lý do, giáo viên chọn xong mới soạn nội dung. Phương án đắt: soạn sẵn cho cả 3 kiểu (gấp 3 lượt gọi mô hình).
6. **Kết quả** (F8): tổng hợp theo game và theo phiên/phòng: số lượt, tỷ lệ đúng từng câu, số lần thử, đáp án sai phổ biến.
7. **Tài khoản**: quên mật khẩu (gửi email đặt lại) – ẩn link nếu chưa có; trường tùy chọn "cấp dạy" trong hồ sơ giáo viên.
8. **Phòng thi đấu**: đồng bộ thời gian thực, phụ thuộc spike WebSocket.

---

## 6. Giai đoạn triển khai

Mỗi giai đoạn một prompt riêng, làm từng bước nhỏ, dừng chờ "duyệt".

| GĐ | Nội dung | Phụ thuộc | Xong khi |
|---|---|---|---|
| P0 | Backend: bản game cho học sinh, phiên chơi, nộp và chấm, lưu đáp án sai, thông tin xuất bản | – | Test API cho đủ 10 loại game; JSON học sinh không chứa trường [ĐA] |
| P1 | Nền tảng player: route `/play/:shareCode`, profile + resolve, hai shell, hợp đồng renderer, theme registry bản đầu, token dùng chung, adapter dữ liệu giả | P0 (hoặc dữ liệu giả) | QUIZ và MATCHING chơi được trong cả hai khung |
| P2 | Chơi cá nhân: nhóm B, C, E, đủ trạng thái lỗi | P1 | Chơi hết một game trên điện thoại, máy tính bảng, máy tính |
| P3 | Giao diện giáo viên mới F1 – F10 | P0 cho F7, F8 | Thay hết giao diện cũ, F6 xem trước bằng renderer thật |
| P4 | Trình chiếu trên lớp (nhóm A) | P1 | Giáo viên chạy hết một game trên tivi bằng chuột/bàn phím |
| P5 | Thi đấu theo phòng (nhóm D) | Spike WebSocket | Phòng 30 máy chạy ổn định |

---

## 7. Câu hỏi còn mở
1. Bé trên điện thoại: bắt buộc xoay ngang cho mọi game, hay mỗi loại game tự khai báo hướng? (Mặc định: bắt buộc ngang.)
2. F5: soạn sẵn cho 3 kiểu chơi hay chỉ đề xuất rồi mới soạn?
3. Giới hạn số phần tử cho Mầm non trên điện thoại (MEMORY_CARD tới 16 thẻ): renderer chia trang/thu nhỏ, hay backend giới hạn khi sinh?
4. Ai trong nhóm phụ trách `/play/:shareCode` và thư mục `games/`.

---

## 8. Quy tắc làm việc cho Claude Code
- Làm từng bước nhỏ, mỗi bước xong thì dừng, báo cáo (file đã sửa, lệnh đã chạy, kết quả) và chờ "duyệt".
- Không commit, không push.
- Không sửa Game JSON DSL v1.0.0, schema, prompt đang đóng băng; cần trường mới thì dừng và hỏi.
- Không thêm thư viện, font, asset khi chưa được duyệt (nêu tên, phiên bản, giấy phép, dung lượng).
- Không đụng dòng 17–20 và 25 của file log/Plan; không điền cột "Sinh viên tinh chỉnh".
- Wireframe là tham khảo; nếu thấy wireframe mâu thuẫn với DSL hoặc code hiện có, dừng và hỏi.
