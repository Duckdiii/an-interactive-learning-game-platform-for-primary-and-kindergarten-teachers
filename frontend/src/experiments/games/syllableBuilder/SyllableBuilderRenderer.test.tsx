import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ThemeProvider from '../../theme/ThemeProvider'
import { neutralTheme } from '../../theme/themes/neutral'
import SyllableBuilderRenderer from './SyllableBuilderRenderer'
import { mockSyllableHoa, mockSyllableKe, mockSyllableMeo, mockSyllableNoOnset, mockSyllableSach, mockSyllableWithAudio } from './syllableFixtures'
import { toStudentQuestion } from './syllableLogic'
import type { SyllableAnswerResult } from './syllableTypes'
import { SPELLING_HINT } from './vietnameseSyllable'

const h = vi.hoisted(() => ({ trigger: vi.fn() }))

// Konva giả: lộ fill/stroke/cỡ chữ ra data-attribute.
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick ? () => onClick() : undefined}>{children}</div>
  ),
  Rect: ({ fill, stroke }: { fill?: string; stroke?: string }) => <i data-testid="rect" data-fill={fill} data-stroke={stroke} />,
  Text: ({ text, fill, fontSize }: { text?: string; fill?: string; fontSize?: number }) => (
    <span data-konva="text" data-fill={fill} data-size={fontSize}>
      {text}
    </span>
  ),
  Image: () => null,
  Line: () => null,
  Circle: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({
  Howl: class {
    play = vi.fn()
    stop = vi.fn()
    unload = vi.fn()
  },
}))
vi.mock('../../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../../feedback/useExperimentFeedback', () => ({
  useExperimentFeedback: () => ({ kind: null, runId: 0, plan: null, reducedMotion: false, trigger: h.trigger }),
}))
vi.mock('../../feedback/FeedbackOverlay', () => ({ default: () => null }))

const NEUTRAL = neutralTheme.colors
const CONFIRM = 'Xong rồi!'

const allKonva = () => Array.from(document.querySelectorAll<HTMLElement>('[data-konva="text"]'))
const konvaTexts = (text: string) => allKonva().filter((el) => el.textContent === text)
const bySize = (size: number) => allKonva().filter((el) => el.getAttribute('data-size') === String(size))
/** Tiếng đang ghép (chữ cỡ 84) và dòng thông điệp (cỡ 24). */
const composed = () => bySize(84)[0].textContent
const message = () => bySize(24)[0].textContent
const composedFill = () => bySize(84)[0].parentElement!.querySelector('[data-testid="rect"]')!.getAttribute('data-fill')
/** Giá trị đang hiện ở từng ô: âm đầu, vần (cỡ 44) và thanh (cỡ 28). */
const slotValues = () => [bySize(44)[0].textContent, bySize(44)[1].textContent, bySize(28)[0].textContent]
const status = () => screen.getByRole('status').textContent
const press = (text: string, nth = 0) => fireEvent.click(konvaTexts(text)[nth])
const next = (slot: 0 | 1 | 2) => press('▼', slot)
const prev = (slot: 0 | 1 | 2) => press('▲', slot)
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement

beforeEach(() => h.trigger.mockClear())

describe('preview', () => {
  it('bắt đầu ở lựa chọn đầu mỗi ô và ghép ngay: «meo» (chưa có dấu)', () => {
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableMeo} />)
    expect(composed()).toBe('meo')
    expect(slotValues()).toEqual(['m', 'eo', 'không dấu'])
    expect(message()).toBe('')
  })

  it('▼ đổi sang lựa chọn kế tiếp, ▲ lùi lại; hết danh sách thì vòng quanh', () => {
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableMeo} />)
    next(2)
    expect(composed()).toBe('mèo')
    expect(slotValues()[2]).toBe('huyền (`)')
    prev(2)
    expect(composed()).toBe('meo')
    prev(0) // từ đầu quay về cuối: b
    expect(composed()).toBe('beo')
    next(0)
    expect(composed()).toBe('meo')
    next(1)
    next(1)
    next(1)
    expect(slotValues()[1]).toBe('eo')
  })

  it('đặt dấu đúng chỗ khi đổi vần: hòa theo kiểu hiện đại, hoà theo kiểu cũ', () => {
    const { unmount } = render(<SyllableBuilderRenderer mode="preview" question={mockSyllableHoa} />)
    next(2)
    expect(composed()).toBe('hòa')
    unmount()
    render(<SyllableBuilderRenderer mode="preview" question={{ ...mockSyllableHoa, toneStyle: 'traditional' }} />)
    next(2)
    expect(composed()).toBe('hoà')
  })

  it('đúng: chấm cục bộ, ô ghép xanh, thông báo, gọi onAnswered với tiếng đã ghép', () => {
    const onAnswered = vi.fn()
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableMeo} onAnswered={onAnswered} />)
    next(2)
    press(CONFIRM)
    expect(onAnswered).toHaveBeenCalledWith('mèo')
    expect(h.trigger).toHaveBeenCalledWith('correct')
    expect(composedFill()).toBe(NEUTRAL.surfaceCorrect)
    expect(message()).toBe('Giỏi quá!')
    expect(status()).toContain('Giỏi quá!')
  })

  it('đáp án ở dạng NFD vẫn chấm đúng', () => {
    render(<SyllableBuilderRenderer mode="preview" question={{ ...mockSyllableMeo, target: 'mèo'.normalize('NFD') }} />)
    next(2)
    press(CONFIRM)
    expect(h.trigger).toHaveBeenCalledWith('correct')
  })

  it('sai: phản hồi nhẹ (vàng, không đỏ) và chỉ luôn tiếng đúng', () => {
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableMeo} />)
    press(CONFIRM) // «meo», thiếu dấu huyền
    expect(h.trigger).toHaveBeenCalledWith('tryAgain')
    expect(composedFill()).toBe(NEUTRAL.surfaceTryAgain)
    expect(message()).toBe('Tiếng đúng là «mèo».')
    expect(composedFill()!.toLowerCase()).not.toMatch(/ff0000|#f00|red/)
  })

  it('không âm đầu: ô âm đầu hiện «—» và vẫn ghép được «ao»', () => {
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableNoOnset} />)
    expect(slotValues()[0]).toBe('—')
    expect(composed()).toBe('ao')
    press(CONFIRM)
    expect(h.trigger).toHaveBeenCalledWith('correct')
  })

  it('gợi ý chính tả hiện ngay khi đang ghép và mất khi sửa đúng: c trước ê → k', () => {
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableKe} />)
    expect(composed()).toBe('cê')
    expect(message()).toBe(SPELLING_HINT.USE_K)
    next(0) // sang k
    expect(composed()).toBe('kê')
    expect(message()).toBe('')
    press(CONFIRM)
    expect(h.trigger).toHaveBeenCalledWith('correct')
  })

  it('vẫn cho nộp tiếng sai chính tả (đó là câu trả lời sai, không bị chặn)', () => {
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableKe} />)
    press(CONFIRM)
    expect(h.trigger).toHaveBeenCalledWith('tryAgain')
  })

  it('âm cuối ch chỉ nhận sắc hoặc nặng: để trống dấu hay huyền đều có gợi ý', () => {
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableSach} />)
    expect(composed()).toBe('sach')
    expect(message()).toBe(SPELLING_HINT.STOP_FINAL_TONE)
    next(2)
    expect(composed()).toBe('sàch')
    expect(message()).toBe(SPELLING_HINT.STOP_FINAL_TONE)
    next(2)
    expect(composed()).toBe('sách')
    expect(message()).toBe('')
  })

  it('đã chấm thì khóa: ▼ và nút xác nhận không còn tác dụng, chỉ chấm một lần', () => {
    const onAnswered = vi.fn()
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableMeo} onAnswered={onAnswered} />)
    press(CONFIRM)
    press(CONFIRM)
    next(2)
    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(composed()).toBe('meo')
    expect(select('Dấu thanh').disabled).toBe(true)
  })

  it('onAnswered của preview ném lỗi đồng bộ thì không làm vỡ màn', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <SyllableBuilderRenderer
        mode="preview"
        question={mockSyllableMeo}
        onAnswered={() => {
          throw new Error('boom')
        }}
      />,
    )
    press(CONFIRM)
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(message()).toBe('Tiếng đúng là «mèo».')
    error.mockRestore()
  })

  it('lối thay thế bàn phím: ba hộp chọn đổi cùng một trạng thái', () => {
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableMeo} />)
    fireEvent.change(select('Dấu thanh'), { target: { value: '1' } })
    expect(composed()).toBe('mèo')
    fireEvent.change(select('Âm đầu'), { target: { value: '2' } })
    expect(composed()).toBe('bèo')
    fireEvent.change(select('Vần'), { target: { value: '1' } })
    expect(composed()).toBe('bà')
    expect(select('Dấu thanh').value).toBe('1')
    expect(screen.getByRole('button', { name: CONFIRM })).toBeTruthy()
  })

  it('có nút nghe lại khi câu hỏi có âm thanh, và không có khi không', () => {
    const { unmount } = render(<SyllableBuilderRenderer mode="preview" question={mockSyllableWithAudio} />)
    expect(screen.getByText(/Nghe lại/)).toBeTruthy()
    unmount()
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableMeo} />)
    expect(screen.queryByText(/Nghe lại/)).toBeNull()
  })

  it('sửa nội dung câu mà giữ nguyên id (live preview) cũng đặt lại', () => {
    const { rerender } = render(<SyllableBuilderRenderer mode="preview" question={mockSyllableMeo} />)
    next(2)
    press(CONFIRM)
    rerender(<SyllableBuilderRenderer mode="preview" question={{ ...mockSyllableMeo, onsets: ['b', 'm'], target: 'bèo' }} />)
    expect(composed()).toBe('beo')
    expect(message()).toBe('')
    expect(select('Dấu thanh').disabled).toBe(false)
  })

  it('đổi sang câu khác thì đặt lại từ đầu', () => {
    const { rerender } = render(<SyllableBuilderRenderer mode="preview" question={mockSyllableMeo} />)
    next(2)
    rerender(<SyllableBuilderRenderer mode="preview" question={mockSyllableSach} />)
    expect(composed()).toBe('sach')
  })
})

describe('play', () => {
  const student = toStudentQuestion(mockSyllableMeo)

  it('câu hỏi gửi học sinh không có đáp án; trước khi nộp không lộ tiếng đúng', () => {
    render(<SyllableBuilderRenderer mode="play" question={student} onAnswered={() => ({ isCorrect: true })} />)
    expect(JSON.stringify(student)).not.toContain('mèo')
    expect(document.body.textContent).not.toContain('mèo')
  })

  it('nộp tiếng đã ghép; đúng/sai do cha (Backend) quyết định, renderer không tự chấm', async () => {
    const onAnswered = vi.fn(async (): Promise<SyllableAnswerResult> => ({ isCorrect: false, correctSyllable: 'mèo' }))
    render(<SyllableBuilderRenderer mode="play" question={student} onAnswered={onAnswered} />)
    next(2) // «mèo» trùng đáp án thật nhưng Backend nói sai
    press(CONFIRM)
    expect(konvaTexts('Đang chấm…')).toHaveLength(1)
    await waitFor(() => expect(message()).toBe('Tiếng đúng là «mèo».'))
    expect(onAnswered).toHaveBeenCalledWith('mèo')
    expect(h.trigger).toHaveBeenCalledWith('tryAgain')
  })

  it('đúng: thông báo đúng', async () => {
    render(<SyllableBuilderRenderer mode="play" question={student} onAnswered={async () => ({ isCorrect: true })} />)
    press(CONFIRM)
    await waitFor(() => expect(message()).toBe('Giỏi quá!'))
    expect(composedFill()).toBe(NEUTRAL.surfaceCorrect)
  })

  it('sai mà không có correctSyllable: nhắc thử lại, không bịa tiếng', async () => {
    render(<SyllableBuilderRenderer mode="play" question={student} onAnswered={async () => ({ isCorrect: false })} />)
    press(CONFIRM)
    await waitFor(() => expect(message()).toBe('Chưa đúng rồi, cố gắng lên nhé.'))
  })

  it('hai lần chạm «Xong rồi!» cùng lúc (trước khi vẽ lại) chỉ nộp một lần', async () => {
    const onAnswered = vi.fn(async (): Promise<SyllableAnswerResult> => ({ isCorrect: true }))
    render(<SyllableBuilderRenderer mode="play" question={student} onAnswered={onAnswered} />)
    act(() => {
      press(CONFIRM)
      press(CONFIRM)
    })
    await waitFor(() => expect(message()).toBe('Giỏi quá!'))
    expect(onAnswered).toHaveBeenCalledTimes(1)
  })

  it('cha trả kết quả sai dạng thì coi như chưa nhận được: mở khóa, không kẹt', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onAnswered = vi.fn(async () => undefined as unknown as SyllableAnswerResult)
    render(<SyllableBuilderRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(CONFIRM)
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(select('Vần').disabled).toBe(false)
    expect(message()).toBe('Chưa gửi được, bấm Xong rồi để gửi lại nhé.')
    error.mockRestore()
  })

  it('ở play không hiện gợi ý chính tả (sẽ lộ đáp án c hay k), kể cả trong dòng đọc cho trình đọc màn hình', () => {
    render(<SyllableBuilderRenderer mode="play" question={toStudentQuestion(mockSyllableKe)} onAnswered={async () => ({ isCorrect: true })} />)
    expect(composed()).toBe('cê')
    expect(message()).toBe('')
    expect(status()).not.toContain('viết k')
  })

  it('đang chấm thì khóa mọi thao tác', async () => {
    let resolve!: (r: SyllableAnswerResult) => void
    const onAnswered = vi.fn(() => new Promise<SyllableAnswerResult>((r) => (resolve = r)))
    render(<SyllableBuilderRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(CONFIRM)
    expect(select('Vần').disabled).toBe(true)
    next(0)
    expect(screen.getByRole('button', { name: CONFIRM }).hasAttribute('disabled')).toBe(true)
    expect(composed()).toBe('meo')
    expect(onAnswered).toHaveBeenCalledTimes(1)
    await act(async () => resolve({ isCorrect: true }))
    expect(message()).toBe('Giỏi quá!')
  })

  it('lỗi mạng: nói rõ chưa gửi được, mở khóa để thử lại', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onAnswered = vi
      .fn<(s: string) => Promise<SyllableAnswerResult>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ isCorrect: true })
    render(<SyllableBuilderRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(CONFIRM)
    await waitFor(() => expect(message()).toBe('Chưa gửi được, bấm Xong rồi để gửi lại nhé.'))
    expect(select('Vần').disabled).toBe(false)
    press(CONFIRM)
    await waitFor(() => expect(message()).toBe('Giỏi quá!'))
    expect(onAnswered).toHaveBeenCalledTimes(2)
    error.mockRestore()
  })

  it('kết quả đến sau khi đã đóng màn thì bị bỏ qua', async () => {
    let resolve!: (r: SyllableAnswerResult) => void
    const onAnswered = vi.fn(() => new Promise<SyllableAnswerResult>((r) => (resolve = r)))
    const { unmount } = render(<SyllableBuilderRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(CONFIRM)
    unmount()
    await act(async () => resolve({ isCorrect: true }))
    expect(h.trigger).not.toHaveBeenCalled()
  })

  it('kết quả của câu cũ không áp lên câu mới', async () => {
    let resolve!: (r: SyllableAnswerResult) => void
    const onAnswered = vi.fn(() => new Promise<SyllableAnswerResult>((r) => (resolve = r)))
    const { rerender } = render(<SyllableBuilderRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(CONFIRM)
    rerender(<SyllableBuilderRenderer mode="play" question={{ ...student, id: 'next' }} onAnswered={onAnswered} />)
    await act(async () => resolve({ isCorrect: true }))
    expect(message()).toBe('')
    expect(h.trigger).not.toHaveBeenCalled()
  })
})

describe('review', () => {
  it('khóa sẵn: không nút xác nhận, hiện đúng tiếng đã ghép trước đó và chỉ tiếng đúng khi sai', () => {
    render(<SyllableBuilderRenderer mode="review" question={mockSyllableMeo} selectedParts={{ onset: 'n', rhyme: 'eo', tone: 'HUYEN' }} />)
    expect(composed()).toBe('nèo')
    expect(slotValues()).toEqual(['n', 'eo', 'huyền (`)'])
    expect(composedFill()).toBe(NEUTRAL.surfaceTryAgain)
    expect(message()).toBe('Tiếng đúng là «mèo».')
    expect(konvaTexts(CONFIRM)).toHaveLength(0)
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull()
    expect(select('Vần').disabled).toBe(true)
  })

  it('lựa chọn cũ đúng', () => {
    render(<SyllableBuilderRenderer mode="review" question={mockSyllableMeo} selectedParts={{ onset: 'm', rhyme: 'eo', tone: 'HUYEN' }} />)
    expect(composedFill()).toBe(NEUTRAL.surfaceCorrect)
    expect(message()).toBe('Giỏi quá!')
  })

  it('▼ không đổi gì ở chế độ xem lại', () => {
    render(<SyllableBuilderRenderer mode="review" question={mockSyllableMeo} selectedParts={{ onset: 'n', rhyme: 'eo', tone: 'HUYEN' }} />)
    next(2)
    expect(composed()).toBe('nèo')
  })

  it('không chọn gì (hết giờ): hiện «…» và chỉ tiếng đúng, không giả vờ trẻ đã ghép «meo»', () => {
    render(<SyllableBuilderRenderer mode="review" question={mockSyllableMeo} />)
    expect(composed()).toBe('…')
    expect(message()).toBe('Tiếng đúng là «mèo».')
  })
})

describe('theme', () => {
  it('có provider thì ô ghép và nút đổi theo màu theme', () => {
    const themed = { ...neutralTheme, colors: { ...neutralTheme.colors, surface: '#112233', accent: '#445566' } }
    render(
      <ThemeProvider theme={themed}>
        <SyllableBuilderRenderer mode="preview" question={mockSyllableMeo} />
      </ThemeProvider>,
    )
    expect(composedFill()).toBe('#112233')
    expect(konvaTexts('▼')[0].parentElement!.querySelector('[data-testid="rect"]')!.getAttribute('data-fill')).toBe('#445566')
  })

  it('mặc định (không provider) dùng màu neutral', () => {
    render(<SyllableBuilderRenderer mode="preview" question={mockSyllableMeo} />)
    expect(composedFill()).toBe(NEUTRAL.surface)
  })
})
