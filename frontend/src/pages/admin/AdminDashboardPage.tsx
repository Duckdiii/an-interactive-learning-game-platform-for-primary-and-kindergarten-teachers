import { useState, useEffect, useCallback } from 'react'
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

export default function AdminDashboardPage() {
  const [range, setRange] = useState<'TODAY' | '7D' | '30D'>('7D')
  const [report, setReport] = useState<UsageReport | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Budget Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [monthlyBudget, setMonthlyBudget] = useState(100)
  const [yellowPct, setYellowPct] = useState(70)
  const [redPct, setRedPct] = useState(90)
  const [savingBudget, setSavingBudget] = useState(false)
  const [modalSuccess, setModalSuccess] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [rep, sys, bud] = await Promise.all([
        getUsageReport({ range }),
        getSystemStatus(),
        getBudgetConfig(),
      ])
      setReport(rep)
      setSystemStatus(sys)
      setBudgetConfig(bud)
      setMonthlyBudget(bud.monthlyBudget)
      setYellowPct(bud.yellowPct)
      setRedPct(bud.redPct)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu giám sát'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSavingBudget(true)
      setModalSuccess(null)
      const updated = await updateBudgetConfig({
        monthlyBudget,
        yellowPct,
        redPct,
      })
      setBudgetConfig(updated)
      setModalSuccess('Đã cập nhật định mức ngân sách thành công!')
      setTimeout(() => {
        setIsModalOpen(false)
        setModalSuccess(null)
      }, 1000)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi cập nhật cấu hình ngân sách')
    } finally {
      setSavingBudget(false)
    }
  }

  // Derive metrics
  const aiService = report?.services.find((s) => s.service === 'GENERATIVE_AI')
  const totalTokens = aiService?.tokensUsed ?? 0
  const aiTotalReq = aiService?.requests ?? 0
  const aiSuccessReq = aiService?.successCount ?? 0
  const aiSuccessRate =
    aiTotalReq > 0 ? ((aiSuccessReq / aiTotalReq) * 100).toFixed(1) : '100.0'

  const currentCost = budgetConfig?.currentMonthCost ?? 0
  const budgetLimit = budgetConfig?.monthlyBudget ?? 100
  const usedPercent = budgetConfig?.usedPercent ?? 0
  const isCapExceeded = budgetConfig?.costCapExceeded ?? false

  const getBudgetStatusBadge = () => {
    if (isCapExceeded || usedPercent >= (budgetConfig?.redPct ?? 90)) {
      return {
        label: isCapExceeded ? 'ĐÃ CHẠM TRẦN (CIRCUIT BREAKER)' : 'MỨC ĐỎ (BÁO ĐỘNG)',
        color: 'bg-rose-100 text-rose-800 border-rose-200',
      }
    }
    if (usedPercent >= (budgetConfig?.yellowPct ?? 70)) {
      return {
        label: 'MỨC VÀNG (CẢNH BÁO)',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
      }
    }
    return {
      label: 'MỨC XANH (AN TOÀN)',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    }
  }

  const budgetBadge = getBudgetStatusBadge()

  // Calculate SVG dimensions for timeseries
  const timeseries = report?.timeseries ?? []
  const maxRequests = Math.max(...timeseries.map((t) => t.requests), 10)
  const chartHeight = 120
  const chartWidth = 500

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Giám sát Hạ tầng & Chi phí AI
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi ngân sách, số lượng yêu cầu, sức khoẻ máy chủ và hạn ngạch các dịch vụ bên ngoài
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Range Picker */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200 text-xs font-semibold">
            {(['TODAY', '7D', '30D'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  range === r
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === 'TODAY' ? 'Hôm nay' : r === '7D' ? '7 ngày' : '30 ngày'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-sm"
          >
            Cấu hình ngân sách
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Top Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Budget Cap */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Ngân sách tháng</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${budgetBadge.color}`}>
              {budgetBadge.label}
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">
              ${currentCost.toFixed(2)}
            </span>
            <span className="text-sm font-medium text-slate-400">
              / ${budgetLimit.toFixed(2)} USD
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isCapExceeded || usedPercent >= 90
                  ? 'bg-rose-500'
                  : usedPercent >= 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(usedPercent, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Đã tiêu thụ <strong>{usedPercent.toFixed(1)}%</strong> ngân sách tháng
          </p>
        </div>

        {/* Card 2: AI Tokens */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Tổng AI Tokens</span>
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              Gemini 1.5 Flash
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {totalTokens.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs text-slate-500 ml-1">tokens</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Đơn giá: $0.075 / 1M prompt token, $0.30 / 1M response token
          </p>
        </div>

        {/* Card 3: Success Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Tỷ lệ thành công AI</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Độ trễ ~{aiService?.avgLatencyMs ?? 1.45}s
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{aiSuccessRate}%</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Thành công <strong>{aiSuccessReq}</strong> / {aiTotalReq} yêu cầu
          </p>
        </div>

        {/* Card 4: System Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Sức khoẻ máy chủ</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Healthy
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-3">
            <div>
              <span className="text-xs text-slate-400">CPU</span>
              <p className="text-lg font-bold text-slate-800">
                {systemStatus?.server.cpu ?? 18.5}%
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400">RAM (Heap)</span>
              <p className="text-lg font-bold text-slate-800">
                {systemStatus?.server.memory ?? 34.2}%
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400">Threads</span>
              <p className="text-lg font-bold text-slate-800">
                {systemStatus?.server.activeThreads ?? 42}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            PostgreSQL DB Pool: <strong>{systemStatus?.database.connectionPoolUsage ?? 14}%</strong>
          </p>
        </div>
      </div>

      {/* Timeseries Chart Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Lưu lượng Yêu cầu theo Ngày</h3>
            <p className="text-xs text-slate-500 mt-0.5">Số lượng request gọi tới hệ thống trong khoảng thời gian đã chọn</p>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Đỉnh: <span className="font-bold text-indigo-700">{maxRequests} req/ngày</span>
          </div>
        </div>

        {timeseries.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">Chưa có dữ liệu lưu lượng</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[480px]">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}
                className="w-full h-44 overflow-visible"
              >
                {/* Horizontal grid lines */}
                <line
                  x1="0"
                  y1={chartHeight}
                  x2={chartWidth}
                  y2={chartHeight}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1={chartHeight / 2}
                  x2={chartWidth}
                  y2={chartHeight / 2}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />

                {/* Bars */}
                {timeseries.map((pt, i) => {
                  const barWidth = Math.max(chartWidth / timeseries.length - 8, 12)
                  const x = i * (chartWidth / timeseries.length) + 4
                  const h = (pt.requests / maxRequests) * (chartHeight - 10)
                  const y = chartHeight - h

                  return (
                    <g key={pt.date} className="group cursor-pointer">
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={h}
                        rx="4"
                        className="fill-indigo-500 hover:fill-indigo-600 transition-colors"
                      />
                      {/* Tooltip on hover */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {pt.requests}
                      </text>
                      {/* X Label */}
                      <text
                        x={x + barWidth / 2}
                        y={chartHeight + 18}
                        textAnchor="middle"
                        className="text-[9px] fill-slate-400 font-medium"
                      >
                        {pt.date.slice(5)}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Services Table & Live Arena Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Services Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base">Trạng thái Dịch vụ Ngoại vi</h3>
            <span className="text-xs text-slate-400">4 dịch vụ tích hợp</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-semibold">
                  <th className="py-2.5 px-3">Dịch vụ</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Requests</th>
                  <th className="py-2.5 px-3 text-right">Thành công</th>
                  <th className="py-2.5 px-3 text-right">Chi phí ước tính</th>
                  <th className="py-2.5 px-3 text-center">Nguồn chi phí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {(report?.services ?? []).map((s: ServiceUsageItem) => (
                  <tr key={s.service} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">
                          {s.service === 'GENERATIVE_AI'
                            ? 'Gemini 1.5 Flash'
                            : s.service === 'IMAGE_API'
                            ? 'Pexels Image API'
                            : s.service === 'TTS'
                            ? 'Google Cloud TTS'
                            : 'School Safety Moderation'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                        Đang hoạt động
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium">{s.requests}</td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                      {s.successCount}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {s.cost != null ? `$${s.cost.toFixed(2)} USD` : '—'}
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
                        {s.costSource}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Live Arena & Circuit Breaker info */}
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
                  {systemStatus?.liveArena.activeSessions ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-xs text-slate-600 font-medium">Học sinh kết nối realtime</span>
                <span className="text-base font-bold text-indigo-700">
                  {systemStatus?.liveArena.connectedClients ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Circuit Breaker Info */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5">
            <h4 className="font-bold text-indigo-950 text-xs uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Icon name="check" className="w-4 h-4 text-indigo-600" />
              <span>Circuit Breaker An toàn</span>
            </h4>
            <p className="text-xs text-indigo-800 leading-relaxed">
              Hệ thống giám sát định mức tự động ngắt tính năng sinh game mới nếu chi phí chạm trần ($
              {budgetLimit} USD) nhằm tránh phát sinh chi phí ngoài kế hoạch.
            </p>
          </div>
        </div>
      </div>

      {/* Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Cấu hình Ngân sách & Định mức Cảnh báo</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {modalSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                {modalSuccess}
              </div>
            )}

            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Trần ngân sách tháng ($ USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Khi chi phí lũy kế đạt 100% trần này, Circuit Breaker sẽ ngắt tính năng sinh game.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngưỡng Vàng (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={yellowPct}
                    onChange={(e) => setYellowPct(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Cảnh báo nhắc nhở</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngưỡng Đỏ (%)
                  </label>
                  <input
                    type="number"
                    min="1"
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
          </div>
        </div>
      )}
    </div>
  )
}
