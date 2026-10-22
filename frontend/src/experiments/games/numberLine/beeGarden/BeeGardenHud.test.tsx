import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HudBadge, HudSign, HudSpeaker } from './BeeGardenHud'
import { BADGE_NUMBER_FONT_SIZE, QUESTION_FONT_SIZE } from './beeGardenGeometry'
import { MOTION_NAMES } from './gardenMotion'

const h = vi.hoisted(() => ({ image: {} as object | undefined, nodes: [] as { type: string; props: Record<string, unknown> }[], useImageSrc: [] as string[] }))

vi.mock('react-konva', () => {
  type P = Record<string, unknown> & { children?: React.ReactNode }
  const make = (type: string) =>
    function Konva(props: P) {
      h.nodes.push({ type, props })
      const onClick = props.onClick as (() => void) | undefined
      return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div data-konva={type} onClick={onClick ? () => onClick() : undefined}>
          {type === 'text' ? String(props.text) : props.children}
        </div>
      )
    }
  return {
    Group: make('group'),
    Rect: make('rect'),
    Circle: make('circle'),
    Line: make('line'),
    Text: make('text'),
    Image: make('image'),
    Ellipse: make('ellipse'),
    Arc: make('arc'),
    RegularPolygon: make('polygon'),
    Shape: make('shape'),
    Star: make('star'),
  }
})
vi.mock('use-image', () => ({
  default: (src: string) => {
    h.useImageSrc.push(src)
    return [h.image, h.image ? 'loaded' : 'loading']
  },
}))

const nodes = (type: string) => h.nodes.filter((node) => node.type === type).map((node) => node.props)

beforeEach(() => {
  h.nodes = []
  h.image = {}
  h.useImageSrc = []
})

describe('HudSign (bảng gỗ đề bài)', () => {
  const render1 = (ropeLength = 14) =>
    render(<HudSign box={[100, 60, 400, 90]} textBox={{ x: 122, y: 70, width: 356, height: 70 }} text="Đặt chú ong vào số 3" fontSize={QUESTION_FONT_SIZE} ropeLength={ropeLength} />)

  it('hiện chữ đề bài, cỡ chữ nhỏ hơn con số trên huy hiệu', () => {
    render1()
    expect(screen.getByText('Đặt chú ong vào số 3')).toBeTruthy()
    expect(nodes('text')[0].fontSize).toBe(QUESTION_FONT_SIZE)
    expect(QUESTION_FONT_SIZE).toBeLessThan(BADGE_NUMBER_FONT_SIZE)
  })
  it('chữ được cắt bằng «…» khi quá dài (ellipsis) và không nhận chạm', () => {
    render1()
    expect(nodes('text')[0]).toMatchObject({ ellipsis: true, listening: false })
  })
  it('có hai dây treo khi có độ dài dây; không có dây khi độ dài 0', () => {
    render1(14)
    const ropes = nodes('line').filter((line) => line.strokeWidth === 4)
    expect(ropes).toHaveLength(2)
    h.nodes = []
    render1(0)
    expect(nodes('line').filter((line) => line.strokeWidth === 4)).toHaveLength(0)
  })
  it('theo quy tắc nét: viền mặt bảng dày bằng strokes.ui (4), có bóng nổi lệch xuống strokes.uiShadow (6)', () => {
    render1()
    const rects = nodes('rect')
    const face = rects.find((rect) => rect.strokeWidth !== undefined)!
    const shadow = rects.find((rect) => rect.strokeWidth === undefined)!
    expect(face.strokeWidth).toBe(4)
    expect(shadow.y).toBe(6)
  })
  it('mặt bảng NHẬN CHẠM (không tắt listening): chạm lên bảng không bị tính là chạm vườn và không đưa ong đi', () => {
    render1()
    for (const rect of nodes('rect')) expect(rect.listening).not.toBe(false)
  })
})

describe('HudBadge (huy hiệu số lớn)', () => {
  const badge = (value: string) => render(<HudBadge box={[20, 40, 108, 108]} value={value} />)

  it('hiện con số với cỡ chữ rất lớn; số nhiều chữ số thì co lại để vừa huy hiệu', () => {
    badge('3')
    expect(screen.getByText('3')).toBeTruthy()
    expect(nodes('text')[0].fontSize).toBe(BADGE_NUMBER_FONT_SIZE)
    h.nodes = []
    badge('10')
    const two = nodes('text')[0].fontSize as number
    h.nodes = []
    badge('100')
    const three = nodes('text')[0].fontSize as number
    expect(two).toBeLessThan(BADGE_NUMBER_FONT_SIZE)
    expect(three).toBeLessThan(two)
  })
  it('là hình tròn đúng bằng hộp (bán kính nửa cạnh), cùng quy tắc nét với bảng', () => {
    badge('3')
    const face = nodes('circle').find((circle) => circle.strokeWidth === 4)!
    expect(face.radius).toBe(54)
    expect(nodes('circle').some((circle) => circle.y === 6)).toBe(true) // bóng nổi
  })
  it('chữ số không nhận chạm; mặt huy hiệu nhận chạm (chặn chạm xuyên xuống vườn)', () => {
    badge('3')
    expect(nodes('text')[0].listening).toBe(false)
    expect(nodes('circle').find((circle) => circle.strokeWidth === 4)!.listening).not.toBe(false)
  })
})

describe('HudSpeaker (nút nghe lại)', () => {
  const speaker = (props: { speaking: boolean; animate: boolean; onPress?: () => void }) =>
    render(<HudSpeaker box={[600, 30, 144, 144]} onPress={props.onPress ?? (() => undefined)} speaking={props.speaking} animate={props.animate} />)
  const waves = () => nodes('arc').filter((arc) => arc.name === MOTION_NAMES.wave)

  it('có nhãn «Nghe lại»; biểu tượng loa VẼ BẰNG KONVA màu mực đậm của nút (không dùng hình Fluent xám nhạt, không dùng emoji hệ thống)', () => {
    speaker({ speaking: false, animate: true })
    expect(screen.getByText('Nghe lại')).toBeTruthy()
    expect(screen.queryByText('🔊')).toBeNull()
    expect(nodes('image')).toHaveLength(0)
    expect(h.useImageSrc).toHaveLength(0)
    const body = nodes('line').find((line) => line.closed === true)!
    expect(body.fill).toBe(body.stroke) // thân loa đặc, cùng màu mực với chữ «Nghe lại»
    expect(body.fill).toBe(nodes('text')[0].fill)
  })
  it('thân loa luôn hiện cùng một cung tĩnh (nhìn là biết loa ngay cả khi không đọc)', () => {
    speaker({ speaking: false, animate: true })
    const staticArcs = nodes('arc').filter((arc) => arc.name !== MOTION_NAMES.wave)
    expect(staticArcs).toHaveLength(1)
    expect(staticArcs[0].opacity).toBeUndefined() // không ẩn
  })
  it('bấm được không giới hạn số lần', () => {
    const onPress = vi.fn()
    speaker({ speaking: false, animate: true, onPress })
    const label = screen.getByText('Nghe lại')
    for (let i = 0; i < 5; i += 1) fireEvent.click(label)
    expect(onPress).toHaveBeenCalledTimes(5)
  })
  it('có nhóm loa và ba cung sóng mang tên cho bộ chuyển động; sóng ẩn khi không đọc; bán kính tăng dần', () => {
    speaker({ speaking: false, animate: true })
    expect(nodes('group').some((group) => group.name === MOTION_NAMES.speaker)).toBe(true)
    expect(waves()).toHaveLength(3)
    expect(waves().map((wave) => wave.motionIndex)).toEqual([0, 1, 2])
    for (const wave of waves()) expect(wave.opacity).toBe(0)
    const radii = waves().map((wave) => wave.outerRadius as number)
    expect(radii[0]).toBeLessThan(radii[1])
    expect(radii[1]).toBeLessThan(radii[2])
  })
  it('mọi cung nằm GỌN trong mặt nút (không tràn ra ngoài viền như các vòng tròn cũ)', () => {
    speaker({ speaking: true, animate: true })
    const widest = Math.max(...nodes('arc').map((arc) => arc.outerRadius as number))
    const centerOffset = 144 / 2 // tâm nhóm loa lệch trái một chút so với tâm nút; cung đo từ tâm nhóm
    expect(centerOffset + widest).toBeLessThan(144 - 8) // chừa mép phải của nút
  })
  it('giảm chuyển động (animate = false) mà đang đọc: sóng hiện TĨNH (không chờ bộ chuyển động); đang đọc có chuyển động thì để bộ chuyển động chớp', () => {
    speaker({ speaking: true, animate: false })
    for (const wave of waves()) expect(wave.opacity).toBe(0.85)
    h.nodes = []
    speaker({ speaking: true, animate: true })
    for (const wave of waves()) expect(wave.opacity).toBe(0)
  })
})
