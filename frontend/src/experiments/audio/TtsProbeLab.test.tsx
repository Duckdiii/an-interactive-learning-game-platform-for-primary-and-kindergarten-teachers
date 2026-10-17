import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Speaker } from './browserSpeech'
import TtsProbeLab from './TtsProbeLab'
import { SAMPLE_TEXT, type SpeechSynthesisLike, type VoiceLike } from './ttsProbe'

const voice = (name: string, lang: string, overrides: Partial<VoiceLike> = {}): VoiceLike => ({
  name,
  lang,
  localService: true,
  default: false,
  voiceURI: `uri:${name}`,
  ...overrides,
})

const synthWith = (voices: VoiceLike[]): SpeechSynthesisLike => ({
  getVoices: () => voices,
  addEventListener: () => {},
  removeEventListener: () => {},
})

const fakeSpeaker = () => {
  const speaker = { speak: vi.fn(), cancel: vi.fn() }
  return { speaker, asSpeaker: speaker as Speaker }
}

const env = { userAgent: 'TestBrowser/1.0', date: '2026-10-18' }

describe('TtsProbeLab', () => {
  it('không hỗ trợ speechSynthesis: báo rõ, không bảng', async () => {
    render(<TtsProbeLab synth={null} speaker={null} environment={env} />)
    expect(await screen.findByText(/không hỗ trợ giọng đọc/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('bỏ trống props: dùng speechSynthesis của trình duyệt (jsdom không có nên báo không hỗ trợ)', async () => {
    render(<TtsProbeLab environment={env} />)
    expect(await screen.findByText(/không hỗ trợ giọng đọc/)).toBeInTheDocument()
  })

  it('đang dò thì hiện trạng thái chờ, rồi hiện tóm tắt và hai bảng', async () => {
    const synth = synthWith([voice('Linh', 'vi-VN'), voice('Zira', 'en-US')])
    render(<TtsProbeLab synth={synth} speaker={null} environment={env} />)
    expect(screen.getByText('Đang dò giọng đọc…')).toBeInTheDocument()
    expect(await screen.findByText(/Tiếng Việt: có\. Tiếng Anh: có\./, { selector: 'p' })).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(2)
    expect(screen.getByText('Linh')).toBeInTheDocument()
    expect(screen.getByText('Zira')).toBeInTheDocument()
  })

  it('thiếu tiếng Việt: ghi không có và không dựng bảng cho nhóm đó', async () => {
    render(<TtsProbeLab synth={synthWith([voice('Zira', 'en-US')])} speaker={null} environment={env} />)
    expect(await screen.findByText(/Tiếng Việt: không có\./, { selector: 'p[role=status]' })).toBeInTheDocument()
    expect(screen.getByText('Tiếng Việt: không có giọng nào.')).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
  })

  it('có giọng từ xa thì cảnh báo dữ liệu trẻ em; chỉ giọng trên máy thì không', async () => {
    const { unmount } = render(
      <TtsProbeLab synth={synthWith([voice('Cloud', 'en-US', { localService: false })])} speaker={null} environment={env} />,
    )
    expect(await screen.findByText(/máy chủ bên thứ ba/, { selector: 'p' })).toBeInTheDocument()
    unmount()
    render(<TtsProbeLab synth={synthWith([voice('Local', 'en-US')])} speaker={null} environment={env} />)
    await screen.findByText(/Tiếng Anh: có/, { selector: 'p' })
    expect(screen.queryByText(/máy chủ bên thứ ba/, { selector: 'p' })).not.toBeInTheDocument()
  })

  it('đọc thử: mỗi giọng đọc đúng câu mẫu của ngôn ngữ mình', async () => {
    const { speaker, asSpeaker } = fakeSpeaker()
    const vi1 = voice('Linh', 'vi-VN')
    const en1 = voice('Zira', 'en-US')
    render(<TtsProbeLab synth={synthWith([vi1, en1])} speaker={asSpeaker} environment={env} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Đọc thử bằng giọng Linh' }))
    expect(speaker.speak).toHaveBeenLastCalledWith(vi1, SAMPLE_TEXT.vi)
    fireEvent.click(screen.getByRole('button', { name: 'Đọc thử bằng giọng Zira' }))
    expect(speaker.speak).toHaveBeenLastCalledWith(en1, SAMPLE_TEXT.en)
  })

  it('"Dừng đọc" gọi cancel', async () => {
    const { speaker, asSpeaker } = fakeSpeaker()
    render(<TtsProbeLab synth={synthWith([voice('Zira', 'en-US')])} speaker={asSpeaker} environment={env} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Dừng đọc' }))
    expect(speaker.cancel).toHaveBeenCalledTimes(1)
  })

  it('không có bộ đọc (trình duyệt thiếu SpeechSynthesisUtterance): các nút đọc bị khóa', async () => {
    render(<TtsProbeLab synth={synthWith([voice('Zira', 'en-US')])} speaker={null} environment={env} />)
    expect(await screen.findByRole('button', { name: 'Đọc thử bằng giọng Zira' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Dừng đọc' })).toBeDisabled()
  })

  it('ô báo cáo chứa Markdown đúng với dữ liệu và môi trường', async () => {
    render(<TtsProbeLab synth={synthWith([voice('Linh', 'vi-VN')])} speaker={null} environment={env} />)
    const box = (await screen.findByRole('textbox', { name: /Báo cáo/ })) as HTMLTextAreaElement
    expect(box).toHaveAttribute('readonly')
    expect(box.value).toContain('2026-10-18')
    expect(box.value).toContain('TestBrowser/1.0')
    expect(box.value).toContain('| Linh | vi-VN | trên máy |  |')
  })

  describe('sao chép báo cáo', () => {
    it('thành công: ghi đúng nội dung báo cáo vào clipboard và báo đã sao chép', async () => {
      const writeText = vi.fn(async () => {})
      render(<TtsProbeLab synth={synthWith([voice('Zira', 'en-US')])} speaker={null} environment={env} clipboard={{ writeText }} />)
      const box = (await screen.findByRole('textbox', { name: /Báo cáo/ })) as HTMLTextAreaElement
      fireEvent.click(screen.getByRole('button', { name: 'Sao chép báo cáo' }))
      expect(await screen.findByText('Đã sao chép.')).toBeInTheDocument()
      expect(writeText).toHaveBeenCalledWith(box.value)
    })

    it('clipboard bị từ chối: hướng dẫn chép tay', async () => {
      const writeText = vi.fn(async () => {
        throw new Error('bị chặn')
      })
      render(<TtsProbeLab synth={synthWith([voice('Zira', 'en-US')])} speaker={null} environment={env} clipboard={{ writeText }} />)
      fireEvent.click(await screen.findByRole('button', { name: 'Sao chép báo cáo' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Ctrl+C')
    })

    it('không có clipboard: hướng dẫn chép tay', async () => {
      render(<TtsProbeLab synth={synthWith([voice('Zira', 'en-US')])} speaker={null} environment={env} clipboard={null} />)
      // `clipboard={null}` rơi về mặc định (navigator.clipboard, jsdom không có) nên cũng thất bại.
      fireEvent.click(await screen.findByRole('button', { name: 'Sao chép báo cáo' }))
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    })
  })

  it('ngày mặc định của báo cáo theo giờ máy (không lệch ngày do UTC) và có trình duyệt thật', async () => {
    // 00:30 giờ máy ngày 18/10: ở múi giờ +7 thì UTC vẫn là ngày 17.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 0, 30))
    try {
      render(<TtsProbeLab synth={synthWith([voice('Zira', 'en-US')])} speaker={null} />)
      const box = (await screen.findByRole('textbox', { name: /Báo cáo/ })) as HTMLTextAreaElement
      expect(box.value).toContain('2026-10-18')
      expect(box.value).toContain(navigator.userAgent)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rời trang khi đang dò không gây lỗi (hủy thăm dò)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const synth: SpeechSynthesisLike = {
      getVoices: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    const { unmount } = render(<TtsProbeLab synth={synth} speaker={null} environment={env} />)
    unmount()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })
})
