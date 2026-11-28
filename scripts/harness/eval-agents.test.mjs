import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCases, gradeTrials, makeBrief, roleEvidenceMatches, caseEvidenceMatches } from './eval-agents.mjs';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('answer keys never appear in the blind brief; invalid and duplicate cases fail', () => {
  const c = { id: 'r01', role: 'reviewer', source: 'code', intent: 'review', probe: 'probe' };
  assert.deepEqual(validateCases([c], { r01: { verdict: 'ISSUE', severity:'HIGH' } }), []);
  assert.ok(validateCases([c, c], { r01: { verdict: 'ISSUE', severity:'HIGH' } }).some(e => e === 'Invalid case r01'));
  assert.ok(validateCases([{ id: 'x' }], {}).length);
  assert.ok(!makeBrief({ ...c, goldVerdict: 'secret-answer' }, '/neutral').includes('secret-answer'));
  assert.ok(!makeBrief(c, '/neutral').includes('rubric'));
});

test('preparing a new manifest cannot recertify observations from an older role', () => {
  assert.equal(roleEvidenceMatches({ roleSha256: 'old' }, { roleSha256: 'new' }, 'new'), false);
  assert.equal(roleEvidenceMatches({}, { roleSha256: 'new' }, 'new'), false);
  assert.equal(roleEvidenceMatches({ roleSha256: 'old' }, { roleSha256: 'old' }, 'new'), false);
  assert.equal(roleEvidenceMatches({ roleSha256: 'new' }, { roleSha256: 'new' }, 'new'), true);
});

test('changing the case role or intent invalidates previous observations', () => {
  const c = { id: 'c01', role: 'reviewer', intent: 'review this', source: 'code', probe: 'probe' };
  const hash = createHash('sha256').update(JSON.stringify(c)).digest('hex');
  const trial = { caseSha256: hash };
  const entry = { role: c.role, caseSha256: hash };
  assert.equal(caseEvidenceMatches(trial, entry, c), true);
  assert.equal(caseEvidenceMatches(trial, entry, { ...c, role: 'test-verifier' }), false);
  assert.equal(caseEvidenceMatches(trial, entry, { ...c, intent: 'a different task' }), false);
  assert.equal(caseEvidenceMatches({}, entry, c), false);
});

test('missing trials, failures and unknown judgements cannot earn PASS', () => {
  const key = { r01: { verdict: 'ISSUE' } };
  assert.equal(gradeTrials([], key).status, 'BLOCKED');
  assert.equal(gradeTrials([{ id: 'r01', trial: 1, verdict: 'ISSUE', command: 'node probe.mjs' }], key).status, 'BLOCKED');
  assert.equal(gradeTrials([1, 2].map(trial => ({ id: 'r01', trial, verdict: 'CLEAN', command: 'node probe.mjs' })), key).status, 'FAIL');
  assert.equal(gradeTrials([1, 2].map(trial => ({ id: 'r01', trial, verdict: 'ISSUE', command: 'node probe.mjs', observed: 'exitCode:0' })), key).status, 'PASS');
});

test('severity grading rejects under/over-rating and blocks missing rationale', () => {
  const key = { c: { verdict: 'ISSUE', severity: 'HIGH' } };
  const make = extra => [1, 2].map(trial => ({ id:'c', trial, verdict:'ISSUE', severity:'HIGH',
    reason:'Required evidence gate bypass', impact:'A failed required check can certify this change.',
    command:'node probe.mjs', observed:'{"accepted":true}', ...extra }));
  assert.equal(gradeTrials(make({}), key).status, 'PASS');
  assert.equal(gradeTrials(make({severity:'MEDIUM'}), key).status, 'FAIL');
  assert.equal(gradeTrials(make({severity:'HIGH'}), {c:{verdict:'ISSUE',severity:'LOW'}}).status, 'FAIL');
  assert.equal(gradeTrials(make({severity:undefined}), key).status, 'BLOCKED');
  assert.equal(gradeTrials(make({severity:null}), key).status, 'BLOCKED');
  assert.equal(gradeTrials(make({severity:'CRITICAL'}), key).status, 'FAIL');
  for (const extra of [{impact:''},{impact:'   '},{impact:42},{reason:''}]) {
    assert.equal(gradeTrials(make(extra), key).status, 'BLOCKED');
  }
  assert.equal(gradeTrials(make({}), key).severityRequired, 2);
});

test('clean cases cannot carry a finding severity; legacy reports expose their bounded grading', () => {
  const make = severity => [1,2].map(trial=>({id:'c',trial,verdict:'CLEAN',reason:'No demonstrated defect',severity,
    command:'node probe.mjs',observed:'{}'}));
  assert.equal(gradeTrials(make(null), {c:{verdict:'CLEAN',severity:null}}).status,'PASS');
  assert.equal(gradeTrials(make('HIGH'), {c:{verdict:'CLEAN',severity:null}}).status,'FAIL');
  assert.equal(gradeTrials(make(undefined), {c:{verdict:'CLEAN'}}).severityRequired,0);
});

test('invalid severity keys fail and only reviewer briefs request calibration fields', () => {
  const c={id:'c',role:'reviewer',source:'code',intent:'review',probe:'probe'};
  assert.ok(validateCases([c],{c:{verdict:'ISSUE',severity:'CRITICAL'}}).length);
  assert.ok(validateCases([c],{c:{verdict:'ISSUE'}}).length);
  assert.ok(validateCases([c],{c:{verdict:'ISSUE',severity:null}}).length);
  assert.ok(validateCases([c],{c:{verdict:'CLEAN',severity:'MEDIUM'}}).length);
  assert.deepEqual(validateCases([c],{c:{verdict:'CLEAN',severity:null}}),[]);
  assert.match(makeBrief(c,'/neutral'), /severity/);
  assert.match(makeBrief(c,'/neutral'), /impact/);
  assert.doesNotMatch(makeBrief({...c,role:'test-verifier'},'/neutral'), /severity/);
});

test('CLI import requires severity/rationale after native evidence validation', () => {
  const prefix=join(tmpdir(),'agent-severity-'), root=mkdtempSync(prefix);
  assert.ok(root.startsWith(prefix));
  try {
    for(const dir of ['scripts/harness','evals/agents','.claude/agents'])mkdirSync(join(root,dir),{recursive:true});
    const script=join(root,'scripts/harness/eval-agents.mjs');
    copyFileSync(fileURLToPath(new URL('./eval-agents.mjs',import.meta.url)),script);
    writeFileSync(join(root,'.claude/agents/reviewer.md'),'Read-only reviewer');
    const c={id:'c',role:'reviewer',source:'export const broken=true;',probe:'console.log(JSON.stringify({broken:true}));',intent:'Review bounded result'};
    writeFileSync(join(root,'evals/agents/cases.json'),JSON.stringify([c]));
    const rubric=join(root,'evals/agents/rubric.json');
    writeFileSync(rubric,JSON.stringify({c:{verdict:'ISSUE',severity:'HIGH'}}));
    const run=args=>spawnSync(process.execPath,[script,...args],{cwd:root,encoding:'utf8',timeout:10000});
    const prepared=run(['--prepare']);assert.equal(prepared.status,0,prepared.stderr);
    const manifest=JSON.parse(readFileSync(join(root,'backend/target/harness-evidence/agent-cases/manifest.json')));
    const path=join(root,'trials.json');
    const check=(extra,status)=>{
      const rows=manifest.map(e=>({...e,verdict:'ISSUE',severity:'HIGH',reason:'Demonstrated defect',impact:'Required guard admits a failure',command:'node probe.mjs',observed:'{"broken":true}',...extra}));
      writeFileSync(path,JSON.stringify(rows));
      const result=run(['--import',path]);assert.equal(result.status,status,result.stdout+result.stderr);
      return JSON.parse(result.stdout);
    };
    assert.equal(check({severity:'MEDIUM'},1).status,'FAIL');
    assert.equal(check({severity:undefined},2).status,'BLOCKED');
    assert.equal(check({impact:''},2).status,'BLOCKED');
    assert.equal(check({roleSha256:'stale'},1).status,'FAIL');
    assert.equal(check({},0).status,'PASS');
    writeFileSync(rubric,JSON.stringify({c:{verdict:'CLEAN',severity:null}}));
    assert.equal(check({verdict:'CLEAN',severity:'HIGH'},1).status,'FAIL');
    assert.equal(check({verdict:'CLEAN',severity:null},0).status,'PASS');
    writeFileSync(rubric,JSON.stringify({c:{verdict:'ISSUE'}}));
    const unkeyed=run(['--validate']);
    assert.equal(unkeyed.status,1,unkeyed.stdout+unkeyed.stderr);
    assert.match(unkeyed.stderr,/severity/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('CLI import rejects trials whose manifest entries are missing', () => {
  const prefix = join(tmpdir(), 'agent-import-');
  const root = mkdtempSync(prefix);
  assert.ok(root.startsWith(prefix));
  try {
    for (const dir of ['scripts/harness', 'evals/agents', 'backend/target/harness-evidence/agent-cases']) mkdirSync(join(root, dir), { recursive: true });
    const script = join(root, 'scripts/harness/eval-agents.mjs');
    copyFileSync(fileURLToPath(new URL('./eval-agents.mjs', import.meta.url)), script);
    const c = { id: 'r01', role: 'reviewer', source: 'code', probe: 'probe', intent: 'review' };
    writeFileSync(join(root, 'evals/agents/cases.json'), JSON.stringify([c]));
    writeFileSync(join(root, 'evals/agents/rubric.json'), JSON.stringify({ r01: { verdict: 'CLEAN', severity:null } }));
    writeFileSync(join(root, 'backend/target/harness-evidence/agent-cases/manifest.json'), '[]');
    const trialsPath = join(root, 'trials.json');
    writeFileSync(trialsPath, JSON.stringify([1, 2].map(trial => ({ id: c.id, trial, verdict: 'CLEAN', command: 'node probe.mjs', observed: '0' }))));
    const run = spawnSync(process.execPath, [script, '--import', trialsPath], { cwd: root, encoding: 'utf8', timeout: 10_000 });
    assert.equal(run.status, 1, run.stdout + run.stderr);
    assert.equal(JSON.parse(run.stdout).status, 'FAIL');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('historical validation never falls back to a passing smoke suite', () => {
  const prefix = join(tmpdir(), 'agent-history-');
  const root = mkdtempSync(prefix);
  assert.ok(root.startsWith(prefix));
  try {
    mkdirSync(join(root, 'scripts/harness'), { recursive: true });
    mkdirSync(join(root, 'evals/agents'), { recursive: true });
    const script = join(root, 'scripts/harness/eval-agents.mjs');
    copyFileSync(fileURLToPath(new URL('./eval-agents.mjs', import.meta.url)), script);
    const c = { id:'clean', role:'reviewer', source:'code', probe:'probe', intent:'review' };
    writeFileSync(join(root, 'evals/agents/cases.json'), JSON.stringify([c]));
    writeFileSync(join(root, 'evals/agents/rubric.json'), JSON.stringify({clean:{verdict:'CLEAN',severity:null}}));
    writeFileSync(join(root, 'evals/agents/history-manifest.json'), '[]');
    writeFileSync(join(root, 'evals/agents/history-rubric.json'), '{}');
    const run = spawnSync(process.execPath, [script, '--history', '--validate'], {cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(run.status, 1, run.stdout + run.stderr);
    assert.match(run.stderr, /Incomplete case set/);
    writeFileSync(join(root, 'evals/agents/history-manifest.json'), JSON.stringify([c]));
    writeFileSync(join(root, 'evals/agents/history-rubric.json'), JSON.stringify({clean:{verdict:'CLEAN',severity:null}}));
    mkdirSync(join(root, '.claude/agents'), {recursive:true});
    writeFileSync(join(root, '.claude/agents/reviewer.md'), 'Read-only test role');
    const smokeDir = join(root, 'backend/target/harness-evidence/agent-cases');
    mkdirSync(smokeDir, {recursive:true});
    writeFileSync(join(smokeDir, 'manifest.json'), 'smoke marker');
    const prepared = spawnSync(process.execPath, [script, '--history', '--prepare'], {cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(prepared.status, 0, prepared.stdout + prepared.stderr);
    assert.equal(readFileSync(join(smokeDir, 'manifest.json'), 'utf8'), 'smoke marker');
    assert.equal(JSON.parse(readFileSync(join(root, 'backend/target/harness-evidence/agent-cases-history/manifest.json'), 'utf8')).length, 2);
  } finally { rmSync(root, {recursive:true,force:true}); }
});
