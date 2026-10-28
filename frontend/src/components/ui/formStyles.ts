// Kiểu và id dùng chung cho ô nhập trong form giáo viên (FormField, PasswordInput và các ô tự dựng).

// Nối id gợi ý/lỗi vào aria-describedby của ô nhập để trình đọc màn hình đọc kèm.
export function describedBy(
  id: string,
  { hint, error }: { hint?: boolean; error?: boolean },
) {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ')

  return ids || undefined
}

const baseInput =
  'w-full rounded-2xl border-2 bg-surface px-4 text-base text-ink transition placeholder:text-ink-soft/70 focus:ring-4 disabled:opacity-60'

// Đỏ chỉ cho lỗi form giáo viên.
const stateClass = (invalid: boolean) =>
  invalid
    ? 'border-rose-600 focus:border-rose-600 focus:ring-rose-600/15'
    : 'border-line focus:border-brand focus:ring-brand/15'

export const inputClass = (invalid = false) =>
  `h-12 ${baseInput} ${stateClass(invalid)}`

export const textareaClass = (invalid = false) =>
  `min-h-32 py-3 leading-7 ${baseInput} ${stateClass(invalid)}`
