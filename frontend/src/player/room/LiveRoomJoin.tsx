import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../routes/paths'
import { resolvePresentation } from '../../utils/presentation'
import type { PlayerSession, StudentGame } from '../../types/game-student.types'
import { RealPlayerApi } from '../api/realPlayerApi'
import { resumeAudioContext } from '../audio/audioLock'
import PlayController from '../play/PlayController'
import { loadSession, saveSession, type StoredSession } from '../play/sessionStore'
import { PROFILES } from '../profile/profiles'
import { resolveUiProfile } from '../profile/resolveUiProfile'
import { UiProfileProvider } from '../profile/UiProfileContext'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'
import { PresentationProvider } from '../theme/PresentationContext'
import { resolveTheme } from '../theme/resolveTheme'
import { ThemeProvider } from '../theme/ThemeContext'
import { findLiveRoom, joinLiveRoom } from './liveRoomApi'
import { RoomJoinErrorScreen } from './RoomStudentScreen'

const button = 'min-h-12 rounded-xl bg-play-primary px-5 font-bold text-play-primary-ink disabled:opacity-50'

export default function LiveRoomJoin({ pin }: { pin: string }) {
  const storageKey = `room:${pin}`
  const [nickname, setNickname] = useState('')
  const [joined, setJoined] = useState<StoredSession | null>(() => loadSession(storageKey))
  const [opened, setOpened] = useState<{ game: StudentGame; session: PlayerSession }>()
  const query = useQuery({
    queryKey: ['live-room-pin', pin],
    queryFn: () => findLiveRoom(pin),
    refetchInterval: (entry) => joined && entry.state.data?.status !== 'CLOSED' ? 3000 : false,
  })
  const room = query.data
  const profile = opened ? resolveUiProfile({ gradeLevel: opened.game.metadata.gradeLevel }) : PROFILES.hocSinh
  usePlayerRootStyle(profile)
  const join = useMutation({
    mutationFn: (name: string) => joinLiveRoom(room!.sessionId, name),
    onSuccess: (session) => {
      saveSession(storageKey, session)
      setJoined(session)
      void query.refetch()
    },
  })
  const start = useMutation({
    mutationFn: async () => {
      const game = await new RealPlayerApi(joined!.participantId).getGameForStudent(joined!.sessionId)
      setOpened({ game, session: { ...joined!, sessionType: room!.sessionType, status: 'ACTIVE', expiresAt: '' } })
    },
  })
  const participant = joined?.sessionId === room?.sessionId ? joined : null

  if (query.isSuccess && (!room || room.status === 'CLOSED')) return <RoomJoinErrorScreen code="SESSION_CLOSED" />
  if (opened && room?.status === 'ACTIVE') {
    const { title, subject, topic } = opened.game.metadata
    const theme = resolveTheme({ gameType: opened.game.gameType, subject, topic })
    return (
      <UiProfileProvider profile={profile}>
        <ThemeProvider theme={theme}>
          <PresentationProvider presentation={resolvePresentation(undefined, theme.id, title)}>
        <PlayController shareCode={storageKey} room={{ ...opened, progress: participant?.progress }} info={{
          gameTitle: opened.game.metadata.title,
          gameType: opened.game.gameType,
          questionCount: opened.game.questions.length,
          metadata: opened.game.metadata,
          uiOverride: 'AUTO',
          themeId: null,
        }} />
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
        {query.isPending ? <p role="status">Đang tìm phòng…</p> : null}
        {query.isError ? <p role="alert">Chưa tải được phòng. <button type="button" className="underline" onClick={() => void query.refetch()}>Thử lại</button></p> : null}
        {room && !participant ? (
          <form className="grid gap-3" onSubmit={(event) => {
            event.preventDefault()
            if (nickname.trim() && !join.isPending) join.mutate(nickname.trim())
          }}>
            <label htmlFor="live-room-nickname" className="font-bold">Biệt danh</label>
            <input id="live-room-nickname" className="min-h-12 rounded-xl border border-play-outline px-3"
              value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} required />
            {join.isError ? <p role="alert">Chưa vào được phòng. Hãy kiểm tra biệt danh và thử lại.</p> : null}
            <button type="submit" className={button} disabled={join.isPending || !nickname.trim()}>Vào phòng</button>
          </form>
        ) : null}
        {participant && room?.status !== 'ACTIVE' ? <p role="status">{room?.status === 'PAUSED' ? 'Phòng đang tạm dừng' : 'Đang đợi giáo viên bắt đầu'}</p> : null}
        {participant && room?.status === 'ACTIVE' ? (
          <>
            {start.isError ? <p role="alert">Chưa tải được câu hỏi. Hãy thử lại.</p> : null}
            <button type="button" className={button} disabled={start.isPending} onClick={() => { resumeAudioContext(); start.mutate() }}>
              {start.isPending ? 'Đang tải…' : 'Vào chơi'}
            </button>
          </>
        ) : null}
      </div>
    </main>
  )
}
