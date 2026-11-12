import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GameType, QuestionDsl } from '../../../types/game-dsl.types'
import LivePreview from './LivePreview'

const audio = vi.hoisted(() => ({ options: [] as unknown[] }))
vi.mock('../../../games/common/useQuestionAudio', () => ({
  useQuestionAudio: (_url: string | undefined, options: unknown) => {
    audio.options.push(options)
    return vi.fn()
  },
}))

// Canvas không có trong jsdom: Konva thay bằng DOM thường như ở test của renderer.
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick, name }: { children?: React.ReactNode; onClick?: () => void; name?: string }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div data-testid={name} onClick={onClick}>{children}</div>
  ),
  Rect: ({ stroke }: { stroke?: string }) => <span data-stroke={stroke} />,
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
  it('renders image Odd One Out and resets feedback when the same question id is edited', async () => {
    const question = { id: 'odd-image', timeLimitSeconds: 30, points: 10, questionText: 'Con nào không phải mèo?', oddOneOutId: '1',
      items: Array.from({ length: 5 }, (_, i) => ({ id: String(i), text: i === 1 ? 'Chó' : `Mèo ${i}`, assetId: `asset-${i}`, imageUrl: '/assets/noto/cat.svg' })) }
    const { rerender } = renderPreview({ gameType: 'ODD_ONE_OUT', question })
    expect(screen.getAllByText('Đang tải hình')).toHaveLength(5)
    expect(screen.getByText('Con nào không phải mèo?')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('avm-option-0'))
    await waitFor(() => expect(screen.getByTestId('avm-option-1').querySelector('[data-stroke="#66BB6A"]')).not.toBeNull())
    rerender(<LivePreview gameType="ODD_ONE_OUT" title="Đếm số" index={0} total={3} gradeLevel="KINDERGARTEN" subject="MATH" hasIssues={false}
      question={{ ...question, items: question.items.map((item) => ({ ...item, text: `${item.text} mới` })) }} />)
    expect(document.querySelector('[data-stroke="#66BB6A"]')).toBeNull()
  })
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

  it('LivePreview đọc câu hỏi AVM bằng tiếng Anh khi môn học là English', () => {
    audio.options = []
    const question = {
      id: 'avm-en', timeLimitSeconds: 20, points: 10, audioText: 'Cat',
      correct: { visualPrompt: 'cat', imageUrl: '/mock/cat.png' }, distractors: [],
    } as QuestionDsl

    renderPreview({ gameType: 'AUDIO_VISUAL_MATCH', question, subject: 'ENGLISH' })

    expect(audio.options).toContainEqual(expect.objectContaining({ ttsText: 'Cat', ttsLanguage: 'en-US' }))
  })

  it('loại chưa có renderer: hiện "sắp có", không dựng khung', () => {
    renderPreview({ gameType: 'ORDERING' })

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
})
