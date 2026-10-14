import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import QuestionList from './QuestionList'

const items = [
  { summary: 'Câu một', timeLimitSeconds: 30, points: 10 },
  { summary: 'Câu hai', timeLimitSeconds: 45, points: 20 },
]

describe('QuestionList', () => {
  it('danh sách rỗng: nói rõ chưa có câu hỏi, không dựng danh sách trống', () => {
    render(<QuestionList items={[]} selectedIndex={0} onSelect={() => {}} />)

    expect(screen.getByText('Trò chơi này chưa có câu hỏi nào.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('mỗi câu là một nút kèm thời gian và điểm; câu đang chọn có aria-current', () => {
    render(<QuestionList items={items} selectedIndex={1} onSelect={() => {}} />)

    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Câu hai/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: /Câu một/ })).not.toHaveAttribute('aria-current')
    expect(screen.getByText('45 giây · 20 điểm')).toBeInTheDocument()
  })

  it('bấm một câu thì báo vị trí của câu đó', async () => {
    const onSelect = vi.fn()

    render(<QuestionList items={items} selectedIndex={0} onSelect={onSelect} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Câu hai/ }))

    expect(onSelect).toHaveBeenCalledWith(1)
  })
})
