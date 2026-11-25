import { describe, expect, it } from 'vitest'
import { hasSourceAudio } from './audioUrl'

describe('hasSourceAudio', () => {
  it('does not treat the legacy Quiz mock WAV as teacher-supplied audio', () => {
    expect(hasSourceAudio('/mock/q1.wav')).toBe(false)
  })

  it('keeps a real uploaded audio URL as source audio', () => {
    expect(hasSourceAudio('https://storage.example/source.mp3')).toBe(true)
  })

  it('treats missing and blank URLs as no source audio', () => {
    expect(hasSourceAudio(undefined)).toBe(false)
    expect(hasSourceAudio('  ')).toBe(false)
  })
})
