import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNumberLine10 } from '../numberLineFixtures'
import { toStudentQuestion, valueToX } from '../numberLineLogic'
import BeeGardenRenderer from './BeeGardenRenderer'
import { progressSlots } from './progressSlots'
import { BEE_BOB_AMPLITUDE, BEE_TOP_EXTENT, flowerScale, GARDEN_LEFT, GARDEN_RIGHT, type GardenLayout } from './beeGardenGeometry'

interface FakeNode {
  attrs: Record<string, number>
  x: (value?: number) => number
  y: (value?: number) => number
  scaleX: (value?: number) => number
  scaleY: (value?: number) => number
  rotation: (value?: number) => number
  opacity: (value?: number) => number
}
interface FakeTween {
  node: FakeNode
  attrs: Record<string, number>
  played: boolean
  destroyed: boolean
  done: boolean
  onFinish: () => void
}

const h = vi.hoisted(() => ({
  confettiCalls: [] as unknown[][],
  t: 0,
  tRef: { current: 0 },
  reduced: false,
  trigger: vi.fn(),
  bee: undefined as Record<string, unknown> | undefined,
  gardenTap: undefined as ((event: unknown) => void) | undefined,
  count: { unlock: vi.fn(), play: vi.fn() },
  tweens: [] as unknown[],
  nodes: [] as { props: Record<string, unknown>; node: unknown }[],
}))

function makeNode(x: number, y: number, scale: number): FakeNode {
  const attrs: Record<string, number> = { x, y, scaleX: scale, scaleY: scale, rotation: 0, opacity: 1 }
  const accessor = (key: string) => (value?: number) => (value === undefined ? attrs[key] : (attrs[key] = value))
  // `cache`, `clearCache`, `getLayer`: bộ chụp ảnh đệm tĩnh (useStaticCache) gọi lúc commit.
  return { attrs, x: accessor('x'), y: accessor('y'), scaleX: accessor('scaleX'), scaleY: accessor('scaleY'), rotation: accessor('rotation'), opacity: accessor('opacity'), cache: () => undefined, clearCache: () => undefined, getLayer: () => null } as FakeNode
}

vi.mock('react-konva', () => {
  type P = Record<string, unknown> & { children?: React.ReactNode }
  const Plain = ({ children }: P) => <div>{children}</div>
  return {
    Stage: Plain,
    Layer: Plain,
    // Group giả: nếu có `ref` thì trao một node giả (x, y, scale) để chuyến bay có chỗ chạy tween.
    Group: (props: P) => {
      if (props.draggable !== undefined) h.bee = props
      const nodeRef = useRef<FakeNode | null>(null)
      if (nodeRef.current === null) nodeRef.current = makeNode(Number(props.x ?? 0), Number(props.y ?? 0), Number(props.scaleX ?? 1))
      const ref = props.ref as ((node: unknown) => void) | { current: unknown } | undefined
      // Như react-konva thật: nút được gắn vào ref lúc commit, TRƯỚC các useLayoutEffect của cha (chuyển cảnh đặt trạng thái đầu ở đó).
      useLayoutEffect(() => {
        const node = nodeRef.current
        if (!ref) return
        h.nodes.push({ props, node })
        if (typeof ref === 'function') ref(node)
        else ref.current = node
        return () => {
          if (typeof ref === 'function') ref(null)
          else ref.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [ref])
      const onClick = props.onClick as (() => void) | undefined
      return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div data-konva="group" onClick={onClick ? () => onClick() : undefined}>
          {props.children}
        </div>
      )
    },
    Rect: (props: P) => {
      if (props.onClick) h.gardenTap = props.onClick as (event: unknown) => void
      return <i data-konva="rect" />
    },
    Circle: () => <i />,
    Ellipse: () => <i />,
    Arc: () => <i />,
    Line: () => <i />,
    // Image giả: nếu có `ref` (hoa bay lên thanh tiến độ) thì trao node giả để tween có chỗ chạy.
    Image: (props: P) => {
      const nodeRef = useRef<FakeNode | null>(null)
      if (nodeRef.current === null) nodeRef.current = makeNode(Number(props.x ?? 0), Number(props.y ?? 0), 1)
      const ref = props.ref as { current: unknown } | undefined
      useEffect(() => {
        if (ref && typeof ref === 'object') ref.current = nodeRef.current
      }, [ref])
      return <i data-konva="image" />
    },
    Shape: () => null,
    Star: () => <i data-konva="star" />,
    RegularPolygon: (props: P) => <i data-testid={props.rotation === -90 ? 'arrow-left' : 'arrow-right'} />,
    Text: (props: P) => (
      <span data-konva="text" data-size={String(props.fontSize)}>
        {String(props.text)}
      </span>
    ),
  }
})
vi.mock('./gardenConfetti', () => ({
  launchConfetti: (...args: unknown[]) => h.confettiCalls.push(args),
  originOfRect: () => undefined,
}))
vi.mock('use-image', () => ({ default: () => [{}, 'loaded'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../../../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../../../feedback/useExperimentFeedback', () => ({
  useExperimentFeedback: () => ({ kind: null, runId: 0, plan: null, reducedMotion: h.reduced, trigger: h.trigger }),
}))
vi.mock('../../../feedback/FeedbackOverlay', () => ({ default: () => null }))
vi.mock('./useAnimationTime', () => ({ useAnimationTime: () => ({ t: h.t, tRef: h.tRef }) }))
vi.mock('./useCountSound', () => ({ useCountSound: () => h.count }))
vi.mock('./konvaTween', () => ({
  konvaTweenFactory: (node: FakeNode, attrs: Record<string, number>, _seconds: number, _ease: string, onFinish: () => void) => {
    const tween: FakeTween = { node, attrs: { ...attrs }, played: false, destroyed: false, done: false, onFinish }
    h.tweens.push(tween)
    return {
      play: () => {
        tween.played = true
      },
      destroy: () => {
        tween.destroyed = true
      },
    }
  },
}))

const tweens = () => h.tweens as FakeTween[]
/** Tween co giãn (squash & stretch) của chính chú ong: không phải bước bay cũng không phải hoa nảy. */
const isBeeSquash = (tween: FakeTween) => 'scaleX' in tween.attrs && h.nodes.some((entry) => entry.node === tween.node && entry.props.draggable !== undefined)
/** Hoàn tất mọi tween đang chờ (tween mới có thể sinh ra khi tween cũ xong) cho tới khi hết. */
const finishFlight = () =>
  act(() => {
    for (let i = 0; i < 500; i += 1) {
      const next = tweens().find((tween) => tween.played && !tween.destroyed && !tween.done)
      if (!next) return
      next.done = true
      for (const [key, value] of Object.entries(next.attrs)) (next.node as unknown as Record<string, (v: number) => void>)[key](value)
      next.onFinish()
    }
    throw new Error('quá nhiều tween')
  })
const xOf = (value: number) => valueToX(value, { min: 0, max: 10, step: 1 }, { left: GARDEN_LEFT, right: GARDEN_RIGHT })
const tapGarden = (x: number) =>
  act(() => h.gardenTap?.({ target: { getStage: () => ({ getRelativePointerPosition: () => ({ x, y: 0 }) }) } }))
const hasKonvaText = (text: string) => Array.from(document.querySelectorAll('[data-konva="text"]')).some((el) => el.textContent === text)
/** Số ở ô giữa (chữ cỡ 56). */
const shownValue = () => document.querySelector('[data-konva="text"][data-size="56"]')!.textContent
const xTweens = () => tweens().filter((tween) => 'x' in tween.attrs)

interface BoardOptions {
  transitions?: boolean
  exiting?: boolean
  onExited?: () => void
  promptNumber?: number
  mode?: 'tap' | 'confirm'
  onAnswered?: () => Promise<{ isCorrect: boolean; correctValue?: number }>
  progress?: { total: number; earned: (boolean | undefined)[]; current: number }
  ageBand?: 'PRESCHOOL' | 'GRADE_1_2' | 'GRADE_3_5'
  onLayout?: (layout: GardenLayout) => void
}

function renderBoard(options: BoardOptions = {}) {
  const onAnswered = vi.fn(options.onAnswered ?? (async () => ({ isCorrect: true, correctValue: 7 })))
  const view = render(
    <BeeGardenRenderer mode="play" question={toStudentQuestion(mockNumberLine10)} onAnswered={onAnswered} interactionMode={options.mode} progress={options.progress} ageBand={options.ageBand} onLayout={options.onLayout} transitions={options.transitions} exiting={options.exiting} onExited={options.onExited} promptNumber={options.promptNumber} />,
  )
  const rerenderWith = (progress: BoardOptions['progress'], extra: Partial<BoardOptions> = {}) =>
    view.rerender(
      <BeeGardenRenderer mode="play" question={toStudentQuestion(mockNumberLine10)} onAnswered={onAnswered} interactionMode={options.mode} progress={progress} ageBand={options.ageBand} onLayout={options.onLayout} transitions={options.transitions} exiting={extra.exiting ?? options.exiting} onExited={options.onExited} promptNumber={options.promptNumber} />,
    )
  return { onAnswered, rerenderWith, ...view }
}

beforeEach(() => {
  h.confettiCalls = []
  h.t = 0
  h.tRef.current = 0
  h.reduced = false
  h.bee = undefined
  h.gardenTap = undefined
  h.trigger.mockClear()
  h.count.unlock.mockClear()
  h.count.play.mockClear()
  h.tweens = []
  h.nodes = []
})

describe('BeeGardenRenderer: chế độ chạm (Mầm non)', () => {
  it('không còn mũi tên, ô số và nút «Xong rồi!» trên canvas', () => {
    renderBoard({ mode: 'tap' })
    expect(screen.queryByTestId('arrow-left')).toBeNull()
    expect(screen.queryByTestId('arrow-right')).toBeNull()
    expect(hasKonvaText('Xong rồi!')).toBe(false)
  })

  it('chạm một bông hoa: ong bay qua từng hoa (không nộp ngay), tới nơi mới chấm với đúng giá trị của hoa đó', async () => {
    const { onAnswered } = renderBoard({ mode: 'tap' })
    tapGarden(xOf(7))
    expect(h.count.unlock).toHaveBeenCalledTimes(1)
    expect(onAnswered).not.toHaveBeenCalled()
    expect(xTweens().map((tween) => tween.attrs.x)).toEqual([xOf(1)]) // mới bước đầu
    finishFlight()
    expect(xTweens().map((tween) => tween.attrs.x)).toEqual([1, 2, 3, 4, 5, 6, 7].map(xOf))
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1))
    expect(onAnswered).toHaveBeenCalledWith(7)
  })

  it('mỗi bông hoa ong đi qua kêu một nốt theo thứ tự vạch và nảy lên một lần', () => {
    renderBoard({ mode: 'tap' })
    tapGarden(xOf(3))
    finishFlight()
    expect(h.count.play.mock.calls).toEqual([[1, 11], [2, 11], [3, 11]])
    const bounces = tweens().filter((tween) => 'scaleX' in tween.attrs && !isBeeSquash(tween))
    // mỗi hoa: một tween nảy lên + một tween trở về
    expect(bounces).toHaveLength(6)
  })

  it('chạm thêm khi ong đang bay thì bị bỏ qua: không bay lại, không nộp hai lần', async () => {
    const { onAnswered } = renderBoard({ mode: 'tap' })
    tapGarden(xOf(5))
    tapGarden(xOf(2))
    expect(xTweens()).toHaveLength(1)
    finishFlight()
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1))
    expect(onAnswered).toHaveBeenCalledWith(5)
  })

  it('chạm đúng chỗ ong đang đứng: chấm ngay, không có tween', async () => {
    const { onAnswered } = renderBoard({ mode: 'tap' })
    tapGarden(xOf(0))
    expect(tweens()).toHaveLength(0)
    await waitFor(() => expect(onAnswered).toHaveBeenCalledWith(0))
  })

  it('giảm chuyển động: nhảy thẳng tới hoa, không tween, chỉ kêu nốt hoa cuối, chấm ngay', async () => {
    h.reduced = true
    const { onAnswered } = renderBoard({ mode: 'tap' })
    tapGarden(xOf(7))
    expect(tweens()).toHaveLength(0)
    expect(h.count.play.mock.calls).toEqual([[7, 11]])
    await waitFor(() => expect(onAnswered).toHaveBeenCalledWith(7))
  })

  it('đóng màn giữa chuyến bay: hủy tween và không chấm nữa', () => {
    const { onAnswered, unmount } = renderBoard({ mode: 'tap' })
    tapGarden(xOf(7))
    unmount()
    expect(tweens().every((tween) => tween.destroyed)).toBe(true)
    act(() => {
      for (const tween of tweens()) tween.onFinish()
    })
    expect(onAnswered).not.toHaveBeenCalled()
  })

  it('thả ong vào hoa (kéo) cũng chấm luôn', async () => {
    const { onAnswered } = renderBoard({ mode: 'tap' })
    const onDragEnd = h.bee!.onDragEnd as (event: unknown) => void
    act(() => onDragEnd({ target: { x: () => xOf(4) } }))
    await waitFor(() => expect(onAnswered).toHaveBeenCalledWith(4))
  })

  it('đang bay thì ong không kéo được (không có trạng thái «khóa» khó hiểu khi chưa bay)', () => {
    renderBoard({ mode: 'tap' })
    expect(h.bee!.draggable).toBe(true)
    tapGarden(xOf(5))
    expect(h.bee!.draggable).toBe(false)
    finishFlight()
  })
})

describe('BeeGardenRenderer: chế độ xác nhận (Tiểu học, mặc định)', () => {
  it('vẫn có mũi tên, ô số và nút «Xong rồi!»', () => {
    renderBoard()
    expect(screen.getByTestId('arrow-left')).toBeTruthy()
    expect(screen.getByTestId('arrow-right')).toBeTruthy()
    expect(hasKonvaText('Xong rồi!')).toBe(true)
  })

  it('chạm hoa: ong bay tới đó nhưng KHÔNG chấm; bấm «Xong rồi!» mới nộp giá trị đã chọn', async () => {
    const { onAnswered } = renderBoard()
    tapGarden(xOf(3))
    finishFlight()
    expect(onAnswered).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Xong rồi!' }))
    await waitFor(() => expect(onAnswered).toHaveBeenCalledWith(3))
  })

  it('bấm «Xong rồi!» lúc ong còn đang bay: chưa nộp (không nộp nhầm số cũ); ong tới nơi rồi bấm mới nộp đúng hoa vừa chọn', async () => {
    const { onAnswered } = renderBoard()
    tapGarden(xOf(5))
    fireEvent.click(screen.getByRole('button', { name: 'Xong rồi!' })) // ong vừa cất cánh
    expect(onAnswered).not.toHaveBeenCalled()
    finishFlight()
    fireEvent.click(screen.getByRole('button', { name: 'Xong rồi!' }))
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1))
    expect(onAnswered).toHaveBeenCalledWith(5)
  })

  it('bấm mũi tên: ong bay sang hoa kế bên và kêu nốt của hoa đó', () => {
    renderBoard()
    fireEvent.click(screen.getByTestId('arrow-right'))
    finishFlight()
    expect(xTweens().map((tween) => tween.attrs.x)).toEqual([xOf(1)])
    expect(h.count.play.mock.calls).toEqual([[1, 11]])
  })

  it('số ở ô giữa đếm theo từng hoa trong lúc ong bay', () => {
    renderBoard()
    tapGarden(xOf(2))
    // hoàn tất đúng một bước bay đầu rồi kiểm số
    act(() => {
      for (let i = 0; i < 3; i += 1) {
        const next = tweens().find((tween) => tween.played && !tween.destroyed && !tween.done && !isBeeSquash(tween))
        if (!next) break
        next.done = true
        for (const [key, value] of Object.entries(next.attrs)) (next.node as unknown as Record<string, (v: number) => void>)[key](value)
        next.onFinish()
      }
    })
    expect(shownValue()).toBe('1')
    finishFlight()
    expect(shownValue()).toBe('2')
  })
})

describe('BeeGardenRenderer: phản hồi sau khi chấm', () => {
  // hoa tỉ lệ cơ sở: 11 vạch → flowerScale(11)
  const base = flowerScale(11)

  it('đúng: hoa được chọn «nở» to (1,5 lần cỡ gốc, chậm hơn nảy thường) rồi về cỡ gốc', async () => {
    renderBoard({ mode: 'tap' })
    tapGarden(xOf(2))
    finishFlight()
    await waitFor(() => expect(tweens().some((tween) => tween.attrs.scaleX === base * 1.5)).toBe(true))
    expect(tweens().filter((tween) => tween.attrs.scaleX === base * 1.5)).toHaveLength(1)
  })

  it('sai: lắc đầu, chớp mắt, rồi (không quay về 0 ngay) ong lướt về hoa 0 và đếm 0 → số đúng, mỗi hoa một nốt cao dần; không hoa nào nở to 1,5 lần', async () => {
    vi.useFakeTimers()
    try {
      const { onAnswered } = renderBoard({ mode: 'tap', onAnswered: async () => ({ isCorrect: false, correctValue: 4 }) })
      tapGarden(xOf(3))
      finishFlight()
      await act(async () => {
        await Promise.resolve()
      })
      expect(onAnswered).toHaveBeenCalledWith(3)
      const flightPlayed = () => xTweens().length
      const before = flightPlayed()
      h.count.play.mockClear()
      // Đang lắc đầu rồi chớp mắt (tới 1,1 + 1 + 0,3 giây): ong đứng yên, KHÔNG bay về 0 ngay.
      act(() => void vi.advanceTimersByTime(2000))
      expect(flightPlayed()).toBe(before)
      // Sau nhịp chờ ngắn thì lướt về hoa 0 (một bước dài), rồi đếm lên.
      act(() => void vi.advanceTimersByTime(700))
      const glide = xTweens().slice(before)[0]
      expect(glide.attrs.x).toBe(xOf(0))
      finishFlight()
      expect(xTweens().slice(before).map((tween) => tween.attrs.x)).toEqual([0, 1, 2, 3, 4].map(xOf))
      expect(h.count.play.mock.calls.map((call) => call[0])).toEqual([0, 1, 2, 3, 4]) // nốt đếm theo vạch 0 → 4
      expect(tweens().some((tween) => tween.attrs.scaleX === base * 1.5)).toBe(false) // không hoa nào «nở» như khi đúng
    } finally {
      vi.useRealTimers()
    }
  })

  it('sai mà cha không báo số đúng: chỉ lắc đầu và chớp mắt, ong không bay thêm', async () => {
    vi.useFakeTimers()
    try {
      renderBoard({ mode: 'tap', onAnswered: async () => ({ isCorrect: false }) })
      tapGarden(xOf(3))
      finishFlight()
      await act(async () => {
        await Promise.resolve()
      })
      const before = xTweens().length
      act(() => void vi.advanceTimersByTime(5000))
      expect(xTweens().length).toBe(before)
    } finally {
      vi.useRealTimers()
    }
  })

  it('đóng màn trước khi phản hồi sai kịp chạy: hủy hẹn giờ, không nảy hoa nào nữa', async () => {
    vi.useFakeTimers()
    try {
      const { unmount } = renderBoard({ mode: 'tap', onAnswered: async () => ({ isCorrect: false, correctValue: 7 }) })
      tapGarden(xOf(3))
      finishFlight()
      await act(async () => {
        await Promise.resolve()
      })
      unmount()
      const count = tweens().length
      act(() => void vi.advanceTimersByTime(2000))
      expect(tweens()).toHaveLength(count)
    } finally {
      vi.useRealTimers()
    }
  })

  it('giảm chuyển động: không nở hoa, không nảy hoa nào', async () => {
    h.reduced = true
    const { onAnswered } = renderBoard({ mode: 'tap' })
    tapGarden(xOf(7))
    await waitFor(() => expect(onAnswered).toHaveBeenCalled())
    expect(tweens()).toHaveLength(0)
  })
})

describe('BeeGardenRenderer: trần độ cao của chú ong', () => {
  it('đỉnh cung bay (y của tween «lên») không bao giờ đưa đỉnh ong lên quá trần dưới hàng đề bài, ở cả Mầm non (nút nghe lại to) lẫn Tiểu học', () => {
    for (const [mode, band] of [['tap', 'PRESCHOOL'], ['confirm', 'GRADE_1_2']] as const) {
      h.tweens = []
      let layout: GardenLayout | undefined
      const view = renderBoard({ mode, ageBand: band, onLayout: (value) => (layout = value) })
      tapGarden(xOf(4))
      const yTweens = tweens().filter((tween) => 'y' in tween.attrs)
      expect(yTweens.length).toBeGreaterThan(0)
      const lowestY = Math.min(...yTweens.map((tween) => tween.attrs.y))
      // đỉnh ong = y - phần cao nhất của ong; nhún thêm tối đa BEE_BOB_AMPLITUDE
      expect(lowestY - BEE_BOB_AMPLITUDE - BEE_TOP_EXTENT, band).toBeGreaterThanOrEqual(layout!.beeCeilingY - 1e-9)
      expect(lowestY).toBeLessThanOrEqual(layout!.beeY)
      view.unmount()
    }
  })
})

describe('BeeGardenRenderer: hoa bay lên thanh tiến độ', () => {
  const progress = (earned: (boolean | undefined)[]) => ({ total: 5, earned, current: 0 })
  const slotX = () => {
    let layout: GardenLayout | undefined
    renderBoard({ onLayout: (value) => (layout = value) }).unmount()
    return progressSlots(layout!.progress, 5).centers[0]
  }

  it('đúng ngay lần đầu: một bông hoa bay lên ô của câu này (tween x tới tâm ô); trả lời sai hoặc không được tính thì KHÔNG bay', async () => {
    vi.useFakeTimers()
    try {
    const targetX = slotX()
    h.tweens = []
    const right = renderBoard({ mode: 'tap', progress: progress([]) })
    tapGarden(xOf(3))
    finishFlight()
    await act(async () => {
      await Promise.resolve()
    })
    act(() => void vi.advanceTimersByTime(700)) // sau nhịp chờ (hoa nở, pháo) bông hoa nhỏ mới bay lên thanh
    expect(xTweens().some((tween) => tween.attrs.x === targetX)).toBe(false) // chưa được tính (Lab chưa báo đúng ngay lần đầu)
    right.rerenderWith(progress([true]))
    expect(xTweens().some((tween) => tween.attrs.x === targetX)).toBe(true)
    right.unmount()

    h.tweens = []
    const retry = renderBoard({ mode: 'tap', progress: progress([]) })
    tapGarden(xOf(3))
    finishFlight()
    await act(async () => {
      await Promise.resolve()
    })
    act(() => void vi.advanceTimersByTime(700))
    retry.rerenderWith(progress([false])) // đúng ở lần thử lại: không được sao
    expect(xTweens().some((tween) => tween.attrs.x === targetX)).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('giảm chuyển động: không có hoa bay (ô nở ngay)', async () => {
    h.reduced = true
    const targetX = slotX()
    h.tweens = []
    const view = renderBoard({ mode: 'tap', progress: progress([]) })
    tapGarden(xOf(3))
    finishFlight()
    await act(async () => {
      await Promise.resolve()
    })
    view.rerenderWith(progress([true]))
    expect(xTweens().some((tween) => tween.attrs.x === targetX)).toBe(false)
  })
})

describe('BeeGardenRenderer: chuyển cảnh vào và rời câu', () => {
  it('mặc định KHÔNG có chuyển cảnh: không có tween nào lúc gắn, chạm được ngay', () => {
    renderBoard({ mode: 'tap' })
    expect(tweens()).toHaveLength(0)
    tapGarden(xOf(2))
    expect(xTweens().length).toBeGreaterThan(0)
  })

  it('bật chuyển cảnh: lúc vào bảng rơi (tween y về 0, bounce), ong bay vào đúng chỗ nghỉ; chạm giữa chừng BỎ QUA phần mở màn (không mất lượt chạm) rồi ong bay tới hoa đã chạm', () => {
    vi.useFakeTimers()
    try {
    renderBoard({ mode: 'tap', transitions: true, promptNumber: 3, ageBand: 'PRESCHOOL' })
    const sign = tweens().find((tween) => tween.attrs.opacity === 1 && tween.attrs.y === 0)
    expect(sign).toBeTruthy()
    const beeEnter = tweens().find((tween) => 'x' in tween.attrs)!
    expect(beeEnter.attrs.x).toBe(xOf(0)) // ong về chỗ nghỉ (hoa đầu)
    const enterTweens = tweens().slice()
    tapGarden(xOf(5)) // đang vào câu: chạm bỏ qua phần mở màn
    expect(enterTweens.every((tween) => tween.destroyed)).toBe(true) // cảnh vào bị hủy
    expect(xTweens().some((tween) => tween.attrs.x === xOf(1))).toBe(true) // và ong bay hop đầu tới hoa đã chạm (không mất lượt chạm)
    expect(h.count.unlock).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('giảm chuyển động: không có chuyển cảnh dù được bật', () => {
    h.reduced = true
    renderBoard({ mode: 'tap', transitions: true })
    expect(tweens()).toHaveLength(0)
  })

  it('exiting: diễn cảnh rời (bảng bay lên, ong bay ra mép phải) rồi báo onExited đúng một lần; chưa xong thì chưa báo', () => {
    const onExited = vi.fn()
    vi.useFakeTimers()
    try {
    const view = renderBoard({ mode: 'tap', transitions: true, onExited, promptNumber: 3, ageBand: 'PRESCHOOL' })
    act(() => void vi.advanceTimersByTime(200))
    finishFlight() // xong cảnh vào
    h.tweens = []
    view.rerenderWith(undefined, { exiting: true })
    expect(onExited).not.toHaveBeenCalled()
    expect(tweens().some((tween) => tween.attrs.opacity === 0)).toBe(true) // bảng mờ đi
    const out = xTweens().find((tween) => tween.attrs.x > 800)
    expect(out).toBeTruthy() // ong ra ngoài mép phải sân
    finishFlight()
    expect(onExited).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('exiting mà không có chuyển cảnh (tắt hoặc giảm chuyển động): báo onExited ngay, không đợi gì', () => {
    const onExited = vi.fn()
    const view = renderBoard({ mode: 'tap', onExited })
    view.rerenderWith(undefined, { exiting: true })
    expect(onExited).toHaveBeenCalledTimes(1)
    const reducedExit = vi.fn()
    h.reduced = true
    const second = renderBoard({ mode: 'tap', transitions: true, onExited: reducedExit })
    second.rerenderWith(undefined, { exiting: true })
    expect(reducedExit).toHaveBeenCalledTimes(1)
  })

  it('đóng màn giữa lúc rời câu: hủy kịch bản, không báo onExited muộn', () => {
    const onExited = vi.fn()
    const view = renderBoard({ mode: 'tap', transitions: true, onExited, promptNumber: 3, ageBand: 'PRESCHOOL' })
    finishFlight()
    view.rerenderWith(undefined, { exiting: true })
    view.unmount()
    finishFlight()
    expect(onExited).not.toHaveBeenCalled()
  })
})
