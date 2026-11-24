import { useState, useEffect } from 'react'
import Dialog from '../../components/ui/Dialog'
import Icon from '../../components/ui/Icon'
import {
  getUsageReport,
  getSystemStatus,
  getBudgetConfig,
  updateBudgetConfig,
  type UsageReport,
  type SystemStatus,
  type BudgetConfig,
  type ServiceUsageItem,
} from '../../services/adminService'

const SERVICE_LABELS = {
  GENERATIVE_AI: 'AI tạo nội dung',
  IMAGE_API: 'API hình ảnh',
  TTS: 'Chuyển văn bản thành giọng nói',
  MODERATION: 'Kiểm duyệt nội dung',
} satisfies Record<ServiceUsageItem['service'], string>

const SERVICE_STATUS_LABELS = {
  OPERATIONAL: 'Đang hoạt động',
  UNREACHABLE: 'Không thể kết nối',
  UNKNOWN: 'Chưa xác định trạng thái',
} satisfies Record<ServiceUsageItem['status'], string>

type Range = 'TODAY' | '7D' | '30D' | 'CUSTOM'

export default function AdminDashboardPage() {
  const [range, setRange] = useState<Range>('7D')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [service, setService] = useState<ServiceUsageItem['service'] | ''>('')
  const [refresh, setRefresh] = useState(0)
  const [report, setReport] = useState<UsageReport | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig | null>(null)
  const [reportState, setReportState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [systemError, setSystemError] = useState(false)
  const [budgetError, setBudgetError] = useState(false)
  const invalidDates = range === 'CUSTOM' && (!fromDate || !toDate || fromDate > toDate)

  // Budget Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [monthlyBudget, setMonthlyBudget] = useState(100)
  const [yellowPct, setYellowPct] = useState(70)
  const [redPct, setRedPct] = useState(90)
  const [savingBudget, setSavingBudget] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  useEffect(() => {
    if (invalidDates) return
    let active = true
    void getUsageReport({
      range,
      service: service || undefined,
      ...(range === 'CUSTOM' ? {
        from: fromDate + 'T00:00:00Z',
        to: toDate + 'T23:59:59Z',
      } : {}),
    }).then((data) => {
      if (!active) return
      setReport(data)
      setReportState('ready')
    }, () => {
      if (active) setReportState('error')
    })
    return () => { active = false }
  }, [range, fromDate, toDate, service, refresh, invalidDates])

  useEffect(() => {
    let active = true
    void getSystemStatus().then((data) => {
      if (!active) return
      setSystemStatus(data)
      setSystemError(false)
    }, () => {
      if (active) setSystemError(true)
    })
    void getBudgetConfig().then((data) => {
      if (!active) return
      setBudgetConfig(data)
      setBudgetError(false)
    }, () => {
      if (active) setBudgetError(true)
    })
    return () => { active = false }
  }, [refresh])

  const openBudget = () => {
    if (!budgetConfig) return
    setMonthlyBudget(budgetConfig.monthlyBudget)
    setYellowPct(budgetConfig.yellowPct)
    setRedPct(budgetConfig.redPct)
    setModalError(null)
    setIsModalOpen(true)
  }

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!(monthlyBudget > 0 && yellowPct > 0 && yellowPct < redPct && redPct <= 100)) {
      setModalError('Nhập ngân sách lớn hơn 0 và ngưỡng thỏa 0 < vàng < đỏ ≤ 100.')
      return
    }
    try {
      setSavingBudget(true)
      setModalError(null)
      const updated = await updateBudgetConfig({
        monthlyBudget,
        yellowPct,
        redPct,
      })
      setBudgetConfig(updated)
      setIsModalOpen(false)
    } catch {
      setModalError('Không thể lưu cấu hình ngân sách. Vui lòng thử lại.')
    } finally {
      setSavingBudget(false)
    }
  }

  const visibleReport = !invalidDates && reportState === 'ready' ? report : null
  const aiService = visibleReport?.services.find((row) => row.service === 'GENERATIVE_AI')
  const aiSuccessRate = aiService && aiService.requests > 0
    ? (aiService.successCount / aiService.requests * 100).toFixed(1) + '%'
    : '—'

  const currentCost = budgetConfig?.currentMonthCost
  const budgetLimit = budgetConfig?.monthlyBudget
  const usedPercent = budgetConfig?.budgetUsedPercent
  const isCapExceeded = budgetConfig?.costCapExceeded ?? false
  const isRed = usedPercent != null && usedPercent >= (budgetConfig?.redPct ?? 90)
  const isYellow = usedPercent != null && usedPercent >= (budgetConfig?.yellowPct ?? 70)

  const timeseries = visibleReport?.timeseries ?? []

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Giám sát Hạ tầng & Chi phí AI
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi ngân sách, số lượng yêu cầu, sức khoẻ máy chủ và tình trạng các dịch vụ bên ngoài
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">
            Khoảng thời gian
            <select className="ml-2 rounded-lg border border-slate-300 p-2" value={range}
              onChange={(event) => { setReportState('loading'); setRange(event.target.value as Range) }}>
              <option value="TODAY">Hôm nay</option>
              <option value="7D">7 ngày</option>
              <option value="30D">30 ngày</option>
              <option value="CUSTOM">Tùy chỉnh</option>
            </select>
          </label>
          <label className="text-sm">
            Dịch vụ
            <select className="ml-2 rounded-lg border border-slate-300 p-2" value={service}
              onChange={(event) => {
                setReportState('loading')
                setService(event.target.value as ServiceUsageItem['service'] | '')
              }}>
              <option value="">Tất cả</option>
              {Object.entries(SERVICE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => {
            setReportState('loading')
            setRefresh((value) => value + 1)
          }} className="px-3 py-2 rounded-xl border border-slate-300 text-sm">
            Làm mới
          </button>
          <button type="button" onClick={openBudget} disabled={!budgetConfig}
            className="px-3 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-sm disabled:opacity-50">
            Cấu hình ngân sách
          </button>
        </div>
      </div>

      {range === 'CUSTOM' && (
        <div className="flex flex-wrap gap-3 text-sm">
          <label>Từ ngày <input type="date" className="rounded-lg border border-slate-300 p-2" value={fromDate}
            onChange={(event) => { setReportState('loading'); setFromDate(event.target.value) }} /></label>
          <label>Đến ngày <input type="date" className="rounded-lg border border-slate-300 p-2" value={toDate}
            onChange={(event) => { setReportState('loading'); setToDate(event.target.value) }} /></label>
          {invalidDates && <p role="status">Chọn ngày bắt đầu và ngày kết thúc hợp lệ.</p>}
        </div>
      )}

      {!invalidDates && reportState === 'loading' && <p role="status">Đang tải báo cáo sử dụng…</p>}
      {!invalidDates && reportState === 'error' && <p role="alert">Không thể tải báo cáo sử dụng.</p>}
      {systemError && <p role="alert">Không thể tải chỉ số hạ tầng.</p>}
      {budgetError && <p role="alert">Không thể tải ngân sách.</p>}

      {/* Top Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Budget Cap */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Ngân sách tháng</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900">
              {currentCost != null ? '$' + currentCost.toFixed(2) : 'Chưa có dữ liệu chi phí'}
            </span>
            {budgetLimit != null && <span className="text-sm text-slate-500">/ ${budgetLimit.toFixed(2)} USD</span>}
          </div>
          {usedPercent != null && (
            <div className="mt-3 space-y-2">
              <progress className="w-full" aria-label="Tỷ lệ sử dụng ngân sách" value={Math.min(usedPercent, 100)} max={100} />
              <p className="text-xs text-slate-600">Đã sử dụng {usedPercent.toFixed(1)}% ngân sách tháng</p>
              {(isCapExceeded || isRed || isYellow) && (
                <p role="alert" className={'text-xs font-semibold ' + (isRed || isCapExceeded ? 'text-rose-700' : 'text-amber-800')}>
                  {isCapExceeded ? 'Đã chạm trần. Tạm dừng tạo và làm lại game bằng AI.'
                    : isRed ? 'Cảnh báo đỏ: chi phí đã chạm ngưỡng báo động.'
                    : 'Cảnh báo vàng: chi phí đã chạm ngưỡng cảnh báo.'}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Tổng token AI</span>
          <p className="mt-3 text-2xl font-bold text-slate-900">{aiService?.tokensUsed?.toLocaleString('vi-VN') ?? '—'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Tỷ lệ thành công AI</span>
          <p className="mt-3 text-2xl font-bold text-slate-900">{aiSuccessRate}</p>
          {aiService && aiService.requests > 0 && (
            <p className="mt-2 text-xs text-slate-600">{aiService.successCount} / {aiService.requests} yêu cầu thành công</p>
          )}
        </div>

        {/* Card 4: System Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Sức khoẻ máy chủ</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-3">
            <div>
              <span className="text-xs text-slate-400">CPU</span>
              <p className="text-lg font-bold text-slate-800">
                {formatPercent(systemStatus?.server.cpuUsagePercent)}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400">RAM (Heap)</span>
              <p className="text-lg font-bold text-slate-800">
                {formatPercent(systemStatus?.server.heapUsagePercent)}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400">Threads</span>
              <p className="text-lg font-bold text-slate-800">
                {systemStatus?.server.activeThreads ?? '—'}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            PostgreSQL DB Pool: <strong>{formatPercent(systemStatus?.database.poolUsagePercent)}</strong>
          </p>
        </div>
      </div>

      {visibleReport && (
        <div className="grid gap-6 lg:grid-cols-2">
          <DailyChart title="Lưu lượng theo ngày" empty="Chưa có dữ liệu lưu lượng"
            points={timeseries.map(({ date, requests }) => ({ date, value: requests }))}
            format={(value) => value.toLocaleString('vi-VN') + ' yêu cầu'} />
          <DailyChart title="Chi phí theo ngày" empty="Chưa có dữ liệu chi phí"
            points={timeseries.flatMap(({ date, cost }) => cost == null ? [] : [{ date, value: cost }])}
            format={(value) => '$' + value.toLocaleString('en-US', { maximumFractionDigits: 4 })} />
        </div>
      )}

      {/* Grid: Services Table & Live Arena Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Services Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base">Trạng thái Dịch vụ Ngoại vi</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-semibold">
                  <th className="py-2.5 px-3">Dịch vụ</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Yêu cầu</th>
                  <th className="py-2.5 px-3 text-right">Thành công</th>
                  <th className="py-2.5 px-3 text-right">Thất bại</th>
                  <th className="py-2.5 px-3 text-right">Chi phí</th>
                  <th className="py-2.5 px-3 text-center">Nguồn chi phí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {(visibleReport?.services ?? []).map((s) => (
                  <tr key={s.service} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">
                          {SERVICE_LABELS[s.service]}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={s.status === 'UNREACHABLE' ? 'font-semibold text-rose-700' : 'text-slate-600'}>
                        {SERVICE_STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium">{s.requests}</td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                      {s.successCount}
                    </td>
                    <td className="py-3 px-3 text-right">{s.failureCount}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {s.cost != null ? '$' + s.cost.toFixed(2) + ' ' + (s.costCurrency ?? 'USD') : 'Chưa có dữ liệu chi phí'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          s.costSource === 'BILLING'
                            ? 'bg-blue-50 text-blue-700'
                            : s.costSource === 'ESTIMATED'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.costSource === 'BILLING' ? 'Nhà cung cấp' : s.costSource === 'ESTIMATED' ? 'Ước tính' : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Arena metrics */}
        <div className="space-y-6">
          {/* Live Arena Metrics */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 text-base mb-3 flex items-center space-x-2">
              <Icon name="play" className="w-5 h-5 text-indigo-600" />
              <span>Phòng chơi tập thể (Live Arena)</span>
            </h3>
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-xs text-slate-600 font-medium">Phiên chơi đang hoạt động</span>
                <span className="text-base font-bold text-indigo-700">
                  {systemStatus?.liveArena.activeSessions ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-xs text-slate-600 font-medium">Học sinh kết nối realtime</span>
                <span className="text-base font-bold text-indigo-700">
                  {systemStatus?.liveArena.connectedClients ?? '—'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Budget Modal */}
      {isModalOpen && (
        <Dialog title="Cấu hình ngân sách và cảnh báo" initialFocusId="monthly-budget"
          onEscape={() => { if (!savingBudget) setIsModalOpen(false) }}>
            {modalError && <p role="alert" className="mb-4 text-sm text-rose-700">{modalError}</p>}

            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs">
              <div>
                <label htmlFor="monthly-budget" className="block font-semibold text-slate-700 mb-1">
                  Trần ngân sách tháng ($ USD)
                </label>
                <input id="monthly-budget"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Khi chi phí lũy kế đạt 100% trần này, hệ thống sẽ tạm dừng tạo và làm lại game bằng AI.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="yellow-budget" className="block font-semibold text-slate-700 mb-1">
                    Ngưỡng Vàng (%)
                  </label>
                  <input id="yellow-budget"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max="99.99"
                    value={yellowPct}
                    onChange={(e) => setYellowPct(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Cảnh báo nhắc nhở</p>
                </div>

                <div>
                  <label htmlFor="red-budget" className="block font-semibold text-slate-700 mb-1">
                    Ngưỡng Đỏ (%)
                  </label>
                  <input id="red-budget"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max="100"
                    value={redPct}
                    onChange={(e) => setRedPct(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Báo động trần</p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={savingBudget}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  {savingBudget ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            </form>
        </Dialog>
      )}
    </div>
  )
}

function formatPercent(value?: number) {
  return value == null ? '—' : value.toFixed(1) + '%'
}

function DailyChart({ title, empty, points, format }: {
  title: string
  empty: string
  points: { date: string; value: number }[]
  format: (value: number) => string
}) {
  const max = points.reduce((highest, point) => Math.max(highest, point.value), 0) || 1
  return (
    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="font-bold text-slate-800">{title}</h3>
      {points.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-600">{empty}</p>
      ) : (
        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {points.map(({ date, value }) => (
            <li key={date} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-xs">
              <time dateTime={date}>{date}</time>
              <div aria-hidden="true" className="h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: (value / max * 100) + '%' }} />
              </div>
              <span>{format(value)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
