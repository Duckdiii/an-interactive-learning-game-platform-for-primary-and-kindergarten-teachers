import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockGame, resetMockGames, saveMockGame } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import type { OrderingQuestion } from '../types/game-dsl.types'
import WorkspaceEditor from './WorkspaceEditor'
import { timingBox } from '../test/editorTiming'

// Mock react-konva & other non-DOM libraries for jsdom
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
  Line: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))

// Form sửa câu ORDERING (mock-game-5).
// Câu 1: Xếp số từ bé đến lớn: steps [{s1: 7, pos 3}, {s2: 2, pos 1}, {s3: 5, pos 2}]
const ORDERING_ID = 'mock-game-5'

const stepsGroup = () => screen.getByRole('group', { name: 'Các bước theo thứ tự đúng' })
const stepItems = () => within(stepsGroup()).getAllByRole('listitem')
const stepItem = (index: number) => stepItems()[index]
const stepBox = (index: number) => within(stepItem(index)).getByRole('textbox', { name: 'Nội dung bước' })
const addButton = () => screen.getByRole('button', { name: /Thêm bước/ })
const removeButton = (stepNum: number) => screen.getByRole('button', { name: `Xóa bước ${stepNum}` })
const moveDownButton = (stepNum: number) => screen.getByRole('button', { name: `Di chuyển xuống ${stepNum}` })
const listItems = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')

const type = (box: HTMLElement, value: string) => {
  fireEvent.change(box, { target: { value } })
  fireEvent.blur(box)
}

function withSteps(count: number) {
  const game = getMockGame(ORDERING_ID)
  const question = game.questions[0] as OrderingQuestion

  question.steps = Array.from({ length: count }, (_, index) => ({
    id: `s${index + 1}`,
    text: `Bước ${index + 1}`,
    correctPosition: index + 1,
  }))
  saveMockGame(ORDERING_ID, game)
}

async function openLoaded() {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${ORDERING_ID}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
}

beforeAll(async () => {
  await import('../components/editor/PlayTestPanel')
}, 120_000)

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  loginAsTeacher()
  resetMockGames()
})

afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
  localStorage.clear()
  vi.clearAllMocks()
})

describe('form sửa câu ORDERING (WorkspaceEditor)', () => {
  it('không còn thông báo "chưa có form"; hiện đúng danh sách các bước của câu 1 kèm trường chung', async () => {
    await openLoaded()

    expect(screen.queryByText('Loại game này chưa có form sửa chi tiết')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sửa câu 1' })).toBeInTheDocument()
    expect(stepItems()).toHaveLength(3)
    expect(stepBox(0)).toHaveValue('7')
    expect(stepBox(1)).toHaveValue('2')
    expect(stepBox(2)).toHaveValue('5')
    expect(screen.getByRole('textbox', { name: /^Lời đọc/ })).toHaveValue('Xếp các số từ bé đến lớn')
    expect(timingBox(/Thời gian trả lời/)).toHaveValue('30')
    expect(timingBox(/^Điểm/)).toHaveValue('10')
  })

  it('chọn câu khác thì form đổi theo (câu 2 có 4 bước)', async () => {
    await openLoaded()
    fireEvent.click(listItems()[1])

    expect(screen.getByRole('heading', { name: 'Sửa câu 2' })).toBeInTheDocument()
    expect(stepItems()).toHaveLength(4)
    expect(stepBox(0)).toHaveValue('9')
  })

  it('sửa nội dung bước: cập nhật câu và hiện thông báo tự lưu', async () => {
    await openLoaded()
    type(stepBox(0), '10')

    await waitFor(() => expect(screen.getByText('Sắp tự lưu...')).toBeInTheDocument())
  })

  it('hoán đổi vị trí bước bằng nút di chuyển', async () => {
    await openLoaded()
    expect(stepBox(0)).toHaveValue('7')
    expect(stepBox(1)).toHaveValue('2')

    fireEvent.click(moveDownButton(1))

    expect(stepBox(0)).toHaveValue('2')
    expect(stepBox(1)).toHaveValue('7')
  })

  it('đủ 6 bước thì nút Thêm bị khóa kèm lời giải thích', async () => {
    withSteps(5)
    await openLoaded()
    expect(addButton()).toBeEnabled()

    fireEvent.click(addButton())

    expect(stepItems()).toHaveLength(6)
    expect(addButton()).toBeDisabled()
    expect(screen.getByText('Đã đủ 6 bước, không thêm được nữa.')).toBeInTheDocument()
  })

  it('còn 2 bước thì nút Xóa bị khóa kèm lời giải thích', async () => {
    withSteps(2)
    await openLoaded()

    expect(removeButton(1)).toBeDisabled()
    expect(removeButton(2)).toBeDisabled()
    expect(screen.getByText('Cần giữ ít nhất 2 bước.')).toBeInTheDocument()
  })
})
