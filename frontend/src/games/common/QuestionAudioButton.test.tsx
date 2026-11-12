import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QuestionAudioButton from './QuestionAudioButton'

const audio = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn(), unload: vi.fn(), options: vi.fn() }))

vi.mock('howler', () => ({
  Howl: class {
    constructor(options: unknown) { audio.options(options) }
    play = audio.play
    stop = audio.stop
    unload = audio.unload
  },
}))

vi.mock('react-konva', () => ({
  Group: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
  Rect: () => null,
  Text: () => 'Nghe lại',
}))

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('QuestionAudioButton', () => {
  it('phát audio được truyền vào và nút cho phép nghe lại', () => {
    vi.useFakeTimers()
    const { unmount } = render(<QuestionAudioButton y={0} audioUrl="/mock/meow.mp3" />)

    expect(audio.options).toHaveBeenCalledWith({ src: ['/mock/meow.mp3'], html5: true })
    act(() => vi.advanceTimersByTime(300))
    expect(audio.play).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Nghe lại' }))
    expect(audio.stop).toHaveBeenCalledTimes(1)
    expect(audio.play).toHaveBeenCalledTimes(2)
    unmount()
    expect(audio.unload).toHaveBeenCalledTimes(1)
  })

  it('giữ callback nghe lại sẵn có của các game khác', () => {
    const onPress = vi.fn()
    render(<QuestionAudioButton y={0} onPress={onPress} />)

    fireEvent.click(screen.getByRole('button', { name: 'Nghe lại' }))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(audio.options).not.toHaveBeenCalled()
  })

  it('không phát âm hoặc dùng TTS khi thiếu audioUrl', () => {
    vi.useFakeTimers()
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { speak })
    render(<QuestionAudioButton y={0} autoPlayOnMount />)

    act(() => vi.advanceTimersByTime(300))
    fireEvent.click(screen.getByRole('button', { name: 'Nghe lại' }))
    expect(audio.options).not.toHaveBeenCalled()
    expect(audio.play).not.toHaveBeenCalled()
    expect(speak).not.toHaveBeenCalled()
  })
})
