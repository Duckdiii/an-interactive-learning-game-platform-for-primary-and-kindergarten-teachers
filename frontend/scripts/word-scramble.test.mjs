import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hasSameLetters, matchesWordPosition } from '../src/components/game/renderers/word-scramble/logic.ts'

test('either P tile matches either P position in APPLE', () => {
  assert.equal(matchesWordPosition('APPLE', 'P', 1), true)
  assert.equal(matchesWordPosition('APPLE', 'p', 2), true)
  assert.equal(matchesWordPosition('APPLE', 'A', 1), false)
  assert.equal(hasSameLetters('APPLE', ['E', 'P', 'A', 'P', 'L']), true)
  assert.equal(hasSameLetters('APPLE', ['E', 'P', 'A', 'P', 'R']), false)
})
