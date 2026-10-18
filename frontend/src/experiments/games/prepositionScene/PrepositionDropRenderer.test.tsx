import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DropSimulator } from './dropTypes'
import PrepositionSceneRenderer from './PrepositionSceneRenderer'
import { mockPrepositionOn, mockPrepositionUnder } from './prepositionFixtures'
import { computePrepositionLayout, SCENE_X } from './prepositionLayout'
import { toStudentQuestion } from './prepositionLogic'

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

const DONE = 'Done!'
const SCENE_Y = computePrepositionLayout({ hasAudio: false, instructionHeight: 40, showConfirm: true }).sceneY

const konvaTexts = (text: string) => Array.from(document.querySelectorAll<HTMLElement>('[data-konva="text"]')).filter((el) => el.textContent === text)
const press = (text: string) => fireEvent.click(konvaTexts(text)[0])
const status = () => screen.getByRole('status').textContent
const group = (name: string) => h.groups[name] as { x: number; y: number; draggable: boolean; onDragMove: (e: unknown) => void; onDragEnd: (e: unknown) => void }
/** Tâm hiện tại của vật (toạ độ cảnh) theo vị trí góc trên trái của nhóm vật. */
const itemCenter = () => ({ x: group('item').x + 50, y: group('item').y + 50 })
const ghosts = () => Array.from(document.querySelectorAll('[data-testid="rect"][data-dash="yes"]'))
/** Chạm lên cảnh tại toạ độ cảnh (x, y): đặt pointer rồi bấm vào nhãn vật mốc (nằm trong nhóm cảnh, click nổi bọt). */
const tapScene = (x: number, y: number) => {
  h.pointer = { x: SCENE_X + x, y: SCENE_Y + y }
  fireEvent.click(konvaTexts('table')[0] ?? konvaTexts('box')[0])
}

const FRAMES = [
  { x: 360, y: 40 },
  { x: 360, y: 60 },
  { x: 360, y: 90 },
  { x: 360, y: 100 },
]
/** Bộ mô phỏng giả: rơi qua FRAMES rồi nằm yên ở chỗ cuối (trên mặt bàn). Ghi lại đầu vào. */
const fakeSimulator = () => vi.fn<DropSimulator>(() => ({ frames: FRAMES, final: FRAMES[FRAMES.length - 1], settled: true }))
const stubReducedMotion = () =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => {}, removeEventListener: () => {} }))
const doneButton = () => screen.getByRole('button', { name: DONE }) as HTMLButtonElement

beforeEach(() => {
  h.groups = {}
  h.trigger.mockClear()
  h.pointer = { x: 0, y: 0 }
})
afterEach(() => vi.unstubAllGlobals())

describe('thả rơi theo vật lý (bộ mô phỏng tiêm vào)', () => {
  it('buông tay: gọi bộ mô phỏng với vật mốc, cỡ vật và chỗ buông (đã kẹp trong cảnh)', () => {
    const simulate = fakeSimulator()
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} dropSimulator={simulate} />)
    tapScene(360, 40)
    expect(simulate).toHaveBeenCalledTimes(1)
    expect(simulate).toHaveBeenCalledWith({ landmark: mockPrepositionOn.landmark, size: { width: 100, height: 100 }, start: { x: 360, y: 50 } })
  })

  it('trong lúc rơi: vật chạy theo từng khung, khóa kéo và nút «Done!»; xong thì mở lại ở chỗ nằm yên', async () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} dropSimulator={fakeSimulator()} />)
    tapScene(360, 40)
    expect(itemCenter()).toEqual(FRAMES[0])
    expect(group('item').draggable).toBe(false)
    expect(doneButton().disabled).toBe(true)
    expect(status()).toContain('is falling')
    await waitFor(() => expect(group('item').draggable).toBe(true))
    expect(itemCenter()).toEqual(FRAMES[FRAMES.length - 1])
    expect(doneButton().disabled).toBe(false)
    expect(status()).toContain('on the table')
  })

  it('đáp án chỉ phụ thuộc TOẠ ĐỘ CUỐI: buông ở gầm bàn nhưng vật nằm yên trên bàn → quy tắc ON đúng', async () => {
    const onAnswered = vi.fn()
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} dropSimulator={fakeSimulator()} onAnswered={onAnswered} />)
    tapScene(360, 290) // buông thấp, ngay trên mặt đất
    await waitFor(() => expect(group('item').draggable).toBe(true))
    act(() => press(DONE))
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1))
    expect(onAnswered).toHaveBeenCalledWith(FRAMES[FRAMES.length - 1]) // không phải chỗ buông (360, 290)
    expect(status()).toContain('Great job')
  })

  it('đúng/sai theo chỗ nằm yên: quy tắc UNDER mà vật nằm yên trên bàn → sai, chỉ chỗ đúng', async () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionUnder} dropSimulator={fakeSimulator()} />)
    tapScene(360, 290)
    await waitFor(() => expect(group('item').draggable).toBe(true))
    act(() => press(DONE))
    await waitFor(() => expect(status()).toContain('Good try'))
    expect(ghosts()).toHaveLength(1)
  })

  it('mode play: nộp đúng vị trí nằm yên, câu hỏi gửi đi vẫn không có quy tắc', async () => {
    const onAnswered = vi.fn(() => ({ isCorrect: true }))
    render(<PrepositionSceneRenderer mode="play" question={toStudentQuestion(mockPrepositionOn)} dropSimulator={fakeSimulator()} onAnswered={onAnswered} />)
    tapScene(360, 40)
    await waitFor(() => expect(group('item').draggable).toBe(true))
    act(() => press(DONE))
    await waitFor(() => expect(onAnswered).toHaveBeenCalledWith(FRAMES[FRAMES.length - 1]))
  })

  it('giảm chuyển động: nhảy thẳng tới chỗ nằm yên, không có trạng thái rơi', () => {
    stubReducedMotion()
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} dropSimulator={fakeSimulator()} />)
    tapScene(360, 40)
    expect(itemCenter()).toEqual(FRAMES[FRAMES.length - 1])
    expect(group('item').draggable).toBe(true)
    expect(status()).not.toContain('falling')
  })

  it('kết quả chỉ có một khung: đặt thẳng, không hoạt ảnh', () => {
    const simulate = vi.fn<DropSimulator>(() => ({ frames: [{ x: 300, y: 100 }], final: { x: 300, y: 100 }, settled: true }))
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} dropSimulator={simulate} />)
    tapScene(360, 40)
    expect(itemCenter()).toEqual({ x: 300, y: 100 })
    expect(group('item').draggable).toBe(true)
  })

  it('bàn phím: nút nhích chỉ dời vật (không rơi), chưa nộp được; «Let go» mới thả rồi mở lại nộp', async () => {
    const simulate = fakeSimulator()
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} dropSimulator={simulate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }))
    expect(simulate).not.toHaveBeenCalled()
    expect(itemCenter()).toEqual({ x: 130, y: 110 })
    expect(doneButton().disabled).toBe(true) // lơ lửng: chưa cho nộp
    expect(status()).toContain('Press Let go')
    fireEvent.click(screen.getByRole('button', { name: 'Let go' }))
    expect(simulate).toHaveBeenCalledWith({ landmark: mockPrepositionOn.landmark, size: { width: 100, height: 100 }, start: { x: 130, y: 110 } })
    await waitFor(() => expect(group('item').draggable).toBe(true))
    expect(doneButton().disabled).toBe(false)
  })

  it('không có nút «Let go» khi không bật vật lý', () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} />)
    expect(screen.queryByRole('button', { name: 'Let go' })).toBeNull()
  })

  it('gỡ màn giữa lúc rơi: hủy hoạt ảnh, không lỗi, không cập nhật sau khi gỡ', () => {
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} dropSimulator={fakeSimulator()} />)
    tapScene(360, 40)
    unmount()
    expect(cancel).toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    cancel.mockRestore()
    error.mockRestore()
  })

  it('hai lần chạm liên tiếp trước khi vẽ lại chỉ chạy mô phỏng một lần (khóa đồng bộ)', () => {
    const simulate = fakeSimulator()
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} dropSimulator={simulate} />)
    act(() => {
      tapScene(360, 40)
      tapScene(300, 40)
    })
    expect(simulate).toHaveBeenCalledTimes(1)
  })

  it('cha dựng lại câu hỏi (đối tượng mới, cùng nội dung) giữa lúc rơi: hoạt ảnh không bắt đầu lại', async () => {
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const simulate = fakeSimulator()
    const { rerender } = render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} dropSimulator={simulate} />)
    tapScene(360, 40)
    const before = cancel.mock.calls.length
    rerender(<PrepositionSceneRenderer mode="preview" question={structuredClone(mockPrepositionOn)} dropSimulator={simulate} />)
    expect(cancel.mock.calls.length).toBe(before) // effect rơi không chạy lại
    expect(simulate).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(group('item').draggable).toBe(true))
    expect(itemCenter()).toEqual(FRAMES[FRAMES.length - 1])
    cancel.mockRestore()
  })

  it('đổi sang câu khác giữa lúc rơi: đặt lại (vật về chỗ đầu của câu mới, không rơi tiếp)', () => {
    const { rerender } = render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} dropSimulator={fakeSimulator()} />)
    tapScene(360, 40)
    rerender(<PrepositionSceneRenderer mode="preview" question={{ ...mockPrepositionUnder, id: 'khac' }} dropSimulator={fakeSimulator()} />)
    expect(group('item').draggable).toBe(true)
    expect(itemCenter()).toEqual({ x: 110, y: 110 })
  })

  it('không có bộ mô phỏng thì vật ở nguyên chỗ buông (hành vi cũ)', () => {
    render(<PrepositionSceneRenderer mode="preview" question={mockPrepositionOn} />)
    tapScene(360, 290)
    expect(itemCenter()).toEqual({ x: 360, y: 290 })
  })
})
