import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoomJoinError } from '../room/RoomClient'
import RoomJoinPage from './RoomJoinPage'

const api = vi.hoisted(() => ({ findByPin: vi.fn(), join: vi.fn() }))

vi.mock('../room/getRoomApi', () => ({ getRoomApi: async () => api }))
vi.mock('../room/RoomStudentScreen', () => ({
  default: ({ nickname }: { nickname: string }) => <p>đã vào phòng: {nickname}</p>,
  RoomJoinErrorScreen: ({ code }: { code: string }) => <p>lỗi {code}</p>,
}))

const ROOM = { info: { gameTitle: 'Đếm', gameType: 'QUIZ', questionCount: 3, metadata: { subject: 'MATH', gradeLevel: 'GRADE_1', topic: 'Đếm' }, uiOverride: 'AUTO', themeId: null }, game: {} }

const open = () =>
  render(
    <MemoryRouter initialEntries={['/join/482913']}>
      <Routes>
        <Route path="/join/:pin" element={<RoomJoinPage />} />
      </Routes>
    </MemoryRouter>,
  )

async function submitNickname() {
  const user = userEvent.setup()

  await user.type(await screen.findByLabelText('Biệt danh'), 'Ong Vàng')
  await user.keyboard('{Enter}')

  return user
}

beforeEach(() => {
  api.findByPin.mockReset().mockResolvedValue(ROOM)
  api.join.mockReset()
})

describe('RoomJoinPage', () => {
  it('đặt biệt danh rồi vào phòng theo PIN trên đường dẫn', async () => {
    api.join.mockResolvedValue({ client: {}, leave: vi.fn() })
    open()
    await submitNickname()

    expect(await screen.findByText('đã vào phòng: Ong Vàng')).toBeInTheDocument()
    expect(api.findByPin).toHaveBeenCalledWith('482913')
    expect(api.join).toHaveBeenCalledWith('482913', 'Ong Vàng')
  })

  it('không có phòng: báo phòng đã đóng, không treo ở màn tải', async () => {
    api.findByPin.mockResolvedValue(null)
    open()

    expect(await screen.findByText('lỗi SESSION_CLOSED')).toBeInTheDocument()
  })

  it('tra phòng bị lỗi: cũng báo như không có phòng', async () => {
    api.findByPin.mockRejectedValue(new Error('hỏng'))
    open()

    expect(await screen.findByText('lỗi SESSION_CLOSED')).toBeInTheDocument()
  })

  it('phòng đủ người: hiện đúng lỗi', async () => {
    api.join.mockRejectedValue(new RoomJoinError('SESSION_FULL'))
    open()
    await submitNickname()

    expect(await screen.findByText('lỗi SESSION_FULL')).toBeInTheDocument()
  })

  it('bấm đúp chỉ vào phòng một lần', async () => {
    api.join.mockImplementation(() => new Promise(() => undefined))
    open()
    const user = await submitNickname()

    await user.keyboard('{Enter}')

    expect(api.join).toHaveBeenCalledTimes(1)
  })

  it('rời trang lúc đang chờ vào phòng: rời phòng ngay, không để lại bạn "ma"', async () => {
    const leave = vi.fn()
    let finishJoin: (room: unknown) => void = () => undefined

    api.join.mockImplementation(() => new Promise((resolve) => (finishJoin = resolve)))

    const { unmount } = open()

    await submitNickname()
    await waitFor(() => expect(api.join).toHaveBeenCalled())
    unmount()
    finishJoin({ client: {}, leave })

    await waitFor(() => expect(leave).toHaveBeenCalledTimes(1))
  })

  it('rời trang sau khi đã vào phòng: rời phòng', async () => {
    const leave = vi.fn()

    api.join.mockResolvedValue({ client: {}, leave })

    const { unmount } = open()

    await submitNickname()
    await screen.findByText('đã vào phòng: Ong Vàng')
    unmount()

    expect(leave).toHaveBeenCalledTimes(1)
  })
})
