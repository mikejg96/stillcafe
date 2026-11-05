import type { CSSProperties, ReactNode, Ref } from 'react'

interface PinnedProps {
  /** Scroll distance during which the stage stays pinned, in viewport heights. */
  length: number
  ref?: Ref<HTMLElement>
  className?: string
  children?: ReactNode
}

/**
 * Structural primitive for pinned, scroll-driven scenes: a tall section containing a
 * viewport-sized sticky stage. Pass its ref to useScene() – the default scene range is
 * exactly the pinned span, so progress 0→1 maps to the time the stage is held on screen.
 */
export function Pinned({ length, ref, className, children }: PinnedProps) {
  return (
    <section ref={ref} className={className ? `pinned ${className}` : 'pinned'} style={{ '--pin-length': length } as CSSProperties}>
      <div className="pinned__stage">{children}</div>
    </section>
  )
}
