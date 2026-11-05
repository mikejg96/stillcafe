import { gsap } from 'gsap'
import { useLayoutEffect, useRef } from 'react'
import { preload } from '../app/preload'
import { imageSrc, images } from '../content/images'
import { footerLinks } from '../content/info'
import { env } from '../engine'
import { useScene } from '../react'
import './footer.css'

/** The footer logo's scale at the very end of the page. */
const FOOTER_LOGO_END = 0.6

/**
 * SEQ5 – the end of the page. Once it is well up the screen it animates in, once and slowly: the
 * logo fades in from a blur, the rule draws from the centre out, and the links fade into place.
 */
export function Footer() {
  const section = useRef<HTMLElement>(null)
  const intro = useRef<gsap.core.Timeline | null>(null)

  useLayoutEffect(() => {
    const root = section.current
    if (!root) return
    const ctx = gsap.context(() => {
      intro.current = gsap
        .timeline({ paused: true })
        .fromTo(
          '.footer__logo',
          { opacity: 0, filter: 'blur(15px)' },
          { opacity: 1, filter: 'blur(0px)', duration: 1.8, ease: 'power2.out', clearProps: 'filter' },
        )
        .fromTo('.footer__rule', { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'power3.inOut' }, 0.6)
        .fromTo('.footer__link', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out', stagger: 0.18 }, 1.2)
    }, root)
    return () => {
      intro.current = null
      ctx.revert()
    }
  }, [])

  const inView = useRef(false)
  useScene(section, {
    start: 'top 70%',
    end: 'bottom top',
    onToggle: (active) => {
      inView.current = active
      if (!active) return
      // play() on a finished timeline is a no-op, so this only ever runs once.
      preload.onReveal(() => {
        if (inView.current) env.reducedMotion ? intro.current?.progress(1) : intro.current?.play()
      })
    },
  })

  // As the last of the page scrolls in, the logo shrinks from its size to FOOTER_LOGO_END, and is
  // smallest exactly where the page can't scroll any further.
  useScene(section, {
    start: 'top bottom',
    end: 'bottom bottom',
    scrub: 0.3,
    timeline: (tl) => tl.fromTo('.footer__logo', { scale: 1 }, { scale: FOOTER_LOGO_END, duration: 1 }),
  })

  const logo = images.still_logo

  return (
    <footer ref={section} className="footer">
      {/* Same file as the intro logo, so it comes from the cache. */}
      <img className="footer__logo" src={imageSrc(logo)} width={logo.width} height={logo.height} alt="Still." />
      <span className="footer__rule" aria-hidden="true" />
      <nav className="footer__nav" aria-label="Elsewhere">
        <ul>
          {footerLinks.map(({ label, href }) => (
            <li key={label}>
              <a className="footer__link" href={href}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  )
}
