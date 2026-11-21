import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnswerAudio } from './useAnswerAudio'

const state = vi.hoisted(() => ({ clips: [] as { src: string; playing: boolean; stop: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn>; unload: ReturnType<typeof vi.fn> }[] }))
vi.mock('howler', () => ({ Howl: class {
  src: string
  playing = false
  stop = vi.fn(() => { this.playing = false })
  play = vi.fn(() => { this.playing = true; return 1 })
  unload = vi.fn(() => { this.playing = false })
  constructor(options: { src: string[]; html5: boolean }) {
    this.src = options.src[0]
    expect(options.html5).toBe(true)
    state.clips.push(this)
  }
} }))
beforeEach(() => { state.clips = [] })

describe('exclusive correct/wrong feedback audio', () => {
  it('stops the previous verdict even when quick retries alternate correct and wrong', () => {
    const { result } = renderHook(() => useAnswerAudio())
    const correct = state.clips.find((c) => c.src === '/sounds/feedback/correct.mp3')!
    const wrong = state.clips.find((c) => c.src === '/sounds/feedback/try-again.mp3')!
    expect(correct).toBeDefined()
    expect(wrong).toBeDefined()
    act(() => result.current(false))
    expect(wrong.playing).toBe(true)
    act(() => result.current(true))
    expect(wrong.playing).toBe(false)
    expect(correct.playing).toBe(true)
    act(() => result.current(false))
    expect(correct.playing).toBe(false)
    expect(wrong.playing).toBe(true)
    act(() => result.current(false))
    expect(state.clips.filter((c) => c.playing)).toEqual([wrong])
  })
  it('unloads both clips and ignores a retained callback after unmount', () => {
    const { result, unmount } = renderHook(() => useAnswerAudio())
    const retained = result.current
    act(() => retained(true))
    unmount()
    state.clips.forEach((c) => expect(c.unload).toHaveBeenCalledOnce())
    expect(state.clips.some((c) => c.playing)).toBe(false)
    const counts = state.clips.map((c) => c.play.mock.calls.length)
    act(() => retained(false))
    expect(state.clips.map((c) => c.play.mock.calls.length)).toEqual(counts)
  })
})
