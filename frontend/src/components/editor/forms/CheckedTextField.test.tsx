import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setMockScenario } from '../../../services/mock/mockRuntime'
import * as safety from '../../../services/safetyService'
import CheckedTextField from './CheckedTextField'

// Khung thử: giữ "nội dung trong game" ở state ngoài ô, giống trang soạn thảo.
function Harness({ initial = 'Có mấy quả táo?', onCommit }: { initial?: string; onCommit?: (value: string) => void }) {
  const [value, setValue] = useState(initial)

  return (
    <>
      <CheckedTextField
        id="field"
        label="Nội dung câu hỏi"
        value={value}
        limits={{ min: 1, max: 20 }}
        onCommit={(next) => {
          setValue(next)
          onCommit?.(next)
        }}
      />
      <output data-testid="committed">{value}</output>
    </>
  )
}

const UNSAFE = 'Nội dung chỉnh sửa của giáo viên chưa đạt chuẩn an toàn học đường dành cho trẻ nhỏ. Vui lòng điều chỉnh lại từ ngữ.'
const box = () => screen.getByRole('textbox', { name: /Nội dung câu hỏi/ })
const committed = () => screen.getByTestId('committed').textContent

beforeEach(() => vi.stubEnv('VITE_USE_MOCK', 'editor'))
afterEach(() => {
  vi.restoreAllMocks()
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
})

describe('CheckedTextField', () => {
  it('ngừng gõ một chút thì nội dung hợp lệ được áp vào game', async () => {
    const user = userEvent.setup()

    render(<Harness initial="" />)
    await user.type(box(), 'Con mèo')

    await waitFor(() => expect(committed()).toBe('Con mèo'))
    expect(box()).toHaveValue('Con mèo')
  })

  it('rời ô thì áp ngay, không đợi hẹn giờ', async () => {
    render(<Harness initial="" />)
    fireEvent.change(box(), { target: { value: 'Quả táo' } })
    fireEvent.blur(box())

    await waitFor(() => expect(committed()).toBe('Quả táo'))
  })

  it('từ ngữ chưa phù hợp (UC-05 2a): GIỮ NGUYÊN nội dung cũ trong game, hiện đúng câu của SRS, chữ vừa gõ vẫn ở trong ô', async () => {
    const onCommit = vi.fn()

    render(<Harness onCommit={onCommit} />)
    fireEvent.change(box(), { target: { value: 'Cảnh máu me' } })
    fireEvent.blur(box())

    expect((await screen.findAllByText(new RegExp(UNSAFE.slice(0, 40)), {}, { timeout: 5000 })).length).toBeGreaterThan(0)
    expect(screen.getByRole('textbox', { name: /Nội dung câu hỏi/ })).toHaveAttribute('aria-invalid', 'true')
    expect(committed()).toBe('Có mấy quả táo?')
    expect(onCommit).not.toHaveBeenCalled()
    expect(box()).toHaveValue('Cảnh máu me')
    expect(screen.getAllByText(/Nội dung cũ vẫn được giữ/).length).toBeGreaterThan(0)
  })

  it('sửa lại từ ngữ cho phù hợp thì lỗi biến mất và nội dung mới được áp', async () => {
    const user = userEvent.setup()

    render(<Harness />)
    fireEvent.change(box(), { target: { value: 'Cảnh máu me' } })
    fireEvent.blur(box())
    await screen.findAllByText(new RegExp(UNSAFE.slice(0, 40)), {}, { timeout: 5000 })

    await user.clear(box())
    await user.type(box(), 'Cảnh vui')

    await waitFor(() => expect(committed()).toBe('Cảnh vui'))
    expect(screen.queryAllByText(new RegExp(UNSAFE.slice(0, 40)))).toHaveLength(0)
  })

  it('bộ đếm ký tự: quá giới hạn thì đổi sang kiểu cảnh báo (vẫn cho gõ, bộ kiểm tra dữ liệu báo lỗi)', () => {
    render(<Harness initial="a" />)
    fireEvent.change(box(), { target: { value: 'a'.repeat(25) } })

    expect(screen.getByText('25/20 ký tự')).toHaveClass('font-bold')
  })

  it('gõ nhanh nhiều lần: chỉ lần gõ cuối cùng được áp (kết quả kiểm tra cũ bị bỏ)', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()

    render(<Harness initial="" onCommit={onCommit} />)
    await user.type(box(), 'abc')

    await waitFor(() => expect(committed()).toBe('abc'))
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('abc')
  })

  it('không kiểm tra được vì lỗi kết nối: không áp nội dung mới, báo rõ và cho "Kiểm tra lại"', async () => {
    const user = userEvent.setup()

    render(<Harness />)
    setMockScenario('error')
    fireEvent.change(box(), { target: { value: 'Quả cam' } })
    fireEvent.blur(box())

    expect((await screen.findAllByText(/Chưa kiểm tra được từ ngữ vì lỗi kết nối/)).length).toBeGreaterThan(0)
    expect(committed()).toBe('Có mấy quả táo?')

    setMockScenario('normal')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra lại' }))

    await waitFor(() => expect(committed()).toBe('Quả cam'))
    expect(screen.queryAllByText(/Chưa kiểm tra được từ ngữ/)).toHaveLength(0)
  })

  it('gõ lại đúng như cũ thì không cần kiểm tra và không đổi gì', async () => {
    const onCommit = vi.fn()

    render(<Harness initial="Xin chào" onCommit={onCommit} />)
    // Hai lần sửa liên tiếp bằng fireEvent (đồng bộ): dùng userEvent thì giữa hai lần gõ có khoảng chờ bằng bộ hẹn giờ thật, khi máy bận dài hơn thời gian
    // chờ gõ xong của ô nên ô đã kiểm tra và áp chữ trung gian "Xin chàox" (test chập chờn).
    fireEvent.change(box(), { target: { value: 'Xin chàox' } })
    fireEvent.change(box(), { target: { value: 'Xin chào' } })
    fireEvent.blur(box())

    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('CheckedTextField: kết quả kiểm tra về muộn', () => {
  it('gõ tiếp khi lần kiểm tra trước còn chạy: kết quả cũ bị bỏ, chỉ nội dung cuối cùng được áp', async () => {
    const resolvers: Array<(verdict: { safe: boolean }) => void> = []

    vi.spyOn(safety, 'checkTextSafety').mockImplementation(
      () => new Promise((resolve) => resolvers.push(resolve)),
    )
    const onCommit = vi.fn()

    render(<Harness initial="" onCommit={onCommit} />)
    fireEvent.change(box(), { target: { value: 'abc' } })
    fireEvent.blur(box())
    await waitFor(() => expect(resolvers).toHaveLength(1))

    // Lần kiểm tra đầu chưa xong thì giáo viên gõ tiếp và rời ô: lần kiểm tra thứ hai bắt đầu.
    fireEvent.change(box(), { target: { value: 'abcd' } })
    fireEvent.blur(box())
    await waitFor(() => expect(resolvers).toHaveLength(2))

    // Kết quả của lần đầu về TRƯỚC (nhưng đã cũ) rồi mới tới lần hai.
    await act(async () => resolvers[0]({ safe: true }))
    expect(onCommit).not.toHaveBeenCalled()

    await act(async () => resolvers[1]({ safe: true }))
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('abcd')
  })

  it('kết quả "không phù hợp" của lần kiểm tra cũ không được hiện khi nội dung đã được gõ lại', async () => {
    const resolvers: Array<(verdict: { safe: boolean }) => void> = []

    vi.spyOn(safety, 'checkTextSafety').mockImplementation(
      () => new Promise((resolve) => resolvers.push(resolve)),
    )

    render(<Harness initial="" />)
    fireEvent.change(box(), { target: { value: 'máu me' } })
    fireEvent.blur(box())
    await waitFor(() => expect(resolvers).toHaveLength(1))
    fireEvent.change(box(), { target: { value: 'hoa hồng' } })

    await act(async () => resolvers[0]({ safe: false }))

    expect(screen.queryAllByText(new RegExp(UNSAFE.slice(0, 40)))).toHaveLength(0)
  })
})

describe('CheckedTextField: không gửi kiểm tra trùng cùng một nội dung', () => {
  it('lần kiểm tra chạy chậm hơn hẹn giờ gõ: chỉ gửi MỘT lần và kết quả "không phù hợp" không bị nhấp nháy xóa giữa chừng', async () => {
    const check = vi.spyOn(safety, 'checkTextSafety').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ safe: false }), 600)),
    )

    render(<Harness />)
    fireEvent.change(box(), { target: { value: 'Cảnh máu me' } })
    fireEvent.blur(box())

    // Qua mốc hẹn giờ gõ (350ms) khi lần kiểm tra đầu còn chạy, rồi chờ lần kiểm tra xong.
    await new Promise((resolve) => setTimeout(resolve, 900))

    expect(check).toHaveBeenCalledTimes(1)
    expect(box()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getAllByText(/Nội dung cũ vẫn được giữ/).length).toBeGreaterThan(0)
  })

  it('gõ lại đúng nội dung vừa bị từ chối (sau khi sửa rồi quay lại) thì vẫn được kiểm tra lại, không bị kẹt "đang áp dụng"', async () => {
    const check = vi.spyOn(safety, 'checkTextSafety').mockResolvedValue({ safe: false })

    render(<Harness />)
    fireEvent.change(box(), { target: { value: 'máu me' } })
    fireEvent.blur(box())
    await waitFor(() => expect(check).toHaveBeenCalledTimes(1))
    fireEvent.change(box(), { target: { value: 'hoa' } })
    fireEvent.change(box(), { target: { value: 'máu me' } })
    fireEvent.blur(box())

    await waitFor(() => expect(check).toHaveBeenCalledTimes(2))
  })
})

describe('CheckedTextField: sau lỗi kết nối', () => {
  it('rời ô lần nữa (khi mạng đã ổn) tự kiểm tra lại và áp nội dung, không bắt buộc bấm "Kiểm tra lại"', async () => {
    render(<Harness />)
    setMockScenario('error')
    fireEvent.change(box(), { target: { value: 'Quả cam' } })
    fireEvent.blur(box())
    expect((await screen.findAllByText(/Chưa kiểm tra được từ ngữ vì lỗi kết nối/)).length).toBeGreaterThan(0)

    setMockScenario('normal')
    fireEvent.blur(box())

    await waitFor(() => expect(committed()).toBe('Quả cam'))
  })
})
