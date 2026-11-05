import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * A Scene maps a scroll range onto a normalized progress value (0 → 1).
 *
 * Pinning is done in CSS (`position: sticky`, see <Scene />), not by ScrollTrigger's pin:
 * sticky is composited by the browser, needs no pin-spacer DOM surgery, and never jitters
 * on mobile. The default range – section top hits viewport top → section bottom hits
 * viewport bottom – is exactly the span during which a sticky stage is pinned.
 *
 * Progress is delivered by callback, never by React state.
 */

export interface SceneOptions {
  trigger: Element
  /** ScrollTrigger start/end syntax. Defaults match a sticky-pinned stage. */
  start?: string
  end?: string
  /** A paused GSAP timeline whose playhead is bound to scroll. */
  timeline?: gsap.core.Timeline
  /** true = locked to scroll; number = seconds of catch-up smoothing (timeline only). */
  scrub?: boolean | number
  /** Fired whenever scroll progress changes (in the shared frame loop). */
  onProgress?: (progress: number, velocity: number) => void
  /** Fired when the scene enters/leaves its active range – use to start/stop expensive work. */
  onToggle?: (active: boolean) => void
}

export interface Scene {
  readonly progress: number
  readonly active: boolean
  kill(): void
}

export function createScene(o: SceneOptions): Scene {
  const st = ScrollTrigger.create({
    trigger: o.trigger,
    start: o.start ?? 'top top',
    end: o.end ?? 'bottom bottom',
    animation: o.timeline,
    scrub: o.timeline ? (o.scrub ?? true) : false,
    invalidateOnRefresh: true,
    onUpdate: o.onProgress && ((self) => o.onProgress!(self.progress, self.getVelocity())),
    onToggle: o.onToggle && ((self) => o.onToggle!(self.isActive)),
  })
  // Deliver the initial state (e.g. after a reload mid-page) without waiting for a scroll.
  o.onProgress?.(st.progress, 0)

  return {
    get progress() {
      return st.progress
    },
    get active() {
      return st.isActive
    },
    kill: () => st.kill(),
  }
}
