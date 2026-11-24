import { useState, useEffect } from 'react'
import Icon from '../../components/ui/Icon'
import Button from '../../components/Button'
import ErrorNotice from '../../components/ui/ErrorNotice'
import { parseApiError } from '../../utils/apiError'
import {
  getAiConfig,
  createAiConfigVersion,
  freezeAiConfigVersion,
  activateAiConfigVersion,
  getBlockedWords,
  replaceBlockedWords,
  type AiConfigResponse,
  type AiConfigVersion,
} from '../../services/adminService'

export default function AIConfigPage() {
  const [activeTab, setActiveTab] = useState<'ai-config' | 'safety'>('ai-config')
  const [configData, setConfigData] = useState<AiConfigResponse | null>(null)
  const [blockedWords, setBlockedWords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Form: Create new version
  const [promptInput, setPromptInput] = useState('')
  const [temperature, setTemperature] = useState(0.3)
  const [maxTokens, setMaxTokens] = useState(2000)
  const [moderationThreshold, setModerationThreshold] = useState(0.85)

  // Modal: Freeze version
  const [freezeTarget, setFreezeTarget] = useState<AiConfigVersion | null>(null)
  const [freezeLabel, setFreezeLabel] = useState('')

  // Modal: View prompt content
  const [selectedPromptView, setSelectedPromptView] = useState<AiConfigVersion | null>(null)

  // Safety tab editor
  const [blockedWordsText, setBlockedWordsText] = useState('')

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const [aiData, safetyData] = await Promise.all([
        getAiConfig(),
        getBlockedWords(),
      ])
      setConfigData(aiData)
      if (aiData.active) {
        setPromptInput(aiData.active.systemPrompt)
        setTemperature(aiData.active.temperature)
        setMaxTokens(aiData.active.maxTokens)
        setModerationThreshold(aiData.active.moderationThreshold)
      }
      setBlockedWords(safetyData.words || [])
      setBlockedWordsText((safetyData.words || []).join('\n'))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu cấu hình AI'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateVersion(e: React.FormEvent) {
    e.preventDefault()
    if (!promptInput.trim()) {
      setErrorMessage('Vui lòng nhập nội dung System Prompt')
      return
    }
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const created = await createAiConfigVersion({
        systemPrompt: promptInput.trim(),
        temperature,
        maxTokens,
        moderationThreshold,
      })
      setSuccessMessage(`Đã tạo và kích hoạt phiên bản cấu hình mới (SHA: ${created.sha256.substring(0, 8)})`)
      await loadAllData()
    } catch (err: unknown) {
      const fallback = 'Không thể lưu cài đặt vào lúc này. Vui lòng thử lại sau.'
      const error = parseApiError(err, fallback)
      setErrorMessage(error.code === 'INTERNAL_ERROR'
        ? fallback
        : Object.values(error.fieldErrors)[0] ?? error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleFreezeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!freezeTarget) return
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await freezeAiConfigVersion(freezeTarget.versionId, freezeLabel.trim() || undefined)
      setSuccessMessage(`Đã đóng băng phiên bản ${freezeTarget.versionId.substring(0, 8)} thành bản chuẩn`)
      setFreezeTarget(null)
      setFreezeLabel('')
      await loadAllData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi đóng băng phiên bản'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleActivateVersion(versionId: string) {
    if (!confirm('Bạn có chắc chắn muốn kích hoạt phiên bản này làm bản đang áp dụng?')) {
      return
    }
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await activateAiConfigVersion(versionId)
      setSuccessMessage('Đã kích hoạt phiên bản thành công')
      await loadAllData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi kích hoạt phiên bản'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSaveBlockedWords(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const words = blockedWordsText
        .split('\n')
        .map((w) => w.trim())
        .filter((w) => w && !w.startsWith('#'))
      const res = await replaceBlockedWords(words)
      setBlockedWords(res.words)
      setSuccessMessage(`Đã cập nhật danh sách ${res.words.length} từ cấm (Hot-reload bộ nhớ tức thì)`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật danh sách từ cấm'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Cấu hình Tham số AI & Prompt Studio</h2>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý System Instruction, tham số sinh game (Temperature, Max Tokens) và Từ cấm an toàn học đường
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ai-config')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'ai-config'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="sparkles" className="w-4 h-4" />
            <span>Prompt & Tham số</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('safety')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'safety'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="file" className="w-4 h-4" />
            <span>Từ cấm Học đường ({blockedWords.length})</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && <ErrorNotice message={errorMessage} />}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Icon name="check" className="w-5 h-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-500 hover:text-emerald-700 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Đang tải cấu hình AI...</div>
      ) : activeTab === 'ai-config' ? (
        <div className="space-y-6">
          {/* Active Version Card */}
          {configData?.active && (
            <div className="p-6 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 rounded-2xl border border-indigo-100 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Đang áp dụng (Active)
                    </span>
                    {configData.active.frozen && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Đã đóng băng (Frozen Baseline)
                      </span>
                    )}
                    {configData.active.label && (
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-indigo-100 text-indigo-700">
                        {configData.active.label}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Phiên bản SHA-256: <code className="text-indigo-600 font-mono text-sm">{configData.active.sha256}</code>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Khởi tạo lúc: {new Date(configData.active.createdAt).toLocaleString('vi-VN')} &bull; Người tạo: {configData.active.createdBy}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {!configData.active.frozen && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setFreezeTarget(configData.active)
                        setFreezeLabel('')
                      }}
                      className="text-amber-700 border-amber-200 hover:bg-amber-50"
                    >
                      <span>Đóng băng bản chuẩn (Freeze)</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedPromptView(configData.active)}
                  >
                    <span>Xem Prompt hiện tại</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-indigo-100/60 text-xs">
                <div>
                  <span className="text-slate-400">Temperature:</span>{' '}
                  <span className="font-bold text-slate-700 font-mono">{configData.active.temperature}</span>
                </div>
                <div>
                  <span className="text-slate-400">Max Tokens:</span>{' '}
                  <span className="font-bold text-slate-700 font-mono">{configData.active.maxTokens}</span>
                </div>
                <div>
                  <span className="text-slate-400">Moderation Threshold:</span>{' '}
                  <span className="font-bold text-slate-700 font-mono">{configData.active.moderationThreshold}</span>
                </div>
                <div>
                  <span className="text-slate-400">Tổng phiên bản:</span>{' '}
                  <span className="font-bold text-indigo-600 font-mono">{configData.versions.length} bản</span>
                </div>
              </div>
            </div>
          )}

          {/* Form Create New Version */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Soạn thảo Cấu hình & Prompt Mới</h3>
              <p className="text-xs text-slate-500">
                Mỗi lần lưu sẽ tự động sinh một phiên bản mới kèm chữ ký số SHA-256 (NFR-05) và áp dụng ngay cho các lượt sinh game tiếp theo.
              </p>
            </div>

            <form onSubmit={handleCreateVersion} className="space-y-4">
              <div>
                <label htmlFor="system-prompt" className="block text-xs font-semibold text-slate-700 mb-1">
                  System Instruction / Prompt Cốt lõi
                </label>
                <textarea
                  id="system-prompt"
                  rows={6}
                  required
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Nhập hướng dẫn sư phạm dành cho Gemini AI..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="slider-temp" className="font-semibold text-slate-700">Temperature</label>
                    <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                      {temperature.toFixed(2)}
                    </span>
                  </div>
                  <input
                    id="slider-temp"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-400">
                    {temperature <= 0.3 ? 'Ổn định, chính xác cao (khuyên dùng)' : temperature <= 0.7 ? 'Cân bằng sáng tạo' : 'Rất sáng tạo, dễ lệch cấu trúc'}
                  </p>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="input-tokens" className="font-semibold text-slate-700">Max Tokens</label>
                    <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                      {maxTokens}
                    </span>
                  </div>
                  <input
                    id="input-tokens"
                    type="number"
                    min="500"
                    max="4000"
                    step="100"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2000)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400">Định mức token tối đa sinh ra trong 1 lượt (500 - 4000)</p>
                </div>

                {/* Moderation Threshold */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="slider-mod" className="font-semibold text-slate-700">Ngưỡng An toàn (Moderation)</label>
                    <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                      {moderationThreshold.toFixed(2)}
                    </span>
                  </div>
                  <input
                    id="slider-mod"
                    aria-describedby="moderation-threshold-help"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={moderationThreshold}
                    onChange={(e) => setModerationThreshold(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <p id="moderation-threshold-help" className="text-[11px] text-slate-500">
                    Chặn văn bản có điểm kiểm duyệt đạt ngưỡng (mặc định 0,85). Nội dung bị dịch vụ gắn cờ luôn bị chặn.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
                >
                  {isSubmitting ? 'Đang lưu & áp dụng...' : 'Lưu Thành Phiên Bản Mới & Áp Dụng'}
                </Button>
              </div>
            </form>
          </div>

          {/* Versions History List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">Lịch sử Phiên bản Cấu hình (Audit Trail)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-6">Trạng thái</th>
                    <th className="py-3 px-6">Nhãn / Version ID</th>
                    <th className="py-3 px-6">SHA-256</th>
                    <th className="py-3 px-6">Tham số (T / Tokens / Safety)</th>
                    <th className="py-3 px-6">Thời gian</th>
                    <th className="py-3 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {configData?.versions.map((ver) => (
                    <tr key={ver.versionId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        {ver.active ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Đang dùng
                          </span>
                        ) : ver.frozen ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            Bản chuẩn
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            Cũ
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-medium text-slate-800">
                        {ver.label ? (
                          <span className="text-indigo-600 font-bold">{ver.label}</span>
                        ) : (
                          <span className="text-slate-500">{ver.versionId.substring(0, 8)}...</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-500 text-[11px]">
                        {ver.sha256.substring(0, 12)}...
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-600">
                        T={ver.temperature} &bull; {ver.maxTokens} tok &bull; S={ver.moderationThreshold}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {new Date(ver.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs px-2.5 py-1"
                          onClick={() => setSelectedPromptView(ver)}
                        >
                          Xem Prompt
                        </Button>
                        {!ver.active && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs px-2.5 py-1 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => handleActivateVersion(ver.versionId)}
                          >
                            Kích hoạt
                          </Button>
                        )}
                        {!ver.frozen && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs px-2.5 py-1 text-amber-600 hover:bg-amber-50"
                            onClick={() => {
                              setFreezeTarget(ver)
                              setFreezeLabel('')
                            }}
                          >
                            Đóng băng
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Safety Tab: School Safety Blocked Words */
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800">Quản lý Danh sách Từ cấm An toàn Học đường (FLD-25)</h3>
            <p className="text-xs text-slate-500">
              Các từ trong danh sách sẽ được áp dụng kiểm duyệt tức thì cho cả nickname học sinh tham gia phòng thi đấu lẫn nội dung bài giảng do giáo viên/AI sinh.
            </p>
          </div>

          <form onSubmit={handleSaveBlockedWords} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="blocked-words-input" className="text-xs font-semibold text-slate-700">
                  Danh sách từ cấm (mỗi dòng một từ hoặc cụm từ)
                </label>
                <span className="text-xs text-indigo-600 font-semibold font-mono">
                  {blockedWordsText.split('\n').filter((w) => w.trim() && !w.trim().startsWith('#')).length} từ
                </span>
              </div>
              <textarea
                id="blocked-words-input"
                rows={10}
                required
                value={blockedWordsText}
                onChange={(e) => setBlockedWordsText(e.target.value)}
                placeholder="Nhập từ cấm, mỗi dòng một từ..."
                className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Lưu ý: Hỗ trợ nạp lại bộ nhớ (Hot-reload) ngay lập tức mà không cần khởi động lại dịch vụ backend.
              </span>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
              >
                {isSubmitting ? 'Đang cập nhật...' : 'Lưu & Nạp lại Bộ nhớ (Hot Reload)'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Freeze Version */}
      {freezeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Đóng băng Phiên bản Bản chuẩn</h3>
            <p className="text-xs text-slate-500 mb-4">
              Phiên bản đã đóng băng sẽ không thể chỉnh sửa và được lưu làm mốc đối chuẩn (Baseline Benchmark).
            </p>
            <form onSubmit={handleFreezeSubmit} className="space-y-4">
              <div>
                <label htmlFor="freeze-label-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhãn định danh phiên bản (Label)
                </label>
                <input
                  id="freeze-label-input"
                  type="text"
                  value={freezeLabel}
                  onChange={(e) => setFreezeLabel(e.target.value)}
                  placeholder="Ví dụ: v1.0.0-baseline hoặc gold-standard"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={() => setFreezeTarget(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-600 text-white hover:bg-amber-700"
                >
                  {isSubmitting ? 'Đang đóng băng...' : 'Xác nhận Đóng băng'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Prompt Content */}
      {selectedPromptView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Chi tiết System Prompt &bull; {selectedPromptView.label || selectedPromptView.versionId.substring(0, 8)}
                </h3>
                <p className="text-xs text-slate-400 font-mono">SHA-256: {selectedPromptView.sha256}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPromptView(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-96 overflow-y-auto">
              <pre className="text-xs text-slate-800 whitespace-pre-wrap font-mono leading-relaxed">
                {selectedPromptView.systemPrompt}
              </pre>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setSelectedPromptView(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
