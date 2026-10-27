import LoadingSpinner from '../../components/LoadingSpinner'
import { viText } from '../../constants/viText'

// Màn chờ quanh lượt chơi; màn lỗi theo khung nằm ở player/errors.

const screen = 'grid min-h-screen place-items-center bg-play-page play-safe-x play-safe-y [--play-pad-y:0px] text-center text-play-ink'

export function PlayStarting() {
  return (
    <main className={screen}>
      <LoadingSpinner label={viText.player.starting} />
    </main>
  )
}
