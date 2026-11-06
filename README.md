# Still Café

A scroll-driven, cinematic site. The design and the animation brief for every frame are in [design/SPEC.md](design/SPEC.md), transcribed from Figma.

```
npm run dev        # Vite dev server
npm run assets     # /assets → optimized media in /public/media + manifest (incremental)
npm run build      # assets + typecheck + production build
```

## Stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite, TypeScript, React 19 | Fast, minimal config |
| Smooth scroll | Lenis (desktop wheel only) | Smooths wheel/trackpad input but keeps **native** scroll, so sticky, CSS scroll timelines and ScrollTrigger stay correct. Touch devices keep native momentum. Turned off under reduced motion. |
| Scroll mapping / timelines | GSAP + ScrollTrigger | Proven range measurement, refresh handling and scrubbed timelines. GSAP's ticker is the site's **only** rAF loop. |
| Pinning | CSS `position: sticky` | Composited, needs no pin-spacer DOM changes, doesn't jitter on mobile |
| Asset pipeline | sharp (dev only) | PNG → WebP at several widths: 140 MB → 8.5 MB for `seq1` at full resolution |

Runtime dependencies: `react`, `react-dom`, `gsap`, `lenis`.

## Layout

```
assets/                 source media (truth). Each folder of numbered frames = one sequence (used for card stills)
scripts/                build-time asset pipeline
public/media/           generated, git-ignored
src/
  engine/               framework-agnostic, no React imports
    clock.ts            the single frame loop (subscribe here, never start your own rAF)
    scroll.ts           Lenis ⇄ ScrollTrigger integration, scroll.to / lock / refresh
    scene.ts            scroll range → progress 0..1 and/or scrubbed timeline
    env.ts              reduced-motion / pointer flags, DPR cap
  react/                thin bindings: hand DOM nodes to the engine, never set state
  content/              typed asset registries (sequences.gen.json is generated)
```

## Where to Edit Text, Replace Images, Sequences & Videos

Here is a directory map of where to modify copy, replace imagery/logos, update image sequences, or integrate video:

```text
stillcafe/
├── assets/                               ◄── [REPLACE / ADD RAW MEDIA]
│   ├── still_logo.png                    ◄── Brand logo (transparent PNG, resized into /public/media)
│   ├── images/                           ◄── Still photos
│   │   ├── arch_room.png                 ◄── SEQ2 room with the transparent arch window
│   │   ├── grain.png                     ◄── SEQ4 block media (placeholder)
│   │   ├── beans.jpg                     ◄── Card 2 photo (coffee beans)
│   │   └── matcha.jpg                    ◄── Card 3 photo (matcha drink)
│   └── seq1/                             ◄── [IMAGE SEQUENCE FRAMES]
│       ├── seq1_000.png ... seq1_148.png ◄── Intro animated frame sequence (numbered PNG/JPG)
│
│   *(IMPORTANT: After changing anything in assets/, run: `npm run assets`)*
│
├── public/videos/intro.mp4               ◄── [INTRO VIDEO] (faststart encode, see below)
│
├── src/
│   ├── content/                          ◄── [EDIT CONTENT & DATA]
│   │   ├── cards.ts                      ◄── Card copy, origins, details, taste profiles & photo mappings
│   │   └── info.ts                       ◄── About / Where / Time copy & media, footer links
│   │
│   └── scenes/                           ◄── [EDIT TEXT & SCENE SECTIONS]
│       ├── Loader.tsx                    ◄── F0: "hold still.." loading text
│       ├── Journey.tsx                   ◄── SEQ1–2: intro video, tagline, logo, arch zoom, fade into the cards
│       ├── Cards.tsx / carousel.ts       ◄── SEQ3: infinite carousel & "im feeling lucky"
│       ├── Card.tsx                      ◄── Card component markup & tags
│       ├── Info.tsx                      ◄── SEQ4: About / Where / Time blocks (hover on desktop)
│       └── Footer.tsx                    ◄── SEQ5: footer logo, rule & links
│
└── index.html                            ◄── HTML page title, meta description & viewport tags
```

### Quick Reference Guide

| Item to change | File to edit / replace | Action required |
|---|---|---|
| **Card text & profiles** (titles, origins, flavor ratings) | [`src/content/cards.ts`](src/content/cards.ts) | Edit TypeScript object, auto-reloads |
| **Intro tagline & scroll cues** | [`src/scenes/Journey.tsx`](src/scenes/Journey.tsx) | Edit `.journey__tagline` or `<ScrollCue />` |
| **Loader text** | [`src/scenes/Loader.tsx`](src/scenes/Loader.tsx) | Edit `.loader__text` |
| **About / Where / Time text & footer links** | [`src/content/info.ts`](src/content/info.ts) | Edit TypeScript object |
| **Brand logo** | Replace [`assets/still_logo.png`](assets/still_logo.png) | Run `npm run assets` |
| **Card & block photos** | Replace files in [`assets/images/`](assets/images/) | Run `npm run assets` |
| **Sequence frames** (card stills via `frameSrcSet`) | Replace numbered frames in [`assets/seq1/`](assets/seq1/) | Run `npm run assets` |
| **About / Where block videos** | Replace `public/videos/about_box.mp4` / `where_box.mp4` (faststart encode) | Paths in [`src/content/info.ts`](src/content/info.ts) |
| **Intro Video** | Replace [`public/videos/intro.mp4`](public/videos/intro.mp4) | Simply replace file (or config in [`src/content/video.ts`](src/content/video.ts)) |
| **Page title & browser meta** | [`index.html`](index.html) | Edit `<title>` and `<meta>` |

## Principles

- **Animation never re-renders React.** Hooks pass refs to engine objects. Progress arrives through callbacks that run in the shared frame loop and write directly to the DOM (styles, canvas, video).
- **One clock.** Lenis, ScrollTrigger, GSAP tweens and custom per-frame work all run in the same tick.
- **Native first.** Scroll stays native and pinning is CSS. Hand-written animation is limited to what CSS can't express.

## Usage sketch

```tsx
const section = useRef<HTMLElement>(null)

useScene(section, {
  onProgress: (p) => { /* write to the DOM directly, never to React state */ },
  timeline: (tl) => tl.fromTo('.caption', { opacity: 0 }, { opacity: 1 }), // scoped selector
})

// Stop expensive work only once the section is fully off-screen. Don't use onToggle on the
// pinned range above: a scene at the top of the page counts as inactive at scroll 0, while
// it is still fully visible.
useScene(section, {
  start: 'top bottom',
  end: 'bottom top',
  onToggle: (active) => !active && video.current?.pause(),
})

return <Pinned length={3} ref={section}>{/* stage content */}</Pinned>
```

## Video encoding

Recommended encode for the intro video (`brew install ffmpeg`):

```sh
# H.264, fast start, no audio or timecode track. Keep it small (~4 MB for 9 s of 1080p): it must
# buffer before the loader opens, on phones and slow links too.
ffmpeg -i in.mov -map 0:v:0 -c:v libx264 -crf 23 -preset slow -profile:v high -level 4.0 \
  -pix_fmt yuv420p -movflags +faststart -an -map_metadata -1 out.mp4

# An already-encoded file: move the index to the front without re-encoding
ffmpeg -i in.mp4 -c copy -movflags +faststart -an out.mp4
```

The video is only requested once fonts and the logo are ready, and every card and block photo
waits until the intro has finished (`deferMedia` in `src/app/preload.ts`). See `design/SPEC.md`.

## Deployment

Generated media URLs carry `?v=<content hash>`. Serve `/media/*` and `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`.
