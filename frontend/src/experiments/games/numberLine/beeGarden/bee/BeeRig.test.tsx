import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BEE_SCALE } from '../beeGardenGeometry'
import { BeeRig, BeeShadow, type BeeRigProps } from './BeeRig'
import { BEE_NAMES } from './beeMotion'
import { BEE_STATES, SHADOW_BASE_OPACITY } from './beePoses'

const h = vi.hoisted(() => ({ nodes: [] as { type: string; props: Record<string, unknown> }[] }))

vi.mock('react-konva', () => {
  type P = Record<string, unknown> & { children?: React.ReactNode }
  const make = (type: string) =>
    function Konva(props: P) {
      h.nodes.push({ type, props })
      return <div data-konva={type}>{props.children}</div>
    }
  return { Group: make('group'), Circle: make('circle'), Ellipse: make('ellipse'), Line: make('line'), Rect: make('rect') }
})

const of = (type: string) => h.nodes.filter((node) => node.type === type).map((node) => node.props)
const named = (name: string) => h.nodes.filter((node) => node.props.name === name).map((node) => node.props)
const base: Omit<BeeRigProps, 'state'> = { x: 200, y: 300, hitRadius: 72, draggable: true, minX: 72, maxX: 728 }
const render1 = (state: BeeRigProps['state'], extra: Partial<BeeRigProps> = {}) => render(<BeeRig {...base} state={state} {...extra} />)
const pointsOf = () => of('line').map((line) => JSON.stringify(line.points))

beforeEach(() => {
  h.nodes = []
})

describe('BeeRig (ong dạng cutout)', () => {
  it('node gốc mang tên của bộ chuyển động, độ cao nghỉ, cỡ BEE_SCALE; vùng bắt chạm trong suốt có bán kính bù theo tỉ lệ', () => {
    render1('idle')
    expect(named(BEE_NAMES.root)[0]).toMatchObject({ motionRestY: 300, scaleX: BEE_SCALE, scaleY: BEE_SCALE, x: 200, y: 300, draggable: true })
    const hit = of('circle').find((circle) => circle.opacity === 0.001)!
    expect(hit.radius).toBeCloseTo(72 / BEE_SCALE, 8)
  })
  it('các bộ phận tách riêng và có tên: hai cánh, hai râu (mỗi râu một bên), nhóm mắt; mắt đặt tại y = -6 để co dọc quanh tâm', () => {
    render1('idle')
    expect(named(BEE_NAMES.wing)).toHaveLength(2)
    expect(named(BEE_NAMES.antenna).map((antenna) => antenna.motionSide)).toEqual([-1, 1])
    const eyes = named(BEE_NAMES.eyes)
    expect(eyes).toHaveLength(1)
    expect(eyes[0].y).toBe(-6)
    for (const part of [...named(BEE_NAMES.wing), ...named(BEE_NAMES.antenna)]) expect(part.listening).toBe(false)
  })
  it('mỗi trạng thái đổi mắt và miệng: bình thường mỉm cười, vui cười to + mắt cười, ngơ ngác miệng «o», chớp mắt nhắm, nghĩ miệng thẳng', () => {
    render1('idle')
    expect(pointsOf()).toContain('[-9,10,0,18,9,10]')
    h.nodes = []
    render1('happy')
    expect(pointsOf()).toContain('[-12,8,0,24,12,8]') // miệng cười to
    expect(pointsOf()).toContain('[-24,4,-16,-6,-8,4]') // mắt cười
    h.nodes = []
    render1('oops')
    expect(of('ellipse').some((ellipse) => ellipse.radiusX === 5 && ellipse.y === 15)).toBe(true)
    h.nodes = []
    render1('blink')
    expect(pointsOf()).toContain('[-24,0,-16,4,-8,0]') // mắt nhắm
    expect(pointsOf()).toContain('[-9,10,0,18,9,10]') // miệng bình thường
    h.nodes = []
    render1('think')
    expect(pointsOf()).toContain('[-7,15,0,14,7,15]') // miệng thẳng nhỏ
  })
  it('đang bay vẫn mỉm cười (mắt mở nhìn về phía trước)', () => {
    render1('fly')
    expect(pointsOf()).toContain('[-9,10,0,18,9,10]')
    const whites = of('circle').filter((circle) => circle.fill === '#FFFFFF' && circle.radius === 11)
    expect(whites).toHaveLength(2)
  })
  it('mọi trạng thái vẽ được (không ném lỗi) và luôn có má hồng', () => {
    for (const state of BEE_STATES) {
      h.nodes = []
      expect(() => render1(state)).not.toThrow()
      expect(of('circle').filter((circle) => circle.fill === '#FF9EB5' && circle.opacity === 0.65)).toHaveLength(2)
    }
  })
  it('kéo: kẹp trong [minX, maxX] và giữ nguyên độ cao; thả thì báo x cuối', () => {
    const onDragMove = vi.fn()
    const onDragEnd = vi.fn()
    render1('idle', { onDragMove, onDragEnd })
    const root = named(BEE_NAMES.root)[0]
    const node = { x: vi.fn((value?: number) => (value === undefined ? 9999 : value)), y: vi.fn() }
    ;(root.onDragMove as (event: unknown) => void)({ target: node })
    expect(node.x).toHaveBeenCalledWith(728)
    expect(node.y).toHaveBeenCalledWith(300)
    expect(onDragMove).toHaveBeenCalledWith(728)
    ;(root.onDragEnd as (event: unknown) => void)({ target: { x: () => 400 } })
    expect(onDragEnd).toHaveBeenCalledWith(400)
  })
})

describe('BeeShadow', () => {
  it('bầu dục mờ mang tên cho bộ chuyển động, không nhận chạm, bẹt (cao nhỏ hơn rộng), mờ ở mức ban đầu', () => {
    render(<BeeShadow x={150} y={480} />)
    const shadow = named(BEE_NAMES.shadow)[0]
    expect(shadow).toMatchObject({ x: 150, y: 480, opacity: SHADOW_BASE_OPACITY, listening: false })
    expect(shadow.radiusY as number).toBeLessThan((shadow.radiusX as number) / 2)
  })
})
