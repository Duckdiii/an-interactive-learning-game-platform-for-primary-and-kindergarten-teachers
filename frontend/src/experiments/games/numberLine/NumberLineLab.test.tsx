import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NumberLineLab from './NumberLineLab'
import { NUMBER_LINE_FIXTURES } from './numberLineFixtures'

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick ? () => onClick() : undefined}>{children}</div>
  ),
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span data-konva="text">{text}</span>,
  Image: () => null,
  Line: () => null,
  Circle: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../../feedback/useExperimentFeedback', () => ({
  useExperimentFeedback: () => ({ kind: null, runId: 0, plan: null, reducedMotion: false, trigger: vi.fn() }),
}))
vi.mock('../../feedback/FeedbackOverlay', () => ({ default: () => null }))


describe('NumberLineLab', () => {
  it('có đủ nút chọn mẫu, chế độ và theme; mặc định preview và mẫu hợp lệ', () => {
    render(<NumberLineLab />)
    for (const key of Object.keys(NUMBER_LINE_FIXTURES)) expect(screen.getByRole('button', { name: key })).toBeTruthy()
    for (const mode of ['preview', 'play', 'review']) expect(screen.getByRole('button', { name: mode })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'preview' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Câu hỏi hợp lệ theo validateNumberLine.')).toBeTruthy()
  })

  it('đổi mẫu đổi câu hỏi hiển thị', () => {
    render(<NumberLineLab />)
    expect(screen.getByText('Đặt chú ong vào số 7')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cách 2' }))
    expect(screen.getByText('Đếm cách 2 nhé: đặt chú ong vào số 12')).toBeTruthy()
  })

  it('chế độ play: giả lập Backend chấm và ghi lại câu trả lời', async () => {
    render(<NumberLineLab />)
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    fireEvent.change(screen.getByLabelText('Số trên trục'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xong rồi!' }))
    await waitFor(() => expect(screen.getByText('Trả lời gần nhất: play: 7')).toBeTruthy())
  })

  it('chế độ review: khóa, không còn nút xác nhận', () => {
    render(<NumberLineLab />)
    fireEvent.click(screen.getByRole('button', { name: 'review' }))
    expect(screen.queryByRole('button', { name: 'Xong rồi!' })).toBeNull()
  })

  it('đổi theme không làm mất câu hỏi', () => {
    render(<NumberLineLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Vũ trụ' }))
    expect(screen.getByText('Đặt chú ong vào số 7')).toBeTruthy()
  })
})
