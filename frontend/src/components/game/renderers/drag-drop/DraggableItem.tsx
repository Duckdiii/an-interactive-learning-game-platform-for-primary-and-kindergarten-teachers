import { useEffect, useRef, useState } from 'react'
import Konva from 'konva'
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva'
import useImage from 'use-image'
import type { DraggableItem as Item, Point } from '../../../../types/dragDrop'
import { ITEM_SIZE } from './geometry'

interface Props {
  item: Item
  position: Point
  locked: boolean
  shake: number
  onDragStart: () => void
  onDrop: (position: Point) => Point
}

export default function DraggableItem({ item, position, locked, shake, onDragStart, onDrop }: Props) {
  const [image] = useImage(item.imageUrl, 'anonymous')
  const [dragging, setDragging] = useState(false)
  const visual = useRef<Konva.Group>(null)
  const activeTween = useRef<Konva.Tween | null>(null)

  useEffect(() => {
    if (!shake || !visual.current) return
    const node = visual.current
    let cancelled = false
    const offsets = [5, -5, 3, -3, 0]
    let step = 0
    const animate = () => {
      if (cancelled) return
      const tween = new Konva.Tween({
        node, x: offsets[step++], duration: 0.06,
        easing: Konva.Easings.EaseInOut,
        onFinish: () => {
          tween.destroy()
          if (step < offsets.length) animate()
          else activeTween.current = null
        },
      })
      activeTween.current = tween
      tween.play()
    }
    animate()
    return () => {
      cancelled = true
      activeTween.current?.destroy()
      activeTween.current = null
      node.x(0)
    }
  }, [shake])

  const drawingSize = 58
  const imageScale = image ? Math.min(drawingSize / image.width, drawingSize / image.height) : 1
  const imageWidth = image ? image.width * imageScale : drawingSize
  const imageHeight = image ? image.height * imageScale : drawingSize

  return (
    <Group
      id={item.itemId} name="drag-item" x={position.x} y={position.y}
      draggable={!locked}
      onDragStart={(event) => {
        activeTween.current?.destroy()
        activeTween.current = null
        visual.current?.x(0)
        setDragging(true)
        event.target.moveToTop()
        onDragStart()
      }}
      onDragEnd={(event) => {
        // Konva mutates coordinates; explicitly restore even when React props did not change.
        event.target.position(onDrop(event.target.position()))
        setDragging(false)
      }}
    >
      <Group ref={visual}>
        <Rect
          width={ITEM_SIZE} height={ITEM_SIZE} cornerRadius={12}
          fill={locked ? '#f7fff5' : '#ffffff'} stroke={locked ? '#6c9950' : dragging ? '#4797bd' : '#ccd5d9'}
          strokeWidth={dragging ? 3 : 2} shadowColor="#334155"
          shadowBlur={dragging ? 12 : 4} shadowOpacity={0.12} shadowOffsetY={dragging ? 5 : 2}
        />
        {image ? (
          <KonvaImage image={image} x={(ITEM_SIZE - imageWidth) / 2} y={6 + (drawingSize - imageHeight) / 2}
            width={imageWidth} height={imageHeight} listening={false} />
        ) : (
          <Text text={item.label.slice(0, 1)} width={ITEM_SIZE} y={16} fontSize={32} align="center" fill="#607d8b" listening={false} />
        )}
        <Text text={item.label} x={4} y={65} width={ITEM_SIZE - 8} height={20} fontSize={14}
          fontStyle="bold" align="center" fill="#263b3d" listening={false} ellipsis wrap="none" />
      </Group>
    </Group>
  )
}
