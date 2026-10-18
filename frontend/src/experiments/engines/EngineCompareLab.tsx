import { lazy, Suspense, useMemo, useState } from 'react'
import NumberLineRenderer from '../games/numberLine/NumberLineRenderer'
import { NUMBER_LINE_FIXTURES } from '../games/numberLine/numberLineFixtures'
import { isCorrectValue, toStudentQuestion } from '../games/numberLine/numberLineLogic'
import type { NumberLineAnswerResult } from '../games/numberLine/numberLineTypes'
import ThemeProvider from '../theme/ThemeProvider'
import { ALL_THEMES } from '../theme/themes'

// Tách riêng gói PixiJS (nạp lười): ai không mở phòng này thì không tải Pixi.
const PixiNumberLineRenderer = lazy(() => import('./pixi/PixiNumberLineRenderer'))

export type Engine = 'konva' | 'pixi-demand' | 'pixi-continuous'
const ENGINE_LABEL: Record<Engine, string> = {
  konva: 'Konva',
  'pixi-demand': 'Pixi (vẽ khi cần)',
  'pixi-continuous': 'Pixi (vẽ liên tục)',
}

type Mode = 'preview' | 'play' | 'review'
type FixtureKey = keyof typeof NUMBER_LINE_FIXTURES

/**
 * Phòng so hai engine đồ họa trên CÙNG một màn NUMBER_LINE (T7.1): Konva (đang dùng) và PixiJS (thử nghiệm). Cùng dữ
 * liệu mẫu, cùng chế độ preview/play/review, cùng theme; chỉ khác phần vẽ và bắt chạm.
 */
export default function EngineCompareLab() {
  const [engine, setEngine] = useState<Engine>('konva')
  const [fixtureKey, setFixtureKey] = useState<FixtureKey>('0 đến 10')
  const [mode, setMode] = useState<Mode>('preview')
  const [themeId, setThemeId] = useState(ALL_THEMES[0].id)
  const [lastAnswer, setLastAnswer] = useState('chưa trả lời')

  const question = NUMBER_LINE_FIXTURES[fixtureKey]
  const theme = ALL_THEMES.find((candidate) => candidate.id === themeId) ?? ALL_THEMES[0]
  const student = useMemo(() => toStudentQuestion(question), [question])
  const grade = (value: number): NumberLineAnswerResult => ({ isCorrect: isCorrectValue(value, question.target, question.tolerance), correctValue: question.target })
  const chip = (selected: boolean) => `min-h-11 rounded border px-3 ${selected ? 'bg-slate-800 text-white' : 'bg-white'}`

  const renderMode = engine === 'pixi-continuous' ? 'continuous' : 'on-demand'
  const onPreview = (value: number) => setLastAnswer(`preview: ${value}`)
  const onPlay = (value: number) => {
    setLastAnswer(`play: ${value}`)
    return grade(value)
  }
  const selectedValue = question.target - question.step

  return (
    <div className="space-y-3 p-4">
      <div role="group" aria-label="Engine" className="flex flex-wrap gap-2">
        {(Object.keys(ENGINE_LABEL) as Engine[]).map((key) => (
          <button key={key} type="button" aria-pressed={key === engine} onClick={() => setEngine(key)} className={chip(key === engine)}>
            {ENGINE_LABEL[key]}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Mẫu" className="flex flex-wrap gap-2">
        {(Object.keys(NUMBER_LINE_FIXTURES) as FixtureKey[]).map((key) => (
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
        {engine === 'konva' ? (
          <>
            {mode === 'preview' && <NumberLineRenderer mode="preview" question={question} onAnswered={onPreview} />}
            {mode === 'play' && <NumberLineRenderer mode="play" question={student} onAnswered={onPlay} />}
            {mode === 'review' && <NumberLineRenderer mode="review" question={question} selectedValue={selectedValue} />}
          </>
        ) : (
          <Suspense fallback={<p role="status">Đang nạp PixiJS…</p>}>
            {mode === 'preview' && <PixiNumberLineRenderer mode="preview" question={question} onAnswered={onPreview} renderMode={renderMode} />}
            {mode === 'play' && <PixiNumberLineRenderer mode="play" question={student} onAnswered={onPlay} renderMode={renderMode} />}
            {mode === 'review' && <PixiNumberLineRenderer mode="review" question={question} selectedValue={selectedValue} renderMode={renderMode} />}
          </Suspense>
        )}
      </ThemeProvider>

      <p>Trả lời gần nhất: {lastAnswer}</p>
    </div>
  )
}
