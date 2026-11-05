import { gsap } from 'gsap'

/**
 * The single requestAnimationFrame loop for the whole site.
 *
 * GSAP's ticker is used as the master clock so that Lenis, ScrollTrigger, tweens and any
 * custom per-frame work all run in the same frame, in a deterministic order, with one rAF.
 * Never start a separate rAF loop – subscribe here instead.
 */

export type FrameCallback = (time: number, deltaMs: number) => void

export const clock = {
  /** Subscribe to every frame. `time` is seconds since start. Returns an unsubscribe fn. */
  add(fn: FrameCallback, prioritize = false) {
    gsap.ticker.add(fn, false, prioritize)
    return () => gsap.ticker.remove(fn)
  },
  /** Run once on the next frame. */
  once(fn: FrameCallback) {
    gsap.ticker.add(fn, true)
  },
}

/** Called once by the engine. */
export function initClock() {
  // Never "catch up" after a stall (tab switch, long task) – jumping is worse than a dropped frame.
  gsap.ticker.lagSmoothing(0)
}
