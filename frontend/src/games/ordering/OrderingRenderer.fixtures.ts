import type { OrderingQuestion } from '../../types/game-dsl.types'
import type { StudentOrderingQuestion } from '../../types/game-student.types'

/** Fixture chuẩn: Các bước đánh răng (3 bước). */
export const mockOrderingTeethQuestion: OrderingQuestion = {
  id: 'q1',
  audioText: 'Bé hãy sắp xếp các bước đánh răng theo đúng thứ tự nhé!',
  points: 10,
  timeLimitSeconds: 60,
  steps: [
    {
      id: 'step-1',
      text: 'Lấy kem đánh răng',
      correctPosition: 1,
    },
    {
      id: 'step-2',
      text: 'Chải răng thật sạch',
      correctPosition: 2,
    },
    {
      id: 'step-3',
      text: 'Súc miệng với nước',
      correctPosition: 3,
    },
  ],
}

/** Fixture có 4 bước kèm hình ảnh minh hoạ: Vòng đời của bướm. */
export const mockOrderingButterflyQuestion: OrderingQuestion = {
  id: 'q2',
  audioText: 'Hãy xếp đúng các giai đoạn phát triển của chú bướm!',
  imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400',
  points: 20,
  timeLimitSeconds: 90,
  steps: [
    {
      id: 'b-1',
      text: 'Trứng bướm',
      correctPosition: 1,
    },
    {
      id: 'b-2',
      text: 'Sâu bướm',
      correctPosition: 2,
    },
    {
      id: 'b-3',
      text: 'Kén nhộng',
      correctPosition: 3,
    },
    {
      id: 'b-4',
      text: 'Bướm xinh',
      correctPosition: 4,
    },
  ],
}

/** Chuyển câu hỏi sang định dạng học sinh (bỏ correctPosition). */
export function makeStudentOrderingFixture(question: OrderingQuestion): StudentOrderingQuestion {
  return {
    ...question,
    steps: question.steps.map(({ id, text, visualPrompt, imageUrl }) => ({
      id,
      text,
      visualPrompt,
      imageUrl,
    })),
  }
}
