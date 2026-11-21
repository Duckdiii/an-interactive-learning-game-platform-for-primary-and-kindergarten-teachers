import AudioVisualMatchRenderer from '../../games/audio-visual-match/AudioVisualMatchRenderer'
import type { PlayableRendererProps } from './types'

export default function AudioVisualMatchPlayable({ question, onSubmit, playAudio, subject, answerDisabled }: PlayableRendererProps<'AUDIO_VISUAL_MATCH'>) {
  return <AudioVisualMatchRenderer key={question.id} question={question} onSubmit={onSubmit} playAudio={playAudio}
    answerDisabled={answerDisabled} ttsLanguage={subject === 'ENGLISH' ? 'en-US' : 'vi-VN'} />
}
