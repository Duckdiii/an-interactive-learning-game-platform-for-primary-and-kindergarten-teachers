import type { LottieEngine, LottieHarness } from './playerTypes'

/** Số liệu của MỘT bộ phát đang sống. */
export interface PlayerStats {
  engine: LottieEngine
  ready: () => boolean
  frames: () => number
  plays: () => number
  completed: () => boolean
  domNodes: () => number
}

const players = new Set<PlayerStats>()

/** Gộp mọi bộ phát đang sống thành một tín hiệu đo: tổng khung/lần phát/nút DOM, «xong» và «sẵn sàng» khi TẤT CẢ đã xong. */
function aggregate(): LottieHarness | undefined {
  const all = [...players]
  if (all.length === 0) return undefined
  return {
    engine: all[0].engine,
    count: all.length,
    ready: () => all.every((p) => p.ready()),
    frames: () => all.reduce((sum, p) => sum + p.frames(), 0),
    plays: () => all.reduce((sum, p) => sum + p.plays(), 0),
    completed: () => all.every((p) => p.completed()),
    domNodes: () => all.reduce((sum, p) => sum + p.domNodes(), 0),
  }
}

function publish(): void {
  const harness = aggregate()
  if (harness) window.__lottieHarness = harness
  else delete window.__lottieHarness
}

/** Đăng ký một bộ phát; trả hàm gỡ. Tín hiệu `window.__lottieHarness` luôn là tổng hợp của các bộ phát còn sống. */
export function registerPlayer(stats: PlayerStats): () => void {
  players.add(stats)
  publish()
  return () => {
    players.delete(stats)
    publish()
  }
}
