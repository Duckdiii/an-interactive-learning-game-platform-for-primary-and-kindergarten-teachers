import { useState } from 'react'
import type { ReactNode } from 'react'
import { viText } from '../../constants/viText'
import { primaryButton, quietButton } from '../present/presentStyles'
import { PROFILES } from '../profile/profiles'
import PresentShell from '../shells/PresentShell'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'
import RoomBoardScreen from './RoomBoardScreen'
import type { TeacherRoomClient } from './RoomClient'
import RoomLobby, { KickDialog, type RoomInfo } from './RoomLobby'
import RoomPodium, { CloseRoomDialog } from './RoomPodium'
import RoomQuestionScreen from './RoomQuestionScreen'
import { teacherRoomView } from './teacherRoomReducer'
import { useTeacherRoom } from './useTeacherRoom'

const text = viText.room

interface RoomTeacherScreenProps {
  client: TeacherRoomClient
  room: RoomInfo
}

/** Màn tivi của phòng thi đấu, chọn màn theo trạng thái phòng. */
export default function RoomTeacherScreen({ client, room }: RoomTeacherScreenProps) {
  const { state, actionFailed, busy, run, command, connect } = useTeacherRoom(client)
  const [kicking, setKicking] = useState(false)
  const [closing, setClosing] = useState(false)
  const view = teacherRoomView(state)
  const { question, board } = state
  const paused = state.status === 'PAUSED'
  const lastQuestion = question !== null && question.index + 1 >= question.total

  // Không có hook này thì các lớp màu play-* trong suốt, nút "Bắt đầu" không nhìn thấy.
  usePlayerRootStyle(PROFILES.hocSinh)

  const button = (className: string, label: string, action: () => void, disabled = false) => (
    <button type="button" className={className} disabled={disabled || busy || state.connection !== 'connected'} onClick={action}>
      {label}
    </button>
  )

  const bars: Partial<Record<typeof view, { controls: ReactNode; hint: string }>> = {
    lobby: {
      hint: text.lobby.barHint,
      controls: (
        <>
          {button(
            primaryButton,
            text.lobby.start,
            () =>
              command(async () => {
                await client.start()
                await client.next()
              }),
            state.participants.length === 0,
          )}
          {button(quietButton, text.lobby.kick, () => setKicking(true))}
        </>
      ),
    },
    question: {
      hint: text.question.barHint,
      controls: (
        <>
          {button(quietButton, text.question.endEarly, () => command(() => client.endQuestion()), paused)}
          {paused ? button(primaryButton, text.question.resume, () => command(() => client.resume())) : button(quietButton, text.question.pause, () => command(() => client.pause()))}
        </>
      ),
    },
    board: {
      hint: text.board.barHint,
      controls: (
        <>
          {lastQuestion ? button(primaryButton, text.board.finish, () => command(() => client.finish())) : button(primaryButton, text.board.next, () => command(() => client.next()))}
          {button(quietButton, text.board.reveal((board?.afterIndex ?? 0) + 1), () => command(() => client.reveal()), state.revealed)}
        </>
      ),
    },
    finished: { hint: text.podium.barHint, controls: button(quietButton, text.podium.close, () => setClosing(true)) },
    // `next` sau `start` lỗi thì phòng đã chạy mà chưa có câu: để cô bấm lại.
    started: { hint: text.board.barHint, controls: button(primaryButton, text.board.next, () => command(() => client.next())) },
  }

  return (
    <PresentShell hint={bars[view]?.hint} controls={bars[view]?.controls}>
      {view === 'lobby' ? <RoomLobby room={room} participants={state.participants} /> : null}
      {view === 'question' && question ? (
        <RoomQuestionScreen
          // Đổi câu, tiếp tục sau tạm dừng hay nối lại (`serverNow` mới) thì đồng hồ tính lại từ số máy chủ báo.
          key={`${question.questionId}-${question.endsAt}-${question.serverNow}`}
          title={room.title}
          question={question}
          remainingMs={state.remainingMs}
          paused={paused}
          answeredCount={state.answeredCount}
          participantCount={state.participantCount}
        />
      ) : null}
      {view === 'board' && board ? <RoomBoardScreen board={board} revealed={state.revealed} /> : null}
      {view === 'finished' && state.finished ? <RoomPodium finished={state.finished} /> : null}
      {view === 'closed' || view === 'started' ? <p className="m-auto text-4xl font-extrabold">{view === 'closed' ? text.closed : text.started}</p> : null}

      {state.connection === 'reconnecting' ? (
        <p role="status" className="absolute right-6 top-4 rounded-full bg-play-ink px-4 py-2 text-lg font-bold text-white">
          {text.reconnecting}
        </p>
      ) : null}
      {state.connection === 'disconnected' ? (
        <div role="alert" className="absolute right-6 top-4 flex items-center gap-3 rounded-full bg-play-ink py-2 pl-4 pr-2 text-lg font-bold text-white">
          {text.disconnected}
          <button type="button" onClick={connect} className="min-h-11 rounded-full bg-white/15 px-4 hover:bg-white/25">
            {text.retry}
          </button>
        </div>
      ) : null}
      {actionFailed ? (
        <p role="alert" className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-play-ink px-4 py-2 text-lg font-bold text-white">
          {text.actionFailed}
        </p>
      ) : null}
      {kicking && view === 'lobby' ? <KickDialog participants={state.participants} onKick={(id) => run(() => client.kick(id))} onClose={() => setKicking(false)} /> : null}
      {closing && view === 'finished' ? (
        <CloseRoomDialog
          onCancel={() => setClosing(false)}
          onConfirm={() => {
            setClosing(false)
            command(() => client.close())
          }}
        />
      ) : null}
    </PresentShell>
  )
}
