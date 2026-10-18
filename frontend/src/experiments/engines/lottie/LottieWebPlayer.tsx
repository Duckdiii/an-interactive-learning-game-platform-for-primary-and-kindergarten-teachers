import lottie, { type AnimationItem } from 'lottie-web'
import { useEffect, useMemo, useRef } from 'react'
import { finalFrame } from './lottieAnimations'
import { registerPlayer } from './lottieHarness'
import type { LottieEngine, LottiePlayerProps } from './playerTypes'

type Props = LottiePlayerProps & { renderer: 'svg' | 'canvas' }

/** Phát Lottie bằng `lottie-web` (bản đầy đủ, có bộ xử lý biểu thức), vẽ SVG (nhiều nút DOM) hoặc canvas 2D. */
export default function LottieWebPlayer({ animation, replayKey, reducedMotion, size, renderer, playOnMount = false, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<AnimationItem | null>(null)
  const stats = useRef({ frames: 0, plays: 0, completed: false, ready: false })
  // Khóa phát lần gần nhất: chỉ phát lại khi `replayKey` ĐỔI, không phát lại chỉ vì đổi hoạt ảnh/bộ vẽ/giảm chuyển động.
  const lastKey = useRef(0)
  const latest = useRef({ replayKey, onReady })
  useEffect(() => {
    latest.current = { replayKey, onReady }
  })
  // `lottie-web` có thể sửa dữ liệu truyền vào: đưa bản sao.
  const data = useMemo(() => JSON.parse(JSON.stringify(animation)) as object, [animation])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    // Bộ đếm RIÊNG của lần dựng này: sự kiện muộn của bộ phát cũ đã hủy không làm sai số của bộ phát mới.
    const counters = { frames: 0, plays: 0, completed: false, ready: false }
    stats.current = counters
    lastKey.current = playOnMount ? 0 : latest.current.replayKey
    let disposed = false
    const anim = lottie.loadAnimation({
      container: host,
      renderer,
      loop: false,
      autoplay: false,
      animationData: data,
      rendererSettings: renderer === 'canvas' ? { clearCanvas: true, dpr: window.devicePixelRatio || 1 } : { preserveAspectRatio: 'xMidYMid meet' },
    })
    animRef.current = anim
    anim.addEventListener('enterFrame', () => {
      if (!disposed) counters.frames += 1
    })
    anim.addEventListener('complete', () => {
      if (!disposed) counters.completed = true
    })
    anim.addEventListener('DOMLoaded', () => {
      if (disposed) return
      counters.ready = true
      latest.current.onReady?.()
    })
    const engine: LottieEngine = renderer === 'canvas' ? 'lottie-canvas' : 'lottie-svg'
    const unregister = registerPlayer({
      engine,
      ready: () => counters.ready,
      frames: () => counters.frames,
      plays: () => counters.plays,
      completed: () => counters.completed,
      domNodes: () => host.querySelectorAll('*').length,
    })
    return () => {
      disposed = true
      unregister()
      anim.destroy()
      animRef.current = null
    }
  }, [data, renderer, playOnMount])

  useEffect(() => {
    const anim = animRef.current
    if (!anim || replayKey === 0 || replayKey === lastKey.current) return
    lastKey.current = replayKey
    stats.current.completed = false
    if (reducedMotion) {
      anim.goToAndStop(finalFrame(animation), true)
      stats.current.completed = true
      return
    }
    stats.current.plays += 1
    anim.goToAndPlay(0, true)
  }, [replayKey, reducedMotion, animation, data, renderer, playOnMount])

  return <div ref={hostRef} style={{ width: size, height: size }} data-lottie-engine={renderer === 'canvas' ? 'lottie-canvas' : 'lottie-svg'} />
}
