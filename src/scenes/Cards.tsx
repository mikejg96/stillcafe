import { gsap } from 'gsap'
import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { deferMedia, preload } from '../app/preload'
import { cards } from '../content/cards'
import { env } from '../engine'
import { useScene } from '../react'
import { CARDS_OVERLAP } from './Journey'
import { Card } from './Card'
import { createCarousel, type Carousel } from './carousel'
import './cards.css'

/**
 * The ring needs ±3 visible cards plus out-of-sight ones to wrap through, so cards repeat until
 * there are at least this many slots.
 */
const MIN_SLOTS = 12
const slots = Array.from({ length: Math.ceil(MIN_SLOTS / cards.length) * cards.length }, (_, i) => cards[i % cards.length]!)

/** Ring distance of each slot from the centre card at rest (slot 0). */
const ringDistance = (i: number) => Math.min(i, slots.length - i)

/**
 * SEQ3 – the cards. Not part of the scrubbed scroll animation: once the section is far enough
 * up the screen the cards fade and rise in, staggered from the centre outwards, once per page
 * load. Scrolling back up leaves them where they are. Then SEQ4: they fade as the section leaves.
 */
export function Cards() {
  const section = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const carousel = useRef<Carousel | null>(null)
  const entrance = useRef<gsap.core.Timeline | null>(null)

  useLayoutEffect(() => {
    const root = section.current
    const track = trackRef.current
    if (!root || !track) return
    const instance = createCarousel(root, track)
    carousel.current = instance
    const offMedia = deferMedia(root)

    const ctx = gsap.context(() => {
      const els = gsap.utils.toArray<HTMLElement>('.cards__slot')
      // Figma Scroll 7: the cards arrive at staggered heights before settling in their row.
      const rise = (i: number) => window.innerHeight * (0.22 + 0.12 * (ringDistance(i) % 2))
      gsap.set(els, { opacity: 0, y: rise })
      gsap.set('.cards__lucky', { opacity: 0 })
      entrance.current = gsap
        .timeline({ paused: true })
        .to(els, {
          opacity: 1,
          y: 0,
          duration: 1.4,
          ease: 'power3.out',
          stagger: (i) => ringDistance(i) * 0.16,
          // A transform would trap each card's z-index inside its slot.
          clearProps: 'transform',
        })
        .to('.cards__lucky', { opacity: 1, duration: 0.8, ease: 'sine.out' }, '-=0.7')
    }, root)

    return () => {
      entrance.current = null
      ctx.revert()
      offMedia()
      carousel.current = null
      instance.destroy()
    }
  }, [])

  const inView = useRef(false)
  useScene(section, {
    start: 'top 75%',
    end: 'bottom top',
    onToggle: (active) => {
      inView.current = active
      if (!active) return
      // play() on a finished timeline is a no-op, so this only ever runs once.
      preload.onReveal(() => {
        if (inView.current) env.reducedMotion ? entrance.current?.progress(1) : entrance.current?.play()
      })
    },
  })

  // SEQ4: the cards fade out as the section scrolls away.
  useScene(section, {
    start: 'bottom 80%',
    end: 'bottom 15%',
    scrub: true,
    timeline: (tl) => tl.fromTo('.cards__inner', { opacity: 1 }, { opacity: 0, duration: 1 }),
  })

  return (
    <section ref={section} className="cards" aria-label="Menu" style={{ '--overlap': CARDS_OVERLAP } as CSSProperties}>
      <div className="cards__inner">
        <button className="cards__lucky" type="button" onClick={() => carousel.current?.spin()}>
          im feeling lucky, click me
        </button>
        <div ref={trackRef} className="cards__track" aria-roledescription="carousel">
          {slots.map((card, i) => (
            <div key={i} className="cards__slot">
              <Card card={card} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
