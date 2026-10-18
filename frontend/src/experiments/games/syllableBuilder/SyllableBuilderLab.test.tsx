import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SyllableBuilderLab from './SyllableBuilderLab'
import { SYLLABLE_FIXTURES } from './syllableFixtures'

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

const status = () => screen.getAllByRole('status').map((el) => el.textContent).join(' | ')


describe('SyllableBuilderLab', () => {
  it('có đủ nút chọn mẫu, chế độ, theme và kiểu đặt dấu; mặc định preview và mẫu hợp lệ', () => {
    render(<SyllableBuilderLab />)
    for (const key of Object.keys(SYLLABLE_FIXTURES)) expect(screen.getByRole('button', { name: key })).toBeTruthy()
    for (const mode of ['preview', 'play', 'review']) expect(screen.getByRole('button', { name: mode })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'preview' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Hiện đại (hòa)' }).getAttribute('aria-pressed')).toBe('true')
    expect(status()).toContain('Câu hỏi hợp lệ theo validateSyllableBuilder.')
  })

  it('đổi mẫu đổi câu hỏi hiển thị', () => {
    render(<SyllableBuilderLab />)
    expect(screen.getByText('Ghép tiếng chỉ con vật kêu «meo meo»')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'sách (âm cuối ch)' }))
    expect(screen.getByText('Ghép tiếng chỉ vật em mở ra đọc mỗi ngày')).toBeTruthy()
  })

  it('kiểu đặt dấu cũ làm đáp án «hòa» không còn ghép được: phần kiểm tra báo ngay', () => {
    render(<SyllableBuilderLab />)
    fireEvent.click(screen.getByRole('button', { name: 'hòa (oa, kiểu đặt dấu)' }))
    expect(status()).toContain('Câu hỏi hợp lệ')
    fireEvent.click(screen.getByRole('button', { name: 'Cũ (hoà)' }))
    expect(status()).toContain('TARGET_NOT_BUILDABLE')
  })

  it('chế độ play: giả lập Backend chấm và ghi lại câu trả lời', async () => {
    render(<SyllableBuilderLab />)
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    fireEvent.change(screen.getByLabelText('Dấu thanh'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xong rồi!' }))
    await waitFor(() => expect(screen.getByText('Trả lời gần nhất: play: mèo')).toBeTruthy())
  })

  it('chế độ review: khóa, không còn nút xác nhận', () => {
    render(<SyllableBuilderLab />)
    fireEvent.click(screen.getByRole('button', { name: 'review' }))
    expect(screen.queryByRole('button', { name: 'Xong rồi!' })).toBeNull()
  })

  it('đổi theme không làm mất câu hỏi', () => {
    render(<SyllableBuilderLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Vũ trụ' }))
    expect(screen.getByText('Ghép tiếng chỉ con vật kêu «meo meo»')).toBeTruthy()
  })
})
