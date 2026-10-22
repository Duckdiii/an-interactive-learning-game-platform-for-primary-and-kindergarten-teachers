import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GardenReward from './GardenReward'
import { gardenUi } from './gardenUi'
import { beeGardenTheme } from './beeGardenTheme'

const tone = gardenUi(beeGardenTheme).primary
const animations: { cancel: ReturnType<typeof vi.fn> }[] = []

beforeEach(() => {
  animations.length = 0
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value() {
      const animation = { cancel: vi.fn() }
      animations.push(animation)
      return animation
    },
  })
})
afterEach(() => {
  delete (Element.prototype as unknown as Record<string, unknown>).animate
})

const setup = (earned: (boolean | undefined)[], extra: { reducedMotion?: boolean; onRestart?: () => void } = {}) =>
  render(<GardenReward earned={earned} total={5} onRestart={extra.onRestart ?? (() => undefined)} tone={tone} minPx={64} reducedMotion={extra.reducedMotion ?? false} />)

describe('GardenReward (màn kết thúc)', () => {
  it('ghi số bông hoa nở trên tổng, trong role=status; số hũ mật bằng số hoa', () => {
    setup([true, true, false, true, false])
    expect(screen.getByRole('status').textContent).toContain('Giỏi quá! Bé được 3 / 5 bông hoa')
    expect(screen.getByText('Ong thu được 3 hũ mật')).toBeTruthy()
    expect(document.querySelectorAll('img[width="36"]')).toHaveLength(3) // mỗi hoa một hũ mật
  })
  it('vườn có đủ 5 ô: hoa nở (to) cho câu đúng, cây non (nhỏ) cho câu chưa đúng', () => {
    setup([true, false, true, undefined, false])
    const row = Array.from(document.querySelectorAll('div[aria-hidden="true"] img'))
    expect(row).toHaveLength(5)
    expect(row.filter((img) => img.getAttribute('width') === '72')).toHaveLength(2)
    expect(row.filter((img) => img.getAttribute('width') === '56')).toHaveLength(3)
  })
  it('chưa đúng câu nào: lời rủ chơi lại nhẹ nhàng, không có hũ mật, không chê', () => {
    setup([false, false, false, false, false])
    expect(screen.getByText('Mình chơi lại để hoa nở nhé!')).toBeTruthy()
    expect(document.querySelectorAll('img[width="36"]')).toHaveLength(0)
    expect(screen.getByRole('status').textContent).not.toMatch(/sai|dở|kém|tệ/i)
  })
  it('cảnh càng nhiều hoa càng nhiều bướm (ong luôn có); bấm Chơi lại gọi onRestart', () => {
    const onRestart = vi.fn()
    const { unmount } = setup([false, false, false, false, false], { onRestart })
    const floating = () => document.querySelectorAll('img.absolute').length
    expect(floating()).toBe(1) // chỉ con ong
    unmount()
    setup([true, true, true, true, true], { onRestart })
    expect(floating()).toBe(4) // ong + ba bướm
    fireEvent.click(screen.getByRole('button', { name: 'Chơi lại' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
  })
  it('nút Chơi lại đạt vùng chạm tối thiểu theo độ tuổi', () => {
    setup([true])
    expect(parseInt((screen.getByRole('button', { name: 'Chơi lại' }) as HTMLElement).style.minHeight, 10)).toBeGreaterThanOrEqual(64)
  })
  it('hình trôi lơ lửng chạy bằng Web Animations và được hủy khi đóng; giảm chuyển động thì không chạy gì', () => {
    const view = setup([true, true, true, true, true])
    expect(animations.length).toBe(4)
    view.unmount()
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true)
    animations.length = 0
    setup([true, true, true, true, true], { reducedMotion: true })
    expect(animations).toHaveLength(0)
  })
})
