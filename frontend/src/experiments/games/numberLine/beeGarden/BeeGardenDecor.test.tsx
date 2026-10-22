import { render, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MissingKeywordLog } from '../../../assets/imageResolver/missingLog'
import { resolveImage } from '../../../assets/imageResolver/resolveImage'
import { DECORATION_LIMITS, type ThemeDecoration } from '../../../theme/themeTypes'
import { validateTheme } from '../../../theme/validateTheme'
import { GardenDecorations } from './BeeGardenDecor'
import { beeGardenTheme } from './beeGardenTheme'
import {
  computeGardenLayout,
  FLOWER_CENTER_RADIUS,
  FLOWER_HEAD_FROM_BOTTOM,
  FLOWER_RADIUS,
  GARDEN_WIDTH,
  SCENE_HEIGHT,
} from './beeGardenGeometry'
import { applyGardenMotion, MOTION_NAMES, type MotionHost, type MotionNode, type MotionState } from './gardenMotion'
import { useResolvedDecorations } from './useResolvedDecorations'

const h = vi.hoisted(() => ({
  image: {} as object | undefined,
  imageProps: [] as Record<string, unknown>[],
  groups: [] as Record<string, unknown>[],
  ellipses: [] as Record<string, unknown>[],
}))

vi.mock('react-konva', () => ({
  Group: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    h.groups.push(props)
    return <div data-konva="group">{props.children}</div>
  },
  Image: (props: Record<string, unknown>) => {
    h.imageProps.push(props)
    return <i data-konva="image" />
  },
  Ellipse: (props: Record<string, unknown>) => {
    h.ellipses.push(props)
    return <i data-konva="ellipse" />
  },
}))
vi.mock('use-image', () => ({ default: () => [h.image, h.image ? 'loaded' : 'loading'] }))

const decorations = beeGardenTheme.decorations!

beforeEach(() => {
  h.image = {}
  h.imageProps = []
  h.groups = []
  h.ellipses = []
})

describe('dữ liệu trang trí trong theme', () => {
  it('theme vẫn hợp lệ với danh sách trang trí; có cả bầu trời và mặt cỏ; tối đa 12 vật', () => {
    expect(validateTheme(beeGardenTheme)).toEqual([])
    expect(decorations.some((item) => item.layer === 'sky')).toBe(true)
    expect(decorations.some((item) => item.layer === 'ground')).toBe(true)
    expect(decorations.length).toBeLessThanOrEqual(DECORATION_LIMITS.maxCount)
  })

  it('có đủ các vật đề bài nêu: bướm, chim (bồ câu), bọ rùa, nấm, ốc sên; ít vật (không quá 6)', () => {
    const keywords = new Set(decorations.map((item) => item.keyword))
    for (const keyword of ['bướm', 'vẹt', 'bọ rùa', 'nấm', 'ốc sên']) expect(keywords.has(keyword), keyword).toBe(true)
    expect(decorations.length).toBeLessThanOrEqual(6)
    expect(keywords.has('chim')).toBe(false) // con chim Fluent có thân đỏ thẫm, chói với cảnh
    expect(keywords.has('bồ câu')).toBe(false) // bồ câu trắng gần như chìm vào mây
  })

  it('mọi vật có hình trong thư viện cục bộ (không vật nào bị bỏ vì thiếu hình)', () => {
    const log = new MissingKeywordLog()
    const { result } = renderHook(() => useResolvedDecorations(decorations))
    expect(result.current).toHaveLength(decorations.length)
    expect(log.list()).toEqual([])
    for (const item of result.current) expect(item.src, item.keyword).toMatch(/\.svg/)
  })

  it('mỗi từ khóa trang trí ra ĐÚNG hình (nấm là cây nấm, không phải số 5; chim là con bồ câu)', () => {
    const { result } = renderHook(() => useResolvedDecorations(decorations))
    const slugOf = (keyword: string) => resolveImage(keyword, { log: null }).slug
    expect(result.current.length).toBe(decorations.length)
    expect(slugOf('bướm')).toBe('butterfly')
    expect(slugOf('vẹt')).toBe('parrot')
    expect(slugOf('bọ rùa')).toBe('lady-beetle')
    expect(slugOf('nấm')).toBe('mushroom')
    expect(slugOf('ốc sên')).toBe('snail')
  })

  it('KHÔNG che chữ số: ở mọi chiều cao cảnh có thể có, mọi vật (kể cả khi chuyển động hết biên độ) nằm ngoài dải chứa hoa và chữ số', () => {
    for (const height of [440, SCENE_HEIGHT, 520]) {
      // Dải của hàng hoa: tâm đầu hoa cách đáy FLOWER_HEAD_FROM_BOTTOM, rộng tới bán kính cả bông hoa (tính cả lúc hoa nở to 1,5 lần).
      const bandTop = height - FLOWER_HEAD_FROM_BOTTOM - FLOWER_RADIUS * 1.5
      const bandBottom = height - FLOWER_HEAD_FROM_BOTTOM + FLOWER_RADIUS * 1.5
      expect(FLOWER_CENTER_RADIUS).toBeGreaterThan(0)
      for (const item of decorations) {
        const vertical = item.motion === 'float' ? item.amplitude : 0
        // Tầng sky: tâm theo tỉ lệ chiều cao. Tầng ground: đáy hình trong dải cỏ sát đáy khung.
        const base = item.layer === 'ground' ? height - DECORATION_LIMITS.groundStripTop + item.y * DECORATION_LIMITS.groundStrip : undefined
        const top = base === undefined ? item.y * height - item.size / 2 - vertical : base - item.size
        const bottom = base === undefined ? item.y * height + item.size / 2 + vertical : base
        if (item.layer === 'sky') expect(bottom, `${item.keyword}@${height}`).toBeLessThanOrEqual(bandTop)
        else expect(top, `${item.keyword}@${height}`).toBeGreaterThanOrEqual(bandBottom)
        expect(top, `${item.keyword}@${height} trên`).toBeGreaterThanOrEqual(0)
        expect(bottom, `${item.keyword}@${height} dưới`).toBeLessThanOrEqual(height) // trong khung
      }
    }
  })

  it('vật nằm trong khung ngang kể cả khi trôi hết biên độ', () => {
    for (const item of decorations) {
      const x = item.x * GARDEN_WIDTH
      const reach = item.size / 2 + (item.motion === 'drift' || item.motion === 'float' ? item.amplitude : 0)
      expect(x - reach, item.keyword).toBeGreaterThanOrEqual(0)
      expect(x + reach, item.keyword).toBeLessThanOrEqual(GARDEN_WIDTH)
    }
  })

  it('không che mặt trời ở góc trên phải (vật ở trời vẽ phía sau ong nên ong bay qua luôn nằm trên)', () => {
    const layout = computeGardenLayout({ hasAudio: false, questionHeight: 40, showConfirm: false, showControls: false })
    for (const item of decorations.filter((entry) => entry.layer === 'sky')) {
      const nearSun = item.x * GARDEN_WIDTH > GARDEN_WIDTH - 90 - 64 - item.size / 2 && item.y * layout.gardenHeight < 72 + 64 + item.size / 2
      expect(nearSun, item.keyword).toBe(false)
    }
  })
})

describe('validateTheme: kiểm dữ liệu trang trí', () => {
  const base: ThemeDecoration = { keyword: 'bướm', layer: 'sky', x: 0.5, y: 0.2, size: 48, motion: 'float', amplitude: 8, speed: 1 }
  const issues = (item: Partial<ThemeDecoration>) => validateTheme({ ...beeGardenTheme, decorations: [{ ...base, ...item }] }).map((issue) => `${issue.code}:${issue.path}`)

  it('vật hợp lệ thì không có lỗi; không khai trang trí cũng hợp lệ', () => {
    expect(issues({})).toEqual([])
    expect(validateTheme({ ...beeGardenTheme, decorations: undefined })).toEqual([])
  })
  it.each([
    [{ keyword: '  ' }, 'keyword'],
    [{ layer: 'cloud' as never }, 'layer'],
    [{ motion: 'spin' as never }, 'motion'],
    [{ x: -0.1 }, 'x'],
    [{ x: 1.1 }, 'x'],
    [{ y: Number.NaN }, 'y'],
    [{ size: 8 }, 'size'],
    [{ size: 200 }, 'size'],
    [{ amplitude: 40 }, 'amplitude'],
    [{ amplitude: -1 }, 'amplitude'],
    [{ speed: 10 }, 'speed'],
    [{ phase: Number.NaN }, 'phase'],
    [{ depth: -0.1 }, 'depth'],
    [{ depth: 1.5 }, 'depth'],
  ])('từ chối %j', (patch, field) => {
    expect(issues(patch)).toContain(`DECORATION_INVALID:decorations[0].${field}`)
  })
  it('từ chối vật ở trời quá thấp (y > 0,35) và vật trên cỏ quá cao (y < 0,9): đó là dải hoa và chữ số', () => {
    expect(issues({ layer: 'sky', y: 0.41 })).toContain('DECORATION_INVALID:decorations[0].y')
    expect(issues({ layer: 'sky', y: 0.4 })).toEqual([])
    expect(issues({ layer: 'ground', y: 0.79, size: 36 })).toContain('DECORATION_INVALID:decorations[0].y')
    expect(issues({ layer: 'ground', y: 0.8, size: 36 })).toEqual([])
    expect(issues({ layer: 'ground', y: 0.9, size: 41 })).toContain('DECORATION_INVALID:decorations[0].size')
    expect(issues({ layer: 'ground', y: 0.9, size: 40 })).toEqual([])
  })
  it('từ chối quá 12 vật', () => {
    const many = Array.from({ length: 13 }, () => base)
    expect(validateTheme({ ...beeGardenTheme, decorations: many }).map((issue) => issue.path)).toContain('decorations')
  })
})

describe('GardenDecorations (vẽ)', () => {
  const resolved = (extra: Partial<ThemeDecoration> = {}) => ({ ...decorations[0], depth: 1, ...extra, src: '/x.svg', alt: 'x' })

  it('chỉ vẽ vật của tầng được yêu cầu', () => {
    const items = [resolved({ layer: 'sky' }), resolved({ layer: 'ground', y: 0.9, size: 40 })]
    render(<GardenDecorations items={items} layer="sky" width={760} height={400} />)
    expect(h.imageProps).toHaveLength(1)
    h.imageProps = []
    render(<GardenDecorations items={items} layer="ground" width={760} height={400} />)
    expect(h.imageProps).toHaveLength(1)
  })

  it('KHÔNG nhận chạm: nhóm tắt listening và mọi hình tắt listening (không chặn hoa, ong, nút)', () => {
    render(<GardenDecorations items={[resolved()]} layer="sky" width={760} height={400} />)
    expect(h.groups.every((group) => group.listening === false)).toBe(true)
    expect(h.imageProps.every((props) => props.listening === false)).toBe(true)
  })

  it('đặt vị trí theo tỉ lệ khung, mang tên và tham số chuyển động cho bộ chuyển động', () => {
    render(<GardenDecorations items={[resolved({ x: 0.25, y: 0.2, size: 50, motion: 'drift', amplitude: 7, speed: 0.5, phase: 2 })]} layer="sky" width={760} height={400} />)
    expect(h.imageProps[0]).toMatchObject({
      name: MOTION_NAMES.decoration,
      x: 190,
      y: 80,
      width: 50,
      height: 50,
      motionBaseX: 190,
      motionBaseY: 80,
      motionKind: 'drift',
      motionAmplitude: 7,
      motionSpeed: 0.5,
      motionPhase: 2,
    })
  })

  it('vật trên cỏ đứng trong dải cỏ sát đáy và xoay quanh gốc (đáy hình); vật ở trời quay quanh tâm', () => {
    render(<GardenDecorations items={[resolved({ layer: 'ground', y: 1, size: 40 })]} layer="ground" width={760} height={400} />)
    expect(h.imageProps[0]).toMatchObject({ offsetX: 20, offsetY: 40, y: 400 - 6 }) // đáy hình cách đáy khung 6
    h.imageProps = []
    render(<GardenDecorations items={[resolved({ layer: 'sky', size: 40 })]} layer="sky" width={760} height={400} />)
    expect(h.imageProps[0]).toMatchObject({ offsetX: 20, offsetY: 20 })
  })

  it('hình chưa tải xong thì chưa vẽ gì (không chớp khung trống)', () => {
    h.image = undefined
    render(<GardenDecorations items={[resolved()]} layer="sky" width={760} height={400} />)
    expect(h.imageProps).toHaveLength(0)
  })

  it('độ sâu: vật xa vẽ nhỏ và nhạt hơn vật gần; không khai độ sâu thì coi là gần (cỡ đầy đủ, đục hoàn toàn)', () => {
    render(<GardenDecorations items={[resolved({ size: 50, depth: 0 }), resolved({ size: 50, depth: 1 }), { ...resolved({ size: 50 }), depth: undefined }]} layer="sky" width={760} height={400} />)
    const [far, near, unset] = h.imageProps
    expect(far.width as number).toBeLessThan(near.width as number)
    expect(far.opacity as number).toBeLessThan(near.opacity as number)
    expect(near).toMatchObject({ width: 50, opacity: 1 })
    expect(unset).toMatchObject({ width: 50, opacity: 1 })
  })

  it('vật trên cỏ có bóng đổ mềm dưới chân (không nhận chạm, gần thì đậm hơn xa); vật ở trời không có bóng', () => {
    render(<GardenDecorations items={[resolved({ layer: 'ground', y: 0.9, size: 40, depth: 0.2 }), resolved({ layer: 'ground', y: 0.9, size: 40, depth: 1 })]} layer="ground" width={760} height={400} />)
    expect(h.ellipses).toHaveLength(2)
    expect(h.ellipses.every((e) => e.listening === false)).toBe(true)
    expect(h.ellipses[0].opacity as number).toBeLessThan(h.ellipses[1].opacity as number)
    h.ellipses = []
    render(<GardenDecorations items={[resolved({ layer: 'sky' })]} layer="sky" width={760} height={400} />)
    expect(h.ellipses).toHaveLength(0)
  })

  it('bóng chỉ trôi theo vật khi vật trôi ngang; vật đung đưa thì bóng đứng yên (không xoay)', () => {
    render(<GardenDecorations items={[resolved({ layer: 'ground', y: 0.9, size: 40, motion: 'drift' }), resolved({ layer: 'ground', y: 0.9, size: 40, motion: 'sway' })]} layer="ground" width={760} height={400} />)
    expect(h.ellipses.map((e) => e.motionKind)).toEqual(['drift', 'still'])
  })

  it('phase bỏ trống thì là 0', () => {
    render(<GardenDecorations items={[{ ...resolved(), phase: undefined }]} layer="sky" width={760} height={400} />)
    expect(h.imageProps[0].motionPhase).toBe(0)
  })
})

describe('useResolvedDecorations', () => {
  it('từ khóa chưa có hình thì bỏ vật đó (không hình dự phòng lên cảnh) và không ném lỗi', () => {
    const items: ThemeDecoration[] = [
      { ...decorations[0], keyword: 'bướm' },
      { ...decorations[0], keyword: 'loài-không-có-trong-thư-viện' },
    ]
    const { result } = renderHook(() => useResolvedDecorations(items))
    expect(result.current).toHaveLength(1)
    expect(result.current[0].keyword).toBe('bướm')
  })
  it('không khai trang trí thì rỗng', () => {
    expect(renderHook(() => useResolvedDecorations(undefined)).result.current).toEqual([])
  })
})

describe('chuyển động của vật trang trí (gardenMotion)', () => {
  class Node implements MotionNode {
    attrs: Record<string, number> = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
    private readonly custom: Record<string, unknown>
    constructor(custom: Record<string, unknown>) {
      this.custom = custom
    }
    x(v: number) { this.attrs.x = v }
    y(v: number) { this.attrs.y = v }
    rotation(v: number) { this.attrs.rotation = v }
    scaleX(v: number) { this.attrs.scaleX = v }
    scaleY(v: number) { this.attrs.scaleY = v }
    opacity(v: number) { this.attrs.opacity = v }
    getAttr(name: string) { return this.custom[name] }
  }
  const host = (nodes: Node[]): MotionHost => ({ find: (selector) => (selector === `.${MOTION_NAMES.decoration}` ? nodes : []) })
  const state: MotionState = { answeredAt: null, correct: false, flying: false, confetti: [] }
  const node = (kind: string, extra: Record<string, unknown> = {}) =>
    new Node({ motionKind: kind, motionBaseX: 100, motionBaseY: 50, motionAmplitude: 10, motionSpeed: 1, motionPhase: 0.5, ...extra })

  it('drift: trôi ngang quanh vị trí gốc, không quá biên độ, y đứng yên', () => {
    const item = node('drift')
    for (const t of [0, 1, 2.7, 9, 31]) {
      applyGardenMotion(host([item]), t, state)
      expect(Math.abs(item.attrs.x - 100)).toBeLessThanOrEqual(10.000001)
    }
    applyGardenMotion(host([item]), 2, state)
    expect(item.attrs.x).toBeCloseTo(100 + Math.sin(2 + 0.5) * 10, 8)
    expect(item.attrs.y).toBe(0) // không đụng tới y
  })
  it('float: bồng bềnh lên xuống quanh y gốc, lắc ngang nhẹ hơn', () => {
    const item = node('float')
    applyGardenMotion(host([item]), 3, state)
    expect(item.attrs.y).toBeCloseTo(50 + Math.sin(3 + 0.5) * 10, 8)
    expect(Math.abs(item.attrs.x - 100)).toBeLessThanOrEqual(6.000001)
  })
  it('sway: chỉ xoay, trong ±biên độ độ', () => {
    const item = node('sway', { motionAmplitude: 4 })
    for (const t of [0, 0.4, 1.9, 7]) {
      applyGardenMotion(host([item]), t, state)
      expect(Math.abs(item.attrs.rotation)).toBeLessThanOrEqual(4.000001)
    }
    expect(item.attrs.x).toBe(0)
    expect(item.attrs.y).toBe(0)
  })
  it('still hoặc kiểu lạ: không đụng vào node', () => {
    for (const kind of ['still', 'bay-lung-tung', '']) {
      const item = node(kind)
      applyGardenMotion(host([item]), 5, state)
      expect(item.attrs).toEqual({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 })
    }
  })
  it('hai vật cùng kiểu nhưng lệch pha thì không chuyển động đồng bộ', () => {
    const a = node('drift', { motionPhase: 0 })
    const b = node('drift', { motionPhase: 2 })
    applyGardenMotion(host([a, b]), 1.3, state)
    expect(a.attrs.x).not.toBeCloseTo(b.attrs.x, 3)
  })
  it('thiếu tham số thì không ném lỗi và không sinh NaN', () => {
    const item = new Node({ motionKind: 'drift' })
    applyGardenMotion(host([item]), 4, state)
    expect(Number.isFinite(item.attrs.x)).toBe(true)
  })
})

describe('GardenDecorations: chạm vào vật (phản ứng)', () => {
  const sky = { ...decorations[0], depth: 1, src: '/x.svg', alt: 'x' }

  it('không có onReact: mọi vật và nhóm không nhận chạm (như cũ)', () => {
    render(<GardenDecorations items={[{ ...sky, reaction: 'hop' }]} layer="sky" width={760} height={400} />)
    expect(h.imageProps[0].listening).toBe(false)
    expect(h.groups.every((group) => group.listening === false)).toBe(true)
  })

  it('có onReact: chỉ vật CÓ phản ứng nhận chạm; vật reaction none/bỏ trống không nhận chạm; nhóm cha nhận chạm để chuyển sự kiện xuống', () => {
    render(
      <GardenDecorations
        items={[{ ...sky, reaction: 'hop' }, { ...sky, reaction: 'none' }, { ...sky, reaction: undefined }]}
        layer="sky"
        width={760}
        height={400}
        onReact={() => undefined}
      />,
    )
    expect(h.imageProps.map((props) => props.listening)).toEqual([true, false, false])
    expect(h.groups.some((group) => group.listening === true)).toBe(true)
  })

  it('chạm (click hoặc tap) gọi onReact đúng node và đúng loại phản ứng; vật không phản ứng không có trình xử lý', () => {
    const onReact = vi.fn()
    render(<GardenDecorations items={[{ ...sky, reaction: 'wiggle' }, { ...sky, reaction: 'none' }]} layer="sky" width={760} height={400} onReact={onReact} />)
    const target = { id: 'node' }
    ;(h.imageProps[0].onClick as (event: unknown) => void)({ target })
    ;(h.imageProps[0].onTap as (event: unknown) => void)({ target })
    expect(onReact).toHaveBeenCalledTimes(2)
    expect(onReact).toHaveBeenCalledWith(target, 'wiggle')
    expect(h.imageProps[1].onClick).toBeUndefined()
    expect(h.imageProps[1].onTap).toBeUndefined()
  })

  it('mọi vật mang thuộc tính nghỉ reactY/reactRot = 0 để tween phản ứng có giá trị đầu', () => {
    render(<GardenDecorations items={[{ ...sky, reaction: 'hop' }]} layer="sky" width={760} height={400} onReact={() => undefined} />)
    expect(h.imageProps[0]).toMatchObject({ reactY: 0, reactRot: 0 })
  })

  it('bóng đổ không bao giờ nhận chạm, kể cả khi vật có phản ứng', () => {
    render(<GardenDecorations items={[{ ...sky, layer: 'ground', y: 0.9, size: 40, reaction: 'boing' }]} layer="ground" width={760} height={400} onReact={() => undefined} />)
    expect(h.ellipses.every((e) => e.listening === false)).toBe(true)
  })

  it('theme: mọi vật của Vườn hoa có phản ứng hợp lệ, và vật ở trời/cỏ đều có ít nhất một vật phản ứng', () => {
    expect(decorations.every((item) => item.reaction !== undefined && item.reaction !== 'none')).toBe(true)
    expect(decorations.some((item) => item.layer === 'sky')).toBe(true)
  })
})

describe('validateTheme: reaction', () => {
  const base: ThemeDecoration = { keyword: 'bướm', layer: 'sky', x: 0.5, y: 0.2, size: 48, motion: 'float', amplitude: 8, speed: 1 }
  it('từ chối phản ứng lạ; nhận mọi phản ứng hợp lệ', () => {
    const issues = (reaction: unknown) => validateTheme({ ...beeGardenTheme, decorations: [{ ...base, reaction: reaction as never }] }).map((issue) => issue.path)
    expect(issues('spin')).toContain('decorations[0].reaction')
    for (const reaction of ['hop', 'wiggle', 'boing', 'flutter', 'none']) expect(issues(reaction)).toEqual([])
  })
})

describe('GardenDecorations: nhường chỗ cho ong', () => {
  const item = { ...decorations[0], depth: 0.5, src: '/x.svg', alt: 'x' }
  it('vật ở trời mang các thuộc tính để bộ chuyển động làm mờ khi ong tới gần (độ đục gốc, độ lệch nhóm); vật trên cỏ thì không bị mờ', () => {
    render(<GardenDecorations items={[item, { ...item, layer: 'ground', y: 0.9, size: 40 }]} layer="sky" width={760} height={520} offset={{ x: 20, y: 16 }} />)
    expect(h.imageProps[0]).toMatchObject({ motionFade: 1, motionOffX: 20, motionOffY: 16 })
    expect(h.imageProps[0].motionBaseOpacity).toBe(h.imageProps[0].opacity)
    h.imageProps = []
    render(<GardenDecorations items={[{ ...item, layer: 'ground', y: 0.9, size: 40 }]} layer="ground" width={760} height={520} />)
    expect(h.imageProps[0]).toMatchObject({ motionFade: 0, motionOffX: 0, motionOffY: 0 })
  })
  it('vật ở trời nằm trong dải giữa hàng đề bài và ong, ngoài vùng ong nghỉ: không đè đầu ong lúc chờ', () => {
    const layout = computeGardenLayout({ hasAudio: true, hasBadge: true, questionHeight: 40, showConfirm: false, showControls: false, touchSize: 144 })
    const restTop = layout.beeY - 66 - layout.gardenY // đỉnh ong lúc nghỉ, toạ độ cảnh
    for (const entry of decorations.filter((decoration) => decoration.layer === 'sky')) {
      const bottom = entry.y * layout.gardenHeight + entry.size / 2 + (entry.motion === 'float' ? entry.amplitude : 0)
      expect(bottom, entry.keyword).toBeLessThanOrEqual(restTop + 1)
    }
  })
})
