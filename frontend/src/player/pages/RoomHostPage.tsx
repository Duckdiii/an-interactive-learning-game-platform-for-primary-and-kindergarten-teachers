import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MockBadge from '../../components/ui/MockBadge'
import { gradeLevelLabel, subjectLabel } from '../../constants/labels'
import { viText } from '../../constants/viText'
import { useGame } from '../../hooks/useGame'
import { usePageTitle } from '../../hooks/usePageTitle'
import { ROUTES, roomJoinPath } from '../../routes/paths'
import type { GameResponse } from '../../types/game-response.types'
import PlayerLoading from '../components/PlayerLoading'
import { PROFILES } from '../profile/profiles'
import { getPlayableRenderer } from '../renderers'
import { getRoomApi, isRoomAvailable } from '../room/getRoomApi'
import type { HostedRoom } from '../room/RoomApi'
import RoomTeacherScreen from '../room/RoomTeacherScreen'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'

const text = viText.room.host
const formatPin = (pin: string) => `${pin.slice(0, 3)} ${pin.slice(3)}`

function Message({ title }: { title: string }) {
  usePlayerRootStyle(PROFILES.hocSinh)

  return (
    <main className="grid min-h-dvh place-items-center bg-play-night p-8 text-center text-white">
      <div className="space-y-6">
        <h1 className="text-4xl font-extrabold">{title}</h1>
        <Link to={ROUTES.workspace} className="inline-flex min-h-14 items-center text-xl font-bold underline">
          {viText.present.backToShelf}
        </Link>
      </div>
    </main>
  )
}

/** Giữ bản game lúc mở: dữ liệu tải lại nền không được dựng lại phòng đang chạy. */
function HostedRoomScreen({ game }: { game: GameResponse }) {
  const [opened] = useState(game)
  const [room, setRoom] = useState<HostedRoom | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let close: (() => void) | undefined

    getRoomApi()
      .then((api) => api.open(opened))
      .then(
        (hosted) => {
          close = hosted.close
          if (active) setRoom(hosted)
          else close()
        },
        () => {
          if (active) setFailed(true)
        },
      )

    const closeOnLeave = () => close?.()

    window.addEventListener('pagehide', closeOnLeave)

    return () => {
      active = false
      window.removeEventListener('pagehide', closeOnLeave)
      close?.()
    }
  }, [opened])

  if (failed) return <Message title={text.openFailed} />
  if (!room) return <PlayerLoading />

  const { title, subject, gradeLevel } = opened.metadata

  return (
    <>
      <RoomTeacherScreen
        client={room.teacher}
        room={{
          title,
          subtitle: viText.player.nickname.meta(subjectLabel(subject), gradeLevelLabel(gradeLevel), opened.questions.length),
          pin: formatPin(room.pin),
          joinUrl: `${window.location.origin}${roomJoinPath(room.pin)}`,
        }}
      />
      <p className="fixed left-4 top-3 flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-play-ink">
        <MockBadge />
        {text.tabNote}
      </p>
    </>
  )
}

/** Tab tivi của phòng thi đấu. Chỉ giáo viên mở được, đáp án ở lại tab này. */
export default function RoomHostPage() {
  usePageTitle(viText.room.host.title)
  const { gameId = '' } = useParams()
  const query = useGame(gameId)

  if (!isRoomAvailable()) return <Message title={text.unavailable} />
  if (query.isPending) return <PlayerLoading />
  if (!query.data) return <Message title={viText.present.notFound} />
  if (!getPlayableRenderer(query.data.gameType)) return <Message title={viText.editor.publish.cards.room.unsupported} />

  return <HostedRoomScreen key={query.data.gameId} game={query.data} />
}
