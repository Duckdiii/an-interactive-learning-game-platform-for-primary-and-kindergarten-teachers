export function normalizeWord(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function isWordMatch(submitted: string, correct: string): boolean {
  return normalizeWord(submitted) === normalizeWord(correct)
}

export function matchesWordPosition(targetWord: string, character: string, position: number): boolean {
  const characters = [...targetWord]
  const expected = characters[position]
  return expected !== undefined && character.toUpperCase() === expected.toUpperCase()
}

export function hasSameLetters(targetWord: string, scrambledLetters: string[]): boolean {
  const normalize = (letter: string) => letter.toUpperCase()
  const expected = [...targetWord].map(normalize).sort()
  const supplied = scrambledLetters.map(normalize).sort()
  return expected.length === supplied.length && expected.every((letter, index) => letter === supplied[index])
}
