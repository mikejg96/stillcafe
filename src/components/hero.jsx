// ===== IMPORTS =====
import { useGSAP } from '@gsap/react'; // runs GSAP animations safely inside React
import React, { useState, useRef, useEffect } from 'react'; // useState = values that re-render, useRef = values that don't, useEffect = run code on page load
import gsap from 'gsap'; // the animation library

const Hero = () => {
  // ===== STATE =====

  // The video number the mini preview is based on. Changes on click.
  const [currentIndex, setCurrentIndex] = useState(1);

  // Which video number is loaded in each of the 2 slots. Slot 0 starts with video 1, slot 1 with video 2.
  const [videos, setVideos] = useState([1, 2]);

  // Counts clicks. It triggers the animation, and 0 means "no click yet" so nothing runs on page load.
  const [clickCount, setClickCount] = useState(0);

  // The preloaded videos: video number -> in-memory URL, e.g. { 1: "blob:...", 2: "blob:..." }
  const [videoUrls, setVideoUrls] = useState({});

  // true until ALL videos are downloaded. While true, clicks are blocked and the loading screen shows.
  const [isLoading, setIsLoading] = useState(true);

  // How many videos have finished downloading (for the loading percentage).
  const [loadedCount, setLoadedCount] = useState(0);

  const totalVideos = 4; // hero-1.mp4 to hero-4.mp4
  const START_SIZE = 220; // starting window size in px (matches the mini preview on hover, size-55)

  // ===== REFS =====

  // Which slot (0 or 1) is the current background. A ref, because nothing on screen depends on it directly.
  const activeSlot = useRef(0);

  // Click lock. true = animation running, so clicks are ignored.
  const isAnimating = useRef(false);

  // Direct access to both <video> elements, so we can call .play() and .pause() on them.
  const slotRefs = useRef([]);

  // The next video number, looping back to 1 after the last one (1 -> 2 -> 3 -> 4 -> 1).
  const upcomingVideoIndex = (currentIndex % totalVideos) + 1;

  // ===== PRELOAD ALL VIDEOS (runs once, when the page loads) =====
  useEffect(() => {
    let cancelled = false;  // becomes true if the component is removed mid-download
    const createdUrls = []; // remembers the in-memory URLs so we can free them later

    const loadAll = async () => {
      // download all videos at the same time and wait until every one is finished
      const entries = await Promise.all(
        Array.from({ length: totalVideos }, async (_, i) => {
          const number = i + 1;
          // force-cache: if the browser already saved this file, use it instead of downloading again
          const response = await fetch(`videos/hero-${number}.mp4`, { cache: 'force-cache' });
          if (!response.ok) throw new Error(`Missing video ${number}`); // wrong path? jump to the fallback below
          const blob = await response.blob();    // the whole file, held in memory
          const url = URL.createObjectURL(blob); // a local address pointing at that memory
          createdUrls.push(url);
          if (!cancelled) setLoadedCount((c) => c + 1); // one more video done
          return [number, url];
        })
      );

      if (!cancelled) {
        setVideoUrls(Object.fromEntries(entries)); // { 1: url, 2: url, 3: url, 4: url }
        setIsLoading(false);                       // everything is ready, unlock the page
      }
    };

    loadAll().catch(() => {
      // if a download fails, fall back to normal file paths so the site still works
      if (!cancelled) {
        setVideoUrls(
          Object.fromEntries(
            Array.from({ length: totalVideos }, (_, i) => [i + 1, `videos/hero-${i + 1}.mp4`])
          )
        );
        setIsLoading(false);
      }
    });

    // cleanup: runs when the component is removed
    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url)); // free the memory
    };
  }, []); // empty list = run only once

  // ===== CLICK HANDLER =====
  const handleMiniVideoClick = () => {
    if (isLoading || isAnimating.current) return; // still loading, or animation running: ignore the click
    isAnimating.current = true;                   // lock until the video fully covers the bg
    setCurrentIndex(upcomingVideoIndex);          // the preview moves on to the next video
    setClickCount((c) => c + 1);                  // triggers the animation below
  };

  // ===== ANIMATION =====
  useGSAP(
    () => {
      if (clickCount === 0) return; // nothing before the first click

      const incoming = 1 - activeSlot.current; // the hidden slot that will open (0 becomes 1, 1 becomes 0)
      const outgoing = activeSlot.current;     // the slot that is the bg right now
      const slotSel = `#slot-${incoming}`;     // the full-screen layer of the incoming slot
      const winSel = `#win-${incoming}`;       // the window inside it (this is what grows)
      const incomingVideo = slotRefs.current[incoming];

      const runAnimation = () => {
        // the size the window must grow to = the size of its full-screen layer
        const slotEl = document.getElementById(`slot-${incoming}`);
        const fullW = slotEl.offsetWidth;
        const fullH = slotEl.offsetHeight;

        gsap.set(`#slot-${outgoing}`, { zIndex: 10 }); // the old bg stays underneath

        // shrink the incoming window to a small square BEFORE showing it (so nothing flashes)
        gsap.set(winSel, { width: START_SIZE, height: START_SIZE, borderRadius: 8 });

        // put the incoming layer on top and show it
        gsap.set(slotSel, { zIndex: 20, visibility: 'visible' });

        // a timeline groups both animations, so we get ONE "everything is finished" moment
        const timeline1 = gsap.timeline({
          onComplete: () => {
            // the window is now full screen. Switch it back to 100% so it keeps fitting if the screen is resized.
            gsap.set(winSel, { width: '100%', height: '100%', borderRadius: 0 });

            // the incoming video now fully covers the bg and simply STAYS. It is the new bg.
            slotRefs.current[outgoing]?.pause();                       // the old bg is covered, stop it to save CPU
            gsap.set(`#slot-${outgoing}`, { visibility: 'hidden' });   // hide it
            activeSlot.current = incoming;                             // the roles swap for the next click

            // put the video after this one into the now-hidden slot, ready for the next click
            setVideos((prev) => {
              const copy = [...prev];
              copy[outgoing] = (currentIndex % totalVideos) + 1;
              return copy;
            });

            isAnimating.current = false; // unlock clicks
          },
        });

        timeline1
          // Animation 1: the window grows from the small square to full screen (always from the center)
          .to(
            winSel,
            {
              width: fullW,
              height: fullH,
              borderRadius: 0,
              duration: 1,
              ease: 'power1.inOut',
              onStart: () => {
                incomingVideo.currentTime = 0;         // always start from the first frame
                incomingVideo.play()?.catch(() => {}); // start playing as it begins to grow
              },
            },
            0 // start at time 0
          )
          // Animation 2: the mini preview pops back in from nothing
          .from(
            '#current-video',
            {
              transformOrigin: 'center center',
              scale: 0,
              duration: 1.5,
              ease: 'power1.inOut',
            },
            0 // also at time 0, so both run together
          );
      };

      // if the video is already buffered, go now. Otherwise wait until it can play.
      if (incomingVideo && incomingVideo.readyState >= 3) {
        runAnimation();
      } else if (incomingVideo) {
        incomingVideo.addEventListener('canplay', runAnimation, { once: true });
      }
    },
    { dependencies: [clickCount] } // re-run on every click
  );

  // ===== HELPERS =====

  // Gives the in-memory URL for a video number. undefined until loaded, so no video starts downloading early.
  const getVideoSrc = (index) => videoUrls[index];

  // Inline styles (they can't be overridden by your CSS classes)

  // A full-screen layer that centers whatever is inside it
  const slotStyle = { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' };

  // The window: clips the video. This is the thing that grows.
  const windowStyle = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' };

  // The video: always full-screen size and centered inside the window, so it never gets rescaled while the window grows
  const videoStyle = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '100vw',
    height: '100dvh',
    transform: 'translate(-50%, -50%)',
    objectFit: 'cover',
  };

  // ===== UI =====
  return (
    <div className="relative h-dvh w-screen overflow-x-hidden bg-black">
      {/* Video frame: holds all the video layers */}
      <div id="video-frame" className="relative z-10 h-dvh w-screen overflow-x-hidden rounded-lg bg-black">
        {/* LOADING SCREEN: covers everything until all videos are downloaded */}
        {isLoading && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black text-white">
            <p>Loading {Math.round((loadedCount / totalVideos) * 100)}%</p>
          </div>
        )}

        <div>
          {/* MINI PREVIEW (top layer): the one you click */}
          <div className="mask-clip-path absolute-center absolute z-50 size-55 overflow-hidden rounded-lg">
            {/* The clickable area: small and invisible until hover, then it grows and fades in */}
            <div
              onClick={handleMiniVideoClick}
              className="size-full origin-center scale-65 opacity-0 transition-all duration-450 ease-in-out hover:scale-100 hover:opacity-100"
            >
              {/* The preview video: shows the NEXT video. GSAP targets it with #current-video */}
              <video
                src={getVideoSrc(upcomingVideoIndex)}
                loop
                muted
                playsInline
                id="current-video"
                className="size-full origin-center object-cover rounded-lg"
              />
            </div>
          </div>

          {/* SLOT 0: starts as the full-screen bg and plays right away */}
          <div id="slot-0" style={slotStyle}>
            <div id="win-0" style={windowStyle}>
              <video
                ref={(el) => (slotRefs.current[0] = el)}
                src={getVideoSrc(videos[0])}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                style={videoStyle}
              />
            </div>
          </div>

          {/* SLOT 1: starts hidden, waiting for its turn to grow over the bg */}
          <div id="slot-1" style={{ ...slotStyle, visibility: 'hidden' }}>
            <div id="win-1" style={windowStyle}>
              <video
                ref={(el) => (slotRefs.current[1] = el)}
                src={getVideoSrc(videos[1])}
                loop
                muted
                playsInline
                preload="auto"
                style={videoStyle}
              />
            </div>
          </div>
        </div>

        {/* LOGO OVERLAY: sits on top of the videos */}
        <div className="absolute left-0 top-0 z-40 size-full">
          <div className="absolute top-15 left-9">
            <img src="/img/logo.png" alt="logo" className="w-25" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero; // lets other files import this component
