import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { viText } from '../../../constants/viText'
import ListenPreviewButton from './ListenPreviewButton'

const t = viText.editor.form

describe('ListenPreviewButton', () => {
  const speak = vi.fn()
  const cancel = vi.fn()
  let voices: { lang: string }[] = []

  beforeEach(() => {
    voices = [{ lang: 'vi-VN' }]
    speak.mockReset()
    cancel.mockReset()
    vi.stubGlobal('SpeechSynthesisUtterance', function (this: { text: string }, text: string) {
      this.text = text
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

    fireEvent.click(screen.getByRole('button', { name: t.listenStop }))
    expect(cancel).toHaveBeenCalled()
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
