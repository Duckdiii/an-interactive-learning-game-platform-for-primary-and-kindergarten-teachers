import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTeacher, getTeachers, updateTeacher, type AdminTeacher } from '../../services/adminService'
import TeacherManagementPage from './TeacherManagementPage'

vi.mock('../../services/adminService', () => ({
  getTeachers: vi.fn(),
  getTeacher: vi.fn(),
  createTeacher: vi.fn(),
  updateTeacher: vi.fn(),
  lockTeacher: vi.fn(),
  unlockTeacher: vi.fn(),
}))

const teacher: AdminTeacher = {
  teacherId: 'teacher-1',
  fullName: 'Nguyễn Thị Mai',
  email: 'mai@example.test',
  school: 'Trường cũ',
  status: 'ACTIVE',
  createdAt: '2026-11-24T08:00:00',
}

describe('TeacherManagementPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getTeachers).mockResolvedValue({
      page: 0, size: 10, totalItems: 1, totalPages: 1, items: [teacher],
    })
  })

  it('loads the current information in a read-only detail dialog', async () => {
    vi.mocked(getTeacher).mockResolvedValue({ ...teacher, school: 'Trường mới', status: 'LOCKED' })
    const user = userEvent.setup()
    render(<TeacherManagementPage />)

    await user.click(await screen.findByRole('button', { name: 'Xem chi tiết giáo viên Nguyễn Thị Mai' }))
    const details = within(await screen.findByRole('dialog', { name: 'Chi tiết giáo viên' }))
    expect(getTeacher).toHaveBeenCalledWith('teacher-1')
    expect(details.getByText('Trường mới')).toBeVisible()
    expect(details.getByText('Đã khóa')).toBeVisible()
    expect(details.queryByRole('textbox')).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('marks a blank name at the field and accepts the corrected edit', async () => {
    vi.mocked(updateTeacher).mockResolvedValue({ ...teacher, fullName: 'Nguyễn Minh Mai' })
    const user = userEvent.setup()
    render(<TeacherManagementPage />)
    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa' }))

    const edit = within(screen.getByRole('dialog', { name: 'Chỉnh sửa thông tin' }))
    const name = edit.getByRole('textbox', { name: 'Họ và tên giáo viên' })
    await user.clear(name)
    await user.type(name, '   ')
    await user.click(edit.getByRole('button', { name: 'Lưu thay đổi' }))

    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription('Họ tên không được để trống')
    expect(updateTeacher).not.toHaveBeenCalled()

    await user.clear(name)
    await user.type(name, 'Nguyễn Minh Mai')
    await user.click(edit.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(updateTeacher).toHaveBeenCalledWith('teacher-1', {
      fullName: 'Nguyễn Minh Mai', school: 'Trường cũ',
    })
    expect(await screen.findByText('Cập nhật thông tin giáo viên thành công!')).toBeVisible()
  })
})
