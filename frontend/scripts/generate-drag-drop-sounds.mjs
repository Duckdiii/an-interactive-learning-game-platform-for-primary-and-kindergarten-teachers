import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const sampleRate = 22050
const folder = fileURLToPath(new URL('../public/sounds/', import.meta.url))
mkdirSync(folder, { recursive: true })

function makeChime(filename, notes) {
  const noteDuration = 0.16
  const samples = Math.ceil((notes.length * noteDuration + 0.12) * sampleRate)
  const wav = Buffer.alloc(44 + samples * 2)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(wav.length - 8, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(sampleRate, 24)
  wav.writeUInt32LE(sampleRate * 2, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(samples * 2, 40)
  for (let index = 0; index < samples; index++) {
    const time = index / sampleRate
    let value = 0
    notes.forEach((frequency, note) => {
      const relative = time - note * noteDuration
      if (relative < 0 || relative > noteDuration + 0.1) return
      const envelope = Math.min(1, relative / 0.012) * Math.exp(-relative * 15)
      value += Math.sin(2 * Math.PI * frequency * relative) * envelope * 0.22
    })
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + index * 2)
  }
  writeFileSync(new URL(`../public/sounds/${filename}`, import.meta.url), wav)
}

makeChime('correct-drop.wav', [523.25, 659.25, 783.99])
makeChime('try-again.wav', [392, 440])
console.log('Generated two gentle drag/drop chimes.')
