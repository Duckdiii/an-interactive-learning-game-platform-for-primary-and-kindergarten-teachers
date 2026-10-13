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
  'w-full rounded-xl border-2 bg-white px-4 text-base text-ink transition placeholder:text-ink-soft/70 focus:border-brand disabled:opacity-60'

export const inputClass = (invalid = false) =>
  `h-12 ${baseInput} ${invalid ? 'border-rose-500 focus:border-rose-600' : 'border-ink/20'}`

export const textareaClass = (invalid = false) =>
  `min-h-32 py-3 leading-7 ${baseInput} ${invalid ? 'border-rose-500 focus:border-rose-600' : 'border-ink/20'}`
