import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAiConfigVersion, getAiConfig, getBlockedWords, type AiConfigVersion } from '../../services/adminService'
import AIConfigPage from './AIConfigPage'

vi.mock('../../services/adminService', () => ({
  getAiConfig: vi.fn(),
  createAiConfigVersion: vi.fn(),
  freezeAiConfigVersion: vi.fn(),
  activateAiConfigVersion: vi.fn(),
  getBlockedWords: vi.fn(),
  replaceBlockedWords: vi.fn(),
}))

const current: AiConfigVersion = {
  versionId: 'current',
  label: 'Phiên bản trước',
  systemPrompt: 'Hướng dẫn cũ',
  temperature: 0.3,
  maxTokens: 2000,
  moderationThreshold: 0.85,
  sha256: 'existing-sha',
  createdAt: '2026-11-24T08:00:00Z',
  createdBy: 'admin',
  active: true,
  frozen: false,
}

describe('AIConfigPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getAiConfig).mockResolvedValue({ active: current, versions: [current] })
    vi.mocked(getBlockedWords).mockResolvedValue({ words: [] })
  })

  it.each([
    {
      status: 400,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: { temperature: 'Temperature tối đa là 1.0' },
      },
      notice: 'Temperature tối đa là 1.0',
    },
    {
      status: 500,
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' },
      notice: 'Không thể lưu cài đặt vào lúc này. Vui lòng thử lại sau.',
    },
  ])('keeps the current version and the draft when saving returns $status', async ({ status, error, notice }) => {
    vi.mocked(createAiConfigVersion).mockRejectedValue({
      isAxiosError: true,
      response: { status, data: { success: false, error } },
    })
    const user = userEvent.setup()
    render(<AIConfigPage />)
    await screen.findByText(current.sha256)
    const prompt = screen.getByLabelText(/system instruction/i)
    await user.clear(prompt)
    await user.type(prompt, 'Hướng dẫn mới')
    await user.click(screen.getByRole('button', { name: 'Lưu Thành Phiên Bản Mới & Áp Dụng' }))

    expect(await screen.findByText(notice)).toBeVisible()
    expect(screen.getByText(current.sha256)).toBeVisible()
    expect(prompt).toHaveValue('Hướng dẫn mới')
    expect(getAiConfig).toHaveBeenCalledTimes(1)
  })
})
