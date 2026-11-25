import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchClassrooms } from '../api/classroomsApi'
import {
  fetchSavedSuggestions, fetchTeacherProfile, forgetSuggestion, rememberSuggestion, resetTeacherProfile, saveTeacherProfile,
} from '../api/teacherProfileApi'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import TeacherProfilePage from './TeacherProfilePage'

vi.mock('../api/classroomsApi', () => ({
  fetchClassrooms: vi.fn(), createClassroom: vi.fn(), deleteClassroom: vi.fn(), updateClassroom: vi.fn(),
}))
vi.mock('../api/teacherProfileApi')

const registered = { school: 'Trường Hoa Mai', textbook: null, voice: null, subject: null, gradeLevel: null }
const saved = { ...registered, textbook: 'Cánh diều', subject: 'MATH' }

beforeEach(() => {
  vi.resetAllMocks()
  loginAsTeacher()
  vi.mocked(fetchClassrooms).mockResolvedValue([])
  vi.mocked(fetchTeacherProfile).mockResolvedValue(registered)
  vi.mocked(fetchSavedSuggestions).mockResolvedValue([])
})

describe('Hồ sơ của tôi', () => {
  it('điền sẵn trường đăng ký, giữ bản nhập khi lỗi và cho lưu lại', async () => {
    const user = userEvent.setup()
    vi.mocked(saveTeacherProfile).mockRejectedValueOnce(new Error('Lỗi lưu')).mockResolvedValueOnce(saved)
    renderWithProviders(<TeacherProfilePage />)

    const region = await screen.findByRole('region', { name: 'Thông tin giảng dạy' })
    expect(within(region).getByLabelText('Trường')).toHaveValue(registered.school)
    await user.type(within(region).getByLabelText('Bộ sách giáo khoa'), 'Cánh diều')
    await user.selectOptions(within(region).getByLabelText('Môn đang dạy'), 'MATH')
    await user.click(within(region).getByRole('button', { name: 'Lưu hồ sơ' }))

    expect(await within(region).findByRole('alert')).toHaveTextContent('chưa lưu được hồ sơ')
    expect(within(region).getByLabelText('Bộ sách giáo khoa')).toHaveValue('Cánh diều')
    await user.click(within(region).getByRole('button', { name: 'Lưu hồ sơ' }))

    expect(await screen.findByText('Đã lưu hồ sơ.')).toBeInTheDocument()
    expect(saveTeacherProfile).toHaveBeenLastCalledWith(saved)
  })

  it('ghi nhớ, xóa một gợi ý hoặc tất cả, rồi xác nhận xóa hồ sơ', async () => {
    const user = userEvent.setup()
    const first = { id: 's1', topic: 'Phép cộng' }
    const second = { id: 's2', topic: 'Hình tròn' }
    let suggestions = [first]
    vi.mocked(fetchSavedSuggestions).mockImplementation(async () => suggestions)
    vi.mocked(rememberSuggestion).mockImplementation(async () => { suggestions = [first, second] })
    vi.mocked(forgetSuggestion).mockImplementation(async (id) => {
      suggestions = id === null ? [] : suggestions.filter((item) => item.id !== id)
    })
    vi.mocked(fetchTeacherProfile).mockResolvedValueOnce(saved)
    vi.mocked(resetTeacherProfile).mockResolvedValue(undefined)
    renderWithProviders(<TeacherProfilePage />)

    const region = await screen.findByRole('region', { name: 'Gợi ý đã ghi nhớ' })
    await user.type(within(region).getByLabelText('Chủ đề muốn ghi nhớ'), second.topic)
    await user.click(within(region).getByRole('button', { name: 'Ghi nhớ chủ đề' }))
    expect(await within(region).findByText(second.topic)).toBeInTheDocument()
    await user.click(within(region).getByRole('button', { name: 'Xóa gợi ý Phép cộng' }))
    await waitFor(() => expect(within(region).queryByText(first.topic)).toBeNull())
    await user.click(within(region).getByRole('button', { name: 'Xóa tất cả gợi ý' }))
    expect(forgetSuggestion).toHaveBeenCalledTimes(1)
    await user.click(within(region).getByRole('button', { name: 'Xác nhận xóa tất cả gợi ý' }))
    expect(await within(region).findByText('Chưa có chủ đề nào được ghi nhớ.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Xóa hồ sơ$/ }))
    expect(resetTeacherProfile).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Xác nhận xóa hồ sơ' }))
    expect(await screen.findByText('Đã xóa hồ sơ giảng dạy.')).toBeInTheDocument()
    expect(screen.getByLabelText('Bộ sách giáo khoa')).toHaveValue('')
  })
})
