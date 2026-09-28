import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean
  variant?: 'primary' | 'secondary'
}

export default function Button({
  className = '',
  fullWidth = false,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const baseClass =
    'inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60'
  const variantClass =
    variant === 'primary'
      ? 'bg-slate-950 text-white hover:bg-slate-800'
      : 'border border-slate-300 text-slate-700 hover:border-slate-950 hover:text-slate-950'
  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      className={[baseClass, variantClass, widthClass, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
