/**
 * Composable Primitives Framework (CPF) Virtual Runtime Engine.
 * Manages 60 FPS physics tick, sling tension mechanics, dynamic bowstring geometry,
 * sinusoidal floating trajectories, collision resolution, particle simulation, and camera shake.
 */

import { soundBus } from './soundBus'
import { CANDY_PALETTE, UI_SPECS } from './assetPalette'
import type { CpfSceneGraph } from './cpfTypes'

export interface BalloonEntity {
  id: string
  numberValue: number
  isEven: boolean
  x: number
  baseY: number
  currentY: number
  color: string
  highlight: string
  isPopped: boolean
  speed: number
  amplitude: number
  phase: number
}

export interface ParticleEntity {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  alpha: number
  radius: number
  life: number
  maxLife: number
}

export class CpfRuntimeEngine {
  // Bow configuration
  public readonly bowAnchor = { x: 250, y: 540 }
  public readonly bowUpperTip = { x: 250, y: 440 }
  public readonly bowLowerTip = { x: 250, y: 640 }
  public readonly maxPull = 150

  // Sling & Arrow State
  public isPulling = false
  public pullPos = { x: 250, y: 540 }
  public pullVector = { x: 0, y: 0 }
  public tensionForce = 0

  public isFlying = false
  public arrowPos = { x: 250, y: 540 }
  public arrowVel = { x: 0, y: 0 }
  public arrowRotation = 0

  // Target Balloons
  public balloons: BalloonEntity[] = []

  // Effects
  public particles: ParticleEntity[] = []
  public shakeOffset = { x: 0, y: 0 }
  private shakeFrames = 0
  private shakeIntensity = 0

  // Gameplay state
  public score = 0
  public combo = 0
  public inputLocked = false
  public messageBanner: { text: string; color: string; duration: number } | null = null

  private timeSec = 0
  private particleSeq = 0

  constructor(sceneGraph?: CpfSceneGraph) {
    this.initFromGraph(sceneGraph)
  }

  public initFromGraph(graph?: CpfSceneGraph): void {
    this.score = 0
    this.combo = 0
    this.isFlying = false
    this.isPulling = false
    this.inputLocked = false
    this.particles = []
    this.shakeFrames = 0
    this.arrowPos = { ...this.bowAnchor }
    this.arrowRotation = 0

    if (!graph) {
      // Default fallback entities
      this.balloons = [
        {
          id: 'b1',
          numberValue: 24,
          isEven: true,
          x: 1150,
          baseY: 340,
          currentY: 340,
          color: CANDY_PALETTE.balloonColors[0].fill,
          highlight: CANDY_PALETTE.balloonColors[0].highlight,
          isPopped: false,
          speed: 1.8,
          amplitude: 35,
          phase: 0,
        },
        {
          id: 'b2',
          numberValue: 17,
          isEven: false,
          x: 1400,
          baseY: 260,
          currentY: 260,
          color: CANDY_PALETTE.balloonColors[1].fill,
          highlight: CANDY_PALETTE.balloonColors[1].highlight,
          isPopped: false,
          speed: 2.1,
          amplitude: 45,
          phase: 1.2,
        },
        {
          id: 'b3',
          numberValue: 48,
          isEven: true,
          x: 1650,
          baseY: 420,
          currentY: 420,
          color: CANDY_PALETTE.balloonColors[2].fill,
          highlight: CANDY_PALETTE.balloonColors[2].highlight,
          isPopped: false,
          speed: 1.6,
          amplitude: 30,
          phase: 2.4,
        },
        {
          id: 'b4',
          numberValue: 35,
          isEven: false,
          x: 1250,
          baseY: 700,
          currentY: 700,
          color: CANDY_PALETTE.balloonColors[3].fill,
          highlight: CANDY_PALETTE.balloonColors[3].highlight,
          isPopped: false,
          speed: 2.0,
          amplitude: 40,
          phase: 3.6,
        },
        {
          id: 'b5',
          numberValue: 82,
          isEven: true,
          x: 1520,
          baseY: 780,
          currentY: 780,
          color: CANDY_PALETTE.balloonColors[4].fill,
          highlight: CANDY_PALETTE.balloonColors[4].highlight,
          isPopped: false,
          speed: 1.7,
          amplitude: 48,
          phase: 4.8,
        },
      ]
      return
    }

    const targetNodes = graph.nodes.filter((n) => n.role === 'target')
    this.balloons = targetNodes.map((n, idx) => {
      const num = Number(n.metadata?.numberValue ?? (idx + 1) * 10)
      const color = CANDY_PALETTE.balloonColors[idx % CANDY_PALETTE.balloonColors.length]
      const motion = n.motion?.type === 'FLOAT' ? n.motion : { amplitude: 35, frequency: 1.8 }
      return {
        id: n.id,
        numberValue: num,
        isEven: num % 2 === 0,
        x: n.x,
        baseY: n.y,
        currentY: n.y,
        color: n.visual.type === 'SPRITE' ? n.visual.fill : color.fill,
        highlight: color.highlight,
        isPopped: false,
        speed: motion.frequency,
        amplitude: motion.amplitude,
        phase: (idx * Math.PI) / 3,
      }
    })
  }

  // ---------------------------------------------------------------------------
  // SLING INPUT HANDLING
  // ---------------------------------------------------------------------------

  public handleDragStart(x: number, y: number): boolean {
    if (this.inputLocked || this.isFlying) return false

    // Check distance to bow anchor
    const dx = x - this.bowAnchor.x
    const dy = y - this.bowAnchor.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 180) {
      this.isPulling = true
      this.handleDragMove(x, y)
      soundBus.playPop()
      return true
    }
    return false
  }

  public handleDragMove(x: number, y: number): void {
    if (!this.isPulling) return

    let dx = x - this.bowAnchor.x
    let dy = y - this.bowAnchor.y

    // Limit pull backwards towards left only
    if (dx > 20) dx = 20

    const dist = Math.sqrt(dx * dx + dy * dy)
    const clampedDist = Math.min(dist, this.maxPull)

    if (dist > 0) {
      const ratio = clampedDist / dist
      this.pullPos = {
        x: this.bowAnchor.x + dx * ratio,
        y: this.bowAnchor.y + dy * ratio,
      }
    } else {
      this.pullPos = { ...this.bowAnchor }
    }

    this.pullVector = {
      x: this.pullPos.x - this.bowAnchor.x,
      y: this.pullPos.y - this.bowAnchor.y,
    }
    this.tensionForce = clampedDist

    // Arrow matches pull position and points forward along opposite vector
    this.arrowPos = { ...this.pullPos }
    const launchAngleRad = Math.atan2(-this.pullVector.y, -this.pullVector.x)
    this.arrowRotation = (launchAngleRad * 180) / Math.PI
  }

  public handleDragEnd(): void {
    if (!this.isPulling) return
    this.isPulling = false

    if (this.tensionForce > 30) {
      // Launch Arrow!
      this.isFlying = true
      this.inputLocked = true

      const launchSpeed = this.tensionForce * 0.28
      const launchAngleRad = (this.arrowRotation * Math.PI) / 180

      this.arrowVel = {
        x: Math.cos(launchAngleRad) * launchSpeed,
        y: Math.sin(launchAngleRad) * launchSpeed,
      }

      soundBus.playSling()
    } else {
      // Cancel pull
      this.resetArrow()
    }
  }

  public resetArrow(): void {
    this.isFlying = false
    this.isPulling = false
    this.inputLocked = false
    this.arrowPos = { ...this.bowAnchor }
    this.pullPos = { ...this.bowAnchor }
    this.tensionForce = 0
    this.arrowRotation = 0
  }

  // ---------------------------------------------------------------------------
  // 60 FPS SIMULATION TICK
  // ---------------------------------------------------------------------------

  public tick(dtSec: number): void {
    this.timeSec += dtSec

    // 1. Update floating balloons
    for (const b of this.balloons) {
      if (!b.isPopped) {
        b.currentY = b.baseY + Math.sin(this.timeSec * b.speed + b.phase) * b.amplitude
      }
    }

    // 2. Update screen shake
    if (this.shakeFrames > 0) {
      this.shakeFrames--
      const decay = this.shakeFrames / 15
      this.shakeOffset = {
        x: (Math.random() * 2 - 1) * this.shakeIntensity * decay,
        y: (Math.random() * 2 - 1) * this.shakeIntensity * decay,
      }
    } else {
      this.shakeOffset = { x: 0, y: 0 }
    }

    // 3. Update active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.25 // slight gravity
      p.life += dtSec * 1000
      p.alpha = Math.max(0, 1 - p.life / p.maxLife)
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1)
      }
    }

    // 4. Update flying arrow physics and collision
    if (this.isFlying) {
      this.arrowPos.x += this.arrowVel.x
      this.arrowPos.y += this.arrowVel.y
      this.arrowVel.y += 0.12 // arrow gravity drop

      // Update rotation to follow trajectory
      const angle = Math.atan2(this.arrowVel.y, this.arrowVel.x)
      this.arrowRotation = (angle * 180) / Math.PI

      // Check collision with balloons (tip, center, and body)
      const tipX = this.arrowPos.x + Math.cos(angle) * 50
      const tipY = this.arrowPos.y + Math.sin(angle) * 50

      let hitDetected = false

      for (const b of this.balloons) {
        if (b.isPopped) continue

        const headDist = Math.hypot(tipX - b.x, tipY - b.currentY)
        const centerDist = Math.hypot(this.arrowPos.x - b.x, this.arrowPos.y - b.currentY)

        if (headDist <= 70 || centerDist <= 65) {
          // HIT!
          hitDetected = true
          b.isPopped = true
          this.isFlying = false

          if (b.isEven) {
            // Correct Target (Even Number)
            this.score += 1
            this.combo += 1
            soundBus.playCorrect()
            this.spawnConfetti(b.x, b.currentY, [
              CANDY_PALETTE.sunnyYellow,
              CANDY_PALETTE.mintGreen,
              '#FFFFFF',
            ])
            this.messageBanner = {
              text: `CHÍNH XÁC! ${b.numberValue} là số chẵn! (+1 Điểm)`,
              color: CANDY_PALETTE.mintGreen,
              duration: 2.0,
            }
          } else {
            // Wrong Target (Odd Number)
            this.combo = 0
            soundBus.playWrong()
            this.triggerShake(16, 18)
            this.messageBanner = {
              text: `Ối! ${b.numberValue} là số lẻ rồi! Hãy tìm số chẵn nhé!`,
              color: '#FF5252',
              duration: 2.0,
            }
          }

          // Delay before resetting arrow
          setTimeout(() => {
            this.resetArrow()
            this.checkRespawnBalloons()
          }, 600)
          break
        }
      }

      // Check out of bounds
      if (!hitDetected) {
        if (
          this.arrowPos.x > UI_SPECS.stageWidth + 100 ||
          this.arrowPos.y > UI_SPECS.stageHeight + 100 ||
          this.arrowPos.y < -100
        ) {
          this.isFlying = false
          soundBus.playWrong()
          this.resetArrow()
        }
      }
    }

    // Message banner decay
    if (this.messageBanner) {
      this.messageBanner.duration -= dtSec
      if (this.messageBanner.duration <= 0) {
        this.messageBanner = null
      }
    }
  }

  private triggerShake(intensity: number, frames: number): void {
    this.shakeIntensity = intensity
    this.shakeFrames = frames
  }

  private spawnConfetti(cx: number, cy: number, colors: string[]): void {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 4 + Math.random() * 8
      this.particles.push({
        id: ++this.particleSeq,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        radius: 4 + Math.random() * 6,
        life: 0,
        maxLife: 600 + Math.random() * 400,
      })
    }
  }

  private checkRespawnBalloons(): void {
    const unpopped = this.balloons.filter((b) => !b.isPopped)
    if (unpopped.length === 0) {
      // All balloons cleared: replenish new wave!
      setTimeout(() => {
        for (const b of this.balloons) {
          b.isPopped = false
        }
        soundBus.playCorrect()
      }, 500)
    }
  }
}
