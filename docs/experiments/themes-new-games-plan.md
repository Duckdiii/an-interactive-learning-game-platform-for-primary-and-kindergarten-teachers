# Kế hoạch thử nghiệm: chủ đề (theme) và loại game mới

Trạng thái: **ĐANG THỰC HIỆN (đã duyệt T0 đến T1.3; T1.4 đang làm).** Nhánh `experiment/themes-and-new-games`, tạo từ `main` (`61201cd`). Đây là thử nghiệm để biết "hợp hay không", không phải tính năng chính thức; việc merge vào `main` do bạn quyết sau khi xem báo cáo (T6).

> **Điều chỉnh ngày 2026-10-18 (v2):** phạm vi mở rộng sang thử nghiệm **thư viện và công nghệ**. Mục 9 ở cuối file thay thế các ràng buộc "không thêm thư viện", "không tài nguyên ngoài", "không gọi backend", "không đổi DSL" ở những chỗ được nêu rõ trong đó; mọi chỗ khác của file này vẫn đúng. T0 đến T1.3 đã xong không đổi.

## 1. Baseline (đo trên `main`, chưa sửa gì)

| Hạng mục | Kết quả |
|---|---|
| `tsc -b` | qua |
| `npm run lint` (oxlint) | qua, không cảnh báo |
| `vitest run` | **13 file, 164 test, qua đủ**; chạy 2 lần liên tiếp đều qua, khoảng 44 giây; **không thấy test chập chờn** (chỉ 2 lần chạy ở tải một tiến trình, chưa thử tải nặng) |
| `vite build` | chunk `index` 744,35 kB (gzip 229,81 kB), CSS 23,27 kB (gzip 5,30 kB) |

Lưu ý trung thực: `frontend/node_modules` được cài khi đang ở nhánh `everyone/UI` (có thể thừa gói như `qrcode.react`), chưa kiểm chứng bằng `npm ci` sạch trên `main`. Con số bundle phải đo lại bằng `npm ci` sạch trước khi dùng làm mốc ở T5.2.

## 2. Khảo sát kiến trúc trên `main` (bằng chứng từ code)

| Câu hỏi | Kết quả | Nơi |
|---|---|---|
| Phiên bản | React 19.2.8, react-konva 19.3.0, konva 10.7.0, Vite 8.3, vitest 4.1.11, TypeScript 6.0, howler 2.2.4, use-image 1.1.4, **canvas-confetti 1.9.4 (đã cài, không nằm trong danh sách duyệt sẵn của CLAUDE.md)** | `frontend/package.json` |
| Renderer QUIZ | `QuizRenderer` (union theo `mode`: preview/play/review), bố cục thuần ở `quizLayout.ts`; nút đáp án `common/OptionButton.tsx` | `frontend/src/games/quiz/`, `games/common/` |
| Renderer MATCHING | `MatchingRenderer` + `MatchingCard`, `MatchingLines`, `MatchingConfirmButton`; trạng thái ở `matchingReducer.ts`, bố cục ở `matchingLayout.ts`, suy dữ liệu ở `matchingView.ts` | `frontend/src/games/matching/` |
| Màu/font hard-code | `OptionButton.tsx:34,43` (`#A5D6A7`, `#FFE082`, `#334155`); `MatchingCard.tsx:31-37,50,74`; `MatchingConfirmButton.tsx:22-30`; `QuestionAudioButton.tsx:21`; `MatchingRenderer.tsx:68-70` (`LINK_COLORS`, `CORRECT_COLOR`, `WRONG_COLOR`); cỡ chữ là hằng số (`CARD_FONT_SIZE=26` ở `matchingLayout.ts:17`, `fontSize={28}` ở `OptionButton`). Font chưa đặt riêng (mặc định Konva) | các file trên |
| Scale theo màn hình | `games/common/ResponsiveStage.tsx`: sân thiết kế rộng 800 (`STAGE_WIDTH` ở `mediaLayout.ts:5`), co theo chiều rộng khung bằng ResizeObserver, **scale tối đa 1**, `Stage width/height` nhân hệ số | `ResponsiveStage.tsx` |
| Âm thanh | `games/common/sound.ts`: Howler, 3 file WAV ở `frontend/public/sounds/` (`correct`, `try-again`, `pair-matched`, bíp tạm do code sinh), `Howl` tạo lười, không có AudioContext tự quản, không có nút tắt tiếng, không có mở khóa âm thanh. `useFeedback.ts`: đúng thì `canvas-confetti` + âm đúng, sai thì chỉ âm nhẹ. Âm lời đọc: `useQuestionAudio.ts` + `QuestionAudioButton` | `games/common/` |
| Tải trước tài nguyên | **Chưa có.** Ảnh nạp bằng `use-image` trong `useIllustration.ts` và `MatchingCard.tsx`, có trạng thái `failed` và chữ dự phòng (`sideDisplay`) | — |
| Theme, hồ sơ độ tuổi, kiểm tra tương phản, kiểm tra vùng chạm | **Chưa có** (`git grep` theme/ageBand/contrast trên `main` không trúng). Chỉ có quy ước "64px" trong CLAUDE.md và ghi chú ở `matchingLayout.ts:13`. `GradeLevel` (`KINDERGARTEN`, `GRADE_1..5`) có trong `types/game-dsl.types.ts` | — |
| USE_MOCK | **Trên `main` KHÔNG có** (lớp `config/mockMode.ts`, `services/mock/*` chỉ ở `everyone/UI`). Dữ liệu mẫu hiện có là fixture của renderer: `QuizRenderer.fixtures.ts`, `MatchingRenderer.fixtures.ts`, và `public/mock/` | — |
| Nơi xem renderer | `pages/dev/CanvasSandbox.tsx`, route `/dev/canvas-sandbox` chỉ khi `import.meta.env.DEV` (`App.tsx:19-22`) | `App.tsx` |
| Game Type Registry | **Trên `main` không có bảng đăng ký loại game cho renderer**: `GAME_TYPES` (`types/game-dsl.types.ts:12`) chỉ là danh sách; sandbox gắn tay. Bảng `QUESTION_FORMS` và `playTestRegistry` chỉ ở `everyone/UI`. Hệ quả: loại thử nghiệm sẽ có registry riêng trong thư mục thử nghiệm, không chạm `GAME_TYPES`/DSL | — |
| Playwright/ảnh chụp | **Không có script hay dependency Playwright trong repo** (`scripts/` chỉ có `ai-review`, `tool-usage`; `package.json` không có playwright). Ảnh ở `docs/screenshots/` được chụp qua MCP trình duyệt. T5.2 phải viết mới | — |
| Test infra | vitest + jsdom + `@testing-library`; `test-setup.ts` polyfill ResizeObserver; không có canvas thật trong jsdom nên logic tách thành hàm thuần (đúng quy ước CLAUDE.md) | `vite.config.ts`, `src/test-setup.ts` |
| CI | `.github/workflows/ci-pr.yml` (chưa đọc kỹ, chưa kiểm chứng có chạy lint/test frontend) | — |

Chưa chắc/chưa kiểm chứng: hành vi kéo-thả (`draggable`) của Konva trên cảm ứng thật; độ trễ `canvas-confetti` trên máy yếu; `ci-pr.yml` làm gì chính xác.

## 3. Các điều chỉnh so với đề xuất ban đầu (và lý do)

1. **Vị trí thư mục:** dùng `frontend/src/experiments/` thay vì `experiments/` ở gốc repo. Lý do: `tsc`, oxlint, vitest và alias import chỉ phủ `frontend/src`; đặt ngoài thì phải cấu hình lại. Route xem thử `/dev/experiments` chỉ khi `import.meta.env.DEV` (như CanvasSandbox) nên **bản build thường không chứa mã thử nghiệm**. Muốn đo bundle/hiệu năng thì bật cờ `VITE_EXPERIMENTS=1` lúc build riêng.
2. **"USE_MOCK":** `main` không có lớp mock. Thử nghiệm dùng **fixture cục bộ** trong `experiments/fixtures/`, không dựng lại lớp service/mock của `everyone/UI`, không gọi mạng. Không cần cờ `VITE_USE_MOCK`.
3. **Registry loại game:** tạo `experiments/registry.ts` riêng (map tên loại thử nghiệm sang renderer + validate + fixture). Không thêm vào `GAME_TYPES`, không đụng DSL/openapi/schema Java.
4. **T1.4 và T3 phải sửa mã renderer thật** (đang hard-code màu ở ít nhất 5 file). Cách làm an toàn: `ThemeContext` có giá trị mặc định = theme `neutral` chép đúng giá trị hiện tại, renderer đọc từ context; không có provider thì giao diện y hệt. Kiểm bằng test cũ (164 test phải giữ nguyên, không sửa) và so ảnh chụp neutral trước/sau.
5. **AssetLoader (T1.3):** hình theme là SVG sinh bằng code (chuỗi SVG sang data URI, nạp qua `Image`), nên "tải trước" thực chất là giải mã trước và theo dõi tiến độ; vẫn làm đủ cơ chế tiến độ + ảnh dự phòng vì đó là phần cần kiểm chứng.
6. **AudioService (T2.1):** không sửa `sound.ts`/`useFeedback.ts` (đang dùng ở sản phẩm). Viết `experiments/audio/` riêng; `canvas-confetti` đã có sẵn nên ở T2.2 chỉ **đo/giới hạn** chứ không thêm thư viện; hiệu ứng mới dùng Konva Tween/vẽ tay.
7. **Playwright (T5.2):** repo chưa có. Đề xuất `playwright-core` cài bằng `npm i --no-save` (không vào `package.json`), dùng Chrome đã cài trên máy (`channel: 'chrome'`), script đặt ở `frontend/scripts/experiments/` hoặc `scripts/experiments/`. **Cần bạn duyệt** (xem câu hỏi Q3).
8. **Hồ sơ độ tuổi (T5.1):** ánh xạ vào `GradeLevel` có sẵn: PRESCHOOL = `KINDERGARTEN`, GRADE_1_2 = `GRADE_1,2`, GRADE_3_5 = `GRADE_3..5`. Vùng chạm kiểm theo **pixel màn hình sau scale** (không phải đơn vị thiết kế), vì ở 390px `ResponsiveStage` co ~0,49 lần nên thẻ 64 đơn vị chỉ còn ~31px.
9. **Thêm T0 (hạ tầng khung thử nghiệm)** trước T1: thư mục, route dev, fixture, trang xem thử có chọn theme/loại/kích thước, để các subtask sau có chỗ chạy. Đây là subtask nhỏ riêng.
10. **Nhật ký `ai-usage-log.md`:** mỗi subtask thêm một dòng cuối bảng (từ STT 80), không đụng dòng 17–20 và 25. Dòng này cập nhật SHA ở commit sau (quy ước của repo), nên **mỗi subtask = 1 commit chính + (khi duyệt xong) 1 commit nhỏ điền SHA**; nếu bạn muốn đúng "1 subtask = 1 commit" thì gom việc điền SHA vào commit của subtask kế tiếp.

## 4. Thứ tự, phụ thuộc, dừng

`T0 → T1.1 → T1.2 → T1.3 → T1.4 → T2.1 → T2.2 → T2.3 → T3 → T5.1 → T4.1 → T4.2 → T4.3 → T5.2 → T6`

- T5.1 (hồ sơ độ tuổi) làm **trước** T4 để ba loại game mới được kiểm ngay khi viết (đổi so với đề xuất: T5.1 ở sau T4).
- T3 cần T1.4 và T2.2. T4.x cần T1.2, T2.2, T5.1. T5.2 cần T3 và T4. T6 cuối.
- **Mỗi subtask dừng chờ "duyệt".** Quy trình mỗi subtask: viết mã + test → `tsc -b`, `npm run lint`, `vitest run` (13 file/164 test cũ phải giữ nguyên) → `reviewer` + `test-verifier` (và `backend-*` không cần vì không đụng backend) → `pre-commit-checker` → thêm dòng log + `log-auditor` → commit → báo cáo (đã làm gì, file, số test, flaky, hash, ảnh, rủi ro, đề xuất tiếp).
- Thay đổi chạm mã sản phẩm (T1.4, T3: các file renderer) chạy thêm `canvas-ux-checker` nếu bạn yêu cầu.

## 5. Danh sách subtask

Ký hiệu công sức: ngày làm việc của một người, gồm test, review, ảnh. Thư mục gốc: `frontend/src/experiments/` (viết tắt `X/`).

### T0. Khung thử nghiệm (thêm mới)
- **Mục tiêu:** có chỗ chạy: `X/` + route dev `/dev/experiments` (chỉ khi `import.meta.env.DEV` hoặc `VITE_EXPERIMENTS=1`), trang chọn loại/theme/kích thước khung (390, 768, 1280), README ngắn của thư mục.
- **File:** `X/ExperimentsPage.tsx`, `X/registry.ts` (rỗng, khai báo kiểu), `App.tsx` (một route lazy), `X/README.md`.
- **Hoàn thành khi:** `npm run dev` mở được trang trống; `vite build` thường **không** chứa chunk thử nghiệm (kiểm bằng danh sách file `dist`).
- **Test:** registry rỗng không vỡ; route không có khi build thường (test thuần cho hàm quyết định bật/tắt).
- **Rủi ro:** rò mã thử nghiệm vào bản build. **Công sức:** 0,5. **Dừng:** có.

### T1. Hạ tầng chủ đề
**T1.1 Kiểu dữ liệu theme manifest + `validateTheme`**
- **Mục tiêu:** `ThemeManifest` (id, tên, `ageBands` cho phép, bảng màu theo vai trò: nền, thẻ, chữ, viền, đúng, thử lại, nhấn; font; `compatibleMechanics`; cờ `contentSafety: { noViolence: true }`; danh sách tài nguyên). `validateTheme` trả danh sách lỗi: tương tác chữ/nền theo WCAG ≥ 4,5:1 (chữ lớn ≥ 3:1), màu "đúng/thử lại" không phải đỏ gắt (theo CLAUDE.md), `ageBands` hợp lệ, cờ an toàn bật, mọi `compatibleMechanics` thuộc danh sách biết.
- **File:** `X/theme/themeTypes.ts`, `X/theme/validateTheme.ts`, `X/theme/contrast.ts` (+ test).
- **Hoàn thành khi:** bảng ca kiểm (đủ, thiếu, tương phản thấp, đỏ gắt, cờ tắt) qua.
- **Rủi ro:** "đỏ gắt" cần định nghĩa bằng dải sắc độ HSL; tương phản trên nền ảnh/gradient không đo được bằng công thức đơn giản (chỉ đo màu phẳng). **Công sức:** 1. **Dừng:** có.

**T1.2 `ThemeProvider` + theme `neutral`**
- **Mục tiêu:** `ThemeContext` với giá trị mặc định là theme `neutral` có đúng các giá trị đang hard-code (liệt kê ở mục 2); hook `useTheme()`.
- **File:** `X/theme/ThemeContext.tsx`, `X/theme/themes/neutral.ts` (+ test: `neutral` qua `validateTheme`; giá trị khớp hằng hiện có).
- **Hoàn thành khi:** chưa renderer nào dùng, 164 test cũ nguyên vẹn; `neutral` hợp lệ.
- **Rủi ro:** `neutral` hiện có thể **không đạt** tương phản (ví dụ `#334155` trên `#DBEAFE` ổn nhưng `#94A3B8` trên `#E2E8F0` của nút khóa thì thấp): sẽ báo cáo như phát hiện, không sửa màu sản phẩm. **Công sức:** 0,5. **Dừng:** có.

**T1.3 AssetLoader**
- **Mục tiêu:** tải trước danh sách ảnh (SVG data URI) bằng `Image.decode()`, báo tiến độ (đã/tổng), hủy được, ảnh dự phòng khi lỗi, không chặn render (có trạng thái `loading/ready/failed`).
- **File:** `X/assets/assetLoader.ts`, `X/assets/useAssets.ts` (+ test với `Image` giả).
- **Hoàn thành khi:** tiến độ đúng thứ tự, lỗi một ảnh không làm hỏng cả bộ, hủy dừng cập nhật.
- **Rủi ro:** jsdom không có `decode()` thật (dùng giả lập, ghi rõ chưa kiểm trên trình duyệt thật đến T5.2). **Công sức:** 1. **Dừng:** có.

**T1.4 Áp theme vào MATCHING (logic giữ nguyên)**
- **Mục tiêu:** `MatchingCard`, `MatchingConfirmButton`, `MatchingRenderer` (màu liên kết/đúng/sai), `QuestionAudioButton` đọc màu từ `useTheme()`; **không đổi** reducer/layout/hành vi.
- **File:** 4 file renderer ở mục 2 (sửa nhỏ), test mới cho ánh xạ theme → màu.
- **Hoàn thành khi:** 164 test cũ **không sửa** vẫn qua; ảnh chụp `neutral` (3 kích thước) giống hệt trước khi đổi (so từng pixel hoặc ngưỡng rất nhỏ, ghi rõ ngưỡng).
- **Rủi ro:** `Text` của Konva không có `fill` mặc định đen tường minh (sẽ đặt rõ để khớp); QUIZ để T3 (OptionButton). **Công sức:** 1. **Dừng:** có.

### T2. Âm thanh và phản hồi
**T2.1 `AudioService` (Web Audio tổng hợp)**
- **Mục tiêu:** tạo `AudioContext` lười; mở khóa sau lần chạm/click đầu (chính sách autoplay); tổng hợp âm bằng oscillator (đúng: 3 nốt đi lên; thử lại: 2 nốt mềm, nhỏ; hoàn thành: giai điệu ngắn); bật/tắt tiếng, âm lượng; đưa lệnh "phát" vào hàng đợi khi chưa mở khóa.
- **File:** `X/audio/audioService.ts`, `X/audio/tones.ts` (+ test với `AudioContext` giả).
- **Hoàn thành khi:** test chuỗi nốt/thời lượng/âm lượng; tắt tiếng thì không tạo oscillator; **không gọi lại** `sound.ts`.
- **Rủi ro:** tai nghe/loa thật mới đánh giá được âm "dễ chịu cho trẻ" (**việc chỉ bạn làm được**); trên iOS Safari chính sách mở khóa chặt hơn (chưa kiểm chứng). **Công sức:** 1. **Dừng:** có.

**T2.2 Phản hồi dùng chung**
- **Mục tiêu:** `useExperimentFeedback()` (đúng / sai nhẹ nhàng / hoàn thành) kết hợp âm + hiệu ứng Konva (nảy nhẹ, lấp lánh); **giới hạn tần số nhấp nháy ≤ 3 lần/giây** (tiêu chuẩn WCAG 2.3.1), tôn trọng `prefers-reduced-motion`; không đỏ gắt/rung mạnh/âm phạt.
- **File:** `X/feedback/feedbackEffects.ts` (hàm thuần: lịch hiệu ứng, kiểm tần số), `useExperimentFeedback.ts` (+ test).
- **Hoàn thành khi:** test duyệt mọi hiệu ứng: tần số ≤ 3 Hz, có nhánh giảm chuyển động.
- **Rủi ro:** FPS thực chỉ đo ở T5.2. **Công sức:** 1. **Dừng:** có.

**T2.3 Thăm dò TTS (Web Speech API)**
- **Mục tiêu:** trang/tiện ích chỉ **liệt kê** giọng `vi-*`, `en-*` có sẵn trên trình duyệt, và ghi kết quả vào báo cáo; không là phụ thuộc của renderer.
- **File:** `X/audio/ttsProbe.ts`, một mục trong trang thử nghiệm (+ test hàm lọc giọng).
- **Hoàn thành khi:** có bảng (trình duyệt, hệ điều hành, danh sách giọng) cho máy bạn; ghi rõ chưa thử máy khác.
- **Rủi ro:** kết quả phụ thuộc máy; giọng tải bất đồng bộ (`voiceschanged`). **Công sức:** 0,5. **Dừng:** có.

### T3. Hai chủ đề thật: Vũ trụ và Đại dương
- **Mục tiêu:** hai `ThemeManifest` + hình SVG tự vẽ bằng code (hành tinh, sao, tên lửa; cá, bong bóng, sóng), nền, khung thẻ, nút; áp vào MATCHING (T1.4) và **QUIZ** (sửa `OptionButton`, `QuizRenderer` đọc theme). Trang xem thử có chọn theme.
- **File:** `X/theme/themes/{space,ocean}.ts`, `X/theme/art/*.ts` (sinh SVG), `games/common/OptionButton.tsx` và `games/quiz/QuizRenderer.tsx` (sửa nhỏ), test (`validateTheme` qua cho cả hai; ánh xạ màu).
- **Hoàn thành khi:** ảnh chụp 2 renderer × 2 theme × 3 kích thước (390, 768, 1280); không tràn/che khuất bằng mắt (kiểm tự động ở T5.2); 164 test cũ nguyên.
- **Rủi ro:** SVG tự vẽ có thể trông thô (đánh giá thẩm mỹ là việc của bạn/Cô Thơ); nền họa tiết làm giảm tương phản chữ (dùng khối nền phẳng sau chữ). **Công sức:** 2–3. **Dừng:** có.

### T5.1 Hồ sơ độ tuổi (đặt trước T4)
- **Mục tiêu:** `AgeProfile` dữ liệu cho `PRESCHOOL`, `GRADE_1_2`, `GRADE_3_5`: cấm timer/bảng xếp hạng sống cho mầm non, vùng chạm tối thiểu (px màn hình sau scale; mầm non 64, lớp 1–2 56, lớp 3–5 48 — **giá trị đề xuất, cần bạn/cô xác nhận**), số chữ tối đa mỗi thẻ/câu, số lựa chọn tối đa. `validateAgainstProfile(theme | gameFixture, profile)`.
- **File:** `X/age/ageProfiles.ts`, `X/age/validateAgainstProfile.ts` (+ test bảng ca).
- **Hoàn thành khi:** áp được cho theme (ageBands, tương phản) và fixture game; test từng luật ở ranh giới.
- **Rủi ro:** ngưỡng số liệu là giả định sư phạm, không phải sự thật đã kiểm chứng. **Công sức:** 1–1,5. **Dừng:** có.

### T4. Ba loại game mới (chỉ chơi được, fixture cục bộ, không backend)
Chung cho cả ba: kiểu dữ liệu ở `X/games/<loại>/types.ts`, `validate<Loại>` tối thiểu, bố cục tính bằng hàm thuần có test duyệt tổ hợp (không phần tử đè nhau, vùng chạm ≥ ngưỡng), reducer thuần, renderer `mode: 'preview' | 'play'` (`play` nhận callback `onAnswered`, **đáp án tính lại bằng code ở client chỉ trong thử nghiệm**), dùng lại `ResponsiveStage`/`AssetLoader`/`feedback`/theme, fixture, ảnh chụp ở 2 theme × 3 kích thước. Thêm vào `X/registry.ts`. Không đụng `GAME_TYPES`/DSL.

**T4.1 NUMBER_LINE (Toán):** kéo điểm đến vị trí đúng trên trục số (0–10, 0–20), bước nhảy bắt đầu 1; đáp án = `value` đã cho, sai số theo ô; cũng thử nhập bằng nút +/− (thay thế bàn phím). **Rủi ro:** kéo bằng cảm ứng trên Konva (chưa kiểm chứng thiết bị thật); độ chính xác khi trục dài trên màn 390px; kéo-thả khó với mầm non nên thêm "chạm vào vạch" làm lối thay thế. **Công sức:** 2.

**T4.2 SYLLABLE_BUILDER (Tiếng Việt):** ghép âm đầu + vần + dấu thanh ra tiếng; kiểm bằng **bảng quy tắc/từ điển nhỏ** (khoảng vài chục tiếng cho lớp 1) có chuẩn hóa NFC. **Rủi ro:** quy tắc chính tả/ghép vần phức tạp (c/k/q, g/gh, ng/ngh) chỉ phủ tập nhỏ; dấu thanh đặt trên nguyên âm nào (`hoà` / `hòa`) là điểm cần chuyên gia ngôn ngữ xác nhận. **Công sức:** 2–2,5.

**T4.3 PREPOSITION_SCENE (Tiếng Anh):** lệnh chữ (và đọc bằng TTS nếu T2.3 khả thi, không bắt buộc) "Put the cat under the table", kéo vật vào vị trí; kiểm bằng **quy tắc hình học** (under/on/next to/in) trên vùng đích định nghĩa sẵn. **Rủi ro:** định nghĩa "under/on" bằng hình học 2D dễ gây tranh luận; kéo-thả cảm ứng; chữ lệnh tiếng Anh cho trẻ chưa đọc được (cần âm thanh, phụ thuộc T2.3). **Công sức:** 2–3.

### T5.2 Kiểm tra tự động và đo đạc (Playwright)
- **Mục tiêu:** script chụp 3 kích thước × (loại game × theme); phát hiện tràn ngang (`scrollWidth > clientWidth`), phần tử tương tác nhỏ hơn ngưỡng (đo bằng bounding box của vùng chạm sau scale; Konva không có DOM nên đọc bố cục từ hàm thuần/nút ẩn), lỗi console; đo FPS khi CPU bị giới hạn 4× (CDP `Emulation.setCPUThrottlingRate`), thời gian tải theme (AssetLoader), chênh lệch dung lượng bundle (build thường so với `VITE_EXPERIMENTS=1`, sau `npm ci` sạch).
- **File:** `scripts/experiments/*.mjs`, kết quả vào `docs/experiments/results/`.
- **Hoàn thành khi:** một lệnh chạy ra bảng kết quả + ảnh; script có test cho phần phân tích thuần.
- **Rủi ro:** FPS trong trình duyệt tự động ≠ máy trẻ em; không thay được thử máy thật; Playwright chưa có trong repo (Q3). **Công sức:** 2.5–3. **Dừng:** có.

### T6. Báo cáo thử nghiệm
- **Nội dung:** `docs/experiments/themes-new-games-report.md`: kết quả đo, vấn đề gặp, đánh giá "Konva có đủ không" **có bằng chứng** (kéo-thả cảm ứng, FPS, đo chữ, SVG, truy cập bàn phím/trình đọc màn hình vì canvas không có cây DOM), khuyến nghị giữ/bỏ từng phần, ước tính công sức tích hợp vào `main` (gồm đồng bộ DSL 4 nơi + openapi nếu loại game mới được chấp nhận), câu hỏi mở cho thầy/Cô Thơ. **Công sức:** 1. **Dừng:** có.

Tổng ước lượng: khoảng 17–22 ngày làm việc (T0 0,5; T1 3,5; T2 2,5; T3 2–3; T5.1 1–1,5; T4 6–8; T5.2 2,5–3; T6 1).

## 6. Rủi ro tổng thể

1. **Phạm vi lớn so với "thử nghiệm":** 3 loại game + 2 theme + đo đạc; có thể cắt T4.3 hoặc T2.3 nếu cần.
2. **Sửa mã renderer sản phẩm (T1.4, T3)** trên nhánh thử nghiệm: nếu sau này chỉ muốn lấy phần theme thì phần này dễ conflict với `everyone/UI` (nhánh đó đã sửa nhiều chỗ khác; `games/` ít bị đổi nhưng chưa kiểm).
3. **Canvas khó truy cập:** Konva không có cây DOM; kéo-thả + trình đọc màn hình + bàn phím là điểm yếu cấu trúc (đã ghi nhận ở `everyone/UI` cho QUIZ/MATCHING); thử nghiệm sẽ đo, không giải quyết.
4. **Số đo hiệu năng không đại diện** thiết bị thật của lớp học.
5. **Nội dung ngôn ngữ/sư phạm** (ghép vần, giới từ, ngưỡng độ tuổi) là giả định, cần chuyên gia xác nhận.
6. **Hệ thống đã có `canvas-confetti`** ngoài danh sách duyệt sẵn; không mở rộng thêm.

## 7. Việc chỉ bạn làm được

- Nghe thử âm tổng hợp bằng loa/tai nghe thật; xác nhận có "dễ chịu cho trẻ".
- Thử cảm ứng và kéo-thả trên điện thoại/máy tính bảng thật, iOS Safari nếu có.
- Đánh giá thẩm mỹ hai theme SVG; hỏi thầy/Cô Thơ về độ phù hợp lứa tuổi, nội dung ghép vần và giới từ.
- Duyệt ngưỡng hồ sơ độ tuổi (vùng chạm, số chữ).
- Quyết giữ/bỏ từng phần và việc merge sau T6.
- Duyệt thêm dependency (Playwright) nếu muốn T5.2.

## 8. Câu hỏi cần bạn quyết trước khi bắt đầu T0

- **Q1.** Đồng ý đặt thử nghiệm ở `frontend/src/experiments/` (thay vì `experiments/` ở gốc repo) và route `/dev/experiments` chỉ ở dev?
- **Q2.** Ngưỡng vùng chạm theo tuổi (64 / 56 / 48 px màn hình) và "mầm non cấm timer/bảng xếp hạng sống" có đúng ý bạn không, hay lấy từ tài liệu nào?
- **Q3.** Playwright: đồng ý `playwright-core` cài `--no-save` + dùng Chrome có sẵn (không đưa vào `package.json`), hay muốn thêm vào devDependencies, hay dùng MCP trình duyệt để chụp thủ công và bỏ T5.2 tự động?
- **Q4.** Về nhật ký: dòng log mỗi subtask điền SHA ở commit sau (quy ước của repo) — chấp nhận thêm commit nhỏ điền SHA, hay gom vào subtask kế tiếp?
- **Q5.** Thứ tự đã đổi (T5.1 trước T4, thêm T0): đồng ý? Có muốn cắt T4.3 / T2.3 để giảm phạm vi?
- **Q6.** Với T1.4/T3 (sửa renderer sản phẩm bằng ThemeContext mặc định `neutral`): chấp nhận, hay muốn bản sao renderer trong `experiments/` để không chạm mã sản phẩm (đổi lại phải lặp mã và kết quả kém đại diện)?

## 9. Điều chỉnh v2 (2026-10-18): thử nghiệm cả thư viện và công nghệ

Bạn đã chọn (qua câu hỏi ngày 2026-10-18): dev tool `@axe-core/playwright` và `rollup-plugin-visualizer`; thư viện game Lottie/Rive, matter.js, PixiJS, Howler.js; dịch vụ ngoài gồm đánh giá trên giấy, thử thật TTS đám mây, thử thật AI sinh ảnh, và Backend/DSL mới. Mục này ghi cách thực hiện, chỗ phải đổi so với các ràng buộc cũ, và rủi ro. **Chưa cài gì, chưa viết mã cho phần mới**; chờ bạn duyệt mục này.

### 9.1 Bảng công nghệ

| Công nghệ | Loại | Dùng cho | Task |
|---|---|---|---|
| React, TypeScript, Vite, Konva + react-konva, Vitest + Testing Library | đã có | giữ nguyên | T1 đến T5 |
| SVG tự vẽ bằng code, nạp qua `data:` URI, `img.decode()`, đưa vào `Konva.Image` | không cần thư viện | hình theme, nhân vật, vật phẩm | T1.3, T3 |
| Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`, `resume()` sau lần chạm đầu) | API trình duyệt | AudioService, sfx | T2.1 |
| Web Speech API (`speechSynthesis`) | API trình duyệt | chỉ thăm dò giọng, không vào luồng chính | T2.3 |
| `document.fonts` + font hiện có (chờ `document.fonts.ready` trước khi vẽ canvas) | API trình duyệt | chữ tiếng Việt có dấu trên canvas | T3 |
| `String.prototype.normalize('NFC')` | chuẩn JS | SYLLABLE_BUILDER (đã có tiền lệ ở WORD_SCRAMBLE) | T4.2 |
| Playwright (`playwright-core`) + CDP `Emulation.setCPUThrottlingRate` | **thư viện mới (devDependency)** | chụp 3 viewport, đo FPS, phát hiện tràn | T5.2 |
| `@axe-core/playwright` 4.14.0 (MPL-2.0) | **thư viện mới (devDependency)** | kiểm trợ năng tự động | T5.2 |
| `rollup-plugin-visualizer` 7.1.1 (peer: rollup hoặc rolldown) | **thư viện mới (devDependency)** | sơ đồ bundle, so với nhánh gốc | T5.2 |
| PixiJS | **thư viện mới (runtime, chỉ khu thử nghiệm)** | renderer song song để so với Konva | T7.1 |
| Lottie (`lottie-web` hoặc `@lottiefiles/dotlottie-web`) / Rive | **thư viện mới (runtime, chỉ khu thử nghiệm)** | hoạt ảnh phản hồi đúng/sai | T7.2 |
| matter.js | **thư viện mới (runtime, chỉ khu thử nghiệm)** | vật lý 2D cho PREPOSITION_SCENE | T7.3 |
| Howler.js 2.2.4 | đã cài (đang dùng ở `sound.ts`) | so với Web Audio tổng hợp | T7.4 |
| TTS đám mây | **dịch vụ ngoài** | giọng đọc tiếng Việt/Anh chất lượng cao | T8.1 |
| AI sinh ảnh | **dịch vụ ngoài** | ảnh minh họa theo chủ đề | T8.2 |
| Backend và DSL mới | **đổi contract đóng băng** | lưu loại game mới | T9 |

### 9.2 Ràng buộc: đổi gì, giữ gì

| Ràng buộc cũ | Trạng thái mới |
|---|---|
| Không thêm thư viện nếu chưa hỏi | **Đã duyệt** đúng danh sách ở 9.1, **ghim phiên bản chính xác** (không dùng `^`), ghi vào nhật ký. Thư viện ngoài danh sách vẫn phải hỏi |
| Không tải tài nguyên ngoài | Giữ cho T0 đến T5. T7 chỉ dùng thư viện cài qua npm, hoạt ảnh/hình **tự sinh bằng code**. T8 là ngoại lệ có kiểm soát: kết quả sinh ra được lưu cục bộ và duyệt tay |
| Không gọi backend | Giữ cho T0 đến T8. T9 là ngoại lệ, đi riêng (9.5) |
| Không đổi DSL 1.0.0 | Giữ cho đến khi bạn duyệt **bản đề xuất** ở T9.1 (chỉ tài liệu); mọi code DSL/backend nằm sau bước đó |
| Không để lộ secret | **Giữ nguyên, nghiêm ngặt hơn:** khóa API không bao giờ vào mã frontend hay biến `VITE_*` (bị đóng gói vào trình duyệt). T8 chạy bằng script Node cục bộ đọc khóa từ môi trường |
| Mỗi subtask một commit, dừng chờ duyệt | Giữ nguyên |

### 9.3 Thay đổi cho T5.2 (đo đạc)

- `playwright-core` nay là **devDependency ghim phiên bản** (đổi so với quyết định cũ `--no-save`), vì `@axe-core/playwright` yêu cầu nó làm peer. Vẫn dùng Chrome có sẵn (`channel: 'chrome'`), không tải trình duyệt.
- Axe chạy trên trang có DOM; **canvas của Konva không có cây DOM** nên axe chỉ kiểm phần quanh canvas (nút, nhãn, tương phản vùng DOM). Phần trong canvas vẫn do kiểm tra bố cục của T5.2 và báo cáo T6 đánh giá. Đây là giới hạn của công cụ, không phải lỗi.
- `rollup-plugin-visualizer`: Vite 8 dùng Rolldown; plugin khai báo hỗ trợ `rolldown` nhưng **chưa kiểm chứng chạy với bản này**. Cấu hình chỉ bật khi `ANALYZE=1`, không ảnh hưởng build thường. Nếu không chạy được thì quay về đọc kích thước file trong `dist/`.
- Số đo hiệu năng và ảnh chụp: **ưu tiên chạy bằng Playwright + Chrome có giao diện**. Cửa sổ trình duyệt nhúng của công cụ này bị ẩn nên Konva không vẽ đều (xem 9.6); không dùng nó để so pixel.

### 9.4 T7. So sánh thư viện (mới)

Dùng **một kịch bản đo chung** để công bằng: màn "kéo 5 vật vào 3 vùng, có phản hồi đúng/sai" (tái dùng dữ liệu của DRAG_DROP/PREPOSITION_SCENE), chạy ở 390/768/1280px, CPU giảm 4×. Chỉ số: FPS trung bình và thấp nhất, thời gian tới khung hình đầu, kích thước thêm vào bundle (gzip), kéo bằng cảm ứng, chữ tiếng Việt có dấu, mức dùng bộ nhớ, công sức viết, truy cập bằng bàn phím. Mỗi thư viện nằm trong `frontend/src/experiments/spikes/<tên>/`, **tải lười (`React.lazy`)** để không vào bundle thường, và gỡ được bằng cách xóa thư mục + dependency.

- **T7.1 PixiJS** (công sức 2 đến 3 ngày): renderer song song cho kịch bản chung; so với Konva về FPS, kéo thả, vẽ chữ. Rủi ro: chữ tiếng Việt có dấu trên WebGL (cần bitmap/Canvas text), bundle lớn, hai hệ tọa độ song song làm khó tái dùng `ResponsiveStage`.
- **T7.2 Lottie / Rive** (2 đến 3 ngày): hoạt ảnh đúng/sai (sao nảy, gật đầu). **Lottie:** tự viết JSON hoạt ảnh bằng code (không tải file ngoài); đo `lottie-web` (khá nặng) so với `@lottiefiles/dotlottie-web`; tích hợp với canvas Konva bằng lớp DOM chồng lên. **Rive:** cần file `.riv` tạo từ trình soạn thảo bên ngoài, **không tự sinh bằng code được**; nên T7.2 chỉ đánh giá Rive trên giấy (kích thước runtime WASM, quy trình thiết kế) **trừ khi bạn cung cấp file `.riv`** (hỏi ở Q10). Rủi ro: giấy phép/nguồn của file hoạt ảnh nếu lấy từ ngoài.
- **T7.3 matter.js** (2 ngày): vật rơi/va chạm cho PREPOSITION_SCENE ("đặt con mèo dưới cái bàn": vật rơi xuống, dừng trên bàn) và hiệu ứng. Vẽ vẫn bằng Konva, matter chỉ tính vị trí. Rủi ro: vật lý làm kết quả "đúng/sai" không xác định nếu phụ thuộc mô phỏng; luật đáp án vẫn phải là hàm thuần trên tọa độ cuối, không dựa vào lần chạy vật lý.
- **T7.4 Howler vs Web Audio** (1 ngày): đo độ trễ phát, mở khóa trên di động, xử lý khi không có file, kích thước. Howler đã cài nên chi phí thêm bằng 0; kết luận cho T2.1.

Mỗi spike kết thúc bằng một bảng số đo trong `docs/experiments/results/` và một dòng khuyến nghị giữ/bỏ trong báo cáo T6. **Phaser:** có ở danh sách ban đầu nhưng bạn không chọn; không làm.

### 9.5 T8 và T9. Dịch vụ ngoài và contract (mới, rủi ro cao, đi sau cùng)

**T8. Thử thật có kiểm soát** (cần bạn cung cấp khóa và ngân sách; tôi không tự nhập khóa):
- **T8.1 TTS đám mây** (2 ngày). Gợi ý dùng **Google Cloud Text-to-Speech** vì `CLAUDE.md` đã nhắc Google TTS cho dự án; bạn xác nhận nhà cung cấp ở Q8. Làm bằng **script Node cục bộ** sinh sẵn một bộ nhỏ file MP3 tiếng Việt/Anh (từ cần cho 3 loại game mới) vào thư mục thử nghiệm, kiểm nghe bằng tai, ghi chi phí; khóa chỉ đọc từ biến môi trường, không commit, không đưa vào trình duyệt. Test dùng mock, không gọi thật (theo `CLAUDE.md`).
- **T8.2 AI sinh ảnh** (2 ngày). Script Node cục bộ sinh một bộ nhỏ ảnh minh họa theo chủ đề, **mỗi ảnh phải qua kiểm duyệt an toàn và được bạn xem duyệt tay** trước khi được commit; ghi chi phí và giấy phép/điều khoản sử dụng của nhà cung cấp. Đánh giá thẩm mỹ và độ an toàn cho trẻ em là việc của bạn và Cô Thơ.
- Cả hai: **đặt trần chi phí do bạn quy định**, script dừng khi chạm trần, không có vòng lặp thử lại tự động tốn phí.

**T9. Backend và DSL mới** (đi riêng, **hai bước**):
- **T9.1 Bản đề xuất (chỉ tài liệu, 1 đến 2 ngày):** chạy `impact-analyzer` rồi viết `docs/experiments/dsl-1.1-proposal.md`: các trường mới cho 3 loại game (và `theme`/giọng đọc nếu cần), ảnh hưởng tới 4 nơi của DSL (`docs/game-json-dsl`, JSON Schema, record Java, `game-dsl.types.ts`), `openapi.yaml`, migration Flyway, strategy/factory/rule/validator, `GameDslSchemaTest`. **Không sửa gì ngoài file đề xuất.**
- **T9.2 Cài đặt (chỉ sau khi bạn duyệt bản đề xuất, ước tính 5 đến 8 ngày):** theo thứ tự `openapi.yaml` trước, code sau (quy ước của dự án), migration mới (không sửa migration cũ), `backend-implementer` trong worktree riêng, `contract-guardian` + `migration-checker` + `backend-architect-reviewer` + `test-verifier`.
- **Cảnh báo:** DSL 1.0.0 là contract đã đóng băng đồng bộ với cả nhóm (CLAUDE.md). Đổi nó trên nhánh thử nghiệm làm nhánh **không merge được** nếu nhóm không đồng ý; nên T9.2 chỉ làm khi bạn đã trao đổi với nhóm. Hiện chưa có controller game nào ở Backend (chỉ có `/api/auth`), nên "lưu loại game mới" chưa chạy được end-to-end ngay cả khi DSL xong.

### 9.6 Phát hiện trong lúc làm T1.4 (cần ghi nhận)

- Trình duyệt nhúng của công cụ này **ẩn cửa sổ**, nên `requestAnimationFrame` và việc nạp ảnh của Konva không ổn định: cùng một mã cho kết quả pixel khác nhau giữa các lần chạy ở các màn có ảnh (`Có ảnh`, quiz có ảnh); thậm chí ở một lần chạy, thẻ `Có ảnh` không có node ảnh nào cả với cả mã cũ. Các màn **không có ảnh đều trùng khít pixel** ở 390px (lần so sánh đầu). So pixel ở màn có ảnh phải chạy trong Chrome có giao diện bằng Playwright (T5.2) hoặc chờ bạn xem ảnh chụp.
- Mã renderer thật (`games/`) nay import `experiments/theme`: nếu sau này merge thì phải chuyển thư mục theme ra ngoài `experiments/`. Đã ghi vào danh sách việc tích hợp ở T6.

### 9.7 Thứ tự, công sức, câu hỏi

- **Thứ tự mới:** `T1.4 → T2.1 → T2.2 → T2.3 → T3 → T5.1 → T4.1 → T4.2 → T4.3 → T5.2 (có axe, visualizer) → [điểm dừng đánh giá] → T7.1 → T7.2 → T7.3 → T7.4 → T8.1 → T8.2 → T9.1 → (T9.2 nếu được duyệt) → T6`.
- **Điểm dừng đánh giá sau T5.2:** xem lại kết quả đo trước khi sang T7, để quyết còn cần thử PixiJS/Lottie/matter hay không (có thể Konva đã đủ).
- **Công sức mới:** T5.2 tăng 1 ngày (axe, visualizer); T7 khoảng 7 đến 9 ngày; T8 khoảng 4 ngày (không kể chờ khóa/duyệt ảnh); T9.1 khoảng 1 đến 2 ngày; T9.2 khoảng 5 đến 8 ngày. **Tổng kế hoạch khoảng 35 đến 45 ngày** (trước đó 17 đến 22; gồm T9.2). Đây là khối lượng lớn cho một "thử nghiệm"; nếu cần cắt, thứ tự bỏ đề xuất: T9.2, T8.2, T7.2 (Rive), T7.1.
- **Việc chỉ bạn làm được (thêm):** cung cấp khóa API và đặt trần chi phí cho T8; nghe thử TTS và xem duyệt ảnh AI; cung cấp file `.riv` nếu muốn thử Rive thật; trao đổi với nhóm trước T9.2; thử PixiJS/Konva trên điện thoại thật.

**Câu hỏi cần bạn trả lời trước khi làm các phần mới:**
- **Q7.** Đồng ý ghim phiên bản chính xác và cài `playwright-core` làm devDependency (thay `--no-save`)?
- **Q8.** TTS: dùng Google Cloud TTS? Trần chi phí bao nhiêu? Khóa để ở đâu (gợi ý: `.env` cá nhân của bạn, không commit)?
- **Q9.** AI sinh ảnh: nhà cung cấp nào (gợi ý ngang hàng với Gemini mà dự án đã dùng, hoặc OpenAI mà dự án đã có khóa kiểm duyệt)? Trần chi phí? Quy tắc duyệt ảnh?
- **Q10.** Rive: bạn có file `.riv` để thử không, hay chỉ đánh giá trên giấy?
- **Q11.** T9.2 (đổi backend/DSL thật): đã trao đổi với nhóm chưa, hay chỉ làm bản đề xuất T9.1 rồi dừng?
- **Q12.** Chấp nhận điểm dừng đánh giá sau T5.2 và thứ tự cắt giảm ở trên?
