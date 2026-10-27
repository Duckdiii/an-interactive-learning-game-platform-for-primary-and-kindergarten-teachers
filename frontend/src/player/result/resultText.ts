import { viText } from '../../constants/viText'

const text = viText.player.result

const ratio = (correct: number, total: number) => (total > 0 ? correct / total : 0)

/** 5 sao, tối thiểu 1: bé không bao giờ "thua". */
export const starCount = (correct: number, total: number) => Math.max(1, Math.round(ratio(correct, total) * 5))

export const beHeadline = (correct: number, total: number) => {
  const r = ratio(correct, total)

  return r >= 0.8 ? text.beHeadlineGreat : r >= 0.5 ? text.beHeadlineGood : text.beHeadlineTry
}

interface ParentMessageInput {
  correct: number
  total: number
  topic?: string
  subject: string
}

export const buildParentMessage = ({ correct, total, topic, subject }: ParentMessageInput) => {
  const cleanTopic = topic?.trim()
  const tip = ratio(correct, total) >= 0.8 ? text.parentTipGreat : (Object.hasOwn(text.parentTipBySubject, subject) ? text.parentTipBySubject[subject as keyof typeof text.parentTipBySubject] : text.parentTipDefault)

  return `${text.parentScore(correct, total)}${cleanTopic ? text.parentTopic(cleanTopic) : ''}. ${tip}`
}
