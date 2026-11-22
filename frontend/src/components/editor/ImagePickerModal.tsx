import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { searchPexelsImages } from '../../services/mediaService'
import type { PexelsImage } from '../../services/mediaService'
import Button from '../Button'

export interface ImagePickerModalProps {
  initialQuery?: string
  onSelect: (imageUrl: string) => void
  onClose: () => void
}

export default function ImagePickerModal({ initialQuery = '', onSelect, onClose }: ImagePickerModalProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<PexelsImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (initialQuery.trim()) {
      void handleSearch(initialQuery.trim())
    }
    // Chỉ tìm theo initialQuery một lần lúc mở hộp thoại; gõ tiếp thì chỉ tìm khi bấm Tìm hoặc Enter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = async (searchTerm?: string) => {
    const q = (searchTerm ?? query).trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setHasSearched(true)
    try {
      const images = await searchPexelsImages(q, 12)
      setResults(images)
    } catch {
      setError('Không thể tải ảnh từ máy chủ. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleSearch()
    }
  }

  useEffect(() => {
    const onGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onGlobalKeyDown)
    return () => window.removeEventListener('keydown', onGlobalKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink/10 pb-3">
          <h3 id="image-picker-title" className="text-xl font-bold text-ink">
            Chọn ảnh minh họa từ Pexels
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="text-ink-soft hover:text-ink text-2xl font-bold px-2 py-1 leading-none rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            ×
          </button>
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm ảnh, ví dụ: con mèo, quả táo, hình tròn..."
            className="flex-1 rounded-xl border-2 border-ink/20 px-4 py-2 text-base text-ink placeholder:text-ink-soft/60 focus:border-brand focus:outline-none"
          />
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleSearch()}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[240px] max-h-[50vh] pr-1">
          {loading && (
            <div className="flex items-center justify-center h-48 text-ink-soft" role="status">
              <span className="animate-pulse">Đang tìm kiếm hình ảnh phù hợp...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center h-48 text-rose-600 font-medium" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && hasSearched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-ink-soft text-center p-4">
              <p className="font-semibold">Không tìm thấy ảnh nào với từ khóa "{query}"</p>
              <p className="text-sm mt-1">Hãy thử tìm với từ khóa đơn giản hơn hoặc từ đồng nghĩa.</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {results.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => {
                    onSelect(img.url)
                    onClose()
                  }}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-ink/10 bg-surface-sun hover:ring-2 hover:ring-brand focus:ring-2 focus:ring-brand focus:outline-none text-left transition-all"
                  aria-label={`Chọn ảnh ${img.alt || 'Pexels'}`}
                >
                  <div className="aspect-square w-full overflow-hidden bg-ink/5">
                    <img
                      src={img.thumbnailUrl || img.url}
                      alt={img.alt || 'Pexels photo'}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  {img.photographer && (
                    <span className="p-1.5 text-[11px] text-ink-soft truncate w-full block">
                      {img.photographer}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center border-t border-ink/10 pt-3 text-xs text-ink-soft">
          <span>Nguồn ảnh miễn phí từ Pexels API</span>
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
        </div>
      </div>
    </div>
  )
}
