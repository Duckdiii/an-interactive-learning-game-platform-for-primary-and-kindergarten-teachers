/**
 * ConfettiEffect: Celebratory Game Feel Particle Canvas.
 * Spawns candy-colored confetti bursts from corners and a golden star burst in the center.
 * Respects prefers-reduced-motion, automatically cleans up after duration.
 * Complies with strict player token isolation (imports palette constants, no hardcoded hex/rgba).
 */

import { useEffect, useRef, useState, type FC } from 'react'
import { CELEBRATION_CONFETTI_COLORS } from './palette'

export interface ConfettiEffectProps {
  active?: boolean
  count?: number
  colors?: readonly string[]
  durationMs?: number
  onComplete?: () => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  rotation: number
  rotationSpeed: number
  wobble: number
  wobbleSpeed: number
  isStar?: boolean
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3
  let x = cx
  let y = cy
  const step = Math.PI / spikes

  ctx.beginPath()
  ctx.moveTo(cx, cy - outerRadius)
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius
    y = cy + Math.sin(rot) * outerRadius
    ctx.lineTo(x, y)
    rot += step

    x = cx + Math.cos(rot) * innerRadius
    y = cy + Math.sin(rot) * innerRadius
    ctx.lineTo(x, y)
    rot += step
  }
  ctx.lineTo(cx, cy - outerRadius)
  ctx.closePath()
  ctx.fill()
}

export const ConfettiEffect: FC<ConfettiEffectProps> = ({
  active = false,
  count = 70,
  colors = CELEBRATION_CONFETTI_COLORS,
  durationMs = 2500,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [animating, setAnimating] = useState(false)
  const particlesRef = useRef<Particle[]>([])
  const startTimeRef = useRef<number>(0)
  const animFrameRef = useRef<number | null>(null)
  // Cha hay truyền hàm viết tại chỗ (mới mỗi lần vẽ); để trong deps thì renderer vẽ lại theo khung hình sẽ khởi động lại pháo hoa liên tục.
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const onComplete = () => onCompleteRef.current?.()
    if (!active) {
      setAnimating(false)
      if (animFrameRef.current !== null) {
        window.cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      return
    }

    // Check accessibility: prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      onComplete?.()
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const width = window.innerWidth || 1024
    const height = window.innerHeight || 768
    canvas.width = width
    canvas.height = height

    // Initialize particles
    const particles: Particle[] = []
    const half = Math.floor(count / 2)

    // Left cannon
    for (let i = 0; i < half; i++) {
      const angle = (Math.PI / 4) + (Math.random() * 0.4 - 0.2) // ~45 deg
      const speed = 14 + Math.random() * 12
      particles.push({
        x: Math.random() * 60,
        y: height - Math.random() * 40,
        vx: Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed,
        size: 8 + Math.random() * 8,
        color: colors[i % colors.length],
        alpha: 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        wobble: Math.random() * Math.PI,
        wobbleSpeed: 0.08 + Math.random() * 0.08,
      })
    }

    // Right cannon
    for (let i = 0; i < half; i++) {
      const angle = (Math.PI * 3 / 4) + (Math.random() * 0.4 - 0.2) // ~135 deg
      const speed = 14 + Math.random() * 12
      particles.push({
        x: width - Math.random() * 60,
        y: height - Math.random() * 40,
        vx: Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed,
        size: 8 + Math.random() * 8,
        color: colors[(i + 2) % colors.length],
        alpha: 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        wobble: Math.random() * Math.PI,
        wobbleSpeed: 0.08 + Math.random() * 0.08,
      })
    }

    // Center star burst
    const starCount = 14
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2
      const speed = 5 + Math.random() * 7
      particles.push({
        x: width / 2,
        y: height / 2 - 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 10 + Math.random() * 6,
        color: colors[0], // Gold/Yellow
        alpha: 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        wobble: 0,
        wobbleSpeed: 0,
        isStar: true,
      })
    }

    particlesRef.current = particles
    startTimeRef.current = performance.now()
    setAnimating(true)

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current
      if (elapsed >= durationMs) {
        setAnimating(false)
        onComplete?.()
        return
      }

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const fadeFactor = elapsed > durationMs * 0.65
          ? Math.max(0, 1 - (elapsed - durationMs * 0.65) / (durationMs * 0.35))
          : 1

        for (const p of particlesRef.current) {
          p.x += p.vx
          p.y += p.vy
          p.vx *= 0.985
          p.vy *= 0.985
          p.vy += 0.38 // gravity
          p.rotation += p.rotationSpeed
          p.wobble += p.wobbleSpeed

          p.alpha = fadeFactor

          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = p.color

          if (p.isStar) {
            drawStar(ctx, 0, 0, 5, p.size, p.size / 2)
          } else {
            const scaleX = Math.cos(p.wobble)
            ctx.scale(scaleX, 1)
            ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.7)
          }
          ctx.restore()
        }
      }

      animFrameRef.current = window.requestAnimationFrame(tick)
    }

    animFrameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (animFrameRef.current !== null) {
        window.cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
  }, [active, count, colors, durationMs])

  if (!active && !animating) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="confetti-canvas"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  )
}
