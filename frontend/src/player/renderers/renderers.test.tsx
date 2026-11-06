import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_TYPES } from '../../types/game-dsl.types'
import type { StudentGame } from '../../types/game-student.types'
import { MockPlayerApi } from '../api/mockPlayerApi'
import { PROFILES } from '../profile/profiles'
import { getPlayableRenderer } from './index'

type StudentQuizGame = Extract<StudentGame, { gameType: 'QUIZ' }>
type StudentMatchingGame = Extract<StudentGame, { gameType: 'MATCHING' }>
type StudentDragDropGame = Extract<StudentGame, { gameType: 'DRAG_DROP' }>
type StudentWordScrambleGame = Extract<StudentGame, { gameType: 'WORD_SCRAMBLE' }>

// Hai bài Matching đầu dùng khung Học sinh (có nút «Xong rồi!»); khung Bé tự nộp khi nối xong, xem cuối tệp.
// Nối renderer cũ (Konva) với MockPlayerApi qua adapter, đúng đường chạy thật: câu hỏi dạng học sinh -> trẻ trả lời -> máy chủ (mô phỏng) chấm
// -> renderer hiện phản hồi. Konva được thay bằng DOM thường như ở test của từng renderer.
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick}>{children}</div>
  ),
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
  Line: ({ dash }: { dash?: number[] }) => <i data-testid="line" data-dashed={dash ? 'yes' : 'no'} />,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../../games/common/sound', () => ({ playSound: vi.fn() }))

const showFeedbackMock = vi.fn()
vi.mock('../../games/common/useFeedback', () => ({ useFeedback: () => ({ showFeedback: showFeedbackMock }) }))

// Để thấy ô nào được tô là đáp án đúng (Rect của Konva đã bị giả lập thành null).
vi.mock('../../games/common/OptionButton', () => ({
  default: ({ option, isCorrect, onClick }: { option: { text: string }; isCorrect: boolean; onClick: () => void }) => (
    <button data-correct={isCorrect ? 'yes' : 'no'} onClick={onClick}>
      {option.text}
    </button>
  ),
}))

const tap = (text: string) => fireEvent.click(screen.getByText(text))
const dashedLines = () => screen.queryAllByTestId('line').filter((el) => el.getAttribute('data-dashed') === 'yes')

async function startSession(shareCode: string) {
  const api = new MockPlayerApi()
  const { sessionId } = await api.createSession(shareCode, 'Bé An')
  const game = (await api.getGameForStudent(sessionId)) as StudentGame

  return { api, sessionId, game }
}

beforeEach(() => showFeedbackMock.mockClear())

describe('registry renderer', () => {
  it('chỉ các loại đã có renderer chơi được; loại khác khung hiện "chưa hỗ trợ"', () => {
    const playable = GAME_TYPES.filter((type) => getPlayableRenderer(type))

    expect(playable).toEqual([...GAME_TYPES])
  })
})

describe('Loại dùng lại QuizRenderer, nộp đúng tên trường của contract', () => {
  const base = { id: 'q1', timeLimitSeconds: 30, points: 10 }
  const odd = { ...base, items: [{ id: 'a', text: 'mèo' }, { id: 'b', text: 'xe' }, { id: 'c', text: 'chó' }] }
  const cloze = { ...base, visualPrompt: 'con mèo', sentenceTemplate: 'Con ___ kêu meo', options: ['chó', 'mèo'] }
  const graded = (isCorrect: boolean, correctAnswer: Record<string, unknown> | null) =>
    vi.fn().mockResolvedValue({ status: isCorrect ? 'CORRECT' : 'INCORRECT', isCorrect, pointsEarned: 0, totalScore: 0, correctAnswer })
  const marked = () => screen.getAllByRole('button').filter((button) => button.getAttribute('data-correct') === 'yes')

  it('ODD_ONE_OUT: chọn sai thì phản hồi sai, nộp `selectedItemId` và tô mục khác loại', async () => {
    const Odd = getPlayableRenderer('ODD_ONE_OUT')!
    const onSubmit = graded(false, { selectedItemId: 'b' })

    render(<Odd question={odd} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)
    tap('mèo')

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(false))
    expect(onSubmit).toHaveBeenCalledWith({ selectedItemId: 'a' })
    expect(screen.getByText('xe')).toHaveAttribute('data-correct', 'yes')
  })

  it('VISUAL_CLOZE: hiện câu có chỗ trống, nộp chính từ đã chọn và tô từ đúng', async () => {
    const Cloze = getPlayableRenderer('VISUAL_CLOZE')!
    const onSubmit = graded(false, { answer: 'mèo' })

    render(<Cloze question={cloze} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)
    expect(screen.getByText('Con ___ kêu meo')).toBeInTheDocument()
    tap('chó')

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(false))
    expect(onSubmit).toHaveBeenCalledWith({ answer: 'chó' })
    expect(screen.getByText('mèo')).toHaveAttribute('data-correct', 'yes')
  })

  it.each([
    ['ODD_ONE_OUT', odd, 'mèo', { selectedItemId: 1 }],
    ['VISUAL_CLOZE', cloze, 'chó', { answer: 1 }],
    ['ODD_ONE_OUT', odd, 'mèo', null],
    ['VISUAL_CLOZE', cloze, 'chó', null],
  ] as const)('%s: máy chủ không trả đáp án dùng được thì vẫn phản hồi, không tô ô nào', async (type, question, choice, correctAnswer) => {
    const Renderer = getPlayableRenderer(type)!

    render(<Renderer question={question as never} profile={PROFILES.hocSinh} onSubmit={graded(true, correctAnswer)} />)
    tap(choice)

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(true))
    expect(marked()).toEqual([])
  })
})

describe('QuizPlayable với MockPlayerApi', () => {
  it('trả lời sai: máy chủ chấm sai, phản hồi nhẹ nhàng và đáp án đúng (do máy chủ trả) được tô cho trẻ học', async () => {
    const { api, sessionId, game } = await startSession('MOCK00')
    const Quiz = getPlayableRenderer('QUIZ')!
    const onSubmit = vi.fn((answer) => api.submitInteraction(sessionId, game.questions[0].id, answer))
    const question = (game as StudentQuizGame).questions[0]

    render(<Quiz question={question} profile={PROFILES.be} onSubmit={onSubmit} />)
    tap('2') // đáp án a, sai (đúng là "3")

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(false))
    expect(onSubmit).toHaveBeenCalledWith({ selectedOptionId: 'a' })
    expect(screen.getByText('3')).toHaveAttribute('data-correct', 'yes')
    expect(screen.getByText('2')).toHaveAttribute('data-correct', 'no')
  })

  it('trả lời đúng: phản hồi đúng', async () => {
    const { api, sessionId, game } = await startSession('MOCK00')
    const Quiz = getPlayableRenderer('QUIZ')!

    render(<Quiz question={(game as StudentQuizGame).questions[0]} profile={PROFILES.be} onSubmit={(a) => api.submitInteraction(sessionId, 'q1', a)} />)
    tap('3')

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(true))
  })

  it('câu hỏi đưa vào renderer không chứa đáp án nên renderer không thể tự chấm', async () => {
    const { game } = await startSession('MOCK00')

    expect(Object.keys((game as StudentQuizGame).questions[0])).not.toContain('correctOptionId')
  })
})

describe('MatchingPlayable với MockPlayerApi', () => {
  const link = (left: string, right: string) => {
    tap(left)
    tap(right)
  }

  async function open() {
    const { api, sessionId, game } = await startSession('MOCK01')
    const Matching = getPlayableRenderer('MATCHING')!
    const onSubmit = vi.fn((answer) => api.submitInteraction(sessionId, 'q1', answer))

    render(<Matching question={(game as StudentMatchingGame).questions[0]} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)

    return onSubmit
  }

  it('nối đúng hết rồi bấm «Xong rồi!»: nộp một lần bằng mã mờ, máy chủ chấm đúng', async () => {
    const onSubmit = await open()

    link('a', 'ao')
    link('ă', 'ăn')
    link('â', 'ấm')
    tap('Xong rồi!')

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(true))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].matches).toHaveLength(3)
    expect(onSubmit.mock.calls[0][0].matches.every((m: { leftPairId: string }) => /^l\d$/.test(m.leftPairId))).toBe(true)
  })

  it('nối sai: máy chủ chấm sai và trả đáp án đúng, renderer vẽ các cặp còn thiếu bằng nét đứt', async () => {
    await open()

    link('a', 'ăn')
    link('ă', 'ao')
    link('â', 'ấm')
    tap('Xong rồi!')

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(false))
    expect(dashedLines()).toHaveLength(2)
  })
})

describe('MatchingPlayable, chạm là chấm (khung Bé)', () => {
  const link = (left: string, right: string) => {
    tap(left)
    tap(right)
  }

  it('khung Bé: tự nộp ngay khi nối xong cặp cuối, không cần bấm «Xong rồi!»', async () => {
    const { api, sessionId, game } = await startSession('MOCK01')
    const Matching = getPlayableRenderer('MATCHING')!
    const onSubmit = vi.fn((answer) => api.submitInteraction(sessionId, 'q1', answer))
    render(<Matching question={(game as StudentMatchingGame).questions[0]} profile={PROFILES.be} onSubmit={onSubmit} />)

    link('a', 'ao')
    link('ă', 'ăn')
    expect(onSubmit).not.toHaveBeenCalled()
    link('â', 'ấm')

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(true))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('khung Học sinh: nối xong vẫn chờ bấm «Xong rồi!»', async () => {
    const { api, sessionId, game } = await startSession('MOCK01')
    const Matching = getPlayableRenderer('MATCHING')!
    const onSubmit = vi.fn((answer) => api.submitInteraction(sessionId, 'q1', answer))
    render(<Matching question={(game as StudentMatchingGame).questions[0]} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)

    link('a', 'ao')
    link('ă', 'ăn')
    link('â', 'ấm')
    expect(onSubmit).not.toHaveBeenCalled()

    tap('Xong rồi!')
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })

  it('nộp lỗi thì không tự nộp lại thành vòng lặp; gỡ một cặp rồi nối lại mới tự nộp lần nữa', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('mất mạng'))
    const { game } = await startSession('MOCK01')
    const Matching = getPlayableRenderer('MATCHING')!
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<Matching question={(game as StudentMatchingGame).questions[0]} profile={PROFILES.be} onSubmit={onSubmit} />)

    link('a', 'ao')
    link('ă', 'ăn')
    link('â', 'ấm')
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(onSubmit).toHaveBeenCalledTimes(1)

    link('â', 'ấm') // gỡ cặp cuối
    link('â', 'ấm') // nối lại
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
  })
})

describe('DragDropPlayable với MockPlayerApi', () => {
  it('xếp đúng các con vật vào vùng rồi bấm «Xong rồi!»: nộp placements, máy chủ chấm đúng', async () => {
    const { api, sessionId, game } = await startSession('MOCK02')
    const DragDrop = getPlayableRenderer('DRAG_DROP')!
    const question = (game as StudentDragDropGame).questions[0]
    const onSubmit = vi.fn((answer) => api.submitInteraction(sessionId, question.id, answer))

    render(<DragDrop question={question} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)

    // Con cá -> Dưới nước
    tap('Con cá')
    tap('Dưới nước')

    // Con mèo -> Trên cạn
    tap('Con mèo')
    tap('Trên cạn')

    // Con cua -> Dưới nước
    tap('Con cua')
    tap('Dưới nước')

    // Con gà -> Trên cạn
    tap('Con gà')
    tap('Trên cạn')

    tap('Xong rồi!')

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(true))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].placements).toHaveLength(4)
  })

  it('xếp sai: máy chủ chấm sai và phản hồi sai', async () => {
    const { api, sessionId, game } = await startSession('MOCK02')
    const DragDrop = getPlayableRenderer('DRAG_DROP')!
    const question = (game as StudentDragDropGame).questions[0]
    const onSubmit = vi.fn((answer) => api.submitInteraction(sessionId, question.id, answer))

    render(<DragDrop question={question} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)

    // Đặt tất cả vào Trên cạn (sai cho Con cá và Con cua)
    tap('Con cá')
    tap('Trên cạn')
    tap('Con mèo')
    tap('Trên cạn')
    tap('Con cua')
    tap('Trên cạn')
    tap('Con gà')
    tap('Trên cạn')

    tap('Xong rồi!')

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(false))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('WordScramblePlayable với MockPlayerApi', () => {
  /** Chạm chữ rồi chạm ô đích; mỗi ô có đúng một Line gạch chân nên dùng Line để trỏ tới ô. */
  const placeLetter = (letter: string, slotIndex: number) => {
    tap(letter)
    fireEvent.click(screen.getAllByTestId('line')[slotIndex])
  }

  it('ghép đúng từ rồi bấm «Xong rồi!»: nộp word, máy chủ chấm đúng', async () => {
    const { api, sessionId, game } = await startSession('MOCK07')
    const WordScramble = getPlayableRenderer('WORD_SCRAMBLE')!
    const question = (game as StudentWordScrambleGame).questions[0]
    const onSubmit = vi.fn((answer) => api.submitInteraction(sessionId, question.id, answer))

    render(<WordScramble question={question} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)

    // Khay có 'ẹ' và 'm'. Từ đúng là 'mẹ'.
    placeLetter('ẹ', 1)
    placeLetter('m', 0)

    tap('Xong rồi!')

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(true))
    expect(onSubmit).toHaveBeenCalledWith({ word: 'mẹ' })
  })

  it('ghép sai từ: máy chủ chấm sai và phản hồi sai', async () => {
    const { api, sessionId, game } = await startSession('MOCK07')
    const WordScramble = getPlayableRenderer('WORD_SCRAMBLE')!
    const question = (game as StudentWordScrambleGame).questions[0]
    const onSubmit = vi.fn((answer) => api.submitInteraction(sessionId, question.id, answer))

    render(<WordScramble question={question} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)

    // Ghép ngược: 'ẹm'
    placeLetter('ẹ', 0)
    placeLetter('m', 1)

    tap('Xong rồi!')

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(false))
    expect(onSubmit).toHaveBeenCalledWith({ word: 'ẹm' })
  })
})

describe('OrderingPlayable với MockPlayerApi', () => {
  it('bấm «Xong rồi!»: nộp order, máy chủ chấm kết quả', async () => {
    const { api, sessionId, game } = await startSession('MOCK04')
    const Ordering = getPlayableRenderer('ORDERING')!
    const question = (game as Extract<StudentGame, { gameType: 'ORDERING' }>).questions[0]
    const onSubmit = vi.fn((answer) => api.submitInteraction(sessionId, question.id, answer))

    render(<Ordering question={question} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: /Xong rồi!/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toHaveProperty('order')
  })
})

describe('AudioVisualMatchPlayable với MockPlayerApi', () => {
  it('chọn hình ảnh: nộp selectedOptionId, máy chủ chấm kết quả', async () => {
    const { api, sessionId, game } = await startSession('MOCK03')
    const AudioVisual = getPlayableRenderer('AUDIO_VISUAL_MATCH')!
    const question = (game as Extract<StudentGame, { gameType: 'AUDIO_VISUAL_MATCH' }>).questions[0]
    const onSubmit = vi.fn((answer) => api.submitInteraction(sessionId, question.id, answer))

    render(<AudioVisual question={question} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)

    const buttons = screen.getAllByRole('button').filter((b) => b.getAttribute('data-option-id'))
    expect(buttons.length).toBeGreaterThan(0)
    fireEvent.click(buttons[0])

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toHaveProperty('selectedOptionId')
  })
})

describe('SpotTheTargetPlayable với MockPlayerApi', () => {
  it('chạm vào vùng tranh: nộp tọa độ x, y, máy chủ chấm kết quả', async () => {
    const { api, sessionId, game } = await startSession('MOCK06')
    const SpotTarget = getPlayableRenderer('SPOT_THE_TARGET')!
    const question = (game as Extract<StudentGame, { gameType: 'SPOT_THE_TARGET' }>).questions[0]
    const onSubmit = vi.fn((answer) => api.submitInteraction(sessionId, question.id, answer))

    render(<SpotTarget question={question} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)

    const board = screen.getByRole('button', { name: /Bức tranh tìm kiếm/ })
    fireEvent.click(board, { clientX: 30, clientY: 55 })

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toHaveProperty('x')
    expect(onSubmit.mock.calls[0][0]).toHaveProperty('y')
  })
})
