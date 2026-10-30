import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { decide } from './agent-guard-rules.mjs'

const root = resolve('/repo')
const memoryDir = join(root, '.claude', 'agent-memory', 'reviewer')
const script = join(dirname(fileURLToPath(import.meta.url)), 'agent-guard.mjs')

const write = (filePath, cwd = root, tool_name = 'Write') => decide('reviewer', { tool_name, cwd, tool_input: { file_path: filePath } }, root)
const bash = (command) => decide('reviewer', { tool_name: 'Bash', cwd: root, tool_input: { command } }, root)

test('cho ghi trong thư mục nhớ của chính agent, cả Write lẫn Edit, cả đường dẫn tương đối', () => {
  assert.equal(write(join(memoryDir, 'MEMORY.md')).allow, true)
  assert.equal(write(join(memoryDir, 'ARCHIVE.md'), root, 'Edit').allow, true)
  assert.equal(write('.claude/agent-memory/reviewer/MEMORY.md').allow, true)
  assert.equal(write('MEMORY.md', memoryDir).allow, true)
})

test('chặn ghi ra ngoài thư mục nhớ', () => {
  for (const target of [
    join(root, 'frontend', 'src', 'App.tsx'),
    join(root, 'CLAUDE.md'),
    '.claude/agents/reviewer.md',
    join(root, '.claude', 'agent-memory', 'security-auditor', 'MEMORY.md'),
    join(root, '.claude', 'agent-memory', 'reviewer-evil', 'MEMORY.md'),
    memoryDir,
  ]) {
    assert.equal(write(target).allow, false, target)
    assert.equal(write(target, root, 'Edit').allow, false, target)
  }
})

test('chặn đường dẫn lách bằng ..', () => {
  assert.equal(write(`${memoryDir}/../../../CLAUDE.md`).allow, false)
  assert.equal(write('.claude/agent-memory/reviewer/../../settings.json').allow, false)
  assert.equal(write('../../../CLAUDE.md', memoryDir).allow, false)
})

test('.. mà vẫn nằm trong thư mục nhớ thì cho phép, vì so sánh sau khi chuẩn hóa', () => {
  assert.equal(write(`${memoryDir}/a/../MEMORY.md`).allow, true)
})

test('thiếu hoặc sai file_path thì chặn', () => {
  assert.equal(decide('reviewer', { tool_name: 'Write', tool_input: {} }, root).allow, false)
  assert.equal(decide('reviewer', { tool_name: 'Write', tool_input: { file_path: '' } }, root).allow, false)
  assert.equal(decide('reviewer', { tool_name: 'Edit', tool_input: { file_path: 42 } }, root).allow, false)
})

test('cho các lệnh git đọc', () => {
  for (const command of [
    'git diff',
    'git diff --cached',
    'git diff main...HEAD',
    'git diff --stat -- frontend/src',
    'git log --oneline -5',
    'git show ba88fb2:frontend/src/App.tsx',
    'git status --short',
    '  git status  ',
    'git diff main...HEAD --stat -- frontend/src',
    'git diff HEAD~1 HEAD -- a.ts',
    'git log --format=%h%x09%s -n 5',
    'git log --since=2.days.ago --author=Duy',
    'git show --stat HEAD^',
    'git diff --name-only',
    'git log -Sfoo --oneline',
    'git log -Gfoo -p',
    'git log --grep=fix --date=short --decorate',
    'git log --pretty=format:%h',
    'git diff -w --summary -M --stat=100,50',
  ]) {
    assert.equal(bash(command).allow, true, command)
  }
})

test('sau -- là đường dẫn, không coi là cờ', () => {
  assert.equal(bash('git diff -- --output=a.txt').allow, true)
})

test('chặn cờ bị bọc: Git Bash bỏ ngoặc và mở rộng ký tự trước khi git nhận', () => {
  for (const command of [
    'git diff "--output=CLAUDE.md"',
    "git diff '--output=x'",
    "git diff --out''put=x",
    'git diff --out\\put=x',
    'git log --{output,zzz}=x',
    "git show $'--output=x' HEAD",
    'git diff --outpu?=x',
    'git diff --outpu*=x',
    'git diff --since="2 days ago"',
  ]) {
    assert.equal(bash(command).allow, false, command)
  }
})

test('cờ nằm ngoài danh sách cho phép thì chặn, kể cả cờ viết tắt của git', () => {
  for (const command of ['git diff --out=x', 'git diff --outp=x', 'git diff --ext', 'git diff --ext-d', 'git diff --textc', 'git diff --no-index a b', 'git log -c', 'git diff -O/x']) {
    assert.equal(bash(command).allow, false, command)
  }
})

test('file tên bắt đầu bằng .. trong thư mục nhớ vẫn ghi được', () => {
  assert.equal(write(join(memoryDir, '..foo.md')).allow, true)
})

test('chặn lệnh không phải git đọc', () => {
  for (const command of ['rm -rf frontend', 'cat MEMORY.md', 'git commit -m x', 'git push', 'git checkout main', 'git add -A', 'git reset --hard', 'git', 'gitdiff', 'git -c core.pager=evil log', 'node x.mjs', '']) {
    assert.equal(bash(command).allow, false, command)
  }
})

test('chặn nối lệnh và chuyển hướng phía sau git đọc', () => {
  for (const command of [
    'git status; rm -rf frontend',
    'git status && rm x',
    'git status || rm x',
    'git status & rm x',
    'git log | sh',
    'git show HEAD:a > frontend/src/App.tsx',
    'git diff >> a.txt',
    'git diff < a.txt',
    'git log $(rm x)',
    'git log ${HOME}',
    'git log `rm x`',
    'git status \nrm x',
    'git status \r\nrm x',
  ]) {
    assert.equal(bash(command).allow, false, JSON.stringify(command))
  }
})

test('chặn cờ làm git đọc thành ghi file hoặc chạy chương trình ngoài', () => {
  for (const command of ['git diff --output=a.txt', 'git log --output a.txt', 'git show --output=x HEAD', 'git diff --ext-diff', 'git show --textconv HEAD:a']) {
    assert.equal(bash(command).allow, false, command)
  }
})

test('thiếu command thì chặn', () => {
  assert.equal(decide('reviewer', { tool_name: 'Bash', tool_input: {} }, root).allow, false)
})

test('công cụ lạ, đầu vào rỗng hoặc tên agent sai thì chặn', () => {
  assert.equal(decide('reviewer', { tool_name: 'NotebookEdit', tool_input: {} }, root).allow, false)
  assert.equal(decide('reviewer', null, root).allow, false)
  assert.equal(decide('reviewer', {}, root).allow, false)
  assert.equal(decide(undefined, { tool_name: 'Bash', tool_input: { command: 'git status' } }, root).allow, false)
  assert.equal(decide('../evil', { tool_name: 'Bash', tool_input: { command: 'git status' } }, root).allow, false)
})

const runScript = (stdin, args = ['reviewer']) => spawnSync(process.execPath, [script, ...args], { input: stdin, encoding: 'utf8' })

test('chạy thật qua stdin: cho phép thoát 0, chặn thoát 2 kèm lý do ở stderr', () => {
  const allowed = runScript(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } }))
  const blocked = runScript(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'rm -rf x' } }))

  assert.equal(allowed.status, 0)
  assert.equal(blocked.status, 2)
  assert.match(blocked.stderr, /Đã chặn/)
})

test('chạy thật với gốc repo thật: ghi file nhớ được, ghi CLAUDE.md bị chặn', () => {
  const repo = resolve(dirname(script), '..', '..')
  const run = (file_path) => runScript(JSON.stringify({ tool_name: 'Write', cwd: repo, tool_input: { file_path } })).status

  assert.equal(run(join(repo, '.claude', 'agent-memory', 'reviewer', 'MEMORY.md')), 0)
  assert.equal(run(join(repo, 'CLAUDE.md')), 2)
})

test('lỗi của chính hook phải thoát 2, vì mã khác thì Claude Code cho lệnh chạy tiếp', () => {
  assert.equal(runScript('không phải JSON').status, 2)
  assert.equal(runScript('').status, 2)
})

test('thiếu tên agent khi gọi hook thì chặn', () => {
  assert.equal(runScript(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } }), []).status, 2)
})

test('gọi hook bằng đường dẫn khác hoa thường vẫn chặn, không im lặng cho qua', { skip: process.platform !== 'win32' }, () => {
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'rm -rf x' } })

  assert.equal(spawnSync(process.execPath, [script.toLowerCase(), 'reviewer'], { input, encoding: 'utf8' }).status, 2)
  assert.equal(spawnSync(process.execPath, [join(dirname(script).toUpperCase(), 'agent-guard.mjs'), 'reviewer'], { input, encoding: 'utf8' }).status, 2)
})
