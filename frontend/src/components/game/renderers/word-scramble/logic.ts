export function matchesWordPosition(targetWord: string, character: string, position: number) {
  const expectedCharacter = [...targetWord][position]
  return expectedCharacter !== undefined && character.toUpperCase() === expectedCharacter.toUpperCase()
}

export function hasSameLetters(targetWord: string, scrambledLetters: string[]) {
  const normalize = (letter: string) => letter.toUpperCase()
  const expected = [...targetWord].map(normalize).sort()
  const supplied = scrambledLetters.map(normalize).sort()
  return expected.length === supplied.length && expected.every((letter, index) => letter === supplied[index])
}
