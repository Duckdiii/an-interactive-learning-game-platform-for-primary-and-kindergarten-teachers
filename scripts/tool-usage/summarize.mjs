// Đếm skill / MCP / subagent / tool Claude đã dùng trong lượt (tác vụ) vừa rồi, đọc từ transcript do
// Claude Code ghi (Claude không sửa được). Chỉ ghi tên, không ghi tham số hay nội dung lệnh.
//
// Hai cách chạy:
//   1. Hook `Stop` (không tham số): in tóm tắt dạng systemMessage và ghi/ghi đè MỘT dòng cho mỗi lượt vào
//      .claude/tool-usage.log (hook Stop chạy lại mỗi khi subagent báo xong, nên dòng của cùng lượt bị ghi đè).
//   2. `node scripts/tool-usage/summarize.mjs --current`: in một dòng "Công cụ đã dùng: ..." cho lượt đang làm,
//      lấy từ transcript mới nhất của dự án, để dán vào báo cáo cuối tác vụ. Không ghi log.
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
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

// mcp__playwright__browser_click -> "playwright" (gom theo máy chủ cho ngắn gọn).
const mcpServer = (toolName) => toolName.split('__')[1] || toolName

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
  // Dấu của lượt: uuid tin nhắn người dùng bắt đầu lượt, để biết hai lần chạy hook là cùng một lượt.
  const turnKey = start >= 0 ? (entries[start].uuid ?? entries[start].timestamp ?? '') : ''

  if (start >= 0) {
    const command = slashCommand(entries[start])
    if (command) bump(skills, `/${command}`)
  }
  for (const entry of turn) {
    for (const block of toolUses(entry)) {
      if (block.name === 'Skill') bump(skills, block.input?.skill ?? '?')
      else if (block.name === 'Agent') bump(agents, block.input?.subagent_type ?? 'claude')
      else if (block.name.startsWith('mcp__')) bump(mcp, mcpServer(block.name))
      else bump(others, block.name)
    }
  }
  return { skills, mcp, agents, others, turnKey }
}

const list = (map, withCount) =>
  map.size === 0
    ? '(không)'
    : [...map].map(([name, n]) => (withCount && n > 1 ? `${name} ×${n}` : name)).join(', ')

const toolsText = (others) =>
  [...others].map(([name, n]) => `${name} ×${n}`).join(', ') || '(không)'

export function formatSummary({ skills, mcp, agents, others }) {
  return (
    `Lượt này: Skill: ${list(skills)} | MCP: ${list(mcp, true)} | ` +
    `Subagent: ${list(agents, true)} | Tool: ${toolsText(others)}`
  )
}

// Một dòng để dán vào báo cáo cuối tác vụ.
export function formatReport({ skills, mcp, agents, others }) {
  return (
    `Công cụ đã dùng: Skill: ${list(skills)} · MCP: ${list(mcp, true)} · ` +
    `Subagent: ${list(agents, true)} · Tool: ${toolsText(others)}`
  )
}

// Ghi một dòng cho mỗi lượt: nếu dòng cuối cùng cùng phiên và cùng lượt thì thay thế, ngược lại thêm mới.
export function upsertLogLine(logFile, sessionId, turnKey, text, now = new Date()) {
  const tag = `${sessionId} [lượt:${String(turnKey).slice(0, 8)}]`
  const line = `${now.toISOString()} ${tag} ${text}`
  const existing = existsSync(logFile) ? readFileSync(logFile, 'utf8') : ''
  const lines = existing.split('\n').filter(Boolean)

  if (turnKey && lines.length > 0 && lines[lines.length - 1].includes(` ${tag} `)) {
    lines[lines.length - 1] = line
    writeFileSync(logFile, `${lines.join('\n')}\n`)
  } else {
    appendFileSync(logFile, `${line}\n`)
  }
}

// Thư mục transcript của dự án: đường dẫn với mọi ký tự không phải chữ/số đổi thành "-".
export const projectDirName = (cwd) => cwd.replace(/[^A-Za-z0-9]/g, '-')

export function latestTranscript(dir) {
  if (!existsSync(dir)) return null
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.jsonl'))
    .map((name) => ({ path: join(dir, name), mtime: statSync(join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  return files[0]?.path ?? null
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

function readSummary(transcript) {
  return summarizeLastTurn(parseLines(readFileSync(transcript, 'utf8')))
}

function projectRoot(input = {}) {
  return input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
}

function runHook() {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
  const transcript = findTranscript(input)
  if (!transcript) return
  const summary = readSummary(transcript)
  const text = formatSummary(summary)

  const logFile = join(projectRoot(input), '.claude', 'tool-usage.log')
  mkdirSync(dirname(logFile), { recursive: true })
  upsertLogLine(logFile, input.session_id ?? '', summary.turnKey, text)
  process.stdout.write(JSON.stringify({ systemMessage: text }))
}

function runCurrent() {
  // Chạy từ thư mục con (ví dụ frontend/) vẫn tìm được: thử lần lượt thư mục hiện tại rồi các thư mục cha.
  let transcript = null
  for (let dir = projectRoot(); !transcript; dir = dirname(dir)) {
    transcript = latestTranscript(join(homedir(), '.claude', 'projects', projectDirName(dir)))
    if (dirname(dir) === dir) break
  }
  if (!transcript) {
    process.stdout.write('Công cụ đã dùng: (không tìm thấy transcript của dự án)\n')
    return
  }
  process.stdout.write(`${formatReport(readSummary(transcript))}\n`)
}

// Hook chỉ để theo dõi: lỗi không được chặn phản hồi, nhưng được ghi lại để biết khi nào hook hỏng.
function logError(error) {
  try {
    const file = join(projectRoot(), '.claude', 'tool-usage.error.log')
    mkdirSync(dirname(file), { recursive: true })
    appendFileSync(file, `${new Date().toISOString()} ${error?.stack ?? error}\n`)
  } catch {
    // Không còn gì để làm.
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.includes('--current')) runCurrent()
    else runHook()
  } catch (error) {
    logError(error)
  }
}
