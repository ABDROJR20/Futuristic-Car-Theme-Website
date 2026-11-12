import SmoothScroll from '@/components/SmoothScroll';
import SceneWrapper from '@/components/canvas/SceneWrapper';
import Preloader from '@/components/ui/Preloader';
import Navbar from '@/components/ui/Navbar';
import InteriorHUD from '@/components/ui/InteriorHUD';
import HeroSection from '@/components/sections/HeroSection';
import ScrollSections from '@/components/sections/ScrollSections';

export default function HomePage() {
  return (
    <SmoothScroll>
      {/* Preloader overlay: counts 000 -> 100%, fades out, triggers 3D assembly */}
      <Preloader />

      {/* Fixed full-screen Three.js / R3F Canvas (z-index: 0) */}
      <SceneWrapper />

      {/* Subtle atmospheric grid/grain overlay */}
      <div
        aria-hidden="true"
        className="vanta-grain pointer-events-none fixed inset-0 z-[1] opacity-50"
      />

      {/* Top Glassmorphic Navigation */}
      <Navbar />

      {/* Two-Scene Transition Overlay & Interior 360° Cockpit HUD */}
      <InteriorHUD />

      {/* Scrollable HTML Sections above Canvas */}
      <main className="relative z-10 w-full pointer-events-none">
        <HeroSection />
        <ScrollSections />
      </main>
    </SmoothScroll>
  );
}
