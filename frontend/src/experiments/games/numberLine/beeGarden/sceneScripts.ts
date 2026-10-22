import { BeeFlight, type FlightPlan, type TweenFactory, type TweenNode } from './beeFlight'
import { parallel, run, sequence, tween, wait, type Scheduler, type Step } from './timeline'

/**
 * Các kịch bản của vườn, viết như một đoạn kịch bản đọc được (xem `timeline.ts`): vào câu, rời câu, trả lời đúng, trả lời chưa đúng.
 * Mỗi hàm nhận node và hàm gọi lại cần thiết (không tự tìm gì), nên test được bằng tween giả và đồng hồ giả.
 * Chuyển cảnh luôn ngắn (dưới `MAX_TRANSITION_SECONDS`) để không chặn thao tác của trẻ quá lâu.
 */

/** Node Konva mà kịch bản đặt trạng thái đầu (trước khi tween) và tween thuộc tính: bảng, huy hiệu. */
export interface SceneNode {
  x(value: number): unknown
  y(value: number): unknown
  rotation(value: number): unknown
  scaleX(value: number): unknown
  scaleY(value: number): unknown
  opacity(value: number): unknown
}

export interface SceneNodes {
  sign: SceneNode | null
  badge: SceneNode | null
  bee: (TweenNode & { opacity?(value: number): unknown }) | null
}

/** Thời gian (giây) của từng phần chuyển cảnh. */
export const ENTER_SECONDS = { sign: 0.7, badge: 0.6, badgeDelay: 0.15, bee: 0.7 } as const
export const EXIT_SECONDS = { bee: 0.5, sign: 0.3, badge: 0.25 } as const
/** Chuyển cảnh không được chặn thao tác lâu hơn mức này. */
export const MAX_TRANSITION_SECONDS = 1.5
/** Bảng gỗ rơi từ trên xuống: bắt đầu cao hơn chỗ treo bấy nhiêu đơn vị thiết kế. */
export const SIGN_DROP = 90
/** Ong vào từ ngoài mép trái sân và ra khỏi mép phải sân (đơn vị thiết kế). */
export const BEE_ENTER_FROM_X = -90

export const enterDuration = (): number => Math.max(ENTER_SECONDS.sign, ENTER_SECONDS.badgeDelay + ENTER_SECONDS.badge, ENTER_SECONDS.bee)
export const exitDuration = (): number => Math.max(EXIT_SECONDS.bee, EXIT_SECONDS.sign, EXIT_SECONDS.badge)

/** Đặt trạng thái đầu của lúc vào câu: bảng ở trên và trong suốt, huy hiệu nhỏ xíu đang xoay ngược, ong ở ngoài mép trái. */
export function prepareEnter({ sign, badge, bee }: SceneNodes): void {
  sign?.y(-SIGN_DROP)
  sign?.opacity(0)
  badge?.rotation(-270)
  badge?.scaleX(0.01)
  badge?.scaleY(0.01)
  badge?.opacity(0)
  bee?.x(BEE_ENTER_FROM_X)
}

/** Trả mọi thứ về trạng thái nghỉ (dùng khi hủy chuyển cảnh giữa chừng để không bỏ lại bảng lửng lơ hay ong ngoài cảnh). */
export function settleScene({ sign, badge }: SceneNodes): void {
  sign?.y(0)
  sign?.opacity(1)
  badge?.rotation(0)
  badge?.scaleX(1)
  badge?.scaleY(1)
  badge?.opacity(1)
}

/** Bước «ong bay theo kế hoạch»: xong khi tới hoa cuối; hủy thì dừng chuyến bay. */
export const flightStep =
  (flight: BeeFlight, node: TweenNode, plan: FlightPlan): Step =>
  (done) => {
    flight.start(node, plan, { onArrive: () => undefined, onDone: done })
    return () => flight.cancel()
  }

interface EnterDeps {
  factory: TweenFactory
  nodes: SceneNodes
  /** Chuyến bay vào của ong (một `BeeFlight` riêng, không dùng chung với chuyến bay chọn số). */
  flight: BeeFlight
  /** Toạ độ nghỉ của ong: x đích và độ cao nghỉ, cung bay và hệ số co giãn. */
  bee: { x: number; restY: number; arc: number; squash: number }
}

/** Vào câu: bảng gỗ rơi xuống và nảy, huy hiệu số xoay vào (hơi vọt rồi về), ong bay vào từ ngoài mép trái. Tất cả cùng lúc, tổng dưới `MAX_TRANSITION_SECONDS`. */
export function enterScript({ factory, nodes, flight, bee }: EnterDeps): Step {
  const steps: Step[] = []
  if (nodes.sign) steps.push(tween(factory, nodes.sign, { y: 0, opacity: 1 }, ENTER_SECONDS.sign, 'bounce'))
  if (nodes.badge) {
    steps.push(sequence(wait(ENTER_SECONDS.badgeDelay), tween(factory, nodes.badge, { rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }, ENTER_SECONDS.badge, 'back')))
  }
  if (nodes.bee) steps.push(flightStep(flight, nodes.bee, { stops: [bee.x], restY: bee.restY, arc: bee.arc, hopSeconds: ENTER_SECONDS.bee, squash: bee.squash }))
  return parallel(...steps)
}

interface ExitDeps extends EnterDeps {
  /** Toạ độ x của ong khi ra khỏi cảnh (ngoài mép phải). */
  beeExitX: number
}

/** Rời câu: bảng gỗ bay lên và mờ đi, huy hiệu thu nhỏ, ong bay ra khỏi mép phải cảnh. */
export function exitScript({ factory, nodes, flight, bee, beeExitX }: ExitDeps): Step {
  const steps: Step[] = []
  if (nodes.sign) steps.push(tween(factory, nodes.sign, { y: -SIGN_DROP, opacity: 0 }, EXIT_SECONDS.sign, 'in'))
  if (nodes.badge) steps.push(tween(factory, nodes.badge, { scaleX: 0.01, scaleY: 0.01, opacity: 0 }, EXIT_SECONDS.badge, 'in'))
  if (nodes.bee) steps.push(flightStep(flight, nodes.bee, { stops: [beeExitX], restY: bee.restY, arc: bee.arc, hopSeconds: EXIT_SECONDS.bee, squash: bee.squash }))
  return parallel(...steps)
}

/** Thời gian chờ (giây) từ lúc đúng tới lúc bông hoa nhỏ bắt đầu bay lên thanh tiến độ: để hoa nở, ong nhảy và pháo giấy diễn trước. */
export const PROGRESS_FLY_DELAY = 0.6

interface CorrectDeps {
  /** Hoa được chọn «nở». */
  bloom: () => void
  /** Pháo giấy từ hoa được chọn. */
  confetti: () => void
  /** Bắt đầu cho bông hoa nhỏ bay lên thanh tiến độ. */
  flyToProgress: () => void
  scheduler?: Scheduler
}

/**
 * Trả lời đúng: hoa nở + pháo giấy + (ong nhảy và xoay do bộ chuyển động) cùng lúc, rồi sau `PROGRESS_FLY_DELAY` giây bông hoa nhỏ bay lên thanh tiến độ;
 * tới nơi thì ô nở và kêu một nốt (do `ProgressFlyer` báo, ngoài kịch bản này).
 */
export function correctScript({ bloom, confetti, flyToProgress, scheduler }: CorrectDeps): Step {
  return parallel(run(bloom), run(confetti), sequence(wait(PROGRESS_FLY_DELAY, scheduler), run(flyToProgress)))
}

interface WrongDeps {
  /** Thời gian lắc đầu + mặt «o» (giây), thời gian chớp mắt, nhịp chờ trước khi đếm lại. */
  oopsSeconds: number
  blinkSeconds: number
  pauseSeconds: number
  /** Hết mặt «o»: chớp mắt bắt đầu / kết thúc. */
  startBlink: () => void
  endBlink: () => void
  /** Ong lướt về hoa đầu và đếm tới số đúng; `null` nếu không biết số đúng (chỉ lắc đầu và chớp mắt). */
  countAgain: (() => void) | null
  scheduler?: Scheduler
}

/** Trả lời chưa đúng (không phạt): lắc đầu + mặt «o» → chớp mắt → nghỉ một nhịp → (nếu biết số đúng) đếm lại 0 → số đúng. */
export function wrongScript({ oopsSeconds, blinkSeconds, pauseSeconds, startBlink, endBlink, countAgain, scheduler }: WrongDeps): Step {
  const steps = [wait(oopsSeconds, scheduler), run(startBlink), wait(blinkSeconds, scheduler), run(endBlink)]
  if (countAgain) steps.push(wait(pauseSeconds, scheduler), run(countAgain))
  return sequence(...steps)
}
