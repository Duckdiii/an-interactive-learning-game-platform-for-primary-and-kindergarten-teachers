import { useMemo } from 'react'
import { measureWrappedTextHeight } from '../../../../games/common/measureText'
import { QUESTION_FONT_SIZE } from './beeGardenGeometry'

/** Ước lượng chiều cao chữ khi không đo được (môi trường không có Canvas): thiên về dư. */
function estimateHeight(text: string, fontSize: number, width: number): number {
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.6)))
  return Math.max(1, Math.ceil([...text].length / charsPerLine)) * fontSize * 1.25
}

/** Chiều cao chữ câu hỏi (đã wrap theo `width`, đúng họ phông đang vẽ); đo lại khi chữ, bề rộng hoặc font đổi. */
export function useQuestionHeight(text: string, width: number, fontFamily: string): number {
  return useMemo(
    () =>
      measureWrappedTextHeight({ text, fontSize: QUESTION_FONT_SIZE, width, fontStyle: 'bold', fontFamily }) ??
      estimateHeight(text, QUESTION_FONT_SIZE, width),
    [text, width, fontFamily],
  )
}
