import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ResponsiveStage from './ResponsiveStage'

const h = vi.hoisted(() => ({ stage: undefined as Record<string, unknown> | undefined }))

vi.mock('react-konva', () => ({
  Stage: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    h.stage = props
    return <div data-testid="stage">{props.children}</div>
  },
}))
vi.mock('../../experiments/theme/StageBackdrop', () => ({ default: () => null }))

const setContainerWidth = (width: number) =>
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width })
afterEach(() => {
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth
})

const scaleFor = (containerWidth: number, maxScale?: number) => {
  setContainerWidth(containerWidth)
  render(
    <ResponsiveStage width={800} height={600} maxScale={maxScale}>
      <i />
    </ResponsiveStage>,
  )
  return h.stage!.scaleX as number
}

describe('ResponsiveStage: maxScale', () => {
  it('mặc định 1: không phóng to khi khung chứa rộng hơn sân (đúng hành vi cũ của mọi renderer)', () => {
    expect(scaleFor(1200)).toBe(1)
    expect(scaleFor(800)).toBe(1)
  })
  it('khung nhỏ hơn sân thì co lại như cũ, bất kể maxScale', () => {
    expect(scaleFor(400)).toBeCloseTo(0.5, 8)
    expect(scaleFor(400, 1.2)).toBeCloseTo(0.5, 8)
  })
  it('maxScale > 1: phóng to theo khung chứa nhưng không quá maxScale', () => {
    expect(scaleFor(880, 1.2)).toBeCloseTo(1.1, 8)
    expect(scaleFor(960, 1.2)).toBeCloseTo(1.2, 8)
    expect(scaleFor(2000, 1.2)).toBeCloseTo(1.2, 8)
  })
  it('kích thước Stage theo tỉ lệ: rộng và cao đều nhân hệ số, nên tỉ lệ khung không đổi', () => {
    scaleFor(960, 1.2)
    expect(h.stage!.width).toBeCloseTo(960, 8)
    expect(h.stage!.height).toBeCloseTo(720, 8)
  })
})
