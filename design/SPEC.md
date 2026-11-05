# Still. — site spec

Source: Figma file `DEFAULTS` (`rheoPHKwNnrUlITqYuZYHY`), page `stillcafe` (`4234:61`).
The base design is the left panel, "BASE OVER VIEW" (`4731:6512`). The motion notes are the SEQ
text nodes in the right panel (`4731:26`, `4731:45`, `4731:6520`–`4731:6524`, `4731:4440`).
Frames are 1920 × 1080 (phone frames 1080 wide).

```
Loader (overlay gate)                               src/scenes/Loader.tsx
SEQ1  intro video + tagline + logo                  src/scenes/Journey.tsx
SEQ2  arch zoom-out, logo into the window, fade    src/scenes/Journey.tsx (pinned, scrubbed)
SEQ3  card carousel (infinite) + "im feeling lucky" src/scenes/Cards.tsx, carousel.ts, Card.tsx
SEQ4  About / Where? / Time? blocks                 src/scenes/Info.tsx (copy: src/content/info.ts)
SEQ5  footer: logo, rule, links                     src/scenes/Footer.tsx
```

## Loading order

1. **Gate:** fonts, then the logo is decoded (3 s cap).
2. **Video:** only after that is `src` set on the intro `<video>`, once, and it buffers to
   `canplaythrough` (or ≥95%, 8 s cap). The loader's progress is 10% gate and 90% video. Both
   steps are one tracked promise, so the loader can't reveal between them.
3. **Reveal:** the loader fades out, scroll is locked and the video plays from 0.
4. **Page opens** 3 s into the video (or at its end, if sooner): the room image is decoded, scroll
   unlocks and `preload.finishIntro()` fires. When the video ends its last frame is held.
5. **Deferred media:** card photos and block media carry `data-src` / `data-srcset` and only get
   real URLs from `deferMedia()` after step 4, so nothing competes with the video.

Reduced motion skips to every final state (the video seeks to its last frame).

## SEQ1 — Intro

- The video plays once. The tagline `[n.] A space to slow down` fades in from a heavy blur as it
  starts.
- For its first 3 s nothing can be scrolled. Then the logo fades in from a blur, the scroll cue
  appears, scrolling unlocks and the deferred media start loading.
- On the first scroll the tagline simply fades out, without moving.

## SEQ2 — Into the café

- Scroll 1→3: the room image (its arch window is transparent) starts zoomed in so the arch frames
  the video, and scales down to fit. The logo moves into the arch window and the tagline fades out.
- Then, as in Figma's base overview, the room fades into the cards' colour: a blush gradient
  rises from the bottom of the screen while the house shrinks until it just covers the screen
  (it keeps rising after, so the scroll never stops), and the cards section, which starts in the same blush, slides up over it. No masks,
  waves or ripples.

## SEQ3 — Cards

- A blush → white gradient section. Past a threshold the cards fade and rise in with a stagger
  from the centre, **once per page load**.
- An infinite ring: drag or swipe with light snapping, a click on a card, horizontal wheel or
  trackpad, and the arrow keys. All but the centre card are small and blurred.
- "im feeling lucky, click me" spins at least one full lap to a random card.
- The cards fade out as the section scrolls away.

## SEQ4 — About / Where? / Time?

- Selecting a block fades its media in and turns its text white; the others reset.
- Desktop with a mouse: on hover (and keyboard focus). Touch screens wider than a phone: tap.
- Phone (≤ 767 px): the blocks stack; the one crossing the middle of the screen is selected
  until it has passed.

## SEQ5 — Footer

- 70% of a screen tall, so the end of the page is a short scroll.
- Once it is on screen it animates in, once and slowly: the logo from a blur, the rule from the
  centre out, then MENU / INSTAGRAM / GOJEK / GRAB fade and rise into place.

---

## Open items

- [ ] **Neue Montreal**: licensed `.woff2` files (Bold, Medium, Regular) for `src/styles/fonts/`.
- [ ] **Card content**: the real menu and photos (`src/content/cards.ts`, `assets/images/`).
- [ ] **Block media**: all three blocks use the grain placeholder (`src/content/info.ts`).
- [ ] **Footer links**: real URLs for MENU, INSTAGRAM, GOJEK and GRAB (`src/content/info.ts`).
