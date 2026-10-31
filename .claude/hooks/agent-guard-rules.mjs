// Luật của agent-guard. Tách khỏi file hook để hook luôn chạy, không cần điều kiện "có phải file chính không" (điều kiện đó sai là hook im lặng cho qua).
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const AGENT_NAME = /^[a-z][a-z-]*$/
const READ_ONLY_GIT = /^git (diff|log|show|status)( |$)/
// Danh sách cho phép, không phải danh sách cấm: Git Bash bỏ dấu ngoặc và mở rộng ký tự đặc biệt trước khi chạy, nên "--output=x" hay --out''put=x vẫn thành cờ ghi file.
const SAFE_CHARS = /^[A-Za-z0-9_./:=@^~%,+\- ]+$/
// Cờ cũng là danh sách cho phép vì git chấp nhận cờ viết tắt (--ext thay cho --ext-diff).
const SAFE_FLAG =
  /^(--cached|--staged|--stat|--numstat|--shortstat|--summary|--check|--name-only|--name-status|--oneline|--short|--porcelain|--branch|--graph|--all|--patch|--no-patch|--follow|--reverse|--merges|--no-merges|--first-parent|--decorate|--abbrev-commit|--color|--no-color|--word-diff|--no-ext-diff|--ignore-space-change|--ignore-all-space|(--format|--pretty|--since|--until|--after|--before|--author|--grep|--date)=\S+|(--unified|--max-count)=\d+|--stat=\d+(,\d+)*|--diff-filter=[A-Za-z]+|-\d+|-n\d*|-U\d+|-p|-s|-b|-w|-z|-M|-[SG]\S+)$/

const deny = (reason) => ({ allow: false, reason })
const ALLOW = { allow: true, reason: '' }

const isInside = (dir, target) => {
  const rel = relative(dir, target)

  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

function checkWrite(agent, root, input) {
  const filePath = input.tool_input?.file_path

  if (typeof filePath !== 'string' || filePath === '') return deny('thiếu file_path')

  const memoryDir = resolve(root, '.claude', 'agent-memory', agent)
  const target = resolve(input.cwd ?? root, filePath)

  return isInside(memoryDir, target) ? ALLOW : deny(`${agent} chỉ được ghi trong .claude/agent-memory/${agent}/`)
}

function checkBash(input) {
  const command = input.tool_input?.command

  if (typeof command !== 'string') return deny('thiếu command')

  const trimmed = command.trim()

  if (!READ_ONLY_GIT.test(trimmed)) return deny('Bash chỉ được chạy git diff/log/show/status')
  if (!SAFE_CHARS.test(trimmed)) return deny('lệnh có ký tự không được phép: không dùng ống |, chuyển hướng, ngoặc kép; giới hạn đầu ra bằng cờ git như -n 20 hoặc --stat')

  const tokens = trimmed.split(/ +/).slice(2)
  const pathsFrom = tokens.indexOf('--')
  const flags = (pathsFrom < 0 ? tokens : tokens.slice(0, pathsFrom)).filter((token) => token.startsWith('-'))
  const unsafe = flags.find((flag) => !SAFE_FLAG.test(flag))

  return unsafe ? deny(`cờ git không được phép: ${unsafe}`) : ALLOW
}

export function decide(agent, input, root = ROOT) {
  if (!AGENT_NAME.test(agent ?? '')) return deny('tên agent không hợp lệ')

  switch (input?.tool_name) {
    case 'Write':
    case 'Edit':
      return checkWrite(agent, root, input)
    case 'Bash':
      return checkBash(input)
    default:
      return deny(`công cụ không được phép: ${input?.tool_name}`)
  }
}
