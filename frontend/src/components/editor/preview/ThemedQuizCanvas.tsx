/**
 * ThemedQuizCanvas: Canvas Renderer cho câu hỏi trắc nghiệm QUIZ theo thế giới game (Stage 2.5).
 * - Tích hợp Dynamic Themes: FARM, OCEAN, JUNGLE, SPACE
 * - Linh vật Mascot hoạt hình đồng hành (thở nhẹ 2-3%, Squash & Stretch khi tương tác)
 * - Hình ảnh minh họa Vector (Candy Gloss / SVG sprites) với nhịp thở nhẹ 2-3%
 * - Nút nghe giọng đọc đề bài tiếng Việt (Web Speech API)
 * - Phản hồi âm thanh qua soundBus và hiệu ứng chúc mừng Confetti
 */

import { useState, useEffect, useRef, useMemo, type FC } from 'react'
import { Stage, Layer, Rect, Text, Group, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import { soundBus } from '../../../experiments/pipeline/soundBus'
import { CANDY_PALETTE, UI_SPECS } from '../../../experiments/pipeline/assetPalette'
import {
  findBestSprite,
  getDefaultThemeSprite,
  speakVietnamese,
  type AssetSprite,
} from '../../../experiments/pipeline/assetBank'
import {
  resolveGameTheme,
  type ThemeKey,
  type GameWorldTheme,
  type MascotConfig,
} from '../../../experiments/pipeline/themeResolver'
import type { QuizQuestion } from '../../../types/game-dsl.types'

export interface ThemedQuizCanvasProps {
  question: QuizQuestion
  themeKey?: ThemeKey | string
  title?: string
  gradeLevel?: string
  subject?: string
  width?: number
  height?: number
  onAnswer?: (isCorrect: boolean, selectedOptionId: string) => void
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
// SpriteItem: SVG Vector Sprite với Idle Breathing (2-3% scale oscillation)
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
  const scale = 1 + 0.03 * Math.sin(animTime * 0.003 + animPhase)
  const offset = (size * scale - size) / 2

  if (!image) {
    return (
      <Rect
        x={x}
        y={y}
        width={size}
        height={size}
        cornerRadius={size / 2}
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
// MascotCompanion: Linh vật cử động đồng hành với nhịp thở và Squash & Stretch
// ---------------------------------------------------------------------------
const MascotCompanion: FC<{
  mascot: MascotConfig
  status: 'idle' | 'correct' | 'wrong'
  animTime: number
  speechText?: string
}> = ({ mascot, status, animTime, speechText }) => {
  const [avatar] = useImage(mascot.avatarUrl, 'anonymous')

  // Squash & Stretch physics oscillation (Idle breathing 2-3%)
  let scaleX = 1 + 0.02 * Math.sin(animTime * 0.004)
  let scaleY = 1 - 0.02 * Math.sin(animTime * 0.004)
  let mascotYOffset = 0

  if (status === 'correct') {
    const bouncePhase = (animTime * 0.012) % (Math.PI * 2)
    mascotYOffset = -24 * Math.abs(Math.sin(bouncePhase))
    scaleX = 1 + 0.18 * Math.cos(bouncePhase)
    scaleY = 1 - 0.18 * Math.cos(bouncePhase)
  } else if (status === 'wrong') {
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
        <Rect
          x={0}
          y={0}
          width={110}
          height={110}
          cornerRadius={55}
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
// SpeakerButton: Nút loa phát giọng đọc đề bài TTS tiếng Việt
// ---------------------------------------------------------------------------
const SpeakerButton: FC<{
  x: number
  y: number
  isSpeaking: boolean
  onClick: () => void
}> = ({ x, y, isSpeaking, onClick }) => {
  return (
    <Group x={x} y={y} onClick={onClick} onTap={onClick} style={{ cursor: 'pointer' }}>
      <Rect
        x={-34}
        y={-34}
        width={68}
        height={68}
        cornerRadius={34}
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
// ThemedQuizCanvas: Renderer chính
// ---------------------------------------------------------------------------
export default function ThemedQuizCanvas({
  question,
  themeKey = 'farm',
  title = 'Trắc nghiệm vui học',
  gradeLevel = '1',
  subject = 'MATH',
  width,
  height,
  onAnswer,
}: ThemedQuizCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [confetti, setConfetti] = useState<ConfettiDot[]>([])
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 })
  const [animTime, setAnimTime] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Resolve world theme and palette
  const themeData: GameWorldTheme = useMemo(() => {
    return resolveGameTheme(themeKey)
  }, [themeKey])

  const mascot = themeData.mascot
  const themePalette = themeData.palette

  // Scan or resolve visual sprites from question
  const visualSprite: AssetSprite = useMemo(() => {
    const textToScan = `${question.questionText} ${question.visualPrompt || ''}`
    const found = findBestSprite(textToScan)
    if (found) return found
    if (question.imageUrl) {
      return {
        id: 'custom-image',
        name: question.visualPrompt || 'Hình ảnh học liệu',
        category: 'objects',
        url: question.imageUrl,
        keywords: [],
      }
    }
    return getDefaultThemeSprite(themeData.key)
  }, [question.questionText, question.visualPrompt, question.imageUrl, themeData.key])

  // Responsive scaling
  useEffect(() => {
    if (width && width > 0) {
      setScale(width / UI_SPECS.stageWidth)
      return
    }

    const handleResize = () => {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth
      const s = Math.min(1, Math.max(0.1, w / UI_SPECS.stageWidth))
      setScale(s)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [width])

  // Animation & FPS loop
  useEffect(() => {
    let animId: number
    let shakeTimer = 0

    const loop = (timestamp: number) => {
      setAnimTime(timestamp)

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
  }, [])

  // Audio narration
  const handleToggleSpeak = () => {
    if (isSpeaking) return
    setIsSpeaking(true)
    soundBus.playPop()
    speakVietnamese(question.audioText || question.questionText, () => {
      setIsSpeaking(false)
    })
  }

  // Option selection
  const handleSelectOption = (idx: number) => {
    if (status !== 'idle') return

    const option = question.options[idx]
    if (!option) return

    setSelectedIndex(idx)
    soundBus.playPop()

    const isCorrect = option.id === question.correctOptionId
    onAnswer?.(isCorrect, option.id)

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

  // Dynamic layout for 2, 3, or 4 options
  const optionLayouts = useMemo(() => {
    const count = question.options.length
    if (count <= 2) {
      return [
        { x: 380, y: 620, width: 550, height: 140 },
        { x: 990, y: 620, width: 550, height: 140 },
      ]
    }
    if (count === 3) {
      return [
        { x: 380, y: 550, width: 550, height: 130 },
        { x: 990, y: 550, width: 550, height: 130 },
        { x: 685, y: 710, width: 550, height: 130 },
      ]
    }
    return [
      { x: 380, y: 550, width: 550, height: 130 },
      { x: 990, y: 550, width: 550, height: 130 },
      { x: 380, y: 710, width: 550, height: 130 },
      { x: 990, y: 710, width: 550, height: 130 },
    ]
  }, [question.options.length])

  const stageWidth = width || UI_SPECS.stageWidth * scale
  const stageHeight = height || UI_SPECS.stageHeight * scale

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
        width={stageWidth}
        height={stageHeight}
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          <Group x={shakeOffset.x} y={shakeOffset.y}>
            {/* Header Theme Badge */}
            <Group x={360} y={45}>
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
                y={22}
                width={1200}
                text={`${themeData.icon} ${title.toUpperCase()} • ${subject} ${gradeLevel} ${themeData.icon}`}
                align="center"
                fontSize={30}
                fontStyle="bold"
                fill="#FFFFFF"
                fontFamily={UI_SPECS.fontFamily}
              />
            </Group>

            {/* Backdrop Question Card */}
            <Group x={260} y={150}>
              <Rect
                width={1400}
                height={360}
                cornerRadius={UI_SPECS.borderRadius}
                fill={themePalette.cardBg}
                stroke={themePalette.border}
                strokeWidth={UI_SPECS.borderWidth}
                shadowColor="rgba(0,0,0,0.12)"
                shadowBlur={16}
                shadowOffsetY={8}
              />

              {/* Decorative Theme Badges */}
              <Group x={45} y={40}>
                <Rect
                  x={-34}
                  y={-34}
                  width={68}
                  height={68}
                  cornerRadius={34}
                  fill="#FFE082"
                  stroke={themePalette.border}
                  strokeWidth={3}
                />
                <Text x={-18} y={-18} text={themeData.icon} fontSize={36} />
              </Group>

              {/* Question Text */}
              <Text
                x={125}
                y={30}
                width={1150}
                text={question.questionText}
                fontSize={34}
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
              <Group x={125} y={180}>
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
                <Group x={16} y={40}>
                  {[0, 1, 2].map((cIdx) => (
                    <SpriteItem
                      key={cIdx}
                      url={visualSprite.url}
                      x={cIdx * 56}
                      y={10}
                      size={54}
                      animPhase={cIdx * 0.4}
                      animTime={animTime}
                    />
                  ))}
                  <Text
                    x={0}
                    y={68}
                    text={`• 3 ${visualSprite.name}`}
                    fontSize={18}
                    fontStyle="bold"
                    fill="#78350F"
                    fontFamily={UI_SPECS.fontFamily}
                  />
                </Group>
              </Group>

              {/* Companion Hint Box */}
              <Group x={835} y={180}>
                <Rect
                  width={520}
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
                  width={480}
                  text={
                    question.visualPrompt
                      ? `Chủ đề bài học: ${question.visualPrompt}. Hãy quan sát kỹ tranh và chọn nhé!`
                      : `Bé hãy cùng ${mascot.name} đọc kỹ câu hỏi và chọn đáp án chính xác!`
                  }
                  fontSize={19}
                  lineHeight={1.4}
                  fill="#1E3A8A"
                  fontFamily={UI_SPECS.fontFamily}
                />
              </Group>
            </Group>

            {/* Answer Options Grid (Candy Gloss Buttons) */}
            {question.options.map((option, idx) => {
              const layout = optionLayouts[idx] || optionLayouts[0]
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
                  <Rect
                    x={31}
                    y={layout.height / 2 - 34}
                    width={68}
                    height={68}
                    cornerRadius={34}
                    fill={isSelected && status === 'correct' ? '#FFFFFF' : themePalette.primary}
                    stroke={themePalette.border}
                    strokeWidth={3}
                  />
                  <Text
                    x={47}
                    y={layout.height / 2 - 20}
                    text={letters[idx] || String(idx + 1)}
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
                    fontSize={34}
                    fontStyle="bold"
                    fill={textColor}
                    fontFamily={UI_SPECS.fontFamily}
                  />
                </Group>
              )
            })}

            {/* Mascot Companion with Idle Breathing and Squash & Stretch */}
            <MascotCompanion
              mascot={mascot}
              status={status}
              animTime={animTime}
            />

            {/* Confetti Explosion Layer on Correct Answer */}
            {confetti.map((dot) => (
              <Rect
                key={dot.id}
                x={dot.x}
                y={dot.y}
                width={dot.radius * 2}
                height={dot.radius * 2}
                cornerRadius={dot.radius}
                fill={dot.color}
                opacity={dot.alpha}
              />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}
