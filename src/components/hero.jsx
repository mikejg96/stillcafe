// ===== IMPORTS =====
import { useGSAP } from '@gsap/react'; // runs GSAP animations safely inside React
import React, { useState, useRef } from 'react'; // useState = values that re-render, useRef = values that don't
import gsap from 'gsap'; // the animation library

const Hero = () => {
  // ===== STATE =====

  // The video number the mini preview will expand into. Changes on click.
  const [currentIndex, setCurrentIndex] = useState(1);

  // Which video number is loaded in each of the 2 slots. Slot 0 starts with video 1, slot 1 with video 2.
  const [videos, setVideos] = useState([1, 2]);

  // Counts clicks. Triggers the animation, and 0 means "no click yet" so nothing runs on page load.
  const [clickCount, setClickCount] = useState(0);

  // Counts loaded videos (ready for a loading screen later).
  const [loadedVideos, setLoadedVideos] = useState(0);

  const totalVideos = 4; // hero-1.mp4 to hero-4.mp4

  // ===== REFS =====

  // Which slot (0 or 1) is the current background. Ref, because nothing on screen depends on it.
  const activeSlot = useRef(0);

  // Click lock. true = animation running, clicks are ignored.
  const isAnimating = useRef(false);

  // Direct access to both <video> elements, so we can call .play() and .pause().
  const slotRefs = useRef([]);

  // Next video number, looping back to 1 after the last one.
  const upcomingVideoIndex = (currentIndex % totalVideos) + 1;

  // ===== CLICK HANDLER =====
  const handleMiniVideoClick = () => {
    if (isAnimating.current) return; // animation running? ignore the click
    isAnimating.current = true;      // lock until the video fully covers the bg

    const incoming = 1 - activeSlot.current; // the hidden slot (if bg is 0, incoming is 1, and the other way round)

    // put the next video into the incoming slot
    setVideos((prev) => {
      const copy = [...prev];
      copy[incoming] = upcomingVideoIndex;
      return copy;
    });

    setCurrentIndex(upcomingVideoIndex); // the mini preview moves on to the next-next video
    setClickCount((c) => c + 1);         // triggers the animation below
  };

  // ===== ANIMATION =====
  useGSAP(
    () => {
      if (clickCount === 0) return; // nothing before the first click

      const incoming = 1 - activeSlot.current; // slot that will grow
      const outgoing = activeSlot.current;     // slot that is the bg right now
      const inSel = `#slot-${incoming}`;
      const outSel = `#slot-${outgoing}`;
      const incomingVideo = slotRefs.current[incoming];

      // outgoing (the bg) stays underneath
      gsap.set(outSel, { zIndex: 10 });

      // incoming goes on top, small and centered (16.25rem = your size-65), and becomes visible
      gsap.set(inSel, {
        zIndex: 20,
        visibility: 'visible',
        width: '16.25rem',
        height: '16.25rem',
      });

      const timeline1 = gsap.timeline({
        onComplete: () => {
          // the incoming video now fully covers the bg and simply STAYS. It is the new bg.
          slotRefs.current[outgoing]?.pause();                // old bg is covered, stop it to save CPU
          gsap.set(outSel, { visibility: 'hidden' });         // hide it (nobody can see it)
          activeSlot.current = incoming;                      // roles swap for the next click
          isAnimating.current = false;                        // unlock clicks
        },
      });

      timeline1
        .to(
          inSel,
          {
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            duration: 1,
            ease: 'power1.inOut',
            onStart: () => {
              if (incomingVideo) {
                incomingVideo.currentTime = 0;        // always start the new video from the beginning
                incomingVideo.play()?.catch(() => {}); // start playing as it begins to grow
              }
            },
          },
          0
        )
        .from(
          '#current-video',
          {
            transformOrigin: 'center center',
            scale: 0,
            duration: 1.5,
            ease: 'power1.inOut',
          },
          0
        );
    },
    { dependencies: [clickCount] } // re-run on every click
  );

  // ===== HELPERS =====
  const handleVideoLoad = () => setLoadedVideos((prev) => prev + 1);
  const getVideoSrc = (index) => `videos/hero-${index}.mp4`;

  // ===== UI =====
  return (
    <div className="relative h-dvh w-screen overflow-x-hidden bg-black">
      <div id="video-frame" className="relative z-10 h-dvh w-screen overflow-x-hidden rounded-lg bg-black">
        <div>
          {/* MINI PREVIEW (top layer): the one you click */}
          <div className="mask-clip-path absolute-center absolute z-50 size-55 overflow-hidden rounded-lg">
            <div
              onClick={handleMiniVideoClick}
              className="size-full origin-center scale-65 opacity-0 transition-all duration-450 ease-in-out hover:scale-100 hover:opacity-100"
            >
              <video
                src={getVideoSrc(upcomingVideoIndex)}
                loop
                muted
                playsInline
                id="current-video"
                className="size-full origin-center object-cover rounded-lg"
                onLoadedData={handleVideoLoad}
              />
            </div>
          </div>

          {/* SLOT 0: starts as the full-screen bg and plays right away */}
          <video
            ref={(el) => (slotRefs.current[0] = el)}
            id="slot-0"
            src={getVideoSrc(videos[0])}
            autoPlay
            loop
            muted
            playsInline
            className="absolute-center absolute size-full object-cover"
            onLoadedData={handleVideoLoad}
          />

          {/* SLOT 1: starts hidden and small, waiting for its turn to grow */}
          <video
            ref={(el) => (slotRefs.current[1] = el)}
            id="slot-1"
            src={getVideoSrc(videos[1])}
            loop
            muted
            playsInline
            preload="auto"
            className="absolute-center absolute invisible size-65 object-cover"
            onLoadedData={handleVideoLoad}
          />
        </div>

        {/* LOGO OVERLAY */}
        <div className="absolute left-0 top-0 z-40 size-full">
          <div className="absolute top-15 left-9">
            <img src="/img/logo.png" alt="logo" className="w-25" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;