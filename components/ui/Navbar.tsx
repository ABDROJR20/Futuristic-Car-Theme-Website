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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 120) {
        setHidden(true);
        setMobileMenuOpen(false);
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
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-8 sm:py-5 lg:px-12">
        {/* Brand Emblem */}
        <a
          href="#section-hero"
          className="group flex items-center gap-2.5 sm:gap-3 pointer-events-auto"
        >
          <span
            className="h-3 w-3 sm:h-3.5 sm:w-3.5 rotate-45 border transition-transform duration-500 group-hover:rotate-135"
            style={{
              borderColor: accentColor,
              boxShadow: `0 0 12px ${accentColor}66`,
            }}
          />
          <span className="font-display text-base sm:text-lg font-bold tracking-[0.32em] sm:tracking-[0.36em] text-white">
            VANTA
          </span>
        </a>

        {/* Desktop & Tablet Navigation Pill powered by Skiper UI Link000 */}
        <nav className="hidden lg:flex items-center gap-8 rounded-full border border-white/10 bg-black/40 px-7 py-2.5 backdrop-blur-md pointer-events-auto">
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

        {/* Right Controls: Replay Assembly + Reserve Link004 + Mobile/Tablet Menu Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-4 pointer-events-auto">
          <button
            type="button"
            onClick={triggerAssembly}
            disabled={heroState === 'assembling'}
            className="cursor-pointer rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 sm:px-3.5 text-[9px] sm:text-[10px] font-mono tracking-[0.18em] sm:tracking-[0.2em] uppercase text-white/75 backdrop-blur-md transition hover:border-[#00f0ff]/60 hover:text-[#00f0ff] disabled:opacity-40"
          >
            {heroState === 'assembling' ? 'ASSEMBLING...' : 'RE-ASSEMBLE'}
          </button>

          <Link004
            href="#section-cta"
            className="hidden sm:flex text-[11px] font-mono tracking-[0.22em] uppercase text-white border border-white/15 py-1.5"
          >
            RESERVE
          </Link004>

          {/* Mobile & Tablet Menu Button */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex lg:hidden h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-md transition hover:border-[#00f0ff]"
          >
            <span className="font-mono text-xs">{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Glassmorphic Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto mx-4 mt-1 flex flex-col gap-2 rounded-2xl border border-white/15 bg-[#05060a]/95 p-4 backdrop-blur-2xl lg:hidden sm:mx-8">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 font-mono text-xs tracking-[0.22em] uppercase transition ${
                  isActive
                    ? 'bg-[#00f0ff]/15 text-[#00f0ff]'
                    : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] text-white/30">→</span>
              </a>
            );
          })}
          <a
            href="#section-cta"
            onClick={() => setMobileMenuOpen(false)}
            className="mt-1 flex items-center justify-center rounded-xl border border-[#00f0ff]/50 bg-[#00f0ff]/10 py-2.5 font-mono text-xs font-semibold tracking-[0.24em] uppercase text-[#00f0ff]"
          >
            RESERVE YOUR VANTA
          </a>
        </div>
      )}
    </header>
  );
}
