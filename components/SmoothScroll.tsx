'use client';

import React, { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useVantaStore } from '@/store/useVantaStore';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const heroState = useVantaStore((s) => s.heroState);
  const preloaderDone = useVantaStore((s) => s.preloaderDone);
  const setScrollProgress = useVantaStore((s) => s.setScrollProgress);
  const setEnvironmentFlags = useVantaStore((s) => s.setEnvironmentFlags);

  useEffect(() => {
    // Detect prefers-reduced-motion and mobile viewport
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const checkEnv = () => {
      setEnvironmentFlags({
        isReducedMotion: mediaQuery.matches,
        isMobile: window.innerWidth < 768 || 'ontouchstart' in window,
      });
    };
    checkEnv();
    mediaQuery.addEventListener('change', checkEnv);
    window.addEventListener('resize', checkEnv);

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', (e: { progress: number }) => {
      ScrollTrigger.update();
      setScrollProgress(e.progress);
    });

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      mediaQuery.removeEventListener('change', checkEnv);
      window.removeEventListener('resize', checkEnv);
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [setScrollProgress, setEnvironmentFlags]);

  // Pause smooth scrolling during preloader or interior cabin inspection
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;

    if (!preloaderDone || heroState === 'interior') {
      lenis.stop();
    } else {
      lenis.start();
    }
  }, [heroState, preloaderDone]);

  return <>{children}</>;
}

