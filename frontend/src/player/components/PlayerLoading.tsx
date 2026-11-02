import LoadingSpinner from '../../components/LoadingSpinner'
import { viText } from '../../constants/viText'

// Chờ thông tin xuất bản: chưa biết theme nên không có nhân vật.
export default function PlayerLoading() {
  return (
    <main role="status" className="grid min-h-screen place-items-center bg-play-page play-safe-x play-safe-y [--play-pad-x:0px] [--play-pad-y:0px] text-play-ink">
      <div className="flex flex-col items-center gap-3 text-xl font-bold">
        <p>{viText.player.opening}</p>
        <LoadingSpinner />
      </div>
    </main>
  )
}
