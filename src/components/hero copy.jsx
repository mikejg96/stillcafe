import { useGSAP } from '@gsap/react';
import React, { useState, useRef } from 'react'
import { use } from 'react'
import gsap from 'gsap';

const Hero = () => {

  const [currentIndex, setCurrentIndex] = useState(1);
  const [hasClicked, setHasClicked] = useState(false);
  // const [bgIndex, setbgIndex] = useState(1)
  const [isLoading, setIsLoading] = useState(true);
  const [loadedVideos, setLoadedVideos] = useState(0);

  const totalVideos = 4;
  const nextVideoRef = useRef(null);

  const upcomingVideoIndex = (currentIndex % totalVideos) + 1;
  
  const handleMiniVideoClick = () =>{
    setHasClicked(true);
    // setCurrentIndex((prevIndex)=> prevIndex+1)
    setCurrentIndex(upcomingVideoIndex)
  };
  
  useGSAP( 
    ()=> {
      if (hasClicked){
        gsap.set('#next-video', {visibility: 'visible'});
        gsap.to('#next-video', {
          transformOrigin: 'center center',
          scale: 1,
          width: '100%',
          height: '100%',
          duration: 1,
          ease: 'power1.inOut',
          onStart: () => nextVideoRef.current.play(),
          // onComplete: () => setbgIndex(currentIndex),
        }),
        
        gsap.from('#current-video', {
          transformOrigin: 'center center',
          scale: 0,
          duration: 1.5,
          ease: 'power1.inOut',
        })

        
      }
  
  }, 
  {
    dependencies: [currentIndex], 
    revertOnUpdate: true,
  })

  const handleVideoLoad = () => {
    setLoadedVideos((prev) => prev + 1)
  };

  const getVideoSrc = (index) => `videos/hero-${index}.mp4`;

  return (
    <div className="relative h-dvh w-screen overflow-x-hidden bg-black">
      <div id="video-frame" className="relative z-10 h-dvh w-screen overflow-x-hidden rounded-lg">
        <div>
          <div className="mask-clip-path absolute-center absolute z-50 size-55 overflow-hidden rounded-lg">
            {/* UNDER 02 LAYER 2 - the frame inside */}
            <div onClick={handleMiniVideoClick} className="size-full origin-center scale-65 opacity-0 transition-all duration-450 ease-in-out hover:scale-100 hover:opacity-100">
              {/* UNDER 02 LAYER 3 - the video */}
              <video
              ref={nextVideoRef}
              src={getVideoSrc(upcomingVideoIndex)}
              loop
              muted
              id="current-video"
              className="size-full origin-center object-cover rounded-lg"
              onLoadedData={handleVideoLoad}
              />
            </div>
          </div>

          {/* BG VIDEO, HAS TO STAY UNTIL ANIM ENDS */}
          <video 
          ref={nextVideoRef}
          src={getVideoSrc(currentIndex)}
          id="next-video"
          className="absolute-center object-cover invisible absolute z-20 size-65"
          />
          {/* SWAP FROM HERE */}
          <video
          src={getVideoSrc(currentIndex === currentIndex - 1 ? 1:currentIndex)}
          autoPlay
          loop
          muted
          className="absolute left-0 top-0 size-full object-center object-cover"
          onLoadedData={handleVideoLoad}
          />
        </div>
        {/* <h1 className="special-font hero-heading absolute z-40 bottom-10 right-5 text-blue-75">
          <b>TEXT</b>
        </h1> */}
        <div className="absolute left-0 top-0 z-40 size-full">
          {/* <div className="mt-24 px-5 sm:px-10"> */}
          <div className="absolute top-15 left-9">
            <img
            src="/img/logo.png"
            alt="logo"
            className="w-25"
            />

          </div>
        </div>
      </div>
    </div>
  )
}

export default Hero