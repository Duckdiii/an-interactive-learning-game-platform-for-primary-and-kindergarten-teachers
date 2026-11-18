import { QRCodeSVG } from 'qrcode.react'
import type { LiveArenaParticipant } from './presentationTypes'

export interface WaitingRoomViewProps {
  shareCode: string
  joinUrl: string
  participants: LiveArenaParticipant[]
}

/**
 * Trọng tâm của subtask: Màn hình phòng chờ (WaitingRoomView)
 * Hiển thị mã QR và mã PIN kích thước cực lớn để cả lớp đọc được từ xa trên máy chiếu/tivi.
 */
export function WaitingRoomView({ shareCode, joinUrl, participants }: WaitingRoomViewProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl">
      <h1 className="text-3xl font-extrabold text-white text-center">
        Quét mã QR hoặc nhập mã để tham gia
      </h1>

      <div className="flex flex-col md:flex-row items-center gap-12 bg-slate-800/80 p-8 rounded-3xl border border-slate-700 shadow-2xl">
        {/* Mã QR tạo từ qrcode.react với size=280, level="M" */}
        <div className="bg-white p-3 rounded-2xl shadow-lg">
          <QRCodeSVG value={joinUrl} size={280} level="M" />
        </div>

        <div className="text-center space-y-2">
          <p className="text-xl font-medium text-slate-300">Mã tham gia</p>
          {/* Font size lớn, cách chữ rõ ràng để chiếu xa vẫn đọc được */}
          <p
            className="text-8xl font-mono font-bold tracking-widest text-amber-400 select-all"
            data-testid="pin-display"
          >
            {shareCode || '------'}
          </p>
          <p className="text-sm text-slate-400">hoặc mở: {joinUrl.replace(/^https?:\/\//, '')}</p>
        </div>
      </div>

      <div className="mt-8 text-center space-y-4 w-full">
        <p className="text-2xl font-bold text-slate-200">
          Đã tham gia: <span className="text-amber-400 text-3xl font-extrabold">{participants.length}</span> bạn
        </p>

        {participants.length === 0 ? (
          <p className="text-lg text-slate-400 italic">Đang chờ các bạn vào phòng...</p>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center max-w-3xl mx-auto max-h-56 overflow-y-auto p-2">
            {participants.map((p) => (
              <span
                key={p.id}
                className="bg-blue-100 text-blue-800 px-5 py-2 rounded-full text-lg font-bold shadow-sm"
              >
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WaitingRoomView
