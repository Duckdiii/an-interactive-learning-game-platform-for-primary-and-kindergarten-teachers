import { DotLottie } from '@lottiefiles/dotlottie-web'
import wasmUrl from '@lottiefiles/dotlottie-web/dotlottie-player.wasm?url'
import { useEffect, useMemo, useRef, useState } from 'react'
import { finalFrame } from './lottieAnimations'
import { registerPlayer } from './lottieHarness'
import type { LottiePlayerProps } from './playerTypes'

// Mặc định thư viện tải WASM từ CDN bên ngoài; ép dùng tệp đi kèm gói (cục bộ, không gọi mạng ngoài máy).
DotLottie.setWasmUrl(wasmUrl)

/** Phát Lottie bằng `dotlottie-web` (bộ vẽ ThorVG chạy bằng WASM, vẽ vào canvas). */
export default function DotLottiePlayer({ animation, replayKey, reducedMotion, size, playOnMount = false, onReady }: LottiePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerRef = useRef<DotLottie | null>(null)
  const stats = useRef({ frames: 0, plays: 0, completed: false, ready: false })
  // Chỉ phát lại khi `replayKey` ĐỔI (không phát lại chỉ vì đổi hoạt ảnh hoặc giảm chuyển động).
  const lastKey = useRef(0)
  const latest = useRef({ replayKey, onReady })
  useEffect(() => {
    latest.current = { replayKey, onReady }
  })
  // Trạng thái «đã nạp xong» gắn với MỘT bộ phát: lưu chính bộ phát đó để bộ phát cũ không làm bộ mới tưởng đã sẵn sàng.
  const [readyPlayer, setReadyPlayer] = useState<DotLottie | null>(null)
  const data = useMemo(() => JSON.parse(JSON.stringify(animation)) as Record<string, unknown>, [animation])
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Bộ đếm RIÊNG của lần dựng này (sự kiện muộn của bộ phát cũ đã hủy không động tới).
    const counters = { frames: 0, plays: 0, completed: false, ready: false }
    stats.current = counters
    lastKey.current = playOnMount ? 0 : latest.current.replayKey
    let disposed = false
    const player = new DotLottie({ canvas, data, autoplay: false, loop: false, renderConfig: { autoResize: false, devicePixelRatio: dpr } })
    playerRef.current = player
    player.addEventListener('load', () => {
      if (disposed) return
      counters.ready = true
      setReadyPlayer(player)
      latest.current.onReady?.()
    })
    player.addEventListener('frame', () => {
      if (!disposed) counters.frames += 1
    })
    player.addEventListener('complete', () => {
      if (!disposed) counters.completed = true
    })
    const unregister = registerPlayer({
      engine: 'dotlottie',
      ready: () => counters.ready,
      frames: () => counters.frames,
      plays: () => counters.plays,
      completed: () => counters.completed,
      domNodes: () => 1,
    })
    return () => {
      disposed = true
      unregister()
      player.destroy()
      playerRef.current = null
    }
  }, [data, dpr, playOnMount])

  useEffect(() => {
    const player = playerRef.current
    if (!player || readyPlayer !== player || replayKey === 0 || replayKey === lastKey.current) return
    lastKey.current = replayKey
    stats.current.completed = false
    if (reducedMotion) {
      player.setFrame(finalFrame(animation))
      stats.current.completed = true
      return
    }
    stats.current.plays += 1
    player.stop()
    player.play()
  }, [replayKey, reducedMotion, readyPlayer, animation])

  return <canvas ref={canvasRef} width={Math.round(size * dpr)} height={Math.round(size * dpr)} style={{ width: size, height: size }} data-lottie-engine="dotlottie" />
}
