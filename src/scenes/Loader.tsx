import { useLayoutEffect, useRef } from 'react'
import { preload } from '../app/preload'
import { scroll } from '../engine'
import './loader.css'

/**
 * F0 – full-screen gate shown until the opening media has loaded (see app/preload).
 * Scroll is locked while it is up; it fades out on reveal via a class, never React state.
 */
export function Loader() {
  const ref = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // The experience always starts at F1, even if the browser restored a scroll position.
    if (!preload.revealed) scroll.to(0, { immediate: true })
    scroll.lock()

    const offProgress = preload.onProgress((p) => {
      if (textRef.current) {
        const pct = Math.round(p * 100)
        textRef.current.textContent = pct > 0 && pct < 100 ? `HOLD STILL ${pct}%` : 'HOLD STILL'
      }
    })

    const off = preload.onReveal(() => {
      el.classList.add('is-done')
      scroll.unlock()
    })

    return () => {
      off()
      offProgress()
      scroll.unlock()
    }
  }, [])

  return (
    <div ref={ref} className="loader" role="status">
      {/* Loader #13 from the Figma reference (brightness travelling clockwise round a 2×2 group),
          drawn as the room's wall niches rather than squares. */}
      <div className="loader__grid" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p ref={textRef} className="loader__text">HOLD STILL</p>
    </div>
  )
}
