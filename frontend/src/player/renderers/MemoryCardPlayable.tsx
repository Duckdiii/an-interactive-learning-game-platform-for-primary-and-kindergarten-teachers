import { useMemo, useState } from 'react'
import { playSound } from '../../games/common/sound'
import type { PairSide } from '../../types/game-dsl.types'
import { resolveAssetUrl } from '../../utils/assetResolver'
import type { PlayableRendererProps } from './types'

interface CardItem {
  id: string
  pairId: string
  content: PairSide
}

/**
 * Trình dựng trò chơi Lật Thẻ Nhớ (MEMORY_CARD) cho Bé và Học Sinh.
 * Thiết kế theo phong cách Đồ họa Kẹo ngọt (Candy Gloss / Toy Palette):
 * - Thẻ có hiệu ứng lật vui mắt, viền bo tròn thân thiện mầm non
 * - Mặt úp là ngôi sao may mắn lấp lánh
 * - Mặt ngửa là hình vẽ Vector SVG ngộ nghĩnh kèm chữ số/tên gọi to rõ
 * - Tự động phát âm thanh khi tìm đúng cặp và khi hoàn thành
 */
export default function MemoryCardPlayable({ question, profile, onSubmit }: PlayableRendererProps<'MEMORY_CARD'>) {
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([])
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([])
  const [flips, setFlips] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  // Nhân đôi các cặp thành 2 thẻ và xáo bài theo id câu hỏi
  const cards = useMemo<CardItem[]>(() => {
    const list: CardItem[] = []
    for (const pair of question.pairs) {
      list.push({ id: `${pair.pairId}-a`, pairId: pair.pairId, content: pair.content })
      list.push({ id: `${pair.pairId}-b`, pairId: pair.pairId, content: pair.content })
    }

    let seed = 0
    for (let i = 0; i < question.id.length; i++) {
      seed = (seed * 31 + question.id.charCodeAt(i)) & 0xffffffff
    }

    return [...list].sort((a, b) => {
      const valA = (a.id.charCodeAt(0) * 17 + a.id.charCodeAt(a.id.length - 1) + seed) % 23
      const valB = (b.id.charCodeAt(0) * 17 + b.id.charCodeAt(b.id.length - 1) + seed) % 23
      return valA - valB
    })
  }, [question.id, question.pairs])

  // Lưới thẻ co giãn linh hoạt theo số lượng thẻ
  const gridColsClass = useMemo(() => {
    const count = cards.length
    if (count <= 4) return 'grid-cols-2 sm:grid-cols-4'
    if (count <= 6) return 'grid-cols-3 sm:grid-cols-3 md:grid-cols-6'
    if (count <= 8) return 'grid-cols-4 sm:grid-cols-4'
    return 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6'
  }, [cards.length])

  const handleCardClick = (card: CardItem) => {
    if (isLocked || isCompleted) return
    if (matchedPairIds.includes(card.pairId)) return
    if (flippedCardIds.includes(card.id)) return

    const nextFlips = flips + 1
    setFlips(nextFlips)

    if (flippedCardIds.length === 0) {
      setFlippedCardIds([card.id])
      return
    }

    if (flippedCardIds.length === 1) {
      const firstId = flippedCardIds[0]
      const firstCard = cards.find((c) => c.id === firstId)
      if (!firstCard) return

      setFlippedCardIds([firstId, card.id])

      if (firstCard.pairId === card.pairId) {
        // Khớp cặp!
        playSound('/sounds/pair-matched.wav')
        const nextMatched = [...matchedPairIds, card.pairId]
        setMatchedPairIds(nextMatched)
        setFlippedCardIds([])

        if (nextMatched.length === question.pairs.length) {
          setIsCompleted(true)
          playSound('/sounds/correct.wav')
          void onSubmit({ matchedPairIds: nextMatched, flips: nextFlips })
        }
      } else {
        // Chưa khớp, đợi 800ms để bé nhìn rồi úp lại
        setIsLocked(true)
        setTimeout(() => {
          setFlippedCardIds([])
          setIsLocked(false)
        }, 800)
      }
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4">
      {/* Lời nhắc hoặc số cặp đã tìm thấy */}
      <div className="mb-4 flex items-center justify-between w-full max-w-2xl px-2">
        <span className="text-sm font-bold text-ink-soft">
          Đã tìm được: <strong className="text-brand-strong">{matchedPairIds.length}</strong> / {question.pairs.length} cặp
        </span>
        <span className="text-sm font-semibold text-ink-soft">
          Số lần lật: <strong className="text-ink">{flips}</strong>
        </span>
      </div>

      {/* Lưới các thẻ nhớ */}
      <div className={`grid ${gridColsClass} gap-3 sm:gap-4 max-w-3xl w-full justify-items-center items-center`}>
        {cards.map((card, index) => {
          const isMatched = matchedPairIds.includes(card.pairId)
          const isFlipped = isMatched || flippedCardIds.includes(card.id)
          const assetUrl = card.content.imageUrl || resolveAssetUrl(card.content.text, card.content.visualPrompt)

          return (
            <button
              key={card.id}
              type="button"
              disabled={isMatched || isLocked}
              onClick={() => handleCardClick(card)}
              style={{
                minWidth: Math.min(profile.tokens.minTouch, 72),
                minHeight: Math.min(profile.tokens.minTouch, 72),
              }}
              aria-label={
                isFlipped
                  ? `Thẻ ${index + 1}: ${card.content.text ?? 'Hình minh họa'}`
                  : `Thẻ chưa lật số ${index + 1}`
              }
              className={[
                'group relative flex aspect-[4/5] w-20 sm:w-24 md:w-28 flex-col items-center justify-center rounded-2xl p-2 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand shadow-sm select-none',
                isFlipped
                  ? isMatched
                    ? 'border-3 border-emerald-400 bg-emerald-50/70 scale-95 shadow-none'
                    : 'border-3 border-amber-400 bg-white shadow-md -translate-y-1'
                  : 'border-3 border-amber-600/30 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 hover:scale-105 active:scale-95 cursor-pointer',
              ].join(' ')}
            >
              {isFlipped ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 animate-in fade-in duration-200">
                  {assetUrl ? (
                    <img
                      src={assetUrl}
                      alt=""
                      aria-hidden="true"
                      className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 object-contain drop-shadow-2xs"
                    />
                  ) : null}
                  {card.content.text ? (
                    <span className="line-clamp-2 text-center text-xs sm:text-sm font-black text-ink leading-tight">
                      {card.content.text}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-white drop-shadow">
                  <span className="text-2xl sm:text-3xl select-none">⭐</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
