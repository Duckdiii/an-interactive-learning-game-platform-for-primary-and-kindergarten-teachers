import { useMemo, useState } from 'react'
import ThemeProvider from '../../theme/ThemeProvider'
import { ALL_THEMES } from '../../theme/themes'
import PrepositionSceneRenderer from './PrepositionSceneRenderer'
import { PREPOSITION_FIXTURES } from './prepositionFixtures'
import { idealCenter, satisfies } from './prepositionGeometry'
import { itemSize, toStudentQuestion, validatePrepositionScene } from './prepositionLogic'
import type { PlacementAnswerResult } from './prepositionTypes'

type Mode = 'preview' | 'play' | 'review'
type FixtureKey = keyof typeof PREPOSITION_FIXTURES

/** Phòng chơi thử PREPOSITION_SCENE: chọn mẫu, chế độ và theme. Chế độ `play` giả lập Backend chấm (câu hỏi gửi đi không có quy tắc). */
export default function PrepositionSceneLab() {
  const [fixtureKey, setFixtureKey] = useState<FixtureKey>('under the table')
  const [mode, setMode] = useState<Mode>('preview')
  const [themeId, setThemeId] = useState(ALL_THEMES[0].id)
  const [lastAnswer, setLastAnswer] = useState('chưa trả lời')

  const question = PREPOSITION_FIXTURES[fixtureKey]
  const theme = ALL_THEMES.find((candidate) => candidate.id === themeId) ?? ALL_THEMES[0]
  const issues = useMemo(() => validatePrepositionScene(question), [question])
  const student = useMemo(() => toStudentQuestion(question), [question])

  // Giả lập Backend chấm ở mode play: chỉ nó biết quy tắc.
  const grade = (center: { x: number; y: number }): PlacementAnswerResult => ({
    isCorrect: satisfies(question.preposition, question.landmark, itemSize(question), center),
    correctCenter: idealCenter(question.preposition, question.landmark, itemSize(question)) ?? undefined,
  })

  const chip = (selected: boolean) => `min-h-11 rounded border px-3 ${selected ? 'bg-slate-800 text-white' : 'bg-white'}`
  const show = (center: { x: number; y: number }) => `${Math.round(center.x)}, ${Math.round(center.y)}`

  return (
    <div className="space-y-3 p-4">
      <div role="group" aria-label="Mẫu" className="flex flex-wrap gap-2">
        {(Object.keys(PREPOSITION_FIXTURES) as FixtureKey[]).map((key) => (
          <button key={key} type="button" aria-pressed={key === fixtureKey} onClick={() => setFixtureKey(key)} className={chip(key === fixtureKey)}>
            {key}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Chế độ" className="flex flex-wrap gap-2">
        {(['preview', 'play', 'review'] as const).map((value) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={chip(mode === value)}>
            {value}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Theme" className="flex flex-wrap gap-2">
        {ALL_THEMES.map((candidate) => (
          <button key={candidate.id} type="button" aria-pressed={candidate.id === theme.id} onClick={() => setThemeId(candidate.id)} className={chip(candidate.id === theme.id)}>
            {candidate.name}
          </button>
        ))}
      </div>

      <ThemeProvider theme={theme}>
        {mode === 'preview' && <PrepositionSceneRenderer mode="preview" question={question} onAnswered={(center) => setLastAnswer(`preview: ${show(center)}`)} />}
        {mode === 'play' && (
          <PrepositionSceneRenderer
            mode="play"
            question={student}
            onAnswered={(center) => {
              setLastAnswer(`play: ${show(center)}`)
              return grade(center)
            }}
          />
        )}
        {/* Xem lại với một vị trí SAI cố ý: vật ở góc trên trái, xa mọi vùng đúng. */}
        {mode === 'review' && <PrepositionSceneRenderer mode="review" question={question} selectedCenter={{ x: question.item.startX, y: question.item.startY }} />}
      </ThemeProvider>

      <p role="status">
        {issues.length === 0 ? 'Câu hỏi hợp lệ theo validatePrepositionScene.' : `Câu hỏi có lỗi: ${issues.map((i) => i.code).join(', ')}`}
      </p>
      <p>Trả lời gần nhất: {lastAnswer}</p>
    </div>
  )
}
