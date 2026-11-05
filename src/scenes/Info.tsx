import { gsap } from 'gsap'
import { useLayoutEffect, useRef } from 'react'
import { deferMedia } from '../app/preload'
import { imageSrc, imageSrcSet } from '../content/images'
import { infoBlocks } from '../content/info'
import { createScene } from '../engine'
import './info.css'

/**
 * A block's clip plays (looping) while it is selected and pauses when it isn't. It is only
 * requested the first time its block is selected, so nothing loads until someone asks for it, and
 * it fades in over the gradient once it is actually playing.
 */
function playClip(block: HTMLElement, active: boolean) {
  const video = block.querySelector<HTMLVideoElement>('.info__video')
  if (!video) return
  if (!active) {
    video.pause()
    return
  }
  if (!video.src && video.dataset.src) {
    video.src = video.dataset.src
    video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true })
  }
  video.play().catch(() => {
    /* Refused or interrupted (e.g. deselected straight away): the gradient stays. */
  })
}

/**
 * SEQ4 – About / Where? / Time?. Selecting a block fills it with its media (a looping clip where
 * it has one, over the gradient) and turns its text white; the others stay as they are.
 *
 * - Desktop with a mouse: hovering (or keyboard-focusing) a block selects it; leaving clears it.
 * - Touch screens wider than a phone: tap (or Enter / Space) a block; again to clear it.
 * - Phone (≤ 767 px): the blocks stack, and whichever crosses the middle of the screen is selected
 *   until it has passed ("IPHONE ONLY" frames, "TRIGGER POINT AT CENTER").
 */
export function Info() {
  const section = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const root = section.current
    if (!root) return
    const blocks = gsap.utils.toArray<HTMLElement>('.info__block', root)
    const select = (el: HTMLElement | null) =>
      blocks.forEach((b) => {
        const active = b === el
        b.classList.toggle('is-active', active)
        b.setAttribute('aria-pressed', String(active))
        playClip(b, active)
      })

    const blockOf = (e: Event) => (e.target as Element).closest<HTMLElement>('.info__block')

    const mm = gsap.matchMedia()
    mm.add('(min-width: 768px) and (hover: hover)', () => {
      const enter = (e: Event) => select(blockOf(e))
      // Moving between blocks enters the next one straight away, so only clear on leaving the grid.
      const leave = (e: Event) => {
        const to = (e as MouseEvent | FocusEvent).relatedTarget as Node | null
        if (!to || !root.contains(to)) select(null)
      }
      root.addEventListener('mouseover', enter)
      root.addEventListener('focusin', enter)
      root.addEventListener('mouseout', leave)
      root.addEventListener('focusout', leave)
      return () => {
        root.removeEventListener('mouseover', enter)
        root.removeEventListener('focusin', enter)
        root.removeEventListener('mouseout', leave)
        root.removeEventListener('focusout', leave)
        select(null)
      }
    })
    mm.add('(min-width: 768px) and (hover: none)', () => {
      const onClick = (e: Event) => {
        const block = blockOf(e)
        if (block) select(block.classList.contains('is-active') ? null : block)
      }
      root.addEventListener('click', onClick)
      return () => {
        root.removeEventListener('click', onClick)
        select(null)
      }
    })
    mm.add('(max-width: 767px)', () => {
      blocks.forEach((block) =>
        createScene({
          trigger: block,
          start: 'top center',
          end: 'bottom center',
          onToggle: (active) => {
            if (active) select(block)
            else if (block.classList.contains('is-active')) select(null)
          },
        }),
      )
      return () => select(null)
    })

    const offMedia = deferMedia(root)
    return () => {
      mm.revert()
      offMedia()
    }
  }, [])

  return (
    <section ref={section} className="info" aria-label="About Still.">
      <div className="info__grid">
        {infoBlocks.map((block) => (
          <button key={block.id} className="info__block" type="button" aria-pressed="false">
            <span className="info__media" aria-hidden="true">
              <img
                data-src={imageSrc(block.media, 800)}
                data-srcset={imageSrcSet(block.media)}
                sizes="(max-width: 767px) 100vw, 28vw"
                alt=""
                loading="lazy"
                decoding="async"
              />
              {block.video && (
                <video className="info__video" data-src={block.video} muted loop playsInline preload="none" disablePictureInPicture disableRemotePlayback />
              )}
            </span>
            <span className="info__title">{block.title}</span>
            <span className="info__text">{block.text}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
