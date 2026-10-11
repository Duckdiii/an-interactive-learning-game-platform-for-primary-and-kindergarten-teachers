# Verification record — 2026-10-10

## Source

`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rag-spike.ps1 -Mode Extract -SkipBuild` succeeded against the supplied PDF. Result: 28 verified chunks, 6 extracted pages, matching SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`. The retained evidence includes source-verification.json, right-column text and images for PDF pages 187–189.

## Backend

- Baseline: 445 backend tests passed before adding the spike; application context test requiring a database was excluded.
- Test-first runs demonstrated the missing RAG/config/strategy contracts. New unit tests then passed without external API/database calls.
- Independent read-only review found two issues: metadata-only changes were omitted from the embedding identity, and an incomplete negative benchmark could pass. Both were reproduced by regression tests (2 failures), then fixed. IDs now incorporate scope/version/source fragments; benchmark loading and summary gates require unique IDs and the prescribed query counts.
- Final command: `mvn -B -Dtest=!AigameBackendApplicationTests test dependency:build-classpath -Dmdep.outputFile=target/rag-classpath.txt` → **459 tests, 0 failures, 0 errors, 0 skips**, JaCoCo **70% minimum gate passed**, BUILD SUCCESS.
- `mvn -B clean install -DskipTests` → BUILD SUCCESS, packaged Spring Boot JAR installed in local Maven cache.
- Git whitespace check passed. Existing user edits in `.vscode/settings.json` and `ai-usage-log.md` were preserved; no commit or branch switch was performed.

## Configuration and live measurement

CheckConfig reports only booleans; Gemini key, DB URL/user/password were not configured at the last check. `backend/.env` is ignored by Git. Supabase V5 migration, first/repeated ingestion and live evaluation are **not run**. No Hit@3 percentage, live row-count invariance or real negative rejection is claimed.

## Status update — 2026-10-11

- Live Supabase migration/ingestion/evaluation completed: V5 applied, 28 chunks ingested idempotently, retrieval reached Hit@3 10/10, negative rejection 3/3, and 5/5 control probes passed. Threshold 0.855 was tuned on the same query set and remains exploratory; an independent holdout is still needed.
- The pilot is wired for QUIZ / Mathematics Grade 1 through `GameGenerationService`, Spring RAG configuration and a LangChain4j Gemini adapter. The standard backend suite has 469 passes and two opt-in live tests skipped; JaCoCo passes. Both live smoke tests were also run separately and passed: in-corpus generation returned a four-question quiz; the Python-loop query was refused before generation.
- Duy has not reviewed the selected context contract. Generated quiz content has not yet been manually scored against retrieved outcomes, and no live with/without-RAG comparison has been run. Other game types and subjects remain outside this pilot.
