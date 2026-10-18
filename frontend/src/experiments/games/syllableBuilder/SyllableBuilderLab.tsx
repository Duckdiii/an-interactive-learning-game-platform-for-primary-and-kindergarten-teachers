import { useMemo, useState } from 'react'
import ThemeProvider from '../../theme/ThemeProvider'
import { ALL_THEMES } from '../../theme/themes'
import SyllableBuilderRenderer from './SyllableBuilderRenderer'
import { SYLLABLE_FIXTURES } from './syllableFixtures'
import { isCorrectSyllable, toStudentQuestion, validateSyllableBuilder } from './syllableLogic'
import type { SyllableAnswerResult } from './syllableTypes'
import type { ToneStyle } from './vietnameseSyllable'

type Mode = 'preview' | 'play' | 'review'
type FixtureKey = keyof typeof SYLLABLE_FIXTURES

/**
 * Phòng chơi thử SYLLABLE_BUILDER: chọn mẫu, chế độ, theme và kiểu đặt dấu (hòa / hoà). Chế độ `play` giả lập Backend
 * chấm (câu hỏi gửi đi không có đáp án). Đổi kiểu đặt dấu làm đáp án «hòa» không ghép được nữa: phần kiểm tra báo ngay.
 */
export default function SyllableBuilderLab() {
  const [fixtureKey, setFixtureKey] = useState<FixtureKey>('mèo (c/m/eo)')
  const [mode, setMode] = useState<Mode>('preview')
  const [themeId, setThemeId] = useState(ALL_THEMES[0].id)
  const [style, setStyle] = useState<ToneStyle>('modern')
  const [lastAnswer, setLastAnswer] = useState('chưa trả lời')

  const base = SYLLABLE_FIXTURES[fixtureKey]
  const question = useMemo(() => ({ ...base, toneStyle: style }), [base, style])
  const theme = ALL_THEMES.find((candidate) => candidate.id === themeId) ?? ALL_THEMES[0]
  const issues = useMemo(() => validateSyllableBuilder(question), [question])
  const student = useMemo(() => toStudentQuestion(question), [question])

  // Giả lập Backend chấm ở mode play: chỉ nó biết đáp án.
  const grade = (syllable: string): SyllableAnswerResult => ({
    isCorrect: isCorrectSyllable(syllable, question.target),
    correctSyllable: question.target,
  })

  const chip = (selected: boolean) => `min-h-11 rounded border px-3 ${selected ? 'bg-slate-800 text-white' : 'bg-white'}`

  return (
    <div className="space-y-3 p-4">
      <div role="group" aria-label="Mẫu" className="flex flex-wrap gap-2">
        {(Object.keys(SYLLABLE_FIXTURES) as FixtureKey[]).map((key) => (
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
      <div role="group" aria-label="Kiểu đặt dấu" className="flex flex-wrap gap-2">
        {([['modern', 'Hiện đại (hòa)'], ['traditional', 'Cũ (hoà)']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={style === value} onClick={() => setStyle(value)} className={chip(style === value)}>
            {label}
          </button>
        ))}
      </div>

      <ThemeProvider theme={theme}>
        {mode === 'preview' && <SyllableBuilderRenderer mode="preview" question={question} onAnswered={(syllable) => setLastAnswer(`preview: ${syllable}`)} />}
        {mode === 'play' && (
          <SyllableBuilderRenderer
            mode="play"
            question={student}
            onAnswered={(syllable) => {
              setLastAnswer(`play: ${syllable}`)
              return grade(syllable)
            }}
          />
        )}
        {mode === 'review' && <SyllableBuilderRenderer mode="review" question={question} selectedParts={{ onset: question.onsets[0], rhyme: question.rhymes[0], tone: question.tones[0] }} />}
      </ThemeProvider>

      <p role="status">
        {issues.length === 0 ? 'Câu hỏi hợp lệ theo validateSyllableBuilder.' : `Câu hỏi có lỗi: ${issues.map((i) => i.code).join(', ')}`}
      </p>
      <p>Trả lời gần nhất: {lastAnswer}</p>
    </div>
  )
}
