/**
 * CpfUniversalCanvas: Universal Themed Hardware Driver for Composable Primitives Framework (CPF).
 * 100% Dynamic Theme Engine (FARM, OCEAN, SPACE, FOREST/JUNGLE, CANDY).
 * Dynamic Procedural Konva Vector Backgrounds, Animated Mascot Companion,
 * Squash & Stretch Elastic Feel, Item Wobble, Star Burst Particles,
 * Floating Score Popups, Victory Confetti, and Real-time SoundBus Integration.
 */

import { useState, useEffect, useRef, useCallback, useMemo, type FC, type PointerEvent } from 'react'
import { Stage, Layer, Rect, Text, Group, Circle, Line, Shape } from 'react-konva'
import { CpfRuntimeEngine } from '../cpfRuntime'
import { CANDY_PALETTE, UI_SPECS } from '../assetPalette'
import { soundBus } from '../soundBus'
import {
  resolveGameTheme,
  GAME_WORLD_THEMES,
  type ThemeKey,
  type MascotConfig,
  type GameThemePalette,
} from '../themeResolver'
import type { CpfSceneGraph } from '../cpfTypes'

export interface CpfUniversalCanvasProps {
  sceneGraph?: CpfSceneGraph
  onFpsUpdate?: (fps: number) => void
  onScoreUpdate?: (score: number) => void
  onComplete?: (score: number) => void
}

interface FloatingPopup {
  id: number
  text: string
  x: number
  y: number
  vy: number
  opacity: number
  color: string
}

interface VictoryConfettiPiece {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  vRot: number
  color: string
  size: number
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: PROCEDURAL LAYERED THEMED BACKGROUND
// -----------------------------------------------------------------------------
interface ThemedBackgroundProps {
  themeKey: ThemeKey
  palette: GameThemePalette
  timeSec: number
  width: number
  height: number
}

const ThemedBackground: FC<ThemedBackgroundProps> = ({
  themeKey,
  palette,
  timeSec,
  width,
  height,
}) => {
  // Pre-computed stars for SPACE theme
  const spaceStars = useMemo(() => {
    return Array.from({ length: 55 }, (_, i) => ({
      id: i,
      x: ((i * 137.5 + 47) % width),
      y: ((i * 219.3 + 23) % height),
      radius: i % 4 === 0 ? 3.5 : i % 2 === 0 ? 2.5 : 1.6,
      phase: i * 0.75,
      isBright: i % 6 === 0,
    }))
  }, [width, height])

  // Pre-computed ambient bubbles for OCEAN theme
  const oceanBubbles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      initX: 80 + ((i * 92) % (width - 160)),
      initY: 150 + ((i * 47) % (height - 250)),
      radius: 6 + (i % 5) * 3,
      speed: 0.9 + (i % 4) * 0.5,
      phase: i * 0.8,
    }))
  }, [width, height])

  // Pre-computed candy sprinkles for CANDY theme
  const candySprinkles = useMemo(() => {
    const colors = ['#F43F5E', '#38BDF8', '#FACC15', '#A855F7', '#34D399']
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: 100 + ((i * 77) % (width - 200)),
      y: 780 + ((i * 29) % 240),
      color: colors[i % colors.length],
      width: 14,
      height: 6,
      rotation: (i * 35) % 360,
    }))
  }, [width, height])

  return (
    <Group>
      {/* Base Canvas Rect with World Palette */}
      <Rect width={width} height={height} fill={palette.background} />

      {/* ------------------------------------------------------------------- */}
      {/* 1. FARM THEME BACKGROUND                                            */}
      {/* ------------------------------------------------------------------- */}
      {themeKey === 'FARM' && (
        <Group>
          {/* Gentle Radiant Sun with Corona Halo */}
          <Group x={240} y={160}>
            <Circle radius={95} fill="#FFF9C4" opacity={0.35} />
            <Circle radius={75} fill="#FFF176" opacity={0.5} />
            <Circle
              radius={55}
              fill="#FDD835"
              stroke="#F57F17"
              strokeWidth={3}
              shadowColor="rgba(245, 127, 23, 0.3)"
              shadowBlur={20}
            />
          </Group>

          {/* Drifting Fluffy Clouds */}
          <Group x={((800 + timeSec * 16) % (width + 300)) - 200} y={130}>
            <Circle x={0} y={0} radius={45} fill="#FFFFFF" opacity={0.85} />
            <Circle x={35} y={-10} radius={55} fill="#FFFFFF" opacity={0.9} />
            <Circle x={75} y={0} radius={42} fill="#FFFFFF" opacity={0.85} />
          </Group>
          <Group x={((1500 + timeSec * 12) % (width + 300)) - 200} y={200}>
            <Circle x={0} y={0} radius={35} fill="#FFFFFF" opacity={0.75} />
            <Circle x={28} y={-8} radius={45} fill="#FFFFFF" opacity={0.8} />
            <Circle x={58} y={0} radius={32} fill="#FFFFFF" opacity={0.75} />
          </Group>

          {/* Far Rolling Green Hills (Pastel Green) */}
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath()
              ctx.moveTo(0, 680)
              ctx.bezierCurveTo(400, 600, 800, 720, 1200, 640)
              ctx.bezierCurveTo(1500, 580, 1750, 660, width, 620)
              ctx.lineTo(width, height)
              ctx.lineTo(0, height)
              ctx.closePath()
              ctx.fillStyle = '#C8E6C9'
              ctx.fill()
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Near Rolling Green Meadow Hills */}
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath()
              ctx.moveTo(0, 770)
              ctx.bezierCurveTo(350, 720, 750, 820, 1150, 750)
              ctx.bezierCurveTo(1500, 690, 1750, 780, width, 740)
              ctx.lineTo(width, height)
              ctx.lineTo(0, height)
              ctx.closePath()
              ctx.fillStyle = '#81C784'
              ctx.fill()
              ctx.lineWidth = 4
              ctx.strokeStyle = '#388E3C'
              ctx.stroke()
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Wooden Picket Fence Posts Across the Meadow */}
          {Array.from({ length: 11 }).map((_, idx) => {
            const fenceX = 80 + idx * 175
            const fenceY = 740 + Math.sin(idx * 0.7) * 20
            return (
              <Group key={idx} x={fenceX} y={fenceY}>
                <Rect
                  x={-8}
                  y={-40}
                  width={16}
                  height={55}
                  cornerRadius={4}
                  fill="#8D6E63"
                  stroke="#5D4037"
                  strokeWidth={2}
                />
                <Circle x={0} y={-40} radius={8} fill="#8D6E63" stroke="#5D4037" strokeWidth={2} />
              </Group>
            )
          })}
          {/* Wooden Rails */}
          <Line
            points={[60, 730, width - 60, 750]}
            stroke="#6D4C41"
            strokeWidth={5}
            lineCap="round"
          />
          <Line
            points={[60, 748, width - 60, 768]}
            stroke="#6D4C41"
            strokeWidth={5}
            lineCap="round"
          />

          {/* Top Apple Tree Canopy Foliage */}
          <Group x={120} y={0}>
            <Circle x={-50} y={-20} radius={110} fill="#4CAF50" opacity={0.9} />
            <Circle x={60} y={-10} radius={90} fill="#66BB6A" opacity={0.95} />
            <Circle x={140} y={20} radius={70} fill="#81C784" opacity={0.9} />
            {/* Red Apples in Tree */}
            <Circle x={-20} y={60} radius={12} fill="#EF4444" stroke="#B91C1C" strokeWidth={2} />
            <Circle x={80} y={40} radius={13} fill="#EF4444" stroke="#B91C1C" strokeWidth={2} />
            <Circle x={130} y={70} radius={11} fill="#EF4444" stroke="#B91C1C" strokeWidth={2} />
          </Group>
        </Group>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 2. OCEAN THEME BACKGROUND                                           */}
      {/* ------------------------------------------------------------------- */}
      {themeKey === 'OCEAN' && (
        <Group>
          {/* Deep Water Sunlight Rays from Surface */}
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath()
              ctx.moveTo(200, 0)
              ctx.lineTo(450, 0)
              ctx.lineTo(650, height)
              ctx.lineTo(350, height)
              ctx.closePath()
              ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
              ctx.fill()

              ctx.beginPath()
              ctx.moveTo(850, 0)
              ctx.lineTo(1050, 0)
              ctx.lineTo(1350, height)
              ctx.lineTo(1100, height)
              ctx.closePath()
              ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
              ctx.fill()
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Ambient Rising Sea Bubbles */}
          {oceanBubbles.map((b) => {
            const currentY =
              (b.initY - timeSec * b.speed * 45) % (height + 120)
            const resolvedY = currentY < -50 ? height + 50 : currentY
            const wobbleX = b.initX + Math.sin(timeSec * 2.2 + b.phase) * 16

            return (
              <Group key={b.id} x={wobbleX} y={resolvedY}>
                <Circle
                  radius={b.radius}
                  fill="rgba(255, 255, 255, 0.28)"
                  stroke="rgba(255, 255, 255, 0.75)"
                  strokeWidth={2}
                />
                <Circle
                  x={-b.radius * 0.35}
                  y={-b.radius * 0.35}
                  radius={b.radius * 0.28}
                  fill="#FFFFFF"
                />
              </Group>
            )
          })}

          {/* Sandy Seabed Dunes at Bottom */}
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath()
              ctx.moveTo(0, 880)
              ctx.bezierCurveTo(400, 830, 850, 920, 1300, 860)
              ctx.bezierCurveTo(1600, 820, 1800, 890, width, 870)
              ctx.lineTo(width, height)
              ctx.lineTo(0, height)
              ctx.closePath()
              ctx.fillStyle = '#FFE082'
              ctx.fill()
              ctx.lineWidth = 4
              ctx.strokeStyle = '#FFB300'
              ctx.stroke()
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Swaying Underwater Kelp / Seaweed */}
          {Array.from({ length: 8 }).map((_, idx) => {
            const kelpX = 120 + idx * 240
            const sway = Math.sin(timeSec * 2.4 + idx) * 22
            return (
              <Group key={idx} x={kelpX} y={height}>
                <Line
                  points={[0, 0, sway * 0.4, -90, sway, -170, sway * 1.4, -250]}
                  stroke={idx % 2 === 0 ? '#00897B' : '#26A69A'}
                  strokeWidth={14}
                  lineCap="round"
                  tension={0.5}
                />
                {/* Coral Starfish on Seabed */}
                {idx % 3 === 0 && (
                  <Circle x={sway + 30} y={-40} radius={14} fill="#FF7043" stroke="#D84315" strokeWidth={2} />
                )}
              </Group>
            )
          })}
        </Group>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 3. SPACE THEME BACKGROUND                                           */}
      {/* ------------------------------------------------------------------- */}
      {themeKey === 'SPACE' && (
        <Group>
          {/* Glowing Cosmic Nebulae Clusters */}
          <Circle x={450} y={320} radius={260} fill="#8B5CF6" opacity={0.16} />
          <Circle x={1450} y={450} radius={320} fill="#38BDF8" opacity={0.14} />
          <Circle x={950} y={750} radius={280} fill="#EC4899" opacity={0.12} />

          {/* Twinkling Starfield */}
          {spaceStars.map((s) => {
            const pulse = 0.3 + 0.7 * Math.sin(timeSec * 3 + s.phase) ** 2
            return (
              <Group key={s.id} x={s.x} y={s.y} opacity={pulse}>
                <Circle
                  radius={s.radius}
                  fill={s.isBright ? '#FDE047' : '#FFFFFF'}
                  shadowColor={s.isBright ? '#FDE047' : '#38BDF8'}
                  shadowBlur={s.isBright ? 8 : 4}
                />
                {s.isBright && (
                  <Group>
                    <Line
                      points={[-s.radius * 2.5, 0, s.radius * 2.5, 0]}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                    <Line
                      points={[0, -s.radius * 2.5, 0, s.radius * 2.5]}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                  </Group>
                )}
              </Group>
            )
          })}

          {/* Ringed Giant Saturn Planet at Top-Right */}
          <Group x={1580} y={230}>
            {/* Back Ring Half */}
            <Shape
              sceneFunc={(ctx, shape) => {
                ctx.beginPath()
                ctx.ellipse(0, 0, 130, 36, -Math.PI / 8, Math.PI, Math.PI * 2)
                ctx.lineWidth = 14
                ctx.strokeStyle = '#38BDF8'
                ctx.stroke()
                ctx.fillStrokeShape(shape)
              }}
            />
            {/* Planet Sphere */}
            <Circle
              radius={68}
              fill="#7C3AED"
              stroke="#4C1D95"
              strokeWidth={4}
              shadowColor="rgba(124, 58, 237, 0.4)"
              shadowBlur={20}
            />
            {/* Planet Surface Bands */}
            <Line points={[-62, -15, 62, -15]} stroke="#A78BFA" strokeWidth={6} />
            <Line points={[-65, 8, 65, 8]} stroke="#C4B5FD" strokeWidth={5} />
            {/* Front Ring Half */}
            <Shape
              sceneFunc={(ctx, shape) => {
                ctx.beginPath()
                ctx.ellipse(0, 0, 130, 36, -Math.PI / 8, 0, Math.PI)
                ctx.lineWidth = 14
                ctx.strokeStyle = '#38BDF8'
                ctx.stroke()
                ctx.fillStrokeShape(shape)
              }}
            />
          </Group>

          {/* Distant Cratered Asteroid Moon */}
          <Group x={280} y={260}>
            <Circle radius={36} fill="#64748B" stroke="#334155" strokeWidth={3} />
            <Circle x={-10} y={-8} radius={8} fill="#475569" />
            <Circle x={12} y={10} radius={6} fill="#475569" />
            <Circle x={-6} y={14} radius={5} fill="#475569" />
          </Group>
        </Group>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 4. FOREST / JUNGLE THEME BACKGROUND                                 */}
      {/* ------------------------------------------------------------------- */}
      {(themeKey === 'FOREST' || themeKey === 'JUNGLE') && (
        <Group>
          {/* Top Hanging Jungle Canopy Arches */}
          <Group y={0}>
            <Circle x={200} y={-20} radius={140} fill="#2E7D32" opacity={0.92} />
            <Circle x={550} y={-40} radius={170} fill="#1B5E20" opacity={0.95} />
            <Circle x={950} y={-30} radius={150} fill="#388E3C" opacity={0.9} />
            <Circle x={1400} y={-50} radius={180} fill="#2E7D32" opacity={0.95} />
            <Circle x={1780} y={-20} radius={140} fill="#1B5E20" opacity={0.9} />
          </Group>

          {/* Dangling Jungle Vines / Lianas */}
          {Array.from({ length: 6 }).map((_, idx) => {
            const vineX = 180 + idx * 300
            const sway = Math.sin(timeSec * 2.2 + idx) * 15
            return (
              <Group key={idx} x={vineX} y={0}>
                <Line
                  points={[0, 0, sway * 0.5, 80, sway, 160, sway * 0.7, 240]}
                  stroke="#1B5E20"
                  strokeWidth={5}
                  tension={0.5}
                />
                {/* Leaves on Vine */}
                <Circle x={sway * 0.5 - 8} y={80} radius={7} fill="#4CAF50" />
                <Circle x={sway + 8} y={160} radius={7} fill="#81C784" />
              </Group>
            )
          })}

          {/* Distant Misty Jungle Ridge */}
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath()
              ctx.moveTo(0, 720)
              ctx.bezierCurveTo(450, 660, 900, 760, 1350, 690)
              ctx.bezierCurveTo(1600, 650, 1780, 720, width, 700)
              ctx.lineTo(width, height)
              ctx.lineTo(0, height)
              ctx.closePath()
              ctx.fillStyle = '#A7F3D0'
              ctx.fill()
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Grassy Forest Floor with Wildflowers & Mushrooms */}
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath()
              ctx.moveTo(0, 800)
              ctx.bezierCurveTo(400, 760, 850, 850, 1300, 790)
              ctx.bezierCurveTo(1600, 750, 1800, 820, width, 800)
              ctx.lineTo(width, height)
              ctx.lineTo(0, height)
              ctx.closePath()
              ctx.fillStyle = '#43A047'
              ctx.fill()
              ctx.lineWidth = 4
              ctx.strokeStyle = '#2E7D32'
              ctx.stroke()
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Red Mushrooms with White Polka Dots */}
          <Group x={350} y={840}>
            {/* Stem */}
            <Rect x={-10} y={0} width={20} height={30} cornerRadius={4} fill="#FFF9C4" stroke="#5D4037" strokeWidth={2} />
            {/* Cap */}
            <Shape
              sceneFunc={(ctx, shape) => {
                ctx.beginPath()
                ctx.arc(0, 0, 24, Math.PI, Math.PI * 2)
                ctx.closePath()
                ctx.fillStyle = '#EF4444'
                ctx.fill()
                ctx.lineWidth = 2
                ctx.strokeStyle = '#B91C1C'
                ctx.stroke()
                ctx.fillStrokeShape(shape)
              }}
            />
            <Circle x={-10} y={-10} radius={4} fill="#FFFFFF" />
            <Circle x={8} y={-12} radius={3.5} fill="#FFFFFF" />
            <Circle x={0} y={-16} radius={4} fill="#FFFFFF" />
          </Group>
        </Group>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 5. CANDY THEME BACKGROUND                                           */}
      {/* ------------------------------------------------------------------- */}
      {themeKey === 'CANDY' && (
        <Group>
          {/* Puffy Sugar Clouds */}
          <Group x={380} y={150}>
            <Circle x={0} y={0} radius={50} fill="#FFFFFF" opacity={0.9} />
            <Circle x={45} y={-12} radius={65} fill="#FFFFFF" opacity={0.95} />
            <Circle x={90} y={0} radius={48} fill="#FFFFFF" opacity={0.9} />
          </Group>
          <Group x={1420} y={180}>
            <Circle x={0} y={0} radius={45} fill="#FFFFFF" opacity={0.9} />
            <Circle x={40} y={-10} radius={58} fill="#FFFFFF" opacity={0.95} />
            <Circle x={80} y={0} radius={42} fill="#FFFFFF" opacity={0.9} />
          </Group>

          {/* Marshmallow Rolling Hills (Pastel Pink & Lavender) */}
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath()
              ctx.moveTo(0, 710)
              ctx.bezierCurveTo(450, 640, 950, 760, 1400, 680)
              ctx.bezierCurveTo(1650, 630, 1800, 710, width, 690)
              ctx.lineTo(width, height)
              ctx.lineTo(0, height)
              ctx.closePath()
              ctx.fillStyle = '#EDE9FE'
              ctx.fill()
              ctx.fillStrokeShape(shape)
            }}
          />
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath()
              ctx.moveTo(0, 790)
              ctx.bezierCurveTo(400, 740, 850, 840, 1300, 770)
              ctx.bezierCurveTo(1600, 720, 1800, 810, width, 780)
              ctx.lineTo(width, height)
              ctx.lineTo(0, height)
              ctx.closePath()
              ctx.fillStyle = '#FCE7F3'
              ctx.fill()
              ctx.lineWidth = 4
              ctx.strokeStyle = '#F472B6'
              ctx.stroke()
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Giant Swirl Lollipops */}
          {/* Left Red-Pink Swirl Lollipop */}
          <Group x={240} y={690}>
            <Rect x={-8} y={0} width={16} height={140} cornerRadius={6} fill="#FFFFFF" stroke="#BE185D" strokeWidth={2} />
            <Circle radius={60} fill="#F43F5E" stroke="#9F1239" strokeWidth={3} />
            <Circle radius={44} fill="#FB7185" stroke="#9F1239" strokeWidth={2.5} />
            <Circle radius={28} fill="#FDA4AF" stroke="#9F1239" strokeWidth={2} />
            <Circle radius={14} fill="#FFFFFF" stroke="#9F1239" strokeWidth={2} />
          </Group>

          {/* Right Sky Blue Swirl Lollipop */}
          <Group x={1680} y={670}>
            <Rect x={-8} y={0} width={16} height={150} cornerRadius={6} fill="#FFFFFF" stroke="#0369A1" strokeWidth={2} />
            <Circle radius={55} fill="#0284C7" stroke="#0C4A6E" strokeWidth={3} />
            <Circle radius={40} fill="#38BDF8" stroke="#0C4A6E" strokeWidth={2.5} />
            <Circle radius={25} fill="#BAE6FD" stroke="#0C4A6E" strokeWidth={2} />
            <Circle radius={12} fill="#FFFFFF" stroke="#0C4A6E" strokeWidth={2} />
          </Group>

          {/* Candy Sprinkles Along Hills */}
          {candySprinkles.map((sp) => (
            <Rect
              key={sp.id}
              x={sp.x}
              y={sp.y}
              width={sp.width}
              height={sp.height}
              cornerRadius={3}
              fill={sp.color}
              rotation={sp.rotation}
            />
          ))}
        </Group>
      )}
    </Group>
  )
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: DYNAMIC ANIMATED MASCOT COMPANION
// -----------------------------------------------------------------------------
interface ThemedMascotProps {
  mascot: MascotConfig
  themeKey: ThemeKey
  x: number
  y: number
  scale?: number
  isExcited: boolean
  timeSec: number
}

const ThemedMascot: FC<ThemedMascotProps> = ({
  mascot,
  themeKey,
  x,
  y,
  scale = 1,
  isExcited,
  timeSec,
}) => {
  // Idle breathing sine wave + excited bounce
  const breath = 1 + Math.sin(timeSec * 3) * 0.03
  const bobY = Math.sin(timeSec * 3) * 3
  const excitedJump = isExcited ? -Math.abs(Math.sin(timeSec * 12)) * 22 : 0

  const resolvedScale = scale * breath
  const resolvedY = y + bobY + excitedJump

  const mascotId = mascot.id.toLowerCase()

  return (
    <Group x={x} y={resolvedY} scaleX={resolvedScale} scaleY={resolvedScale}>
      {/* ------------------------------------------------------------------- */}
      {/* PIPPY THE CHICK (FARM & CANDY)                                      */}
      {/* ------------------------------------------------------------------- */}
      {(mascotId === 'pippy' || themeKey === 'FARM' || themeKey === 'CANDY') && (
        <Group>
          {/* Comb Tufts on Head */}
          <Circle x={-7} y={-36} radius={6} fill="#FF7043" stroke="#374151" strokeWidth={2} />
          <Circle x={0} y={-42} radius={7} fill="#FF7043" stroke="#374151" strokeWidth={2} />
          <Circle x={7} y={-36} radius={6} fill="#FF7043" stroke="#374151" strokeWidth={2} />

          {/* Yellow Chubby Body */}
          <Circle
            radius={34}
            fill="#FDD835"
            stroke="#374151"
            strokeWidth={3}
            shadowColor="rgba(0,0,0,0.18)"
            shadowBlur={8}
            shadowOffsetY={4}
          />
          {/* Light Belly Patch */}
          <Circle x={0} y={8} radius={22} fill="#FFF9C4" />

          {/* Rosy Cheeks */}
          <Circle x={-18} y={4} radius={6} fill="#FF8A80" opacity={0.65} />
          <Circle x={18} y={4} radius={6} fill="#FF8A80" opacity={0.65} />

          {/* Wings on Sides (Flapping gently) */}
          <Shape
            sceneFunc={(ctx, shape) => {
              const flap = Math.sin(timeSec * (isExcited ? 14 : 4)) * 6
              ctx.beginPath()
              ctx.ellipse(-32, 2 + flap, 10, 16, Math.PI / 6, 0, Math.PI * 2)
              ctx.fillStyle = '#FBC02D'
              ctx.fill()
              ctx.lineWidth = 2.5
              ctx.strokeStyle = '#374151'
              ctx.stroke()

              ctx.beginPath()
              ctx.ellipse(32, 2 - flap, 10, 16, -Math.PI / 6, 0, Math.PI * 2)
              ctx.fillStyle = '#FBC02D'
              ctx.fill()
              ctx.lineWidth = 2.5
              ctx.strokeStyle = '#374151'
              ctx.stroke()
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Eyes (Smiling ^‿^ when excited) */}
          {isExcited ? (
            <Group>
              <Line points={[-16, -6, -11, -12, -6, -6]} stroke="#374151" strokeWidth={3} tension={0.4} />
              <Line points={[6, -6, 11, -12, 16, -6]} stroke="#374151" strokeWidth={3} tension={0.4} />
            </Group>
          ) : (
            <Group>
              <Circle x={-11} y={-6} radius={4.5} fill="#374151" />
              <Circle x={-9.5} y={-8} radius={1.6} fill="#FFFFFF" />
              <Circle x={11} y={-6} radius={4.5} fill="#374151" />
              <Circle x={12.5} y={-8} radius={1.6} fill="#FFFFFF" />
            </Group>
          )}

          {/* Orange Triangle Beak */}
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath()
              ctx.moveTo(-7, 2)
              ctx.lineTo(7, 2)
              ctx.lineTo(0, 12)
              ctx.closePath()
              ctx.fillStyle = '#FF7043'
              ctx.fill()
              ctx.lineWidth = 2
              ctx.strokeStyle = '#374151'
              ctx.stroke()
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Orange Little Feet */}
          <Line points={[-10, 32, -14, 40]} stroke="#FF7043" strokeWidth={3} lineCap="round" />
          <Line points={[-10, 32, -8, 40]} stroke="#FF7043" strokeWidth={3} lineCap="round" />
          <Line points={[10, 32, 8, 40]} stroke="#FF7043" strokeWidth={3} lineCap="round" />
          <Line points={[10, 32, 14, 40]} stroke="#FF7043" strokeWidth={3} lineCap="round" />
        </Group>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SAM THE SEA TURTLE (OCEAN)                                          */}
      {/* ------------------------------------------------------------------- */}
      {mascotId === 'sam' && themeKey === 'OCEAN' && (
        <Group>
          {/* Turtle Flippers (Paddling motion) */}
          <Shape
            sceneFunc={(ctx, shape) => {
              const pad = Math.sin(timeSec * 4) * 12
              ctx.beginPath()
              ctx.ellipse(32 + pad * 0.4, 20, 16, 8, Math.PI / 4, 0, Math.PI * 2)
              ctx.ellipse(-32 - pad * 0.4, 20, 16, 8, -Math.PI / 4, 0, Math.PI * 2)
              ctx.fillStyle = '#81C784'
              ctx.fill()
              ctx.lineWidth = 2.5
              ctx.strokeStyle = '#1B5E20'
              ctx.stroke()
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Green Dome Shell */}
          <Circle
            radius={34}
            fill="#2E7D32"
            stroke="#1B5E20"
            strokeWidth={3}
            shadowColor="rgba(0,0,0,0.2)"
            shadowBlur={8}
            shadowOffsetY={4}
          />
          <Circle radius={25} fill="#4CAF50" stroke="#1B5E20" strokeWidth={2} />

          {/* Turtle Head */}
          <Circle x={26} y={-18} radius={18} fill="#81C784" stroke="#1B5E20" strokeWidth={2.5} />

          {/* Eyes (Smiling ^‿^ when excited) */}
          {isExcited ? (
            <Line points={[22, -20, 26, -24, 30, -20]} stroke="#1B5E20" strokeWidth={3} tension={0.4} />
          ) : (
            <Group>
              <Circle x={26} y={-20} radius={3.5} fill="#1B5E20" />
              <Circle x={27.5} y={-21.5} radius={1.3} fill="#FFFFFF" />
            </Group>
          )}
          {/* Friendly Smile */}
          <Line points={[26, -13, 31, -13, 34, -16]} stroke="#1B5E20" strokeWidth={2} tension={0.3} />
        </Group>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* LEO THE ASTRONAUT (SPACE)                                           */}
      {/* ------------------------------------------------------------------- */}
      {mascotId === 'leo' && themeKey === 'SPACE' && (
        <Group>
          {/* Space Suit Body */}
          <Rect
            x={-22}
            y={-6}
            width={44}
            height={44}
            cornerRadius={14}
            fill="#F1F5F9"
            stroke="#1E293B"
            strokeWidth={3}
          />
          {/* Chest Control Badge */}
          <Rect x={-12} y={8} width={24} height={14} cornerRadius={4} fill="#6366F1" />
          <Circle x={-5} y={15} radius={2.2} fill="#38BDF8" />
          <Circle x={4} y={15} radius={2.2} fill="#FACC15" />

          {/* White Helmet */}
          <Circle
            x={0}
            y={-26}
            radius={30}
            fill="#FFFFFF"
            stroke="#1E293B"
            strokeWidth={3}
            shadowColor="rgba(0,0,0,0.25)"
            shadowBlur={8}
            shadowOffsetY={4}
          />

          {/* Antenna with Blinking LED */}
          <Line points={[0, -56, 0, -66]} stroke="#94A3B8" strokeWidth={3} />
          <Circle
            x={0}
            y={-69}
            radius={4.5}
            fill={Math.sin(timeSec * 7) > 0 ? '#EF4444' : '#F87171'}
            stroke="#1E293B"
            strokeWidth={1.5}
          />

          {/* Cyan Glass Visor */}
          <Rect
            x={-18}
            y={-37}
            width={36}
            height={22}
            cornerRadius={10}
            fill="#00E5FF"
            stroke="#0891B2"
            strokeWidth={2}
          />
          {/* Visor Glare Shine */}
          <Line points={[-12, -33, -3, -33]} stroke="#FFFFFF" strokeWidth={2} lineCap="round" />

          {/* Eyes on Visor */}
          {isExcited ? (
            <Group>
              <Line points={[-11, -26, -7, -29, -3, -26]} stroke="#0F172A" strokeWidth={2.5} tension={0.4} />
              <Line points={[3, -26, 7, -29, 11, -26]} stroke="#0F172A" strokeWidth={2.5} tension={0.4} />
            </Group>
          ) : (
            <Group>
              <Circle x={-7} y={-26} radius={2.8} fill="#0F172A" />
              <Circle x={7} y={-26} radius={2.8} fill="#0F172A" />
            </Group>
          )}

          {/* Glove Arms */}
          <Rect x={-32} y={2} width={12} height={20} cornerRadius={6} fill="#E2E8F0" stroke="#1E293B" strokeWidth={2.5} />
          <Rect x={20} y={2} width={12} height={20} cornerRadius={6} fill="#E2E8F0" stroke="#1E293B" strokeWidth={2.5} />
        </Group>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MIMI THE TABBY CAT (FOREST & JUNGLE)                                */}
      {/* ------------------------------------------------------------------- */}
      {mascotId === 'mimi' && (themeKey === 'FOREST' || themeKey === 'JUNGLE') && (
        <Group>
          {/* Swishing Cat Tail */}
          <Shape
            sceneFunc={(ctx, shape) => {
              const tailSway = Math.sin(timeSec * 5) * 18
              ctx.beginPath()
              ctx.moveTo(-24, 15)
              ctx.quadraticCurveTo(-42, 20 + tailSway, -48, 6 + tailSway)
              ctx.lineWidth = 7
              ctx.strokeStyle = '#FB923C'
              ctx.lineCap = 'round'
              ctx.stroke()
              ctx.lineWidth = 11
              ctx.strokeStyle = '#431407'
              ctx.globalCompositeOperation = 'destination-over'
              ctx.stroke()
              ctx.globalCompositeOperation = 'source-over'
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Pointy Cat Ears */}
          <Line points={[-24, -18, -16, -38, -6, -26]} fill="#FB923C" stroke="#431407" strokeWidth={2.5} closed />
          <Line points={[-20, -20, -16, -33, -9, -25]} fill="#FDA4AF" closed />
          <Line points={[6, -26, 16, -38, 24, -18]} fill="#FB923C" stroke="#431407" strokeWidth={2.5} closed />
          <Line points={[9, -25, 16, -33, 20, -20]} fill="#FDA4AF" closed />

          {/* Orange Cat Head */}
          <Circle
            radius={32}
            fill="#FB923C"
            stroke="#431407"
            strokeWidth={3}
            shadowColor="rgba(0,0,0,0.18)"
            shadowBlur={8}
            shadowOffsetY={4}
          />
          {/* White Muzzle */}
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath()
              ctx.ellipse(0, 10, 14, 9, 0, 0, Math.PI * 2)
              ctx.fillStyle = '#FFFBEB'
              ctx.fill()
              ctx.fillStrokeShape(shape)
            }}
          />

          {/* Rosy Cheeks */}
          <Circle x={-18} y={8} radius={5} fill="#FDA4AF" opacity={0.65} />
          <Circle x={18} y={8} radius={5} fill="#FDA4AF" opacity={0.65} />

          {/* Eyes (Smiling ^‿^ when excited) */}
          {isExcited ? (
            <Group>
              <Line points={[-16, -4, -11, -10, -6, -4]} stroke="#431407" strokeWidth={3} tension={0.4} />
              <Line points={[6, -4, 11, -10, 16, -4]} stroke="#431407" strokeWidth={3} tension={0.4} />
            </Group>
          ) : (
            <Group>
              <Circle x={-11} y={-4} radius={4.5} fill="#1E293B" />
              <Circle x={-9.5} y={-5.5} radius={1.5} fill="#FFFFFF" />
              <Circle x={11} y={-4} radius={4.5} fill="#1E293B" />
              <Circle x={12.5} y={-5.5} radius={1.5} fill="#FFFFFF" />
            </Group>
          )}

          {/* Pink Tiny Nose */}
          <Line points={[-3, 6, 3, 6, 0, 9]} fill="#E11D48" closed />

          {/* Whisker Lines */}
          <Line points={[-14, 7, -30, 4]} stroke="#431407" strokeWidth={2} />
          <Line points={[-14, 11, -30, 14]} stroke="#431407" strokeWidth={2} />
          <Line points={[14, 7, 30, 4]} stroke="#431407" strokeWidth={2} />
          <Line points={[14, 11, 30, 14]} stroke="#431407" strokeWidth={2} />
        </Group>
      )}

      {/* Reactive Reaction Emoji / Heart Floating Overhead */}
      {isExcited && (
        <Group x={18} y={-50}>
          <Circle radius={16} fill="#FFFFFF" stroke="#374151" strokeWidth={2} />
          <Text
            x={-14}
            y={-10}
            width={28}
            text="⭐"
            align="center"
            fontSize={18}
          />
        </Group>
      )}
    </Group>
  )
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT: CPF UNIVERSAL CANVAS
// -----------------------------------------------------------------------------
export const CpfUniversalCanvas: FC<CpfUniversalCanvasProps> = ({
  sceneGraph,
  onFpsUpdate,
  onScoreUpdate,
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const runtimeRef = useRef<CpfRuntimeEngine | null>(null)
  const [, setTickCounter] = useState(0) // Forces Konva redraw each RAF

  // Performance telemetry
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(performance.now())
  const lastFrameTimeRef = useRef(performance.now())
  const lastScoreRef = useRef(0)
  const timeSecRef = useRef(0)

  // Juiciness & Game Feel refs
  const [isExcited, setIsExcited] = useState(false)
  const excitedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const basketSquashRef = useRef({ scaleX: 1, scaleY: 1 })
  const floatingPopupsRef = useRef<FloatingPopup[]>([])
  const victoryConfettiRef = useRef<VictoryConfettiPiece[]>([])
  const hasCompletedRef = useRef(false)
  const popupSeqRef = useRef(0)

  // ---------------------------------------------------------------------------
  // 1. DYNAMIC THEME RESOLUTION
  // ---------------------------------------------------------------------------
  const resolvedThemeData = useMemo(() => {
    const rawTheme = (sceneGraph?.metadata?.theme as string)?.toUpperCase()
    if (rawTheme && rawTheme in GAME_WORLD_THEMES) {
      return GAME_WORLD_THEMES[rawTheme as ThemeKey]
    }
    return resolveGameTheme(
      sceneGraph?.title || sceneGraph?.description || '',
      sceneGraph?.pedagogicalSubject
    )
  }, [sceneGraph])

  const themeKey = resolvedThemeData.key
  const palette = resolvedThemeData.palette
  const mascot = resolvedThemeData.mascot

  // Initialize virtual runtime
  if (!runtimeRef.current) {
    runtimeRef.current = new CpfRuntimeEngine(sceneGraph)
  }

  // Update runtime when sceneGraph changes
  useEffect(() => {
    if (runtimeRef.current && sceneGraph) {
      runtimeRef.current.initFromGraph(sceneGraph)
      hasCompletedRef.current = false
      victoryConfettiRef.current = []
      floatingPopupsRef.current = []
      lastScoreRef.current = 0
    }
  }, [sceneGraph])

  // Responsive stage auto-scaling
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

  // Spawns full-screen celebration confetti when victory is reached
  const spawnVictoryCelebration = useCallback(() => {
    const colors = [
      '#FF5252',
      '#FFD600',
      '#00E676',
      '#00B0FF',
      '#FF4081',
      '#7C4DFF',
      '#FFFFFF',
    ]
    const pieces: VictoryConfettiPiece[] = []
    for (let i = 0; i < 70; i++) {
      pieces.push({
        id: i,
        x: Math.random() * UI_SPECS.stageWidth,
        y: -30 - Math.random() * 400,
        vx: (Math.random() - 0.5) * 4,
        vy: 3 + Math.random() * 6,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 14 + Math.random() * 12,
      })
    }
    victoryConfettiRef.current = pieces
  }, [])

  // Spawns rising floating score text (+10 ⭐)
  const spawnFloatingScore = useCallback((text: string, x: number, y: number) => {
    floatingPopupsRef.current.push({
      id: ++popupSeqRef.current,
      text,
      x,
      y,
      vy: -2.4,
      opacity: 1,
      color: '#FFD600',
    })
  }, [])

  // ---------------------------------------------------------------------------
  // 2. 60 FPS REQUEST ANIMATION FRAME LOOP
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let animId: number

    const frameLoop = (now: number) => {
      const dtSec = Math.min(0.05, (now - lastFrameTimeRef.current) / 1000)
      lastFrameTimeRef.current = now
      timeSecRef.current += dtSec

      // 1. Tick Virtual Runtime
      if (runtimeRef.current) {
        const prevScore = lastScoreRef.current
        runtimeRef.current.tick(dtSec)
        const curScore = runtimeRef.current.score

        if (lastScoreRef.current !== curScore) {
          const delta = curScore - prevScore
          lastScoreRef.current = curScore
          onScoreUpdate?.(curScore)

          if (delta > 0) {
            // Correct Score Event: Trigger Juice & Reactions
            setIsExcited(true)
            if (excitedTimeoutRef.current) clearTimeout(excitedTimeoutRef.current)
            excitedTimeoutRef.current = setTimeout(() => setIsExcited(false), 850)

            // Elastic squash deformation
            basketSquashRef.current = { scaleX: 1.2, scaleY: 0.82 }

            // Audio trigger
            soundBus.playHit()

            // Spawn floating score popup
            const hitX =
              runtimeRef.current.mechanicType === 'FALLING_CATCHER'
                ? runtimeRef.current.basket.x
                : 960
            const hitY =
              runtimeRef.current.mechanicType === 'FALLING_CATCHER'
                ? runtimeRef.current.basket.y - 40
                : 450
            spawnFloatingScore('+10 ⭐', hitX, hitY)
          }

          // Target score reached: Complete Level
          if (curScore >= 3 && !hasCompletedRef.current) {
            hasCompletedRef.current = true
            soundBus.playFanfare()
            spawnVictoryCelebration()
            onComplete?.(curScore)
          }
        }
      }

      // 2. Smoothly Lerp Basket Squash & Stretch back to 1.0
      basketSquashRef.current.scaleX += (1.0 - basketSquashRef.current.scaleX) * 0.16
      basketSquashRef.current.scaleY += (1.0 - basketSquashRef.current.scaleY) * 0.16

      // 3. Update Floating Popups
      for (let i = floatingPopupsRef.current.length - 1; i >= 0; i--) {
        const p = floatingPopupsRef.current[i]
        p.y += p.vy * dtSec * 60
        p.opacity -= dtSec * 1.25 // Fades over ~800ms
        if (p.opacity <= 0) {
          floatingPopupsRef.current.splice(i, 1)
        }
      }

      // 4. Update Victory Confetti
      if (hasCompletedRef.current) {
        for (const c of victoryConfettiRef.current) {
          c.y += c.vy * dtSec * 60
          c.x += c.vx * dtSec * 60
          c.rotation += c.vRot
          if (c.y > UI_SPECS.stageHeight + 40) {
            c.y = -20
            c.x = Math.random() * UI_SPECS.stageWidth
          }
        }
      }

      // 5. Measure FPS Telemetry
      frameCountRef.current++
      if (now - lastFpsTimeRef.current >= 500) {
        const measuredFps = Math.round(
          (frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)
        )
        onFpsUpdate?.(Math.min(60, measuredFps))
        frameCountRef.current = 0
        lastFpsTimeRef.current = now
      }

      // 6. Trigger Konva Redraw
      setTickCounter((prev) => (prev + 1) % 1000000)
      animId = requestAnimationFrame(frameLoop)
    }

    animId = requestAnimationFrame(frameLoop)
    return () => {
      cancelAnimationFrame(animId)
      if (excitedTimeoutRef.current) clearTimeout(excitedTimeoutRef.current)
    }
  }, [onFpsUpdate, onScoreUpdate, onComplete, spawnFloatingScore, spawnVictoryCelebration])

  // Coordinate Translation from Screen to Virtual Canvas
  const getStagePointerPos = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return null
      const rect = containerRef.current.getBoundingClientRect()
      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top
      return {
        x: clientX / scale,
        y: clientY / scale,
      }
    },
    [scale]
  )

  const runtime = runtimeRef.current!
  const mechanic = runtime.mechanicType
  const timeSec = timeSecRef.current

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const pos = getStagePointerPos(e)
    if (!pos || !runtimeRef.current) return

    if (mechanic === 'PHYSICS_SLING_ARCHERY') {
      runtimeRef.current.handleDragStart(pos.x, pos.y)
    } else if (mechanic === 'POP_TAPPER') {
      const tapped = runtimeRef.current.handleTap(pos.x, pos.y)
      if (tapped) soundBus.playPop()
    } else if (mechanic === 'FALLING_CATCHER') {
      runtimeRef.current.handleBasketMove(pos.x)
    }
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const pos = getStagePointerPos(e)
    if (!pos || !runtimeRef.current) return

    if (mechanic === 'PHYSICS_SLING_ARCHERY') {
      runtimeRef.current.handleDragMove(pos.x, pos.y)
    } else if (mechanic === 'FALLING_CATCHER') {
      runtimeRef.current.handleBasketMove(pos.x)
    }
  }

  const handlePointerUp = () => {
    if (!runtimeRef.current) return
    if (mechanic === 'PHYSICS_SLING_ARCHERY') {
      runtimeRef.current.handleDragEnd()
    }
  }

  // Trajectory prediction dots when pulling sling string
  const trajectoryDots: { x: number; y: number }[] = []
  if (mechanic === 'PHYSICS_SLING_ARCHERY' && runtime.isPulling && runtime.tensionForce > 25) {
    const launchSpeed = runtime.tensionForce * 0.28
    const launchAngleRad = (runtime.arrowRotation * Math.PI) / 180
    let simX = runtime.bowAnchor.x
    let simY = runtime.bowAnchor.y
    let simVx = Math.cos(launchAngleRad) * launchSpeed
    let simVy = Math.sin(launchAngleRad) * launchSpeed

    for (let step = 0; step < 14; step++) {
      simX += simVx * 1.5
      simY += simVy * 1.5
      simVy += 0.12 * 1.5
      if (simX > UI_SPECS.stageWidth || simY > UI_SPECS.stageHeight) break
      trajectoryDots.push({ x: simX, y: simY })
    }
  }

  // Dynamic Rule and Title deduction
  const isOdd = sceneGraph?.rules?.[0]?.logicCheck?.rule === 'is_odd'
  const ruleLabel = isOdd ? 'SỐ LẺ' : 'SỐ CHẴN'
  const missionTitle = sceneGraph?.title
    ? sceneGraph.title.toUpperCase()
    : mechanic === 'FALLING_CATCHER'
    ? `🧺 THỬ THÁCH HỨNG MỤC TIÊU: DI CHUYỂN GIỎ ĐỂ HỨNG CÁC ${ruleLabel}! 🍎`
    : mechanic === 'POP_TAPPER'
    ? `🫧 THỬ THÁCH CHẠM BÓNG: CHẠM NHANH VÀO CÁC BONG BÓNG ${ruleLabel}! 💥`
    : `🏹 THỬ THÁCH BẮN CUNG: KÉO NÁ BẮN VÀO CÁC MỤC TIÊU ${ruleLabel}! 🎯`

  // Mascot Positioning per Mechanic Mode
  let mascotX = 140
  let mascotY = 580
  let mascotScale = 1.0

  if (mechanic === 'FALLING_CATCHER') {
    // Companion stands on the basket rim, following player X smoothly
    mascotX = runtime.basket.x - runtime.basket.width / 2 + 10
    mascotY = runtime.basket.y - 42
    mascotScale = 0.85
  } else if (mechanic === 'PHYSICS_SLING_ARCHERY') {
    // Stands beside the slingshot pedestal cheering
    mascotX = 135
    mascotY = 570
    mascotScale = 1.05
  } else {
    // POP_TAPPER: Bottom-right cheering podium
    mascotX = UI_SPECS.stageWidth - 140
    mascotY = UI_SPECS.stageHeight - 120
    mascotScale = 1.1
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        borderRadius: 24,
        boxShadow: '0 12px 36px rgba(0,0,0,0.12)',
        backgroundColor: palette.background,
        touchAction: 'none',
        userSelect: 'none',
        cursor:
          mechanic === 'PHYSICS_SLING_ARCHERY'
            ? runtime.isPulling
              ? 'grabbing'
              : 'crosshair'
            : mechanic === 'FALLING_CATCHER'
            ? 'ew-resize'
            : 'pointer',
      }}
    >
      <Stage
        width={UI_SPECS.stageWidth * scale}
        height={UI_SPECS.stageHeight * scale}
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          <Group x={runtime.shakeOffset.x} y={runtime.shakeOffset.y}>
            {/* 1. Procedural Vector Themed World Background */}
            <ThemedBackground
              themeKey={themeKey}
              palette={palette}
              timeSec={timeSec}
              width={UI_SPECS.stageWidth}
              height={UI_SPECS.stageHeight}
            />

            {/* 2. Top Pedagogical Mission HUD */}
            <Group x={360} y={40}>
              <Rect
                width={1200}
                height={76}
                cornerRadius={24}
                fill={palette.primary}
                stroke={CANDY_PALETTE.inkBorder}
                strokeWidth={UI_SPECS.borderWidth}
                shadowColor="rgba(0,0,0,0.18)"
                shadowBlur={8}
                shadowOffsetY={5}
              />
              <Text
                x={0}
                y={18}
                width={1200}
                text={missionTitle}
                align="center"
                fontSize={27}
                fontStyle="bold"
                fill="#FFFFFF"
                fontFamily={UI_SPECS.fontFamily}
              />
            </Group>

            {/* 3. Score & Combo Badges */}
            <Group x={80} y={40}>
              <Rect
                width={220}
                height={76}
                cornerRadius={20}
                fill={CANDY_PALETTE.sunnyYellow}
                stroke={CANDY_PALETTE.inkBorder}
                strokeWidth={UI_SPECS.borderWidth}
              />
              <Text
                x={0}
                y={20}
                width={220}
                text={`⭐ ĐIỂM: ${runtime.score}`}
                align="center"
                fontSize={28}
                fontStyle="bold"
                fill={CANDY_PALETTE.inkBorder}
                fontFamily={UI_SPECS.fontFamily}
              />
            </Group>

            {runtime.combo > 1 && (
              <Group x={80} y={135}>
                <Rect
                  width={220}
                  height={55}
                  cornerRadius={16}
                  fill={CANDY_PALETTE.candyPink}
                  stroke={CANDY_PALETTE.inkBorder}
                  strokeWidth={3}
                />
                <Text
                  x={0}
                  y={13}
                  width={220}
                  text={`🔥 COMBO x${runtime.combo}!`}
                  align="center"
                  fontSize={22}
                  fontStyle="bold"
                  fill="#FFFFFF"
                  fontFamily={UI_SPECS.fontFamily}
                />
              </Group>
            )}

            {/* 4. Dynamic Animated Mascot Companion */}
            <ThemedMascot
              mascot={mascot}
              themeKey={themeKey}
              x={mascotX}
              y={mascotY}
              scale={mascotScale}
              isExcited={isExcited}
              timeSec={timeSec}
            />

            {/* ------------------------------------------------------------- */}
            {/* MECHANIC 1: FALLING CATCHER (BASKET & WOBBLING APPLES)        */}
            {/* ------------------------------------------------------------- */}
            {mechanic === 'FALLING_CATCHER' && (
              <Group>
                {/* Falling Fruits with Sinusoidal Wobble */}
                {runtime.fallingItems.map((item) => {
                  if (item.isCaught) return null
                  const wobble = Math.sin(timeSec * 4 + item.numberValue) * 6

                  return (
                    <Group key={item.id} x={item.x} y={item.y} rotation={wobble}>
                      {/* Apple Stem & Leaf */}
                      <Rect
                        x={-4}
                        y={-48}
                        width={8}
                        height={16}
                        cornerRadius={3}
                        fill="#5D4037"
                        stroke={CANDY_PALETTE.inkBorder}
                        strokeWidth={2}
                      />
                      <Shape
                        sceneFunc={(ctx, shape) => {
                          ctx.beginPath()
                          ctx.ellipse(8, -44, 12, 6, Math.PI / 4, 0, Math.PI * 2)
                          ctx.fillStyle = '#66BB6A'
                          ctx.fill()
                          ctx.lineWidth = 2
                          ctx.strokeStyle = CANDY_PALETTE.inkBorder
                          ctx.stroke()
                          ctx.fillStrokeShape(shape)
                        }}
                      />

                      {/* Apple / Target Body */}
                      <Circle
                        radius={44}
                        fill={item.color}
                        stroke={CANDY_PALETTE.inkBorder}
                        strokeWidth={UI_SPECS.borderWidth}
                        shadowColor="rgba(0,0,0,0.18)"
                        shadowBlur={10}
                        shadowOffsetY={5}
                      />

                      {/* Gloss Specular Highlight */}
                      <Shape
                        sceneFunc={(ctx, shape) => {
                          ctx.beginPath()
                          ctx.ellipse(-16, -16, 16, 8, -Math.PI / 4, 0, Math.PI * 2)
                          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
                          ctx.fill()
                          ctx.fillStrokeShape(shape)
                        }}
                      />

                      {/* Number Value */}
                      <Text
                        x={-40}
                        y={-20}
                        width={80}
                        text={String(item.numberValue)}
                        align="center"
                        fontSize={38}
                        fontStyle="bold"
                        fill="#FFFFFF"
                        fontFamily={UI_SPECS.fontFamily}
                        shadowColor="rgba(0,0,0,0.5)"
                        shadowBlur={4}
                        shadowOffsetY={2}
                      />

                      {/* Parity Badge */}
                      <Group y={50}>
                        <Rect
                          x={-35}
                          y={0}
                          width={70}
                          height={24}
                          cornerRadius={12}
                          fill={item.isEven ? CANDY_PALETTE.mintGreen : '#FFA726'}
                          stroke={CANDY_PALETTE.inkBorder}
                          strokeWidth={2}
                        />
                        <Text
                          x={-35}
                          y={3}
                          width={70}
                          text={item.isEven ? 'CHẴN' : 'LẺ'}
                          align="center"
                          fontSize={14}
                          fontStyle="bold"
                          fill="#FFFFFF"
                          fontFamily={UI_SPECS.fontFamily}
                        />
                      </Group>
                    </Group>
                  )
                })}

                {/* Player Catcher Basket with Elastic Squash & Stretch */}
                <Group
                  x={runtime.basket.x}
                  y={runtime.basket.y}
                  scaleX={basketSquashRef.current.scaleX}
                  scaleY={basketSquashRef.current.scaleY}
                >
                  {/* Basket Body */}
                  <Rect
                    x={-runtime.basket.width / 2}
                    y={-runtime.basket.height / 2}
                    width={runtime.basket.width}
                    height={runtime.basket.height}
                    cornerRadius={18}
                    fill="#8D6E63"
                    stroke={CANDY_PALETTE.inkBorder}
                    strokeWidth={UI_SPECS.borderWidth}
                    shadowColor="rgba(0,0,0,0.25)"
                    shadowBlur={12}
                    shadowOffsetY={6}
                  />

                  {/* Woven Crosslines */}
                  <Line
                    points={[
                      -runtime.basket.width / 2 + 20,
                      0,
                      runtime.basket.width / 2 - 20,
                      0,
                    ]}
                    stroke="#6D4C41"
                    strokeWidth={4}
                  />
                  <Line
                    points={[-40, -runtime.basket.height / 2 + 10, -40, runtime.basket.height / 2 - 10]}
                    stroke="#6D4C41"
                    strokeWidth={4}
                  />
                  <Line
                    points={[40, -runtime.basket.height / 2 + 10, 40, runtime.basket.height / 2 - 10]}
                    stroke="#6D4C41"
                    strokeWidth={4}
                  />

                  {/* Basket Top Rim */}
                  <Rect
                    x={-runtime.basket.width / 2 - 10}
                    y={-runtime.basket.height / 2 - 10}
                    width={runtime.basket.width + 20}
                    height={22}
                    cornerRadius={11}
                    fill="#A1887F"
                    stroke={CANDY_PALETTE.inkBorder}
                    strokeWidth={3}
                  />

                  {/* Basket Label */}
                  <Text
                    x={-80}
                    y={-12}
                    width={160}
                    text={`GIỎ ${ruleLabel}`}
                    align="center"
                    fontSize={18}
                    fontStyle="bold"
                    fill="#FFFFFF"
                    fontFamily={UI_SPECS.fontFamily}
                  />
                </Group>
              </Group>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MECHANIC 2: POP TAPPER (FLOATING BUBBLES)                     */}
            {/* ------------------------------------------------------------- */}
            {mechanic === 'POP_TAPPER' && (
              <Group>
                {runtime.balloons.map((b) => {
                  if (b.isPopped) return null
                  const wobble = Math.sin(timeSec * 3.5 + b.numberValue) * 5

                  return (
                    <Group key={b.id} x={b.x} y={b.currentY} rotation={wobble}>
                      {/* Translucent Bubble Outer Ring */}
                      <Circle
                        radius={56}
                        fill={b.color}
                        opacity={0.88}
                        stroke={CANDY_PALETTE.inkBorder}
                        strokeWidth={UI_SPECS.borderWidth}
                        shadowColor="rgba(0,0,0,0.18)"
                        shadowBlur={12}
                        shadowOffsetY={4}
                      />

                      {/* Bubble Gloss Arc */}
                      <Shape
                        sceneFunc={(ctx, shape) => {
                          ctx.beginPath()
                          ctx.ellipse(-20, -20, 22, 10, -Math.PI / 4, 0, Math.PI * 2)
                          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
                          ctx.fill()
                          ctx.fillStrokeShape(shape)
                        }}
                      />

                      {/* Secondary Rim Reflection */}
                      <Shape
                        sceneFunc={(ctx, shape) => {
                          ctx.beginPath()
                          ctx.arc(0, 0, 48, Math.PI * 0.4, Math.PI * 0.8)
                          ctx.lineWidth = 4
                          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
                          ctx.stroke()
                          ctx.fillStrokeShape(shape)
                        }}
                      />

                      {/* Bubble Number Value */}
                      <Text
                        x={-50}
                        y={-22}
                        width={100}
                        text={String(b.numberValue)}
                        align="center"
                        fontSize={44}
                        fontStyle="bold"
                        fill="#FFFFFF"
                        fontFamily={UI_SPECS.fontFamily}
                        shadowColor="rgba(0,0,0,0.5)"
                        shadowBlur={4}
                        shadowOffsetY={2}
                      />

                      {/* Parity Badge */}
                      <Group y={65}>
                        <Rect
                          x={-40}
                          y={0}
                          width={80}
                          height={28}
                          cornerRadius={14}
                          fill={b.isEven ? CANDY_PALETTE.mintGreen : '#FFA726'}
                          stroke={CANDY_PALETTE.inkBorder}
                          strokeWidth={2}
                        />
                        <Text
                          x={-40}
                          y={4}
                          width={80}
                          text={b.isEven ? 'CHẴN' : 'LẺ'}
                          align="center"
                          fontSize={16}
                          fontStyle="bold"
                          fill="#FFFFFF"
                          fontFamily={UI_SPECS.fontFamily}
                        />
                      </Group>
                    </Group>
                  )
                })}
              </Group>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MECHANIC 3: PHYSICS SLING ARCHERY                             */}
            {/* ------------------------------------------------------------- */}
            {mechanic === 'PHYSICS_SLING_ARCHERY' && (
              <Group>
                {/* Trajectory Guide Dots */}
                {trajectoryDots.map((pt, i) => (
                  <Circle
                    key={i}
                    x={pt.x}
                    y={pt.y}
                    radius={6 - i * 0.25}
                    fill={CANDY_PALETTE.sunnyYellow}
                    stroke={CANDY_PALETTE.inkBorder}
                    strokeWidth={2}
                    opacity={Math.max(0.2, 1 - i * 0.06)}
                  />
                ))}

                {/* Bow Wooden Limbs */}
                <Group>
                  <Shape
                    sceneFunc={(ctx, shape) => {
                      ctx.beginPath()
                      ctx.moveTo(runtime.bowUpperTip.x, runtime.bowUpperTip.y)
                      ctx.quadraticCurveTo(
                        runtime.bowAnchor.x - 70,
                        runtime.bowAnchor.y,
                        runtime.bowLowerTip.x,
                        runtime.bowLowerTip.y
                      )
                      ctx.lineWidth = 20
                      ctx.strokeStyle = '#8D6E63'
                      ctx.lineCap = 'round'
                      ctx.stroke()
                      ctx.fillStrokeShape(shape)
                    }}
                  />
                  <Shape
                    sceneFunc={(ctx, shape) => {
                      ctx.beginPath()
                      ctx.moveTo(runtime.bowUpperTip.x, runtime.bowUpperTip.y)
                      ctx.quadraticCurveTo(
                        runtime.bowAnchor.x - 70,
                        runtime.bowAnchor.y,
                        runtime.bowLowerTip.x,
                        runtime.bowLowerTip.y
                      )
                      ctx.lineWidth = 26
                      ctx.strokeStyle = CANDY_PALETTE.inkBorder
                      ctx.lineCap = 'round'
                      ctx.globalCompositeOperation = 'destination-over'
                      ctx.stroke()
                      ctx.globalCompositeOperation = 'source-over'
                      ctx.fillStrokeShape(shape)
                    }}
                  />
                  <Rect
                    x={runtime.bowAnchor.x - 75}
                    y={runtime.bowAnchor.y - 30}
                    width={30}
                    height={60}
                    cornerRadius={8}
                    fill="#FFAB91"
                    stroke={CANDY_PALETTE.inkBorder}
                    strokeWidth={3}
                  />
                </Group>

                {/* Bowstring Line */}
                <Line
                  points={[
                    runtime.bowUpperTip.x,
                    runtime.bowUpperTip.y,
                    runtime.pullPos.x,
                    runtime.pullPos.y,
                    runtime.bowLowerTip.x,
                    runtime.bowLowerTip.y,
                  ]}
                  stroke="#FFFFFF"
                  strokeWidth={5}
                  lineCap="round"
                  shadowColor="rgba(0,0,0,0.3)"
                  shadowBlur={4}
                />

                {/* Touch Drag Indicator */}
                {!runtime.isFlying && !runtime.isPulling && (
                  <Group x={runtime.bowAnchor.x} y={runtime.bowAnchor.y}>
                    <Circle
                      radius={48}
                      fill="rgba(255, 107, 74, 0.2)"
                      stroke={CANDY_PALETTE.primary}
                      strokeWidth={3}
                      dash={[8, 8]}
                    />
                    <Text
                      x={-75}
                      y={60}
                      width={150}
                      text="👈 KÉO VỀ SAU"
                      align="center"
                      fontSize={20}
                      fontStyle="bold"
                      fill={CANDY_PALETTE.primary}
                      fontFamily={UI_SPECS.fontFamily}
                    />
                  </Group>
                )}

                {/* Arrow Projectile */}
                <Group
                  x={runtime.arrowPos.x}
                  y={runtime.arrowPos.y}
                  rotation={runtime.arrowRotation}
                >
                  <Rect
                    x={-50}
                    y={-4}
                    width={100}
                    height={8}
                    cornerRadius={4}
                    fill="#D7CCC8"
                    stroke={CANDY_PALETTE.inkBorder}
                    strokeWidth={2}
                  />
                  <Shape
                    sceneFunc={(ctx, shape) => {
                      ctx.beginPath()
                      ctx.moveTo(50, -14)
                      ctx.lineTo(76, 0)
                      ctx.lineTo(50, 14)
                      ctx.closePath()
                      ctx.fillStyle = CANDY_PALETTE.primary
                      ctx.fill()
                      ctx.lineWidth = 3
                      ctx.strokeStyle = CANDY_PALETTE.inkBorder
                      ctx.stroke()
                      ctx.fillStrokeShape(shape)
                    }}
                  />
                  <Shape
                    sceneFunc={(ctx, shape) => {
                      ctx.beginPath()
                      ctx.moveTo(-50, 0)
                      ctx.lineTo(-65, -12)
                      ctx.lineTo(-45, -2)
                      ctx.moveTo(-50, 0)
                      ctx.lineTo(-65, 12)
                      ctx.lineTo(-45, 2)
                      ctx.fillStyle = CANDY_PALETTE.skyBlue
                      ctx.fill()
                      ctx.lineWidth = 2
                      ctx.strokeStyle = CANDY_PALETTE.inkBorder
                      ctx.stroke()
                      ctx.fillStrokeShape(shape)
                    }}
                  />
                </Group>

                {/* Floating Number Balloons with Natural Wobble */}
                {runtime.balloons.map((b) => {
                  if (b.isPopped) return null
                  const wobble = Math.sin(timeSec * 3.5 + b.numberValue) * 5

                  return (
                    <Group key={b.id} x={b.x} y={b.currentY} rotation={wobble}>
                      <Line
                        points={[0, 52, 6, 80, -6, 110, 2, 140]}
                        stroke="#78909C"
                        strokeWidth={3}
                        tension={0.4}
                      />
                      <Shape
                        sceneFunc={(ctx, shape) => {
                          ctx.beginPath()
                          ctx.moveTo(-10, 52)
                          ctx.lineTo(10, 52)
                          ctx.lineTo(0, 42)
                          ctx.closePath()
                          ctx.fillStyle = b.color
                          ctx.fill()
                          ctx.lineWidth = 3
                          ctx.strokeStyle = CANDY_PALETTE.inkBorder
                          ctx.stroke()
                          ctx.fillStrokeShape(shape)
                        }}
                      />
                      <Circle
                        radius={52}
                        fill={b.color}
                        stroke={CANDY_PALETTE.inkBorder}
                        strokeWidth={UI_SPECS.borderWidth}
                        shadowColor="rgba(0,0,0,0.18)"
                        shadowBlur={10}
                        shadowOffsetY={6}
                      />
                      <Shape
                        sceneFunc={(ctx, shape) => {
                          ctx.beginPath()
                          ctx.ellipse(-18, -18, 20, 10, -Math.PI / 4, 0, Math.PI * 2)
                          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
                          ctx.fill()
                          ctx.fillStrokeShape(shape)
                        }}
                      />
                      <Text
                        x={-50}
                        y={-22}
                        width={100}
                        text={String(b.numberValue)}
                        align="center"
                        fontSize={44}
                        fontStyle="bold"
                        fill="#FFFFFF"
                        fontFamily={UI_SPECS.fontFamily}
                        shadowColor="rgba(0,0,0,0.5)"
                        shadowBlur={4}
                        shadowOffsetY={2}
                      />
                      <Group y={70}>
                        <Rect
                          x={-40}
                          y={0}
                          width={80}
                          height={28}
                          cornerRadius={14}
                          fill={b.isEven ? CANDY_PALETTE.mintGreen : '#FFA726'}
                          stroke={CANDY_PALETTE.inkBorder}
                          strokeWidth={2}
                        />
                        <Text
                          x={-40}
                          y={4}
                          width={80}
                          text={b.isEven ? 'CHẴN' : 'LẺ'}
                          align="center"
                          fontSize={16}
                          fontStyle="bold"
                          fill="#FFFFFF"
                          fontFamily={UI_SPECS.fontFamily}
                        />
                      </Group>
                    </Group>
                  )
                })}
              </Group>
            )}

            {/* 5. Sparkling Impact Particles (Star Burst) */}
            {runtime.particles.map((p) => (
              <Group key={p.id} x={p.x} y={p.y} opacity={p.alpha}>
                <Circle radius={p.radius} fill={p.color} />
                <Circle radius={p.radius * 0.4} fill="#FFFFFF" />
              </Group>
            ))}

            {/* 6. Floating Score Popups (+10 ⭐) */}
            {floatingPopupsRef.current.map((pop) => (
              <Group key={pop.id} x={pop.x} y={pop.y} opacity={Math.max(0, pop.opacity)}>
                <Text
                  x={-80}
                  y={-20}
                  width={160}
                  text={pop.text}
                  align="center"
                  fontSize={34}
                  fontStyle="bold"
                  fill={pop.color}
                  fontFamily={UI_SPECS.fontFamily}
                  shadowColor="rgba(0,0,0,0.5)"
                  shadowBlur={8}
                  shadowOffsetY={3}
                />
              </Group>
            ))}

            {/* 7. Victory Confetti Celebration */}
            {hasCompletedRef.current &&
              victoryConfettiRef.current.map((c) => (
                <Rect
                  key={c.id}
                  x={c.x}
                  y={c.y}
                  width={c.size}
                  height={c.size * 0.6}
                  rotation={c.rotation}
                  fill={c.color}
                  shadowColor="rgba(0,0,0,0.15)"
                  shadowBlur={3}
                />
              ))}

            {/* 8. Victory Banner Modal */}
            {hasCompletedRef.current && (
              <Group x={360} y={420}>
                <Rect
                  width={1200}
                  height={150}
                  cornerRadius={28}
                  fill={CANDY_PALETTE.sunnyYellow}
                  stroke={CANDY_PALETTE.inkBorder}
                  strokeWidth={UI_SPECS.borderWidth}
                  shadowColor="rgba(0,0,0,0.25)"
                  shadowBlur={20}
                  shadowOffsetY={8}
                />
                <Text
                  x={0}
                  y={28}
                  width={1200}
                  text="🎉 XUẤT SẮC! BÉ ĐÃ HOÀN THÀNH MÀN CHƠI! ⭐"
                  align="center"
                  fontSize={36}
                  fontStyle="bold"
                  fill={CANDY_PALETTE.inkBorder}
                  fontFamily={UI_SPECS.fontFamily}
                />
                <Text
                  x={0}
                  y={86}
                  width={1200}
                  text="Bé tính toán thật siêu đỉnh và vượt qua thử thách!"
                  align="center"
                  fontSize={22}
                  fontStyle="bold"
                  fill="#451A03"
                  fontFamily={UI_SPECS.fontFamily}
                />
              </Group>
            )}

            {/* 9. Realtime Feedback Message Banner */}
            {runtime.messageBanner && (
              <Group x={460} y={880}>
                <Rect
                  width={1000}
                  height={90}
                  cornerRadius={24}
                  fill={runtime.messageBanner.color}
                  stroke={CANDY_PALETTE.inkBorder}
                  strokeWidth={4}
                  shadowColor="rgba(0,0,0,0.22)"
                  shadowBlur={16}
                  shadowOffsetY={8}
                />
                <Text
                  x={0}
                  y={25}
                  width={1000}
                  text={runtime.messageBanner.text}
                  align="center"
                  fontSize={26}
                  fontStyle="bold"
                  fill="#FFFFFF"
                  fontFamily={UI_SPECS.fontFamily}
                />
              </Group>
            )}
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}
