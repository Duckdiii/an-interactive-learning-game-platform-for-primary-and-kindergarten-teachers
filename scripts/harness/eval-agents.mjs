import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

const SEVERITIES = ['HIGH', 'MEDIUM', 'LOW'];

export function validateCases(cases, key) {
  const seen = new Set(), errors = [];
  for (const c of cases) {
    if (!c.id || seen.has(c.id) || !['reviewer', 'test-verifier', 'log-auditor'].includes(c.role)
      || !c.source || !c.probe || !c.intent || !['ISSUE', 'CLEAN', 'BLOCKED'].includes(key[c.id]?.verdict)) errors.push(`Invalid case ${c.id}`);
    const expected = key[c.id];
    if (c.role === 'reviewer' && !Object.hasOwn(expected ?? {}, 'severity')) errors.push(`Missing reviewer severity key ${c.id}`);
    if (expected && Object.hasOwn(expected, 'severity') && (expected.verdict === 'ISSUE'
      ? !SEVERITIES.includes(expected.severity) : expected.severity !== null)) errors.push(`Invalid severity key ${c.id}`);
    seen.add(c.id);
  }
  if (!cases.length || Object.keys(key).some(id => !seen.has(id))) errors.push('Incomplete case set');
  return errors;
}

export function makeBrief(c, dir) {
  return `Read-only task in ${dir}. Read subject.mjs and run node probe.mjs in that directory. ${c.intent}\n`
    + `Use the repository's .claude/agents/${c.role}.md as role guidance, but review ONLY this supplied case; do not inspect unrelated changes or modify files.\n`
    + 'Return JSON with verdict ISSUE, CLEAN or BLOCKED, reason, exact command and observed output. No code edits, commits or external API calls.'
    + (c.role === 'reviewer' ? '\nFor ISSUE include severity HIGH, MEDIUM or LOW and impact explaining the demonstrated consequence and why that priority fits. For CLEAN use severity null and no invented finding. Keep the textual finding priority consistent with the JSON.' : '');
}

export function roleEvidenceMatches(trial, entry, currentRole) {
  return Boolean(trial.roleSha256) && trial.roleSha256 === entry.roleSha256 && entry.roleSha256 === currentRole;
}

export function caseEvidenceMatches(trial, entry, c) {
  const hash = createHash('sha256').update(JSON.stringify(c)).digest('hex');
  return entry.role === c.role && entry.caseSha256 === hash && trial.caseSha256 === hash;
}

export function gradeTrials(trials, key) {
  const seen = new Set(), failures = [], missing = [];
  for (const t of trials) {
    const id = `${t.id}:${t.trial}`;
    if (!key[t.id] || ![1, 2].includes(t.trial) || seen.has(id)) failures.push(`Invalid trial ${id}`);
    seen.add(id);
    if (key[t.id] && t.verdict !== key[t.id].verdict) failures.push(`Wrong verdict ${id}`);
    if (!t.command || !t.observed) missing.push(`No run evidence ${id}`);
    const expected = key[t.id];
    if (!expected || !Object.hasOwn(expected, 'severity') || t.verdict !== expected.verdict) continue;
    if (typeof t.reason !== 'string' || !t.reason.trim()) missing.push(`No severity rationale ${id}`);
    if (expected.verdict === 'ISSUE') {
      if (t.severity == null) missing.push(`No severity ${id}`);
      else if (!SEVERITIES.includes(t.severity) || t.severity !== expected.severity) failures.push(`Wrong severity ${id}`);
      if (typeof t.impact !== 'string' || !t.impact.trim()) missing.push(`No impact ${id}`);
    } else if (t.severity != null) failures.push(`Unexpected severity ${id}`);
  }
  for (const id of Object.keys(key)) for (const trial of [1, 2]) if (!seen.has(`${id}:${trial}`)) missing.push(`${id}:${trial}`);
  return { status: failures.length ? 'FAIL' : missing.length ? 'BLOCKED' : 'PASS', failures, missing,
    trials: trials.length, required: Object.keys(key).length * 2,
    severityRequired: Object.values(key).filter(k => Object.hasOwn(k, 'severity')).length * 2 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const history = process.argv.includes('--history');
  const caseDir = history ? 'agent-cases-history' : 'agent-cases';
  const casesText = readFileSync(join(root, 'evals/agents', history ? 'history-manifest.json' : 'cases.json'), 'utf8');
  const cases = JSON.parse(casesText), key = JSON.parse(readFileSync(join(root, 'evals/agents', history ? 'history-rubric.json' : 'rubric.json'), 'utf8'));
  const errors = validateCases(cases, key);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else if (process.argv.includes('--prepare')) {
    const out = join(root, 'backend/target/harness-evidence', caseDir);
    const manifest = [];
    let index = 0;
    for (const c of cases) for (const trial of [1, 2]) {
      const dir = join(out, 'w-' + String(++index).padStart(2, '0'));
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'subject.mjs'), c.source);
      writeFileSync(join(dir, 'probe.mjs'), c.probe);
      writeFileSync(join(dir, 'brief.txt'), makeBrief(c, dir));
      manifest.push({ id: c.id, trial, dir, role: c.role,
        caseSha256: createHash('sha256').update(JSON.stringify(c)).digest('hex'),
        roleSha256: createHash('sha256').update(readFileSync(join(root, `.claude/agents/${c.role}.md`))).digest('hex') });
    }
    writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Prepared ${manifest.length} isolated cases at ${out}; no model calls.`);
  } else if (process.argv.includes('--import')) {
    const path = process.argv[process.argv.indexOf('--import') + 1];
    const trials = JSON.parse(readFileSync(path, 'utf8'));
    const manifest = JSON.parse(readFileSync(join(root, 'backend/target/harness-evidence', caseDir, 'manifest.json'), 'utf8'));
    for (const t of trials) {
      const entry = manifest.find(e => e.id === t.id && e.trial === t.trial);
      const c = cases.find(c => c.id === t.id);
      if (!entry || !c) { t.verdict = 'UNVERIFIED'; continue; }
      const currentRole = createHash('sha256').update(readFileSync(join(root, `.claude/agents/${entry.role}.md`))).digest('hex');
      if (!roleEvidenceMatches(t, entry, currentRole) || !caseEvidenceMatches(t, entry, c)
          || readFileSync(join(entry.dir, 'subject.mjs'), 'utf8') !== c.source
          || readFileSync(join(entry.dir, 'probe.mjs'), 'utf8') !== c.probe
          || readFileSync(join(entry.dir, 'brief.txt'), 'utf8') !== makeBrief(c, entry.dir)) { t.verdict = 'UNVERIFIED'; continue; }
      const replay = spawnSync(process.execPath, ['probe.mjs'], { cwd: entry.dir, encoding: 'utf8', timeout: 15_000 });
      try {
        if (replay.status !== 0 || !isDeepStrictEqual(JSON.parse(replay.stdout), JSON.parse(t.observed))) t.verdict = 'UNVERIFIED';
      } catch { t.verdict = 'UNVERIFIED'; }
    }
    const report = gradeTrials(trials, key);
    console.log(JSON.stringify(report, null, 2)); process.exitCode = report.status === 'PASS' ? 0 : report.status === 'FAIL' ? 1 : 2;
  } else if (process.argv.length === 2 || process.argv.includes('--validate')) console.log(`Agent cases valid: ${cases.length}; no model calls.`);
  else { console.error('Usage: [--history] --validate | --prepare | --import <trials.json>'); process.exitCode = 2; }
}
