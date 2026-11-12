import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { REVISE_INSTRUCTION_MAX } from '../../constants/aiLimits'
import { viText } from '../../constants/viText'
import { reviseGame } from '../../services/reviseService'
import ReviseChatPanel from './ReviseChatPanel'

vi.mock('../../services/reviseService', () => ({ reviseGame: vi.fn() }))

const mocked = vi.mocked(reviseGame)
const t = viText.reviseChat

beforeEach(() => {
  mocked.mockReset()
})

describe('ReviseChatPanel', () => {
  it('chưa lưu xong thì không gửi được và đọc lý do cho trình đọc màn hình', () => {
    render(<ReviseChatPanel gameId="g1" blockedReason={t.waitSave} onRevised={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent(t.waitSave)
    expect(screen.getByRole('button', { name: viText.chat.send })).toBeDisabled()
  })

  it('ô nhắn giới hạn đúng 500 ký tự như máy chủ', () => {
    render(<ReviseChatPanel gameId="g1" blockedReason={null} onRevised={vi.fn()} />)
    expect(screen.getByLabelText(t.inputLabel)).toHaveAttribute('maxlength', String(REVISE_INSTRUCTION_MAX))
  })

  it('lỗi rồi bị khóa (cô đang sửa tay) thì bấm Thử lại không gửi lại', async () => {
    mocked.mockRejectedValue(new Error('down'))
    const { rerender } = render(<ReviseChatPanel gameId="g1" blockedReason={null} onRevised={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(t.inputLabel), { target: { value: 'dễ hơn' } })
    fireEvent.click(screen.getByRole('button', { name: viText.chat.send }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    rerender(<ReviseChatPanel gameId="g1" blockedReason={t.waitSave} onRevised={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: viText.chat.retry }))
    expect(mocked).toHaveBeenCalledTimes(1)
  })
})
