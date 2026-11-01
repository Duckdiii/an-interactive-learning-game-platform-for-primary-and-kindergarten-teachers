import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockGameContents } from '../../services/mock/gameFixtures'
import type { GameResponse } from '../../types/game-response.types'
import { resolveUiProfile } from '../profile/resolveUiProfile'
import { UiProfileProvider } from '../profile/UiProfileContext'
import { resolveTheme } from '../theme/resolveTheme'
import { ThemeProvider } from '../theme/ThemeContext'
import PresentPlay from './PresentPlay'

// Canvas không có trong jsdom: Konva thay bằng DOM thường như ở test của renderer.
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
  Line: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../../games/common/sound', () => ({ playSound: vi.fn() }))
vi.mock('../../games/common/useFeedback', () => ({ useFeedback: () => ({ showFeedback: vi.fn() }) }))
vi.mock('../../games/common/OptionButton', () => ({
  default: ({ option, onClick }: { option: { text: string }; onClick: () => void }) => <button onClick={onClick}>{option.text}</button>,
}))

const replay = vi.fn()

vi.mock('../../games/common/useQuestionAudio', () => ({ useQuestionAudio: () => replay }))

// Đáp án đúng của 3 câu mẫu: '3', '5', '9'. Chọn đáp án khác là sai.
const [quiz, , , unplayable] = buildMockGameContents()
const asGame = (content: unknown) => ({ ...(content as object), gameId: 'g1', status: 'PUBLISHED', updatedAt: '' }) as GameResponse

function renderPlay(game: GameResponse = asGame(quiz), onLeave = vi.fn()) {
  const profile = resolveUiProfile({ gradeLevel: game.metadata.gradeLevel })

  render(
    <UiProfileProvider profile={profile}>
      <ThemeProvider theme={resolveTheme({ themeId: null, gameType: game.gameType, subject: game.metadata.subject })}>
        <PresentPlay game={game} onLeave={onLeave} />
      </ThemeProvider>
    </UiProfileProvider>,
  )

  return { onLeave }
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })

beforeEach(() => replay.mockClear())

describe('PresentPlay', () => {
  it('chuyển câu bằng ← → và bằng nút, chặn ở câu đầu', async () => {
    const user = userEvent.setup()

    renderPlay()
    expect(screen.getAllByText('Câu 1/3').length).toBeGreaterThan(0)
    expect(button(/Câu trước/)).toBeDisabled()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Câu 2/3', { selector: 'h1' })).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('Câu 1/3', { selector: 'h1' })).toBeInTheDocument()
    await user.click(button(/Câu sau/))
    expect(screen.getByText('Câu 2/3', { selector: 'h1' })).toBeInTheDocument()
    await user.click(button(/Câu trước/))
    expect(screen.getByText('Câu 1/3', { selector: 'h1' })).toBeInTheDocument()
  })

  it('R và nút Đọc lại phát lại đề', async () => {
    const user = userEvent.setup()

    renderPlay()
    await user.keyboard('r')
    await user.click(button(/Đọc lại/))
    expect(replay).toHaveBeenCalledTimes(2)
  })

  it('đúng ngay lần đầu: nhân vật vui, khóa Cho thử lại bật; chưa trả lời thì Cho thử lại tắt', async () => {
    const user = userEvent.setup()

    renderPlay()
    expect(button('Cho thử lại')).toHaveAttribute('aria-disabled', 'true')
    expect(button('Cho thử lại')).toHaveAccessibleDescription('Trả lời xong mới cho thử lại được')
    expect(screen.getByText('Bạn nào biết nào?')).toBeInTheDocument()
    await user.click(button('3'))
    expect(await screen.findByText('Giỏi quá!')).toBeInTheDocument()
    expect(button('Cho thử lại')).toHaveAttribute('aria-disabled', 'false')
    expect(button('Gợi ý')).toBeDisabled()
  })

  it('sai rồi Cho thử lại, đúng thì tính là đúng và ghi câu đã thử lại; kết quả cả lớp, không điểm', async () => {
    const user = userEvent.setup()

    renderPlay()
    await user.click(button('2'))
    expect(await screen.findByText(/Gần đúng rồi/)).toBeInTheDocument()
    await user.click(button('Cho thử lại'))
    expect(screen.getByText('Bạn nào biết nào?')).toBeInTheDocument()
    await user.click(button('3'))
    expect(await screen.findByText('Giỏi quá!')).toBeInTheDocument()
    await user.click(button('Kết thúc'))

    expect(screen.getByText('Lớp mình trả lời đúng 1/3 câu')).toBeInTheDocument()
    expect(screen.getByText('Có 1 câu cả lớp thử lại rồi đúng')).toBeInTheDocument()
    expect(screen.queryByText(/d+s*điểm/i)).toBeNull()
  })

  it('quay lại câu đã trả lời: vẫn thấy kết quả, không dựng lại đáp án trống để bấm; Cho thử lại thì chơi lại', async () => {
    const user = userEvent.setup()

    renderPlay()
    await user.click(button('3'))
    await user.keyboard('{ArrowRight}{ArrowLeft}')
    expect(await screen.findByText('Giỏi quá!')).toBeInTheDocument()
    expect(screen.getByText(/Câu này lớp mình trả lời rồi/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '2' })).toBeNull()
    await user.click(button('Cho thử lại'))
    expect(button('2')).toBeInTheDocument()
  })

  it('Cho thử lại khi chưa trả lời: bấm chuột hay Enter/Space đều không làm gì; vừa trả lời xong thì phím số không chấm lần hai', async () => {
    const user = userEvent.setup()

    renderPlay()
    await user.click(button('Cho thử lại'))
    button('Cho thử lại').focus()
    await user.keyboard('{Enter} ')
    expect(screen.getByText('Bạn nào biết nào?')).toBeInTheDocument()
    expect(button('3')).toBeInTheDocument()

    await user.click(button('3'))
    await user.keyboard('2')
    expect(await screen.findByText('Giỏi quá!')).toBeInTheDocument()
  })

  it('nhân vật nói theo lần vừa chơi: đúng rồi thử lại mà sai thì không khen', async () => {
    const user = userEvent.setup()

    renderPlay()
    await user.click(button('3'))
    await user.click(button('Cho thử lại'))
    await user.click(button('2'))
    expect(await screen.findByText(/Gần đúng rồi/)).toBeInTheDocument()
    expect(screen.queryByText('Giỏi quá!')).toBeNull()
  })

  it('Gợi ý: lần 1 nhắc chung không lộ đáp án, lần 2 đọc lại đề', async () => {
    const user = userEvent.setup()

    renderPlay()
    await user.click(button('Gợi ý'))
    expect(screen.getByText('Mình đọc kỹ câu hỏi nhé!')).toBeInTheDocument()
    expect(replay).not.toHaveBeenCalled()
    await user.click(button('Gợi ý'))
    expect(screen.getByText('Mình nghe lại đề nhé!')).toBeInTheDocument()
    expect(replay).toHaveBeenCalledTimes(1)
  })

  it('Tạm dừng chặn ← → R; Esc tiếp tục', async () => {
    const user = userEvent.setup()

    renderPlay()
    await user.click(button('Tạm dừng'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}r')
    expect(replay).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Câu 1/3', { selector: 'h1' })).toBeInTheDocument()
  })

  it('câu cuối đổi nhãn thành Xem kết quả; chơi hết bằng bàn phím tới màn kết quả rồi rời', async () => {
    const user = userEvent.setup()
    const { onLeave } = renderPlay()

    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(button('Xem kết quả')).toBeInTheDocument()
    await user.click(button('9'))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Lớp mình trả lời đúng 1/3 câu')).toBeInTheDocument()
    await user.click(button('Kết thúc buổi chơi'))
    expect(onLeave).toHaveBeenCalled()
  })

  it('Tv-Result: kết quả cả lớp, hàng sao, nhân vật ăn mừng, không điểm từng bé; Xem lại từng câu (Esc về); Chơi lại từ đầu', async () => {
    const user = userEvent.setup()

    renderPlay()
    await user.click(button('2'))
    await user.click(button('Cho thử lại'))
    await user.click(button('3'))
    await user.keyboard('{ArrowRight}{ArrowRight}')
    await user.click(button('9'))
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('heading', { name: 'Cả lớp giỏi quá!' })).toBeInTheDocument()
    expect(screen.getByText('Lớp mình trả lời đúng 2/3 câu')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '2 trên 3 câu đúng' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Nhân vật ăn mừng' })).toBeInTheDocument()
    expect(screen.getByText('Không hiển thị điểm từng bé')).toBeInTheDocument()

    await user.click(button('Xem lại từng câu'))
    expect(screen.getByRole('heading', { name: 'Xem lại từng câu' })).toHaveFocus()
    expect(screen.getByText('Câu 1 · Thử lại rồi đúng')).toBeInTheDocument()
    expect(screen.getByText('Câu 2 · Mình ôn thêm nhé')).toBeInTheDocument()
    expect(screen.getByText('Câu 3 · Đúng ngay')).toBeInTheDocument()
    expect(screen.getByText('Đáp án đúng: 5')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('heading', { name: 'Cả lớp giỏi quá!' })).toBeInTheDocument()

    await user.click(button('Chơi lại'))
    expect(screen.getByText('Câu 1/3', { selector: 'h1' })).toBeInTheDocument()
    expect(screen.getByText('Bạn nào biết nào?')).toBeInTheDocument()
    expect(button('2')).toBeInTheDocument()
  })

  it('kiểu chưa có renderer: báo chưa trình chiếu được, vẫn sang câu sau, không tính vào tổng', async () => {
    const user = userEvent.setup()

    renderPlay(asGame(unplayable))
    expect(screen.getByText('Kiểu này chưa trình chiếu được')).toBeInTheDocument()
    expect(button('Gợi ý')).toBeDisabled()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    await user.click(button('Xem kết quả'))
    expect(screen.queryByText(/trả lời đúng/)).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Cả lớp giỏi quá!' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Xem lại từng câu' })).toBeNull()
  })
})
