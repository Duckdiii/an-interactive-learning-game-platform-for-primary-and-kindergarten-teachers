import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RoomHostPage from './RoomHostPage'

const mocks = vi.hoisted(() => ({ open: vi.fn(), available: vi.fn(), useGame: vi.fn() }))

vi.mock('../../hooks/useGame', () => ({ useGame: mocks.useGame }))
vi.mock('../room/getRoomApi', () => ({ getRoomApi: async () => ({ open: mocks.open }), isRoomAvailable: mocks.available }))
vi.mock('../renderers', () => ({ getPlayableRenderer: (type: string) => (type === 'QUIZ' ? () => null : undefined) }))
vi.mock('../room/RoomTeacherScreen', () => ({ default: ({ room }: { room: { pin: string; joinUrl: string } }) => <p>PIN {room.pin} tại {room.joinUrl}</p> }))

const GAME = { gameId: 'g1', gameType: 'QUIZ', metadata: { title: 'Đếm', subject: 'MATH', gradeLevel: 'GRADE_1', topic: 'Đếm' }, questions: [{}] }

const open = () =>
  render(
    <MemoryRouter initialEntries={['/rooms/host/g1']}>
      <Routes>
        <Route path="/rooms/host/:gameId" element={<RoomHostPage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  mocks.open.mockReset().mockResolvedValue({ pin: '482913', teacher: {}, close: vi.fn() })
  mocks.available.mockReset().mockReturnValue(true)
  mocks.useGame.mockReset().mockReturnValue({ isPending: false, data: GAME })
})

describe('RoomHostPage', () => {
  it('mở phòng, hiện PIN tách đôi và đường vào có PIN', async () => {
    open()

    expect(await screen.findByText(/PIN 482 913 tại .*\/join\/482913/)).toBeInTheDocument()
    expect(screen.getByText(/tab khác/)).toBeInTheDocument()
  })

  it('rời trang thì đóng phòng', async () => {
    const close = vi.fn()

    mocks.open.mockResolvedValue({ pin: '482913', teacher: {}, close })

    const { unmount } = open()

    await screen.findByText(/PIN 482 913/)
    unmount()

    expect(close).toHaveBeenCalledTimes(1)
  })

  it('rời trang trước khi phòng mở xong: vẫn đóng phòng vừa mở', async () => {
    const close = vi.fn()
    let finishOpen: (room: unknown) => void = () => undefined

    mocks.open.mockImplementation(() => new Promise((resolve) => (finishOpen = resolve)))

    const { unmount } = open()

    await waitFor(() => expect(mocks.open).toHaveBeenCalled())
    unmount()
    finishOpen({ pin: '482913', teacher: {}, close })

    await waitFor(() => expect(close).toHaveBeenCalledTimes(1))
  })

  it('không mở được phòng: báo lỗi, không treo ở màn tải', async () => {
    mocks.open.mockRejectedValue(new Error('hỏng'))
    open()

    expect(await screen.findByRole('heading', { name: 'Chưa mở được phòng' })).toBeInTheDocument()
  })

  it('bản build thật: không gọi mở phòng', () => {
    mocks.available.mockReturnValue(false)
    open()

    expect(screen.getByRole('heading', { name: 'Phòng thi đấu chưa mở được' })).toBeInTheDocument()
    expect(mocks.open).not.toHaveBeenCalled()
  })

  it('loại game chưa có renderer: không mở phòng', () => {
    mocks.useGame.mockReturnValue({ isPending: false, data: { ...GAME, gameType: 'DRAG_DROP' } })
    open()

    expect(screen.getByRole('heading', { name: /Kiểu trò chơi này/ })).toBeInTheDocument()
    expect(mocks.open).not.toHaveBeenCalled()
  })

  it('không tải được game: báo lỗi', () => {
    mocks.useGame.mockReturnValue({ isPending: false, data: undefined })
    open()

    expect(mocks.open).not.toHaveBeenCalled()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/workspace')
  })
})
