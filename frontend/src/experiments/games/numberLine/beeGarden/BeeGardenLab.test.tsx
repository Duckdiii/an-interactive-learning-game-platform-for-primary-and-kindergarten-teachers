import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import BeeGardenLab from './BeeGardenLab'
import { BEE_GARDEN_ROUNDS, demoAudioUrl, makeRound, NUMBER_WORDS, ROUND_TARGETS } from './beeGardenRounds'

const h = vi.hoisted(() => ({
  pick: 0,
  props: undefined as Record<string, unknown> | undefined,
  mounts: 0,
  howls: [] as { opts: Record<string, unknown>; play: Mock<() => void>; pause: Mock<() => void>; stop: Mock<() => void>; unload: Mock<() => void>; on: boolean }[],
  confetti: [] as unknown[][],
  audio: {
    unlock: vi.fn<() => Promise<boolean>>(async () => true),
    play: vi.fn<(name: string) => void>(),
    setMuted: vi.fn<(muted: boolean) => void>(),
    getGraph: vi.fn(() => null),
    isMuted: false,
    isUnlocked: false,
  },
  howlerMute: vi.fn<(muted: boolean) => void>(),
  holdExit: false,
  reduced: false,
}))

vi.mock('howler', () => ({
  Howler: { mute: (muted: boolean) => h.howlerMute(muted) },
  Howl: class {
    opts: Record<string, unknown>
    record: (typeof h.howls)[number]
    constructor(opts: Record<string, unknown>) {
      this.opts = opts
      this.record = { opts, play: vi.fn(() => void (this.record.on = true)), pause: vi.fn(() => void (this.record.on = false)), stop: vi.fn(() => void (this.record.on = false)), unload: vi.fn(), on: false }
      h.howls.push(this.record)
    }
    play() { this.record.play() }
    pause() { this.record.pause() }
    stop() { this.record.stop() }
    unload() { this.record.unload() }
    playing() { return this.record.on }
  },
}))
vi.mock('./gardenConfetti', () => ({ launchConfetti: (...args: unknown[]) => h.confetti.push(args) }))
vi.mock('../../../audio/audioService', () => ({ getAudioService: () => h.audio }))
vi.mock('../../../feedback/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => h.reduced }))

// Renderer giả: hiện câu hỏi và một nút «trả lời» gửi giá trị `h.pick` như trẻ đã đặt chú ong vào số đó.
vi.mock('./BeeGardenRenderer', () => ({
  default: function MockRenderer(props: { question: { questionText: string }; onAnswered: (value: number) => unknown; exiting?: boolean; onExited?: () => void }) {
    h.props = props as unknown as Record<string, unknown>
    h.mounts += 1
    // Renderer thật diễn cảnh rời câu rồi báo xong; bản giả báo xong ngay (hoặc theo cờ h.holdExit để test cảnh đang rời).
    const { exiting, onExited } = props
    useEffect(() => {
      if (exiting && !h.holdExit) onExited?.()
    }, [exiting, onExited])
    return (
      <div>
        <span data-testid="q">{props.question.questionText}</span>
        <button type="button" onClick={() => props.onAnswered(h.pick)}>
          trả lời
        </button>
      </div>
    )
  },
}))

const stubFetch = (handler: (url: string) => { ok: boolean; type: string } | Error) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const result = handler(String(url))
      if (result instanceof Error) throw result
      return { ok: result.ok, headers: { get: () => result.type } }
    }),
  )
}
const start = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu chơi' }))
  await screen.findByTestId('q')
}
const sentAudioUrl = () => (h.props!.question as { audioUrl?: string }).audioUrl
const answerWith = (value: number) => {
  h.pick = value
  fireEvent.click(screen.getByRole('button', { name: 'trả lời' }))
}
/** Tiến trình truyền cho renderer (thanh «vườn nở hoa» nay vẽ trong canvas nên đọc từ prop): «N trên M bông hoa». */
const starsLabel = () => {
  const progress = h.props!.progress as { total: number; earned: (boolean | undefined)[]; current: number }
  return `${progress.earned.filter((value) => value === true).length} trên ${progress.total} bông hoa`
}
const question = () => screen.getByTestId('q').textContent

beforeEach(() => {
  h.pick = 0
  h.holdExit = false
  h.props = undefined
  h.mounts = 0
  h.howls = []
  h.confetti = []
  h.audio.unlock.mockClear()
  h.audio.play.mockClear()
  h.reduced = false
  stubFetch(() => ({ ok: true, type: 'audio/wav' }))
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('dữ liệu các câu', () => {
  it('năm câu thang 0 đến 10, đáp án đúng vạch, câu chữ số và lời đọc bằng chữ', () => {
    expect(BEE_GARDEN_ROUNDS).toHaveLength(5)
    expect([...ROUND_TARGETS]).toEqual([3, 7, 5, 9, 10])
    for (const round of BEE_GARDEN_ROUNDS) {
      expect(round).toMatchObject({ min: 0, max: 10, step: 1, tolerance: 0 })
      expect(round.questionText).toBe(`Đặt chú ong vào số ${round.target}`)
      expect(round.audioText).toBe(`Đặt chú ong vào số ${NUMBER_WORDS[round.target]}.`)
      expect(round.id).toBe(`bee-garden-${round.target}`)
    }
    expect(new Set(BEE_GARDEN_ROUNDS.map((r) => r.id)).size).toBe(5)
    expect(NUMBER_WORDS).toHaveLength(11)
    expect(makeRound(7).audioText).toContain('bảy')
    expect(demoAudioUrl({ id: 'bee-garden-7' })).toBe('/experiments-demo-audio/bee-garden-7.wav')
  })
})

describe('Vườn hoa: giao diện theo theme và hồ sơ độ tuổi', () => {
  it('renderer nhận nhóm tuổi đã chọn (cỡ vùng chạm theo hồ sơ)', async () => {
    render(<BeeGardenLab />)
    await start()
    expect(h.props?.ageBand).toBe('PRESCHOOL')
  })
  it('chọn Tiểu học thì renderer nhận GRADE_1_2', async () => {
    render(<BeeGardenLab />)
    fireEvent.click(screen.getByRole('radio', { name: 'Tiểu học' }))
    await start()
    expect(h.props?.ageBand).toBe('GRADE_1_2')
  })
  it('nút «Bắt đầu chơi» đủ lớn theo hồ sơ: Mầm non ≥ 64px, Tiểu học ≥ 56px (minHeight)', () => {
    render(<BeeGardenLab />)
    const button = () => screen.getByRole('button', { name: 'Bắt đầu chơi' })
    expect(button().style.minHeight).toBe('64px')
    fireEvent.click(screen.getByRole('radio', { name: 'Tiểu học' }))
    expect(button().style.minHeight).toBe('56px')
  })
  it('khung chơi căn giữa và có chiều rộng tối đa (không để trống nửa phải ở màn rộng)', () => {
    const { container } = render(<BeeGardenLab />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('mx-auto')
    expect(root.className).toContain('max-w-[992px]') // 992 = 960 (khung cảnh tối đa) + hai lề 16
  })
  it('màu nút lấy từ token theme (nút chính = accent), font là Nunito', () => {
    const { container } = render(<BeeGardenLab />)
    const button = screen.getByRole('button', { name: 'Bắt đầu chơi' })
    expect(button.style.background).toBe('rgb(255, 159, 28)') // accent #FF9F1C
    expect((container.firstElementChild as HTMLElement).style.fontFamily).toContain('Arial') // jsdom không có document.fonts: coi như xong, vẫn có dự phòng
  })
})

describe('Vườn hoa: chọn độ tuổi', () => {
  it('mặc định là Mầm non nên renderer nhận chế độ chạm', async () => {
    render(<BeeGardenLab />)
    expect((screen.getByRole('radio', { name: 'Mầm non' }) as HTMLInputElement).checked).toBe(true)
    await start()
    expect(h.props?.interactionMode).toBe('tap')
  })

  it('chọn Tiểu học thì renderer nhận chế độ xác nhận', async () => {
    render(<BeeGardenLab />)
    fireEvent.click(screen.getByRole('radio', { name: 'Tiểu học' }))
    await start()
    expect(h.props?.interactionMode).toBe('confirm')
  })
})

describe('Vườn hoa: luồng chơi', () => {
  it('màn đầu có nút Bắt đầu chơi, CHƯA có thanh sao (chưa có gì để đếm), chưa vào câu nào; bắt đầu rồi mới hiện thanh sao rỗng', async () => {
    render(<BeeGardenLab />)
    expect(screen.getByRole('button', { name: 'Bắt đầu chơi' })).toBeTruthy()
    expect(h.props).toBeUndefined() // chưa có renderer nào, nên chưa có tiến trình nào
    expect(screen.queryByTestId('q')).toBeNull()
    await start()
    expect(starsLabel()).toBe('0 trên 5 bông hoa')
  })

  it('ghi chú dev về tệp giọng đọc: hiện ở chế độ dev, ẩn khi không phải dev', () => {
    const note = () => screen.queryByText(/giọng đọc mẫu/)
    const dev = render(<BeeGardenLab />)
    expect(note()).not.toBeNull()
    dev.unmount()
    vi.stubEnv('DEV', false)
    try {
      render(<BeeGardenLab />)
      expect(note()).toBeNull()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('vào câu 1 với câu hỏi của học sinh: KHÔNG có đáp án, tự đọc câu hỏi', async () => {
    render(<BeeGardenLab />)
    await start()
    expect(question()).toBe('Đặt chú ong vào số 3')
    const sent = h.props?.question as Record<string, unknown>
    expect('target' in sent).toBe(false)
    expect('tolerance' in sent).toBe(false)
    expect(h.props?.mode).toBe('play')
    expect(h.props?.autoPlayAudio).toBe(true)
  })

  it('đúng ngay lần đầu: được sao, chỉ hiện «Câu tiếp theo» (không «Thử lại»); sang câu sau', async () => {
    render(<BeeGardenLab />)
    await start()
    expect(screen.queryByRole('button', { name: 'Câu tiếp theo' })).toBeNull()
    answerWith(3)
    expect(starsLabel()).toBe('1 trên 5 bông hoa')
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp theo' }))
    expect(question()).toBe('Đặt chú ong vào số 7')
    expect(screen.queryByRole('button', { name: 'Câu tiếp theo' })).toBeNull()
  })

  it('sai: có Thử lại và Câu tiếp theo, chưa được sao; thử lại gắn lại renderer; đúng ở lần thử lại vẫn KHÔNG được sao', async () => {
    render(<BeeGardenLab />)
    await start()
    const mountsBefore = h.mounts
    answerWith(1)
    expect(starsLabel()).toBe('0 trên 5 bông hoa')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(h.mounts).toBeGreaterThan(mountsBefore)
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
    expect(question()).toBe('Đặt chú ong vào số 3')
    answerWith(3)
    expect(starsLabel()).toBe('0 trên 5 bông hoa')
    expect(screen.getByRole('button', { name: 'Câu tiếp theo' })).toBeTruthy()
  })

  it('trả lời lại cùng câu sau khi đã đúng không cộng thêm sao', async () => {
    render(<BeeGardenLab />)
    await start()
    answerWith(3)
    answerWith(3)
    expect(starsLabel()).toBe('1 trên 5 bông hoa')
  })

  it('chơi hết năm câu: màn phần thưởng ghi đúng số sao; Chơi lại đặt về câu 1 với 0 sao', async () => {
    render(<BeeGardenLab />)
    await start()
    const answers = [3, 7, 0, 9, 0] // đúng, đúng, sai, đúng, sai
    for (let i = 0; i < answers.length; i += 1) {
      answerWith(answers[i])
      fireEvent.click(screen.getByRole('button', { name: i === 4 ? 'Xem phần thưởng' : 'Câu tiếp theo' }))
    }
    expect(screen.getByText('Giỏi quá! Bé được 3 / 5 bông hoa')).toBeTruthy()
    expect(screen.queryByTestId('q')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Chơi lại' }))
    expect(question()).toBe('Đặt chú ong vào số 3')
    expect(starsLabel()).toBe('0 trên 5 bông hoa')
  })

  it('câu cuối đổi nhãn nút thành «Xem phần thưởng»', async () => {
    render(<BeeGardenLab />)
    await start()
    for (let i = 0; i < 4; i += 1) {
      answerWith(ROUND_TARGETS[i])
      fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp theo' }))
    }
    answerWith(10)
    expect(screen.queryByRole('button', { name: 'Câu tiếp theo' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Xem phần thưởng' })).toBeTruthy()
  })
})

describe('Vườn hoa: giọng đọc mẫu', () => {
  it('có tệp âm thanh thật thì renderer nhận audioUrl của từng câu', async () => {
    render(<BeeGardenLab />)
    await waitFor(() => expect(screen.getByText('Có giọng đọc mẫu.')).toBeTruthy())
    await start()
    expect(sentAudioUrl()).toBe('/experiments-demo-audio/bee-garden-3.wav')
  })

  it('dev server trả index.html (200 nhưng không phải audio) cho đường dẫn không có: coi như chưa có giọng đọc', async () => {
    stubFetch(() => ({ ok: true, type: 'text/html' }))
    render(<BeeGardenLab />)
    await waitFor(() => expect(screen.getByText(/Chưa có tệp giọng đọc mẫu/)).toBeTruthy())
    await start()
    expect(sentAudioUrl()).toBeUndefined()
  })

  it('lỗi mạng hoặc 404 thì chơi vẫn được, không có audioUrl', async () => {
    stubFetch(() => new Error('mất mạng'))
    const { unmount } = render(<BeeGardenLab />)
    await start()
    expect(sentAudioUrl()).toBeUndefined()
    unmount()
    stubFetch(() => ({ ok: false, type: 'audio/wav' }))
    render(<BeeGardenLab />)
    await start()
    expect(sentAudioUrl()).toBeUndefined()
  })

  it('gỡ màn trước khi kiểm xong thì không cập nhật state (không cảnh báo)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = render(<BeeGardenLab />)
    unmount()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

const finishGame = () => {
  for (const target of ROUND_TARGETS) {
    answerWith(target)
    fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo|Xem phần thưởng/ }))
  }
}
const stubbed = () => (fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length
const musicButton = () => screen.queryByRole('button', { name: /Nhạc/ })
/** Chờ nút nhạc xuất hiện (sau khi kiểm tệp nhạc bằng fetch giả). `waitFor` coi `null` là thành công nên phải ném lỗi khi chưa có. */
const findMusicButton = () =>
  waitFor(
    () => {
      const button = musicButton()
      if (!button) throw new Error('chưa có nút nhạc')
      return button
    },
    { timeout: 4000 },
  )

describe('Vườn hoa: nhạc nền, pháo giấy và âm hoàn thành', () => {
  it('có tệp nhạc: nút nhạc chỉ hiện sau khi bắt đầu; nhạc chỉ phát trong cử chỉ bấm «Bắt đầu chơi» (không tự phát trước đó)', async () => {
    render(<BeeGardenLab />)
    await waitFor(() => expect(stubbed()).toBeGreaterThan(0))
    expect(musicButton()).toBeNull()
    expect(h.howls).toHaveLength(0)
    await start()
    await waitFor(() => expect(musicButton()).not.toBeNull())
    expect(h.howls).toHaveLength(1)
    expect(h.howls[0].opts).toMatchObject({ loop: true, src: ['/experiments-demo-audio/bee-garden-music.mp3'] })
    expect(h.howls[0].opts.volume as number).toBeLessThanOrEqual(0.3) // nhỏ hơn tiếng đúng/sai và giọng đọc
    expect(h.howls[0].play).toHaveBeenCalledTimes(1)
  })

  it('không có tệp nhạc: im lặng hoàn toàn, không tạo Howl, không có nút nhạc', async () => {
    stubFetch((url) => (url.includes('music') ? { ok: true, type: 'text/html' } : { ok: true, type: 'audio/wav' }))
    render(<BeeGardenLab />)
    await start()
    await waitFor(() => expect(h.audio).toBeDefined())
    expect(musicButton()).toBeNull()
    expect(h.howls).toHaveLength(0)
  })

  it('nút nhạc tắt/bật: aria-pressed đổi, nhạc tạm dừng rồi phát lại', async () => {
    render(<BeeGardenLab />)
    await start()
    const button = await findMusicButton()
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(musicButton()!.getAttribute('aria-pressed')).toBe('false')
    expect(h.howls[0].pause).toHaveBeenCalledTimes(1)
    fireEvent.click(musicButton()!)
    expect(musicButton()!.getAttribute('aria-pressed')).toBe('true')
    expect(h.howls[0].play).toHaveBeenCalledTimes(2)
  })

  it('hoàn thành: dừng nhạc, bắn pháo giấy «complete» và phát âm hoàn thành; chưa hoàn thành thì chưa', async () => {
    render(<BeeGardenLab />)
    await start()
    await waitFor(() => expect(musicButton()).not.toBeNull())
    expect(h.confetti).toHaveLength(0)
    finishGame()
    await screen.findByRole('status')
    expect(h.confetti).toHaveLength(1)
    expect(h.confetti[0][0]).toBe('complete')
    expect(h.confetti[0][1]).toMatchObject({ reducedMotion: false })
    expect(h.audio.play).toHaveBeenCalledWith('complete')
    expect(h.howls[0].stop).toHaveBeenCalled()
  })

  it('giảm chuyển động: pháo giấy được gọi với reducedMotion = true (không bắn thật); âm vẫn phát', async () => {
    h.reduced = true
    render(<BeeGardenLab />)
    await start()
    finishGame()
    await screen.findByRole('status')
    expect(h.confetti[0][1]).toMatchObject({ reducedMotion: true })
    expect(h.audio.play).toHaveBeenCalledWith('complete')
  })

  it('chơi lại sau khi hoàn thành: nhạc phát lại; bấm «Xem phần thưởng» mở khóa âm thanh', async () => {
    render(<BeeGardenLab />)
    await start()
    await waitFor(() => expect(musicButton()).not.toBeNull())
    finishGame()
    await screen.findByRole('status')
    expect(h.audio.unlock).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Chơi lại' }))
    await waitFor(() => expect(h.howls[0].play.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('đã tắt nhạc thì «Bắt đầu» và «Chơi lại» không phát nhạc', async () => {
    render(<BeeGardenLab />)
    await start()
    fireEvent.click(await findMusicButton())
    const playsBefore = h.howls[0].play.mock.calls.length
    finishGame()
    await screen.findByRole('status')
    fireEvent.click(screen.getByRole('button', { name: 'Chơi lại' }))
    expect(h.howls[0].play.mock.calls.length).toBe(playsBefore)
  })
})

describe('Vườn hoa: thẻ chọn độ tuổi ở màn bắt đầu', () => {
  const card = (name: string) => screen.getByRole('radio', { name }).closest('label') as HTMLElement

  it('hai thẻ lớn có hình minh họa (từ bộ Fluent qua resolver) và mô tả cách chơi; vẫn là nhóm radio đúng nghĩa (tên truy cập là tiêu đề thẻ)', () => {
    const { container } = render(<BeeGardenLab />)
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.getByRole('radio', { name: 'Mầm non' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Tiểu học' })).toBeTruthy()
    const icons = container.querySelectorAll('label img')
    expect(icons).toHaveLength(2)
    for (const icon of icons) expect(icon.getAttribute('src')).toMatch(/baby-chick|backpack/)
    expect(screen.getByText('Chạm vào hoa là ong bay tới')).toBeTruthy()
    expect(screen.getByText('Chọn hoa rồi bấm «Xong rồi!»')).toBeTruthy()
  })

  it('thẻ chọn rõ ràng: thẻ đang chọn có dấu ✓ và viền màu nút chính; hai thẻ cùng kích thước (không nhô lên hay phóng to nên không lệch hàng); thẻ kia thì không', () => {
    render(<BeeGardenLab />)
    expect(card('Mầm non').textContent).toContain('✓')
    expect(card('Tiểu học').textContent).not.toContain('✓')
    expect(card('Mầm non').style.transform).toBe('')
    expect(card('Tiểu học').style.transform).toBe('')
    expect(card('Mầm non').style.border).toContain('rgb(199, 119, 0)') // accentBorder #C77700
    fireEvent.click(screen.getByRole('radio', { name: 'Tiểu học' }))
    expect(card('Tiểu học').textContent).toContain('✓')
    expect(card('Mầm non').textContent).not.toContain('✓')
  })

  it('vùng chạm đủ lớn: cao hơn hẳn 48px, hai thẻ cùng chiều cao và ≥ vùng chạm theo hồ sơ độ tuổi', () => {
    render(<BeeGardenLab />)
    const preschool = parseInt(card('Mầm non').style.minHeight)
    const grade = parseInt(card('Tiểu học').style.minHeight)
    expect(grade).toBeGreaterThanOrEqual(48)
    expect(preschool).toBe(grade) // hai thẻ cùng chiều cao
    expect(preschool).toBeGreaterThanOrEqual(64)
  })

  it('bàn phím: ô radio ẩn bằng sr-only nhưng vẫn là phần tử thật (focus được), và thẻ có outline khi focus-visible', () => {
    render(<BeeGardenLab />)
    const radio = screen.getByRole('radio', { name: 'Mầm non' })
    expect(radio.className).toContain('sr-only')
    expect(card('Mầm non').className).toContain('has-[:focus-visible]:outline-4')
  })

  it('giữ nút «Bắt đầu chơi»; bỏ dòng mô tả cách chơi cũ dưới nhóm radio', () => {
    render(<BeeGardenLab />)
    expect(screen.getByRole('button', { name: 'Bắt đầu chơi' })).toBeTruthy()
    expect(screen.queryByText('Chạm vào bông hoa là ong bay tới và chấm luôn.')).toBeNull()
  })

  it('renderer nhận con số đích (huy hiệu) của câu hiện tại', async () => {
    render(<BeeGardenLab />)
    await start()
    expect(h.props?.promptNumber).toBe(ROUND_TARGETS[0])
  })
})

describe('Vườn hoa: số câu theo dữ liệu', () => {
  it('mặc định 5 câu; roundCount đổi số ô trên thanh tiến trình và số câu của lượt', async () => {
    const { unmount } = render(<BeeGardenLab />)
    await start()
    expect(starsLabel()).toBe('0 trên 5 bông hoa')
    unmount()
    render(<BeeGardenLab roundCount={3} />)
    await start()
    expect(starsLabel()).toBe('0 trên 3 bông hoa')
    answerWith(3)
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp theo' }))
    answerWith(7)
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp theo' }))
    answerWith(5)
    fireEvent.click(screen.getByRole('button', { name: 'Xem phần thưởng' }))
    expect(screen.getByText('Giỏi quá! Bé được 3 / 3 bông hoa')).toBeTruthy()
  })

  it('lượt dài hơn 5 câu: câu thứ 6 trở đi có số hợp lệ và id riêng; chơi hết thì màn kết thúc ghi đúng tổng', async () => {
    render(<BeeGardenLab roundCount={7} />)
    await start()
    expect(starsLabel()).toBe('0 trên 7 bông hoa')
    const ids = new Set<string>()
    for (let i = 0; i < 7; i += 1) {
      const sent = h.props!.question as { id: string; questionText: string }
      ids.add(sent.id)
      const target = Number(/số (\d+)/.exec(sent.questionText)![1])
      answerWith(target)
      fireEvent.click(screen.getByRole('button', { name: i === 6 ? 'Xem phần thưởng' : 'Câu tiếp theo' }))
    }
    expect(ids.size).toBe(7)
    expect(screen.getByText('Giỏi quá! Bé được 7 / 7 bông hoa')).toBeTruthy()
  })
})

describe('Vườn hoa: âm thanh (nút tắt tiếng, âm nền)', () => {
  const soundButton = () => screen.getByRole('button', { name: /Tiếng:/ })
  const ambienceButton = () => screen.getByRole('button', { name: /Âm nền:/ })

  it('có nút tắt/bật tiếng và nút âm nền ở mọi màn (bắt đầu, đang chơi, kết thúc) để khung không dịch chỗ; mặc định bật cả hai', async () => {
    render(<BeeGardenLab />)
    expect(soundButton()).toBeTruthy() // ngay ở màn bắt đầu
    await start()
    expect(soundButton().textContent).toContain('Bật')
    expect(soundButton().getAttribute('aria-pressed')).toBe('true')
    expect(ambienceButton().textContent).toContain('Bật')
    expect(ambienceButton().getAttribute('aria-pressed')).toBe('true')
  })

  it('bấm Bắt đầu chơi mở khóa âm thanh (trong cử chỉ) để âm nền bật được; renderer nhận bộ âm nền ổn định giữa các lần vẽ', async () => {
    h.audio.unlock.mockClear()
    render(<BeeGardenLab />)
    await start()
    expect(h.audio.unlock).toHaveBeenCalled()
    const first = (h.props as { ambience?: unknown }).ambience
    expect(first).toBeTruthy()
    answerWith(3)
    expect((h.props as { ambience?: unknown }).ambience).toBe(first)
  })

  it('tắt tiếng: dịch vụ âm thanh và Howler cùng tắt, nút âm nền bị khóa, nhớ trong phiên; bật lại thì mở', async () => {
    window.sessionStorage.clear()
    render(<BeeGardenLab />)
    await start()
    fireEvent.click(soundButton())
    expect(h.audio.setMuted).toHaveBeenLastCalledWith(true)
    expect(h.howlerMute).toHaveBeenLastCalledWith(true)
    expect(soundButton().textContent).toContain('Tắt')
    expect((ambienceButton() as HTMLButtonElement).disabled).toBe(true)
    expect(window.sessionStorage.getItem('bee-garden-sound-muted')).toBe('1')
    fireEvent.click(soundButton())
    expect(h.audio.setMuted).toHaveBeenLastCalledWith(false)
    expect((ambienceButton() as HTMLButtonElement).disabled).toBe(false)
    window.sessionStorage.clear()
  })

  it('nút vùng chạm đạt tối thiểu theo hồ sơ độ tuổi (≥ 64px ở Mầm non)', async () => {
    render(<BeeGardenLab />)
    await start()
    expect(parseInt(soundButton().style.minHeight, 10)).toBeGreaterThanOrEqual(64)
    expect(parseInt(ambienceButton().style.minHeight, 10)).toBeGreaterThanOrEqual(64)
  })

  it('đã tắt tiếng thì không đọc lời động viên (Web Speech)', async () => {
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { getVoices: () => [{ name: 'Linh', lang: 'vi-VN', localService: true, default: false, voiceURI: 'x' }], speak, cancel: vi.fn(), speaking: false, pending: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; constructor(text: string) { this.text = text } })
    try {
      render(<BeeGardenLab />)
      await start()
      fireEvent.click(soundButton())
      answerWith(3)
      await new Promise((resolve) => setTimeout(resolve, 700))
      expect(speak).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('Vườn hoa: chuyển cảnh giữa các câu', () => {
  it('renderer nhận cờ chuyển cảnh; bấm «Câu tiếp theo» cho renderer diễn cảnh rời câu, hai nút bị khóa cho tới khi xong, rồi mới sang câu sau (không mất kết quả)', async () => {
    h.holdExit = true
    render(<BeeGardenLab />)
    await start()
    expect((h.props as { transitions?: boolean }).transitions).toBe(true)
    answerWith(0) // sai
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp theo' }))
    expect((h.props as { exiting?: boolean }).exiting).toBe(true)
    expect((screen.getByRole('button', { name: 'Câu tiếp theo' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Thử lại' }) as HTMLButtonElement).disabled).toBe(true)
    expect(question()).toBe('Đặt chú ong vào số 3') // vẫn ở câu 1 trong lúc diễn cảnh
    expect(starsLabel()).toBe('0 trên 5 bông hoa')
    const onExited = (h.props as { onExited: () => void }).onExited
    act(() => onExited())
    expect(question()).toBe('Đặt chú ong vào số 7')
    expect((h.props as { exiting?: boolean }).exiting).toBe(false)
  })
  it('chọn thời điểm trong ngày (chỉ khi phát triển): mặc định không ép giá trị, có đủ ba thời điểm; tham số và công cụ chọn chuyển xuống renderer; người chơi không thấy công cụ', async () => {
    const { unmount } = render(<BeeGardenLab />)
    await start()
    expect((h.props as { timeOfDay?: string }).timeOfDay).toBeUndefined()
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('morning')
    expect(Array.from(select.options).map((option) => option.value)).toEqual(['morning', 'sunset', 'night'])
    fireEvent.change(select, { target: { value: 'night' } })
    expect((h.props as { timeOfDay?: string }).timeOfDay).toBe('night')
    expect(question()).toBe('Đặt chú ong vào số 3') // đổi thời điểm không làm mất câu đang chơi
    unmount()
    render(<BeeGardenLab timeOfDay="sunset" />)
    await start()
    expect((h.props as { timeOfDay?: string }).timeOfDay).toBe('sunset')
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('sunset')
    vi.stubEnv('DEV', false)
    try {
      const view = render(<BeeGardenLab />)
      expect(view.container.querySelector('select')).toBeNull()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('bấm Thử lại thì gắn lại ngay (không diễn cảnh rời)', async () => {
    h.holdExit = true
    render(<BeeGardenLab />)
    await start()
    answerWith(0)
    const mounts = h.mounts
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(h.mounts).toBeGreaterThan(mounts)
    expect((h.props as { exiting?: boolean }).exiting).toBe(false)
  })
})
