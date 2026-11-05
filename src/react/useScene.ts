import { gsap } from 'gsap'
import { useLayoutEffect, type RefObject } from 'react'
import { createScene, type SceneOptions } from '../engine'
import { useLatest } from './useLatest'

export interface UseSceneOptions extends Pick<SceneOptions, 'start' | 'end' | 'scrub' | 'onProgress' | 'onToggle'> {
  /**
   * Build a scroll-scrubbed timeline. Runs inside a gsap.context scoped to the trigger
   * element, so selector strings are local and everything is reverted on unmount.
   */
  timeline?: (tl: gsap.core.Timeline, root: HTMLElement) => void
}

/**
 * Bind a scroll range of `ref` to progress callbacks and/or a GSAP timeline.
 * Callbacks may change between renders freely; only start/end/scrub re-create the trigger.
 * This hook never causes a re-render.
 */
export function useScene(ref: RefObject<HTMLElement | null>, options: UseSceneOptions) {
  const latest = useLatest(options)
  const { start, end, scrub } = options
  const hasTimeline = Boolean(options.timeline)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const ctx = gsap.context(() => {
      let timeline: gsap.core.Timeline | undefined
      if (hasTimeline) {
        timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
        latest.current.timeline?.(timeline, root)
      }
      createScene({
        trigger: root,
        start,
        end,
        scrub,
        timeline,
        onProgress: (p, v) => latest.current.onProgress?.(p, v),
        onToggle: (a) => latest.current.onToggle?.(a),
      })
    }, root)
    return () => ctx.revert()
  }, [ref, latest, start, end, scrub, hasTimeline])
}
