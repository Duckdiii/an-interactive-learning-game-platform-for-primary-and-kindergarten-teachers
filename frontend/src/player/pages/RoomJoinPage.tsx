import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { viText } from '../../constants/viText'
import { usePageTitle } from '../../hooks/usePageTitle'
import PlayerLoading from '../components/PlayerLoading'
import NicknameScreen from '../intro/NicknameScreen'
import { PROFILES } from '../profile/profiles'
import { UiProfileProvider } from '../profile/UiProfileContext'
import { getRoomApi } from '../room/getRoomApi'
import { RoomJoinError } from '../room/RoomClient'
import type { RoomJoinErrorCode } from '../room/RoomClient'
import type { FoundRoom, JoinedRoom } from '../room/RoomApi'
import RoomStudentScreen, { RoomJoinErrorScreen } from '../room/RoomStudentScreen'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'

type Lookup = { pin: string; room: FoundRoom | null }

/** Vào phòng bằng PIN: tra phòng, đặt biệt danh, rồi chơi theo lệnh của cô. */
export default function RoomJoinPage() {
  usePlayerRootStyle(PROFILES.hocSinh)
  usePageTitle(viText.player.join.pageTitle)

  const { pin = '' } = useParams()
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [joined, setJoined] = useState<(JoinedRoom & { nickname: string }) | null>(null)
  const [error, setError] = useState<RoomJoinErrorCode | null>(null)
  // Khóa đồng bộ: bấm đúp "Vào" không được tạo hai bạn.
  const pending = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    let active = true

    getRoomApi()
      .then((api) => api.findByPin(pin))
      .catch(() => null)
      .then((room) => {
        if (active) setLookup({ pin, room })
      })

    return () => {
      active = false
    }
  }, [pin])

  useEffect(() => () => joined?.leave(), [joined])

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [])

  const join = async (nickname: string) => {
    if (pending.current) return

    pending.current = true

    try {
      const api = await getRoomApi()
      const room = await api.join(pin, nickname)

      // Bấm Back lúc đang chờ: rời phòng ngay, không để lại một bạn trên tivi.
      if (mounted.current) setJoined({ ...room, nickname })
      else room.leave()
    } catch (failure) {
      if (mounted.current) setError(failure instanceof RoomJoinError ? failure.code : 'SESSION_CLOSED')
    }
  }

  if (error) return <RoomJoinErrorScreen code={error} />
  if (!lookup || lookup.pin !== pin) return <PlayerLoading />
  // Mã sai và phòng đã đóng trông như nhau với học sinh: cả hai đều không vào được phòng này nữa.
  if (!lookup.room) return <RoomJoinErrorScreen code="SESSION_CLOSED" />
  if (joined) return <RoomStudentScreen client={joined.client} nickname={joined.nickname} game={lookup.room.game} />

  return (
    <UiProfileProvider profile={PROFILES.hocSinh}>
      <NicknameScreen info={lookup.room.info} onSubmit={(nickname) => void join(nickname)} />
    </UiProfileProvider>
  )
}
