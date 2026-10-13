import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TOPIC_MAX_LENGTH, templatesForLevel } from '../constants/gameTemplates'
import CreateGamePage from './CreateGamePage'

// Truy vấn theo vai trò trên trang có nhiều radio khá chậm trong jsdom; nới thời gian chờ để không chập chờn khi máy bận.
vi.setConfig({ testTimeout: 20_000 })

const renderPage = () => render(<CreateGamePage />)

describe('Tạo game mới: mẫu gợi ý và form', () => {
  it('mặc định hiện mẫu Mầm non và chuyển sang Lớp 1 thì đổi danh sách mẫu', async () => {
    const user = userEvent.setup()
    renderPage()

    // Dùng getByText (nhẹ) cho danh sách dài; truy vấn theo vai trò trong jsdom chậm khi có nhiều radio.
    for (const template of templatesForLevel('KINDERGARTEN')) {
      expect(screen.getByText(template.title)).toBeInTheDocument()
    }
    expect(screen.queryByText('Phép cộng trong phạm vi 10')).toBeNull()
    expect(screen.getAllByRole('radio')).toHaveLength(2 + 6)

    await user.click(screen.getByRole('radio', { name: 'Lớp 1' }))

    expect(screen.getByText('Phép cộng trong phạm vi 10')).toBeInTheDocument()
    expect(screen.queryByText('Đếm đồ vật từ 1 đến 5')).toBeNull()
  })

  it('chọn mẫu thì điền sẵn môn, khối lớp, chủ đề bằng đúng giá trị enum', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('radio', { name: /Đếm đồ vật từ 1 đến 5/ }))

    expect(screen.getByLabelText('Môn học')).toHaveValue('MATH')
    expect(screen.getByLabelText('Khối lớp')).toHaveValue('KINDERGARTEN')
    expect(screen.getByLabelText(/Chủ đề bài học/)).toHaveValue(
      'Đếm số lượng đồ vật quen thuộc từ 1 đến 5',
    )
    expect(screen.getByRole('radio', { name: /Đếm đồ vật từ 1 đến 5/ })).toBeChecked()
    // Mẫu đang chọn có dấu chữ, không chỉ dựa vào màu nền.
    expect(screen.getAllByText('✓ Đã chọn')).toHaveLength(1)
  })

  it('sửa tay chủ đề thì mẫu tự bỏ chọn, chọn lại mẫu thì khôi phục', async () => {
    const user = userEvent.setup()
    renderPage()
    const radio = () => screen.getByRole('radio', { name: /Đếm đồ vật từ 1 đến 5/ })

    await user.click(radio())
    expect(radio()).toBeChecked()

    await user.type(screen.getByLabelText(/Chủ đề bài học/), ' và 6')
    expect(radio()).not.toBeChecked()
    expect(screen.getByLabelText(/Chủ đề bài học/)).toHaveValue(
      'Đếm số lượng đồ vật quen thuộc từ 1 đến 5 và 6',
    )

    await user.click(radio())
    expect(radio()).toBeChecked()
    expect(screen.getByLabelText(/Chủ đề bài học/)).toHaveValue(
      'Đếm số lượng đồ vật quen thuộc từ 1 đến 5',
    )
  })

  it('đổi cấp học không xóa nội dung form đang nhập', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/Chủ đề bài học/), 'Chủ đề của tôi')
    await user.click(screen.getByRole('radio', { name: 'Lớp 1' }))

    expect(screen.getByLabelText(/Chủ đề bài học/)).toHaveValue('Chủ đề của tôi')
  })

  it('ô chủ đề giới hạn độ dài và hiện bộ đếm ký tự', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = screen.getByLabelText(/Chủ đề bài học/)

    expect(input).toHaveAttribute('maxlength', String(TOPIC_MAX_LENGTH))
    await user.type(input, 'abc')
    expect(screen.getByText(`3/${TOPIC_MAX_LENGTH}`)).toBeInTheDocument()
  })

  it('các ô chọn môn và khối lớp chỉ có giá trị enum hợp lệ với nhãn tiếng Việt', () => {
    renderPage()

    const subjects = within(screen.getByLabelText('Môn học')).getAllByRole('option')
    expect(subjects.map((o) => [o.textContent, o.getAttribute('value')])).toEqual([
      ['Chọn môn học', ''],
      ['Toán', 'MATH'],
      ['Tiếng Việt', 'VIETNAMESE'],
      ['Tiếng Anh', 'ENGLISH'],
    ])
    const grades = within(screen.getByLabelText('Khối lớp')).getAllByRole('option')
    expect(grades.map((o) => o.getAttribute('value'))).toEqual([
      '',
      'KINDERGARTEN',
      'GRADE_1',
      'GRADE_2',
      'GRADE_3',
      'GRADE_4',
      'GRADE_5',
    ])
  })

  it('nút Tạo trò chơi bị khóa và có lời giải thích gắn với nút', () => {
    renderPage()

    const button = screen.getByRole('button', { name: 'Tạo trò chơi' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription(
      'Tính năng tạo trò chơi bằng AI đang được hoàn thiện nên nút này chưa dùng được. Thông tin bạn nhập chưa được lưu.',
    )
  })

  it('bàn phím: các mẫu là nhóm radio chung nên chọn được bằng phím mũi tên', async () => {
    const user = userEvent.setup()
    renderPage()
    const first = templatesForLevel('KINDERGARTEN')[0]
    const second = templatesForLevel('KINDERGARTEN')[1]

    await user.click(screen.getByRole('radio', { name: new RegExp(first.title) }))
    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('radio', { name: new RegExp(second.title) })).toBeChecked()
    expect(screen.getByLabelText(/Chủ đề bài học/)).toHaveValue(second.topic)
  })
})
