import type { OrderingQuestion, OrderStep } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'

const LIMITS = TYPE_LIMITS.ORDERING.steps

export const canAddStep = (question: OrderingQuestion) => question.steps.length < LIMITS.max
export const canRemoveStep = (question: OrderingQuestion) => question.steps.length > LIMITS.min

/** Mã bước mới: `s<n>` với n nhỏ nhất (từ 1) chưa có bước nào dùng. */
export function nextStepId(steps: ReadonlyArray<OrderStep>) {
  const used = new Set(steps.map((step) => step.id))
  let number = 1

  while (used.has(`s${number}`)) number += 1

  return `s${number}`
}

/** Số nhỏ nhất mà mã `s<số>` chưa bao giờ dùng: tránh bản vá về muộn ghi đè. */
export function firstUnusedStepNumber(steps: ReadonlyArray<OrderStep>) {
  return steps.reduce((max, step) => Math.max(max, Number(step.id.replace(/^s/, '')) || 0), 0) + 1
}

/** Chuẩn hóa lại correctPosition thành dãy 1..N liên tục. */
export function normalizePositions(steps: ReadonlyArray<OrderStep>): OrderStep[] {
  return steps.map((step, index) => ({
    ...step,
    correctPosition: index + 1,
  }))
}

/** Thêm một bước mới vào cuối mảng, tự sinh id và correctPosition. */
export function addStep(question: OrderingQuestion, stepId: string = nextStepId(question.steps)): OrderingQuestion {
  if (!canAddStep(question)) return question

  const newStep: OrderStep = {
    id: stepId,
    text: '',
    correctPosition: question.steps.length + 1,
  }

  return {
    ...question,
    steps: normalizePositions([...question.steps, newStep]),
  }
}

/** Xóa bước theo ID; các bước còn lại tự đánh số lại correctPosition 1..N. */
export function removeStepById(question: OrderingQuestion, stepId: string): OrderingQuestion {
  if (!canRemoveStep(question)) return question

  const nextSteps = question.steps.filter((step) => step.id !== stepId)

  return {
    ...question,
    steps: normalizePositions(nextSteps),
  }
}

/** Hoán đổi vị trí hai bước kề nhau (ví dụ: bấm Lên hoặc Xuống). */
export function moveStep(question: OrderingQuestion, fromIndex: number, toIndex: number): OrderingQuestion {
  if (
    fromIndex < 0 ||
    fromIndex >= question.steps.length ||
    toIndex < 0 ||
    toIndex >= question.steps.length ||
    fromIndex === toIndex
  ) {
    return question
  }

  const steps = [...question.steps]
  const [removed] = steps.splice(fromIndex, 1)
  if (!removed) return question

  steps.splice(toIndex, 0, removed)

  return {
    ...question,
    steps: normalizePositions(steps),
  }
}

/** Cập nhật nội dung text của một bước theo ID. */
export function setStepText(question: OrderingQuestion, stepId: string, text: string): OrderingQuestion {
  const trimmed = text.trim()

  return {
    ...question,
    steps: question.steps.map((step) => {
      if (step.id !== stepId) return step

      const { text: _removed, ...rest } = step
      return trimmed === '' ? rest : { ...rest, text }
    }),
  }
}

/** Cập nhật mô tả ảnh (visualPrompt) của một bước theo ID. */
export function setStepVisualPrompt(question: OrderingQuestion, stepId: string, visualPrompt: string): OrderingQuestion {
  const trimmed = visualPrompt.trim()

  return {
    ...question,
    steps: question.steps.map((step) => {
      if (step.id !== stepId) return step

      const { visualPrompt: _removed, ...rest } = step
      return trimmed === '' ? rest : { ...rest, visualPrompt }
    }),
  }
}

/** Bí danh tương thích cho setStepVisualPrompt. */
export const setStepImageDescription = setStepVisualPrompt

/** Cập nhật ảnh imageUrl của một bước theo ID. */
export function setStepImageUrl(question: OrderingQuestion, stepId: string, imageUrl?: string): OrderingQuestion {
  return {
    ...question,
    steps: question.steps.map((step) => {
      if (step.id !== stepId) return step

      const { imageUrl: _removed, ...rest } = step
      return imageUrl ? { ...rest, imageUrl } : rest
    }),
  }
}

/** Bí danh tương thích cho setStepImageUrl. */
export const setStepMediaUrl = setStepImageUrl
