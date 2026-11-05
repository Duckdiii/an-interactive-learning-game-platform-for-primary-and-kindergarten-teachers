/**
 * SoundBus: Pure Web Audio API synthesized sound generator for K-5 learning games.
 * Zero external audio asset dependencies, instantaneous response, zero network latency.
 */

class SoundBusEngine {
  private audioCtx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {
        // Ignored until user gesture
      })
    }
    return this.audioCtx
  }

  /**
   * SFX_POP: Quick bubble pop sound for UI touches or balloon hits.
   * Sine wave fast downward frequency sweep.
   */
  public playPop(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime

      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08)

      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.08)
    } catch {
      // Audio playback suppressed safely
    }
  }

  /**
   * SFX_CORRECT: Joyful major triad arpeggio (C5 -> E5 -> G5 -> C6).
   * Rewarding and high-energy for correct answers.
   */
  public playCorrect(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
      const now = ctx.currentTime
      const noteDuration = 0.07

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const noteStart = now + idx * noteDuration

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, noteStart)

        gain.gain.setValueAtTime(0.25, noteStart)
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration * 1.5)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(noteStart)
        osc.stop(noteStart + noteDuration * 1.5)
      })
    } catch {
      // Audio playback suppressed safely
    }
  }

  /**
   * SFX_WRONG: Gentle "boing" buzz sound with lowpass filter for gentle feedback.
   * Soft and non-intimidating for young children.
   */
  public playWrong(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()
      const now = ctx.currentTime
      const duration = 0.28

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(180, now)
      osc.frequency.linearRampToValueAtTime(110, now + duration)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(600, now)
      filter.frequency.linearRampToValueAtTime(200, now + duration)

      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + duration)
    } catch {
      // Audio playback suppressed safely
    }
  }

  /**
   * SFX_SLING: Elastic tension release and whoosh sound.
   * Modulated frequency curve giving tactile feeling of bowstring snap.
   */
  public playSling(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime
      const duration = 0.16

      osc.type = 'sine'
      osc.frequency.setValueAtTime(240, now)
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.05)
      osc.frequency.exponentialRampToValueAtTime(160, now + duration)

      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.005, now + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + duration)
    } catch {
      // Audio playback suppressed safely
    }
  }

  /**
   * SFX_HIT: Sharp, satisfying collision strike.
   */
  public playHit(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime
      const duration = 0.06

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.exponentialRampToValueAtTime(110, now + duration)

      gain.gain.setValueAtTime(0.35, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + duration)
    } catch {
      // Audio playback suppressed safely
    }
  }

  /**
   * SFX_BOUNCE: Elastic cartoon spring boing (frequency up-ramp).
   */
  public playBounce(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime
      const duration = 0.18

      osc.type = 'sine'
      osc.frequency.setValueAtTime(200, now)
      osc.frequency.exponentialRampToValueAtTime(600, now + duration * 0.7)
      osc.frequency.exponentialRampToValueAtTime(320, now + duration)

      gain.gain.setValueAtTime(0.28, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + duration)
    } catch {
      // Suppressed
    }
  }

  /**
   * SFX_FANFARE: Celebratory fanfare chord for finishing questions.
   */
  public playFanfare(): void {
    this.playCorrect()
    setTimeout(() => {
      this.playPop()
    }, 120)
  }
}

export const soundBus = new SoundBusEngine()
