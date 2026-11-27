import { useRef } from 'react'
import { viText } from '../../../constants/viText'
import type { SpotTheTargetQuestion } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'
import Button from '../../Button'
import Icon from '../../ui/Icon'
import CheckedTextField from './CheckedTextField'
import CommonFieldsForm from './CommonFieldsForm'
import type { QuestionFormProps } from './formTypes'
import { fieldMessage } from './issueText'
import {
  clearHitRegion,
  setHitRegion,
  setTargetDescription,
} from './spotTheTargetEditing'

const LIMITS = TYPE_LIMITS.SPOT_THE_TARGET

export default function SpotTheTargetForm({ gameType, question: raw, issues, onUpdate }: QuestionFormProps) {
  const text = viText.editor.form
  const question = raw as SpotTheTargetQuestion
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const descError = fieldMessage(issues, 'targetDescription')
  const hitError = fieldMessage(issues, 'hitRegion')

  const imageUrl = question.imageUrl ?? (question.visualPrompt?.startsWith('http') || question.visualPrompt?.startsWith('/') ? question.visualPrompt : undefined)

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const clickX = (e.clientX - rect.left) / rect.width
    const clickY = (e.clientY - rect.top) / rect.height
    const currentRadius = question.hitRegion?.radius ?? 0.1

    onUpdate((current) => setHitRegion(current as SpotTheTargetQuestion, clickX, clickY, currentRadius))
  }

  const handleRadiusChange = (newRadius: number) => {
    if (!question.hitRegion) return
    onUpdate((current) =>
      setHitRegion(current as SpotTheTargetQuestion, question.hitRegion!.x, question.hitRegion!.y, newRadius)
    )
  }

  const handleClear = () => {
    onUpdate((current) => clearHitRegion(current as SpotTheTargetQuestion))
  }

  const hit = question.hitRegion

  return (
    <div className="space-y-6">
      {/* 1. Mô tả mục tiêu cần tìm */}
      <CheckedTextField
        id="spot-target-desc"
        label={text.targetDescLabel}
        hint={text.targetDescHint}
        value={question.targetDescription ?? ''}
        limits={LIMITS.targetDescription}
        error={descError}
        onCommit={(value) => onUpdate((current) => setTargetDescription(current as SpotTheTargetQuestion, value))}
      />

      {/* 2. Interactive Hit Region Picker */}
      <fieldset className="space-y-3 rounded-2xl border-2 border-ink/10 p-4 bg-paper/30">
        <legend className="text-base font-bold text-ink">{text.hitRegionLegend}</legend>
        <p className="text-sm text-ink-soft">{text.hitRegionHint}</p>

        {/* Khung ảnh tương tác */}
        <div
          ref={imageContainerRef}
          data-testid="spot-target-canvas-box"
          tabIndex={0}
          role="region"
          aria-label={text.hitRegionLegend}
          onClick={handleImageClick}
          className="relative w-full aspect-video max-h-96 rounded-xl border-2 border-dashed border-ink/20 bg-paper overflow-hidden flex items-center justify-center cursor-crosshair select-none focus:outline-none focus:border-sun"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={question.targetDescription || 'Ảnh câu hỏi'}
              className="w-full h-full object-contain pointer-events-none"
            />
          ) : (
            <div className="p-4 text-center text-ink-soft">
              <Icon name="file" className="mx-auto h-8 w-8 mb-2 opacity-60" />
              <p className="text-sm">Chưa có ảnh nền. Hãy nhập mô tả hoặc tải ảnh ở phần thông tin chung bên dưới.</p>
            </div>
          )}

          {/* Vòng tròn mục tiêu trực quan */}
          {hit && (
            <div
              data-testid="spot-target-hit-circle"
              className="absolute rounded-full border-2 border-dashed border-sun bg-sun-soft/30 pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${hit.x * 100}%`,
                top: `${hit.y * 100}%`,
                width: `${hit.radius * 200}%`,
                height: `${hit.radius * 200}%`,
              }}
            >
              <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-sun" />
            </div>
          )}
        </div>

        {/* Thông tin tọa độ và điều khiển bán kính */}
        <div className="space-y-3 pt-2">
          {hit ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">
                  {text.hitRegionSelected
                    .replace('{x}', String(Math.round(hit.x * 100)))
                    .replace('{y}', String(Math.round(hit.y * 100)))
                    .replace('{radius}', String(Math.round(hit.radius * 100)))}
                </span>

                <Button type="button" variant="secondary" className="px-3 min-h-10" onClick={handleClear}>
                  <Icon name="close" className="mr-1 h-3.5 w-3.5" />
                  {text.clearHitRegion}
                </Button>
              </div>

              <div>
                <label htmlFor="spot-target-radius" className="block text-sm font-bold text-ink mb-1">
                  {text.radiusLabel} ({Math.round(hit.radius * 100)}%)
                </label>
                <input
                  id="spot-target-radius"
                  type="range"
                  min="0.02"
                  max="0.40"
                  step="0.01"
                  value={hit.radius}
                  onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-sun"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">{text.hitRegionNotSelected}</p>
          )}

          {hitError && (
            <p className="flex items-start gap-2 text-sm font-semibold text-rose-800">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{hitError}</span>
            </p>
          )}
        </div>
      </fieldset>

      <CommonFieldsForm
        gameType={gameType}
        question={question}
        issues={issues}
        onUpdate={onUpdate}
        idPrefix="spot-target"
      />
    </div>
  )
}
