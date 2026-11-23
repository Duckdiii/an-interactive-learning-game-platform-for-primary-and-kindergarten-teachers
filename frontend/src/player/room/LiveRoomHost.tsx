import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClassrooms } from '../../hooks/useClassrooms'
import { ROUTES, roomJoinPath } from '../../routes/paths'
import type { GameResponse } from '../../types/game-response.types'
import { PROFILES } from '../profile/profiles'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'
import { controlLiveRoom, findOpenLiveRoom, getLiveRoom, openLiveRoom, type OpenLiveRoom } from './liveRoomApi'

const actionClass = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-play-primary px-5 font-bold text-play-primary-ink disabled:opacity-50'

export default function LiveRoomHost({ game }: { game: GameResponse }) {
  usePlayerRootStyle(PROFILES.hocSinh)
  const [classroomId, setClassroomId] = useState('')
  const [room, setRoom] = useState<OpenLiveRoom>()
  const classrooms = useClassrooms()
  const queryClient = useQueryClient()
  const lookup = useQuery({
    queryKey: ['open-live-room', game.gameId],
    queryFn: () => findOpenLiveRoom(game.gameId),
    enabled: !room,
  })
  const open = useMutation({
    mutationFn: () => openLiveRoom(game.gameId, classroomId || undefined),
    onSuccess: setRoom,
    onError: () => void lookup.refetch(),
  })
  const current = room ?? lookup.data
  const detailKey = ['live-room', current?.sessionId]
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: () => getLiveRoom(current!.sessionId),
    enabled: Boolean(current),
    refetchInterval: (query) => query.state.data?.status === 'CLOSED' ? false : 3000,
  })
  const control = useMutation({
    mutationFn: (action: 'start' | 'close') => controlLiveRoom(current!.sessionId, action),
    onSuccess: ({ status }) => {
      if (current) setRoom({ ...current, status })
      if (detail.data) queryClient.setQueryData(detailKey, { ...detail.data, status })
      void queryClient.invalidateQueries({ queryKey: detailKey })
    },
  })
  const status = detail.data?.status ?? current?.status
  const canOpen = lookup.isSuccess && !classrooms.isPending && !classrooms.isError && !open.isPending
  const resultsQuery = new URLSearchParams({ gameId: game.gameId, type: 'SOLO' })
  if (room && classroomId) resultsQuery.set('classroomId', classroomId)

  return (
    <main className="min-h-dvh bg-play-page p-6 text-play-ink">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link className="inline-flex min-h-12 items-center underline" to={ROUTES.workspace}>Về kho trò chơi</Link>
        <h1 className="text-3xl font-extrabold">{game.metadata.title}</h1>
        {!current ? (
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (canOpen) open.mutate() }}>
            <label htmlFor="live-room-classroom" className="font-bold">Lớp học</label>
            <select id="live-room-classroom" className="min-h-12 rounded-xl border border-play-outline bg-play-surface px-3"
              value={classroomId} disabled={!canOpen} onChange={(event) => setClassroomId(event.target.value)}>
              <option value="">Không gắn lớp</option>
              {classrooms.data?.map((item) => <option key={item.classroomId} value={item.classroomId}>{item.className}</option>)}
            </select>
            {classrooms.isError || lookup.isError ? (
              <div role="alert">Chưa tải được thông tin mở phòng. <button type="button" className="underline" onClick={() => { void classrooms.refetch(); void lookup.refetch() }}>Thử lại</button></div>
            ) : null}
            {open.isError ? <p role="alert">Chưa mở được phòng. Hãy kiểm tra lớp đã chọn và thử lại.</p> : null}
            <button type="submit" className={actionClass} disabled={!canOpen}>{open.isPending ? 'Đang mở phòng…' : 'Mở phòng'}</button>
          </form>
        ) : (
          <section className="space-y-4" aria-label="Phòng chơi">
            <p>Mã PIN <strong className="ml-2 text-3xl tracking-widest">{current.accessCode}</strong></p>
            {status !== 'CLOSED' ? <Link className="underline" to={roomJoinPath(current.accessCode)} target="_blank" rel="noopener noreferrer">Đường dẫn cho học sinh</Link> : null}
            <p role="status">{status === 'WAITING' ? 'Đang chờ học sinh' : status === 'CLOSED' ? 'Phòng đã kết thúc' : status === 'PAUSED' ? 'Phòng đang tạm dừng' : 'Đang chơi'}</p>
            {detail.isError || control.isError ? <p role="alert">Chưa cập nhật được phòng. Hãy thử lại.</p> : null}
            {detail.data ? (
              <ol aria-label="Học sinh trong phòng" className="space-y-2">
                {[...detail.data.participants].sort((a, b) => b.score - a.score).map((student) => (
                  <li key={student.participantId}>{student.nickname} · {student.score} điểm · {student.answeredCount} câu</li>
                ))}
              </ol>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {status === 'WAITING' ? <button type="button" className={actionClass} disabled={control.isPending} onClick={() => control.mutate('start')}>Bắt đầu</button> : null}
              {status !== 'CLOSED' ? <button type="button" className={actionClass} disabled={control.isPending} onClick={() => control.mutate('close')}>Kết thúc phòng</button> : null}
              {status === 'CLOSED' ? <Link className={actionClass} to={`${ROUTES.results}?${resultsQuery}`}>Xem kết quả</Link> : null}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
