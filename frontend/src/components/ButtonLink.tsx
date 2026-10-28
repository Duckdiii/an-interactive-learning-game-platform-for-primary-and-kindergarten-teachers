import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonClass } from './buttonStyles'
import type { ButtonSize, ButtonVariant } from './buttonStyles'

interface ButtonLinkProps {
  to: string
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
}

export default function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
}: ButtonLinkProps) {
  return (
    <Link
      to={to}
      className={[buttonClass(variant, false, size), className].filter(Boolean).join(' ')}
    >
      {children}
    </Link>
  )
}
