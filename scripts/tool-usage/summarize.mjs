// Hook `Stop`: đếm skill / MCP / subagent / tool Claude đã dùng trong lượt trả lời vừa xong,
// đọc từ transcript do Claude Code ghi (Claude không sửa được), rồi in một dòng tóm tắt
// và ghi thêm vào .claude/tool-usage.log. Chỉ ghi tên, không ghi tham số hay nội dung lệnh.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const parseLines = (text) =>
  text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)

// Tin nhắn thật của người dùng (không phải tool_result, thông báo subagent hay tác vụ nền).
const isHumanPrompt = (entry) =>
  entry.type === 'user' &&
  typeof entry.message?.content === 'string' &&
  (entry.origin === undefined || entry.origin?.kind === 'human')

const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1)

const toolUses = (entry) =>
  entry.type === 'assistant' && Array.isArray(entry.message?.content)
    ? entry.message.content.filter((block) => block.type === 'tool_use')
    : []

// Lệnh gạch chéo (ví dụ /doctor) nạp skill mà không qua tool Skill, nên đọc thẻ <command-name>.
const slashCommand = (entry) => {
  const match = /<command-name>\/?([^<\s]+)<\/command-name>/.exec(entry.message.content)
  return match ? match[1] : null
}

export function summarizeLastTurn(entries) {
  let start = -1
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isHumanPrompt(entries[i])) {
      start = i
      break
    }
  }
  const turn = start >= 0 ? entries.slice(start) : entries
  const skills = new Map()
  const mcp = new Map()
  const agents = new Map()
  const others = new Map()

  if (start >= 0) {
    const command = slashCommand(entries[start])
    if (command) bump(skills, `/${command}`)
  }
  for (const entry of turn) {
    for (const block of toolUses(entry)) {
      if (block.name === 'Skill') bump(skills, block.input?.skill ?? '?')
      else if (block.name === 'Agent') bump(agents, block.input?.subagent_type ?? 'claude')
      else if (block.name.startsWith('mcp__')) bump(mcp, block.name.slice('mcp__'.length))
      else bump(others, block.name)
    }
  }
  return { skills, mcp, agents, others }
}

const list = (map, withCount) =>
  map.size === 0
    ? '(không)'
    : [...map].map(([name, n]) => (withCount && n > 1 ? `${name} ×${n}` : name)).join(', ')

export function formatSummary({ skills, mcp, agents, others }) {
  const tools = [...others].map(([name, n]) => `${name} ×${n}`).join(', ') || '(không)'
  return (
    `Lượt này: Skill: ${list(skills)} | MCP: ${list(mcp, true)} | ` +
    `Subagent: ${list(agents, true)} | Tool: ${tools}`
  )
}

function findTranscript(input) {
  if (input.transcript_path && existsSync(input.transcript_path)) return input.transcript_path
  if (!input.session_id) return null
  const root = join(homedir(), '.claude', 'projects')
  for (const dir of readdirSync(root)) {
    const candidate = join(root, dir, `${input.session_id}.jsonl`)
    if (existsSync(candidate)) return candidate
  }
  return null
}

function main() {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
  const transcript = findTranscript(input)
  if (!transcript) return
  const summary = formatSummary(summarizeLastTurn(parseLines(readFileSync(transcript, 'utf8'))))

  const logFile = join(input.cwd ?? process.cwd(), '.claude', 'tool-usage.log')
  mkdirSync(dirname(logFile), { recursive: true })
  appendFileSync(logFile, `${new Date().toISOString()} ${input.session_id ?? ''} ${summary}\n`)
  process.stdout.write(JSON.stringify({ systemMessage: summary }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch {
    // Hook chỉ để theo dõi: lỗi không được chặn phản hồi.
  }
}
