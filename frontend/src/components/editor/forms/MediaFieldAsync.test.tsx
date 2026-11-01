import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UploadedMedia, UploadOptions } from '../../../api/mediaApi'
import { mockApiError } from '../../../services/mock/mockErrors'
import { uploadMedia, synthesizeSpeech } from '../../../services/mediaService'
import { buildMockGameContents } from '../../../services/mock/gameFixtures'
import CommonFieldsHarness from '../../../test/CommonFieldsHarness'
import { createPendingProbe, createQuestionStore } from '../../../test/probes'
import type { PendingProbe, QuestionStore } from '../../../test/probes'
import { mp3File, pngFile, trackBlobUrls } from '../../../test/mediaFiles'
import type { BlobUrlTracker } from '../../../test/mediaFiles'
import type { QuestionDsl } from '../../../types/game-dsl.types'
import { checkMediaFile } from '../../../utils/mediaFile'
import { setPoints } from './commonEditing'

// Thời điểm kết thúc của tải tệp và tạo giọng đọc do test điều khiển, để thử các tình huống chậm, hủy và đóng form giữa chừng.
vi.mock('../../../services/mediaService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/mediaService')>()),
  uploadMedia: vi.fn(),
  synthesizeSpeech: vi.fn(),
  mediaToolsAvailable: () => true,
}))

// Kiểm tra byte đầu mặc định chạy thật; test nào cần điều khiển thời điểm xong thì đặt `mockImplementationOnce`.
vi.mock('../../../utils/mediaFile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/mediaFile')>()

  return { ...actual, checkMediaFile: vi.fn(actual.checkMediaFile) }
})

const mockedCheck = vi.mocked(checkMediaFile)
const mockedUpload = vi.mocked(uploadMedia)
const mockedSpeech = vi.mocked(synthesizeSpeech)

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const baseQuestion = (): QuestionDsl => structuredClone(buildMockGameContents().find((game) => game.gameType === 'QUIZ')!.questions[0])

let urls: BlobUrlTracker
let store: QuestionStore
let pending: PendingProbe
// Phần chạy của lần tải đang chờ (để test đọc tín hiệu hủy, báo tiến trình, hoặc kết thúc).
let upload: { options: UploadOptions; done: ReturnType<typeof deferred<UploadedMedia>> }

function renderForm(initial: Partial<QuestionDsl> = {}) {
  const question = { ...baseQuestion(), ...initial } as QuestionDsl

  store = createQuestionStore(question)
  pending = createPendingProbe()

  return render(
    <CommonFieldsHarness
      initial={question}
      store={store}
      pending={pending}
      extraPatch={{ label: 'Sửa điểm', apply: (value) => setPoints(value, 99) }}
    />,
  )
}

const newUser = () => userEvent.setup({ applyAccept: false })
const imageInput = () => screen.getByLabelText('Tải ảnh lên')

async function startUpload(user: ReturnType<typeof newUser>, name = 'meo.png') {
  await user.upload(imageInput(), pngFile(name))
  await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }))
  await waitFor(() => expect(mockedUpload).toHaveBeenCalled())
}

beforeEach(() => {
  urls = trackBlobUrls()
  mockedUpload.mockImplementation((_file, _kind, options = {}) => {
    upload = { options, done: deferred<UploadedMedia>() }

    return upload.done.promise
  })
})
afterEach(() => {
  urls.restore()
  vi.clearAllMocks()
})

describe('tải tệp đang chạy', () => {
  it('hiện tiến trình thật (thanh tiến trình có giá trị), đủ 100% thì chuyển sang "Đang kiểm tra an toàn nội dung"; trong lúc đó khóa Lưu/Chơi thử', async () => {
    const user = newUser()

    renderForm()
    await startUpload(user)

    expect(screen.getByText('Đang tải lên')).toBeInTheDocument()
    expect(pending.active).toBe(1)

    upload.options.onProgress?.(40)
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40'))
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.queryByText('Đang kiểm tra an toàn nội dung')).not.toBeInTheDocument()

    upload.options.onProgress?.(100)
    expect(await screen.findByText('Đang kiểm tra an toàn nội dung')).toBeInTheDocument()
    expect(pending.active).toBe(1)

    upload.done.resolve({ mediaUrl: urls.created[0], mediaType: 'IMAGE' })
    await waitFor(() => expect(store.get().imageUrl).toBe(urls.created[0]))
    expect(pending.active).toBe(0)
  })

  it('khi thanh tiến trình hiện, nút "Hủy tải lên" nhận tiêu điểm; hủy xong tiêu điểm về nút xác nhận', async () => {
    const user = newUser()

    renderForm()
    await startUpload(user)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Hủy tải lên' })).toHaveFocus())
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xác nhận tải lên' })).toHaveFocus())
  })

  it('bấm xác nhận hai lần liên tiếp vẫn chỉ tải một lần', async () => {
    const user = newUser()

    renderForm()
    await user.upload(imageInput(), pngFile())
    await user.dblClick(await screen.findByRole('button', { name: 'Xác nhận tải lên' }))

    expect(mockedUpload).toHaveBeenCalledTimes(1)
    expect(pending.begun).toBe(1)
  })

  it('"Hủy tải lên": gửi tín hiệu hủy, mở khóa Lưu ngay, giữ ảnh cũ và lựa chọn, báo "Đã hủy tải lên."', async () => {
    const user = newUser()

    renderForm({ imageUrl: '/mock/dog.png' })
    await startUpload(user)
    await user.click(screen.getByRole('button', { name: 'Hủy tải lên' }))

    expect(upload.options.signal?.aborted).toBe(true)
    expect(pending.active).toBe(0)
    expect(screen.getByText('Đã hủy tải lên. Ảnh hiện tại vẫn được giữ nguyên.')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    // Còn lựa chọn cũ nên bấm xác nhận để tải lại được.
    expect(screen.getByRole('button', { name: 'Xác nhận tải lên' })).toBeInTheDocument()
    expect(store.get().imageUrl).toBe('/mock/dog.png')
  })

  it('kết quả về SAU khi đã hủy thì bị bỏ (không đổi câu) và đường dẫn vừa cấp được trả lại', async () => {
    const user = newUser()

    renderForm({ imageUrl: '/mock/dog.png' })
    await startUpload(user)
    await user.click(screen.getByRole('button', { name: 'Hủy tải lên' }))
    upload.done.resolve({ mediaUrl: 'blob:http://localhost/muon', mediaType: 'IMAGE' })

    await waitFor(() => expect(urls.revoked).toContain('blob:http://localhost/muon'))
    expect(store.get().imageUrl).toBe('/mock/dog.png')
  })

  it('đóng form (đổi sang câu khác, rời trang) giữa chừng: tự hủy, mở khóa, trả lại ảnh xem trước và không áp kết quả muộn', async () => {
    const user = newUser()
    const { unmount } = renderForm({ imageUrl: '/mock/dog.png' })

    await startUpload(user)
    expect(pending.active).toBe(1)

    unmount()

    expect(upload.options.signal?.aborted).toBe(true)
    expect(pending.active).toBe(0)
    expect(urls.revoked).toContain(urls.created[0])

    upload.done.resolve({ mediaUrl: 'blob:http://localhost/muon', mediaType: 'IMAGE' })
    await waitFor(() => expect(urls.revoked).toContain('blob:http://localhost/muon'))
    expect(store.get().imageUrl).toBe('/mock/dog.png')
  })

  it('tải xong chậm KHÔNG ghi đè sửa đổi khác: điểm sửa trong lúc chờ vẫn còn, ảnh mới được gắn thêm vào', async () => {
    const user = newUser()

    renderForm({ points: 10 })
    await startUpload(user)
    await user.click(screen.getByRole('button', { name: 'Sửa điểm' }))
    expect(store.get().points).toBe(99)

    upload.done.resolve({ mediaUrl: urls.created[0], mediaType: 'IMAGE' })

    await waitFor(() => expect(store.get().imageUrl).toBe(urls.created[0]))
    expect(store.get().points).toBe(99)
  })

  it('lỗi 422 từ máy chủ thật: FILE_TOO_LARGE_OR_INVALID_FORMAT ra câu 3a, UNSAFE_CONTENT ra câu 3b, mở khóa và giữ ảnh cũ', async () => {
    const user = newUser()

    renderForm({ imageUrl: '/mock/dog.png' })
    await startUpload(user)
    upload.done.reject(mockApiError(422, 'FILE_TOO_LARGE_OR_INVALID_FORMAT', 'x'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Tệp tải lên không đúng định dạng hỗ trợ (Ảnh cần là dạng PNG/JPG/WebP dưới 5MB')
    expect(pending.active).toBe(0)

    await user.click(screen.getByRole('button', { name: 'Xác nhận tải lên' }))
    await waitFor(() => expect(mockedUpload).toHaveBeenCalledTimes(2))
    upload.done.reject(mockApiError(422, 'UNSAFE_CONTENT', 'x'))

    expect(await screen.findByText(/Tệp tải lên không đáp ứng tiêu chuẩn an toàn nội dung dành cho môi trường giáo dục. Vui lòng chọn tệp khác./)).toBeInTheDocument()
    expect(store.get().imageUrl).toBe('/mock/dog.png')
  })
})

describe('tạo giọng đọc đang chạy', () => {
  const generate = (user: ReturnType<typeof newUser>) => user.click(screen.getByRole('button', { name: 'Tạo giọng đọc từ lời đọc' }))

  it('có nút hủy; hủy thì mở khóa, giữ âm thanh cũ và bỏ kết quả về muộn', async () => {
    const user = newUser()
    const pendingSpeech = deferred<{ mediaUrl: string; voice: 'FEMALE' }>()

    mockedSpeech.mockReturnValue(pendingSpeech.promise)
    renderForm({ audioText: 'Xin chào', audioUrl: '/mock/q1.wav' })
    await generate(user)

    expect((await screen.findAllByText('Đang tạo giọng đọc')).length).toBeGreaterThan(0)
    expect(pending.active).toBe(1)
    // Trong lúc tạo giọng đọc không tải tệp âm thanh khác chồng lên được.
    expect(screen.getByRole('button', { name: 'Đổi âm thanh' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Giọng nam' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(pending.active).toBe(0)

    pendingSpeech.resolve({ mediaUrl: '/mock/q1.wav?voice=FEMALE', voice: 'FEMALE' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo giọng đọc từ lời đọc' })).toBeEnabled())
    expect(store.get().audioUrl).toBe('/mock/q1.wav')
  })

  it('đang tải tệp ở CÙNG ô thì khóa công cụ của ô đó (tạo giọng đọc, gợi ý ảnh), tránh hai việc chạy chồng nhau', async () => {
    const user = newUser()

    renderForm({ audioText: 'Xin chào', visualPrompt: 'con mèo' })
    await user.upload(screen.getByLabelText('Tải âm thanh lên'), mp3File())
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }))
    await waitFor(() => expect(mockedUpload).toHaveBeenCalled())

    expect(screen.getByRole('button', { name: 'Tạo giọng đọc từ lời đọc' })).toBeDisabled()
    // Ô ảnh là việc khác nên không bị khóa theo.
    expect(screen.getByRole('button', { name: 'Gợi ý ảnh theo mô tả' })).toBeEnabled()

    upload.done.reject(new Error('dừng'))
  })

  it('đang tải ảnh thì khóa gợi ý ảnh của chính ô ảnh', async () => {
    const user = newUser()

    renderForm({ visualPrompt: 'con mèo' })
    await startUpload(user)

    expect(screen.getByRole('button', { name: 'Gợi ý ảnh theo mô tả' })).toBeDisabled()
  })
})

describe('kiểm tra tệp chạy dở', () => {
  const okCheck = { ok: true, format: 'png', mime: 'image/png' } as const

  it('chọn tệp B khi tệp A chưa kiểm tra xong: kết quả của A về muộn bị bỏ, chỉ còn tệp B và không rò ảnh xem trước', async () => {
    const user = newUser()
    const slow = deferred<Awaited<ReturnType<typeof checkMediaFile>>>()

    renderForm()
    mockedCheck.mockImplementationOnce(() => slow.promise)
    await user.upload(imageInput(), pngFile('a.png'))
    await user.upload(imageInput(), pngFile('b.png'))
    expect(await screen.findByText('b.png')).toBeInTheDocument()

    slow.resolve(okCheck)
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(screen.getByText('b.png')).toBeInTheDocument()
    expect(screen.queryByText('a.png')).not.toBeInTheDocument()
    // Chỉ ảnh xem trước của B được cấp; A không tạo ảnh xem trước nào.
    expect(urls.created).toHaveLength(1)
  })

  it('đóng form khi đang kiểm tra byte đầu: kết quả về muộn không tạo ảnh xem trước nào', async () => {
    const user = newUser()
    const slow = deferred<Awaited<ReturnType<typeof checkMediaFile>>>()
    const { unmount } = renderForm()

    mockedCheck.mockImplementationOnce(() => slow.promise)
    await user.upload(imageInput(), pngFile())
    unmount()
    slow.resolve(okCheck)
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(urls.created).toHaveLength(0)
  })
})
