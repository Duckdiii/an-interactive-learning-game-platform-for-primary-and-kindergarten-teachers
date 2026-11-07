# CPF Game v2.0.0 (game ngoài danh mục)

Trạng thái: **đặc tả đã duyệt, chờ đóng băng** (2026-11-07, kết thúc Pha 0). Backend đã có kiểm duyệt 3 lớp (`service/validation/cpf`); điều chỉnh khi cài đặt Pha 1–3 phải sửa đồng bộ các nơi ở bảng dưới.

Liên quan: `docs/superpowers/specs/2026-11-07-pipeline-v2-design.md` (thiết kế pipeline v2), `docs/game-json-dsl-v1.0.0.md` (10 loại preset, không đổi), [[Mô tả ngoài danh mục game]] (20 khối nguyên tử).

| Thành phần | Đường dẫn |
|---|---|
| JSON Schema | `backend/src/main/resources/schema/cpf/2.0.0/cpf-game.schema.json` |
| Kiểu TypeScript | `frontend/src/types/cpf-game.types.ts` |
| 5 ví dụ hợp lệ | `backend/src/test/resources/cpf-examples/` |
| Test schema | `backend/src/test/java/com/aigameplatform/backend/dto/cpf/CpfGameSchemaTest.java` |
| Bộ 40 mô tả kỳ vọng | `backend/src/test/resources/generation/pipeline-v2/eval-prompts.jsonl` |

REST: game CPF có `gameType: CUSTOM`; `GameResponse` nhánh `CpfGameResponse` đặt game trong trường `cpf`, `PUT /games/{gameId}` nhận nguyên game (`CpfGameEnvelope`), xem `docs/openapi/openapi.yaml`. Kiểu frontend tương ứng ở `frontend/src/types/game-response.types.ts`.

Sửa định dạng phải sửa đồng bộ cả bốn chỗ đầu ở bảng trên, phần CPF trong `openapi.yaml` và tài liệu này. `metadata` lặp lại enum của DSL v1.0.0 (schema tự chứa): sửa enum DSL thì sửa cả CPF.

## 1. Nguyên tắc

1. **Giống DSL v1.0.0, AI không sinh tọa độ, kích thước, màu, URL.** Vị trí ghi bằng vùng có tên (`region`) và cách xếp (`arrangement`); tốc độ ghi bằng mức (`SLOW`, `MEDIUM`, `FAST`). Runtime tự tính pixel, bảo đảm vùng chạm ≥ 64px và không đè nhau. `hitboxScale` không nằm trong JSON: runtime lấy theo `gradeLevel` như mặc định của DSL v1.0.0.
2. **Cơ chế tách khỏi nội dung.** `content` chứa câu hỏi; `entities` và `rules` mô tả cách chơi. Cùng một `content` chạy được trên nhiều cơ chế.
3. **Đáp án tách riêng** trong `answerKey`. Backend bỏ `answerKey` khi gửi cho học sinh (chế độ `play`) và chấm ở máy chủ.
4. **Chỉ dùng khối trong danh mục.** Mọi `type` là enum đóng; nhóm `assetId` là danh sách đóng; `assetId` phải có trong danh mục asset (Lớp 2, mục 5).
5. **Id:** `id` của màn, lựa chọn, nhóm theo vị trí (`r1`, `c1`, `z1`), Backend gán như DSL v1.0.0. Ngoại lệ có chủ đích: `id` của vật (`entities[].id`) do AI đặt, vì `rules` tham chiếu vật bằng tên; đây là tên cục bộ trong một game, không phải id lưu trữ.

## 2. Hai dạng dữ liệu

Khác DSL v1.0.0, CPF **không có dạng đầu ra AI riêng**: AI sinh thẳng dạng hoàn chỉnh (id màn, lựa chọn, nhóm theo vị trí và `answerKey`), nên vị trí lỗi gửi lại khi tự sửa khớp đúng JSON AI đã sinh và không cần bộ chuyển đổi. Gemini Structured Outputs dùng bản nới lỏng `backend/src/main/resources/schema/cpf/2.0.0/cpf-game.ai-decoder.schema.json` (cùng hình dạng, bỏ các từ khóa decoder không nhận như lựa chọn nhánh, điều kiện, giới hạn số phần tử; giới hạn ghi trong mô tả). Kết quả luôn qua lại đủ 3 lớp với schema chặt. Backend ghi đè `metadata.subject`, `metadata.gradeLevel` theo yêu cầu giáo viên; bỏ các trường `null` decoder có thể trả, bỏ trường không thuộc `type` của hành động (decoder là object phẳng gồm trường của mọi loại) và đặt `at: "$subject"` cho `EFFECT` thiếu `at` (trừ luật `ROUND_START`, vì không có `$subject`).

Code: `backend/src/main/java/com/aigameplatform/backend/service/generation/cpf/` (`CpfGenerationService` điều phối và tự sửa, `CpfPromptBuilder` dựng prompt, cổng `CpfContentGenerator`, bản Gemini `GeminiCpfContentGenerator`).

## 3. Cấu trúc

```json
{
  "schemaVersion": "2.0.0",
  "kind": "CPF",
  "metadata": { "title": "...", "subject": "MATH", "gradeLevel": "GRADE_1", "topic": "..." },
  "world": { "backgroundId": "bg.farm", "mascotId": "mascot.pippy" },
  "content": { "instruction": "...", "rounds": [ ... ] },
  "answerKey": { "rounds": [ ... ] },
  "entities": [ ... ],
  "rules": [ ... ]
}
```

### 3.1 `metadata`
Giống DSL v1.0.0: `title` (1–100), `subject` (`MATH`, `VIETNAMESE`, `ENGLISH`), `gradeLevel` (`KINDERGARTEN`, `GRADE_1`..`GRADE_5`), `topic` (1–200).

### 3.2 `world`
| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `backgroundId` | có | Nền, dạng `bg.*` |
| `mascotId` | không | Nhân vật dẫn đường đứng góc màn, dạng `mascot.*` |
| `musicId` | không | Nhạc nền, dạng `music.*` |

### 3.3 `content`
| Trường | Ý nghĩa |
|---|---|
| `instruction` | Lời dặn chung, hiện trên màn và đọc to (1–120 ký tự) |
| `rounds[]` (1–20) | Mỗi phần tử là một màn |

Mỗi `round`:
| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `id` | có | `r1`, `r2`... theo vị trí |
| `task` | có | `PICK_ONE` (chọn 1 đáp án), `PICK_ALL` (tìm hết đáp án đúng), `SORT` (xếp mỗi lựa chọn vào đúng nhóm) |
| `prompt` | có | Câu hỏi của màn (1–120 ký tự), đọc to được |
| `choices[]` | có | 2–8 lựa chọn: `id` (`c1`..`c8`), `label` (1–30 ký tự), `assetId` tùy chọn (hình riêng của lựa chọn) |
| `zones[]` | có khi và chỉ khi `SORT` | 2–4 nhóm: `id` (`z1`..`z4`), `label` (1–30 ký tự) |

### 3.4 `answerKey`
`rounds[]` cùng thứ tự với `content.rounds`, mỗi phần tử có `roundId` và đúng một trong hai:
- `correctChoiceIds` (không trùng): `PICK_ONE` đúng 1 phần tử; `PICK_ALL` từ 1 tới ít hơn số lựa chọn.
- `placements[{choiceId, zoneId}]` (không trùng): cho `SORT`, mỗi lựa chọn đúng một lần.

### 3.5 `entities[]` (1–10 khai báo)
| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `id` | có | Chữ thường, số, `_`; bắt đầu bằng chữ; tối đa 30 ký tự |
| `assetId` | có | Hình, nhóm `animal`, `fruit`, `object`, `vehicle`, `sea`, `space`, `jungle`, `farm`, `ui`. Khi `bindTo: choices`, là hình mặc định cho lựa chọn không có `assetId` riêng |
| `bindTo` | không | `choices`: một vật cho mỗi lựa chọn của màn hiện tại, mang `label` của lựa chọn. `zones`: một vật cho mỗi nhóm của màn `SORT`. Không ghi: một vật duy nhất |
| `placement` | có | `region` (`TOP`, `MIDDLE`, `BOTTOM`, `LEFT`, `RIGHT`, `CENTER`), `arrangement` (`SINGLE`, `ROW`, `GRID`, `SCATTER`). Vật đơn không có vị trí đặc biệt dùng `CENTER` + `SINGLE` |
| `motion` | không | `type` bắt buộc (`STATIC`, `FALL`, `FLOAT_UP`, `PATROL_X`, `BOB`), `speed` (`SLOW`, `MEDIUM`, `FAST`), `spawn` (`ALL_AT_ONCE`, `STREAM`; chỉ cho vật có `bindTo`) |
| `control` | không | Trẻ điều khiển vật này: `DRAG_X` (kéo ngang, ví dụ giỏ), `DRAG_FREE` (kéo thả), `AIM_SHOOT` (kéo căng rồi thả để bắn) |
| `role` | không | `PROGRESS`: vật tiến một nấc mỗi `ADVANCE` (xe, tên lửa, cây lớn dần). Đích ở nấc bằng số màn |

Vật `FALL`/`FLOAT_UP` đi ra khỏi màn mà chưa được chọn sẽ được sinh lại, nên màn `PICK_ALL` luôn hoàn thành được.

### 3.6 `rules[]` (1–8)
Mỗi luật: `on` (sự kiện) và `do` (1–6 hành động chạy theo thứ tự).

Sự kiện `on` (chỉ tham chiếu `id` vật, không dùng `$subject`):
| `type` | Trường | Khi nào |
|---|---|---|
| `TAP` | `target` | Chạm vào vật `target` |
| `COLLIDE` | `a`, `b` | Vật `a` chạm vật `b` (giỏ chạm táo, tên chạm bia) |
| `DROP` | `item`, `zone` | Thả vật `item` vào vật `zone` |
| `ROUND_START` | | Bắt đầu mỗi màn |

Với vật có `control: AIM_SHOOT`, `COLLIDE` dùng `id` của vật đó nghĩa là mũi tên/viên đạn bắn ra từ nó chạm vật kia (runtime tự sinh vật bắn ra, không khai báo trong `entities`).

Trong `do`, `$subject` là vật lựa chọn gây ra sự kiện (vật `target` của `TAP`, vật `bindTo: choices` trong `COLLIDE`, vật `item` của `DROP`).

Hành động `do`:
| `type` | Trường | Tác dụng |
|---|---|---|
| `CHECK` | `onCorrect[]`, `onWrong[]` (mỗi danh sách 0–4 hành động, không lồng `CHECK`) | Chấm `$subject` (xem mục 6) |
| `MOVE_TO` | `subject`, `to` | Đưa vật tới vị trí vật khác |
| `ADVANCE` | `subject` | Vật `role: PROGRESS` tiến một nấc |
| `EFFECT` | `name`, `at` | `STARS`, `CONFETTI`, `POP`, `GLOW`, `WIGGLE` (lắc nhẹ khi sai, không rung mạnh) |
| `SOUND` | `name` | `CORRECT`, `GENTLE_WRONG`, `POP`, `WHOOSH` |
| `REMOVE` | `subject` | Bỏ vật khỏi màn |
| `SCORE` | `add` (1–10) | Cộng điểm hiển thị (xem mục 6) |

Không có hành động chuyển màn hay kết thúc game: runtime tự làm (mục 3.7).

### 3.7 Kết thúc màn và kết thúc game
Runtime tự xử lý, JSON không khai báo:
| `task` | Màn kết thúc khi | Khi trẻ sai |
|---|---|---|
| `PICK_ONE` | Có một `CHECK` | Chạy `onWrong`, rồi runtime làm nổi bật đáp án đúng khoảng 1,5 giây trước khi sang màn sau |
| `PICK_ALL` | Đã chọn hết đáp án đúng | Chạy `onWrong`; trẻ tiếp tục tìm. Sai 3 lần trong màn thì runtime làm sáng một vật đúng còn lại |
| `SORT` | Mọi lựa chọn đã nằm đúng nhóm | Chạy `onWrong`; vật trượt về chỗ cũ. Sai 3 lần với cùng một vật thì runtime làm sáng nhóm đúng của vật đó |

Game kết thúc khi hết màn. Vật `PROGRESS` dừng ở nấc đạt được; tới đích (đúng mọi màn) thì thêm hiệu ứng mừng. Với game qua Lớp 2 (mục 4.2), trẻ luôn đi được tới cuối game dù trả lời sai.

## 4. Kiểm duyệt

Theo chuỗi `AbstractGameValidator` (Chain of Responsibility) như DSL v1.0.0, không bỏ qua lớp nào: CPF có validator riêng cho từng lớp, là chuỗi riêng `CpfSchemaValidator` → `CpfRuleValidator` → `CpfSafetyValidator` do `CpfValidationService` tự lắp (các lớp này không là bean để không lọt vào chuỗi DSL); phần kiểm an toàn dùng chung bean `ContentSafetyCheck` với chuỗi DSL.

### 4.1 Lớp 1: cú pháp
JSON khớp schema ở trên.

### 4.2 Lớp 2: logic (không diễn tả được bằng JSON Schema)
1. Luật chung như DSL v1.0.0 mục 7: không chuỗi nào rỗng hoặc chỉ khoảng trắng; nhãn trong cùng danh sách của một màn (`choices` hoặc `zones`) không trùng (so không phân biệt hoa thường và khoảng trắng thừa, giữ nguyên dấu tiếng Việt).
2. `id` vật không trùng; `answerKey.rounds` khớp `content.rounds` theo thứ tự và `roundId`; mọi `choiceId`, `zoneId` trong `answerKey` có trong màn tương ứng.
3. Đáp án đúng số lượng theo mục 3.4 (`PICK_ONE` đúng 1; `PICK_ALL` ít hơn số lựa chọn; `SORT` đủ và không thừa).
4. Mọi tham chiếu trong `rules` (`target`, `a`, `b`, `item`, `zone`, `subject`, `to`, `at`) là `id` vật đã khai báo; `$subject` chỉ ở `do`.
5. Chơi được (trẻ thao tác được và luôn đi tới cuối game):
   - Mọi màn cần một luật có `CHECK`. `CHECK` và `$subject` chỉ được dùng trong luật mà sự kiện có vật `bindTo: choices` (`TAP.target`, một trong `COLLIDE.a`/`b`, `DROP.item`); không dùng với `ROUND_START`.
   - `TAP.target` là vật trẻ chạm được (không phải vật đang bị kéo).
   - `COLLIDE`: một trong `a`, `b` có `control` (`DRAG_X` hoặc `AIM_SHOOT`), vật kia là `bindTo: choices`. Với `DRAG_X`, vật `bindTo: choices` phải đi qua hàng của vật kéo (`FALL` khi vật kéo ở `BOTTOM`, `FLOAT_UP` khi ở `TOP`).
   - `SORT`: `DROP.item` là vật `bindTo: choices` có `control: DRAG_FREE`; `DROP.zone` là vật `bindTo: zones`.
   - `AIM_SHOOT` cần một `COLLIDE` dùng `id` của nó.
   - `PROGRESS`: có vật `role: PROGRESS` thì mọi màn là `PICK_ONE`, có ít nhất một `ADVANCE`, `ADVANCE` chỉ nằm trong `onCorrect` và `subject` của nó là vật `role: PROGRESS` (để mỗi màn tiến tối đa một nấc).
   - Vật `bindTo` không dùng `arrangement: SINGLE` (nhiều vật không được chồng một chỗ).
6. Toán: với môn `MATH`, màn `PICK_ONE` hỏi kết quả một phép tính (câu kết thúc bằng `= ?`) và mọi nhãn là số nguyên, code tự tính lại và đối chiếu đáp án bằng `QuizArithmeticAnswerVerifier` (`service/validation/rule`). Câu đúng/sai, so sánh, nhãn kèm đơn vị không kiểm được bằng máy nên bỏ qua (không chặn nhầm).
7. Ngân sách: số vật hiển thị cùng lúc (sau khi nhân `bindTo`) ≤ 15; `assetId` có trong danh mục asset.

### 4.3 Lớp 3: an toàn
Như DSL v1.0.0: gom `title`, `topic`, `instruction`, `prompt`, `label` (không gom `assetId`, `id`), đối chiếu danh sách từ cấm rồi OpenAI Moderation.

### 4.4 Xử lý lỗi
Như DSL v1.0.0 mục 7: Lớp 1, 2 lỗi thì gọi lại AI tối đa 2 lần kèm lỗi có vị trí; vẫn lỗi thì `504 AI_GENERATION_TIMEOUT`, không nạp game mẫu. Lớp 3 lỗi thì `422 UNSAFE_CONTENT`, không cho AI sinh lại. Sau lỗi, giáo viên quay lại bước duyệt kế hoạch để chọn phương án khác (có thể là một loại preset).

## 5. `assetId`

Dạng `nhóm.tên`. Nhóm của vật: `animal`, `fruit`, `object`, `vehicle`, `sea`, `space`, `jungle`, `farm`, `ui`; nền `bg`; mascot `mascot`; nhạc `music`.

Danh mục id hợp lệ (nguồn duy nhất, Lớp 2 kiểm và prompt AI liệt kê): `backend/src/main/resources/cpf/asset-catalog.json`. Frontend `frontend/src/games/cpf/cpfAssets.ts` ánh xạ id sang file; id có trong danh mục mà chưa có file thì runtime vẽ hình thay thế có nhãn. Chưa có id nhóm `music` nên `musicId` hiện luôn bị Lớp 2 từ chối.

Đã có file trong `frontend/public/assets/` (đặt id ở Pha 1): nền `bg.farm`, `bg.ocean`, `bg.jungle`, `bg.space`; mascot `leo`, `mimi`, `pippy`, `sam`; con vật, hoa quả, `object.car`, `object.star`, `sea.clownfish`, `sea.turtle`... Chưa có, 5 ví dụ đang dùng, cần thêm ở Pha 1: `object.basket`, `object.boat`, `object.bow`, `object.target`, `object.sign`, `object.box`, `bg.road`.

## 6. Chấm điểm

- Kết quả mỗi màn như DSL v1.0.0 mục 6: `CORRECT` khi trẻ hoàn thành màn mà không chọn sai lần nào, ngược lại `INCORRECT`; ghi `attemptsCount`. Chấm từng phần vẫn để sau.
- `SCORE` chỉ là điểm hiển thị cho trẻ trong game, không phải điểm lưu ở máy chủ.
- `preview` (giáo viên): runtime chấm cục bộ bằng `answerKey`.
- `play` (học sinh): không có `answerKey`. Mỗi `CHECK` cần đúng/sai ngay để hiện hiệu ứng, kể cả với `PICK_ALL` và `SORT`. Kết quả chấm ở `play` phải kèm phần đáp án đúng mà runtime cần để chỉ cho trẻ (mục 3.7), tương tự `correctAnswer` của DSL v1.0.0: `PICK_ONE` sai thì có `correctChoiceIds`; `PICK_ALL` sau 3 lần sai thì có một `choiceId` đúng còn lại; `SORT` khi sai thì có `zoneId` đúng sau 3 lần sai cùng vật.
- **Còn chờ chốt** (Pha 3, khi làm endpoint chơi): cách gọi chấm ở `play`. Cách chấm từng `CHECK` khác quy ước hiện tại của renderer nhiều phần tử ("nộp một lần sau khi xong màn", `.claude/rules/canvas-engine.md`), nên cần người dùng duyệt: gọi Backend mỗi lần `CHECK` rồi Backend tổng hợp kết quả màn, hay cách khác.

## 7. Lưu trữ

Đã chốt (`docs/decisions.md`, 2026-11-07, phương án B):
- `GameType` thêm `CUSTOM`. Game CPF có đúng một `CpfQuestion` (subclass của `QuestionGame`, JOINED), lưu toàn bộ JSON dạng hoàn chỉnh đã qua kiểm duyệt trong cột `jsonb` của bảng riêng (migration Flyway mới, làm ở Pha 2).
- Entity không tự kiểm JSON; kiểm duyệt nằm ở chuỗi validator (mục 4).
- Các chỗ đang duyệt mọi `GameType` (`GameDslSchemaRegistry`, `GameContentStrategyRegistry`, `GameDslSchemaTest`) phải sửa cùng lúc để `CUSTOM` không làm app dừng khởi động.
- Kết quả từng màn ghi qua `PlayInteractionDetail`; subclass cho CPF chốt cùng cách chấm ở mục 6.

## 8. Bộ 40 mô tả kỳ vọng

`backend/src/test/resources/generation/pipeline-v2/eval-prompts.jsonl`, mỗi dòng: `id`, `prompt`, `gradeLevel`/`subject` (tùy chọn, như giáo viên chọn trên form), `expect`:
- `route`: `PRESET` (kèm `gameType`), `CPF` (kèm `task`, `input` và `progress`), `CLARIFY` (kèm `mustAsk`), `REJECT`. `acceptRoutes` (tùy chọn) liệt kê route khác cũng tính là đúng; khi trả lời theo route phụ thì chỉ chấm `route`, không chấm `gameType`/`task`.
- `input`: cách trẻ thao tác, `TAP`, `CATCH` (kéo vật hứng, `DRAG_X` + `COLLIDE`), `AIM_SHOOT`, `DRAG` (kéo thả, `DRAG_FREE` + `DROP`). `progress`: có vật `role: PROGRESS` hay không.
- `mustAsk`: mã thông tin phải hỏi lại, `SUBJECT`, `GRADE`, `SKILL`, `TOPIC`, `MECHANIC`.
- `note`: điều kiện riêng không chấm tự động được (người chấm đọc).

Không mô tả CPF nào trùng cả chủ đề lẫn cơ chế với 5 ví dụ; p09, p33, p40 cố ý dùng chủ đề gần ví dụ để thử định tuyến (PRESET, hỏi lại). Phân bố: 11 PRESET, 19 CPF, 8 CLARIFY, 2 REJECT. Pha 3 chạy offline bằng output AI ghi sẵn để đo tỉ lệ đúng `route` và đúng `task`/`input`/`progress`; ngưỡng đạt do người dùng chốt.

## 9. Ngoài 2.0.0

Sắp thứ tự (xây tháp theo thứ tự), nhiều người chơi, vật lý nhiều vật, hẹn giờ theo màn, nhánh cốt truyện.
