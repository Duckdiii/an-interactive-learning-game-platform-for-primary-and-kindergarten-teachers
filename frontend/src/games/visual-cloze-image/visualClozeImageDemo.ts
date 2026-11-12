import type { VisualClozeImageQuestion } from './visualClozeImageTypes'

// Inline SVG keeps the sample self-contained so the renderer can be previewed without remote assets.
const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

export const visualClozeImageDemo: VisualClozeImageQuestion = {
  id: 'visual-cloze-image-demo',
  timeLimitSeconds: 45,
  points: 100,
  questionText: 'Chọn hình con bướm để điền vào chỗ trống trong khu vườn.',
  sceneWidth: 800,
  sceneHeight: 480,
  sceneImageUrl: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480"><rect width="800" height="480" fill="lightblue"/><circle cx="680" cy="80" r="42" fill="gold"/><path d="M0 345 Q190 260 390 350 T800 330 V480 H0Z" fill="yellowgreen"/><path d="M0 400 Q210 335 420 415 T800 390 V480 H0Z" fill="seagreen"/><path d="M165 345 Q175 260 220 215 M575 350 Q560 250 610 205" fill="none" stroke="forestgreen" stroke-width="14"/><g fill="pink"><circle cx="220" cy="205" r="24"/><circle cx="194" cy="228" r="20"/><circle cx="246" cy="228" r="20"/></g><g fill="white"><circle cx="610" cy="195" r="22"/><circle cx="584" cy="219" r="19"/><circle cx="636" cy="219" r="19"/></g><path d="M350 360v-62m-16 62v-43m32 43v-48" stroke="white" stroke-width="7" stroke-linecap="round"/><g fill="gold"><circle cx="334" cy="300" r="9"/><circle cx="366" cy="308" r="9"/></g></svg>'),
  blanks: [{ id: 'garden-butterfly', x: 430, y: 240 }],
  options: [
    { id: 'bee', visualPrompt: 'Con ong', imageUrl: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><ellipse cx="50" cy="56" rx="31" ry="21" fill="gold" stroke="saddlebrown" stroke-width="4"/><path d="M39 38v36m20-36v36" stroke="saddlebrown" stroke-width="9"/><ellipse cx="39" cy="28" rx="13" ry="19" fill="white" fill-opacity=".8"/><ellipse cx="62" cy="28" rx="13" ry="19" fill="white" fill-opacity=".8"/></svg>') },
    { id: 'butterfly', visualPrompt: 'Con bướm', imageUrl: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><ellipse cx="32" cy="38" rx="23" ry="28" fill="hotpink"/><ellipse cx="68" cy="38" rx="23" ry="28" fill="mediumpurple"/><ellipse cx="35" cy="68" rx="16" ry="20" fill="moccasin"/><ellipse cx="65" cy="68" rx="16" ry="20" fill="turquoise"/><path d="M50 32v49M49 33q-17-20-19-16m21 16q17-20 19-16" fill="none" stroke="indigo" stroke-width="5" stroke-linecap="round"/></svg>') },
    { id: 'ladybug', visualPrompt: 'Bọ rùa', imageUrl: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="56" r="31" fill="tomato" stroke="maroon" stroke-width="4"/><path d="M50 26v60" stroke="maroon" stroke-width="4"/><circle cx="39" cy="46" r="5" fill="black"/><circle cx="62" cy="56" r="5" fill="black"/><circle cx="40" cy="68" r="5" fill="black"/><circle cx="50" cy="25" r="14" fill="black"/></svg>') },
  ],
}
