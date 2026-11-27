import type { OddOneOutQuestion } from '../../../types/game-dsl.types'
import OddOneOutForm from './OddOneOutForm'
import OddOneOutImageForm from './OddOneOutImageForm'
import type { QuestionFormProps } from './formTypes'

export default function OddOneOutModeForm(props: QuestionFormProps) {
  return typeof (props.question as OddOneOutQuestion).questionText === 'string'
    ? <OddOneOutImageForm {...props} /> : <OddOneOutForm {...props} />
}
