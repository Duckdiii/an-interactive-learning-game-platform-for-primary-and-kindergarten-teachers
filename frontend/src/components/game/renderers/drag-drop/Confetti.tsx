import { useEffect, useRef } from 'react'
import Konva from 'konva'
import { Layer, Rect } from 'react-konva'

const colors = ['#e5b530', '#46a5bc', '#73ae57', '#e0849a']

export default function Confetti({ width, height }: { width: number; height: number }) {
  const layer = useRef<Konva.Layer>(null)
  const particles = useRef<(Konva.Rect | null)[]>([])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animation = new Konva.Animation((frame) => {
      if (!frame) return
      const elapsed = frame.time / 1000
      particles.current.forEach((node, index) => {
        if (!node) return
        node.x(((index * 79) % width) + Math.sin(elapsed * 3 + index) * 22)
        node.y(-24 - (index % 5) * 35 + elapsed * (130 + index % 4 * 25))
        node.rotation(elapsed * (90 + index * 3))
        node.opacity(Math.max(0, 1 - elapsed / 2.4))
      })
      if (elapsed >= 2.4) animation.stop()
    }, layer.current ?? undefined)
    animation.start()
    return () => { animation.stop() }
  }, [width, height])
  return (
    <Layer ref={layer} listening={false}>
      {Array.from({ length: 32 }, (_, index) => (
        <Rect key={index} ref={(node) => { particles.current[index] = node }}
          x={(index * 79) % width} y={-24} width={8} height={12} fill={colors[index % colors.length]} />
      ))}
    </Layer>
  )
}
