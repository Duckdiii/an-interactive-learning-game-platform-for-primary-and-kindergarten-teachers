import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Layer, Text } from 'react-konva'
import type { MatchingQuestion } from '../../types/game-dsl.types'
import type { MatchingStudentQuestion } from '../../types/game-student.types'
import { measureWrappedTextHeight } from '../common/measureText'
import { STAGE_WIDTH } from '../common/mediaLayout'
import QuestionAudioButton from '../common/QuestionAudioButton'
import QuestionIllustration from '../common/QuestionIllustration'
import ResponsiveStage from '../common/ResponsiveStage'
import { playSound } from '../common/sound'
import { useFeedback } from '../common/useFeedback'
import { useIllustration } from '../common/useIllustration'
import { useQuestionAudio } from '../common/useQuestionAudio'
import MatchingCard, { type MatchingCardState } from './MatchingCard'
import MatchingConfirmButton from './MatchingConfirmButton'
import MatchingLines, { type MatchingLine } from './MatchingLines'
import {
  CARD_FONT_SIZE,
  HEADING_FONT_SIZE,
  HEADING_WIDTH,
  LEFT_X,
  cardContentHeight,
  cardRect,
  cardTextWidth,
  computeMatchingLayout,
  estimateTextHeight,
  lineAnchor,
} from './matchingLayout'
import { canSubmit, createMatchingState, matchingReducer } from './matchingReducer'
import { missingCorrectLinks, verdictOfLink, type MatchingResult } from './matchingResult'
import type { MatchingAnswerResult, MatchingView, PairLink } from './matchingTypes'
import {
  correctLinksOf,
  fromStudentQuestion,
  fromTeacherQuestion,
  isCorrectLocally,
  sideDisplay,
} from './matchingView'

/**
 * Prop phụ thuộc `mode` (union) để sai là lỗi lúc build thay vì lỗi lúc chạy:
 * - preview: GV xem trước, `question` là dạng giáo viên (có `pairs`). Nối tự do rồi bấm «Xong rồi!»; component
 *   chấm cục bộ. `onAnswered` chỉ để thông báo (không cần kết quả).
 * - play: `question` là dạng học sinh (id mờ, hai cột đã xáo). Cha gọi API chấm và PHẢI trả kết quả
 *   (`MatchingAnswerResult`); thiếu thì ô khoá mà không có feedback. Component không tự chấm. Nên kèm
 *   `correctAnswer.matches` để hiện đáp án đúng cho trẻ học khi trả lời sai.
 * - review: xem lại, `matches` là các cặp học sinh đã nối (rỗng nếu hết giờ/bỏ qua); khoá sẵn, không nút nộp.
 */
export type MatchingRendererProps =
  | {
      mode: 'preview'
      question: MatchingQuestion
      onAnswered?: (matches: PairLink[]) => void
      /** Ngừng nhận chạm (ví dụ hết giờ, cha đang nộp thay). */
      disabled?: boolean
    }
  | {
      mode: 'play'
      question: MatchingStudentQuestion
      onAnswered: (matches: PairLink[]) => MatchingAnswerResult | Promise<MatchingAnswerResult>
      disabled?: boolean
    }
  | { mode: 'review'; question: MatchingQuestion; matches: PairLink[] }

const PAIR_MATCHED_SOUND = '/sounds/pair-matched.wav'

/** Màu theo ô trái, ổn định khi nối/gỡ. Cố ý không có đỏ hay xanh lá: hai màu đó dành cho kết quả. */
const LINK_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#92400E', '#64748B']
const CORRECT_COLOR = '#43A047'
const WRONG_COLOR = '#F59E0B'

const HEADING_PADDING = 8

function buildView(question: MatchingQuestion | MatchingStudentQuestion): MatchingView {
  return 'leftItems' in question ? fromStudentQuestion(question) : fromTeacherQuestion(question)
}

/** Lớp ngoài chỉ đặt `key`: đổi câu/mode/bài xem lại thì dựng lại toàn bộ state (cách React khuyến nghị). */
export default function MatchingRenderer(props: MatchingRendererProps) {
  const resetKey =
    props.mode === 'review'
      ? `review-${props.question.id}-${JSON.stringify(props.matches)}`
      : `${props.mode}-${props.question.id}`
  return <MatchingBoard key={resetKey} {...props} />
}

function MatchingBoard(props: MatchingRendererProps) {
  const { question } = props
  const { showFeedback } = useFeedback()
  const { image: illustration, reserveSpace: hasIllustration } = useIllustration(question.imageUrl)
  const playAudio = useQuestionAudio(question.audioUrl)

  const view = useMemo(() => buildView(question), [question])
  const pairCount = view.leftItems.length

  const [state, dispatch] = useReducer(matchingReducer, props, (initial) =>
    initial.mode === 'review' ? createMatchingState(initial.matches, 'done') : createMatchingState(),
  )
  const [submitted, setSubmitted] = useState<MatchingResult | null>(null)

  // Xem lại: kết quả suy ra ngay từ các cặp đã nối. Chơi/xem trước: lấy từ lúc chấm.
  const result: MatchingResult | null =
    props.mode === 'review'
      ? {
          isCorrect: isCorrectLocally(props.matches, pairCount),
          correctLinks: correctLinksOf(props.question),
        }
      : submitted

  // Kết quả của lượt chấm bất đồng bộ chỉ áp dụng nếu component còn sống (chưa đổi câu/đóng).
  const activeRef = useRef(true)
  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  // ---- bố cục (đo chữ thật, đo không được thì ước lượng) ----
  const headingText = question.audioText
  const headingHeight = useMemo(() => {
    if (!headingText) return 0
    const measured = measureWrappedTextHeight({ text: headingText, fontSize: HEADING_FONT_SIZE, width: HEADING_WIDTH })
    return (measured ?? estimateTextHeight(headingText, HEADING_FONT_SIZE, HEADING_WIDTH)) + HEADING_PADDING
  }, [headingText])

  const cardContentHeights = useMemo(
    () =>
      [...view.leftItems, ...view.rightItems].map((item) => {
        const { text, hasImage } = sideDisplay(item.content)
        const width = cardTextWidth(hasImage)
        const textHeight = text
          ? (measureWrappedTextHeight({ text, fontSize: CARD_FONT_SIZE, width, fontStyle: 'bold' }) ??
            estimateTextHeight(text, CARD_FONT_SIZE, width))
          : 0
        return cardContentHeight({ hasImage, textHeight })
      }),
    [view],
  )

  const layout = computeMatchingLayout({
    hasIllustration,
    hasAudio: Boolean(question.audioUrl),
    headingHeight,
    pairCount,
    cardContentHeights,
    showConfirmButton: props.mode !== 'review',
  })

  // ---- tương tác ----
  const interactive = props.mode !== 'review' && !props.disabled

  const handleTapLeft = (id: string) => {
    if (!interactive) return
    dispatch({ type: 'tapLeft', id })
  }

  const handleTapRight = (id: string) => {
    if (!interactive) return
    // Âm «nối được» phát đúng lúc một cặp mới được tạo (đang chọn một ô trái và chạm ô phải).
    if (state.phase === 'pairing' && state.selectedLeftId !== null) playSound(PAIR_MATCHED_SOUND)
    dispatch({ type: 'tapRight', id })
  }

  const handleSubmit = async () => {
    if (props.mode === 'review' || !interactive || !canSubmit(state, pairCount)) return
    const links = state.links
    dispatch({ type: 'submitStart', total: pairCount })

    if (props.mode === 'preview') {
      const isCorrect = isCorrectLocally(links, pairCount)
      setSubmitted({ isCorrect, correctLinks: correctLinksOf(props.question) })
      dispatch({ type: 'submitDone' })
      showFeedback(isCorrect)
      // Kiểu `void` không chặn được cha truyền hàm async; bọc lại để Promise bị reject không thành
      // unhandled rejection.
      Promise.resolve(props.onAnswered?.(links)).catch((error) => {
        console.error('MatchingRenderer: onAnswered (preview) bị lỗi', error)
      })
      return
    }

    // mode === 'play': Backend chấm thật qua component cha; không tự chấm ở đây.
    try {
      const answer = await props.onAnswered(links)
      if (!activeRef.current) return // đã đổi câu/đóng, bỏ qua kết quả cũ
      setSubmitted({ isCorrect: answer.isCorrect, correctLinks: answer.correctAnswer?.matches ?? [] })
      dispatch({ type: 'submitDone' })
      // Kiểu đã bắt buộc có `isCorrect`; vẫn kiểm tra lúc chạy phòng cha viết bằng JS hoặc ép kiểu sai
      // (khi đó chỉ khoá lại, không phát feedback).
      if (typeof answer.isCorrect === 'boolean') showFeedback(answer.isCorrect)
    } catch (error) {
      if (!activeRef.current) return
      console.error('MatchingRenderer: onAnswered bị lỗi, mở khoá lại để thử lại', error)
      dispatch({ type: 'submitFailed' })
    }
  }

  // ---- dữ liệu để vẽ ----
  const leftIndexById = new Map(view.leftItems.map((item, index) => [item.id, index]))
  const rightIndexById = new Map(view.rightItems.map((item, index) => [item.id, index]))

  const lineBetween = (link: PairLink, color: string, dashed: boolean): MatchingLine | null => {
    const leftIndex = leftIndexById.get(link.leftPairId)
    const rightIndex = rightIndexById.get(link.rightPairId)
    if (leftIndex === undefined || rightIndex === undefined) return null
    return {
      key: `${dashed ? 'missing' : 'link'}-${link.leftPairId}-${link.rightPairId}`,
      from: lineAnchor(layout, 'left', leftIndex),
      to: lineAnchor(layout, 'right', rightIndex),
      color,
      dashed,
    }
  }

  const lines: MatchingLine[] = []
  for (const link of state.links) {
    const color = result
      ? verdictOfLink(link, result) === 'correct'
        ? CORRECT_COLOR
        : WRONG_COLOR
      : LINK_COLORS[(leftIndexById.get(link.leftPairId) ?? 0) % LINK_COLORS.length]
    const line = lineBetween(link, color, false)
    if (line) lines.push(line)
  }
  if (result) {
    for (const link of missingCorrectLinks(state.links, result)) {
      const line = lineBetween(link, CORRECT_COLOR, true)
      if (line) lines.push(line)
    }
  }

  const cardState = (link: PairLink | undefined, selected: boolean): MatchingCardState => {
    if (result) {
      if (!link) return 'idle'
      return verdictOfLink(link, result) === 'correct' ? 'correct' : 'wrong'
    }
    if (selected) return 'selected'
    return link ? 'linked' : 'idle'
  }
  const accentOf = (link: PairLink | undefined) =>
    link ? LINK_COLORS[(leftIndexById.get(link.leftPairId) ?? 0) % LINK_COLORS.length] : undefined

  const showConfirm = layout.confirmButtonY !== null && state.phase !== 'done'

  return (
    <ResponsiveStage width={STAGE_WIDTH} height={layout.stageHeight}>
      <Layer>
        {layout.illustrationY !== null && <QuestionIllustration image={illustration} y={layout.illustrationY} />}

        {layout.headingY !== null && headingText && (
          <Text
            text={headingText}
            fontSize={HEADING_FONT_SIZE}
            x={LEFT_X}
            y={layout.headingY}
            width={HEADING_WIDTH}
            height={headingHeight}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        )}

        {layout.audioButtonY !== null && <QuestionAudioButton y={layout.audioButtonY} onPress={playAudio} />}

        <MatchingLines lines={lines} />

        {view.leftItems.map((item, index) => {
          const link = state.links.find((l) => l.leftPairId === item.id)
          return (
            <MatchingCard
              key={`left-${item.id}`}
              {...cardRect(layout, 'left', index)}
              content={item.content}
              state={cardState(link, state.selectedLeftId === item.id)}
              accent={accentOf(link) ?? LINK_COLORS[index % LINK_COLORS.length]}
              onPress={() => handleTapLeft(item.id)}
            />
          )
        })}

        {view.rightItems.map((item, index) => {
          const link = state.links.find((l) => l.rightPairId === item.id)
          return (
            <MatchingCard
              key={`right-${item.id}`}
              {...cardRect(layout, 'right', index)}
              content={item.content}
              state={cardState(link, false)}
              accent={accentOf(link)}
              onPress={() => handleTapRight(item.id)}
            />
          )
        })}

        {showConfirm && layout.confirmButtonY !== null && (
          <MatchingConfirmButton
            y={layout.confirmButtonY}
            label={state.phase === 'submitting' ? 'Đang chấm…' : 'Xong rồi!'}
            enabled={interactive && canSubmit(state, pairCount)}
            onPress={handleSubmit}
          />
        )}
      </Layer>
    </ResponsiveStage>
  )
}
