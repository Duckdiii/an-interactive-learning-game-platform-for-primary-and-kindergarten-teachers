import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createRequire } from 'node:module';

export function safeEnvironment(source) {
  return { ...Object.fromEntries(Object.entries(source).filter(([key]) => !key.toUpperCase().startsWith('RUN_LIVE_'))), CI: 'true' };
}

export function redact(text, env = process.env) {
  let safe = String(text).replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[JWT REDACTED]');
  for (const [key, value] of Object.entries(env)) {
    if (/SECRET|TOKEN|PASSWORD|API_KEY/i.test(key) && value?.length >= 4) safe = safe.split(value).join('[REDACTED]');
  }
  return safe;
}

export function overallStatus(results) {
  if (results.some(r => r.status === 'FAIL')) return 'FAIL';
  if (!results.length || results.some(r => r.status !== 'PASS')) return 'BLOCKED';
  return 'PASS';
}

export function runSteps(steps, execute, { docker = true } = {}) {
  let failed = false;
  return steps.map(step => {
    if (failed) return { id: step.id, status: 'SKIPPED', reason: 'Previous check failed' };
    if (step.blockedReason) return { id: step.id, status: 'BLOCKED', reason: step.blockedReason };
    if (step.requiresDocker && !docker) return { id: step.id, status: 'BLOCKED', reason: 'Docker is unavailable' };
    const started = Date.now();
    const result = execute(step);
    const status = result.error?.code === 'ENOENT' ? 'BLOCKED' : result.status === 0 && !result.error ? 'PASS' : 'FAIL';
    failed = status === 'FAIL';
    return { id: step.id, status, exitCode: result.status, durationMs: Date.now() - started,
      reason: result.error?.message ?? result.error?.code, output: redact((result.stdout ?? '') + (result.stderr ?? '')) };
  });
}

// Hash content, not mtimes: staged, unstaged and non-ignored new files all contribute.
export function sourceIdentity(root) {
  const git = args => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    if (r.status !== 0) throw new Error('Cannot identify source tree');
    return r.stdout;
  };
  const files = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean))].sort();
  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(path + '\0');
    hash.update(existsSync(join(root, path)) ? readFileSync(join(root, path)) : '[deleted]');
    hash.update('\0');
  }
  hash.update(git(['diff', '--cached', '--binary']));
  return { commit: git(['rev-parse', 'HEAD']).trim(), sha256: hash.digest('hex') };
}

export function validateReport(report, { identity, steps, readLog, latest }) {
  const errors = [];
  if (latest !== true) errors.push('A newer verification attempt supersedes this receipt');
  if (report.status !== 'PASS' || !isDeepStrictEqual(report.before, identity)
      || !isDeepStrictEqual(report.after, identity)) errors.push('Report is not PASS for the current source');
  if (!Array.isArray(report.results) || report.results.length !== steps.length) return [...errors, 'Missing or extra steps'];
  for (const [index, step] of steps.entries()) {
    const result = report.results[index];
    if (step.blockedReason || !result || result.id !== step.id || result.command !== step.command || result.cwd !== step.cwd
        || !isDeepStrictEqual(result.args, step.args) || result.status !== 'PASS' || result.exitCode !== 0) {
      errors.push(`Invalid step ${step.id}`); continue;
    }
    try {
      if (createHash('sha256').update(readLog(step.id)).digest('hex') !== result.logSha256) errors.push(`Changed log ${step.id}`);
    } catch { errors.push(`Missing log ${step.id}`); }
  }
  return errors;
}

export function stepsFor(root, group, base) {
  const windows = process.platform === 'win32';
  const npm = windows ? 'npm.cmd' : 'npm';
  const mvnw = windows ? 'mvnw.cmd' : './mvnw';
  const steps = [];
  if (group === 'all' || group === 'scripts') {
    const tests = globSync(['scripts/**/*.test.mjs', '.claude/hooks/**/*.test.mjs'], { cwd: root });
    steps.push({ id: 'scripts', command: process.execPath, args: ['--test', ...tests], cwd: root });
    for (const [id, file, args] of [
      ['feature-map', 'scripts/verify/check-feature-map.mjs', []],
      ['openapi', 'scripts/openapi/compare-endpoints.mjs', ['--strict']],
      ['config', 'scripts/hooks/check-config.mjs', ['--tracked']],
      ['agents', 'scripts/harness/check-agent-config.mjs', ['--verify-generated']],
      ['agent-cases', 'scripts/harness/eval-agents.mjs', ['--validate']],
      ['agent-history', 'scripts/harness/eval-agents.mjs', ['--history', '--validate']],
      ['ai-log', 'scripts/ai-log/check-ai-usage-log.mjs', []],
      ['log-rotation', 'scripts/ai-log/rotate.mjs', ['--check']],
      ['openapi-index', 'scripts/openapi/build-index.mjs', ['--check']],
    ]) steps.push({ id, command: process.execPath, args: [file, ...args], cwd: root });
    steps.push({ id: 'migrations', command: process.execPath, args: ['scripts/db/check-migrations.mjs', '--base', base ?? ''], cwd: root,
      blockedReason: base ? undefined : 'Explicit --base <ref> required for migration comparison' });
  }
  if (group === 'all' || group === 'backend') steps.push({ id: 'backend', command: mvnw,
    args: ['--batch-mode', 'test'], cwd: join(root, 'backend'), requiresDocker: true });
  if (group === 'all' || group === 'frontend') {
    for (const name of ['lint', 'depcruise', 'test', 'build']) steps.push({ id: 'frontend-' + name,
      command: npm, args: ['run', name, ...(name === 'test' ? ['--', '--maxWorkers=2'] : [])], cwd: join(root, 'frontend') });
    steps.push({ id: 'lint-debt', command: process.execPath, args: ['scripts/harness/check-lint-baseline.mjs'], cwd: root });
  }
  if (group === 'all' || group === 'browser') steps.push({ id: 'browser', command: npm,
    args: ['run', 'e2e'], cwd: join(root, 'frontend'), requiresDocker: true });
  return steps;
}

export function main(args = process.argv.slice(2)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const evidenceRoot = join(root, 'backend/target/harness-evidence');
  const latestPath = join(evidenceRoot, 'latest-run.json');
  if (args[0] === '--check-report' && args.length === 2) {
    try {
      const path = resolve(args[1]);
      const report = JSON.parse(readFileSync(path, 'utf8'));
      const latest = JSON.parse(readFileSync(latestPath, 'utf8'));
      if (!['all', 'scripts', 'backend', 'frontend', 'browser'].includes(report.group)) throw new Error('Unknown report scope');
      const errors = validateReport(report, { identity: sourceIdentity(root), steps: stepsFor(root, report.group, report.base),
        readLog: id => readFileSync(join(dirname(path), `${id}.log`)), latest: resolve(latest.report) === path });
      errors.forEach(e => console.error(e));
      console.log(`Receipt ${report.group}: ${errors.length ? 'FAIL' : 'PASS'}`);
      return errors.length ? 1 : 0;
    } catch (error) { console.error(`Receipt FAIL: ${error.message}`); return 1; }
  }
  args = [...args];
  const baseIndex = args.indexOf('--base');
  const base = baseIndex >= 0 ? args[baseIndex + 1] : undefined;
  if (baseIndex >= 0 && base && !base.startsWith('--')) args.splice(baseIndex, 2);
  const group = args[0] ?? 'all';
  if (!['all', 'scripts', 'backend', 'frontend', 'browser'].includes(group) || args.length > 1) {
    console.error('Usage: node scripts/harness/verify.mjs [all|scripts|backend|frontend|browser] [--base <task-ref>] | --check-report <report.json>'); return 2;
  }
  const evidence = join(evidenceRoot, `${Date.now()}-${process.pid}`);
  mkdirSync(evidence, { recursive: true });
  // Write only at start: an older concurrent run finishing later must not replace the latest attempt.
  writeFileSync(latestPath, JSON.stringify({ report: join(evidence, 'report.json'), group }));
  const before = sourceIdentity(root);
  const env = safeEnvironment(process.env);
  const docker = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8', timeout: 15_000 }).status === 0;
  const steps = stepsFor(root, group, base);
  const results = runSteps(steps, step => {
    const missing = message => ({ status: null, error: { code: 'ENOENT', message } });
    const bins = { 'frontend-lint': ['oxlint'], 'frontend-depcruise': ['depcruise'], 'frontend-test': ['vitest'],
      'frontend-build': ['tsc', 'vite'], 'lint-debt': ['oxlint'], browser: ['playwright'] }[step.id] ?? [];
    for (const bin of bins) if (!existsSync(join(root, 'frontend/node_modules/.bin', bin + (process.platform === 'win32' ? '.cmd' : '')))) {
      return missing(`Missing ${bin}; run npm ci in frontend`);
    }
    if (['backend', 'browser'].includes(step.id) && spawnSync('java', ['-version'], { env, timeout: 5_000 }).status !== 0) return missing('JDK unavailable');
    if (step.id === 'browser') {
      try {
        const browser = createRequire(join(root, 'frontend/package.json'))('@playwright/test').chromium.executablePath();
        if (!existsSync(browser)) return missing('Playwright Chromium unavailable; run playwright install chromium');
      } catch { return missing('Playwright runtime unavailable'); }
    }
    if (step.command.endsWith('.cmd') && !existsSync(join(step.cwd, step.command)) && step.command !== 'npm.cmd') {
      return { status: null, error: { code: 'ENOENT' } };
    }
    const cmd = process.platform === 'win32' && step.command.endsWith('.cmd');
    return spawnSync(cmd ? 'cmd.exe' : step.command, cmd ? ['/d', '/c', step.command, ...step.args] : step.args,
      { cwd: step.cwd, env, encoding: 'utf8', timeout: 20 * 60_000, maxBuffer: 64 * 1024 * 1024 });
  }, { docker });
  for (const [index, r] of results.entries()) {
    const step = steps[index];
    Object.assign(r, { command: step.command, args: step.args, cwd: step.cwd });
    if (r.output !== undefined) {
      writeFileSync(join(evidence, `${r.id}.log`), r.output);
      r.logSha256 = createHash('sha256').update(r.output).digest('hex');
      delete r.output;
    }
    console.log(`${r.id}: ${r.status}${r.reason ? ' (' + r.reason + ')' : ''}`);
  }
  const after = sourceIdentity(root);
  if (before.sha256 !== after.sha256) results.push({ id: 'source-unchanged', status: 'FAIL', reason: 'Source changed during verification' });
  const status = overallStatus(results);
  writeFileSync(join(evidence, 'report.json'), JSON.stringify({ group, base, status, before, after, results }, null, 2));
  console.log(`${status}: ${evidence}`);
  return status === 'PASS' ? 0 : status === 'BLOCKED' ? 2 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
