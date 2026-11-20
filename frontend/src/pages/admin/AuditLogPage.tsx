import { useState, useEffect, useCallback } from 'react'
import { getAuditLogs, type AuditLogEntry } from '../../services/adminService'
import Icon from '../../components/ui/Icon'
import Button from '../../components/Button'
import ErrorNotice from '../../components/ui/ErrorNotice'
import { parseApiError } from '../../utils/apiError'

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [size] = useState(15)

  const [actionFilter, setActionFilter] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await getAuditLogs({
        action: actionFilter || undefined,
        result: resultFilter || undefined,
        page,
        size,
      })
      setLogs(data.items)
      setTotalItems(data.totalItems)
      setTotalPages(data.totalPages)
    } catch (err) {
      setErrorMessage(parseApiError(err, 'Không thể tải nhật ký Audit Log').message)
    } finally {
      setIsLoading(false)
    }
  }, [actionFilter, resultFilter, page, size])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Nhật ký Audit Log</h2>
        <p className="text-sm text-slate-500 mt-1">
          Ghi nhận và truy vết tự động toàn bộ thao tác quản trị và các hành động quan trọng
        </p>
      </div>

      {errorMessage && (
        <ErrorNotice message={errorMessage} />
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 flex gap-2 w-full">
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Lọc theo hành động (ví dụ: POST /api/admin/teachers, LOCK_TEACHER)..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPage(0)
              fetchLogs()
            }}
            className="shrink-0 flex items-center space-x-1.5"
          >
            <Icon name="search" className="w-4 h-4" />
            <span>Lọc</span>
          </Button>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label htmlFor="result-filter" className="text-xs font-medium text-slate-500 shrink-0">
            Kết quả:
          </label>
          <select
            id="result-filter"
            value={resultFilter}
            onChange={(e) => {
              setResultFilter(e.target.value)
              setPage(0)
            }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả kết quả</option>
            <option value="SUCCESS">Thành công (SUCCESS)</option>
            <option value="FAILURE">Thất bại (FAILURE)</option>
            <option value="BLOCKED">Bị chặn (BLOCKED)</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-6">Thời gian</th>
                <th className="py-3.5 px-6">Người thực hiện (Actor ID)</th>
                <th className="py-3.5 px-6">Vai trò</th>
                <th className="py-3.5 px-6">Hành động</th>
                <th className="py-3.5 px-6 text-center">Kết quả</th>
                <th className="py-3.5 px-6">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    Đang tải nhật ký...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    Chưa có bản ghi nhật ký nào phù hợp.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.logId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 text-slate-500">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-6 text-slate-800 font-medium truncate max-w-[150px]">
                      {log.actorId}
                    </td>
                    <td className="py-3.5 px-6 font-sans">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-indigo-700 font-medium">{log.action}</td>
                    <td className="py-3.5 px-6 text-center font-sans">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          log.result === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.result === 'FAILURE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">{log.ip || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-500">
          <span>
            Tổng cộng: <strong className="text-slate-700">{totalItems}</strong> bản ghi (Trang {page + 1}/{totalPages || 1})
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={page === 0 || isLoading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Trang trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1 || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
