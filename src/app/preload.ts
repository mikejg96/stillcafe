/**
 * Loading phases, in order – each starts only when the one before it is done, so nothing
 * competes with the intro for bandwidth:
 *
 *   1. gate     The loader stays up until everything `track()`ed has settled (fonts, logo, then
 *               the intro video – see Journey), then "reveals" exactly once (`onReveal()`).
 *   2. intro    The intro video plays with scroll locked. Journey calls `finishIntro()` when it
 *               ends (or fails), and the page becomes scrollable.
 *   3. rest     Below-the-fold media is only requested from then on (`deferMedia()`).
 */

/** Never flash the loader for a split second. */
const MIN_MS = 600
/** Generous fallback timeout in case of unexpected network stall. */
const MAX_MS = 30_000

const tasks = new Set<Promise<unknown>>()
const listeners = new Set<() => void>()
const startedAt = performance.now()
let revealed = false

function check() {
  if (revealed || tasks.size > 0 || performance.now() - startedAt < MIN_MS) return
  reveal()
}

function reveal() {
  if (revealed) return
  revealed = true
  listeners.forEach((fn) => fn())
  listeners.clear()
}

setTimeout(check, MIN_MS)
setTimeout(reveal, MAX_MS)

export const preload = {
  /** Hold the loader until `promise` settles. Returns an untrack fn (for unmount / StrictMode). */
  track(promise: Promise<unknown>) {
    if (revealed) return () => {}
    tasks.add(promise)
    const done = () => {
      tasks.delete(promise)
      check()
    }
    promise.then(done, done)
    return done
  },

  /** Run `fn` on reveal (immediately if it already happened). Returns an unsubscribe fn. */
  onReveal(fn: () => void) {
    if (revealed) {
      fn()
      return () => {}
    }
    listeners.add(fn)
    return () => void listeners.delete(fn)
  },

  get revealed() {
    return revealed
  },

  /** The intro has finished playing (or was skipped): below-the-fold media may load now. */
  finishIntro() {
    if (introDone) return
    introDone = true
    introListeners.forEach((fn) => fn())
    introListeners.clear()
  },

  /** Run `fn` once the intro is done (immediately if it already is). Returns an unsubscribe fn. */
  onIntroDone(fn: () => void) {
    if (introDone) {
      fn()
      return () => {}
    }
    introListeners.add(fn)
    return () => void introListeners.delete(fn)
  },
}

let introDone = false
const introListeners = new Set<() => void>()

/**
 * Media under `root` marked up with `data-src` / `data-srcset` instead of `src` / `srcset` is
 * attached only once the intro is done, so it never competes with the intro video. Returns an
 * unsubscribe fn (for unmount).
 */
export function deferMedia(root: ParentNode) {
  return preload.onIntroDone(() => {
    root.querySelectorAll<HTMLImageElement>('img[data-srcset], img[data-src]').forEach((img) => {
      if (img.dataset.srcset) img.srcset = img.dataset.srcset
      if (img.dataset.src) img.src = img.dataset.src
      delete img.dataset.srcset
      delete img.dataset.src
    })
    root.querySelectorAll<HTMLVideoElement>('video[data-src]').forEach(attachVideo)
  })
}

/** Start buffering a `data-src` video now (also the on-demand fallback before the intro is done). */
export function attachVideo(video: HTMLVideoElement) {
  if (!video.dataset.src) return
  video.preload = 'auto'
  video.src = video.dataset.src
  delete video.dataset.src
  video.load()
}

preload.track(document.fonts?.ready ?? Promise.resolve())
