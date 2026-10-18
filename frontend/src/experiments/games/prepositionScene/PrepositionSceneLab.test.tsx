import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PrepositionSceneLab from './PrepositionSceneLab'
import { PREPOSITION_FIXTURES } from './prepositionFixtures'

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick }: { children?: React.ReactNode; onClick?: (e: unknown) => void }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick ? () => onClick({ cancelBubble: false, target: { getStage: () => ({ getRelativePointerPosition: () => ({ x: 0, y: 0 }) }) } }) : undefined}>{children}</div>
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


describe('PrepositionSceneLab', () => {
  it('có đủ nút chọn mẫu, chế độ và theme; mặc định preview và mẫu hợp lệ', () => {
    render(<PrepositionSceneLab />)
    for (const key of Object.keys(PREPOSITION_FIXTURES)) expect(screen.getByRole('button', { name: key })).toBeTruthy()
    for (const mode of ['preview', 'play', 'review']) expect(screen.getByRole('button', { name: mode })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'preview' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Câu hỏi hợp lệ theo validatePrepositionScene.')).toBeTruthy()
  })

  it('đổi mẫu đổi lệnh hiển thị', () => {
    render(<PrepositionSceneLab />)
    expect(screen.getByText('Put the cat under the table.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'in the box' }))
    expect(screen.getByText('Put the ball in the box.')).toBeTruthy()
  })

  it('chế độ play: giả lập Backend chấm và ghi lại vị trí đã nộp', async () => {
    render(<PrepositionSceneLab />)
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    fireEvent.click(screen.getByRole('button', { name: 'Done!' }))
    await waitFor(() => expect(screen.getByText('Trả lời gần nhất: play: 110, 110')).toBeTruthy())
  })

  it('chế độ review: khóa, không còn nút xác nhận', () => {
    render(<PrepositionSceneLab />)
    fireEvent.click(screen.getByRole('button', { name: 'review' }))
    expect(screen.queryByRole('button', { name: 'Done!' })).toBeNull()
  })

  it('đổi theme không làm mất lệnh', () => {
    render(<PrepositionSceneLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Vũ trụ' }))
    expect(screen.getByText('Put the cat under the table.')).toBeTruthy()
  })
})
