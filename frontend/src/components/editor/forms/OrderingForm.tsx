import { useRef } from 'react'
import { viText } from '../../../constants/viText'
import type { OrderingQuestion } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'
import Button from '../../Button'
import Icon from '../../ui/Icon'
import CheckedTextField from './CheckedTextField'
import CommonFieldsForm from './CommonFieldsForm'
import type { QuestionFormProps } from './formTypes'
import { cleanMessage, fieldMessage } from './issueText'
import {
  addStep,
  canAddStep,
  canRemoveStep,
  firstUnusedStepNumber,
  moveStep,
  removeStepById,
  setStepText,
} from './orderingEditing'

const LIMITS = TYPE_LIMITS.ORDERING

const focusLater = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

export default function OrderingForm({ gameType, question: raw, issues, onUpdate }: QuestionFormProps) {
  const text = viText.editor.form
  const question = raw as OrderingQuestion
  const nextNumber = useRef(firstUnusedStepNumber(question.steps))

  const canAdd = canAddStep(question)
  const canRemove = canRemoveStep(question)

  const listMessages = issues.filter((issue) => issue.field === 'steps').map((issue) => cleanMessage(issue.message))
  const countHint = text.stepsHint.replace('{min}', String(LIMITS.steps.min)).replace('{max}', String(LIMITS.steps.max))

  const describedBy = ['ordering-steps-hint', listMessages.length > 0 ? 'ordering-steps-errors' : ''].filter(Boolean).join(' ')

  const handleAdd = () => {
    if (!canAdd) return

    const stepId = `s${nextNumber.current++}`
    onUpdate((current) => addStep(current as OrderingQuestion, stepId))
    focusLater(`step-${stepId}-text`)
  }

  const handleRemove = (stepId: string) => {
    if (!canRemove) return

    const index = question.steps.findIndex((s) => s.id === stepId)
    const neighbour = question.steps[index + 1] ?? question.steps[index - 1]

    onUpdate((current) => removeStepById(current as OrderingQuestion, stepId))
    if (neighbour) focusLater(`step-${neighbour.id}-text`)
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    onUpdate((current) => moveStep(current as OrderingQuestion, index, index - 1))
    const currentStep = question.steps[index]
    if (currentStep) focusLater(`step-${currentStep.id}-text`)
  }

  const handleMoveDown = (index: number) => {
    if (index >= question.steps.length - 1) return
    onUpdate((current) => moveStep(current as OrderingQuestion, index, index + 1))
    const currentStep = question.steps[index]
    if (currentStep) focusLater(`step-${currentStep.id}-text`)
  }

  return (
    <div className="space-y-5">
      <fieldset className="space-y-3" aria-describedby={describedBy}>
        <legend className="text-base font-semibold text-ink">{text.stepsLegend}</legend>
        <p id="ordering-steps-hint" className="text-sm text-ink-soft">
          {countHint}
        </p>

        <ol className="space-y-3">
          {question.steps.map((step, index) => {
            const stepError =
              fieldMessage(issues, `steps[${index}].text`) ??
              fieldMessage(issues, `steps[${index}]`)

            return (
              <li key={step.id}>
                <fieldset className="rounded-xl border-2 border-ink/10 p-3 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-base text-ink">
                      {text.stepLabel} {index + 1}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0 px-2 min-h-10"
                        disabled={index === 0}
                        aria-label={`${text.moveUp} ${index + 1}`}
                        onClick={() => handleMoveUp(index)}
                      >
                        <Icon name="arrowUp" className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0 px-2 min-h-10"
                        disabled={index === question.steps.length - 1}
                        aria-label={`${text.moveDown} ${index + 1}`}
                        onClick={() => handleMoveDown(index)}
                      >
                        <Icon name="arrowDown" className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0 px-2 min-h-10"
                        disabled={!canRemove}
                        aria-label={`${text.removeStep} ${index + 1}`}
                        onClick={() => handleRemove(step.id)}
                      >
                        <Icon name="close" className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <CheckedTextField
                    id={`step-${step.id}-text`}
                    label={text.stepTextLabel}
                    value={step.text ?? ''}
                    limits={LIMITS.stepText}
                    error={stepError}
                    onCommit={(value) => onUpdate((current) => setStepText(current as OrderingQuestion, step.id, value))}
                  />
                </fieldset>
              </li>
            )
          })}
        </ol>

        {listMessages.length > 0 && (
          <ul id="ordering-steps-errors" className="space-y-1 text-sm font-semibold text-rose-800">
            {listMessages.map((msg, i) => (
              <li key={i} className="flex items-start gap-2">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={!canAdd} onClick={handleAdd}>
            <Icon name="plus" className="mr-1.5 h-4 w-4" />
            {text.addStep}
          </Button>
          {!canAdd && (
            <span className="text-sm text-ink-soft">
              {text.maxStepsReached.replace('{max}', String(LIMITS.steps.max))}
            </span>
          )}
          {!canRemove && (
            <span className="text-sm text-ink-soft">
              {text.minStepsReached.replace('{min}', String(LIMITS.steps.min))}
            </span>
          )}
        </div>
      </fieldset>

      <CommonFieldsForm
        gameType={gameType}
        question={question}
        issues={issues}
        onUpdate={onUpdate}
        idPrefix="ordering"
      />
    </div>
  )
}
