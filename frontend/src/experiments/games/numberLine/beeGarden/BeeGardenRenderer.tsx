import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Group, Layer, Rect, Text } from 'react-konva'
import { STAGE_WIDTH } from '../../../../games/common/mediaLayout'
import ResponsiveStage from '../../../../games/common/ResponsiveStage'
import FeedbackOverlay from '../../../feedback/FeedbackOverlay'
import { useExperimentFeedback } from '../../../feedback/useExperimentFeedback'
import type { NumberLineRendererProps } from '../NumberLineRenderer'
import {
  createNumberLineState,
  isCorrectValue,
  isLabeled,
  labelEvery,
  moveBy,
  numberLineReducer,
  snapValue,
  tickValues,
  valueToX,
  xToValue,
  type NumberLineScale,
} from '../numberLineLogic'
import type { NumberLineAnswerResult } from '../numberLineTypes'
import GardenProgressBar, { ProgressFlyer } from './GardenProgressBar'
import { progressSlots } from './progressSlots'
import { HudBadge, HudSign, HudSpeaker } from './BeeGardenHud'
import { BeeRig, BeeShadow } from './bee/BeeRig'
import type { BeeState } from './bee/beePoses'
import { ArrowButton, Confetti, Flower, GardenBackdrop, GardenForeground, GoButton, SparkleTrailStars, type FlowerGlow } from './BeeGardenArt'
import { GardenDecorations, type DecorationReactHandler } from './BeeGardenDecor'
import { DecorReactor } from './decorReactions'
import { SparkleTrail } from './sparkleTrail'
import { correctScript, enterScript, exitScript, prepareEnter, settleScene, wrongScript, type SceneNodes } from './sceneScripts'
import { Timeline } from './timeline'
import { launchConfetti, originOfRect } from './gardenConfetti'
import { gardenUi } from './gardenUi'
import { useGardenFont } from './useGardenFont'
import { useNarration } from './useNarration'
import { useQuestionHeight } from './useQuestionHeight'
import { useResolvedDecorations } from './useResolvedDecorations'
import { useTheme } from '../../../theme/useTheme'
import type { AgeBand, TimeOfDay } from '../../../theme/themeTypes'
import { BeeFlight, BLOOM_TIMING } from './beeFlight'
import {
  BEE_HIT_RADIUS,
  BOUNCE_PEAK,
  computeGardenLayout,
  DEFAULT_INTERACTION_MODE,
  flowerScale,
  GARDEN_LEFT,
  GARDEN_RIGHT,
  GARDEN_WIDTH,
  GARDEN_X,
  BEE_SCALE,
  hopArcFor,
  hopSeconds,
  makeConfetti,
  OOPS_SECONDS,
  pathValues,
  QUESTION_FONT_SIZE,
  SCENE_MAX_SCALE,
  questionTextWidth,
  TOUCH_SIZE_CONFIRM,
  touchSizeForBand,
  TOUCH_SIZE_TAP,
  GO_BUTTON_WIDTH,
  VALUE_BOX_WIDTH,
  type BeeMood,
  type GardenLayout,
  type InteractionMode,
} from './beeGardenGeometry'
import { konvaTweenFactory } from './konvaTween'
import { useGardenMotion } from './useGardenMotion'
import type { MotionState } from './gardenMotion'
import { useCountSound } from './useCountSound'

const GEOMETRY = { left: GARDEN_LEFT, right: GARDEN_RIGHT }
const CONFETTI_COUNT = 18
/** Hoa trả lời đúng «nở» to cỡ này; hoa đã đếm nảy nhẹ hơn cỡ này khi trả lời sai (và bắt đầu sau khi ong lắc đầu xong một nhịp). */
const BLOOM_PEAK = 1.5
const BLINK_MS = 300
/** Sau khi chớp mắt, chờ một nhịp rồi ong mới lướt về hoa đầu để đếm (không quay về 0 ngay). */
const COUNT_DEMO_PAUSE_MS = 250
/** Chờ bấy nhiêu giây không thao tác thì ong «nghĩ». */
const THINK_AFTER_SECONDS = 4
const COUNT_DEMO_GLIDE_SECONDS = 0.7
/** Chạm một bông hoa sau khi đã trả lời: nảy nhẹ cỡ này. */
const TAP_FLOWER_PEAK = 1.15

const nowSeconds = (): number => performance.now() / 1000

/** Số nguyên dương ổn định từ chuỗi, làm hạt giống cho hoa giấy (cùng câu và cùng giá trị thì cùng hình). */
function hashSeed(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return hash >>> 0
}

/**
 * «Vườn hoa»: bản NUMBER_LINE dành cho trẻ nhỏ. Cùng hợp đồng `mode` (preview/play/review) và cùng logic với
 * `NumberLineRenderer`, chỉ khác phần nhìn: hàng bông hoa có số thay cho đường thang, chú ong thay cho vòng tròn
 * (kéo hoặc bấm mũi tên), đồi cỏ, mặt trời, mây; đúng thì ong xoay và nhảy cẫng kèm sao rải, chưa đúng thì ong lắc đầu nhẹ
 * và bông hoa đúng phát sáng (không đỏ gắt, không rung mạnh). «Giảm chuyển động» thì mọi thứ đứng yên.
 */
export type BeeGardenRendererProps = NumberLineRendererProps & {
  /** Tự đọc câu hỏi khi vào câu (chỉ nên bật sau một cử chỉ của người dùng, vì trình duyệt chặn tự phát âm thanh). */
  autoPlayAudio?: boolean
  /**
   * `confirm` (mặc định, Tiểu học): chạm/kéo/bấm mũi tên để chọn, rồi bấm «Xong rồi!».
   * `tap` (Mầm non): chạm một bông hoa là ong bay tới đó và chấm luôn, không có mũi tên và nút xác nhận.
   */
  interactionMode?: InteractionMode
  /** Nhóm tuổi: quyết định cỡ vùng chạm theo hồ sơ độ tuổi (Mầm non 64px, lớp 1–2 56px, lớp 3–5 48px trên màn hình thật). Bỏ trống: 144 cho chế độ chạm, 112 cho chế độ xác nhận. */
  ageBand?: AgeBand
  /** Báo bố cục hiện tại (toạ độ sân) mỗi lần vẽ: nơi bao ngoài dùng để đặt thứ nằm ngoài canvas (ngôi sao bay) tránh ô đề bài. Chỉ đọc, không gây vẽ lại. */
  onLayout?: (layout: GardenLayout) => void
  /**
   * Con số đích để hiện thành huy hiệu LỚN trong cảnh (chỉ chế độ Mầm non: trẻ chưa đọc được chữ). Do nơi gọi đưa vào (câu hỏi dạng học sinh không mang đáp án,
   * và Game JSON DSL đang đóng băng nên chưa có trường riêng cho «con số trong đề»): bỏ trống thì không có huy hiệu.
   */
  promptNumber?: number | string
  /**
   * Sau bao nhiêu giây trẻ không chạm gì thì hoa đáp án gợi ý sáng nhẹ (lấy từ `AgeProfile.hintDelaySeconds`). `null` hoặc bỏ trống: không gợi ý theo thời gian
   * (nhóm lớn tự làm bài). Chỉ gợi ý khi biết con số đích (`promptNumber` hoặc câu ở chế độ `preview`); không bao giờ lộ đáp án nếu tắt.
   */
  hintDelaySeconds?: number | null
  /**
   * Tiến trình cả lượt để vẽ thanh «vườn nở hoa» TRONG cảnh: `total` câu, `earned[i]` = `true` nếu câu i đúng ngay lần đầu, `current` là chỉ số câu đang chơi.
   * Câu hiện tại vừa đúng ngay lần đầu thì một bông hoa bay từ hoa vừa chọn lên ô của nó rồi ô nở. Bỏ trống thì chỉ chừa chỗ, không vẽ thanh.
   */
  progress?: { total: number; earned: readonly (boolean | undefined)[]; current: number }
  /** Âm nền theo ong (từ `useGardenSound`): ong bay thì vo ve, cân trái/phải theo vị trí. Bỏ trống thì không có tiếng ong. */
  ambience?: { follow(flying: boolean, pan: number): void }
  /**
   * Chuyển cảnh khi vào câu (bảng gỗ rơi xuống và nảy, huy hiệu số xoay vào, ong bay vào) và khi rời câu (`exiting`). Mặc định tắt (xem trước, xem lại, trình soạn thảo
   * không cần). Luôn tắt khi giảm chuyển động. Mỗi lần dưới 1,5 giây và không làm mất trạng thái trả lời.
   */
  /**
   * Thời điểm trong ngày của cảnh (sáng, hoàng hôn, đêm) theo `theme.ambience`; bỏ trống thì dùng biến thể mặc định của theme (sáng), theme không khai báo thì cảnh giữ màu cố định như cũ.
   * Chỉ đổi trời, mây, đồi, thiên thể và không khí; hoa, số và chú ong không đổi nên tương phản không đổi.
   */
  timeOfDay?: TimeOfDay
  transitions?: boolean
  /** Bên ngoài báo sắp sang câu khác: renderer diễn cảnh rời câu (ong bay ra, bảng bay lên) rồi gọi `onExited`. Không có chuyển cảnh thì gọi `onExited` ngay. */
  exiting?: boolean
  onExited?: () => void
}

export default function BeeGardenRenderer(props: BeeGardenRendererProps) {
  const q = props.question
  // Sửa nội dung câu (thang, vị trí đầu, đáp án) mà giữ id vẫn phải đặt lại, nếu không state cũ nằm ngoài thang mới.
  const content = [q.min, q.max, q.step, q.startValue ?? '', props.mode === 'play' ? '' : `${props.question.target}/${props.question.tolerance}`].join(',')
  const resetKey = `${props.mode}-${q.id}-${content}-${props.mode === 'review' ? (props.selectedValue ?? 'none') : ''}`
  return <BeeGardenBoard key={resetKey} {...props} />
}

function BeeGardenBoard(props: BeeGardenRendererProps) {
  const { question, mode, autoPlayAudio } = props
  const tapMode = (props.interactionMode ?? DEFAULT_INTERACTION_MODE) === 'tap' && mode !== 'review'
  const feedback = useExperimentFeedback()
  const countSound = useCountSound()
  const { play: playAudio, speaking } = useNarration(question.audioUrl)
  // Đọc câu hỏi một lần khi vào câu (nếu được bật và có giọng đọc); nút «Nghe lại» vẫn bấm được không giới hạn. `playAudio` là hàm tạo mới mỗi
  // lần vẽ nên giữ trong ref để hiệu ứng chỉ chạy lại khi đổi câu. Dọn dẹp đặt lại cờ: ở StrictMode (dev) hiệu ứng chạy hai lần và bản Howl
  // đầu bị gỡ, nên lần chạy thứ hai phải đọc lại bằng Howl mới.
  const playAudioRef = useRef(playAudio)
  useEffect(() => {
    playAudioRef.current = playAudio
  })
  useEffect(() => {
    if (!autoPlayAudio || !question.audioUrl) return
    playAudioRef.current()
  }, [autoPlayAudio, question.audioUrl])
  // Xem lại là cảnh tĩnh: không cần vòng lặp hoạt họa chạy mãi (đỡ pin và máy yếu).
  const animate = !feedback.reducedMotion
  // Chuyển động nền chạy bằng Konva.Animation thẳng trên node (không vẽ lại React mỗi khung hình); tắt khi giảm chuyển động và khi xem lại.
  const motionOn = animate && mode !== 'review'
  const layerRef = useRef<Konva.Layer | null>(null)
  const motionRef = useRef<MotionState>({ answeredAt: null, correct: false, flying: false, confetti: [], trail: new SparkleTrail() })
  useGardenMotion(layerRef, motionOn, motionRef)
  // Chạm bướm, bồ câu, bọ rùa, ốc sên, nấm: vật phản ứng nhỏ (dưới 1,2 giây); KHÔNG phải trả lời. Giảm chuyển động hoặc xem lại thì vật đứng yên, không nhận chạm.
  const reactorRef = useRef<DecorReactor | null>(null)
  useEffect(() => () => reactorRef.current?.cancel(), [])
  const reactToDecoration: DecorationReactHandler | undefined = motionOn
    ? (node, reaction) => {
        const reactor = (reactorRef.current ??= new DecorReactor(konvaTweenFactory))
        reactor.react(node, reaction)
      }
    : undefined
  // Giọng đọc đang phát: bộ chuyển động rung loa và chớp sóng âm (không cần vẽ lại React mỗi khung hình).
  useEffect(() => {
    motionRef.current.speaking = speaking
  }, [speaking])

  const scale: NumberLineScale = useMemo(
    () => ({ min: question.min, max: question.max, step: question.step }),
    [question.min, question.max, question.step],
  )
  const ticks = useMemo(() => tickValues(scale), [scale])
  const every = labelEvery(ticks.length)
  const flowerSize = flowerScale(ticks.length)

  const initialValue =
    props.mode === 'review' && props.selectedValue !== undefined
      ? snapValue(props.selectedValue, scale)
      : (question.startValue ?? question.min)
  const [state, dispatch] = useReducer(numberLineReducer, undefined, () =>
    createNumberLineState(initialValue, mode === 'review' ? 'done' : 'idle'),
  )
  // Kết quả chấm. Xem lại: suy ra từ câu hỏi (có đáp án) và giá trị đã chọn.
  const [submitted, setSubmitted] = useState<NumberLineAnswerResult | null>(null)
  const [oopsOver, setOopsOver] = useState(false)
  const [blinking, setBlinking] = useState(false)
  const [sendFailed, setSendFailed] = useState(false)
  const reviewResult: NumberLineAnswerResult | null =
    props.mode === 'review' && props.selectedValue !== undefined
      ? {
          isCorrect: isCorrectValue(snapValue(props.selectedValue, scale), props.question.target, props.question.tolerance),
          correctValue: props.question.target,
        }
      : null
  const result = mode === 'review' ? reviewResult : submitted
  // Chỉ chỉ hoa đúng khi trẻ SAI, hoặc xem lại bài không chọn gì (hết giờ): để trẻ học. Đặt đúng rồi thì không chỉ thêm.
  const revealValue = result
    ? result.isCorrect
      ? undefined
      : result.correctValue
    : props.mode === 'review' && props.selectedValue === undefined
      ? props.question.target
      : undefined

  // Kết quả chấm bất đồng bộ chỉ được áp nếu component còn sống (chưa đổi câu/đóng).
  const activeRef = useRef(true)
  // Kịch bản phản hồi (đúng: hoa nảy, pháo, hoa bay lên thanh; sai: lắc đầu, chớp mắt, đếm lại) và kịch bản chuyển cảnh; hủy khi đóng màn.
  const scriptRef = useRef(new Timeline())
  const transitionRef = useRef(new Timeline())
  // Các hoa ong vừa bay qua ở lần di chuyển gần nhất: trả lời sai thì cho chúng nảy lần lượt để trẻ thấy mình đã đếm tới đâu.
  // Khóa đồng bộ: hai lần chạm đến trước khi React vẽ lại vẫn chỉ nộp một lần.
  const submitLockRef = useRef(false)
  useEffect(() => {
    activeRef.current = true
    const script = scriptRef.current
    const transition = transitionRef.current
    return () => {
      activeRef.current = false
      script.cancel()
      transition.cancel()
    }
  }, [])
  const interactive = mode !== 'review' && state.phase === 'idle'

  // ---- kéo ----
  const [dragX, setDragX] = useState<number | null>(null)
  // ---- bay ----
  // Tween chạy thẳng trên node Konva của ong/hoa (không qua state), nên không vẽ lại cả cây React mỗi khung hình.
  // `passing` chỉ để hiện số «đang đếm» trong lúc bay; vị trí ong KHÔNG đọc từ đây (nếu không prop x sẽ giành với tween).
  const flightRef = useRef<BeeFlight | null>(null)
  const beeNodeRef = useRef<Konva.Group | null>(null)
  const flowerNodes = useRef(new Map<number, Konva.Group>())
  const [flying, setFlying] = useState(false)
  // Chuyển cảnh: đang vào câu (chặn kéo và nộp trong chốc lát, dưới 1 giây) hoặc đang rời câu. Tắt khi giảm chuyển động, xem lại hoặc không được bật.
  const transitionsOn = (props.transitions ?? false) && motionOn && mode === 'play'
  const [entering, setEntering] = useState(transitionsOn)
  const exiting = props.exiting === true
  const signGroupRef = useRef<Konva.Group | null>(null)
  const badgeGroupRef = useRef<Konva.Group | null>(null)
  const transitionFlightRef = useRef<BeeFlight | null>(null)
  // Bông hoa bay lên thanh tiến độ: điểm xuất phát (hoa vừa chọn) và đã bay xong chưa (đặt lại cùng câu vì renderer gắn lại theo câu).
  const [progressFrom, setProgressFrom] = useState<{ x: number; y: number } | null>(null)
  const [progressLanded, setProgressLanded] = useState(false)
  const [passing, setPassing] = useState<number | null>(null)
  useEffect(() => () => flightRef.current?.cancel(), [])
  const liveValue = dragX !== null ? xToValue(dragX, scale, GEOMETRY) : (passing ?? state.value)

  // ---- bố cục ----
  const hasAudio = Boolean(question.audioUrl)
  // Huy hiệu số lớn: Mầm non (chế độ chạm hoặc nhóm tuổi Mầm non) và có con số để hiện, không phải xem lại bài.
  const preschool = props.ageBand === 'PRESCHOOL' || (props.ageBand === undefined && tapMode)
  const hasBadge = preschool && props.promptNumber !== undefined && mode !== 'review'
  // Mầm non: nút to hơn (144 đơn vị ≈ 64px ở khung điện thoại 390px); các nhóm khác 112 (≈ 48px).
  const ageBand = props.ageBand
  const touchSize = ageBand ? touchSizeForBand(ageBand) : tapMode ? TOUCH_SIZE_TAP : TOUCH_SIZE_CONFIRM
  const theme = useTheme()
  const ui = gardenUi(theme)
  const font = useGardenFont()
  const variant = theme.ambience?.variants[props.timeOfDay ?? theme.ambience.default]
  const decorations = useResolvedDecorations(variant?.decorations ?? theme.decorations)
  const textWidth = questionTextWidth(hasBadge, hasAudio, touchSize)
  const questionHeight = useQuestionHeight(question.questionText, textWidth, font)
  const layout = computeGardenLayout({ hasAudio, hasBadge, questionHeight, showConfirm: mode !== 'review', showControls: !tapMode, touchSize })
  const onLayout = props.onLayout
  useEffect(() => {
    onLayout?.(layout)
  })
  // Âm nền theo ong; đóng màn thì tắt tiếng ong (vòng lặp nền dừng cùng renderer).
  const ambience = props.ambience
  useEffect(() => {
    motionRef.current.ambience = ambience
    return () => ambience?.follow(false, 0)
  }, [ambience])
  // Trần nâng của chú ong (nhảy cẫng thấp lại để ong không chạm bảng).
  useEffect(() => {
    motionRef.current.maxLift = layout.beeMaxLift
  }, [layout.beeMaxLift])

  // Ô tiến độ nở: câu đã đúng ngay lần đầu. Câu hiện tại chờ hoa bay tới nơi (không có chuyển động thì nở ngay).
  const progressCurrent = props.progress?.current ?? -1
  const progressFilled = Array.from({ length: props.progress?.total ?? 0 }, (_, index) => {
    if (props.progress?.earned[index] !== true) return false
    return index !== progressCurrent || progressLanded || !motionOn
  })
  const progressFlying = motionOn && props.progress?.earned[progressCurrent] === true && progressFrom !== null && !progressLanded

  const set = (value: number) => dispatch({ type: 'set', value })

  /** Ong bay từng hoa một tới `target` (mỗi hoa nảy và kêu một nốt); tới nơi thì chọn giá trị và, ở chế độ chạm, chấm luôn. */
  const flyTo = (target: number) => {
    const flight = (flightRef.current ??= new BeeFlight(konvaTweenFactory))
    if (!interactive || flight.flying || submitLockRef.current) return
    // Đang rời câu thì bỏ qua; đang vào câu thì chạm là BỎ QUA phần mở màn (không bắt trẻ chờ dưới 1 giây rồi mất lượt chạm): về nghỉ ngay rồi xử lý chạm.
    if (transitionRef.current.running) {
      if (exiting) return
      skipEnter()
    }
    countSound.unlock() // đang trong cử chỉ của người dùng: mở khóa âm thanh trước khi các nốt phát từ hoạt ảnh
    const arrive = () => {
      motionRef.current.flying = false
      setFlying(false)
      setPassing(null)
      set(target)
      if (tapMode) void submit(target)
    }
    const node = beeNodeRef.current
    if (!node) {
      arrive()
      return
    }
    const stops = pathValues(state.value, target, question.step)
    motionRef.current.flying = true
    setFlying(true)
    flight.start(
      node,
      { stops: stops.map((value) => valueToX(value, scale, GEOMETRY)), restY: layout.beeY, arc: hopArcFor(layout.beeMaxLift), hopSeconds: hopSeconds(stops.length), instant: !animate, squash: BEE_SCALE },
      {
        onArrive: (stop) => {
          const value = stops[stop]
          countSound.play(ticks.indexOf(value), ticks.length)
          const flower = flowerNodes.current.get(value)
          if (flower && animate) flight.bounce(flower, flowerSize, BOUNCE_PEAK)
          setPassing(value)
        },
        onDone: arrive,
      },
    )
  }
  const stepBy = (deltaTicks: number) => flyTo(moveBy(state.value, deltaTicks, scale))

  const handleGardenTap = (event: KonvaEventObject<Event>) => {
    const position = event.target.getStage()?.getRelativePointerPosition()
    if (!position) return
    if (!interactive) {
      // Đã trả lời xong: chạm một bông hoa chỉ làm hoa nảy nhẹ cho vui (không đổi gì, không chấm); hoa đang «nở» vì được chọn thì để yên.
      if (motionOn) {
        const value = snapValue(xToValue(position.x, scale, GEOMETRY), scale)
        const flower = flowerNodes.current.get(value)
        if (flower && !(result && state.value === value)) (flightRef.current ??= new BeeFlight(konvaTweenFactory)).bounce(flower, flowerSize, TAP_FLOWER_PEAK)
      }
      return
    }
    flyTo(xToValue(position.x, scale, GEOMETRY))
  }

  const finish = (answer: NumberLineAnswerResult, chosen: number) => {
    setSubmitted(answer)
    motionRef.current.answeredAt = nowSeconds()
    motionRef.current.correct = answer.isCorrect
    dispatch({ type: 'submitDone' })
    feedback.trigger(answer.isCorrect ? 'correct' : 'tryAgain')
    // Pháo giấy (canvas-confetti) bắn từ chỗ chú ong khi đúng; giảm chuyển động thì không bắn. Sao rải trong cảnh vẫn giữ nguyên.
    if (answer.isCorrect) {
      let origin: ReturnType<typeof originOfRect>
      try {
        const rect = layerRef.current?.getStage()?.container().getBoundingClientRect()
        // Từ chỗ BÔNG HOA được chọn (ong đang ở trên nó); không có node hoa thì từ chỗ ong.
        origin = originOfRect(rect, (flowerNodes.current.get(chosen) ?? beeNodeRef.current)?.getAbsolutePosition())
      } catch {
        origin = undefined // trang trí thôi: không tính được chỗ ong thì bắn từ giữa màn
      }
      launchConfetti('correct', { reducedMotion: !animate, origin })
    }
    if (!animate) return
    const flight = (flightRef.current ??= new BeeFlight(konvaTweenFactory))
    if (answer.isCorrect) {
      // Đúng: hoa được chọn «nở» (cùng lúc ong nhảy cẫng, xoay và pháo giấy đã bắn ở trên), rồi sau một nhịp bông hoa nhỏ bay từ hoa vừa chọn lên thanh tiến độ.
      const flower = flowerNodes.current.get(chosen)
      scriptRef.current.play(
        correctScript({
          bloom: () => {
            if (flower) flight.bounce(flower, flowerSize, BLOOM_PEAK, BLOOM_TIMING)
          },
          confetti: () => undefined, // pháo giấy bắn ngay ở trên (cùng lúc hoa nở); giữ chỗ để kịch bản đọc đủ thứ tự
          flyToProgress: () => setProgressFrom(flower ? { x: flower.x(), y: flower.y() } : { x: valueToX(chosen, scale, GEOMETRY), y: layout.flowerY }),
        }),
      )
      return
    }
    // Chưa đúng (không màu đỏ, không âm phạt): ong lắc đầu nhẹ → mặt «o» một lúc → chớp mắt → rồi KHÔNG quay về 0 ngay mà lướt êm về hoa đầu và đếm 0 → số đúng,
    // mỗi hoa nảy và kêu một nốt cao dần (cho trẻ thấy số đúng đứng ở đâu). Không biết số đúng (play mà cha không báo) thì dừng ở chớp mắt.
    const correctValue = answer.correctValue
    scriptRef.current.play(
      wrongScript({
        oopsSeconds: OOPS_SECONDS + 1,
        blinkSeconds: BLINK_MS / 1000,
        pauseSeconds: COUNT_DEMO_PAUSE_MS / 1000,
        startBlink: () => {
          setOopsOver(true)
          setBlinking(true)
        },
        endBlink: () => setBlinking(false),
        countAgain: correctValue !== undefined && ticks.includes(correctValue) ? () => countFromStart(correctValue) : null,
      }),
    )
  }

  /** Ong lướt về hoa đầu rồi hop từng hoa tới `target`, mỗi hoa một nốt cao dần. Chỉ chạy khi chưa bị hủy (đổi câu/đóng màn). */
  const countFromStart = (target: number) => {
    const flight = flightRef.current
    const node = beeNodeRef.current
    if (!flight || !node || !activeRef.current) return
    const first = ticks[0]
    const stops = [first, ...pathValues(first, target, question.step)]
    motionRef.current.flying = true
    setFlying(true)
    flight.start(
      node,
      {
        stops: stops.map((value) => valueToX(value, scale, GEOMETRY)),
        restY: layout.beeY,
        arc: hopArcFor(layout.beeMaxLift),
        hopSeconds: hopSeconds(stops.length - 1),
        firstHopSeconds: COUNT_DEMO_GLIDE_SECONDS,
        squash: BEE_SCALE,
      },
      {
        onArrive: (stop) => {
          const value = stops[stop]
          countSound.play(ticks.indexOf(value), ticks.length)
          const flower = flowerNodes.current.get(value)
          if (flower) flight.bounce(flower, flowerSize, BOUNCE_PEAK)
          setPassing(value)
        },
        onDone: () => {
          motionRef.current.flying = false
          setFlying(false)
        },
      },
    )
  }

  // `chosen`: giá trị vừa chọn mà state chưa kịp cập nhật (chế độ chạm chấm ngay khi ong tới nơi).
  const submit = async (chosen?: number) => {
    // Ong đang bay thì chưa nộp: giá trị chọn là hoa ong sắp tới, không phải chỗ ong đang đứng (bấm «Xong rồi!» quá sớm sẽ nộp nhầm số cũ).
    if (props.mode === 'review' || !interactive || submitLockRef.current || flightRef.current?.flying) return
    submitLockRef.current = true
    const value = chosen ?? state.value
    setSendFailed(false)
    dispatch({ type: 'submitStart' })
    if (props.mode === 'preview') {
      finish({ isCorrect: isCorrectValue(value, props.question.target, props.question.tolerance), correctValue: props.question.target }, value)
      // Gọi trong Promise để lỗi ném đồng bộ lẫn bất đồng bộ của cha đều chỉ được ghi log, không làm hỏng màn.
      new Promise<void>((resolve) => resolve(void props.onAnswered?.(value))).catch((error) => {
        console.error('BeeGardenRenderer: onAnswered (preview) bị lỗi', error)
      })
      return
    }
    let answer: NumberLineAnswerResult
    try {
      answer = await props.onAnswered(value)
    } catch (error) {
      if (!activeRef.current) return
      console.error('BeeGardenRenderer: onAnswered bị lỗi, mở khóa lại để thử lại', error)
      submitLockRef.current = false
      setSendFailed(true)
      dispatch({ type: 'submitFailed' })
      return
    }
    if (!activeRef.current) return
    // Cha trả sai dạng (không có isCorrect kiểu boolean) coi như chưa nhận được kết quả.
    if (typeof answer?.isCorrect !== 'boolean') {
      console.error('BeeGardenRenderer: onAnswered trả kết quả sai dạng', answer)
      submitLockRef.current = false
      setSendFailed(true)
      dispatch({ type: 'submitFailed' })
      return
    }
    finish(answer, value)
  }

  // ---- hoạt họa ----
  // Nét mặt: đúng thì cười; chưa đúng thì «o» một lúc rồi về bình thường. Giảm chuyển động hoặc xem lại: chỉ còn dáng cuối (không có «một lúc»).
  // Xoay, nhảy cẫng, lắc đầu, sao rải do `gardenMotion` làm trên node, không phải state.
  const correct = result?.isCorrect === true
  const mood: BeeMood = !result ? 'idle' : correct ? 'happy' : mode === 'review' || !animate ? 'idle' : blinking ? 'blink' : oopsOver ? 'idle' : 'oops'
  const beeX = dragX ?? valueToX(state.value, scale, GEOMETRY)
  const confetti = useMemo(
    () => makeConfetti(hashSeed(`${question.id}:${state.value}`), CONFETTI_COUNT),
    [question.id, state.value],
  )
  useEffect(() => {
    motionRef.current.confetti = confetti
  }, [confetti])
  const showBee = !(props.mode === 'review' && props.selectedValue === undefined)
  const atMin = state.value <= question.min
  const atMax = state.value >= question.max
  const canSubmit = interactive && !flying && !entering && !exiting

  // Gợi ý theo thời gian: sau `hintDelaySeconds` giây không có thao tác nào (không chạm, kéo, bay; giá trị không đổi) hoa đáp án sáng nhẹ.
  // Mọi thao tác đổi `hintKey` nên gợi ý tự tắt và đếm lại từ đầu; không có biến phải đặt lại.
  const hintDelay = props.hintDelaySeconds ?? null
  const promptValue = typeof props.promptNumber === 'string' ? Number(props.promptNumber) : props.promptNumber
  const hintTarget =
    promptValue !== undefined && Number.isFinite(promptValue) && ticks.includes(promptValue)
      ? promptValue
      : props.mode === 'preview'
        ? props.question.target
        : undefined
  const hintKey = `${state.value}|${flying}|${dragX ?? ''}`
  const [hintShownFor, setHintShownFor] = useState<string | null>(null)
  useEffect(() => {
    if (!interactive || flying || dragX !== null || hintDelay === null || hintTarget === undefined) return
    const timer = setTimeout(() => setHintShownFor(hintKey), hintDelay * 1000)
    return () => clearTimeout(timer)
  }, [interactive, flying, dragX, hintDelay, hintTarget, hintKey])
  const hintVisible = hintShownFor === hintKey && interactive && !result
  // Chờ lâu không thao tác thì ong «nghĩ» (mắt nhìn lên, miệng thẳng nhỏ, râu nghiêng); mọi thao tác đổi `hintKey` nên tự hết, giống gợi ý.
  const [thinkShownFor, setThinkShownFor] = useState<string | null>(null)
  useEffect(() => {
    if (!interactive || flying || dragX !== null) return
    const timer = setTimeout(() => setThinkShownFor(hintKey), THINK_AFTER_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [interactive, flying, dragX, hintKey])
  const thinking = thinkShownFor === hintKey && interactive && !result && !flying
  // Trạng thái của ong cho mặt, râu và cánh: đang bay thì `fly`; ngoài ra theo tâm trạng (đúng, ngơ ngác, chớp mắt) hoặc `think` khi chờ lâu.
  const beeState: BeeState = flying ? 'fly' : mood === 'idle' && thinking ? 'think' : mood
  useEffect(() => {
    motionRef.current.beeState = beeState
  }, [beeState])

  // ---- chuyển cảnh ----
  const sceneNodes = (): SceneNodes => ({ sign: signGroupRef.current, badge: badgeGroupRef.current, bee: beeNodeRef.current })
  /** Bỏ qua cảnh vào câu: hủy kịch bản, đặt bảng, huy hiệu và ong về chỗ nghỉ ngay. */
  const skipEnter = () => {
    transitionRef.current.cancel()
    transitionFlightRef.current?.cancel()
    const nodes = sceneNodes()
    settleScene(nodes)
    nodes.bee?.x(beeRestRef.current.x)
    nodes.bee?.y(beeRestRef.current.restY)
    motionRef.current.flying = false
    setEntering(false)
  }
  const beeRest = { x: beeX, restY: layout.beeY, arc: hopArcFor(layout.beeMaxLift), squash: BEE_SCALE }
  const beeRestRef = useRef(beeRest)
  useEffect(() => {
    beeRestRef.current = beeRest
  })
  const onExitedRef = useRef(props.onExited)
  useEffect(() => {
    onExitedRef.current = props.onExited
  })
  // Vào câu: bảng gỗ rơi xuống và nảy, huy hiệu số xoay vào, ong bay vào từ ngoài mép trái. Đặt trạng thái đầu TRƯỚC khi vẽ để không chớp thấy cảnh đã xong rồi mới giật về.
  useLayoutEffect(() => {
    if (!transitionsOn) return
    const nodes = sceneNodes()
    const flight = (transitionFlightRef.current ??= new BeeFlight(konvaTweenFactory))
    const transition = transitionRef.current
    const motion = motionRef.current
    prepareEnter(nodes)
    motion.flying = true
    transition.play(enterScript({ factory: konvaTweenFactory, nodes, flight, bee: beeRestRef.current }), () => {
      motion.flying = false
      setEntering(false)
    })
    return () => {
      transition.cancel()
      flight.cancel()
      settleScene(nodes)
      motion.flying = false
    }
    // chỉ khi vào câu (renderer gắn lại theo câu), không chạy lại khi vẽ lại
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Rời câu: bên ngoài báo `exiting` thì bảng bay lên, huy hiệu thu nhỏ, ong bay ra mép phải, rồi báo `onExited`. Không có chuyển cảnh thì báo ngay.
  useEffect(() => {
    if (!exiting) return
    if (!transitionsOn) {
      onExitedRef.current?.()
      return
    }
    const flight = (transitionFlightRef.current ??= new BeeFlight(konvaTweenFactory))
    const transition = transitionRef.current
    motionRef.current.flying = true
    transition.play(exitScript({ factory: konvaTweenFactory, nodes: sceneNodes(), flight, bee: beeRestRef.current, beeExitX: STAGE_WIDTH + 90 }), () => onExitedRef.current?.())
    return () => {
      transition.cancel()
      flight.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exiting])

  const glowOf = (value: number): FlowerGlow => {
    if (revealValue === value) return 'hint'
    if (hintVisible && hintTarget === value) return 'hint'
    if (result?.isCorrect && state.value === value) return 'correct'
    return 'none'
  }

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
      <ResponsiveStage width={STAGE_WIDTH} height={layout.stageHeight} maxScale={SCENE_MAX_SCALE}>
        <Layer ref={layerRef}>
          <Group x={GARDEN_X} y={layout.gardenY}>
            <GardenBackdrop height={layout.gardenHeight} variant={variant} />
          </Group>
          {/* Cả khung vườn là vùng chạm để đặt chú ong vào hoa gần nhất (như dải thang số cũ). */}
          <Rect x={GARDEN_X} y={layout.gardenY} width={GARDEN_WIDTH} height={layout.gardenHeight} fill="#000000" opacity={0.001} onClick={handleGardenTap} onTap={handleGardenTap} />
          {/* Vật trang trí ở trời vẽ TRÊN vùng chạm của vườn: chạm trúng vật thì chỉ vật phản ứng, không rơi xuống vùng chạm (không bao giờ thành trả lời). */}
          <Group x={GARDEN_X} y={layout.gardenY}>
            <GardenDecorations items={decorations} layer="sky" width={GARDEN_WIDTH} height={layout.gardenHeight} onReact={reactToDecoration} offset={{ x: GARDEN_X, y: layout.gardenY }} />
          </Group>
          {ticks.map((value, index) => (
            <Flower
              key={value}
              x={valueToX(value, scale, GEOMETRY)}
              headY={layout.flowerY}
              groundY={layout.groundY}
              scale={flowerSize}
              index={index}
              label={isLabeled(index, ticks.length, every) ? String(value) : null}
              glow={glowOf(value)}
              fontFamily={font}
              nodeRef={(node) => {
                if (node) flowerNodes.current.set(value, node)
                else flowerNodes.current.delete(value)
              }}
            />
          ))}
          <Group x={GARDEN_X} y={layout.gardenY}>
            <GardenForeground height={layout.gardenHeight} frameWidth={ui.strokes.scene} variant={variant} />
            <GardenDecorations items={decorations} layer="ground" width={GARDEN_WIDTH} height={layout.gardenHeight} onReact={reactToDecoration} />
          </Group>

          {props.progress && (
            <GardenProgressBar
              box={layout.progress}
              total={props.progress.total}
              filled={progressFilled}
              animate={motionOn}
              track={ui.progress.track}
              border={ui.progress.border}
              borderWidth={ui.strokes.scene}
              glow={ui.hud.badgeFace}
            />
          )}
          {/* Hàng đề bài nằm trong cảnh, phía trên cùng của bầu trời (không chạm dải hoa); vẽ trên đồi và trang trí, dưới chú ong. */}
          <Group ref={signGroupRef}>
          <HudSign
            box={layout.sign}
            textBox={{ x: layout.questionTextX, y: layout.questionTextY, width: layout.questionTextWidth, height: layout.questionTextHeight }}
            text={question.questionText}
            fontSize={QUESTION_FONT_SIZE}
            ropeLength={layout.sign[1] - (layout.progress[1] + layout.progress[3])}
          />
          </Group>
          {/* Quay quanh tâm huy hiệu: nhóm đặt ở tâm và lệch ngược lại đúng bằng tâm nên hình không dịch chỗ. */}
          {layout.badge && (
            <Group ref={badgeGroupRef} x={layout.badge[0] + layout.badge[2] / 2} y={layout.badge[1] + layout.badge[3] / 2} offsetX={layout.badge[0] + layout.badge[2] / 2} offsetY={layout.badge[1] + layout.badge[3] / 2}>
              <HudBadge box={layout.badge} value={String(props.promptNumber)} />
            </Group>
          )}
          {layout.speaker && <HudSpeaker box={layout.speaker} onPress={playAudio} speaking={speaking} animate={motionOn} />}

          {showBee && <BeeShadow x={beeX} y={layout.groundY - 10} />}
          {showBee && (
            <>
              {correct && motionOn && <Confetti x={beeX} y={layout.beeY} particles={confetti} />}
              {motionOn && <SparkleTrailStars />}
              <BeeRig
                x={beeX}
                y={layout.beeY}
                state={beeState}
                hitRadius={BEE_HIT_RADIUS}
                draggable={interactive && !flying && !entering && !exiting}
                groupRef={beeNodeRef}
                minX={GARDEN_LEFT}
                maxX={GARDEN_RIGHT}
                onDragMove={setDragX}
                onDragEnd={(x) => {
                  const dropped = xToValue(x, scale, GEOMETRY)
                  set(dropped)
                  setDragX(null)
                  if (tapMode) void submit(dropped)
                }}
              />
            </>
          )}

          {layout.controls && (
            <>
              <ArrowButton x={layout.controls.minusX} y={layout.controls.y} size={layout.controls.size} direction="left" disabled={!interactive || atMin} onPress={() => stepBy(-1)} />
              <Group x={layout.controls.valueX} y={layout.controls.y} listening={false}>
                <Rect width={VALUE_BOX_WIDTH} height={layout.controls.size - 7} cornerRadius={layout.controls.size * 0.28} fill={ui.panel.fill} stroke={ui.panel.border} strokeWidth={5} />
                <Text
                  text={String(liveValue)}
                  width={VALUE_BOX_WIDTH}
                  height={layout.controls.size - 7}
                  align="center"
                  verticalAlign="middle"
                  fontSize={56}
                  fontStyle="bold"
                  fill={ui.panel.ink}
                  fontFamily={font}
                />
              </Group>
              <ArrowButton x={layout.controls.plusX} y={layout.controls.y} size={layout.controls.size} direction="right" disabled={!interactive || atMax} onPress={() => stepBy(1)} />
              {layout.controls.goX !== null && (
                <GoButton
                  x={layout.controls.goX}
                  y={layout.controls.y}
                  width={GO_BUTTON_WIDTH}
                  height={layout.controls.size}
                  label={state.phase === 'submitting' ? 'Đang chấm…' : 'Xong rồi!'}
                  disabled={!canSubmit}
                  onPress={() => void submit()}
                />
              )}
            </>
          )}

          {progressFlying && props.progress && progressFrom && (
            <ProgressFlyer
              from={progressFrom}
              to={{ x: progressSlots(layout.progress, props.progress.total).centers[props.progress.current] ?? progressFrom.x, y: progressSlots(layout.progress, props.progress.total).centerY }}
              size={44}
              index={props.progress.current}
              onDone={() => {
                countSound.play(ticks.length - 1, ticks.length) // nốt cao nhất: tiếng «ting» khi hoa nở trên thanh
                setProgressLanded(true)
              }}
            />
          )}
          <FeedbackOverlay plan={feedback.plan} runId={feedback.runId} x={GARDEN_X} y={layout.gardenY} width={GARDEN_WIDTH} height={layout.gardenHeight} />
        </Layer>
      </ResponsiveStage>

      {/* Lối thay thế cho bàn phím và trình đọc màn hình: canvas không có cây DOM. Chỉ hiện khi được tiêu điểm. */}
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
            onChange={(event) => set(Number(event.target.value))}
            aria-valuetext={`Số ${state.value}`}
          />
        </label>
        {mode !== 'review' && (
          <button type="button" disabled={!canSubmit} onClick={() => void submit()}>
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
