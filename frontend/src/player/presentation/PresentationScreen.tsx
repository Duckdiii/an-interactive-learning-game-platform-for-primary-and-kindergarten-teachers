import { useCallback, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import axiosInstance from '../../api/axiosInstance'
import { useLiveArenaSocket } from '../../hooks/useLiveArenaSocket'
import type {
  LiveArenaLeaderboardEntry,
  LiveArenaParticipant,
  LiveArenaQuestion,
  SessionPhase,
} from './presentationTypes'
import { WaitingRoomView } from './WaitingRoomView'
import { QuestionDisplayView } from './QuestionDisplayView'
import { LeaderboardDisplayView } from './LeaderboardDisplayView'

/**
 * Màn hình Presentation lớn (chiếu máy chiếu / tivi lớp học):
 * - Hiển thị mã PIN siêu to và mã QR để học sinh quét vào phòng chơi bằng điện thoại/tablet.
 * - Subscriber thuần (chỉ lắng nghe WebSocket STOMP, không gửi message /app/... điều khiển).
 * - Tự động chuyển đổi giữa 4 trạng thái: WAITING_ROOM -> QUESTION -> LEADERBOARD -> ENDED.
 * - Tự động khôi phục kết nối và đồng bộ lại phase qua REST API nếu rớt mạng.
 */
export function PresentationScreen() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()

  // shareCode lấy từ route state hoặc search param hoặc qua REST API
  const [shareCode, setShareCode] = useState<string>(() => {
    const fromState = (location.state as { shareCode?: string; pin?: string } | null)
    const fromSearch = new URLSearchParams(location.search).get('pin') || new URLSearchParams(location.search).get('code')
    return fromState?.shareCode || fromState?.pin || fromSearch || ''
  })

  const [phase, setPhase] = useState<SessionPhase>('WAITING_ROOM')
  const [participants, setParticipants] = useState<LiveArenaParticipant[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<LiveArenaQuestion | null>(null)
  const [leaderboard, setLeaderboard] = useState<LiveArenaLeaderboardEntry[]>([])

  // Đồng bộ lại trạng thái từ REST API khi reconnect hoặc khởi tạo. Gọi qua axiosInstance để có token và xử lý 401.
  const syncSession = useCallback(() => {
    if (!sessionId) return Promise.resolve()
    return axiosInstance.get(`/sessions/${encodeURIComponent(sessionId)}`)
      .then((res) => {
        if (!res.data) return
        const d = res.data.data ?? res.data
        if (d.shareCode) setShareCode(d.shareCode)
        if (d.phase) setPhase(d.phase)
        if (Array.isArray(d.participants)) setParticipants(d.participants)
        if (d.currentQuestion) setCurrentQuestion(d.currentQuestion)
        if (Array.isArray(d.leaderboard)) setLeaderboard(d.leaderboard)
      })
      .catch(() => {
        // Bỏ qua khi ở môi trường mock hoặc chưa có session API
      })
  }, [sessionId])

  useEffect(() => {
    void syncSession()
  }, [syncSession])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const joinUrl = `${origin}/join/${encodeURIComponent(shareCode)}`

  // Kết nối STOMP subscriber
  const { connected } = useLiveArenaSocket(sessionId ?? '', {
    onParticipantsUpdate: (payload) => {
      if (Array.isArray(payload.participants)) {
        setParticipants(payload.participants)
      }
    },
    onStateChange: (payload) => {
      if (payload.phase) {
        setPhase(payload.phase)
      }
    },
    onQuestion: (payload) => {
      setCurrentQuestion(payload.question ?? null)
    },
    onLeaderboard: (payload) => {
      if (Array.isArray(payload.entries)) {
        setLeaderboard(payload.entries)
      }
    },
    onReconnect: syncSession,
  })

  return (
    <main className="presentation-screen min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 relative selection:bg-amber-500 selection:text-slate-900 overflow-hidden">
      {/* Chỉ báo trạng thái kết nối STOMP ở góc màn hình */}
      <aside
        className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-sm shadow-md"
        aria-live="polite"
      >
        <span
          className={`size-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}
          aria-hidden="true"
        />
        <span className="text-slate-300 font-medium">
          {connected ? 'Trực tuyến' : 'Đang kết nối lại...'}
        </span>
      </aside>

      {/* Hiển thị màn hình theo 4 Phase */}
      {phase === 'WAITING_ROOM' && (
        <WaitingRoomView
          shareCode={shareCode}
          joinUrl={joinUrl}
          participants={participants}
        />
      )}

      {phase === 'QUESTION' && (
        <QuestionDisplayView question={currentQuestion} />
      )}

      {phase === 'LEADERBOARD' && (
        <LeaderboardDisplayView entries={leaderboard} />
      )}

      {phase === 'ENDED' && (
        <div className="text-center space-y-6 max-w-2xl bg-slate-800/80 p-12 rounded-3xl border border-slate-700 shadow-2xl">
          <p className="text-6xl font-black text-amber-400">🎉 Trò chơi đã kết thúc!</p>
          <p className="text-2xl text-slate-200">
            Cảm ơn các con đã tham gia và thi đấu thật xuất sắc!
          </p>
        </div>
      )}
    </main>
  )
}

export default PresentationScreen
