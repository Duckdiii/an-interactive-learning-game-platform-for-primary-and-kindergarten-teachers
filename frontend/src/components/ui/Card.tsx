import type { ComponentPropsWithoutRef, ElementType } from 'react'

const PADDING = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' } as const

type CardProps = {
  as?: 'div' | 'section' | 'article' | 'li'
  padding?: keyof typeof PADDING
  // Thẻ bấm được: nâng nhẹ khi rê chuột.
  interactive?: boolean
} & ComponentPropsWithoutRef<'div'>

export default function Card({
  as = 'div',
  padding = 'md',
  interactive = false,
  className = '',
  ...rest
}: CardProps) {
  const classes = [
    'rounded-card border border-line/60 bg-surface shadow-card',
    PADDING[padding],
    interactive
      ? 'transition hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const Tag = as as ElementType
  return <Tag className={classes} {...rest} />
}
