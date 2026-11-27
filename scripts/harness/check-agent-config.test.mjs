import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generatedAgent, checkAgentConfig, codexHooks } from './check-agent-config.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('generated Codex agent preserves literal backslashes and uses the canonical rules', () => {
  const text = generatedAgent('reviewer', '---\nname: reviewer\ndescription: Review\n---\nĐọc .claude/rules/backend.md; regex \\d+.');
  assert.match(text, /developer_instructions = '''/);
  assert.match(text, /regex \\d\+/);
  assert.doesNotMatch(text, /\.Codex\/rules/);
});

test('Codex adapter runs the real shared hook from a repository subdirectory', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const command = codexHooks().hooks.PreToolUse[0].hooks[0].command;
  assert.ok(!command.includes('CLAUDE_PROJECT_DIR'));
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: "node -e 'a;\nb'" } });
  const r = spawnSync(process.platform === 'win32' ? 'powershell' : 'sh',
    process.platform === 'win32' ? ['-NoProfile', '-Command', command] : ['-c', command],
    { cwd: join(root, 'frontend'), input, encoding: 'utf8', timeout: 20_000 });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('missing/stale adapters and missing rule files fail rather than silently pass', () => {
  const root = mkdtempSync(join(tmpdir(), 'agent-config-'));
  try {
    mkdirSync(join(root, '.claude/agents'), { recursive: true });
    mkdirSync(join(root, '.codex/agents'), { recursive: true });
    writeFileSync(join(root, '.codex/hooks.json'), JSON.stringify(codexHooks()));
    const source = '---\nname: reviewer\ndescription: Review\n---\nRead .claude/rules/backend.md.';
    writeFileSync(join(root, '.claude/agents/reviewer.md'), source);
    assert.ok(checkAgentConfig(root).some(e => e.includes('reviewer.toml')));
    writeFileSync(join(root, '.codex/agents/reviewer.toml'), generatedAgent('reviewer', source));
    assert.ok(checkAgentConfig(root).some(e => e.includes('backend.md')));
    mkdirSync(join(root, '.claude/rules'), { recursive: true });
    writeFileSync(join(root, '.claude/rules/backend.md'), '# Rules');
    assert.deepEqual(checkAgentConfig(root), []);
    writeFileSync(join(root, '.codex/agents/removed-role.toml'), 'THIS IS INVALID TOML');
    assert.ok(checkAgentConfig(root).some(e => e.includes('removed-role.toml')));
    rmSync(join(root, '.codex/agents/removed-role.toml'));
    writeFileSync(join(root, '.codex/hooks.json'), '{}');
    assert.ok(checkAgentConfig(root).some(e => e.includes('hooks.json')));
    writeFileSync(join(root, '.codex/hooks.json'), JSON.stringify(codexHooks()));
    writeFileSync(join(root, '.codex/agents/reviewer.toml'), readFileSync(join(root, '.codex/agents/reviewer.toml'), 'utf8') + '\n# drift');
    assert.ok(checkAgentConfig(root).some(e => e.includes('stale')));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
