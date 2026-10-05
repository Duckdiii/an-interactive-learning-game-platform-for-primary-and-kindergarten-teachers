import { useEffect, useRef } from 'react'
import { Howl } from 'howler'

/**
 * Âm thanh đọc câu hỏi (`audioUrl`) cho nút «Nghe lại». Tạo `Howl` một lần theo `audioUrl` rồi dùng lại cho
 * mọi lần bấm (nút không giới hạn số lần bấm, tạo mới mỗi lần sẽ làm bộ nhớ audio tăng dần); dọn
 * (`unload`) khi đổi câu hoặc đóng component. Không có `audioUrl` thì không tạo gì và `play` không làm gì.
 *
 * Trả về hàm `play`: `stop()` trước `play()` để trẻ bấm liên tục thì phát lại từ đầu, không chồng nhiều
 * giọng đọc lên nhau.
 */
export function useQuestionAudio(audioUrl: string | undefined) {
  const audioRef = useRef<Howl | null>(null)

  useEffect(() => {
    if (!audioUrl) return
    const howl = new Howl({ src: [audioUrl] })
    audioRef.current = howl
    return () => {
      howl.unload()
      audioRef.current = null
    }
  }, [audioUrl])

  return () => {
    audioRef.current?.stop()
    audioRef.current?.play()
  }
}
