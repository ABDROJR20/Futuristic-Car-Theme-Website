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

      {/* Active Interior Cockpit HUD */}
      {heroState === 'interior' && (
        <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-6 md:p-12 select-none">
          {/* Top Cockpit Telemetry & Exit Bar */}
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between">
            <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/70 px-5 py-2.5 backdrop-blur-xl">
              <span
                className="h-2.5 w-2.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 12px ${accentColor}`,
                }}
              />
              <span className="font-mono text-[11px] tracking-[0.26em] uppercase text-white">
                COCKPIT // {interiorSeat === 'driver' ? 'DRIVER COMMAND' : 'REAR EXECUTIVE LOUNGE'}
              </span>
            </div>

            <div className="pointer-events-auto flex items-center gap-3">
              <span className="hidden sm:inline-block font-mono text-[10px] tracking-[0.24em] uppercase text-white/50">
                PRESS [ESC] TO EXIT
              </span>
              <button
                type="button"
                onClick={triggerExitInterior}
                className="cursor-pointer rounded-full border border-white/20 bg-black/75 px-5 py-2.5 font-mono text-[11px] font-semibold tracking-[0.24em] uppercase text-white backdrop-blur-xl transition hover:border-[#00f0ff] hover:bg-[#00f0ff] hover:text-black"
              >
                EXIT CABIN ✕
              </button>
            </div>
          </div>

          {/* Bottom Controls: BACK Seat Toggle + 360° Drag Hint + Hotspot Strip */}
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 md:flex-row md:items-end md:justify-between">
            {/* Left: BACK Button (Driver <-> Rear Seat) */}
            <div className="pointer-events-auto flex items-center gap-3">
              <button
                type="button"
                onClick={toggleInteriorSeat}
                className="group flex cursor-pointer items-center gap-3 rounded-full border border-white/20 bg-black/75 px-6 py-3 font-mono text-xs font-semibold tracking-[0.24em] uppercase text-white backdrop-blur-xl transition-all hover:border-[#00f0ff] hover:shadow-[0_0_25px_rgba(0,240,255,0.35)]"
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
                <span className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] text-white/50">
                  S / ↓
                </span>
              </button>
            </div>

            {/* Center: 360° Free-Look Hint */}
            <div className="flex items-center gap-2.5 self-center rounded-full border border-white/10 bg-black/60 px-4 py-2 backdrop-blur-md">
              <span className="text-xs text-[#00f0ff]">⟳</span>
              <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-white/70">
                DRAG 360° TO LOOK AROUND • HOVER HOTSPOTS FOR SPECS
              </span>
            </div>

            {/* Right: Quick Hotspot Selector Pills */}
            <div className="pointer-events-auto hidden lg:flex flex-wrap items-center justify-end gap-1.5 max-w-md">
              {INTERIOR_HOTSPOTS.map((spot) => {
                const active = activeHotspotId === spot.id;
                return (
                  <button
                    key={spot.id}
                    type="button"
                    onMouseEnter={() => setActiveHotspotId(spot.id)}
                    onMouseLeave={() => setActiveHotspotId(null)}
                    onClick={() => setActiveHotspotId(active ? null : spot.id)}
                    className={`cursor-pointer rounded-full border px-3 py-1 font-mono text-[9px] tracking-[0.18em] uppercase backdrop-blur-md transition ${
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
      )}
    </>
  );
}

