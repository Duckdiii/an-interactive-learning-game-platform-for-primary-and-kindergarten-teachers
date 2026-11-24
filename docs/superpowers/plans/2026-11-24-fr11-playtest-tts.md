# FR-11 PlayTest TTS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giáo viên nghe được câu hỏi và phản hồi đúng/sai bằng TTS phù hợp ngôn ngữ trong PlayTest, với audio câu hỏi và cache phản hồi lưu trên Supabase.

**Architecture:** Backend chọn Viettel cho `MATH`/`VIETNAMESE`, ElevenLabs Flash 2.5 cho `ENGLISH`; API key chỉ tồn tại ở backend. Narration của câu hỏi dùng asset per-game hiện tại, còn hai phản hồi cố định dùng bảng cache chung và private Supabase Storage. Frontend truyền signed URL đúng snapshot vào PlayTest, tự phát theo trạng thái, có phát lại và để nguyên luồng chơi nếu âm thanh thất bại.

**Tech Stack:** Spring Boot, JPA/Flyway, Spring `RestClient`, Supabase Storage/PostgreSQL, React, TypeScript, Vitest, JUnit.

**Spec:** [FR-11 PlayTest TTS design](../specs/2026-11-24-fr11-playtest-tts-design.md)

## Global Constraints

- Không sửa luật/renderer của 10 loại game: cơ chế tương tác, điều kiện đúng/sai, tính điểm, retry, hoàn tất phải giữ nguyên.
- `ENGLISH` → ElevenLabs; `MATH`/`VIETNAMESE` → Viettel theo giả định trong spec.
- ElevenLabs key và Supabase service-role key chỉ ở backend; không hiển thị hoặc log.
- Câu hỏi giữ giới hạn 300 code point, 256 KiB/file, 30 giây/file; mỗi game tối đa 20 file narration/5 MiB.
- Audio feedback là cache dùng chung, không tính vào quota file riêng của game; signed URL tối đa 600 giây.
- PlayTest không tạo session, lưu đáp án/điểm hay gọi endpoint publish.

## Review Focus

- **URL cũ sau khi sửa text hoặc chưa lưu:** kiểm thử editor không truyền audio cũ vào renderer.
- **TTS phản hồi đúng/sai bị đảo hoặc phát chồng:** kiểm thử đúng/sai theo `onResult`; audio cũ dừng khi câu/trạng thái đổi.
- **Autoplay bị chặn hoặc URL hết hạn:** thông báo/nút nghe lại không che kết quả hoặc chặn thao tác.
- **Provider/API key/Storage lỗi:** test xác nhận code lỗi có thể khắc phục và nội dung game vẫn hoạt động.
- **Cache lệch voice/model:** key cache có đủ cấu hình; unique constraint bảo vệ bản ghi; lỗi khi ký URL không xóa asset hợp lệ.

---

### Task 1: Routing narration câu hỏi qua Viettel/ElevenLabs

**Files:**
- Create: `backend/src/main/java/com/aigameplatform/backend/service/narration/SynthesizedAudio.java`
- Create: `backend/src/main/java/com/aigameplatform/backend/service/narration/ElevenLabsTtsClient.java`
- Create: `backend/src/test/java/com/aigameplatform/backend/service/narration/ElevenLabsTtsClientTest.java`
- Modify: `backend/src/main/java/com/aigameplatform/backend/service/narration/GameNarrationService.java`
- Modify: `backend/src/main/java/com/aigameplatform/backend/service/narration/ViettelTtsClient.java`
- Modify: `backend/src/test/java/com/aigameplatform/backend/service/narration/ViettelTtsClientTest.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/.env.example`
- Modify: `backend/src/test/java/com/aigameplatform/backend/service/narration/GameNarrationServiceTest.java`

**Interfaces:**
- Consumes: `Game.subject`, `QuestionGame.audioText`, `Mp3AudioValidator`, `SupabaseNarrationStorage`.
- Produces: shared `SynthesizedAudio(byte[] audio, double durationSeconds)`; `ElevenLabsTtsClient.synthesizeEnglish(String): SynthesizedAudio`; `GameNarrationService.generate(...)` selects the provider from persisted subject; fingerprint includes provider, voice, model and normalized text.

- [x] **Step 1: Write failing tests** for ElevenLabs request URL/header/body, valid MP3 validation, empty key, HTTP error and over-limit response; add routing assertions for ENGLISH versus MATH/VIETNAMESE and cache fingerprint provider changes.
- [x] **Step 2: Run targeted tests to verify RED**

Run in `backend`: `./mvnw.cmd -Dtest=ElevenLabsTtsClientTest,ViettelTtsClientTest,GameNarrationServiceTest test`

Expected: compile/test failure because client/config/routing are absent.

- [x] **Step 3: Implement** the server-only client using `xi-api-key`, explicit model `eleven_flash_v2_5`, configurable voice/model, bounded response read, existing MP3 validator and bounded timeout. Keep Viettel path and its existing validations.
- [x] **Step 4: Run targeted tests to verify GREEN**

Run in `backend`: `./mvnw.cmd -Dtest=ElevenLabsTtsClientTest,ViettelTtsClientTest,GameNarrationServiceTest test`

Expected: all tests pass; no credential appears in assertion output.

### Task 2: Shared correct/wrong audio cache in Supabase

**Files:**
- Create: `backend/src/main/java/com/aigameplatform/backend/entity/SharedNarrationAsset.java`
- Create: `backend/src/main/java/com/aigameplatform/backend/repository/SharedNarrationAssetRepository.java`
- Create: `backend/src/main/java/com/aigameplatform/backend/service/narration/NarrationFeedbackService.java`
- Create: `backend/src/test/java/com/aigameplatform/backend/service/narration/NarrationFeedbackServiceTest.java`
- Create: `backend/src/main/resources/db/migration/V31__shared_narration_feedback_assets.sql`
- Modify: `backend/src/main/java/com/aigameplatform/backend/controller/GameNarrationController.java`
- Create: `backend/src/test/java/com/aigameplatform/backend/controller/GameNarrationControllerTest.java`
- Modify: `backend/src/main/resources/application.yml`

**Interfaces:**
- Consumes: persisted game subject/owner, provider routing from Task 1, private Storage, `Mp3AudioValidator`.
- Produces: authenticated `POST /api/games/{gameId}/narration/feedback` returning `{ correctAudioUrl, wrongAudioUrl }`; the server derives language from owned game and generates/caches only fixed approved phrases.

- [x] **Step 1: Write failing tests** for cache miss synthesis/upload, cache hit without provider call, provider-specific key separation, invalid game/owner, malformed response and Storage failure.
- [x] **Step 2: Run targeted tests to verify RED**

Run in `backend`: `./mvnw.cmd -Dtest=NarrationFeedbackServiceTest,GameNarrationControllerTest test`

Expected: test compilation fails because cache/API types do not exist.

- [x] **Step 3: Add V31** with unique cache key over language, provider, voice, model and phrase version; add bounded MP3 metadata/path columns and foreign-key-free shared scope. Implement service/controller; return URLs signed for at most 600 seconds. Do not store phrase text or user prompt in logs.
- [x] **Step 4: Run targeted tests to verify GREEN**

Run in `backend`: `./mvnw.cmd -Dtest=NarrationFeedbackServiceTest,GameNarrationControllerTest test`

Expected: cache hit performs zero TTS calls and failures never return stale/mismatched asset URLs.

### Task 3: Connect editor narration and feedback audio to PlayTest

**Files:**
- Modify: `frontend/src/api/gamesApi.ts`
- Modify: `frontend/src/components/editor/NarrationPreviewControl.tsx`
- Modify: `frontend/src/pages/WorkspaceEditor.tsx`
- Modify: `frontend/src/components/editor/PlayTestPanel.tsx`
- Create: `frontend/src/components/editor/usePlayTestNarrationAudio.ts`
- Create: `frontend/src/components/editor/usePlayTestNarrationAudio.test.tsx`
- Modify: `frontend/src/components/editor/NarrationPreviewControl.test.tsx`
- Modify: `frontend/src/components/editor/PlayTestPanel.test.tsx`
- Modify: `frontend/src/pages/WorkspaceEditorPlay.test.tsx`

**Interfaces:**
- Consumes: preview `{ questionId, audioUrl }`, feedback `{ correctAudioUrl, wrongAudioUrl }`, current saved question text and game subject.
- Produces: PlayTest audio inputs keyed by question ID + exact text snapshot; the narration control label follows subject; one hook serializes prompt/result playback and UI status exposes loading/error/replay without changing the renderer `onResult` contract or game reducer.

- [ ] **Step 1: Write failing UI tests** for passing the generated URL into PlayTest, rejecting stale/unsaved URL, subject-specific narration label, autoplay/replay question, correct/wrong feedback selection, no overlap, and retaining text/controls on URL/API/playback failure.
- [ ] **Step 2: Run targeted tests to verify RED**

Run in `frontend`: `npm test -- src/components/editor/NarrationPreviewControl.test.tsx src/components/editor/PlayTestPanel.test.tsx src/pages/WorkspaceEditorPlay.test.tsx`

Expected: assertions fail because PlayTest receives no narration URLs or feedback API state.

- [ ] **Step 3: Implement** a callback from preview to workspace state; clear/invalidate audio on question/text change; only overlay exact saved snapshots in PlayTest. Load the two feedback URLs once per PlayTest entry, auto-play the current question/result in sequence through `usePlayTestNarrationAudio`, stop the previous clip, and expose accessible retry/replay state when browser blocks playback.
- [ ] **Step 4: Run targeted tests and frontend build**

Run in `frontend`: `npm test -- src/components/editor/NarrationPreviewControl.test.tsx src/components/editor/PlayTestPanel.test.tsx src/pages/WorkspaceEditorPlay.test.tsx`; then `npm run build`

Expected: tests and TypeScript/Vite build pass; tests confirm PlayTest makes no session/result calls.

### Task 4: Verify real ElevenLabs + Supabase and regressions

**Files:**
- Modify: `backend/src/test/java/com/aigameplatform/backend/service/narration/GameNarrationSupabaseLiveTest.java`
- Review: tests for all supported PlayTest renderers and `backend/.env.example`.

**Interfaces:**
- Consumes: TTS and Storage properties imported from `backend/.env` by Spring; `FR11_SUPABASE_EXPECTED_DB_HOST` may be provided to guard the live database target. Never print values.
- Produces: opt-in end-to-end evidence for real English TTS, V31 cache persistence, Supabase signed HTTP download, validator acceptance and cache reuse; synthetic game rows, per-game audio and unique test cache entries are removed. No mock is used in this smoke test.

- [x] **Step 1: Extend the existing opt-in Supabase integration fixture** to test an owned ENGLISH game, an English `audioText`, ElevenLabs synthesis and V31 feedback cache miss/hit; assert bounded MP3, signed URL HTTP 200, downloaded bytes validate, the second request reuses the cached asset, and synthetic game rows/per-game objects are absent after cleanup. Read `.env`-backed Spring properties without printing them.
- [x] **Step 2: Run offline targeted suites**

Run in `backend`: `./mvnw.cmd -Dtest=ElevenLabsTtsClientTest,GameNarrationServiceTest,NarrationFeedbackServiceTest,GameNarrationControllerTest test`

Run in `frontend`: `npm test -- src/components/editor/NarrationPreviewControl.test.tsx src/components/editor/PlayTestPanel.test.tsx src/pages/WorkspaceEditorPlay.test.tsx`

Expected: all local tests pass; live test remains skipped unless its explicit property is enabled.

- [ ] **Step 3: Run live test against real services** after Flyway V31 has applied

Run in `backend`: `./mvnw.cmd -Dtest=GameNarrationSupabaseLiveTest -Dfr11.supabase.live=true test`

Expected: real ElevenLabs synthesis succeeds, V31 cache is persisted/reused, Supabase signed download passes MP3 validation, and cleanup confirms synthetic game rows/per-game audio/test cache were removed. If provider quota/key or live DB is unavailable, report the specific blocked live check; do not claim it passed.

Observed live run: Supabase applied V31 and the app context plus synthetic fixture setup succeeded. The real ElevenLabs preview returned HTTP 503 (NARRATION_UNAVAILABLE) with upstream HTTP 401, so upload, signed download and feedback-cache checks were not reached. Cleanup removed the synthetic teacher/game rows and confirmed no per-game Storage objects remained. Rerun live acceptance after correcting the server-side provider key; this step is still blocked. Integration blocker: local `main` already defines V23 as admin foundation while this feature branch adds game narration at V23; reconcile migration history before merging. V31 avoids main V24–V28 and the observed Supabase current version 30, but does not resolve the separate V23 collision.

- [x] **Step 4: Regression check every supported PlayTest renderer**

Run in `frontend`: `npm test -- src/components/editor/PlayTestPanel.test.tsx src/pages/WorkspaceEditorPlay.test.tsx src/pages/WorkspaceEditorQuiz.test.tsx src/pages/WorkspaceEditorMatching.test.tsx src/pages/WorkspaceEditorOddOneOut.test.tsx src/pages/WorkspaceEditorAudioVisualMatch.test.tsx src/pages/WorkspaceEditorVisualCloze.test.tsx`

Expected: unchanged answer, score, retry, next-question and completion assertions pass; no new gameplay persistence calls occur.

---

## Plan Self-Review

- **Spec coverage:** BR-01 in Task 1; BR-04 cache in Task 2; BR-02/03/05 in Task 3; real-service evidence and regression in Task 4.
- **Step scan:** Every task writes tests and observes RED before adding production behavior, then runs GREEN checks. Live networking is isolated behind an opt-in property.
- **Type consistency:** Existing narration preview record stays `{ questionId, audioUrl, bytes, durationMillis }`; new feedback response is `{ correctAudioUrl, wrongAudioUrl }`; PlayTest audio map records include `{ audioText, audioUrl }`.
- **Review focus:** stale URL, out-of-order feedback, blocked autoplay, provider/storage errors and cache key mismatch are assigned to Tasks 1–3 tests.
- **Proportion:** Four tasks follow the four independently verifiable boundaries: provider, shared asset API, UI wiring, live/regression proof.
