import { initClock } from './clock'
import { initScroll } from './scroll'

/**
 * Framework-agnostic scroll/animation engine.
 *
 * Nothing in /engine imports React. React components only hand DOM nodes to the engine
 * (via the hooks in /react) and the engine drives them imperatively in the shared frame
 * loop – animation never causes a React render.
 */

let dispose: (() => void) | null = null

/** Boot once, before the first React render. Idempotent (safe under HMR). */
export function initEngine() {
  if (dispose) return dispose
  initClock()
  const disposeScroll = initScroll()
  dispose = () => {
    disposeScroll()
    dispose = null
  }
  return dispose
}

export { clock } from './clock'
export { scroll } from './scroll'
export { createScene, type Scene, type SceneOptions } from './scene'
export { env, dpr } from './env'
