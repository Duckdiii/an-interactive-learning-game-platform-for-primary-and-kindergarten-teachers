import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveArenaSocket } from '../hooks/useLiveArenaSocket'
import { useStompPublish } from '../hooks/useStompPublish'

export interface Participant {
  id: string
  name: string
  connected: boolean
}

export interface TeacherControlPanelProps {
  sessionId?: string
}

export function TeacherControlPanel({ sessionId: propSessionId }: TeacherControlPanelProps = {}) {
  const { sessionId: routeSessionId } = useParams()
  const sessionId = propSessionId || routeSessionId || ''

  const [participants, setParticipants] = useState<Participant[]>([])
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set())
  const [phase, setPhase] = useState<string>('WAITING_ROOM')

  const { publish } = useStompPublish(sessionId)

  const { connected } = useLiveArenaSocket(sessionId, {
    onParticipantsUpdate: (payload: unknown) => {
      const data = payload as { participants?: Array<{ id?: string; participantId?: string; name?: string; nickname?: string; connected?: boolean }> }
      const list = data?.participants || []
      const mapped: Participant[] = list.map((p) => ({
        id: p.id || p.participantId || '',
        name: p.name || p.nickname || 'Học sinh',
        connected: p.connected ?? true,
      }))
      setParticipants(mapped)
      setAnsweredIds(new Set()) // reset khi danh sách thay đổi (học sinh mới join)
    },
    onStateChange: (payload) => {
      setPhase(payload.phase)
      if (payload.phase === 'QUESTION') {
        setAnsweredIds(new Set()) // reset khi sang câu mới
      }
    },
    onAnswerStatus: (payload) => {
      if (payload?.participantId) {
        setAnsweredIds((prev) => new Set(prev).add(payload.participantId))
      }
    },
  })

  const handleKick = (participantId: string) => {
    publish(`/app/session/${sessionId}/kick/${participantId}`, {})
  }

  const answeredCount = answeredIds.size
  const totalCount = participants.length

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Học sinh tham gia ({totalCount})</h2>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              connected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-amber-500'
              }`}
            />
            {connected ? 'Live' : 'Đang kết nối...'}
          </span>
          {phase === 'QUESTION' && (
            <span className="text-gray-500 font-medium">
              Đã trả lời: {answeredCount}/{totalCount}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {participants.length === 0 ? (
          <p className="text-gray-400 italic text-center py-6">Chưa có học sinh nào tham gia...</p>
        ) : (
          participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border rounded-lg p-3 bg-white shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${p.connected ? 'bg-green-500' : 'bg-gray-300'}`}
                  title={p.connected ? 'Đang kết nối' : 'Mất kết nối'}
                />
                <span className="font-medium text-gray-900">{p.name}</span>
                {phase === 'QUESTION' && answeredIds.has(p.id) && (
                  <span className="text-green-600 text-sm font-semibold">✓ Đã trả lời</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleKick(p.id)}
                className="text-red-500 text-sm hover:underline"
              >
                Loại khỏi phiên
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
