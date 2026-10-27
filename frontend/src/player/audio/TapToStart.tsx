import { viText } from '../../constants/viText'
import { useUiProfile } from '../profile/useUiProfile'
import Mascot from '../theme/Mascot'

/** Âm thanh bị trình duyệt chặn: cả màn là một nút lớn, chạm xong mới vào câu hỏi để giọng đọc phát được. */
export default function TapToStart({ onTap }: { onTap: () => void }) {
  const { tokens } = useUiProfile()
  const text = viText.player.tapToStart

  return (
    <main className="min-h-screen bg-play-page text-play-ink">
      {/* h1 không được nằm trong button: tiêu đề cho trình đọc màn hình đặt riêng. */}
      <h1 className="sr-only">{text.title}</h1>
      <button type="button" onClick={onTap} className="flex min-h-screen w-full flex-col items-center justify-center gap-4 play-safe-x play-safe-y [--play-pad-y:0px] text-center">
        {tokens.decoration ? <Mascot state="speak" /> : null}
        <span className="text-4xl font-bold">{text.title}</span>
        <span className="text-lg text-play-ink-soft">{text.subtitle}</span>
      </button>
    </main>
  )
}
