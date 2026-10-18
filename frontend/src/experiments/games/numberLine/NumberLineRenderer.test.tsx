import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ThemeProvider from '../../theme/ThemeProvider'
import { neutralTheme } from '../../theme/themes/neutral'
import NumberLineRenderer from './NumberLineRenderer'
import { mockNumberLine10, mockNumberLineEstimate, mockNumberLineWithAudio } from './numberLineFixtures'
import { toStudentQuestion } from './numberLineLogic'
import type { NumberLineAnswerResult } from './numberLineTypes'

const h = vi.hoisted(() => ({
  pointerX: 0,
  circles: {} as Record<'marker' | 'ring', Record<string, unknown> | undefined>,
  trigger: vi.fn(),
}))

// Konva giả: lộ fill/stroke/kích cỡ chữ ra data-attribute; Circle lưu props để test gọi trình xử lý kéo.
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick }: { children?: React.ReactNode; onClick?: (event: unknown) => void }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick ? () => onClick({ target: { getStage: () => ({ getRelativePointerPosition: () => ({ x: h.pointerX, y: 0 }) }) } }) : undefined}>
      {children}
    </div>
  ),
  Rect: ({ fill, stroke }: { fill?: string; stroke?: string }) => <i data-testid="rect" data-fill={fill} data-stroke={stroke} />,
  Text: ({ text, fill, fontSize }: { text?: string; fill?: string; fontSize?: number }) => (
    <span data-konva="text" data-fill={fill} data-size={fontSize}>
      {text}
    </span>
  ),
  Image: () => null,
  Line: () => null,
  Circle: (props: Record<string, unknown>) => {
    h.circles[props.dash ? 'ring' : 'marker'] = props
    return <i data-testid={props.dash ? 'ring' : 'marker'} data-x={String(props.x)} data-fill={String(props.fill)} data-stroke={String(props.stroke)} data-draggable={String(props.draggable)} />
  },
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

/** Chữ Konva (không lẫn với chữ DOM của lối thay thế bàn phím). */
const konvaText = (text: string) => {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[data-konva="text"]')).filter((el) => el.textContent === text)
  if (found.length === 0) throw new Error(`Không có chữ Konva "${text}"`)
  return found[0]
}
const rectFillOf = (text: string) => konvaText(text).parentElement!.querySelector('[data-testid="rect"]')!.getAttribute('data-fill')
/** Số hiện ở ô giữa (chữ cỡ 56). */
const shownValue = () => document.querySelector('[data-konva="text"][data-size="56"]')!.textContent
const marker = () => screen.queryByTestId('marker')
const ring = () => screen.queryByTestId('ring')
const status = () => screen.getByRole('status').textContent
const press = (text: string) => fireEvent.click(konvaText(text))
const slider = () => screen.getByLabelText('Số trên trục') as HTMLInputElement
const dragNode = (x: number) => {
  let current = x
  return { x: (value?: number) => (value === undefined ? current : (current = value)), y: vi.fn() }
}
// Vạch 7 của thang 0..10 trên đường 90..710 (xem numberLineLayout).
const xOf = (value: number) => 90 + (value / 10) * 620

beforeEach(() => {
  h.circles = { marker: undefined, ring: undefined }
  h.trigger.mockClear()
  h.pointerX = 0
})

describe('preview', () => {
  it('bắt đầu ở min (hoặc startValue), có điểm kéo kéo được, chưa có vòng gợi ý', () => {
    render(<NumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(shownValue()).toBe('0')
    expect(marker()!.getAttribute('data-draggable')).toBe('true')
    expect(marker()!.getAttribute('data-x')).toBe(String(xOf(0)))
    expect(ring()).toBeNull()
    expect(status()).toBe('')
  })

  it('nút + và − dịch đúng một bước; − bị khóa ở min', () => {
    render(<NumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(rectFillOf('−')).toBe(NEUTRAL.disabledSurface)
    press('+')
    press('+')
    expect(shownValue()).toBe('2')
    expect(rectFillOf('−')).toBe(NEUTRAL.accent)
    press('−')
    expect(shownValue()).toBe('1')
    press('−')
    press('−') // đã ở min: không xuống âm
    expect(shownValue()).toBe('0')
  })

  it('+ bị khóa ở max và không vượt quá', () => {
    render(<NumberLineRenderer mode="preview" question={{ ...mockNumberLine10, startValue: 10 }} />)
    expect(rectFillOf('+')).toBe(NEUTRAL.disabledSurface)
    press('+')
    expect(shownValue()).toBe('10')
  })

  it('bước 10: + dịch 10', () => {
    render(<NumberLineRenderer mode="preview" question={mockNumberLineEstimate} />)
    press('+')
    expect(shownValue()).toBe('10')
  })

  it('chạm lên dải đặt điểm vào vạch gần nhất', () => {
    render(<NumberLineRenderer mode="preview" question={mockNumberLine10} />)
    h.pointerX = xOf(7) + 10 // lệch nhẹ, vẫn về vạch 7
    press('3') // nhãn nằm trong dải, click nổi bọt lên nhóm dải
    expect(shownValue()).toBe('7')
    expect(marker()!.getAttribute('data-x')).toBe(String(xOf(7)))
  })

  it('kéo: đang kéo số theo tay, thả thì dính vạch', () => {
    render(<NumberLineRenderer mode="preview" question={mockNumberLine10} />)
    const move = h.circles.marker!.onDragMove as (e: unknown) => void
    const node = dragNode(xOf(4) + 20)
    act(() => move({ target: node }))
    expect(shownValue()).toBe('4')
    // Kéo ra ngoài đường bị kẹp vào đầu đường.
    const far = dragNode(5000)
    act(() => (h.circles.marker!.onDragMove as (e: unknown) => void)({ target: far }))
    expect(far.x()).toBe(710)
    expect(shownValue()).toBe('10')
    const drop = dragNode(xOf(6) - 15)
    act(() => (h.circles.marker!.onDragEnd as (e: unknown) => void)({ target: drop }))
    expect(shownValue()).toBe('6')
    expect(marker()!.getAttribute('data-x')).toBe(String(xOf(6)))
  })

  it('lối thay thế bàn phím: thanh trượt đổi giá trị cùng một trạng thái', () => {
    render(<NumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(slider().min).toBe('0')
    expect(slider().max).toBe('10')
    fireEvent.change(slider(), { target: { value: '8' } })
    expect(shownValue()).toBe('8')
    expect(slider().value).toBe('8')
  })

  it('đúng: chấm cục bộ, điểm xanh, thông báo, gọi onAnswered với giá trị đã chọn', () => {
    const onAnswered = vi.fn()
    render(<NumberLineRenderer mode="preview" question={mockNumberLine10} onAnswered={onAnswered} />)
    fireEvent.change(slider(), { target: { value: '7' } })
    press(CONFIRM)
    expect(onAnswered).toHaveBeenCalledWith(7)
    expect(h.trigger).toHaveBeenCalledWith('correct')
    expect(marker()!.getAttribute('data-fill')).toBe(NEUTRAL.surfaceCorrect)
    expect(status()).toBe('Đúng rồi!')
    expect(marker()!.getAttribute('data-draggable')).toBe('false')
  })

  it('đặt đúng thì KHÔNG hiện vòng chỉ chỗ đúng (preview, và play dù cha vẫn gửi correctValue)', async () => {
    const { unmount } = render(<NumberLineRenderer mode="preview" question={mockNumberLine10} />)
    fireEvent.change(slider(), { target: { value: '7' } })
    press(CONFIRM)
    expect(ring()).toBeNull()
    unmount()
    render(<NumberLineRenderer mode="play" question={toStudentQuestion(mockNumberLine10)} onAnswered={async () => ({ isCorrect: true, correctValue: 7 })} />)
    press(CONFIRM)
    await waitFor(() => expect(status()).toBe('Đúng rồi!'))
    expect(ring()).toBeNull()
  })

  it('xem lại với lựa chọn cũ đúng: không vòng chỉ chỗ', () => {
    render(<NumberLineRenderer mode="review" question={mockNumberLine10} selectedValue={7} />)
    expect(ring()).toBeNull()
  })

  it('sai: phản hồi nhẹ (vàng, không đỏ), chỉ luôn vạch đúng bằng vòng nét đứt', () => {
    render(<NumberLineRenderer mode="preview" question={mockNumberLine10} />)
    fireEvent.change(slider(), { target: { value: '3' } })
    press(CONFIRM)
    expect(h.trigger).toHaveBeenCalledWith('tryAgain')
    expect(marker()!.getAttribute('data-fill')).toBe(NEUTRAL.surfaceTryAgain)
    expect(ring()!.getAttribute('data-x')).toBe(String(xOf(7)))
    expect(ring()!.getAttribute('data-stroke')).toBe(NEUTRAL.lineCorrect)
    expect(status()).toBe('Gần đúng rồi. Số đúng là 7.')
    expect(`${marker()!.getAttribute('data-fill')}${marker()!.getAttribute('data-stroke')}`.toLowerCase()).not.toMatch(/ff0000|#f00|red/)
  })

  it('độ lệch cho phép: lệch một vạch vẫn đúng', () => {
    render(<NumberLineRenderer mode="preview" question={mockNumberLineEstimate} />)
    fireEvent.change(slider(), { target: { value: '80' } })
    press(CONFIRM)
    expect(h.trigger).toHaveBeenCalledWith('correct')
  })

  it('đã chấm thì khóa: + và nút xác nhận không còn tác dụng, chỉ chấm một lần', () => {
    const onAnswered = vi.fn()
    render(<NumberLineRenderer mode="preview" question={mockNumberLine10} onAnswered={onAnswered} />)
    press(CONFIRM)
    press(CONFIRM)
    press('+')
    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(shownValue()).toBe('0')
    expect(slider().disabled).toBe(true)
  })

  it('onAnswered của preview ném lỗi thì không làm vỡ màn', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onAnswered = vi.fn(() => {
      throw new Error('boom')
    })
    render(<NumberLineRenderer mode="preview" question={mockNumberLine10} onAnswered={onAnswered} />)
    fireEvent.click(konvaText(CONFIRM))
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(status()).not.toBe('')
    error.mockRestore()
  })

  it('có nút nghe lại khi câu hỏi có âm thanh, và không có khi không', () => {
    const { unmount } = render(<NumberLineRenderer mode="preview" question={mockNumberLineWithAudio} />)
    expect(screen.getByText(/Nghe lại/)).toBeTruthy()
    unmount()
    render(<NumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(screen.queryByText(/Nghe lại/)).toBeNull()
  })

  it('sửa nội dung câu mà giữ nguyên id (live preview) cũng đặt lại, không giữ số ngoài thang mới', () => {
    const { rerender } = render(<NumberLineRenderer mode="preview" question={{ ...mockNumberLine10, max: 20, startValue: 15 }} />)
    expect(shownValue()).toBe('15')
    rerender(<NumberLineRenderer mode="preview" question={{ ...mockNumberLine10, max: 10, startValue: 5 }} />)
    expect(shownValue()).toBe('5')
    press('+')
    press(CONFIRM)
    rerender(<NumberLineRenderer mode="preview" question={{ ...mockNumberLine10, target: 8 }} />)
    expect(status()).toBe('')
    expect(marker()!.getAttribute('data-draggable')).toBe('true')
  })

  it('đổi sang câu khác thì đặt lại từ đầu', () => {
    const { rerender } = render(<NumberLineRenderer mode="preview" question={mockNumberLine10} />)
    press('+')
    press(CONFIRM)
    rerender(<NumberLineRenderer mode="preview" question={{ ...mockNumberLine10, id: 'other' }} />)
    expect(shownValue()).toBe('0')
    expect(status()).toBe('')
    expect(marker()!.getAttribute('data-draggable')).toBe('true')
  })
})

describe('play', () => {
  const student = toStudentQuestion(mockNumberLine10)

  it('không lộ đáp án trước khi nộp: không vòng gợi ý và câu hỏi không có target', () => {
    render(<NumberLineRenderer mode="play" question={student} onAnswered={() => ({ isCorrect: true })} />)
    expect(ring()).toBeNull()
    expect(JSON.stringify(student)).not.toContain('target')
  })

  it('nộp giá trị đã chọn; kết quả do cha trả về quyết định đúng/sai (không tự chấm)', async () => {
    const onAnswered = vi.fn(async (): Promise<NumberLineAnswerResult> => ({ isCorrect: false, correctValue: 7 }))
    render(<NumberLineRenderer mode="play" question={student} onAnswered={onAnswered} />)
    fireEvent.change(slider(), { target: { value: '7' } }) // giá trị trùng đáp án thật nhưng backend nói sai
    press(CONFIRM)
    expect(konvaText('Đang chấm…')).toBeTruthy()
    await waitFor(() => expect(status()).toBe('Gần đúng rồi. Số đúng là 7.'))
    expect(onAnswered).toHaveBeenCalledWith(7)
    expect(h.trigger).toHaveBeenCalledWith('tryAgain')
    expect(ring()!.getAttribute('data-x')).toBe(String(xOf(7)))
  })

  it('đúng: thông báo đúng, không vòng gợi ý khi cha không gửi correctValue', async () => {
    render(<NumberLineRenderer mode="play" question={student} onAnswered={async () => ({ isCorrect: true })} />)
    press(CONFIRM)
    await waitFor(() => expect(status()).toBe('Đúng rồi!'))
    expect(ring()).toBeNull()
  })

  it('sai mà không có correctValue: nhắc thử lại, không bịa số', async () => {
    render(<NumberLineRenderer mode="play" question={student} onAnswered={async () => ({ isCorrect: false })} />)
    press(CONFIRM)
    await waitFor(() => expect(status()).toBe('Chưa đúng rồi, cố gắng lên nhé.'))
    expect(ring()).toBeNull()
  })

  it('hai lần chạm «Xong rồi!» cùng lúc (trước khi vẽ lại) chỉ nộp một lần', async () => {
    const onAnswered = vi.fn(async (): Promise<NumberLineAnswerResult> => ({ isCorrect: true }))
    render(<NumberLineRenderer mode="play" question={student} onAnswered={onAnswered} />)
    act(() => {
      fireEvent.click(konvaText(CONFIRM))
      fireEvent.click(konvaText(CONFIRM))
    })
    await waitFor(() => expect(status()).toBe('Đúng rồi!'))
    expect(onAnswered).toHaveBeenCalledTimes(1)
  })

  it('cha trả kết quả sai dạng thì coi như chưa nhận được: mở khóa, không kẹt', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onAnswered = vi.fn(async () => undefined as unknown as NumberLineAnswerResult)
    render(<NumberLineRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(CONFIRM)
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(slider().disabled).toBe(false)
    error.mockRestore()
  })

  it('đang chấm thì khóa mọi thao tác (không đổi số, không nộp lần hai)', async () => {
    let resolve!: (r: NumberLineAnswerResult) => void
    const onAnswered = vi.fn(() => new Promise<NumberLineAnswerResult>((r) => (resolve = r)))
    render(<NumberLineRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(CONFIRM)
    expect(slider().disabled).toBe(true)
    press('+')
    expect(screen.getByRole('button', { name: CONFIRM }).hasAttribute('disabled')).toBe(true)
    expect(shownValue()).toBe('0')
    expect(onAnswered).toHaveBeenCalledTimes(1)
    await act(async () => resolve({ isCorrect: true }))
    expect(status()).toBe('Đúng rồi!')
  })

  it('lỗi mạng: mở khóa để thử lại, không kẹt ở "Đang chấm"', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onAnswered = vi
      .fn<(v: number) => Promise<NumberLineAnswerResult>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ isCorrect: true })
    render(<NumberLineRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(CONFIRM)
    await waitFor(() => expect(status()).toBe('Chưa gửi được, bấm Xong rồi để gửi lại nhé.'))
    expect(konvaText(CONFIRM)).toBeTruthy()
    expect(slider().disabled).toBe(false)
    press(CONFIRM)
    await waitFor(() => expect(status()).toBe('Đúng rồi!'))
    expect(onAnswered).toHaveBeenCalledTimes(2)
    error.mockRestore()
  })

  it('kết quả đến sau khi đã đóng màn thì bị bỏ qua (không phản hồi, không lỗi)', async () => {
    let resolve!: (r: NumberLineAnswerResult) => void
    const onAnswered = vi.fn(() => new Promise<NumberLineAnswerResult>((r) => (resolve = r)))
    const { unmount } = render(<NumberLineRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(CONFIRM)
    unmount()
    await act(async () => resolve({ isCorrect: true }))
    expect(h.trigger).not.toHaveBeenCalled()
  })

  it('kết quả của câu cũ không áp lên câu mới', async () => {
    let resolve!: (r: NumberLineAnswerResult) => void
    const onAnswered = vi.fn(() => new Promise<NumberLineAnswerResult>((r) => (resolve = r)))
    const { rerender } = render(<NumberLineRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(CONFIRM)
    rerender(<NumberLineRenderer mode="play" question={{ ...student, id: 'next' }} onAnswered={onAnswered} />)
    await act(async () => resolve({ isCorrect: true }))
    expect(status()).toBe('')
    expect(h.trigger).not.toHaveBeenCalled()
  })
})

describe('review', () => {
  it('khóa sẵn: không nút xác nhận, không kéo được, hiện lựa chọn cũ và vạch đúng', () => {
    render(<NumberLineRenderer mode="review" question={mockNumberLine10} selectedValue={3} />)
    expect(shownValue()).toBe('3')
    expect(marker()!.getAttribute('data-draggable')).toBe('false')
    expect(marker()!.getAttribute('data-fill')).toBe(NEUTRAL.surfaceTryAgain)
    expect(ring()!.getAttribute('data-x')).toBe(String(xOf(7)))
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull()
    expect(Array.from(document.querySelectorAll('[data-konva="text"]')).some((el) => el.textContent === CONFIRM)).toBe(false)
    expect(slider().disabled).toBe(true)
    expect(status()).toBe('Gần đúng rồi. Số đúng là 7.')
  })

  it('lựa chọn cũ đúng', () => {
    render(<NumberLineRenderer mode="review" question={mockNumberLine10} selectedValue={7} />)
    expect(marker()!.getAttribute('data-fill')).toBe(NEUTRAL.surfaceCorrect)
    expect(status()).toBe('Đúng rồi!')
  })

  it('lựa chọn cũ lệch vạch hoặc ngoài thang (thang đã sửa) được dính về vạch gần nhất trước khi hiện', () => {
    render(<NumberLineRenderer mode="review" question={mockNumberLine10} selectedValue={99} />)
    expect(shownValue()).toBe('10')
  })

  it('nút + và − không đổi số ở chế độ xem lại', () => {
    render(<NumberLineRenderer mode="review" question={mockNumberLine10} selectedValue={3} />)
    press('+')
    expect(shownValue()).toBe('3')
  })

  it('không chọn gì (hết giờ): không có điểm, chỉ có vòng ở vạch đúng', () => {
    render(<NumberLineRenderer mode="review" question={mockNumberLine10} />)
    expect(marker()).toBeNull()
    expect(ring()!.getAttribute('data-x')).toBe(String(xOf(7)))
  })
})

describe('theme', () => {
  it('không có provider = neutral; có provider thì điểm kéo đổi theo accent của theme', () => {
    const themed = { ...neutralTheme, colors: { ...neutralTheme.colors, accent: '#123456', accentBorder: '#654321' } }
    render(
      <ThemeProvider theme={themed}>
        <NumberLineRenderer mode="preview" question={mockNumberLine10} />
      </ThemeProvider>,
    )
    expect(marker()!.getAttribute('data-fill')).toBe('#123456')
    expect(marker()!.getAttribute('data-stroke')).toBe('#654321')
    expect(konvaText('Đặt chú ong vào số 7').getAttribute('data-fill')).toBe(neutralTheme.colors.onBackground)
  })

  it('mặc định (không provider) dùng màu neutral', () => {
    render(<NumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(marker()!.getAttribute('data-fill')).toBe(NEUTRAL.accent)
  })
})
