import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import type { PlayerApi } from '../api'
import { PROFILES } from '../profile/profiles'
import type { AnyPlayableRenderer } from '../renderers'
import QuestionStage from './QuestionStage'

const audio = vi.hoisted(() => ({ auto: vi.fn(), hook: vi.fn(), replay: vi.fn(), remaining: 30 }))
vi.mock('../audio/useAutoReadPrompt', () => ({ useAutoReadPrompt: audio.auto }))
vi.mock('../../games/common/useQuestionAudio', () => ({ useQuestionAudio: (...args: unknown[]) => { audio.hook(...args); return audio.replay } }))
vi.mock('../profile/useUiProfile', () => ({ useUiProfile: () => PROFILES.hocSinh }))
vi.mock('../shells/PlayerShell', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('./useCountdown', () => ({ useCountdown: () => audio.remaining }))
vi.mock('./useHint', () => ({ useHint: () => false }))
vi.mock('./usePlayerHotkeys', () => ({ usePlayerHotkeys: () => undefined }))

it('AVM dùng cùng audio HTML5 cho tự phát và nút nghe lại, không tự phát hai lần', () => {
  const Renderer = (({ playAudio }: { playAudio?: () => void }) => <button onClick={playAudio}>Nghe lại</button>) as AnyPlayableRenderer
  render(<QuestionStage gameType="AUDIO_VISUAL_MATCH" api={{} as PlayerApi} sessionId="s" title="test"
    question={{ id: 'q', timeLimitSeconds: 30, points: 10, audioText: 'mèo', audioUrl: '/cat.mp3', options: [] }}
    Renderer={Renderer} progress={{ current: 1, total: 1 }} score={0} streak={0} result={null} isLast
    onAnswered={() => undefined} onNext={() => undefined} autoRead />)

  expect(audio.auto).toHaveBeenCalledWith('/cat.mp3', false)
  expect(audio.hook).toHaveBeenCalledWith('/cat.mp3', {
    autoPlayOnMount: true, html5: true, ttsText: 'mèo', ttsLanguage: 'vi-VN',
  })
  fireEvent.click(screen.getByRole('button', { name: 'Nghe lại' }))
  expect(audio.replay).toHaveBeenCalledTimes(1)
})

it('AVM tôn trọng lựa chọn tắt tự đọc, nhưng vẫn cho nghe lại', () => {
  audio.auto.mockClear()
  audio.hook.mockClear()
  audio.replay.mockClear()
  const Renderer = (({ playAudio }: { playAudio?: () => void }) => <button onClick={playAudio}>Nghe lại</button>) as AnyPlayableRenderer
  render(<QuestionStage gameType="AUDIO_VISUAL_MATCH" api={{} as PlayerApi} sessionId="s" title="test"
    question={{ id: 'q', timeLimitSeconds: 30, points: 10, audioText: 'mèo', audioUrl: '/cat.mp3', options: [] }}
    Renderer={Renderer} progress={{ current: 1, total: 1 }} score={0} streak={0} result={null} isLast
    onAnswered={() => undefined} onNext={() => undefined} autoRead={false} />)

  expect(audio.hook).toHaveBeenCalledWith('/cat.mp3', {
    autoPlayOnMount: false, html5: true, ttsText: 'mèo', ttsLanguage: 'vi-VN',
  })
  fireEvent.click(screen.getByRole('button', { name: 'Nghe lại' }))
  expect(audio.replay).toHaveBeenCalledTimes(1)
})

it('AVM tiếng Anh không có audioUrl thì chuyển audioText sang TTS tiếng Anh', () => {
  audio.hook.mockClear()
  const Renderer = (() => <div />) as AnyPlayableRenderer
  render(<QuestionStage gameType="AUDIO_VISUAL_MATCH" subject="ENGLISH" api={{} as PlayerApi} sessionId="s" title="test"
    question={{ id: 'q', timeLimitSeconds: 30, points: 10, audioText: 'Cat', options: [] }}
    Renderer={Renderer} progress={{ current: 1, total: 1 }} score={0} streak={0} result={null} isLast
    onAnswered={() => undefined} onNext={() => undefined} autoRead />)

  expect(audio.hook).toHaveBeenCalledWith(undefined, {
    autoPlayOnMount: true, html5: true, ttsText: 'Cat', ttsLanguage: 'en-US',
  })
})

it('AVM tiếng Việt không có audioUrl thì dùng ngôn ngữ tiếng Việt', () => {
  audio.hook.mockClear()
  const Renderer = (() => <div />) as AnyPlayableRenderer
  render(<QuestionStage gameType="AUDIO_VISUAL_MATCH" subject="VIETNAMESE" api={{} as PlayerApi} sessionId="s" title="test"
    question={{ id: 'q', timeLimitSeconds: 30, points: 10, audioText: 'Con mèo', options: [] }}
    Renderer={Renderer} progress={{ current: 1, total: 1 }} score={0} streak={0} result={null} isLast
    onAnswered={() => undefined} onNext={() => undefined} autoRead />)

  expect(audio.hook).toHaveBeenCalledWith(undefined, {
    autoPlayOnMount: true, html5: true, ttsText: 'Con mèo', ttsLanguage: 'vi-VN',
  })
})

it('AVM khóa các lựa chọn ngay khi hết giờ trong lúc chờ máy chủ', () => {
  audio.remaining = 0
  const Renderer = (({ answerDisabled, playAudio }: { answerDisabled?: boolean; playAudio?: () => void }) =>
    <><button disabled={answerDisabled}>Hình</button><button onClick={playAudio}>Nghe lại</button></>) as AnyPlayableRenderer
  try {
    render(<QuestionStage gameType="AUDIO_VISUAL_MATCH"
      api={{ submitInteraction: vi.fn().mockReturnValue(new Promise(() => {})) } as unknown as PlayerApi}
      sessionId="s" title="test" question={{ id: 'q', timeLimitSeconds: 30, points: 10, audioText: 'mèo', options: [] }}
      Renderer={Renderer} progress={{ current: 1, total: 1 }} score={0} streak={0} result={null} isLast
      onAnswered={() => undefined} onNext={() => undefined} autoRead />)
    expect(screen.getByRole('button', { name: 'Hình' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Nghe lại' })).toBeEnabled()
  } finally { audio.remaining = 30 }
})
