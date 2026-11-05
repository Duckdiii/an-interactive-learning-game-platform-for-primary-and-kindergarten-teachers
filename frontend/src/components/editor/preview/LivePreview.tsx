import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { viText } from '../../../constants/viText'
import { resolveUiProfile } from '../../../player/profile/resolveUiProfile'
import { UiProfileProvider } from '../../../player/profile/UiProfileContext'
import { getPlayableRenderer } from '../../../player/renderers'
import { playerRootVars } from '../../../player/theme/playerRootVars'
import { resolveTheme } from '../../../player/theme/resolveTheme'
import { ThemeProvider } from '../../../player/theme/ThemeContext'
import { deduceThemeFromText } from '../../../utils/assetResolver'
import type { GameType, QuestionDsl, QuizQuestion } from '../../../types/game-dsl.types'
import GameTypeCover from '../../ui/GameTypeCover'
import PreviewBoundary from './PreviewBoundary'
import PreviewStage from './PreviewStage'
import ThemedQuizCanvas from './ThemedQuizCanvas'
import { DEFAULT_PREVIEW_DEVICE, PREVIEW_DEVICES, previewDeviceSize } from './previewModel'
import type { PreviewDevice } from './previewModel'

interface LivePreviewProps {
  gameType: GameType
  /** Câu đang chọn trong bản nháp; vắng là chưa có câu nào. */
  question: QuestionDsl | undefined
  title: string
  index: number
  total: number
  gradeLevel: string
  subject: string
  topic?: string
  /** Câu đang chọn còn lỗi kiểm tra: không dựng renderer vì dữ liệu dở có thể làm nó vỡ. */
  hasIssues: boolean
  /** Theme thế giới game (Stage 2.5). */
  themeId?: string
  /** Thay đổi theme nhanh ngay trên live preview. */
  onThemeChange?: (themeId: string) => void
}

const text = viText.editor.preview

const DEVICE_LABEL: Record<PreviewDevice, string> = { tv: text.tv, tablet: text.tablet, phone: text.phone }

const PREVIEW_THEME_ITEMS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'farm', label: '🌾 Nông Trại' },
  { id: 'ocean', label: '🌊 Đại Dương' },
  { id: 'jungle', label: '🌴 Rừng Xanh' },
  { id: 'space', label: '🚀 Vũ Trụ' },
]

// Đo chiều rộng khung chứa để co thiết bị (kích thước thiết kế) vừa cột. Chưa đo được (jsdom, chưa vẽ) thì giữ tỉ lệ 1.
function useScale(designWidth: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  // useLayoutEffect: đo trước lần vẽ đầu để khung không chớp ở kích thước thật rồi mới co lại.
  useLayoutEffect(() => {
    const node = ref.current

    if (!node) return

    const update = () => setWidth(node.clientWidth)

    update()
    const observer = new ResizeObserver(update)

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return { ref, scale: width > 0 ? Math.min(1, width / designWidth) : 1 }
}

interface DeviceFrameProps {
  width: number
  height: number
  vars: Record<string, string>
  children: React.ReactNode
}

function DeviceFrame({ width, height, vars, children }: DeviceFrameProps) {
  const { ref, scale } = useScale(width)
  // Biến --play-* gắn lên chính khung này (không lên documentElement như usePlayerRootStyle) nên không đổi màu trang giáo viên.
  // Konva tự chia toạ độ chạm theo tỉ lệ getBoundingClientRect/offsetWidth nên vẫn đúng dưới CSS scale (đã thử trên trình duyệt).
  const style = { ...vars, width, height, transform: `scale(${scale})`, transformOrigin: 'top left' } as CSSProperties

  return (
    <div className="overflow-hidden rounded-2xl border-4 border-ink bg-ink">
      <div ref={ref} className="relative w-full overflow-hidden" style={{ height: height * scale }}>
        <div
          role="group"
          aria-roledescription={text.frameRole}
          aria-label={text.frameLabel}
          data-testid="preview-frame"
          data-game-hotkeys-off=""
          className="absolute left-0 top-0"
          style={style}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// Cột "Bé sẽ thấy": chạy CHÍNH khung (shell) và renderer của phần chơi, thu nhỏ theo thiết bị giáo viên chọn. Chấm cục bộ, không gọi API.
export default function LivePreview({
  gameType,
  question,
  title,
  index,
  total,
  gradeLevel,
  subject,
  topic,
  hasIssues,
  themeId,
  onThemeChange,
}: LivePreviewProps) {
  const deduced = deduceThemeFromText(`${title} ${topic ?? ''}`)
  const [device, setDevice] = useState<PreviewDevice>(DEFAULT_PREVIEW_DEVICE)
  const [localThemeId, setLocalThemeId] = useState<string>(() => themeId || deduced.theme || 'farm')
  const profile = resolveUiProfile({ gradeLevel })
  const Renderer = getPlayableRenderer(gameType)
  const size = previewDeviceSize(gameType, device)

  const activeThemeId = themeId || localThemeId
  const resolvedTheme = resolveTheme({ themeId: activeThemeId, subject, gameType, topic })

  const isQuiz = gameType === 'QUIZ'
  const hasQuizTheme = isQuiz && (Boolean(themeId) || Boolean((question as QuizQuestion)?.imageUrl) || Boolean((question as QuizQuestion)?.visualPrompt))
  const [canvasModeOverride, setCanvasModeOverride] = useState<boolean | null>(null)
  const canvasMode = canvasModeOverride ?? hasQuizTheme

  const handleSelectTheme = (nextId: string) => {
    setLocalThemeId(nextId)
    onThemeChange?.(nextId)
  }

  const body = () => {
    if (!question) return <p className="text-base text-ink-soft">{viText.editor.emptyQuestions}</p>

    if (!Renderer) {
      return (
        <>
          <div className="max-w-sm overflow-hidden rounded-xl">
            <GameTypeCover gameType={gameType} subject={subject} />
          </div>
          <p className="rounded-xl bg-sun-soft px-4 py-3 text-base">{text.comingSoon}</p>
        </>
      )
    }

    if (hasIssues) return <p className="rounded-xl bg-sun-soft px-4 py-3 text-base">{text.fixFirst}</p>

    // Stage 2.5: Themed Quiz Canvas cho câu hỏi QUIZ khi có gắn Theme hoặc hình ảnh Asset Bank
    if (isQuiz && canvasMode) {
      return (
        <DeviceFrame width={size.width} height={size.height} vars={playerRootVars(profile).vars}>
          <PreviewBoundary key={`${question.id}:${JSON.stringify(question)}:${activeThemeId}:themed-canvas`}>
            <ThemedQuizCanvas
              question={question as QuizQuestion}
              themeKey={activeThemeId}
              title={title}
              gradeLevel={gradeLevel}
              subject={subject}
              width={size.width}
              height={size.height}
            />
          </PreviewBoundary>
        </DeviceFrame>
      )
    }

    return (
      <DeviceFrame width={size.width} height={size.height} vars={playerRootVars(profile).vars}>
        {/* Dựng lại khi câu đổi, được sửa hoặc chuyển Theme: xem trước cập nhật tức thì. */}
        <PreviewBoundary key={`${question.id}:${JSON.stringify(question)}:${activeThemeId}`}>
          <UiProfileProvider profile={profile}>
            <ThemeProvider theme={resolvedTheme}>
              <PreviewStage gameType={gameType} Renderer={Renderer} question={question} title={title} index={index} total={total} />
            </ThemeProvider>
          </UiProfileProvider>
        </PreviewBoundary>
      </DeviceFrame>
    )
  }

  return (
    <div className="space-y-4 rounded-card bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-extrabold">{viText.editor.seeTab}</h2>
        {question && Renderer ? (
          <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand-strong">
            {profile.band === 'be' ? text.bandBe : text.bandHocSinh}
          </span>
        ) : null}
      </div>

      {/* Stage 2.5: 1-Click Game World Theme Switcher & Canvas Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-ink-soft shrink-0">🎨 Thế giới:</span>
          <div role="group" aria-label="Chuyển đổi thế giới game" className="flex flex-wrap gap-1">
            {PREVIEW_THEME_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === activeThemeId}
                onClick={() => handleSelectTheme(item.id)}
                className={[
                  'rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer',
                  item.id === activeThemeId
                    ? 'bg-brand text-white shadow-xs ring-1 ring-brand'
                    : 'border border-ink/15 bg-white text-ink hover:border-brand/40',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isQuiz ? (
          <div className="flex items-center gap-1 rounded-xl bg-ink/5 p-1">
            <button
              type="button"
              onClick={() => setCanvasModeOverride(true)}
              aria-pressed={canvasMode}
              className={[
                'rounded-lg px-2 py-0.5 text-xs font-bold transition cursor-pointer',
                canvasMode
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              🎨 Đồ họa Canvas
            </button>
            <button
              type="button"
              onClick={() => setCanvasModeOverride(false)}
              aria-pressed={!canvasMode}
              className={[
                'rounded-lg px-2 py-0.5 text-xs font-bold transition cursor-pointer',
                !canvasMode
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              📄 Tiêu chuẩn
            </button>
          </div>
        ) : null}
      </div>

      {question && Renderer ? (
        <div role="group" aria-label={text.devicesLabel} className="flex flex-wrap gap-2">
          {PREVIEW_DEVICES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={item === device}
              onClick={() => setDevice(item)}
              className={[
                'min-h-11 rounded-xl border-2 px-3 text-base font-bold',
                item === device ? 'border-brand bg-brand-soft text-brand-strong' : 'border-ink/20 bg-surface text-ink',
              ].join(' ')}
            >
              {DEVICE_LABEL[item]}
            </button>
          ))}
        </div>
      ) : null}
      {body()}
    </div>
  )
}
