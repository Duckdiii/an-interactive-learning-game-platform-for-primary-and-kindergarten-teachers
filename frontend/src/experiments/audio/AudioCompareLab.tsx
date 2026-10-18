import { Howl, Howler } from 'howler'
import { useEffect, useRef, useState } from 'react'
import { getAudioService } from './audioService'
import type { SoundName } from './tones'
import { makeToneWav } from './wavTone'

/** Dòng nhật ký sự kiện của Howler, để bộ đo và người dùng thấy tải/lỗi. */
export interface HowlerEvent {
  type: 'load' | 'loaderror' | 'playerror' | 'play' | 'end'
  at: number
  detail?: string
}

/** Tín hiệu cho bộ đo của khu thử nghiệm (chỉ có khi Lab đang mở). */
export interface AudioCompareHarness {
  /** Tạo `Howl` mới (hoặc dùng lại) rồi phát; trả mốc `performance.now()` lúc gọi. */
  howlerPlay(fresh: boolean): number
  /** Howl trỏ tới tệp không tồn tại; chờ `waitMs` rồi trả sự kiện đã thấy và việc có ném lỗi không. */
  howlerMissing(waitMs: number): Promise<{ threw: boolean; events: HowlerEvent[]; playReturned: unknown }>
  /** `unlock()` rồi phát âm tổng hợp; trả mốc lúc gọi (trước unlock). */
  synthPlay(name: SoundName): Promise<number>
  /** Chỉ phát (đã mở khóa), không unlock; trả mốc lúc gọi. */
  synthPlayNow(name: SoundName): number
  howlerContextState(): string | null
  synthUnlocked(): boolean
  events(): HowlerEvent[]
}

declare global {
  interface Window {
    __audioCompare?: AudioCompareHarness
  }
}

const TONE = { freq: 660, seconds: 0.4, peak: 0.5 }
const MISSING_URL = '/khong-co-tep-am-thanh.mp3'
/** Giữ tối đa từng ấy sự kiện gần nhất. */
const MAX_EVENTS = 100

/**
 * Phòng so Howler (phát từ tệp) với Web Audio (tổng hợp, `AudioService`). «Tệp» là một nốt WAV tự sinh trong trình duyệt
 * (không tải tài nguyên ngoài). Nghe thử bằng loa thật và đánh giá có dễ chịu cho trẻ hay không là việc của người dùng.
 */
export default function AudioCompareLab() {
  const [log, setLog] = useState<string[]>([])
  const howlRef = useRef<Howl | null>(null)
  const eventsRef = useRef<HowlerEvent[]>([])
  const note = (text: string) => setLog((previous) => [...previous.slice(-5), text])

  useEffect(() => {
    // Blob URL tạo TRONG effect (không trong useMemo): dưới StrictMode effect chạy, dọn, chạy lại; tạo ngoài effect sẽ để lại một URL
    // không bao giờ thu hồi, hoặc dùng lại URL đã thu hồi.
    const wavUrl = URL.createObjectURL(new Blob([makeToneWav(TONE) as BlobPart], { type: 'audio/wav' }))
    const events = eventsRef.current
    events.length = 0
    const record = (type: HowlerEvent['type'], detail?: unknown) => {
      events.push({ type, at: performance.now(), detail: detail === undefined ? undefined : String(detail) })
      if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
    }
    const build = (src: string) => {
      const howl = new Howl({ src: [src], format: ['wav', 'mp3'] })
      howl.on('load', () => record('load'))
      howl.on('loaderror', (_id, error) => record('loaderror', error))
      howl.on('playerror', (_id, error) => record('playerror', error))
      howl.on('play', () => record('play'))
      howl.on('end', () => record('end'))
      return howl
    }
    const harness: AudioCompareHarness = {
      howlerPlay(fresh) {
        const t0 = performance.now()
        if (fresh || !howlRef.current) {
          howlRef.current?.unload()
          howlRef.current = build(wavUrl)
        }
        howlRef.current.play()
        return t0
      },
      async howlerMissing(waitMs) {
        const start = events.length
        let threw = false
        let playReturned: unknown
        let howl: Howl | null = null
        try {
          howl = build(MISSING_URL)
          playReturned = howl.play()
        } catch {
          threw = true
        }
        await new Promise((resolve) => setTimeout(resolve, waitMs))
        howl?.unload() // không để Howl của tệp thiếu nằm lại trong Howler._howls
        return { threw, events: events.slice(Math.max(0, Math.min(start, events.length))), playReturned }
      },
      async synthPlay(name) {
        const t0 = performance.now()
        const service = getAudioService()
        await service.unlock()
        service.play(name)
        return t0
      },
      synthPlayNow(name) {
        const t0 = performance.now()
        getAudioService().play(name)
        return t0
      },
      howlerContextState: () => (Howler.ctx ? Howler.ctx.state : null),
      synthUnlocked: () => getAudioService().isUnlocked,
      events: () => events,
    }
    window.__audioCompare = harness
    return () => {
      delete window.__audioCompare
      howlRef.current?.unload()
      howlRef.current = null
      URL.revokeObjectURL(wavUrl)
    }
  }, [])

  const play = (label: string, run: () => unknown) => () => {
    note(`${label}: đã bấm`)
    void run()
  }

  return (
    <div className="space-y-3 p-4">
      <p>
        Howler phát một nốt 660 Hz (0,4 giây) từ tệp WAV tự sinh; Web Audio tổng hợp ba nốt «Đúng» của T2.1 bằng bộ dao động.
        Hai âm khác nhau nên phòng này so cách phát (độ trễ, mở khóa, tệp thiếu), không so tiếng.
      </p>
      <div role="group" aria-label="Howler (tệp)" className="flex flex-wrap gap-2">
        <button type="button" className="min-h-16 rounded border bg-white px-4" onClick={play('Howler', () => window.__audioCompare?.howlerPlay(false))}>
          Howler: phát (dùng lại)
        </button>
        <button type="button" className="min-h-16 rounded border bg-white px-4" onClick={play('Howler mới', () => window.__audioCompare?.howlerPlay(true))}>
          Howler: tạo mới rồi phát
        </button>
        <button type="button" className="min-h-16 rounded border bg-white px-4" onClick={play('Howler thiếu tệp', () => window.__audioCompare?.howlerMissing(1500))}>
          Howler: tệp không tồn tại
        </button>
      </div>
      <div role="group" aria-label="Web Audio (tổng hợp)" className="flex flex-wrap gap-2">
        <button type="button" className="min-h-16 rounded border bg-white px-4" onClick={play('Web Audio', () => window.__audioCompare?.synthPlay('correct'))}>
          Web Audio: phát «Đúng»
        </button>
      </div>
      <ul aria-label="Nhật ký" className="text-sm">
        {log.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
