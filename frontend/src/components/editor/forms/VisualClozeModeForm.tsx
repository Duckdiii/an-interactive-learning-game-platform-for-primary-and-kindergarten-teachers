import type { QuestionFormProps } from './formTypes'
import VisualClozeForm from './VisualClozeForm'
import VisualClozeImageForm from './VisualClozeImageForm'

export default function VisualClozeModeForm(props: QuestionFormProps) {
  return 'sceneImageUrl' in props.question
    ? <VisualClozeImageForm {...props} />
    : <VisualClozeForm {...props} />
}
