# Đề xuất Game JSON DSL v1.1.0 (T9.1, chỉ tài liệu)

Trạng thái: **ĐỀ XUẤT, chưa phải contract.** Chưa trao đổi với nhóm, chưa được duyệt. Tệp này là sản phẩm duy nhất của T9.1: không sửa `docs/game-json-dsl-v1.0.0.md`, JSON Schema, record Java, kiểu TypeScript, `openapi.yaml`, migration hay code Backend. DSL 1.0.0 vẫn đóng băng.

Mục đích: đưa 3 loại game thử nghiệm (NUMBER_LINE, SYLLABLE_BUILDER, PREPOSITION_SCENE; hiện chỉ sống ở `frontend/src/experiments/games/`) vào DSL, nếu nhóm đồng ý, và nêu rõ cái giá phải trả để mọi người quyết định có làm T9.2 hay không.

Nguồn: đọc code thật (đường dẫn `file:dòng` ở từng chỗ) và báo cáo `impact-analyzer`; các chỗ tôi tự kiểm lại bằng `grep` ghi rõ. Mục 9 liệt kê những điều **chưa chắc**.

## 1. Tóm tắt cho người quyết định

- Thêm 3 loại game chạm khoảng **70 tệp ở 8 lớp** (spec, JSON Schema, record Java dạng đầy đủ và dạng AI, enum, entity + migration V5, openapi, kiểu TS, test); đây là **ước lượng thô** của `impact-analyzer`, không phải phép đếm từng tệp. Ước tính cài đặt 5 đến 8 ngày là con số của kế hoạch T9.2, cũng thô.
- **Đổi `gameType` trong `openapi.yaml` là đổi REST API Contract v1.1.0 đã freeze**, không chỉ DSL: nhóm phải duyệt cả hai contract.
- **Hai điểm chặn kỹ thuật chắc chắn** (đã kiểm): `schemaVersion` bị gắn cứng `"1.0.0"` (`GameDslSchemaRegistry.SUPPORTED_VERSION`, dùng ở `AbstractGameDslFactory.java:71` và các `*GameStrategy`), và `Map.of(...)` đang đủ 10 cặp (`AiOutputValidator.java:40`, `GameDslSchemaTest.java:29`) nên loại thứ 11 làm **hỏng biên dịch**.
- **Ba quyết định thiết kế cần nhóm:** (1) đánh phiên bản thế nào (mục 5); (2) NUMBER_LINE không khớp nhóm `PlayInteractionDetail` nào trong kiến trúc đã chốt (mục 6); (3) SYLLABLE_BUILDER cần cổng sang Java cho luật chính tả tiếng Việt (mục 3.2).
- **Đề xuất của tôi:** đánh phiên bản **theo từng loại** (mục 5, phương án c), **không** thêm `theme` hay giọng đọc vào DSL ở 1.1 (mục 4), và **bỏ tọa độ khỏi dữ liệu AI** của PREPOSITION_SCENE (mục 3.3).
- Phần của kiến trúc trong CLAUDE.md **chưa có trong code**: các subclass `PlayInteractionDetail`, `GameSessionFactory`, `InteractionDetailFactoryRegistry`, controller game, chấm điểm ở Backend, TTS (mục 7). Nên "đưa vào DSL" hiện chỉ có nghĩa là schema, record, entity, migration và luật kiểm duyệt; chưa chạy được đầu-cuối.

## 2. Hiện trạng ba loại thử nghiệm

| Loại | Kiểu thử nghiệm | Chấm điểm hiện ở đâu | Dữ liệu chính |
| --- | --- | --- | --- |
| NUMBER_LINE | `numberLine/numberLineTypes.ts` | client (`numberLineLogic.ts`) | `questionText`, `min`, `max`, `step`, `target`, `tolerance`, `startValue?` (số nguyên) |
| SYLLABLE_BUILDER | `syllableBuilder/syllableTypes.ts` | client (`vietnameseSyllable.ts`, `syllableLogic.ts`) | `questionText`, `onsets[]`, `rhymes[]`, `tones[]`, `target`, `toneStyle?` |
| PREPOSITION_SCENE | `prepositionScene/prepositionTypes.ts` | client (`prepositionGeometry.ts`, `prepositionLogic.ts`) | `instruction`, `preposition`, `landmark{kind,label,x,y,width,height}`, `item{label,width,height,startX,startY}` |

Cả ba đã có dạng học sinh (`*StudentQuestion`) bỏ trường chấm, và kết quả chấm (`*AnswerResult`) để Backend trả về; renderer có đủ ba `mode` (`preview`/`play`/`review`, tôi đã đếm ở cả ba tệp renderer).

**Xung đột với nguyên tắc DSL 1.0.0** (`game-json-dsl-v1.0.0.md` mục 1): «AI không sinh tọa độ pixel, kích thước…». PREPOSITION_SCENE thử nghiệm mang tọa độ và kích thước ở dữ liệu câu hỏi, nên phải thiết kế lại cho DSL (mục 3.3).

## 3. Đề xuất theo từng loại

Quy ước theo 1.0.0: dạng AI đơn giản (không `id`, `points`, `timeLimitSeconds`, không URL), dạng đầy đủ do Backend bổ sung, dạng học sinh bỏ trường [ĐA], kết quả `{ isCorrect, correctAnswer }`. Tên trường thống nhất dùng `text` như QUIZ (renderer thử nghiệm đang dùng `questionText`/`instruction`, đổi tên khi chuyển).

### 3.1 NUMBER_LINE (Toán)

| Dạng | Trường |
| --- | --- |
| AI | `text` (1–200 ký tự), `min`, `max`, `step`, `target`; tuỳ chọn `tolerance` (mặc định 0), `startValue`, `audioText` |
| Đầy đủ | thêm `id`, `points`, `timeLimitSeconds`, `audioUrl` |
| Học sinh | bỏ **`target`, `tolerance`** [ĐA] |
| Trả lời | `{ "value": <số nguyên> }` |
| `correctAnswer` | `{ "correctValue": <số nguyên> }` |

Luật Layer 2 (đã có sẵn ở TS, `validateNumberLine`): mọi số là số nguyên; `max > min`; `step ≥ 1` và `(max − min)` chia hết cho `step`; số vạch từ 2 đến 21 (`MAX_TICKS`); `target` nằm trên một vạch; `startValue` nằm trên vạch; `tolerance` ≥ 0 và số nguyên; `text` không rỗng, ≤ 200 ký tự. Chấm: `|value − target| ≤ tolerance` (hàm đơn giản, cổng sang Java dễ).

### 3.2 SYLLABLE_BUILDER (Tiếng Việt)

Quyết định cần chốt: **ai sinh các ô lựa chọn?**

- **Phương án A (khuyến nghị):** AI chỉ sinh `text` (gợi ý nghĩa) và `target` (tiếng đáp án); Backend **tự tách** `target` thành âm đầu + vần + dấu thanh và sinh lựa chọn nhiễu theo luật. Ưu: AI không thể bịa ô lựa chọn sai chính tả; dữ liệu AI nhỏ. Giá: phải cổng `vietnameseSyllable.ts` (`applyTone`, `composeSyllable`, `spellingProblem`, `LEXICON`) sang Java **và viết bộ tách mới** (hiện TS chỉ có chiều GHÉP, không có chiều tách). Bộ tách có chỗ mơ hồ (ví dụ «gi» với «gì»/«gin», «qu» với «u», «ia»/«iê») nên cần bộ test duyệt một tập tiếng đủ lớn; chi phí và rủi ro này chỉ có ở phương án A. Các lựa chọn nhiễu do Backend sinh phải được **lưu cố định** (cột/bảng con ở V5) để dựng lại không ra tập ô khác.
- **Phương án B:** AI sinh cả `onsets[]`, `rhymes[]`, `tones[]` như dữ liệu thử nghiệm; Layer 2 kiểm `target` ghép được từ các ô. Vẫn phải cổng luật ghép/chính tả sang Java để kiểm, nên **không** tránh được việc cổng; lại để AI sinh lựa chọn.

| Dạng | Trường (phương án A) |
| --- | --- |
| AI | `text`, `target`; tuỳ chọn `toneStyle`, `audioText` |
| Đầy đủ | thêm `onsets`, `rhymes`, `tones` (Backend sinh), `id`, `points`, `timeLimitSeconds`, `audioUrl` |
| Học sinh | bỏ **`target`** và **`audioText`** (lời đọc chính là đáp án; học sinh chỉ nhận `audioUrl`) |
| Trả lời | `{ "syllable": "<tiếng đã ghép, NFC>" }` |
| `correctAnswer` | `{ "correctSyllable": "<tiếng>" }` |

Luật Layer 2 (đã có ở TS, `validateSyllableBuilder`): `text` không rỗng, ≤ 200 ký tự và **không chứa chính `target`**; mỗi ô 1–8 lựa chọn không trùng; dấu thanh hợp lệ; vần bắt đầu bằng nguyên âm; `target` ghép được từ các ô; `target` đúng chính tả theo luật; `target` có trong từ điển nhỏ (ở TS đây là mã `TARGET_NOT_IN_LEXICON` mức «cần người kiểm»; Layer 2 của Backend hiện **chưa có khái niệm mức cảnh báo** theo tôi biết, cần xác nhận trước khi dựa vào). So sánh luôn chuẩn hóa NFC.

**Cần xác nhận chuyên môn trước khi đóng băng:** kiểu đặt dấu `modern` (hòa) ở `oa/oe/uy` mặc định (`syllableTypes.ts`) và bộ luật chính tả **chưa được chuyên gia ngôn ngữ xác nhận**.

### 3.3 PREPOSITION_SCENE (Tiếng Anh)

Để khớp nguyên tắc «AI không sinh tọa độ»: **bỏ toàn bộ hình học khỏi dữ liệu**; Frontend (và Backend khi chấm) lấy hình học từ **mẫu cố định theo loại vật mốc** (hằng số trong code như hiện nay: cảnh 720×380 đơn vị thiết kế, mặt đất y = 340, mặt bàn dày 36, vật 100×100, vị trí đầu cố định).

| Dạng | Trường |
| --- | --- |
| AI | `preposition` (`ON` \| `UNDER` \| `IN` \| `NEXT_TO`), `item` (tên vật tiếng Anh, ví dụ `cat`), `landmark{ kind: TABLE \| BOX, label }` |
| Đầy đủ | thêm `text` (câu lệnh, **Backend tự dựng** «Put the {item} {prep} the {landmark}.»), `audioText` mặc định bằng `text`, `id`, `points`, `timeLimitSeconds`, `audioUrl` |
| Học sinh | bỏ **`preposition`** và **`audioText`** (vẫn giữ `text`: trẻ cần đọc lệnh) |
| Trả lời | `{ "x": <0..1>, "y": <0..1> }` (tâm vật, **tỉ lệ** theo chiều rộng/cao cảnh; cùng cấu trúc với SPOT_THE_TARGET nhưng **cách chấm là logic mới**: hình học hộp bao, không phải khoảng cách tới tâm vùng) |
| `correctAnswer` | `{ "correctX": <0..1>, "correctY": <0..1> }` (vị trí đúng để chỉ cho trẻ; có thể bỏ trống) |

- `text` do Backend dựng nên không thể lệch với `preposition`/`item`/`landmark` (hai luật kiểm `INSTRUCTION_PREPOSITION_MISMATCH` và `LABEL_NOT_IN_INSTRUCTION` của TS chỉ còn cần khi giáo viên sửa `text` bằng tay qua `PUT`).
- Luật Layer 2: `landmark.kind` hỗ trợ `preposition` (TABLE: ON/UNDER/NEXT_TO; BOX: IN/ON/NEXT_TO); nhãn không rỗng; `text` có đúng một từ chỉ vị trí đúng với quy tắc, nhắc đúng tên vật và vật mốc; và (luật cũ) mẫu phải có chỗ đúng khả dĩ trong cảnh.
- **Chấm ở Backend phải cổng `prepositionGeometry.ts`** (`satisfies` trên hộp bao với các dung sai hằng số). Chỉ dùng tọa độ cuối: thả rơi bằng `matter-js` (T7.3) là **trình bày ở client**, không thuộc contract; Backend không cần mô phỏng lại. **Chưa đánh giá chống gian lận:** Backend chỉ nhận tọa độ cuối từ máy khách; quy tắc hình học là hằng số nằm trong mã Frontend công khai (khác SPOT_THE_TARGET, nơi `hitRegion` được giấu), và `text` ở dạng học sinh nói thẳng giới từ, nên «không lộ quy tắc» chỉ đúng với trường `preposition`.
- **Hạn chế đáng nói:** giáo viên không đặt/dời vật mốc được trong 1.1 (chỉ chọn loại và nhãn); cảnh nhiều vật mốc là việc để sau.
- **Cần xác nhận chuyên môn:** các quy tắc 2D cho on/under/in/next to (đặc biệt «on» khi vật hơi nổi/chìm) **chưa được giáo viên tiếng Anh xác nhận**.

## 4. Trường chung: `theme` và giọng đọc, đề xuất **không đưa vào 1.1**

- `theme`: là sở thích trình bày (người chơi hoặc lớp chọn), không phải nội dung câu hỏi. Đặt vào `metadata` hay `gameplaySettings` (đều `additionalProperties: false`) sẽ sửa **cả 13 schema** và 2 record dùng chung (`GameMetadata`, `GameplaySettings`, kèm mọi chỗ `new GameMetadata(...)`/`new GameplaySettings(...)`). Mà `ThemeManifest` ở Frontend là một manifest nhiều thuộc tính (màu, chữ, tài nguyên), DSL nếu có chỉ nên chứa một `themeId`. Đề xuất: giữ theme ở cài đặt của người dùng/lớp (phía client) cho tới khi có yêu cầu thật.
- Giọng đọc: `audioText` (+ `audioUrl`) đã đủ; Backend **chưa có dịch vụ TTS** (không có trong `backend/src/main`). Cấu hình giọng/ngôn ngữ nên đi cùng việc cài TTS (T8.1 nếu làm) chứ không đi trước.
- Nếu nhóm vẫn muốn: thêm **một** trường tuỳ chọn `metadata.themeId` (chuỗi), nhận biết bằng danh sách id đã biết, và chấp nhận tác động trên. Lưu ý: vì `additionalProperties: false`, việc này buộc sửa cả **10 schema 1.0.0 đã đóng băng**, nên **phá phương án (c)** ở mục 5.

## 5. Đánh phiên bản: ba phương án

Vấn đề: mỗi schema 1.0.0 có `"schemaVersion": {"const": "1.0.0"}` và `additionalProperties: false`; Layer 1 từ chối mọi phiên bản khác (`SchemaGameValidator.java:36–40`).

| Phương án | Nội dung | Ưu | Nhược |
| --- | --- | --- | --- |
| a. Song song | Registry theo cặp (phiên bản, loại); sao 10 schema cũ sang `1.1.0/` | Mọi game cùng một phiên bản mới | Nhân đôi 10 schema; 10 strategy phải biết phiên bản; dễ lệch hai bản |
| b. Thay thế | Bump toàn bộ lên 1.1.0, coi 1.0.0 qua adapter | Một phiên bản duy nhất | Đổi contract đóng băng của cả 10 loại; 10 game cũ đổi `schemaVersion` khi dựng lại từ DB; test cứng `"1.0.0"` (`GameContentStrategyMappingTest.java:213`) phải sửa |
| **c. Theo từng loại (khuyến nghị)** | 10 loại cũ **giữ nguyên schema và dữ liệu 1.0.0** (không đổi tệp schema/JSON nào của chúng); 3 loại mới có `schemaVersion: "1.1.0"`; registry ánh xạ loại → phiên bản được hỗ trợ; `games.schema_version` lưu phiên bản của từng game (cột đã có ở V4) | Không đổi nội dung contract của 10 loại cũ; thay đổi cộng thêm | **Vẫn phải sửa mã dùng hằng phiên bản chung**: `GameDslSchemaRegistry`, `SchemaGameValidator`, `AbstractGameDslFactory`, 10 `*GameStrategy`, `GameDefaults`, hằng TS `GAME_DSL_SCHEMA_VERSION`, mặc định `"1.0.0"` ở `Game.java:48`. `SchemaGameValidator` hiện kiểm phiên bản trước rồi mới đọc `gameType`; theo loại thì phải đọc `gameType` trước (thông báo lỗi cho JSON thiếu/sai `gameType` đổi theo). Kiểu TS là union `'1.0.0' \| '1.1.0'` theo từng loại; khi lưu phải đặt `schema_version` đúng (mặc định DB là `'1.0.0'`, quên đặt sẽ gán nhãn sai cho game 1.1.0) |

Dù chọn phương án nào vẫn phải thay `Map.of` 10 cặp bằng `Map.ofEntries`/`EnumMap` ở 3 chỗ, và `GameDefaults` (`EnumMap` + `get` rồi unbox: thiếu loại là NPE).

## 6. Nhóm `PlayInteractionDetail` (kiến trúc đã chốt)

CLAUDE.md quy định 7 nhóm theo cấu trúc câu trả lời và **cấm tự ý đổi**. Đối chiếu 3 loại mới:

| Loại | Dạng trả lời | Nhóm gần nhất | Nhận định |
| --- | --- | --- | --- |
| PREPOSITION_SCENE | tâm vật `{x,y}` tỉ lệ 0–1 | **TargetTap** (đã lưu x,y tỉ lệ 0–1) | Dùng lại được, nếu chuẩn hóa tọa độ như mục 3.3 |
| SYLLABLE_BUILDER | một chuỗi tiếng | **WordScramble** (một chuỗi từ) hoặc ClozeFill | Dùng lại được; chú ý chuẩn hóa NFC và `toneStyle` khác WORD_SCRAMBLE |
| NUMBER_LINE | một số nguyên | **không nhóm nào** | Cần nhóm thứ 8 (ví dụ `NumericAnswer`): **đổi ánh xạ đã chốt, cần nhóm đồng ý**; hoặc hoãn NUMBER_LINE |

Lưu ý quan trọng: các subclass này **chưa tồn tại trong code** (mục 7), nên chọn nhóm bây giờ là quyết định thiết kế cho lần cài đầu, không phải sửa code cũ.

## 7. Điều CLAUDE.md mô tả nhưng chưa có trong code

(Kiểm: `entity/interaction/` chỉ có `PlayInteractionDetail.java`, thực thể phẳng không `@Inheritance`; không thấy `GameSessionFactory`, `InteractionDetailFactoryRegistry`; `controller/` chỉ có `AuthController`; không có TTS; `buildTypeSpecificInstruction` của 10 strategy còn là khung `UnsupportedOperationException` (đã kiểm đủ 10 tệp bởi `reviewer`); mọi operation game ở `openapi.yaml` là `planned`.)

Hệ quả: «lưu loại game mới» chưa chạy đầu-cuối ngay cả khi T9.2 xong; pipeline sinh game bằng AI chưa chạy thật cho loại nào. Việc nên hỏi nhóm: các phần này đang ở nhánh nào, có xung đột với đổi DSL không.

## 8. Bản đồ tác động (rút gọn; chi tiết file:dòng ở báo cáo `impact-analyzer`)

Thứ tự làm đề xuất cho T9.2 (theo quy ước: `openapi.yaml` trước, code sau; migration mới, **không sửa V1–V4**):

1. Spec: `docs/game-json-dsl-v1.1.0.md` mới (không sửa tệp 1.0.0); `docs/openapi/openapi.yaml` (enum `GameType`, bảng dạng học sinh, bảng trả lời, `oneOf` của `InteractionRequest`, `correctAnswer`; `schemaVersion` là enum/oneOf) rồi `npx @redocly/cli lint docs/openapi/openapi.yaml`.
2. JSON Schema: `schema/game-dsl/1.1.0/{number-line,syllable-builder,preposition-scene}.schema.json`; `schema/game-ai-output/1.0.0/` thêm 3 tệp cùng tên.
3. Backend: `GameType` + 3 hằng; `GameDsl`/`QuestionDsl` (`permits`, `@JsonSubTypes`); record mới `NumberLine*Dsl`, `SyllableBuilder*Dsl`, `PrepositionScene*Dsl` (+ kiểu phụ) và dạng AI trong `dto/dsl/ai`; `GameDslSchemaRegistry` (phiên bản theo loại), `SchemaGameValidator`, `AiOutputValidator` (bỏ `Map.of`), `GameDefaults`.
4. Migration `V5__game_dsl_v1_1_new_game_types.sql`: gỡ rồi tạo lại ràng buộc `check` của `games.game_type` (V2:59 giới hạn 10 giá trị; **tên ràng buộc chưa xác nhận**), bảng `number_line_questions`, `syllable_builder_questions` (+ bảng con ô lựa chọn), `preposition_scene_questions`; JOINED với `question_games`; `ddl-auto: validate` nên entity phải khớp từng cột.
5. Entity (`NumberLineQuestion`…, thành phần nhúng ở `entity/question/embedded`), 3 `GameContentStrategy` + 3 `AbstractGameDslFactory` (thiếu một là ứng dụng **không khởi động**: các registry duyệt `GameType.values()` và ném `IllegalStateException`), 3 luật Layer 2 (`service/validation/rule`), Layer 3: `GameTextExtractor` là bộ duyệt JSON chung (quét mọi chuỗi, bỏ `id`, khóa kết thúc `Id`/`Url` và tập `TECHNICAL_KEYS`), nên `text`, `target`, `item`, `landmark.label` **đã được kiểm duyệt tự động, không cần sửa**; chỉ tuỳ chọn thêm khóa kỹ thuật (`onsets`, `rhymes`, `tones`, `kind`, `preposition`, `toneStyle`) vào `TECHNICAL_KEYS` để khỏi quét thừa.
6. Cổng luật chấm sang Java: `numberLine*`, `vietnameseSyllable.ts`/`syllableLogic.ts`, `prepositionGeometry.ts`/`prepositionLogic.ts` (và test tương đương, kể cả dữ liệu mẫu dùng chung để hai phía không lệch).
7. Test: `GameDslSchemaTest` và `AiOutputValidatorTest` (hai `Map.of`), fixture `dsl-examples/` và `ai-output-examples/`, các test duyệt `GameType.values()` (strategy, registry, factory, defaults), test cứng `"1.0.0"` nếu phương án b.
8. Frontend: `game-dsl.types.ts` (+ dạng học sinh), chuyển 3 renderer từ `experiments/games/` sang `games/<loại>/` và bỏ tên khác biệt (`questionText`/`instruction` → `text`), `CanvasSandbox`. Đây **đổi hành vi**, không chỉ đổi chỗ đặt tệp: ở `play` renderer chính thức phải nhận `onAnswered` trả đúng/sai do **Backend** chấm, trong khi cả ba hiện chấm ở client; dời `experiments/theme` ra ngoài `experiments/` (đã ghi cho báo cáo T6).

Agent kiểm tra sau mỗi lớp (theo CLAUDE.md): `contract-guardian` (DSL 4 nơi, openapi), `migration-checker` (V5), `backend-architect-reviewer`, `test-verifier`, `reviewer` (frontend), `ai-prompt-evaluator` (offline, vì động tới schema AI), `security-auditor` (chấm ở Backend, dữ liệu trẻ em), `doc-syncer`, `pre-commit-checker` cuối cùng. `canvas-ux-checker` và `mutation-checker` chỉ khi được yêu cầu.

## 9. Rủi ro và điều chưa chắc

- **Nhánh không merge được** nếu nhóm không đồng ý đổi contract đã đóng băng; nhánh `everyone/UI` có thể xung đột ở `game-dsl.types.ts` (kế hoạch ghi `QUESTION_FORMS`/`playTestRegistry` chỉ có ở nhánh đó).
- Chưa có chuyên gia xác nhận quy tắc chính tả/dấu thanh (3.2) và quy tắc giới từ (3.3); đóng băng vào contract khi chưa xác nhận là rủi ro.
- Chấm ở client trong thử nghiệm; khi vào DSL phải cài lại ở Backend và giữ hai bản khớp (mục 8.6).
- Chưa chắc (chưa tự kiểm): tên thật của ràng buộc `check` trên `games.game_type` ở DB đã chạy V2 (V4 đã gỡ `games_grade_check` kiểu inline tương tự, nên nhiều khả năng là `games_game_type_check`; dùng `drop constraint if exists`); việc `GameGenerationService` có giả định gì về phiên bản schema hay `audioText`; có test frontend nào ngoài danh sách đã biết duyệt `GAME_TYPES`.
- SYLLABLE_BUILDER **phụ thuộc cứng vào TTS** (lời đọc chính là đáp án, học sinh chỉ có `audioUrl`); Backend chưa có TTS (mục 7) nên loại này chưa chơi được đúng thiết kế nếu thiếu T8.1 hoặc dịch vụ tương đương.
- Dữ liệu thử nghiệm hiện có (`questionText`/`instruction`, hình học PREPOSITION_SCENE) không có nơi lưu thật nên không có dữ liệu cũ cần chuyển; chỉ cần đổi tên và bỏ hình học khi chuyển sang DSL.
- Giá trị mặc định điểm/thời gian cho 3 loại (`GameDefaults`) do nhóm chốt; theo mẫu «một đáp án» thì 10 điểm.

## 10. Câu hỏi cho nhóm (trước khi làm T9.2)

0. Nhóm có duyệt việc đổi **cả hai** contract đã freeze (DSL và enum `gameType` ở REST v1.1.0) không?
1. Đồng ý đánh phiên bản theo từng loại (5.c), hay muốn a/b?
2. Cho phép thêm nhóm `PlayInteractionDetail` thứ 8 cho NUMBER_LINE, hay hoãn loại này?
3. SYLLABLE_BUILDER: phương án A (Backend sinh ô lựa chọn, phải cổng luật sang Java) hay B?
4. PREPOSITION_SCENE: chấp nhận bỏ tọa độ khỏi dữ liệu (mẫu hình học cố định, giáo viên không dời được vật mốc)?
5. Ai xác nhận chuyên môn cho quy tắc tiếng Việt và tiếng Anh trước khi đóng băng?
6. `theme`/giọng đọc: để ngoài DSL như đề xuất?
7. Các phần chưa có (subclass phiên chơi, controller, TTS) đang ở nhánh nào?
