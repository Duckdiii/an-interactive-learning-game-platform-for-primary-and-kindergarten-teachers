/**
 * AssetPalette: Candy Gloss / Toy Palette design tokens for K-5 children.
 * Features high-contrast, friendly rounded geometries, thick strokes (3-4px),
 * and touch targets >= 64px for small hands.
 */

export const CANDY_PALETTE = {
  primary: '#FF6B4A',       // Warm coral orange
  candyPink: '#FF4081',     // Bubblegum pink
  mintGreen: '#00E676',     // Vibrant mint green
  sunnyYellow: '#FFD600',   // Warm buttercup yellow
  skyBlue: '#00B0FF',       // Crisp bright sky blue
  deepPurple: '#7C4DFF',    // Vivid grape violet
  creamWhite: '#FFFDF9',    // Warm milk-white background
  cardBg: '#FFFFFF',        // Pure white card face
  inkBorder: '#263238',     // High-contrast deep slate stroke (3-4px)
  shadowSoft: 'rgba(38, 50, 56, 0.18)',
  shadowGloss: 'rgba(255, 255, 255, 0.65)',
  balloonColors: [
    { fill: '#FF5252', highlight: '#FF8A80', stroke: '#B71C1C' }, // Cherry Red
    { fill: '#FF7043', highlight: '#FFAB91', stroke: '#BF360C' }, // Tangerine Orange
    { fill: '#FFCA28', highlight: '#FFE082', stroke: '#F57F17' }, // Sunny Gold
    { fill: '#66BB6A', highlight: '#A5D6A7', stroke: '#1B5E20' }, // Apple Green
    { fill: '#26C6DA', highlight: '#80DEEA', stroke: '#006064' }, // Turquoise
    { fill: '#42A5F5', highlight: '#90CAF9', stroke: '#0D47A1' }, // Sky Cyan
    { fill: '#AB47BC', highlight: '#CE93D8', stroke: '#4A148C' }, // Grape Purple
  ],
} as const

export const UI_SPECS = {
  minTouchTarget: 64,       // Minimum interactive hit area in px
  borderWidth: 4,           // Prominent cartoon outline in px
  borderRadius: 24,         // Rounded-2xl / rounded-3xl toy aesthetic
  fontFamily: '"Nunito", "Quicksand", system-ui, -apple-system, sans-serif',
  stageWidth: 1920,
  stageHeight: 1080,
} as const
