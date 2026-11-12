# Khảo sát kho asset và độ phủ

> **Nguồn**: số đo của phiên chính ngày 2026-11-12 trên thư mục asset đã tải (ngoài repo), `frontend/src/utils/assetResolver.ts`, `docs/Kịch bản/Kịch bản tạo game/100 kịch bản tạo game.md`, và danh sách thư mục của repo `microsoft/fluentui-emoji` trên GitHub (chỉ đọc tên thư mục).
> **Cập nhật**: 2026-11-12
> **Liên kết liên quan**: [[Tìm và chọn assets phù hợp cho game]], [[Tiêu chuẩn Đồ họa và Asset Pipeline]], [[Trải nghiệm cho trẻ]]

Kết quả giai đoạn 1 (phân loại gói) và giai đoạn 2 (đo độ phủ) của nhóm "thiếu asset". Mục đích: biết kho hiện tại và các gói đã tải lấp được bao nhiêu nhu cầu thật, trước khi tải thêm hay gắn nhãn hàng loạt. Đây là **số đo thô bằng script**, đọc kỹ mục "Giới hạn" trước khi dùng số liệu.

## 1. Giai đoạn 1: Phân loại gói đã tải

Thư mục đã tải có **27.667 file** (21.049 PNG, 5.358 SVG, 653 file âm thanh) trong 69 thư mục gói (68 gói Kenney và một gói điều khiển cảm ứng `mobile-controls-1`). Phần lớn không phải hình minh họa cho nội dung học.

| Loại | Gói (số hình) | Dùng được cho minh họa nội dung? |
|---|---|---|
| **Minh họa, tên file rõ nghĩa** | `animal-pack-remastered` (31 con vật, 8 kiểu: tròn, vuông, có viền hay không), `cube-pets` (24 con vật), `fish-pack_2` (cá nhiều màu, có cả nền), `flag-pack` (232 lá cờ, tên theo mã ISO: `VN.png`, `TH.png`), `pixel-vehicle-pack` (80: xe, nhân vật, đồ vật, pixel), `shape-characters` (213 nhân vật ghép mặt), `medals` (32), `boardgame-pack` và `board-game-icons` (xúc xắc, quân cờ) | **Có**, đây là nhóm đi tiếp |
| **Minh họa, tên file vô nghĩa** | `generic-items` (332, tên `genericItem_color_137`), `pixel-platformer-food-expansion` (116 hình đồ ăn, tên `tile_0032`), `tiny-*`, `pico-8-city`, `pixel-platformer`, `rpg-base`, `roguelike-characters`, `ui-pack-pixel-adventure` | Chưa: cần mô hình nhìn hình để gắn nhãn, tốn công. Tạm bỏ |
| **Nền, cảnh, ô lát** | `background-elements` (và bản remastered), `sketch-desert`, `isometric-*`, `road-textures`, `skyboxes` (và bản không gian), `planets` (`planet00`...), `pattern-pack-*`, `platformer-bricks`, `block-pack`, `toy-brick-pack`, `new-platformer-pack`, `platformer-pack-remastered`, `simplified-platformer-pack` | Dùng cho nền và trang trí, không dùng làm hình đáp án |
| **Hiệu ứng** | `splat-pack`, `yellow-paint-pack`, `light-masks`, `googly-eyes` | Trang trí |
| **Giao diện và điều khiển** | `crosshair-pack`, `cursor-pack`, `cursor-pixel-pack`, `input-prompts` (2 gói), `mobile-controls`, `ui-pack` (và các bản mở rộng), `pixel-ui-pack`, `puzzle-pack-1`, `board-game-info`, `development-essentials`, `kenney-fonts` | **Loại** (khoảng 14.000 file) |
| **Không phù hợp lứa tuổi** | `desert-shooter-pack`, `tower-defense`, `tiny-battle` (đồ họa bắn súng, chiến đấu) | **Loại** |
| **Âm thanh** | `casino-audio`, `digital-audio`, `impact-sounds`, `interface-sounds`, `music-jingles`, `rpg-audio`, `ui-audio`, `voiceover-pack-fighter` | Ngoài phạm vi bước này |

**Kết luận giai đoạn 1.** Gói minh họa có nghĩa rõ **chỉ khoảng vài trăm hình có dùng được** (con vật, cờ, một ít xe và đồ vật), không phải 27 nghìn. Phần còn lại là giao diện, nền, ô lát và hiệu ứng.

**Giấy phép.** **Giấy phép (đã đọc file giấy phép của cả 69 gói):** 68 gói ghi CC0 (Creative Commons Zero), dùng được cho mục đích cá nhân, giáo dục và thương mại, ghi nguồn Kenney chỉ khuyến khích, không bắt buộc. 1 gói là ngoại lệ: `isometric-roads` dùng `readme.txt` cũ ("dùng được cho dự án cá nhân và thương mại, ghi nguồn là tùy chọn"), không ghi chữ CC0; gói này thuộc nhóm nền nên không ảnh hưởng. Gói `mobile-controls-1` không phải của Kenney theo tên thư mục nhưng có `License.txt` ghi CC0. Chưa kiểm xem tác giả khác ngoài Kenney có trong từng gói không.

## 2. Giai đoạn 2: Đo độ phủ

### 2.1 Cách đo

1. Rút **87 danh từ cần hình** từ các kịch bản có nội dung cần minh họa trong 100 kịch bản (con vật, bộ phận cơ thể, đồ ăn, phương tiện, đồ vật, thiên nhiên, hành tinh, nghề nghiệp, quần áo, cờ, hoạt động). Danh sách do phiên chính chọn tay, kèm số kịch bản.
2. Đối chiếu từng từ với `ASSET_CATALOG` (bỏ nhóm chủ đề nền, còn **96 hình**: 10 số, 14 trái cây, 25 con vật, 47 đồ vật) bằng khớp **chặt** theo từ khóa.
3. Với từ chưa có, tìm theo tên file trong các gói Kenney có tên rõ nghĩa.
4. Đối chiếu với danh sách thư mục của bộ Fluent Emoji đầy đủ trên GitHub (đọc nửa đầu theo thứ tự chữ cái, nửa sau kiểm từng tên, xem giới hạn).

### 2.2 Kết quả (87 từ)

| Tình trạng | Số từ |
|---|---|
| **Đã có** trong danh mục hiện tại | 31 |
| **Chưa có, nhưng có trong gói đã tải** | 12 |
| **Thiếu** cả hai | 44 |

Gần **một nửa nhu cầu (44 trên 87) không có ở đâu trong những gì đang có**. Kenney giúp được chủ yếu ở nhóm con vật và cờ.

**Theo nhóm:**

| Nhóm | Đã có | Có trong gói đã tải | Thiếu |
|---|---|---|---|
| Con vật (16) | 10 | voi, gà, bò, lợn, khỉ, hươu cao cổ (từ `animal-pack` hoặc `cube-pets`) | 0 |
| Bộ phận cơ thể (10) | 6 | 0 | đầu, vai, đầu gối, ngón chân |
| Đồ ăn (12) | 3 (táo, chuối, cam) | 0 | cà rốt, phô mai, bánh chưng, rau muống, cà tím, bánh rán, pizza, bánh trung thu, mâm ngũ quả |
| Phương tiện (7) | 2 | xe tải | xe máy, xe ba gác, tàu hỏa, xe đua |
| Đồ vật (13) | 5 | xúc xắc | trống, cân, khối gỗ, bàn phím, màn hình, loa, nốt nhạc |
| Thiên nhiên (8) | 4 | 0 | cây lúa, hoa đào, mưa, nước đá |
| Không gian (5) | 0 | 0 | sao Thủy, sao Kim, Trái Đất, sao Hỏa, phi hành gia |
| Nghề nghiệp (5) | 0 | công an (`pixel-vehicle-pack`, là xe cảnh sát) | bác sĩ, lính cứu hỏa, nông dân, cô giáo |
| Quần áo (3) | 0 | 0 | áo ấm, mũ len, găng tay |
| Cờ (2) | 0 | cờ Việt Nam, cờ Thái Lan (`flag-pack`) | 0 |
| Hoạt động hằng ngày (3) | 0 | 0 | đánh răng, ăn sáng, thức dậy |

### 2.3 Fluent Emoji đầy đủ có lấp được chỗ thiếu không

Đã đối chiếu 44 từ thiếu với bộ Fluent Emoji đầy đủ trên GitHub: đọc danh sách thư mục nửa đầu (A đến "Person fencing"), rồi kiểm từng tên cho các từ còn lại ở nửa sau (Pizza, Police officer, Teacher, Racing car, Toothbrush, Sheaf of rice, Scarf, Snowman, Shower, Rocket, Ringed planet, Student, Tractor, Rainbow, Police car: **cả 15 đều tồn tại**). Mỗi biểu tượng có 4 kiểu (3D, Color, Flat, High Contrast); biểu tượng người có thêm các tông da.

| Mức | Số từ | Từ |
|---|---|---|
| **Có đúng hình** | 26 | cà rốt, phô mai, cà tím, pizza, bánh trung thu, xe máy, tàu hỏa, xe đua, trống, cân, bàn phím, màn hình (Desktop computer), loa, nốt nhạc, mưa, nước đá, Trái Đất (quả địa cầu), phi hành gia, bác sĩ (Health worker), nông dân, lính cứu hỏa, cô giáo (Teacher), áo ấm (Coat), găng tay, đánh răng (Toothbrush), ma |
| **Có hình gần đúng** | 6 | xe ba gác (Auto rickshaw), khối gỗ (Brick), cây lúa (Sheaf of rice là bó lúa), hoa đào (Cherry blossom), ăn sáng (Pancakes, Bread), thức dậy (Bed, Alarm clock) |
| **Không có** | 12 | bánh chưng, bánh rán, rau muống, mâm ngũ quả, mũ len, sao Thủy, sao Kim, sao Hỏa, và 4 bộ phận cơ thể: **đầu, vai, đầu gối, ngón chân** |

Ghi chú:
- **Lỗi của kịch bản 004 (nối từ với bộ phận cơ thể) không lấp được chỉ bằng Fluent Emoji.** Bộ emoji chỉ có tai, mắt, mũi, miệng, chân, tay, răng, không có đầu, vai, đầu gối, ngón chân. Cần vẽ riêng, nguồn khác, hoặc để thẻ chữ.
- **Hành tinh:** Fluent chỉ có Ringed planet (sao Thổ). Gói Kenney `planets` có các quả cầu màu `planet00`...`planet09` nhưng không đặt tên; có thể dùng làm hình rồi gắn nhãn tên.
- **Món Việt** (bánh chưng, bánh rán, rau muống, mâm ngũ quả) không có ở nguồn nào đã khảo sát.
- Con ma (kịch bản 084) có hình nhưng là chủ đề nhạy cảm, không nên đưa vào kho cho trẻ.

## 3. Phát hiện kèm theo: bỏ dấu làm nhiều từ trùng nhau (đã sửa nhận định ngày 2026-11-12)

**Nhận định ban đầu của mục này là sai và đã được sửa.** Bản đầu viết rằng "đầu" khớp nhầm hình dâu tây do `normalizeKeyword` bỏ dấu. Kiểm lại thì **không đúng**: các từ khóa của dâu tây là "dau tay", "qua dau", "trai dau", không có "dau" trơ trọi, và bộ khớp so nguyên từ nên văn bản "đầu" không khớp dâu tây. Kết quả "đầu khớp dâu tây" xuất phát từ **luật khớp trong script đo của tôi** (cho phép tiền tố "quả", "trái"), không phải từ `assetResolver`. Lỗi nằm ở script, không ở code sản phẩm.

Phần có thật: `normalizeKeyword` bỏ dấu và đổi "đ" thành "d", nên **"đầu", "dâu", "đau" đều thành "dau"**, "vai"/"vải"/"vài" thành "vai", "trong"/"trống"/"trồng" thành "trong". Hệ quả: **không thể dùng từ khóa trơ trọi cho những từ này** (hình sẽ gắn nhầm vào mọi câu chứa từ trùng âm). Đã áp dụng ở giai đoạn 3: hình cái đầu chỉ nhận "cái đầu", "đầu người", "head"; trống chỉ nhận "cái trống", "drum"; vai chỉ nhận "đôi vai", "bó vai". Vì vậy chữ "đầu" đứng một mình **không** tự ra hình cái đầu (mơ hồ giữa đầu, dâu, đau); trường hợp thường gặp là từ tiếng Anh "head" (kịch bản 004) đã được gắn hình.

Phát hiện có sẵn từ trước (không do giai đoạn 3): từ khóa trơ trọi "khi" của `jungle-monkey` khiến mọi văn bản chứa "khi" ("khi nào em về") bị gắn hình con khỉ. Chưa sửa.

## 4. Giới hạn của số đo

- **Danh sách 87 từ là do người viết chọn tay**, không phải trích tự động đầy đủ. 100 kịch bản là bộ thử hệ thống, khoảng nửa số kịch bản kiểm lỗi hoặc tình huống đặc biệt nên không cần hình. Số 87 phản ánh các chủ đề của riêng bộ này, chưa phải toàn bộ chương trình mầm non đến lớp 5.
- **Khớp theo từ khóa** có thể sót đồng nghĩa (đếm thiếu "đã có") và có thể khớp nhầm (đếm thừa). Đã siết luật khớp để giảm nhầm, và đã gỡ một khớp nhầm đã biết ("đầu"), nhưng chưa kiểm từng dòng.
- **Gói Kenney được đối chiếu theo tên file tiếng Anh** (ví dụ `elephant`); tên file cạnh nhau cùng gói có thể là vật khác nghĩa ("police" là xe, không phải người).
- **Không đọc được toàn bộ danh sách Fluent Emoji**: danh sách thư mục bị cắt ở chữ P, còn API GitHub gọi không đăng nhập bị từ chối (403), nên nửa sau chỉ kiểm bằng từng tên cụ thể (15 tên). Một biểu tượng khác ở nửa sau có thể có mà chưa được tìm.
- **"Có đúng hình" theo tên emoji, chưa xem hình**: một số hình có thể kém rõ ở cỡ nhỏ hoặc không hợp lứa tuổi (ví dụ Health worker là người trong áo blouse chứ không có ống nghe).
- Đã xem hình mẫu các gói (mục 6) nhưng chỉ vài hình mỗi gói, ở cỡ thu nhỏ. Chưa xem hình trong game thật. Đã đọc giấy phép từng gói (mục 1).

## 5. Việc tiếp theo

1. ~~Đọc nốt Fluent Emoji~~: đã làm ở mục 2.3. Nếu cần chắc hơn, tải về một bản sao repo Fluent Emoji (cần bạn đồng ý) để tìm theo tên trên máy.
2. ~~Xem thử hình~~: đã làm ở mục 6. Còn lại: thử đặt vài hình vào một màn chơi thật để quyết định phong cách (mục 6.3).
2b. **Xem thử hình (bản gốc)** vài gói minh họa (đặc biệt `animal-pack` kiểu tròn, `cube-pets`) cạnh Fluent hiện có để chọn phong cách (xem câu hỏi mở ở [[Tìm và chọn assets phù hợp cho game]]).
3. **Quyết định cách lấp khoảng trống không có nguồn**: bộ phận cơ thể (đầu, vai, đầu gối, ngón chân), món Việt, hoạt động hằng ngày: vẽ riêng, nguồn khác, hay dùng thẻ chữ khi thiếu hình.
4. ~~Sửa lỗi khớp "đầu" và "dâu"~~: không có lỗi này ở code (xem mục 3); cân nhắc sửa từ khóa "khi" trơ trọi của `jungle-monkey`.
5. Mở rộng danh sách từ cần hình theo chương trình học thay vì chỉ theo 100 kịch bản, trước khi quyết định tải thêm.

## 6. Xem hình các gói (so phong cách)

Đã dựng ảnh tổng hợp các hình mẫu (con vật, cờ, cá, hành tinh, xe, huy chương, xúc xắc) của các gói Kenney có tên rõ nghĩa, và so với các hình Fluent đang dùng trong `frontend/public/assets/fluent`. Ảnh chỉ nằm ở thư mục tạm, không đưa vào repo.

### 6.1 Nhận xét từng gói

| Gói | Nhận xét về hình | Hợp game cho trẻ? |
|---|---|---|
| `animal-pack`, kiểu Round | Mặt tròn, mắt to, màu phẳng đậm, hình khối đơn giản; nhất quán trong cả bộ 31 con. Rõ ở cỡ nhỏ | **Rất hợp** |
| `animal-pack`, Round (outline) | Như trên, thêm viền sẫm mảnh quanh hình, gần phong cách "Candy Vector" đang dùng cho trái cây và con vật cũ hơn | **Rất hợp**, dễ hòa với phần có viền đậm |
| `animal-pack`, Square | Cùng nhân vật nhưng thân vuông | Hợp, ít cần |
| `cube-pets` | Dạng khối 3D nhỏ, mềm nhưng chi tiết nhỏ, tương phản yếu, khác phong cách phẳng | Kém hơn, dễ lệch phong cách |
| `flag-pack` | Cờ rõ ràng, chính xác, đủ 232 nước | **Hợp** (cờ Việt Nam, Thái Lan đã kiểm có) |
| `fish-pack` | Cá nhiều màu, phẳng, rõ; cùng gia đình với animal-pack | Hợp |
| `planets` | Quả cầu hành tinh có họa tiết, đẹp, không đặt tên | **Hợp** làm hình sao Thủy, Kim, Hỏa nếu tự gắn nhãn |
| `pixel-vehicle-pack` | Pixel art răng cưa | Lệch phong cách với phần còn lại, nên bỏ |
| `medals` | Huy chương rõ, dùng cho phần thưởng | Hợp |
| `shape-characters` | Thân hình khối đơn sắc, ghép với mặt | Dùng làm nhân vật, không phải hình đáp án |
| Fluent đang dùng | Biểu tượng emoji nhỏ, nhiều chi tiết, nét mảnh, màu dịu | Hợp cho vật thể thường gặp, khác phong cách với animal-pack |

### 6.2 Điều rút ra

- **Kho đang có ít nhất 3 họ phong cách**: Fluent Emoji (mảnh, nhiều chi tiết), "Candy Vector" của các hình con vật, trái cây, số (viền đậm, thấy trong ảnh chụp thử nghiệm lần 3), và nếu thêm Kenney sẽ là họ thứ ba hoặc thứ tư. Một game trộn các họ này sẽ thiếu nhất quán.
- **`animal-pack` Round (outline) gần với Candy Vector hơn Fluent**, và hình rõ hơn Fluent ở cỡ nhỏ. Nếu muốn một phong cách đồng nhất cho trẻ nhỏ thì đây là ứng viên tốt cho nhóm **con vật**.
- **Fluent vẫn là nguồn rộng nhất cho vật thể thường gặp** (26 từ thiếu có đúng hình, xem mục 2.3), nên không thể thay bằng Kenney.
- **Điều chỉnh khuyến nghị trước đây** ("Fluent làm chính, Kenney bổ sung"): sau khi xem hình, đề xuất tinh chỉnh thành **hai họ theo chủ đề**: con vật dùng Kenney `animal-pack` (và cá, hành tinh, cờ, huy chương), vật thể thường gặp dùng Fluent. Mỗi game khóa **một họ** theo chủ đề chính; game trộn cả hai thì cần xử lý hòa nhất quán (xem 6.3).

### 6.3 Cách hòa các họ phong cách (chưa thử)

Ý tưởng cần thử trước khi tin: đặt cho **mọi hình** một lớp nhận diện chung khi vẽ, như viền trắng quanh hình và bóng đổ nhẹ ("miếng dán"), để hình từ nguồn khác nhau trông cùng một bộ. Lớp này làm một lần ở phần vẽ hình, không phải sửa từng hình. Chưa thử, chưa biết có đủ để che sự khác biệt giữa nét mảnh của Fluent và nét đậm của Kenney không.

### 6.4 Giới hạn

- Ảnh so sánh chỉ gồm vài hình mỗi gói, ở cỡ thu nhỏ; hình Fluent là SVG được vẽ ở kích thước gốc nhỏ nên trông nhỏ hơn thực tế trong game.
- Chưa đặt hình vào một màn chơi thật nên chưa biết độ rõ ở cỡ thật, trên nền thật.
- Chưa xem các gói khác (ví dụ `toy-brick-pack`, `platformer-pack-remastered`).

### 6.5 Thử trong game thật (2026-11-12)

Đặt thử 6 hình vào màn Nối cặp ở trang thử `/dev/canvas-sandbox` (chỉ chạy khi phát triển, không cần đăng nhập): ba con vật Kenney `animal-pack` kiểu Round (outline) (gấu, lợn, voi), hai hình Fluent đang dùng (bánh mì, xe buýt), một hình "Candy Vector" của repo (con vịt). Việc thử chỉ thay tạm dữ liệu mẫu của trang thử và đã hoàn lại; không đổi code sản phẩm.

Nhận xét ở cỡ thẻ thật (hình nhỏ cạnh chữ):

- **Trộn ba họ trong cùng một màn nhìn vẫn chấp nhận được**, vì mỗi hình đứng riêng trong ô riêng. Chưa thấy lệch đến mức làm hỏng màn chơi.
- **Hình lệch nhất là con vịt Candy Vector**: viền đen dày, nhìn nghiêng, màu sẫm. Hai họ còn lại (Kenney mặt tròn, Fluent mềm) hòa với nhau tốt hơn. Nghĩa là **họ cần cân nhắc bỏ dần là họ cũ có viền dày**, không phải Fluent.
- **Con vật Kenney nổi bật hơn vật thể Fluent**: mặt to, mắt to, màu đậm chiếm gần hết ô, trong khi bánh mì và xe buýt nhỏ và nhạt hơn. Trong game nối con vật với đồ vật, trẻ có thể bị hút về phía con vật. Cần kiểm tra thêm nếu trộn hai nhóm trong một màn.
- Mọi hình tải và hiện đúng; ảnh PNG Kenney và SVG Fluent dùng chung được qua `imageUrl` mà không cần sửa code.

Chưa thử: màn Trắc nghiệm với hình minh họa lớn của câu hỏi (khác biệt phong cách sẽ rõ hơn ở cỡ lớn), nền khác (đại dương, vũ trụ), và lớp "miếng dán" chung ở 6.3. Mới là một màn, một cỡ thẻ.

### 6.6 Thử Trắc nghiệm (2026-11-12, chưa xong)

Đặt thử câu "Đây là con gì?" với hình minh họa lớn là con voi Kenney, ba đáp án là hình voi Kenney, vịt Candy Vector, xe buýt Fluent (trộn họ). Đã hoàn lại thay đổi tạm.

- **Hình trong bong bóng đáp án nhỏ** (khoảng 56px trên bong bóng 160px) nên khác biệt phong cách giữa ba họ **ít lộ**; chữ trên nhãn mới là phần nổi bật.
- **Hình minh họa lớn của câu hỏi** mới là chỗ phong cách lộ rõ. Con voi Kenney màu xám nhạt trên nền trời xanh nhạt, **độ tương phản vừa phải**, kém nổi hơn các con vật màu đậm (lợn, bò, gấu).
- **Chưa thử:** câu thứ hai cùng một họ (bấm chuyển bộ câu hỏi chưa đổi được trong phiên này), nền đại dương và vũ trụ, lớp "miếng dán" chung.

## 7. Quyết định và việc đã làm sau khảo sát (2026-11-12)

**Bạn đã chốt:**
- Phong cách theo **hai họ theo chủ đề**: con vật dùng Kenney `animal-pack`, vật thể dùng Fluent Emoji kiểu Flat; mỗi game khóa một họ.
- Tải Fluent Emoji về máy để lấy các từ đã xác nhận.
- 12 từ không có nguồn nào: tự vẽ, mỗi từ vẽ theo họ của hình đứng cạnh nó (đề xuất của phiên chính, đã được chốt).

**Đã làm:**
- **Tải 32 biểu tượng Fluent kiểu Flat** (180KB, nguồn `microsoft/fluentui-emoji`, giấy phép MIT) vào `D:\Data\tlcn_kltn\game\fluent_download\flat`. Gồm 25 từ có đúng hình và 7 hình gần đúng. **Không tải biểu tượng con ma** (chủ đề nhạy cảm). Bản gốc tải về nằm ở thư mục trên; **các hình đã được đưa vào repo ở giai đoạn 3 (mục 8)**.
- **Tự vẽ 9 hình SVG** vào `D:\Data\tlcn_kltn\game\custom_drawn`, bản gốc ở thư mục trên; **đã đưa vào repo ở giai đoạn 3 (mục 8)**:
  - Fluent Flat đơn giản (màu phẳng, ít chi tiết, không viền): bánh chưng, bánh rán, rau muống, mâm ngũ quả, mũ len.
  - Kenney (bé hoạt hình tròn trịa, viền sẫm mảnh): đầu, vai, đầu gối, ngón chân, vẽ thành 4 biến thể của cùng một bé, mỗi biến thể có vòng cam đứt nét quanh đúng bộ phận.
- **Ba hành tinh** (sao Thủy, Kim, Hỏa) không vẽ: dùng gói Kenney `planets` rồi gắn nhãn tên.

**Đánh giá hình vừa vẽ** (đặt cạnh Fluent và Kenney, cỡ lớn và cỡ thẻ 48px):
- Mâm ngũ quả, mũ len, rau muống hòa khá tốt với Fluent bên cạnh; bánh chưng nhận ra được.
- **Bánh rán còn yếu**: nhìn giống bánh bao hoặc bánh mì kẹp hơn là bánh rán Doraemon.
- Bé hoạt hình rõ ở cỡ lớn; ở cỡ 48px các vòng đánh dấu bộ phận nhỏ nên khó nhìn, nhất là vai.
- Bé có phong cách gần Kenney nhưng đơn giản hơn gấu và lợn của Kenney (không có mắt to và đổ màu đậm kín khung).
- **Đây là hình vẽ bằng mã SVG đơn giản, chưa ngang họa sĩ.** Cần người duyệt từng hình trước khi đưa vào kho, và cần thử trong màn chơi thật.

**Việc tiếp theo (đã làm):** giai đoạn 3, xem mục 8.

**Cập nhật bánh rán (2026-11-12):** đã vẽ lại. Bản đầu nhìn nghiêng giống bánh bao hoặc bánh mì kẹp; bản mới nhìn từ trên xuống, mép nhạt, giữa nâu vàng, cắn mất một miếng lộ nhân đậu đỏ. Giờ đọc được là bánh tròn có nhân, không còn giống bánh mì kẹp, nhưng vẫn **giống bánh quy hoặc bánh kếp có vết cắn** hơn là bánh rán Doraemon đúng nghĩa (không có hai lớp bánh kẹp nhân). Cần người duyệt xem có chấp nhận không.

**Đã chấp nhận (2026-11-12):** người dùng chấp nhận bánh rán bản vẽ lại. Cả 9 hình tự vẽ coi là đạt để đưa vào giai đoạn 3.

## 8. Giai đoạn 3: đã đưa hình vào kho (2026-11-12, nhánh `dev`)

**Đã làm (52 mục mới trong `ASSET_CATALOG`):**
- 32 hình Fluent Flat (đồ ăn, phương tiện, đồ vật, thời tiết, nghề nghiệp, quần áo), chép vào `frontend/public/assets/fluent/`.
- 9 hình tự vẽ vào `frontend/public/assets/custom/` (4 bộ phận cơ thể, bánh chưng, bánh rán, rau muống, mâm ngũ quả, mũ len).
- 6 con vật Kenney (voi, hươu cao cổ, khỉ, bò, gà, lợn), 2 lá cờ (Việt Nam, Thái Lan), 3 hành tinh, vào `frontend/public/assets/kenney/`.
- `backend/src/main/resources/assets/game-asset-catalog.json` sinh lại từ `ASSET_CATALOG` (bỏ nhóm chủ đề): **96 lên 148 hình**; giữ nhãn đã sửa tay của `obj-ball`.
- `frontend/public/assets/LICENSES.md` bổ sung nguồn và giấy phép các thư mục mới.

**Quy tắc từ khóa đã áp dụng:** không dùng từ khóa trơ trọi dễ trùng âm khi bỏ dấu ("trong", "vai", "khi", "bo", "ga", "lon", "gach", "mua", "lua", "dau", "giao vien"). Vì vậy "sao Thủy", "sao Kim", "sao Hỏa" khớp hành tinh chứ không phải ngôi sao, "head" ra hình cái đầu, "găng tay" ra găng tay chứ không phải bàn tay.

**Kiểm chứng:** có test mới ở `assetResolver.catalog.test.ts` (hành tinh, cơ thể, găng tay, từ trùng âm, mọi tệp có thật). Backend `GameAssetCatalogTest` (tệp nào trong danh mục cũng có thật) qua; frontend build qua.

**Sửa sau khi `reviewer` kiểm (cùng ngày):**
- Từ khóa 'hen' của con gà trùng "hẹn" ("hẹn gặp bạn" ra hình gà): đã bỏ. Từ khóa 'voi', 'heo' bị lặp ở mục mới: đã bỏ.
- **6 con vật Kenney giờ có danh sách từ khóa rỗng**: các mục chủ đề có sẵn (OpenMoji) đã chiếm từ khóa "con bò", "con gà"... nên bản Kenney không bao giờ được chọn qua từ khóa. Chúng chỉ dùng qua **đường AI** (danh mục backend không có nhóm chủ đề, AI chọn theo id). Frontend khi tự đoán hình vẫn dùng bản chủ đề cũ.
- Test mới bắt từ khóa đơn ngắn ở hình mới và ca "hẹn gặp bạn"; đổi tên và sửa đường dẫn tệp test cho chạy được từ mọi thư mục.
- Ba hình hành tinh thu nhỏ từ 1280px xuống 256px (khoảng 300KB còn 60 đến 80KB mỗi hình).
- Còn trùng từ khóa với mục có sẵn nhưng vô hại: `fluent-food-carrot` với `farm-carrot`, `fluent-object-earth` với `space-planet`.

**Hạn chế đã biết:**
- Các hình **gần đúng** gắn từ khóa gần nghĩa: xe ba gác dùng xe lam ba bánh, khối gỗ dùng viên gạch, cây lúa dùng bó lúa, hoa đào dùng hoa anh đào, ăn sáng dùng bánh kếp, thức dậy dùng đồng hồ báo thức.
- Hình **hành tinh** là quả cầu họa tiết, đặt tên theo màu gần đúng (sao Thủy xám xanh, sao Kim nâu vàng, sao Hỏa đỏ cam), không phải ảnh thật.
- Từ khóa tiếng Việt trơ trọi vẫn có thể gắn nhầm ở các mục có sẵn (ví dụ "khi" của con khỉ); chưa sửa.
- Chưa có **bước truy xuất danh sách ngắn** (giai đoạn 4): prompt vẫn đưa cả danh mục vào, nay là 148 dòng.
- Chưa chạy lại kịch bản thật (giai đoạn 5), chưa xem hình mới trong màn chơi thật sau khi vào danh mục.

## 9. Giai đoạn 5: chạy lại kịch bản thật (2026-11-13)

Chạy kịch bản 001, 003, 004 qua giao diện thật sau giai đoạn 3. Kết quả chi tiết ở `Thử nghiệm lần 4/kết quả.md` trong thư mục từng kịch bản (`docs/Kịch bản/Kịch bản tạo game/`). Thư mục `docs/Kịch bản/Kịch bản tạo game/` bị `.gitignore` chặn nên **các kết quả này chỉ lưu cục bộ trên máy chạy, không nằm trong repo** (các liên kết tới `Thử nghiệm lần 4`, `5`, `6` trong trang này chỉ dùng được trên máy đó).

**Điều kiện chạy (không so sánh trực tiếp được với lần 3):**
- Mô hình `gemini-3-flash-preview` (dùng ở lần 3) trả **503 UNAVAILABLE "high demand"** suốt buổi chạy; backend đặt `maxRetries(0)` nên báo lỗi ngay, giáo viên thấy "Trợ lý AI trả lời quá lâu".
- `gemini-3.5-flash` chậm (12 đến 52 giây) và hết giờ chờ ở bước sinh game. `gemini-2.5-flash` đã bị Google ngừng cấp cho tài khoản mới (404).
- Kết quả dưới đây dùng **`gemini-3.1-flash-lite`** (nhanh và ổn định, nhưng nhẹ hơn): một số lỗi chọn hình có thể do mô hình, chưa kiểm với mô hình lần 3.

| KB | Kết quả | Đánh giá |
|---|---|---|
| 004 Bộ phận cơ thể | AI chọn đúng cả 6 hình, gồm 4 hình tự vẽ mới (đầu, vai, đầu gối, ngón chân) | **Đ** |
| 001 Đếm vịt | Mô tả "3 con vịt" nhưng hình là **thẻ số 3**: không có gì để đếm, hình lộ đáp án | **G** (kém lần 3) |
| 003 Vần an, ăn, ân | Hết hình đoán bừa, lựa chọn thiếu hình hiện thẻ chữ; nhưng "bàn" ra quyển sách, "khăn" ra cái ô, từ vô nghĩa gắn hình cái kéo | **S** |

**Ba vấn đề rút ra:**
1. **AI chọn hình số thay vì hình vật** ở câu đếm. Hướng xử lý: dặn trong prompt, thêm luật Lớp 2 bắt hình thẻ số trùng đáp án.
2. **AI chọn hình gần giống thay vì bỏ trống** khi kho thiếu hình đúng nghĩa (bàn, khăn). Hướng xử lý: bổ sung hình thiếu, siết luật bỏ trống, bỏ từ vô nghĩa khỏi lựa chọn.
3. **Hình tự vẽ "đầu" và "vai" khó phân biệt ở cỡ thẻ**: chỉ khác vòng đánh dấu nhỏ. Lỗi do hình vẽ, không do AI. Hướng xử lý: phóng to, làm đậm vòng, hoặc cắt cận cảnh.

Hai vấn đề đầu chính là loại vấn đề giai đoạn 4 nhắm tới (AI chọn hình), nhưng với 148 hình thì không phải do prompt quá dài mà do **AI không tuân luật chọn hình**; bộ lọc danh sách ngắn sẽ không tự sửa chúng.

**Chưa làm:** chạy lại với `gemini-3-flash-preview` khi hết quá tải; xem hết các câu và màn kết quả; chạy kịch bản 002 và 007 đến 012.

## 10. Sửa lỗi hình sau thử nghiệm lần 4 (2026-11-13)

Ba lỗi lộ ra ở mục 9 đã được sửa và chạy lại trên game thật (`Thử nghiệm lần 5` cho kịch bản 1, 3, 4; `Thử nghiệm lần 6` cho kịch bản 1). Vẫn dùng `gemini-3.1-flash-lite`, nên không so sánh trực tiếp được với lần 3.

| Lỗi | Cách sửa | Kết quả trên game thật |
|---|---|---|
| AI chọn thẻ số cho "3 con vịt" (lộ đáp án) | Dặn trong prompt `ASSET_RULES`; luật Lớp 2 trong `QuizRule` bắt thẻ số trùng đáp án khi mô tả là vật cần đếm | Lần 5: hình là con vịt |
| Câu đếm vẽ 1 con, đáp án lệch ("Hai con vịt" đáp án 3) | Màn chơi nhận số viết bằng chữ; luật Lớp 2 bắt mô tả hình khác đáp án; dặn AI viết mô tả bằng chữ số | Lần 6: vẽ đủ 3 con, 5 câu đều đúng |
| Game vần: bàn ra quyển sách, từ vô nghĩa ra cái kéo, thẻ chữ ghi "Từ c... (cân)" | Thêm hình cái bàn (tự vẽ), cái khăn, đàn ghi-ta; siết luật "không chọn hình khác nghĩa"; dặn từ phải có thật; thẻ chữ hiểu kiểu "Từ c... (cân)" | Lần 5: bàn, khăn, cân, đàn, chân đều đúng hình; còn 3 hình nhiễu sai nghĩa (nhẫn, lăn, lan) |
| Hình đầu và vai giống nhau ở cỡ nhỏ | Vẽ lại: làm mờ phần còn lại của bé, chỉ bộ phận được đánh dấu giữ màu, vòng đậm hơn | Lần 5: phân biệt được đầu, vai, đầu gối ở cỡ thẻ thật |

**Đánh giá cuối:** kịch bản 1 và 4 đạt, kịch bản 3 đạt kèm vài hình nhiễu chưa đúng nghĩa.

**Hạn chế:**
- Mỗi kịch bản mới chạy **một lần** với một mô hình nhẹ; chưa chạy lại với `gemini-3-flash-preview` (mô hình của lần 3) khi hết quá tải.
- Chưa có luật máy bắt "hình khác nghĩa với từ" (chỉ có trong prompt); kho thiếu hình nhẫn, lan.
- Game vần chỉ có hình, không hiện chữ; chưa kiểm với trẻ lớp 1 có gọi đúng tên hình không.
- Các luật đếm chỉ áp dụng cho Trắc nghiệm.
