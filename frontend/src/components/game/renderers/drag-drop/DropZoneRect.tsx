import { Group, Rect, Text } from 'react-konva'
import type { Bounds, DropZone } from '../../../../types/dragDrop'

interface Props {
  zone: DropZone & { bounds: Bounds }
  highlighted: boolean
}

export default function DropZoneRect({ zone, highlighted }: Props) {
  const water = zone.color === 'water'
  return (
    <Group x={zone.bounds.x} y={zone.bounds.y} listening={false}>
      <Rect
        width={zone.bounds.width} height={zone.bounds.height} cornerRadius={16}
        fill={water ? '#e8f5ff' : '#eff8e7'}
        stroke={highlighted ? '#d39119' : water ? '#4797bd' : '#6c9950'}
        strokeWidth={highlighted ? 4 : 2} dash={highlighted ? undefined : [8, 6]}
      />
      <Text
        text={zone.label} x={12} y={zone.bounds.height - 54}
        width={zone.bounds.width - 24} height={48}
        fontSize={20} fontStyle="bold" fill={water ? '#175c7d' : '#365f27'}
        align="center" verticalAlign="middle" wrap="word"
      />
    </Group>
  )
}
