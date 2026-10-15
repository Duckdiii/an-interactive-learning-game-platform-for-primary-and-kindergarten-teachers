import { forwardRef, useId } from 'react'
import { Link } from 'react-router-dom'
import { gameTypeLabel } from '../../constants/labels'
import { viText } from '../../constants/viText'
import { ROUTES } from '../../routes/paths'
import type { GameResponse } from '../../types/game-response.types'
import type { GenerateFailure } from '../../utils/generateErrors'
import Button from '../Button'
import { buttonClass } from '../buttonStyles'
import Icon from '../ui/Icon'
import MockBadge from '../ui/MockBadge'

interface CreateGamesProgressProps {
  // Các loại giáo viên đã chọn, theo thứ tự.
  types: ReadonlyArray<string>
  creating: boolean
  canceled: boolean
  created: Readonly<Record<string, GameResponse>>
  failures: Readonly<Record<string, GenerateFailure>>
  // Kết quả do AI mô phỏng: nhắc rõ nội dung chỉ là bản mẫu.
  mock: boolean
  onRetry: () => void
  onCancel: () => void
}

const text = viText.generator

// Kết quả từng loại khi tạo game bằng AI: đang tạo, đã tạo (có lối mở), hoặc lỗi riêng của loại đó. Chỉ hiện khi đã có kết quả hay đang chạy.
// `forwardRef` để trang đưa tiêu điểm vào khối này khi có lỗi một phần hoặc khi đã hủy.
const CreateGamesProgress = forwardRef<HTMLDivElement, CreateGamesProgressProps>(function CreateGamesProgress(
  { types, creating, canceled, created, failures, mock, onRetry, onCancel },
  ref,
) {
  const titleId = useId()
  const hasResult = types.some((type) => created[type] || failures[type])

  if (!creating && !hasResult && !canceled) return null

  const failedTypes = types.filter((type) => failures[type])
  // Chỉ lỗi có thể khác đi khi thử lại y nguyên mới có nút "Thử lại" (đổi ý tưởng thì có nút quay lại sửa mô tả ở dưới).
  const retryable = failedTypes.some((type) => ['busy', 'rateLimited', 'other'].includes(failures[type].kind))
  const title = creating ? text.creatingTitle : canceled ? text.canceledTitle : text.partialTitle

  return (
    <div ref={ref} tabIndex={-1} role="group" aria-labelledby={titleId} className="space-y-4 rounded-3xl border-2 border-ink/10 bg-white p-5 outline-none sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={titleId} className="text-xl font-extrabold">
          {title}
        </h3>
        {mock ? <MockBadge /> : null}
      </div>
      {mock ? <p className="text-base text-ink-soft">{text.mockCreatedNote}</p> : null}

      <ul className="space-y-2">
        {types.map((type) => {
          const game = created[type]
          const failure = failures[type]

          return (
            <li key={type} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 p-3">
              <div className="min-w-0">
                <p className="text-base font-bold">{gameTypeLabel(type)}</p>
                {game ? (
                  <p className="flex items-center gap-2 text-sm text-brand-strong">
                    <Icon name="check" className="h-4 w-4" />
                    {text.typeCreated}
                  </p>
                ) : failure ? (
                  <p className="flex items-start gap-2 text-sm font-semibold text-rose-800">
                    <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{failure.message}</span>
                  </p>
                ) : creating ? (
                  <p className="text-sm text-ink-soft">{text.typeCreating}</p>
                ) : (
                  <p className="text-sm text-ink-soft">{text.typeNotCreated}</p>
                )}
              </div>
              {game ? (
                <Link
                  to={`${ROUTES.workspaceEditor}?gameId=${encodeURIComponent(game.gameId)}`}
                  className={`${buttonClass('secondary')} min-h-11`}
                  aria-label={`${text.openGame}: ${gameTypeLabel(type)}`}
                >
                  {text.openGame}
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>

      {creating ? (
        <Button type="button" variant="secondary" onClick={onCancel}>
          {text.cancelCreate}
        </Button>
      ) : retryable || canceled ? (
        <div className="space-y-2">
          {canceled ? <p className="text-base text-ink-soft">{text.canceledNote}</p> : null}
          <Button type="button" onClick={onRetry}>
            {canceled ? text.createRest : text.retryMissing}
          </Button>
        </div>
      ) : null}
    </div>
  )
})

export default CreateGamesProgress
