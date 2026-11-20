import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockGame, resetMockGames, saveMockGame } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import type { DragDropQuestion } from '../types/game-dsl.types'
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

// Form sửa câu DRAG_DROP (mock-game-3).
// Câu 1: dropZones: [Dưới nước, Trên cạn], items: [Con cá, Con mèo, Con cua, Con gà]
const DRAG_DROP_ID = 'mock-game-3'

const zonesGroup = () => screen.getByRole('group', { name: 'Các vùng chứa / Giỏ phân loại' })
const itemsGroup = () => screen.getByRole('group', { name: 'Các mục phân loại' })

const zoneBox = (zoneNum: number) => within(zonesGroup()).getByLabelText(/^Tên giỏ/, { selector: `#zone-z${zoneNum}-label` })
const itemBox = (itemNum: number) => within(itemsGroup()).getByLabelText(/^Nội dung mục/, { selector: `#item-i${itemNum}-text` })
const itemZoneSelect = (itemNum: number) => within(itemsGroup()).getByLabelText(/^Thuộc giỏ/, { selector: `#item-i${itemNum}-zone` })

const addZoneButton = () => within(zonesGroup()).getByRole('button', { name: /Thêm giỏ/ })
const removeZoneButton = (zoneNum: number) => within(zonesGroup()).getByRole('button', { name: `Xóa giỏ ${zoneNum}` })

const addItemButton = () => within(itemsGroup()).getByRole('button', { name: /Thêm mục/ })
const removeItemButton = (itemNum: number) => within(itemsGroup()).getByRole('button', { name: `Xóa mục ${itemNum}` })

const listItems = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')

const type = (box: HTMLElement, value: string) => {
  fireEvent.change(box, { target: { value } })
  fireEvent.blur(box)
}

function withZonesAndItems(zoneCount: number, itemCount: number) {
  const game = getMockGame(DRAG_DROP_ID)
  const question = game.questions[0] as DragDropQuestion

  question.dropZones = Array.from({ length: zoneCount }, (_, i) => ({
    id: `z${i + 1}`,
    label: `Giỏ ${i + 1}`,
  }))
  question.items = Array.from({ length: itemCount }, (_, i) => ({
    id: `i${i + 1}`,
    text: `Vật ${i + 1}`,
    targetZoneId: `z${(i % zoneCount) + 1}`,
  }))
  saveMockGame(DRAG_DROP_ID, game)
}

async function openLoaded() {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${DRAG_DROP_ID}`)
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

describe('form sửa câu DRAG_DROP (WorkspaceEditor)', () => {
  it('không còn thông báo "chưa có form"; hiện đúng các giỏ và mục phân loại kèm trường chung', async () => {
    await openLoaded()

    expect(screen.queryByText('Loại game này chưa có form sửa chi tiết')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sửa câu 1' })).toBeInTheDocument()

    expect(zoneBox(1)).toHaveValue('Dưới nước')
    expect(zoneBox(2)).toHaveValue('Trên cạn')

    expect(itemBox(1)).toHaveValue('Con cá')
    expect(itemZoneSelect(1)).toHaveValue('z1')
    expect(itemBox(2)).toHaveValue('Con mèo')
    expect(itemZoneSelect(2)).toHaveValue('z2')

    expect(screen.getByRole('textbox', { name: /^Lời đọc/ })).toHaveValue('Kéo mỗi con vật về đúng nơi sống')
    expect(timingBox(/Thời gian trả lời/)).toHaveValue('30')
    expect(timingBox(/^Điểm/)).toHaveValue('10')
  })

  it('chọn câu khác thì form đổi theo (câu 2 có 2 giỏ, 3 mục)', async () => {
    await openLoaded()
    fireEvent.click(listItems()[1])

    expect(screen.getByRole('heading', { name: 'Sửa câu 2' })).toBeInTheDocument()
    expect(zoneBox(1)).toHaveValue('Ở nhà')
    expect(zoneBox(2)).toHaveValue('Trong rừng')
    expect(itemBox(1)).toHaveValue('Con chó')
  })

  it('sửa nhãn giỏ và đổi giỏ đích của mục', async () => {
    await openLoaded()
    type(zoneBox(1), 'Biển cả')
    await waitFor(() => expect(screen.getByText('Sắp tự lưu...')).toBeInTheDocument())

    fireEvent.change(itemZoneSelect(2), { target: { value: 'z1' } })
    expect(itemZoneSelect(2)).toHaveValue('z1')
  })

  it('đủ 4 giỏ thì nút Thêm giỏ bị khóa kèm lời giải thích', async () => {
    withZonesAndItems(3, 4)
    await openLoaded()
    expect(addZoneButton()).toBeEnabled()

    fireEvent.click(addZoneButton())
    expect(addZoneButton()).toBeDisabled()
    expect(screen.getByText('Đã đủ 4 giỏ, không thêm được nữa.')).toBeInTheDocument()
  })

  it('còn 2 giỏ thì nút Xóa giỏ bị khóa kèm lời giải thích', async () => {
    withZonesAndItems(2, 4)
    await openLoaded()

    expect(removeZoneButton(1)).toBeDisabled()
    expect(removeZoneButton(2)).toBeDisabled()
    expect(screen.getByText('Cần giữ ít nhất 2 giỏ.')).toBeInTheDocument()
  })

  it('đủ 8 mục thì nút Thêm mục bị khóa kèm lời giải thích', async () => {
    withZonesAndItems(2, 7)
    await openLoaded()
    expect(addItemButton()).toBeEnabled()

    fireEvent.click(addItemButton())
    expect(addItemButton()).toBeDisabled()
    expect(screen.getByText('Đã đủ 8 mục, không thêm được nữa.')).toBeInTheDocument()
  })

  it('còn 3 mục thì nút Xóa mục bị khóa kèm lời giải thích', async () => {
    withZonesAndItems(2, 3)
    await openLoaded()

    expect(removeItemButton(1)).toBeDisabled()
    expect(removeItemButton(2)).toBeDisabled()
    expect(removeItemButton(3)).toBeDisabled()
    expect(screen.getByText('Cần giữ ít nhất 3 mục.')).toBeInTheDocument()
  })
})
