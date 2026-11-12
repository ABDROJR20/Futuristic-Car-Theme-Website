'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useVantaStore } from '@/store/useVantaStore';

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const counterObj = useRef({ val: 0 });
  const setPreloaderDone = useVantaStore((s) => s.setPreloaderDone);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        setPreloaderDone(true);
        if (containerRef.current) {
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.75,
            ease: 'power3.inOut',
            onComplete: () => setHidden(true),
          });
        } else {
          setHidden(true);
        }
      },
    });

    tl.to(counterObj.current, {
      val: 100,
      duration: 1.9,
      ease: 'power2.inOut',
      onUpdate: () => {
        setProgress(Math.round(counterObj.current.val));
      },
    });

    return () => {
      tl.kill();
    };
  }, [setPreloaderDone]);

  if (hidden) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#05060a] px-8 py-10 text-white select-none"
    >
      {/* Top Telemetry Bar */}
      <div className="flex items-center justify-between text-[11px] tracking-[0.28em] uppercase text-white/50 font-mono">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[#00f0ff] animate-pulse" />
          <span>VANTA AEROSPACE // QUANTUM DRIVE OS v4.2</span>
        </div>
        <span>SYS.INIT // MATRIX CALIBRATION</span>
      </div>

      {/* Center Logo & Progress Bar */}
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rotate-45 border border-[#00f0ff] bg-[#00f0ff]/10 shadow-[0_0_20px_rgba(0,240,255,0.45)]" />
          <span className="font-display text-3xl md:text-4xl font-bold tracking-[0.42em] text-white">
            VANTA
          </span>
        </div>

        <div className="w-full h-[1px] bg-white/10 relative overflow-hidden">
          <div
            className="h-full bg-[#00f0ff] shadow-[0_0_12px_#00f0ff] transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex w-full justify-between text-[10px] font-mono tracking-[0.25em] uppercase text-white/45">
          <span>
            {progress < 35
              ? 'LOADING CHASSIS TELEMETRY...'
              : progress < 75
              ? 'ALIGNING MAGNETIC SUB-ASSEMBLIES...'
              : 'ENGAGING SOLID-STATE CORE...'}
          </span>
          <span className="text-[#00f0ff]">{String(progress).padStart(3, '0')}%</span>
        </div>
      </div>

      {/* Bottom Giant Numeric Counter */}
      <div className="flex items-end justify-between border-t border-white/10 pt-6">
        <div className="text-xs font-mono tracking-[0.22em] text-white/40 uppercase">
          PHASE 01 // AUTONOMOUS ASSEMBLY SEQUENCE
        </div>
        <div className="font-display text-6xl md:text-8xl font-extrabold tracking-tighter text-white/90 tabular-nums leading-none">
          {String(progress).padStart(3, '0')}
          <span className="text-2xl md:text-4xl text-[#00f0ff] ml-1">%</span>
        </div>
      </div>
    </div>
  );
}

