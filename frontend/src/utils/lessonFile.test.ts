import { describe, expect, it } from 'vitest'
import {
  LESSON_FILE_MAX_BYTES,
  checkLessonFile,
  formatFileSize,
} from './lessonFile'

describe('checkLessonFile (UC-02, ngoại lệ 3c và 3d)', () => {
  it.each(['giao-an.pdf', 'Giao An.DOCX', 'bai-1.Pdf', 'a.b.c.docx'])(
    'chấp nhận %s',
    (name) => {
      expect(checkLessonFile({ name, size: 1024 })).toBeNull()
    },
  )

  it.each(['ghi-chu.txt', 'anh.png', 'giao-an.doc', 'giao-an.pdf.exe', 'pdf', 'docx'])(
    'từ chối %s vì sai định dạng',
    (name) => {
      expect(checkLessonFile({ name, size: 1024 })).toBe('badType')
    },
  )

  it('đúng 10 MB còn được, hơn 1 byte thì quá lớn', () => {
    expect(checkLessonFile({ name: 'a.pdf', size: LESSON_FILE_MAX_BYTES })).toBeNull()
    expect(checkLessonFile({ name: 'a.pdf', size: LESSON_FILE_MAX_BYTES + 1 })).toBe('tooLarge')
  })

  it('sai định dạng được báo trước khi xét dung lượng', () => {
    expect(checkLessonFile({ name: 'a.txt', size: LESSON_FILE_MAX_BYTES * 2 })).toBe('badType')
  })
})

describe('formatFileSize', () => {
  it('đổi sang B, KB, MB dễ đọc', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })
})
