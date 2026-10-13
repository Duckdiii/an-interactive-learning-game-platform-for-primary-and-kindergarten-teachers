import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { GAME_TEMPLATES } from '../constants/gameTemplates'
import { renderWithProviders } from '../test/renderWithApp'
import CreateGamePage from './CreateGamePage'

const renderPage = (path = '/games/new') => renderWithProviders(<CreateGamePage />, path)

const gradeSelect = () => screen.getByLabelText(/Khối lớp/)
const subjectSelect = () => screen.getByLabelText(/Môn học/)
const ideaBox = () => screen.getByLabelText('Ý tưởng bài học')
const submit = () => screen.getByRole('button', { name: 'Tạo trò chơi' })
const random = () => screen.getByRole('button', { name: 'Tạo ngẫu nhiên' })

const pickGradeAndSubject = async (
  user: ReturnType<typeof userEvent.setup>,
  grade = 'GRADE_1',
  subject = 'MATH',
) => {
  await user.selectOptions(gradeSelect(), grade)
  await user.selectOptions(subjectSelect(), subject)
}

const pdf = (name = 'giao-an.pdf', size = 2048) => {
  const file = new File(['x'], name, { type: 'application/pdf' })

  Object.defineProperty(file, 'size', { value: size })

  return file
}

describe('Tạo game mới (UC-02)', () => {
  it('có các ô theo UC-02: khối lớp, môn học (bắt buộc), ý tưởng, giáo án, tùy chọn nâng cao', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Tạo game mới' })).toBeInTheDocument()
    expect(gradeSelect()).toBeInTheDocument()
    expect(subjectSelect()).toBeInTheDocument()
    expect(ideaBox()).toHaveAttribute('maxlength', '2000')
    expect(screen.getByText('Hoặc tải lên giáo án')).toBeInTheDocument()
    expect(screen.getByText('Tùy chọn nâng cao')).toBeInTheDocument()
  })

  it('các ô chọn chỉ có giá trị enum hợp lệ của API, nhãn tiếng Việt', () => {
    renderPage()

    const grades = within(gradeSelect()).getAllByRole('option').map((o) => [o.textContent, o.getAttribute('value')])
    expect(grades).toEqual([
      ['Chọn khối lớp', ''],
      ['Mầm non', 'KINDERGARTEN'],
      ['Lớp 1', 'GRADE_1'],
      ['Lớp 2', 'GRADE_2'],
      ['Lớp 3', 'GRADE_3'],
      ['Lớp 4', 'GRADE_4'],
      ['Lớp 5', 'GRADE_5'],
    ])
    const subjects = within(subjectSelect()).getAllByRole('option').map((o) => o.getAttribute('value'))
    expect(subjects).toEqual(['', 'MATH', 'VIETNAMESE', 'ENGLISH'])
  })

  it('bấm Tạo trò chơi khi còn trống: báo lỗi ở ô khối lớp và môn học và chuyển tiêu điểm tới ô đầu tiên', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(submit())

    expect(gradeSelect()).toHaveAttribute('aria-invalid', 'true')
    expect(subjectSelect()).toHaveAttribute('aria-invalid', 'true')
    expect(gradeSelect()).toHaveAccessibleDescription('Hãy chọn khối lớp.')
    expect(subjectSelect()).toHaveAccessibleDescription('Hãy chọn môn học.')
    await waitFor(() => expect(gradeSelect()).toHaveFocus())
  })

  it('đã chọn lớp, môn nhưng thiếu ý tưởng: báo lỗi ở ô ý tưởng và xóa lỗi khi bắt đầu gõ', async () => {
    const user = userEvent.setup()
    renderPage()
    await pickGradeAndSubject(user)

    await user.click(submit())
    expect(ideaBox()).toHaveAttribute('aria-invalid', 'true')
    expect(ideaBox()).toHaveAccessibleDescription(/ít nhất 10 ký tự/)
    await waitFor(() => expect(ideaBox()).toHaveFocus())

    await user.type(ideaBox(), 'a')
    expect(ideaBox()).not.toHaveAttribute('aria-invalid')
  })

  it('bấm chip gợi ý sau khi bị báo thiếu ý tưởng thì lỗi biến mất', async () => {
    const user = userEvent.setup()
    renderPage()
    await pickGradeAndSubject(user, 'KINDERGARTEN', 'MATH')
    await user.click(submit())
    expect(ideaBox()).toHaveAttribute('aria-invalid', 'true')

    const [template] = GAME_TEMPLATES.filter((t) => t.level === 'KINDERGARTEN' && t.subject === 'MATH')
    await user.click(screen.getByRole('button', { name: template.title }))

    expect(ideaBox()).toHaveValue(template.topic)
    expect(ideaBox()).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText(/ít nhất 10 ký tự/, { selector: 'p[id$="-error"]' })).toBeNull()
  })

  it('ý tưởng quá ngắn (dưới 10 ký tự) vẫn bị từ chối, đủ 10 ký tự thì qua', async () => {
    const user = userEvent.setup()
    renderPage()
    await pickGradeAndSubject(user)

    fireEvent.change(ideaBox(), { target: { value: 'Quá ngắn' } })
    await user.click(submit())
    expect(ideaBox()).toHaveAttribute('aria-invalid', 'true')

    fireEvent.change(ideaBox(), { target: { value: 'Đếm số lượng con vật' } })
    await user.click(submit())
    expect(await screen.findByText('Tính năng tạo game đang được hoàn thiện')).toBeInTheDocument()
  })

  it('gợi ý nhanh chỉ hiện đúng môn và khối lớp đang chọn, bấm thì điền ý tưởng', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByText('Chọn khối lớp và môn học để xem gợi ý phù hợp.')).toBeInTheDocument()

    await pickGradeAndSubject(user, 'KINDERGARTEN', 'MATH')
    const expected = GAME_TEMPLATES.filter((t) => t.level === 'KINDERGARTEN' && t.subject === 'MATH')
    for (const template of expected) {
      expect(screen.getByRole('button', { name: template.title })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Phép cộng trong phạm vi 10' })).toBeNull()

    await user.click(screen.getByRole('button', { name: expected[0].title }))
    expect(ideaBox()).toHaveValue(expected[0].topic)
    expect(screen.getByRole('button', { name: expected[0].title })).toHaveAttribute('aria-pressed', 'true')
  })

  it('lớp chưa có mẫu thì nói rõ để giáo viên tự viết', async () => {
    const user = userEvent.setup()
    renderPage()

    await pickGradeAndSubject(user, 'GRADE_4', 'MATH')

    expect(screen.getByText(/Chưa có gợi ý cho lựa chọn này/)).toBeInTheDocument()
  })

  it('Tạo ngẫu nhiên chỉ cần lớp và môn; bị khóa khi đã có ý tưởng hoặc tệp, kèm lời giải thích', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(random()).toHaveAccessibleDescription(/Chỉ cần chọn môn và khối lớp/)

    fireEvent.change(ideaBox(), { target: { value: 'Đếm số lượng con vật' } })
    expect(random()).toBeDisabled()
    expect(random()).toHaveAccessibleDescription(/xóa ý tưởng và tệp giáo án/)

    fireEvent.change(ideaBox(), { target: { value: '' } })
    expect(random()).toBeEnabled()
    await user.click(random())
    expect(gradeSelect()).toHaveAttribute('aria-invalid', 'true')
  })

  it('đã chọn lớp, môn và bấm Tạo ngẫu nhiên thì tới thông báo "đang hoàn thiện" (không giả vờ đã tạo)', async () => {
    const user = userEvent.setup()
    renderPage()
    await pickGradeAndSubject(user)

    await user.click(random())

    const notice = (await screen.findByText('Tính năng tạo game đang được hoàn thiện')).closest('[role="status"]') as HTMLElement
    expect(notice).toHaveTextContent('Tính năng tạo game đang được hoàn thiện')
    expect(notice).toHaveTextContent('chưa có gì bị mất')
    await waitFor(() => expect(notice).toHaveFocus())
  })

  it('đổi lựa chọn sau khi có thông báo thì thông báo biến mất để không gây hiểu nhầm', async () => {
    const user = userEvent.setup()
    renderPage()
    await pickGradeAndSubject(user)
    await user.click(random())
    await screen.findByText('Tính năng tạo game đang được hoàn thiện')

    await user.selectOptions(subjectSelect(), 'ENGLISH')

    expect(screen.queryByText('Tính năng tạo game đang được hoàn thiện')).toBeNull()
  })

  it('giáo án sai định dạng bị từ chối bằng câu của UC-02, tệp quá lớn bị từ chối, tệp đúng được nhận', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = document.getElementById('create-file') as HTMLInputElement

    fireEvent.change(input, { target: { files: [pdf('ghi-chu.txt')] } })
    expect(await screen.findByText(/Tệp giáo án phải là \.docx hoặc \.pdf/)).toBeInTheDocument()

    fireEvent.change(input, { target: { files: [pdf('lon.pdf', 11 * 1024 * 1024)] } })
    expect(await screen.findByText(/vượt quá dung lượng cho phép/)).toBeInTheDocument()

    fireEvent.change(input, { target: { files: [pdf('giao-an-toan.pdf', 2048)] } })
    expect((await screen.findAllByText('giao-an-toan.pdf')).length).toBeGreaterThan(0)
    expect(screen.queryByText(/vượt quá dung lượng cho phép/)).toBeNull()
    expect(random()).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Bỏ tệp/ }))
    expect(screen.queryByText('giao-an-toan.pdf')).toBeNull()
  })

  it('có giáo án hợp lệ thì không cần ý tưởng vẫn tạo được (UC-02 luồng 3a)', async () => {
    const user = userEvent.setup()
    renderPage()
    await pickGradeAndSubject(user)

    fireEvent.change(document.getElementById('create-file') as HTMLInputElement, {
      target: { files: [pdf()] },
    })
    await user.click(submit())

    expect(await screen.findByText('Tính năng tạo game đang được hoàn thiện')).toBeInTheDocument()
    expect(ideaBox()).not.toHaveAttribute('aria-invalid')
  })

  it('tùy chọn nâng cao: loại trò chơi (10 loại, mặc định để AI chọn) và giọng đọc mặc định Bắc/Nữ', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Tùy chọn nâng cao'))

    const types = within(screen.getByLabelText('Loại trò chơi')).getAllByRole('option')
    expect(types).toHaveLength(11)
    expect(types[0]).toHaveTextContent('Để AI chọn loại phù hợp')
    expect(screen.getByLabelText('Giọng đọc vùng miền')).toHaveValue('NORTH')
    expect(screen.getByLabelText('Giọng đọc')).toHaveValue('FEMALE')
  })

  it('tóm tắt yêu cầu phản ánh lựa chọn hiện tại', async () => {
    const user = userEvent.setup()
    renderPage()
    const summary = within(screen.getByRole('complementary'))

    await pickGradeAndSubject(user, 'GRADE_2', 'ENGLISH')
    fireEvent.change(ideaBox(), { target: { value: 'Từ vựng về màu sắc' } })

    expect(summary.getByText('Lớp 2')).toBeInTheDocument()
    expect(summary.getByText('Tiếng Anh')).toBeInTheDocument()
    expect(summary.getByText('Từ vựng về màu sắc')).toBeInTheDocument()
    expect(summary.queryByText(/Cần thêm/)).toBeNull()
  })

  it('từ nút "Tạo ngẫu nhiên" ở Trang chủ (?random=1) tiêu điểm vào ô khối lớp', async () => {
    renderPage('/games/new?random=1')

    await waitFor(() => expect(gradeSelect()).toHaveFocus())
  })
})
