import { Group, Circle, Path } from 'react-konva'
import { useEffect, useState } from 'react'
import { audioService } from '../../services/pipeline/audioService'
import { AUDIO_PLAY_ACTIVE_FILL, AUDIO_PLAY_INACTIVE_FILL } from './palette'

export interface AudioPlayButtonProps {
  audioUrl: string
  x: number
  y: number
  autoPlayOnMount?: boolean
}

export function AudioPlayButton({ audioUrl, x, y, autoPlayOnMount = true }: AudioPlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (autoPlayOnMount && audioUrl) {
      const timer = setTimeout(() => {
        setIsPlaying(true)
        audioService.play(audioUrl, () => setIsPlaying(false))
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [audioUrl, autoPlayOnMount])

  const handleClick = () => {
    if (!isPlaying && audioUrl) {
      setIsPlaying(true)
      audioService.play(audioUrl, () => setIsPlaying(false))
    }
  }

  return (
    <Group x={x} y={y} onClick={handleClick} onTap={handleClick}>
      <Circle radius={48} fill={isPlaying ? AUDIO_PLAY_ACTIVE_FILL : AUDIO_PLAY_INACTIVE_FILL} shadowBlur={6} />
      <Path data="M8 5v14l11-7z" x={-12} y={-12} fill="white" scale={{ x: 1.2, y: 1.2 }} />
    </Group>
  )
}
