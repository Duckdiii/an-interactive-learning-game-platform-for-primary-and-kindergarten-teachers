import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatSummary, summarizeLastTurn } from './summarize.mjs'

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
    'Lượt này: Skill: update-config | MCP: github__get_me ×2 | ' +
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
