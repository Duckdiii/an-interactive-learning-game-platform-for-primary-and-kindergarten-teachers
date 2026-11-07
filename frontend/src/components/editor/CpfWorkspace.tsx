import { useState } from 'react'
import CpfRenderer from '../../games/cpf/CpfRenderer'
import { ROUTES } from '../../routes/paths'
import type { CpfGameResponse } from '../../types/game-response.types'
import Button from '../Button'
import ButtonLink from '../ButtonLink'

/**
 * Trình xem game ngoài danh mục (`gameType` CUSTOM, CPF v2.0.0): giáo viên chơi thử bản xem trước. Chưa có form sửa
 * nội dung CPF (ngoài phạm vi bước này); muốn khác thì tạo lại bằng mô tả mới.
 */
export default function CpfWorkspace({ game }: { game: CpfGameResponse }) {
  // Đổi key để chơi lại từ đầu mà không giữ trạng thái màn cũ.
  const [run, setRun] = useState(0)
  const { cpf } = game

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
      <div className="overflow-hidden rounded-card bg-surface p-2 shadow-card sm:p-4">
        <CpfRenderer key={run} mode="preview" game={cpf} />
      </div>
    </div>
  )
}
