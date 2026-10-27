/**
 * Phím tắt chỉ nên chạy khi người chơi không đang gõ chữ và không bấm tổ hợp (Ctrl/Alt/Meta).
 */
export function isPlainShortcut(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.altKey || event.metaKey) return false

  const target = event.target instanceof HTMLElement ? event.target : null

  return !target?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
}

/**
 * Phím không dành cho màn chơi phía sau: sự kiện đến từ trong hộp thoại, hoặc đang mở một hộp thoại chặn (ví dụ "Tạm dừng")
 * — kể cả khi focus đã rơi về `body` vì người chơi bấm vào nền của lớp phủ.
 */
export function isInsideDialog(event: KeyboardEvent): boolean {
  if (event.target instanceof HTMLElement && event.target.closest('[role="dialog"]') !== null) return true

  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null
}
