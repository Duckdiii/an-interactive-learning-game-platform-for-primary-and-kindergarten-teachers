import type { OddOneOutTextGame, OddOneOutQuestion } from '../../types/game-dsl.types'
import type { StudentOddOneOutItem } from '../../types/game-student.types'

export interface OddOneOutImageMockQuestion extends OddOneOutQuestion {
  renderMode: 'IMAGE'
  items: StudentOddOneOutItem[]
}
export type OddOneOutImageMockGame = Omit<OddOneOutTextGame, 'questions'> & { questions: OddOneOutImageMockQuestion[] }

/** Renderer fixture only: extra media fields / six items are NOT a publishable v1.0.0 DSL. */
export function buildOddOneOutImageMock(count: 4 | 5 | 6): OddOneOutImageMockGame {
  if (![4, 5, 6].includes(count)) throw new Error('Odd One Out image fixture requires 4, 5 or 6 items')
  const sets = {
    4: { topic: 'Con vật', prompt: 'Hình nào không phải là mèo?', items: [
      ['Mèo', '1f431'], ['Chó', '1f436'], ['Mèo cười', '1f63a'], ['Mèo đứng', '1f408'],
    ] },
    5: { topic: 'Trái cây', prompt: 'Hình nào không phải là trái cây?', items: [
      ['Táo', '1f34e'], ['Cà rốt', '1f955'], ['Chuối', '1f34c'], ['Nho', '1f347'], ['Dâu tây', '1f353'],
    ] },
    6: { topic: 'Phương tiện', prompt: 'Hình nào không đi trên đường bộ?', items: [
      ['Ô tô', '1f697'], ['Tàu thủy', '1f6a2'], ['Xe buýt', '1f68c'], ['Taxi', '1f695'], ['Xe tải', '1f69a'], ['Xe đạp', '1f6b2'],
    ] },
  } as const
  const set = sets[count]
  return {
    schemaVersion: '1.0.0', gameType: 'ODD_ONE_OUT',
    metadata: { title: 'Tìm hình khác loại', topic: set.topic, subject: 'VIETNAMESE', gradeLevel: 'KINDERGARTEN' },
    gameplaySettings: { hitboxScale: 1.5 },
    questions: [{
      id: 'odd-image-demo', renderMode: 'IMAGE', timeLimitSeconds: 180, points: 10, oddOneOutId: 'b',
      questionText: set.prompt,
      items: set.items.map(([text, code], index) => ({
        id: String.fromCharCode(97 + index), text, imageUrl: `/assets/noto/emoji_u${code}.svg`,
      })),
    }],
  }
}
