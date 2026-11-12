import type { AudioVisualMatchGame, VisualClozeImageGame } from '../../types/game-dsl.types'
import { visualClozeImageDemo } from '../../games/visual-cloze-image/visualClozeImageDemo'

interface ImageMockInput {
  sceneImageUrl: string
  optionImages: { imageUrl: string; visualPrompt: string }[]
}

/** Synthetic geometry for dev only; never claims to locate objects with AI. */
export function buildImageClozeMock(input?: ImageMockInput): VisualClozeImageGame {
  const options = input ? input.optionImages.map((option, index) => ({ ...option, id: `o${index + 1}` })) :
    ['butterfly', 'bee', 'ladybug'].map((id) => ({ ...visualClozeImageDemo.options.find((option) => option.id === id)! }))
  return {
    schemaVersion: '1.1.0', gameType: 'VISUAL_CLOZE', mode: 'IMAGE',
    metadata: { title: 'Điền hình vào hai ô', topic: 'Dữ liệu mẫu kiểm tra điền hình', subject: 'VIETNAMESE', gradeLevel: 'KINDERGARTEN' },
    gameplaySettings: { hitboxScale: 1.5 },
    questions: [{
      id: 'q1', timeLimitSeconds: 180, points: 20,
      questionText: `Đặt ${options[0].visualPrompt.toLowerCase()} vào ô trái và ${options[1].visualPrompt.toLowerCase()} vào ô phải.`,
      sceneImageUrl: input?.sceneImageUrl ?? visualClozeImageDemo.sceneImageUrl, sceneWidth: 800, sceneHeight: 480,
      blanks: [{ id: 'b1', x: 300, y: 240, correctOptionId: options[0].id }, { id: 'b2', x: 600, y: 240, correctOptionId: options[1].id }],
      options,
    }],
  }
}

export function buildAudioVisualMock(): AudioVisualMatchGame {
  return {
    schemaVersion: '1.0.0', gameType: 'AUDIO_VISUAL_MATCH',
    metadata: { title: 'Listen and choose a picture', topic: 'Local English audio match sample', subject: 'ENGLISH', gradeLevel: 'KINDERGARTEN' },
    gameplaySettings: { hitboxScale: 1.5 },
    questions: [{ id: 'q1', timeLimitSeconds: 180, points: 10, audioText: 'Cat',
      correct: { visualPrompt: 'Cat', imageUrl: '/mock/cat.png' },
      distractors: [{ visualPrompt: 'Dog', imageUrl: '/mock/dog.png' }, { visualPrompt: 'Apple', imageUrl: '/mock/apple.png' }],
    }],
  }
}
