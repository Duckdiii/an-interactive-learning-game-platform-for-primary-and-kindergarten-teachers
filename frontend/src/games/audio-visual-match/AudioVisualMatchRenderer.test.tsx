import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import AudioVisualMatchRenderer from './AudioVisualMatchRenderer'

const audio = vi.hoisted(() => ({ options: undefined as { onloaderror?: () => void } | undefined }))
vi.mock('howler', () => ({
  Howl: class {
    constructor(options: { onloaderror?: () => void }) { audio.options = options }
    play = vi.fn()
    stop = vi.fn()
    unload = vi.fn()
  },
}))
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))
vi.mock('../common/useAnswerAudio', () => ({ useAnswerAudio: () => vi.fn() }))
vi.mock('../common/ResponsiveStage', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../common/QuestionAudioButton', () => ({ default: ({ onPress }: { onPress: () => void }) => <button onClick={onPress}>Nghe lại</button> }))
vi.mock('react-konva', () => ({ Layer: ({ children }: { children: ReactNode }) => <div>{children}</div>, Text: () => null }))
vi.mock('./OptionImage', () => ({ default: () => null }))

afterEach(() => { vi.unstubAllGlobals(); audio.options = undefined })

it('đọc nội dung dự phòng khi tệp âm thanh lỗi ở màn chơi thử', () => {
  const speech = { speak: vi.fn(), cancel: vi.fn() }
  vi.stubGlobal('speechSynthesis', speech)
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string
    lang = ''
    constructor(text: string) { this.text = text }
  })
  render(<AudioVisualMatchRenderer question={{ id: 'q1', timeLimitSeconds: 30, points: 10,
    audioText: 'Cat', audioUrl: '/missing.mp3', options: [{ id: 'a', visualPrompt: 'cat' }, { id: 'b', visualPrompt: 'dog' }] }}
    ttsLanguage="en-US" onSubmit={vi.fn()} />)

  fireEvent.click(screen.getByRole('button', { name: 'Nghe lại' }))
  expect(audio.options?.onloaderror).toBeTypeOf('function')
  act(() => audio.options?.onloaderror?.())
  expect(speech.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'Cat', lang: 'en-US' }))
})
