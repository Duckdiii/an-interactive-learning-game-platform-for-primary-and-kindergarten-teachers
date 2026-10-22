import { Howl } from 'howler'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface Narration {
  /** Đọc lại câu hỏi từ đầu (bấm bao nhiêu lần cũng được). Không có tệp giọng đọc thì không làm gì. */
  play: () => void
  /** Giọng đọc đang phát: nút nghe lại dùng để rung loa và vẽ sóng âm. */
  speaking: boolean
}

/**
 * Giọng đọc câu hỏi bằng Howler, kèm cờ «đang đọc». Thay `useQuestionAudio` dùng chung (hàm đó chỉ trả hàm phát, không báo trạng thái) mà không đổi nó.
 * Mỗi tệp có một `Howl`, gỡ khi đổi câu hoặc đóng màn; đọc xong, dừng, hoặc lỗi thì cờ về `false`.
 */
export function useNarration(audioUrl: string | undefined): Narration {
  const howl = useRef<Howl | null>(null)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (!audioUrl) return
    const off = () => setSpeaking(false)
    const sound = new Howl({
      src: [audioUrl],
      onplay: () => setSpeaking(true),
      onend: off,
      onstop: off,
      onpause: off,
      onloaderror: off,
      onplayerror: off,
    })
    howl.current = sound
    return () => {
      sound.unload()
      howl.current = null
      setSpeaking(false)
    }
  }, [audioUrl])

  const play = useCallback(() => {
    howl.current?.stop()
    howl.current?.play()
  }, [])

  return { play, speaking: Boolean(audioUrl) && speaking }
}
