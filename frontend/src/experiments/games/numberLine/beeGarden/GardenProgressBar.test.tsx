import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GardenProgressBar, { ProgressFlyer } from './GardenProgressBar'
import { progressSlots } from './progressSlots'

interface Recorded {
  node: unknown
  attrs: Record<string, number>
  onFinish: () => void
  destroyed: boolean
  played: boolean
}

const h = vi.hoisted(() => ({
  nodes: [] as { type: string; props: Record<string, unknown> }[],
  srcs: [] as string[],
  image: {} as object | undefined,
  tweens: [] as unknown[],
}))
const tweens = () => h.tweens as Recorded[]

vi.mock('react-konva', () => {
  type P = Record<string, unknown> & { children?: React.ReactNode }
  const make = (type: string) =>
    function Konva(props: P) {
      h.nodes.push({ type, props })
      const ref = props.ref as { current: unknown } | undefined
      if (ref && typeof ref === 'object') ref.current = { type, x: () => 0, y: () => 0, scaleX: () => 1, scaleY: () => 1 }
      return <div data-konva={type}>{props.children}</div>
    }
  return { Group: make('group'), Rect: make('rect'), Circle: make('circle'), Image: make('image') }
})
vi.mock('use-image', () => ({
  default: (src: string) => {
    h.srcs.push(src)
    return [h.image, h.image ? 'loaded' : 'loading']
  },
}))
vi.mock('./konvaTween', () => ({
  konvaTweenFactory: (node: unknown, attrs: Record<string, number>, _seconds: number, _ease: string, onFinish: () => void) => {
    const tween: Recorded = { node, attrs: { ...attrs }, onFinish, destroyed: false, played: false }
    h.tweens.push(tween)
    return { play: () => void (tween.played = true), destroy: () => void (tween.destroyed = true) }
  },
}))

const of = (type: string) => h.nodes.filter((node) => node.type === type).map((node) => node.props)
const BOX = [34, 26, 720, 36] as const
const bar = (filled: boolean[], animate = true) => (
  <GardenProgressBar box={BOX} total={filled.length} filled={filled} animate={animate} track="#DFF1FF" border="#2E8BC9" borderWidth={2} glow="#FFD43B" />
)

beforeEach(() => {
  h.nodes = []
  h.srcs = []
  h.image = {}
  h.tweens = []
})

describe('GardenProgressBar (thanh tiến độ trong cảnh)', () => {
  it('một thanh bo tròn đúng hộp đưa vào (thẳng hàng mép) và N ô; không nhận chạm', () => {
    render(bar([false, false, false, false, false]))
    const pill = of('rect')[0]
    expect([pill.x, pill.y, pill.width, pill.height]).toEqual([...BOX])
    expect(pill.cornerRadius).toBe(BOX[3] / 2)
    expect(of('group').some((group) => group.listening === false)).toBe(true)
    expect(of('image')).toHaveLength(5)
  })
  it('ô chưa nở là cây non (nhạt), ô đã nở là bông hoa riêng của ô có quầng sáng; KHÔNG có vạch tô theo số lượng che lên ô khác', () => {
    render(bar([true, false, true, false, false]))
    expect(of('rect')).toHaveLength(1)
    expect(of('circle')).toHaveLength(2)
    expect(h.srcs.some((src) => /seedling/.test(src))).toBe(true)
    expect(h.srcs.some((src) => src.includes('sunflower'))).toBe(true)
    const images = of('image')
    expect(images.filter((image) => image.opacity === 1)).toHaveLength(2)
    expect(images.filter((image) => image.opacity === 0.7)).toHaveLength(3)
  })
  it('ô đặt đúng chỗ theo progressSlots (đều nhau, thứ tự trái sang phải)', () => {
    render(bar([false, false, false]))
    const slots = progressSlots(BOX, 3)
    const groups = of('group').filter((group) => typeof group.x === 'number')
    expect(groups.map((group) => group.x)).toEqual(slots.centers)
    expect(new Set(groups.map((group) => group.y)).size).toBe(1)
  })
  it('ô vừa nở thì «nở» một nhịp (hoa phóng lên); ô đã nở sẵn từ đầu hoặc giảm chuyển động thì không', () => {
    const view = render(bar([false, false, false]))
    expect(tweens()).toHaveLength(0)
    act(() => view.rerender(bar([true, false, false])))
    expect(tweens().some((tween) => tween.attrs.scaleX > 1)).toBe(true)
    view.unmount()
    h.tweens = []
    const still = render(bar([true, false, false]))
    expect(tweens()).toHaveLength(0)
    still.unmount()
    const reduced = render(bar([false, false, false], false))
    act(() => reduced.rerender(bar([true, false, false], false)))
    expect(tweens()).toHaveLength(0)
  })
})

describe('ProgressFlyer (hoa bay lên thanh)', () => {
  it('bay từ hoa vừa chọn lên đúng ô: tween x tới tâm ô; bay xong thì báo xong đúng một lần', () => {
    const onDone = vi.fn()
    render(<ProgressFlyer from={{ x: 300, y: 400 }} to={{ x: 150, y: 44 }} size={44} index={0} onDone={onDone} />)
    const image = of('image')[0]
    expect(image.x).toBe(300)
    expect(image.y).toBe(400)
    expect(image.listening).toBe(false)
    const flight = tweens().filter((tween) => 'x' in tween.attrs)
    expect(flight[0].attrs.x).toBe(150)
    expect(flight[0].played).toBe(true)
    for (let round = 0; round < 4; round += 1) for (const tween of tweens().slice()) if (!tween.destroyed) act(() => tween.onFinish())
    expect(onDone).toHaveBeenCalledTimes(1)
  })
  it('hình chưa tải xong thì chưa vẽ và chưa bay (không báo xong sớm)', () => {
    h.image = undefined
    const onDone = vi.fn()
    render(<ProgressFlyer from={{ x: 1, y: 2 }} to={{ x: 3, y: 4 }} size={44} index={1} onDone={onDone} />)
    expect(of('image')).toHaveLength(0)
    expect(tweens()).toHaveLength(0)
    expect(onDone).not.toHaveBeenCalled()
  })
  it('đóng màn giữa chừng: các tween bị hủy, không báo xong', () => {
    const onDone = vi.fn()
    const view = render(<ProgressFlyer from={{ x: 300, y: 400 }} to={{ x: 150, y: 44 }} size={44} index={2} onDone={onDone} />)
    view.unmount()
    expect(tweens().every((tween) => tween.destroyed)).toBe(true)
    for (const tween of tweens()) tween.onFinish()
    expect(onDone).not.toHaveBeenCalled()
  })
})
