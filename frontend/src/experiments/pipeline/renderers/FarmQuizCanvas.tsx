/**
 * FarmQuizCanvas: High-performance Candy Gloss Quiz Renderer (Track 1 - In-Distribution).
 * Upgraded with Stage 2.5: Asset & Theme Dressing Pipeline:
 * - Dynamic World Themes (FARM, OCEAN, SPACE, FOREST, CANDY)
 * - 80/20 Visual SVG Sprites with Idle Breathing (2-3%)
 * - Animated Mascot Companion with Squash & Stretch feedback
 * - Web Speech Vietnamese TTS Narration with Interactive Speaker Button
 */

import { useState, useEffect, useRef, type FC } from 'react'
import { Stage, Layer, Rect, Text, Group, Circle, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import { soundBus } from '../soundBus'
import { CANDY_PALETTE, UI_SPECS } from '../assetPalette'
import { speakVietnamese } from '../assetBank'
import type { PresetQuizData } from '../pipelineOrchestrator'
import type { MascotConfig } from '../themeResolver'

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

// ---------------------------------------------------------------------------
// Sub-component: Visual SVG Sprite with Idle Breathing (2-3% scale oscillation)
// ---------------------------------------------------------------------------
const SpriteItem: FC<{
  url: string
  x: number
  y: number
  size: number
  animPhase: number
  animTime: number
}> = ({ url, x, y, size, animPhase, animTime }) => {
  const [image] = useImage(url, 'anonymous')
  // Idle breathing 2-3% scale oscillation
  const scale = 1 + 0.03 * Math.sin(animTime * 0.003 + animPhase)
  const offset = (size * scale - size) / 2

  if (!image) {
    return (
      <Circle
        x={x + size / 2}
        y={y + size / 2}
        radius={size / 2}
        fill="#FFD54F"
        stroke="#78350F"
        strokeWidth={2}
      />
    )
  }

  return (
    <Group x={x - offset} y={y - offset} scaleX={scale} scaleY={scale}>
      <KonvaImage image={image} width={size} height={size} />
    </Group>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: Animated Mascot Companion with Squash & Stretch feedback
// ---------------------------------------------------------------------------
const MascotCompanion: FC<{
  mascot: MascotConfig
  status: 'idle' | 'correct' | 'wrong'
  animTime: number
  speechText?: string
}> = ({ mascot, status, animTime, speechText }) => {
  const [avatar] = useImage(mascot.avatarUrl, 'anonymous')

  // Squash & Stretch physics oscillation
  let scaleX = 1 + 0.02 * Math.sin(animTime * 0.004)
  let scaleY = 1 - 0.02 * Math.sin(animTime * 0.004)
  let mascotYOffset = 0

  if (status === 'correct') {
    // Spring upward bounce + squash & stretch
    const bouncePhase = (animTime * 0.012) % (Math.PI * 2)
    mascotYOffset = -24 * Math.abs(Math.sin(bouncePhase))
    scaleX = 1 + 0.18 * Math.cos(bouncePhase)
    scaleY = 1 - 0.18 * Math.cos(bouncePhase)
  } else if (status === 'wrong') {
    // Mild shiver
    scaleX = 0.94 + 0.06 * Math.sin(animTime * 0.03)
    scaleY = 0.94
  }

  const quote =
    speechText ||
    (status === 'correct'
      ? mascot.happyQuote
      : status === 'wrong'
        ? mascot.encouragingQuote
        : `Xin chào! Cùng ${mascot.name} giải đố nhé!`)

  return (
    <Group x={70} y={750}>
      {/* Speech Bubble */}
      <Group x={110} y={-45}>
        <Rect
          width={280}
          height={85}
          cornerRadius={20}
          fill="#FFFFFF"
          stroke="#475569"
          strokeWidth={3}
          shadowColor="rgba(0,0,0,0.12)"
          shadowBlur={10}
          shadowOffsetY={5}
        />
        <Text
          x={16}
          y={16}
          width={248}
          text={quote}
          fontSize={18}
          fontStyle="bold"
          fill="#1E293B"
          lineHeight={1.3}
          fontFamily={UI_SPECS.fontFamily}
        />
      </Group>

      {/* Mascot Avatar Card with Squash & Stretch */}
      <Group
        x={0}
        y={mascotYOffset}
        scaleX={scaleX}
        scaleY={scaleY}
        offsetX={55}
        offsetY={55}
      >
        <Circle
          x={55}
          y={55}
          radius={52}
          fill="#FFFFFF"
          stroke="#334155"
          strokeWidth={4}
          shadowColor="rgba(0,0,0,0.15)"
          shadowBlur={12}
          shadowOffsetY={6}
        />
        {avatar ? (
          <KonvaImage image={avatar} x={12} y={12} width={86} height={86} />
        ) : (
          <Text x={25} y={25} text={mascot.emoji} fontSize={50} />
        )}
      </Group>
    </Group>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: Audio Narration Speaker Button (🔊)
// ---------------------------------------------------------------------------
const SpeakerButton: FC<{
  x: number
  y: number
  isSpeaking: boolean
  onClick: () => void
}> = ({ x, y, isSpeaking, onClick }) => {
  return (
    <Group x={x} y={y} onClick={onClick} onTap={onClick} style={{ cursor: 'pointer' }}>
      <Circle
        radius={34}
        fill={isSpeaking ? '#F59E0B' : '#FFFFFF'}
        stroke="#475569"
        strokeWidth={3}
        shadowColor="rgba(0,0,0,0.15)"
        shadowBlur={10}
        shadowOffsetY={5}
      />
      <Text
        x={-20}
        y={-18}
        text={isSpeaking ? '🔊' : '🔈'}
        fontSize={34}
      />
    </Group>
  )
}

// ---------------------------------------------------------------------------
// Main Component: FarmQuizCanvas
// ---------------------------------------------------------------------------
export const FarmQuizCanvas: FC<FarmQuizCanvasProps> = ({ data, onFpsUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [confetti, setConfetti] = useState<ConfettiDot[]>([])
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 })
  const [animTime, setAnimTime] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Performance telemetry
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(performance.now())

  // Default mascot fallback
  const mascot: MascotConfig = data.themeData?.mascot ?? {
    id: 'rabbit',
    name: 'Thỏ Trắng Nông Dân',
    emoji: '🐰',
    avatarUrl: '/assets/animals/rabbit.svg',
    encouragingQuote: 'Cố lên bé ơi! Đếm cùng thỏ nào!',
    happyQuote: 'Hoan hô! Bé tính siêu quá!',
  }

  // Theme palettes
  const themePalette = data.themeData?.palette ?? {
    background: '#FFFBEB',
    cardBg: CANDY_PALETTE.cardBg,
    primary: CANDY_PALETTE.primary,
    secondary: CANDY_PALETTE.mintGreen,
    border: CANDY_PALETTE.inkBorder,
    accent: '#EF4444',
    canvasBg: '#FFF9C4',
    textColor: CANDY_PALETTE.inkBorder,
  }

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
      setAnimTime(timestamp)
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

  // Handle speaker click
  const handleToggleSpeak = () => {
    if (isSpeaking) return
    setIsSpeaking(true)
    soundBus.playPop()
    speakVietnamese(data.narrationText || data.questionText, () => {
      setIsSpeaking(false)
    })
  }

  const handleSelectOption = (index: number) => {
    if (status !== 'idle') return

    setSelectedIndex(index)
    soundBus.playPop()

    const isCorrect = data.options[index]?.isCorrect ?? false

    if (isCorrect) {
      setStatus('correct')
      soundBus.playCorrect()
      soundBus.playBounce()
      soundBus.playFanfare()

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
    { x: 380, y: 550, width: 550, height: 130 },
    { x: 990, y: 550, width: 550, height: 130 },
    { x: 380, y: 710, width: 550, height: 130 },
    { x: 990, y: 710, width: 550, height: 130 },
  ]

  // Prepared visual sprite items to render
  const visualSprites = data.spriteItems && data.spriteItems.length > 0
    ? data.spriteItems
    : data.imageUrl
      ? [{ name: 'Hình ảnh học liệu', url: data.imageUrl, count: 3 }]
      : []

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        borderRadius: 20,
        boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
        backgroundColor: themePalette.canvasBg,
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
            <Group x={360} y={50}>
              <Rect
                width={1200}
                height={80}
                cornerRadius={24}
                fill={themePalette.primary}
                stroke={themePalette.border}
                strokeWidth={UI_SPECS.borderWidth}
                shadowColor="rgba(0,0,0,0.15)"
                shadowBlur={10}
                shadowOffsetY={6}
              />
              <Text
                x={0}
                y={20}
                width={1200}
                text={`${data.themeData?.icon || '🌾'} ${data.title.toUpperCase()} • TOÁN LỚP ${data.gradeLevel} ${data.themeData?.icon || '🚜'}`}
                align="center"
                fontSize={32}
                fontStyle="bold"
                fill="#FFFFFF"
                fontFamily={UI_SPECS.fontFamily}
              />
            </Group>

            {/* Farm Backdrop Card */}
            <Group x={260} y={160}>
              <Rect
                width={1400}
                height={350}
                cornerRadius={UI_SPECS.borderRadius}
                fill={themePalette.cardBg}
                stroke={themePalette.border}
                strokeWidth={UI_SPECS.borderWidth}
                shadowColor="rgba(0,0,0,0.12)"
                shadowBlur={16}
                shadowOffsetY={8}
              />

              {/* Decorative Theme Badges */}
              <Group x={45} y={35}>
                <Circle radius={34} fill="#FFE082" stroke={themePalette.border} strokeWidth={3} />
                <Text x={-22} y={-18} text={data.themeData?.icon || '🌾'} fontSize={36} />
              </Group>

              {/* Question Text */}
              <Text
                x={130}
                y={35}
                width={1140}
                text={data.questionText}
                fontSize={36}
                lineHeight={1.4}
                fontStyle="bold"
                fill={themePalette.textColor}
                fontFamily={UI_SPECS.fontFamily}
              />

              {/* Speaker TTS Narration Button */}
              <SpeakerButton
                x={1330}
                y={55}
                isSpeaking={isSpeaking}
                onClick={handleToggleSpeak}
              />

              {/* Visual Sprites Showcase Row (Stage 2.5: Idle Breathing SVG Sprites) */}
              <Group x={130} y={170}>
                <Rect
                  width={680}
                  height={140}
                  cornerRadius={18}
                  fill="#FFFBEB"
                  stroke={themePalette.border}
                  strokeWidth={2}
                />
                <Text
                  x={16}
                  y={12}
                  text="🎨 HÌNH ẢNH TRỰC QUAN:"
                  fontSize={16}
                  fontStyle="bold"
                  fill="#92400E"
                  fontFamily={UI_SPECS.fontFamily}
                />
                {visualSprites.map((item, idx) => {
                  const displayCount = Math.min(item.count, 6)
                  return (
                    <Group key={`${item.name}-${idx}`} x={16 + idx * 320} y={40}>
                      {Array.from({ length: displayCount }).map((_, cIdx) => (
                        <SpriteItem
                          key={cIdx}
                          url={item.url}
                          x={cIdx * 48}
                          y={10}
                          size={54}
                          animPhase={cIdx * 0.4}
                          animTime={animTime}
                        />
                      ))}
                      <Text
                        x={0}
                        y={68}
                        text={`• ${item.count} ${item.name}`}
                        fontSize={18}
                        fontStyle="bold"
                        fill="#78350F"
                        fontFamily={UI_SPECS.fontFamily}
                      />
                    </Group>
                  )
                })}
              </Group>

              {/* Math Hint Box */}
              <Group x={840} y={170}>
                <Rect
                  width={510}
                  height={140}
                  cornerRadius={18}
                  fill="#EFF6FF"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
                <Text
                  x={20}
                  y={16}
                  text="💡 GỢI Ý CỦA BẠN ĐỒNG HÀNH:"
                  fontSize={16}
                  fontStyle="bold"
                  fill="#1E40AF"
                  fontFamily={UI_SPECS.fontFamily}
                />
                <Text
                  x={20}
                  y={46}
                  width={470}
                  text={data.explanation || `Phép tính: ${data.numA} ${data.operation} ${data.numB} = ?`}
                  fontSize={20}
                  lineHeight={1.4}
                  fill="#1E3A8A"
                  fontFamily={UI_SPECS.fontFamily}
                />
              </Group>
            </Group>

            {/* Answer Options Grid (4 Candy Gloss Buttons) */}
            {data.options.map((option, idx) => {
              const layout = optionLayouts[idx]
              const isSelected = selectedIndex === idx

              let btnFill: string = themePalette.cardBg
              let btnStroke: string = themePalette.border
              let textColor: string = themePalette.textColor

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
                    fill={isSelected && status === 'correct' ? '#FFFFFF' : themePalette.primary}
                    stroke={themePalette.border}
                    strokeWidth={3}
                  />
                  <Text
                    x={47}
                    y={layout.height / 2 - 20}
                    text={letters[idx]}
                    fontSize={34}
                    fontStyle="bold"
                    fill={isSelected && status === 'correct' ? themePalette.primary : '#FFFFFF'}
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

            {/* Mascot Companion at Corner with Squash & Stretch */}
            <MascotCompanion
              mascot={mascot}
              status={status}
              animTime={animTime}
            />

            {/* Bottom Feedback Banner */}
            {status === 'correct' && (
              <Group x={460} y={890}>
                <Rect
                  width={1000}
                  height={120}
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
                  text="🎉 XUẤT SẮC! BÉ ĐÃ TRẢ LỜI ĐÚNG! 🌟"
                  align="center"
                  fontSize={36}
                  fontStyle="bold"
                  fill="#FFFFFF"
                  fontFamily={UI_SPECS.fontFamily}
                />
                <Text
                  x={0}
                  y={72}
                  width={1000}
                  text={data.explanation}
                  align="center"
                  fontSize={22}
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
