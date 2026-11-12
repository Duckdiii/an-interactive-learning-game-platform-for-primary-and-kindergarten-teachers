import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { viText } from '../../constants/viText'
import CpfRenderer from '../../games/cpf/CpfRenderer'
import { ROUTES } from '../../routes/paths'
import { saveCpfGame } from '../../services/reviseService'
import { isCpfGameResponse, type CpfGameResponse } from '../../types/game-response.types'
import { parseApiError } from '../../utils/apiError'
import Button from '../Button'
import ButtonLink from '../ButtonLink'
import ReviseChatPanel from './ReviseChatPanel'

const reviseText = viText.reviseChat

/**
 * Trình xem game ngoài danh mục (`gameType` CUSTOM, CPF v2.0.0): giáo viên chơi thử bản xem trước. Chưa có form sửa nội dung CPF;
 * sửa bằng trò chuyện: AI trả bản sửa, giáo viên chơi thử bản đó rồi chọn giữ (lưu) hoặc bỏ.
 */
export default function CpfWorkspace({ game }: { game: CpfGameResponse }) {
  // Đổi key để chơi lại từ đầu mà không giữ trạng thái màn cũ.
  const [run, setRun] = useState(0)
  const [revised, setRevised] = useState<CpfGameResponse | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const shown = revised ?? game
  const { cpf } = shown

  const keep = async () => {
    if (!revised) return
    setSaving(true)
    try {
      await saveCpfGame(game.gameId, revised.cpf)
      // Làm mới cả game đang mở và danh sách (tên game có thể đã đổi).
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['game'] }), queryClient.invalidateQueries({ queryKey: ['games'] })])
      setRevised(null)
      setNotice(viText.reviseChat.kept)
    } catch (error) {
      setNotice(parseApiError(error, viText.reviseChat.errorFallback).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-soft">Trò chơi tự do · {cpf.content.rounds.length} màn</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{cpf.metadata.title}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => setRun((n) => n + 1)}>
            Chơi lại từ đầu
          </Button>
          <ButtonLink to={ROUTES.workspace} variant="secondary">
            Về danh sách game
          </ButtonLink>
        </div>
      </div>
      {revised ? <p className="rounded-xl bg-sun-soft px-4 py-3 text-base font-semibold">{reviseText.cpfPreviewing}</p> : null}
      <div className="overflow-hidden rounded-card bg-surface p-2 shadow-card sm:p-4">
        <CpfRenderer key={`${run}-${revised ? 'revised' : 'saved'}`} mode="preview" game={cpf} />
      </div>
      <ReviseChatPanel
        gameId={game.gameId}
        blockedReason={revised ? reviseText.cpfDecideFirst : null}
        onRevised={(next) => {
          if (!isCpfGameResponse(next)) return reviseText.errorFallback
          setRevised(next)
          setNotice(null)
          return reviseText.cpfApplied
        }}
        actions={
          <>
            {revised ? (
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => void keep()} disabled={saving}>
                  {saving ? reviseText.cpfSaving : reviseText.cpfKeep}
                </Button>
                <Button type="button" variant="secondary" disabled={saving} onClick={() => setRevised(null)}>
                  {reviseText.cpfDiscard}
                </Button>
              </div>
            ) : null}
            <p role="status" className="text-sm text-ink-soft">
              {notice}
            </p>
          </>
        }
      />
    </div>
  )
}
