import { useId, useState } from 'react'
import { postRegenerateGame } from '../../api/gamesApi'
import { isMock } from '../../config/mockMode'
import { REGENERATE_FEEDBACK_MAX } from '../../constants/aiLimits'
import { useCancellableOperation } from '../../hooks/useCancellableOperation'
import type { VoiceGender } from '../../services/mediaService'
import type { AnyGameResponse } from '../../types/game-response.types'
import { describeRegenerateError } from '../../utils/regenerateErrors'
import Button from '../Button'
import Dialog from '../ui/Dialog'
import { textareaClass } from '../ui/formStyles'
import OperationStatus from './forms/OperationStatus'
import { useVoicePreference } from './forms/VoiceContext'

interface Props {
  gameId: string
  gameType: AnyGameResponse['gameType']
  disabled: boolean
  onPreview: (game: AnyGameResponse) => boolean
}

export default function RegenerateGameButton({ gameId, gameType, disabled, onPreview }: Props) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [resultRejected, setResultRejected] = useState(false)
  const feedbackId = useId()
  const { run, state, cancel, clearError } = useCancellableOperation()
  const { voice, setVoice } = useVoicePreference()
  const working = state.status === 'working'
  const mocked = isMock('ai')

  const close = () => {
    setOpen(false)
    clearError()
    setResultRejected(false)
  }

  const submit = async () => {
    setResultRejected(false)
    const result = await run(({ signal }) => postRegenerateGame(gameId, feedback, voice, signal), {
      describeError: describeRegenerateError,
    })
    if (!result) return
    if (result.gameId !== gameId || result.gameType !== gameType || !onPreview(result)) {
      setResultRejected(true)
      return
    }
    setFeedback('')
    close()
  }

  return (
    <>
      <Button type="button" variant="secondary" disabled={disabled || mocked}
        title={mocked ? 'Tắt mô phỏng AI để làm lại toàn bộ trò chơi.' : undefined}
        onClick={() => setOpen(true)}>
        Tạo lại toàn bộ trò chơi
      </Button>
      {open ? (
        <Dialog title="Tạo lại toàn bộ trò chơi" initialFocusId={feedbackId} onEscape={working ? cancel : close}>
          <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); if (!working) void submit() }}>
            <p>AI sẽ thay toàn bộ nội dung trong bản đang soạn. Bạn có thể chơi thử trước khi bấm Lưu bản nháp.</p>
            <label htmlFor={feedbackId} className="block font-semibold">Gợi ý điều chỉnh (tùy chọn)</label>
            <textarea id={feedbackId} className={textareaClass(false)} maxLength={REGENERATE_FEEDBACK_MAX} rows={3}
              value={feedback} disabled={working} onChange={(event) => setFeedback(event.target.value)} />
            {gameType !== 'CUSTOM' ? (
              <label className="flex items-center gap-3">
                Giọng đọc
                <select value={voice} disabled={working} onChange={(event) => setVoice(event.target.value as VoiceGender)}
                  className="min-h-11 rounded-xl border border-ink/20 bg-surface px-3">
                  <option value="FEMALE">Giọng nữ</option>
                  <option value="MALE">Giọng nam</option>
                </select>
              </label>
            ) : null}
            {state.status === 'error' || resultRejected ? (
              <p role="alert">{state.status === 'error' ? state.message : 'Không áp dụng được bản xem trước. Nội dung hiện tại vẫn được giữ.'}</p>
            ) : null}
            {working ? (
              <OperationStatus label="AI đang tạo lại trò chơi" progress={null} cancelLabel="Hủy yêu cầu" onCancel={cancel} />
            ) : (
              <div className="flex gap-2">
                <Button type="submit">Xác nhận làm lại tất cả</Button>
                <Button type="button" variant="secondary" onClick={close}>Đóng</Button>
              </div>
            )}
          </form>
        </Dialog>
      ) : null}
    </>
  )
}
