import { gsap } from 'gsap'
import { env } from '../engine'

/* Figma "in this section only" (1920 frame): centre card 460.6 wide; the others… */
/** …234.5 wide… */
const SMALL = 0.5091
/** …38 px apart, as a share of the centre card's width… */
const GAP = 0.0825
/** …with their middles 38 px lower than the centre card's. */
const DROP = 0.0825
/** Blur on every card but the centred one, in card pixels. */
const BLUR = 8
/** Cards further than this from the centre fade out; they wrap round out of sight. */
const VISIBLE = 3.5
const SELECT = { duration: 1.1, ease: 'expo.inOut' }
/** "Only slight snapping": a short settle onto the nearest card after a drag or a swipe. */
const SNAP = { duration: 0.6, ease: 'power3.out' }
const SPIN = { duration: 2.6, ease: 'power3.inOut' }
/** How far ahead a flick carries, in ms of its release velocity. */
const FLICK_MS = 180
/** Pointer travel (px) before a press becomes a drag instead of a click. */
const DRAG_PX = 6
/** Idle time (ms) after horizontal wheel/trackpad input before snapping. */
const WHEEL_SNAP_MS = 140

export interface Carousel {
  /** Glide slot `index` to the centre, the short way round. */
  select(index: number): void
  next(): void
  prev(): void
  /** "im feeling lucky": spin at least once round and stop on a random card. */
  spin(): void
  destroy(): void
}

/**
 * SEQ3 – an endless card carousel. Imperative and React-free: it owns every `.card`'s position,
 * scale, blur and opacity from one continuous value, `pos` (the slot at the centre). The ring
 * needs enough slots that the ones wrapping from one end to the other are always out of sight.
 *
 * Input: click a card, drag or swipe (with momentum and a slight snap), horizontal wheel or
 * trackpad, ← →. Vertical scrolling always goes to the page.
 */
export function createCarousel(root: HTMLElement, track: HTMLElement): Carousel {
  const cards = gsap.utils.toArray<HTMLElement>('.card', track)
  const hits = cards.map((card) => card.querySelector<HTMLElement>('.card__hit'))
  const n = cards.length
  const state = { pos: 0 }
  let tween: gsap.core.Tween | null = null
  let active = -1

  /** Signed ring distance, folded into −n/2 … n/2. */
  const wrap = (d: number) => d - n * Math.round(d / n)

  let w = 0
  let first = 0
  let step = 0
  const measure = () => {
    w = cards[0]?.offsetWidth ?? 0
    first = w * (0.5 + GAP + SMALL / 2)
    step = w * (SMALL + GAP)
  }

  /** Last written style per card, so a frame only touches what changed. */
  const written = cards.map(() => ({ transform: '', filter: '', opacity: '', z: '' }))

  const render = () => {
    cards.forEach((card, i) => {
      const d = wrap(i - state.pos)
      const a = Math.abs(d)
      const near = Math.min(a, 1)
      const x = Math.sign(d) * (a <= 1 ? a * first : first + (a - 1) * step)
      const scale = 1 - (1 - SMALL) * near
      const blur = env.reducedMotion ? 0 : Math.round(BLUR * near * 2) / 2
      const style = {
        transform: `translate3d(${x.toFixed(2)}px, ${(DROP * w * near).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`,
        // A filter, even blur(0), costs a compositing pass – drop it when it does nothing.
        filter: blur ? `blur(${blur}px)` : '',
        opacity: String(gsap.utils.clamp(0, 1, (VISIBLE + 0.5 - a) * 2)),
        z: String(100 - Math.round(a * 10)),
      }
      const prev = written[i]!
      if (prev.transform !== style.transform) card.style.transform = style.transform
      if (prev.filter !== style.filter) card.style.filter = style.filter
      if (prev.opacity !== style.opacity) card.style.opacity = style.opacity
      if (prev.z !== style.z) card.style.zIndex = style.z
      written[i] = style
    })

    const now = ((Math.round(state.pos) % n) + n) % n
    if (now !== active) {
      active = now
      hits.forEach((hit, i) => {
        hit?.setAttribute('aria-pressed', String(i === now))
        if (hit) hit.tabIndex = i === now || Math.abs(wrap(i - now)) <= 1 ? 0 : -1
      })
    }
  }

  const goTo = (target: number, { duration, ease }: { duration: number; ease: string }) => {
    tween?.kill()
    tween = gsap.to(state, { pos: target, duration: env.reducedMotion ? 0 : duration, ease, onUpdate: render, onComplete: render })
  }

  const select = (index: number) => {
    const from = Math.round(state.pos)
    const target = from + wrap(index - from)
    if (target !== state.pos) goTo(target, SELECT)
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  let drag: { id: number; x: number; pos: number; moved: boolean; t: number; v: number } | null = null
  let suppressClick = false

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    drag = { id: e.pointerId, x: e.clientX, pos: state.pos, moved: false, t: e.timeStamp, v: 0 }
  }
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    const dx = e.clientX - drag.x
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_PX) return
      drag.moved = true
      tween?.kill()
      drag.pos = state.pos + dx / first // pick up from where the card is now, without a jump
      track.setPointerCapture(e.pointerId)
      track.classList.add('is-dragging')
    }
    const pos = drag.pos - dx / first
    const dt = Math.max(1, e.timeStamp - drag.t)
    drag.v = ((state.pos - pos) / dt) * 0.8 + drag.v * 0.2 // slots per ms, smoothed
    drag.t = e.timeStamp
    state.pos = pos
    render()
  }
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    const { moved, v } = drag
    drag = null
    if (!moved) return
    track.classList.remove('is-dragging')
    suppressClick = true // the click that ends a drag is not a selection
    setTimeout(() => (suppressClick = false))
    goTo(Math.round(state.pos - v * FLICK_MS), SNAP)
  }

  const onClick = (e: MouseEvent) => {
    if (suppressClick) return
    const hit = (e.target as Element).closest<HTMLElement>('.card__hit')
    if (hit?.dataset.index) select(Number(hit.dataset.index))
  }

  let wheelTimer = 0
  const onWheel = (e: WheelEvent) => {
    // Only sideways gestures belong to the carousel; vertical ones scroll the page.
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    e.preventDefault()
    tween?.kill()
    state.pos += e.deltaX / first
    render()
    clearTimeout(wheelTimer)
    wheelTimer = window.setTimeout(() => goTo(Math.round(state.pos), SNAP), WHEEL_SNAP_MS)
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') select(Math.round(state.pos) + 1)
    else if (e.key === 'ArrowLeft') select(Math.round(state.pos) - 1)
    else return
    e.preventDefault()
  }

  const onResize = () => {
    measure()
    render()
  }

  track.addEventListener('pointerdown', onDown)
  track.addEventListener('pointermove', onMove)
  track.addEventListener('pointerup', onUp)
  track.addEventListener('pointercancel', onUp)
  track.addEventListener('click', onClick)
  track.addEventListener('wheel', onWheel, { passive: false })
  root.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)

  measure()
  render()

  return {
    select,
    next: () => select(Math.round(state.pos) + 1),
    prev: () => select(Math.round(state.pos) - 1),
    spin() {
      const from = Math.round(state.pos)
      // A different card, after one full turn of the ring.
      goTo(from + n + 1 + Math.floor(Math.random() * (n - 1)), SPIN)
    },
    destroy() {
      tween?.kill()
      clearTimeout(wheelTimer)
      track.removeEventListener('pointerdown', onDown)
      track.removeEventListener('pointermove', onMove)
      track.removeEventListener('pointerup', onUp)
      track.removeEventListener('pointercancel', onUp)
      track.removeEventListener('click', onClick)
      track.removeEventListener('wheel', onWheel)
      root.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      track.classList.remove('is-dragging')
      cards.forEach((card) => {
        card.style.removeProperty('transform')
        card.style.removeProperty('filter')
        card.style.removeProperty('opacity')
        card.style.removeProperty('z-index')
      })
    },
  }
}
