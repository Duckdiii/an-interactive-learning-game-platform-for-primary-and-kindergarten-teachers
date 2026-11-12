import { useEffect, useRef, useState } from 'react'
import { getNotoCatalog } from '../../../api/notoCatalogApi'
import type { NotoCatalogAsset } from '../../../api/notoCatalogApi'
import type { OddOneOutQuestion } from '../../../types/game-dsl.types'
import Button from '../../Button'
import CheckedTextField from './CheckedTextField'
import type { QuestionFormProps } from './formTypes'
import { fieldMessage } from './issueText'

export default function OddOneOutImageForm({ question: raw, issues, onUpdate }: QuestionFormProps) {
  const question = raw as OddOneOutQuestion
  const [catalog, setCatalog] = useState<NotoCatalogAsset[] | null>(null)
  const [catalogState, setCatalogState] = useState<'idle' | 'loading' | 'failed' | 'ready'>('idle')
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const loadCatalog = async () => {
    setCatalogState('loading')
    try {
      const assets = await getNotoCatalog()
      if (!alive.current) return
      setCatalog(assets)
      setCatalogState('ready')
    } catch {
      if (alive.current) setCatalogState('failed')
    }
  }

  const replaceImage = (itemId: string, assetId: string) => {
    const asset = catalog?.find((entry) => entry.id === assetId)
    if (!asset) return
    onUpdate((current) => {
      const odd = current as OddOneOutQuestion
      if (!odd.items.some((item) => item.id === itemId)
        || odd.items.some((item) => item.id !== itemId && item.assetId === asset.id)) return current
      return { ...odd, items: odd.items.map((item) => item.id === itemId
        ? { ...item, text: asset.label, assetId: asset.id, imageUrl: asset.imageUrl } : item) }
    })
  }

  return <div className="space-y-5">
    <CheckedTextField id="odd-image-question" label="Tiêu chí câu hỏi" multiline
      value={question.questionText ?? ''} limits={{ min: 1, max: 255 }}
      error={fieldMessage(issues, 'questionText')}
      onCommit={(questionText) => onUpdate((current) => ({ ...current, questionText }))} />
    <fieldset className="space-y-3">
      <legend className="font-bold">Kiểm tra hình và chọn đáp án khác loại</legend>
      <p className="text-sm text-ink-soft">Kiểm tra tiêu chí khớp với các hình và chỉ có một đáp án khác loại.</p>
      {catalogState === 'idle' && <Button type="button" variant="secondary" onClick={() => void loadCatalog()}>Thay ảnh từ thư viện</Button>}
      {catalogState === 'loading' && <p role="status">Đang tải thư viện ảnh...</p>}
      {catalogState === 'failed' && <div><p role="alert">Không tải được thư viện ảnh. Vui lòng thử lại.</p>
        <Button type="button" variant="secondary" onClick={() => void loadCatalog()}>Thử tải lại</Button></div>}
      {catalogState === 'ready' && catalog?.length === 0 && <p role="status">Thư viện hiện chưa có ảnh.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {question.items.map((item) => <div key={item.id} className="flex flex-col items-center gap-2 rounded-xl border-2 border-ink/10 p-3">
          <img src={item.imageUrl} alt={item.text} className="h-20 w-20 object-contain" />
          <span>{item.text}</span>
          {catalogState === 'ready' && catalog && catalog.length > 0 && <select
            aria-label={`Thay ảnh: ${item.text}`} value={item.assetId ?? ''}
            className="w-full rounded-xl border-2 border-line bg-surface p-2"
            onChange={(event) => replaceImage(item.id, event.target.value)}>
            {!catalog.some((asset) => asset.id === item.assetId) && <option value={item.assetId ?? ''}>Ảnh hiện tại</option>}
            {catalog.map((asset) => <option key={asset.id} value={asset.id}
              disabled={question.items.some((other) => other.id !== item.id && other.assetId === asset.id)}>{asset.label}</option>)}
          </select>}
          <label className="flex items-center gap-2"><input type="radio" name="odd-image-answer"
            aria-label={`Đáp án khác loại: ${item.text}`} checked={question.oddOneOutId === item.id}
            onChange={() => onUpdate((current) => ({ ...current, oddOneOutId: item.id }))} /> Khác loại</label>
        </div>)}
      </div>
    </fieldset>
    {fieldMessage(issues, 'oddOneOutId') ? <p role="alert">{fieldMessage(issues, 'oddOneOutId')}</p> : null}
    {fieldMessage(issues, 'items') ? <p role="alert">{fieldMessage(issues, 'items')}</p> : null}
  </div>
}
