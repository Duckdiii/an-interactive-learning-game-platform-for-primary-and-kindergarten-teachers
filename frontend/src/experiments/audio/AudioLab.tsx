import { useSyncExternalStore } from 'react'
import { getAudioService, type AudioService } from './audioService'
import { SOUND_NAMES, type SoundName } from './tones'

const LABELS: Record<SoundName, string> = {
  correct: 'Đúng',
  tryAgain: 'Thử lại',
  complete: 'Hoàn thành',
}

interface AudioLabProps {
  /** Cho test truyền bản giả; mặc định dùng bản dùng chung. */
  service?: AudioService
}

/**
 * Phòng nghe thử âm tổng hợp. Mỗi lần bấm nút đều gọi `unlock()` trước (cử chỉ của người dùng) rồi phát.
 * Nghe thử bằng loa/tai nghe thật để đánh giá có dễ chịu cho trẻ hay không là việc của người dùng.
 */
export default function AudioLab({ service = getAudioService() }: AudioLabProps) {
  const state = useSyncExternalStore(service.subscribe, service.getSnapshot)

  const playSound = async (name: SoundName) => {
    await service.unlock()
    service.play(name)
  }

  return (
    <div className="space-y-3 p-4">
      <p role="status">{state.unlocked ? 'Âm thanh đã mở khóa.' : 'Âm thanh chưa mở khóa: bấm một nút để mở.'}</p>
      <div role="group" aria-label="Nghe thử" className="flex flex-wrap gap-2">
        {SOUND_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => void playSound(name)}
            className="min-h-16 min-w-16 rounded border bg-white px-4 py-2"
          >
            {LABELS[name]}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={state.muted} onChange={(event) => service.setMuted(event.target.checked)} />
        Tắt tiếng
      </label>
      <label className="flex items-center gap-2">
        Âm lượng
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={state.volume}
          onChange={(event) => service.setVolume(Number(event.target.value))}
        />
        <span>{Math.round(state.volume * 100)}%</span>
      </label>
    </div>
  )
}
