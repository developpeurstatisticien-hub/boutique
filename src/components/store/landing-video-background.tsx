"use client";

import { useEffect, useState } from "react";

const fallbackVideo = "https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4";

export function LandingVideoBackground({ videos }: { videos: string[] }) {
  const sources = videos.length > 0 ? videos : [fallbackVideo];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (sources.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % sources.length);
    }, 18_000);
    return () => window.clearInterval(timer);
  }, [sources.length]);

  return (
    <video
      key={sources[activeIndex]}
      className="welcome__video"
      autoPlay
      muted
      loop
      playsInline
      poster="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2200&q=85"
      aria-hidden="true"
    >
      <source src={sources[activeIndex]} />
    </video>
  );
}
