# Verification scope and evidence

The machine-readable route inventory is route-matrix.json. check-feature-map checks route values, actual registration, referenced test files, endpoint coverage and citations. It does not infer behavioral success from file existence. Runtime results come from the runner report and test assertions, not the map.

| Feature | Drive and observable end state | Boundary and evidence | Remaining limit |
|---|---|---|---|
| Register/login | UI registration → login → dashboard | teacher-flow.spec.ts, real HTTP/Postgres | No live AI needed |
| Understand/generate | Confirm idea → editor with stored QUIZ | teacher-flow.spec.ts; fake AI, real HTTP/DB | Generator quality needs separate live acceptance |
| Revise/persist | Contextual instruction reaches fake; untouched labels/correct answer survive; PUT then GET agrees | FakeAiConfigurationTest, TeacherFlowVerificationTest; browser autosave | Does not certify every free-text instruction |
| Curriculum review | DSL review UNAVAILABLE with retrieval disabled; edit → STALE; Postgres JSON shape checked | TeacherFlowVerificationTest, GameCurriculumReviewPersistenceTest | CPF review/UI absent: KNOWN-GAPS #24, not PASS |
| Gameplay baseline | QUIZ wrong/correct/retry/completion/reset at 360/768/1280; static CPF pointer choices/completion/reset | gameplay.spec.ts: 4 cases; plus teacher flow: original 5 browser tests | Retained baseline; see expanded matrix below, not a universal educational-quality claim |
| Auth failures/input validation | Reject invalid/unauthorized requests through real controllers | existing AuthControllerTest/GamesControllerTest | Endpoint checker alone does not validate response bodies |
| Publish/share/live rooms/results/media | Planned or mock, as FEATURE-MAP/OpenAPI state | contract and route inventory only | Not a completed product feature |

Tests use synthetic data. No persistent teacher topic/prompt/output store is introduced. A passing fixture says nothing about untested lessons, subjects or actual curriculum approval. Missing RAG evidence and upstream failures are covered by existing mocked generation/curriculum tests, independently of browser checks.

T02 continuation: approved gate/rotate hashes now trusted, live allowed/deny and Stop rotate passed; native CLI child history was read directly. See T02-host-smoke.md for versions/evidence and the separate failing personal Stop summarizer. Claude and cross-family evaluation remain unverified. No trust/sandbox bypass. Shared .claude Markdown is canonical; generated TOML preserves literal backslashes.

## T05b expanded browser matrix

| Scope | Driver / observable | Boundary / limits |
|---|---|---|
| All 10 DSL types, editor preview | renderer-gameplay.spec.ts: real register/login, generate, PUT, editor GET; input, correct feedback for every question, summary/restart | Real HTTP/Postgres persistence with fake AI; grading local, not a student backend |
| All 10 DSL types, player | renderer-gameplay.spec.ts: MOCK00…09, UI input, CORRECT feedback, completion/restart | Sessions/grading/results explicitly mock; realPlayerApi remains NotSupported/planned |
| CPF TAP/motion | cpf-gameplay.spec.ts: STATIC, FALL, FLOAT_UP, PATROL_X, BOB, SWAY_UP, ORBIT, CROSS; painted canvas comparison over controlled time, each round completes/reset | Browser painting/time/pointer, not engine state inspection; not every control/motion Cartesian combination |
| CPF drag/shoot/walk | DRAG_FREE SORT/DROP, DRAG_X FALL/STREAM PICK_ALL, AIM_SHOOT collision, TAP_MOVE collision | Pointer input and clock-driven physics; no direct call to collision/grading functions |
| Responsive | Existing QUIZ360/768/1280; CPF TAP360/768 plus desktop; portrait matching rotate prompt and landscape continuation | Chromium emulation, not physical-device or universal touch-size acceptance |
| Image failure | Abort assets; browser fillText paints first-round choice labels; screenshot inspected; complete/reset | Public canvas painting API, not Konva/game state; no image-quality claim |
| Audio failure | Abort recorded audio; after autoplay, two clicks each start/end replay pulse; answer still advances | Error liveness/replay UI, not that unavailable sound can be heard |
| ORDERING persistence | TeacherFlowVerificationTest: POST → PUT edited step → GET same questions | Independent OrderStep persisted with game/review; no cascade/schema change |
| SPOT sample | mockPlayerApi.test.ts: each published sample question has selectable region and returns CORRECT at its key | Fixes previously unanswerable third sample, not real backend grading |

Continuation evidence: full browser had41/42 PASS, exposing missing SPOT key; corrected SPOT/image/audio targeted3/3 PASS. Backend focused34/34, SPOT unit42/42, E2E TypeScript check PASS. The final all-scope run after source freeze is authoritative for combined final-code status; do not label the earlier failed full run green.
