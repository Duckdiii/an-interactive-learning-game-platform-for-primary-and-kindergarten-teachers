/**
 * PipelinePlayground: Experimental Testing Dashboard for Dual-Track AI Game Pipeline & CPF Engine.
 * Features Real-time Telemetry HUD (FPS, latency, 3-gate quality metrics),
 * prompt generator presets, live interactive canvas runners, and AST inspectors.
 */

import { useState, useMemo } from 'react'
import { runGamePipeline, type PipelineExecutionResult } from './pipelineOrchestrator'
import { FarmQuizCanvas } from './renderers/FarmQuizCanvas'
import { ArcheryCpfCanvas } from './renderers/ArcheryCpfCanvas'

const PRESET_PROMPTS = {
  track1:
    'Tạo game trắc nghiệm Toán lớp 2: Phép cộng có nhớ trong phạm vi 100, chủ đề Động vật nông trại',
  track2:
    'Tạo game Toán lớp 2: Em hãy kéo ná cao su bắn cung tên vào các quả bóng bay mang số chẵn để làm nổ bóng, bắn trúng số chẵn cộng 1 điểm, bắn trúng số lẻ rung màn hình',
}

export default function PipelinePlayground() {
  const [prompt, setPrompt] = useState<string>(PRESET_PROMPTS.track2)
  const [activeTab, setActiveTab] = useState<'track1' | 'track2'>('track2')
  const [pipelineResult, setPipelineResult] = useState<PipelineExecutionResult>(() =>
    runGamePipeline(PRESET_PROMPTS.track2)
  )
  const [measuredFps, setMeasuredFps] = useState<number>(60)
  const [showInspector, setShowInspector] = useState<boolean>(false)

  const handleRunPipeline = (overridePrompt?: string) => {
    const textToRun = overridePrompt ?? prompt
    const res = runGamePipeline(textToRun)
    setPipelineResult(res)
    if (res.track === 'PRESET') {
      setActiveTab('track1')
    } else {
      setActiveTab('track2')
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
                  Prototype Spike
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Thực nghiệm đối đầu: In-Distribution (Preset 24 Cơ chế) vs Out-of-Distribution (CPF VRE)
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
                  handleRunPipeline(PRESET_PROMPTS.track1)
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-300 font-medium transition cursor-pointer"
              >
                🌾 Mẫu 1: Trắc Nghiệm Nông Trại (Preset)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrompt(PRESET_PROMPTS.track2)
                  handleRunPipeline(PRESET_PROMPTS.track2)
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

        {/* Dual-Track Tabs & Actions */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('track1')}
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
              onClick={() => setActiveTab('track2')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'track2'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🏹</span> Track 2: Out-of-Distribution (CPF VRE Archery)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowInspector(!showInspector)}
            className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔍</span> {showInspector ? 'Ẩn AST Inspector' : 'Xem AST & Schema Inspector'}
          </button>
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
    </div>
  )
}
