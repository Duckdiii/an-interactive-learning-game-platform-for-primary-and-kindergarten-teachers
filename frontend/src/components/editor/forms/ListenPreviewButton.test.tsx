import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { viText } from '../../../constants/viText'
import ListenPreviewButton from './ListenPreviewButton'
import { VoiceContext } from './VoiceContext'

const t = viText.editor.form

describe('ListenPreviewButton', () => {
  const speak = vi.fn()
  const cancel = vi.fn()
  let voices: { lang: string }[] = []
  let utterances: { text: string; lang?: string; voice?: { lang: string } }[] = []

  beforeEach(() => {
    voices = [{ lang: 'vi-VN' }]
    speak.mockReset()
    utterances = []
    cancel.mockReset()
    vi.stubGlobal('SpeechSynthesisUtterance', function (this: { text: string; lang?: string; voice?: { lang: string } }, text: string) {
      this.text = text
      utterances.push(this)
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel, getVoices: () => voices },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(window, 'speechSynthesis')
  })

  it('đọc lời đọc bằng giọng trình duyệt, bấm lần nữa thì dừng', () => {
    render(<ListenPreviewButton id="listen" text="Bé hãy chọn quả táo" />)

    fireEvent.click(screen.getByRole('button', { name: t.listen }))
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0][0].text).toBe('Bé hãy chọn quả táo')
    expect(utterances[0].lang).toBe('vi-VN')

    fireEvent.click(screen.getByRole('button', { name: t.listenStop }))
    expect(cancel).toHaveBeenCalled()
  })

  it('chỉ đọc tiếng Anh khi môn học là tiếng Anh', () => {
    voices = [{ lang: 'vi-VN' }, { lang: 'en-US' }]
    render(
      <VoiceContext.Provider value={{ voice: 'FEMALE', setVoice: vi.fn(), language: 'en-US' }}>
        <ListenPreviewButton id="listen" text="Choose the apple" />
      </VoiceContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: t.listen }))

    expect(utterances[0].lang).toBe('en-US')
    expect(utterances[0].voice?.lang).toBe('en-US')
  })

  it('chưa có lời đọc thì nút bị khóa', () => {
    render(<ListenPreviewButton id="listen" text="   " />)
    expect(screen.getByRole('button', { name: t.listen })).toBeDisabled()
  })

  it('máy không có giọng tiếng Việt thì báo rõ', () => {
    voices = [{ lang: 'en-US' }]
    render(<ListenPreviewButton id="listen" text="Xin chào" />)

    fireEvent.click(screen.getByRole('button', { name: t.listen }))
    expect(screen.getByText(t.listenNoVietnameseVoice)).toBeInTheDocument()
  })

  it('trình duyệt không hỗ trợ đọc thì nói rõ, không có nút', () => {
    Reflect.deleteProperty(window, 'speechSynthesis')
    render(<ListenPreviewButton id="listen" text="Xin chào" />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(t.listenUnsupported)).toBeInTheDocument()
  })
})
