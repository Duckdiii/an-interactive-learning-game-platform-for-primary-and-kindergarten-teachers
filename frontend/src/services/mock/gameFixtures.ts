import type {
  AudioVisualMatchGame,
  DragDropGame,
  GameDsl,
  MatchingGame,
  MemoryCardGame,
  OddOneOutGame,
  OrderingGame,
  QuizGame,
  SpotTheTargetGame,
  VisualClozeGame,
  WordScrambleGame,
} from '../../types/game-dsl.types'

// Nội dung game mẫu (DSL v1.0.0) cho nhóm mô phỏng: mỗi loại game một trò chơi, mỗi trò 3 câu, hợp lệ theo schema
// (số lượng, độ dài, mẫu id). Đáp án nằm sẵn trong dữ liệu vì đây là dạng dành cho giáo viên.
// Thứ tự mảng khớp danh sách tóm tắt ở `mockGames.ts` (cùng tên, môn, khối lớp, loại game).

const q = (n: number) => ({ id: `q${n}`, timeLimitSeconds: 30, points: 10 })
const settings = () => ({ hitboxScale: 1.5 })

const quiz: QuizGame = {
  schemaVersion: '1.0.0',
  gameType: 'QUIZ',
  metadata: { title: 'Đếm số đến 10', subject: 'MATH', gradeLevel: 'KINDERGARTEN', topic: 'Đếm số lượng đồ vật từ 1 đến 10' },
  gameplaySettings: settings(),
  questions: [
    { ...q(1), audioText: 'Có mấy quả táo?', visualPrompt: 'three red apples on a table', questionText: 'Có mấy quả táo trong hình?', options: [{ id: 'a', text: '2' }, { id: 'b', text: '3' }, { id: 'c', text: '4' }], correctOptionId: 'b' },
    { ...q(2), audioText: 'Con hãy đếm các bông hoa', visualPrompt: 'five colorful flowers in a vase', questionText: 'Có mấy bông hoa?', options: [{ id: 'a', text: '4' }, { id: 'b', text: '5' }, { id: 'c', text: '6' }, { id: 'd', text: '7' }], correctOptionId: 'b' },
    { ...q(3), audioText: 'Số nào đứng sau số tám?', questionText: 'Số nào đứng ngay sau số 8?', options: [{ id: 'a', text: '7' }, { id: 'b', text: '9' }, { id: 'c', text: '10' }], correctOptionId: 'b' },
  ],
}

const matching: MatchingGame = {
  schemaVersion: '1.0.0',
  gameType: 'MATCHING',
  metadata: { title: 'Nhận biết chữ cái A Ă Â', subject: 'VIETNAMESE', gradeLevel: 'KINDERGARTEN', topic: 'Nhận biết các chữ cái a, ă, â qua hình ảnh quen thuộc' },
  gameplaySettings: settings(),
  questions: [
    { ...q(1), audioText: 'Nối chữ cái với hình', pairs: [{ pairId: 'p1', left: { text: 'a' }, right: { text: 'ao' } }, { pairId: 'p2', left: { text: 'ă' }, right: { text: 'ăn' } }, { pairId: 'p3', left: { text: 'â' }, right: { text: 'ấm' } }] },
    { ...q(2), audioText: 'Nối chữ hoa với chữ thường', pairs: [{ pairId: 'p1', left: { text: 'A' }, right: { text: 'a' } }, { pairId: 'p2', left: { text: 'Ă' }, right: { text: 'ă' } }, { pairId: 'p3', left: { text: 'Â' }, right: { text: 'â' } }] },
    { ...q(3), audioText: 'Nối chữ với tiếng bắt đầu bằng chữ đó', pairs: [{ pairId: 'p1', left: { text: 'a' }, right: { text: 'anh' } }, { pairId: 'p2', left: { text: 'ă' }, right: { text: 'ăn' } }, { pairId: 'p3', left: { text: 'â' }, right: { text: 'âm' } }, { pairId: 'p4', left: { text: 'b' }, right: { text: 'ba' } }] },
  ],
}

const dragDrop: DragDropGame = {
  schemaVersion: '1.0.0',
  gameType: 'DRAG_DROP',
  metadata: { title: 'Phân loại con vật theo nơi sống', subject: 'VIETNAMESE', gradeLevel: 'GRADE_1', topic: 'Phân loại các con vật theo nơi chúng sống' },
  gameplaySettings: settings(),
  questions: [
    { ...q(1), audioText: 'Kéo mỗi con vật về đúng nơi sống', dropZones: [{ id: 'z1', label: 'Dưới nước' }, { id: 'z2', label: 'Trên cạn' }], items: [{ id: 'i1', text: 'Con cá', targetZoneId: 'z1' }, { id: 'i2', text: 'Con mèo', targetZoneId: 'z2' }, { id: 'i3', text: 'Con cua', targetZoneId: 'z1' }, { id: 'i4', text: 'Con gà', targetZoneId: 'z2' }] },
    { ...q(2), audioText: 'Con vật nào ở nhà, con vật nào ở rừng?', dropZones: [{ id: 'z1', label: 'Ở nhà' }, { id: 'z2', label: 'Trong rừng' }], items: [{ id: 'i1', text: 'Con chó', targetZoneId: 'z1' }, { id: 'i2', text: 'Con hổ', targetZoneId: 'z2' }, { id: 'i3', text: 'Con voi', targetZoneId: 'z2' }] },
    { ...q(3), audioText: 'Phân loại con vật có cánh và không có cánh', dropZones: [{ id: 'z1', label: 'Biết bay' }, { id: 'z2', label: 'Không biết bay' }], items: [{ id: 'i1', text: 'Con chim', targetZoneId: 'z1' }, { id: 'i2', text: 'Con bướm', targetZoneId: 'z1' }, { id: 'i3', text: 'Con trâu', targetZoneId: 'z2' }] },
  ],
}

const audioVisual: AudioVisualMatchGame = {
  schemaVersion: '1.0.0',
  gameType: 'AUDIO_VISUAL_MATCH',
  metadata: { title: 'Nghe và chọn hình con vật', subject: 'ENGLISH', gradeLevel: 'KINDERGARTEN', topic: 'Nghe tên con vật bằng tiếng Anh và chọn hình đúng' },
  gameplaySettings: settings(),
  questions: [
    { ...q(1), audioText: 'Cat', correct: { visualPrompt: 'a cute cat' }, distractors: [{ visualPrompt: 'a brown dog' }, { visualPrompt: 'a small bird' }] },
    { ...q(2), audioText: 'Dog', correct: { visualPrompt: 'a brown dog' }, distractors: [{ visualPrompt: 'a cute cat' }, { visualPrompt: 'a white rabbit' }] },
    { ...q(3), audioText: 'Fish', correct: { visualPrompt: 'a goldfish in a bowl' }, distractors: [{ visualPrompt: 'a small bird' }, { visualPrompt: 'a white rabbit' }, { visualPrompt: 'a cute cat' }] },
  ],
}

const ordering: OrderingGame = {
  schemaVersion: '1.0.0',
  gameType: 'ORDERING',
  metadata: { title: 'Sắp xếp các số từ bé đến lớn', subject: 'MATH', gradeLevel: 'GRADE_1', topic: 'Sắp xếp các số trong phạm vi 10 theo thứ tự tăng dần' },
  gameplaySettings: settings(),
  questions: [
    { ...q(1), audioText: 'Xếp các số từ bé đến lớn', steps: [{ id: 's1', text: '7', correctPosition: 3 }, { id: 's2', text: '2', correctPosition: 1 }, { id: 's3', text: '5', correctPosition: 2 }] },
    { ...q(2), audioText: 'Xếp các số từ bé đến lớn', steps: [{ id: 's1', text: '9', correctPosition: 4 }, { id: 's2', text: '3', correctPosition: 1 }, { id: 's3', text: '8', correctPosition: 3 }, { id: 's4', text: '6', correctPosition: 2 }] },
    { ...q(3), audioText: 'Xếp các bước đánh răng theo đúng thứ tự', steps: [{ id: 's1', text: 'Súc miệng', correctPosition: 3 }, { id: 's2', text: 'Lấy kem đánh răng', correctPosition: 1 }, { id: 's3', text: 'Chải răng', correctPosition: 2 }] },
  ],
}

const memory: MemoryCardGame = {
  schemaVersion: '1.0.0',
  gameType: 'MEMORY_CARD',
  metadata: { title: 'Lật thẻ tìm cặp con vật', subject: 'ENGLISH', gradeLevel: 'KINDERGARTEN', topic: 'Ghi nhớ tên con vật bằng tiếng Anh qua trò chơi lật thẻ' },
  gameplaySettings: settings(),
  questions: [
    { ...q(1), audioText: 'Tìm hai thẻ giống nhau', pairs: [{ pairId: 'p1', content: { text: 'cat' } }, { pairId: 'p2', content: { text: 'dog' } }, { pairId: 'p3', content: { text: 'bird' } }] },
    { ...q(2), audioText: 'Tìm hai thẻ giống nhau', pairs: [{ pairId: 'p1', content: { text: 'fish' } }, { pairId: 'p2', content: { text: 'duck' } }, { pairId: 'p3', content: { text: 'cow' } }, { pairId: 'p4', content: { text: 'pig' } }] },
    { ...q(3), audioText: 'Tìm hai thẻ giống nhau', pairs: [{ pairId: 'p1', content: { text: 'red' } }, { pairId: 'p2', content: { text: 'blue' } }] },
  ],
}

const spot: SpotTheTargetGame = {
  schemaVersion: '1.0.0',
  gameType: 'SPOT_THE_TARGET',
  metadata: { title: 'Tìm đúng vật trong tranh nông trại', subject: 'VIETNAMESE', gradeLevel: 'GRADE_1', topic: 'Quan sát tranh nông trại và tìm đúng con vật' },
  gameplaySettings: settings(),
  questions: [
    { ...q(1), audioText: 'Con hãy tìm chú gà trống', visualPrompt: 'a farm yard with a rooster, a cow and a pig', targetDescription: 'chú gà trống', hitRegion: { x: 0.3, y: 0.55, radius: 0.12 } },
    { ...q(2), audioText: 'Con hãy tìm con bò', visualPrompt: 'a farm yard with a rooster, a cow and a pig', targetDescription: 'con bò', hitRegion: { x: 0.65, y: 0.5, radius: 0.15 } },
    { ...q(3), audioText: 'Con hãy tìm ngôi nhà', visualPrompt: 'a red barn on a green field', targetDescription: 'ngôi nhà gỗ màu đỏ' },
  ],
}

const wordScramble: WordScrambleGame = {
  schemaVersion: '1.0.0',
  gameType: 'WORD_SCRAMBLE',
  metadata: { title: 'Ghép chữ thành từ về gia đình', subject: 'VIETNAMESE', gradeLevel: 'GRADE_1', topic: 'Ghép các chữ cái thành từ chỉ người thân trong gia đình' },
  gameplaySettings: settings(),
  questions: [
    { ...q(1), audioText: 'Ghép chữ thành từ chỉ người sinh ra con', correctWord: 'mẹ', scrambledLetters: ['ẹ', 'm'] },
    { ...q(2), audioText: 'Ghép chữ thành từ chỉ người sinh ra con', correctWord: 'bố', scrambledLetters: ['ố', 'b'] },
    { ...q(3), audioText: 'Ghép chữ thành từ chỉ anh của em', correctWord: 'anh', scrambledLetters: ['h', 'a', 'n'] },
  ],
}

const oddOneOut: OddOneOutGame = {
  schemaVersion: '1.0.0',
  gameType: 'ODD_ONE_OUT',
  metadata: { title: 'Tìm vật khác loại', subject: 'MATH', gradeLevel: 'KINDERGARTEN', topic: 'Tìm hình khác loại trong một nhóm hình' },
  gameplaySettings: settings(),
  questions: [
    { ...q(1), audioText: 'Con hãy chọn hình khác loại', items: [{ id: 'a', text: 'Hình tròn nhỏ' }, { id: 'b', text: 'Hình tròn to' }, { id: 'c', text: 'Hình vuông' }], oddOneOutId: 'c' },
    { ...q(2), audioText: 'Con hãy chọn con vật khác loại', items: [{ id: 'a', text: 'Con mèo' }, { id: 'b', text: 'Con chó' }, { id: 'c', text: 'Con cá' }, { id: 'd', text: 'Con bò' }], oddOneOutId: 'c' },
    { ...q(3), audioText: 'Con hãy chọn đồ vật khác loại', items: [{ id: 'a', text: 'Quả cam' }, { id: 'b', text: 'Quả chuối' }, { id: 'c', text: 'Quả táo' }, { id: 'd', text: 'Cái bàn' }], oddOneOutId: 'd' },
  ],
}

const cloze: VisualClozeGame = {
  schemaVersion: '1.0.0',
  gameType: 'VISUAL_CLOZE',
  metadata: { title: 'Điền từ còn thiếu trong câu', subject: 'VIETNAMESE', gradeLevel: 'GRADE_1', topic: 'Chọn từ phù hợp để điền vào chỗ trống trong câu có hình minh họa' },
  gameplaySettings: settings(),
  questions: [
    { ...q(1), audioText: 'Chọn từ điền vào chỗ trống', visualPrompt: 'a cat sleeping on a sofa', sentenceTemplate: 'Con mèo đang ___ trên ghế.', correctAnswer: 'ngủ', distractors: ['chạy', 'bay'] },
    { ...q(2), audioText: 'Chọn từ điền vào chỗ trống', visualPrompt: 'a bird flying in the sky', sentenceTemplate: 'Con chim đang ___ trên trời.', correctAnswer: 'bay', distractors: ['bơi', 'ngủ'] },
    { ...q(3), audioText: 'Chọn từ điền vào chỗ trống', visualPrompt: 'a fish swimming in a pond', sentenceTemplate: 'Con cá đang ___ dưới ao.', correctAnswer: 'bơi', distractors: ['bay', 'chạy', 'hát'] },
  ],
}

/** Nội dung 10 game mẫu, đúng thứ tự của `mockGames.ts`. */
export function buildMockGameContents(): GameDsl[] {
  return structuredClone([quiz, matching, dragDrop, audioVisual, ordering, memory, spot, wordScramble, oddOneOut, cloze])
}
