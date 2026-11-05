import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { clock } from './clock'
import { env } from './env'

/**
 * Scroll is always the document's native scroll. Lenis only smooths wheel/trackpad input on
 * desktop; touch devices keep native momentum scrolling (best feel, zero extra main-thread
 * work). Because the native scroll position is always truthful, CSS `position: sticky`,
 * native scroll-driven CSS animations and ScrollTrigger all stay in sync for free.
 */

let lenis: Lenis | null = null
let stopClock: (() => void) | null = null

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function createLenis() {
  lenis = new Lenis({
    autoRaf: false,
    lerp: 0.12,
    smoothWheel: true,
    syncTouch: false,
  })
  lenis.on('scroll', ScrollTrigger.update)
  stopClock = clock.add((time) => lenis?.raf(time * 1000), true)
}

function destroyLenis() {
  stopClock?.()
  lenis?.destroy()
  lenis = null
  stopClock = null
}

export function initScroll() {
  gsap.registerPlugin(ScrollTrigger)
  // Mobile URL-bar show/hide fires resize; recomputing every trigger then causes visible jumps.
  ScrollTrigger.config({ ignoreMobileResize: true })

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

  const enable = () => !env.reducedMotion && !env.coarsePointer
  if (enable()) createLenis()

  const offMotion = env.onReducedMotionChange(() => (enable() ? lenis || createLenis() : destroyLenis()))

  // Layout can shift once web fonts land; re-measure triggers once.
  document.fonts?.ready.then(() => ScrollTrigger.refresh())

  return () => {
    offMotion()
    destroyLenis()
    ScrollTrigger.getAll().forEach((t) => t.kill())
  }
}

interface ScrollToOptions {
  offset?: number
  immediate?: boolean
  /** Seconds. Given → a timed, eased glide on any device; omitted → the browser/Lenis default. */
  duration?: number
  /** Ignore user input until the scroll arrives. */
  lock?: boolean
  onComplete?: () => void
}

/** Document Y of a scroll target, or null if a selector matches nothing. */
function targetY(target: number | string | HTMLElement) {
  if (typeof target === 'number') return target
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  return el ? el.getBoundingClientRect().top + window.scrollY : null
}

/** Programmatic scroll without Lenis (touch devices, reduced motion). */
function nativeScrollTo(target: number | string | HTMLElement, opts: ScrollToOptions, immediate: boolean) {
  const base = targetY(target)
  if (base === null) return
  const y = base + (opts.offset ?? 0)

  if (immediate || !opts.duration) {
    window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' })
    if (immediate) opts.onComplete?.()
    return
  }

  // Timed glide, driven from the shared clock.
  const root = document.documentElement
  if (opts.lock) root.style.overflow = 'hidden'
  const pos = { y: window.scrollY }
  gsap.to(pos, {
    y,
    duration: opts.duration,
    ease: 'power3.inOut',
    overwrite: true,
    onUpdate: () => window.scrollTo(0, pos.y),
    onComplete: () => {
      if (opts.lock) root.style.overflow = ''
      opts.onComplete?.()
    },
  })
}

export const scroll = {
  /** Smooth (when enabled) programmatic scroll. See ScrollToOptions. */
  to(target: number | string | HTMLElement, opts: ScrollToOptions = {}) {
    const immediate = opts.immediate || env.reducedMotion
    if (lenis) return lenis.scrollTo(target, { ...opts, immediate, easing: opts.duration ? easeInOutCubic : undefined })
    nativeScrollTo(target, opts, immediate)
  },
  /** Freeze user scrolling (e.g. while a loader or overlay is up). */
  lock() {
    lenis?.stop()
    document.documentElement.style.overflow = 'hidden'
  },
  unlock() {
    document.documentElement.style.overflow = ''
    lenis?.start()
  },
  /** Re-measure all scroll triggers after a layout change React can't see (e.g. late media). */
  refresh() {
    ScrollTrigger.refresh()
  },
}
