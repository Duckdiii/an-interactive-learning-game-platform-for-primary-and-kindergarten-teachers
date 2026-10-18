import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Layer, Stage } from 'react-konva'
import FeedbackOverlay from '../../feedback/FeedbackOverlay'
import { useExperimentFeedback } from '../../feedback/useExperimentFeedback'
import { usePrefersReducedMotion } from '../../feedback/usePrefersReducedMotion'
import NumberLineRenderer from '../../games/numberLine/NumberLineRenderer'
import { mockNumberLine10 } from '../../games/numberLine/numberLineFixtures'
import { isCorrectValue } from '../../games/numberLine/numberLineLogic'
import ThemeProvider from '../../theme/ThemeProvider'
import { ALL_THEMES } from '../../theme/themes'
import { useTheme } from '../../theme/useTheme'
import FeedbackLottieOverlay, { LOTTIE_OVERLAY_SIZE } from './FeedbackLottieOverlay'
import { buildLottie, LOTTIE_KINDS, validateLottie, type LottieKind } from './lottieAnimations'
import { LOTTIE_ENGINE_LABEL, type LottieEngine, type LottiePlayerProps } from './playerTypes'

const LottieWebPlayer = lazy(() => import('./LottieWebPlayer'))
const DotLottiePlayer = lazy(() => import('./DotLottiePlayer'))

type Source = 'konva' | LottieEngine
const SOURCE_LABEL: Record<Source, string> = { konva: 'Konva (hiệu ứng hiện có)', ...LOTTIE_ENGINE_LABEL }
const KIND_LABEL: Record<LottieKind, string> = { correct: 'Đúng (sao nảy)', tryAgain: 'Thử lại (gật đầu)' }

/** Hiệu ứng Konva hiện có (`FeedbackOverlay`) trong một sân nhỏ cùng cỡ với hoạt ảnh Lottie, làm mốc so sánh. */
function KonvaPreview({ kind, replayKey, size, reduced }: { kind: LottieKind; replayKey: number; size: number; reduced: boolean }) {
  const feedback = useExperimentFeedback({ audio: null, forceReducedMotion: reduced })
  const { trigger } = feedback
  // Chỉ phát khi bấm «Phát» (replayKey đổi), không phát lại chỉ vì đổi loại phản hồi.
  const lastKey = useRef(replayKey)
  useEffect(() => {
    if (replayKey === 0 || replayKey === lastKey.current) return
    lastKey.current = replayKey
    trigger(kind === 'correct' ? 'correct' : 'tryAgain')
  }, [replayKey, kind, trigger])
  const margin = size * 0.15
  return (
    <Stage width={size} height={size}>
      <Layer>
        <FeedbackOverlay plan={feedback.plan} runId={feedback.runId} x={margin} y={margin} width={size - 2 * margin} height={size - 2 * margin} />
      </Layer>
    </Stage>
  )
}

function LottiePreview({ engine, kind, replayKey, reducedMotion, size }: { engine: LottieEngine; kind: LottieKind; replayKey: number; reducedMotion: boolean; size: number }) {
  const { colors } = useTheme()
  const prefersReduced = usePrefersReducedMotion()
  const animation = useMemo(() => buildLottie(kind, colors), [kind, colors])
  // Giảm chuyển động theo cả công tắc của phòng lẫn cài đặt hệ điều hành (như lớp phủ).
  const props: LottiePlayerProps = { animation, replayKey, reducedMotion: reducedMotion || prefersReduced, size }
  return (
    <Suspense fallback={<p role="status">Đang nạp thư viện…</p>}>
      {engine === 'dotlottie' ? <DotLottiePlayer {...props} /> : <LottieWebPlayer {...props} renderer={engine === 'lottie-canvas' ? 'canvas' : 'svg'} />}
    </Suspense>
  )
}

/**
 * Phòng thử hoạt ảnh phản hồi (T7.2): phát riêng từng hoạt ảnh để xem/đo (nút «Phát»), và phát chồng lên màn NUMBER_LINE
 * thật bằng lớp phủ DOM khi trả lời (chọn số rồi bấm «Xong rồi!»). Hoạt ảnh Lottie do code tự sinh (`lottieAnimations.ts`).
 */
export default function LottieLab() {
  const [source, setSource] = useState<Source>('lottie-svg')
  const [kind, setKind] = useState<LottieKind>('correct')
  const [themeId, setThemeId] = useState(ALL_THEMES[0].id)
  const [reduced, setReduced] = useState(false)
  const [copies, setCopies] = useState(1)
  const [replayKey, setReplayKey] = useState(0)
  const [overlayRun, setOverlayRun] = useState(0)
  const [overlayKind, setOverlayKind] = useState<LottieKind>('correct')

  const theme = ALL_THEMES.find((candidate) => candidate.id === themeId) ?? ALL_THEMES[0]
  const issues = useMemo(() => validateLottie(buildLottie(kind, theme.colors)), [kind, theme])
  const chip = (selected: boolean) => `min-h-11 rounded border px-3 ${selected ? 'bg-slate-800 text-white' : 'bg-white'}`

  const onAnswered = (value: number) => {
    setOverlayKind(isCorrectValue(value, mockNumberLine10.target, mockNumberLine10.tolerance) ? 'correct' : 'tryAgain')
    setOverlayRun((run) => run + 1)
  }

  return (
    <div className="space-y-3 p-4">
      <div role="group" aria-label="Nguồn hoạt ảnh" className="flex flex-wrap gap-2">
        {(Object.keys(SOURCE_LABEL) as Source[]).map((key) => (
          <button key={key} type="button" aria-pressed={key === source} onClick={() => setSource(key)} className={chip(key === source)}>
            {SOURCE_LABEL[key]}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Loại phản hồi" className="flex flex-wrap gap-2">
        {LOTTIE_KINDS.map((key) => (
          <button key={key} type="button" aria-pressed={key === kind} onClick={() => setKind(key)} className={chip(key === kind)}>
            {KIND_LABEL[key]}
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
      <div role="group" aria-label="Số bản sao đồng thời" className="flex flex-wrap gap-2">
        {[1, 12].map((count) => (
          <button key={count} type="button" aria-pressed={count === copies} onClick={() => setCopies(count)} className={chip(count === copies)}>
            {count === 1 ? '1 bản' : `${count} bản cùng lúc`}
          </button>
        ))}
      </div>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={reduced} onChange={(event) => setReduced(event.target.checked)} />
        Giảm chuyển động (chỉ hiện hình tĩnh)
      </label>

      <ThemeProvider theme={theme}>
        <section aria-label="Phát riêng" className="space-y-2">
          <button type="button" onClick={() => setReplayKey((key) => key + 1)} className={chip(false)}>
            Phát
          </button>
          {/* Nhiều bản cùng lúc để thử tải: mỗi bản là một bộ phát riêng. */}
          <div data-testid="lottie-preview" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Array.from({ length: copies }, (_, index) => (
              <div key={index} style={{ width: LOTTIE_OVERLAY_SIZE, height: LOTTIE_OVERLAY_SIZE }}>
                {source === 'konva' ? (
                  <KonvaPreview kind={kind} replayKey={replayKey} size={LOTTIE_OVERLAY_SIZE} reduced={reduced} />
                ) : (
                  <LottiePreview engine={source} kind={kind} replayKey={replayKey} reducedMotion={reduced} size={LOTTIE_OVERLAY_SIZE} />
                )}
              </div>
            ))}
          </div>
          <p role="status">
            {issues.length === 0 ? 'Hoạt ảnh Lottie hợp lệ theo validateLottie.' : `Hoạt ảnh Lottie có lỗi: ${issues.map((i) => i.code).join(', ')}`}
          </p>
        </section>

        <section aria-label="Lớp phủ trên NUMBER_LINE" className="space-y-2">
          <p className="text-sm">
            Chọn số rồi bấm «Xong rồi!»: hoạt ảnh {source === 'konva' ? '(Konva: không dùng lớp phủ, renderer tự vẽ phản hồi)' : 'Lottie phát chồng lên màn'}. Lưu ý: renderer NUMBER_LINE vẫn tự phát hiệu ứng Konva và âm thanh của nó, nên với
            Lottie trẻ thấy CẢ HAI cùng lúc (tổ hợp này chưa được kiểm bằng giới hạn an toàn).
          </p>
          {source === 'konva' ? (
            <NumberLineRenderer mode="preview" question={mockNumberLine10} />
          ) : (
            <FeedbackLottieOverlay engine={source} kind={overlayKind} runId={overlayRun} forceReducedMotion={reduced}>
              <NumberLineRenderer mode="preview" question={mockNumberLine10} onAnswered={onAnswered} />
            </FeedbackLottieOverlay>
          )}
        </section>
      </ThemeProvider>
    </div>
  )
}
