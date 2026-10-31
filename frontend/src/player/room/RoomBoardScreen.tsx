import { viText } from '../../constants/viText'
import type { RoomBoard } from './RoomClient'
import { DOT_COLORS } from './RoomLobby'

const text = viText.room.board

/** D3 Room-Board trên tivi: chỉ top 5, thứ hạng của các bạn khác nằm trên máy từng bạn. Đáp án hiện trên máy học sinh, tivi không biết nội dung câu. */
export default function RoomBoardScreen({ board, revealed }: { board: RoomBoard; revealed: boolean }) {
  return (
    <div className="flex h-full flex-col gap-4 bg-play-night px-48 pb-28 pt-11 text-white">
      <div className="flex items-baseline justify-between">
        <h1 className="text-4xl font-black">{text.title(board.afterIndex + 1)}</h1>
        <p className="text-2xl font-extrabold text-play-night-soft">{text.correctRate(Math.round(board.classCorrectRate * 100))}</p>
      </div>
      {board.top.length === 0 ? (
        <p className="text-2xl font-bold text-play-night-soft">{text.empty}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {board.top.map((row, position) => (
            <li key={position} className="flex items-center gap-4 rounded-2xl bg-play-night-panel px-5 py-3">
              <span className="w-10 text-3xl font-black">{row.rank}</span>
              <span aria-hidden="true" className={`size-9 flex-none rounded-full ${DOT_COLORS[position % DOT_COLORS.length]}`} />
              <span className="min-w-0 flex-1 truncate text-3xl font-black">{row.nickname}</span>
              <span className="text-xl font-extrabold text-play-night-progress">+{row.delta}</span>
              <span className="w-28 text-right text-3xl font-black">{row.score}</span>
            </li>
          ))}
        </ol>
      )}
      {revealed ? <p role="status" className="text-xl font-bold text-play-night-soft">{text.revealed}</p> : null}
    </div>
  )
}
