/**
 * Composable Primitives Framework (CPF) Type Definitions.
 * Formulates the declarative graph for Out-of-Distribution (OOD) game mechanics.
 */

// Visual Primitives
export type CpfShapeKind = 'circle' | 'rect' | 'line' | 'balloon' | 'bow' | 'arrow' | 'star'

export interface CpfVisualSprite {
  type: 'SPRITE'
  shapeKind: CpfShapeKind
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
  highlightFill?: string
}

export interface CpfVisualText {
  type: 'TEXT'
  text: string
  fontSize: number
  fontFamily?: string
  fontStyle?: string
  fill: string
  stroke?: string
  strokeWidth?: number
  align?: 'left' | 'center' | 'right'
}

export interface CpfVisualLine {
  type: 'LINE'
  points: number[]
  stroke: string
  strokeWidth: number
  tension?: number
  lineCap?: 'round' | 'butt'
}

export type CpfVisualPrimitive = CpfVisualSprite | CpfVisualText | CpfVisualLine

// Motion Primitives
export interface CpfMotionPatrol {
  type: 'PATROL'
  axis: 'x' | 'y'
  min: number
  max: number
  speed: number
  pattern: 'pingpong' | 'sine' | 'loop'
}

export interface CpfMotionFloat {
  type: 'FLOAT'
  amplitude: number
  frequency: number
  phase?: number
}

export interface CpfMotionProjectile {
  type: 'PROJECTILE'
  vx: number
  vy: number
  gravity: number
}

export type CpfMotionPrimitive = CpfMotionPatrol | CpfMotionFloat | CpfMotionProjectile

// Interaction Primitives
export interface CpfInteractionTap {
  type: 'TAP'
  actionId: string
}

export interface CpfInteractionDrag {
  type: 'DRAG'
  bounds?: { minX: number; maxX: number; minY: number; maxY: number }
}

export interface CpfInteractionSling {
  type: 'SLING'
  anchorX: number
  anchorY: number
  maxPullDistance: number
  tensionFactor: number
  releaseVelocityMultiplier: number
}

export type CpfInteractionPrimitive = CpfInteractionTap | CpfInteractionDrag | CpfInteractionSling

// Logic & Feedback Primitives
export interface CpfParticleEffect {
  type: 'PARTICLE'
  count: number
  colors: string[]
  spread: number
  lifetimeMs: number
}

export interface CpfShakeEffect {
  type: 'SHAKE'
  intensity: number
  durationMs: number
}

export interface CpfCheckAnswerLogic {
  type: 'CHECK_ANSWER'
  rule: 'is_even' | 'is_odd' | 'equals'
  expectedValue?: unknown
}

// Scene Graph Node
export type SceneNodeRole = 'bow' | 'arrow' | 'target' | 'background' | 'ui' | 'particle' | 'bowstring'

export interface CpfCollider {
  type: 'circle' | 'aabb'
  radius?: number
  width?: number
  height?: number
  tag: string
}

export interface CpfSceneNode {
  id: string
  role: SceneNodeRole
  x: number
  y: number
  rotation?: number
  scale?: number
  visible?: boolean
  visual: CpfVisualPrimitive
  motion?: CpfMotionPrimitive
  interaction?: CpfInteractionPrimitive
  collider?: CpfCollider
  metadata?: Record<string, unknown>
}

// Action Trigger & Listener
export type CpfTriggerEvent = 'ON_TAP' | 'ON_SLING_RELEASE' | 'ON_COLLIDE' | 'ON_SCORE'

export interface CpfActionRule {
  id: string
  trigger: CpfTriggerEvent
  sourceTag?: string
  targetTag?: string
  logicCheck?: CpfCheckAnswerLogic
  onSuccess: {
    scoreDelta: number
    particles?: CpfParticleEffect
    sound: 'SFX_CORRECT' | 'SFX_POP'
    lockInputMs?: number
  }
  onFailure: {
    scoreDelta: number
    shake?: CpfShakeEffect
    sound: 'SFX_WRONG'
    lockInputMs?: number
  }
}

// Full Scene Graph Definition
export interface CpfSceneGraph {
  schemaVersion: 'cpf.v1.0.0'
  title: string
  pedagogicalSubject: 'Math' | 'Vietnamese' | 'Science'
  gradeLevel: 1 | 2 | 3 | 4 | 5
  description: string
  stage: {
    width: number
    height: number
    backgroundColor: string
  }
  nodes: CpfSceneNode[]
  rules: CpfActionRule[]
  dynamicVariables: {
    pulledForce: number
    arrowVector: { x: number; y: number }
    score: number
    combo: number
    inputLocked: boolean
  }
}
