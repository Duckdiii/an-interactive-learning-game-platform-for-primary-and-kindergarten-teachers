import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AudioService } from '../audio/audioService'
import FeedbackLab from './FeedbackLab'

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Rect: () => null,
  Star: () => null,
  Text: ({ text }: { text?: string }) => <span data-testid="stage-text">{text}</span>,
}))

const fakeAudio = () => {
  const audio = { unlock: vi.fn(async () => true), play: vi.fn(() => true) }
  return { audio, service: audio as unknown as AudioService }
}

describe('FeedbackLab', () => {
  it('ban đầu mời bấm và chưa phát âm', () => {
    const { audio, service } = fakeAudio()
    render(<FeedbackLab audio={service} />)
    expect(screen.getByTestId('stage-text')).toHaveTextContent('Bấm một nút bên dưới')
    expect(audio.play).not.toHaveBeenCalled()
  })

  it.each([
    ['Đúng', 'correct'],
    ['Thử lại', 'tryAgain'],
    ['Hoàn thành', 'complete'],
  ] as const)('bấm %s: đổi nhãn trên sân và phát âm %s', (label, sound) => {
    const { audio, service } = fakeAudio()
    render(<FeedbackLab audio={service} />)
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(screen.getByTestId('stage-text')).toHaveTextContent(label)
    expect(audio.play).toHaveBeenCalledWith(sound)
  })

  it('nút đủ lớn theo quy ước 64px (lớp min-h-16/min-w-16)', () => {
    render(<FeedbackLab audio={null} />)
    for (const name of ['Đúng', 'Thử lại', 'Hoàn thành']) {
      const button = screen.getByRole('button', { name })
      expect(button.className).toContain('min-h-16')
      expect(button.className).toContain('min-w-16')
    }
  })

  it('bảng số đo: cả ba loại đạt giới hạn (1 lần chớp mỗi giây) và nói rõ giới hạn', () => {
    render(<FeedbackLab audio={null} />)
    expect(screen.getByText(/giới hạn 3/)).toBeInTheDocument()
    for (const kind of ['correct', 'tryAgain', 'complete']) {
      expect(screen.getByTestId(`flash-${kind}`)).toHaveTextContent('1')
    }
    expect(screen.getAllByText('đạt giới hạn an toàn')).toHaveLength(3)
  })

  it('bật "Giảm chuyển động": số lần chớp về 0 ở cả ba loại và vẫn đạt giới hạn', () => {
    render(<FeedbackLab audio={null} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Giảm chuyển động' }))
    for (const kind of ['correct', 'tryAgain', 'complete']) {
      expect(screen.getByTestId(`flash-${kind}`)).toHaveTextContent('0')
    }
    expect(screen.getAllByText('đạt giới hạn an toàn')).toHaveLength(3)
  })

  it('giảm chuyển động vẫn phát âm (chỉ hình đổi, âm không đổi)', () => {
    const { audio, service } = fakeAudio()
    render(<FeedbackLab audio={service} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Giảm chuyển động' }))
    fireEvent.click(screen.getByRole('button', { name: 'Đúng' }))
    expect(audio.play).toHaveBeenCalledWith('correct')
  })
})
