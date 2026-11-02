import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockRoom } from './mockRoom'
import RoomPodium from './RoomPodium'
import RoomTeacherScreen from './RoomTeacherScreen'

const ROOM = { title: 'Đếm con vật', subtitle: 'Toán · Lớp 2 · 3 câu', pin: '482 913', joinUrl: 'https://game.test/join' }

const mockRoom = (virtualStudents: number) => createMockRoom({ questionIds: ['q1', 'q2', 'q3'], virtualStudents })

const show = async (room: ReturnType<typeof mockRoom>) => {
  let view!: ReturnType<typeof render>

  await act(async () => {
    view = render(<RoomTeacherScreen client={room.teacher} room={ROOM} />)
  })

  return view
}

const setup = async (virtualStudents: number) => {
  const room = mockRoom(virtualStudents)

  await show(room)

  return room
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('RoomTeacherScreen trong ván', () => {
  const startGame = async (room: ReturnType<typeof mockRoom>) => {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }))
    })

    return room
  }

  const advance = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })

  const click = (name: string) =>
    act(async () => {
      fireEvent.click(screen.getByRole('button', { name }))
    })

  it('bắt đầu vào thẳng câu 1: có đồng hồ và số đã trả lời', async () => {
    vi.useFakeTimers()
    await startGame(await setup(30))

    expect(screen.getByText('Câu 1/3')).toBeInTheDocument()
    expect(screen.getByRole('timer', { name: 'Còn 20 giây' })).toBeInTheDocument()
    expect(screen.getByText('0/30')).toBeInTheDocument()

    await advance(5000)
    expect(screen.getByRole('timer', { name: 'Còn 15 giây' })).toBeInTheDocument()
    expect(screen.getByText(/\/30$/).textContent).not.toBe('0/30')
  })

  it('tạm dừng đứng đồng hồ, tiếp tục đếm từ chỗ dừng', async () => {
    vi.useFakeTimers()
    await startGame(await setup(30))

    await advance(5000)
    await click('Tạm dừng')
    await advance(60_000)
    expect(screen.getByRole('timer', { name: 'Còn 15 giây' })).toBeInTheDocument()
    expect(screen.getByText('Cô đang tạm dừng')).toBeInTheDocument()

    await click('Tiếp tục')
    await advance(3000)
    expect(screen.getByRole('timer', { name: 'Còn 12 giây' })).toBeInTheDocument()
  })

  it('hết câu sang top 5 có tỉ lệ đúng; câu tiếp về đồng hồ đầy, số trả lời về 0', async () => {
    vi.useFakeTimers()
    await startGame(await setup(30))

    await click('Kết thúc câu sớm')
    expect(screen.getByRole('heading', { name: 'Top 5 sau câu 1' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText(/Cả lớp đúng \d+% câu này/)).toBeInTheDocument()

    await click('Câu tiếp')
    expect(screen.getByText('Câu 2/3')).toBeInTheDocument()
    expect(screen.getByRole('timer', { name: 'Còn 20 giây' })).toBeInTheDocument()
    expect(screen.getByText('0/30')).toBeInTheDocument()
  })

  it('xem đáp án báo đang hiện trên máy và chỉ bấm được một lần', async () => {
    await startGame(await setup(2))

    await click('Kết thúc câu sớm')
    await click('Xem đáp án câu 1')

    expect(screen.getByRole('status')).toHaveTextContent('Đáp án đang hiện trên máy')
    expect(screen.getByRole('button', { name: 'Xem đáp án câu 1' })).toBeDisabled()
  })

  it('câu cuối hiện Kết thúc thay cho Câu tiếp', async () => {
    await startGame(await setup(2))

    for (const next of ['Câu tiếp', 'Câu tiếp']) {
      await click('Kết thúc câu sớm')
      await click(next)
    }
    await click('Kết thúc câu sớm')

    expect(screen.queryByRole('button', { name: 'Câu tiếp' })).not.toBeInTheDocument()
    await click('Kết thúc')
    expect(screen.queryByRole('heading', { name: /Top 5/ })).not.toBeInTheDocument()
  })

  const finishGame = async (students: number) => {
    await startGame(await setup(students))

    for (const next of ['Câu tiếp', 'Câu tiếp', 'Kết thúc']) {
      await click('Kết thúc câu sớm')
      await click(next)
    }
  }

  it('kết thúc hiện bục vinh danh ba bạn; đóng phòng cần xác nhận', async () => {
    await finishGame(30)

    expect(screen.getByRole('heading', { name: 'Chúc mừng cả lớp!' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText(/Trung bình cả lớp đúng \d+\/3 câu/)).toBeInTheDocument()

    await click('Đóng phòng')
    expect(screen.getByRole('dialog', { name: 'Đóng phòng?' })).toBeInTheDocument()
    await click('Chưa đóng')
    expect(screen.getByRole('heading', { name: 'Chúc mừng cả lớp!' })).toBeInTheDocument()

    await click('Đóng phòng')
    fireEvent.click(screen.getAllByRole('button', { name: 'Đóng phòng' }).at(-1)!)
    await act(async () => {})
    expect(screen.getByText('Phòng đã đóng')).toBeInTheDocument()
  })

  it('lớp ít hơn 3 bạn thì bục chỉ có số bạn thật', async () => {
    await finishGame(2)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('bục vẽ theo thứ tự nhì, nhất, ba và giữ hạng hòa', () => {
    render(
      <RoomPodium
        finished={{
          top: [
            { rank: 1, nickname: 'An', score: 90 },
            { rank: 1, nickname: 'Bình', score: 90 },
            { rank: 3, nickname: 'Chi', score: 50 },
          ],
          averageCorrect: 2,
          total: 3,
        }}
      />,
    )

    const rows = screen.getAllByRole('listitem').map((row) => row.textContent)

    expect(rows).toEqual(['Bình90 điểm1', 'An90 điểm1', 'Chi50 điểm3'])
  })

  it('nối lại giữa câu: đồng hồ theo số máy chủ báo', async () => {
    vi.useFakeTimers()
    const room = await startGame(await setup(30))

    await advance(4000)
    act(() => room.dropTeacherConnection())
    await advance(1500)

    expect(screen.getByRole('timer', { name: 'Còn 15 giây' })).toBeInTheDocument()
  })

  it('tạm dừng trong lúc mất kết nối: nối lại đồng hồ đứng đúng số máy chủ', async () => {
    vi.useFakeTimers()
    const room = await startGame(await setup(30))

    act(() => room.dropTeacherConnection())
    await advance(1000)
    await act(async () => {
      await room.teacher.pause()
    })
    await advance(10_500)

    expect(screen.getByRole('timer', { name: 'Còn 19 giây' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeInTheDocument()
  })

  it('đang tạm dừng không kết thúc câu được, tránh kẹt ở bảng', async () => {
    vi.useFakeTimers()
    await startGame(await setup(30))

    await click('Tạm dừng')

    expect(screen.getByRole('button', { name: 'Kết thúc câu sớm' })).toBeDisabled()
  })

  it('lệnh next lỗi sau khi bắt đầu thì còn nút Câu tiếp để thử lại', async () => {
    const room = await setup(2)

    vi.spyOn(room.teacher, 'next').mockRejectedValueOnce(new Error('mạng'))
    await startGame(room)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await click('Câu tiếp')
    expect(screen.getByText('Câu 1/3')).toBeInTheDocument()
  })

  it('bấm Câu tiếp hai lần nhanh chỉ gửi một lệnh', async () => {
    const room = await startGame(await setup(2))

    await click('Kết thúc câu sớm')

    const next = vi.spyOn(room.teacher, 'next')
    const button = screen.getByRole('button', { name: 'Câu tiếp' })

    await act(async () => {
      fireEvent.click(button)
      fireEvent.click(button)
    })

    expect(next).toHaveBeenCalledOnce()
  })

  it('mất kết nối thì khóa nút điều khiển', async () => {
    vi.useFakeTimers()
    const room = await startGame(await setup(2))

    act(() => room.dropTeacherConnection())

    expect(screen.getByRole('button', { name: 'Tạm dừng' })).toBeDisabled()
  })
})

describe('RoomTeacherScreen phòng chờ', () => {
  it('hiện mã, số bạn và 12 biệt danh mới nhất cùng số bạn còn lại', async () => {
    await setup(30)

    expect(screen.getByText('482 913')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /mã qr/i })).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(12)
    expect(screen.getByText('Sóc Nâu 3')).toBeInTheDocument()
    expect(screen.queryByText('Ong Vàng')).not.toBeInTheDocument()
    expect(screen.getByText(/và 18 bạn khác/)).toBeInTheDocument()
  })

  it('đặt màu theme lên thẻ gốc để nút Bắt đầu không trong suốt', async () => {
    await setup(1)

    expect(document.documentElement.style.getPropertyValue('--play-primary')).not.toBe('')
  })

  it('chưa có ai thì không bắt đầu được', async () => {
    await setup(0)

    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeDisabled()
    expect(screen.getByText(/Chưa có bạn nào/)).toBeInTheDocument()
  })

  it('bạn mới vào thì danh sách cập nhật', async () => {
    const room = await setup(1)

    act(() => {
      room.join('Mít')
    })

    expect(screen.getByText('Mít')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('xóa biệt danh: hộp thoại có đủ danh sách, xóa được cả bạn không nằm trong 12 tên đang hiện', async () => {
    await setup(30)

    fireEvent.click(screen.getByRole('button', { name: 'Xóa biệt danh' }))

    const dialog = screen.getByRole('dialog', { name: 'Xóa biệt danh' })

    expect(within(dialog).getAllByRole('listitem')).toHaveLength(30)

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa Ong Vàng' }))
    })

    expect(within(dialog).queryByText('Ong Vàng')).not.toBeInTheDocument()
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(29)
    expect(screen.getByText('29')).toBeInTheDocument()
  })

  it('lệnh thất bại thì báo lỗi, không im lặng', async () => {
    const room = await setup(2)

    vi.spyOn(room.teacher, 'start').mockRejectedValueOnce(new Error('mạng'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }))
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('482 913')).toBeInTheDocument()
  })

  it('mất kết nối hiện đang nối lại, nối xong tự tắt', async () => {
    vi.useFakeTimers()
    const room = await setup(2)

    act(() => room.dropTeacherConnection())
    expect(screen.getByRole('status')).toHaveTextContent(/nối lại/i)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(screen.queryByText(/nối lại/i)).not.toBeInTheDocument()
  })

  it('bắt đầu thì rời phòng chờ và đóng hộp xóa biệt danh', async () => {
    const room = await setup(2)

    fireEvent.click(screen.getByRole('button', { name: 'Xóa biệt danh' }))
    await act(async () => {
      await room.teacher.start()
    })

    expect(screen.queryByText('482 913')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Phòng đã bắt đầu')).toBeInTheDocument()
  })

  it('đóng phòng hiện đúng chữ', async () => {
    const room = await setup(2)

    await act(async () => {
      await room.teacher.close()
    })

    expect(screen.getByText('Phòng đã đóng')).toBeInTheDocument()
  })

  it('không nối được thì báo mất kết nối, bấm Thử lại nối lại được', async () => {
    const room = mockRoom(2)

    vi.spyOn(room.teacher, 'connect').mockRejectedValueOnce(new Error('mạng'))
    await show(room)
    expect(screen.getByRole('alert')).toHaveTextContent('Mất kết nối')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('rời màn thì hủy đăng ký và ngắt kết nối', async () => {
    const room = mockRoom(2)
    const unsubscribe = vi.fn()
    const unsubscribeConnection = vi.fn()

    vi.spyOn(room.teacher, 'subscribe').mockReturnValue(unsubscribe)
    vi.spyOn(room.teacher, 'subscribeConnection').mockReturnValue(unsubscribeConnection)
    const disconnect = vi.spyOn(room.teacher, 'disconnect')
    const view = await show(room)

    view.unmount()

    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(unsubscribeConnection).toHaveBeenCalledOnce()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('đổi client thì không còn danh sách của phòng cũ', async () => {
    const view = await show(mockRoom(3))

    expect(screen.getByText('3')).toBeInTheDocument()

    await act(async () => {
      view.rerender(<RoomTeacherScreen client={mockRoom(0).teacher} room={ROOM} />)
    })

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.queryByText('Ong Vàng')).not.toBeInTheDocument()
  })
})
