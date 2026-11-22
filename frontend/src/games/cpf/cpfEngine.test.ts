import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CpfGame } from '../../types/cpf-game.types'
import {
  HINT_AFTER_WRONG,
  applyCheck,
  correctRounds,
  currentRound,
  endReveal,
  initialState,
  localGrader,
  type CpfState,
} from './cpfEngine'

// Ví dụ dùng chung với backend (CpfGameSchemaTest): một nguồn, không chép sang frontend.
const EXAMPLES_DIR = join(__dirname, '../../../../backend/src/test/resources/cpf-examples')
const examples: [string, CpfGame][] = readdirSync(EXAMPLES_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f, JSON.parse(readFileSync(join(EXAMPLES_DIR, f), 'utf8')) as CpfGame])

const load = (name: string) => examples.find(([f]) => f.startsWith(name))![1]

/** Trẻ "khó học": mỗi màn chọn sai trước, rồi chỉ chọn đúng khi được runtime chỉ hoặc gợi ý. */
function playStubbornly(game: CpfGame): CpfState {
  const grade = localGrader(game)
  let state = initialState()
  for (let guard = 0; guard < 500 && state.phase !== 'finished'; guard++) {
    const round = currentRound(game, state)!
    if (state.phase === 'reveal') {
      state = endReveal(game, state)
      continue
    }
    const answer = game.answerKey.rounds[state.roundIndex]
    if (round.task === 'SORT' && 'placements' in answer) {
      const next = answer.placements.find((p) => !state.done.includes(p.choiceId))!
      const wrongZone = round.zones!.find((z) => z.id !== next.zoneId)!.id
      // Thả sai tới khi nhóm đúng được làm sáng, rồi thả đúng vào nhóm sáng.
      const zoneId = state.glowZoneId ?? wrongZone
      state = applyCheck(game, state, { roundId: round.id, choiceId: next.choiceId, zoneId }, grade({ roundId: round.id, choiceId: next.choiceId, zoneId }))
      continue
    }
    if (!('correctChoiceIds' in answer)) throw new Error('đáp án sai dạng')
    const wrong = round.choices.find((c) => !answer.correctChoiceIds.includes(c.id))!.id
    const choiceId = state.glowChoiceIds[0] ?? wrong
    state = applyCheck(game, state, { roundId: round.id, choiceId }, grade({ roundId: round.id, choiceId }))
  }
  return state
}

describe('cpfEngine với 5 ví dụ', () => {
  it.each(examples)('%s: trẻ chọn sai nhiều vẫn đi tới cuối game', (_name, game) => {
    const state = playStubbornly(game)

    expect(state.phase).toBe('finished')
    expect(state.results).toHaveLength(game.content.rounds.length)
    expect(state.results.every((r) => r.outcome === 'INCORRECT')).toBe(true)
  })

  it.each(examples)('%s: chọn đúng hết thì mọi màn CORRECT', (_name, game) => {
    const grade = localGrader(game)
    let state = initialState()
    game.content.rounds.forEach((round, i) => {
      const answer = game.answerKey.rounds[i]
      const picks =
        'placements' in answer
          ? answer.placements.map((p) => ({ roundId: round.id, choiceId: p.choiceId, zoneId: p.zoneId }))
          : answer.correctChoiceIds.map((choiceId) => ({ roundId: round.id, choiceId }))
      for (const pick of picks) state = applyCheck(game, state, pick, grade(pick))
    })

    expect(state.phase).toBe('finished')
    expect(correctRounds(state)).toBe(game.content.rounds.length)
  })
})

describe('applyCheck', () => {
  it('PICK_ONE sai: chuyển sang chỉ đáp án đúng, chưa sang màn', () => {
    const game = load('race')
    const state = applyCheck(game, initialState(), { roundId: 'r1', choiceId: 'c1' }, localGrader(game)({ roundId: 'r1', choiceId: 'c1' }))

    expect(state.phase).toBe('reveal')
    expect(state.glowChoiceIds).toEqual(['c2'])
    expect(state.roundIndex).toBe(0)
    expect(endReveal(game, state).roundIndex).toBe(1)
  })

  it(`PICK_ALL: gợi ý một đáp án đúng còn lại sau ${HINT_AFTER_WRONG} lần sai, không trước`, () => {
    const game = load('catch')
    const grade = localGrader(game)
    let state = initialState()
    state = applyCheck(game, state, { roundId: 'r1', choiceId: 'c1' }, grade({ roundId: 'r1', choiceId: 'c1' }))
    for (let i = 1; i < HINT_AFTER_WRONG; i++) {
      state = applyCheck(game, state, { roundId: 'r1', choiceId: 'c2' }, grade({ roundId: 'r1', choiceId: 'c2' }))
      expect(state.glowChoiceIds).toEqual([])
    }
    state = applyCheck(game, state, { roundId: 'r1', choiceId: 'c4' }, grade({ roundId: 'r1', choiceId: 'c4' }))

    expect(state.glowChoiceIds).toEqual(['c3'])
  })

  it('bỏ qua lần chọn của màn khác (chạm trễ sau khi đã sang màn)', () => {
    const game = load('race')
    const state = initialState()
    expect(applyCheck(game, state, { roundId: 'r2', choiceId: 'c1' }, { isCorrect: true })).toBe(state)
  })

  it('play: PICK_ALL dựa vào correctChoiceIds Backend trả để biết đã xong màn', () => {
    const { answerKey: _hidden, ...student } = load('catch')
    let state = initialState()
    state = applyCheck(student, state, { roundId: 'r1', choiceId: 'c1' }, { isCorrect: true, correctChoiceIds: ['c1', 'c3'] })
    expect(state.roundIndex).toBe(0)
    state = applyCheck(student, state, { roundId: 'r1', choiceId: 'c3' }, { isCorrect: true, correctChoiceIds: ['c1', 'c3'] })
    expect(state.roundIndex).toBe(1)
  })
})
