import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ParentGate from './ParentGate'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const gate = () => screen.getByRole('button', { name: 'Dành cho phụ huynh' })

describe('ParentGate', () => {
  it('bấm nhanh (click) không mở; giữ 3 giây thì hiện lời nhắn và focus vào tiêu đề', () => {
    render(<ParentGate message="Bé làm đúng 4/5 câu." />)

    fireEvent.click(gate())
    expect(screen.queryByText('Bé làm đúng 4/5 câu.')).toBeNull()

    fireEvent.pointerDown(gate(), { button: 0, pointerId: 1 })
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
    act(() => vi.advanceTimersByTime(2000))

    expect(screen.getByText('Bé làm đúng 4/5 câu.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dành cho phụ huynh' })).toHaveFocus()
  })

  it('thả sớm thì vẫn khóa và thanh tiến độ biến mất', () => {
    render(<ParentGate message="Bé làm đúng 4/5 câu." />)

    fireEvent.pointerDown(gate(), { button: 0, pointerId: 1 })
    act(() => vi.advanceTimersByTime(2000))
    fireEvent.pointerUp(gate(), { button: 0, pointerId: 1 })
    act(() => vi.advanceTimersByTime(3000))

    expect(screen.queryByText('Bé làm đúng 4/5 câu.')).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
})
