import { useState } from 'react'
import { viText } from '../../../constants/viText'
import { suggestImages } from '../../../services/mediaService'
import type { ImageSuggestion } from '../../../services/mediaService'
import { parseApiError } from '../../../utils/apiError'
import Button from '../../Button'
import MockBadge from '../../ui/MockBadge'
import type { MediaToolsApi } from './MediaField'
import { useMediaOperation } from './useMediaOperation'

const text = viText.editor.media

interface ImageSuggestionsProps {
  idPrefix: string
  // Mô tả hình ảnh của câu (dùng làm từ khóa tìm ảnh).
  visualPrompt: string | undefined
  tools: Pick<MediaToolsApi, 'apply' | 'disabled'>
}

// Gợi ý ảnh theo "Mô tả hình ảnh" (FLD-11), mô phỏng nguồn Pexels với bộ lọc SafeSearch. Chỉ XEM: không đổi game cho tới khi giáo viên bấm "Dùng ảnh này".
export default function ImageSuggestions({ idPrefix, visualPrompt, tools }: ImageSuggestionsProps) {
  // Tìm ảnh không đổi game nên không khóa Lưu/Chơi thử.
  const op = useMediaOperation({ lockEditing: false })
  const [results, setResults] = useState<ImageSuggestion[] | null>(null)
  const query = visualPrompt?.trim() ?? ''
  const id = `${idPrefix}-suggestions`

  const search = async () => {
    const found = await op.run(({ signal }) => suggestImages(query, signal), {
      describeError: (error) => parseApiError(error, text.suggestionsFailed).message,
    })

    if (found) setResults(found)
  }

  return (
    <div className="space-y-3 border-t-2 border-ink/10 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-base font-semibold text-ink">{text.suggestionsHeading}</h4>
        <MockBadge />
      </div>
      <p id={`${id}-note`} className="text-sm text-ink-soft">
        {text.suggestionsSafeSearch}
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={() => void search()}
        disabled={query === '' || op.busy || tools.disabled}
        aria-describedby={query === '' ? `${id}-need` : `${id}-note`}
      >
        {text.suggestionsButton}
      </Button>
      {query === '' ? (
        <p id={`${id}-need`} className="text-sm text-ink-soft">
          {text.suggestionsNeedPrompt}
        </p>
      ) : null}

      <p role="status" className="text-sm text-ink-soft">
        {op.state.status === 'working' ? text.suggestionsSearching : ''}
      </p>
      {op.state.status === 'error' ? (
        <p role="alert" className="text-sm font-semibold text-rose-800">
          {op.state.message}
        </p>
      ) : null}

      {results && op.state.status !== 'working' ? (
        results.length === 0 ? (
          <p className="text-sm text-ink-soft">{text.suggestionsNone}</p>
        ) : (
          // Mỗi thẻ rộng tối thiểu 10rem để nút "Dùng ảnh này" không bị bẻ dòng, kể cả khi chỉ có một ảnh.
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
            {results.map((item) => (
              <li key={item.id} className="min-w-0 space-y-2 rounded-xl border-2 border-ink/10 p-2">
                <img src={item.url} alt={item.label} className="aspect-square w-full rounded-lg bg-paper object-contain" />
                <p className="text-xs text-ink-soft">
                  {text.suggestionsSource}: {item.credit}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  disabled={tools.disabled}
                  aria-label={`${text.suggestionsUse}: ${item.label}`}
                  onClick={() => tools.apply(item.url)}
                >
                  {text.suggestionsUse}
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  )
}
