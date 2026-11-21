export interface SceneSize {
  width: number
  height: number
}

/** Scale a scene uniformly so its full source image fits within the viewport. */
export function getSceneScale(scene: SceneSize, viewport: SceneSize, maxScale = 1): number | null {
  if (![scene.width, scene.height, viewport.width, viewport.height, maxScale].every(Number.isFinite)) return null
  if (scene.width <= 0 || scene.height <= 0 || viewport.width <= 0 || viewport.height <= 0 || maxScale <= 0) return null
  return Math.min(maxScale, viewport.width / scene.width, viewport.height / scene.height)
}
