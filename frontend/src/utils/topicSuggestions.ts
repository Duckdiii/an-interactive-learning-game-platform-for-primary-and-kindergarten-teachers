import { GAME_TEMPLATES } from '../constants/gameTemplates'
import { normalizeSearchText } from './gameFilters'
import type { GameSummary } from '../types/game-summary.types'
import type { TopicSuggestion } from '../types/game-suggestion.types'

export const TOPIC_SUGGESTION_COUNT = 4
// Chỉ xét vài game cập nhật gần nhất để gợi ý bám theo việc cô đang làm, không theo cả thư viện cũ.
const RECENT_GAMES_CONSIDERED = 5

const toSuggestion = (template: (typeof GAME_TEMPLATES)[number]): TopicSuggestion => ({
  id: template.id,
  title: template.title,
  topic: template.topic,
  gradeLevel: template.level,
  subject: template.subject,
})

/**
 * MOCK: gợi ý chủ đề theo khối lớp và môn của các game gần đây (mẫu có sẵn ở `gameTemplates`). Bỏ chủ đề trùng tên với
 * game đã có; không đủ thì bổ sung bằng các mẫu chung để luôn đủ số lượng. Khi có AI thật, thay hàm này.
 * `games` đã sắp mới nhất trước.
 */
export function suggestTopics(games: ReadonlyArray<GameSummary>): TopicSuggestion[] {
  const existingTitles = new Set(games.map((game) => normalizeSearchText(game.title)))
  const isNew = (template: (typeof GAME_TEMPLATES)[number]) =>
    !existingTitles.has(normalizeSearchText(template.title))

  const pairs: Array<[string, string]> = []
  for (const game of games.slice(0, RECENT_GAMES_CONSIDERED)) {
    if (!pairs.some(([grade, subject]) => grade === game.gradeLevel && subject === game.subject)) {
      pairs.push([game.gradeLevel, game.subject])
    }
  }

  const result: TopicSuggestion[] = []
  const add = (template: (typeof GAME_TEMPLATES)[number]) => {
    if (result.length < TOPIC_SUGGESTION_COUNT && isNew(template) && !result.some((item) => item.id === template.id)) {
      result.push(toSuggestion(template))
    }
  }

  // Xoay vòng giữa các cặp để gợi ý đa dạng thay vì dồn hết vào một môn.
  const perPair = pairs.map(([grade, subject]) =>
    GAME_TEMPLATES.filter((template) => template.level === grade && template.subject === subject),
  )
  for (let round = 0; round < GAME_TEMPLATES.length; round++) {
    for (const templates of perPair) {
      if (templates[round]) add(templates[round])
    }
  }

  // Còn thiếu (chưa có game, hoặc khối/môn chưa có mẫu): bổ sung từ mẫu chung, ưu tiên mầm non rồi lớp 1.
  for (const template of GAME_TEMPLATES) add(template)

  return result
}

/** Đường dẫn sang trang Tạo game mới với ô mô tả và khối lớp, môn điền sẵn. */
export function topicToCreateLink(basePath: string, topic: TopicSuggestion) {
  const params = new URLSearchParams({
    idea: topic.topic,
    grade: topic.gradeLevel,
    subject: topic.subject,
  })

  return `${basePath}?${params.toString()}`
}
