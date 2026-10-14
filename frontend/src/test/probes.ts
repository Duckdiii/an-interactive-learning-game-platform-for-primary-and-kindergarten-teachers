import type { QuestionDsl } from '../types/game-dsl.types'

// Hai "máy đo" nhỏ cho test form: kho giữ câu HIỆN HÀNH sau mọi bản vá, và bộ đếm các thao tác đang khóa Lưu/Chơi thử.

export interface QuestionStore {
  get: () => QuestionDsl
  set: (next: QuestionDsl) => void
}

export function createQuestionStore(initial: QuestionDsl): QuestionStore {
  let value = initial

  return {
    get: () => value,
    set: (next) => {
      value = next
    },
  }
}

export interface PendingProbe {
  // Số thao tác đang chờ (đang khóa Lưu/Chơi thử) lúc này.
  readonly active: number
  // Tổng số lần `begin()` đã gọi.
  readonly begun: number
  begin: () => () => void
}

export function createPendingProbe(): PendingProbe {
  let active = 0
  let begun = 0

  return {
    get active() {
      return active
    },
    get begun() {
      return begun
    },
    begin: () => {
      active += 1
      begun += 1

      let ended = false

      return () => {
        if (!ended) active -= 1
        ended = true
      }
    },
  }
}
