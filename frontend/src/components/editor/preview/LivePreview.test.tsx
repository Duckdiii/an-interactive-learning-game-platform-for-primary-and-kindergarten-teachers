import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GameType, QuestionDsl } from '../../../types/game-dsl.types'
import LivePreview from './LivePreview'

// Canvas không có trong jsdom: Konva thay bằng DOM thường như ở test của renderer.
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick}>{children}</div>
  ),
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
  Line: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../../../games/common/sound', () => ({ playSound: vi.fn() }))
vi.mock('../../../games/common/useFeedback', () => ({ useFeedback: () => ({ showFeedback: vi.fn() }) }))
vi.mock('../../../games/common/OptionButton', () => ({
  default: ({ option, onClick }: { option: { text: string }; onClick: () => void }) => <button onClick={onClick}>{option.text}</button>,
}))

const quiz = {
  id: 'q1',
  timeLimitSeconds: 20,
  points: 10,
  questionText: '1 + 2 = ?',
  options: [
    { id: 'a', text: 'hai' },
    { id: 'b', text: 'ba' },
  ],
  correctOptionId: 'b',
} as QuestionDsl

function renderPreview(props: Partial<React.ComponentProps<typeof LivePreview>> = {}) {
  return render(
    <LivePreview
      gameType="QUIZ"
      question={quiz}
      title="Đếm số"
      index={0}
      total={3}
      gradeLevel="KINDERGARTEN"
      subject="MATH"
      hasIssues={false}
      {...props}
    />,
  )
}

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed')

describe('LivePreview', () => {
  it('chọn khung theo khối lớp: Mầm non là khung Bé, lớp 3 là khung Học sinh', () => {
    const { unmount } = renderPreview()

    expect(screen.getByText('Khung Bé')).toBeInTheDocument()
    expect(screen.getByTestId('preview-frame').querySelector('[data-band="be"]')).not.toBeNull()
    unmount()
    renderPreview({ gradeLevel: 'GRADE_3' })
    expect(screen.getByText('Khung Học sinh')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('20 giây')
  })

  it('biến --play-* nằm trên khung xem trước, không nằm trên trang giáo viên', () => {
    renderPreview()

    expect(screen.getByTestId('preview-frame').style.getPropertyValue('--play-min-touch')).toBe('64px')
    expect(document.documentElement.style.getPropertyValue('--play-min-touch')).toBe('')
  })

  it('3 nút thiết bị bật/tắt, mặc định Máy tính bảng; đổi thiết bị đổi kích thước khung', () => {
    renderPreview()

    expect(pressed('Máy tính bảng')).toBe('true')
    expect(pressed('Tivi')).toBe('false')
    expect(screen.getByTestId('preview-frame').style.width).toBe('1024px')
    fireEvent.click(screen.getByRole('button', { name: 'Điện thoại' }))
    expect(pressed('Điện thoại')).toBe('true')
    expect(pressed('Máy tính bảng')).toBe('false')
    expect(screen.getByTestId('preview-frame').style.width).toBe('390px')
  })

  it('điện thoại nằm ngang với loại cần màn ngang', () => {
    renderPreview({ gameType: 'MATCHING' as GameType })
    fireEvent.click(screen.getByRole('button', { name: 'Điện thoại' }))
    expect(screen.getByTestId('preview-frame').style.width).toBe('844px')
  })

  it('câu còn lỗi: báo sửa trước, không dựng khung', () => {
    renderPreview({ hasIssues: true })

    expect(screen.getByText('Sửa xong lỗi của câu này để xem trước.')).toBeInTheDocument()
    expect(screen.queryByTestId('preview-frame')).not.toBeInTheDocument()
  })

  it('loại chưa có renderer: hiện "sắp có", không dựng khung', () => {
    renderPreview({ gameType: 'UNSUPPORTED' as any })

    expect(screen.getByText(/sắp có/)).toBeInTheDocument()
    expect(screen.queryByTestId('preview-frame')).not.toBeInTheDocument()
  })

  it('chưa có câu nào: giữ thông báo cũ', () => {
    renderPreview({ question: undefined })

    expect(screen.getByText('Trò chơi này chưa có câu hỏi nào.')).toBeInTheDocument()
  })

  it('trả lời đúng hiện phản hồi, "Chơi lại câu này" đặt lại câu', async () => {
    renderPreview()
    fireEvent.click(screen.getByText('ba'))

    expect(await screen.findByText('Giỏi quá!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Chơi lại câu này' }))
    await waitFor(() => expect(screen.queryByText('Giỏi quá!')).not.toBeInTheDocument())
  })

  it('trả lời sai: phản hồi nhẹ nhàng, không chữ "sai"', async () => {
    renderPreview()
    fireEvent.click(screen.getByText('hai'))

    expect(await screen.findByText(/Gần đúng rồi/)).toBeInTheDocument()
  })

  it('QUIZ luôn dùng renderer thật như màn chơi, không có bản vẽ riêng', () => {
    renderPreview({ themeId: 'farm' })

    expect(screen.queryByRole('button', { name: /Đồ họa Canvas/ })).not.toBeInTheDocument()
    expect(screen.getByText('hai')).toBeInTheDocument()
  })

  it('chưa chọn thế giới: chọn nền giống màn chơi thử (suy từ chủ đề), không mặc định Nông Trại', () => {
    renderPreview({ themeId: undefined, topic: 'Bé bay vào vũ trụ ngắm các hành tinh' })

    expect(screen.getByRole('button', { name: '🚀 Vũ Trụ' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '🌾 Nông Trại' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('1-click chuyển đổi theme cập nhật nút theme và gọi onThemeChange', () => {
    const onThemeChange = vi.fn()
    renderPreview({ themeId: 'farm', onThemeChange })

    const oceanBtn = screen.getByRole('button', { name: '🌊 Đại Dương' })
    fireEvent.click(oceanBtn)
    expect(onThemeChange).toHaveBeenCalledWith('ocean')
  })
})
