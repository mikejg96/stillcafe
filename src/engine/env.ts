/**
 * Device / user-preference capabilities, read once at boot.
 * Everything here is static for the session except reduced motion, which is observable.
 */

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

export const env = {
  /** Touch-first device (phones, tablets): keeps native momentum scrolling. */
  coarsePointer: window.matchMedia('(pointer: coarse)').matches,
  get reducedMotion() {
    return reducedMotionQuery.matches
  },
  onReducedMotionChange(fn: (reduced: boolean) => void) {
    const h = (e: MediaQueryListEvent) => fn(e.matches)
    reducedMotionQuery.addEventListener('change', h)
    return () => reducedMotionQuery.removeEventListener('change', h)
  },
}

/** Device pixel ratio for canvases, capped at 2 – beyond that the cost is not visible. */
export const dpr = () => Math.min(window.devicePixelRatio || 1, 2)
