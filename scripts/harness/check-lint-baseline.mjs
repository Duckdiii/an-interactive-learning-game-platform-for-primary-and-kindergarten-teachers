import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function signatures(diagnostics, readSource) {
  const counts = new Map();
  for (const d of diagnostics.filter(d => d.severity === 'warning')) {
    const source = readSource(d.filename).split(/\r?\n/)[d.labels?.[0]?.span?.line - 1]?.trim();
    if (source === undefined) throw new Error(`Cannot locate lint diagnostic ${d.filename}`);
    const row = { filename: d.filename.replaceAll('\\', '/'), code: d.code, source };
    const key = JSON.stringify(row);
    const old = counts.get(key);
    counts.set(key, { ...row, count: (old?.count ?? 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

export function newWarnings(current, baseline) {
  return current.filter(row => {
    const old = baseline.find(old => old.filename === row.filename && old.code === row.code && old.source === row.source);
    return row.count > (old?.count ?? 0);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const frontend = join(root, 'frontend');
  const pkg = JSON.parse(readFileSync(join(frontend, 'node_modules/oxlint/package.json'), 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.oxlint;
  const run = spawnSync(process.execPath, [join(frontend, 'node_modules/oxlint', bin), '--format', 'json'],
    { cwd: frontend, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  if (run.status !== 0) { console.error('Lint errors or unavailable oxlint; run npm run lint in frontend.'); process.exitCode = 1; }
  else {
    const diagnostics = JSON.parse(run.stdout).diagnostics;
    const current = signatures(diagnostics, path => readFileSync(join(frontend, path), 'utf8'));
    const baselineFile = join(root, 'docs/harness-evals/lint-baseline.json');
    if (process.argv.includes('--snapshot')) {
      writeFileSync(baselineFile, JSON.stringify(current, null, 2) + '\n');
      console.log('Baseline written; review every exemption before accepting this change.');
    } else {
      const added = newWarnings(current, JSON.parse(readFileSync(baselineFile, 'utf8')));
      added.forEach(row => console.error(`${row.filename}: new ${row.code} at ${row.source}`));
      console.log(`Lint debt: ${diagnostics.filter(d => d.severity === 'warning').length} warnings, ${added.length} new anchors.`);
      process.exitCode = added.length ? 1 : 0;
    }
  }
}
