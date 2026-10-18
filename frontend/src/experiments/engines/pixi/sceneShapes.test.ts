import { describe, expect, it } from 'vitest'
import { STAGE_WIDTH } from '../../../games/common/mediaLayout'
import { computeNumberLineLayout, controlsX, LINE_LEFT, LINE_RIGHT, MARKER_RADIUS } from '../../games/numberLine/numberLineLayout'
import { valueToX } from '../../games/numberLine/numberLineLogic'
import { neutralTheme } from '../../theme/themes/neutral'
import { spaceTheme } from '../../theme/themes/space'
import { buildNumberLineScene, hitTest, type CircleShape, type HitRegion, type NumberLineSceneInput, type RectShape, type Shape, type TextShape } from './sceneShapes'

const colors = neutralTheme.colors
const base: NumberLineSceneInput = {
  questionText: 'Đặt chú ong vào số 7',
  scale: { min: 0, max: 10, step: 1 },
  hasAudio: false,
  colors,
  paintBackground: false,
  value: 0,
  dragX: null,
  phase: 'idle',
  review: false,
  result: null,
  hideMarker: false,
  questionHeight: 40,
}
const scene = (overrides: Partial<NumberLineSceneInput> = {}) => buildNumberLineScene({ ...base, ...overrides })
const find = <T extends Shape>(shapes: Shape[], key: string) => shapes.find((s) => s.key === key) as T | undefined
const hitIds = (hits: HitRegion[]) => hits.map((h) => h.id)

describe('buildNumberLineScene: khung chung', () => {
  it('chiều cao sân khớp bố cục Konva và mỗi khóa hình là duy nhất', () => {
    const s = scene()
    expect(s.stageHeight).toBe(computeNumberLineLayout({ hasAudio: false, questionHeight: 40, showConfirm: true }).stageHeight)
    const keys = s.shapes.map((shape) => shape.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('có đủ phần: câu hỏi, dải, đường, vạch, nhãn, điểm kéo, hàng − số +, nút xác nhận', () => {
    const s = scene()
    for (const key of ['question', 'band', 'line', 'marker', 'minus', 'plus', 'value-box', 'value', 'confirm', 'confirm-label', 'minus-label', 'plus-label']) {
      expect([key, find(s.shapes, key) !== undefined]).toEqual([key, true])
    }
    // 0..10 bước 1: 11 vạch, 11 nhãn.
    expect(s.shapes.filter((x) => x.key.startsWith('tick-'))).toHaveLength(11)
    expect(s.shapes.filter((x) => x.key.startsWith('label-'))).toHaveLength(11)
  })

  it('thang nhiều vạch thì thưa nhãn nhưng luôn có nhãn đầu và cuối', () => {
    const s = scene({ scale: { min: 0, max: 110, step: 10 } })
    const labels = s.shapes.filter((x) => x.key.startsWith('label-')).map((x) => (x as TextShape).text)
    expect(labels[0]).toBe('0')
    expect(labels[labels.length - 1]).toBe('110')
    expect(labels.length).toBeLessThan(12)
  })

  it('không tô nền khi theme không yêu cầu; có tô khi bật', () => {
    expect(find(scene().shapes, 'background')).toBeUndefined()
    const painted = scene({ paintBackground: true, colors: spaceTheme.colors })
    const bg = find<RectShape>(painted.shapes, 'background')!
    expect(bg).toMatchObject({ x: 0, y: 0, width: STAGE_WIDTH, fill: spaceTheme.colors.background })
    expect(painted.shapes[0].key).toBe('background') // vẽ trước nhất
  })

  it('có nút nghe lại khi có âm thanh, ở trên câu hỏi; không có thì thôi', () => {
    expect(find(scene().shapes, 'audio')).toBeUndefined()
    const s = scene({ hasAudio: true })
    const audio = find<RectShape>(s.shapes, 'audio')!
    expect(audio.fill).toBe(colors.audioSurface)
    expect(find<TextShape>(s.shapes, 'audio-label')!.text).toBe('🔊 Nghe lại')
    expect(audio.y).toBeLessThan(find<TextShape>(s.shapes, 'question')!.y)
    expect(hitIds(s.hits)).toContain('audio')
  })
})

describe('buildNumberLineScene: điểm kéo, số hiện và màu', () => {
  it('điểm kéo ở đúng vạch của giá trị; đang kéo thì theo toạ độ kéo và số hiện là vạch gần nhất', () => {
    const geometry = { left: LINE_LEFT, right: LINE_RIGHT }
    const at7 = find<CircleShape>(scene({ value: 7 }).shapes, 'marker')!
    expect(at7.x).toBeCloseTo(valueToX(7, base.scale, geometry), 6)
    const layout = computeNumberLineLayout({ hasAudio: false, questionHeight: 40, showConfirm: true })
    expect(at7.y).toBe(layout.lineY)
    const dragging = scene({ value: 0, dragX: valueToX(4, base.scale, geometry) + 5 })
    expect(find<CircleShape>(dragging.shapes, 'marker')!.x).toBeCloseTo(valueToX(4, base.scale, geometry) + 5, 6)
    expect(find<TextShape>(dragging.shapes, 'value')!.text).toBe('4')
  })

  it('kéo ra ngoài đường: số hiện kẹp ở hai đầu', () => {
    expect(find<TextShape>(scene({ dragX: -500 }).shapes, 'value')!.text).toBe('0')
    expect(find<TextShape>(scene({ dragX: 99999 }).shapes, 'value')!.text).toBe('10')
  })

  it('màu điểm: accent lúc chơi; sau khi chấm đúng xanh, sai vàng dịu (không đỏ)', () => {
    expect(find<CircleShape>(scene().shapes, 'marker')!.fill).toBe(colors.accent)
    const right = find<CircleShape>(scene({ phase: 'done', result: { isCorrect: true } }).shapes, 'marker')!
    expect([right.fill, right.stroke]).toEqual([colors.surfaceCorrect, colors.lineCorrect])
    const wrong = find<CircleShape>(scene({ phase: 'done', result: { isCorrect: false } }).shapes, 'marker')!
    expect([wrong.fill, wrong.stroke]).toEqual([colors.surfaceTryAgain, colors.lineTryAgain])
  })

  it('đang chấm (chưa có kết quả) vẫn giữ màu accent', () => {
    expect(find<CircleShape>(scene({ phase: 'submitting' }).shapes, 'marker')!.fill).toBe(colors.accent)
  })

  it('vòng nét đứt chỉ vạch đúng nằm đúng vạch; điểm bị ẩn khi xem lại không chọn gì', () => {
    const s = scene({ revealValue: 7, hideMarker: true, review: true, phase: 'done' })
    const ring = find<CircleShape>(s.shapes, 'reveal')!
    expect(ring.dashed).toBe(true)
    expect(ring.stroke).toBe(colors.lineCorrect)
    expect(ring.x).toBeCloseTo(valueToX(7, base.scale, { left: LINE_LEFT, right: LINE_RIGHT }), 6)
    expect(find(s.shapes, 'marker')).toBeUndefined()
    expect(find(scene().shapes, 'reveal')).toBeUndefined()
  })

  it('theme khác thì màu đổi theo (không viết cứng)', () => {
    const themed = scene({ colors: spaceTheme.colors })
    expect(find<CircleShape>(themed.shapes, 'marker')!.fill).toBe(spaceTheme.colors.accent)
    expect(find<RectShape>(themed.shapes, 'band')!.fill).toBe(spaceTheme.colors.surface)
    expect(find<TextShape>(themed.shapes, 'question')!.fill).toBe(spaceTheme.colors.onBackground)
  })
})

describe('buildNumberLineScene: nút − + và xác nhận', () => {
  it('ở đầu thang − bị tắt (màu khóa, không vùng chạm); ở cuối thang + bị tắt', () => {
    const atMin = scene({ value: 0 })
    expect(find<RectShape>(atMin.shapes, 'minus')!.fill).toBe(colors.disabledSurface)
    expect(hitIds(atMin.hits)).not.toContain('minus')
    expect(hitIds(atMin.hits)).toContain('plus')
    const atMax = scene({ value: 10 })
    expect(find<RectShape>(atMax.shapes, 'plus')!.fill).toBe(colors.disabledSurface)
    expect(hitIds(atMax.hits)).not.toContain('plus')
    expect(hitIds(atMax.hits)).toContain('minus')
    const middle = scene({ value: 5 })
    expect(find<RectShape>(middle.shapes, 'minus')!.fill).toBe(colors.accent)
    expect(hitIds(middle.hits)).toEqual(expect.arrayContaining(['minus', 'plus']))
  })

  it('hàng − số + nằm đúng vị trí của bố cục Konva', () => {
    const s = scene()
    const x = controlsX()
    expect(find<RectShape>(s.shapes, 'minus')!.x).toBe(x.minus)
    expect(find<RectShape>(s.shapes, 'value-box')!.x).toBe(x.value)
    expect(find<RectShape>(s.shapes, 'plus')!.x).toBe(x.plus)
  })

  it('xác nhận: có vùng chạm khi chơi; «Đang chấm…» và khóa khi đang chấm; khóa sau khi xong', () => {
    expect(hitIds(scene().hits)).toContain('confirm')
    const submitting = scene({ phase: 'submitting' })
    expect(find<TextShape>(submitting.shapes, 'confirm-label')!.text).toBe('Đang chấm…')
    expect(find<RectShape>(submitting.shapes, 'confirm')!.fill).toBe(colors.disabledSurface)
    expect(hitIds(submitting.hits)).toEqual([])
    const done = scene({ phase: 'done' })
    expect(find<TextShape>(done.shapes, 'confirm-label')!.text).toBe('Xong rồi!')
    expect(hitIds(done.hits)).toEqual([])
  })

  it('xem lại: không nút xác nhận, không vùng chạm nào', () => {
    const s = scene({ review: true, phase: 'done' })
    expect(find(s.shapes, 'confirm')).toBeUndefined()
    expect(s.hits).toEqual([])
  })
})

describe('vùng chạm và hitTest', () => {
  it('thứ tự ưu tiên: điểm kéo, rồi các nút, rồi dải', () => {
    const ids = hitIds(scene({ value: 5, hasAudio: true }).hits)
    expect(ids[0]).toBe('marker')
    expect(ids[ids.length - 1]).toBe('band')
    expect(ids.indexOf('marker')).toBeLessThan(ids.indexOf('band'))
  })

  it('điểm kéo nằm trên dải: chạm vào điểm chọn điểm, chạm chỗ khác trên dải chọn dải', () => {
    const s = scene({ value: 5 })
    const marker = s.hits.find((h) => h.id === 'marker')!
    const center = { x: marker.x + marker.width / 2, y: marker.y + marker.height / 2 }
    expect(hitTest(s.hits, center)).toBe('marker')
    expect(hitTest(s.hits, { x: center.x + MARKER_RADIUS + 10, y: center.y })).toBe('band')
  })

  it('biên: góc trên trái tính vào, góc dưới phải không', () => {
    const hits: HitRegion[] = [{ id: 'confirm', x: 10, y: 20, width: 100, height: 50 }]
    expect(hitTest(hits, { x: 10, y: 20 })).toBe('confirm')
    expect(hitTest(hits, { x: 109.9, y: 69.9 })).toBe('confirm')
    expect(hitTest(hits, { x: 110, y: 40 })).toBeNull()
    expect(hitTest(hits, { x: 50, y: 70 })).toBeNull()
    expect(hitTest(hits, { x: 9.9, y: 40 })).toBeNull()
  })

  it('chạm ngoài mọi vùng, hoặc toạ độ hỏng, là không trúng gì', () => {
    const s = scene()
    expect(hitTest(s.hits, { x: -10, y: -10 })).toBeNull()
    expect(hitTest(s.hits, { x: Number.NaN, y: 100 })).toBeNull()
    expect(hitTest(s.hits, { x: 100, y: Number.POSITIVE_INFINITY })).toBeNull()
    expect(hitTest([], { x: 1, y: 1 })).toBeNull()
  })

  it('mỗi nút có vùng chạm đúng bằng hình của nó', () => {
    const s = scene({ value: 5 })
    for (const id of ['minus', 'plus', 'confirm'] as const) {
      const rect = find<RectShape>(s.shapes, id)!
      expect(s.hits.find((h) => h.id === id)).toMatchObject({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    }
  })

  it('chỉ một vùng trúng cho mỗi điểm giữa các nút (không chồng nhau ngoài điểm/dải)', () => {
    const s = scene({ value: 5, hasAudio: true })
    const buttons = s.hits.filter((h) => h.id !== 'marker' && h.id !== 'band')
    for (let i = 0; i < buttons.length; i += 1) {
      for (let j = i + 1; j < buttons.length; j += 1) {
        const a = buttons[i]
        const b = buttons[j]
        const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
        expect([a.id, b.id, overlap]).toEqual([a.id, b.id, false])
      }
    }
  })
})
