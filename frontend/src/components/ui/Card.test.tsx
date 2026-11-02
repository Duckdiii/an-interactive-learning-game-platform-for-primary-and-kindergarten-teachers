import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Card from './Card'

describe('Card', () => {
  it('mặc định: div, đệm md, nền/bo góc/bóng theo token, không có hiệu ứng rê chuột', () => {
    render(<Card>Nội dung</Card>)

    const card = screen.getByText('Nội dung')

    expect(card.tagName).toBe('DIV')
    expect(card).toHaveClass('rounded-card', 'bg-surface', 'shadow-card', 'p-6')
    expect(card).not.toHaveClass('hover:shadow-card-hover')
  })

  it('as, padding, interactive và thuộc tính khác được truyền xuống', () => {
    render(
      <ul>
        <Card as="li" padding="lg" interactive aria-label="Thẻ game" className="extra">
          Game
        </Card>
      </ul>,
    )

    const card = screen.getByRole('listitem', { name: 'Thẻ game' })

    expect(card).toHaveClass('p-8', 'hover:shadow-card-hover', 'motion-reduce:hover:translate-y-0', 'extra')
  })
})
