import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_TEMPLATES } from '../constants/gameTemplates'
import { gameTypeLabel } from '../constants/labels'
import { rankGameTypes, suggestGameTypes } from '../services/gameTypeSuggestionService'
import { renderWithProviders } from '../test/renderWithApp'
import type { GameTypeSuggestion } from '../types/game-suggestion.types'
import CreateGamePage from './CreateGamePage'

// Dịch vụ đề xuất là mock có độ trễ 1 giây; test thay bằng bản không trễ để chạy nhanh và điều khiển được từng trạng thái.
vi.mock('../services/gameTypeSuggestionService', async (original) => ({
  ...(await original<typeof import('../services/gameTypeSuggestionService')>()),
  suggestGameTypes: vi.fn(),
}))

const mockedSuggest = vi.mocked(suggestGameTypes)

beforeEach(() => {
  mockedSuggest.mockReset()
  mockedSuggest.mockImplementation(async (input) => rankGameTypes(input))
})

const renderPage = (path = '/games/new') => renderWithProviders(<CreateGamePage />, path)

const gradeSelect = () => screen.getByLabelText(/Khối lớp/)
const subjectSelect = () => screen.getByLabelText(/Môn học/)
const ideaBox = () => screen.getByLabelText('Ý tưởng bài học')
const submit = () => screen.getByRole('button', { name: 'Tạo trò chơi' })
const random = () => screen.getByRole('button', { name: 'Tạo ngẫu nhiên' })
const cards = () => screen.getAllByRole('checkbox')

const IDEA = 'Đếm số lượng con vật cho các bé'

const pick = async (
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

// Điền ý tưởng, bấm Tạo và chờ bước đề xuất hiện đủ thẻ.
const toSuggestions = async (user: ReturnType<typeof userEvent.setup>, idea = IDEA) => {
  fireEvent.change(ideaBox(), { target: { value: idea } })
  await user.click(submit())
  await screen.findByRole('heading', { name: 'AI đề xuất các loại trò chơi cho bạn' })
  await screen.findAllByRole('checkbox')
}

describe('Tạo game mới: bước mô tả (UC-02)', () => {
  it('có các ô: khối lớp, môn học (tùy chọn), ý tưởng, giáo án, tùy chọn nâng cao (chỉ còn giọng đọc)', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Tạo game mới' })).toBeInTheDocument()
    expect(gradeSelect()).toBeInTheDocument()
    expect(subjectSelect()).toBeInTheDocument()
    expect(ideaBox()).toHaveAttribute('maxlength', '2000')
    expect(screen.getByText('Hoặc tải lên giáo án')).toBeInTheDocument()
    expect(screen.queryByText('*')).toBeNull()

    await user.click(screen.getByText('Tùy chọn nâng cao'))
    expect(screen.getByLabelText('Giọng đọc vùng miền')).toHaveValue('NORTH')
    expect(screen.getByLabelText('Giọng đọc')).toHaveValue('FEMALE')
    expect(screen.queryByLabelText('Loại trò chơi')).toBeNull()
  })

  it('hai ô chọn chỉ có giá trị enum hợp lệ của API, nhãn tiếng Việt, kèm "Chưa xác định"', () => {
    renderPage()

    const grades = within(gradeSelect()).getAllByRole('option').map((o) => [o.textContent, o.getAttribute('value')])
    expect(grades).toEqual([
      ['Chưa xác định', ''],
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

  it('không chọn khối lớp và môn học vẫn tạo được: chỉ cần ý tưởng', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user, 'Bài học về các con vật quen thuộc')

    expect(cards().length).toBeGreaterThanOrEqual(3)
    expect(mockedSuggest).toHaveBeenCalledWith({ idea: 'Bài học về các con vật quen thuộc', gradeLevel: '', subject: '' })
  })

  it('bấm Tạo trò chơi khi chưa có ý tưởng: báo lỗi ở ô ý tưởng, chuyển tiêu điểm tới đó và xóa lỗi khi gõ', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(submit())
    expect(ideaBox()).toHaveAttribute('aria-invalid', 'true')
    expect(ideaBox()).toHaveAccessibleDescription(/ít nhất 10 ký tự/)
    await waitFor(() => expect(ideaBox()).toHaveFocus())
    expect(mockedSuggest).not.toHaveBeenCalled()

    await user.type(ideaBox(), 'a')
    expect(ideaBox()).not.toHaveAttribute('aria-invalid')
  })

  it('bấm chip gợi ý sau khi bị báo thiếu ý tưởng thì lỗi biến mất', async () => {
    const user = userEvent.setup()
    renderPage()
    await pick(user, 'KINDERGARTEN', 'MATH')
    await user.click(submit())
    expect(ideaBox()).toHaveAttribute('aria-invalid', 'true')

    const [template] = GAME_TEMPLATES.filter((t) => t.level === 'KINDERGARTEN' && t.subject === 'MATH')
    await user.click(screen.getByRole('button', { name: template.title }))

    expect(ideaBox()).toHaveValue(template.topic)
    expect(ideaBox()).not.toHaveAttribute('aria-invalid')
  })

  it('ý tưởng quá ngắn (dưới 10 ký tự) bị từ chối, đủ 10 ký tự thì sang bước đề xuất', async () => {
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(ideaBox(), { target: { value: 'Quá ngắn' } })
    await user.click(submit())
    expect(ideaBox()).toHaveAttribute('aria-invalid', 'true')

    await toSuggestions(user)
  })

  it('AI đoán khối lớp và môn từ mô tả, có nhãn "AI đoán, bấm để sửa"; giáo viên sửa thì nhãn mất và lựa chọn được giữ', async () => {
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(ideaBox(), { target: { value: 'Phép cộng trong phạm vi 10 cho học sinh lớp 1' } })
    expect(gradeSelect()).toHaveValue('GRADE_1')
    expect(subjectSelect()).toHaveValue('MATH')
    const chips = within(screen.getByRole('group', { name: 'Bài học dành cho' }))
    expect(chips.getAllByText('AI đoán, bấm để sửa')).toHaveLength(2)

    await user.selectOptions(gradeSelect(), 'GRADE_3')
    expect(chips.getAllByText('AI đoán, bấm để sửa')).toHaveLength(1)

    fireEvent.change(ideaBox(), { target: { value: 'Bài khác hẳn về lớp 2 môn tiếng Anh' } })
    expect(gradeSelect()).toHaveValue('GRADE_3') // giáo viên đã chọn tay nên không bị AI ghi đè
    expect(subjectSelect()).toHaveValue('ENGLISH')
  })

  it('chưa nhập mô tả thì cả hai chip hiện "Chưa xác định", không điền giá trị mặc định và không có nhãn "AI đoán"', () => {
    renderPage()
    const chips = within(screen.getByRole('group', { name: 'Bài học dành cho' }))

    expect(gradeSelect()).toHaveValue('')
    expect(subjectSelect()).toHaveValue('')
    expect(within(gradeSelect()).getByRole('option', { selected: true })).toHaveTextContent('Chưa xác định')
    expect(within(subjectSelect()).getByRole('option', { selected: true })).toHaveTextContent('Chưa xác định')
    expect(chips.queryByText('AI đoán, bấm để sửa')).toBeNull()
    expect(within(screen.getByRole('complementary')).getAllByText('Chưa xác định')).toHaveLength(2)
  })

  it('chọn "Chưa xác định" là chủ động để trống: AI không tự điền lại ô đó, ô kia vẫn do AI đoán', async () => {
    const user = userEvent.setup()
    renderPage()
    fireEvent.change(ideaBox(), { target: { value: 'Phép cộng cho học sinh lớp 2' } })
    expect(gradeSelect()).toHaveValue('GRADE_2')

    await user.selectOptions(gradeSelect(), '')
    fireEvent.change(ideaBox(), { target: { value: 'Phép cộng cho học sinh lớp 3' } })

    expect(gradeSelect()).toHaveValue('')
    expect(subjectSelect()).toHaveValue('MATH')
  })

  it('đoán không ra thì để trống và không chặn việc tạo', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user, 'Một bài học bất kỳ nào đó')

    expect(mockedSuggest).toHaveBeenCalledWith({ idea: 'Một bài học bất kỳ nào đó', gradeLevel: '', subject: '' })
  })

  it('bấm gợi ý nhanh thì chọn luôn khối lớp và môn của mẫu, danh sách gợi ý không bị co lại theo từ khóa AI đoán', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.selectOptions(gradeSelect(), 'KINDERGARTEN')
    const kindergarten = GAME_TEMPLATES.filter((t) => t.level === 'KINDERGARTEN')
    const chosen = kindergarten.find((t) => t.subject === 'MATH') ?? kindergarten[0]

    await user.click(screen.getByRole('button', { name: chosen.title }))

    expect(subjectSelect()).toHaveValue(chosen.subject)
    expect(within(screen.getByRole('group', { name: 'Bài học dành cho' })).queryAllByText('AI đoán, bấm để sửa')).toHaveLength(0)
  })

  it('câu ví dụ trong ô mô tả khớp với lựa chọn (không còn ghi "lớp 1" khi chọn Mầm non)', async () => {
    const user = userEvent.setup()
    renderPage()

    await pick(user, 'KINDERGARTEN', 'MATH')

    const placeholder = ideaBox().getAttribute('placeholder') ?? ''
    expect(placeholder).toMatch(/^Ví dụ: /)
    expect(placeholder).not.toMatch(/lớp 1/i)
  })

  it('gợi ý nhanh bám theo khối lớp và môn đang chọn, bấm thì điền ý tưởng', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByText('Gõ mô tả hoặc chọn khối lớp, môn học để xem gợi ý phù hợp.')).toBeInTheDocument()

    await pick(user, 'KINDERGARTEN', 'MATH')
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

    await pick(user, 'GRADE_4', 'MATH')

    expect(screen.getByText(/Chưa có gợi ý cho lựa chọn này/)).toBeInTheDocument()
  })

  it('từ Trang chủ (?idea=&grade=&subject=) ô mô tả, khối lớp và môn được điền sẵn; giá trị lạ bị bỏ qua', () => {
    renderPage('/games/new?idea=Đếm%20số%20từ%201%20đến%205&grade=KINDERGARTEN&subject=KHONG_CO')

    expect(ideaBox()).toHaveValue('Đếm số từ 1 đến 5')
    expect(gradeSelect()).toHaveValue('KINDERGARTEN')
    expect(subjectSelect()).toHaveValue('MATH') // môn lạ bị bỏ, AI đoán từ chữ "đếm số"
  })

  it('từ nút "Tạo ngẫu nhiên" ở Trang chủ (?random=1) tiêu điểm vào ô khối lớp', async () => {
    renderPage('/games/new?random=1')

    await waitFor(() => expect(gradeSelect()).toHaveFocus())
  })

  it('tóm tắt yêu cầu phản ánh lựa chọn hiện tại và ghi chú phần AI đoán', async () => {
    const user = userEvent.setup()
    renderPage()
    const summary = within(screen.getByRole('complementary'))

    await user.selectOptions(gradeSelect(), 'GRADE_2')
    fireEvent.change(ideaBox(), { target: { value: 'Từ vựng tiếng Anh về màu sắc' } })

    expect(summary.getByText('Lớp 2')).toBeInTheDocument()
    expect(summary.getByText('Tiếng Anh')).toBeInTheDocument()
    expect(summary.getByText('Từ vựng tiếng Anh về màu sắc')).toBeInTheDocument()
    expect(summary.getAllByText('AI đoán, bấm để sửa')).toHaveLength(1) // chỉ môn là AI đoán
    expect(summary.queryByText(/Cần thêm/)).toBeNull()
  })
})

describe('Tạo game mới: giáo án', () => {
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

  it('có giáo án hợp lệ thì không cần ý tưởng vẫn sang bước đề xuất (UC-02 luồng 3a)', async () => {
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(document.getElementById('create-file') as HTMLInputElement, {
      target: { files: [pdf()] },
    })
    await user.click(submit())

    expect(await screen.findByRole('heading', { name: 'AI đề xuất các loại trò chơi cho bạn' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Ý tưởng bài học')).toBeNull() // đã rời bước mô tả
  })
})

describe('Tạo game mới: AI đề xuất loại game', () => {
  it('hiện 3 đến 5 thẻ: tên loại, lý do và cách chơi; thẻ đầu (phù hợp nhất) được chọn sẵn', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user)

    const all = cards()
    expect(all.length).toBeGreaterThanOrEqual(3)
    expect(all.length).toBeLessThanOrEqual(5)
    expect(all[0]).toBeChecked()
    all.slice(1).forEach((card) => expect(card).not.toBeChecked())
    expect(screen.getByText('Phù hợp nhất')).toBeInTheDocument()
    expect(screen.getAllByText(/Cách chơi:/)).toHaveLength(all.length)
    expect(screen.getByRole('button', { name: 'Tạo 1 trò chơi' })).toBeEnabled()
  })

  it('lý do trên thẻ gắn với mục tiêu học (đếm số), thẻ hiện theo thứ tự độ phù hợp giảm dần và không có loại bị ẩn', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user, 'Đếm số lượng con vật')

    expect(screen.getByText('Bé nối nhóm 3 con vật với số 3, rèn quan hệ giữa số lượng và chữ số.')).toBeInTheDocument()
    const expected = rankGameTypes({ idea: 'Đếm số lượng con vật', gradeLevel: '', subject: '' }).map((item) => gameTypeLabel(item.type))
    expect(cards()).toHaveLength(expected.length)
    expected.forEach((label, index) => expect(cards()[index]).toHaveAccessibleName(new RegExp(`^${label}`)))
    expect(screen.queryByText(/Sắp xếp chữ cái|Điền vào chỗ trống/)).toBeNull()
  })

  it('"Tạo ngẫu nhiên" chưa biết mục tiêu học nên không thẻ nào được nhãn "Phù hợp nhất", nhưng thẻ đầu vẫn chọn sẵn', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(random())
    await screen.findAllByRole('checkbox')

    expect(screen.queryByText('Phù hợp nhất')).toBeNull()
    expect(cards()[0]).toBeChecked()
  })

  it('bước đề xuất luôn gắn nhãn "Dữ liệu mô phỏng" vì chưa có endpoint đề xuất thật, kể cả khi tắt mọi nhóm mô phỏng', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user)

    const step = within(screen.getByRole('region', { name: 'AI đề xuất các loại trò chơi cho bạn' }))
    expect(step.getByText('Dữ liệu mô phỏng')).toBeInTheDocument()
  })

  it('đang chờ AI thì hiện khung xương có thông báo cho trình đọc màn hình, chưa có thẻ nào', async () => {
    mockedSuggest.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(ideaBox(), { target: { value: IDEA } })
    await user.click(submit())

    expect(await screen.findByText('AI đang chọn loại trò chơi phù hợp...')).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Chọn ít nhất 1 loại để tạo' })).toBeDisabled()
  })

  it('chọn nhiều loại, tối đa 3: đủ 3 thì các thẻ còn lại bị khóa và có giải thích; bỏ chọn thì mở lại', async () => {
    mockedSuggest.mockResolvedValue(rankGameTypes({ idea: 'Chữ cái tiếng Việt cho bé', gradeLevel: 'KINDERGARTEN', subject: 'VIETNAMESE' }))
    const user = userEvent.setup()
    renderPage()
    await toSuggestions(user, 'Chữ cái tiếng Việt cho bé')

    const all = cards()
    expect(all.length).toBeGreaterThanOrEqual(4)
    await user.click(all[1])
    await user.click(all[2])

    expect(screen.getByRole('button', { name: 'Tạo 3 trò chơi' })).toBeEnabled()
    expect(screen.getByText(/Đã chọn 3\/3/)).toHaveTextContent('Đã chọn đủ 3 loại')
    expect(all[3]).toBeDisabled()

    await user.click(all[2])
    expect(all[3]).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Tạo 2 trò chơi' })).toBeInTheDocument()
  })

  it('bỏ chọn hết thì không bấm Tạo được', async () => {
    const user = userEvent.setup()
    renderPage()
    await toSuggestions(user)

    await user.click(cards()[0])

    expect(screen.getByRole('button', { name: 'Chọn ít nhất 1 loại để tạo' })).toBeDisabled()
  })

  it('panel tóm tắt cập nhật dòng "Loại trò chơi" theo các loại đã chọn', async () => {
    const user = userEvent.setup()
    renderPage()
    const summary = within(screen.getByRole('complementary'))
    expect(summary.getByText('AI sẽ đề xuất sau khi bạn bấm Tạo')).toBeInTheDocument()

    await toSuggestions(user)
    const [first, second] = rankGameTypes({ idea: IDEA, gradeLevel: '', subject: '' })
    expect(summary.getByText(gameTypeLabel(first.type))).toBeInTheDocument()

    await user.click(cards()[1])
    expect(summary.getByText(`${gameTypeLabel(first.type)}, ${gameTypeLabel(second.type)}`)).toBeInTheDocument()
  })

  it('bấm Tạo thì báo rõ chưa tạo được (không giả vờ), chuyển tiêu điểm tới thông báo', async () => {
    const user = userEvent.setup()
    renderPage()
    await toSuggestions(user)

    await user.click(screen.getByRole('button', { name: /^Tạo \d trò chơi$/ }))

    const notice = (await screen.findByText('Tính năng tạo game đang được hoàn thiện')).closest('[role="status"]') as HTMLElement
    expect(notice).toHaveTextContent('chưa có gì bị mất')
    await waitFor(() => expect(notice).toHaveFocus())
  })

  it('đổi lựa chọn sau khi có thông báo thì thông báo biến mất để không gây hiểu nhầm', async () => {
    const user = userEvent.setup()
    renderPage()
    await toSuggestions(user)
    await user.click(screen.getByRole('button', { name: /^Tạo \d trò chơi$/ }))
    await screen.findByText('Tính năng tạo game đang được hoàn thiện')

    await user.click(cards()[1])

    expect(screen.queryByText('Tính năng tạo game đang được hoàn thiện')).toBeNull()
  })

  it('"Quay lại sửa mô tả" giữ nguyên mô tả, khối lớp và môn đã nhập, tiêu điểm về ô mô tả', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.selectOptions(gradeSelect(), 'GRADE_2')
    await toSuggestions(user)

    await user.click(screen.getByRole('button', { name: 'Quay lại sửa mô tả' }))

    expect(ideaBox()).toHaveValue(IDEA)
    expect(gradeSelect()).toHaveValue('GRADE_2')
    await waitFor(() => expect(ideaBox()).toHaveFocus())
  })

  it('"Tạo ngẫu nhiên" cũng sang bước đề xuất và nói rõ AI sẽ chọn chủ đề', async () => {
    const user = userEvent.setup()
    renderPage()
    await pick(user, 'GRADE_1', 'MATH')

    await user.click(random())

    await screen.findAllByRole('checkbox')
    expect(screen.getByText(/AI sẽ chọn chủ đề phù hợp/)).toBeInTheDocument()
    expect(mockedSuggest).toHaveBeenCalledWith({ idea: '', gradeLevel: 'GRADE_1', subject: 'MATH' })
    expect(within(screen.getByRole('complementary')).getByText('AI chọn chủ đề')).toBeInTheDocument()
  })

  it('lỗi thì báo bằng câu rõ ràng và nút "Thử lại" gọi lại với cùng đầu vào', async () => {
    mockedSuggest.mockRejectedValueOnce(new Error('boom'))
    const user = userEvent.setup()
    renderPage()
    fireEvent.change(ideaBox(), { target: { value: IDEA } })
    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Chưa lấy được đề xuất')
    expect(alert).toHaveTextContent('AI chưa đề xuất được lúc này')

    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect((await screen.findAllByRole('checkbox')).length).toBeGreaterThanOrEqual(3)
    expect(mockedSuggest).toHaveBeenCalledTimes(2)
    expect(mockedSuggest.mock.calls[1][0]).toEqual(mockedSuggest.mock.calls[0][0])
  })

  it('AI không đề xuất được gì thì hiện trạng thái rỗng và hướng dẫn quay lại', async () => {
    mockedSuggest.mockResolvedValue([] as GameTypeSuggestion[])
    const user = userEvent.setup()
    renderPage()
    fireEvent.change(ideaBox(), { target: { value: IDEA } })
    await user.click(submit())

    expect(await screen.findByText('Chưa có đề xuất cho ý tưởng này')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn ít nhất 1 loại để tạo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Quay lại sửa mô tả' })).toBeEnabled()
  })

  it('chuyển sang bước đề xuất thì tiêu điểm vào tiêu đề của bước', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'AI đề xuất các loại trò chơi cho bạn' })).toHaveFocus(),
    )
  })
})
