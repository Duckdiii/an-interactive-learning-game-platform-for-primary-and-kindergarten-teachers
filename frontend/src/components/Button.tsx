import type { ButtonHTMLAttributes } from 'react'
import { buttonClass } from './buttonStyles'
import type { ButtonSize, ButtonVariant } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
}

export default function Button({
  className = '',
  fullWidth = false,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[buttonClass(variant, fullWidth, size), className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
