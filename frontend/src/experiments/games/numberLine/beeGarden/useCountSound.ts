import { useMemo } from 'react'
import { getAudioService, type AudioService } from '../../../audio/audioService'
import { countSoundName } from '../../../audio/tones'

export interface CountSound {
  /** Mở khóa âm thanh của trình duyệt: gọi từ cử chỉ của người dùng (lúc chạm hoa), trước khi các nốt đếm phát từ hoạt ảnh. */
  unlock: () => void
  /** Phát nốt đếm của vạch thứ `index` (từ 0) trên thang `ticks` vạch. */
  play: (index: number, ticks: number) => void
}

/** Hook phát nốt «đếm» khi chú ong bay qua từng bông hoa. Truyền `null` để tắt hẳn âm (test). */
export function useCountSound(audio: AudioService | null = getAudioService()): CountSound {
  return useMemo<CountSound>(
    () => ({
      unlock: () => void audio?.unlock(),
      play: (index, ticks) => void audio?.play(countSoundName(index, ticks)),
    }),
    [audio],
  )
}
