import { useEffect, useRef, useState } from 'react'
import Button from '../Button'
import { postGenerateNarrationPreview } from '../../api/gamesApi'
import { parseApiError } from '../../utils/apiError'
import type { Subject } from '../../types/game-dsl.types'
import type { PlayTestQuestionNarration } from './usePlayTestNarrationAudio'

type NarrationPreviewControlProps = {
  gameId: string
  questionId: string
  audioText?: string
  subject?: Subject
  hasSourceAudio: boolean
  saved: boolean
  onAudioReady?: (questionId: string, narration?: PlayTestQuestionNarration) => void
}

export default function NarrationPreviewControl(props: NarrationPreviewControlProps) {
  const { gameId, questionId, audioText, subject, hasSourceAudio, saved } = props
  return <PreviewRequest key={JSON.stringify([gameId, questionId, audioText, subject, hasSourceAudio, saved])} {...props} />
}

function PreviewRequest({ gameId, questionId, audioText, subject = 'VIETNAMESE',
  hasSourceAudio, saved, onAudioReady }: NarrationPreviewControlProps) {
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string>()
  const [error, setError] = useState<string>()
  const requestVersion = useRef(0)

  useEffect(() => {
    onAudioReady?.(questionId)
    return () => { requestVersion.current += 1 }
  }, [questionId, onAudioReady])

  if (!audioText?.trim() || hasSourceAudio) return null

  const preview = async () => {
    const currentRequest = ++requestVersion.current
    setLoading(true)
    setError(undefined)
    try {
      const result = await postGenerateNarrationPreview(gameId, questionId)
      if (requestVersion.current === currentRequest) {
        if (result.questionId !== questionId) throw new Error('Narration preview belongs to another question')
        setAudioUrl(result.audioUrl)
        onAudioReady?.(questionId, { gameId, audioText: audioText ?? '', audioUrl: result.audioUrl })
      }
    } catch (cause) {
      if (requestVersion.current === currentRequest) {
        setError(parseApiError(cause, 'Không tạo được giọng đọc. Hãy kiểm tra cấu hình dịch vụ rồi thử lại.').message)
      }
    } finally {
      if (requestVersion.current === currentRequest) setLoading(false)
    }
  }

  const english = subject === 'ENGLISH'
  const provider = english ? 'ElevenLabs' : 'Viettel'

  return (
    <section aria-label="Thuyết minh câu hỏi" className="rounded-2xl border border-ink/15 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-ink">{english ? 'Giọng đọc tiếng Anh' : 'Giọng đọc tiếng Việt'}</h3>
          <p className="text-sm text-ink-soft">Tạo bản nghe thử từ lời đọc đã lưu bằng {provider}.</p>
        </div>
        <Button type="button" variant="secondary" disabled={!saved || loading} onClick={preview}>
          {loading ? 'Đang tạo…' : audioUrl ? 'Tạo lại' : 'Tạo giọng đọc'}
        </Button>
      </div>
      {!saved ? <p className="mt-2 text-sm text-ink-soft">Lưu câu hỏi trước khi tạo giọng đọc.</p> : null}
      {error ? <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
      {audioUrl ? <audio className="mt-3 w-full" controls preload="none" src={audioUrl}>Trình duyệt không hỗ trợ phát âm thanh.</audio> : null}
    </section>
  )
}
