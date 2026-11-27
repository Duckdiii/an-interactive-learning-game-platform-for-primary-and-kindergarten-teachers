import assert from 'node:assert/strict';
import test from 'node:test';
import { runSteps, overallStatus, safeEnvironment, redact, validateReport, stepsFor } from './verify.mjs';
import { createHash } from 'node:crypto';

test('a failing check cannot be hidden by a later successful command', () => {
  const calls = [];
  const results = runSteps([{ id: 'lint' }, { id: 'build' }], step => {
    calls.push(step.id); return { status: 1, stdout: 'bad lint' };
  });
  assert.deepEqual(calls, ['lint']);
  assert.deepEqual(results.map(r => r.status), ['FAIL', 'SKIPPED']);
  assert.equal(overallStatus(results), 'FAIL');
});

test('missing executable is BLOCKED and timeout is FAIL, never PASS', () => {
  assert.equal(runSteps([{ id: 'npm' }], () => ({ error: { code: 'ENOENT' }, status: null }))[0].status, 'BLOCKED');
  assert.equal(runSteps([{ id: 'npm' }], () => ({ error: { code: 'ETIMEDOUT' }, status: null }))[0].status, 'FAIL');
  assert.equal(overallStatus([]), 'BLOCKED');
  assert.equal(overallStatus([{ status: 'SKIPPED' }]), 'BLOCKED');
});

test('missing Docker blocks only the groups requiring it and is not success', () => {
  const results = runSteps([{ id: 'scripts' }, { id: 'browser', requiresDocker: true }],
    () => ({ status: 0 }), { docker: false });
  assert.deepEqual(results.map(r => r.status), ['PASS', 'BLOCKED']);
  assert.equal(overallStatus(results), 'BLOCKED');
});

test('repository policy checks are included and migration comparison requires an explicit task base', () => {
  const steps = stepsFor('/repo', 'scripts');
  for (const id of ['ai-log', 'log-rotation', 'openapi-index', 'migrations', 'agent-cases', 'agent-history']) assert.ok(steps.some(s => s.id === id));
  const migration = steps.find(s => s.id === 'migrations');
  assert.equal(runSteps([migration], () => { throw new Error('Must not run without base'); })[0].status, 'BLOCKED');
  assert.deepEqual(stepsFor('/repo', 'scripts', 'task-base').find(s => s.id === 'migrations').args.slice(-2), ['--base', 'task-base']);
});

test('external live test opt-ins never leak into the hermetic runner', () => {
  const env = safeEnvironment({ RUN_LIVE_TEACHER_FLOW: 'true', RUN_LIVE_RAG: 'true', run_live_rag: 'true', PATH: 'tools', CI: '' });
  assert.equal(env.RUN_LIVE_TEACHER_FLOW, undefined);
  assert.equal(env.RUN_LIVE_RAG, undefined);
  assert.equal(env.run_live_rag, undefined);
  assert.equal(env.PATH, 'tools');
  assert.equal(env.CI, 'true');
});

test('evidence masks authorization, JWTs and environment secrets', () => {
  const text = 'Bearer abc123 api-key=private-key eyJabc.def.ghi';
  const safe = redact(text, { GEMINI_API_KEY: 'private-key' });
  assert.ok(!safe.includes('abc123'));
  assert.ok(!safe.includes('private-key'));
  assert.ok(!safe.includes('eyJabc.def.ghi'));
});

test('a receipt needs every current command, intact logs and the current source identity', () => {
  const identity = { commit: 'abc', sha256: 'source' };
  const steps = [{ id: 'test', command: 'node', args: ['test.mjs'], cwd: '/repo' }];
  const log = 'one test passed';
  const result = { ...steps[0], status: 'PASS', exitCode: 0,
    logSha256: createHash('sha256').update(log).digest('hex') };
  const report = { status: 'PASS', before: identity, after: identity, results: [result] };
  const check = (r = report, current = identity, readLog = () => log, latest = true) => validateReport(r, { identity: current, steps, readLog, latest });
  assert.deepEqual(check(), []);
  assert.ok(check({ ...report, results: [] }).length);
  assert.ok(check(report, { ...identity, sha256: 'changed' }).length);
  assert.ok(check(report, identity, () => 'tampered').length);
  assert.ok(check(report, identity, () => { throw new Error('missing'); }).length);
  assert.ok(check({ ...report, results: [{ ...result, args: ['different.mjs'] }] }).length);
  assert.ok(check({ ...report, results: [{ ...result, exitCode: 1 }] }).length);
  assert.ok(check(report, identity, () => log, false).length, 'an older green receipt cannot hide a later failed/interrupted attempt');
});
