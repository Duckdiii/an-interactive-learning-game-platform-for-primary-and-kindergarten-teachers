import { useMemo, useState } from 'react'
import ThemeProvider from '../../theme/ThemeProvider'
import { ALL_THEMES } from '../../theme/themes'
import NumberLineRenderer from './NumberLineRenderer'
import { NUMBER_LINE_FIXTURES } from './numberLineFixtures'
import { isCorrectValue, toStudentQuestion, validateNumberLine } from './numberLineLogic'
import type { NumberLineAnswerResult } from './numberLineTypes'

type Mode = 'preview' | 'play' | 'review'
type FixtureKey = keyof typeof NUMBER_LINE_FIXTURES

/** Phòng chơi thử NUMBER_LINE: chọn mẫu, chế độ và theme. Chế độ `play` giả lập Backend chấm (câu hỏi gửi đi không có đáp án). */
export default function NumberLineLab() {
  const [fixtureKey, setFixtureKey] = useState<FixtureKey>('0 đến 10')
  const [mode, setMode] = useState<Mode>('preview')
  const [themeId, setThemeId] = useState(ALL_THEMES[0].id)
  const [lastAnswer, setLastAnswer] = useState<string>('chưa trả lời')

  const question = NUMBER_LINE_FIXTURES[fixtureKey]
  const theme = ALL_THEMES.find((candidate) => candidate.id === themeId) ?? ALL_THEMES[0]
  const issues = useMemo(() => validateNumberLine(question), [question])
  const student = useMemo(() => toStudentQuestion(question), [question])

  // Giả lập Backend chấm ở mode play: chỉ nó biết đáp án.
  const grade = (value: number): NumberLineAnswerResult => ({
    isCorrect: isCorrectValue(value, question.target, question.tolerance),
    correctValue: question.target,
  })

  return (
    <div className="space-y-3 p-4">
      <div role="group" aria-label="Mẫu" className="flex flex-wrap gap-2">
        {(Object.keys(NUMBER_LINE_FIXTURES) as FixtureKey[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={key === fixtureKey}
            onClick={() => setFixtureKey(key)}
            className={`min-h-11 rounded border px-3 ${key === fixtureKey ? 'bg-slate-800 text-white' : 'bg-white'}`}
          >
            {key}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Chế độ" className="flex flex-wrap gap-2">
        {(['preview', 'play', 'review'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`min-h-11 rounded border px-3 ${mode === value ? 'bg-slate-800 text-white' : 'bg-white'}`}
          >
            {value}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Theme" className="flex flex-wrap gap-2">
        {ALL_THEMES.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            aria-pressed={candidate.id === theme.id}
            onClick={() => setThemeId(candidate.id)}
            className={`min-h-11 rounded border px-3 ${candidate.id === theme.id ? 'bg-slate-800 text-white' : 'bg-white'}`}
          >
            {candidate.name}
          </button>
        ))}
      </div>

      <ThemeProvider theme={theme}>
        {mode === 'preview' && (
          <NumberLineRenderer mode="preview" question={question} onAnswered={(value) => setLastAnswer(`preview: ${value}`)} />
        )}
        {mode === 'play' && (
          <NumberLineRenderer
            mode="play"
            question={student}
            onAnswered={(value) => {
              setLastAnswer(`play: ${value}`)
              return grade(value)
            }}
          />
        )}
        {mode === 'review' && <NumberLineRenderer mode="review" question={question} selectedValue={question.target - question.step} />}
      </ThemeProvider>

      <p role="status">{issues.length === 0 ? 'Câu hỏi hợp lệ theo validateNumberLine.' : `Câu hỏi có lỗi: ${issues.map((i) => i.code).join(', ')}`}</p>
      <p>Trả lời gần nhất: {lastAnswer}</p>
    </div>
  )
}
