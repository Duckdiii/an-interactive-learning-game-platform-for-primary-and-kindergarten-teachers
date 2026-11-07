# Kế hoạch: backend game thật và game CPF sinh bằng Gemini

Trạng thái: **đã duyệt** (2026-11-07, ghi ở `docs/decisions.md`); bước contract xong. Mục 8: điểm 1 và 2 đã chốt theo đề xuất, điểm 3 hỏi lại ở bước backend 4. Thay thứ tự Pha 1–4 của `docs/superpowers/specs/2026-11-07-pipeline-v2-design.md`: người dùng chọn chạy game CPF bằng Gemini thật trong luồng giáo viên chính (không trang dev), và làm đủ backend thật cho nhóm Games.

## 1. Hiện trạng (đối chiếu code `dev`, 2026-11-07)

- Frontend khi chạy dev mô phỏng mọi nhóm endpoint (`VITE_USE_MOCK`); luồng giáo viên (tạo game → Workspace Editor → chơi thử → lưu) đọc/ghi kho mô phỏng.
- Backend có `GameGenerationController` dạng thử nghiệm, lệch `openapi.yaml`:
  - `POST /api/games/generate` trả `GameGenerationResponse` (`dsl`, `report`, `latencyMs`), không phải `GameResponse`; không lưu DB; không kiểm `idea`/`randomTopic`.
  - `POST /api/games/recommend`, `POST /api/games`, `GET /api/games/play/{shareCode}` không có trong `openapi.yaml`; kho xuất bản nằm trong bộ nhớ.
- Chưa có `GET /games`, `GET /games/{id}`, `PUT /games/{id}`, `DELETE /games/{id}` (đều `planned`).
- Đã có: entity `Game` + 10 subclass `QuestionGame` (migration V4), `GameRepository`, `GameContentStrategy.parseToQuestions`/`toDsl` (ánh xạ DSL ↔ entity), chuỗi kiểm duyệt 3 lớp, `GameGenerationService` gọi Gemini có vòng tự sửa, `AuthController` (JWT + refresh cookie).
- Frontend `main.tsx` (dev) tự đăng nhập tài khoản giả với token giả: backend thật sẽ trả 401, giáo viên phải đăng nhập thật.

## 2. Phạm vi

Trong phạm vi (đúng `openapi.yaml`, sửa spec trước khi code):

| Endpoint | Việc |
|---|---|
| `POST /games/generate` | Bản JSON đồng bộ (chưa SSE): sinh bằng Gemini, 3 lớp kiểm duyệt, **lưu DB**, trả `GameResponse` `DRAFT`. Thêm `gameType: CUSTOM` cho CPF |
| `GET /games` | Danh sách game của giáo viên đăng nhập |
| `GET /games/{gameId}` | Mở game đầy đủ cho Workspace Editor |
| `PUT /games/{gameId}` | Lưu chỉnh sửa, chạy lại 3 lớp kiểm duyệt |
| `DELETE /games/{gameId}` | Xóa game của mình |

Ngoài phạm vi đợt này (giữ mô phỏng, ghi rõ): xuất bản và mã chia sẻ (`publish`), phiên chơi và chấm (`sessions`), học sinh chơi (`shared/...`), AI làm lại câu/cả game, tải media, SSE, chấm CPF ở chế độ `play`. Game CPF trong đợt này chơi được ở **chế độ xem thử của giáo viên** (`preview`).

## 3. Contract (làm trước, bước 1)

1. `openapi.yaml`:
   - `GameType` thêm `CUSTOM`.
   - `GameResponse` thành `oneOf`: nhánh DSL hiện có, và nhánh CPF = `gameId, status, updatedAt` + CPF Game v2.0.0 (`$ref` tới `schema/cpf/2.0.0/cpf-game.schema.json`). `GameSummary.gameType` nhận `CUSTOM`.
   - `PUT /games/{gameId}` body: `oneOf` envelope DSL hoặc CPF.
   - `x-status` của 5 endpoint chuyển sang `implemented` khi xong. Kết quả: `GET /games/{gameId}` là `implemented`; 4 endpoint còn lại giữ `extended-pending` theo đúng quy ước của spec, vì phần mở rộng trong mô tả chưa cài (SSE, `shareUrl`/`thumbnailUrl`, EditLog, phân biệt phiên đã kết thúc khi 409); ghi chú ngay cạnh từng `x-status`.
   - Ghi rõ `idea` là đầu vào để AI lập kế hoạch CPF; `gameType: CUSTOM` không bắt buộc người dùng chọn cơ chế.
2. Frontend `types`: `GameType` thêm `CUSTOM`, `GameResponse` có nhánh CPF (dùng `cpf-game.types.ts`). DSL v1.0.0 không đổi.
3. Kiểm: `npx @redocly/cli lint docs/openapi/openapi.yaml`, `contract-guardian`.

Điểm cần duyệt: `CUSTOM` có xuất hiện trong danh sách loại game giáo viên tự chọn không, hay chỉ do hệ thống đề xuất khi mô tả ngoài danh mục (đề xuất: chỉ đề xuất, không chọn tay).

## 4. Backend

Thứ tự (mỗi bước build + test xanh):

1. **Lưu trữ CPF (phương án B):** `GameType.CUSTOM`; `CpfQuestion extends QuestionGame` (JOINED) với cột `payload jsonb`; migration `V7__cpf_question.sql` (bảng `cpf_questions`, mở ràng buộc `CHECK` của `games.game_type` nếu có). Sửa `GameDslSchemaRegistry`, `GameContentStrategyRegistry`, `GameDslSchemaTest` để không đòi schema/strategy DSL cho `CUSTOM`. Chạy `migration-checker`.
2. **Kiểm duyệt CPF:** validator Lớp 1 (schema CPF), Lớp 2 (luật mục 4.2 của `docs/cpf-game-v2.0.0.md`), Lớp 3 (dùng lại bộ kiểm an toàn hiện có), nối vào chuỗi `AbstractGameValidator` bằng đa hình theo loại nội dung. Test bằng 5 ví dụ và biến thể sai.
3. **Sinh CPF bằng Gemini:** schema đầu ra AI (nông, `schema/game-ai-output/cpf/`), prompt kèm danh mục khối và danh sách `assetId` hợp lệ, chuyển đầu ra AI sang dạng hoàn chỉnh (gán id, chỉ số → id), vòng tự sửa 2 lần như DSL. Test mock Gemini (không gọi API thật); `ai-prompt-evaluator` offline.
4. **Controller Games theo `openapi.yaml`:** `GamesController` mới (generate, list, get, update, delete), chỉ điều phối; logic ở `GameService` (lưu/đọc qua `parseToQuestions`/`toDsl`, CPF qua `CpfQuestion`). Kiểm quyền: giáo viên chỉ thấy/sửa game của mình. Endpoint thử nghiệm cũ (`/recommend`, `POST /games`, `/play/{shareCode}`): hỏi người dùng gỡ hay giữ trước khi đụng. Chạy `security-auditor`.

Phần 1, 2 có spec đủ (contract + tài liệu CPF) nên có thể giao `backend-implementer` trong worktree; 3, 4 phiên chính làm vì có quyết định thiết kế prompt và luồng.

## 5. Frontend

1. **Runtime CPF** (`frontend/src/games/cpf/`): bố cục (đã có), máy trạng thái màn/game, chuyển động và va chạm, renderer Konva 3 chế độ, dùng lại `games/common`. Test hàm thuần, kể cả đường trẻ chọn sai mọi lần vẫn tới cuối game.
2. **Nối luồng giáo viên:** gợi ý loại game đưa ra `CUSTOM` khi mô tả ngoài danh mục; `gamesService` gửi `gameType: CUSTOM`; Workspace Editor, chơi thử, trình chiếu hiện `CpfRenderer` cho game `CUSTOM` (thay `CpfUniversalCanvas`). Bỏ regex router và `generateDynamicCpfSceneGraph` khỏi các chỗ này.
3. **Bật backend thật:** cấu hình `VITE_USE_MOCK` để nhóm `ai`, `games`, `editor` gọi thật (các nhóm khác vẫn mô phỏng); bỏ tự đăng nhập giả trong `main.tsx` khi các nhóm này là thật. Ghi `.env.example`.
4. **Chạy thật:** khởi động backend (Gemini thật, Supabase), đăng nhập, tạo game với vài mô tả lạ, mở Workspace Editor, chơi thử, lưu. Mỗi lần sinh tốn một lượt gọi Gemini; giới hạn số lần thử.

## 6. Kiểm chứng

- Backend: `./mvnw clean install`, toàn bộ test (mock Gemini), JaCoCo.
- Frontend: `npm run build`, test, lint các file mới.
- Agent theo bảng định tuyến: `reviewer`, `test-verifier`, `backend-architect-reviewer`, `contract-guardian`, `migration-checker`, `security-auditor`, `ai-prompt-evaluator`; `pre-commit-checker` trước mỗi commit.
- Chạy thật trên trình duyệt với Gemini; ghi lại mô tả đã thử và kết quả.

Mỗi bước lớn (contract; backend 1–2; backend 3–4; frontend 1; frontend 2–4) một commit, dừng báo người dùng sau mỗi bước.

### Kết quả chạy thật với Gemini (2026-11-07, `gemini-3-flash-preview`, `gameType: CUSTOM`)

| Mô tả | Môn/Lớp | Kết quả | Số lần thử | Cơ chế AI chọn |
|---|---|---|---|---|
| Bé kéo giỏ hứng những quả táo rơi mang số chẵn trong phạm vi 10 | Toán / Lớp 1 | Hợp lệ, chơi hết trên trình duyệt | 3 (trước khi sửa prompt) | Hứng: giỏ DRAG_X + PROGRESS, táo FALL STREAM, COLLIDE, 4 màn PICK_ONE |
| Fishing game: catch the fish with the right colour word | Tiếng Anh / Mầm non | Hợp lệ | 1 | Hứng: thuyền DRAG_X + PROGRESS, cá FALL, COLLIDE, 4 màn PICK_ONE |
| Kéo thả các con vật vào đúng nơi sống: trên cạn hay dưới nước | Tiếng Việt / Lớp 2 | Hợp lệ | 1 | Phân loại: con vật DRAG_FREE, nhóm bindTo zones, DROP, 2 màn SORT |
| Bé chạm vào những quả bóng bay mang kết quả đúng của phép cộng trong phạm vi 10 | Toán / Lớp 1 | Hợp lệ | 1 (lần gọi đầu Gemini lỗi tạm thời, gọi lại) | Chạm: bóng BOB, chim PROGRESS, TAP, 5 màn PICK_ONE |

Lỗi gặp và cách xử lý: decoder phẳng làm Gemini điền trường thừa (`add` cho EFFECT/SOUND) và bỏ `at` của EFFECT, đã chuẩn hóa ở `CpfGenerationService`; vi phạm giới hạn số lượng (`onCorrect` 5 phần tử, luật PROGRESS) đã thêm luật gộp và danh sách kiểm cuối prompt trong `CpfPromptBuilder`. Sau hai sửa này, 3/3 mô tả mới hợp lệ ngay lần đầu (mẫu nhỏ, chưa phải tỉ lệ thống kê). Mỗi lần sinh mất khoảng 20 giây.

## 7. Rủi ro

- Migration chạy thẳng trên Supabase thật (không có DB local); viết migration chỉ thêm, không sửa cũ.
- Sửa `GameType` chạm mọi chỗ duyệt `GameType.values()`; thiếu chỗ nào app không khởi động.
- Gemini với schema CPF có thể vướng giới hạn structured output; giữ schema đầu ra AI nông.
- Endpoint thử nghiệm cũ có thể đang được frontend dùng (`/games/recommend`, `/games/play/{code}` trong `gamesApi.ts`).
- Khối lượng lớn: nhiều phiên làm việc.

## 8. Cần người dùng chốt trước khi bắt đầu

1. Duyệt phạm vi mục 2 (đặc biệt: xuất bản và học sinh chơi vẫn mô phỏng đợt này).
2. `CUSTOM` chỉ do hệ thống đề xuất, giáo viên không tự chọn (mục 3).
3. Endpoint thử nghiệm cũ trong `GameGenerationController`: gỡ và chuyển frontend sang endpoint theo contract, hay giữ.
