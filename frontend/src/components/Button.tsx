import type { ButtonHTMLAttributes } from 'react'
import { buttonClass } from './buttonStyles'
import type { ButtonVariant } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean
  variant?: ButtonVariant
}

export default function Button({
  className = '',
  fullWidth = false,
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[buttonClass(variant, fullWidth), className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
