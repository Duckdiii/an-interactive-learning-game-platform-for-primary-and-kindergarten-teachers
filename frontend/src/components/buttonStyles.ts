export type ButtonVariant = 'primary' | 'secondary'

const baseClass =
  'inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60'

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong',
  secondary:
    'border-2 border-brand/40 bg-white text-brand-strong hover:border-brand hover:bg-brand-soft',
}

// Dùng chung cho <button> (Button) và liên kết trông như nút (ButtonLink), để mọi nút cùng kích thước và màu.
export function buttonClass(
  variant: ButtonVariant = 'primary',
  fullWidth = false,
) {
  return [baseClass, variantClass[variant], fullWidth ? 'w-full' : '']
    .filter(Boolean)
    .join(' ')
}
