import { describe, expect, it } from 'vitest'
import { buildAudioVisualMock } from './imageGameFixtures'

describe('buildAudioVisualMock', () => {
  it('keeps the English demo prompt and TTS text in English', () => {
    const game = buildAudioVisualMock()

    expect(game.metadata.subject).toBe('ENGLISH')
    expect(game.questions[0].audioText).toBe('Cat')
    expect(game.questions[0].correct.visualPrompt).toBe('Cat')
    expect(game.questions[0].distractors.map((option) => option.visualPrompt)).toEqual(['Dog', 'Apple'])
  })
})
