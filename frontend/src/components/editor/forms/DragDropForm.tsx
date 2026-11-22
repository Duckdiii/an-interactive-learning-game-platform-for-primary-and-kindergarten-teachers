import { useRef } from 'react'
import { viText } from '../../../constants/viText'
import type { DragDropQuestion } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'
import Button from '../../Button'
import Icon from '../../ui/Icon'
import CheckedTextField from './CheckedTextField'
import CommonFieldsForm from './CommonFieldsForm'
import type { QuestionFormProps } from './formTypes'
import { cleanMessage, fieldMessage } from './issueText'
import {
  addItem,
  addZone,
  canAddItem,
  canAddZone,
  canRemoveItem,
  canRemoveZone,
  firstUnusedItemNumber,
  firstUnusedZoneNumber,
  removeItemById,
  removeZoneById,
  setItemTargetZone,
  setItemText,
  setZoneLabel,
} from './dragDropEditing'

const LIMITS = TYPE_LIMITS.DRAG_DROP

const focusLater = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

export default function DragDropForm({ gameType, question: raw, issues, onUpdate }: QuestionFormProps) {
  const text = viText.editor.form
  const question = raw as DragDropQuestion

  const nextZoneNum = useRef(firstUnusedZoneNumber(question.dropZones))
  const nextItemNum = useRef(firstUnusedItemNumber(question.items))

  const canAddZ = canAddZone(question)
  const canRemoveZ = canRemoveZone(question)
  const canAddI = canAddItem(question)
  const canRemoveI = canRemoveItem(question)

  const zoneMessages = issues.filter((issue) => issue.field === 'dropZones').map((issue) => cleanMessage(issue.message))
  const itemMessages = issues.filter((issue) => issue.field === 'items').map((issue) => cleanMessage(issue.message))

  const handleAddZone = () => {
    if (!canAddZ) return
    const zId = `z${nextZoneNum.current++}`
    onUpdate((current) => addZone(current as DragDropQuestion, zId))
    focusLater(`zone-${zId}-label`)
  }

  const handleRemoveZone = (zId: string) => {
    if (!canRemoveZ) return
    onUpdate((current) => removeZoneById(current as DragDropQuestion, zId))
  }

  const handleAddItem = () => {
    if (!canAddI) return
    const iId = `i${nextItemNum.current++}`
    onUpdate((current) => addItem(current as DragDropQuestion, iId))
    focusLater(`item-${iId}-text`)
  }

  const handleRemoveItem = (iId: string) => {
    if (!canRemoveI) return
    onUpdate((current) => removeItemById(current as DragDropQuestion, iId))
  }

  return (
    <div className="space-y-6">
      {/* Phân vùng 1: Danh sách các giỏ / DropZones */}
      <fieldset className="space-y-3 rounded-2xl border-2 border-ink/10 p-4 bg-paper/30">
        <legend className="text-base font-bold text-ink">{text.dropZonesLegend}</legend>
        <p className="text-sm text-ink-soft">
          {text.dropZonesHint.replace('{min}', String(LIMITS.dropZones.min)).replace('{max}', String(LIMITS.dropZones.max))}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {question.dropZones.map((zone, index) => {
            const zoneError = fieldMessage(issues, `dropZones[${index}].label`)

            return (
              <div key={zone.id} className="relative rounded-xl border-2 border-ink/10 p-3 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-ink">
                    {text.zoneLabel} {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 px-2 min-h-10"
                    disabled={!canRemoveZ}
                    aria-label={`${text.removeZone} ${index + 1}`}
                    onClick={() => handleRemoveZone(zone.id)}
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </Button>
                </div>

                <CheckedTextField
                  id={`zone-${zone.id}-label`}
                  label={text.zoneNameLabel}
                  value={zone.label}
                  limits={LIMITS.zoneLabel}
                  error={zoneError}
                  onCommit={(value) => onUpdate((current) => setZoneLabel(current as DragDropQuestion, zone.id, value))}
                />
              </div>
            )
          })}
        </div>

        {zoneMessages.length > 0 && (
          <ul className="space-y-1 text-sm font-semibold text-rose-800">
            {zoneMessages.map((msg, i) => (
              <li key={i} className="flex items-start gap-2">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="button" variant="secondary" disabled={!canAddZ} onClick={handleAddZone}>
            <Icon name="plus" className="mr-1.5 h-4 w-4" />
            {text.addZone}
          </Button>
          {!canAddZ && (
            <span className="text-sm text-ink-soft">
              {text.maxZonesReached.replace('{max}', String(LIMITS.dropZones.max))}
            </span>
          )}
          {!canRemoveZ && (
            <span className="text-sm text-ink-soft">
              {text.minZonesReached.replace('{min}', String(LIMITS.dropZones.min))}
            </span>
          )}
        </div>
      </fieldset>

      {/* Phân vùng 2: Danh sách các mục kéo thả / Items */}
      <fieldset className="space-y-3 rounded-2xl border-2 border-ink/10 p-4 bg-paper/30">
        <legend className="text-base font-bold text-ink">{text.dragItemsLegend}</legend>
        <p className="text-sm text-ink-soft">
          {text.dragItemsHint.replace('{min}', String(LIMITS.items.min)).replace('{max}', String(LIMITS.items.max))}
        </p>

        <ol className="space-y-3">
          {question.items.map((item, index) => {
            const itemError =
              fieldMessage(issues, `items[${index}].text`) ??
              fieldMessage(issues, `items[${index}].targetZoneId`) ??
              fieldMessage(issues, `items[${index}]`)

            return (
              <li key={item.id} className="rounded-xl border-2 border-ink/10 p-3 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="font-bold text-sm text-ink">
                    {text.dragItemLabel} {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 px-2 min-h-10"
                    disabled={!canRemoveI}
                    aria-label={`${text.removeDragItem} ${index + 1}`}
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <CheckedTextField
                      id={`item-${item.id}-text`}
                      label={text.dragItemTextLabel}
                      value={item.text ?? ''}
                      limits={LIMITS.itemText}
                      error={itemError}
                      onCommit={(value) => onUpdate((current) => setItemText(current as DragDropQuestion, item.id, value))}
                    />
                  </div>

                  <div>
                    <label htmlFor={`item-${item.id}-zone`} className="block text-sm font-bold text-ink mb-1">
                      {text.targetZoneLabel}
                    </label>
                    <select
                      id={`item-${item.id}-zone`}
                      className="w-full rounded-xl border-2 border-ink/20 bg-white px-3 py-2 text-base text-ink focus:border-sun focus:outline-none"
                      value={item.targetZoneId}
                      onChange={(e) => onUpdate((current) => setItemTargetZone(current as DragDropQuestion, item.id, e.target.value))}
                    >
                      {question.dropZones.map((zone, zIdx) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.label.trim() ? zone.label : `${text.zoneLabel} ${zIdx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        {itemMessages.length > 0 && (
          <ul className="space-y-1 text-sm font-semibold text-rose-800">
            {itemMessages.map((msg, i) => (
              <li key={i} className="flex items-start gap-2">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="button" variant="secondary" disabled={!canAddI} onClick={handleAddItem}>
            <Icon name="plus" className="mr-1.5 h-4 w-4" />
            {text.addDragItem}
          </Button>
          {!canAddI && (
            <span className="text-sm text-ink-soft">
              {text.maxDragItemsReached.replace('{max}', String(LIMITS.items.max))}
            </span>
          )}
          {!canRemoveI && (
            <span className="text-sm text-ink-soft">
              {text.minDragItemsReached.replace('{min}', String(LIMITS.items.min))}
            </span>
          )}
        </div>
      </fieldset>

      <CommonFieldsForm
        gameType={gameType}
        question={question}
        issues={issues}
        onUpdate={onUpdate}
        idPrefix="dragdrop"
      />
    </div>
  )
}
