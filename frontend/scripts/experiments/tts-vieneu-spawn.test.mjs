import { describe, expect, it } from 'vitest'
import { spawnPython } from './tts-vieneu-spawn.mjs'
import { PROTOCOL_PREFIX } from './tts-vieneu-core.mjs'

const NODE = process.execPath
// Chạy một đoạn JavaScript bằng chính Node đang chạy test (không cần Python).
const runJs = (code, options = {}) => spawnPython(NODE, ['-e', code], { timeoutMs: 10_000, env: { ...process.env }, ...options })
const alive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

describe('spawnPython', () => {
  it('chỉ giữ dòng giao thức, kể cả khi tiền tố nằm giữa dòng; log khác bị bỏ', async () => {
    const out = await runJs(`process.stdout.write('log 1\\n'); process.stdout.write('tiến trình 50%\\r@@VIENEU@@ {"event":"a"}\\n'); console.log('log 2'); console.log('@@VIENEU@@ {"event":"b"}')`)
    expect(out.code).toBe(0)
    expect(out.timedOut).toBe(false)
    expect(out.stdout.split('\n')).toEqual([`${PROTOCOL_PREFIX}{"event":"a"}`, `${PROTOCOL_PREFIX}{"event":"b"}`])
  })
  it('giữ dòng cuối không có xuống dòng', async () => {
    const out = await runJs(`process.stdout.write('@@VIENEU@@ {"event":"cuoi"}')`)
    expect(out.stdout).toBe(`${PROTOCOL_PREFIX}{"event":"cuoi"}`)
  })
  it('log tràn 3 MB trước sự kiện vẫn không làm mất sự kiện', async () => {
    const out = await runJs(`const line = 'x'.repeat(1000) + '\\n'; for (let i = 0; i < 3000; i++) process.stdout.write(line); console.log('@@VIENEU@@ {"event":"sau-log-lon"}')`)
    expect(out.stdout).toBe(`${PROTOCOL_PREFIX}{"event":"sau-log-lon"}`)
  })
  it('đọc ký tự tiếng Việt đúng dù bị chia giữa hai khối (cắt ngay giữa các byte của chữ Đ)', async () => {
    const out = await runJs(`const text = JSON.stringify({ event: 'v', label: 'Đức Trí mèo '.repeat(2000) }); const bytes = Buffer.from('@@VIENEU@@ ' + text + '\\n', 'utf8'); const cut = bytes.indexOf(Buffer.from('Đ')) + 1; process.stdout.write(bytes.subarray(0, cut)); setTimeout(() => process.stdout.write(bytes.subarray(cut)), 100)`)
    expect(JSON.parse(out.stdout.slice(PROTOCOL_PREFIX.length)).label.startsWith('Đức Trí mèo')).toBe(true)
    expect(out.stdout).not.toContain('�')
  })
  it('stderr được giữ (phần đuôi) và mã thoát được trả về', async () => {
    const out = await runJs(`console.error('Traceback lỗi'); process.exit(3)`)
    expect(out.code).toBe(3)
    expect(out.stderr).toContain('Traceback lỗi')
  })
  it('không có lệnh: trả spawnError, không ném', async () => {
    const out = await spawnPython('khong-co-lenh-nay-xyz', [], { timeoutMs: 5000, env: {} })
    expect(out.spawnError).toBeTruthy()
  })
  it('chỉ truyền đúng môi trường được cho (không thừa kế biến của tiến trình cha)', async () => {
    process.env.BIEN_BI_MAT_CUA_CHA = 'khong-duoc-lo'
    try {
      const out = await spawnPython(NODE, ['-e', `console.log('@@VIENEU@@ ' + JSON.stringify({ event: 'env', seen: process.env.BIEN_BI_MAT_CUA_CHA ?? null, mine: process.env.BIEN_CUA_TOI ?? null }))`], {
        timeoutMs: 10_000,
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, BIEN_CUA_TOI: 'co' },
      })
      expect(JSON.parse(out.stdout.slice(PROTOCOL_PREFIX.length))).toMatchObject({ seen: null, mine: 'co' })
    } finally {
      delete process.env.BIEN_BI_MAT_CUA_CHA
    }
  })
  it('hết giờ: trả timedOut và giết tiến trình', async () => {
    const started = Date.now()
    const out = await runJs(`console.log('@@VIENEU@@ {"event":"sau-khi-chay"}'); setInterval(() => {}, 1000)`, { timeoutMs: 500, killGraceMs: 4000 })
    expect(out.timedOut).toBe(true)
    expect(out.stdout).toContain('sau-khi-chay')
    expect(Date.now() - started).toBeLessThan(4000)
  })
  it('việc giết không có tác dụng: sau hạn ân hạn vẫn trả kết quả (không treo vô hạn)', async () => {
    const started = Date.now()
    const out = await runJs(`console.log('@@VIENEU@@ ' + JSON.stringify({ event: 'pid', pid: process.pid })); setInterval(() => {}, 1000)`, { timeoutMs: 300, killGraceMs: 600, kill: () => {} })
    const pid = JSON.parse(out.stdout.split('\n').find((l) => l.includes('"pid"')).slice(PROTOCOL_PREFIX.length)).pid
    try {
      expect(out.timedOut).toBe(true)
      expect(Date.now() - started).toBeGreaterThanOrEqual(850)
      expect(alive(pid)).toBe(true) // tiến trình vẫn chạy vì `kill` giả không làm gì; dọn ngay dưới đây
    } finally {
      process.kill(pid)
    }
  })
  it('hết giờ: tiến trình cháu giữ pipe mở cũng bị giết, và kết quả vẫn trả về sau hạn ân hạn', async () => {
    const parent = `
      const { spawn } = require('node:child_process');
      const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'inherit' });
      console.log('@@VIENEU@@ ' + JSON.stringify({ event: 'pid', pid: child.pid }));
      setInterval(() => {}, 1000)
    `
    const started = Date.now()
    const out = await runJs(parent, { timeoutMs: 800, killGraceMs: 1500 })
    expect(out.timedOut).toBe(true)
    expect(Date.now() - started).toBeLessThan(6000)
    const pid = JSON.parse(out.stdout.split('\n').find((l) => l.includes('"pid"')).slice(PROTOCOL_PREFIX.length)).pid
    await sleep(500)
    expect(alive(pid)).toBe(false)
  })
})
