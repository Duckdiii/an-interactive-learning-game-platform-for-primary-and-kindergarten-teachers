#!/usr/bin/env node
// Bộ đề tự chạy: lấy N kịch bản đầu của "100 kịch bản tạo game.md", đi đúng luồng của giáo viên (POST /games/understand, tự trả lời
// câu hỏi lại bằng "Dùng như vậy", rồi POST /games/generate với kiểu chơi trên thẻ) và chấm game bằng luật máy (checks.mjs).
// GỌI GEMINI THẬT qua backend: mỗi kịch bản tốn 1-2 lần phân tích + 1 lần sinh game (có thể thêm lần rà chính tả, sinh lại).
//
//   EVAL_EMAIL=... EVAL_PASSWORD=... node scripts/eval/run-scenarios.mjs [--count 12] [--from 1] [--api http://localhost:8088/api]
//
// Tài khoản lấy từ biến môi trường (không ghi vào code). Kết quả ghi vào docs/Kịch bản/Kịch bản tạo game/Bộ đề tự chạy/<thời điểm>/
// (thư mục bị gitignore): <id>.json cho từng kịch bản và bang-diem.md tổng hợp.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkGame, composeIdea, parseScenarios } from './checks.mjs'

const ROOT = join(import.meta.dirname, '..', '..')
const SCENARIO_FILE = join(ROOT, 'docs', 'Kịch bản', 'Kịch bản tạo game', '100 kịch bản tạo game.md')

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index > 0 ? process.argv[index + 1] : fallback
}

const API = option('api', 'http://localhost:8088/api')
const COUNT = Number(option('count', '12'))
const FROM = Number(option('from', '1'))
const { EVAL_EMAIL, EVAL_PASSWORD } = process.env
if (!EVAL_EMAIL || !EVAL_PASSWORD) {
  console.error('Thiếu EVAL_EMAIL / EVAL_PASSWORD (tài khoản giáo viên thử nghiệm).')
  process.exit(1)
}

async function post(path, body, token, timeoutMs) {
  const response = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${path} ${response.status}: ${json.error?.message ?? 'lỗi'}`)
  return json.data
}

// Phiên chỉ sống khoảng 15 phút: đăng nhập lại cho mỗi kịch bản.
const login = async () => (await post('/auth/login', { email: EVAL_EMAIL, password: EVAL_PASSWORD }, null, 20_000)).accessToken

async function runScenario(scenario) {
  const token = await login()
  const lesson = { subject: scenario.subject, gradeLevel: scenario.gradeLevel }
  const started = Date.now()
  const messages = [{ role: 'TEACHER', text: scenario.idea }]
  let understood = await post('/games/understand', { ...lesson, messages }, token, 60_000)
  if (understood.question) {
    messages.push({ role: 'ASSISTANT', text: `${understood.reply}\n${understood.question.text}` }, { role: 'TEACHER', text: 'Dùng như vậy' })
    understood = await post('/games/understand', { ...lesson, messages, understanding: understood.understanding }, token, 60_000)
  }
  const card = understood.understanding
  const understandSeconds = (Date.now() - started) / 1000
  const game = await post('/games/generate', {
    ...lesson, gameType: card.gameType, idea: composeIdea(card, scenario.idea), voice: { region: 'NORTH', gender: 'FEMALE' },
  }, token, 180_000)
  return { card, reply: understood.reply, game, understandSeconds, totalSeconds: (Date.now() - started) / 1000 }
}

const scenarios = parseScenarios(readFileSync(SCENARIO_FILE, 'utf8')).filter((item) => item.id >= FROM).slice(0, COUNT)
const outDir = join(ROOT, 'docs', 'Kịch bản', 'Kịch bản tạo game', 'Bộ đề tự chạy', new Date().toISOString().replace(/[:.]/g, '-'))
mkdirSync(outDir, { recursive: true })

const rows = []
for (const scenario of scenarios) {
  process.stdout.write(`#${scenario.id} ${scenario.name} ... `)
  try {
    const run = await runScenario(scenario)
    const score = checkGame(run.game)
    writeFileSync(join(outDir, `${scenario.id}.json`), JSON.stringify({ scenario, ...run, score }, null, 2))
    rows.push({ scenario, run, score })
    console.log(score.problems.length === 0 ? 'đạt' : `${score.problems.length} vấn đề`, `(${run.totalSeconds.toFixed(0)} giây)`)
  } catch (error) {
    rows.push({ scenario, error: error.message })
    writeFileSync(join(outDir, `${scenario.id}.json`), JSON.stringify({ scenario, error: error.message }, null, 2))
    console.log(`LỖI: ${error.message}`)
  }
}

const cell = (text) => String(text ?? '').replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ')
const lines = [
  `# Bảng điểm bộ đề tự chạy (${new Date().toLocaleString('vi-VN')})`,
  '',
  `API: ${API} · Kịch bản ${FROM}–${FROM + scenarios.length - 1}`,
  '',
  '| # | Kịch bản | Kiểu chơi | Chưa làm được | Tên game | Số câu | Hình | Giây | Vấn đề (luật máy) |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map(({ scenario, run, score, error }) => error
    ? `| ${scenario.id} | ${cell(scenario.name)} | | | | | | | LỖI: ${cell(error)} |`
    : `| ${scenario.id} | ${cell(scenario.name)} | ${run.card.gameType} | ${cell((run.card.unsupported ?? []).map((item) => item.need).join('; ')) || '—'} | ${cell(score.title)} | ${score.questions} | ${score.images ? `${score.images.filled}/${score.images.slots}` : 'CPF'} | ${run.totalSeconds.toFixed(0)} | ${cell(score.problems.join('; ')) || 'đạt'} |`),
  '',
  `Đạt luật máy: ${rows.filter((row) => row.score && row.score.problems.length === 0).length}/${rows.length}. Lỗi khi chạy: ${rows.filter((row) => row.error).length}.`,
  'Luật máy chỉ bắt lỗi kiểm được (ngôn ngữ, câu trùng, cùng đáp án, tỷ lệ hình); đúng ý giáo viên và chất lượng nội dung vẫn cần người xem file JSON.',
]
writeFileSync(join(outDir, 'bang-diem.md'), lines.join('\n') + '\n')
console.log(`\nĐã ghi ${join(outDir, 'bang-diem.md')}`)
