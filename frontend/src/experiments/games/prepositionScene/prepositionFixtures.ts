import type { Landmark } from './prepositionGeometry'
import type { PrepositionSceneQuestion } from './prepositionTypes'

/** Dữ liệu mẫu cục bộ của PREPOSITION_SCENE (không gọi mạng). Mọi mẫu đều hợp lệ theo `validatePrepositionScene`. */
const TABLE: Landmark = { kind: 'TABLE', label: 'table', x: 230, y: 150, width: 260, height: 190 }
const BOX: Landmark = { kind: 'BOX', label: 'box', x: 250, y: 180, width: 220, height: 160 }

export const mockPrepositionOn: PrepositionSceneQuestion = {
  id: 'prep-on',
  instruction: 'Put the cat on the table.',
  preposition: 'ON',
  landmark: TABLE,
  item: { label: 'cat', width: 100, height: 100, startX: 110, startY: 110 },
}

export const mockPrepositionUnder: PrepositionSceneQuestion = {
  id: 'prep-under',
  instruction: 'Put the cat under the table.',
  preposition: 'UNDER',
  landmark: TABLE,
  item: { label: 'cat', width: 100, height: 100, startX: 110, startY: 110 },
}

export const mockPrepositionIn: PrepositionSceneQuestion = {
  id: 'prep-in',
  instruction: 'Put the ball in the box.',
  preposition: 'IN',
  landmark: BOX,
  item: { label: 'ball', width: 100, height: 100, startX: 110, startY: 110 },
}

export const mockPrepositionNextTo: PrepositionSceneQuestion = {
  id: 'prep-next',
  instruction: 'Put the dog next to the box.',
  preposition: 'NEXT_TO',
  landmark: BOX,
  item: { label: 'dog', width: 100, height: 100, startX: 110, startY: 110 },
}

export const mockPrepositionWithAudio: PrepositionSceneQuestion = {
  ...mockPrepositionUnder,
  id: 'prep-audio',
  audioText: 'Put the cat under the table.',
  audioUrl: '/mock/q1.wav',
}

export const PREPOSITION_FIXTURES = {
  'on the table': mockPrepositionOn,
  'under the table': mockPrepositionUnder,
  'in the box': mockPrepositionIn,
  'next to the box': mockPrepositionNextTo,
  'Có nút nghe lại': mockPrepositionWithAudio,
} as const
