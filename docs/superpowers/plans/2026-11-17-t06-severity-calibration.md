# T06 severity calibration — BR-01 → BR-06

> Execute with `superpowers:executing-plans`, TDD and verification-before-completion. Main writes source; fresh reviewers/judges inspect independently. User authorized all six steps continuously. No stage/commit/push; reuse current worktree.

**Goal:** developer receives demonstrated findings with a defensible priority; wrong or missing severity cannot be certified by a verdict-only PASS.

**Architecture:** keep existing synthetic catalogs, native Codex roles and `eval-agents.mjs`. Reviewer source stays canonical in `.claude/agents/reviewer.md`, generated TOML stays compatible. No new model SDK, dependency or product API.

**Spec:** approved BR-01…06 in chat; existing `docs/harness-evals/agent-eval-codex-2026-11-17.md` is historical baseline (52 correct verdict/reason, nine of ten HIGH under-rated), not a new acceptance result.

**Base:** confirmed HEAD `afb8f8b58f0be9846b470409bff6fa4e22eba8b5`. Entire existing T01–T09 diff is uncommitted/untracked and must be preserved. Continuation snapshot/evidence under ignored `backend/target/harness-evidence/`; final runner compares staged/unstaged/untracked sources with this base.

## Requirements, trace and acceptance

| BR | Trigger → required outcome / failure handling | Files / test proof |
|---|---|---|
| BR-01 | A priority is assigned → supported impact and context determine HIGH/MEDIUM/LOW; ambiguous/unproven consequences are not invented | Independent gold audit; severity policy/report; freeze new case+gold bytes before role edit |
| BR-02 | Reviewer reports a defect → includes trigger/impact/evidence and severity justification, avoids classifying every test defect HIGH | `.claude/agents/reviewer.md`, generated `.codex/agents/reviewer.toml`; adapter checks and fresh native trials |
| BR-03 | Import certifies an applicable reviewer trial → correct verdict AND severity, concrete impact/reason, matching role/case/brief/probe evidence | `scripts/harness/eval-agents.mjs`; down/up-rating FAIL, missing severity/impact BLOCKED; CLEAN must not carry a finding severity |
| BR-04 | Invalid/old result submitted → meaningful regression fails before fix; source/role hash and replay guards remain enforced | `eval-agents.test.mjs`; unit + actual CLI import fixture; legacy non-reviewer scopes explicitly remain verdict-only |
| BR-05 | New role used → two fresh native contexts per affected case, key hidden, retained raw failure/verdict/tool evidence; no gold/prompt tuning after holdout observation | Core/history catalogs, eight new prospective held-out reviewer cases, frozen bundle/rubric hashes, native raw evidence, fresh independent semantic judge |
| BR-06 | Handoff → final source passes relevant review/secret scan and full aggregate with current-source receipt | report/README/acceptance/task/log updates before final run; all18 steps and `--check-report` afterward |

Proposed acceptance is zero missed/down-rated HIGH and zero false HIGH on clean cases in the frozen suite; additionally all expected severities must match in the machine check. Counts describe this suite only, not a general reliability estimate. Missing environment/quota → BLOCKED, never reuse stale role results or weaken gates. Wrong severity → FAIL. Preserve history, allow human supervision rather than autonomous approval.

## Ordered execution ledger

- [x] BR-01: inspect rubric/source context and independent audit; record rulings and freeze new held-out input/key before changing reviewer. No silent reclassification of old gold to improve score.
- [x] BR-02: clarify consequence-based severity in canonical reviewer, regenerate adapter; check adapter and preserve hook bytes/trust.
- [x] BR-03: write failing severity grading/brief tests, implement smallest compatible field checks in existing runner. Require severity/impact for keyed ISSUE; CLEAN no severity. No severity certification for unkeyed legacy scopes.
- [x] BR-04: CLI regression for incorrect/missing/clean/old evidence, key validation and all callers; run `node --test scripts/harness/eval-agents.test.mjs scripts/harness/check-agent-config.test.mjs scripts/harness/verify.test.mjs` and catalog validation.
- [ ] BR-05: prepare current case versions without overwriting baseline evidence; run affected reviewer cases + new held-out twice, retain only genuinely unchanged other-role trials with proof. Import/replay both catalogs, independent fresh judge checks priority and supported reasons. Failures remain visible; no automatic tuning against holdout.
- [ ] BR-06: fresh integration review, corrections/log audit, final docs freeze and secret snapshot; process-local JDK21/Git Bash + Docker/Chromium; `node scripts/harness/verify.mjs --base afb8f8b58f0be9846b470409bff6fa4e22eba8b5`, then `--check-report <new-report>`. Do not edit tracked docs after receipt merely to paste path/counts; final ignored handoff/chat is authoritative.

## Limits and decisions

- Only reviewer severity is being calibrated; unchanged verifier/auditor verdict evidence is reusable only if role/case/brief hashes and actual native execution still match. Any affected evidence must be rerun in a fresh context.
- Historical reconstructed drafts remain reconstructed; moderation history remains source-only, not a Java/HTTP replay. A2 repeats three A1 subjects, not independent situations.
- Claude runtime, judge of another model family, physical devices, remote CI, autonomous merge/deploy remain outside this cycle. No claims of equivalence to a private external engineering system.
- Ruling: this is a newly authorized T06 correction cycle after the earlier bounded cycle ended. Preserve all earlier scores and failures; do not retroactively turn old receipts/evaluations green.
- Ruling: use the existing plan/`tasks/progress.md` ledger rather than a commit-based workspace helper; commits are forbidden by repository/user scope.
- Ruling after frozen v1 finished: its four ANSI-gate under-ratings are real model errors, not defective gold (fresh judge confirmed contract+reproduced decision is sufficient; actual commit is not required). Preserve v1 FAIL68 verdict/36-of40 severity. User authorized solving BR01…06, so continue one separately versioned correction experiment rather than declaring completion from core-only PASS. No change to existing gold or thresholds. Four prospective v2 cases were frozen/audited before the next role edit; v1 held-out becomes regression data, not unseen evidence for v2.
- V2 isolates the defect in evidence standards: consequence severity vs execution confidence. New reviewer text forbids requiring actual irreversible/external action when the supplied contract and probe establish the forbidden admission decision. Optional diagnostics still do not become HIGH by name alone. All48 reviewer trials must be fresh after role change;28 unchanged other-role verdict proofs may remain. First batch tests the prior failure plus a new HIGH case; machine-detected wrong/missing priority stops further paid model work and keeps unrun cases SKIPPED. No third automatic tuning cycle against either held-out set.
