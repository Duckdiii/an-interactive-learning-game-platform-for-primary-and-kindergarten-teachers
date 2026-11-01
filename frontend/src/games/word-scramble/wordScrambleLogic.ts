export function normalizeWord(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function isWordMatch(submitted: string, correct: string): boolean {
  return normalizeWord(submitted) === normalizeWord(correct)
}
