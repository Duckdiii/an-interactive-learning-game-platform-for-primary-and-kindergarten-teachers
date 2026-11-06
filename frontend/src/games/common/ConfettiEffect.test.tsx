import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfettiEffect } from './ConfettiEffect'

describe('ConfettiEffect Component', () => {
  it('không render canvas khi active = false', () => {
    render(<ConfettiEffect active={false} />)
    expect(screen.queryByTestId('confetti-canvas')).toBeNull()
  })

  it('render canvas khi active = true', () => {
    render(<ConfettiEffect active={true} />)
    const canvas = screen.getByTestId('confetti-canvas')
    expect(canvas).toBeInTheDocument()
    expect(canvas).toHaveClass('pointer-events-none')
  })

  it('gọi onComplete khi người dùng bật prefers-reduced-motion', () => {
    const onComplete = vi.fn()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(<ConfettiEffect active={true} onComplete={onComplete} />)
    expect(onComplete).toHaveBeenCalled()
  })

  it('kết thúc và dọn dẹp khi unmount', () => {
    const onComplete = vi.fn()
    const { unmount } = render(<ConfettiEffect active={true} onComplete={onComplete} />)
    expect(screen.getByTestId('confetti-canvas')).toBeInTheDocument()
    unmount()
    expect(screen.queryByTestId('confetti-canvas')).toBeNull()
  })
})
