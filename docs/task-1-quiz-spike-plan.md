# Task 1 — Gemini QUIZ spike handoff

Updated 2026-10-04. This handoff describes the current implementation on the Task 1 branch. The experiment history at the end records an earlier low-level `ChatModel` runner and is not evidence for the current `AiServices` call path.

## Scope and contract

This is an isolated technical spike. It generates four Vietnamese animal-counting questions for KINDERGARTEN children aged 5–6, checks the output, and records each call. It does not persist a game, use a database, expose a production endpoint, or implement content generation for every grade.

The source contract is the frozen Game JSON DSL v1.0.0 and AI output v1.0.0 described in [`game-json-dsl-v1.0.0.md`](game-json-dsl-v1.0.0.md), the schemas under `backend/src/main/resources/schema/`, and the repository rules in `CLAUDE.md`. The current AI output DTOs are `QuizAiOutput` and `QuizAiQuestion`. The AI output is an object containing `questions`; each question has required `text`, string `options`, and zero-based `correctIndex`, plus optional `visualPrompt` and `audioText`. The complete DSL separately adds `schemaVersion`, `gameType`, metadata (including `gradeLevel`), gameplay settings, question IDs, points, time limits and URLs. The model does not generate those DSL/backend fields.

No separate group approval or freeze decision for this spike-specific 4 × 4 limit is recorded. It is an experiment constraint only; the shared AI output schema still permits 1–20 questions and 2–4 options.

## Current call path

`QuizGeminiSpikeRunner` builds a standalone Gemini `ChatModel` from `GEMINI_API_KEY` and `GEMINI_MODEL`; it does not start Spring. The configured model uses LangChain4j `1.20.1` and `maxRetries(0)`. `QuizSpikeContentService` builds `QuizSpikeAiService` with `AiServices.builder(...)`. The AI Service returns `Result<QuizAiOutput>`, provides a system instruction and a user message with topic and grade, and receives per-call `ChatRequestParameters` with a JSON Schema response format.

The schema sent on the request is derived from `schema/game-ai-output/1.0.0/quiz.schema.json`: the spike changes only the minimum and maximum question count to four and the minimum and maximum options per question to four. Optional media fields and all other contract rules come from the shared schema. The derived schema removes the JSON Schema `$schema` and `title` keywords for Gemini compatibility. Its SHA-256 is recorded per attempt. The application schema remains unchanged.

The runner sets `supportedCapabilities(RESPONSE_FORMAT_JSON_SCHEMA)` for AI Services and passes the explicit response schema in request parameters. Tests inspect the actual `ChatRequest` captured by a mock `ChatModel`, including the derived schema and optional fields. LangChain4j `Result.finalResponse()` supplies the original model text on successful parsing. A `ChatModelListener` captures the response before AI Service parsing so the runner can also retain raw text when DTO parsing fails. The runner never logs the API key, headers, or exception messages.

The service additionally checks structural validity and spike-specific rules: exactly four questions; nonblank question text; four distinct numeric options from 1 to 5; and `correctIndex` in 0–3. Optional media fields are accepted per the shared contract. Failures are categorized as service/API, structure/deserialization, or spike criteria. Human review is still required to assess whether the questions satisfy the pedagogical prompt.

The system enum is `KINDERGARTEN`, `GRADE_1` through `GRADE_5`. This prompt currently supports only `KINDERGARTEN`; all other valid grades are rejected before the model call. Broader pedagogical support is future work. Prompt role/content changed when moving to AiServices, so this call path uses `quiz-count-animals-v4`. Old artifacts retain their original v2/v3 labels.

No Spring bean was added: the CLI is intentionally isolated from application startup and database/API configuration.

## Dependencies and configuration

- `dev.langchain4j:langchain4j-google-ai-gemini:1.20.1` is the existing Gemini integration.
- `dev.langchain4j:langchain4j:1.20.1` was added because the high-level `AiServices` API is in this separate artifact. Both are the stable version shown by the [official LangChain4j setup guide](https://docs.langchain4j.dev/get-started/); no beta module or unrelated dependency was added.
- `GEMINI_API_KEY` and `GEMINI_MODEL` are read from the process environment. Missing values produce a clear error before any request. The selected model is not hard-coded.
- Temperature is not explicitly set, so the runner does not claim or log a verified temperature value.
- `maxRetries(0)` disables the Gemini model retry path; the AI Service and runner do not retry. Measurement stops after authentication, permission, or quota errors.

## Run from PowerShell

Enter the key without echoing it or placing it in command history. Do not paste it into chat. Set `GEMINI_MODEL` to the model intended for the new measurement; do not compare new output with the historical v3 results as if they used the same path.

```powershell
$secret = Read-Host 'Gemini API key' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try { $env:GEMINI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$env:GEMINI_MODEL = 'gemini-2.5-flash'
Set-Location backend
chcp.com 65001 > $null
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
.\mvnw.cmd -q exec:java '-Dexec.mainClass=com.aigameplatform.backend.service.strategy.QuizGeminiSpikeRunner' '-Dexec.args=--check-utf8'
.\mvnw.cmd -q exec:java '-Dexec.mainClass=com.aigameplatform.backend.service.strategy.QuizGeminiSpikeRunner' '-Dexec.args=--initial dem so con vat trong pham vi 5 cho tre 5-6 tuoi KINDERGARTEN'
```

Review the initial output and answer key in `backend/target/quiz-spike/initial-*.jsonl`. Only if it meets the structural and content criteria, run ten sequential measurements:

```powershell
.\mvnw.cmd -q exec:java '-Dexec.mainClass=com.aigameplatform.backend.service.strategy.QuizGeminiSpikeRunner' '-Dexec.args=--measure dem so con vat trong pham vi 5 cho tre 5-6 tuoi KINDERGARTEN'
```

Both modes call Gemini and can consume quota. `--check-utf8` makes no API call. Output JSONL is written under `backend/target/quiz-spike/`; successful entries include parsed output and raw model output. Failed parsing attempts include captured raw output when the provider returned a response. The latency interval covers AI Service invocation and local validation, but excludes startup and writing the JSONL file.

## Verification status

Verification run on JDK 21.0.10 and Maven 3.9.16:

```powershell
.\mvnw.cmd -Dtest=QuizSpikeContentServiceTests test
.\mvnw.cmd -DskipTests package
```

The complete backend suite, excluding `AigameBackendApplicationTests` which needs a JDBC URL, passed: 445 tests, no failures/errors/skips; the JaCoCo 70% line coverage gate passed. `-DskipTests package` also succeeded. A single selected-suite run passed its six spike tests but failed the repository-wide JaCoCo gate because that partial run only measured 5% coverage; the full suite resolved that gate. `--check-utf8` printed Vietnamese correctly. A runner invocation with `GRADE_5` was rejected before API-key lookup; an invocation with no key/model stopped with the safe missing-configuration message. The checked-in `mvnw.cmd` script itself fails in this PowerShell environment with `Cannot index into a null array`, so Maven 3.9.16 from the wrapper cache was invoked directly. No source or historical JSONL files were cleaned. Tests use a mock `ChatModel`; they do not call Gemini or a database.

Live verification for the AiServices path was performed on 2026-10-04. The v4 initial and two partial measurement artifacts are archived under `docs/task-1-results/` (details below). Both measurement runs stopped on attempt 8 with `QUOTA`: each has seven successful calls, one failed call, and two calls not run. The ten-call measurement remains incomplete; no failed attempt was replaced within either artifact.

## v4 live artifacts and review (2026-10-04)

The following files were copied byte-for-byte from `backend/target/quiz-spike/`; SHA-256 hashes match their source files:

- `initial-20261003-171701.jsonl` — SHA-256 `5A328B8EB51F8CF10C4ACA4D0CF75ECAC207DF2C3260DDD2EE5C420942250EA5`.
- `measurement-20261003-172353.jsonl` — SHA-256 `353C627A7D52E0DF8B36C7DA4BF1FDB9A462CC64EF7CB0615EE40E36A808009A`.

Both artifacts were read as UTF-8. Every row is labeled `quiz-count-animals-v4`. The initial has one successful attempt; the measurement has eight rows: attempts 1–7 `SUCCESS`, attempt 8 `QUOTA`. Each successful row has four questions, four distinct numeric options, an in-range `correctIndex`, a non-empty `rawOutput`, and question text no longer than the service's 200-character limit. The answer selected by `correctIndex` is arithmetically correct in the initial and all 28 successful measurement questions. The failed eighth row has no parsed questions and no raw model response. Structural checks passed for all successful entries; the following are prompt/content deviations, not structure failures.

Manual content review against the actual v4 system prompt (`QuizSpikeAiService`) found:

- The prompt requires quantities written in words. All four initial questions comply. In the measurement, all four questions in attempts 1, 3, 6, and 7 use Arabic numerals for quantities (16/28 successful questions); this is a content deviation, although it does not violate the JSON structure.
- The prompt forbids sleeping scenes. Measurement attempts 1 Q4, 2 Q2, 3 Q2, 4 Q3, and 5 Q1 describe animals sleeping/asleep. The initial has no sleeping scene. These are content deviations.
- The prompt requires the counted group(s) to be in the same place. Initial Q3 places ducks at the lake and nearby; initial Q4 splits fish between the pond and its bank. Measurement attempt 1 Q3 splits ducks between the pond and its bank; attempt 2 Q2 puts cats in a garden and a dog under a tree; attempt 5 Q4 splits dogs between a window and the yard. These violate or materially weaken the same-place constraint. “Bên cạnh đó/Gần đó” in initial Q2/Q3 and measurement attempt 1 Q4 is also spatially vague; it is not explicit proof that an animal arrived, so it is treated as ambiguity rather than an asserted arrival event.
- Some prompts use “thêm/nữa” to describe a second group. The actual prompt forbids animals arriving (“đến thêm”), but several outputs only describe an additional group already present or doing the same activity, without saying it arrived. Do not classify those phrases alone as proof of an arrival event. They remain subject to the same-place review above.
- No missing quantities or arithmetic errors were found in the successful entries. Mixed-species questions that ask for the total number of animals are consistent with the prompt when the animals are in one place.
- Every successful question is at most two sentences and at most 113 characters, below the service's 200-character structural limit. Whether a sentence is “short” is qualitative; the longer two-sentence cases are readable but are less concise than ideal. This is a content-quality observation, not a structural failure.

The measurement recorded seven successful calls and one `QUOTA` failure. The eighth row records `errorClass: RateLimitException`, `category: QUOTA`, and 382 ms latency, but no provider response body, HTTP status, quota metric, or diagnostic message. The saved evidence is insufficient to distinguish a rate-per-minute limit from an exhausted request/token quota. The cause and any daily-quota status are undetermined; do not claim that a daily quota was exhausted. Attempts 9–10 were not run, and this ten-call measurement is incomplete. Successful-call latency: min 5,241 ms, median 7,950 ms, mean 7,377.7 ms, max 8,752 ms. The initial latency was 8,640 ms.

For terminal display in a future local run or when viewing text, set the Windows console to UTF-8 before launching Java, without running the API command just to test encoding:

```powershell
chcp.com 65001 > $null
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content .\target\quiz-spike\initial-20261003-171701.jsonl -Encoding utf8
```

Opening the JSONL in VS Code as UTF-8 is also suitable. The archived artifacts themselves decode as UTF-8; terminal mojibake did not corrupt their contents.

### Second v4 measurement run (2026-10-04)

`measurement-20261003-173803.jsonl` was copied byte-for-byte from `backend/target/quiz-spike/` to this directory. SHA-256: `7600DDB89A600F689DAF640EA921922A6D3AC1251B347D912D12813F2F2FDAB4`. It contains eight v4 rows: attempts 1–7 `SUCCESS`, attempt 8 `QUOTA`; attempts 9–10 were not run. All 28 successful questions have four distinct numeric options, valid `correctIndex`, correct arithmetic, and a captured raw response. Attempt 8 records `RateLimitException`, 342 ms, and no raw response or provider diagnostic. As with the first run, this does not establish whether a rate limit or another quota was reached, and does not establish daily quota exhaustion.

Content review found nine questions using digits instead of writing quantities in words (attempts 2 Q1–Q2, 4 Q1–Q3, and 6 Q1–Q4); four sleeping scenes (attempt 2 Q3, 3 Q2, 4 Q1, and 6 Q1); and split locations in attempt 2 Q3–Q4 and attempt 4 Q3–Q4. These are prompt deviations, not structure errors. No arithmetic errors or missing quantities were found. All successful question texts contain at most two sentences and remain within the 200-character validator limit. Successful-call latency: min 5,482 ms, median 8,265 ms, mean 7,688.0 ms, max 12,095 ms.

## Historical experiments (2026-09-27, previous ChatModel path)

The following evidence is preserved for context only. It used the earlier low-level `ChatModel` call and prompt v2/v3, not `AiServices`, and must not be presented as live validation of v4.

- Initial v1 (`initial-20260927-061352.jsonl`, SHA-256 `19ECDA4B73EDD3F53BA81250790EE79E8D97A0C35599D48AD05EF3FC1387997D`) returned four structurally valid questions but missed the animal-counting goal. The file was restored after a Maven `clean` removed a copy under `target`; a separate earlier target file could not be recovered.
- Initial v2 (`initial-20260927-062137.jsonl`, SHA-256 `C4F7CEE24A57509327E7FED20E29B38377CA91824E7CC61EC351BEFE33C3777A`) had four correct arithmetic answers, but two subtraction/“remaining” questions and one ambiguous setting. It did not pass the content criterion.
- Initial v3 (`initial-20260927-062442.jsonl`, SHA-256 `CD867FB6AC50189685A0A00EC7AF1648C2FA924C72E0C8324E141D87AE576CD1`) returned four questions with correct answers after manual review; latency was 7,767 ms.
- The old ten-call artifact (`measurement-20260927-062806.jsonl`, SHA-256 `DA61AB32C18CA85CDDFAF001129592384CA8D6E81C389BFC45F412AF0FB9BA44`) contains 9 technical successes and one HTTP 503. No structural error was recorded in the nine responses under the old checks. Successful-call latency: min 5,098 ms, median 5,955 ms, mean 6,085.6 ms, max 8,020 ms. Manual content review marked 4 of 36 questions as prompt deviations: two animal-sleep scenes, one question with animals in different places, and one missing quantity. This is not a teacher acceptance rate. The 503 is a service/API failure, not a JSON error; the saved response did not establish its underlying cause.

Those historical files are kept unchanged under `docs/task-1-results/`. The v4 artifacts above are separate files; any future v4 runs must also use new filenames and must not relabel or replace existing evidence.
