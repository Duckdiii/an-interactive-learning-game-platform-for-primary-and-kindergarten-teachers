import type { ReactNode } from 'react'
import SubjectCover from './SubjectCover'
import { subjectTheme } from './subjectTheme'

// Hình bìa mặc định của thẻ game khi chưa có ảnh: mỗi LOẠI game một hình minh họa riêng (nhìn là biết cách chơi), tô theo
// màu của môn học. Loại lạ (backend thêm sau) thì rơi về hình ô chữ theo môn. Chỉ để trang trí (aria-hidden).
// Mọi hình vẽ trong khung 320x180, phần chính nằm gọn ở giữa (x từ 90 đến 230) để bản `compact` của điện thoại chỉ cắt
// lấy phần giữa mà vẫn nhận ra hình.

const STROKE = 4

// Ô trắng viền màu môn học.
function Box({ x, y, w, h, rx = 10, dashed = false }: { x: number; y: number; w: number; h: number; rx?: number; dashed?: boolean }) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={rx}
      fill={dashed ? 'none' : 'white'}
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeDasharray={dashed ? '8 6' : undefined}
    />
  )
}

const MOTIFS: Readonly<Record<string, () => ReactNode>> = {
  // Câu hỏi và ba lựa chọn, một lựa chọn được đánh dấu.
  QUIZ: () => (
    <>
      <Box x={90} y={28} w={140} h={30} />
      {[70, 102, 134].map((y, index) => (
        <g key={y}>
          <Box x={90} y={y} w={140} h={24} rx={12} />
          <circle cx={108} cy={y + 12} r={6} fill={index === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={3} />
        </g>
      ))}
    </>
  ),
  // Loa phát tiếng và khung hình để chọn.
  AUDIO_VISUAL_MATCH: () => (
    <>
      <path d="M92 78 h16 l22 -18 v60 l-22 -18 h-16 z" fill="currentColor" />
      <path d="M142 72 q14 18 0 36" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M154 62 q24 28 0 56" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <Box x={176} y={56} w={64} h={64} rx={12} />
      <circle cx={196} cy={78} r={7} fill="currentColor" />
      <path d="M182 112 l16 -18 l12 12 l8 -8 l16 14 z" fill="currentColor" />
    </>
  ),
  // Ba hình tròn giống nhau và một hình tam giác khác loại.
  ODD_ONE_OUT: () => (
    <>
      {[
        [118, 62],
        [204, 62],
        [118, 126],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={26} fill="white" stroke="currentColor" strokeWidth={STROKE} />
      ))}
      <path d="M204 102 l28 48 h-56 z" fill="currentColor" />
    </>
  ),
  // Kính lúp soi vào một vật giữa nhiều vật.
  SPOT_THE_TARGET: () => (
    <>
      {[
        [96, 50],
        [130, 138],
        [226, 46],
        [100, 112],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={11} fill="white" stroke="currentColor" strokeWidth={3} opacity={0.7} />
      ))}
      <circle cx={170} cy={86} r={34} fill="white" stroke="currentColor" strokeWidth={STROKE + 1} />
      <circle cx={170} cy={86} r={11} fill="currentColor" />
      <path d="M196 112 l32 32" stroke="currentColor" strokeWidth={STROKE + 4} strokeLinecap="round" />
    </>
  ),
  // Ba ô chữ lệch nhau kèm mũi tên xoay (chữ bị xáo trộn).
  WORD_SCRAMBLE: () => (
    <>
      <path d="M104 52 q56 -34 112 0" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M208 38 l12 16 l-18 4" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
      {[
        { x: 90, y: 92, r: -10, c: 'C' },
        { x: 142, y: 78, r: 6, c: 'A' },
        { x: 194, y: 96, r: -5, c: 'B' },
      ].map((tile) => (
        <g key={tile.c} transform={`rotate(${tile.r} ${tile.x + 24} ${tile.y + 24})`}>
          <Box x={tile.x} y={tile.y} w={48} h={48} rx={12} />
          <text x={tile.x + 24} y={tile.y + 35} textAnchor="middle" fontSize="30" fontWeight="800" fill="currentColor">
            {tile.c}
          </text>
        </g>
      ))}
    </>
  ),
  // Hai cột, các đường nối chéo nhau.
  MATCHING: () => (
    <>
      {[
        [0, 2],
        [1, 0],
        [2, 1],
      ].map(([from, to]) => (
        <line key={`${from}-${to}`} x1={132} y1={46 + from * 44} x2={188} y2={46 + to * 44} stroke="currentColor" strokeWidth={STROKE - 1} strokeLinecap="round" />
      ))}
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <Box x={96} y={30 + row * 44} w={36} h={32} />
          <Box x={188} y={30 + row * 44} w={36} h={32} />
        </g>
      ))}
    </>
  ),
  // Lưới thẻ úp, hai thẻ đã lật.
  MEMORY_CARD: () => (
    <>
      {[0, 1, 2].flatMap((col) =>
        [0, 1].map((row) => {
          const open = (col === 0 && row === 0) || (col === 2 && row === 1)
          const x = 92 + col * 48
          const y = 34 + row * 62

          return (
            <g key={`${col}-${row}`}>
              <rect
                x={x}
                y={y}
                width={40}
                height={52}
                rx={9}
                fill={open ? 'white' : 'currentColor'}
                fillOpacity={open ? 1 : 0.55}
                stroke="currentColor"
                strokeWidth={STROKE}
              />
              {open ? (
                <path d={`M${x + 20} ${y + 14} l6 12 l13 2 l-10 9 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -9 l13 -2 z`} fill="currentColor" />
              ) : (
                <text x={x + 20} y={y + 35} textAnchor="middle" fontSize="24" fontWeight="800" fill="white">
                  ?
                </text>
              )}
            </g>
          )
        }),
      )}
    </>
  ),
  // Vật được kéo thả vào giỏ.
  DRAG_DROP: () => (
    <>
      <Box x={176} y={22} w={44} h={44} rx={12} />
      <path d="M142 54 q10 -26 28 -18" fill="none" stroke="currentColor" strokeWidth={STROKE - 1} strokeLinecap="round" strokeDasharray="2 9" />
      <path d="M154 100 h92 l-12 52 h-68 z" fill="currentColor" fillOpacity={0.55} stroke="currentColor" strokeWidth={STROKE} strokeLinejoin="round" />
      <Box x={88} y={84} w={36} h={36} rx={10} />
      <circle cx={200} cy={90} r={9} fill="currentColor" />
    </>
  ),
  // Ba bậc thang tăng dần đánh số.
  ORDERING: () => (
    <>
      {[
        { x: 96, h: 40, n: '1' },
        { x: 146, h: 74, n: '2' },
        { x: 196, h: 108, n: '3' },
      ].map((step) => (
        <g key={step.n}>
          <Box x={step.x} y={150 - step.h} w={42} h={step.h} rx={8} />
          <text x={step.x + 21} y={150 - step.h + 30} textAnchor="middle" fontSize="26" fontWeight="800" fill="currentColor">
            {step.n}
          </text>
        </g>
      ))}
    </>
  ),
  // Câu có chỗ trống và từ cần điền ở bên dưới.
  VISUAL_CLOZE: () => (
    <>
      <rect x={92} y={44} width={56} height={10} rx={5} fill="currentColor" />
      <Box x={158} y={30} w={64} h={38} rx={10} dashed />
      <rect x={92} y={84} width={130} height={10} rx={5} fill="currentColor" fillOpacity={0.55} />
      <Box x={126} y={118} w={68} h={36} rx={18} />
      <rect x={140} y={133} width={40} height={8} rx={4} fill="currentColor" />
    </>
  ),
}

export default function GameTypeCover({
  gameType,
  subject,
  compact = false,
}: {
  gameType: string
  subject: string
  compact?: boolean
}) {
  const motif = MOTIFS[gameType]

  if (!motif) return <SubjectCover subject={subject} compact={compact} />

  const theme = subjectTheme(subject)

  return (
    <div
      className={`${compact ? 'h-full w-full' : 'aspect-[16/9]'} ${theme.cover}`}
      aria-hidden="true"
    >
      <svg
        viewBox={compact ? '80 0 160 180' : '0 0 320 180'}
        preserveAspectRatio={compact ? 'xMidYMid meet' : 'xMidYMid slice'}
        className={`h-full w-full ${theme.mark}`}
        role="presentation"
      >
        {motif()}
      </svg>
    </div>
  )
}
