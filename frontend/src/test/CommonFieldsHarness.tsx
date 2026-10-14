import { useCallback, useMemo, useRef, useState } from 'react'
import CommonFieldsForm from '../components/editor/forms/CommonFieldsForm'
import { PendingEditsContext } from '../components/editor/forms/PendingEditsContext'
import { VoiceContext } from '../components/editor/forms/VoiceContext'
import type { VoiceGender } from '../services/mediaService'
import type { GameType, QuestionDsl } from '../types/game-dsl.types'
import type { PendingProbe, QuestionStore } from './probes'

interface HarnessProps {
  initial: QuestionDsl
  gameType?: GameType
  // Nơi test đọc câu HIỆN HÀNH (sau mọi bản vá) mà không phụ thuộc lần vẽ.
  store: QuestionStore
  pending?: PendingProbe
  // Nút phụ để giả lập giáo viên sửa một trường khác trong lúc việc chậm đang chạy.
  extraPatch?: { label: string; apply: (question: QuestionDsl) => QuestionDsl }
}

/**
 * Khung thử cho `CommonFieldsForm`: giữ một câu hỏi và áp các bản vá `onUpdate` lên câu HIỆN HÀNH (giống `useGameEditor.updateQuestion`),
 * kèm bộ đếm thao tác chờ và giọng đọc, để thử tải tệp mà không cần dựng cả trang soạn thảo.
 */
export default function CommonFieldsHarness({ initial, gameType = 'QUIZ', store, pending, extraPatch }: HarnessProps) {
  const [question, setQuestion] = useState<QuestionDsl>(initial)
  const [voice, setVoice] = useState<VoiceGender>('FEMALE')
  const latest = useRef(initial)

  const onUpdate = useCallback(
    (update: (value: QuestionDsl) => QuestionDsl) => {
      latest.current = update(latest.current)
      store.set(latest.current)
      setQuestion(latest.current)
    },
    [store],
  )
  const pendingApi = useMemo(() => ({ begin: pending ? pending.begin : () => () => {} }), [pending])
  const voiceApi = useMemo(() => ({ voice, setVoice }), [voice])

  return (
    <PendingEditsContext.Provider value={pendingApi}>
      <VoiceContext.Provider value={voiceApi}>
        <CommonFieldsForm gameType={gameType} idPrefix="t" question={question} issues={[]} onUpdate={onUpdate} />
        {extraPatch ? (
          <button type="button" onClick={() => onUpdate(extraPatch.apply)}>
            {extraPatch.label}
          </button>
        ) : null}
      </VoiceContext.Provider>
    </PendingEditsContext.Provider>
  )
}
