import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockGameContents } from '../../../services/mock/gameFixtures'
import { setMockScenario } from '../../../services/mock/mockRuntime'
import CommonFieldsHarness from '../../../test/CommonFieldsHarness'
import { createPendingProbe, createQuestionStore } from '../../../test/probes'
import type { PendingProbe, QuestionStore } from '../../../test/probes'
import { makeFile, mp3File, PNG_BYTES, pngFile, trackBlobUrls } from '../../../test/mediaFiles'
import type { BlobUrlTracker } from '../../../test/mediaFiles'
import type { QuestionDsl } from '../../../types/game-dsl.types'

// Nguyên văn theo SRS UC-05.
const INVALID_FILE =
  'Tệp tải lên không đúng định dạng hỗ trợ (Ảnh cần là dạng PNG/JPG/WebP dưới 5MB, âm thanh thuyết minh cần là dạng MP3 dưới 10MB). Vui lòng chọn tệp tin khác.'
const UNSAFE_FILE = 'Tệp tải lên không đáp ứng tiêu chuẩn an toàn nội dung dành cho môi trường giáo dục. Vui lòng chọn tệp khác.'

const baseQuestion = (): QuestionDsl => structuredClone(buildMockGameContents().find((game) => game.gameType === 'QUIZ')!.questions[0])

let urls: BlobUrlTracker
let store: QuestionStore
let pending: PendingProbe

function renderForm(initial: Partial<QuestionDsl> = {}) {
  const question = { ...baseQuestion(), ...initial } as QuestionDsl

  store = createQuestionStore(question)
  pending = createPendingProbe()

  return render(<CommonFieldsHarness initial={question} store={store} pending={pending} />)
}

// `applyAccept: false`: hộp chọn tệp của trình duyệt cho đổi sang "Tất cả tệp", nên phải thử cả tệp không khớp thuộc tính accept.
const newUser = () => userEvent.setup({ applyAccept: false })
const imageInput = () => screen.getByLabelText('Tải ảnh lên')
const audioInput = () => screen.getByLabelText('Tải âm thanh lên')
const confirmButton = () => screen.getByRole('button', { name: 'Xác nhận tải lên' })

beforeEach(() => {
  // Chỉ nhóm media mô phỏng: dịch vụ giả lập tải tệp (độ trễ 0 đã đặt trong test-setup), còn lại không đụng tới.
  vi.stubEnv('VITE_USE_MOCK', 'media')
  urls = trackBlobUrls()
})
afterEach(() => {
  urls.restore()
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
})

describe('tải ảnh (UC-05 luồng 1a)', () => {
  it('chọn tệp -> hiện tên, dung lượng, ảnh xem trước nhưng CHƯA đổi câu; bấm xác nhận thì gắn ảnh mới vào câu và giải phóng ảnh xem trước', async () => {
    const user = newUser()

    renderForm({ imageUrl: undefined })
    await user.upload(imageInput(), pngFile('meo-con.png'))

    expect(await screen.findByText('meo-con.png')).toBeInTheDocument()
    expect(screen.getByText('(1 KB)')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Xem trước ảnh đã chọn' })).toHaveAttribute('src', urls.created[0])
    expect(store.get().imageUrl).toBeUndefined()

    await user.click(confirmButton())

    await waitFor(() => expect(store.get().imageUrl).toBe(urls.created[1]))
    expect(await screen.findByRole('img', { name: 'Ảnh minh họa hiện tại' })).toHaveAttribute('src', urls.created[1])
    expect(screen.queryByRole('button', { name: 'Xác nhận tải lên' })).not.toBeInTheDocument()
    // Ảnh xem trước đã được trả lại, ảnh vừa tải lên (đang dùng trong câu) thì chưa.
    expect(urls.revoked).toContain(urls.created[0])
    expect(urls.revoked).not.toContain(urls.created[1])
    expect(pending.active).toBe(0)
    expect(pending.begun).toBe(1)
  })

  it('có sẵn ảnh thì nút đổi thành "Đổi ảnh"; thay ảnh xong câu giữ các trường khác; "Xóa ảnh" gỡ hẳn trường imageUrl', async () => {
    const user = newUser()

    renderForm({ imageUrl: '/mock/dog.png', points: 15 })

    expect(screen.getByRole('img', { name: 'Ảnh minh họa hiện tại' })).toHaveAttribute('src', '/mock/dog.png')
    expect(screen.queryByRole('button', { name: 'Tải ảnh lên' })).not.toBeInTheDocument()

    await user.upload(imageInput(), pngFile())
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }))
    await waitFor(() => expect(store.get().imageUrl).toBe(urls.created[1]))
    expect(store.get().points).toBe(15)

    await user.click(screen.getByRole('button', { name: 'Xóa ảnh' }))

    expect('imageUrl' in store.get()).toBe(false)
    expect(screen.getByText('Chưa có ảnh')).toBeInTheDocument()
  })

  it('mỗi ô chỉ nhận đúng loại: ảnh vào ô ảnh (ảnh JPG, WebP cũng được), MP3 vào ô âm thanh', async () => {
    const user = newUser()

    renderForm()
    await user.upload(audioInput(), mp3File('xin-chao.mp3'))
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }))

    await waitFor(() => expect(store.get().audioUrl).toBe(urls.created[0]))
    await waitFor(() => expect(document.querySelector('audio')).toHaveAttribute('src', urls.created[0]))
    expect(store.get().imageUrl).toBeUndefined()
  })
})

describe('tiêu điểm bàn phím', () => {
  it('chọn tệp xong thì tiêu điểm sang "Xác nhận tải lên" (nút "Tải ảnh lên" đã bị thay), tải xong thì về nút "Đổi ảnh"', async () => {
    const user = newUser()

    renderForm({ imageUrl: undefined })
    await user.upload(imageInput(), pngFile())
    await waitFor(() => expect(confirmButton()).toHaveFocus())
    expect(confirmButton()).toHaveAccessibleDescription(/meo.png/)

    await user.keyboard('{Enter}')

    await waitFor(() => expect(screen.getByRole('button', { name: 'Đổi ảnh' })).toHaveFocus())
  })

  it('"Xóa ảnh" xong thì tiêu điểm về nút "Tải ảnh lên"; lỗi tải thì về nút "Xác nhận tải lên" để thử lại', async () => {
    const user = newUser()

    renderForm({ imageUrl: '/mock/dog.png' })
    await user.click(screen.getByRole('button', { name: 'Xóa ảnh' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tải ảnh lên' })).toHaveFocus())

    await user.upload(imageInput(), pngFile('anh-nsfw.png'))
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }))
    await screen.findByRole('alert')
    await waitFor(() => expect(confirmButton()).toHaveFocus())
  })

  it('"Chọn tệp khác" trả lại ảnh xem trước và đưa tiêu điểm về nút tải tệp', async () => {
    const user = newUser()

    renderForm()
    await user.upload(imageInput(), pngFile())
    await user.click(await screen.findByRole('button', { name: 'Chọn tệp khác' }))

    expect(urls.revoked).toContain(urls.created[0])
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tải ảnh lên' })).toHaveFocus())
  })
})

describe('tệp sai định dạng hoặc quá lớn (UC-05 luồng 3a)', () => {
  const rejectedFiles: Array<[string, () => File, 'image' | 'audio']> = [
    ['tệp thực thi đổi tên thành .png', () => makeFile([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0], 'dep.png', 'image/png'), 'image'],
    ['SVG', () => makeFile('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'hinh.svg', 'image/svg+xml'), 'image'],
    ['SVG đặt tên .png', () => makeFile('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'hinh.png', 'image/png'), 'image'],
    ['MP3 bỏ vào ô ảnh', () => mp3File(), 'image'],
    ['ảnh bỏ vào ô âm thanh', () => pngFile(), 'audio'],
    ['tệp rỗng', () => makeFile([], 'trong.png', 'image/png'), 'image'],
    ['ảnh quá 5MB', () => new File([new Uint8Array([...PNG_BYTES, ...new Array(5 * 1024 * 1024).fill(0)])], 'to.png', { type: 'image/png' }), 'image'],
  ]

  it.each(rejectedFiles)('%s: hiện đúng câu của SRS, không chọn tệp nào và GIỮ NGUYÊN ảnh/âm thanh đang có', async (_name, makeBad, kind) => {
    const user = newUser()

    renderForm({ imageUrl: '/mock/dog.png', audioUrl: '/mock/q1.wav' })
    await user.upload(kind === 'image' ? imageInput() : audioInput(), makeBad())

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent(INVALID_FILE)
    expect(alert).toHaveTextContent(kind === 'image' ? 'Ảnh hiện tại vẫn được giữ nguyên.' : 'Âm thanh hiện tại vẫn được giữ nguyên.')
    expect(screen.queryByRole('button', { name: 'Xác nhận tải lên' })).not.toBeInTheDocument()
    expect(store.get().imageUrl).toBe('/mock/dog.png')
    expect(store.get().audioUrl).toBe('/mock/q1.wav')
    // Không tạo đường dẫn nào cho tệp bị từ chối (không xem trước, không tải).
    expect(urls.created).toHaveLength(0)
    expect(pending.begun).toBe(0)
  })

  it('chọn tệp hợp lệ sau tệp sai thì thông báo lỗi biến mất; chọn tệp sai sau tệp hợp lệ thì bỏ lựa chọn cũ và trả lại ảnh xem trước', async () => {
    const user = newUser()

    renderForm()
    await user.upload(imageInput(), makeFile('không phải ảnh', 'a.png'))
    expect(await screen.findByRole('alert')).toHaveTextContent(INVALID_FILE)

    await user.upload(imageInput(), pngFile('tot.png'))
    expect(await screen.findByText('tot.png')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.upload(imageInput(), makeFile('lại sai', 'b.png'))
    expect(await screen.findByRole('alert')).toHaveTextContent(INVALID_FILE)
    expect(screen.queryByText('tot.png')).not.toBeInTheDocument()
    expect(urls.revoked).toContain(urls.created[0])
  })
})

describe('tệp không an toàn hoặc lỗi mạng (UC-05 luồng 3b)', () => {
  it('rà an toàn không đạt: đúng câu 3b, GIỮ ảnh cũ, giữ lựa chọn để giáo viên chọn tệp khác rồi tải lại thành công', async () => {
    const user = newUser()

    renderForm({ imageUrl: '/mock/dog.png' })
    await user.upload(imageInput(), pngFile('anh-nsfw.png'))
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }))

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent(UNSAFE_FILE)
    expect(alert).toHaveTextContent('Ảnh hiện tại vẫn được giữ nguyên.')
    expect(store.get().imageUrl).toBe('/mock/dog.png')
    // Tệp bị từ chối không để lại đường dẫn nào ngoài ảnh xem trước (đã còn đó để giáo viên nhìn).
    expect(urls.created).toHaveLength(1)
    expect(pending.active).toBe(0)

    await user.click(screen.getByRole('button', { name: 'Chọn tệp khác' }))
    await user.upload(imageInput(), pngFile('meo-hien.png'))
    expect(await screen.findByText('meo-hien.png')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(confirmButton())
    await waitFor(() => expect(store.get().imageUrl).not.toBe('/mock/dog.png'))
    expect(store.get().imageUrl).toMatch(/^blob:/)
  })

  it('mất mạng giữa chừng: báo lỗi, giữ ảnh cũ, cho thử lại và thử lại được khi mạng ổn', async () => {
    const user = newUser()

    renderForm({ audioUrl: '/mock/q1.wav' })
    await user.upload(audioInput(), mp3File())
    setMockScenario('error')
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }))

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.')
    expect(alert).toHaveTextContent('Âm thanh hiện tại vẫn được giữ nguyên.')
    expect(store.get().audioUrl).toBe('/mock/q1.wav')
    expect(pending.active).toBe(0)

    setMockScenario('normal')
    await user.click(confirmButton())
    await waitFor(() => expect(store.get().audioUrl).toMatch(/^blob:/))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('quá thời gian chờ: câu "phản hồi quá chậm"', async () => {
    const user = newUser()

    renderForm()
    await user.upload(imageInput(), pngFile())
    setMockScenario('timeout')
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ phản hồi quá chậm. Hãy thử lại sau ít phút.')
  })
})

describe('công cụ mô phỏng', () => {
  it('có nhãn "Dữ liệu mô phỏng" khi nhóm media mô phỏng, và KHÔNG có gợi ý ảnh hay giọng đọc khi dùng backend thật', () => {
    const { unmount } = renderForm()

    expect(screen.getAllByText('Dữ liệu mô phỏng').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('heading', { name: 'Gợi ý ảnh' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Giọng đọc' })).toBeInTheDocument()
    unmount()

    vi.stubEnv('VITE_USE_MOCK', 'none')
    renderForm()

    expect(screen.queryByText('Dữ liệu mô phỏng')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Gợi ý ảnh' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Giọng đọc' })).not.toBeInTheDocument()
    // Tải tệp lên thì luôn có.
    expect(screen.getByRole('button', { name: 'Tải ảnh lên' })).toBeInTheDocument()
  })

  it('gợi ý ảnh: chưa có mô tả hình ảnh thì khóa nút, nói rõ cần nhập gì và ghi chú bộ lọc SafeSearch', () => {
    renderForm({ visualPrompt: undefined })

    const search = screen.getByRole('button', { name: 'Gợi ý ảnh theo mô tả' })

    expect(search).toBeDisabled()
    expect(screen.getByText('Nhập "Mô tả hình ảnh" ở trên để nhận gợi ý.')).toBeInTheDocument()
    expect(screen.getByText('Chỉ gợi ý ảnh đã qua bộ lọc an toàn Pexels SafeSearch.')).toBeInTheDocument()
  })

  it('gợi ý ảnh theo mô tả "con mèo": hiện ảnh mèo, chọn một ảnh thì imageUrl là đường dẫn của ảnh đó', async () => {
    const user = newUser()

    renderForm({ visualPrompt: 'con mèo', imageUrl: '/mock/dog.png' })
    await user.click(screen.getByRole('button', { name: 'Gợi ý ảnh theo mô tả' }))

    expect(await screen.findByRole('img', { name: 'Con mèo' })).toHaveAttribute('src', '/mock/cat.png')
    expect(screen.getAllByText('Nguồn: Pexels (mô phỏng)')).toHaveLength(2)
    // Chỉ xem: chưa chọn thì câu chưa đổi.
    expect(store.get().imageUrl).toBe('/mock/dog.png')

    await user.click(screen.getByRole('button', { name: 'Dùng ảnh này: Con mèo' }))

    expect(store.get().imageUrl).toBe('/mock/cat.png')
    expect(pending.begun).toBe(0)
  })

  it('gợi ý ảnh không có kết quả hoặc lỗi mạng thì nói rõ', async () => {
    const user = newUser()

    renderForm({ visualPrompt: 'con mèo' })
    setMockScenario('empty')
    await user.click(screen.getByRole('button', { name: 'Gợi ý ảnh theo mô tả' }))
    expect(await screen.findByText('Chưa có ảnh phù hợp. Hãy đổi mô tả hình ảnh.')).toBeInTheDocument()

    setMockScenario('error')
    await user.click(screen.getByRole('button', { name: 'Gợi ý ảnh theo mô tả' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ')
  })

  it('giọng đọc: mặc định nữ, chọn nam rồi tạo giọng đọc từ lời đọc thì âm thanh gắn vào câu kèm giọng đã chọn', async () => {
    const user = newUser()

    renderForm({ audioText: 'Có mấy quả táo?' })

    expect(screen.getByRole('radio', { name: 'Giọng nữ' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Giọng nam' }))
    expect(screen.getByRole('radio', { name: 'Giọng nam' })).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Tạo giọng đọc từ lời đọc' }))

    await waitFor(() => expect(store.get().audioUrl).toBe('/mock/q1.wav?voice=MALE'))
    expect(pending.active).toBe(0)
    expect(pending.begun).toBe(1)
  })

  it('không có lời đọc thì chưa tạo được giọng đọc và có lời nhắn rõ ràng', () => {
    renderForm({ audioText: undefined })

    expect(screen.getByRole('button', { name: 'Tạo giọng đọc từ lời đọc' })).toBeDisabled()
    expect(screen.getByText('Nhập "Lời đọc" ở trên để tạo giọng đọc.')).toBeInTheDocument()
  })

  it('tạo giọng đọc lỗi: báo lỗi, giữ âm thanh cũ', async () => {
    const user = newUser()

    renderForm({ audioText: 'Xin chào', audioUrl: '/mock/q1.wav' })
    setMockScenario('error')
    await user.click(screen.getByRole('button', { name: 'Tạo giọng đọc từ lời đọc' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ')
    expect(store.get().audioUrl).toBe('/mock/q1.wav')
  })
})
