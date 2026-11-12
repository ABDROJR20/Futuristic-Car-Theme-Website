import { create } from 'zustand';
import { CAR_LINEUP, VANTA_COLOR_SWATCHES } from '@/lib/carConfig';

export type HeroState = 'assembling' | 'idle' | 'doorsOpen' | 'interior' | 'exiting';
export type SectionId = 'hero' | 'design' | 'performance' | 'colors' | 'specs' | 'cta';
export type InteriorSeatView = 'driver' | 'rear';
export type ActiveSceneMode = 'exterior' | 'interior';
export type TransitionPhase = 'none' | 'entering-fly' | 'flash-swap' | 'exiting-flash';

interface VantaStoreState {
  // Core required state
  heroState: HeroState;
  activeCar: number;
  activeColor: string;
  activeSection: SectionId;
  scrollProgress: number;

  // Two-scene & interaction state
  activeScene: ActiveSceneMode;
  transitionPhase: TransitionPhase;
  activeHotspotId: string | null;
  interiorLoading: boolean;
  exteriorDoorDiagnostic: {
    hasSeparateDoors: boolean | null;
    message: string | null;
  };

  // Auxiliary UI & interaction state
  preloaderDone: boolean;
  interiorSeat: InteriorSeatView;
  assemblyKey: number;
  accentColor: string;
  cursorLabel: string | null;
  isReducedMotion: boolean;
  isMobile: boolean;

  // Actions
  setHeroState: (state: HeroState) => void;
  setActiveScene: (scene: ActiveSceneMode) => void;
  setTransitionPhase: (phase: TransitionPhase) => void;
  setActiveHotspotId: (id: string | null) => void;
  setInteriorLoading: (loading: boolean) => void;
  setExteriorDoorDiagnostic: (hasSeparateDoors: boolean, message: string) => void;
  setActiveCar: (index: number) => void;
  nextCar: () => void;
  prevCar: () => void;
  setActiveColor: (hex: string, accentHex?: string) => void;
  setActiveSection: (section: SectionId) => void;
  setScrollProgress: (progress: number) => void;
  setPreloaderDone: (done: boolean) => void;
  setInteriorSeat: (seat: InteriorSeatView) => void;
  toggleInteriorSeat: () => void;
  triggerAssembly: () => void;
  setCursorLabel: (label: string | null) => void;
  setEnvironmentFlags: (flags: { isReducedMotion?: boolean; isMobile?: boolean }) => void;
}

export const useVantaStore = create<VantaStoreState>((set, get) => ({
  heroState: 'assembling',
  activeCar: 0,
  activeColor: CAR_LINEUP[0].defaultColor,
  activeSection: 'hero',
  scrollProgress: 0,

  activeScene: 'exterior',
  transitionPhase: 'none',
  activeHotspotId: null,
  interiorLoading: false,
  exteriorDoorDiagnostic: {
    hasSeparateDoors: null,
    message: null,
  },

  preloaderDone: false,
  interiorSeat: 'driver',
  assemblyKey: 0,
  accentColor: CAR_LINEUP[0].accentColor,
  cursorLabel: null,
  isReducedMotion: false,
  isMobile: false,

  setHeroState: (heroState) => set({ heroState }),
  setActiveScene: (activeScene) => set({ activeScene }),
  setTransitionPhase: (transitionPhase) => set({ transitionPhase }),
  setActiveHotspotId: (activeHotspotId) => set({ activeHotspotId }),
  setInteriorLoading: (interiorLoading) => set({ interiorLoading }),
  setExteriorDoorDiagnostic: (hasSeparateDoors, message) =>
    set({ exteriorDoorDiagnostic: { hasSeparateDoors, message } }),

  setActiveCar: (index) => {
    const total = CAR_LINEUP.length;
    const normalized = ((index % total) + total) % total;
    const car = CAR_LINEUP[normalized];
    set((state) => ({
      activeCar: normalized,
      activeColor: car.defaultColor,
      accentColor: car.accentColor,
      activeScene: 'exterior',
      transitionPhase: 'none',
      activeHotspotId: null,
      heroState: state.isReducedMotion ? 'idle' : 'assembling',
      interiorSeat: 'driver',
      assemblyKey: state.assemblyKey + 1,
    }));
  },

  nextCar: () => {
    const { activeCar, setActiveCar } = get();
    setActiveCar(activeCar + 1);
  },

  prevCar: () => {
    const { activeCar, setActiveCar } = get();
    setActiveCar(activeCar - 1);
  },

  setActiveColor: (hex, accentHex) => {
    const matchedSwatch = VANTA_COLOR_SWATCHES.find(
      (s) => s.hex.toLowerCase() === hex.toLowerCase()
    );
    set({
      activeColor: hex,
      accentColor: accentHex || matchedSwatch?.accentHex || get().accentColor,
    });
  },

  setActiveSection: (activeSection) => set({ activeSection }),

  setScrollProgress: (scrollProgress) => set({ scrollProgress }),

  setPreloaderDone: (preloaderDone) =>
    set((state) => ({
      preloaderDone,
      heroState: state.isReducedMotion ? 'idle' : 'assembling',
    })),

  setInteriorSeat: (interiorSeat) => set({ interiorSeat }),

  toggleInteriorSeat: () =>
    set((state) => ({
      interiorSeat: state.interiorSeat === 'driver' ? 'rear' : 'driver',
      activeHotspotId: null,
    })),

  triggerAssembly: () =>
    set((state) => ({
      activeScene: 'exterior',
      transitionPhase: 'none',
      activeHotspotId: null,
      heroState: state.isReducedMotion ? 'idle' : 'assembling',
      interiorSeat: 'driver',
      assemblyKey: state.assemblyKey + 1,
    })),

  setCursorLabel: (cursorLabel) => set({ cursorLabel }),

  setEnvironmentFlags: (flags) =>
    set((state) => ({
      isReducedMotion: flags.isReducedMotion ?? state.isReducedMotion,
      isMobile: flags.isMobile ?? state.isMobile,
    })),
}));
