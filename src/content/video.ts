/**
 * Intro video (Figma SEQ1, "VIDEO 1 - START/END"). To replace it, drop a new .mp4 into
 * `public/videos/` and update `src`. Encode it with `-movflags +faststart` (see README) so it can
 * start playing before it has fully downloaded.
 *
 * It fills the Journey's 16:9 design frame, which covers the screen; `position` sets which part
 * of that frame stays in view when the screen's aspect ratio crops it.
 */

export interface VideoConfig {
  src: string
  /** Lighter 720p encode for small screens, so phones buffer it quickly and play it smoothly. */
  smallSrc: string
  /** Crop alignment of the design frame: [x, y] in 0..1. */
  position: [number, number]
}

/** Screens at or below this width get `smallSrc`. */
const SMALL_SCREEN = '(max-width: 900px)'

/** The intro source for this screen. */
export const introVideoSrc = (v: VideoConfig) => (matchMedia(SMALL_SCREEN).matches ? v.smallSrc : v.src)

export const introVideo: VideoConfig = {
  src: '/videos/intro.mp4',
  smallSrc: '/videos/intro-720.mp4',
  position: [0.5, 0.5],
}
