import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createMockRoom } from '../../player/room/mockRoom'
import { RoomJoinError } from '../../player/room/RoomClient'
import RoomStudentScreen, { RoomJoinErrorScreen } from '../../player/room/RoomStudentScreen'
import RoomTeacherScreen from '../../player/room/RoomTeacherScreen'
import type { AnswerPayload, StudentGame } from '../../types/game-student.types'

const QUESTION_COUNT = 10
const QUESTION_IDS = Array.from({ length: QUESTION_COUNT }, (_, index) => `q${index + 1}`)
const NEXT_STEP_MS = 3000

const GAME = {
  gameType: 'QUIZ',
  metadata: { title: 'Đếm con vật', subject: 'MATH', gradeLevel: 'GRADE_2', topic: 'Đếm', language: 'vi' },
  gameplaySettings: {},
  answeredQuestionIds: [],
  questions: QUESTION_IDS.map((id, index) => ({
    id,
    timeLimitSeconds: 20,
    points: 10,
    questionText: `Câu ${index + 1}: ${index + 2} con mèo thêm 1 con là mấy con?`,
    options: [
      { id: 'a', text: String(index + 3) },
      { id: 'b', text: String(index + 4) },
      { id: 'c', text: String(index + 2) },
    ],
  })),
} as unknown as StudentGame

const isRight = (answer: AnswerPayload) => 'selectedOptionId' in answer && answer.selectedOptionId === 'a'

function TeacherView({ students, questionMs }: { students: number; questionMs: number }) {
  const mock = useMemo(() => createMockRoom({ questionIds: QUESTION_IDS, virtualStudents: students, questionMs }), [students, questionMs])

  return <RoomTeacherScreen client={mock.teacher} room={{ title: 'Đếm con vật', subtitle: 'Toán · Lớp 2 · 10 câu', pin: '482 913', joinUrl: `${window.location.origin}/join` }} />
}

// Máy học sinh cần ai đó điều khiển phòng: phần này đóng vai giáo viên, tự sang câu sau mỗi bảng.
function StudentView({ students, questionMs }: { students: number; questionMs: number }) {
  // useState thay vì useMemo: `join` có tác dụng phụ, StrictMode gọi useMemo hai lần trên cùng một phòng.
  const [{ mock, joined }] = useState(() => {
    const room = createMockRoom({ questionIds: QUESTION_IDS.slice(0, 3), virtualStudents: students, questionMs, grade: (_id, answer) => isRight(answer), correctAnswerOf: () => ({ selectedOptionId: 'a' }) })

    return { mock: room, joined: room.join('Ong Vàng 27') }
  })

  useEffect(() => {
    const { teacher } = mock
    const timers = [setTimeout(() => void teacher.start().then(() => teacher.next()), NEXT_STEP_MS)]
    let asked = 0
    const unsubscribe = teacher.subscribe((event) => {
      if (event.type === 'question' && event.data.index + 1 > asked) asked = event.data.index + 1
      if (event.type !== 'board') return

      timers.push(setTimeout(() => void teacher.reveal(), NEXT_STEP_MS / 2))
      timers.push(setTimeout(() => void (asked >= 3 ? teacher.finish() : teacher.next()), NEXT_STEP_MS))
    })

    void teacher.connect()

    return () => {
      timers.forEach(clearTimeout)
      unsubscribe()
      teacher.disconnect()
    }
  }, [mock])

  return <RoomStudentScreen client={joined.client} nickname="Ong Vàng 27" game={GAME} />
}

// Chỉ có ở bản dev: chạy phòng thi đấu bằng mock. `?n=0` phòng trống (mặc định 30 học sinh ảo), `?ms=5000` rút ngắn mỗi câu,
// `?view=student` xem máy học sinh, `?view=SESSION_FULL` xem lỗi vào phòng.
export default function RoomSandbox() {
  const [params] = useSearchParams()
  const students = Number(params.get('n') ?? 30)
  const questionMs = Number(params.get('ms') ?? 20_000)
  const view = params.get('view')
  const failed = useMemo(() => {
    if (view !== 'SESSION_FULL') return null

    try {
      createMockRoom({ questionIds: QUESTION_IDS, maxParticipants: 0 }).join('Ong Vàng 27')

      return null
    } catch (error) {
      return error instanceof RoomJoinError ? error.code : null
    }
  }, [view])

  if (failed) return <RoomJoinErrorScreen code={failed} />

  return view === 'student' ? <StudentView students={students} questionMs={questionMs} /> : <TeacherView students={students} questionMs={questionMs} />
}
