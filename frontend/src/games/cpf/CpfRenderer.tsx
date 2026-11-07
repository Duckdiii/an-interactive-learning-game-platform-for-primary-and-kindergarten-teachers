import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type Konva from 'konva'
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Star, Text } from 'react-konva'
import useImage from 'use-image'
import type { CpfEntity, CpfGame, CpfRule, CpfSimpleAction, CpfStudentGame } from '../../types/cpf-game.types'
import { speakVietnamese } from '../../services/pipeline/assetBank'
import { ConfettiEffect } from '../common/ConfettiEffect'
import { DEFAULT_PALETTE } from '../common/palette'
import ResponsiveStage from '../common/ResponsiveStage'
import { soundBus } from '../common/sound'
import { assetUrl, fallbackColor } from './cpfAssets'
import {
  applyCheck,
  currentRound,
  endReveal,
  initialState,
  localGrader,
  type CpfCheckResult,
  type CpfGrader,
  type CpfPick,
  type CpfRoundResult,
  type CpfState,
} from './cpfEngine'
import { CPF_HUD_HEIGHT, CPF_STAGE_HEIGHT, CPF_STAGE_WIDTH, overlaps, progressX } from './cpfLayout'
import { boxOf, buildInstances, clampX, instanceAt, stepMotion, touching, type CpfInstance } from './cpfScene'

/**
 * Renderer CPF Game v2.0.0 (docs/cpf-game-v2.0.0.md). Prop theo `mode` như các renderer khác (.claude/rules/canvas-engine.md):
 * - preview: giáo viên xem thử, chấm cục bộ bằng answerKey.
 * - play: học sinh chơi, KHÔNG có answerKey; cha chấm qua `onAnswered` (Backend) và trả kèm đáp án đúng khi cần chỉ cho trẻ.
 * - review: xem lại, khóa sẵn, làm sáng đáp án đúng của màn `roundIndex`.
 */
export type CpfRendererProps =
  | { mode: 'preview'; game: CpfGame; onFinished?: (results: CpfRoundResult[]) => void }
  | { mode: 'play'; game: CpfStudentGame; onAnswered: CpfGrader; onFinished?: (results: CpfRoundResult[]) => void }
  | { mode: 'review'; game: CpfGame; roundIndex?: number }

const REVEAL_MS = 1500
const EFFECT_MS = 800
const SHOT_SPEED = 900
const MIN_PULL = 30
const HUD_AUDIO = { x: 20, y: 20, size: 70 }

interface Effect {
  id: number
  name: 'STARS' | 'POP' | 'GLOW' | 'WIGGLE' | 'CONFETTI'
  x: number
  y: number
  key?: string
  start: number
}

interface Shot {
  ruleIndex: number
  x: number
  y: number
  vx: number
  vy: number
}

export default function CpfRenderer(props: CpfRendererProps) {
  const { game, mode } = props
  const entities = useMemo(() => new Map<string, CpfEntity>(game.entities.map((e) => [e.id, e])), [game])
  const grader: CpfGrader = useMemo(
    () => (props.mode === 'play' ? props.onAnswered : localGrader(props.game)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.mode, props.game, props.mode === 'play' ? props.onAnswered : null],
  )
  const reviewRound = props.mode === 'review' ? (props.roundIndex ?? 0) : 0

  const [state, setState] = useState<CpfState>(() => ({ ...initialState(), roundIndex: reviewRound }))
  const [score, setScore] = useState(0)
  const [progress, setProgress] = useState(0)
  const [, setFrame] = useState(0)
  const [aim, setAim] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  const instancesRef = useRef<CpfInstance[]>(buildInstances(game, reviewRound, 0))
  const effectsRef = useRef<Effect[]>([])
  const shotRef = useRef<Shot | null>(null)
  const dragRef = useRef<{ key: string; dx: number; dy: number } | null>(null)
  const busyRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const effectSeq = useRef(0)
  const progressRef = useRef(progress)
  progressRef.current = progress

  const round = currentRound(game, state)
  const locked = mode === 'review' || state.phase !== 'playing'

  // review: theo màn cha chỉ định (cha có thể đổi roundIndex mà không dựng lại component).
  useEffect(() => {
    if (mode === 'review') setState((s) => ({ ...s, roundIndex: reviewRound }))
  }, [mode, reviewRound])

  // Màn mới: dựng lại vật theo màn và số nấc đã đi. review không chạy chuyển động nên đặt vật ở chỗ đứng (vật STREAM
  // xếp hàng ngoài màn sẽ không nhìn thấy).
  useEffect(() => {
    const built = buildInstances(game, state.roundIndex, progressRef.current)
    instancesRef.current = mode === 'review' ? built.map((i) => ({ ...i, y: i.homeY })) : built
    shotRef.current = null
    setFrame((f) => f + 1)
  }, [game, state.roundIndex, mode])

  // Sai ở PICK_ONE: chỉ đáp án đúng một lúc rồi sang màn.
  useEffect(() => {
    if (state.phase !== 'reveal') return
    const timer = setTimeout(() => setState((s) => endReveal(game, s)), REVEAL_MS)
    return () => clearTimeout(timer)
  }, [state.phase, game])

  useEffect(() => {
    if (state.phase !== 'finished' || props.mode === 'review') return
    setCelebrate(true)
    soundBus.playFanfare()
    props.onFinished?.(state.results)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase])

  const addEffect = useCallback((name: Effect['name'], at: CpfInstance | undefined, key?: string) => {
    if (!at) return
    effectsRef.current.push({ id: effectSeq.current++, name, x: at.x + at.w / 2, y: at.y + at.h / 2, key, start: performance.now() })
    if (name === 'CONFETTI') setCelebrate(true)
  }, [])

  const updateInstance = (key: string, patch: Partial<CpfInstance>) => {
    instancesRef.current = instancesRef.current.map((i) => (i.key === key ? { ...i, ...patch } : i))
  }

  const resolveRef = (ref: string, subject: CpfInstance) =>
    ref === '$subject' ? subject : instancesRef.current.find((i) => i.entityId === ref)

  const runSimple = (action: CpfSimpleAction, subject: CpfInstance) => {
    switch (action.type) {
      case 'EFFECT': {
        const target = resolveRef(action.at, subject)
        addEffect(action.name, target, target?.key)
        return
      }
      case 'SOUND':
        if (action.name === 'CORRECT') soundBus.playCorrect()
        else if (action.name === 'GENTLE_WRONG') soundBus.playWrong()
        else if (action.name === 'POP') soundBus.playPop()
        else soundBus.playSling()
        return
      case 'SCORE':
        setScore((s) => s + action.add)
        return
      case 'REMOVE': {
        const target = resolveRef(action.subject, subject)
        if (target) updateInstance(target.key, { visible: false, locked: true })
        return
      }
      case 'MOVE_TO': {
        const target = resolveRef(action.subject, subject)
        const to = instancesRef.current.find((i) => i.entityId === action.to)
        if (target && to) updateInstance(target.key, { x: to.x + (to.w - target.w) / 2, y: to.y + (to.h - target.h) / 2, locked: true })
        return
      }
      case 'ADVANCE': {
        const next = progressRef.current + 1
        progressRef.current = next
        setProgress(next)
        const car = resolveRef(action.subject, subject)
        const entity = car && entities.get(car.entityId)
        if (car && entity) updateInstance(car.key, { x: progressX(boxOf(car), entity.placement.region, next, game.content.rounds.length) })
        return
      }
    }
  }

  /** Sự kiện của luật xảy ra với vật lựa chọn `subject`: chạy `do` theo thứ tự; CHECK chờ chấm (preview tức thì, play gọi Backend). */
  const runRule = async (rule: CpfRule, subject: CpfInstance, zoneId?: string) => {
    const roundNow = currentRound(game, stateRef.current)
    if (!roundNow || stateRef.current.phase !== 'playing' || busyRef.current) return
    for (const action of rule.do) {
      if (action.type !== 'CHECK') {
        runSimple(action, subject)
        continue
      }
      if (!subject.choiceId) continue
      const pick: CpfPick = { roundId: roundNow.id, choiceId: subject.choiceId, zoneId }
      busyRef.current = true
      let result: CpfCheckResult
      try {
        result = await grader(pick)
      } catch {
        // Không chấm được (mất mạng...): trả vật về chỗ, cho trẻ thử lại; không tính là sai.
        updateInstance(subject.key, { x: subject.homeX, y: subject.homeY })
        return
      } finally {
        busyRef.current = false
      }
      for (const followUp of result.isCorrect ? action.onCorrect : action.onWrong) runSimple(followUp, subject)
      afterCheck(roundNow.task, subject, zoneId, result.isCorrect)
      setState((s) => applyCheck(game, s, pick, result))
    }
    setFrame((f) => f + 1)
  }

  /** Phần runtime tự làm sau khi chấm (docs mục 3.7), ngoài các hành động luật khai báo. */
  const afterCheck = (task: string, subject: CpfInstance, zoneId: string | undefined, correct: boolean) => {
    if (task === 'SORT') {
      const zone = instancesRef.current.find((i) => i.zoneId === zoneId)
      if (correct && zone) updateInstance(subject.key, { x: zone.x + (zone.w - subject.w) / 2, y: zone.y + 8, locked: true })
      else updateInstance(subject.key, { x: subject.homeX, y: subject.homeY })
      return
    }
    if (correct && task === 'PICK_ALL') updateInstance(subject.key, { locked: true })
  }

  // ---- vòng lặp chuyển động, va chạm ----
  // Vòng lặp không dựng lại mỗi lần render: gọi bản detectCollisions mới nhất (grader/game hiện tại) qua ref.
  const collideRef = useRef<(dt: number) => void>(() => {})
  useEffect(() => {
    if (mode === 'review') return
    let frameId = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (stateRef.current.phase === 'playing') {
        instancesRef.current = stepMotion(instancesRef.current, entities, dt, now / 1000, dragRef.current?.key)
        collideRef.current(dt)
      }
      effectsRef.current = effectsRef.current.filter((e) => now - e.start < EFFECT_MS)
      setFrame((f) => (f + 1) % 1_000_000)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, entities])

  const detectCollisions = (dt: number) => {
    if (busyRef.current) return
    game.rules.forEach((rule, ruleIndex) => {
      if (rule.on.type !== 'COLLIDE') return
      const { a, b } = rule.on
      const controllerId = entities.get(a)?.control ? a : b
      const targetId = controllerId === a ? b : a
      const controller = entities.get(controllerId)
      if (controller?.control === 'DRAG_X') {
        const mover = instancesRef.current.find((i) => i.entityId === controllerId)
        const hit = mover && touching(instancesRef.current, targetId, boxOf(mover))[0]
        if (hit) {
          // Vật đã chạm được xử lý một lần; nếu luật không bỏ nó thì cho rơi lại từ trên.
          updateInstance(hit.key, { y: CPF_HUD_HEIGHT - hit.h })
          void runRule(rule, hit)
        }
      }
      const shot = shotRef.current
      if (controller?.control === 'AIM_SHOOT' && shot && shot.ruleIndex === ruleIndex) {
        shot.x += shot.vx * dt
        shot.y += shot.vy * dt
        const hit = touching(instancesRef.current, targetId, { x: shot.x - 12, y: shot.y - 12, w: 24, h: 24 })[0]
        if (hit) {
          shotRef.current = null
          void runRule(rule, hit)
        } else if (shot.x < 0 || shot.x > CPF_STAGE_WIDTH || shot.y < 0 || shot.y > CPF_STAGE_HEIGHT) {
          shotRef.current = null
        }
      }
    })
  }

  collideRef.current = detectCollisions

  // ---- thao tác ----
  const pointer = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage()
    const p = stage?.getPointerPosition()
    if (!stage || !p) return null
    return { x: p.x / stage.scaleX(), y: p.y / stage.scaleY() }
  }

  const onDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const p = pointer(e)
    if (!p) return
    // Nghe lại câu hỏi lúc nào cũng được, kể cả khi đang khóa (review, đang chỉ đáp án).
    if (p.x <= HUD_AUDIO.x + HUD_AUDIO.size && p.y <= HUD_AUDIO.y + HUD_AUDIO.size && round) {
      speakVietnamese(round.prompt)
      return
    }
    // Chạm vào dải HUD không tính là chọn vật đang khuất sau nó.
    if (locked || busyRef.current || p.y < CPF_HUD_HEIGHT) return
    const inst = instanceAt(instancesRef.current, p.x, p.y)
    if (!inst) return
    const control = entities.get(inst.entityId)?.control
    if (control === 'DRAG_X' || control === 'DRAG_FREE') {
      dragRef.current = { key: inst.key, dx: p.x - inst.x, dy: p.y - inst.y }
      return
    }
    if (control === 'AIM_SHOOT') {
      setAim({ from: { x: inst.x + inst.w / 2, y: inst.y + inst.h / 2 }, to: p })
      return
    }
    const rule = game.rules.find((r) => r.on.type === 'TAP' && r.on.target === inst.entityId)
    if (rule) void runRule(rule, inst)
  }

  const onMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const p = pointer(e)
    if (!p) return
    if (aim) setAim({ ...aim, to: p })
    const drag = dragRef.current
    if (!drag) return
    const inst = instancesRef.current.find((i) => i.key === drag.key)
    if (!inst) return
    if (entities.get(inst.entityId)?.control === 'DRAG_X') updateInstance(inst.key, { x: clampX(p.x - drag.dx, inst.w) })
    else updateInstance(inst.key, { x: p.x - drag.dx, y: p.y - drag.dy })
  }

  const onUp = () => {
    if (aim) {
      const pullX = aim.from.x - aim.to.x
      const pullY = aim.from.y - aim.to.y
      const length = Math.hypot(pullX, pullY)
      const ruleIndex = game.rules.findIndex((r) => r.on.type === 'COLLIDE' && entities.get(r.on.a)?.control === 'AIM_SHOOT' || (r.on.type === 'COLLIDE' && entities.get(r.on.b)?.control === 'AIM_SHOOT'))
      if (length >= MIN_PULL && ruleIndex >= 0) {
        shotRef.current = { ruleIndex, x: aim.from.x, y: aim.from.y, vx: (pullX / length) * SHOT_SPEED, vy: (pullY / length) * SHOT_SPEED }
        soundBus.playSling()
      }
      setAim(null)
    }
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    const inst = instancesRef.current.find((i) => i.key === drag.key)
    if (!inst || entities.get(inst.entityId)?.control !== 'DRAG_FREE') return
    const rule = game.rules.find((r) => r.on.type === 'DROP' && r.on.item === inst.entityId)
    const zoneEntity = rule && rule.on.type === 'DROP' ? rule.on.zone : undefined
    const zone = instancesRef.current.find((z) => z.entityId === zoneEntity && overlaps(boxOf(z), { x: inst.x + inst.w / 2 - 1, y: inst.y + inst.h / 2 - 1, w: 2, h: 2 }))
    if (rule && zone) void runRule(rule, inst, zone.zoneId)
    else updateInstance(inst.key, { x: inst.homeX, y: inst.homeY })
  }

  // ---- vẽ ----
  const reviewGlow = useMemo(() => {
    if (props.mode !== 'review') return [] as string[]
    const answer = props.game.answerKey.rounds[reviewRound]
    return answer && 'correctChoiceIds' in answer ? answer.correctChoiceIds : []
  }, [props, reviewRound])
  const glow = new Set([...state.glowChoiceIds, ...reviewGlow])
  const now = typeof performance === 'undefined' ? 0 : performance.now()

  const restart = () => {
    setState(initialState())
    setScore(0)
    setProgress(0)
    progressRef.current = 0
    setCelebrate(false)
    instancesRef.current = buildInstances(game, 0, 0)
  }

  return (
    <div className="relative">
      <ResponsiveStage width={CPF_STAGE_WIDTH} height={CPF_STAGE_HEIGHT}>
        <Layer onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
          <Background assetId={game.world.backgroundId} />
          {instancesRef.current.map((inst) =>
            inst.visible ? (
              <Sprite
                key={inst.key}
                inst={inst}
                isChoice={Boolean(inst.choiceId || inst.zoneId)}
                glow={(inst.choiceId != null && glow.has(inst.choiceId)) || (inst.zoneId != null && inst.zoneId === state.glowZoneId)}
                done={inst.locked && Boolean(inst.choiceId)}
                wiggle={effectsRef.current.find((e) => e.name === 'WIGGLE' && e.key === inst.key)}
                now={now}
              />
            ) : null,
          )}
          {aim ? <Line points={[aim.from.x, aim.from.y, aim.to.x, aim.to.y]} stroke={DEFAULT_PALETTE.ink} strokeWidth={4} dash={[12, 8]} listening={false} /> : null}
          {shotRef.current ? <Circle x={shotRef.current.x} y={shotRef.current.y} radius={12} fill={DEFAULT_PALETTE.primary} listening={false} /> : null}
          {effectsRef.current.map((effect) => (
            <EffectShape key={effect.id} effect={effect} now={now} />
          ))}
          <Hud
            prompt={state.phase === 'finished' ? 'Hoàn thành! Bé giỏi quá!' : (round?.prompt ?? '')}
            roundLabel={`${Math.min(state.roundIndex + 1, game.content.rounds.length)}/${game.content.rounds.length}`}
            score={score}
            mascotId={game.world.mascotId}
          />
        </Layer>
      </ResponsiveStage>
      <ConfettiEffect active={celebrate} onComplete={() => setCelebrate(false)} />
      {state.phase === 'finished' && mode !== 'review' ? (
        <div className="mt-3 flex justify-center">
          <button type="button" onClick={restart} className="min-h-16 rounded-2xl bg-brand px-8 text-lg font-bold text-white">
            Chơi lại
          </button>
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {round?.prompt}
      </p>
    </div>
  )
}

function Background({ assetId }: { assetId: string }) {
  const [image] = useImage(assetUrl(assetId) ?? '')
  return image ? (
    <KonvaImage image={image} width={CPF_STAGE_WIDTH} height={CPF_STAGE_HEIGHT} />
  ) : (
    <Rect width={CPF_STAGE_WIDTH} height={CPF_STAGE_HEIGHT} fill={fallbackColor(assetId)} opacity={0.35} />
  )
}

function Sprite({ inst, isChoice, glow, done, wiggle, now }: {
  inst: CpfInstance
  isChoice: boolean
  glow: boolean
  done: boolean
  wiggle?: Effect
  now: number
}) {
  const [image] = useImage(assetUrl(inst.assetId) ?? '')
  // Lắc nhẹ khi sai (không rung mạnh, docs mục 3.6).
  const offset = wiggle ? Math.sin((now - wiggle.start) / 40) * 6 * (1 - (now - wiggle.start) / EFFECT_MS) : 0
  return (
    <Group x={inst.x + offset} y={inst.y} opacity={done ? 0.45 : 1}>
      {glow ? <Rect x={-10} y={-10} width={inst.w + 20} height={inst.h + 20} cornerRadius={24} stroke={DEFAULT_PALETTE.dotYellow} strokeWidth={8} /> : null}
      {image ? (
        <KonvaImage image={image} width={inst.w} height={inst.h} />
      ) : (
        <Rect width={inst.w} height={inst.h} cornerRadius={20} fill={fallbackColor(inst.assetId)} stroke={DEFAULT_PALETTE.ink} strokeWidth={3} />
      )}
      {isChoice && inst.label ? <LabelBadge label={inst.label} itemWidth={inst.w} itemHeight={inst.h} /> : null}
    </Group>
  )
}

/** Nhãn lựa chọn trên nền trắng viền đậm: đọc rõ trên mọi màu hình (chạy thật, chữ trắng trên táo đỏ khó đọc). */
function LabelBadge({ label, itemWidth, itemHeight }: { label: string; itemWidth: number; itemHeight: number }) {
  const short = label.length <= 3
  const fontSize = label.length > 6 ? 26 : 36
  const width = short ? 64 : itemWidth + 40
  const height = short ? 56 : 48
  return (
    <Group x={(itemWidth - width) / 2} y={(itemHeight - height) / 2} listening={false}>
      <Rect width={width} height={height} cornerRadius={height / 2} fill={DEFAULT_PALETTE.surface} opacity={0.95}
        stroke={DEFAULT_PALETTE.ink} strokeWidth={3} />
      <Text text={label} width={width} height={height} align="center" verticalAlign="middle" fontSize={fontSize}
        fontStyle="bold" fill={DEFAULT_PALETTE.ink} wrap="none" ellipsis />
    </Group>
  )
}

function EffectShape({ effect, now }: { effect: Effect; now: number }) {
  const t = Math.min(1, (now - effect.start) / EFFECT_MS)
  if (effect.name === 'POP') {
    return <Circle x={effect.x} y={effect.y} radius={30 + t * 70} stroke={DEFAULT_PALETTE.dotPink} strokeWidth={6} opacity={1 - t} listening={false} />
  }
  if (effect.name === 'GLOW') {
    return <Circle x={effect.x} y={effect.y} radius={90} fill={DEFAULT_PALETTE.dotYellow} opacity={0.35 * (1 - t)} listening={false} />
  }
  if (effect.name === 'STARS') {
    return (
      <Group listening={false}>
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i / 5) * Math.PI * 2
          return (
            <Star key={i} x={effect.x + Math.cos(angle) * 90 * t} y={effect.y + Math.sin(angle) * 90 * t} numPoints={5}
              innerRadius={8} outerRadius={18} fill={DEFAULT_PALETTE.dotYellow} opacity={1 - t} />
          )
        })}
      </Group>
    )
  }
  return null
}

function Hud({ prompt, roundLabel, score, mascotId }: { prompt: string; roundLabel: string; score: number; mascotId?: string }) {
  const [mascot] = useImage(assetUrl(mascotId) ?? '')
  return (
    <Group>
      {/* Nền HUD đặc: vật STREAM xếp hàng ngay sau HUD không được lộ ra. */}
      <Rect width={CPF_STAGE_WIDTH} height={CPF_HUD_HEIGHT} fill={DEFAULT_PALETTE.surface} />
      {/* Nút nghe lại câu hỏi, chạm bao nhiêu lần cũng được (vùng chạm ≥ 64px). */}
      <Circle x={HUD_AUDIO.x + HUD_AUDIO.size / 2} y={HUD_AUDIO.y + HUD_AUDIO.size / 2} radius={HUD_AUDIO.size / 2} fill={DEFAULT_PALETTE.primary} />
      <Text x={HUD_AUDIO.x} y={HUD_AUDIO.y + 18} width={HUD_AUDIO.size} align="center" text="🔊" fontSize={34} listening={false} />
      <Text x={110} y={18} width={CPF_STAGE_WIDTH - 420} height={CPF_HUD_HEIGHT - 30} text={prompt} fontSize={34} fontStyle="bold"
        fill={DEFAULT_PALETTE.ink} verticalAlign="middle" wrap="word" listening={false} />
      <Text x={CPF_STAGE_WIDTH - 300} y={36} width={120} align="right" text={roundLabel} fontSize={30} fill={DEFAULT_PALETTE.ink} listening={false} />
      <Text x={CPF_STAGE_WIDTH - 170} y={36} width={80} text={`⭐ ${score}`} fontSize={30} fill={DEFAULT_PALETTE.ink} listening={false} />
      {mascot ? <KonvaImage image={mascot} x={CPF_STAGE_WIDTH - 90} y={10} width={80} height={80} listening={false} /> : null}
    </Group>
  )
}
