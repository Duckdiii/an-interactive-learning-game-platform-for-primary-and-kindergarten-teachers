import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatchingQuestion } from '../../types/game-dsl.types'
import MatchingRenderer from './MatchingRenderer'
import {
  mockMatchingQuestion,
  mockMatchingStudentCorrect,
  mockMatchingStudentQuestion,
} from './MatchingRenderer.fixtures'
import type { MatchingAnswerResult, PairLink } from './matchingTypes'

/**
 * react-konva vẽ lên <canvas> thật, còn jsdom không hỗ trợ đầy đủ Canvas 2D API — nên mock react-konva và
 * use-image thành DOM thường để test được hành vi (nối, gỡ, nộp, khoá), không assert màu sắc/toạ độ vẽ (đã
 * kiểm bằng mắt qua Browser pane). `Line` được mock thành thẻ có data-attribute để đếm đường nối.
 */
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
  Line: ({ stroke, dash }: { stroke?: string; dash?: number[] }) => (
    <i data-testid="line" data-dashed={dash ? 'yes' : 'no'} data-stroke={stroke} />
  ),
}))

vi.mock('use-image', () => ({
  default: () => [undefined],
}))

vi.mock('howler', () => ({
  Howl: class {
    play = vi.fn()
    stop = vi.fn()
    unload = vi.fn()
  },
}))

const showFeedbackMock = vi.fn()
vi.mock('../common/useFeedback', () => ({
  useFeedback: () => ({ showFeedback: showFeedbackMock }),
}))

const playSoundMock = vi.fn()
vi.mock('../common/sound', () => ({
  playSound: (...args: unknown[]) => playSoundMock(...args),
}))

// jsdom không có Canvas nên Konva không đo được chữ; mock về null để layout dùng phép ước lượng.
vi.mock('../common/measureText', () => ({
  measureWrappedTextHeight: () => null,
}))

const PAIR_SOUND = '/sounds/pair-matched.wav'
const CONFIRM = 'Xong rồi!'

/** Màu «đỏ gắt» (quy ước UX: trả lời sai không dùng đỏ): kênh đỏ cao, xanh lá và xanh dương thấp. */
function isReddish(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
  return r >= 180 && g <= 100 && b <= 100
}

const tap = (text: string) => fireEvent.click(screen.getByText(text))
const link = (left: string, right: string) => {
  tap(left)
  tap(right)
}
const solidLines = () => screen.queryAllByTestId('line').filter((el) => el.getAttribute('data-dashed') === 'no')
const dashedLines = () => screen.queryAllByTestId('line').filter((el) => el.getAttribute('data-dashed') === 'yes')

/** Nối đúng cả ba cặp của dạng giáo viên. */
const linkAllCorrectly = () => {
  link('apple', 'táo')
  link('dog', 'chó')
  link('cat', 'mèo')
}

/** Nối sai hai cặp đầu (apple-chó, dog-táo), cặp cuối đúng. */
const linkWithTwoMistakes = () => {
  link('apple', 'chó')
  link('dog', 'táo')
  link('cat', 'mèo')
}

/** Nối cả ba cặp của dạng học sinh theo một cách bất kỳ (client không biết đúng hay sai). */
const linkAllStudent = () => {
  link('apple', 'táo')
  link('dog', 'chó')
  link('cat', 'mèo')
}

describe('MatchingRenderer', () => {
  beforeEach(() => {
    showFeedbackMock.mockClear()
    playSoundMock.mockClear()
  })

  describe('hiển thị', () => {
    it('hiện câu dẫn, đủ chữ hai cột, nút nghe lại và nút Xong rồi!', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)

      expect(screen.getByText('Nối từ với nghĩa')).toBeInTheDocument()
      for (const text of ['apple', 'dog', 'cat', 'táo', 'chó', 'mèo']) {
        expect(screen.getByText(text)).toBeInTheDocument()
      }
      expect(screen.getByText('🔊 Nghe lại')).toBeInTheDocument()
      expect(screen.getByText(CONFIRM)).toBeInTheDocument()
    })

    it('không có audioText/audioUrl thì không hiện câu dẫn và nút nghe lại', () => {
      const bare: MatchingQuestion = { ...mockMatchingQuestion, audioText: undefined, audioUrl: undefined }
      render(<MatchingRenderer mode="preview" question={bare} />)

      expect(screen.queryByText('Nối từ với nghĩa')).not.toBeInTheDocument()
      expect(screen.queryByText('🔊 Nghe lại')).not.toBeInTheDocument()
    })

    it('ô chỉ có visualPrompt (ảnh chưa lấy về) vẫn hiện chữ tạm, không để ô trống', () => {
      const draft: MatchingQuestion = {
        ...mockMatchingQuestion,
        pairs: mockMatchingQuestion.pairs.map((pair) => ({ ...pair, left: { visualPrompt: `hình ${pair.pairId}` } })),
      }
      render(<MatchingRenderer mode="preview" question={draft} />)

      expect(screen.getByText('hình p1')).toBeInTheDocument()
    })
  })

  describe('preview — nối, gỡ, nộp', () => {
    it('chạm trái rồi chạm phải thì nối cặp, vẽ một đường và phát âm nối được', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)

      link('apple', 'táo')

      expect(solidLines()).toHaveLength(1)
      expect(playSoundMock).toHaveBeenCalledTimes(1)
      expect(playSoundMock).toHaveBeenCalledWith(PAIR_SOUND)
    })

    it('chạm ô phải khi chưa chọn ô trái thì không nối, không phát âm', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)

      tap('táo')

      expect(solidLines()).toHaveLength(0)
      expect(playSoundMock).not.toHaveBeenCalled()
    })

    it('chạm lại ô trái đã nối thì gỡ cặp', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)
      link('apple', 'táo')

      tap('apple')

      expect(solidLines()).toHaveLength(0)
    })

    it('nối ô trái khác vào ô phải đã nối thì chuyển cặp, vẫn chỉ một đường', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)
      link('apple', 'táo')

      link('dog', 'táo')

      expect(solidLines()).toHaveLength(1)
    })

    it('chưa nối đủ cặp thì bấm Xong rồi! không nộp, không feedback', () => {
      const onAnswered = vi.fn()
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} onAnswered={onAnswered} />)
      link('apple', 'táo')
      link('dog', 'chó')

      tap(CONFIRM)

      expect(onAnswered).not.toHaveBeenCalled()
      expect(showFeedbackMock).not.toHaveBeenCalled()
    })

    it('nối đúng đủ cặp rồi bấm Xong: nộp đúng các cặp, feedback đúng, không đường nét đứt, ẩn nút Xong', () => {
      const onAnswered = vi.fn()
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} onAnswered={onAnswered} />)
      linkAllCorrectly()

      tap(CONFIRM)

      expect(onAnswered).toHaveBeenCalledTimes(1)
      expect(onAnswered).toHaveBeenCalledWith([
        { leftPairId: 'p1', rightPairId: 'p1' },
        { leftPairId: 'p2', rightPairId: 'p2' },
        { leftPairId: 'p3', rightPairId: 'p3' },
      ] satisfies PairLink[])
      expect(showFeedbackMock).toHaveBeenCalledWith(true)
      expect(playSoundMock).toHaveBeenCalledTimes(3)
      expect(solidLines()).toHaveLength(3)
      expect(dashedLines()).toHaveLength(0)
      expect(screen.queryByText(CONFIRM)).not.toBeInTheDocument()
    })

    it('nối sai: feedback sai, và hiện thêm các cặp đúng bằng nét đứt để trẻ học', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)
      linkWithTwoMistakes()

      tap(CONFIRM)

      expect(showFeedbackMock).toHaveBeenCalledWith(false)
      expect(solidLines()).toHaveLength(3)
      expect(dashedLines()).toHaveLength(2) // hai cặp đúng mà trẻ chưa nối đúng
    })

    it('đúng thì đường nối xanh, sai thì vàng; không bao giờ có màu đỏ', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)
      linkWithTwoMistakes()
      tap(CONFIRM)

      const strokes = screen.getAllByTestId('line').map((el) => el.getAttribute('data-stroke') ?? '')

      expect(strokes).toContain('#43A047')
      expect(strokes).toContain('#F59E0B')
      expect(strokes.filter(isReddish)).toEqual([])
    })

    it('nộp xong thì khoá: chạm tiếp không đổi đường nối và không phát thêm âm', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)
      linkAllCorrectly()
      tap(CONFIRM)
      playSoundMock.mockClear()

      tap('apple')
      tap('táo')

      expect(solidLines()).toHaveLength(3)
      expect(playSoundMock).not.toHaveBeenCalled()
    })

    it('onAnswered trả Promise bị reject thì chỉ ghi log, feedback vẫn hiện', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const onAnswered = vi.fn().mockRejectedValue(new Error('cha lỗi'))
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} onAnswered={onAnswered} />)
      linkAllCorrectly()

      tap(CONFIRM)

      await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled())
      expect(showFeedbackMock).toHaveBeenCalledWith(true)
      consoleErrorSpy.mockRestore()
    })

    it('disabled thì không nhận chạm', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} disabled />)

      link('apple', 'táo')

      expect(solidLines()).toHaveLength(0)
      expect(playSoundMock).not.toHaveBeenCalled()
    })
  })

  describe('play — Backend chấm, renderer không tự chấm', () => {
    it('nộp đúng các cặp (id mờ) lên cha, và hiện feedback theo kết quả cha trả về, không tự so', async () => {
      // Nối theo cách mà đáp án thật sẽ là sai, nhưng cha báo đúng: renderer phải tin cha.
      const onAnswered = vi.fn().mockResolvedValue({ isCorrect: true } satisfies MatchingAnswerResult)
      render(<MatchingRenderer mode="play" question={mockMatchingStudentQuestion} onAnswered={onAnswered} />)
      linkAllStudent()

      tap(CONFIRM)

      await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(true))
      expect(onAnswered).toHaveBeenCalledWith([
        { leftPairId: 'l1', rightPairId: 'r2' },
        { leftPairId: 'l2', rightPairId: 'r3' },
        { leftPairId: 'l3', rightPairId: 'r1' },
      ])
      expect(dashedLines()).toHaveLength(0)
    })

    it('giữ nguyên thứ tự hai cột Backend gửi, không xáo lại', () => {
      render(<MatchingRenderer mode="play" question={mockMatchingStudentQuestion} onAnswered={vi.fn()} />)

      const order = screen.getAllByText(/^(apple|dog|cat|mèo|táo|chó)$/).map((el) => el.textContent)

      expect(order).toEqual(['apple', 'dog', 'cat', 'mèo', 'táo', 'chó'])
    })

    it('sai và cha trả kèm đáp án đúng: feedback sai, hiện các cặp đúng bằng nét đứt', async () => {
      const onAnswered = vi.fn().mockResolvedValue({
        isCorrect: false,
        correctAnswer: { matches: mockMatchingStudentCorrect },
      } satisfies MatchingAnswerResult)
      render(<MatchingRenderer mode="play" question={mockMatchingStudentQuestion} onAnswered={onAnswered} />)
      // apple-mèo, dog-chó (đúng), cat-táo: hai cặp sai
      link('apple', 'mèo')
      link('dog', 'chó')
      link('cat', 'táo')

      tap(CONFIRM)

      await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(false))
      expect(solidLines()).toHaveLength(3)
      expect(dashedLines()).toHaveLength(2)
    })

    it('sai mà cha không trả đáp án: chỉ báo sai, không đoán và không hiện nét đứt', async () => {
      const onAnswered = vi.fn().mockResolvedValue({ isCorrect: false } satisfies MatchingAnswerResult)
      render(<MatchingRenderer mode="play" question={mockMatchingStudentQuestion} onAnswered={onAnswered} />)
      linkAllStudent()

      tap(CONFIRM)

      await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(false))
      expect(dashedLines()).toHaveLength(0)
    })

    it('đang chờ chấm: nhãn nút đổi, khoá chạm, không nộp lần hai', async () => {
      let resolveAnswer: (value: MatchingAnswerResult) => void = () => {}
      const onAnswered = vi.fn().mockReturnValue(
        new Promise<MatchingAnswerResult>((resolve) => {
          resolveAnswer = resolve
        }),
      )
      render(<MatchingRenderer mode="play" question={mockMatchingStudentQuestion} onAnswered={onAnswered} />)
      linkAllStudent()

      tap(CONFIRM)

      expect(screen.getByText('Đang chấm…')).toBeInTheDocument()
      tap('apple') // đang chấm: chạm bị bỏ qua
      expect(solidLines()).toHaveLength(3)
      fireEvent.click(screen.getByText('Đang chấm…'))
      expect(onAnswered).toHaveBeenCalledTimes(1)

      resolveAnswer({ isCorrect: true })
      await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(true))
    })

    it('cha báo lỗi (reject) thì mở khoá, giữ các cặp đã nối để trẻ gửi lại được', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const onAnswered = vi
        .fn()
        .mockRejectedValueOnce(new Error('network lỗi'))
        .mockResolvedValueOnce({ isCorrect: true } satisfies MatchingAnswerResult)
      render(<MatchingRenderer mode="play" question={mockMatchingStudentQuestion} onAnswered={onAnswered} />)
      linkAllStudent()

      tap(CONFIRM)
      await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled())
      await waitFor(() => expect(screen.getByText(CONFIRM)).toBeInTheDocument())

      expect(solidLines()).toHaveLength(3)
      tap(CONFIRM)
      await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(true))
      expect(onAnswered).toHaveBeenCalledTimes(2)
      consoleErrorSpy.mockRestore()
    })

    it('đổi sang câu khác khi kết quả cũ còn treo thì không áp kết quả cũ vào câu mới', async () => {
      let resolveFirst: (value: MatchingAnswerResult) => void = () => {}
      const onAnswered = vi.fn().mockReturnValueOnce(
        new Promise<MatchingAnswerResult>((resolve) => {
          resolveFirst = resolve
        }),
      )
      const { rerender } = render(
        <MatchingRenderer mode="play" question={mockMatchingStudentQuestion} onAnswered={onAnswered} />,
      )
      linkAllStudent()
      tap(CONFIRM)

      rerender(
        <MatchingRenderer
          mode="play"
          question={{ ...mockMatchingStudentQuestion, id: 'q2' }}
          onAnswered={onAnswered}
        />,
      )
      resolveFirst({ isCorrect: true })
      await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1))

      expect(showFeedbackMock).not.toHaveBeenCalled()
      expect(solidLines()).toHaveLength(0) // câu mới bắt đầu sạch
    })
  })

  describe('review — xem lại câu đã làm', () => {
    const correctMatches: PairLink[] = [
      { leftPairId: 'p1', rightPairId: 'p1' },
      { leftPairId: 'p2', rightPairId: 'p2' },
      { leftPairId: 'p3', rightPairId: 'p3' },
    ]

    it('hiện các cặp đã nối, khoá sẵn, không có nút Xong, bấm không phản hồi', () => {
      render(<MatchingRenderer mode="review" question={mockMatchingQuestion} matches={correctMatches} />)

      expect(solidLines()).toHaveLength(3)
      expect(dashedLines()).toHaveLength(0)
      expect(screen.queryByText(CONFIRM)).not.toBeInTheDocument()

      tap('apple')
      tap('táo')
      expect(solidLines()).toHaveLength(3)
      expect(showFeedbackMock).not.toHaveBeenCalled()
      expect(playSoundMock).not.toHaveBeenCalled()
    })

    it('trẻ nối sai thì hiện thêm đáp án đúng bằng nét đứt', () => {
      const wrong: PairLink[] = [
        { leftPairId: 'p1', rightPairId: 'p2' },
        { leftPairId: 'p2', rightPairId: 'p1' },
        { leftPairId: 'p3', rightPairId: 'p3' },
      ]
      render(<MatchingRenderer mode="review" question={mockMatchingQuestion} matches={wrong} />)

      expect(solidLines()).toHaveLength(3)
      expect(dashedLines()).toHaveLength(2)
    })

    it('câu hết giờ/bỏ qua (không nối gì) thì hiện toàn bộ đáp án đúng để học', () => {
      render(<MatchingRenderer mode="review" question={mockMatchingQuestion} matches={[]} />)

      expect(solidLines()).toHaveLength(0)
      expect(dashedLines()).toHaveLength(3)
    })

    it('đổi từ preview sang review thì dựng lại sạch, không giữ cặp đang nối dở', () => {
      const { rerender } = render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)
      link('apple', 'táo')

      rerender(<MatchingRenderer mode="review" question={mockMatchingQuestion} matches={[]} />)

      expect(solidLines()).toHaveLength(0)
      expect(dashedLines()).toHaveLength(3)
    })
  })
})
