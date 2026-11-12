import type { VisualClozeImageQuestionDsl } from '../../../types/game-dsl.types'
import type { QuestionDsl } from '../../../types/game-dsl.types'
import FormField from '../../ui/FormField'
import { inputClass, textareaClass } from '../../ui/formStyles'
import type { QuestionFormProps } from './formTypes'

export default function VisualClozeImageForm({ question: raw, onUpdate }: QuestionFormProps) {
  const question = raw as unknown as VisualClozeImageQuestionDsl
  const update = (patch: Partial<VisualClozeImageQuestionDsl>) =>
    onUpdate((current) => ({ ...current, ...patch }) as QuestionDsl)

  return (
    <div className="space-y-5">
      <FormField id="cloze-image-question" label="Hướng dẫn cho học sinh">
        <textarea
          id="cloze-image-question"
          value={question.questionText ?? ''}
          onChange={(event) => update({ questionText: event.target.value })}
          className={textareaClass(false)}
          rows={2}
        />
      </FormField>
      <FormField id="cloze-image-scene" label="URL ảnh cảnh" hint={`${question.sceneWidth} × ${question.sceneHeight} px`}>
        <input
          id="cloze-image-scene"
          type="url"
          value={question.sceneImageUrl ?? ''}
          onChange={(event) => update({ sceneImageUrl: event.target.value })}
          className={inputClass(false)}
        />
      </FormField>

      <fieldset className="space-y-3">
        <legend className="font-bold">Ảnh lựa chọn</legend>
        {question.options.map((option, index) => (
          <div key={option.id} className="grid gap-3 rounded-xl border-2 border-ink/10 p-3">
            <FormField id={`cloze-image-option-url-${index}`} label={`URL ảnh ${index + 1}`}>
              <input
                id={`cloze-image-option-url-${index}`}
                type="url"
                value={option.imageUrl ?? ''}
                onChange={(event) => update({ options: question.options.map((item, at) => at === index ? { ...item, imageUrl: event.target.value } : item) })}
                className={inputClass(false)}
              />
            </FormField>
            <FormField id={`cloze-image-option-prompt-${index}`} label={`Mô tả ảnh ${index + 1}`}>
              <input
                id={`cloze-image-option-prompt-${index}`}
                value={option.visualPrompt ?? ''}
                onChange={(event) => update({ options: question.options.map((item, at) => at === index ? { ...item, visualPrompt: event.target.value } : item) })}
                className={inputClass(false)}
              />
            </FormField>
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-bold">Vị trí ô trống và đáp án</legend>
        <p className="text-sm text-ink-soft">Tọa độ tính theo pixel trên ảnh cảnh. Chọn ảnh đúng sẽ gắn ảnh đó với ô trống.</p>
        {question.blanks.map((blank, index) => (
          <div key={blank.id} className="grid gap-3 rounded-xl border-2 border-ink/10 p-3 sm:grid-cols-3">
            <FormField id={`cloze-image-blank-x-${index}`} label={`Ô ${index + 1}: X`}>
              <input
                id={`cloze-image-blank-x-${index}`}
                type="number"
                value={blank.x}
                onChange={(event) => update({ blanks: question.blanks.map((item, at) => at === index ? { ...item, x: Number(event.target.value) } : item) })}
                className={inputClass(false)}
              />
            </FormField>
            <FormField id={`cloze-image-blank-y-${index}`} label={`Ô ${index + 1}: Y`}>
              <input
                id={`cloze-image-blank-y-${index}`}
                type="number"
                value={blank.y}
                onChange={(event) => update({ blanks: question.blanks.map((item, at) => at === index ? { ...item, y: Number(event.target.value) } : item) })}
                className={inputClass(false)}
              />
            </FormField>
            <FormField id={`cloze-image-blank-answer-${index}`} label={`Ô ${index + 1}: ảnh đúng`}>
              <select
                id={`cloze-image-blank-answer-${index}`}
                value={blank.correctOptionId}
                onChange={(event) => update({ blanks: question.blanks.map((item, at) => at === index ? { ...item, correctOptionId: event.target.value } : item) })}
                className={inputClass(false)}
              >
                {question.options.map((option) => <option key={option.id} value={option.id}>{option.visualPrompt || option.id}</option>)}
              </select>
            </FormField>
          </div>
        ))}
      </fieldset>
    </div>
  )
}
