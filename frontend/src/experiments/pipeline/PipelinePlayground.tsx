/**
 * PipelinePlayground: Experimental Testing Dashboard for Dual-Track AI Game Pipeline & CPF Engine.
 * Features Real-time Telemetry HUD (FPS, latency, 3-gate quality metrics),
 * Bloom Cognitive Recommender, 6-Step Visual Pipeline Stepper,
 * Stage 2.5: Asset & Theme Dressing Studio (1-Click Theme Switcher, SVG Sprites, TTS Narration),
 * Publish Modal with QR code, live interactive canvas runners, and AST inspectors.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  runGamePipeline,
  parseIntent,
  type PipelineExecutionResult,
  type BloomRecommendation,
  type PresetQuizData,
} from './pipelineOrchestrator'
import { publishGameApi, generateGameApi, type PublishGameDtoResponse } from '../../api/gamesApi'
import { FarmQuizCanvas } from './renderers/FarmQuizCanvas'
import { ArcheryCpfCanvas } from './renderers/ArcheryCpfCanvas'
import { GAME_WORLD_THEMES, type ThemeKey, type GameWorldTheme } from './themeResolver'
import { speakVietnamese, bindAssetsToPreset } from './assetBank'

const PRESET_PROMPTS = {
  track1:
    'Tạo game trắc nghiệm Toán lớp 2: Phép cộng có nhớ trong phạm vi 100, chủ đề Động vật nông trại',
  track2:
    'Tạo game Toán lớp 2: Em hãy kéo ná cao su bắn cung tên vào các quả bóng bay mang số chẵn để làm nổ bóng, bắn trúng số chẵn cộng 1 điểm, bắn trúng số lẻ rung màn hình',
}

const PIPELINE_STEPS = [
  { id: 1, label: '1. Phân Tích Ý Định', desc: 'Intent Parser' },
  { id: 2, label: '2. Khuyến Nghị Bloom', desc: 'Cognitive Matrix' },
  { id: 3, label: '3. Kịch Bản AI', desc: 'Dual-Track Gen' },
  { id: 4, label: '🎨 4. Theme & Asset', desc: 'Stage 2.5 Dressing' },
  { id: 5, label: '5. Quality Gates', desc: '3-Gate Verify' },
  { id: 6, label: '6. Sẵn Sàng Xuất Bản', desc: 'Ready to Play' },
]

export default function PipelinePlayground() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState<string>(PRESET_PROMPTS.track1)
  const [activeTab, setActiveTab] = useState<'track1' | 'track2'>('track1')
  const [selectedBloom, setSelectedBloom] = useState<number>(1)
  const [pipelineResult, setPipelineResult] = useState<PipelineExecutionResult>(() =>
    runGamePipeline(PRESET_PROMPTS.track1)
  )
  const [customTheme, setCustomTheme] = useState<GameWorldTheme | null>(null)
  const [isPlayingTts, setIsPlayingTts] = useState<boolean>(false)
  const [measuredFps, setMeasuredFps] = useState<number>(60)
  const [showInspector, setShowInspector] = useState<boolean>(false)
  const [isPublishing, setIsPublishing] = useState<boolean>(false)
  const [publishedData, setPublishedData] = useState<PublishGameDtoResponse | null>(null)
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false)
  const [copiedLink, setCopiedLink] = useState<boolean>(false)

  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  const handleRunPipeline = async (overridePrompt?: string, forceTrack?: 'PRESET' | 'CPF') => {
    const textToRun = overridePrompt ?? prompt
    setIsGenerating(true)
    try {
      const intent = parseIntent(textToRun)
      const targetTrack = forceTrack ?? intent.track

      let dynamicPreset: PresetQuizData | undefined
      let aiLatency: number | undefined

      try {
        const aiRes = await generateGameApi(
          textToRun,
          intent.gradeLevel,
          intent.subject === 'Vietnamese' ? 'VIETNAMESE' : 'MATH',
          targetTrack === 'CPF' ? 'QUIZ' : 'QUIZ'
        )
        if (aiRes?.dsl && typeof aiRes.dsl === 'object') {
          const dslObj = aiRes.dsl as Record<string, unknown>
          if (dslObj.questions && Array.isArray(dslObj.questions) && dslObj.questions.length > 0) {
            const q0 = dslObj.questions[0] as Record<string, unknown>
            const rawOpts = q0.options
            if (Array.isArray(rawOpts) && rawOpts.length >= 2) {
              const opts = rawOpts.map((opt: unknown, idx: number) => {
                const optObj = typeof opt === 'object' && opt !== null ? (opt as Record<string, unknown>) : null
                const textVal = optObj ? String(optObj.text ?? '') : String(opt)
                const isCorr = optObj ? Boolean(optObj.isCorrect) : idx === (Number(q0.correctIndex) || 0)
                return {
                  id: String(idx + 1),
                  text: textVal,
                  isCorrect: isCorr,
                }
              })
              dynamicPreset = {
                gameType: 'QUIZ',
                id: 'ai-gen-' + Date.now().toString(36),
                title: String(dslObj.title ?? (targetTrack === 'CPF' ? 'Thợ Săn Số Học' : 'Nông Trại Toán Học')),
                gradeLevel: intent.gradeLevel,
                theme: intent.theme,
                questionText: String(q0.questionText ?? textToRun),
                numA: Number(q0.numA ?? 38),
                numB: Number(q0.numB ?? 27),
                operation: '+',
                options: opts,
                correctIndex: Number(q0.correctIndex ?? 0),
                explanation: String(q0.explanation ?? 'Đáp án chính xác do AI kiểm định.'),
              }
            }
          }
          if (aiRes.latencyMs) {
            aiLatency = aiRes.latencyMs
          }
        }
      } catch {
        // Fallback sang deterministic pipeline
      }

      const res = runGamePipeline(textToRun, targetTrack, dynamicPreset)
      if (aiLatency) {
        res.latencyMs = aiLatency
      }
      setCustomTheme(null)
      setPipelineResult(res)
      if (res.track === 'PRESET') {
        setActiveTab('track1')
        setSelectedBloom(1)
      } else {
        setActiveTab('track2')
        setSelectedBloom(3)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelectBloomOption = (opt: BloomRecommendation) => {
    setSelectedBloom(opt.bloomIndex)
    if (opt.track === 'CPF') {
      setActiveTab('track2')
      handleRunPipeline(undefined, 'CPF')
    } else {
      setActiveTab('track1')
      handleRunPipeline(undefined, 'PRESET')
    }
  }

  // Pre-generate both game results so teacher can toggle seamlessly
  const track1Result = useMemo(() => runGamePipeline(PRESET_PROMPTS.track1), [])
  const track2Result = useMemo(() => runGamePipeline(PRESET_PROMPTS.track2), [])

  const currentResult =
    activeTab === 'track1'
      ? pipelineResult.track === 'PRESET'
        ? pipelineResult
        : track1Result
      : pipelineResult.track === 'CPF'
      ? pipelineResult
      : track2Result

  // Active theme resolving with manual 1-click override support
  const currentTheme: GameWorldTheme = useMemo(() => {
    if (customTheme) return customTheme
    return currentResult.themeData ?? GAME_WORLD_THEMES.FARM
  }, [customTheme, currentResult.themeData])

  // Active preset quiz data with dressed theme
  const activePresetData: PresetQuizData | undefined = useMemo(() => {
    const base = activeTab === 'track1'
      ? (pipelineResult.track === 'PRESET' ? pipelineResult.presetData : track1Result.presetData)
      : pipelineResult.presetData
    if (!base) return undefined
    return {
      ...base,
      themeData: currentTheme,
      theme: currentTheme.name,
    }
  }, [activeTab, pipelineResult, track1Result, currentTheme])

  // Attached SVG Sprites list for UI display
  const attachedSprites = useMemo(() => {
    if (activePresetData?.spriteItems && activePresetData.spriteItems.length > 0) {
      return activePresetData.spriteItems
    }
    if (activePresetData?.imageUrl) {
      return [{ name: activePresetData.theme || 'Vật phẩm học liệu', url: activePresetData.imageUrl, count: 3 }]
    }
    return [
      { name: 'Quả Táo Đỏ', url: '/assets/fruits/apple.svg', count: 3 },
      { name: 'Quả Cam Mọng', url: '/assets/fruits/orange.svg', count: 2 },
    ]
  }, [activePresetData])

  // 1-Click Theme Switcher handler
  const handleSwitchTheme = (themeKey: ThemeKey) => {
    const newTheme = GAME_WORLD_THEMES[themeKey]
    setCustomTheme(newTheme)
    setPipelineResult((prev) => {
      let updatedPreset = prev.presetData ?? track1Result.presetData
      if (updatedPreset) {
        const dressed = bindAssetsToPreset(updatedPreset, newTheme)
        updatedPreset = {
          ...dressed.dressedPreset,
          themeData: newTheme,
        }
      }
      return {
        ...prev,
        themeData: newTheme,
        presetData: updatedPreset,
        assetsAttached: updatedPreset
          ? {
              themeKey: newTheme.key,
              themeName: newTheme.name,
              spriteCount: updatedPreset.spriteItems?.length ?? 1,
              primarySpriteUrl: updatedPreset.imageUrl || newTheme.mascot.avatarUrl,
              sprites: updatedPreset.spriteItems || [{ name: newTheme.mascot.name, url: updatedPreset.imageUrl || '', count: 1 }],
            }
          : prev.assetsAttached,
      }
    })
  }

  // TTS Voice Preview handler
  const handlePlayTtsPreview = () => {
    if (isPlayingTts) return
    setIsPlayingTts(true)
    const textToSpeak =
      activePresetData?.narrationText ||
      activePresetData?.questionText ||
      prompt
    speakVietnamese(textToSpeak, () => setIsPlayingTts(false))
  }

  const fpsColor =
    measuredFps >= 55 ? '#00E676' : measuredFps >= 40 ? '#FFD600' : '#FF5252'

  const handlePublishGame = async () => {
    setIsPublishing(true)
    try {
      const isArchery = activeTab === 'track2'
      const payload = {
        title: isArchery
          ? 'Bắn Cung Toán Học: Thợ Săn Số Chẵn'
          : activePresetData?.title || 'Nông Trại Toán Học Lớp 2',
        gameType: isArchery ? 'PHYSICS_SLING_ARCHERY' : 'QUIZ',
        grade: 'GRADE_2',
        subject: 'MATH',
        dsl: isArchery ? currentResult.cpfGraph : activePresetData,
      }

      const res = await publishGameApi(payload)
      setPublishedData(res)
      setShowPublishModal(true)
    } catch {
      // Handled gracefully inside publishGameApi
    } finally {
      setIsPublishing(false)
    }
  }

  const playUrl = publishedData
    ? `${window.location.origin}/play/${publishedData.shareCode}`
    : ''

  const handleCopyLink = () => {
    if (!playUrl) return
    navigator.clipboard.writeText(playUrl).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Real-time Telemetry HUD */}
      <header className="bg-slate-800/90 backdrop-blur border-b border-slate-700 px-6 py-4 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚀</span>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Dual-Track AI Game Pipeline & CPF Engine
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Chặng 2.5 Asset Dressing
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                End-to-End Pipeline: Prompt $\to$ Bloom Selection $\to$ 🎨 Theme & Asset Dressing $\to$ Quality Gates $\to$ Publish
              </p>
            </div>
          </div>

          {/* Telemetry Metric Cards */}
          <div className="flex items-center gap-3">
            {/* FPS Meter */}
            <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-700/80 flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Hardware FPS</span>
                <span className="text-lg font-black tracking-wider" style={{ color: fpsColor }}>
                  {measuredFps} FPS
                </span>
              </div>
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: fpsColor }}
              />
            </div>

            {/* Pipeline Latency */}
            <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-700/80 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Pipeline Latency</span>
              <span className="text-lg font-black text-cyan-400 tracking-wider">
                {currentResult.latencyMs} ms
              </span>
            </div>

            {/* 3-Gate Quality Summary */}
            <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-700/80 flex items-center gap-2">
              <div className="flex flex-col mr-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">3-Gate Quality</span>
                <span
                  className={`text-sm font-black ${
                    currentResult.gates.allPassed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {currentResult.gates.allPassed ? 'ALL PASSED (100%)' : 'REJECTED'}
                </span>
              </div>
              <div className="flex gap-1">
                <span
                  title={currentResult.gates.gate1Syntax.message}
                  className={`text-xs px-2 py-0.5 rounded font-bold cursor-help ${
                    currentResult.gates.gate1Syntax.passed
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-900/60 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  G1
                </span>
                <span
                  title={currentResult.gates.gate2Pedagogy.message}
                  className={`text-xs px-2 py-0.5 rounded font-bold cursor-help ${
                    currentResult.gates.gate2Pedagogy.passed
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-900/60 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  G2
                </span>
                <span
                  title={currentResult.gates.gate3Playability.message}
                  className={`text-xs px-2 py-0.5 rounded font-bold cursor-help ${
                    currentResult.gates.gate3Playability.passed
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-900/60 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  G3
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full p-6 flex flex-col gap-6 flex-1">
        {/* Pipeline Stepper Visualizer (6 Steps) */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {PIPELINE_STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2 flex-1 min-w-[140px]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                    ✓
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">{s.label}</span>
                    <span className="text-[10px] text-slate-400">{s.desc}</span>
                  </div>
                </div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className="h-0.5 flex-1 bg-emerald-500/40 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Prompt Input & Controller */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span>✍️</span> Bước 1: Nhập Prompt Yêu Cầu Của Giáo Viên:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPrompt(PRESET_PROMPTS.track1)
                  handleRunPipeline(PRESET_PROMPTS.track1, 'PRESET')
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-300 font-medium transition cursor-pointer"
              >
                🌾 Mẫu 1: Trắc Nghiệm Nông Trại (Preset)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrompt(PRESET_PROMPTS.track2)
                  handleRunPipeline(PRESET_PROMPTS.track2, 'CPF')
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sky-300 font-medium transition cursor-pointer"
              >
                🏹 Mẫu 2: Bắn Cung Số Chẵn (CPF OOD)
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none font-mono"
              placeholder="Nhập ý tưởng trò chơi..."
            />
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => void handleRunPipeline()}
              className={`px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-bold text-white shadow-lg shadow-sky-500/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer ${
                isGenerating ? 'opacity-75 cursor-not-allowed animate-pulse' : ''
              }`}
            >
              <span>{isGenerating ? '✨' : '⚡'}</span> {isGenerating ? 'AI Đang Xử Lý...' : 'Chạy Pipeline AI'}
            </button>
          </div>
        </div>

        {/* Step 2 & 3: Bloom Taxonomy 3-Game Recommendation Matrix */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
              <span>🎯</span> Bước 2 & 3: AI Đề Xuất 3 Cơ Chế Phân Bổ Theo Thang Đo Bloom
            </h2>
            <span className="text-[11px] text-slate-400">Chọn 1 phương án để nạp tương tác</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {currentResult.recommendations.map((opt) => {
              const isSelected = selectedBloom === opt.bloomIndex
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectBloomOption(opt)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? opt.track === 'CPF'
                        ? 'bg-sky-950/70 border-sky-400 shadow-lg shadow-sky-500/20'
                        : 'bg-amber-950/70 border-amber-400 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{opt.icon}</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          opt.bloomIndex === 1
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : opt.bloomIndex === 2
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        Bloom {opt.bloomIndex}: {opt.bloomLevel}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{opt.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      {opt.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] border-t border-slate-700/50 pt-2 text-slate-400">
                    <span>⏱️ {opt.estimatedDuration}</span>
                    <span className="font-semibold text-cyan-400">
                      Track: {opt.track === 'CPF' ? 'CPF OOD (VRE)' : 'Preset DSL'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step 4: Theme & Asset Dressing Studio (Stage 2.5) */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 shadow-sm flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎨</span>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Bước 4: Bối Cảnh Thế Giới Game & Kho Asset Đồ Họa (Stage 2.5 Dressing)
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    Hybrid 80/20 Engine
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Tự động khoác áo đồ họa SVG K-5, Mascot hoạt hình và âm thanh giọng đọc tiếng Việt
                </p>
              </div>
            </div>

            {/* TTS Voice Preview Button */}
            <button
              type="button"
              onClick={handlePlayTtsPreview}
              className={`text-xs px-4 py-2 rounded-xl border transition flex items-center gap-2 font-bold cursor-pointer ${
                isPlayingTts
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 animate-pulse'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
              }`}
            >
              <span>{isPlayingTts ? '🔊' : '🔈'}</span>
              <span>{isPlayingTts ? 'Đang đọc đề bài...' : 'Nghe Thử Giọng Đọc Đề Bài (TTS)'}</span>
            </button>
          </div>

          {/* Theme Selector & Mascot info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Theme Card */}
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/70 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Thế Giới Game Được Chọn (Theme)
                </span>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{currentTheme.icon}</span>
                  <div>
                    <h4 className="text-sm font-black text-white">{currentTheme.name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">Key: {currentTheme.key}</span>
                  </div>
                </div>
                {/* Palette pills */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400">Bảng màu:</span>
                  <div className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: currentTheme.palette.primary }} title="Primary" />
                  <div className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: currentTheme.palette.secondary }} title="Secondary" />
                  <div className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: currentTheme.palette.canvasBg }} title="Canvas Bg" />
                </div>
              </div>

              {/* 1-Click Theme Switcher */}
              <div className="mt-3 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Đổi Theme 1-Click:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(GAME_WORLD_THEMES) as ThemeKey[]).map((tKey) => {
                    const t = GAME_WORLD_THEMES[tKey]
                    const isActive = currentTheme.key === tKey
                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => handleSwitchTheme(tKey)}
                        className={`text-[11px] px-2 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                          isActive
                            ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <span>{t.icon}</span>
                        <span>{t.name.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Mascot Companion Card */}
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/70 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Linh Vật Đồng Hành (Mascot)
                </span>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-600 flex items-center justify-center p-1 overflow-hidden">
                    <img src={currentTheme.mascot.avatarUrl} alt={currentTheme.mascot.name} className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1">
                      {currentTheme.mascot.name}
                      <span>{currentTheme.mascot.emoji}</span>
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-semibold">Tương tác Squash & Stretch</span>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                "{currentTheme.mascot.happyQuote}"
              </div>
            </div>

            {/* Attached Sprites Grid */}
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/70 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Kho Sprite Đồ Họa Đã Gắn (Tự động 80/20)
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachedSprites.map((sp, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/80 border border-slate-700 rounded-lg p-2 flex items-center gap-2 flex-1 min-w-[130px]"
                    >
                      <div className="w-9 h-9 rounded-md bg-white p-1 flex items-center justify-center shrink-0">
                        <img src={sp.url} alt={sp.name} className="w-7 h-7 object-contain" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-white block truncate">{sp.name}</span>
                        <span className="text-[10px] text-emerald-300 font-mono">
                          {sp.count ? `x${sp.count} item` : '✓ Vector SVG'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-2">
                <span>✓</span> Đảm bảo imageUrl luôn có giá trị (Zero null image guarantee)
              </div>
            </div>
          </div>
        </div>

        {/* Dual-Track Tabs & Actions */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-700 pb-2 gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('track1')
                setSelectedBloom(1)
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'track1'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🌾</span> Track 1: In-Distribution (Preset Quiz)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('track2')
                setSelectedBloom(3)
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'track2'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🏹</span> Track 2: Out-of-Distribution (CPF VRE Archery)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePublishGame}
              disabled={isPublishing}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              <span>🚀</span> {isPublishing ? 'Đang xuất bản...' : 'Xuất Bản Game (Lấy Mã PIN/QR)'}
            </button>

            <button
              type="button"
              onClick={() => setShowInspector(!showInspector)}
              className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔍</span> {showInspector ? 'Ẩn AST' : 'Xem AST'}
            </button>
          </div>
        </div>

        {/* Interactive Canvas Viewport */}
        <div className="flex flex-col items-center justify-center bg-slate-950/60 rounded-3xl border border-slate-800 p-4 shadow-2xl relative">
          <div className="w-full max-w-5xl">
            {activeTab === 'track1' && activePresetData && (
              <FarmQuizCanvas
                data={activePresetData}
                onFpsUpdate={(fps) => setMeasuredFps(fps)}
              />
            )}
            {activeTab === 'track2' && track2Result.cpfGraph && (
              <ArcheryCpfCanvas
                sceneGraph={track2Result.cpfGraph}
                onFpsUpdate={(fps) => setMeasuredFps(fps)}
              />
            )}
          </div>
        </div>

        {/* Step 5: Quality Gates Detailed Feedback */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Gate 1: Cú pháp Schema DSL
              </h3>
            </div>
            <p className="text-xs text-slate-400">{currentResult.gates.gate1Syntax.message}</p>
          </div>

          <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Gate 2: Sư Phạm & Toán Học (0% AI)
              </h3>
            </div>
            <p className="text-xs text-slate-400">{currentResult.gates.gate2Pedagogy.message}</p>
          </div>

          <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Gate 3: Khả Năng Chơi & Vùng Chạm
              </h3>
            </div>
            <p className="text-xs text-slate-400">{currentResult.gates.gate3Playability.message}</p>
          </div>
        </div>

        {/* AST & DSL Inspector Modal / Drawer */}
        {showInspector && (
          <div className="bg-slate-950 rounded-2xl border border-slate-700 p-5 mt-2">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <span>📑</span> Generated AST / DSL Inspector ({currentResult.track})
              </h3>
              <span className="text-xs text-slate-400">
                Schema: {activeTab === 'track1' ? 'GameDSL v1.0.0 (Preset)' : 'cpf.v1.0.0 (OOD)'}
              </span>
            </div>
            <pre className="bg-slate-900 rounded-xl p-4 text-xs font-mono text-emerald-300 max-h-96 overflow-y-auto border border-slate-800 leading-relaxed">
              {JSON.stringify(
                activeTab === 'track1' ? activePresetData : currentResult.cpfGraph,
                null,
                2
              )}
            </pre>
          </div>
        )}
      </main>

      {/* Step 6: Publish Celebration Modal */}
      {showPublishModal && publishedData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col items-center text-center relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowPublishModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center"
            >
              ✕
            </button>

            <span className="text-5xl mb-2">🎉</span>
            <h3 className="text-xl font-black text-white mb-1">
              Xuất Bản Trò Chơi Thành Công!
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Học sinh có thể quét mã QR hoặc nhập mã PIN 6 số để vào chơi ngay
            </p>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl shadow-inner mb-4 flex items-center justify-center">
              <QRCodeSVG value={playUrl} size={160} />
            </div>

            {/* Share PIN Code */}
            <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800 mb-4 w-full">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Mã Phòng Chia Sẻ (PIN Code)
              </span>
              <span className="text-3xl font-black tracking-widest text-emerald-400 font-mono">
                {publishedData.shareCode}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 w-full">
              <button
                type="button"
                onClick={() => navigate(`/play/${publishedData.shareCode}`)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-bold text-white shadow-lg shadow-sky-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🎮</span> Chơi Thử Với Vai Trò Học Sinh
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📋</span> {copiedLink ? '✓ Đã Sao Chép Link!' : 'Sao Chép Đường Link Chia Sẻ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
