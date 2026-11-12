import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { viText } from '../../../constants/viText'
import { resolveUiProfile } from '../../../player/profile/resolveUiProfile'
import { UiProfileProvider } from '../../../player/profile/UiProfileContext'
import { getPlayableRenderer } from '../../../player/renderers'
import { playerRootVars } from '../../../player/theme/playerRootVars'
import type { GameType, QuestionDsl, Subject } from '../../../types/game-dsl.types'
import GameTypeCover from '../../ui/GameTypeCover'
import PreviewBoundary from './PreviewBoundary'
import PreviewStage from './PreviewStage'
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
  subject: Subject
  /** Câu đang chọn còn lỗi kiểm tra: không dựng renderer vì dữ liệu dở có thể làm nó vỡ. */
  hasIssues: boolean
}

const text = viText.editor.preview

const DEVICE_LABEL: Record<PreviewDevice, string> = { tv: text.tv, tablet: text.tablet, phone: text.phone }

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
  // shortcut: chưa áp `fontSize` (fontScale) của profile vì rem tính theo gốc trang, nên chữ DOM của khung Bé nhỏ hơn trang chơi thật ~25%; Konva không ảnh hưởng.
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
export default function LivePreview({ gameType, question, title, index, total, gradeLevel, subject, hasIssues }: LivePreviewProps) {
  const [device, setDevice] = useState<PreviewDevice>(DEFAULT_PREVIEW_DEVICE)
  const profile = resolveUiProfile({ gradeLevel })
  const Renderer = getPlayableRenderer(gameType)
  const size = previewDeviceSize(gameType, device)

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

    return (
      <DeviceFrame width={size.width} height={size.height} vars={playerRootVars(profile).vars}>
        {/* Dựng lại khi câu đổi hoặc được sửa: sửa form là xem trước cập nhật (một câu nên JSON.stringify đủ rẻ). */}
        <PreviewBoundary key={`${question.id}:${JSON.stringify(question)}`}>
          <UiProfileProvider profile={profile}>
            <PreviewStage gameType={gameType} Renderer={Renderer} question={question} subject={subject} title={title} index={index} total={total} />
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
