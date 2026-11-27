/** True when a question has real source audio instead of a legacy demo placeholder. */
export function hasSourceAudio(audioUrl?: string | null): boolean {
  const trimmed = audioUrl?.trim()
  return Boolean(trimmed && !trimmed.startsWith('/mock/'))
}
