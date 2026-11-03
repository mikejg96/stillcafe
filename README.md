# Still. — v2

Landing page for Still., specialty coffee in Renon, Bali. A plain static site
(HTML, CSS and JavaScript, no build step):

1. **Intro** — `seq_01` plays on its own while the logo and tagline fade in, with
   a 0–100 progress line.
2. **Scroll** — `seq_02` scrubs with the scroll; its last frame shrinks into the
   house card.
3. **Carousel** — five cards fan out in 3D. Use the arrows, click a card, swipe or
   drag, or press ← →. The active card's video plays full screen in black and
   white, and in colour through the card's window.
4. **Soft opening** — the storefront line drawing and opening details play once
   they come into view.

## Run it

Same setup as v1 (Vite; the site code itself is plain HTML/CSS/JS):

```bash
npm install
npm run dev        # local development
npm run build      # outputs dist/
npm run preview    # serves dist/ on port 4173
```

With Docker (what the live deployment runs, on port 4173):

```bash
docker build -t stillcafe .
docker run --rm -p 4173:4173 stillcafe
```

## Layout

```
index.html
public/             # copied as-is into dist/
  css/style.css
  js/main.js            # timeline, carousel, scenes, finale (constants at the top)
  asset/
    brand/              # logo
    frames/seq_0{1,2,3} # WebP frame sequences used by the site
    video/              # card videos (+ posters/)
    CREDITS.md          # sources of the placeholder stock videos
package.json
Dockerfile
```

The raw frame exports (`public/asset/seq_01–03`, ~370 MB) are not in the repo; the
site only needs the WebP copies in `public/asset/frames/`.

## Placeholders

The Pour Over, Coffee Cherries and Flores videos are free Pexels stock (see
`public/asset/CREDITS.md`). Card details beyond the Figma frames are placeholder
copy. The finale's links (About, Menu, Location, Instagram) don't point anywhere yet.
