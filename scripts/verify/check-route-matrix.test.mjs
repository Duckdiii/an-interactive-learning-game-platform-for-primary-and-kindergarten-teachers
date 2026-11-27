import assert from 'node:assert/strict';
import test from 'node:test';
import { checkRouteMatrix } from './check-feature-map.mjs';

test('route rename, missing registration and unsupported claims fail', () => {
  const matrix = [{ key: 'login', path: '/login', state: 'real', checks: ['frontend/e2e/teacher-flow.spec.ts'] }];
  const paths = "export const ROUTES = { login: '/login' }";
  assert.deepEqual(checkRouteMatrix(matrix, paths, 'path={ROUTES.login}', () => true), []);
  assert.ok(checkRouteMatrix(matrix, paths.replace('/login', '/signin'), 'path={ROUTES.login}', () => true).length);
  assert.ok(checkRouteMatrix(matrix, paths, '', () => true).length);
  assert.ok(checkRouteMatrix(matrix, paths, 'path={ROUTES.login}', () => false).length);
  assert.ok(checkRouteMatrix([{ ...matrix[0], state: 'mock', checks: [] }], paths, 'path={ROUTES.login}', () => true).length);
  assert.deepEqual(checkRouteMatrix([{ ...matrix[0], state: 'unverified', checks: [] }],
    paths, 'path={ROUTES.login}', () => true), []);
});

test('new routes need a coverage entry and duplicate entries fail', () => {
  assert.ok(checkRouteMatrix([], "export const ROUTES = { login: '/login' }", 'path={ROUTES.login}', () => true).length);
  const row = { key: 'login', path: '/login', state: 'real', checks: ['test.ts'] };
  assert.ok(checkRouteMatrix([row, row], "export const ROUTES = { login: '/login' }", 'path={ROUTES.login}', () => true).length);
});

test('commented routes do not count as registrations or path definitions', () => {
  const row = { key: 'login', path: '/login', state: 'real', checks: ['test.ts'] };
  const paths = "export const ROUTES = { login: '/login' }";
  for (const app of ['// path={ROUTES.login}', '{/* <Route path={ROUTES.login} /> */}', "const example = 'path={ROUTES.login}'"]) {
    assert.ok(checkRouteMatrix([row], paths, app, () => true).some(e => e.includes('not registered')));
  }
  assert.ok(checkRouteMatrix([row], "export const ROUTES = { /* login: '/login' */ }",
    'path={ROUTES.login}', () => true).some(e => e.includes('differs')));
  assert.deepEqual(checkRouteMatrix([row], paths,
    '<Route path={ROUTES.login} source="https://example.test" /> // trailing comment', () => true), []);
});
