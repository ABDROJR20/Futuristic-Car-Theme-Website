'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Link000, Link004 } from '@/components/ui/skiper-ui/skiper40';
import { useVantaStore } from '@/store/useVantaStore';

const NAV_ITEMS = [
  { label: 'OVERVIEW', href: '#section-hero', id: 'hero' },
  { label: 'DESIGN', href: '#section-design', id: 'design' },
  { label: 'PERFORMANCE', href: '#section-performance', id: 'performance' },
  { label: 'ATELIER', href: '#section-colors', id: 'colors' },
  { label: 'SPECS', href: '#section-specs', id: 'specs' },
] as const;

export default function Navbar() {
  const heroState = useVantaStore((s) => s.heroState);
  const activeSection = useVantaStore((s) => s.activeSection);
  const accentColor = useVantaStore((s) => s.accentColor);
  const triggerAssembly = useVantaStore((s) => s.triggerAssembly);

  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 120) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (heroState === 'interior') return null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 transition-transform duration-500 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 md:px-12">
        {/* Brand Emblem */}
        <a
          href="#section-hero"
          className="group flex items-center gap-3 pointer-events-auto"
        >
          <span
            className="h-3.5 w-3.5 rotate-45 border transition-transform duration-500 group-hover:rotate-135"
            style={{
              borderColor: accentColor,
              boxShadow: `0 0 12px ${accentColor}66`,
            }}
          />
          <span className="font-display text-lg font-bold tracking-[0.36em] text-white">
            VANTA
          </span>
        </a>

        {/* Navigation Links powered by Skiper UI Link000 */}
        <nav className="hidden md:flex items-center gap-8 rounded-full border border-white/10 bg-black/40 px-7 py-2.5 backdrop-blur-md pointer-events-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <Link000
                key={item.id}
                href={item.href}
                className={`text-[11px] font-mono tracking-[0.22em] uppercase transition-colors ${
                  isActive ? 'text-[#00f0ff]' : 'text-white/65 hover:text-white'
                }`}
              >
                {item.label}
              </Link000>
            );
          })}
        </nav>

        {/* Right Controls: Replay Assembly + Reserve Link004 */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            type="button"
            onClick={triggerAssembly}
            disabled={heroState === 'assembling'}
            className="cursor-pointer rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[10px] font-mono tracking-[0.2em] uppercase text-white/75 backdrop-blur-md transition hover:border-[#00f0ff]/60 hover:text-[#00f0ff] disabled:opacity-40"
          >
            {heroState === 'assembling' ? 'ASSEMBLING...' : 'RE-ASSEMBLE'}
          </button>

          <Link004
            href="#section-cta"
            className="hidden sm:flex text-[11px] font-mono tracking-[0.22em] uppercase text-white border border-white/15 py-1.5"
          >
            RESERVE
          </Link004>
        </div>
      </div>
    </header>
  );
}

