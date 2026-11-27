import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClassrooms } from '../../hooks/useClassrooms'
import { ROUTES, roomJoinPath } from '../../routes/paths'
import type { GameResponse } from '../../types/game-response.types'
import { PROFILES } from '../profile/profiles'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'
import {
  assignLiveTeam, controlLiveRoom, findLiveRoom, findOpenLiveRoom, getLiveRoom, getLiveTeamLeaderboard,
  liveRoomError, openLiveRoom, type GroupingStrategy, type LiveRoomType, type OpenLiveRoom, type RoomAction,
} from './liveRoomApi'

const actionClass = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-play-primary px-5 font-bold text-play-primary-ink disabled:opacity-50'
const fieldClass = 'min-h-12 rounded-xl border border-play-outline bg-play-surface px-3'
const teamCounts = [2, 3, 4, 5, 6]
const averageFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

export default function LiveRoomHost({ game }: { game: GameResponse }) {
  usePlayerRootStyle(PROFILES.hocSinh)
  const [classroomId, setClassroomId] = useState('')
  const [sessionType, setSessionType] = useState<LiveRoomType>('SOLO')
  const [groupingStrategy, setGroupingStrategy] = useState<GroupingStrategy>('RANDOM')
  const [teamCount, setTeamCount] = useState(2)
  const [capacity, setCapacity] = useState('')
  const [room, setRoom] = useState<OpenLiveRoom>()
  const classrooms = useClassrooms()
  const queryClient = useQueryClient()
  const lookup = useQuery({
    queryKey: ['open-live-room', game.gameId],
    queryFn: () => findOpenLiveRoom(game.gameId),
    enabled: !room,
  })
  const open = useMutation({
    mutationFn: () => openLiveRoom(game.gameId, sessionType === 'TEAM'
      ? { sessionType, classroomId: classroomId || undefined, groupingStrategy, teams: Array.from({ length: teamCount }, (_, index) => ({ teamName: `Đội ${index + 1}` })) }
      : { sessionType, classroomId: classroomId || undefined, maxParticipants: capacity ? Number(capacity) : undefined }),
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
    mutationFn: (action: RoomAction) => controlLiveRoom(current!.sessionId, action),
    onSuccess: ({ status }) => {
      if (current) setRoom({ ...current, status })
      if (detail.data) queryClient.setQueryData(detailKey, { ...detail.data, status })
      void queryClient.invalidateQueries({ queryKey: detailKey })
      void queryClient.invalidateQueries({ queryKey: ['live-team-leaderboard', current?.sessionId] })
    },
  })
  const status = detail.data?.status ?? current?.status
  const isTeam = current?.sessionType === 'TEAM'
  const teamSettings = useQuery({
    queryKey: ['live-room-pin', current?.accessCode],
    queryFn: () => findLiveRoom(current!.accessCode),
    enabled: isTeam && status === 'WAITING',
  })
  const currentStrategy = teamSettings.data?.groupingStrategy
  const hasUnassigned = detail.data?.participants.some((student) => !student.teamId)
  const canStart = !isTeam || Boolean(detail.data && currentStrategy && (currentStrategy === 'RANDOM' || !hasUnassigned))
  const leaderboard = useQuery({
    queryKey: ['live-team-leaderboard', current?.sessionId],
    queryFn: () => getLiveTeamLeaderboard(current!.sessionId),
    enabled: isTeam && status !== 'WAITING',
    refetchInterval: status === 'CLOSED' ? false : 3000,
  })
  const assign = useMutation({
    mutationFn: ({ participantId, teamId }: { participantId: string; teamId: string }) => assignLiveTeam(current!.sessionId, participantId, teamId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: detailKey }),
  })
  const canOpen = lookup.isSuccess && !classrooms.isPending && !classrooms.isError && !open.isPending
  const resultsQuery = new URLSearchParams({ gameId: game.gameId, type: current?.sessionType ?? 'SOLO' })
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
            <label htmlFor="live-room-mode" className="font-bold">Chế độ chơi</label>
            <select id="live-room-mode" className={fieldClass} value={sessionType} disabled={open.isPending}
              onChange={(event) => setSessionType(event.target.value as LiveRoomType)}>
              <option value="SOLO">Cá nhân</option>
              <option value="TEAM">Thi đấu nhóm</option>
            </select>
            {sessionType === 'TEAM' ? (
              <>
                <label htmlFor="live-room-team-count" className="font-bold">Số đội</label>
                <select id="live-room-team-count" className={fieldClass} value={teamCount} disabled={open.isPending}
                  onChange={(event) => setTeamCount(Number(event.target.value))}>
                  {teamCounts.map((count) => <option key={count}>{count}</option>)}
                </select>
                <label htmlFor="live-room-grouping" className="font-bold">Cách chia đội</label>
                <select id="live-room-grouping" className={fieldClass} value={groupingStrategy} disabled={open.isPending}
                  onChange={(event) => setGroupingStrategy(event.target.value as GroupingStrategy)}>
                  <option value="RANDOM">Ngẫu nhiên</option>
                  <option value="MANUAL_ASSIGN">Giáo viên xếp đội</option>
                  <option value="FREE_CHOICE">Học sinh tự chọn</option>
                </select>
              </>
            ) : (
              <>
                <label htmlFor="live-room-capacity" className="font-bold">Số học sinh tối đa (không bắt buộc)</label>
                <input id="live-room-capacity" className={fieldClass} type="number" min={1} max={2147483647}
                  value={capacity} disabled={open.isPending} onChange={(event) => setCapacity(event.target.value)} />
              </>
            )}
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
            {detail.isError ? <p role="alert">Chưa tải được phòng. Hãy thử lại.</p> : null}
            {control.isError ? <p role="alert">{liveRoomError(control.error, 'Chưa cập nhật được phòng. Hãy thử lại.')}</p> : null}
            {assign.isError ? <p role="alert">{liveRoomError(assign.error, 'Chưa xếp được đội. Hãy thử lại.')}</p> : null}
            {teamSettings.isError && status === 'WAITING' ? (
              <p role="alert">Chưa tải được cách chia đội. <button type="button" onClick={() => void teamSettings.refetch()}>Thử lại</button></p>
            ) : null}
            {detail.data ? (
              <ol aria-label="Học sinh trong phòng" className="space-y-2">
                {[...detail.data.participants].sort((a, b) => b.score - a.score).map((student) => (
                  <li key={student.participantId} className="flex flex-wrap items-center gap-2">
                    <span>{student.nickname} · {student.score} điểm · {student.answeredCount} câu</span>
                    {status === 'WAITING' && currentStrategy === 'MANUAL_ASSIGN' ? (
                      <select className={fieldClass} aria-label={`Xếp đội cho ${student.nickname}`}
                        value={student.teamId ?? ''} disabled={assign.isPending || control.isPending}
                        onChange={(event) => assign.mutate({ participantId: student.participantId, teamId: event.target.value })}>
                        <option value="" disabled>Chưa xếp đội</option>
                        {detail.data?.teams.map((team) => <option key={team.teamId} value={team.teamId}>{team.teamName}</option>)}
                      </select>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}
            {status === 'WAITING' && hasUnassigned && currentStrategy && currentStrategy !== 'RANDOM'
              ? <p>Chờ tất cả học sinh có đội trước khi bắt đầu.</p> : null}
            {isTeam && leaderboard.data ? (
              <section>
                <h2 className="font-bold">Bảng xếp hạng đội</h2>
                <ol className="list-decimal space-y-1 pl-5">
                  {leaderboard.data.map((team) => (
                    <li key={team.teamId}>{team.teamName} · {averageFormat.format(team.score)} điểm trung bình · {team.memberCount} học sinh</li>
                  ))}
                </ol>
              </section>
            ) : null}
            {leaderboard.isError ? <p role="alert">Chưa tải được bảng xếp hạng đội. <button type="button" onClick={() => void leaderboard.refetch()}>Thử lại</button></p> : null}
            <div className="flex flex-wrap gap-3">
              {status === 'WAITING' ? <button type="button" className={actionClass} disabled={!canStart || control.isPending || assign.isPending} onClick={() => control.mutate('start')}>Bắt đầu</button> : null}
              {status === 'ACTIVE' ? <button type="button" className={actionClass} disabled={control.isPending} onClick={() => control.mutate('pause')}>Tạm dừng</button> : null}
              {status === 'PAUSED' ? <button type="button" className={actionClass} disabled={control.isPending} onClick={() => control.mutate('resume')}>Tiếp tục</button> : null}
              {status !== 'CLOSED' ? <button type="button" className={actionClass} disabled={control.isPending} onClick={() => control.mutate('close')}>Kết thúc phòng</button> : null}
              {status === 'CLOSED' ? <Link className={actionClass} to={`${ROUTES.results}?${resultsQuery}`}>Xem kết quả</Link> : null}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
