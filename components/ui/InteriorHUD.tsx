'use client';

import React from 'react';
import { INTERIOR_HOTSPOTS } from '@/lib/carConfig';
import { useVantaStore } from '@/store/useVantaStore';
import { triggerExitInterior } from '@/components/canvas/CameraRig';

export default function InteriorHUD() {
  const heroState = useVantaStore((s) => s.heroState);
  const transitionPhase = useVantaStore((s) => s.transitionPhase);
  const interiorSeat = useVantaStore((s) => s.interiorSeat);
  const accentColor = useVantaStore((s) => s.accentColor);
  const activeHotspotId = useVantaStore((s) => s.activeHotspotId);
  const toggleInteriorSeat = useVantaStore((s) => s.toggleInteriorSeat);
  const setActiveHotspotId = useVantaStore((s) => s.setActiveHotspotId);

  const isTransitionBlur = transitionPhase === 'entering-fly';
  const isFlashOverlay =
    transitionPhase === 'flash-swap' || transitionPhase === 'exiting-flash';

  return (
    <>
      {/* Two-Scene Transition Blur/Vignette & Flash/Dissolve Overlay */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-40 transition-all duration-300 ${
          isFlashOverlay
            ? 'bg-[#05060a] opacity-95 backdrop-blur-2xl'
            : isTransitionBlur
            ? 'bg-black/35 opacity-100 backdrop-blur-md shadow-[inset_0_0_160px_rgba(0,0,0,0.95)]'
            : 'opacity-0 backdrop-blur-none'
        }`}
      />

      {/* Active Interior Cockpit HUD + 3D-Projected Hotspot Pins */}
      {heroState === 'interior' && (
        <>
          {/* 7 Interactive 3D-Projected Hotspot Pins */}
          <div className="pointer-events-none fixed inset-0 z-25 overflow-hidden select-none">
            {INTERIOR_HOTSPOTS.map((spot) => {
              const isHovered = activeHotspotId === spot.id;

              return (
                <div
                  key={spot.id}
                  id={`vanta-hotspot-${spot.id}`}
                  style={{ top: 0, left: 0, opacity: 0 }}
                  className="pointer-events-auto absolute flex items-center justify-center will-change-transform transition-opacity duration-150"
                  onMouseEnter={() => setActiveHotspotId(spot.id)}
                  onMouseLeave={() => setActiveHotspotId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveHotspotId(isHovered ? null : spot.id);
                  }}
                >
                  <button
                    type="button"
                    aria-label={spot.name}
                    className="group relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-black/75 backdrop-blur-md transition-transform duration-300 hover:scale-125"
                    style={{
                      borderColor: isHovered ? accentColor : 'rgba(255,255,255,0.35)',
                      boxShadow: isHovered
                        ? `0 0 22px ${accentColor}`
                        : `0 0 12px ${accentColor}66`,
                    }}
                  >
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span
                      className="relative inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                  </button>

                  {isHovered && (
                    <div className="pointer-events-none absolute bottom-10 left-1/2 w-60 sm:w-72 -translate-x-1/2 rounded-2xl border border-white/15 bg-[#05060a]/92 p-3 sm:p-4 text-left text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span
                          className="font-mono text-[9px] font-semibold tracking-[0.26em] uppercase"
                          style={{ color: accentColor }}
                        >
                          {spot.category}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </div>
                      <h4 className="mt-2 font-display text-xs sm:text-sm font-bold tracking-wider uppercase text-white">
                        {spot.name}
                      </h4>
                      <ul className="mt-2 space-y-1.5 text-[10px] sm:text-[11px] leading-snug text-white/75">
                        {spot.specs.map((specLine, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span
                              className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                              style={{ backgroundColor: accentColor }}
                            />
                            <span>{specLine}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 md:p-12 select-none">
            {/* Top Cockpit Telemetry & Exit Bar */}
            <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 rounded-full border border-white/15 bg-black/70 px-3.5 py-2 sm:px-5 sm:py-2.5 backdrop-blur-xl">
                <span
                  className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full animate-pulse shrink-0"
                  style={{
                    backgroundColor: accentColor,
                    boxShadow: `0 0 12px ${accentColor}`,
                  }}
                />
                <span className="font-mono text-[9px] sm:text-[11px] tracking-[0.18em] sm:tracking-[0.26em] uppercase text-white truncate">
                  COCKPIT // {interiorSeat === 'driver' ? 'DRIVER COMMAND' : 'REAR LOUNGE'}
                </span>
              </div>

              <div className="pointer-events-auto flex items-center gap-3 shrink-0">
                <span className="hidden md:inline-block font-mono text-[10px] tracking-[0.24em] uppercase text-white/50">
                  PRESS [ESC] TO EXIT
                </span>
                <button
                  type="button"
                  onClick={triggerExitInterior}
                  className="cursor-pointer rounded-full border border-white/20 bg-black/75 px-3.5 py-2 sm:px-5 sm:py-2.5 font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] sm:tracking-[0.24em] uppercase text-white backdrop-blur-xl transition hover:border-[#00f0ff] hover:bg-[#00f0ff] hover:text-black"
                >
                  EXIT CABIN ✕
                </button>
              </div>
            </div>

            {/* Bottom Controls: BACK Seat Toggle + 360° Drag Hint + Hotspot Strip */}
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="pointer-events-auto flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={toggleInteriorSeat}
                  className="group flex cursor-pointer items-center gap-2 sm:gap-3 rounded-full border border-white/20 bg-black/75 px-4 py-2.5 sm:px-6 sm:py-3 font-mono text-[10px] sm:text-xs font-semibold tracking-[0.18em] sm:tracking-[0.24em] uppercase text-white backdrop-blur-xl transition-all hover:border-[#00f0ff] hover:shadow-[0_0_25px_rgba(0,240,255,0.35)]"
                >
                  <span
                    className="inline-block transition-transform duration-300 group-hover:translate-y-0.5"
                    style={{ color: accentColor }}
                  >
                    {interiorSeat === 'driver' ? '↓' : '↑'}
                  </span>
                  <span>
                    {interiorSeat === 'driver' ? 'BACK (REAR SEAT)' : 'FRONT (DRIVER SEAT)'}
                  </span>
                  <span className="hidden sm:inline-block rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] text-white/50">
                    S / ↓
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 self-center rounded-full border border-white/10 bg-black/60 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-md">
                <span className="text-xs text-[#00f0ff]">⟳</span>
                <span className="font-mono text-[8px] sm:text-[10px] tracking-[0.16em] sm:tracking-[0.24em] uppercase text-white/70">
                  DRAG 360° TO LOOK • TAP HOTSPOTS FOR SPECS
                </span>
              </div>

              <div className="pointer-events-auto flex overflow-x-auto lg:flex-wrap items-center justify-start lg:justify-end gap-1.5 max-w-full lg:max-w-md pb-1 lg:pb-0 no-scrollbar">
                {INTERIOR_HOTSPOTS.map((spot) => {
                  const active = activeHotspotId === spot.id;
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      onMouseEnter={() => setActiveHotspotId(spot.id)}
                      onMouseLeave={() => setActiveHotspotId(null)}
                      onClick={() => setActiveHotspotId(active ? null : spot.id)}
                      className={`shrink-0 cursor-pointer rounded-full border px-2.5 py-1 sm:px-3 font-mono text-[8px] sm:text-[9px] tracking-[0.16em] sm:tracking-[0.18em] uppercase backdrop-blur-md transition ${
                        active
                          ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-white'
                          : 'border-white/10 bg-black/55 text-white/55 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {spot.category}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
