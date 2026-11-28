import assert from 'node:assert/strict';
import test from 'node:test';
import { signatures, newWarnings } from './check-lint-baseline.mjs';

test('existing debt is allowed but new lines, copies and files are rejected', () => {
  const warning = { filename: 'src/a.tsx', code: 'react(refs)', severity: 'warning', labels: [{ span: { line: 1 } }] };
  const baseline = signatures([warning], () => 'ref.current = value');
  assert.deepEqual(newWarnings(baseline, baseline), []);
  assert.deepEqual(newWarnings([], baseline), []);
  assert.equal(newWarnings(signatures([warning], () => 'other.current = value'), baseline).length, 1);
  assert.equal(newWarnings(signatures([warning, warning], () => 'ref.current = value'), baseline).length, 1);
  assert.equal(newWarnings(signatures([{ ...warning, filename: 'src/b.tsx' }], () => 'ref.current = value'), baseline).length, 1);
});

test('moving the same line does not create an exemption for changed code', () => {
  const one = { filename: 'src/a.tsx', code: 'react(refs)', severity: 'warning', labels: [{ span: { line: 1 } }] };
  const old = signatures([one], () => 'ref.current = value');
  const moved = signatures([{ ...one, labels: [{ span: { line: 2 } }] }], () => '\nref.current = value');
  assert.deepEqual(newWarnings(moved, old), []);
});
