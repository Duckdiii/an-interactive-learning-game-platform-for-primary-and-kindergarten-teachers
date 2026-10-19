/**
 * T8.3: chạy tiến trình Python cho tts-vieneu.mjs. Tách riêng khỏi CLI để test được (xem tts-vieneu-spawn.test.mjs).
 * Không dùng shell; chỉ giữ lại các dòng giao thức của stdout (log tự in của thư viện có thể rất lớn); hết giờ thì giết CẢ cây tiến trình.
 */
import { spawn } from 'node:child_process'
import { PROTOCOL_PREFIX } from './tts-vieneu-core.mjs'

const STDERR_TAIL = 64 * 1024
const MAX_PARTIAL = 1024 * 1024
const MAX_PROTOCOL_LINES = 5000
export const KILL_GRACE_MS = 5000

/** Giết tiến trình và các tiến trình con của nó (bộ khởi chạy venv trên Windows bật Python thật làm tiến trình con). */
export function killTree(child) {
  if (child.pid === undefined) return
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' })
    killer.on('error', () => child.kill())
    return
  }
  try {
    process.kill(-child.pid, 'SIGKILL') // nhóm tiến trình riêng (detached)
  } catch {
    child.kill('SIGKILL')
  }
}

/** spawnFn cho `run` của tts-vieneu-core: -> { code, stdout (chỉ dòng giao thức), stderr (phần đuôi), timedOut, spawnError }. */
// `kill` chỉ được thay trong test (để chứng minh hạn ân hạn khi việc giết không có tác dụng).
export function spawnPython(command, args, { timeoutMs, env, killGraceMs = KILL_GRACE_MS, kill = killTree }) {
  return new Promise((resolve) => {
    const protocolLines = []
    let partial = ''
    let stderr = ''
    let timedOut = false
    let finished = false
    let timer = null
    let grace = null

    const keep = (line) => {
      const at = line.indexOf(PROTOCOL_PREFIX)
      if (at >= 0 && protocolLines.length < MAX_PROTOCOL_LINES) protocolLines.push(line.slice(at))
    }
    const finish = (extra) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      clearTimeout(grace)
      keep(partial)
      resolve({ code: null, stdout: protocolLines.join('\n'), stderr, timedOut, ...extra })
    }

    const child = spawn(command, args, { shell: false, windowsHide: true, env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' })
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      const parts = (partial + chunk).split(/\r\n|\n|\r/)
      partial = parts.pop()
      if (partial.length > MAX_PARTIAL) partial = partial.slice(-STDERR_TAIL)
      for (const line of parts) keep(line)
    })
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk).slice(-STDERR_TAIL)
    })
    child.on('error', (error) => finish({ spawnError: error.message }))
    child.on('close', (code) => finish({ code }))
    timer = setTimeout(() => {
      timedOut = true
      kill(child)
      // Cháu giữ pipe mở thì `close` có thể không bao giờ tới: sau hạn ân hạn, trả kết quả luôn.
      grace = setTimeout(() => finish({}), killGraceMs)
    }, timeoutMs)
  })
}
