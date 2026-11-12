import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { forwardRef, useImperativeHandle } from 'react'
import type { ReactNode } from 'react'
import type Konva from 'konva'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VisualClozeImageRenderer from './VisualClozeImageRenderer'
import { visualClozeImageDemo } from './visualClozeImageDemo'

const effects = vi.hoisted(() => ({ imageStatus: 'loaded' as 'loading' | 'failed' | 'loaded', correct: vi.fn(), wrong: vi.fn() }))

vi.mock('use-image', () => ({ default: () => [{ width: 800, height: 480 }, effects.imageStatus] }))
vi.mock('../common/useAnswerAudio', () => ({ useAnswerAudio: () => (correct: boolean) => (correct ? effects.correct : effects.wrong)() }))
vi.mock('../common/useGamePalette', () => ({ useGamePalette: () => ({ audioStroke: '#4FC3F7', audioVisualWrongLine: '#EF9A9A', ink: '#222', surface: '#fff' }) }))
vi.mock('react-konva', () => ({
  Stage: ({ children, width, height }: { children: ReactNode; width: number; height: number }) => <div data-testid="stage" data-width={width} data-height={height}>{children}</div>,
  Layer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Group: forwardRef<Konva.Group, { children: ReactNode; onClick?: () => void; name?: string; x?: number; y?: number }>(
    ({ children, onClick, name, x }, ref) => {
      useImperativeHandle(ref, () => ({} as Konva.Group))
      return <div data-testid={name} data-x={x} onClick={onClick}>{children}</div>
    },
  ),
  Rect: ({ stroke, fill }: { stroke?: string; fill?: string }) => <span data-testid="konva-rect" data-stroke={stroke} data-fill={fill} />,
  Image: ({ width, height }: { width?: number; height?: number }) => <span data-testid="konva-image" data-width={width} data-height={height} />,
  Text: ({ text }: { text: string }) => <span>{text}</span>,
}))

const onSubmit = () => vi.fn().mockResolvedValue({ status: 'CORRECT', isCorrect: true, pointsEarned: 100, totalScore: 100, correctAnswer: null })

beforeEach(() => {
  effects.imageStatus = 'loaded'
  effects.correct.mockReset()
  effects.wrong.mockReset()
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
  globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }
})

afterEach(() => vi.restoreAllMocks())

describe('VisualClozeImageRenderer', () => {
  it('keeps dragged image tiles transparent so no white card is carried into the blank', () => {
    render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={onSubmit()} />)

    expect(screen.getAllByTestId('konva-rect')).toHaveLength(4)
    expect(screen.getAllByTestId('konva-rect').every((rect) => rect.getAttribute('data-fill') === 'transparent')).toBe(true)
  })

  it('shows the scene through an empty blank', () => {
    render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={onSubmit()} />)
    expect(within(screen.getByTestId('visual-cloze-blank-garden-butterfly')).getByTestId('konva-rect'))
      .toHaveAttribute('data-fill', 'transparent')
  })

  it('plays correct or wrong speech once for each graded placement, including partial progress', async () => {
    const submit = vi.fn()
      .mockResolvedValueOnce({ status: 'IN_PROGRESS', isCorrect: true, placementCorrect: true, retryable: true })
      .mockResolvedValueOnce({ status: 'INCORRECT', isCorrect: false, placementCorrect: false, retryable: true })
      .mockResolvedValueOnce({ status: 'CORRECT', isCorrect: true, placementCorrect: true, retryable: false })
    const question = { ...visualClozeImageDemo, blanks: [{ id: 'first', x: 250, y: 240 }, { id: 'second', x: 550, y: 240 }] }
    render(<VisualClozeImageRenderer question={question} onSubmit={submit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Con bướm' }))
    fireEvent.click(screen.getByTestId('visual-cloze-blank-first'))
    await waitFor(() => expect(effects.correct).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: 'Bọ rùa' }))
    fireEvent.click(screen.getByTestId('visual-cloze-blank-second'))
    await waitFor(() => expect(effects.wrong).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: 'Con ong' }))
    fireEvent.click(screen.getByTestId('visual-cloze-blank-second'))
    await waitFor(() => expect(effects.correct).toHaveBeenCalledTimes(2))
    expect(effects.wrong).toHaveBeenCalledOnce()
    expect(submit).toHaveBeenCalledTimes(3)
  })
  it('does not call a request failure a wrong answer', async () => {
    render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={vi.fn().mockRejectedValue(new Error('offline'))} />)
    fireEvent.click(screen.getByRole('button', { name: 'Con ong' }))
    fireEvent.click(screen.getByTestId('visual-cloze-blank-garden-butterfly'))
    await screen.findByRole('button', { name: 'Thử gửi lại' })
    expect(effects.wrong).not.toHaveBeenCalled()
    expect(effects.correct).not.toHaveBeenCalled()
  })
  it.each([true, false])('discards feedback after unmount (placementCorrect=%s)', async (placementCorrect) => {
    let finish!: (result: unknown) => void
    const submit = vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const { unmount } = render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={submit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Con ong' }))
    fireEvent.click(screen.getByTestId('visual-cloze-blank-garden-butterfly'))
    unmount()
    finish({ status: placementCorrect ? 'CORRECT' : 'INCORRECT', isCorrect: placementCorrect, placementCorrect })
    await Promise.resolve()
    expect(effects.correct).not.toHaveBeenCalled()
    expect(effects.wrong).not.toHaveBeenCalled()
  })
  it('submits complete placements to the server without deciding correctness locally', async () => {
    const submit = onSubmit()
    render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={submit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Con ong' }))
    fireEvent.click(screen.getByTestId('visual-cloze-blank-garden-butterfly'))

    await waitFor(() => expect(submit).toHaveBeenCalledWith({ placements: [{ blankId: 'garden-butterfly', optionId: 'bee' }] }))
  })

  it('fills the blank, removes the option, and submits exactly once', async () => {
    const submit = onSubmit()
    render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={submit} />)
    fireEvent.click(screen.getByRole('button', { name: visualClozeImageDemo.options[1].visualPrompt }))
    fireEvent.click(screen.getByTestId('visual-cloze-blank-garden-butterfly'))

    expect(await within(screen.getByTestId('visual-cloze-blank-garden-butterfly')).findByTestId('avm-option-butterfly')).toBeInTheDocument()
    expect(within(screen.getByTestId('visual-cloze-blank-garden-butterfly')).getByTestId('konva-image')).toHaveAttribute('data-width', '96')
    expect(within(screen.getByTestId('visual-cloze-blank-garden-butterfly')).getByTestId('konva-rect'))
      .toHaveAttribute('data-fill', expect.stringMatching(/^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/))
    expect(screen.queryByRole('button', { name: visualClozeImageDemo.options[1].visualPrompt })).toBeNull()
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('keeps a wrong option selected and lets the learner retry the same blank', async () => {
    const submit = vi.fn()
      .mockResolvedValueOnce({ status: 'INCORRECT', isCorrect: false, placementCorrect: false, retryable: true, pointsEarned: 0, totalScore: 0, correctAnswer: null })
      .mockResolvedValueOnce({ status: 'CORRECT', isCorrect: true, placementCorrect: true, retryable: false, pointsEarned: 90, totalScore: 90, correctAnswer: { placements: [{ blankId: 'garden-butterfly', optionId: 'butterfly' }] } })
    render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={submit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Con ong' }))
    fireEvent.click(screen.getByTestId('visual-cloze-blank-garden-butterfly'))

    await waitFor(() => expect(within(screen.getByTestId('visual-cloze-blank-garden-butterfly')).getByTestId('konva-rect')).toHaveAttribute('data-stroke', '#EF9A9A'))
    expect(screen.getByRole('button', { name: 'Con ong' })).toHaveAttribute('aria-pressed', 'true')
    expect(submit).toHaveBeenLastCalledWith({ placements: [{ blankId: 'garden-butterfly', optionId: 'bee' }] })

    fireEvent.click(screen.getByRole('button', { name: visualClozeImageDemo.options[1].visualPrompt }))
    fireEvent.click(screen.getByTestId('visual-cloze-blank-garden-butterfly'))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
    expect(submit).toHaveBeenLastCalledWith({ placements: [{ blankId: 'garden-butterfly', optionId: 'butterfly' }] })
  })

  it('gently shakes the incorrect blank and returns it to its original position', async () => {
    vi.useFakeTimers()
    try {
      const submit = vi.fn().mockResolvedValue({ status: 'INCORRECT', placementCorrect: false, retryable: true })
      render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={submit} />)
      const blank = screen.getByTestId('visual-cloze-blank-garden-butterfly')
      const originalX = Number(blank.getAttribute('data-x'))
      fireEvent.click(screen.getByRole('button', { name: 'Con ong' }))
      fireEvent.click(blank)
      await act(async () => { await Promise.resolve() })
      expect(Number(blank.getAttribute('data-x'))).not.toBe(originalX)
      await act(async () => { vi.advanceTimersByTime(400) })
      expect(Number(blank.getAttribute('data-x'))).toBe(originalX)
      expect(screen.getByRole('button', { name: 'Con ong' })).toHaveAttribute('aria-pressed', 'true')
    } finally {
      vi.useRealTimers()
    }
  })

  it('allows dragging an option with touch to a scaled scene blank', async () => {
    const submit = onSubmit()
    render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={submit} />)
    const scene = screen.getByTestId('visual-cloze-scene-drop-zone')
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 50, right: 500, bottom: 290, width: 400, height: 240, x: 100, y: 50, toJSON: () => ({}),
    } as DOMRect)
    const option = screen.getByRole('button', { name: 'Con ong' })
    fireEvent.touchStart(option, { touches: [{ identifier: 1, clientX: 120, clientY: 400 }] })
    fireEvent.touchMove(option, { touches: [{ identifier: 1, clientX: 315, clientY: 170 }] })
    fireEvent.touchEnd(option, { changedTouches: [{ identifier: 1, clientX: 315, clientY: 170 }], touches: [] })
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ placements: [{ blankId: 'garden-butterfly', optionId: 'bee' }] }))
  })

  it('allows replacing a wrong touch drop and ignores drops outside the scene', async () => {
    const submit = vi.fn()
      .mockResolvedValueOnce({ status: 'INCORRECT', placementCorrect: false, retryable: true })
      .mockResolvedValueOnce({ status: 'CORRECT', isCorrect: true, placementCorrect: true })
    render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={submit} />)
    const scene = screen.getByTestId('visual-cloze-scene-drop-zone')
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 50, right: 500, bottom: 290, width: 400, height: 240, x: 100, y: 50, toJSON: () => ({}),
    } as DOMRect)
    const drag = (name: string, x: number, y: number) => {
      const option = screen.getByRole('button', { name })
      fireEvent.touchStart(option, { touches: [{ identifier: 1, clientX: 120, clientY: 400 }] })
      fireEvent.touchEnd(option, { changedTouches: [{ identifier: 1, clientX: x, clientY: y }], touches: [] })
    }
    drag('Con ong', 10, 10)
    expect(submit).not.toHaveBeenCalled()
    drag('Con ong', 315, 170)
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    drag('Con bướm', 315, 170)
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
    expect(submit).toHaveBeenLastCalledWith({ placements: [{ blankId: 'garden-butterfly', optionId: 'butterfly' }] })
  })

  it('does not accept touch drops just outside the scene even when a blank is near its edge', async () => {
    const submit = onSubmit()
    const question = { ...visualClozeImageDemo, blanks: [{ id: 'edge', x: 50, y: 240 }] }
    render(<VisualClozeImageRenderer question={question} onSubmit={submit} />)
    const scene = screen.getByTestId('visual-cloze-scene-drop-zone')
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 50, right: 500, bottom: 290, width: 400, height: 240, x: 100, y: 50, toJSON: () => ({}),
    } as DOMRect)
    const option = screen.getByRole('button', { name: 'Con ong' })
    fireEvent.touchStart(option, { touches: [{ identifier: 1, clientX: 120, clientY: 400 }] })
    fireEvent.touchEnd(option, { changedTouches: [{ identifier: 1, clientX: 99, clientY: 170 }], touches: [] })
    expect(submit).not.toHaveBeenCalled()
  })

  it('lets the learner drag an option into a blank and replace a wrong image by dragging another', async () => {
    const submit = vi.fn()
      .mockResolvedValueOnce({ status: 'INCORRECT', isCorrect: false, placementCorrect: false, retryable: true, pointsEarned: 0, totalScore: 0, correctAnswer: null })
      .mockResolvedValueOnce({ status: 'CORRECT', isCorrect: true, placementCorrect: true, retryable: false, pointsEarned: 90, totalScore: 90, correctAnswer: { placements: [{ blankId: 'garden-butterfly', optionId: 'butterfly' }] } })
    render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={submit} />)
    const scene = screen.getByTestId('visual-cloze-scene-drop-zone')
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 800, bottom: 460, width: 800, height: 460, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect)
    const blank = visualClozeImageDemo.blanks[0]
    const scale = 460 / visualClozeImageDemo.sceneHeight
    const dragOption = (optionId: string, prompt: string, offsetX = 0, offsetY = 0) => {
      const dataTransfer = { setData: vi.fn(), getData: vi.fn(() => optionId), effectAllowed: 'copy' }
      fireEvent.dragStart(screen.getByRole('button', { name: prompt }), { dataTransfer })
      fireEvent.dragOver(scene, { dataTransfer })
      const drop = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperties(drop, {
        dataTransfer: { value: dataTransfer },
        clientX: { value: (blank.x + offsetX) * scale },
        clientY: { value: (blank.y + offsetY) * scale },
      })
      fireEvent(scene, drop)
    }

    // 60 source pixels is outside the visible 100px blank, but inside the enlarged drop target.
    dragOption('bee', 'Con ong', 60)
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect(within(screen.getByTestId('visual-cloze-blank-garden-butterfly')).getByTestId('avm-option-bee')).toBeInTheDocument()

    dragOption('butterfly', visualClozeImageDemo.options[1].visualPrompt)
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
    expect(within(screen.getByTestId('visual-cloze-blank-garden-butterfly')).getByTestId('avm-option-butterfly')).toBeInTheDocument()
    expect(within(screen.getByTestId('visual-cloze-blank-garden-butterfly')).queryByTestId('avm-option-bee')).toBeNull()
  })

  it('maps drag coordinates correctly when a preview or presentation scales the scene', async () => {
    const submit = onSubmit()
    const question = {
      ...visualClozeImageDemo,
      blanks: [{ id: 'left', x: 250, y: 240 }, { id: 'right', x: 600, y: 240 }],
    }
    render(<VisualClozeImageRenderer question={question} onSubmit={submit} />)
    const scene = screen.getByTestId('visual-cloze-scene-drop-zone')
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 50, right: 500, bottom: 290, width: 400, height: 240, x: 100, y: 50, toJSON: () => ({}),
    } as DOMRect)
    const dataTransfer = { setData: vi.fn(), getData: vi.fn(() => 'bee'), effectAllowed: 'copy' }
    fireEvent.dragStart(screen.getByRole('button', { name: 'Con ong' }), { dataTransfer })
    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperties(drop, {
      dataTransfer: { value: dataTransfer },
      clientX: { value: 100 + (600 / 800) * 400 },
      clientY: { value: 50 + (240 / 480) * 240 },
    })
    fireEvent(scene, drop)

    await waitFor(() => expect(submit).toHaveBeenCalledWith({ placements: [{ blankId: 'right', optionId: 'bee' }] }))
  })

  it('restores server-confirmed placements when the student reloads a session', () => {
    const question = { ...visualClozeImageDemo, acceptedPlacements: [{ blankId: 'garden-butterfly', optionId: 'butterfly' }] }
    render(<VisualClozeImageRenderer question={question} onSubmit={onSubmit()} />)
    expect(screen.queryByRole('button', { name: visualClozeImageDemo.options[1].visualPrompt })).toBeNull()
    expect(within(screen.getByTestId('visual-cloze-blank-garden-butterfly')).getByTestId('avm-option-butterfly')).toBeInTheDocument()
  })

  it('shows a fallback when the scene image fails to load', async () => {
    effects.imageStatus = 'failed'
    render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={onSubmit()} />)
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })

  it('rejects duplicate option identifiers instead of rendering an ambiguous question', () => {
    const question = { ...visualClozeImageDemo, options: [visualClozeImageDemo.options[0], visualClozeImageDemo.options[0]] }
    render(<VisualClozeImageRenderer question={question} onSubmit={onSubmit()} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('rejects a blank whose 100px target area would be clipped by the scene edge', () => {
    const question = { ...visualClozeImageDemo, blanks: [{ ...visualClozeImageDemo.blanks[0], x: 20 }] }
    render(<VisualClozeImageRenderer question={question} onSubmit={onSubmit()} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('scales the scene stage uniformly to the available viewport', async () => {
    render(<VisualClozeImageRenderer question={visualClozeImageDemo} onSubmit={onSubmit()} />)
    await waitFor(() => expect(screen.getAllByTestId('stage')[0]).toHaveAttribute('data-width', '766.6666666666667'))
    expect(screen.getAllByTestId('stage')[0]).toHaveAttribute('data-height', '460')
  })
})
