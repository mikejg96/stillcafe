import { gsap } from 'gsap'
import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { preload } from '../app/preload'
import { imageSrc, imageSrcSet, images } from '../content/images'
import { introVideo, introVideoSrc } from '../content/video'
import { env, scroll } from '../engine'
import { Pinned, useScene } from '../react'
import './journey.css'

/*
 * Figma `stillcafe` SEQ1 + SEQ2 (frames "VIDEO 1 - START/END", "SCROLL 1" … "Scroll 6").
 *
 * Everything is laid out in the Figma frame's own units (1920 × 1080, `--u` = 1 frame pixel):
 * the frame covers the screen like `object-fit: cover`, so the logo always lands in the arch
 * window and the waves always meet the same edges.
 */

/* ─── Art direction & timing ─────────────────────────────────────────────── */

const artDirection = {
  /** SEQ1: the title fades in from a heavy blur as soon as the video starts… */
  tagline: { delay: 0, duration: 1.8, blur: 40, ease: 'power2.out' },
  /** …and `unlockAt` s into the video the page can be scrolled: the cue and the logo appear. */
  unlockAt: 3,
  cue: { duration: 1 },
  logo: { duration: 2.2, blur: 15, ease: 'power2.out' },
}

/*
 * SEQ2 keyframes, measured from the Figma frames (frame pixels).
 *
 *   Scroll 1 → 3   The room is scaled up so far that its arch window fills the screen, and scales
 *                  down to fit the frame. The view through the window (the video's last frame)
 *                  shrinks and blurs behind it, the logo drops into the window, the title fades.
 *   Then          As in Figma's base overview, the room fades into the cards' colour: a blush
 *                  gradient rises from the bottom while the house shrinks, so the cards section
 *                  carries straight on from it.
 */
/** "Subtract" (the room) is 11604 px wide in Scroll 1 and 1927.7 px in Scroll 3. */
const ROOM_SCALE = 6.02
/** The meadow behind the arch: full frame in Scroll 1, 1326 px wide in Scroll 3. */
const VIEW_SCALE = 0.6906
const VIEW_OVERSCALE = 1.03
/**
 * The room shrinks until it just covers the frame (Figma's fit). It reaches it still moving, as
 * the gradient carries on rising over it, so the scroll never seems to stop.
 */
const ROOM_END_SCALE = 1
/** How long the room zooms (timeline units, see the layout below). */
const ZOOM_DURATION = 1.55
/** The view starts shrinking 40% into the zoom (checked against the window: its edges never show). */
const VIEW_FROM = 0.4 * ZOOM_DURATION
/**
 * The zoom's ease: the room's scale falls geometrically (by the same factor per scroll step), so
 * it looks like an even pull-back instead of rushing and then braking.
 */
const evenZoom = (p: number) => (ROOM_SCALE - ROOM_SCALE * (ROOM_END_SCALE / ROOM_SCALE) ** p) / (ROOM_SCALE - ROOM_END_SCALE)
/** The logo drops from y 295 to y 507. */
const BRAND_DROP = 212

/**
 * Timeline layout (timeline time; the pin maps 0 → TIMELINE_END onto PIN_LENGTH screens):
 *
 *   0    – 1.55 Zoom out of the arch until it covers the screen (Scroll 1 → 3), at an even rate
 *   0.35 – 1.75 The blush gradient rises from the bottom of the screen
 *   1.61 – 1.75 The cards section rises into it (see CARDS_OVERLAP) as the pin releases
 *
 * Both run together without easing to a stop, so the scroll runs on from the room into the cards
 * without settling. The whole shot takes 1.25 screens.
 */
const TIMELINE_END = 1.75
const PIN_LENGTH = 1.25
/**
 * Screens of the pin's end that the cards section overlaps (its negative margin in cards.css).
 * The gradient only covers the bottom 30% of the screen, so the cards may only rise into its solid
 * part (the bottom 12%): their top edge enters the screen at 1.25 − 0.1 = 1.15 screens, when the
 * solid blush starts ~93% down, and is 90% down as the pin ends, with the solid blush from 88%.
 */
export const CARDS_OVERLAP = 0.1

/** When the blush gradient starts rising (timeline units); it is fully up as the pin ends. */
const FADE_FROM = 0.35
/** When the scroll cue fades out: just before the cards section rises into view (1.61). */
const CUE_OUT = 1.42

/* ─── Loading ────────────────────────────────────────────────────────────── */

/** Don't hold the video back for a slow font or logo for longer than this. */
const CRITICAL_TIMEOUT_MS = 3000
/** Reveal the page anyway if the intro video hasn't buffered by then. */
const VIDEO_LOAD_TIMEOUT_MS = 8000
/** Used when the video's duration is unknown (it failed to load). */
const FALLBACK_DURATION_S = 9
/** A stalled stream unlocks the page this long after the video should have ended. */
const WATCHDOG_S = 4
/** At the end of the intro, wait at most this long for the room image before unlocking. */
const ROOM_TIMEOUT_MS = 2500

const settleWithin = (promise: Promise<unknown>, ms: number) =>
  Promise.race([promise.catch(() => {}), new Promise((r) => setTimeout(r, ms))])

/**
 * Attach the intro video's source – once, even if called twice (StrictMode) – and resolve once it
 * has (nearly) buffered. Returns the promise and a cleanup fn.
 */
function bufferVideo(video: HTMLVideoElement) {
  let done = false
  let resolve!: () => void
  const ready = new Promise<void>((r) => (resolve = r))

  const finish = () => {
    if (done) return
    done = true
    resolve()
  }

  const onProgress = () => {
    if (!video.buffered.length || !(video.duration > 0)) return
    const p = video.buffered.end(video.buffered.length - 1) / video.duration
    if (p >= 0.95 || video.readyState >= 4) finish()
  }

  video.addEventListener('canplaythrough', finish)
  // A broken video must not hold the loader: reveal, and the intro falls back to its schedule.
  video.addEventListener('error', finish)
  video.addEventListener('progress', onProgress)
  video.addEventListener('loadeddata', onProgress)
  const timeout = window.setTimeout(finish, VIDEO_LOAD_TIMEOUT_MS)

  if (!video.getAttribute('src')) {
    video.preload = 'auto'
    video.src = introVideoSrc(introVideo)
    video.load()
  } else if (video.readyState >= 4) {
    finish()
  }

  return {
    ready,
    stop() {
      clearTimeout(timeout)
      video.removeEventListener('canplaythrough', finish)
      video.removeEventListener('error', finish)
      video.removeEventListener('progress', onProgress)
      video.removeEventListener('loadeddata', onProgress)
    },
  }
}

/** Fade + un-blur an element in, once. */
function blurIn(target: string, { blur, duration, ease, delay = 0 }: { blur: number; duration: number; ease: string; delay?: number }) {
  const from = env.reducedMotion ? 0 : blur
  gsap.fromTo(
    target,
    { opacity: 0, filter: `blur(${from}px)` },
    { opacity: 1, filter: 'blur(0px)', duration: env.reducedMotion ? 0 : duration, ease, delay, clearProps: 'filter' },
  )
}

/* ─── Scene ──────────────────────────────────────────────────────────────── */

export function Journey() {
  const section = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hazeRef = useRef<HTMLCanvasElement>(null)
  const roomRef = useRef<HTMLImageElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)

  // Loading and SEQ1: hold the loader for the fonts and the logo, then for the video – which is
  // only requested once those are in. On reveal play it with scroll locked, bring the title and
  // logo in on cue, and open the page when it ends, holding its last frame.
  useLayoutEffect(() => {
    const root = section.current
    const video = videoRef.current
    const haze = hazeRef.current
    const room = roomRef.current
    const logo = logoRef.current
    if (!root || !video || !haze || !room || !logo) return

    const ctx = gsap.context(() => {}, root)
    let disposed = false
    let buffering: ReturnType<typeof bufferVideo> | undefined

    // One task for both phases, so the loader can't open in the gap between them.
    const untrack = preload.track(
      settleWithin(Promise.all([document.fonts?.ready, logo.decode()]), CRITICAL_TIMEOUT_MS).then(() => {
        if (disposed) return
        buffering = bufferVideo(video)
        return buffering.ready
      }),
    )

    let logoShown = false
    const showLogo = () => {
      if (logoShown) return
      logoShown = true
      ctx.add(() => blurIn('.journey__logo', artDirection.logo))
    }

    let scrollLocked = false
    // `unlockAt` s into the video (or at its end, if sooner): the logo and the cue appear, and
    // once the room behind it is decoded the page can be scrolled and the rest of its media load.
    let opened = false
    const openPage = () => {
      if (opened) return
      opened = true
      showLogo()
      void settleWithin(room.decode(), ROOM_TIMEOUT_MS).then(() => {
        if (disposed) return
        if (scrollLocked) {
          scrollLocked = false
          scroll.unlock()
        }
        ctx.add(() => gsap.to('.journey__cue', { opacity: 1, duration: env.reducedMotion ? 0 : artDirection.cue.duration }))
        preload.finishIntro()
      })
    }

    let introEnded = false
    const endIntro = () => {
      if (introEnded) return
      introEnded = true
      // The blurred view through the arch (Figma Scroll 3) is the last frame, drawn once.
      if (video.readyState >= 2) {
        try {
          haze.getContext('2d')?.drawImage(video, 0, 0, haze.width, haze.height)
        } catch {
          /* Not drawable: the arch shows the sharp frame instead. */
        }
      }
      openPage()
    }

    const offReveal = preload.onReveal(() => {
      // The room only shows once the video has ended: fetch it now the video is buffered.
      if (room.dataset.srcset) {
        room.srcset = room.dataset.srcset
        delete room.dataset.srcset
      }

      if (env.reducedMotion) {
        gsap.set(['.journey__tagline', '.journey__logo'], { opacity: 1 })
        logoShown = true
        if (video.duration) {
          video.addEventListener('seeked', endIntro, { once: true })
          video.currentTime = video.duration
        } else {
          endIntro()
        }
        return
      }

      // The first seconds of the intro can't be scrolled or skipped. (This runs after the
      // loader's own reveal handler has unlocked scroll.)
      scroll.lock()
      scrollLocked = true
      video.currentTime = 0
      video.addEventListener('ended', endIntro, { once: true })
      video.addEventListener('error', endIntro, { once: true })
      const duration = video.duration || FALLBACK_DURATION_S
      ctx.add(() => {
        blurIn('.journey__tagline', artDirection.tagline)
        // On the clock rather than the video's time, so a stalled stream can't keep it locked.
        gsap.delayedCall(Math.min(artDirection.unlockAt, duration), openPage)
        gsap.delayedCall(duration + WATCHDOG_S, endIntro)
      })
      // Autoplay refused: keep to the same schedule without the video.
      video.play()?.catch(() => ctx.add(() => gsap.delayedCall(duration, endIntro)))
    })

    return () => {
      disposed = true
      untrack()
      buffering?.stop()
      offReveal()
      video.removeEventListener('ended', endIntro)
      video.removeEventListener('error', endIntro)
      video.removeEventListener('seeked', endIntro)
      if (scrollLocked) scroll.unlock()
      ctx.revert()
    }
  }, [])

  // SEQ2: the pinned, scroll-scrubbed zoom out of the arch, fading into the cards' colour.
  useScene(section, {
    scrub: 0.25,
    timeline: (tl) => {
      // Scroll 1 → 3. The view behind the window (the video's end frame) holds its size until the
      // window is inside the screen, then shrinks gently with it: shrinking sooner would show its
      // edges through the window. It starts 3% oversize for the same reason (both timings are
      // checked against the window's box). The logo follows the window, so it shares the ease.
      const zoom = { duration: ZOOM_DURATION, ease: evenZoom }
      // The logo's drop is linear in the room's scale, so it stays in the window.
      const brandEnd = (BRAND_DROP * (ROOM_SCALE - ROOM_END_SCALE)) / (ROOM_SCALE - 1)
      tl
        .fromTo('.journey__room', { scale: ROOM_SCALE }, { scale: ROOM_END_SCALE, ...zoom }, 0)
        .fromTo('.journey__view', { scale: VIEW_OVERSCALE }, { scale: VIEW_SCALE * ROOM_END_SCALE, duration: ZOOM_DURATION - VIEW_FROM, ease: 'sine.in' }, VIEW_FROM)
        .fromTo('.journey__haze', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'sine.in' }, 0.55)
        .fromTo('.journey__brand', { '--brand-y': 0 }, { '--brand-y': brandEnd, ...zoom }, 0)
        .fromTo('.journey__intro', { opacity: 1 }, { opacity: 0, duration: 0.12 }, 0)
        // The cue stays until just before the cards rise in (its own opacity is the reveal fade).
        .fromTo('.journey__cue svg', { opacity: 1 }, { opacity: 0, duration: 0.15 }, CUE_OUT)
        .fromTo('.journey__fade', { yPercent: 100 }, { yPercent: 0, duration: TIMELINE_END - FADE_FROM, ease: 'none' }, FADE_FROM)
        .set({}, {}, TIMELINE_END)
    },
  })

  const logo = images.still_logo
  const room = images.arch_room
  const frameStyle = { '--fx': introVideo.position[0], '--fy': introVideo.position[1] } as CSSProperties

  return (
    <Pinned length={PIN_LENGTH} ref={section} className="journey">
      <div className="journey__frame" style={frameStyle}>
        {/* Back to front, as in Figma: the view, the title, the logo, then the room in front, so
            the title and logo are only ever seen through its arch window. */}
        <div className="journey__scene">
            <div className="journey__view">
              {/* No src until the critical resources are in (see bufferVideo). */}
              <video
                ref={videoRef}
                className="journey__video"
                preload="none"
                muted
                playsInline
                disablePictureInPicture
                disableRemotePlayback
              />
              <canvas ref={hazeRef} className="journey__haze" width={192} height={108} aria-hidden="true" />
            </div>

            <div className="journey__intro">
              <p className="journey__tagline">
                <span className="journey__def" aria-hidden="true">
                  [<i>n.</i>]
                </span>
                A space to slow down
              </p>
            </div>

            <div className="journey__brand">
              <h1 className="journey__logo">
                <img ref={logoRef} src={imageSrc(logo)} width={logo.width} height={logo.height} alt="Still." />
              </h1>
            </div>

            {/* Requested on reveal, once the video is buffered (see the effect above). */}
            <img
              ref={roomRef}
              className="journey__room"
              data-srcset={imageSrcSet(room)}
              sizes="150vw"
              width={room.width}
              height={room.height}
              alt=""
              decoding="async"
            />
        </div>

        {/* In front of the room, so it stays on screen through the zoom until the cards near. */}
        <ScrollCue />
      </div>
      {/* Figma: the room fades into the cards' colour from the bottom. */}
      <div className="journey__fade" aria-hidden="true" />
    </Pinned>
  )
}

function ScrollCue() {
  return (
    <div className="journey__cue" aria-hidden="true">
      <svg viewBox="0 0 11 72.5" fill="none">
        <circle className="journey__cue-dot" cx="5.5" cy="67" r="5.5" fill="currentColor" />
      </svg>
    </div>
  )
}
