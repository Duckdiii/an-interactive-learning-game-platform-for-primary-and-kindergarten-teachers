import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDotLottie, state as dotState } from './fakeDotLottie'
import { created, resetLottieWeb } from './fakeLottieWeb'
import LottieLab from './LottieLab'

vi.mock('lottie-web', () => import('./fakeLottieWeb'))
vi.mock('@lottiefiles/dotlottie-web', () => import('./fakeDotLottie'))
vi.mock('@lottiefiles/dotlottie-web/dotlottie-player.wasm?url', () => ({ default: '/assets/dotlottie-player-abc123.wasm' }))
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span data-konva="text">{text}</span>,
  Star: () => null,
  Image: () => null,
  Line: () => null,
  Circle: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))

beforeEach(() => {
  resetLottieWeb()
  resetDotLottie()
})

const settle = async () => {
  await act(async () => {
    await vi.dynamicImportSettled()
  })
}
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const names = () => created.map((a) => (a.config.animationData as { nm: string }).nm)

describe('LottieLab', () => {
  it('có đủ nút chọn nguồn, loại phản hồi, theme; mặc định lottie-web (SVG) và hoạt ảnh hợp lệ', async () => {
    render(<LottieLab />)
    await settle()
    for (const name of ['Konva (hiệu ứng hiện có)', 'lottie-web (SVG)', 'lottie-web (canvas)', 'dotlottie-web (canvas + WASM)']) expect(screen.getByRole('button', { name })).toBeTruthy()
    for (const name of ['Đúng (sao nảy)', 'Thử lại (gật đầu)']) expect(screen.getByRole('button', { name })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'lottie-web (SVG)' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Hoạt ảnh Lottie hợp lệ theo validateLottie.')).toBeTruthy()
  })

  it('nạp lười: chưa bấm nguồn dotlottie thì chưa dựng bộ phát dotlottie', async () => {
    render(<LottieLab />)
    await settle()
    expect(dotState.instances).toHaveLength(0)
    expect(created.length).toBeGreaterThan(0)
  })

  it('«Phát» phát hoạt ảnh đang chọn từ đầu; bấm lại thì phát lại', async () => {
    render(<LottieLab />)
    await settle()
    const preview = created[0]
    expect(preview.goToAndPlay).not.toHaveBeenCalled()
    press('Phát')
    expect(preview.goToAndPlay).toHaveBeenCalledWith(0, true)
    press('Phát')
    expect(preview.goToAndPlay).toHaveBeenCalledTimes(2)
  })

  it('đổi loại phản hồi thì dựng hoạt ảnh tương ứng', async () => {
    render(<LottieLab />)
    await settle()
    expect(names()).toContain('star-bounce')
    press('Thử lại (gật đầu)')
    await settle()
    expect(names()).toContain('gentle-nod')
  })

  it('chọn lottie-web (canvas) dùng bộ vẽ canvas; dotlottie phát sau khi nạp xong', async () => {
    render(<LottieLab />)
    press('lottie-web (canvas)')
    await settle()
    expect(created[created.length - 1].config.renderer).toBe('canvas')
    press('dotlottie-web (canvas + WASM)')
    await settle()
    expect(dotState.instances).toHaveLength(1)
    press('Phát')
    expect(dotState.instances[0].play).not.toHaveBeenCalled() // chưa nạp xong
    act(() => dotState.instances[0].emit('load'))
    expect(dotState.instances[0].play).toHaveBeenCalledTimes(1)
  })

  it('«Giảm chuyển động» chỉ hiện khung cuối, không phát', async () => {
    render(<LottieLab />)
    await settle()
    fireEvent.click(screen.getByLabelText(/Giảm chuyển động/))
    press('Phát')
    const preview = created[0]
    expect(preview.goToAndStop).toHaveBeenCalled()
    expect(preview.goToAndPlay).not.toHaveBeenCalled()
  })

  it('nguồn Konva: không dựng Lottie nào; «Phát» dùng hiệu ứng Konva hiện có', async () => {
    render(<LottieLab />)
    press('Konva (hiệu ứng hiện có)')
    await settle()
    const before = created.length
    press('Phát')
    await settle()
    expect(created.length).toBe(before) // không dựng thêm hoạt ảnh Lottie
    expect(screen.getAllByTestId('konva-stage').length).toBeGreaterThan(0)
    expect(screen.getByText(/Konva: không dùng lớp phủ/)).toBeTruthy()
  })

  it('lớp phủ trên NUMBER_LINE: trả lời đúng → sao nảy (chọn «Thử lại» trước để phân biệt với hoạt ảnh xem trước)', async () => {
    render(<LottieLab />)
    press('Thử lại (gật đầu)')
    await settle()
    const before = created.length
    const slider = screen.getByLabelText('Số trên trục')
    fireEvent.change(slider, { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xong rồi!' }))
    await settle()
    expect(screen.getByTestId('lottie-overlay')).toBeTruthy()
    expect(created.length).toBeGreaterThan(before) // lớp phủ dựng bộ phát mới
    expect(names()[names().length - 1]).toBe('star-bounce') // xem trước đang là «gật đầu» nên chỉ lớp phủ mới ra sao
  })

  it('trả lời sai → lớp phủ gương mặt gật đầu (không phải màu/sao «đúng»)', async () => {
    render(<LottieLab />)
    await settle()
    const before = created.length
    fireEvent.change(screen.getByLabelText('Số trên trục'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xong rồi!' }))
    await settle()
    expect(screen.getByTestId('lottie-overlay')).toBeTruthy()
    expect(created.length).toBeGreaterThan(before)
    expect(names()[names().length - 1]).toBe('gentle-nod')
  })

  it('đổi loại phản hồi hoặc theme sau khi đã bấm «Phát» KHÔNG tự phát lại', async () => {
    render(<LottieLab />)
    await settle()
    press('Phát')
    const plays = () => created.reduce((sum, a) => sum + a.goToAndPlay.mock.calls.length, 0)
    expect(plays()).toBe(1)
    press('Thử lại (gật đầu)')
    await settle()
    press('Vũ trụ')
    await settle()
    expect(plays()).toBe(1)
  })

  it('giảm chuyển động theo cài đặt hệ điều hành cũng áp cho «Phát riêng» (không chỉ công tắc của phòng)', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => {}, removeEventListener: () => {} }))
    render(<LottieLab />)
    await settle()
    press('Phát')
    expect(created[0].goToAndStop.mock.calls.length).toBe(1)
    expect(created[0].goToAndPlay).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('nhiều bản cùng lúc: dựng đủ số bộ phát và phát tất cả khi bấm «Phát»', async () => {
    render(<LottieLab />)
    await settle()
    press('12 bản cùng lúc')
    await settle()
    const previews = created.filter((a) => !a.destroyed)
    expect(previews.length).toBeGreaterThanOrEqual(12)
    press('Phát')
    expect(previews.filter((a) => a.goToAndPlay.mock.calls.length > 0).length).toBeGreaterThanOrEqual(12)
    press('1 bản')
    await settle()
    expect(created.filter((a) => !a.destroyed).length).toBeLessThan(12)
  })

  it('đổi theme không làm mất màn', async () => {
    render(<LottieLab />)
    await settle()
    press('Vũ trụ')
    await settle()
    expect(screen.getByRole('button', { name: 'Vũ trụ' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Hoạt ảnh Lottie hợp lệ theo validateLottie.')).toBeTruthy()
  })
})
