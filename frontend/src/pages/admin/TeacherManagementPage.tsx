import { useState, useEffect, useCallback } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  lockTeacher,
  unlockTeacher,
  type AdminTeacher,
} from '../../services/adminService'
import Icon from '../../components/ui/Icon'
import Button from '../../components/Button'
import FormField from '../../components/ui/FormField'
import ErrorNotice from '../../components/ui/ErrorNotice'
import { inputClass } from '../../components/ui/formStyles'
import { parseApiError } from '../../utils/apiError'

export default function TeacherManagementPage() {
  const [teachers, setTeachers] = useState<AdminTeacher[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [size] = useState(10)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<AdminTeacher | null>(null)

  // Form states
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    school: '',
    initialPassword: '',
  })
  const [editForm, setEditForm] = useState({
    fullName: '',
    school: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await getTeachers({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        page,
        size,
      })
      setTeachers(data.items)
      setTotalItems(data.totalItems)
      setTotalPages(data.totalPages)
    } catch (err) {
      setErrorMessage(parseApiError(err, 'Không thể tải danh sách giáo viên').message)
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, statusFilter, page, size])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- tải dữ liệu khi mở trang hoặc đổi bộ lọc
    fetchTeachers()
  }, [fetchTeachers])

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    setPage(0)
    fetchTeachers()
  }

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)
    try {
      await createTeacher(createForm)
      setIsCreateOpen(false)
      setCreateForm({ fullName: '', email: '', school: '', initialPassword: '' })
      setSuccessMessage('Thêm giáo viên mới thành công!')
      fetchTeachers()
    } catch (err) {
      const isConflict = axios.isAxiosError(err) && err.response?.status === 409
      setErrorMessage(
        isConflict ? 'Email này đã tồn tại trong hệ thống' : parseApiError(err, 'Lỗi tạo giáo viên').message,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedTeacher) return
    setErrorMessage('')
    setIsSubmitting(true)
    try {
      await updateTeacher(selectedTeacher.teacherId, editForm)
      setIsEditOpen(false)
      setSelectedTeacher(null)
      setSuccessMessage('Cập nhật thông tin giáo viên thành công!')
      fetchTeachers()
    } catch (err) {
      setErrorMessage(parseApiError(err, 'Lỗi cập nhật giáo viên').message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLockToggle = async (teacher: AdminTeacher) => {
    const isLocking = teacher.status === 'ACTIVE'
    const confirmText = isLocking
      ? `Bạn có chắc chắn muốn KHÓA tài khoản của giáo viên "${teacher.fullName}" (${teacher.email})? Giáo viên sẽ bị đăng xuất ngay lập tức.`
      : `Mở khóa tài khoản cho giáo viên "${teacher.fullName}"?`

    if (!window.confirm(confirmText)) return

    try {
      if (isLocking) {
        await lockTeacher(teacher.teacherId)
        setSuccessMessage(`Đã khóa tài khoản giáo viên ${teacher.fullName}`)
      } else {
        await unlockTeacher(teacher.teacherId)
        setSuccessMessage(`Đã mở khóa tài khoản giáo viên ${teacher.fullName}`)
      }
      fetchTeachers()
    } catch (err) {
      setErrorMessage(parseApiError(err, 'Không thể thay đổi trạng thái tài khoản').message)
    }
  }

  const openEditModal = (t: AdminTeacher) => {
    setSelectedTeacher(t)
    setEditForm({
      fullName: t.fullName,
      school: t.school || '',
    })
    setIsEditOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Quản lý Giáo viên</h2>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi, phân quyền, cấp mới và điều phối trạng thái tài khoản giáo viên
          </p>
        </div>
        <Button
          onClick={() => {
            setErrorMessage('')
            setIsCreateOpen(true)
          }}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Icon name="plus" className="w-4 h-4" />
          <span>Thêm giáo viên mới</span>
        </Button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <ErrorNotice message={errorMessage} />
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center space-x-2">
            <Icon name="check" className="w-5 h-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-600 hover:text-emerald-900 text-xs font-semibold"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo họ tên hoặc email giáo viên..."
              className={inputClass()}
            />
          </div>
          <Button type="submit" variant="secondary" className="shrink-0 flex items-center space-x-1.5">
            <Icon name="search" className="w-4 h-4" />
            <span>Tìm kiếm</span>
          </Button>
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label htmlFor="status-filter" className="text-xs font-medium text-slate-500 shrink-0">
            Trạng thái:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(0)
            }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
            <option value="LOCKED">Bị khóa (LOCKED)</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-6">Họ và Tên</th>
                <th className="py-3.5 px-6">Email</th>
                <th className="py-3.5 px-6">Trường / Đơn vị</th>
                <th className="py-3.5 px-6 text-center">Trạng thái</th>
                <th className="py-3.5 px-6">Ngày tham gia</th>
                <th className="py-3.5 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Đang tải danh sách giáo viên...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy giáo viên phù hợp với tiêu chí tìm kiếm.
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.teacherId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-800">{t.fullName}</td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-xs">{t.email}</td>
                    <td className="py-4 px-6 text-slate-600">{t.school || '—'}</td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          t.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {t.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs">
                      {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(t)}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLockToggle(t)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                          t.status === 'ACTIVE'
                            ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                            : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {t.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-500">
          <span>
            Tổng cộng: <strong className="text-slate-700">{totalItems}</strong> giáo viên (Trang {page + 1}/{totalPages || 1})
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

      {/* Modal: Thêm giáo viên mới */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Thêm Giáo viên Mới</h3>
            <p className="text-xs text-slate-500 mb-5">
              Cấp tài khoản giáo viên mới với quyền truy cập hệ thống soạn thảo bài giảng.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <FormField id="create-fullName" label="Họ và tên giáo viên" required>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Thị Mai"
                  className={inputClass()}
                />
              </FormField>

              <FormField id="create-email" label="Địa chỉ Email" required>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="teacher@school.edu.vn"
                  className={inputClass()}
                />
              </FormField>

              <FormField id="create-school" label="Trường / Đơn vị công tác">
                <input
                  type="text"
                  value={createForm.school}
                  onChange={(e) => setCreateForm({ ...createForm, school: e.target.value })}
                  placeholder="Ví dụ: Trường Tiểu học Chu Văn An"
                  className={inputClass()}
                />
              </FormField>

              <FormField id="create-password" label="Mật khẩu khởi tạo" required hint="Ít nhất 6 ký tự">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createForm.initialPassword}
                  onChange={(e) => setCreateForm({ ...createForm, initialPassword: e.target.value })}
                  placeholder="••••••••"
                  className={inputClass()}
                />
              </FormField>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white hover:bg-indigo-700">
                  {isSubmitting ? 'Đang tạo...' : 'Tạo mới giáo viên'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh sửa thông tin giáo viên */}
      {isEditOpen && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Chỉnh sửa thông tin</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">{selectedTeacher.email}</p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <FormField id="edit-fullName" label="Họ và tên giáo viên" required>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className={inputClass()}
                />
              </FormField>

              <FormField id="edit-school" label="Trường / Đơn vị công tác">
                <input
                  type="text"
                  value={editForm.school}
                  onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                  className={inputClass()}
                />
              </FormField>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={() => {
                    setIsEditOpen(false)
                    setSelectedTeacher(null)
                  }}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white hover:bg-indigo-700">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
