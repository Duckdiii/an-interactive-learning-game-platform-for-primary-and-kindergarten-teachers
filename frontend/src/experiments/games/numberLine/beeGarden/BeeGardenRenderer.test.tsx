import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNumberLine10, mockNumberLine20, mockNumberLineStep2, mockNumberLineWithAudio } from '../numberLineFixtures'
import { isLabeled, labelEvery, tickValues, toStudentQuestion } from '../numberLineLogic'
import type { NumberLineAnswerResult } from '../numberLineTypes'
import BeeGardenRenderer from './BeeGardenRenderer'
import { GARDEN_COLORS } from './beeGardenColors'
import { BEE_HIT_RADIUS, BEE_SCALE, QUESTION_FONT_SIZE, computeGardenLayout, FLOWER_HEAD_FROM_BOTTOM, FLOWER_RADIUS, HILL_DESIGN_HEIGHT, GARDEN_LEFT, GARDEN_RIGHT } from './beeGardenGeometry'

const h = vi.hoisted(() => ({
  confettiCalls: [] as unknown[][],
  pointerX: 0,
  motionEnabled: [] as boolean[],
  motionState: undefined as { answeredAt: number | null; correct: boolean; confetti: unknown[]; beeState?: string } | undefined,
  reduced: false,
  trigger: vi.fn(),
  bee: undefined as Record<string, unknown> | undefined,
  gardenTap: undefined as ((event: unknown) => void) | undefined,
  gardenTapTouch: undefined as ((event: unknown) => void) | undefined,
  play: vi.fn(),
  events: [] as string[],
}))

// Konva giả: lộ fill/kích cỡ ra data-attribute; Group có `draggable` chính là chú ong; Rect có onClick là vùng chạm của vườn.
vi.mock('react-konva', () => {
  type P = Record<string, unknown> & { children?: React.ReactNode }
  const Plain = ({ children }: P) => <div>{children}</div>
  return {
    Stage: Plain,
    Layer: Plain,
    Group: (props: P) => {
      if (props.draggable !== undefined) h.bee = props
      const onClick = props.onClick as ((event: unknown) => void) | undefined
      return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          data-konva="group"
          data-draggable={props.draggable === undefined ? undefined : String(props.draggable)}
          data-scale={props.scaleX === undefined ? undefined : String(props.scaleX)}
          data-rotation={props.rotation === undefined ? undefined : String(props.rotation)}
          onClick={onClick ? () => onClick({}) : undefined}
          // Konva phát `tap` cho cảm ứng; DOM không có sự kiện đó nên mô phỏng bằng dblclick (chỉ để chạy nhánh onTap trong test).
          onDoubleClick={props.onTap ? () => (props.onTap as (event: unknown) => void)({}) : undefined}
          onMouseDown={props.onMouseDown ? () => (props.onMouseDown as () => void)() : undefined}
          onMouseUp={props.onMouseUp ? () => (props.onMouseUp as () => void)() : undefined}
          onMouseLeave={props.onMouseLeave ? () => (props.onMouseLeave as () => void)() : undefined}
          onTouchStart={props.onTouchStart ? () => (props.onTouchStart as () => void)() : undefined}
          onTouchEnd={props.onTouchEnd ? () => (props.onTouchEnd as () => void)() : undefined}
          onTouchCancel={props.onTouchCancel ? () => (props.onTouchCancel as () => void)() : undefined}
        >
          {props.children}
        </div>
      )
    },
    Rect: (props: P) => {
      if (props.onClick) h.gardenTap = props.onClick as (event: unknown) => void
      if (props.onTap) h.gardenTapTouch = props.onTap as (event: unknown) => void
      return <i data-konva="rect" data-fill={String(props.fill)} data-stroke={String(props.stroke)} data-opacity={String(props.opacity)} data-listening={String(props.listening)} />
    },
    Circle: (props: P) => (
      <i data-konva="circle" data-name={String(props.name)} data-fill={String(props.fill)} data-stroke={String(props.stroke)} data-dash={props.dash ? 'yes' : 'no'} data-radius={String(props.radius)} data-opacity={String(props.opacity)} />
    ),
    Ellipse: (props: P) => <i data-konva="ellipse" data-name={String(props.name)} data-rx={String(props.radiusX)} data-y={String(props.y)} />,
    Arc: () => <i data-konva="arc" />,
    Line: (props: P) => <i data-konva="line" data-points={JSON.stringify(props.points)} />,
    Image: () => <i data-konva="image" />,
    Shape: () => null,
    Star: (props: P) => <i data-konva="star" data-name={String(props.name)} data-fill={String(props.fill)} data-opacity={String(props.opacity)} />,
    RegularPolygon: (props: P) => <i data-konva="polygon" data-testid={props.rotation === -90 ? 'arrow-left' : 'arrow-right'} />,
    Text: (props: P) => (
      <span data-konva="text" data-fill={String(props.fill)} data-size={String(props.fontSize)}>
        {String(props.text)}
      </span>
    ),
  }
})
vi.mock('./gardenConfetti', () => ({
  launchConfetti: (...args: unknown[]) => h.confettiCalls.push(args),
  originOfRect: () => undefined,
}))
vi.mock('howler', () => ({
  Howl: class {
    play = () => {
      h.events.push('play')
      h.play()
    }
    stop = vi.fn()
    unload = () => {
      h.events.push('unload')
    }
    constructor() {
      h.events.push('new')
    }
  },
}))
vi.mock('../../../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../../../feedback/useExperimentFeedback', () => ({
  useExperimentFeedback: () => ({ kind: null, runId: 0, plan: null, reducedMotion: h.reduced, trigger: h.trigger }),
}))
vi.mock('../../../feedback/FeedbackOverlay', () => ({ default: () => null }))
vi.mock('./useGardenMotion', () => ({
  useGardenMotion: (_layer: unknown, enabled: boolean, stateRef: { current: { answeredAt: number | null; correct: boolean; confetti: unknown[] } }) => {
    h.motionEnabled.push(enabled)
    h.motionState = stateRef.current
  },
}))

const konvaText = (text: string) => {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[data-konva="text"]')).filter((el) => el.textContent === text)
  if (found.length === 0) throw new Error(`Không có chữ Konva "${text}"`)
  return found[0]
}
const hasKonvaText = (text: string) => Array.from(document.querySelectorAll('[data-konva="text"]')).some((el) => el.textContent === text)
/** Số hiện ở ô giữa (chữ cỡ 56). */
const shownValue = () => document.querySelector('[data-konva="text"][data-size="56"]')!.textContent
const status = () => screen.getByRole('status').textContent
const press = (text: string) => fireEvent.click(konvaText(text))
const plus = () => fireEvent.click(screen.getByTestId('arrow-right'))
const minus = () => fireEvent.click(screen.getByTestId('arrow-left'))
const slider = () => screen.getByLabelText('Số trên trục') as HTMLInputElement
const glowCircles = (fill: string) => document.querySelectorAll(`[data-konva="circle"][data-fill="${fill}"]`).length
/** Quầng sáng gợi ý (nền gradient, không có viền): đúng một cái trên hoa đang được gợi ý. */
const hintGlows = () => document.querySelectorAll('[data-konva="circle"][data-name="motion-hint-glow"][data-stroke="undefined"]').length
const stars = () => document.querySelectorAll('[data-konva="star"]:not([data-name="motion-trail"]):not([data-name="hint-star"])').length
/** Tâm trạng của chú ong đọc từ miệng: cười to (đúng), cười nhẹ (nghỉ), tròn «o» (chưa đúng). */
const mouth = (): 'happy' | 'idle' | 'oops' | 'none' => {
  if (document.querySelector('[data-konva="ellipse"][data-rx="5"][data-y="15"]')) return 'oops'
  const points = Array.from(document.querySelectorAll('[data-konva="line"]')).map((el) => el.getAttribute('data-points'))
  if (points.includes('[-12,8,0,24,12,8]')) return 'happy'
  if (points.includes('[-9,10,0,18,9,10]')) return 'idle'
  return 'none'
}
const CONFIRM = 'Xong rồi!'
const tapGarden = (x: number) => {
  h.pointerX = x
  act(() => h.gardenTap?.({ target: { getStage: () => ({ getRelativePointerPosition: () => ({ x, y: 0 }) }) } }))
}
const dragEvent = (x: number) => {
  const node = { x: vi.fn((value?: number) => (value === undefined ? x : value)), y: vi.fn() }
  return { event: { target: node }, node }
}

beforeEach(() => {
  h.confettiCalls = []
  h.motionEnabled = []
  h.motionState = undefined
  h.reduced = false
  h.bee = undefined
  h.gardenTap = undefined
  h.trigger.mockClear()
  h.play.mockClear()
  h.events = []
  h.gardenTapTouch = undefined
})

describe('hình hiện ra', () => {
  it('hiện câu hỏi, một bông hoa có số cho từng vạch (0 đến 10), ô số ở giữa và nút Xong rồi', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    expect(hasKonvaText('Đặt chú ong vào số 7')).toBe(true)
    for (let value = 0; value <= 10; value += 1) expect(hasKonvaText(String(value)), `hoa ${value}`).toBe(true)
    expect(shownValue()).toBe('0')
    expect(hasKonvaText(CONFIRM)).toBe(true)
    expect(screen.getByTestId('arrow-left')).toBeTruthy()
    expect(screen.getByTestId('arrow-right')).toBeTruthy()
  })

  /** Số ghi trên hoa: chữ chỉ có chữ số, trừ ô số giữa (cỡ 56). */
  const flowerNumbers = () =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-konva="text"]'))
      .filter((el) => /^\d+$/.test(el.textContent ?? '') && el.getAttribute('data-size') !== '56')
      .map((el) => el.textContent as string)

  it('thang dài (21 vạch) ghi ĐÚNG tập số thưa theo labelEvery/isLabeled, không ghi số xen giữa', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine20} />)
    const ticks = tickValues({ min: 0, max: 20, step: 1 })
    const every = labelEvery(ticks.length)
    const expected = ticks.filter((_, index) => isLabeled(index, ticks.length, every)).map(String)
    expect(expected.length).toBeLessThan(ticks.length)
    expect(flowerNumbers()).toEqual(expected)
    expect(flowerNumbers()).toContain('20')
    expect(flowerNumbers()).not.toContain(String(ticks.find((_, index) => !isLabeled(index, ticks.length, every))))
  })

  it('thang đếm cách 2 ghi đúng các số chẵn và không có số lẻ', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLineStep2} />)
    expect(flowerNumbers()).toEqual(['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20'])
  })

  it('cỡ chữ trên nhụy giảm theo số chữ số (1 chữ số 44, 2 chữ số 36, 3 chữ số 26, 4 chữ số 19) để không bị ngắt dòng', () => {
    const sizeOf = (text: string) => Array.from(document.querySelectorAll('[data-konva="text"]')).find((el) => el.textContent === text)?.getAttribute('data-size')
    const { unmount } = render(<BeeGardenRenderer mode="preview" question={{ ...mockNumberLine10, id: 'nl-big', min: 0, max: 1000, step: 100, target: 500 }} />)
    expect(sizeOf('0')).toBe('44')
    expect(sizeOf('100')).toBe('26')
    expect(sizeOf('1000')).toBe('19')
    unmount()
    render(<BeeGardenRenderer mode="preview" question={{ ...mockNumberLine10, id: 'nl-two', min: 0, max: 100, step: 10, target: 50 }} />)
    expect(sizeOf('10')).toBe('36')
  })

  it('có audioUrl thì có nút Nghe lại; không có thì không', () => {
    const { unmount } = render(<BeeGardenRenderer mode="preview" question={mockNumberLineWithAudio} />)
    expect(hasKonvaText('Nghe lại')).toBe(true)
    unmount()
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    expect(hasKonvaText('Nghe lại')).toBe(false)
  })
})

describe('bố cục báo ra ngoài (onLayout)', () => {
  it('báo bố cục hiện tại: cảnh cố định 520, hàng đề bài nằm TRONG cảnh; dùng được để tránh hàng đề khi đặt thứ ngoài canvas', () => {
    const seen: ReturnType<typeof computeGardenLayout>[] = []
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} onLayout={(layout) => seen.push(layout)} />)
    expect(seen.length).toBeGreaterThan(0)
    const layout = seen[seen.length - 1]
    expect(layout.gardenHeight).toBe(520)
    // hàng tiến độ nằm trong cảnh, trên cùng, và hàng đề bài nằm dưới nó
    expect(layout.progress[1]).toBeGreaterThanOrEqual(layout.gardenY)
    expect(layout.progress[1] + layout.progress[3]).toBeLessThanOrEqual(layout.hudRow[1])
    expect(layout.hudRow[1]).toBeGreaterThanOrEqual(layout.gardenY)
    expect(layout.hudRow[1] + layout.hudRow[3]).toBeLessThanOrEqual(layout.gardenY + layout.gardenHeight)
  })
  it('cảnh cao như nhau ở chế độ chạm (Mầm non) và xác nhận (Tiểu học)', () => {
    const heights: number[] = []
    for (const [mode, band] of [['tap', 'PRESCHOOL'], ['confirm', 'GRADE_1_2']] as const) {
      const view = render(<BeeGardenRenderer mode="preview" question={{ ...mockNumberLine10, id: 'nl-' + mode }} interactionMode={mode} ageBand={band} onLayout={(layout) => (heights[heights.length] = layout.gardenHeight)} />)
      view.unmount()
    }
    expect(heights).toHaveLength(2)
    expect(heights[0]).toBe(heights[1])
  })
})

describe('chú ong', () => {
  it('có vùng bắt chạm bán kính 72 (đường kính 144 đơn vị, đạt 64px ở khung 390px) và kéo được khi chưa trả lời', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    expect(BEE_HIT_RADIUS).toBe(72)
    // Ong thu 0,9: bán kính vẽ bù tỉ lệ nên vùng chạm hữu hiệu vẫn 72.
    const hit = Array.from(document.querySelectorAll('[data-konva="circle"]')).find((el) => el.getAttribute('data-radius') === String(BEE_HIT_RADIUS / BEE_SCALE))
    expect(hit).toBeTruthy()
    expect(h.bee?.scaleX).toBe(BEE_SCALE)
    expect(BEE_HIT_RADIUS / BEE_SCALE * BEE_SCALE).toBeCloseTo(72, 8)
    expect(h.bee?.draggable).toBe(true)
  })

  it('kéo: kẹp trong hai đầu hàng hoa, giữ nguyên độ cao; thả thì đặt vào vạch gần nhất', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    const move = h.bee!.onDragMove as (event: unknown) => void
    const end = h.bee!.onDragEnd as (event: unknown) => void
    const far = dragEvent(5000)
    act(() => move(far.event))
    expect(far.node.x).toHaveBeenCalledWith(GARDEN_RIGHT)
    expect(far.node.y).toHaveBeenCalled()
    const left = dragEvent(-100)
    act(() => move(left.event))
    expect(left.node.x).toHaveBeenCalledWith(GARDEN_LEFT)
    // số hiện ở ô giữa chạy theo lúc kéo (đang ở mép trái)
    expect(shownValue()).toBe('0')
    const between = dragEvent(GARDEN_LEFT + 0.66 * (GARDEN_RIGHT - GARDEN_LEFT)) // giữa chừng, chưa trùng vạch nào
    act(() => move(between.event))
    expect(h.bee!.x).toBeCloseTo(GARDEN_LEFT + 0.66 * (GARDEN_RIGHT - GARDEN_LEFT), 5) // ong bám theo tay
    const mid = dragEvent(GARDEN_LEFT + 0.7 * (GARDEN_RIGHT - GARDEN_LEFT))
    act(() => move(mid.event))
    expect(shownValue()).toBe('7')
    act(() => end(between.event))
    expect(shownValue()).toBe('7')
    expect(h.bee!.x).toBeCloseTo(GARDEN_LEFT + 0.7 * (GARDEN_RIGHT - GARDEN_LEFT), 5) // thả tay thì khớp đúng vạch 7
    expect(slider().value).toBe('7')
  })

  it('sau khi trả lời thì không kéo được nữa; xem lại thì không kéo được ngay từ đầu', () => {
    const { unmount } = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    press(CONFIRM)
    expect(h.bee?.draggable).toBe(false)
    unmount()
    render(<BeeGardenRenderer mode="review" question={mockNumberLine10} selectedValue={3} />)
    expect(h.bee?.draggable).toBe(false)
  })
})

describe('bấm hoặc chạm để di chuyển', () => {
  it('mũi tên + và − đi từng vạch; − bị khóa ở đầu thang; + bị khóa ở cuối thang', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    minus()
    expect(shownValue()).toBe('0')
    plus()
    plus()
    expect(shownValue()).toBe('2')
    minus()
    expect(shownValue()).toBe('1')
    for (let i = 0; i < 20; i += 1) plus()
    expect(shownValue()).toBe('10')
  })

  it('chạm vào khung vườn đặt chú ong vào hoa gần nhất; chạm sau khi trả lời không đổi gì', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    tapGarden(GARDEN_LEFT + 0.43 * (GARDEN_RIGHT - GARDEN_LEFT)) // gần vạch 4
    expect(shownValue()).toBe('4')
    press(CONFIRM)
    tapGarden(GARDEN_LEFT + 0.9 * (GARDEN_RIGHT - GARDEN_LEFT))
    expect(shownValue()).toBe('4')
  })

  it('thanh trượt dành cho bàn phím và trình đọc màn hình cũng đổi được giá trị', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    fireEvent.change(slider(), { target: { value: '5' } })
    expect(shownValue()).toBe('5')
    expect(slider().getAttribute('aria-valuetext')).toBe('Số 5')
  })

  it('nhấn nút Xong rồi thì co lại một chút rồi trở về khi thả (phản hồi chạm)', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    const group = konvaText(CONFIRM).parentElement!
    expect(group.getAttribute('data-scale')).toBe('1')
    fireEvent.mouseDown(group)
    expect(konvaText(CONFIRM).parentElement!.getAttribute('data-scale')).toBe('0.94')
    fireEvent.mouseUp(konvaText(CONFIRM).parentElement!)
    expect(konvaText(CONFIRM).parentElement!.getAttribute('data-scale')).toBe('1')
  })

  it('nút bị khóa thì không co lại khi nhấn', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    const left = screen.getByTestId('arrow-left').parentElement!
    fireEvent.mouseDown(left)
    expect(screen.getByTestId('arrow-left').parentElement!.getAttribute('data-scale')).toBe('1')
  })
})

describe('chấm và phản hồi', () => {
  it('preview đúng: phát phản hồi đúng, hoa đúng sáng xanh, ong cười; gọi onAnswered với giá trị', () => {
    const onAnswered = vi.fn()
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} onAnswered={onAnswered} />)
    for (let i = 0; i < 7; i += 1) plus()
    press(CONFIRM)
    expect(h.trigger).toHaveBeenCalledWith('correct')
    expect(onAnswered).toHaveBeenCalledWith(7)
    expect(status()).toBe('Đúng rồi!')
    expect(glowCircles(GARDEN_COLORS.glowCorrect)).toBe(1)
    expect(hintGlows()).toBe(0)
  })

  it('preview sai: phản hồi nhẹ (tryAgain), hoa đúng sáng vàng gợi ý, chọn sai thì không sáng; thông báo nêu số đúng', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    for (let i = 0; i < 3; i += 1) plus()
    press(CONFIRM)
    expect(h.trigger).toHaveBeenCalledWith('tryAgain')
    expect(hintGlows()).toBe(1)
    expect(glowCircles(GARDEN_COLORS.glowCorrect)).toBe(0)
    expect(status()).toBe('Gần đúng rồi. Số đúng là 7.')
  })

  it('không có màu đỏ gắt (kênh đỏ cao, xanh lá và xanh dương thấp) ở bất kỳ nền hay viền nào, kể cả sau khi trả lời sai và sau khi trả lời đúng', () => {
    const harshRed = (color: string) => {
      const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color)
      if (!match) return false
      const [r, g, b] = match.slice(1).map((hex) => parseInt(hex, 16))
      return r >= 190 && g <= 110 && b <= 110
    }
    const colorsOnScreen = () =>
      Array.from(document.querySelectorAll('[data-fill],[data-stroke]')).flatMap((el) => [el.getAttribute('data-fill') ?? '', el.getAttribute('data-stroke') ?? ''])
    const { unmount } = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    press(CONFIRM) // sai (chọn 0)
    expect(colorsOnScreen().filter((c) => c.startsWith('#')).length).toBeGreaterThan(20)
    expect(colorsOnScreen().filter(harshRed)).toEqual([])
    unmount()
    render(<BeeGardenRenderer mode="preview" question={{ ...mockNumberLine10, id: 'nl-ok', startValue: 7 }} />)
    press(CONFIRM) // đúng
    expect(colorsOnScreen().filter(harshRed)).toEqual([])
    // và bộ kiểm có tác dụng: đỏ gắt thật sự bị nhận ra, hồng pastel của cánh hoa thì không
    expect(harshRed('#FF0000')).toBe(true)
    expect(harshRed('#E53935')).toBe(true)
    expect(harshRed('#FF8FB1')).toBe(false)
  })

  it('play: gửi giá trị cho cha, KHÔNG tự chấm; kết quả của cha quyết định (kể cả cha nói đúng khi giá trị khác đáp án mẫu)', async () => {
    const onAnswered = vi.fn(async (): Promise<NumberLineAnswerResult> => ({ isCorrect: true }))
    render(<BeeGardenRenderer mode="play" question={toStudentQuestion(mockNumberLine10)} onAnswered={onAnswered} />)
    plus()
    press(CONFIRM)
    await waitFor(() => expect(status()).toBe('Đúng rồi!'))
    expect(onAnswered).toHaveBeenCalledWith(1)
    expect(h.trigger).toHaveBeenCalledWith('correct')
  })

  it('play sai kèm correctValue: hoa đúng sáng gợi ý; không có correctValue thì thông báo chung, không sáng hoa nào', async () => {
    const { unmount } = render(<BeeGardenRenderer mode="play" question={toStudentQuestion(mockNumberLine10)} onAnswered={async () => ({ isCorrect: false, correctValue: 7 })} />)
    press(CONFIRM)
    await waitFor(() => expect(hintGlows()).toBe(1))
    unmount()
    render(<BeeGardenRenderer mode="play" question={toStudentQuestion(mockNumberLine10)} onAnswered={async () => ({ isCorrect: false })} />)
    press(CONFIRM)
    await waitFor(() => expect(status()).toBe('Chưa đúng rồi, cố gắng lên nhé.'))
    expect(hintGlows()).toBe(0)
  })

  it('khóa đồng bộ: bấm Xong rồi hai lần liên tiếp chỉ nộp một lần', async () => {
    let resolve: (value: NumberLineAnswerResult) => void = () => {}
    const onAnswered = vi.fn(() => new Promise<NumberLineAnswerResult>((r) => (resolve = r)))
    render(<BeeGardenRenderer mode="play" question={toStudentQuestion(mockNumberLine10)} onAnswered={onAnswered} />)
    const confirm = konvaText(CONFIRM)
    // trong cùng một lô cập nhật React: bản đóng của lần bấm thứ hai vẫn thấy «đang rảnh», chỉ khóa đồng bộ chặn được
    act(() => {
      fireEvent.click(confirm)
      fireEvent.click(confirm)
    })
    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(hasKonvaText('Đang chấm…')).toBe(true)
    await act(async () => resolve({ isCorrect: true }))
    await waitFor(() => expect(status()).toBe('Đúng rồi!'))
  })

  it('cha ném lỗi hoặc trả sai dạng: mở khóa lại để thử lại và báo nhẹ nhàng; lần sau gửi được', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const results: unknown[] = [Promise.reject(new Error('mất mạng')), { khong_co_isCorrect: 1 }, { isCorrect: true }]
    const onAnswered = vi.fn(() => results.shift() as Promise<NumberLineAnswerResult>)
    render(<BeeGardenRenderer mode="play" question={toStudentQuestion(mockNumberLine10)} onAnswered={onAnswered} />)
    press(CONFIRM)
    await waitFor(() => expect(status()).toBe('Chưa gửi được, bấm Xong rồi để gửi lại nhé.'))
    expect(h.trigger).not.toHaveBeenCalled()
    press(CONFIRM)
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(status()).toBe('Chưa gửi được, bấm Xong rồi để gửi lại nhé.'))
    press(CONFIRM)
    await waitFor(() => expect(status()).toBe('Đúng rồi!'))
    expect(onAnswered).toHaveBeenCalledTimes(3)
    consoleError.mockRestore()
  })

  it('onAnswered của preview ném lỗi thì chỉ ghi log, màn vẫn chấm bình thường', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} onAnswered={() => { throw new Error('hỏng') }} />)
    press(CONFIRM)
    expect(status()).toBe('Gần đúng rồi. Số đúng là 7.')
    await waitFor(() => expect(consoleError).toHaveBeenCalled())
    consoleError.mockRestore()
  })

  it('đổi câu hỏi (cùng id nhưng đổi thang) thì đặt lại, không giữ trạng thái cũ ngoài thang mới', () => {
    const { rerender } = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    for (let i = 0; i < 4; i += 1) plus()
    press(CONFIRM)
    rerender(<BeeGardenRenderer mode="preview" question={{ ...mockNumberLine10, max: 6, target: 5 }} />)
    expect(shownValue()).toBe('0')
    expect(status()).toBe('')
  })
})

describe('xem lại', () => {
  it('không có nút Xong rồi; chọn sai thì ong ở số đã chọn và hoa đúng sáng gợi ý', () => {
    render(<BeeGardenRenderer mode="review" question={mockNumberLine10} selectedValue={4} />)
    expect(hasKonvaText(CONFIRM)).toBe(false)
    expect(shownValue()).toBe('4')
    expect(hintGlows()).toBe(1)
    expect(status()).toBe('Gần đúng rồi. Số đúng là 7.')
  })

  it('chọn đúng thì hoa sáng xanh, ong cười', () => {
    render(<BeeGardenRenderer mode="review" question={mockNumberLine10} selectedValue={7} />)
    expect(glowCircles(GARDEN_COLORS.glowCorrect)).toBe(1)
    expect(hintGlows()).toBe(0)
    expect(status()).toBe('Đúng rồi!')
  })

  it('hết giờ (không chọn gì): không vẽ chú ong, chỉ hoa đúng sáng gợi ý', () => {
    render(<BeeGardenRenderer mode="review" question={mockNumberLine10} />)
    expect(h.bee).toBeUndefined()
    expect(hintGlows()).toBe(1)
  })
})

describe('hoạt họa và giảm chuyển động', () => {
  it('chuyển động nền chỉ bật khi không «giảm chuyển động» và không phải xem lại', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    expect(h.motionEnabled.every((value) => value === true)).toBe(true)
    h.motionEnabled = []
    h.reduced = true
    const reduced = render(<BeeGardenRenderer mode="preview" question={{ ...mockNumberLine10, id: 'nl-reduced' }} />)
    expect(h.motionEnabled.every((value) => value === false)).toBe(true)
    reduced.unmount()
    h.reduced = false
    h.motionEnabled = []
    render(<BeeGardenRenderer mode="review" question={mockNumberLine10} selectedValue={7} />)
    expect(h.motionEnabled.every((value) => value === false)).toBe(true)
  })

  it('ong luôn có độ cao nghỉ cố định ở prop: nhún nhảy, nhảy cẫng và lắc đầu do node làm, không phải state của React', () => {
    const rest = computeGardenLayout({ hasAudio: false, questionHeight: 40, showConfirm: true }).beeY
    const { unmount } = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    expect(h.bee!.y).toBe(rest)
    for (let i = 0; i < 7; i += 1) plus()
    press(CONFIRM) // đúng
    expect(h.bee!.y).toBe(rest)
    expect(h.bee!.rotation).toBeUndefined()
    unmount()
  })

  it('đúng: ghi nhận kết quả cho bộ chuyển động (mốc thời gian, đúng) và sao rải 18 hạt xuất hiện; chưa trả lời thì không có', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    expect(h.motionState!.answeredAt).toBeNull()
    for (let i = 0; i < 7; i += 1) plus()
    expect(stars()).toBe(1) // chỉ ngôi sao trên nút Xong rồi
    press(CONFIRM)
    expect(h.motionState!.answeredAt).toEqual(expect.any(Number))
    expect(h.motionState!.correct).toBe(true)
    expect(stars()).toBe(1 + 18)
    expect(h.motionState!.confetti).toHaveLength(18)
  })

  it('sai: bộ chuyển động nhận correct = false và không có sao rải', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    press(CONFIRM)
    expect(h.motionState!.answeredAt).toEqual(expect.any(Number))
    expect(h.motionState!.correct).toBe(false)
    expect(stars()).toBe(1)
  })

  it('nét mặt: nghỉ thì cười nhẹ; đúng thì cười to và giữ nguyên; sai thì «o» một lúc rồi về bình thường', () => {
    vi.useFakeTimers()
    try {
      const { unmount } = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
      expect(mouth()).toBe('idle')
      for (let i = 0; i < 7; i += 1) plus()
      press(CONFIRM)
      expect(mouth()).toBe('happy')
      act(() => void vi.advanceTimersByTime(5000))
      expect(mouth()).toBe('happy') // đúng thì vẫn cười
      unmount()

      render(<BeeGardenRenderer mode="preview" question={{ ...mockNumberLine10, id: 'nl-wrong' }} />)
      press(CONFIRM)
      expect(mouth()).toBe('oops')
      act(() => void vi.advanceTimersByTime(1500))
      expect(mouth()).toBe('oops') // vẫn «o» thêm một lúc
      act(() => void vi.advanceTimersByTime(1000))
      expect(mouth()).toBe('idle') // rồi về bình thường
    } finally {
      vi.useRealTimers()
    }
  })

  it('sai: sau mặt «o» ong chớp mắt một nhịp (mắt nhắm, miệng bình thường) rồi mở mắt lại; đúng và giảm chuyển động thì không chớp', () => {
    vi.useFakeTimers()
    try {
      const closedEyes = () => Array.from(document.querySelectorAll('[data-konva="line"]')).some((el) => el.getAttribute('data-points') === '[-24,0,-16,4,-8,0]')
      render(<BeeGardenRenderer mode="preview" question={{ ...mockNumberLine10, id: 'nl-blink' }} />)
      press(CONFIRM)
      expect(closedEyes()).toBe(false) // đang lắc đầu, mặt «o»
      act(() => void vi.advanceTimersByTime(2200)) // sau (1,1 + 1) giây: hết mặt «o»
      expect(closedEyes()).toBe(true)
      expect(mouth()).toBe('idle')
      act(() => void vi.advanceTimersByTime(400))
      expect(closedEyes()).toBe(false) // mở mắt lại
    } finally {
      vi.useRealTimers()
    }
  })

  it('giảm chuyển động: sai thì nét mặt bình thường ngay (không «o»), đúng thì cười; không bật chuyển động, không sao rải, hoa đúng vẫn sáng xanh', () => {
    h.reduced = true
    const { unmount } = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    press(CONFIRM)
    expect(mouth()).toBe('idle')
    unmount()
    render(<BeeGardenRenderer mode="preview" question={{ ...mockNumberLine10, id: 'nl-r2' }} />)
    for (let i = 0; i < 7; i += 1) plus()
    press(CONFIRM)
    expect(mouth()).toBe('happy')
    expect(stars()).toBe(1)
    expect(glowCircles(GARDEN_COLORS.glowCorrect)).toBe(1)
  })

  it('pháo giấy: bắn đúng một lần khi trả lời đúng; sai thì không; giảm chuyển động thì báo reducedMotion để không bắn', () => {
    const right = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    expect(h.confettiCalls).toHaveLength(0) // chưa trả lời
    for (let i = 0; i < 7; i += 1) plus()
    press(CONFIRM)
    expect(h.confettiCalls).toHaveLength(1)
    expect(h.confettiCalls[0][0]).toBe('correct')
    expect(h.confettiCalls[0][1]).toMatchObject({ reducedMotion: false })
    right.unmount()
    h.confettiCalls = []
    render(<BeeGardenRenderer mode="preview" question={{ ...mockNumberLine10, id: 'nl-confetti-wrong' }} />)
    press(CONFIRM) // sai
    expect(h.confettiCalls).toHaveLength(0)
  })

  it('giảm chuyển động: pháo giấy được gọi với reducedMotion = true (không bắn thật)', () => {
    h.reduced = true
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    for (let i = 0; i < 7; i += 1) plus()
    press(CONFIRM)
    expect(h.confettiCalls[0][1]).toMatchObject({ reducedMotion: true })
  })

  it('xem lại: đúng thì ong cười, sai thì nét mặt bình thường (không «o»)', () => {
    const { unmount } = render(<BeeGardenRenderer mode="review" question={mockNumberLine10} selectedValue={7} />)
    expect(mouth()).toBe('happy')
    unmount()
    render(<BeeGardenRenderer mode="review" question={mockNumberLine10} selectedValue={2} />)
    expect(mouth()).toBe('idle')
  })
})

describe('đọc câu hỏi', () => {
  it('autoPlayAudio bật và có audioUrl: đọc đúng một lần khi vào câu, dù vẽ lại nhiều lần', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLineWithAudio} autoPlayAudio />)
    expect(h.play).toHaveBeenCalledTimes(1)
    plus()
    plus()
    expect(h.play).toHaveBeenCalledTimes(1)
  })

  it('không bật autoPlayAudio hoặc không có audioUrl thì không tự đọc; bấm Nghe lại thì đọc', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLineWithAudio} />)
    expect(h.play).not.toHaveBeenCalled()
    press('Nghe lại')
    expect(h.play).toHaveBeenCalledTimes(1)
  })

  it('autoPlayAudio mà câu không có audioUrl thì không đọc', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} autoPlayAudio />)
    expect(h.play).not.toHaveBeenCalled()
  })
})

describe('cảm ứng và vùng chạm', () => {
  const left = () => screen.getByTestId('arrow-left')
  const right = () => screen.getByTestId('arrow-right')
  const inner = (el: HTMLElement) => el.parentElement!
  const outer = (el: HTMLElement) => el.parentElement!.parentElement!

  it('chạm (tap) vào mũi tên và nút Xong rồi hoạt động như bấm chuột', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    fireEvent.doubleClick(outer(right()))
    fireEvent.doubleClick(outer(right()))
    expect(shownValue()).toBe('2')
    fireEvent.doubleClick(outer(left()))
    expect(shownValue()).toBe('1')
    fireEvent.doubleClick(outer(konvaText(CONFIRM)))
    expect(h.trigger).toHaveBeenCalledWith('tryAgain')
  })

  it('chạm vào khung vườn bằng tap cũng đặt chú ong vào hoa gần nhất', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    expect(h.gardenTapTouch).toBeTypeOf('function')
    const x = GARDEN_LEFT + 0.82 * (GARDEN_RIGHT - GARDEN_LEFT)
    act(() => h.gardenTapTouch?.({ target: { getStage: () => ({ getRelativePointerPosition: () => ({ x, y: 0 }) }) } }))
    expect(shownValue()).toBe('8')
  })

  it('chạm xuống thì nút co lại; nhấc tay, cảm ứng bị hủy (trang cuộn) hoặc ngón trượt ra ngoài đều trả nút về cỡ cũ', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    const scaleOf = () => inner(right()).getAttribute('data-scale')
    expect(scaleOf()).toBe('1')
    const pairs = [
      [fireEvent.touchStart, fireEvent.touchEnd],
      [fireEvent.touchStart, fireEvent.touchCancel],
      [fireEvent.mouseDown, fireEvent.mouseLeave],
    ] as const
    for (const [down, up] of pairs) {
      down(outer(right()))
      expect(scaleOf()).toBe('0.94')
      up(outer(right()))
      expect(scaleOf()).toBe('1')
    }
  })

  it('vùng chạm của nút KHÔNG co theo hình vẽ: nhóm ngoài giữ cỡ gốc và có hình chữ nhật trong suốt đủ kích thước', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    fireEvent.mouseDown(outer(right()))
    expect(inner(right()).getAttribute('data-scale')).toBe('0.94') // hình vẽ co lại
    const group = outer(right())
    expect(group.getAttribute('data-scale')).toBeNull() // nhóm nhận sự kiện không co
    const hit = group.querySelector('[data-konva="rect"][data-fill="#000000"]')
    expect(hit).toBeTruthy()
    expect(hit?.getAttribute('data-opacity')).toBe('0.001')
  })

  it('vùng bắt chạm (hữu hiệu 72) nằm TRONG nhóm kéo được của chú ong', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    const hit = Array.from(document.querySelectorAll('[data-konva="circle"]')).find((el) => el.getAttribute('data-radius') === String(BEE_HIT_RADIUS / BEE_SCALE))!
    expect(hit.closest('[data-draggable="true"]')).toBeTruthy()
  })
})

describe('gợi ý bằng bông hoa', () => {
  /** Độ sáng tương đối và tỉ lệ tương phản theo WCAG. */
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  it('viền gợi ý và viền «đúng» đạt tương phản ≥ 3:1 với trời và đồi cỏ sau (WCAG 1.4.11)', () => {
    // Viền lớn nhất (hoa tỉ lệ 1 và đang phình 12%) thấp nhất cách đáy vườn ≈ 64, còn đồi cỏ phía trước cao nhất cách đáy ≈ 56 (284 trong hệ đồi 340): viền chỉ nằm trên trời và đồi sau.
    const ringAboveBottom = FLOWER_HEAD_FROM_BOTTOM - (FLOWER_RADIUS + 12) * 1.12
    expect(ringAboveBottom).toBeGreaterThan(HILL_DESIGN_HEIGHT - 284)
    for (const background of [GARDEN_COLORS.skyTop, GARDEN_COLORS.skyBottom, GARDEN_COLORS.hillBack]) {
      expect(contrast(GARDEN_COLORS.ringHint, background), `gợi ý/${background}`).toBeGreaterThanOrEqual(3)
      expect(contrast(GARDEN_COLORS.ringCorrect, background), `đúng/${background}`).toBeGreaterThanOrEqual(3)
    }
    // bộ đo có tác dụng: vòng sáng mờ (chỉ dùng làm nền) KHÔNG đạt 3:1
    expect(contrast(GARDEN_COLORS.glowHint, GARDEN_COLORS.skyBottom)).toBeLessThan(3)
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
  })

  it('hoa được gợi ý có quầng sáng nhấp nháy + vòng liền mảnh + hạt lấp lánh (KHÔNG nét đứt như khung chọn UI); hoa «đúng» có viền liền; hoa thường không có gì', () => {
    const rings = (stroke: string) => Array.from(document.querySelectorAll(`[data-konva="circle"][data-stroke="${stroke}"]`))
    const sparkles = () => document.querySelectorAll('[data-konva="star"][data-name="hint-star"]').length
    const { unmount } = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    expect(rings(GARDEN_COLORS.ringHint)).toHaveLength(0)
    expect(rings(GARDEN_COLORS.ringCorrect)).toHaveLength(0)
    expect(hintGlows()).toBe(0)
    expect(sparkles()).toBe(0)
    press(CONFIRM) // sai
    expect(hintGlows()).toBe(1)
    expect(sparkles()).toBe(5)
    expect(rings(GARDEN_COLORS.ringHint)).toHaveLength(1)
    expect(rings(GARDEN_COLORS.ringHint)[0].getAttribute('data-dash')).toBe('no') // không còn nét đứt
    expect(document.querySelectorAll('[data-konva="circle"][data-dash="yes"]')).toHaveLength(0)
    expect(rings(GARDEN_COLORS.ringCorrect)).toHaveLength(0)
    unmount()
    render(<BeeGardenRenderer mode="review" question={mockNumberLine10} selectedValue={7} />)
    expect(rings(GARDEN_COLORS.ringCorrect)).toHaveLength(1)
    expect(rings(GARDEN_COLORS.ringCorrect)[0].getAttribute('data-dash')).toBe('no')
  })
})

describe('tự đọc câu hỏi trong StrictMode (dev) và hoạt họa khi xem lại', () => {
  it('StrictMode chạy hiệu ứng hai lần và gỡ Howl đầu: lần đọc CUỐI phải dùng Howl mới nhất (không im lặng)', () => {
    render(
      <StrictMode>
        <BeeGardenRenderer mode="preview" question={mockNumberLineWithAudio} autoPlayAudio />
      </StrictMode>,
    )
    expect(h.events.at(-1)).toBe('play')
    expect(h.events.filter((event) => event === 'new').length).toBeGreaterThanOrEqual(2) // đã tạo lại Howl sau lần gỡ giả
    // lần đọc cuối đi ngay sau lần tạo Howl mới nhất
    expect(h.events.slice(h.events.lastIndexOf('new'))).toEqual(['new', 'play'])
  })

  it('ngoài StrictMode: tạo một Howl và đọc đúng một lần', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLineWithAudio} autoPlayAudio />)
    expect(h.events).toEqual(['new', 'play'])
  })

  it('đổi sang câu có audioUrl khác thì đọc câu mới đúng một lần nữa', () => {
    const { rerender } = render(<BeeGardenRenderer mode="preview" question={mockNumberLineWithAudio} autoPlayAudio />)
    rerender(<BeeGardenRenderer mode="preview" question={{ ...mockNumberLineWithAudio, id: 'khac', audioUrl: '/khac.wav' }} autoPlayAudio />)
    expect(h.play).toHaveBeenCalledTimes(2)
  })

  it('xem lại là cảnh tĩnh: đồng hồ hoạt họa không chạy', () => {
    render(<BeeGardenRenderer mode="review" question={mockNumberLine10} selectedValue={4} />)
    expect(h.motionEnabled.every((value) => value === false)).toBe(true)
  })
})

describe('hàng đề bài trong cảnh (bảng, huy hiệu số, nút nghe lại)', () => {
  const textSizes = (text: string) => Array.from(document.querySelectorAll<HTMLElement>('[data-konva="text"]')).filter((el) => el.textContent === text).map((el) => Number(el.getAttribute('data-size')))

  it('Mầm non có con số: huy hiệu số LỚN hiện trong cảnh, to hơn chữ đề và to hơn số trên hoa', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} ageBand="PRESCHOOL" promptNumber={7} />)
    const sizes = textSizes('7')
    expect(sizes).toContain(76) // huy hiệu (hoa 7 cỡ 44 cũng có chữ «7»)
    expect(Math.max(...sizes)).toBeGreaterThan(QUESTION_FONT_SIZE * 2)
    expect(textSizes('Đặt chú ong vào số 7')[0]).toBe(QUESTION_FONT_SIZE)
  })
  it('không có huy hiệu khi: không đưa con số, nhóm tuổi Tiểu học, hoặc xem lại bài', () => {
    const count = () => textSizes('7').filter((size) => size === 76).length
    const none = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} ageBand="PRESCHOOL" />)
    expect(count()).toBe(0)
    none.unmount()
    const grade = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} ageBand="GRADE_1_2" promptNumber={7} />)
    expect(count()).toBe(0)
    grade.unmount()
    render(<BeeGardenRenderer mode="review" question={mockNumberLine10} selectedValue={7} ageBand="PRESCHOOL" promptNumber={7} />)
    expect(count()).toBe(0)
  })
  it('chế độ chạm mà chưa nêu nhóm tuổi vẫn tính là Mầm non (có huy hiệu)', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} interactionMode="tap" promptNumber={7} />)
    expect(textSizes('7').filter((size) => size === 76)).toHaveLength(1)
  })
  it('chữ đề bài và nút nghe lại nằm trong cảnh: không còn ô đề bài rời ở trên cảnh (toàn bộ vẽ trong một Stage)', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLineWithAudio} />)
    expect(screen.getAllByText(mockNumberLineWithAudio.questionText)).toHaveLength(1)
    expect(hasKonvaText('Nghe lại')).toBe(true)
  })
  it('chạm bảng/huy hiệu không phải chạm vườn: mặt bảng nhận chạm nên vùng chạm vườn không nhận sự kiện đó', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} ageBand="PRESCHOOL" promptNumber={7} />)
    const rects = Array.from(document.querySelectorAll('[data-konva="rect"]'))
    expect(rects.some((el) => el.getAttribute('data-listening') !== 'false')).toBe(true)
  })
})

describe('gợi ý theo thời gian (AgeProfile.hintDelaySeconds)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  const hintRings = () => document.querySelectorAll(`[data-konva="circle"][data-stroke="${GARDEN_COLORS.ringHint}"]`).length
  const wait = (seconds: number) => act(() => void vi.advanceTimersByTime(seconds * 1000))

  it('chưa đủ thời gian thì chưa gợi ý; đủ thời gian không chạm gì thì hoa đáp án sáng nhẹ (đúng một hoa)', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} hintDelaySeconds={5} />)
    expect(hintRings()).toBe(0)
    wait(4.9)
    expect(hintRings()).toBe(0)
    wait(0.2)
    expect(hintRings()).toBe(1) // đúng một hoa: viền nét đứt của hoa đáp án
  })

  it('mọi thao tác (bấm mũi tên) làm gợi ý tắt và đếm lại từ đầu', () => {
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} hintDelaySeconds={5} />)
    wait(5.1)
    expect(hintRings()).toBeGreaterThan(0)
    plus() // ong bay (tween thật bị bỏ qua trong test: node không có, tới nơi ngay)
    expect(hintRings()).toBe(0)
    wait(4)
    expect(hintRings()).toBe(0)
    wait(1.2)
    expect(hintRings()).toBeGreaterThan(0)
  })

  it('không khai hintDelaySeconds hoặc null (nhóm lớn): không bao giờ gợi ý theo thời gian', () => {
    const { unmount } = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    wait(120)
    expect(hintRings()).toBe(0)
    unmount()
    render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} hintDelaySeconds={null} />)
    wait(120)
    expect(hintRings()).toBe(0)
  })

  it('play không biết con số đích (không có promptNumber): KHÔNG gợi ý, không lộ đáp án', () => {
    render(<BeeGardenRenderer mode="play" question={toStudentQuestion(mockNumberLine10)} onAnswered={async () => ({ isCorrect: true })} hintDelaySeconds={5} />)
    wait(60)
    expect(hintRings()).toBe(0)
  })

  it('play có promptNumber hợp lệ: gợi ý hoa đó; promptNumber ngoài thang thì không gợi ý', () => {
    const { unmount } = render(<BeeGardenRenderer mode="play" question={toStudentQuestion(mockNumberLine10)} onAnswered={async () => ({ isCorrect: true })} hintDelaySeconds={5} promptNumber={3} />)
    wait(5.1)
    expect(hintRings()).toBeGreaterThan(0)
    unmount()
    render(<BeeGardenRenderer mode="play" question={toStudentQuestion(mockNumberLine10)} onAnswered={async () => ({ isCorrect: true })} hintDelaySeconds={5} promptNumber={99} />)
    wait(60)
    expect(hintRings()).toBe(0)
  })

  it('xem lại không gợi ý theo thời gian (chỉ có hoa đáp án của lúc xem lại)', () => {
    render(<BeeGardenRenderer mode="review" question={mockNumberLine10} selectedValue={7} hintDelaySeconds={5} />)
    wait(60)
    expect(hintRings()).toBe(0)
  })
})

describe('chú ong dạng cutout: trạng thái nghĩ và bóng đổ', () => {
  const thinkMouth = () => Array.from(document.querySelectorAll('[data-konva="line"]')).some((el) => el.getAttribute('data-points') === '[-7,15,0,14,7,15]')
  const shadow = () => document.querySelectorAll('[data-konva="ellipse"][data-name="motion-bee-shadow"]').length

  it('chờ lâu không thao tác thì ong «nghĩ» (miệng thẳng nhỏ, bộ chuyển động nhận beeState = think); thao tác thì hết nghĩ và đếm lại', () => {
    vi.useFakeTimers()
    try {
      render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
      expect(thinkMouth()).toBe(false)
      expect(h.motionState!.beeState).toBe('idle')
      act(() => void vi.advanceTimersByTime(3900))
      expect(thinkMouth()).toBe(false)
      act(() => void vi.advanceTimersByTime(300))
      expect(thinkMouth()).toBe(true)
      expect(h.motionState!.beeState).toBe('think')
      plus() // thao tác: ong bay sang hoa kế bên (tween thật không chạy trong test nên tới nơi ngay)
      expect(thinkMouth()).toBe(false)
      act(() => void vi.advanceTimersByTime(3900))
      expect(thinkMouth()).toBe(false)
      act(() => void vi.advanceTimersByTime(300))
      expect(thinkMouth()).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
  it('đã trả lời thì không «nghĩ» nữa (đúng thì vui, sai thì ngơ ngác rồi bình thường); xem lại không nghĩ', () => {
    vi.useFakeTimers()
    try {
      const { unmount } = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
      press(CONFIRM)
      act(() => void vi.advanceTimersByTime(10000))
      expect(thinkMouth()).toBe(false)
      unmount()
      render(<BeeGardenRenderer mode="review" question={mockNumberLine10} selectedValue={7} />)
      act(() => void vi.advanceTimersByTime(10000))
      expect(thinkMouth()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
  it('có bóng đổ dưới ong khi có ong; xem lại không chọn gì (không vẽ ong) thì không có bóng', () => {
    const { unmount } = render(<BeeGardenRenderer mode="preview" question={mockNumberLine10} />)
    expect(shadow()).toBe(1)
    unmount()
    render(<BeeGardenRenderer mode="review" question={mockNumberLine10} />)
    expect(shadow()).toBe(0)
  })
})
