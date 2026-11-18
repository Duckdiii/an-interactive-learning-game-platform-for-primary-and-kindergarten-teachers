import type { LiveArenaLeaderboardEntry } from './presentationTypes'

export interface LeaderboardDisplayViewProps {
  entries: LiveArenaLeaderboardEntry[]
}

/**
 * Hiển thị bảng xếp hạng điểm số của cả lớp trên màn chiếu sau mỗi câu hỏi.
 */
export function LeaderboardDisplayView({ entries }: LeaderboardDisplayViewProps) {
  return (
    <div className="w-full max-w-3xl bg-slate-800/80 p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
      <h2 className="text-4xl font-extrabold text-center text-amber-400 tracking-wide mb-6">
        🏆 Bảng xếp hạng
      </h2>

      {entries.length === 0 ? (
        <p className="text-xl text-center text-slate-400 italic py-8">
          Chưa có điểm số nào được ghi nhận.
        </p>
      ) : (
        <div className="divide-y divide-slate-700">
          {entries.map((entry) => (
            <div
              key={entry.rank}
              className={`flex justify-between items-center text-2xl py-3.5 px-4 rounded-xl my-1 transition-colors ${
                entry.rank === 1
                  ? 'bg-amber-500/20 text-amber-300 font-extrabold'
                  : entry.rank === 2
                    ? 'bg-slate-300/20 text-slate-200 font-bold'
                    : entry.rank === 3
                      ? 'bg-amber-700/20 text-amber-500 font-bold'
                      : 'text-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-3xl font-black w-12 text-center">#{entry.rank}</span>
                <span className="font-bold truncate max-w-md">{entry.name}</span>
              </div>
              <span className="font-mono font-black text-3xl text-right">
                {entry.score} <span className="text-lg font-normal text-slate-400">điểm</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default LeaderboardDisplayView
