import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockGame, resetMockGames } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
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

// Form sửa câu SPOT_THE_TARGET (mock-game-7).
// Câu 1: visualPrompt: farm yard, targetDescription: chú gà trống, hitRegion: {x: 0.3, y: 0.55, radius: 0.12}
// Câu 2: targetDescription: con bò
// Câu 3: targetDescription: ngôi nhà gỗ màu đỏ
const SPOT_ID = 'mock-game-7'

const targetDescBox = () => screen.getByLabelText(/Mô tả đối tượng cần tìm/)
const canvasBox = () => screen.getByTestId('spot-target-canvas-box')
const hitCircle = () => screen.queryByTestId('spot-target-hit-circle')
const radiusSlider = () => screen.queryByLabelText(/Độ rộng vùng chạm/)
const clearHitButton = () => screen.queryByRole('button', { name: /Xóa vùng đã chọn/ })
const listItems = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')

const type = (box: HTMLElement, value: string) => {
  fireEvent.change(box, { target: { value } })
  fireEvent.blur(box)
}

async function openLoaded() {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${SPOT_ID}`)
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

describe('form sửa câu SPOT_THE_TARGET (WorkspaceEditor)', () => {
  it('không còn thông báo "chưa có form"; hiện đúng mô tả mục tiêu và vùng chạm câu 1 kèm trường chung', async () => {
    await openLoaded()

    expect(screen.queryByText('Loại game này chưa có form sửa chi tiết')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sửa câu 1' })).toBeInTheDocument()

    expect(targetDescBox()).toHaveValue('chú gà trống')
    expect(canvasBox()).toBeInTheDocument()
    expect(hitCircle()).toBeInTheDocument()
    expect(screen.getByText(/Tọa độ tâm: X=30%, Y=55% · Bán kính: 12%/)).toBeInTheDocument()

    expect(screen.getByRole('textbox', { name: /^Mô tả hình ảnh/ })).toHaveValue('a farm yard with a rooster, a cow and a pig')
    expect(timingBox(/Thời gian trả lời/)).toHaveValue('30')
    expect(timingBox(/^Điểm/)).toHaveValue('10')
  })

  it('quay lại câu 3 đã xóa hitRegion thì hiện thông báo nhắc chọn', async () => {
    await openLoaded()
    fireEvent.click(listItems()[2])
    fireEvent.click(screen.getByRole('button', { name: /Xóa vùng đã chọn/ }))
    fireEvent.click(listItems()[0])
    expect(hitCircle()).toBeInTheDocument()
    fireEvent.click(listItems()[2])

    expect(screen.getByRole('heading', { name: 'Sửa câu 3' })).toBeInTheDocument()
    expect(targetDescBox()).toHaveValue('ngôi nhà gỗ màu đỏ')
    expect(hitCircle()).not.toBeInTheDocument()
    expect(screen.getByText('Chưa chọn vùng mục tiêu trên ảnh (cần chọn trước khi xuất bản).')).toBeInTheDocument()
  })

  it('sửa mô tả đối tượng cần tìm: kích hoạt tự lưu', async () => {
    await openLoaded()
    type(targetDescBox(), 'chú vịt vàng')

    await waitFor(() => {
      const saved = getMockGame(SPOT_ID)
      expect(saved.questions[0]).toMatchObject({ targetDescription: 'chú vịt vàng' })
    }, { timeout: 10_000 })
  })

  it('nhấp vào ảnh để đặt tâm mục tiêu mới và điều chỉnh bán kính', async () => {
    await openLoaded()

    canvasBox().getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 500,
      height: 300,
      right: 500,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

    // Click at (250, 150) -> x=0.5, y=0.5
    fireEvent.click(canvasBox(), { clientX: 250, clientY: 150 })

    expect(screen.getByText(/Tọa độ tâm: X=50%, Y=50%/)).toBeInTheDocument()

    // Slider
    const slider = radiusSlider()
    expect(slider).toBeInTheDocument()
    fireEvent.change(slider!, { target: { value: '0.2' } })
    expect(screen.getByText(/Bán kính: 20%/)).toBeInTheDocument()
  })

  it('bấm Xóa vùng đã chọn sẽ gỡ bỏ hitRegion', async () => {
    await openLoaded()
    expect(hitCircle()).toBeInTheDocument()

    const clearBtn = clearHitButton()
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn!)

    expect(hitCircle()).not.toBeInTheDocument()
    expect(screen.getByText('Chưa chọn vùng mục tiêu trên ảnh (cần chọn trước khi xuất bản).')).toBeInTheDocument()
  })
})
