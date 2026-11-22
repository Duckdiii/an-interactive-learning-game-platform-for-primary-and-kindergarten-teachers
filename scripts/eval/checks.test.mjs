import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkGame, composeIdea, looksEnglish, parseScenarios } from './checks.mjs'

test('đọc dòng kịch bản: môn, lớp, ý tưởng; bỏ dòng tiêu đề và môn lạ', () => {
  const md = [
    '| STT | Môn · Lớp | Giáo viên nhập (nguyên văn) | Thử điều gì | Kỳ vọng | Kết quả |',
    '| --- | --- | --- | --- | --- | --- |',
    '| 1   | Toán · Mầm non       | Cho các bé đếm số con vịt | Đếm số lượng nhỏ | x | y |',
    '| 31  | TNXH · Lớp 1         | Cây xanh | Môn lạ | x | y |',
    '| 4   | Tiếng Anh · Lớp 2    | Unit 3 my body | Từ vựng | x | y |',
  ].join('\n')

  assert.deepEqual(parseScenarios(md), [
    { id: 1, subject: 'MATH', gradeLevel: 'KINDERGARTEN', idea: 'Cho các bé đếm số con vịt', name: 'Đếm số lượng nhỏ' },
    { id: 4, subject: 'ENGLISH', gradeLevel: 'GRADE_2', idea: 'Unit 3 my body', name: 'Từ vựng' },
  ])
})

test('ghép thẻ giống frontend; thẻ trống thì dùng mô tả gốc', () => {
  const card = { learningGoal: 'Đếm 1-5', childAction: 'Chọn số', content: ['1 con vịt'], setting: '', unsupported: [] }
  assert.equal(composeIdea(card, 'x'), 'Mục tiêu: Đếm 1-5\nTrẻ sẽ: Chọn số\nNội dung: 1 con vịt')
  assert.equal(composeIdea({ content: [], unsupported: [] }, '  Đếm con vịt  '), 'Đếm con vịt')
})

test('nhận ra câu tiếng Anh, không nhầm câu tiếng Việt hay từ đơn', () => {
  assert.equal(looksEnglish('Match the words with the correct body parts.'), true)
  assert.equal(looksEnglish('Bé chọn quả bóng màu red'), false)
  assert.equal(looksEnglish('red'), false)
})

test('chấm game DSL: tên/lời dẫn tiếng Anh, câu trùng, mọi câu cùng đáp án, tỷ lệ hình', () => {
  const question = (text, answer) => ({
    questionText: text, visualPrompt: 'x', options: [{ id: 'a', text: answer }, { id: 'b', text: 'khác' }], correctOptionId: 'a',
  })
  const game = {
    metadata: { title: 'Balloon Color Pop' },
    questions: [question('Which one is Red?', 'đỏ'), question('Bé chọn màu đỏ', 'đỏ'), { ...question('Bé chọn màu đỏ', 'đỏ'), imageUrl: '/a.svg' }],
  }

  const result = checkGame(game)

  assert.deepEqual(result.images, { slots: 3, filled: 1 })
  assert.equal(result.problems.length, 4)
  assert.match(result.problems.join('\n'), /Tên game tiếng Anh[\s\S]*Lời dẫn tiếng Anh[\s\S]*Câu trùng[\s\S]*cùng đáp án/)
})

test('chấm game CPF: đáp án lấy từ answerKey theo màn PICK_ONE; game tốt thì không có vấn đề', () => {
  const round = (id, answer) => ({ task: 'PICK_ONE', prompt: `Phép cộng nào bằng 12? (${id})`, choices: [{ id: 'c1', label: answer }, { id: 'c2', label: '1 + 1' }] })
  const game = {
    cpf: {
      metadata: { title: 'Thỏ hứng cà rốt' },
      content: { rounds: [round(1, '5 + 7'), round(2, '6 + 6'), round(3, '4 + 8')] },
      answerKey: { rounds: [{ correctChoiceIds: ['c1'] }, { correctChoiceIds: ['c1'] }, { correctChoiceIds: ['c1'] }] },
    },
  }

  assert.deepEqual(checkGame(game), { title: 'Thỏ hứng cà rốt', questions: 3, images: null, problems: [] })
})
