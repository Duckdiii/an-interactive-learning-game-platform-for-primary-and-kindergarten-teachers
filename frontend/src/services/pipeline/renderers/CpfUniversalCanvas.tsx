/**
 * CpfUniversalCanvas: Universal Hardware Driver for Composable Primitives Framework (CPF).
 * Modular engine supporting 3 Interactors (SLING, CATCHER, DIRECT_TAP)
 * and 3 Spawners (BUBBLE_FLOAT, ITEM_FALL, HORIZONTAL_PATROL).
 */

import { useState, useEffect, useRef, useCallback, type FC, type PointerEvent } from 'react'
import { Stage, Layer, Rect, Text, Group, Circle, Line, Shape } from 'react-konva'
import { CpfRuntimeEngine } from '../cpfRuntime'
import { CANDY_PALETTE, UI_SPECS } from '../assetPalette'
import type { CpfSceneGraph } from '../cpfTypes'

export interface CpfUniversalCanvasProps {
  sceneGraph?: CpfSceneGraph
  onFpsUpdate?: (fps: number) => void
}

export const CpfUniversalCanvas: FC<CpfUniversalCanvasProps> = ({ sceneGraph, onFpsUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const runtimeRef = useRef<CpfRuntimeEngine | null>(null)
  const [, setTickCounter] = useState(0) // Forces React render each RAF tick

  // Performance telemetry
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(performance.now())
  const lastFrameTimeRef = useRef(performance.now())

  // Initialize runtime engine
  if (!runtimeRef.current) {
    runtimeRef.current = new CpfRuntimeEngine(sceneGraph)
  }

  // Update runtime when sceneGraph changes
  useEffect(() => {
    if (runtimeRef.current && sceneGraph) {
      runtimeRef.current.initFromGraph(sceneGraph)
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

  // 60 FPS requestAnimationFrame Loop
  useEffect(() => {
    let animId: number

    const frameLoop = (now: number) => {
      const dtSec = Math.min(0.05, (now - lastFrameTimeRef.current) / 1000)
      lastFrameTimeRef.current = now

      // 1. Tick Virtual Runtime
      if (runtimeRef.current) {
        runtimeRef.current.tick(dtSec)
      }

      // 2. Measure FPS
      frameCountRef.current++
      if (now - lastFpsTimeRef.current >= 500) {
        const measuredFps = Math.round(
          (frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)
        )
        onFpsUpdate?.(Math.min(60, measuredFps))
        frameCountRef.current = 0
        lastFpsTimeRef.current = now
      }

      // 3. Trigger Render
      setTickCounter((prev) => (prev + 1) % 1000000)
      animId = requestAnimationFrame(frameLoop)
    }

    animId = requestAnimationFrame(frameLoop)
    return () => cancelAnimationFrame(animId)
  }, [onFpsUpdate])

  // Input Coordinate Translation
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

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const pos = getStagePointerPos(e)
    if (!pos || !runtimeRef.current) return

    if (mechanic === 'PHYSICS_SLING_ARCHERY') {
      runtimeRef.current.handleDragStart(pos.x, pos.y)
    } else if (mechanic === 'POP_TAPPER') {
      runtimeRef.current.handleTap(pos.x, pos.y)
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

  // Calculate trajectory prediction dots when pulling string (Archery)
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

  // Theme-aware HUD titles & colors
  const missionTitle =
    mechanic === 'FALLING_CATCHER'
      ? '🧺 THỬ THÁCH HỨNG TÁO: DI CHUYỂN GIỎ ĐỂ HỨNG CÁC SỐ CHẴN! 🍎'
      : mechanic === 'POP_TAPPER'
      ? '🫧 THỬ THÁCH CHẠM BÓNG: CHẠM NHANH VÀO CÁC BONG BÓNG SỐ CHẴN! 💥'
      : '🏹 THỬ THÁCH BẮN CUNG: KÉO NÁ BẮN VÀO CÁC SỐ CHẴN! 🎯'

  const bgColor =
    mechanic === 'FALLING_CATCHER'
      ? '#FFF8E1'
      : mechanic === 'POP_TAPPER'
      ? '#E0F7FA'
      : '#E1F5FE'

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
        borderRadius: 20,
        boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
        backgroundColor: bgColor,
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
            {/* Background Sky / Garden Decor */}
            <Group>
              <Circle x={200} y={150} radius={80} fill="#FFF9C4" opacity={0.6} />
              <Circle x={1600} y={140} radius={65} fill="#FFFFFF" opacity={0.7} />
              <Circle x={1670} y={130} radius={90} fill="#FFFFFF" opacity={0.8} />
              <Circle x={1740} y={140} radius={65} fill="#FFFFFF" opacity={0.7} />
            </Group>

            {/* Top Mission HUD */}
            <Group x={360} y={40}>
              <Rect
                width={1200}
                height={76}
                cornerRadius={24}
                fill={CANDY_PALETTE.primary}
                stroke={CANDY_PALETTE.inkBorder}
                strokeWidth={UI_SPECS.borderWidth}
                shadowColor="rgba(0,0,0,0.15)"
                shadowBlur={8}
                shadowOffsetY={5}
              />
              <Text
                x={0}
                y={18}
                width={1200}
                text={missionTitle}
                align="center"
                fontSize={28}
                fontStyle="bold"
                fill="#FFFFFF"
                fontFamily={UI_SPECS.fontFamily}
              />
            </Group>

            {/* Score & Combo Badges */}
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

            {/* ------------------------------------------------------------- */}
            {/* MECHANIC 1: FALLING CATCHER (BASKET & APPLES)                */}
            {/* ------------------------------------------------------------- */}
            {mechanic === 'FALLING_CATCHER' && (
              <Group>
                {/* Falling Fruits / Apples */}
                {runtime.fallingItems.map((item) => {
                  if (item.isCaught) return null
                  return (
                    <Group key={item.id} x={item.x} y={item.y}>
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

                      {/* Apple Body */}
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

                {/* Player Catcher Basket at Bottom */}
                <Group x={runtime.basket.x} y={runtime.basket.y}>
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
                    text="GIỎ SỐ CHẴN"
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
                  return (
                    <Group key={b.id} x={b.x} y={b.currentY}>
                      {/* Translucent Bubble Outer Ring */}
                      <Circle
                        radius={56}
                        fill={b.color}
                        opacity={0.85}
                        stroke={CANDY_PALETTE.inkBorder}
                        strokeWidth={UI_SPECS.borderWidth}
                        shadowColor="rgba(0,0,0,0.15)"
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

                {/* Touch Indicator */}
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

                {/* Floating Number Balloons */}
                {runtime.balloons.map((b) => {
                  if (b.isPopped) return null
                  return (
                    <Group key={b.id} x={b.x} y={b.currentY}>
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

            {/* Particle Effects (Stars & Glitter) */}
            {runtime.particles.map((p) => (
              <Circle
                key={p.id}
                x={p.x}
                y={p.y}
                radius={p.radius}
                fill={p.color}
                opacity={p.alpha}
              />
            ))}

            {/* Realtime Feedback Banner Message */}
            {runtime.messageBanner && (
              <Group x={460} y={880}>
                <Rect
                  width={1000}
                  height={100}
                  cornerRadius={24}
                  fill={runtime.messageBanner.color}
                  stroke={CANDY_PALETTE.inkBorder}
                  strokeWidth={4}
                  shadowColor="rgba(0,0,0,0.25)"
                  shadowBlur={16}
                  shadowOffsetY={8}
                />
                <Text
                  x={0}
                  y={28}
                  width={1000}
                  text={runtime.messageBanner.text}
                  align="center"
                  fontSize={30}
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
