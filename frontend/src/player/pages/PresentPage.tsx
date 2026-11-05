import axios from 'axios'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { viText } from '../../constants/viText'
import { useGame } from '../../hooks/useGame'
import { usePageTitle } from '../../hooks/usePageTitle'
import { ROUTES } from '../../routes/paths'
import PlayerLoading from '../components/PlayerLoading'
import { playSound } from '../../games/common/sound'
import type { GameResponse } from '../../types/game-response.types'
import PresentLobby from '../present/PresentLobby'
import PresentPlay from '../present/PresentPlay'
import { useFullscreen } from '../present/useFullscreen'
import { usePresentKeys } from '../present/usePresentKeys'
import { resolveUiProfile } from '../profile/resolveUiProfile'
import { UiProfileProvider } from '../profile/UiProfileContext'
import PresentShell from '../shells/PresentShell'
import { resolveTheme } from '../theme/resolveTheme'
import { ThemeProvider } from '../theme/ThemeContext'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'

const text = viText.present
const barButton = 'min-h-14 rounded-xl px-5 text-base font-extrabold'
const quietButton = `${barButton} bg-white/15 text-white hover:bg-white/25`
// Âm ngắn có sẵn của phần chơi: đủ để biết loa tivi đã kêu chưa.
const SOUND_CHECK = '/sounds/correct.wav'

// 'play' gồm cả màn kết quả: PresentPlay giữ trạng thái từng câu nên tự chuyển sang kết quả.
type Phase = 'lobby' | 'play'

// Phần có trạng thái của buổi trình chiếu (sảnh chờ → chơi → kết quả), tách khỏi trang để hook không nằm sau các lệnh return sớm.
function PresentSession({ game, end, onLeave }: { game: GameResponse; end: ReactNode; onLeave: () => void }) {
  const [phase, setPhase] = useState<Phase>('lobby')
  const fullscreen = useFullscreen()
  const start = () => setPhase('play')

  usePresentKeys({ ' ': () => (phase === 'lobby' ? start() : false) })

  if (phase === 'lobby') {
    return (
      <PresentShell
        hint={text.lobbyHint}
        controls={
          <>
            <button type="button" onClick={start} className={`${barButton} bg-play-primary text-play-primary-ink hover:bg-play-primary-strong`}>
              <span aria-hidden="true">▶ </span>
              {text.start}
            </button>
            {fullscreen.supported ? (
              <button type="button" aria-pressed={fullscreen.active} onClick={fullscreen.toggle} className={quietButton}>
                {fullscreen.active ? text.exitFullscreen : text.fullscreen}
              </button>
            ) : null}
            <button type="button" onClick={() => playSound(SOUND_CHECK)} className={quietButton}>
              {text.soundCheck}
            </button>
            {end}
          </>
        }
      >
        <PresentLobby game={game} />
      </PresentShell>
    )
  }

  // "Kết thúc" trên thanh chơi sang màn kết quả; chỉ màn kết quả mới cho rời trang.
  return <PresentPlay game={game} onLeave={onLeave} />
}

// 4xx là kết quả chắc chắn (không có game này, hoặc không phải game của cô); mạng hay máy chủ lỗi thì thử lại được.
const isMissing = (error: unknown) => axios.isAxiosError(error) && (error.response?.status ?? 0) >= 400 && (error.response?.status ?? 0) < 500

// Trình chiếu trên tivi lớp (P4): chạy hết ở máy giáo viên từ bản game đầy đủ, chấm tại chỗ, không lưu gì lên máy chủ (PLAN Q5).
export default function PresentPage() {
  usePageTitle(text.title)
  const { gameId = '' } = useParams()
  const query = useGame(gameId)
  const navigate = useNavigate()
  const game = query.data
  const profile = resolveUiProfile({ gradeLevel: game?.metadata.gradeLevel })
  const theme = resolveTheme({
    themeId: (game?.metadata as { theme?: string })?.theme || null,
    gameType: game?.gameType,
    subject: game?.metadata.subject,
  })

  usePlayerRootStyle(profile)

  if (query.isPending) return <PlayerLoading />

  const leave = () => navigate(ROUTES.workspace)
  const end = (
    <button type="button" onClick={leave} className={quietButton}>
      {text.end}
    </button>
  )

  return (
    <UiProfileProvider profile={profile}>
      <ThemeProvider theme={theme}>
        {game ? (
          <PresentSession game={game} end={end} onLeave={leave} />
        ) : (
          <PresentShell controls={end}>
            <div className="m-auto max-w-xl space-y-6 text-center">
              <h1 className="text-4xl font-extrabold">{isMissing(query.error) ? text.notFound : text.loadFailed}</h1>
              {isMissing(query.error) ? (
                <Link to={ROUTES.workspace} className="inline-flex min-h-14 items-center text-xl font-bold underline">
                  {text.backToShelf}
                </Link>
              ) : (
                <button type="button" onClick={() => void query.refetch()} className={`${barButton} bg-play-ink text-white`}>
                  {text.retry}
                </button>
              )}
            </div>
          </PresentShell>
        )}
      </ThemeProvider>
    </UiProfileProvider>
  )
}
