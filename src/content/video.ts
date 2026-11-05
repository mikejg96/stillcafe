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
  /** Crop alignment of the design frame: [x, y] in 0..1. */
  position: [number, number]
}

export const introVideo: VideoConfig = {
  src: '/videos/intro.mp4',
  position: [0.5, 0.5],
}
