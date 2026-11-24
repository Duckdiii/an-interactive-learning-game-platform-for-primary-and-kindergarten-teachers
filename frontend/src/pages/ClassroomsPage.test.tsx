import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClassroom, deleteClassroom, fetchClassrooms, updateClassroom } from '../api/classroomsApi'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import ClassroomsPage from './ClassroomsPage'

vi.mock('../api/classroomsApi', () => ({ fetchClassrooms: vi.fn(), createClassroom: vi.fn(), deleteClassroom: vi.fn(), updateClassroom: vi.fn() }))

const mockedFetch = vi.mocked(fetchClassrooms)
const mockedCreate = vi.mocked(createClassroom)
const mockedDelete = vi.mocked(deleteClassroom)

const CLASS_1A = { classroomId: 'c1', className: 'Lớp 1A', schoolYear: '2026-2027', schoolName: 'Trường Hoa Mai' }

function apiError(status: number, code: string) {
  const error = new AxiosError('boom', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { success: false, error: { code, message: 'x' } },
  } as never)

  return error
}

describe('Trang Lớp học', () => {
  beforeEach(() => {
    loginAsTeacher()
    mockedFetch.mockResolvedValue([CLASS_1A])
  })
  afterEach(() => vi.clearAllMocks())

  it('liệt kê các lớp của cô, kèm năm học và trường', async () => {
    renderWithProviders(<ClassroomsPage />)

    const list = await screen.findByRole('list', { name: 'Danh sách lớp' })
    expect(within(list).getByText('Lớp 1A')).toBeInTheDocument()
    expect(within(list).getByText('2026-2027 · Trường Hoa Mai')).toBeInTheDocument()
  })

  it('chưa có lớp thì báo trống', async () => {
    mockedFetch.mockResolvedValue([])
    renderWithProviders(<ClassroomsPage />)

    expect(await screen.findByText('Cô chưa khai báo lớp nào')).toBeInTheDocument()
  })

  it('lỗi tải danh sách hiện thông báo và nút Thử lại', async () => {
    mockedFetch.mockRejectedValue(new Error('boom'))
    renderWithProviders(<ClassroomsPage />)

    const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
    expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('thiếu tên lớp thì báo ở ô tên và không gửi lên máy chủ', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ClassroomsPage />)
    await screen.findByText('Lớp 1A')

    await user.click(screen.getByRole('button', { name: 'Thêm lớp' }))

    expect(screen.getByText('Cô nhập tên lớp nhé.')).toBeInTheDocument()
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('thêm lớp gửi đúng nội dung rồi xóa ô nhập và tải lại danh sách', async () => {
    const user = userEvent.setup()
    mockedCreate.mockResolvedValue({ classroomId: 'c2', className: 'Lớp 1B' })
    renderWithProviders(<ClassroomsPage />)
    await screen.findByText('Lớp 1A')

    await user.type(screen.getByLabelText(/Tên lớp/), 'Lớp 1B')
    await user.type(screen.getByLabelText('Năm học'), '2026-2027')
    await user.click(screen.getByRole('button', { name: 'Thêm lớp' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({ className: 'Lớp 1B', schoolYear: '2026-2027', schoolName: '' }),
    )
    await waitFor(() => expect(screen.getByLabelText(/Tên lớp/)).toHaveValue(''))
    expect(mockedFetch.mock.calls.length).toBeGreaterThan(1)
  })

  it('nội dung không an toàn (422) hiện đúng câu của SRS', async () => {
    const user = userEvent.setup()
    mockedCreate.mockRejectedValue(apiError(422, 'UNSAFE_CONTENT'))
    renderWithProviders(<ClassroomsPage />)
    await screen.findByText('Lớp 1A')

    await user.type(screen.getByLabelText(/Tên lớp/), 'xyz')
    await user.click(screen.getByRole('button', { name: 'Thêm lớp' }))

    expect(
      await screen.findByText('Nội dung chưa đạt chuẩn an toàn dành cho học sinh. Vui lòng điều chỉnh lại.'),
    ).toBeInTheDocument()
  })

  it('sửa lớp, giữ dữ liệu khi lưu thất bại và gửi đúng hồ sơ lớp khi thử lại', async () => {
    const user = userEvent.setup()
    vi.mocked(updateClassroom)
      .mockRejectedValueOnce(new Error('Lỗi máy chủ'))
      .mockResolvedValueOnce(CLASS_1A)
    renderWithProviders(<ClassroomsPage />)

    await user.click(await screen.findByRole('button', { name: 'Sửa lớp Lớp 1A' }))
    expect(screen.getByLabelText(/Tên lớp/)).toHaveValue('Lớp 1A')
    await user.selectOptions(screen.getByLabelText('Khối lớp'), 'GRADE_1')
    await user.type(screen.getByLabelText('Sĩ số'), '24')
    await user.type(screen.getByLabelText('Phạm vi kiến thức đã học'), 'Đếm đến 10')
    await user.click(screen.getByRole('button', { name: 'Lưu lớp' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('chưa lưu được lớp')
    expect(screen.getByLabelText('Sĩ số')).toHaveValue(24)
    expect(screen.getByLabelText('Phạm vi kiến thức đã học')).toHaveValue('Đếm đến 10')
    await user.click(screen.getByRole('button', { name: 'Lưu lớp' }))
    expect(await screen.findByText('Đã lưu lớp học.')).toBeInTheDocument()
    expect(updateClassroom).toHaveBeenLastCalledWith('c1', expect.objectContaining({
      learningProfile: expect.objectContaining({ gradeLevel: 'GRADE_1', studentCount: 24, knowledgeScope: 'Đếm đến 10' }),
    }))
  })

  it('xóa lớp phải xác nhận, có thể giữ lại, xác nhận thì gọi xóa', async () => {
    const user = userEvent.setup()
    mockedDelete.mockResolvedValue(undefined)
    renderWithProviders(<ClassroomsPage />)
    await screen.findByText('Lớp 1A')

    await user.click(screen.getByRole('button', { name: 'Xóa lớp Lớp 1A' }))
    expect(screen.getByText(/không bị ảnh hưởng/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Giữ lại' }))
    expect(mockedDelete).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Xóa lớp Lớp 1A' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('c1'))
  })
})
