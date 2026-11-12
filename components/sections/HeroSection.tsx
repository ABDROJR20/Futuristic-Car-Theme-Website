'use client';

import React from 'react';
import { CAR_LINEUP } from '@/lib/carConfig';
import { useVantaStore } from '@/store/useVantaStore';

export default function HeroSection() {
  const activeCar = useVantaStore((s) => s.activeCar);
  const heroState = useVantaStore((s) => s.heroState);
  const accentColor = useVantaStore((s) => s.accentColor);
  const triggerAssembly = useVantaStore((s) => s.triggerAssembly);

  const car = CAR_LINEUP[activeCar] ?? CAR_LINEUP[0];

  return (
    <section
      id="section-hero"
      className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden px-6 pt-28 pb-10 md:px-14 pointer-events-none select-none"
    >
      {/* Giant Outlined Backdrop Title Behind the 3D Car */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[18%] md:top-[14%] -z-10 flex flex-col items-center justify-center text-center"
      >
        <span className="font-mono text-[10px] md:text-xs tracking-[0.45em] uppercase text-white/35 mb-2">
          {car.code}
        </span>
        <h1
          className="font-display text-[15vw] md:text-[13.5vw] font-black uppercase leading-[0.85] tracking-tighter text-transparent opacity-30 transition-all duration-700"
          style={{
            WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.28)',
          }}
        >
          {car.name}
        </h1>
      </div>

      {/* Top Row: Telemetry & State Pill */}
      <div className="mx-auto flex w-full max-w-[1440px] items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 text-[11px] font-mono tracking-[0.25em] uppercase text-white/60">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 10px ${accentColor}`,
              }}
            />
            <span>STATE // {heroState.toUpperCase()}</span>
          </div>
          <p className="text-xs font-mono tracking-[0.18em] text-white/40 uppercase">
            {car.subtitle}
          </p>
        </div>

        {/* Phase 1 Camera / Assembly Quick Test Controls */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-2 backdrop-blur-md">
          <span className="text-[10px] font-mono tracking-[0.2em] text-white/45 uppercase mr-1">
            CHASSIS:
          </span>
          <button
            type="button"
            onClick={triggerAssembly}
            className="cursor-pointer text-[10px] font-mono tracking-[0.2em] uppercase text-[#00f0ff] hover:underline"
          >
            REPLAY EXPLODED ASSEMBLY
          </button>
        </div>
      </div>

      {/* Bottom Row: Tagline, Quick Telemetry & Scroll Hint */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
        {/* Left: Tagline */}
        <div className="max-w-lg space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 backdrop-blur-md">
            <span className="text-[10px] font-mono tracking-[0.24em] text-[#00f0ff] uppercase">
              SOLID-STATE TRI-MOTOR ARCHITECTURE
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-4xl font-bold tracking-tight uppercase text-white">
            {car.tagline}
          </h2>
        </div>

        {/* Center: Scroll Hint */}
        <div className="flex flex-col items-center gap-2 self-center">
          <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-white/45">
            SCROLL TO EXPLORE
          </span>
          <div className="relative h-10 w-[1px] overflow-hidden bg-white/15">
            <div className="h-4 w-full bg-[#00f0ff] animate-bounce" />
          </div>
        </div>

        {/* Right: Key Specs Pill */}
        <div className="grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-black/45 px-6 py-4 backdrop-blur-xl">
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-white/45 uppercase">
              0-100 KM/H
            </div>
            <div className="font-display text-xl md:text-2xl font-bold text-white">
              {car.stats.zeroToHundred}
              <span className="text-xs text-[#00f0ff] ml-0.5">s</span>
            </div>
          </div>
          <div className="border-x border-white/10 px-4">
            <div className="text-[10px] font-mono tracking-[0.2em] text-white/45 uppercase">
              POWER
            </div>
            <div className="font-display text-xl md:text-2xl font-bold text-white">
              {car.stats.horsepower}
              <span className="text-xs text-[#00f0ff] ml-0.5">HP</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-white/45 uppercase">
              RANGE
            </div>
            <div className="font-display text-xl md:text-2xl font-bold text-white">
              {car.stats.rangeKm}
              <span className="text-xs text-[#00f0ff] ml-0.5">KM</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

