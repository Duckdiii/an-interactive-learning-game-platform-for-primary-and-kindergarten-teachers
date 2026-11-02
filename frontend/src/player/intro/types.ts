import type { PublishInfo } from '../../types/game-student.types'

export interface IntroProps {
  info: PublishInfo
  /** Game chơi được trên máy này không (có renderer). */
  playable: boolean
  autoRead: boolean
  onAutoReadChange: (value: boolean) => void
  onStart: () => void
}
