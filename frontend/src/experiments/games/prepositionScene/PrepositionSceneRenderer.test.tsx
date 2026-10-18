import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ThemeProvider from '../../theme/ThemeProvider'
import { neutralTheme } from '../../theme/themes/neutral'
import PrepositionSceneRenderer from './PrepositionSceneRenderer'
import { mockPrepositionIn, mockPrepositionNextTo, mockPrepositionUnder, mockPrepositionWithAudio } from './prepositionFixtures'
import { computePrepositionLayout, SCENE_X } from './prepositionLayout'
import { toStudentQuestion } from './prepositionLogic'
import type { PlacementAnswerResult } from './prepositionTypes'

const h = vi.hoisted(() => ({
  pointer: { x: 0, y: 0 },
  groups: {} as Record<string, Record<string, unknown> | undefined>,
  trigger: vi.fn(),
}))

// Konva giả: lộ fill/stroke/nét đứt/cỡ chữ ra data-attribute; Group có tên lưu props để test gọi trình xử lý kéo.
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: (props: { children?: React.ReactNode; name?: string; onClick?: (event: unknown) => void }) => {
    if (props.name) h.groups[props.name] = props as unknown as Record<string, unknown>
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div
        data-name={props.name}
        onClick={
          props.onClick
            ? (domEvent) => {
                const konvaEvent = { cancelBubble: false, target: { getStage: () => ({ getRelativePointerPosition: () => h.pointer }) } }
                props.onClick!(konvaEvent)
                if (konvaEvent.cancelBubble) domEvent.stopPropagation()
              }
            : undefined
        }
      >
        {props.children}
      </div>
    )
  },
  Rect: ({ fill, stroke, dash }: { fill?: string; stroke?: string; dash?: number[] }) => (
    <i data-testid="rect" data-fill={fill} data-stroke={stroke} data-dash={dash ? 'yes' : 'no'} />
  ),
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
const DONE = 'Done!'
const SCENE_Y = computePrepositionLayout({ hasAudio: false, instructionHeight: 40, showConfirm: true }).sceneY

const konvaTexts = (text: string) => Array.from(document.querySelectorAll<HTMLElement>('[data-konva="text"]')).filter((el) => el.textContent === text)
const press = (text: string) => fireEvent.click(konvaTexts(text)[0])
const status = () => screen.getByRole('status').textContent
const group = (name: string) => h.groups[name] as { x: number; y: number; draggable: boolean; onDragMove: (e: unknown) => void; onDragEnd: (e: unknown) => void }
/** Tâm hiện tại của vật (toạ độ cảnh) theo vị trí góc trên trái của nhóm vật. */
const itemCenter = () => ({ x: group('item').x + 50, y: group('item').y + 50 })
const itemEl = () => document.querySelector('[data-name="item"]') as HTMLElement | null
const itemFill = () => itemEl()?.querySelector('[data-testid="rect"]')?.getAttribute('data-fill')
const ghosts = () => Array.from(document.querySelectorAll('[data-testid="rect"][data-dash="yes"]'))
/** Chạm lên cảnh tại toạ độ cảnh (x, y): đặt pointer rồi bấm vào nhãn vật mốc (nằm trong nhóm cảnh, click nổi bọt). */
const tapScene = (x: number, y: number) => {
  h.pointer = { x: SCENE_X + x, y: SCENE_Y + y }
  fireEvent.click(konvaTexts('table')[0] ?? konvaTexts('box')[0])
}
const dragNode = (x: number, y: number) => {
  const pos = { x, y }
  return { x: () => pos.x, y: () => pos.y, position: (p: { x: number; y: number }) => Object.assign(pos, p), _pos: pos }
}

beforeEach(() => {
  h.groups = {}
  h.trigger.mockClear()
  h.pointer = { x: 0, y: 0 }
})

describe('preview', () => {
  it('bắt đầu ở vị trí đầu, kéo được, chưa có khung gợi ý', () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    expect(itemCenter()).toEqual({ x: 110, y: 110 })
    expect(group('item').draggable).toBe(true)
    expect(itemFill()).toBe(NEUTRAL.accent)
    expect(ghosts()).toHaveLength(0)
    expect(konvaTexts('Put the cat under the table.')).toHaveLength(1)
    expect(konvaTexts('cat')).toHaveLength(1)
    expect(konvaTexts('table')).toHaveLength(1)
  })

  it('chạm lên cảnh đặt vật vào chỗ chạm; chạm ngoài mép thì vật được kẹp vào trong cảnh', () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    tapScene(360, 290)
    expect(itemCenter()).toEqual({ x: 360, y: 290 })
    tapScene(5000, -300)
    expect(itemCenter()).toEqual({ x: 720 - 50, y: 50 })
  })

  it('kéo: vật theo tay (kẹp trong cảnh), thả thì đặt chỗ mới', () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    const node = dragNode(900, -40) // góc trên trái ngoài cảnh
    act(() => group('item').onDragMove({ target: node }))
    expect(node._pos).toEqual({ x: 720 - 100, y: 0 })
    expect(itemCenter()).toEqual({ x: 670, y: 50 })
    act(() => group('item').onDragEnd({ target: dragNode(310, 240) }))
    expect(itemCenter()).toEqual({ x: 360, y: 290 })
  })

  it('trình đọc màn hình nghe vật đang ở đâu so với vật mốc, không phải toạ độ', () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    expect(status()).toContain('The cat is above and to the left of the table.')
    tapScene(360, 290)
    expect(status()).toContain('The cat is under the table.')
    expect(status()).not.toMatch(/\d/)
  })

  it('lối thay thế bàn phím: bốn nút nhích 20 đơn vị', () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    expect(itemCenter()).toEqual({ x: 130, y: 130 })
    fireEvent.click(screen.getByRole('button', { name: 'Move left' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }))
    expect(itemCenter()).toEqual({ x: 110, y: 110 })
    // nhích ra ngoài mép bị kẹp
    for (let i = 0; i < 10; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Move left' }))
    expect(itemCenter().x).toBe(50)
  })

  it('đúng (gầm bàn): chấm cục bộ, vật xanh, thông báo, gọi onAnswered với tâm vật', () => {
    const onAnswered = vi.fn()
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} onAnswered={onAnswered} />)
    tapScene(360, 290)
    press(DONE)
    expect(onAnswered).toHaveBeenCalledWith({ x: 360, y: 290 })
    expect(h.trigger).toHaveBeenCalledWith('correct')
    expect(itemFill()).toBe(NEUTRAL.surfaceCorrect)
    expect(status()).toContain('Great job!')
    expect(group('item').draggable).toBe(false)
  })

  it('sai: phản hồi nhẹ (vàng, không đỏ) và chỉ chỗ đúng bằng khung nét đứt', () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    tapScene(360, 100) // trên bàn: sai với «under»
    press(DONE)
    expect(h.trigger).toHaveBeenCalledWith('tryAgain')
    expect(itemFill()).toBe(NEUTRAL.surfaceTryAgain)
    expect(ghosts()).toHaveLength(1)
    expect(ghosts()[0].getAttribute('data-stroke')).toBe(NEUTRAL.lineCorrect)
    expect(status()).toContain('The dashed place is the right one.')
    expect(itemFill()!.toLowerCase()).not.toMatch(/ff0000|#f00|red/)
  })

  it.each([
    ['in', mockPrepositionIn, [360, 290]],
    ['next to', mockPrepositionNextTo, [560, 290]],
  ] as const)('đúng cho quy tắc %s', (_name, question, [x, y]) => {
    render(<PrepositionSceneRenderer mode="preview" question={question} />)
    tapScene(x, y)
    press(DONE)
    expect(h.trigger).toHaveBeenCalledWith('correct')
  })

  it('chạm vào chính vật không làm vật nhảy theo con trỏ (vật chặn nổi bọt, cảnh không nhận lần chạm)', () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    h.pointer = { x: SCENE_X + 300, y: SCENE_Y + 300 }
    press('cat')
    expect(itemCenter()).toEqual({ x: 110, y: 110 })
  })

  it('đặt đúng thì KHÔNG hiện khung chỉ chỗ đúng (tránh tưởng «gần đúng»); sai thì hiện', () => {
    const { unmount } = render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    tapScene(360, 290)
    press(DONE)
    expect(ghosts()).toHaveLength(0)
    unmount()
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    press(DONE)
    expect(ghosts()).toHaveLength(1)
  })

  it('đã chấm thì khóa: chạm cảnh và nút nhích không còn tác dụng, chỉ chấm một lần', () => {
    const onAnswered = vi.fn()
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} onAnswered={onAnswered} />)
    press(DONE)
    press(DONE)
    tapScene(360, 290)
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }))
    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(itemCenter()).toEqual({ x: 110, y: 110 })
    expect(screen.getByRole('button', { name: 'Move right' }).hasAttribute('disabled')).toBe(true)
  })

  it('onAnswered của preview ném lỗi đồng bộ thì không làm vỡ màn', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <PrepositionSceneRenderer
        mode="preview"
        question={mockPrepositionUnder}
        onAnswered={() => {
          throw new Error('boom')
        }}
      />,
    )
    press(DONE)
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(status()).toContain('dashed')
    error.mockRestore()
  })

  it('có nút nghe lại khi câu hỏi có âm thanh, và không có khi không', () => {
    const { unmount } = render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionWithAudio} />)
    expect(screen.getByText(/Nghe lại/)).toBeTruthy()
    unmount()
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    expect(screen.queryByText(/Nghe lại/)).toBeNull()
  })

  it('sửa nội dung câu mà giữ nguyên id (live preview) cũng đặt lại', () => {
    const { rerender } = render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    tapScene(360, 290)
    press(DONE)
    rerender(<PrepositionSceneRenderer mode="preview" question={{ ...mockPrepositionUnder, item: { ...mockPrepositionUnder.item, startX: 200, startY: 80 } }} />)
    expect(itemCenter()).toEqual({ x: 200, y: 80 })
    expect(group('item').draggable).toBe(true)
    expect(ghosts()).toHaveLength(0)
  })
})

describe('play', () => {
  const student = toStudentQuestion(mockPrepositionUnder)

  it('câu hỏi gửi học sinh không có quy tắc; không lộ chỗ đúng trước khi nộp', () => {
    render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={() => ({ isCorrect: true })} />)
    expect(ghosts()).toHaveLength(0)
    expect(JSON.stringify(student)).not.toContain('UNDER')
  })

  it('nộp tâm vật; đúng/sai do cha (Backend) quyết định, renderer không tự chấm', async () => {
    const onAnswered = vi.fn(async (): Promise<PlacementAnswerResult> => ({ isCorrect: false, correctCenter: { x: 360, y: 290 } }))
    render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={onAnswered} />)
    tapScene(360, 290) // đúng theo hình học, nhưng Backend nói sai
    press(DONE)
    expect(konvaTexts('Checking…')).toHaveLength(1)
    await waitFor(() => expect(h.trigger).toHaveBeenCalledWith('tryAgain'))
    expect(onAnswered).toHaveBeenCalledWith({ x: 360, y: 290 })
    expect(ghosts()).toHaveLength(1)
    expect(itemFill()).toBe(NEUTRAL.surfaceTryAgain)
  })

  it('đúng mà cha vẫn gửi correctCenter: không hiện khung chỉ chỗ', async () => {
    render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={async () => ({ isCorrect: true, correctCenter: { x: 360, y: 290 } })} />)
    press(DONE)
    await waitFor(() => expect(status()).toContain('Great job!'))
    expect(ghosts()).toHaveLength(0)
  })

  it('correctCenter hỏng từ cha: NaN thì bỏ, ngoài cảnh thì kẹp vào cảnh', async () => {
    const { unmount } = render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={async () => ({ isCorrect: false, correctCenter: { x: Number.NaN, y: 5 } })} />)
    press(DONE)
    await waitFor(() => expect(h.trigger).toHaveBeenCalledWith('tryAgain'))
    expect(ghosts()).toHaveLength(0)
    unmount()
    render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={async () => ({ isCorrect: false, correctCenter: { x: 9999, y: -9999 } })} />)
    press(DONE)
    await waitFor(() => expect(ghosts()).toHaveLength(1))
  })

  it('đúng: thông báo đúng, không khung gợi ý khi cha không gửi correctCenter', async () => {
    render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={async () => ({ isCorrect: true })} />)
    press(DONE)
    await waitFor(() => expect(status()).toContain('Great job!'))
    expect(ghosts()).toHaveLength(0)
  })

  it('sai mà không có correctCenter: lời động viên, không bịa chỗ đúng', async () => {
    render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={async () => ({ isCorrect: false })} />)
    press(DONE)
    await waitFor(() => expect(status()).toContain('Not quite. Good try!'))
    expect(ghosts()).toHaveLength(0)
  })

  it('hai lần chạm «Done!» cùng lúc chỉ nộp một lần', async () => {
    const onAnswered = vi.fn(async (): Promise<PlacementAnswerResult> => ({ isCorrect: true }))
    render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={onAnswered} />)
    act(() => {
      press(DONE)
      press(DONE)
    })
    await waitFor(() => expect(status()).toContain('Great job!'))
    expect(onAnswered).toHaveBeenCalledTimes(1)
  })

  it('đang chấm thì khóa mọi thao tác', async () => {
    let resolve!: (r: PlacementAnswerResult) => void
    const onAnswered = vi.fn(() => new Promise<PlacementAnswerResult>((r) => (resolve = r)))
    render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(DONE)
    expect(group('item').draggable).toBe(false)
    tapScene(360, 290)
    expect(itemCenter()).toEqual({ x: 110, y: 110 })
    await act(async () => resolve({ isCorrect: true }))
    expect(status()).toContain('Great job!')
  })

  it('lỗi mạng: nói rõ chưa gửi được, mở khóa để thử lại', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onAnswered = vi
      .fn<(c: { x: number; y: number }) => Promise<PlacementAnswerResult>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ isCorrect: true })
    render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(DONE)
    await waitFor(() => expect(status()).toContain('Could not send. Tap Done! again.'))
    expect(group('item').draggable).toBe(true)
    expect(konvaTexts('Try again!')).toHaveLength(1) // cũng báo bằng chữ ngay trên nút, không chỉ cho trình đọc màn hình
    press('Try again!')
    await waitFor(() => expect(status()).toContain('Great job!'))
    expect(onAnswered).toHaveBeenCalledTimes(2)
    error.mockRestore()
  })

  it('cha trả kết quả sai dạng thì coi như chưa nhận được: mở khóa, không kẹt', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={async () => undefined as unknown as PlacementAnswerResult} />)
    press(DONE)
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(group('item').draggable).toBe(true)
    error.mockRestore()
  })

  it('kết quả đến sau khi đã đóng màn thì bị bỏ qua', async () => {
    let resolve!: (r: PlacementAnswerResult) => void
    const onAnswered = vi.fn(() => new Promise<PlacementAnswerResult>((r) => (resolve = r)))
    const { unmount } = render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(DONE)
    unmount()
    await act(async () => resolve({ isCorrect: true }))
    expect(h.trigger).not.toHaveBeenCalled()
  })

  it('kết quả của câu cũ không áp lên câu mới', async () => {
    let resolve!: (r: PlacementAnswerResult) => void
    const onAnswered = vi.fn(() => new Promise<PlacementAnswerResult>((r) => (resolve = r)))
    const { rerender } = render(<PrepositionSceneRenderer mode="play" question={student} onAnswered={onAnswered} />)
    press(DONE)
    rerender(<PrepositionSceneRenderer mode="play" question={{ ...student, id: 'next' }} onAnswered={onAnswered} />)
    await act(async () => resolve({ isCorrect: true }))
    expect(h.trigger).not.toHaveBeenCalled()
    expect(group('item').draggable).toBe(true)
  })
})

describe('review', () => {
  it('khóa sẵn: không nút «Done!», vật ở chỗ đã đặt (sai → vàng) và có khung chỉ chỗ đúng', () => {
    render(<PrepositionSceneRenderer mode="review" question={mockPrepositionUnder} selectedCenter={{ x: 360, y: 100 }} />)
    expect(itemCenter()).toEqual({ x: 360, y: 100 })
    expect(itemFill()).toBe(NEUTRAL.surfaceTryAgain)
    expect(ghosts()).toHaveLength(1)
    expect(group('item').draggable).toBe(false)
    expect(konvaTexts(DONE)).toHaveLength(0)
    expect(screen.queryByRole('button', { name: DONE })).toBeNull()
    expect(screen.getByRole('button', { name: 'Move left' }).hasAttribute('disabled')).toBe(true)
    expect(status()).toContain('dashed')
  })

  it('lựa chọn cũ đúng', () => {
    render(<PrepositionSceneRenderer mode="review" question={mockPrepositionUnder} selectedCenter={{ x: 360, y: 290 }} />)
    expect(ghosts()).toHaveLength(0)
    expect(itemFill()).toBe(NEUTRAL.surfaceCorrect)
    expect(status()).toContain('Great job!')
  })

  it('chạm cảnh không đổi gì ở chế độ xem lại', () => {
    render(<PrepositionSceneRenderer mode="review" question={mockPrepositionUnder} selectedCenter={{ x: 360, y: 100 }} />)
    tapScene(360, 290)
    expect(itemCenter()).toEqual({ x: 360, y: 100 })
  })

  it('vị trí cũ nằm ngoài cảnh (cảnh đã đổi) được kẹp vào trong', () => {
    render(<PrepositionSceneRenderer mode="review" question={mockPrepositionUnder} selectedCenter={{ x: 5000, y: 5000 }} />)
    expect(itemCenter()).toEqual({ x: 670, y: 330 })
  })

  it('không chọn gì (hết giờ): không có vật, chỉ có khung chỗ đúng, không giả vờ trẻ đã đặt', () => {
    render(<PrepositionSceneRenderer mode="review" question={mockPrepositionUnder} />)
    expect(itemEl()).toBeNull()
    expect(ghosts()).toHaveLength(1)
    expect(status()).toContain('No answer.')
    expect(status()).not.toContain('is at')
  })
})

describe('theme', () => {
  it('có provider thì vật và nút đổi theo màu theme', () => {
    const themed = { ...neutralTheme, colors: { ...neutralTheme.colors, accent: '#123456', accentBorder: '#654321', surface: '#223344' } }
    render(
      <ThemeProvider theme={themed}>
        <PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />
      </ThemeProvider>,
    )
    expect(itemFill()).toBe('#123456')
    expect(konvaTexts('Put the cat under the table.')[0].getAttribute('data-fill')).toBe(neutralTheme.colors.onBackground)
  })

  it('mặc định (không provider) dùng màu neutral', () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} />)
    expect(itemFill()).toBe(NEUTRAL.accent)
  })
})
