import { useMemo, useState } from 'react'
import { playSound } from '../../games/common/sound'
import type { PairSide } from '../../types/game-dsl.types'
import { cardStyleOf } from '../../utils/presentation'
import { usePresentation } from '../theme/PresentationContext'
import MemoryCardFaces from './MemoryCardFaces'
import type { PlayableRendererProps } from './types'

const FLIP_MS = 450

interface CardItem {
  id: string
  pairId: string
  content: PairSide
}

/**
 * Trình dựng trò chơi Lật Thẻ Nhớ (MEMORY_CARD) cho Bé và Học Sinh.
 * Thiết kế theo phong cách Đồ họa Kẹo ngọt (Candy Gloss / Toy Palette):
 * - Thẻ có hiệu ứng lật vui mắt, viền bo tròn thân thiện mầm non
 * - Mặt úp mang biểu tượng và màu của thế giới (cardStyleOf); lật thẻ xoay 3D, các thẻ xuất hiện lần lượt
 * - Mặt ngửa là hình vẽ Vector SVG ngộ nghĩnh kèm chữ số/tên gọi to rõ
 * - Tự động phát âm thanh khi tìm đúng cặp và khi hoàn thành
 */
export default function MemoryCardPlayable({ question, profile, onSubmit }: PlayableRendererProps<'MEMORY_CARD'>) {
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([])
  // Thẻ đang úp lại: giữ nội dung tới khi xoay xong (khớp thời gian .flip-inner) để trẻ thấy hình đang úp xuống.
  const [hidingCardIds, setHidingCardIds] = useState<string[]>([])
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([])
  const [flips, setFlips] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const cardStyle = cardStyleOf(usePresentation()?.world)

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
          setHidingCardIds([firstId, card.id])
          setIsLocked(false)
          setTimeout(() => setHidingCardIds([]), FLIP_MS)
        }, 800)
      }
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4">
      {/* Lời nhắc hoặc số cặp đã tìm thấy */}
      <div className="mb-4 flex items-center justify-between w-full max-w-2xl px-2">
        <span className="text-sm font-bold text-play-ink-soft">
          Đã tìm được: <strong className="text-play-primary">{matchedPairIds.length}</strong> / {question.pairs.length} cặp
        </span>
        <span className="text-sm font-semibold text-play-ink-soft">
          Số lần lật: <strong className="text-play-ink">{flips}</strong>
        </span>
      </div>

      {/* Lưới các thẻ nhớ */}
      <div className={`grid ${gridColsClass} gap-3 sm:gap-4 max-w-3xl w-full justify-items-center items-center`}>
        {cards.map((card, index) => {
          const isMatched = matchedPairIds.includes(card.pairId)
          const isFlipped = isMatched || flippedCardIds.includes(card.id)
          const showContent = isFlipped || hidingCardIds.includes(card.id)

          return (
            <button
              key={card.id}
              type="button"
              disabled={isMatched || isLocked}
              onClick={() => handleCardClick(card)}
              style={{
                minWidth: Math.min(profile.tokens.minTouch, 72),
                minHeight: Math.min(profile.tokens.minTouch, 72),
                borderRadius: cardStyle.radius,
                animationDelay: `${index * 60}ms`,
              }}
              aria-label={
                isFlipped
                  ? `Thẻ ${index + 1}: ${card.content.text ?? 'Hình minh họa'}`
                  : `Thẻ chưa lật số ${index + 1}`
              }
              className={[
                'flip-card card-in relative aspect-[4/5] w-20 sm:w-24 md:w-28 select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-play-primary',
                'transition-transform',
                isFlipped ? (isMatched ? 'scale-95' : '-translate-y-1') : 'cursor-pointer hover:scale-105 active:scale-95',
              ].join(' ')}
            >
              <MemoryCardFaces content={card.content} cardStyle={cardStyle} flipped={isFlipped} showContent={showContent} matched={isMatched} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
