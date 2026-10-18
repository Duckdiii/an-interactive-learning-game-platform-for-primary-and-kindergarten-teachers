import type { ThemeManifest } from '../theme/themeTypes'
import { minContainerWidthFor, stageScale, type AgeProfile } from './ageProfiles'

/** Một vùng chạm, kích thước theo đơn vị thiết kế của sân. */
export interface TouchTarget {
  id: string
  width: number
  height: number
}

export interface TextItem {
  id: string
  text: string
  kind: 'card' | 'question'
}

/** Các sự kiện về một màn chơi cần kiểm; do người viết renderer/fixture cung cấp (xem `rendererFacts.ts`). */
export interface GameFacts {
  mechanic: string
  /** Rộng của sân theo đơn vị thiết kế (800 với `ResponsiveStage`). */
  stageWidth: number
  /** Rộng khung chứa thật (px) mà người chơi thấy; hệ số co = min(1, containerWidth / stageWidth). */
  containerWidth: number
  touchTargets: readonly TouchTarget[]
  texts: readonly TextItem[]
  optionCount: number
  /** Có hiện đồng hồ đếm ngược/áp lực thời gian không (không phải chỉ có `timeLimitSeconds` trong dữ liệu). */
  showsTimer: boolean
  showsLiveLeaderboard: boolean
}

export type ProfileIssueCode =
  | 'THEME_NOT_FOR_BAND'
  | 'THEME_MECHANIC_UNSUPPORTED'
  | 'TIMER_NOT_ALLOWED'
  | 'LEADERBOARD_NOT_ALLOWED'
  | 'TOUCH_TARGET_TOO_SMALL'
  | 'TEXT_TOO_LONG'
  | 'TOO_MANY_OPTIONS'
  | 'INVALID_FACTS'

export interface ProfileIssue {
  code: ProfileIssueCode
  /** Đối tượng lỗi: mã vùng chạm/chữ, hoặc tên trường. */
  target: string
  message: string
}

/**
 * Số ký tự người dùng thấy: chuẩn hóa NFC rồi đếm CỤM ký tự (grapheme) bằng `Intl.Segmenter`, nên chữ có dấu dạng tổ
 * hợp hay dựng sẵn, và emoji ghép (ZWJ, cờ), đều đếm là một. Trình duyệt chưa có `Intl.Segmenter` thì đếm điểm mã.
 */
export function visibleLength(text: string): number {
  const normalized = text.normalize('NFC')
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(normalized)].length
  }
  return [...normalized].length
}

export type ProfileSubject =
  | { kind: 'theme'; theme: ThemeManifest; mechanic?: string }
  | { kind: 'game'; facts: GameFacts }

/**
 * Kiểm một theme hoặc một màn chơi theo hồ sơ độ tuổi; trả danh sách lỗi (rỗng nếu đạt). Hàm thuần.
 * - Theme: nhóm tuổi của hồ sơ phải nằm trong `ageBands` của theme; nếu cho biết `mechanic` thì theme phải tương thích.
 * - Màn chơi: hẹn giờ/bảng xếp hạng sống, vùng chạm (px màn hình sau co giãn), số chữ, số lựa chọn.
 */
export function validateAgainstProfile(subject: ProfileSubject, profile: AgeProfile): ProfileIssue[] {
  return subject.kind === 'theme' ? checkTheme(subject.theme, subject.mechanic, profile) : checkGame(subject.facts, profile)
}

function checkTheme(theme: ThemeManifest, mechanic: string | undefined, profile: AgeProfile): ProfileIssue[] {
  const issues: ProfileIssue[] = []
  if (!theme.ageBands.includes(profile.band)) {
    issues.push({
      code: 'THEME_NOT_FOR_BAND',
      target: 'ageBands',
      message: `Theme "${theme.id}" không khai báo phù hợp nhóm ${profile.label}.`,
    })
  }
  if (mechanic !== undefined && !(theme.compatibleMechanics as readonly string[]).includes(mechanic)) {
    issues.push({
      code: 'THEME_MECHANIC_UNSUPPORTED',
      target: 'compatibleMechanics',
      message: `Theme "${theme.id}" chưa hỗ trợ cơ chế ${mechanic}.`,
    })
  }
  return issues
}

function checkGame(facts: GameFacts, profile: AgeProfile): ProfileIssue[] {
  const issues: ProfileIssue[] = []
  const add = (code: ProfileIssueCode, target: string, message: string) => issues.push({ code, target, message })

  if (!(facts.stageWidth > 0) || !(facts.containerWidth > 0)) {
    add('INVALID_FACTS', 'stageWidth', 'Chiều rộng sân và khung chứa phải lớn hơn 0.')
    return issues
  }

  if (facts.showsTimer && !profile.allowTimer) add('TIMER_NOT_ALLOWED', 'timer', `${profile.label}: không được hiện đồng hồ đếm ngược.`)
  if (facts.showsLiveLeaderboard && !profile.allowLiveLeaderboard) {
    add('LEADERBOARD_NOT_ALLOWED', 'leaderboard', `${profile.label}: không được hiện bảng xếp hạng sống.`)
  }

  const scale = stageScale(facts.containerWidth, facts.stageWidth)
  for (const target of facts.touchTargets) {
    if (!Number.isFinite(target.width) || !Number.isFinite(target.height)) {
      add('INVALID_FACTS', target.id, `Vùng chạm "${target.id}" có kích thước không hợp lệ (${target.width} × ${target.height}).`)
      continue
    }
    const shortSide = Math.min(target.width, target.height)
    const screenPx = shortSide * scale
    if (screenPx < profile.minTouchTargetPx) {
      const needed = minContainerWidthFor(shortSide, profile.minTouchTargetPx, facts.stageWidth)
      // Hệ số co tối đa là 1 (ResponsiveStage không phóng to): cần chiều rộng khung lớn hơn sân thì mở rộng khung cũng không giúp.
      const hint =
        Number.isFinite(needed) && needed <= facts.stageWidth
          ? `đạt khi sân rộng từ ${needed}px`
          : 'không đạt ở mọi chiều rộng khung vì sân không phóng to; cần tăng kích thước thiết kế của vùng chạm'
      add(
        'TOUCH_TARGET_TOO_SMALL',
        target.id,
        `"${target.id}" chỉ ${screenPx.toFixed(1)}px trên màn hình, cần ≥ ${profile.minTouchTargetPx}px (${hint}).`,
      )
    }
  }

  for (const item of facts.texts) {
    const limit = item.kind === 'card' ? profile.maxCharsPerCard : profile.maxQuestionChars
    const length = visibleLength(item.text)
    if (length > limit) add('TEXT_TOO_LONG', item.id, `"${item.id}" dài ${length} ký tự, tối đa ${limit} cho ${profile.label}.`)
  }

  if (!Number.isFinite(facts.optionCount)) {
    add('INVALID_FACTS', 'optionCount', `Số lựa chọn không hợp lệ (${facts.optionCount}).`)
  } else if (facts.optionCount > profile.maxOptions) {
    add('TOO_MANY_OPTIONS', 'options', `${facts.optionCount} lựa chọn, tối đa ${profile.maxOptions} cho ${profile.label}.`)
  }
  return issues
}
