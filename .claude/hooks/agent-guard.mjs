#!/usr/bin/env node
// Hook PreToolUse cho agent chỉ đọc có bật `memory`: Write/Edit chỉ được ghi trong thư mục nhớ của agent, Bash chỉ được chạy lệnh git đọc.
// Dùng: node agent-guard.mjs <tên agent>. Exit 2 là chặn; mọi mã khác Claude Code cho lệnh chạy tiếp, nên lỗi của chính script cũng phải exit 2.
// Lỗi xảy ra trước khi script chạy (không có node, không nạp được module) không tự chặn được: khai báo hook phải có `onFailure: block`.
import { decide } from './agent-guard-rules.mjs'

try {
  let stdin = ''

  for await (const chunk of process.stdin) stdin += chunk

  const { allow, reason } = decide(process.argv[2], JSON.parse(stdin))

  if (!allow) {
    console.error(`Đã chặn: ${reason}`)
    process.exit(2)
  }
} catch (error) {
  console.error(`Đã chặn vì hook lỗi: ${error.message}`)
  process.exit(2)
}
