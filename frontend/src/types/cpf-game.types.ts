// CPF Game v2.0.0 (game ngoài danh mục). Đặc tả: docs/cpf-game-v2.0.0.md;
// JSON Schema: backend/src/main/resources/schema/cpf/2.0.0/cpf-game.schema.json. Sửa thì sửa đồng bộ.

import type { GameMetadata } from './game-dsl.types'

export const CPF_GAME_SCHEMA_VERSION = '2.0.0' as const

/** Dạng `nhóm.tên`, ví dụ `fruit.apple`; phải có trong manifest asset. Nền là `bg.*`, mascot là `mascot.*`, nhạc là `music.*`. */
export type CpfAssetId = string
/** `id` của một vật trong `entities` (dùng trong sự kiện `on`). */
export type CpfEntityRef = string
/** `id` của một vật, hoặc `$subject` (vật lựa chọn gây ra sự kiện); chỉ dùng trong hành động `do`. */
export type CpfSubjectRef = string

export type CpfTask = 'PICK_ONE' | 'PICK_ALL' | 'SORT'

export interface CpfChoice {
  id: string
  label: string
  assetId?: CpfAssetId
}

export interface CpfZone {
  id: string
  label: string
}

export interface CpfRound {
  id: string
  task: CpfTask
  prompt: string
  choices: CpfChoice[]
  /** Chỉ có (và bắt buộc) khi `task` là `SORT`. */
  zones?: CpfZone[]
}

export type CpfRoundAnswer =
  | { roundId: string; correctChoiceIds: string[] }
  | { roundId: string; placements: { choiceId: string; zoneId: string }[] }

export type CpfRegion = 'TOP' | 'MIDDLE' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'CENTER'
export type CpfArrangement = 'SINGLE' | 'ROW' | 'GRID' | 'SCATTER'
export type CpfSpeed = 'SLOW' | 'MEDIUM' | 'FAST'

export interface CpfEntity {
  id: string
  assetId: CpfAssetId
  bindTo?: 'choices' | 'zones'
  placement: { region: CpfRegion; arrangement: CpfArrangement }
  motion?: {
    type: 'STATIC' | 'FALL' | 'FLOAT_UP' | 'PATROL_X' | 'BOB' | 'SWAY_UP' | 'ORBIT' | 'CROSS'
    speed?: CpfSpeed
    spawn?: 'ALL_AT_ONCE' | 'STREAM'
  }
  /** TAP_MOVE: trẻ chạm vào đâu, vật này (một nhân vật, không bindTo) chạy tới đó. */
  control?: 'DRAG_X' | 'DRAG_FREE' | 'AIM_SHOOT' | 'TAP_MOVE'
  role?: 'PROGRESS'
}

export type CpfTrigger =
  | { type: 'TAP'; target: CpfEntityRef }
  | { type: 'COLLIDE'; a: CpfEntityRef; b: CpfEntityRef }
  | { type: 'DROP'; item: CpfEntityRef; zone: CpfEntityRef }
  | { type: 'ROUND_START' }

export type CpfSimpleAction =
  | { type: 'MOVE_TO'; subject: CpfSubjectRef; to: CpfEntityRef }
  | { type: 'ADVANCE' | 'REMOVE'; subject: CpfSubjectRef }
  | { type: 'EFFECT'; name: 'STARS' | 'CONFETTI' | 'POP' | 'GLOW' | 'WIGGLE'; at: CpfSubjectRef }
  | { type: 'SOUND'; name: 'CORRECT' | 'GENTLE_WRONG' | 'POP' | 'WHOOSH' }
  | { type: 'SCORE'; add: number }

export type CpfAction =
  | { type: 'CHECK'; onCorrect: CpfSimpleAction[]; onWrong: CpfSimpleAction[] }
  | CpfSimpleAction

export interface CpfRule {
  on: CpfTrigger
  do: CpfAction[]
}

/** Dạng hoàn chỉnh (giáo viên xem thử). Học sinh (`play`) nhận bản không có `answerKey`. */
export interface CpfGame {
  schemaVersion: typeof CPF_GAME_SCHEMA_VERSION
  kind: 'CPF'
  metadata: GameMetadata
  world: { backgroundId: string; mascotId?: string; musicId?: string }
  content: { instruction: string; rounds: CpfRound[] }
  answerKey: { rounds: CpfRoundAnswer[] }
  entities: CpfEntity[]
  rules: CpfRule[]
}

export type CpfStudentGame = Omit<CpfGame, 'answerKey'>
