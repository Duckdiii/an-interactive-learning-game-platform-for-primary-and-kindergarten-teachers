import { Howl } from 'howler'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Âm lượng nhạc nền: nhỏ hơn hẳn tiếng đúng/sai và giọng đọc câu hỏi để không át chúng. */
export const MUSIC_VOLUME = 0.2

export interface BackgroundMusic {
  /** Có tệp nhạc để phát không (không có thì mọi lệnh đều im lặng và nút bật/tắt nên ẩn). */
  available: boolean
  /** Người chơi đã tắt nhạc. */
  muted: boolean
  /** Bắt đầu phát (nếu chưa tắt). PHẢI gọi từ cử chỉ của người dùng (chạm «Bắt đầu chơi») vì trình duyệt chặn tự phát âm thanh. */
  start: () => void
  /** Dừng hẳn (hết lượt chơi), không đổi trạng thái tắt/bật. */
  stop: () => void
  /** Bật/tắt nhạc; đang chơi thì tiếng tắt hoặc bật ngay. */
  toggle: () => void
}

/**
 * Nhạc nền lặp bằng Howler. `url` rỗng (chưa có tệp nhạc) thì hoàn toàn im lặng và không tạo `Howl`.
 * `Howl` tạo lười ở lần phát đầu và gỡ khi đóng màn hoặc khi đổi tệp. Trạng thái tắt nhạc giữ trong phiên chơi (không lưu vào máy).
 * Tệp nhạc có thể được xác nhận muộn (kiểm tệp chạy nền): bấm «bắt đầu» trước đó thì nhạc phát ngay khi tệp có.
 */
export function useBackgroundMusic(url: string | undefined): BackgroundMusic {
  const howl = useRef<Howl | null>(null)
  // Tệp mà `howl` đang giữ: hiệu ứng dọn dẹp chỉ gỡ Howl của tệp CŨ. Dọn dẹp của một lần vẽ có thể chạy muộn hơn lệnh phát đã tạo Howl cho tệp mới
  // (hiệu ứng thụ động được xả chậm hơn sự kiện bấm), nên không được gỡ nhầm Howl mới.
  const howlUrl = useRef<string | undefined>(undefined)
  const wantPlaying = useRef(false)
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (!howl.current || howlUrl.current !== url) return
      howl.current.stop()
      howl.current.unload()
      howl.current = null
      howlUrl.current = undefined
    }
  }, [url])

  const ensure = useCallback((): Howl | null => {
    if (!url) return null
    if (howl.current && howlUrl.current !== url) {
      howl.current.unload()
      howl.current = null
    }
    howl.current ??= new Howl({ src: [url], loop: true, volume: MUSIC_VOLUME, html5: true })
    howlUrl.current = url
    return howl.current
  }, [url])

  const play = useCallback(() => {
    if (mutedRef.current) return
    const sound = ensure()
    if (sound && !sound.playing()) sound.play()
  }, [ensure])

  useEffect(() => {
    if (url && wantPlaying.current) play()
  }, [url, play])

  const start = useCallback(() => {
    wantPlaying.current = true
    play()
  }, [play])

  const stop = useCallback(() => {
    wantPlaying.current = false
    howl.current?.stop()
  }, [])

  const toggle = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    if (next) {
      howl.current?.pause()
    } else if (wantPlaying.current) {
      play()
    }
  }, [play])

  return { available: Boolean(url), muted, start, stop, toggle }
}
