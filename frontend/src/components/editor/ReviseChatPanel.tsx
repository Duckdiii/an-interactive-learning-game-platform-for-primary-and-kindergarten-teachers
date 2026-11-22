import type { ReactNode } from 'react'
import { isMock } from '../../config/mockMode'
import { REVISE_INSTRUCTION_MAX } from '../../constants/aiLimits'
import { viText } from '../../constants/viText'
import { useReviseChat } from '../../hooks/useReviseChat'
import type { AnyGameResponse } from '../../types/game-response.types'
import RequestChat from '../create/RequestChat'

const text = viText.reviseChat

interface ReviseChatPanelProps {
  gameId: string
  /** Lý do chưa nhắn được (đang lưu, còn lỗi); null là nhắn được. AI sửa từ bản đã lưu nên bản đang sửa phải lưu xong trước. */
  blockedReason: string | null
  /** Nhận game đã sửa; trả câu trợ lý nhắn lại nếu khác câu mặc định. */
  onRevised: (game: AnyGameResponse) => string | void
  /** Gọi ngay trước mỗi lần gửi cho AI (kể cả Thử lại). */
  onSending?: () => void
  /** Nút sau khi áp (hoàn tác, giữ/bỏ bản sửa của game CPF). */
  actions?: ReactNode
}

/** Ngăn "Sửa bằng trò chuyện": dùng lại khung chat của trang tạo game, mỗi tin là một yêu cầu sửa cả game. */
export default function ReviseChatPanel({ gameId, blockedReason, onRevised, onSending, actions }: ReviseChatPanelProps) {
  const chat = useReviseChat(gameId, onRevised, onSending)
  const open = blockedReason === null

  return (
    <div className="space-y-3">
      <RequestChat
        idPrefix="revise-chat"
        labels={{ title: text.title, placeholder: text.placeholder, thinking: text.thinking, inputLabel: text.inputLabel }}
        intro={text.intro}
        maxLength={REVISE_INSTRUCTION_MAX}
        messages={chat.messages}
        question={null}
        pending={chat.pending}
        error={chat.error}
        canSend={chat.canSend && open}
        mock={isMock('ai')}
        onSend={(value) => (open ? chat.send(value) : false)}
        // Thử lại cũng sửa từ bản đã lưu: chặn như gửi mới để không ghi đè phần cô vừa sửa tay.
        onRetry={() => {
          if (open) chat.retry()
        }}
      />
      <p role="status" className="text-sm text-ink-soft">
        {!open && !chat.pending ? blockedReason : null}
      </p>
      {actions}
    </div>
  )
}
