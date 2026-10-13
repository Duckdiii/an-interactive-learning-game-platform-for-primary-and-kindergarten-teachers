import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonClass } from './buttonStyles'
import type { ButtonVariant } from './buttonStyles'

interface ButtonLinkProps {
  to: string
  variant?: ButtonVariant
  children: ReactNode
  className?: string
}

export default function ButtonLink({
  to,
  variant = 'primary',
  children,
  className = '',
}: ButtonLinkProps) {
  return (
    <Link
      to={to}
      className={[buttonClass(variant), className].filter(Boolean).join(' ')}
    >
      {children}
    </Link>
  )
}
