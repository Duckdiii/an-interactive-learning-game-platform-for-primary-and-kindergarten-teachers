# Game JSON DSL v1.1.0 — VISUAL_CLOZE IMAGE

**Status:** additive contract for image mode. v1.0.0 remains unchanged and is still used for text cloze and all existing game types.

## Compatibility

- `gameType` remains `VISUAL_CLOZE`.
- v1.0.0 payloads without `mode` remain text cloze and retain `sentenceTemplate`, `correctAnswer`, `distractors`, and student answer `{ "answer": "..." }`.
- v1.1.0 image games set root `mode: "IMAGE"`. A missing mode in a v1.1.0 Visual Cloze payload is interpreted as `TEXT`.
- v1.1.0 is supported only for `VISUAL_CLOZE`; other game types remain at v1.0.0.
- `sceneImageUrl` must refer to a reachable image supplied by the caller. Backend fetches and decodes it; it does not generate or upload the image.

## IMAGE envelope

```json
{
  "schemaVersion": "1.1.0",
  "gameType": "VISUAL_CLOZE",
  "mode": "IMAGE",
  "metadata": { "title": "Thiếu hình nào?", "subject": "MATH", "gradeLevel": "GRADE_1", "topic": "Hình học" },
  "gameplaySettings": { "hitboxScale": 1.5 },
  "questions": [{
    "id": "q1",
    "timeLimitSeconds": 30,
    "points": 10,
    "questionText": "Chọn hình còn thiếu trong bức tranh.",
    "sceneImageUrl": "https://assets.example.edu/scene.png",
    "sceneWidth": 1200,
    "sceneHeight": 800,
    "blanks": [{ "id": "b1", "x": 420, "y": 260, "correctOptionId": "o1" }],
    "options": [
      { "id": "o1", "visualPrompt": "hình tròn màu đỏ", "imageUrl": "https://assets.example.edu/circle.png" },
      { "id": "o2", "visualPrompt": "hình vuông màu xanh", "imageUrl": "https://assets.example.edu/square.png" }
    ]
  }]
}
```

- Coordinates are pixel centers relative to the original scene image; backend dimensions come from decoded image bytes, never from AI claims.
- Each blank ID and option ID is unique. Each blank maps to an existing correct option and no option is the correct match for more than one blank.
- Correct mappings are teacher/game data only. Student question DTOs contain blank IDs/positions and shuffled options but omit `correctOptionId`.
- Student response is `{ "placements": [{ "blankId": "b1", "optionId": "..." }] }`; the server grades the complete mapping and returns `correctAnswer` only after scoring.
- Publish is rejected if the scene is missing/unreachable/invalid, image dimensions disagree, coordinates violate the configured 50-pixel renderer inset, or mappings/options are invalid.

## Validation and generation

AI Strategy and reviewer receive the actual decoded scene image bytes. They must ground visible target descriptions, option meanings, and proposed coordinates in that image. Backend independently checks schema, bounds, unique IDs and one-to-one mapping. RAG curriculum evidence remains an independent gate: visual correctness cannot establish YCCĐ support.

Image retrieval is HTTPS-only, rejects private/reserved network addresses including redirects, and enforces configured size, dimensions, redirect, and timeout bounds. Failures stop generation/publication; do not log image bytes, raw prompts/outputs, or secret-bearing URLs.

See `backend/src/main/resources/schema/game-dsl/1.1.0/visual-cloze.schema.json` for the machine-readable schema and `docs/openapi/openapi.yaml` for HTTP payloads.
