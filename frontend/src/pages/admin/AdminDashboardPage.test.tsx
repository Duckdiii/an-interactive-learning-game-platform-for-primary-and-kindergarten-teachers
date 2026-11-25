import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getBudgetConfig, getSystemStatus, getUsageReport, updateBudgetConfig } from '../../services/adminService'
import AdminDashboardPage from './AdminDashboardPage'

vi.mock('../../services/adminService', () => ({
  getBudgetConfig: vi.fn(),
  getSystemStatus: vi.fn(),
  getUsageReport: vi.fn(),
  updateBudgetConfig: vi.fn(),
}))

const reportRange = { from: '2026-11-18T00:00:00Z', to: '2026-11-24T12:00:00Z' }
const budget = { monthlyBudget: 100, yellowPct: 70, redPct: 90, costCapExceeded: false }

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getUsageReport).mockResolvedValue({ range: reportRange, services: [], timeseries: [] })
    vi.mocked(getBudgetConfig).mockResolvedValue(budget)
    vi.mocked(getSystemStatus).mockResolvedValue({
      server: { cpuUsagePercent: 25, heapUsagePercent: 36, activeThreads: 12 },
      database: { poolUsagePercent: 40 },
      liveArena: { activeSessions: 0, connectedClients: 0 },
    })
  })

  it('renders empty usage alongside actual system readings and lets the admin save a budget', async () => {
    vi.mocked(updateBudgetConfig).mockResolvedValue({ ...budget, monthlyBudget: 120 })
    render(<AdminDashboardPage />)

    expect(await screen.findByText('Chưa có dữ liệu lưu lượng')).toBeInTheDocument()
    expect(screen.getAllByText('Chưa có dữ liệu chi phí')).toHaveLength(2)
    expect(screen.getByText('25.0%')).toBeInTheDocument()
    expect(screen.getByText('40.0%')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cấu hình ngân sách' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Trần ngân sách tháng/), { target: { value: '120' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu cấu hình' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(updateBudgetConfig).toHaveBeenCalledWith({ monthlyBudget: 120, yellowPct: 70, redPct: 90 })
    expect(screen.getByText(/120\.00 USD/)).toBeInTheDocument()
  })

  it('keeps usage visible when infrastructure fails and applies both filters to the report', async () => {
    vi.mocked(getSystemStatus).mockRejectedValue(new Error('Unavailable'))
    vi.mocked(getBudgetConfig).mockResolvedValue({ ...budget, currentMonthCost: 92, budgetUsedPercent: 92 })
    vi.mocked(getUsageReport).mockImplementation(async (params) => ({
      range: reportRange,
      services: params?.service === 'TTS' ? [{
        service: 'TTS', requests: 5, successCount: 0, failureCount: 5, tokensUsed: null,
        quotaUsedPercent: null, cost: 0.08, costCurrency: 'USD', costSource: 'ESTIMATED', status: 'UNREACHABLE',
      }] : [],
      timeseries: params?.service === 'TTS' ? [{ date: '2026-11-24', requests: 5, cost: 0.08 }] : [],
    }))
    render(<AdminDashboardPage />)
    expect(await screen.findByText('Không thể tải chỉ số hạ tầng.')).toBeInTheDocument()
    expect(screen.getByText(/Cảnh báo đỏ/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Khoảng thời gian'), { target: { value: 'CUSTOM' } })
    fireEvent.change(screen.getByLabelText('Dịch vụ'), { target: { value: 'TTS' } })
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-11-20' } })
    expect(getUsageReport).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-11-24' } })

    expect(await screen.findByText('Không thể kết nối')).toBeInTheDocument()
    expect(screen.getByText('5 yêu cầu')).toBeInTheDocument()
    expect(screen.getByText('$0.08')).toBeInTheDocument()
    expect(getUsageReport).toHaveBeenLastCalledWith({
      range: 'CUSTOM', from: '2026-11-20T00:00:00Z', to: '2026-11-24T23:59:59Z', service: 'TTS',
    })
  })
})
