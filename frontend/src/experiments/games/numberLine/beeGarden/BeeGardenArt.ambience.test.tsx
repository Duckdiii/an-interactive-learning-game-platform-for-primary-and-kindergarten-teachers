import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TIMES_OF_DAY } from '../../../theme/themeTypes'
import { GardenBackdrop, GardenForeground } from './BeeGardenArt'
import { GARDEN_COLORS } from './beeGardenColors'
import { beeGardenTheme } from './beeGardenTheme'
import { SCENE_HEIGHT } from './beeGardenGeometry'
import { overlayColor } from './atmosphere'

const h = vi.hoisted(() => ({ nodes: [] as { type: string; props: Record<string, unknown> }[] }))

vi.mock('react-konva', () => {
  type P = Record<string, unknown> & { children?: React.ReactNode }
  const make = (type: string) =>
    function Konva(props: P) {
      h.nodes.push({ type, props })
      return <div data-konva={type}>{props.children}</div>
    }
  return { Group: make('group'), Rect: make('rect'), Circle: make('circle'), Shape: make('shape'), Line: make('line'), Star: make('star'), Image: make('image') }
})
vi.mock('use-image', () => ({ default: () => [{}, 'loaded'] }))

const variants = beeGardenTheme.ambience!.variants
const named = (name: string) => h.nodes.filter((node) => node.props.name === name)
const ofType = (type: string) => h.nodes.filter((node) => node.type === type).map((node) => node.props)

beforeEach(() => {
  h.nodes = []
})

describe('GardenBackdrop theo biến thể', () => {
  it('không truyền biến thể (theme cũ): cảnh gốc, không có không khí nào', () => {
    render(<GardenBackdrop height={SCENE_HEIGHT} />)
    expect(named('motion-pollen')).toHaveLength(0)
    expect(named('motion-star')).toHaveLength(0)
    expect(named('motion-beam')).toHaveLength(3) // tia nắng mặc định có cùng mặt trời
  })
  it('sáng: 12 hạt phấn hoa, 3 chùm tia nắng, không sao; không có lớp phủ (độ đục 0)', () => {
    render(<GardenBackdrop height={SCENE_HEIGHT} variant={variants.morning} />)
    expect(named('motion-pollen')).toHaveLength(12)
    expect(named('motion-beam')).toHaveLength(3)
    expect(named('motion-star')).toHaveLength(0)
    expect(ofType('rect').some((rect) => rect.fill === variants.morning.tint.color && rect.opacity !== undefined)).toBe(false)
  })
  it('đêm: 14 sao, trăng (hình), không tia nắng, không phấn hoa; lớp phủ xanh đêm đúng độ đục; màu trời đổi theo biến thể', () => {
    render(<GardenBackdrop height={SCENE_HEIGHT} variant={variants.night} />)
    expect(named('motion-star')).toHaveLength(14)
    expect(named('motion-beam')).toHaveLength(0)
    expect(named('motion-pollen')).toHaveLength(0)
    expect(ofType('image')).toHaveLength(1) // mặt trăng
    const overlay = ofType('rect').find((rect) => rect.fill === variants.night.tint.color)!
    expect(overlay.opacity).toBe(variants.night.tint.opacity)
    expect(overlay.listening).toBe(false)
    const sky = ofType('rect').find((rect) => Array.isArray(rect.fillLinearGradientColorStops))!
    expect(sky.fillLinearGradientColorStops).toEqual([0, variants.night.sky[0], 1, variants.night.sky[1]])
  })
  it('hoàng hôn: mặt trời hạ thấp hơn buổi sáng, mây đổi màu', () => {
    render(<GardenBackdrop height={SCENE_HEIGHT} variant={variants.morning} />)
    const morningSunY = h.nodes.find((node) => node.type === 'group' && node.props.parallaxK === 3)!.props.y as number
    h.nodes = []
    render(<GardenBackdrop height={SCENE_HEIGHT} variant={variants.sunset} />)
    const sunsetSunY = h.nodes.find((node) => node.type === 'group' && node.props.parallaxK === 3)!.props.y as number
    expect(sunsetSunY - morningSunY).toBe(variants.sunset.celestialDrop)
    const cloudFill = h.nodes.find((node) => node.type === 'circle' && node.props.fill === variants.sunset.cloud.color)
    expect(cloudFill).toBeTruthy()
  })
  it('hạt có dải (motionBand) và chỉ số riêng để bộ chuyển động đặt dáng; mọi thứ không nhận chạm', () => {
    render(<GardenBackdrop height={SCENE_HEIGHT} variant={variants.morning} />)
    for (const pollen of named('motion-pollen')) {
      expect(Array.isArray(pollen.props.motionBand)).toBe(true)
      expect(pollen.props.listening).toBeUndefined() // nhóm cha không nhận chạm; hạt không đăng ký sự kiện nào
      expect(pollen.props.onClick).toBeUndefined()
    }
    expect(new Set(named('motion-pollen').map((node) => node.props.motionIndex)).size).toBe(12)
  })
  it.each(TIMES_OF_DAY)('%s: không biến thể nào vẽ quá ngân sách hạt (≤ 30 hạt chuyển động)', (time) => {
    render(<GardenBackdrop height={SCENE_HEIGHT} variant={variants[time]} />)
    render(<GardenForeground height={SCENE_HEIGHT} frameWidth={2} variant={variants[time]} />)
    const moving = named('motion-pollen').length + named('motion-star').length + named('motion-firefly').length
    expect(moving).toBeLessThanOrEqual(30)
  })
})

describe('GardenForeground theo biến thể', () => {
  it('đêm: 8 đom đóm; sáng: không có; đồi trước và bụi được nhuộm cùng màu lớp phủ (không còn cỏ sáng chói lạc tông)', () => {
    render(<GardenForeground height={SCENE_HEIGHT} frameWidth={2} variant={variants.night} />)
    expect(named('motion-firefly')).toHaveLength(8)
    const night = variants.night
    const expected = overlayColor(GARDEN_COLORS.hillFront, night.tint.color, night.tint.opacity * 0.85)
    expect(h.nodes.find((node) => node.type === 'shape' && node.props.fill === expected)).toBeTruthy()
    expect(expected).not.toBe(GARDEN_COLORS.hillFront)
    h.nodes = []
    render(<GardenForeground height={SCENE_HEIGHT} frameWidth={2} variant={variants.morning} />)
    expect(named('motion-firefly')).toHaveLength(0)
    expect(h.nodes.find((node) => node.type === 'shape' && node.props.fill === GARDEN_COLORS.hillFront)).toBeTruthy() // sáng: màu gốc
  })
  it('không có biến thể: màu gốc, không đom đóm', () => {
    render(<GardenForeground height={SCENE_HEIGHT} frameWidth={2} />)
    expect(named('motion-firefly')).toHaveLength(0)
    expect(h.nodes.find((node) => node.type === 'shape' && node.props.fill === GARDEN_COLORS.hillFront)).toBeTruthy()
  })
})
