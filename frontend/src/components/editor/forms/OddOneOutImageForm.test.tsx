import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { OddOneOutQuestion, QuestionDsl } from '../../../types/game-dsl.types'
import { getNotoCatalog } from '../../../api/notoCatalogApi'
import OddOneOutImageForm from './OddOneOutImageForm'

vi.mock('../../../api/notoCatalogApi', () => ({ getNotoCatalog: vi.fn() }))
beforeEach(() => vi.clearAllMocks())

it('cho giáo viên xem hình và sửa tiêu chí hoặc chọn đáp án', async () => {
  const initial: OddOneOutQuestion = { id: 'q1', timeLimitSeconds: 30, points: 10,
    questionText: 'Hình nào khác?', oddOneOutId: 'd',
    items: ['Táo', 'Chuối', 'Nho', 'Cà rốt'].map((text, i) => ({ id: String.fromCharCode(97 + i), text,
      assetId: `item-${i}`, imageUrl: `/assets/noto/${i}.svg` })) }
  function Harness() {
    const [question, setQuestion] = useState<QuestionDsl>(initial)
    return <><OddOneOutImageForm gameType="ODD_ONE_OUT" question={question} issues={[]}
      onUpdate={(update) => setQuestion(update)} /><output data-testid="saved-question">{(question as OddOneOutQuestion).questionText}</output></>
  }
  render(<Harness />)
  expect(screen.getAllByRole('img')).toHaveLength(4)
  fireEvent.change(screen.getByLabelText(/Tiêu chí câu hỏi/), { target: { value: 'Hình nào không phải trái cây?' } })
  expect(screen.getByLabelText(/Tiêu chí câu hỏi/)).toHaveValue('Hình nào không phải trái cây?')
  fireEvent.blur(screen.getByLabelText(/Tiêu chí câu hỏi/))
  await waitFor(() => expect(screen.getByTestId('saved-question')).toHaveTextContent('Hình nào không phải trái cây?'))
  fireEvent.click(screen.getByLabelText('Đáp án khác loại: Táo'))
  expect(screen.getByLabelText('Đáp án khác loại: Táo')).toBeChecked()
})

it('hiển thị lỗi tiêu chí ngay tại ô nhập cho giáo viên', () => {
  const question: OddOneOutQuestion = { id: 'q1', timeLimitSeconds: 30, points: 10,
    questionText: '', oddOneOutId: 'd', items: [] }
  render(<OddOneOutImageForm gameType="ODD_ONE_OUT" question={question}
    issues={[{ questionIndex: 0, field: 'questionText', code: 'required', message: 'Câu 1: hãy nhập tiêu chí.' }]}
    onUpdate={() => {}} />)
  const input = screen.getByLabelText(/Tiêu chí câu hỏi/)
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input).toHaveAccessibleDescription('Hãy nhập tiêu chí.')
})

it('hiển thị lỗi đáp án tại nhóm hình', () => {
  const question: OddOneOutQuestion = { id: 'q1', timeLimitSeconds: 30, points: 10,
    questionText: 'Hình nào khác?', oddOneOutId: '', items: [] }
  render(<OddOneOutImageForm gameType="ODD_ONE_OUT" question={question}
    issues={[{ questionIndex: 0, field: 'oddOneOutId', code: 'noOddOne', message: 'Câu 1: hãy chọn mục khác loại.' }]}
    onUpdate={() => {}} />)
  expect(screen.getByText('Hãy chọn mục khác loại.')).toBeInTheDocument()
})

it('đổi hình bằng catalog, giữ mã lựa chọn và không cho chọn ảnh đã dùng', async () => {
  vi.mocked(getNotoCatalog).mockResolvedValueOnce([
    { id: 'apple', label: 'Táo', group: 'fruit', imageUrl: '/assets/noto/apple.svg' },
    { id: 'banana', label: 'Chuối', group: 'fruit', imageUrl: '/assets/noto/banana.svg' },
    { id: 'grapes', label: 'Nho', group: 'fruit', imageUrl: '/assets/noto/grapes.svg' },
    { id: 'carrot', label: 'Cà rốt', group: 'vegetable', imageUrl: '/assets/noto/carrot.svg' },
    { id: 'strawberry', label: 'Dâu tây', group: 'fruit', imageUrl: '/assets/noto/strawberry.svg' },
  ])
  const initial: OddOneOutQuestion = { id: 'q1', timeLimitSeconds: 30, points: 10,
    questionText: 'Hình nào không phải trái cây?', oddOneOutId: 'd', items: [
      { id: 'a', text: 'Táo', assetId: 'apple', imageUrl: '/assets/noto/apple.svg' },
      { id: 'b', text: 'Chuối', assetId: 'banana', imageUrl: '/assets/noto/banana.svg' },
      { id: 'c', text: 'Nho', assetId: 'grapes', imageUrl: '/assets/noto/grapes.svg' },
      { id: 'd', text: 'Cà rốt', assetId: 'carrot', imageUrl: '/assets/noto/carrot.svg' },
    ] }
  function Harness() {
    const [question, setQuestion] = useState<QuestionDsl>(initial)
    return <><OddOneOutImageForm gameType="ODD_ONE_OUT" question={question} issues={[]}
      onUpdate={(update) => setQuestion(update)} /><output data-testid="question-json">{JSON.stringify(question)}</output></>
  }
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Thay ảnh từ thư viện' }))
  const select = await screen.findByLabelText('Thay ảnh: Táo')
  expect(select.querySelector('option[value="banana"]')).toBeDisabled()
  fireEvent.change(select, { target: { value: 'strawberry' } })
  const edited = JSON.parse(screen.getByTestId('question-json').textContent!) as OddOneOutQuestion
  expect(edited.oddOneOutId).toBe('d')
  expect(edited.items[0]).toEqual({ id: 'a', text: 'Dâu tây', assetId: 'strawberry', imageUrl: '/assets/noto/strawberry.svg' })
  fireEvent.change(screen.getByLabelText('Thay ảnh: Dâu tây'), { target: { value: 'banana' } })
  const afterDuplicate = JSON.parse(screen.getByTestId('question-json').textContent!) as OddOneOutQuestion
  expect(afterDuplicate.items[0].assetId).toBe('strawberry')
})

it('cho thử tải lại catalog khi mạng lỗi', async () => {
  vi.mocked(getNotoCatalog).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
  const question: OddOneOutQuestion = { id: 'q1', timeLimitSeconds: 30, points: 10,
    questionText: 'Hình nào khác?', oddOneOutId: 'd', items: [] }
  render(<OddOneOutImageForm gameType="ODD_ONE_OUT" question={question} issues={[]} onUpdate={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Thay ảnh từ thư viện' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được thư viện ảnh')
  fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại' }))
  await waitFor(() => expect(getNotoCatalog).toHaveBeenCalledTimes(2))
})
