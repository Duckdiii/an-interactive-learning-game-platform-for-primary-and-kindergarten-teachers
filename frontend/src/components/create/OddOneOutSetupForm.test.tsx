import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import OddOneOutSetupForm from './OddOneOutSetupForm'

it('cho giáo viên chọn tạo câu hỏi hình hoặc chữ', () => {
  const change = vi.fn()
  const create = vi.fn()
  render(<OddOneOutSetupForm mode="TEXT" onModeChange={change} onCreate={create} onCancel={vi.fn()} />)
  fireEvent.click(screen.getByLabelText('Tìm hình khác loại'))
  expect(change).toHaveBeenCalledWith('IMAGE')
  fireEvent.click(screen.getByRole('button', { name: 'Tạo trò chơi' }))
  expect(create).toHaveBeenCalledOnce()
})
