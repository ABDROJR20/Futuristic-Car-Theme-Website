'use client';

import React from 'react';
import { CAR_LINEUP } from '@/lib/carConfig';
import { useVantaStore } from '@/store/useVantaStore';
import { triggerEnterInterior } from '@/components/canvas/CameraRig';

export default function HeroSection() {
  const activeCar = useVantaStore((s) => s.activeCar);
  const heroState = useVantaStore((s) => s.heroState);
  const activeSection = useVantaStore((s) => s.activeSection);
  const accentColor = useVantaStore((s) => s.accentColor);
  const exteriorDoorDiagnostic = useVantaStore((s) => s.exteriorDoorDiagnostic);
  const triggerAssembly = useVantaStore((s) => s.triggerAssembly);
  const setCursorLabel = useVantaStore((s) => s.setCursorLabel);

  const car = CAR_LINEUP[activeCar] ?? CAR_LINEUP[0];

  if (heroState === 'interior') {
    return <section id="section-hero" className="min-h-screen w-full pointer-events-none" />;
  }

  const showCabinHotspot =
    activeSection === 'hero' &&
    (heroState === 'doorsOpen' ||
      (!exteriorDoorDiagnostic.hasSeparateDoors && heroState === 'idle'));

  return (
    <section
      id="section-hero"
      className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden px-4 pt-20 pb-6 sm:px-8 sm:pt-24 sm:pb-8 md:px-14 md:pt-28 md:pb-10 pointer-events-none select-none"
    >
      {/* 3D-Projected Exterior Cabin Hotspot (zero R3F <Html> portals) */}
      <div
        id="vanta-exterior-hotspot"
        style={{ top: 0, left: 0 }}
        className={`fixed z-20 will-change-transform transition-opacity duration-300 ${
          showCabinHotspot
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onMouseEnter={() => setCursorLabel('ENTER')}
          onMouseLeave={() => setCursorLabel(null)}
          onClick={(e) => {
            e.stopPropagation();
            triggerEnterInterior();
          }}
          className="group relative flex cursor-pointer items-center gap-2 sm:gap-2.5 rounded-full border border-[#00f0ff]/80 bg-black/80 px-3 py-1.5 sm:px-4 sm:py-2 text-white shadow-[0_0_30px_rgba(0,240,255,0.55)] backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:bg-[#00f0ff] hover:text-black"
        >
          <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00f0ff] opacity-85" />
            <span className="relative inline-flex h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#00f0ff] group-hover:bg-black" />
          </span>
          <span className="whitespace-nowrap font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] sm:tracking-[0.24em] uppercase">
            ENTER COCKPIT
          </span>
        </button>
      </div>

      {/* Giant Outlined Backdrop Title Behind the 3D Car */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[20%] sm:top-[18%] md:top-[14%] -z-10 flex flex-col items-center justify-center text-center px-2"
      >
        <span className="font-mono text-[9px] sm:text-[10px] md:text-xs tracking-[0.35em] sm:tracking-[0.45em] uppercase text-white/35 mb-1.5 sm:mb-2">
          {car.code}
        </span>
        <h1
          className="font-display text-[16vw] sm:text-[14.5vw] md:text-[13.5vw] font-black uppercase leading-[0.85] tracking-tighter text-transparent opacity-30 transition-all duration-700"
          style={{
            WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.28)',
          }}
        >
          {car.name}
        </h1>
      </div>

      {/* Top Row: Telemetry, Door Diagnostic & Quick Controls */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="flex flex-col gap-0.5 sm:gap-1">
          <div className="flex items-center gap-2 sm:gap-2.5 text-[10px] sm:text-[11px] font-mono tracking-[0.2em] sm:tracking-[0.25em] uppercase text-white/60">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 10px ${accentColor}`,
              }}
            />
            <span>STATE // {heroState.toUpperCase()}</span>
          </div>
          <p className="text-[10px] sm:text-xs font-mono tracking-[0.14em] sm:tracking-[0.18em] text-white/40 uppercase">
            {car.subtitle}
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={triggerEnterInterior}
            className="cursor-pointer rounded-full border border-[#00f0ff]/60 bg-[#00f0ff]/10 px-3 py-1.5 sm:px-4 sm:py-2 font-mono text-[9px] sm:text-[10px] font-semibold tracking-[0.18em] sm:tracking-[0.22em] uppercase text-[#00f0ff] backdrop-blur-md transition hover:bg-[#00f0ff] hover:text-black"
          >
            ENTER COCKPIT →
          </button>

          <button
            type="button"
            onClick={triggerAssembly}
            className="cursor-pointer rounded-full border border-white/10 bg-black/45 px-3 py-1.5 sm:px-4 sm:py-2 font-mono text-[9px] sm:text-[10px] tracking-[0.16em] sm:tracking-[0.2em] uppercase text-white/75 backdrop-blur-md transition hover:border-white/30 hover:text-white"
          >
            <span className="sm:hidden">REPLAY</span>
            <span className="hidden sm:inline">REPLAY ASSEMBLY</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Tagline, Scroll Hint & Key Specs Pill */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-lg space-y-1.5 sm:space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 sm:px-3 backdrop-blur-md">
            <span className="text-[8px] sm:text-[10px] font-mono tracking-[0.16em] sm:tracking-[0.24em] text-[#00f0ff] uppercase">
              TAP OR HOVER CAR • CLICK HOTSPOT FOR 360° CABIN
            </span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl md:text-4xl font-bold tracking-tight uppercase text-white">
            {car.tagline}
          </h2>
        </div>

        <div className="hidden md:flex flex-col items-center gap-2 self-center">
          <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-white/45">
            SCROLL TO EXPLORE
          </span>
          <div className="relative h-10 w-[1px] overflow-hidden bg-white/15">
            <div className="h-4 w-full bg-[#00f0ff] animate-bounce" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 rounded-2xl border border-white/10 bg-black/45 px-3.5 py-3 sm:px-6 sm:py-4 backdrop-blur-xl">
          <div>
            <div className="text-[8px] sm:text-[10px] font-mono tracking-[0.14em] sm:tracking-[0.2em] text-white/45 uppercase">
              0-100 KM/H
            </div>
            <div className="font-display text-base sm:text-xl md:text-2xl font-bold text-white">
              {car.stats.zeroToHundred}
              <span className="text-[10px] sm:text-xs text-[#00f0ff] ml-0.5">s</span>
            </div>
          </div>
          <div className="border-x border-white/10 px-2.5 sm:px-4">
            <div className="text-[8px] sm:text-[10px] font-mono tracking-[0.14em] sm:tracking-[0.2em] text-white/45 uppercase">
              POWER
            </div>
            <div className="font-display text-base sm:text-xl md:text-2xl font-bold text-white">
              {car.stats.horsepower}
              <span className="text-[10px] sm:text-xs text-[#00f0ff] ml-0.5">HP</span>
            </div>
          </div>
          <div>
            <div className="text-[8px] sm:text-[10px] font-mono tracking-[0.14em] sm:tracking-[0.2em] text-white/45 uppercase">
              RANGE
            </div>
            <div className="font-display text-base sm:text-xl md:text-2xl font-bold text-white">
              {car.stats.rangeKm}
              <span className="text-[10px] sm:text-xs text-[#00f0ff] ml-0.5">KM</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
