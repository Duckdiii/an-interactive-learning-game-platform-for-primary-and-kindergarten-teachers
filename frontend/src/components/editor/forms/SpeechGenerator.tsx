import { useEffect, useRef } from 'react'
import { viText } from '../../../constants/viText'
import { synthesizeSpeech } from '../../../services/mediaService'
import type { VoiceGender } from '../../../services/mediaService'
import { parseApiError } from '../../../utils/apiError'
import Button from '../../Button'
import MockBadge from '../../ui/MockBadge'
import type { MediaToolsApi } from './MediaField'
import OperationStatus from './OperationStatus'
import { useVoicePreference } from './VoiceContext'

const text = viText.editor.media

const VOICES: ReadonlyArray<{ value: VoiceGender; label: string }> = [
  { value: 'FEMALE', label: text.voiceFemale },
  { value: 'MALE', label: text.voiceMale },
]

interface SpeechGeneratorProps {
  idPrefix: string
  // Lời đọc của câu: nội dung sẽ được đọc thành tiếng.
  audioText: string | undefined
  tools: MediaToolsApi
}

// Chọn giọng đọc nam hoặc nữ (FLD-12) và tạo âm thanh thuyết minh từ "Lời đọc". Mô phỏng: backend chưa có điểm cuối tạo giọng đọc.
export default function SpeechGenerator({ idPrefix, audioText, tools }: SpeechGeneratorProps) {
  const { voice, setVoice } = useVoicePreference()
  const source = audioText?.trim() ?? ''
  const id = `${idPrefix}-speech`
  const wasActive = useRef(false)

  // Tạo xong, lỗi hoặc đã hủy thì nút Tạo giọng đọc hiện lại: trả tiêu điểm về đó (nút Hủy vừa bị thay mất).
  useEffect(() => {
    if (wasActive.current && !tools.toolActive) document.getElementById(`${id}-generate`)?.focus()
    wasActive.current = tools.toolActive
  }, [tools.toolActive, id])

  const generate = async () => {
    const result = await tools.runTool(({ signal }) => synthesizeSpeech(source, voice, signal), {
      describeError: (error) => parseApiError(error, text.voiceFailed).message,
    })

    if (result) tools.apply(result.mediaUrl)
  }

  return (
    <div className="space-y-3 border-t-2 border-ink/10 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-base font-semibold text-ink">{text.voiceGenerate}</h4>
        <MockBadge />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink">{text.voiceLegend}</legend>
        <div className="flex flex-wrap gap-2">
          {VOICES.map((option) => (
            <label
              key={option.value}
              className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-ink/20 px-4 text-base has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
            >
              <input
                type="radio"
                name={`${id}-voice`}
                value={option.value}
                checked={voice === option.value}
                disabled={tools.disabled}
                onChange={() => setVoice(option.value)}
                className="h-5 w-5 accent-brand"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {tools.toolActive ? (
        <OperationStatus
          label={text.voiceGenerating}
          progress={null}
          cancelLabel={text.voiceCancel}
          onCancel={tools.op.cancel}
        />
      ) : (
        <Button
          id={`${id}-generate`}
          type="button"
          variant="secondary"
          onClick={() => void generate()}
          disabled={source === '' || tools.disabled}
          aria-describedby={source === '' ? `${id}-need` : undefined}
        >
          {text.voiceGenerate}
        </Button>
      )}
      {source === '' ? (
        <p id={`${id}-need`} className="text-sm text-ink-soft">
          {text.voiceNeedText}
        </p>
      ) : null}
      {tools.toolError ? (
        <p role="alert" className="text-sm font-semibold text-rose-800">
          {tools.toolError}
        </p>
      ) : null}
    </div>
  )
}
