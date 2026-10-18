import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNumberLine10, mockNumberLineEstimate, mockNumberLineWithAudio } from '../../games/numberLine/numberLineFixtures'
import { LINE_LEFT, LINE_RIGHT } from '../../games/numberLine/numberLineLayout'
import { toStudentQuestion } from '../../games/numberLine/numberLineLogic'
import type { NumberLineAnswerResult } from '../../games/numberLine/numberLineTypes'
import ThemeProvider from '../../theme/ThemeProvider'
import { spaceTheme } from '../../theme/themes/space'
import { control, Graphics, Rectangle, Text } from './fakePixi'
import { hexToNumber } from './pixiColors'
import PixiNumberLineRenderer from './PixiNumberLineRenderer'

vi.mock('pixi.js', () => import('./fakePixi'))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
const h = vi.hoisted(() => ({ trigger: vi.fn() }))
vi.mock('../../feedback/useExperimentFeedback', () => ({
  useExperimentFeedback: () => ({ kind: null, runId: 0, plan: null, reducedMotion: false, trigger: h.trigger }),
}))

const DONE = 'Xong rồi!'
const xOf = (value: number) => LINE_LEFT + (value / 10) * (LINE_RIGHT - LINE_LEFT)

beforeEach(() => {
  control.reset()
  h.trigger.mockClear()
})

/** Dựng và chờ Pixi giả khởi tạo xong (init là Promise). */
async function mount(ui: React.ReactElement) {
  const result = render(ui)
  await act(async () => {})
  return result
}
const app = () => control.apps[control.apps.length - 1]
const target = (label: string) => window.__pixiHarness!.getTargets().targets.find((t) => t.label === label)!
const labels = () => window.__pixiHarness!.getTargets().targets.map((t) => t.label)
const slider = () => screen.getByLabelText('Số trên trục') as HTMLInputElement
const status = () => screen.getByRole('status').textContent
const sceneNodes = () => app().stage.children[0].children as unknown as Array<Graphics | Text>
const texts = () => sceneNodes().filter((n): n is Text => n instanceof Text).map((n) => n.text)
const emit = (type: string, x: number, y: number) => act(() => app().stage.emit(type, { global: { x, y } }))
const click = (label: string) => {
  const t = target(label)
  emit('pointerdown', t.cx, t.cy)
  emit('pointerup', t.cx, t.cy)
}
/** Số hiện ở ô giữa (chữ cỡ 56): khác nhãn trên trục, nên chứng minh được số đổi theo tay. */
const valueText = () => (sceneNodes().find((n) => n instanceof Text && n.style?.options.fontSize === 56) as Text).text
const arcCount = () => sceneNodes().reduce((n, node) => n + (node instanceof Graphics ? node.ops.filter((o) => o[0] === 'arc').length : 0), 0)

describe('khởi tạo và vòng đời', () => {
  it('tạo ứng dụng Pixi với nền trong suốt, gắn canvas vào khung, bật nhận con trỏ và vùng nhận phủ cả sân', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    const a = app()
    expect(control.apps).toHaveLength(1)
    expect(a.initOptions).toMatchObject({ width: 800, backgroundAlpha: 0, antialias: true, autoDensity: true })
    expect(document.querySelector('[data-engine="pixi"] canvas')).toBe(a.canvas)
    expect(a.stage.eventMode).toBe('static')
    expect(a.stage.hitArea).toBeInstanceOf(Rectangle)
    expect((a.stage.hitArea as Rectangle).width).toBe(800)
    expect(a.renderer.resize).toHaveBeenCalledWith(800, expect.any(Number))
    expect(texts()).toContain('Đặt chú ong vào số 7')
  })

  it('«vẽ khi cần»: tắt ticker (autoStart false) và tự gọi render sau mỗi cập nhật; «liên tục»: để ticker chạy, không tự render', async () => {
    const { unmount } = await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} renderMode="on-demand" />)
    expect(app().initOptions?.autoStart).toBe(false)
    const before = app().render.mock.calls.length
    expect(before).toBeGreaterThan(0)
    click('plus')
    expect(app().render.mock.calls.length).toBeGreaterThan(before)
    unmount()
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} renderMode="continuous" />)
    expect(app().initOptions?.autoStart).toBe(true)
    click('plus')
    expect(app().render).not.toHaveBeenCalled()
  })

  it('gỡ SAU khi khởi tạo xong: hủy ứng dụng (kèm con), gỡ tín hiệu đo', async () => {
    const { unmount } = await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    const a = app()
    expect(window.__pixiHarness).toBeDefined()
    unmount()
    expect(a.destroyed).toBe(true)
    expect(a.destroyArgs).toEqual([true, { children: true }])
    expect(window.__pixiHarness).toBeUndefined()
    expect(a.postrenderListeners.size).toBe(0)
  })

  it('gỡ TRƯỚC khi khởi tạo xong (đổi câu nhanh, StrictMode): khi init xong thì hủy ngay, không gắn canvas, không để lại tín hiệu', async () => {
    control.holdInit = true
    const { unmount } = render(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    const a = app()
    unmount()
    expect(a.destroyed).toBe(false) // chưa khởi tạo xong thì chưa hủy được
    await act(async () => control.releaseInit.forEach((release) => release()))
    expect(a.destroyed).toBe(true)
    expect(document.querySelector('canvas')).toBeNull()
    expect(window.__pixiHarness).toBeUndefined()
  })

  it('đổi chế độ vẽ thì dựng ứng dụng mới và hủy ứng dụng cũ', async () => {
    const { rerender } = await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} renderMode="on-demand" />)
    const first = app()
    rerender(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} renderMode="continuous" />)
    await act(async () => {})
    expect(first.destroyed).toBe(true)
    expect(control.apps).toHaveLength(2)
    expect(document.querySelectorAll('[data-engine="pixi"] canvas')).toHaveLength(1)
  })

  it('tín hiệu đo: đếm số lần vẽ (postrender) và báo vùng chạm cùng dạng bộ đọc Konva', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(window.__pixiHarness!.renders()).toBe(0)
    act(() => app().postrenderListeners.forEach((l) => l.postrender()))
    act(() => app().postrenderListeners.forEach((l) => l.postrender()))
    expect(window.__pixiHarness!.renders()).toBe(2)
    const info = window.__pixiHarness!.getTargets()
    expect(info.scale).toBe(1)
    expect(info.targets.find((t) => t.label === 'marker')).toMatchObject({ draggable: true, width: 72, height: 72 })
    expect(info.targets.find((t) => t.label === 'plus')!.draggable).toBe(false)
  })

  it('có nút nghe lại khi có âm thanh (vùng chạm audio); không có thì không', async () => {
    const { unmount } = await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLineWithAudio} />)
    expect(labels()).toContain('audio')
    expect(texts()).toContain('🔊 Nghe lại')
    unmount()
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(labels()).not.toContain('audio')
  })
})

describe('bắt chạm bằng con trỏ', () => {
  it('+ và − đổi một vạch; nhả ra ngoài nút thì không tính', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    click('plus')
    click('plus')
    expect(slider().value).toBe('2')
    click('minus')
    expect(slider().value).toBe('1')
    const plus = target('plus')
    emit('pointerdown', plus.cx, plus.cy)
    emit('pointerup', 5, 5) // nhả ở chỗ khác
    expect(slider().value).toBe('1')
  })

  it('đầu thang: − không có vùng chạm; chạm vào chỗ đó không đổi gì', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(labels()).not.toContain('minus')
    expect(slider().value).toBe('0')
  })

  it('chạm lên dải đặt điểm vào vạch gần nhất (kể cả lệch nhẹ)', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    const band = target('band')
    emit('pointerdown', xOf(7) + 12, band.cy)
    emit('pointerup', xOf(7) + 12, band.cy)
    expect(slider().value).toBe('7')
  })

  it('kéo điểm: số hiện theo tay, nhả mới chốt; kéo ra ngoài đường bị kẹp ở hai đầu', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    const marker = target('marker')
    emit('pointerdown', marker.cx, marker.cy)
    emit('pointermove', xOf(4) + 10, marker.cy)
    expect(valueText()).toBe('4')
    expect(slider().value).toBe('0') // chưa chốt
    emit('pointerup', xOf(4) + 10, marker.cy)
    expect(slider().value).toBe('4')
    // kéo xa ra ngoài
    const again = target('marker')
    emit('pointerdown', again.cx, again.cy)
    emit('pointermove', 99999, again.cy)
    emit('pointerupoutside', 99999, again.cy)
    expect(slider().value).toBe('10')
    const low = target('marker')
    emit('pointerdown', low.cx, low.cy)
    emit('pointermove', -99999, low.cy)
    emit('pointerup', -99999, low.cy)
    expect(slider().value).toBe('0')
  })

  it('đang kéo ra ngoài đường: điểm vẽ bị kẹp ở đầu đường (không chạy ra khỏi dải)', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    const markerX = () => {
      const g = sceneNodes().find((n) => n instanceof Graphics && n.ops[0]?.[0] === 'circle' && n.ops[0][3] === 36) as Graphics
      return g.ops[0][1]
    }
    const marker = target('marker')
    emit('pointerdown', marker.cx, marker.cy)
    emit('pointermove', 99999, marker.cy)
    expect(markerX()).toBe(LINE_RIGHT)
    emit('pointermove', -99999, marker.cy)
    expect(markerX()).toBe(LINE_LEFT)
    emit('pointerup', -99999, marker.cy)
  })

  it('di chuyển con trỏ khi không kéo thì không làm gì', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    emit('pointermove', xOf(8), 300)
    expect(slider().value).toBe('0')
  })

  it('chạm ngoài mọi vùng thì không làm gì', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    emit('pointerdown', 2, 2)
    emit('pointerup', 2, 2)
    expect(slider().value).toBe('0')
  })

  it('hủy sạch trình xử lý khi gỡ (không rò rỉ sang lần dựng sau)', async () => {
    const { unmount } = await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    const stage = app().stage
    expect(stage.handlerCount('pointerdown')).toBe(1)
    unmount()
    expect(stage.handlerCount('pointerdown')).toBe(0)
    expect(stage.handlerCount('pointerup')).toBe(0)
    expect(stage.handlerCount('pointermove')).toBe(0)
    expect(stage.handlerCount('pointerupoutside')).toBe(0)
  })
})

describe('tỉ lệ co và toạ độ con trỏ', () => {
  it('khung hẹp (400px): sân co 0,5; vùng chạm đo bằng px màn hình; chạm theo px vẫn trúng đúng nút', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400)
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    const info = window.__pixiHarness!.getTargets()
    expect(info.scale).toBe(0.5)
    expect(app().stage.scale.x).toBe(0.5)
    expect(app().renderer.resize).toHaveBeenLastCalledWith(400, expect.any(Number))
    expect(info.targets.find((t) => t.label === 'marker')).toMatchObject({ width: 36, height: 36 }) // 72 × 0,5
    click('plus') // toạ độ toàn cục = px màn hình; toLocal chia cho tỉ lệ
    click('plus')
    expect(slider().value).toBe('2')
    const band = target('band')
    emit('pointerdown', xOf(7) * 0.5, band.cy)
    emit('pointerup', xOf(7) * 0.5, band.cy)
    expect(slider().value).toBe('7')
    vi.restoreAllMocks()
  })
})

describe('lỗi và hủy giữa chừng', () => {
  it('khởi tạo Pixi lỗi (không có WebGL): báo lỗi rõ, không vỡ, thanh trượt vẫn dùng được', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    control.failInit = true
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(screen.getByRole('alert').textContent).toContain('Không khởi tạo được đồ họa Pixi')
    expect(error).toHaveBeenCalled()
    expect(app().destroyed).toBe(true)
    expect(window.__pixiHarness).toBeUndefined()
    expect(document.querySelector('canvas')).toBeNull()
    fireEvent.change(slider(), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: DONE }))
    expect(status()).toBe('Đúng rồi!')
    error.mockRestore()
  })

  it('hệ thống hủy con trỏ giữa lúc kéo: bỏ cử chỉ, không chốt giá trị, các lần di chuyển sau không kéo nữa', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    const marker = target('marker')
    emit('pointerdown', marker.cx, marker.cy)
    emit('pointermove', xOf(6), marker.cy)
    expect(valueText()).toBe('6')
    emit('pointercancel', 0, 0)
    expect(valueText()).toBe('0') // điểm trở về vạch đã chốt
    expect(slider().value).toBe('0')
    emit('pointermove', xOf(9), marker.cy)
    expect(valueText()).toBe('0')
    emit('pointerup', xOf(9), marker.cy)
    expect(slider().value).toBe('0')
  })

  it('tín hiệu đo có tên bộ vẽ; gỡ không xóa nhầm tín hiệu của renderer khác', async () => {
    const { unmount } = await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(window.__pixiHarness!.renderer).toBe('webgl')
    const other = { renderer: 'khác', renders: () => 0, getTargets: () => ({ targets: [], scale: 1 }) }
    window.__pixiHarness = other
    unmount()
    expect(window.__pixiHarness).toBe(other)
    delete window.__pixiHarness
  })
})

describe('preview', () => {
  it('đúng: chấm cục bộ, điểm xanh, không còn vùng chạm, trình đọc màn hình được báo', async () => {
    const onAnswered = vi.fn()
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} onAnswered={onAnswered} />)
    fireEvent.change(slider(), { target: { value: '7' } })
    click('confirm')
    expect(onAnswered).toHaveBeenCalledWith(7)
    expect(h.trigger).toHaveBeenCalledWith('correct')
    expect(status()).toBe('Đúng rồi!')
    expect(labels()).toEqual([])
    expect(slider().disabled).toBe(true)
  })

  it('sai: phản hồi nhẹ, hiện vòng nét đứt ở vạch đúng và báo số đúng', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(arcCount()).toBe(0)
    fireEvent.change(slider(), { target: { value: '3' } })
    click('confirm')
    expect(h.trigger).toHaveBeenCalledWith('tryAgain')
    expect(status()).toBe('Gần đúng rồi. Số đúng là 7.')
    expect(arcCount()).toBeGreaterThan(10)
  })

  it('đặt đúng thì KHÔNG hiện vòng chỉ chỗ đúng', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    fireEvent.change(slider(), { target: { value: '7' } })
    click('confirm')
    expect(arcCount()).toBe(0)
  })

  it('độ lệch cho phép: lệch một vạch vẫn đúng', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLineEstimate} />)
    fireEvent.change(slider(), { target: { value: '80' } })
    click('confirm')
    expect(h.trigger).toHaveBeenCalledWith('correct')
  })

  it('chỉ chấm một lần dù chạm xác nhận hai lần sát nhau', async () => {
    const onAnswered = vi.fn()
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} onAnswered={onAnswered} />)
    const confirm = target('confirm')
    act(() => {
      app().stage.emit('pointerdown', { global: { x: confirm.cx, y: confirm.cy } })
      app().stage.emit('pointerup', { global: { x: confirm.cx, y: confirm.cy } })
      app().stage.emit('pointerdown', { global: { x: confirm.cx, y: confirm.cy } })
      app().stage.emit('pointerup', { global: { x: confirm.cx, y: confirm.cy } })
    })
    expect(onAnswered).toHaveBeenCalledTimes(1)
  })

  it('onAnswered ném lỗi đồng bộ thì không làm vỡ màn', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await mount(
      <PixiNumberLineRenderer
        mode="preview"
        question={mockNumberLine10}
        onAnswered={() => {
          throw new Error('boom')
        }}
      />,
    )
    click('confirm')
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(status()).toContain('Gần đúng rồi')
    error.mockRestore()
  })

  it('lối thay thế bàn phím: thanh trượt và nút DOM cùng một trạng thái', async () => {
    await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    fireEvent.change(slider(), { target: { value: '7' } })
    expect(valueText()).toBe('7')
    fireEvent.click(screen.getByRole('button', { name: DONE }))
    expect(status()).toBe('Đúng rồi!')
  })

  it('sửa nội dung câu mà giữ nguyên id thì dựng lại từ đầu', async () => {
    const { rerender } = await mount(<PixiNumberLineRenderer mode="preview" question={{ ...mockNumberLine10, max: 20, startValue: 15 }} />)
    expect(slider().value).toBe('15')
    rerender(<PixiNumberLineRenderer mode="preview" question={{ ...mockNumberLine10, max: 10, startValue: 5 }} />)
    await act(async () => {})
    expect(slider().value).toBe('5')
  })
})

describe('play', () => {
  const student = toStudentQuestion(mockNumberLine10)

  it('nộp giá trị đã chọn; đúng/sai do cha quyết định, renderer không tự chấm', async () => {
    const onAnswered = vi.fn(async (): Promise<NumberLineAnswerResult> => ({ isCorrect: false, correctValue: 7 }))
    await mount(<PixiNumberLineRenderer mode="play" question={student} onAnswered={onAnswered} />)
    fireEvent.change(slider(), { target: { value: '7' } }) // trùng đáp án thật nhưng cha nói sai
    click('confirm')
    expect(texts()).toContain('Đang chấm…')
    await waitFor(() => expect(status()).toBe('Gần đúng rồi. Số đúng là 7.'))
    expect(onAnswered).toHaveBeenCalledWith(7)
    expect(h.trigger).toHaveBeenCalledWith('tryAgain')
  })

  it('không lộ đáp án trước khi nộp (không vòng nét đứt, câu hỏi không có target)', async () => {
    await mount(<PixiNumberLineRenderer mode="play" question={student} onAnswered={async () => ({ isCorrect: true })} />)
    expect(arcCount()).toBe(0)
    expect(JSON.stringify(student)).not.toContain('target')
  })

  it('hai lần nộp sát nhau chỉ gọi cha một lần', async () => {
    const onAnswered = vi.fn(async (): Promise<NumberLineAnswerResult> => ({ isCorrect: true }))
    await mount(<PixiNumberLineRenderer mode="play" question={student} onAnswered={onAnswered} />)
    const confirm = target('confirm')
    act(() => {
      for (let i = 0; i < 2; i += 1) {
        app().stage.emit('pointerdown', { global: { x: confirm.cx, y: confirm.cy } })
        app().stage.emit('pointerup', { global: { x: confirm.cx, y: confirm.cy } })
      }
    })
    await waitFor(() => expect(status()).toBe('Đúng rồi!'))
    expect(onAnswered).toHaveBeenCalledTimes(1)
  })

  it('lỗi mạng: báo chưa gửi được và mở khóa để thử lại', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onAnswered = vi
      .fn<(v: number) => Promise<NumberLineAnswerResult>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ isCorrect: true })
    await mount(<PixiNumberLineRenderer mode="play" question={student} onAnswered={onAnswered} />)
    click('confirm')
    await waitFor(() => expect(status()).toBe('Chưa gửi được, bấm Xong rồi để gửi lại nhé.'))
    await waitFor(() => expect(labels()).toContain('confirm')) // tín hiệu đo cập nhật sau khi vẽ xong
    click('confirm')
    await waitFor(() => expect(status()).toBe('Đúng rồi!'))
    error.mockRestore()
  })

  it('cha trả sai dạng thì coi như chưa nhận được, không kẹt', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await mount(<PixiNumberLineRenderer mode="play" question={student} onAnswered={async () => undefined as unknown as NumberLineAnswerResult} />)
    click('confirm')
    await waitFor(() => expect(error).toHaveBeenCalled())
    await waitFor(() => expect(status()).toBe('Chưa gửi được, bấm Xong rồi để gửi lại nhé.'))
    await waitFor(() => expect(labels()).toContain('confirm'))
    error.mockRestore()
  })

  it('kết quả đến sau khi đã gỡ thì bị bỏ qua', async () => {
    let resolve!: (r: NumberLineAnswerResult) => void
    const onAnswered = vi.fn(() => new Promise<NumberLineAnswerResult>((r) => (resolve = r)))
    const { unmount } = await mount(<PixiNumberLineRenderer mode="play" question={student} onAnswered={onAnswered} />)
    click('confirm')
    unmount()
    await act(async () => resolve({ isCorrect: true }))
    expect(h.trigger).not.toHaveBeenCalled()
  })
})

describe('review', () => {
  it('khóa sẵn: không có vùng chạm và không nút xác nhận; sai thì có vòng nét đứt', async () => {
    await mount(<PixiNumberLineRenderer mode="review" question={mockNumberLine10} selectedValue={3} />)
    expect(labels()).toEqual([])
    expect(screen.queryByRole('button', { name: DONE })).toBeNull()
    expect(slider().disabled).toBe(true)
    expect(arcCount()).toBeGreaterThan(10)
    expect(status()).toBe('Gần đúng rồi. Số đúng là 7.')
    emit('pointerdown', xOf(8), 200)
    emit('pointerup', xOf(8), 200)
    expect(slider().value).toBe('3')
  })

  it('lựa chọn cũ đúng: không vòng chỉ chỗ', async () => {
    await mount(<PixiNumberLineRenderer mode="review" question={mockNumberLine10} selectedValue={7} />)
    expect(arcCount()).toBe(0)
    expect(status()).toBe('Đúng rồi!')
  })

  it('không chọn gì (hết giờ): không vẽ điểm, chỉ vòng chỉ chỗ đúng', async () => {
    await mount(<PixiNumberLineRenderer mode="review" question={mockNumberLine10} />)
    expect(arcCount()).toBeGreaterThan(10)
    expect(sceneNodes().filter((n) => n instanceof Graphics).length).toBeGreaterThan(0)
  })

  it('lựa chọn cũ nằm ngoài thang thì dính vạch gần nhất', async () => {
    await mount(<PixiNumberLineRenderer mode="review" question={mockNumberLine10} selectedValue={99} />)
    expect(slider().value).toBe('10')
  })
})

describe('theme', () => {
  it('đổi theme thì màu (kể cả nền sân) đổi theo, không viết cứng', async () => {
    await mount(
      <ThemeProvider theme={spaceTheme}>
        <PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />
      </ThemeProvider>,
    )
    const fills = sceneNodes().flatMap((n) => (n instanceof Graphics ? n.ops.filter((o) => o[0] === 'fill').map((o) => o[1]) : []))
    expect(fills).toContain(hexToNumber(spaceTheme.colors.accent))
    expect(fills).toContain(hexToNumber(spaceTheme.colors.surface))
    expect(fills).toContain(hexToNumber(spaceTheme.colors.background)) // nền sân do theme tô
  })

  it('không có provider (neutral): không tô nền sân; theme Vũ trụ thì có hình nền phủ cả sân', async () => {
    const hasBackground = () => sceneNodes().some((n) => n instanceof Graphics && n.ops[0]?.[0] === 'roundRect' && n.ops[0][1] === 0 && n.ops[0][2] === 0 && n.ops[0][3] === 800)
    const { unmount } = await mount(<PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />)
    expect(hasBackground()).toBe(false)
    unmount()
    await mount(
      <ThemeProvider theme={spaceTheme}>
        <PixiNumberLineRenderer mode="preview" question={mockNumberLine10} />
      </ThemeProvider>,
    )
    expect(hasBackground()).toBe(true)
  })
})
