# Drag & Drop Renderer

`src/components/game/renderers/drag-drop/DragDropRenderer.tsx` renders a classification question with Konva. `WorkspaceEditor.tsx` provides an interactive sample in both preview and trial-play modes.

## Renderer Input

`src/types/dragDrop.ts` describes a frontend input model, not a frozen backend DTO. Each item has `itemId`, `label`, `imageUrl`, and `correctZoneId`. Each zone has `zoneId`, `label`, and a presentation color (`water` or `land`). `geometry.ts` computes fixed zone bounds and separate item slots for the available width; items retain their 88 px touch targets instead of scaling down on phones. Drop detection uses the center of the item.

The current backend `DragDropQuestion` entity contains `item`, `itemImageUrl`, and `targetZone`. Agree on the JSON DSL mapping before connecting backend content to this model. Correct zone IDs in this demo are for frontend feedback; a real backend must grade answers against its own question data.

## Completion And Submission

Provide `participantId` from the actual game participant, not the teacher's authentication ID. `onAnswered` receives this payload once on completing a round in play mode:

```json
{
  "participantId": "uuid",
  "questionId": "q1",
  "placements": [
    { "itemId": "i1", "zoneId": "z1" },
    { "itemId": "i2", "zoneId": "z2" }
  ],
  "timeSpentMs": 5000
}
```

Add this example to the team's REST API Contract when the submission endpoint is confirmed. Contract links in `CLAUDE.md` are currently TODO, and the repo has no submission controller. No endpoint or backend schema has been invented here.

Connect the parent screen's `onAnswered` to an API module using `src/api/axiosInstance.ts` and the agreed endpoint. Return the request promise so the renderer can show pending/error states. A rejected promise preserves the locked placements and offers a retry with the same payload and captured time. The server should accept retries idempotently for the participant/question/session. `timeSpentMs` counts from showing the round until the last correct drop, excluding submission time and retries.

With `previewMode={true}`, the renderer calls only `onPreviewCompleted`, if supplied; `onAnswered` is never called. Both editor modes use local results, with `demo-participant` as an explicit sample ID. Neither mode makes a network submission. Invalid or empty questions show a validation message instead of completing automatically.

## Assets And Audio

Demo images live in `public/images/drag-drop/`. The two bundled WAV chimes are generated locally by `node scripts/generate-drag-drop-sounds.mjs`, with no external licenses or network dependency. Howler instances, Konva tweens/animations, and resize observers are cleaned up on unmount. Feedback sounds can be toggled off; the prompt can always be replayed independently. Supply `promptAudioUrl` for a recorded prompt; otherwise the renderer uses browser speech synthesis with `vi-VN`, when available.

## Verification

```powershell
npm run test:drag-drop
npm run lint
npm run build
```

The geometry tests use the built-in Node test runner and TypeScript stripping (Node 22.18+). For browser checks, install Playwright into an ignored, temporary directory instead of adding it to application dependencies:

```powershell
npm install --prefix node_modules/.drag-drop-test-tools --no-save --package-lock=false playwright
node node_modules/.drag-drop-test-tools/node_modules/playwright/cli.js install chromium
npm run dev -- --host 127.0.0.1 --port 5174
# In a second terminal:
node --experimental-strip-types scripts/verify-drag-drop-browser.mjs http://127.0.0.1:5174
```

The test fixture is `tests/fixtures/drag-drop.html`; it is served by Vite during development and is not a production application route. Browser checks cover actual mouse drags, emulated touch drags, misses, wrong drops, locked correct items, single completion, failed-submission retry, reset, preview isolation, image rendering, WAV decoding, and nonblank canvases at desktop/tablet/mobile widths. Screenshots are written to `node_modules/.drag-drop-test-tools/screenshots/`.

Physical tablet testing is still required, particularly touch continuity and audio playback on iPad Safari and Android browsers. Emulated Chromium touch tests do not replace that check.
