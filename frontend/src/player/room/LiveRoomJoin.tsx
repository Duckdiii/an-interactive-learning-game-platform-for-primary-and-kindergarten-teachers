import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../routes/paths'
import { resolvePresentation } from '../../utils/presentation'
import type { PlayerSession, StudentGame } from '../../types/game-student.types'
import { RealPlayerApi } from '../api/realPlayerApi'
import { resumeAudioContext } from '../audio/audioLock'
import PlayController from '../play/PlayController'
import { loadSession, saveSession, type StoredProgress, type StoredSession } from '../play/sessionStore'
import { PROFILES } from '../profile/profiles'
import { resolveUiProfile } from '../profile/resolveUiProfile'
import { UiProfileProvider } from '../profile/UiProfileContext'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'
import { PresentationProvider } from '../theme/PresentationContext'
import { resolveTheme } from '../theme/resolveTheme'
import { ThemeProvider } from '../theme/ThemeContext'
import { changeLiveTeam, findLiveRoom, getLiveResult, joinLiveRoom, liveRoomError } from './liveRoomApi'

const button = 'min-h-12 rounded-xl bg-play-primary px-5 font-bold text-play-primary-ink disabled:opacity-50'

export default function LiveRoomJoin({ pin }: { pin: string }) {
  const storageKey = `room:${pin}`
  const [nickname, setNickname] = useState('')
  const [teamId, setTeamId] = useState('')
  const [joined, setJoined] = useState<StoredSession | null>(() => loadSession(storageKey))
  const [opened, setOpened] = useState<{ game: StudentGame; session: PlayerSession; progress: StoredProgress }>()
  const [connectionLost, setConnectionLost] = useState(() => !navigator.onLine)
  const query = useQuery({
    queryKey: ['live-room-pin', pin],
    queryFn: () => findLiveRoom(pin),
    refetchInterval: (entry) => joined && entry.state.data?.status !== 'CLOSED' ? 3000 : false,
    retry: false,
  })
  const { refetch } = query
  useEffect(() => {
    const offline = () => setConnectionLost(true)
    const online = () => {
      void refetch().then(() => setConnectionLost(!navigator.onLine))
    }
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [refetch])

  const room = query.data
  const participant = joined?.sessionId === room?.sessionId ? joined : null
  const choosesTeam = room?.groupingStrategy === 'FREE_CHOICE'
  const paused = room?.status === 'PAUSED'
  const closed = room?.status === 'CLOSED'
  const disconnected = connectionLost || query.isRefetchError
  const result = useQuery({
    queryKey: ['live-room-result', participant?.sessionId, participant?.participantId],
    queryFn: () => getLiveResult(participant!.sessionId, participant!.participantId),
    enabled: Boolean(closed && participant),
  })
  const profile = opened ? resolveUiProfile({ gradeLevel: opened.game.metadata.gradeLevel }) : PROFILES.hocSinh
  usePlayerRootStyle(profile)
  const join = useMutation({
    mutationFn: (name: string) => joinLiveRoom(room!.sessionId, name, choosesTeam ? teamId : undefined),
    onSuccess: (session) => {
      saveSession(storageKey, session)
      setJoined(session)
      void query.refetch()
    },
  })
  const changeTeam = useMutation({
    mutationFn: (nextTeamId: string) => changeLiveTeam(participant!.sessionId, participant!.participantId, nextTeamId),
    onSuccess: (_, nextTeamId) => {
      setTeamId(nextTeamId)
      void refetch()
    },
  })
  const start = useMutation({
    mutationFn: async () => {
      const { sessionId, participantId } = participant!
      const game = await new RealPlayerApi(participantId).getGameForStudent(sessionId)
      const { score, correctCount } = await getLiveResult(sessionId, participantId)
      const saved = loadSession(storageKey)?.progress
      setOpened({
        game,
        session: { ...participant!, sessionType: room!.sessionType, status: 'ACTIVE', expiresAt: '' },
        progress: { score, correctCount, streak: saved?.streak ?? 0, bestStreak: saved?.bestStreak ?? 0 },
      })
    },
  })
  const connectionMessage = 'Kết nối bị gián đoạn. Đang kết nối lại…'
  const pauseMessage = 'Phòng đang tạm dừng. Hãy đợi giáo viên tiếp tục.'
  const joinError = liveRoomError(join.error, 'Chưa vào được phòng. Hãy thử lại.')

  if (opened && participant && !closed) {
    const { title, subject, topic } = opened.game.metadata
    const theme = resolveTheme({ gameType: opened.game.gameType, subject, topic })
    const blocked = paused || disconnected
    return (
      <UiProfileProvider profile={profile}>
        <ThemeProvider theme={theme}>
          <PresentationProvider presentation={resolvePresentation(undefined, theme.id, title)}>
            {blocked ? (
              <p role="status" className="fixed inset-0 z-50 grid place-items-center bg-play-page p-6 text-center text-xl font-bold text-play-ink">
                {disconnected ? connectionMessage : pauseMessage}
              </p>
            ) : null}
            <div inert={blocked} aria-hidden={blocked}>
              <PlayController shareCode={storageKey} room={opened} covered={blocked} info={{
                gameTitle: title,
                gameType: opened.game.gameType,
                questionCount: opened.game.questions.length,
                metadata: opened.game.metadata,
                uiOverride: 'AUTO',
                themeId: null,
              }} />
            </div>
          </PresentationProvider>
        </ThemeProvider>
      </UiProfileProvider>
    )
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-play-page p-6 text-play-ink">
      <div className="w-full max-w-md space-y-5">
        <Link className="inline-flex min-h-12 items-center underline" to={ROUTES.join}>Nhập mã khác</Link>
        <h1 className="text-3xl font-extrabold">{room?.gameTitle ?? 'Vào phòng chơi'}</h1>
        {query.isPending && !disconnected ? <p role="status">Đang tìm phòng…</p> : null}
        {disconnected ? <p role="status">{connectionMessage}</p> : null}
        {query.isError && !room ? <p role="alert">Chưa tải được phòng. <button type="button" className="underline" onClick={() => void refetch()}>Thử lại</button></p> : null}
        {query.isSuccess && room === null ? <p role="alert">Không tìm thấy phòng. Hãy kiểm tra lại mã PIN.</p> : null}
        {closed ? <p role="status">Phòng chơi đã kết thúc.</p> : null}
        {closed && result.data ? (
          <p>{result.data.score} điểm · {result.data.answeredCount}/{result.data.totalQuestions} câu đã trả lời</p>
        ) : null}
        {closed && result.isError ? (
          <p role="alert">Chưa tải được kết quả. <button type="button" className="underline" onClick={() => void result.refetch()}>Thử lại</button></p>
        ) : null}
        {room && !closed && !participant ? (
          <form className="grid gap-3" onSubmit={(event) => {
            event.preventDefault()
            if (nickname.trim() && (!choosesTeam || teamId) && !join.isPending && !disconnected) join.mutate(nickname.trim())
          }}>
            <label htmlFor="live-room-nickname" className="font-bold">Biệt danh</label>
            <input id="live-room-nickname" className="min-h-12 rounded-xl border border-play-outline px-3"
              value={nickname} onChange={(event) => setNickname(event.target.value)}
              aria-describedby="live-room-nickname-hint" maxLength={20} required />
            <p id="live-room-nickname-hint" className="text-sm">Dùng biệt danh từ 1 đến 20 ký tự.</p>
            {choosesTeam ? (
              <>
                <label htmlFor="live-room-team" className="font-bold">Chọn đội</label>
                <select id="live-room-team" className={button} value={teamId} onChange={(event) => setTeamId(event.target.value)} required>
                  <option value="" disabled>Chọn một đội</option>
                  {room.teams.map((team) => <option key={team.teamId} value={team.teamId}>{team.teamName}</option>)}
                </select>
              </>
            ) : null}
            {join.isError ? <p role="alert">{joinError}</p> : null}
            <button type="submit" className={button} disabled={disconnected || join.isPending || !nickname.trim() || (choosesTeam && !teamId)}>Vào phòng</button>
          </form>
        ) : null}
        {participant && paused ? <p role="status">{pauseMessage}</p> : null}
        {participant && room?.status === 'WAITING' ? <p role="status">Đang đợi giáo viên bắt đầu</p> : null}
        {participant && room?.status === 'WAITING' && choosesTeam ? (
          <>
            <label htmlFor="live-room-my-team" className="font-bold">Đổi đội</label>
            <select id="live-room-my-team" className={button} value={teamId} disabled={disconnected || changeTeam.isPending}
              onChange={(event) => changeTeam.mutate(event.target.value)}>
              <option value="" disabled>Chọn một đội</option>
              {room.teams.map((team) => <option key={team.teamId} value={team.teamId}>{team.teamName}</option>)}
            </select>
            {changeTeam.isError ? <p role="alert">{liveRoomError(changeTeam.error, 'Chưa đổi được đội. Hãy thử lại.')}</p> : null}
          </>
        ) : null}
        {participant && room?.status === 'ACTIVE' ? (
          <>
            {start.isError ? <p role="alert">Chưa tải được câu hỏi. Hãy thử lại.</p> : null}
            <button type="button" className={button} disabled={disconnected || start.isPending} onClick={() => { resumeAudioContext(); start.mutate() }}>
              {start.isPending ? 'Đang tải…' : 'Vào chơi'}
            </button>
          </>
        ) : null}
      </div>
    </main>
  )
}
