import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CpfGame } from '../../types/cpf-game.types'
import CpfRenderer from './CpfRenderer'
import { buildInstances } from './cpfScene'

// jsdom không có Canvas: mock react-konva thành DOM; Layer giữ lại handler con trỏ để test bấm theo tọa độ sân khấu.
type Handler = (e: unknown) => void
const layer: { down?: Handler; up?: Handler } = {}
vi.mock('react-konva', () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return {
    Stage: Box,
    Layer: ({ children, onPointerDown, onPointerUp }: { children?: React.ReactNode; onPointerDown?: Handler; onPointerUp?: Handler }) => {
      layer.down = onPointerDown
      layer.up = onPointerUp
      return <div>{children}</div>
    },
    Group: Box,
    Rect: () => null,
    Circle: () => null,
    Line: () => null,
    Star: () => null,
    Image: () => null,
    Text: ({ text }: { text?: string }) => <span>{text}</span>,
  }
})
vi.mock('use-image', () => ({ default: () => [undefined] }))
const speak = vi.fn()
vi.mock('../../services/pipeline/assetBank', () => ({ speakVietnamese: (text: string) => speak(text) }))

const EXAMPLES_DIR = join(__dirname, '../../../../backend/src/test/resources/cpf-examples')
const load = (name: string) => JSON.parse(readFileSync(join(EXAMPLES_DIR, `${name}.json`), 'utf8')) as CpfGame

const pointerAt = (x: number, y: number) => ({
  target: { getStage: () => ({ getPointerPosition: () => ({ x, y }), scaleX: () => 1, scaleY: () => 1 }) },
})

/** Bấm vào giữa lựa chọn `choiceId` của màn đầu (vị trí lúc dựng, vòng chuyển động không chạy vì timer giả). */
async function tapChoice(game: CpfGame, choiceId: string) {
  const inst = buildInstances(game, 0).find((i) => i.choiceId === choiceId)!
  await act(async () => {
    layer.down?.(pointerAt(inst.x + inst.w / 2, inst.y + inst.h / 2))
    layer.up?.(pointerAt(inst.x + inst.w / 2, inst.y + inst.h / 2))
  })
}

describe('CpfRenderer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    speak.mockClear()
  })

  it('preview: vẽ câu hỏi màn 1, bộ đếm màn và nhãn các lựa chọn', () => {
    const game = load('catch-even-apples')
    render(<CpfRenderer mode="preview" game={game} />)

    expect(screen.getAllByText(game.content.rounds[0].prompt).length).toBeGreaterThan(0)
    expect(screen.getByText(`1/${game.content.rounds.length}`)).toBeInTheDocument()
    for (const choice of game.content.rounds[0].choices) expect(screen.getByText(choice.label)).toBeInTheDocument()
  })

  it('preview PICK_ONE: chạm sai thì chưa sang màn, chỉ đáp án đúng 1,5 giây rồi mới sang', async () => {
    const game = load('race-multiplication')
    render(<CpfRenderer mode="preview" game={game} />)

    await tapChoice(game, 'c1')
    expect(screen.getByText(`1/${game.content.rounds.length}`)).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.getByText(`2/${game.content.rounds.length}`)).toBeInTheDocument()
  })

  it('play: chấm qua onAnswered (không dùng answerKey) và sang màn khi đúng', async () => {
    const { answerKey: _hidden, ...student } = load('race-multiplication')
    const onAnswered = vi.fn().mockResolvedValue({ isCorrect: true, correctChoiceIds: ['c2'] })
    render(<CpfRenderer mode="play" game={student} onAnswered={onAnswered} />)

    await tapChoice(student as CpfGame, 'c2')

    expect(onAnswered).toHaveBeenCalledWith({ roundId: 'r1', choiceId: 'c2', zoneId: undefined })
    expect(screen.getByText(`2/${student.content.rounds.length}`)).toBeInTheDocument()
  })

  it('play: chấm lỗi (mất mạng) thì không tính sai, vẫn ở màn đó', async () => {
    const { answerKey: _hidden, ...student } = load('race-multiplication')
    const onAnswered = vi.fn().mockRejectedValue(new Error('offline'))
    render(<CpfRenderer mode="play" game={student} onAnswered={onAnswered} />)

    await tapChoice(student as CpfGame, 'c1')
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(screen.getByText(`1/${student.content.rounds.length}`)).toBeInTheDocument()
    // Không bị kẹt "đang chấm": chạm lại vẫn gửi chấm.
    await tapChoice(student as CpfGame, 'c1')
    expect(onAnswered).toHaveBeenCalledTimes(2)
  })

  it('play: Backend chấm sai thì chỉ đáp án đúng 1,5 giây rồi sang màn', async () => {
    const { answerKey: _hidden, ...student } = load('race-multiplication')
    const onAnswered = vi.fn().mockResolvedValue({ isCorrect: false, correctChoiceIds: ['c2'] })
    render(<CpfRenderer mode="play" game={student} onAnswered={onAnswered} />)

    await tapChoice(student as CpfGame, 'c1')
    expect(screen.getByText(`1/${student.content.rounds.length}`)).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    expect(screen.getByText(`2/${student.content.rounds.length}`)).toBeInTheDocument()
  })

  it('play: chạm vào dải HUD (ngoài nút nghe lại) không chọn vật nào', async () => {
    const { answerKey: _hidden, ...student } = load('race-multiplication')
    const onAnswered = vi.fn().mockResolvedValue({ isCorrect: true, correctChoiceIds: ['c2'] })
    render(<CpfRenderer mode="play" game={student} onAnswered={onAnswered} />)
    const sign = buildInstances(student as CpfGame, 0).find((i) => i.choiceId === 'c2')!

    await act(async () => {
      layer.down?.(pointerAt(sign.x + sign.w / 2, 60))
    })

    expect(onAnswered).not.toHaveBeenCalled()
    expect(speak).not.toHaveBeenCalled()
  })

  it('review: mở đúng màn được chỉ định và vẫn nghe lại được câu hỏi dù đang khóa', async () => {
    const game = load('race-multiplication')
    render(<CpfRenderer mode="review" game={game} roundIndex={1} />)

    expect(screen.getAllByText(game.content.rounds[1].prompt).length).toBeGreaterThan(0)
    await act(async () => {
      layer.down?.(pointerAt(40, 40))
    })
    expect(speak).toHaveBeenCalledWith(game.content.rounds[1].prompt)
  })
})
