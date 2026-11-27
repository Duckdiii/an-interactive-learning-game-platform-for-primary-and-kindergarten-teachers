import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayButton } from './AudioPlayButton'
import { audioService } from '../../services/pipeline/audioService'
import { AUDIO_PLAY_ACTIVE_FILL, AUDIO_PLAY_INACTIVE_FILL } from './palette'

vi.mock('../../services/pipeline/audioService', () => ({
  audioService: {
    play: vi.fn(),
    stopCurrent: vi.fn(),
    preload: vi.fn(),
    clearCache: vi.fn(),
  },
}))

vi.mock('react-konva', () => ({
  Group: ({ children, onClick, onTap }: { children: ReactNode; onClick: () => void; onTap: () => void }) => (
    <div data-testid="audio-play-group" onClick={onClick} onTouchStart={onTap}>
      {children}
    </div>
  ),
  Circle: ({ fill, radius }: { fill: string; radius: number }) => (
    <div data-testid="audio-play-circle" data-fill={fill} data-radius={radius} />
  ),
  Path: ({ data }: { data: string }) => <div data-testid="audio-play-path" data-path={data} />,
}))

describe('AudioPlayButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tự động phát sau 300ms nếu autoPlayOnMount = true', () => {
    render(<AudioPlayButton audioUrl="https://example.com/audio.mp3" x={100} y={150} autoPlayOnMount={true} />)

    expect(audioService.play).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(audioService.play).toHaveBeenCalledWith('https://example.com/audio.mp3', expect.any(Function))
  })

  it('không tự động phát nếu autoPlayOnMount = false', () => {
    render(<AudioPlayButton audioUrl="https://example.com/audio.mp3" x={100} y={150} autoPlayOnMount={false} />)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(audioService.play).not.toHaveBeenCalled()
  })

  it('khi bấm vào nút thì phát âm thanh và chuyển màu trạng thái sang active', () => {
    render(<AudioPlayButton audioUrl="https://example.com/audio.mp3" x={100} y={150} autoPlayOnMount={false} />)

    const circle = screen.getByTestId('audio-play-circle')
    expect(circle.getAttribute('data-fill')).toBe(AUDIO_PLAY_INACTIVE_FILL)

    const group = screen.getByTestId('audio-play-group')
    fireEvent.click(group)

    expect(audioService.play).toHaveBeenCalledWith('https://example.com/audio.mp3', expect.any(Function))
    expect(circle.getAttribute('data-fill')).toBe(AUDIO_PLAY_ACTIVE_FILL)

    // Giả lập khi audio kết thúc callback onEnd được gọi
    const onEndCallback = vi.mocked(audioService.play).mock.calls[0][1] as () => void
    act(() => {
      onEndCallback()
    })

    expect(circle.getAttribute('data-fill')).toBe(AUDIO_PLAY_INACTIVE_FILL)
  })

  it('huỷ timeout nếu component unmount trước 300ms', () => {
    const { unmount } = render(<AudioPlayButton audioUrl="https://example.com/audio.mp3" x={100} y={150} autoPlayOnMount={true} />)

    act(() => {
      vi.advanceTimersByTime(100)
    })
    unmount()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(audioService.play).not.toHaveBeenCalled()
  })
})
