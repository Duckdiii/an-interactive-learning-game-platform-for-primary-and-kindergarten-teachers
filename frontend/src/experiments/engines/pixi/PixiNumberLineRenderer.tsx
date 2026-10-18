import { Application, Rectangle, type FederatedPointerEvent } from 'pixi.js'
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { measureWrappedTextHeight } from '../../../games/common/measureText'
import { STAGE_WIDTH } from '../../../games/common/mediaLayout'
import { useQuestionAudio } from '../../../games/common/useQuestionAudio'
import { useExperimentFeedback } from '../../feedback/useExperimentFeedback'
import { type NumberLineRendererProps } from '../../games/numberLine/NumberLineRenderer'
import { LINE_LEFT, LINE_RIGHT, QUESTION_FONT_SIZE, QUESTION_WIDTH } from '../../games/numberLine/numberLineLayout'
import {
  createNumberLineState,
  isCorrectValue,
  moveBy,
  numberLineReducer,
  snapValue,
  xToValue,
  type NumberLineScale,
} from '../../games/numberLine/numberLineLogic'
import type { NumberLineAnswerResult } from '../../games/numberLine/numberLineTypes'
import { useTheme } from '../../theme/useTheme'
import { PixiSceneView } from './pixiSceneView'
import { buildNumberLineScene, hitTest, type HitId } from './sceneShapes'

/**
 * Cách vẽ lại của Pixi: `continuous` = ticker mặc định (vẽ mỗi khung hình, kể cả lúc đứng yên); `on-demand` = tắt ticker
 * và chỉ vẽ khi có thay đổi (giống cách Konva làm), để so hai cách công bằng.
 */
export type PixiRenderMode = 'continuous' | 'on-demand'

export type PixiNumberLineProps = NumberLineRendererProps & { renderMode?: PixiRenderMode }

/** Tín hiệu cho bộ đo tự động (chỉ có ở bản dev hoặc `VITE_EXPERIMENTS=1`, nơi trang thử nghiệm tồn tại). */
export interface PixiHarness {
  /** Tên bộ vẽ Pixi đang dùng (`webgl` hoặc `webgpu`). */
  renderer: string
  /** Vùng chạm ở px màn hình, tương đối với góc trên trái canvas; cùng dạng với bộ đọc Konva của `measure.mjs`. */
  getTargets: () => { targets: Array<{ label: string; width: number; height: number; cx: number; cy: number; draggable: boolean }>; scale: number }
  /** Số lần renderer thật sự vẽ (sự kiện postrender) từ lúc khởi tạo. */
  renders: () => number
}

interface PixiRunners {
  runners?: { postrender?: { add: (listener: { postrender: () => void }) => void; remove: (listener: { postrender: () => void }) => void } }
}

declare global {
  interface Window {
    __pixiHarness?: PixiHarness
  }
}

/** Đặt kích thước canvas theo tỉ lệ co, tỉ lệ sân và vùng nhận con trỏ phủ cả sân thiết kế. */
function fitStage(app: Application, containerScale: number, stageHeight: number): void {
  app.renderer.resize(STAGE_WIDTH * containerScale, stageHeight * containerScale)
  app.stage.scale.set(containerScale)
  app.stage.hitArea = new Rectangle(0, 0, STAGE_WIDTH, stageHeight)
}

/** Ước lượng chiều cao chữ khi không đo được (môi trường không có Canvas): thiên về dư. */
function estimateHeight(text: string, fontSize: number, width: number): number {
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.6)))
  return Math.max(1, Math.ceil([...text].length / charsPerLine)) * fontSize * 1.25
}

export default function PixiNumberLineRenderer(props: PixiNumberLineProps) {
  const q = props.question
  // Sửa nội dung câu (thang, vị trí đầu, đáy) mà giữ id vẫn phải đặt lại (như bản Konva).
  const content = [q.min, q.max, q.step, q.startValue ?? '', props.mode === 'play' ? '' : `${props.question.target}/${props.question.tolerance}`].join(',')
  const resetKey = `${props.mode}-${q.id}-${content}-${props.mode === 'review' ? (props.selectedValue ?? 'none') : ''}-${props.renderMode ?? 'on-demand'}`
  return <PixiBoard key={resetKey} {...props} />
}

function PixiBoard(props: PixiNumberLineProps) {
  const { question, mode } = props
  const renderMode = props.renderMode ?? 'on-demand'
  const theme = useTheme()
  const feedback = useExperimentFeedback()
  const playAudio = useQuestionAudio(question.audioUrl)

  const scale: NumberLineScale = useMemo(() => ({ min: question.min, max: question.max, step: question.step }), [question.min, question.max, question.step])
  const initialValue =
    props.mode === 'review' && props.selectedValue !== undefined ? snapValue(props.selectedValue, scale) : (question.startValue ?? question.min)
  const [state, dispatch] = useReducer(numberLineReducer, undefined, () => createNumberLineState(initialValue, mode === 'review' ? 'done' : 'idle'))
  const [submitted, setSubmitted] = useState<NumberLineAnswerResult | null>(null)
  const [dragX, setDragX] = useState<number | null>(null)
  const [sendFailed, setSendFailed] = useState(false)

  const reviewResult: NumberLineAnswerResult | null =
    props.mode === 'review' && props.selectedValue !== undefined
      ? { isCorrect: isCorrectValue(snapValue(props.selectedValue, scale), props.question.target, props.question.tolerance), correctValue: props.question.target }
      : null
  const result = mode === 'review' ? reviewResult : submitted
  const noAnswer = props.mode === 'review' && props.selectedValue === undefined
  // Chỉ chỉ vạch đúng khi sai hoặc không trả lời (như bản Konva).
  const revealValue = result ? (result.isCorrect ? undefined : result.correctValue) : noAnswer && props.mode === 'review' ? props.question.target : undefined

  const activeRef = useRef(true)
  const submitLockRef = useRef(false)
  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])
  const interactive = mode !== 'review' && state.phase === 'idle'

  const questionHeight = useMemo(
    () =>
      measureWrappedTextHeight({ text: question.questionText, fontSize: QUESTION_FONT_SIZE, width: QUESTION_WIDTH }) ??
      estimateHeight(question.questionText, QUESTION_FONT_SIZE, QUESTION_WIDTH),
    [question.questionText],
  )

  const scene = useMemo(
    () =>
      buildNumberLineScene({
        questionText: question.questionText,
        scale,
        hasAudio: Boolean(question.audioUrl),
        colors: theme.colors,
        paintBackground: theme.paintStageBackground,
        value: state.value,
        dragX,
        phase: state.phase,
        review: mode === 'review',
        result,
        revealValue,
        hideMarker: noAnswer,
        questionHeight,
      }),
    [question.questionText, question.audioUrl, scale, theme, state.value, state.phase, dragX, mode, result, revealValue, noAnswer, questionHeight],
  )

  const finish = (answer: NumberLineAnswerResult) => {
    setSubmitted(answer)
    dispatch({ type: 'submitDone' })
    feedback.trigger(answer.isCorrect ? 'correct' : 'tryAgain')
  }

  const submit = async () => {
    if (props.mode === 'review' || !interactive || submitLockRef.current) return
    submitLockRef.current = true
    setSendFailed(false)
    const value = state.value
    dispatch({ type: 'submitStart' })
    if (props.mode === 'preview') {
      finish({ isCorrect: isCorrectValue(value, props.question.target, props.question.tolerance), correctValue: props.question.target })
      new Promise<void>((resolve) => resolve(void props.onAnswered?.(value))).catch((error) => {
        console.error('PixiNumberLineRenderer: onAnswered (preview) bị lỗi', error)
      })
      return
    }
    let answer: NumberLineAnswerResult
    try {
      answer = await props.onAnswered(value)
    } catch (error) {
      if (!activeRef.current) return
      console.error('PixiNumberLineRenderer: onAnswered bị lỗi, mở khóa lại để thử lại', error)
      submitLockRef.current = false
      setSendFailed(true)
      dispatch({ type: 'submitFailed' })
      return
    }
    if (!activeRef.current) return
    if (typeof answer?.isCorrect !== 'boolean') {
      console.error('PixiNumberLineRenderer: onAnswered trả kết quả sai dạng', answer)
      submitLockRef.current = false
      setSendFailed(true)
      dispatch({ type: 'submitFailed' })
      return
    }
    finish(answer)
  }

  // ---- Pixi ----
  const hostRef = useRef<HTMLDivElement>(null)
  const [pixi, setPixi] = useState<{ app: Application; view: PixiSceneView } | null>(null)
  const [containerScale, setContainerScale] = useState(1)
  const [initFailed, setInitFailed] = useState(false)

  // Trạng thái mới nhất cho trình xử lý con trỏ (gắn một lần, không gắn lại mỗi lần vẽ).
  const latest = useRef({ hits: scene.hits, dragX, containerScale, scale, state })
  // useLayoutEffect: cập nhật ngay sau khi vẽ, trước khi trình duyệt kịp nhận chạm kế tiếp (effect thụ động có thể chậm).
  useLayoutEffect(() => {
    latest.current = { hits: scene.hits, dragX, containerScale, scale, state }
  })
  const actions = useRef({ submit, playAudio })
  useLayoutEffect(() => {
    actions.current = { submit, playAudio }
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let initialized = false
    let renders = 0
    let harnessListener: { postrender: () => void } | null = null
    let runners: PixiRunners['runners'] | undefined
    let harness: PixiHarness | null = null
    const app = new Application()
    const view = new PixiSceneView()
    void app
      .init({
        width: STAGE_WIDTH,
        height: 400,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        autoStart: renderMode === 'continuous',
      })
      .then(() => {
        initialized = true
        // Gỡ bỏ trước khi khởi tạo xong (đổi câu, StrictMode): hủy ngay, không gắn vào trang.
        if (disposed) {
          view.destroy()
          app.destroy(true, { children: true })
          return
        }
        host.appendChild(app.canvas)
        app.stage.addChild(view.root)
        app.stage.eventMode = 'static'
        // Tín hiệu cho bộ đo tự động (cùng dạng bộ đọc Konva của measure.mjs).
        harnessListener = { postrender: () => void (renders += 1) }
        runners = (app.renderer as unknown as PixiRunners).runners
        runners?.postrender?.add(harnessListener)
        harness = {
          renderer: String((app.renderer as unknown as { name?: string }).name ?? 'unknown'),
          renders: () => renders,
          getTargets: () => {
            const k = latest.current.containerScale
            return {
              scale: k,
              targets: latest.current.hits.map((r) => ({ label: r.id, width: r.width * k, height: r.height * k, cx: (r.x + r.width / 2) * k, cy: (r.y + r.height / 2) * k, draggable: r.id === 'marker' })),
            }
          },
        }
        window.__pixiHarness = harness
        setPixi({ app, view })
      })
      .catch((error: unknown) => {
        // Thiết bị không có WebGL/WebGPU hoặc mất ngữ cảnh: không có đường lùi sang Konva ở thử nghiệm này, chỉ báo lỗi
        // và giữ lối thay thế bàn phím (thanh trượt) hoạt động.
        console.error('PixiNumberLineRenderer: không khởi tạo được Pixi', error)
        try {
          app.destroy(true, { children: true })
        } catch {
          // đã hỏng nửa chừng: bỏ qua
        }
        if (!disposed) setInitFailed(true)
      })
    return () => {
      disposed = true
      if (harnessListener) runners?.postrender?.remove(harnessListener)
      // Chỉ gỡ tín hiệu nếu còn là của lần dựng này (tránh xóa nhầm của một renderer khác).
      if (harness && window.__pixiHarness === harness) delete window.__pixiHarness
      if (initialized) app.destroy(true, { children: true })
      setPixi(null)
    }
  }, [renderMode])

  // Co theo khung chứa (như `ResponsiveStage`: tối đa 1).
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const update = () => {
      if (host.clientWidth > 0) setContainerScale(Math.min(1, host.clientWidth / STAGE_WIDTH))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  // Kích thước canvas + tỉ lệ + vùng nhận con trỏ.
  useEffect(() => {
    if (!pixi) return
    const { app } = pixi
    fitStage(app, containerScale, scene.stageHeight)
    if (renderMode === 'on-demand') app.render()
  }, [pixi, containerScale, scene.stageHeight, renderMode])

  // Cập nhật hình.
  useEffect(() => {
    if (!pixi) return
    pixi.view.update(scene.shapes)
    if (renderMode === 'on-demand') pixi.app.render()
  }, [pixi, scene.shapes, renderMode])

  // Con trỏ: bắt chạm bằng hàm thuần `hitTest` trên toạ độ thiết kế; một trình xử lý ở cấp sân.
  useEffect(() => {
    if (!pixi) return
    const { stage } = pixi.app
    let downHit: HitId | null = null
    let dragging = false
    let currentDragX: number | null = null
    const point = (event: FederatedPointerEvent) => stage.toLocal(event.global)
    const clampX = (x: number) => Math.min(LINE_RIGHT, Math.max(LINE_LEFT, x))

    const onDown = (event: FederatedPointerEvent) => {
      const p = point(event)
      downHit = hitTest(latest.current.hits, p)
      if (downHit === 'marker') {
        dragging = true
        currentDragX = clampX(p.x)
        setDragX(currentDragX)
      } else if (downHit === 'band') {
        dispatch({ type: 'set', value: xToValue(p.x, latest.current.scale, { left: LINE_LEFT, right: LINE_RIGHT }) })
      }
    }
    const onMove = (event: FederatedPointerEvent) => {
      if (!dragging) return
      currentDragX = clampX(point(event).x)
      setDragX(currentDragX)
    }
    const onUp = (event: FederatedPointerEvent) => {
      if (dragging) {
        dragging = false
        if (currentDragX !== null) dispatch({ type: 'set', value: xToValue(currentDragX, latest.current.scale, { left: LINE_LEFT, right: LINE_RIGHT }) })
        currentDragX = null
        setDragX(null)
        downHit = null
        return
      }
      // «Nhấp» = nhả đúng nơi đã nhấn xuống.
      const upHit = hitTest(latest.current.hits, point(event))
      if (downHit && upHit === downHit) {
        const { scale: s, state: st } = latest.current
        if (downHit === 'minus') dispatch({ type: 'set', value: moveBy(st.value, -1, s) })
        else if (downHit === 'plus') dispatch({ type: 'set', value: moveBy(st.value, 1, s) })
        else if (downHit === 'confirm') void actions.current.submit()
        else if (downHit === 'audio') actions.current.playAudio()
      }
      downHit = null
    }
    // Hệ thống hủy con trỏ (cảm ứng bị ngắt giữa chừng): bỏ cử chỉ đang dở, không chốt giá trị.
    const onCancel = () => {
      dragging = false
      currentDragX = null
      downHit = null
      setDragX(null)
    }
    stage.on('pointerdown', onDown)
    stage.on('pointermove', onMove)
    stage.on('pointerup', onUp)
    stage.on('pointerupoutside', onUp)
    stage.on('pointercancel', onCancel)
    return () => {
      stage.off('pointerdown', onDown)
      stage.off('pointermove', onMove)
      stage.off('pointerup', onUp)
      stage.off('pointerupoutside', onUp)
      stage.off('pointercancel', onCancel)
    }
  }, [pixi])

  const announcement = result
    ? result.isCorrect
      ? 'Đúng rồi!'
      : result.correctValue !== undefined
        ? `Gần đúng rồi. Số đúng là ${result.correctValue}.`
        : 'Chưa đúng rồi, cố gắng lên nhé.'
    : sendFailed
      ? 'Chưa gửi được, bấm Xong rồi để gửi lại nhé.'
      : ''

  return (
    <>
      <div ref={hostRef} style={{ width: '100%' }} data-engine="pixi" data-render-mode={renderMode} />
      {initFailed && <p role="alert">Không khởi tạo được đồ họa Pixi (thiết bị có thể không hỗ trợ WebGL). Vẫn dùng được thanh trượt bên dưới.</p>}
      {/* Lối thay thế cho bàn phím và trình đọc màn hình: canvas không có cây DOM (giống bản Konva). */}
      <div className="sr-only focus-within:not-sr-only">
        <label>
          Số trên trục
          <input
            type="range"
            min={question.min}
            max={question.max}
            step={question.step}
            value={state.value}
            disabled={!interactive}
            onChange={(event) => dispatch({ type: 'set', value: Number(event.target.value) })}
            aria-valuetext={`Số ${state.value}`}
          />
        </label>
        {mode !== 'review' && (
          <button type="button" disabled={!interactive} onClick={() => void submit()}>
            Xong rồi!
          </button>
        )}
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  )
}
