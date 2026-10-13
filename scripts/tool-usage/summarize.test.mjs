import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  formatReport,
  formatSummary,
  latestTranscript,
  projectDirName,
  summarizeLastTurn,
  upsertLogLine,
} from './summarize.mjs'

const human = (text, origin = { kind: 'human' }) => ({
  type: 'user',
  origin,
  message: { role: 'user', content: text },
})
const toolResult = () => ({
  type: 'user',
  message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] },
})
const assistant = (...uses) => ({
  type: 'assistant',
  message: {
    role: 'assistant',
    content: uses.map(([name, input = {}]) => ({ type: 'tool_use', name, input })),
  },
})

test('chỉ đếm tool của lượt cuối, bắt đầu từ tin nhắn thật của người dùng', () => {
  const entries = [
    human('lượt 1'),
    assistant(['Bash'], ['Skill', { skill: 'old-skill' }]),
    toolResult(),
    human('lượt 2'),
    assistant(['Read'], ['Read'], ['Agent', { subagent_type: 'log-auditor' }]),
    toolResult(),
  ]
  const s = summarizeLastTurn(entries)
  assert.deepEqual([...s.others], [['Read', 2]])
  assert.deepEqual([...s.agents], [['log-auditor', 1]])
  assert.equal(s.skills.size, 0)
})

test('phân loại Skill, MCP, Agent và tool thường', () => {
  const entries = [
    human('hỏi'),
    assistant(
      ['Skill', { skill: 'update-config' }],
      ['mcp__github__get_me'],
      ['mcp__github__get_me'],
      ['Agent', { subagent_type: 'pre-commit-checker' }],
      ['Bash'],
    ),
  ]
  const text = formatSummary(summarizeLastTurn(entries))
  assert.equal(
    text,
    'Lượt này: Skill: update-config | MCP: github ×2 | ' +
      'Subagent: pre-commit-checker | Tool: Bash ×1',
  )
})

test('thông báo subagent hay tác vụ nền không bị coi là một lượt mới', () => {
  const entries = [
    human('làm đi'),
    assistant(['Bash']),
    human('[Subagent hand-back] ...', { kind: 'peer' }),
    assistant(['Edit']),
  ]
  const s = summarizeLastTurn(entries)
  assert.deepEqual([...s.others].sort(), [
    ['Bash', 1],
    ['Edit', 1],
  ])
})

test('lệnh gạch chéo được tính là skill dù không qua tool Skill', () => {
  const entries = [
    human('<command-name>/doctor</command-name> prompt-audit'),
    assistant(['Read']),
  ]
  assert.deepEqual([...summarizeLastTurn(entries).skills], [['/doctor', 1]])
})

test('lượt không dùng gì cho ra dòng "(không)"', () => {
  const text = formatSummary(summarizeLastTurn([human('chào'), assistant()]))
  assert.equal(text, 'Lượt này: Skill: (không) | MCP: (không) | Subagent: (không) | Tool: (không)')
})

test('MCP được gom theo máy chủ, không liệt kê từng tool', () => {
  const entries = [
    human('chụp ảnh'),
    assistant(
      ['mcp__playwright__browser_navigate'],
      ['mcp__playwright__browser_take_screenshot'],
      ['mcp__playwright__browser_take_screenshot'],
      ['mcp__Claude_Browser__preview_start'],
    ),
  ]
  const text = formatSummary(summarizeLastTurn(entries))
  assert.ok(text.includes('MCP: playwright ×3, Claude_Browser | Subagent'))
})

test('formatReport cho một dòng dán vào báo cáo cuối tác vụ', () => {
  const entries = [
    human('làm đi'),
    assistant(
      ['Skill', { skill: 'ui-ux-pro-max' }],
      ['mcp__playwright__browser_click'],
      ['Agent', { subagent_type: 'reviewer' }],
      ['Edit'],
      ['Edit'],
    ),
  ]
  assert.equal(
    formatReport(summarizeLastTurn(entries)),
    'Công cụ đã dùng: Skill: ui-ux-pro-max · MCP: playwright · Subagent: reviewer · Tool: Edit ×2',
  )
})

test('turnKey là uuid của tin nhắn người dùng bắt đầu lượt', () => {
  const entries = [
    { ...human('lượt 1'), uuid: 'aaaa1111-0000' },
    assistant(['Bash']),
    { ...human('lượt 2'), uuid: 'bbbb2222-0000' },
    assistant(['Read']),
  ]
  assert.equal(summarizeLastTurn(entries).turnKey, 'bbbb2222-0000')
})

test('upsertLogLine ghi đè dòng cuối của cùng lượt, thêm dòng mới khi sang lượt khác', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tool-usage-'))
  const file = join(dir, 'tool-usage.log')
  try {
    upsertLogLine(file, 's1', 'turnAAAA-1', 'lần một')
    upsertLogLine(file, 's1', 'turnAAAA-1', 'lần hai (cộng dồn)')
    upsertLogLine(file, 's1', 'turnBBBB-2', 'lượt khác')
    upsertLogLine(file, 's2', 'turnBBBB-2', 'phiên khác, cùng mã lượt')

    const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean)
    assert.equal(lines.length, 3)
    assert.ok(lines[0].endsWith('lần hai (cộng dồn)'))
    assert.ok(!readFileSync(file, 'utf8').includes('lần một'))
    assert.ok(lines[1].endsWith('s1 [lượt:turnBBBB] lượt khác'))
    assert.ok(lines[2].endsWith('s2 [lượt:turnBBBB] phiên khác, cùng mã lượt'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('upsertLogLine luôn thêm dòng mới khi không có dấu lượt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tool-usage-'))
  const file = join(dir, 'tool-usage.log')
  try {
    upsertLogLine(file, 's1', '', 'một')
    upsertLogLine(file, 's1', '', 'hai')
    assert.equal(readFileSync(file, 'utf8').split('\n').filter(Boolean).length, 2)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('projectDirName đổi mọi ký tự không phải chữ/số thành dấu gạch ngang', () => {
  assert.equal(
    projectDirName(String.raw`C:\vi-du\my-project`),
    'C--vi-du-my-project',
  )
})

test('latestTranscript chọn file .jsonl mới nhất, bỏ qua file khác', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tool-usage-'))
  try {
    writeFileSync(join(dir, 'old.jsonl'), '')
    writeFileSync(join(dir, 'new.jsonl'), '')
    writeFileSync(join(dir, 'newest.txt'), '')
    utimesSync(join(dir, 'old.jsonl'), new Date(2026, 0, 1), new Date(2026, 0, 1))
    utimesSync(join(dir, 'new.jsonl'), new Date(2026, 5, 1), new Date(2026, 5, 1))
    assert.equal(latestTranscript(dir), join(dir, 'new.jsonl'))
    assert.equal(latestTranscript(join(dir, 'khong-co')), null)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
