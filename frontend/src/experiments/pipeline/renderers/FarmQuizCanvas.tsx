/**
 * FarmQuizCanvas: High-performance Candy Gloss Quiz Renderer (Track 1 - In-Distribution).
 * Implements K-5 UI specifications: touch targets >= 64px, stroke 4px, rounded-2xl,
 * pure Web Audio feedback, real-time FPS telemetry.
 */

import { useState, useEffect, useRef, type FC } from 'react'
import { Stage, Layer, Rect, Text, Group, Circle } from 'react-konva'
import { soundBus } from '../soundBus'
import { CANDY_PALETTE, UI_SPECS } from '../assetPalette'
import type { PresetQuizData } from '../pipelineOrchestrator'

interface FarmQuizCanvasProps {
  data: PresetQuizData
  onFpsUpdate?: (fps: number) => void
}

interface ConfettiDot {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  radius: number
  alpha: number
}

export const FarmQuizCanvas: FC<FarmQuizCanvasProps> = ({ data, onFpsUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [confetti, setConfetti] = useState<ConfettiDot[]>([])
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 })

  // Performance telemetry
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(performance.now())

  // Responsive scaling
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth
      const s = Math.min(1, Math.max(0.2, w / UI_SPECS.stageWidth))
      setScale(s)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Animation & FPS loop
  useEffect(() => {
    let animId: number
    let shakeTimer = 0

    const loop = (timestamp: number) => {
      frameCountRef.current++
      if (timestamp - lastFpsTimeRef.current >= 500) {
        const measuredFps = Math.round(
          (frameCountRef.current * 1000) / (timestamp - lastFpsTimeRef.current)
        )
        onFpsUpdate?.(Math.min(60, measuredFps))
        frameCountRef.current = 0
        lastFpsTimeRef.current = timestamp
      }

      // Update confetti
      setConfetti((prev) => {
        if (prev.length === 0) return prev
        return prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.3,
            alpha: Math.max(0, p.alpha - 0.015),
          }))
          .filter((p) => p.alpha > 0.05)
      })

      // Update shake
      if (shakeTimer > 0) {
        shakeTimer--
        setShakeOffset({
          x: (Math.random() * 2 - 1) * 8 * (shakeTimer / 10),
          y: (Math.random() * 2 - 1) * 8 * (shakeTimer / 10),
        })
      } else {
        setShakeOffset({ x: 0, y: 0 })
      }

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [onFpsUpdate])

  const handleSelectOption = (index: number) => {
    if (status !== 'idle') return

    setSelectedIndex(index)
    soundBus.playPop()

    const isCorrect = data.options[index]?.isCorrect ?? false

    if (isCorrect) {
      setStatus('correct')
      soundBus.playCorrect()

      // Spawn festive confetti
      const dots: ConfettiDot[] = []
      const colors = [CANDY_PALETTE.sunnyYellow, CANDY_PALETTE.candyPink, CANDY_PALETTE.mintGreen, '#FFF']
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2
        const spd = 3 + Math.random() * 10
        dots.push({
          id: i,
          x: UI_SPECS.stageWidth / 2,
          y: 600,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 4,
          color: colors[i % colors.length],
          radius: 5 + Math.random() * 6,
          alpha: 1,
        })
      }
      setConfetti(dots)
    } else {
      setStatus('wrong')
      soundBus.playWrong()
      setShakeOffset({ x: 10, y: -6 })

      setTimeout(() => {
        setStatus('idle')
        setSelectedIndex(null)
      }, 1500)
    }
  }

  // Option coordinates for 2x2 grid
  const optionLayouts = [
    { x: 360, y: 560, width: 560, height: 130 },
    { x: 1000, y: 560, width: 560, height: 130 },
    { x: 360, y: 730, width: 560, height: 130 },
    { x: 1000, y: 730, width: 560, height: 130 },
  ]

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        borderRadius: 20,
        boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
        backgroundColor: '#FFF9C4', // Sunny pastel farm pasture
      }}
    >
      <Stage
        width={UI_SPECS.stageWidth * scale}
        height={UI_SPECS.stageHeight * scale}
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          <Group x={shakeOffset.x} y={shakeOffset.y}>
            {/* Header Theme Badge */}
            <Group x={360} y={60}>
              <Rect
                width={1200}
                height={80}
                cornerRadius={24}
                fill={CANDY_PALETTE.primary}
                stroke={CANDY_PALETTE.inkBorder}
                strokeWidth={UI_SPECS.borderWidth}
                shadowColor="rgba(0,0,0,0.15)"
                shadowBlur={10}
                shadowOffsetY={6}
              />
              <Text
                x={0}
                y={20}
                width={1200}
                text={`🌾 ${data.title.toUpperCase()} • TOÁN LỚP ${data.gradeLevel} 🚜`}
                align="center"
                fontSize={32}
                fontStyle="bold"
                fill="#FFFFFF"
                fontFamily={UI_SPECS.fontFamily}
              />
            </Group>

            {/* Farm Backdrop Card */}
            <Group x={260} y={180}>
              <Rect
                width={1400}
                height={320}
                cornerRadius={UI_SPECS.borderRadius}
                fill={CANDY_PALETTE.cardBg}
                stroke={CANDY_PALETTE.inkBorder}
                strokeWidth={UI_SPECS.borderWidth}
                shadowColor="rgba(0,0,0,0.12)"
                shadowBlur={16}
                shadowOffsetY={8}
              />

              {/* Decorative Farm Badges */}
              <Group x={50} y={35}>
                <Circle radius={36} fill="#FFE082" stroke={CANDY_PALETTE.inkBorder} strokeWidth={3} />
                <Text x={-24} y={-18} text="🐔" fontSize={36} />
              </Group>
              <Group x={130} y={35}>
                <Circle radius={36} fill="#B2DFDB" stroke={CANDY_PALETTE.inkBorder} strokeWidth={3} />
                <Text x={-24} y={-18} text="🦆" fontSize={36} />
              </Group>

              {/* Question Text */}
              <Text
                x={210}
                y={45}
                width={1120}
                text={data.questionText}
                fontSize={40}
                lineHeight={1.4}
                fontStyle="bold"
                fill={CANDY_PALETTE.inkBorder}
                fontFamily={UI_SPECS.fontFamily}
              />

              {/* Math Hint Box */}
              <Group x={210} y={200}>
                <Rect
                  width={600}
                  height={75}
                  cornerRadius={16}
                  fill="#FFF3E0"
                  stroke={CANDY_PALETTE.primary}
                  strokeWidth={2}
                />
                <Text
                  x={20}
                  y={22}
                  text={`💡 Gợi ý: Có ${data.numA} chú gà + ${data.numB} chú vịt = ?`}
                  fontSize={26}
                  fontStyle="bold"
                  fill="#E65100"
                  fontFamily={UI_SPECS.fontFamily}
                />
              </Group>
            </Group>

            {/* Answer Options Grid (4 Candy Gloss Buttons) */}
            {data.options.map((option, idx) => {
              const layout = optionLayouts[idx]
              const isSelected = selectedIndex === idx

              let btnFill: string = CANDY_PALETTE.cardBg
              let btnStroke: string = CANDY_PALETTE.inkBorder
              let textColor: string = CANDY_PALETTE.inkBorder

              if (isSelected) {
                if (status === 'correct') {
                  btnFill = CANDY_PALETTE.mintGreen
                  btnStroke = '#1B5E20'
                  textColor = '#FFFFFF'
                } else if (status === 'wrong') {
                  btnFill = '#FF5252'
                  btnStroke = '#B71C1C'
                  textColor = '#FFFFFF'
                }
              }

              const letters = ['A', 'B', 'C', 'D']

              return (
                <Group
                  key={option.id}
                  x={layout.x}
                  y={layout.y}
                  onClick={() => handleSelectOption(idx)}
                  onTap={() => handleSelectOption(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Button Shadow and Main Body */}
                  <Rect
                    width={layout.width}
                    height={layout.height}
                    cornerRadius={UI_SPECS.borderRadius}
                    fill={btnFill}
                    stroke={btnStroke}
                    strokeWidth={UI_SPECS.borderWidth}
                    shadowColor="rgba(0,0,0,0.15)"
                    shadowBlur={8}
                    shadowOffsetY={6}
                  />

                  {/* Gloss Highlight on Top Half */}
                  <Rect
                    x={UI_SPECS.borderWidth}
                    y={UI_SPECS.borderWidth}
                    width={layout.width - UI_SPECS.borderWidth * 2}
                    height={(layout.height - UI_SPECS.borderWidth * 2) / 2}
                    cornerRadius={[UI_SPECS.borderRadius - 4, UI_SPECS.borderRadius - 4, 0, 0]}
                    fill="rgba(255, 255, 255, 0.35)"
                  />

                  {/* Letter Pill */}
                  <Circle
                    x={65}
                    y={layout.height / 2}
                    radius={34}
                    fill={isSelected && status === 'correct' ? '#FFFFFF' : CANDY_PALETTE.skyBlue}
                    stroke={CANDY_PALETTE.inkBorder}
                    strokeWidth={3}
                  />
                  <Text
                    x={47}
                    y={layout.height / 2 - 20}
                    text={letters[idx]}
                    fontSize={34}
                    fontStyle="bold"
                    fill={isSelected && status === 'correct' ? CANDY_PALETTE.skyBlue : '#FFFFFF'}
                    fontFamily={UI_SPECS.fontFamily}
                  />

                  {/* Answer Text */}
                  <Text
                    x={125}
                    y={layout.height / 2 - 22}
                    width={layout.width - 150}
                    text={option.text}
                    fontSize={36}
                    fontStyle="bold"
                    fill={textColor}
                    fontFamily={UI_SPECS.fontFamily}
                  />
                </Group>
              )
            })}

            {/* Bottom Feedback Banner */}
            {status === 'correct' && (
              <Group x={460} y={900}>
                <Rect
                  width={1000}
                  height={110}
                  cornerRadius={24}
                  fill={CANDY_PALETTE.mintGreen}
                  stroke="#1B5E20"
                  strokeWidth={4}
                  shadowColor="rgba(0,0,0,0.2)"
                  shadowBlur={12}
                  shadowOffsetY={6}
                />
                <Text
                  x={0}
                  y={22}
                  width={1000}
                  text="🎉 XUẤT SẮC! BẠN ĐÃ TÍNH ĐÚNG 65 CON! 🌟"
                  align="center"
                  fontSize={36}
                  fontStyle="bold"
                  fill="#FFFFFF"
                  fontFamily={UI_SPECS.fontFamily}
                />
                <Text
                  x={0}
                  y={68}
                  width={1000}
                  text={data.explanation}
                  align="center"
                  fontSize={24}
                  fill="#E8F5E9"
                  fontFamily={UI_SPECS.fontFamily}
                />
              </Group>
            )}

            {/* Confetti Particles */}
            {confetti.map((c) => (
              <Circle
                key={c.id}
                x={c.x}
                y={c.y}
                radius={c.radius}
                fill={c.color}
                opacity={c.alpha}
              />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}
