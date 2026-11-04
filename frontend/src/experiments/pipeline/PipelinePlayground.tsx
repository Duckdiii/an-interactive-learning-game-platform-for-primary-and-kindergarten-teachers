/**
 * PipelinePlayground: Experimental Testing Dashboard for Dual-Track AI Game Pipeline & CPF Engine.
 * Features Real-time Telemetry HUD (FPS, latency, 3-gate quality metrics),
 * Bloom Cognitive Recommender, Stepper Pipeline visualization, Publish Modal with QR code,
 * live interactive canvas runners, and AST inspectors.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  runGamePipeline,
  type PipelineExecutionResult,
  type BloomRecommendation,
} from './pipelineOrchestrator'
import { publishGameApi, type PublishGameDtoResponse } from '../../api/gamesApi'
import { FarmQuizCanvas } from './renderers/FarmQuizCanvas'
import { ArcheryCpfCanvas } from './renderers/ArcheryCpfCanvas'

const PRESET_PROMPTS = {
  track1:
    'Tạo game trắc nghiệm Toán lớp 2: Phép cộng có nhớ trong phạm vi 100, chủ đề Động vật nông trại',
  track2:
    'Tạo game Toán lớp 2: Em hãy kéo ná cao su bắn cung tên vào các quả bóng bay mang số chẵn để làm nổ bóng, bắn trúng số chẵn cộng 1 điểm, bắn trúng số lẻ rung màn hình',
}

const PIPELINE_STEPS = [
  { id: 1, label: '1. Ý Định Sư Phạm', desc: 'Intent Parser' },
  { id: 2, label: '2. Chuẩn GDPT 2018', desc: 'Curriculum RAG' },
  { id: 3, label: '3. Đề Xuất 3 Game Bloom', desc: 'Cognitive Matrix' },
  { id: 4, label: '4. 3 Cổng Kiểm Định', desc: 'Quality Gates' },
  { id: 5, label: '5. Sẵn Sàng Xuất Bản', desc: 'Ready to Play' },
]

export default function PipelinePlayground() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState<string>(PRESET_PROMPTS.track2)
  const [activeTab, setActiveTab] = useState<'track1' | 'track2'>('track2')
  const [selectedBloom, setSelectedBloom] = useState<number>(3)
  const [pipelineResult, setPipelineResult] = useState<PipelineExecutionResult>(() =>
    runGamePipeline(PRESET_PROMPTS.track2)
  )
  const [measuredFps, setMeasuredFps] = useState<number>(60)
  const [showInspector, setShowInspector] = useState<boolean>(false)
  const [isPublishing, setIsPublishing] = useState<boolean>(false)
  const [publishedData, setPublishedData] = useState<PublishGameDtoResponse | null>(null)
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false)
  const [copiedLink, setCopiedLink] = useState<boolean>(false)

  const handleRunPipeline = (overridePrompt?: string, forceTrack?: 'PRESET' | 'CPF') => {
    const textToRun = overridePrompt ?? prompt
    const res = runGamePipeline(textToRun, forceTrack)
    setPipelineResult(res)
    if (res.track === 'PRESET') {
      setActiveTab('track1')
      setSelectedBloom(1)
    } else {
      setActiveTab('track2')
      setSelectedBloom(3)
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

  const fpsColor =
    measuredFps >= 55 ? '#00E676' : measuredFps >= 40 ? '#FFD600' : '#FF5252'

  const handlePublishGame = async () => {
    setIsPublishing(true)
    try {
      const isArchery = activeTab === 'track2'
      const payload = {
        title: isArchery
          ? 'Bắn Cung Toán Học: Thợ Săn Số Chẵn'
          : 'Nông Trại Toán Học Lớp 2',
        gameType: isArchery ? 'PHYSICS_SLING_ARCHERY' : 'QUIZ',
        grade: 'GRADE_2',
        subject: 'MATH',
        dsl: isArchery ? currentResult.cpfGraph : currentResult.presetData,
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
                  Production Wiring
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                End-to-End Pipeline: Prompt $\to$ Bloom Selection $\to$ Quality Gates $\to$ Publish $\to$ Play (60 FPS)
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
        {/* Pipeline Stepper Visualizer */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {PIPELINE_STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2 flex-1 min-w-[150px]">
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
              <span>✍️</span> Nhập Prompt Yêu Cầu Của Giáo Viên:
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
              onClick={() => handleRunPipeline()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-bold text-white shadow-lg shadow-sky-500/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>⚡</span> Chạy Pipeline
            </button>
          </div>
        </div>

        {/* Step 3: Bloom Taxonomy 3-Game Recommendation Matrix */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
              <span>🎯</span> Bước 4: AI Đề Xuất 3 Cơ Chế Phân Bổ Theo Thang Đo Bloom
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
            {activeTab === 'track1' && track1Result.presetData && (
              <FarmQuizCanvas
                data={track1Result.presetData}
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

        {/* Quality Gates Detailed Feedback */}
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
                activeTab === 'track1' ? currentResult.presetData : currentResult.cpfGraph,
                null,
                2
              )}
            </pre>
          </div>
        )}
      </main>

      {/* Publish Celebration Modal */}
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
