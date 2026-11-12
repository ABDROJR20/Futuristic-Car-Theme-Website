'use client';

import React from 'react';

export default function ScrollSections() {
  return (
    <div id="scroll-sections-wrapper" className="relative z-10 w-full pointer-events-none">
      {/* Section 3: Design (Front & Side Close-ups) */}
      <section
        id="section-design"
        className="flex min-h-screen w-full items-end sm:items-center px-4 py-16 sm:px-8 sm:py-24 md:px-16"
      >
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 sm:bg-black/50 p-6 sm:p-8 backdrop-blur-xl pointer-events-auto">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#00f0ff]">
            01 // AERODYNAMIC SCULPTURE
          </span>
          <h3 className="mt-2 font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white">
            FORM CARVED BY PHOTONS
          </h3>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-white/65">
            Every surface of the VANTA monocoque channels airflow through active Venturi tunnels,
            generating 820 kg of downforce with a drag coefficient of just 0.19 Cd.
          </p>
        </div>
      </section>

      {/* Section 4: Performance (Scaffold for Phase 4) */}
      <section
        id="section-performance"
        className="flex min-h-screen w-full items-end sm:items-center justify-end px-4 py-16 sm:px-8 sm:py-24 md:px-16"
      >
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 sm:bg-black/50 p-6 sm:p-8 backdrop-blur-xl pointer-events-auto">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#00f0ff]">
            02 // QUANTUM PROPULSION
          </span>
          <h3 className="mt-2 font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white">
            1,020 HP. INSTANT TORQUE VECTORING.
          </h3>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-white/65">
            Three axial-flux motors independently meter torque to each wheel in 0.4 milliseconds.
          </p>
        </div>
      </section>

      {/* Section 5: Colors (Scaffold for Phase 4) */}
      <section
        id="section-colors"
        className="flex min-h-screen w-full items-end px-4 py-16 sm:px-8 sm:py-24 md:px-16"
      >
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 sm:bg-black/50 p-6 sm:p-8 backdrop-blur-xl pointer-events-auto">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#00f0ff]">
            03 // BESPOKE FINISHES
          </span>
          <h3 className="mt-2 font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white">
            METALLIC ATELIER
          </h3>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-white/65">
            Multi-stage nano-ceramic pigments engineered to shift tone under city light.
          </p>
        </div>
      </section>

      {/* Section 6: Specs (Scaffold for Phase 4) */}
      <section
        id="section-specs"
        className="flex min-h-screen w-full items-end sm:items-center px-4 py-16 sm:px-8 sm:py-24 md:px-16"
      >
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 sm:bg-black/50 p-6 sm:p-8 backdrop-blur-xl pointer-events-auto">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#00f0ff]">
            04 // TECHNICAL ARCHITECTURE
          </span>
          <h3 className="mt-2 font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white">
            ENGINEERING BLUEPRINT
          </h3>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-white/65">
            900V silicon-carbide architecture paired with structural solid-state cells.
          </p>
        </div>
      </section>

      {/* Section 7: CTA + Footer with CC-BY Model Credits */}
      <section
        id="section-cta"
        className="flex min-h-screen w-full flex-col justify-end px-6 pb-16 pt-24 md:px-16"
      >
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 border-t border-white/10 pt-8 pointer-events-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#00f0ff]">
                05 // ALLOCATION
              </span>
              <h3 className="mt-1 font-display text-3xl md:text-5xl font-bold uppercase text-white">
                RESERVE YOUR VANTA
              </h3>
            </div>
            <div className="text-xs font-mono tracking-[0.2em] text-white/40 uppercase">
              © 2026 VANTA AUTOMOTIVE INC.
            </div>
          </div>

          {/* 3D Asset CC-BY & Public Domain Attribution Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-[10px] font-mono tracking-[0.14em] text-white/35">
            <div>
              3D ASSETS: &ldquo;FREE Concept Car 002&rdquo; by Unity Fan youtube channel (CC0 Public
              Domain) • &ldquo;Spaceship 001 - Cockpit Concept&rdquo; by Mixmamo.studio (CC-BY 4.0,
              see{' '}
              <a
                href="/models/CREDITS.md"
                target="_blank"
                rel="noreferrer"
                className="text-[#00f0ff]/80 hover:underline"
              >
                /models/CREDITS.md
              </a>
              )
            </div>
            <div>FICTIONAL BRAND // NO AFFILIATION WITH REAL AUTOMAKERS</div>
          </div>
        </div>
      </section>
    </div>
  );
}
