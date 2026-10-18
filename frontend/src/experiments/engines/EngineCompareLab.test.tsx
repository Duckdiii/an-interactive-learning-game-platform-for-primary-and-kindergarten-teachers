import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EngineCompareLab from './EngineCompareLab'
import { NUMBER_LINE_FIXTURES } from '../games/numberLine/numberLineFixtures'
import { control } from './pixi/fakePixi'

vi.mock('pixi.js', () => import('./pixi/fakePixi'))
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span data-konva="text">{text}</span>,
  Image: () => null,
  Line: () => null,
  Circle: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../feedback/useExperimentFeedback', () => ({
  useExperimentFeedback: () => ({ kind: null, runId: 0, plan: null, reducedMotion: false, trigger: vi.fn() }),
}))
vi.mock('../feedback/FeedbackOverlay', () => ({ default: () => null }))


beforeEach(() => control.reset())

const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

describe('EngineCompareLab', () => {
  it('mặc định là Konva: có nút chọn engine, mẫu, chế độ, theme; chưa tải Pixi', () => {
    render(<EngineCompareLab />)
    for (const name of ['Konva', 'Pixi (vẽ khi cần)', 'Pixi (vẽ liên tục)']) expect(screen.getByRole('button', { name })).toBeTruthy()
    for (const key of Object.keys(NUMBER_LINE_FIXTURES)) expect(screen.getByRole('button', { name: key })).toBeTruthy()
    for (const mode of ['preview', 'play', 'review']) expect(screen.getByRole('button', { name: mode })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Konva' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('konva-stage')).toBeTruthy()
    expect(control.apps).toHaveLength(0)
    expect(document.querySelector('[data-engine="pixi"]')).toBeNull()
  })

  it('chọn Pixi: nạp lười rồi dựng canvas Pixi, bỏ Konva', async () => {
    render(<EngineCompareLab />)
    press('Pixi (vẽ khi cần)')
    await waitFor(() => expect(document.querySelector('[data-engine="pixi"] canvas')).not.toBeNull(), { timeout: 10_000 })
    expect(screen.queryByTestId('konva-stage')).toBeNull()
    expect(control.apps).toHaveLength(1)
    expect(document.querySelector('[data-render-mode="on-demand"]')).not.toBeNull()
  })

  it('«vẽ liên tục» truyền chế độ vẽ liên tục xuống Pixi', async () => {
    render(<EngineCompareLab />)
    press('Pixi (vẽ liên tục)')
    await waitFor(() => expect(document.querySelector('[data-render-mode="continuous"] canvas')).not.toBeNull(), { timeout: 10_000 })
    expect(control.apps[0].initOptions?.autoStart).toBe(true)
  })

  it('quay về Konva thì hủy ứng dụng Pixi', async () => {
    render(<EngineCompareLab />)
    press('Pixi (vẽ khi cần)')
    await waitFor(() => expect(control.apps).toHaveLength(1), { timeout: 10_000 })
    await act(async () => {})
    press('Konva')
    expect(control.apps[0].destroyed).toBe(true)
    expect(screen.getByTestId('konva-stage')).toBeTruthy()
  })

  it('cùng một mẫu hiện ở cả hai engine: câu hỏi', async () => {
    render(<EngineCompareLab />)
    expect(screen.getByText('Đặt chú ong vào số 7')).toBeTruthy()
    press('Cách 2')
    expect(screen.getByText('Đếm cách 2 nhé: đặt chú ong vào số 12')).toBeTruthy()
    press('Pixi (vẽ khi cần)')
    await waitFor(() => expect(control.apps).toHaveLength(1), { timeout: 10_000 })
    await act(async () => {})
    const stageTexts = control.apps[0].stage.children[0].children.map((c) => (c as unknown as { text?: string }).text)
    expect(stageTexts).toContain('Đếm cách 2 nhé: đặt chú ong vào số 12')
  })

  it('chế độ play với Pixi: giả lập Backend chấm và ghi lại câu trả lời', async () => {
    render(<EngineCompareLab />)
    press('Pixi (vẽ khi cần)')
    press('play')
    await waitFor(() => expect(document.querySelector('[data-engine="pixi"] canvas')).not.toBeNull(), { timeout: 10_000 })
    await act(async () => {})
    fireEvent.change(screen.getByLabelText('Số trên trục'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xong rồi!' }))
    await waitFor(() => expect(screen.getByText('Trả lời gần nhất: play: 7')).toBeTruthy(), { timeout: 10_000 })
  })

  it('chế độ review với Pixi: khóa, không còn nút xác nhận', async () => {
    render(<EngineCompareLab />)
    press('Pixi (vẽ khi cần)')
    press('review')
    await waitFor(() => expect(document.querySelector('[data-engine="pixi"] canvas')).not.toBeNull(), { timeout: 10_000 })
    expect(screen.queryByRole('button', { name: 'Xong rồi!' })).toBeNull()
  })

  it('đổi theme không làm mất màn ở cả hai engine', async () => {
    render(<EngineCompareLab />)
    press('Vũ trụ')
    expect(screen.getByText('Đặt chú ong vào số 7')).toBeTruthy()
    press('Pixi (vẽ khi cần)')
    await waitFor(() => expect(control.apps).toHaveLength(1), { timeout: 10_000 })
    press('Đại dương')
    expect(document.querySelector('[data-engine="pixi"]')).not.toBeNull()
  })
})
