import { useEffect } from 'react'
import { Howl } from 'howler'

/** Tự đọc đề bài một lần khi vào câu (đổi `audioUrl` thì đọc câu mới); dọn khi đổi câu hoặc đóng. Nút "Nghe lại" vẫn do renderer lo. */
export function useAutoReadPrompt(audioUrl: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!audioUrl || !enabled) return
    const howl = new Howl({ src: [audioUrl] })
    howl.play()

    return () => {
      howl.stop()
      howl.unload()
    }
  }, [audioUrl, enabled])
}
