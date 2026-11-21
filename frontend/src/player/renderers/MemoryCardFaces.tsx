import type { PairSide } from '../../types/game-dsl.types'
import { resolveAssetUrl } from '../../utils/assetResolver'
import type { CardStyle } from '../../utils/presentation'

interface MemoryCardFacesProps {
  content: PairSide
  cardStyle: CardStyle
  /** Đang ngửa (xoay 180 độ bằng .flip-inner.is-flipped). */
  flipped: boolean
  /** Có đưa hình và chữ vào DOM không: thẻ úp không được lộ đáp án. */
  showContent: boolean
  matched?: boolean
}

/**
 * Hai mặt của một thẻ Lật thẻ: mặt úp theo thế giới của game (cardStyleOf) và mặt ngửa có hình + chữ. Dùng chung cho màn
 * chơi (MemoryCardPlayable) và trình soạn của giáo viên, để thẻ giáo viên thấy đúng là thẻ bé sẽ thấy. Bọc ngoài cần
 * class .flip-card (phối cảnh 3D, index.css).
 */
export default function MemoryCardFaces({ content, cardStyle, flipped, showContent, matched = false }: MemoryCardFacesProps) {
  const assetUrl = content.imageUrl || resolveAssetUrl(content.text, content.visualPrompt)
  return (
    <div className={`flip-inner${flipped ? ' is-flipped' : ''}`}>
      <div
        className="flip-face flex items-center justify-center border-3 border-white/40 text-white shadow-sm"
        style={{ borderRadius: cardStyle.radius, background: `linear-gradient(135deg, ${cardStyle.backFrom}, ${cardStyle.backTo})` }}
      >
        <span className="text-2xl sm:text-3xl select-none">{cardStyle.emblem}</span>
      </div>
      <div
        className={[
          'flip-face flip-front flex flex-col items-center justify-center gap-1.5 p-2 border-3',
          matched ? 'border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-white shadow-md',
        ].join(' ')}
        style={{ borderRadius: cardStyle.radius }}
      >
        {showContent ? (
          <>
            {assetUrl ? (
              <img src={assetUrl} alt="" aria-hidden="true" className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 object-contain drop-shadow-2xs" />
            ) : null}
            {content.text ? (
              <span className="line-clamp-2 text-center text-xs sm:text-sm font-black text-play-ink leading-tight">{content.text}</span>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
