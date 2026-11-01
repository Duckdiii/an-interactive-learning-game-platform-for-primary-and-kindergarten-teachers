import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDEAS } from '../constants/createIdeas'
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

const ideaBox = () => screen.getByLabelText('Ý tưởng bài học')
const submit = () => screen.getByRole('button', { name: 'Để AI soạn giúp' })
const random = () => screen.getByRole('button', { name: 'Tạo ngẫu nhiên' })
const cards = () => screen.getAllByRole('button', { name: /^Dùng kiểu này:/ })
const btn = (name: string) => screen.getByRole('button', { name })

const IDEA = 'Đếm số lượng con vật cho các bé'

type User = ReturnType<typeof userEvent.setup>

const SUBJECT_NAME: Record<string, string> = { MATH: 'Toán', VIETNAMESE: 'Tiếng Việt', ENGLISH: 'Tiếng Anh' }
const GRADE_NAME: Record<string, string> = { KINDERGARTEN: 'Mầm non', GRADE_1: 'Lớp 1' }

// Chọn khối bằng nút: Lớp 2–5 phải bấm nhóm trước rồi mới tới lớp cụ thể.
const chooseGrade = async (user: User, grade: string) => {
  if (GRADE_NAME[grade]) return user.click(btn(GRADE_NAME[grade]))
  if (screen.queryByRole('button', { name: 'Lớp 2–5', pressed: true }) === null) await user.click(btn('Lớp 2–5'))
  await user.click(btn(`Lớp ${grade.slice(-1)}`))
}

const pick = async (user: User, grade = 'GRADE_1', subject = 'MATH') => {
  await chooseGrade(user, grade)
  await user.click(btn(SUBJECT_NAME[subject]))
}

const pdf = (name = 'giao-an.pdf', size = 2048) => {
  const file = new File(['x'], name, { type: 'application/pdf' })

  Object.defineProperty(file, 'size', { value: size })

  return file
}

// Điền ý tưởng, bấm Tạo và chờ bước đề xuất hiện đủ thẻ.
const toSuggestions = async (user: User, idea = IDEA) => {
  fireEvent.change(ideaBox(), { target: { value: idea } })
  await user.click(submit())
  await screen.findByRole('heading', { name: 'AI đề xuất kiểu chơi cho bài này' })
  await screen.findAllByRole('button', { name: /^Dùng kiểu này:/ })
}

describe('Tạo game mới: bước mô tả (UC-02)', () => {
  it('có các ô: môn học, khối lớp (nút, tùy chọn), ý tưởng, giáo án, tùy chọn nâng cao (chỉ còn giọng đọc)', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Hôm nay cô muốn dạy gì?' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Môn học' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Khối lớp' })).toBeInTheDocument()
    expect(ideaBox()).toHaveAttribute('maxlength', '2000')
    expect(screen.getByText('Đính kèm giáo án (.docx, .pdf)')).toBeInTheDocument()
    expect(screen.getByText(/Tùy chọn · tối đa 10 MB/)).toBeInTheDocument()
    expect(screen.queryByText('*')).toBeNull()

    await user.click(screen.getByText('Tùy chọn nâng cao'))
    expect(screen.getByLabelText('Giọng đọc vùng miền')).toHaveValue('NORTH')
    expect(screen.getByLabelText('Giọng đọc')).toHaveValue('FEMALE')
    expect(screen.queryByLabelText('Loại trò chơi')).toBeNull()
  })

  it('nút môn và khối chỉ có giá trị hợp lệ của API; "Lớp 2–5" mới hiện hàng lớp cụ thể', async () => {
    const user = userEvent.setup()
    renderPage()
    const subjects = within(screen.getByRole('group', { name: 'Môn học' }))
    const grades = within(screen.getByRole('group', { name: 'Khối lớp' }))

    expect(subjects.getAllByRole('button').map((b) => b.textContent)).toEqual(['Toán', 'Tiếng Việt', 'Tiếng Anh'])
    expect(grades.getAllByRole('button').map((b) => b.textContent)).toEqual(['Mầm non', 'Lớp 1', 'Lớp 2–5'])
    expect(screen.queryByRole('group', { name: 'Chọn lớp cụ thể' })).toBeNull()

    await user.click(btn('Lớp 2–5'))

    const specific = within(screen.getByRole('group', { name: 'Chọn lớp cụ thể' }))
    expect(specific.getAllByRole('button').map((b) => b.textContent)).toEqual(['Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5'])

    await user.click(btn('Mầm non'))
    expect(screen.queryByRole('group', { name: 'Chọn lớp cụ thể' })).toBeNull()
  })

  it('không chọn khối lớp và môn học vẫn tạo được: chỉ cần ý tưởng', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user, 'Bài học về các con vật quen thuộc')

    expect(cards().length).toBeGreaterThanOrEqual(3)
    expect(mockedSuggest).toHaveBeenCalledWith({ idea: 'Bài học về các con vật quen thuộc', gradeLevel: '', subject: '' })
  })

  it('chọn "Lớp 2–5" mà chưa chọn lớp cụ thể thì coi như chưa xác định khối', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(btn('Lớp 2–5'))

    await toSuggestions(user, 'Bài học về các con vật quen thuộc')

    expect(mockedSuggest).toHaveBeenCalledWith({ idea: 'Bài học về các con vật quen thuộc', gradeLevel: '', subject: '' })
  })

  it('bấm Để AI soạn giúp khi chưa có ý tưởng: báo lỗi ở ô ý tưởng, chuyển tiêu điểm tới đó và xóa lỗi khi gõ', async () => {
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

  it('bấm thẻ gợi ý sau khi bị báo thiếu ý tưởng thì lỗi biến mất', async () => {
    const user = userEvent.setup()
    renderPage()
    await pick(user, 'KINDERGARTEN', 'MATH')
    await user.click(submit())
    expect(ideaBox()).toHaveAttribute('aria-invalid', 'true')

    await user.click(screen.getByRole('button', { name: /Đếm đồ vật từ 1 đến 5/ }))

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
    expect(btn('Lớp 1')).toHaveAttribute('aria-pressed', 'true')
    expect(btn('Toán')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByText('AI đoán, bấm để sửa')).toHaveLength(2)

    await user.click(btn('Lớp 2–5'))
    await user.click(btn('Lớp 3'))
    expect(btn('Lớp 3')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByText('AI đoán, bấm để sửa')).toHaveLength(1)

    fireEvent.change(ideaBox(), { target: { value: 'Bài khác hẳn về lớp 2 môn tiếng Anh' } })
    expect(btn('Lớp 3')).toHaveAttribute('aria-pressed', 'true') // giáo viên đã chọn tay nên không bị AI ghi đè
    expect(btn('Tiếng Anh')).toHaveAttribute('aria-pressed', 'true')
  })

  it('chưa nhập mô tả thì không nút môn/khối nào được chọn và không có nhãn "AI đoán"', () => {
    renderPage()

    for (const name of ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Mầm non', 'Lớp 1', 'Lớp 2–5']) {
      expect(btn(name)).toHaveAttribute('aria-pressed', 'false')
    }
    expect(screen.queryByText('AI đoán, bấm để sửa')).toBeNull()
  })

  it('bấm lại nút đã chọn là chủ động để trống: AI không tự điền lại ô đó, ô kia vẫn do AI đoán', async () => {
    const user = userEvent.setup()
    renderPage()
    fireEvent.change(ideaBox(), { target: { value: 'Phép cộng cho học sinh lớp 2' } })
    expect(btn('Lớp 2')).toHaveAttribute('aria-pressed', 'true')

    await user.click(btn('Lớp 2'))
    fireEvent.change(ideaBox(), { target: { value: 'Phép cộng cho học sinh lớp 3' } })

    expect(btn('Lớp 3')).toHaveAttribute('aria-pressed', 'false')
    expect(btn('Toán')).toHaveAttribute('aria-pressed', 'true')
  })

  it('đoán không ra thì để trống và không chặn việc tạo', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user, 'Một bài học bất kỳ nào đó')

    expect(mockedSuggest).toHaveBeenCalledWith({ idea: 'Một bài học bất kỳ nào đó', gradeLevel: '', subject: '' })
  })

  it('câu ví dụ trong ô mô tả khớp với lựa chọn (không còn ghi "lớp 1" khi chọn Mầm non)', async () => {
    const user = userEvent.setup()
    renderPage()

    await pick(user, 'KINDERGARTEN', 'MATH')

    const placeholder = ideaBox().getAttribute('placeholder') ?? ''
    expect(placeholder).toMatch(/^Ví dụ: /)
    expect(placeholder).not.toMatch(/lớp 1/i)
  })

  it('từ Trang chủ (?idea=&grade=&subject=) ô mô tả, khối lớp và môn được điền sẵn; giá trị lạ bị bỏ qua', () => {
    renderPage('/games/new?idea=Đếm%20số%20từ%201%20đến%205&grade=KINDERGARTEN&subject=KHONG_CO')

    expect(ideaBox()).toHaveValue('Đếm số từ 1 đến 5')
    expect(btn('Mầm non')).toHaveAttribute('aria-pressed', 'true')
    expect(btn('Toán')).toHaveAttribute('aria-pressed', 'true') // môn lạ bị bỏ, AI đoán từ chữ "đếm số"
  })

  it('từ nút "Tạo ngẫu nhiên" ở Trang chủ (?random=1) tiêu điểm vào nút khối lớp đầu tiên', async () => {
    renderPage('/games/new?random=1')

    await waitFor(() => expect(btn('Mầm non')).toHaveFocus())
  })
})

describe('Tạo game mới: cột gợi ý và thanh bước', () => {
  it('chưa chọn môn và khối thì nhắc chọn; chọn đủ thì tiêu đề và 4 thẻ đổi theo môn × nhóm khối', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByRole('heading', { name: 'Chọn môn và khối để xem gợi ý' })).toBeInTheDocument()
    expect(screen.getByText(/Mẹo: nêu đối tượng/)).toBeInTheDocument()

    await user.click(btn('Toán'))
    expect(screen.getByRole('heading', { name: 'Chọn môn và khối để xem gợi ý' })).toBeInTheDocument()

    await user.click(btn('Mầm non'))
    const panel = within(screen.getByRole('complementary'))
    expect(panel.getByRole('heading', { name: 'Gợi ý cho Toán · Mầm non' })).toBeInTheDocument()
    expect(panel.getAllByRole('button')).toHaveLength(4)
    expect(panel.getByRole('button', { name: /Nhiều hơn, ít hơn/ })).toBeInTheDocument()

    await user.click(btn('Tiếng Việt'))
    await user.click(btn('Lớp 2–5'))
    expect(panel.getByRole('heading', { name: 'Gợi ý cho Tiếng Việt · Lớp 2–5' })).toBeInTheDocument()
    expect(panel.getByRole('button', { name: new RegExp(IDEAS.VIETNAMESE.UPPER[0].title) })).toBeInTheDocument()
  })

  it('bấm một thẻ ý tưởng điền "tiêu đề: mô tả" vào ô mô tả trống và đưa tiêu điểm về ô', async () => {
    const user = userEvent.setup()
    renderPage()
    await pick(user, 'KINDERGARTEN', 'MATH')

    await user.click(screen.getByRole('button', { name: /Nhiều hơn, ít hơn/ }))

    expect(ideaBox()).toHaveValue('Nhiều hơn, ít hơn: So sánh hai nhóm đồ vật')
    expect(ideaBox()).toHaveFocus()
  })

  it('ô mô tả đã có chữ thì thẻ ý tưởng nối thêm dòng mới, không xóa chữ cô đã gõ', async () => {
    const user = userEvent.setup()
    renderPage()
    await pick(user, 'KINDERGARTEN', 'MATH')
    fireEvent.change(ideaBox(), { target: { value: 'Chữ cô đã gõ  ' } })

    await user.click(screen.getByRole('button', { name: /Nhiều hơn, ít hơn/ }))

    expect(ideaBox()).toHaveValue('Chữ cô đã gõ\nNhiều hơn, ít hơn: So sánh hai nhóm đồ vật')
  })

  it('chọn "Lớp 2–5" mà chưa chọn lớp cụ thể thì nhắc chọn lớp; chọn rồi thì hết nhắc', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(btn('Lớp 2–5'))

    expect(btn('Lớp 2–5')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Chọn thêm lớp cụ thể để AI soạn sát hơn.')).toBeInTheDocument()

    await user.click(btn('Lớp 3'))
    expect(screen.queryByText('Chọn thêm lớp cụ thể để AI soạn sát hơn.')).toBeNull()
  })

  it('thanh bước có 3 ô theo thứ tự thật của app và ô hiện tại có aria-current="step"', async () => {
    const user = userEvent.setup()
    renderPage()
    const steps = within(screen.getByRole('list', { name: 'Các bước tạo trò chơi' }))

    expect(steps.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['1Mô tả bài học', '2Chọn kiểu chơi', '3AI soạn'])
    expect(steps.getByText('Mô tả bài học').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1)

    await toSuggestions(user)

    expect(steps.getByText('Chọn kiểu chơi').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(steps.getByText('Mô tả bài học').closest('li')).not.toHaveAttribute('aria-current')
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
  })

  it('nút "‹" là liên kết về trang chủ', () => {
    renderPage()

    expect(screen.getByRole('link', { name: 'Quay lại trang chủ' })).toHaveAttribute('href', '/dashboard')
  })

  it('dưới tiêu đề bước đề xuất có dòng "Môn · Khối · mô tả" để cô biết AI đang đề xuất cho bài nào', async () => {
    const user = userEvent.setup()
    renderPage()
    await chooseGrade(user, 'GRADE_2')
    fireEvent.change(ideaBox(), { target: { value: 'Từ vựng tiếng Anh về màu sắc' } })
    await user.click(submit())
    await screen.findAllByRole('button', { name: /^Dùng kiểu này:/ })

    expect(screen.getByText('Tiếng Anh · Lớp 2 · Từ vựng tiếng Anh về màu sắc')).toBeInTheDocument()
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

    expect(await screen.findByRole('heading', { name: 'AI đề xuất kiểu chơi cho bài này' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Ý tưởng bài học')).toBeNull() // đã rời bước mô tả
  })
})

describe('Tạo game mới: AI đề xuất loại game', () => {
  it('mỗi lần hiện tối đa 3 thẻ: tên loại, lý do và cách chơi; thẻ đầu "Phù hợp nhất", các thẻ khác "Lựa chọn khác"; không còn ô tick', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user)

    const all = cards()
    expect(all).toHaveLength(Math.min(3, rankGameTypes({ idea: IDEA, gradeLevel: '', subject: '' }).length))
    expect(screen.getAllByText('Phù hợp nhất')).toHaveLength(1)
    expect(screen.getAllByText('Lựa chọn khác')).toHaveLength(all.length - 1)
    expect(screen.getAllByText(/Cách chơi:/)).toHaveLength(all.length)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /Chơi thử/ })).toBeNull()
  })

  it('thẻ theo thứ tự độ phù hợp giảm dần; "Đề xuất kiểu khác" lật sang các đề xuất còn lại (không gọi lại AI), không loại nào bị ẩn', async () => {
    mockedSuggest.mockResolvedValue(rankGameTypes({ idea: 'Chữ cái tiếng Việt cho bé', gradeLevel: 'KINDERGARTEN', subject: 'VIETNAMESE' }))
    const user = userEvent.setup()
    renderPage()
    await toSuggestions(user, 'Chữ cái tiếng Việt cho bé')

    const expected = rankGameTypes({ idea: 'Chữ cái tiếng Việt cho bé', gradeLevel: 'KINDERGARTEN', subject: 'VIETNAMESE' }).map((item) => gameTypeLabel(item.type))
    expect(expected.length).toBeGreaterThan(3)
    const label = (card: HTMLElement) => card.getAttribute('aria-label')?.replace('Dùng kiểu này: ', '')
    const firstPage = cards().map(label)

    expect(firstPage).toEqual(expected.slice(0, 3))
    await user.click(screen.getByRole('button', { name: 'Đề xuất kiểu khác' }))
    expect(cards().map(label)).toEqual(expected.slice(3, 6))
    // Thẻ đầu trang sau không phải "Phù hợp nhất".
    expect(screen.queryByText('Phù hợp nhất')).toBeNull()
    expect(mockedSuggest).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Đề xuất kiểu khác' }))
    expect(cards().map(label)).toEqual(firstPage)
  })

  it('lý do trên thẻ gắn với mục tiêu học (đếm số)', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user, 'Đếm số lượng con vật')

    const all = rankGameTypes({ idea: 'Đếm số lượng con vật', gradeLevel: '', subject: '' })
    const reason = 'Bé nối nhóm 3 con vật với số 3, rèn quan hệ giữa số lượng và chữ số.'
    const page = all.findIndex((item) => item.reason === reason)

    for (let index = 0; index < Math.floor(page / 3); index += 1) await user.click(screen.getByRole('button', { name: 'Đề xuất kiểu khác' }))
    expect(screen.getByText(reason)).toBeInTheDocument()
  })

  it('"Tạo ngẫu nhiên" chưa biết mục tiêu học nên không thẻ nào được nhãn "Phù hợp nhất"', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(random())
    await screen.findAllByRole('button', { name: /^Dùng kiểu này:/ })

    expect(screen.queryByText('Phù hợp nhất')).toBeNull()
  })

  it('bước đề xuất luôn gắn nhãn "Dữ liệu mô phỏng" vì chưa có endpoint đề xuất thật, kể cả khi tắt mọi nhóm mô phỏng', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user)

    const step = within(screen.getByRole('region', { name: 'Các kiểu chơi AI đề xuất' }))
    expect(step.getByText('Dữ liệu mô phỏng')).toBeInTheDocument()
  })

  it('đang chờ AI thì hiện khung xương có thông báo cho trình đọc màn hình, chưa có thẻ nào', async () => {
    mockedSuggest.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(ideaBox(), { target: { value: IDEA } })
    await user.click(submit())

    expect(await screen.findByText('AI đang chọn loại trò chơi phù hợp...')).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /^Dùng kiểu này:/ })).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Sửa mô tả' })).toBeEnabled()
  })

  it('"Sửa mô tả" giữ nguyên mô tả, khối lớp và môn đã nhập, tiêu điểm về ô mô tả', async () => {
    const user = userEvent.setup()
    renderPage()
    await chooseGrade(user, 'GRADE_2')
    await toSuggestions(user)

    await user.click(screen.getByRole('button', { name: 'Sửa mô tả' }))

    expect(ideaBox()).toHaveValue(IDEA)
    expect(btn('Lớp 2')).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(ideaBox()).toHaveFocus())
  })

  it('"Tạo ngẫu nhiên" cũng sang bước đề xuất và nói rõ AI sẽ chọn chủ đề', async () => {
    const user = userEvent.setup()
    renderPage()
    await pick(user, 'GRADE_1', 'MATH')

    await user.click(random())

    await screen.findAllByRole('button', { name: /^Dùng kiểu này:/ })
    expect(screen.getByText(/AI sẽ tự chọn chủ đề phù hợp/)).toBeInTheDocument()
    expect(mockedSuggest).toHaveBeenCalledWith({ idea: '', gradeLevel: 'GRADE_1', subject: 'MATH' })
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

    expect((await screen.findAllByRole('button', { name: /^Dùng kiểu này:/ })).length).toBeGreaterThanOrEqual(3)
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
    expect(screen.getByRole('button', { name: 'Sửa mô tả' })).toBeEnabled()
  })

  it('chuyển sang bước đề xuất thì tiêu điểm vào tiêu đề của bước', async () => {
    const user = userEvent.setup()
    renderPage()

    await toSuggestions(user)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'AI đề xuất kiểu chơi cho bài này' })).toHaveFocus(),
    )
  })
})
