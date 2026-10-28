export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost'
export type ButtonSize = 'md' | 'lg'

const baseClass =
  'inline-flex items-center justify-center rounded-2xl px-5 font-display font-bold transition disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:active:translate-y-0 motion-reduce:transition-none motion-reduce:active:translate-y-0'

const sizeClass: Record<ButtonSize, string> = {
  md: 'min-h-12 text-base',
  lg: 'min-h-14 text-lg',
}

// Chuỗi class viết đủ (không ghép tên màu) để Tailwind quét được.
const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white shadow-base-brand hover:bg-brand-strong active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-brand-base)]',
  accent:
    'bg-sun text-sun-ink shadow-base-sun hover:brightness-95 active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-sun-base)]',
  secondary:
    'border-2 border-line bg-surface text-brand-strong shadow-[0_3px_0_var(--color-line)] hover:border-brand hover:bg-brand-soft active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-line)]',
  ghost: 'text-brand-strong hover:bg-brand-soft',
}

// Dùng chung cho <button> (Button) và liên kết trông như nút (ButtonLink), để mọi nút cùng kích thước và màu.
export function buttonClass(
  variant: ButtonVariant = 'primary',
  fullWidth = false,
  size: ButtonSize = 'md',
) {
  return [baseClass, sizeClass[size], variantClass[variant], fullWidth ? 'w-full' : '']
    .filter(Boolean)
    .join(' ')
}
