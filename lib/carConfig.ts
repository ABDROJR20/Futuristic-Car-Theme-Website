export type CameraViewKey = 'exterior' | 'doorsOpen' | 'driverSeat' | 'rearSeat';

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface DoorHingeConfig {
  nodeName: string;
  pivotPosition: [number, number, number];
  openRotation: [number, number, number]; // Euler angles in radians when open
  closedRotation: [number, number, number];
}

export interface CarColorSwatch {
  id: string;
  name: string;
  hex: string;
  accentHex: string;
  roughness: number;
  metalness: number;
}

export interface CarModelConfig {
  id: string;
  name: string;
  code: string;
  tagline: string;
  subtitle: string;
  modelPath: string; // e.g. /models/vanta-x1.glb (falls back to procedural hypercar)
  defaultColor: string;
  accentColor: string;
  /** Proportions & styling modifiers for the procedural hypercar */
  dimensions: {
    lengthScale: number;
    widthScale: number;
    heightScale: number;
    wingHeight: number;
    rideHeight: number;
    doorStyle: 'butterfly' | 'scissor' | 'dihedral';
  };
  stats: {
    zeroToHundred: number; // seconds
    horsepower: number;
    rangeKm: number;
    topSpeedKmh: number;
  };
  doors: {
    left: DoorHingeConfig;
    right: DoorHingeConfig;
  };
  hotspotPosition: [number, number, number];
  cameras: Record<CameraViewKey, CameraPose> & {
    scrollWaypoints: {
      designFront: CameraPose;
      designSide: CameraPose;
      performance: CameraPose;
      colors: CameraPose;
      specs: CameraPose;
      cta: CameraPose;
    };
  };
}

/**
 * Standardized part names used for both GLB traversal and ProceduralCar generation
 */
export const CAR_PART_NAMES = [
  'chassis_base',
  'body_main',
  'hood_front',
  'roof_canopy',
  'rear_deck',
  'fender_fl',
  'fender_fr',
  'fender_rl',
  'fender_rr',
  'splitter_front',
  'diffuser_rear',
  'aero_wing',
  'side_skirt_l',
  'side_skirt_r',
  'glass_windshield',
  'glass_rear',
  'light_front_bar',
  'light_rear_bar',
  'door_left_pivot',
  'door_right_pivot',
  'interior_dashboard',
  'seat_fl',
  'seat_fr',
  'seat_rl',
  'seat_rr',
  'wheel_fl',
  'wheel_fr',
  'wheel_rl',
  'wheel_rr',
] as const;

export type CarPartName = (typeof CAR_PART_NAMES)[number];

/**
 * 5 Signature VANTA Color Swatches
 */
export const VANTA_COLOR_SWATCHES: CarColorSwatch[] = [
  {
    id: 'obsidian-cyan',
    name: 'Obsidian Pulse',
    hex: '#0b101b',
    accentHex: '#00f0ff',
    roughness: 0.16,
    metalness: 0.88,
  },
  {
    id: 'cryo-silver',
    name: 'Cryo Titanium',
    hex: '#b8c4d4',
    accentHex: '#38bdf8',
    roughness: 0.14,
    metalness: 0.94,
  },
  {
    id: 'ion-cobalt',
    name: 'Ion Cobalt',
    hex: '#0a2351',
    accentHex: '#00e5ff',
    roughness: 0.18,
    metalness: 0.86,
  },
  {
    id: 'plasma-crimson',
    name: 'Plasma Crimson',
    hex: '#5a0818',
    accentHex: '#ff2a5f',
    roughness: 0.15,
    metalness: 0.85,
  },
  {
    id: 'stealth-graphite',
    name: 'Vanta Matte',
    hex: '#121318',
    accentHex: '#22d3ee',
    roughness: 0.38,
    metalness: 0.72,
  },
];

const BASE_SCROLL_WAYPOINTS: CarModelConfig['cameras']['scrollWaypoints'] = {
  designFront: {
    position: [-2.6, 0.95, 3.6],
    target: [0, 0.55, 0.6],
    fov: 36,
  },
  designSide: {
    position: [4.8, 1.15, 0.2],
    target: [0, 0.6, 0],
    fov: 38,
  },
  performance: {
    position: [3.2, 0.75, -4.2],
    target: [0, 0.55, 0],
    fov: 44,
  },
  colors: {
    position: [-3.8, 1.85, 3.8],
    target: [0, 0.55, 0],
    fov: 40,
  },
  specs: {
    position: [0.0, 5.4, 0.01],
    target: [0, 0.4, 0],
    fov: 38,
  },
  cta: {
    position: [3.6, 1.25, 4.4],
    target: [0, 0.55, 0],
    fov: 40,
  },
};

export const CAR_LINEUP: CarModelConfig[] = [
  {
    id: 'vanta-x1',
    name: 'VANTA X1',
    code: 'VX-01 // APEX COUPE',
    tagline: 'SILENCE ARMED WITH 1,020 HORSEPOWER.',
    subtitle: 'Tri-Motor Quantum Solid-State Hypercar',
    modelPath: '/models/vanta-x1.glb',
    defaultColor: '#0b101b',
    accentColor: '#00f0ff',
    dimensions: {
      lengthScale: 1.0,
      widthScale: 1.0,
      heightScale: 1.0,
      wingHeight: 0.22,
      rideHeight: 0.0,
      doorStyle: 'butterfly',
    },
    stats: {
      zeroToHundred: 2.8,
      horsepower: 1020,
      rangeKm: 650,
      topSpeedKmh: 350,
    },
    doors: {
      left: {
        nodeName: 'door_left_pivot',
        pivotPosition: [-0.96, 0.68, 0.48],
        openRotation: [0.32, 0.85, -0.58],
        closedRotation: [0, 0, 0],
      },
      right: {
        nodeName: 'door_right_pivot',
        pivotPosition: [0.96, 0.68, 0.48],
        openRotation: [0.32, -0.85, 0.58],
        closedRotation: [0, 0, 0],
      },
    },
    hotspotPosition: [0, 0.92, 0.1],
    cameras: {
      exterior: {
        position: [3.9, 1.45, 4.3],
        target: [0, 0.58, 0],
        fov: 40,
      },
      doorsOpen: {
        position: [3.3, 1.55, 3.6],
        target: [0, 0.68, 0.05],
        fov: 42,
      },
      driverSeat: {
        position: [-0.36, 0.94, -0.08],
        target: [-0.32, 0.86, 1.55],
        fov: 58,
      },
      rearSeat: {
        position: [0.0, 1.02, -0.82],
        target: [0.0, 0.86, 1.35],
        fov: 62,
      },
      scrollWaypoints: BASE_SCROLL_WAYPOINTS,
    },
  },
  {
    id: 'vanta-s-zero',
    name: 'VANTA S-ZERO',
    code: 'VS-00 // TRACK WEAPON',
    tagline: 'BORN IN THE WIND TUNNEL. BUILT FOR THE HORIZON.',
    subtitle: 'Active Ground-Effect Track Prototype',
    modelPath: '/models/vanta-s-zero.glb',
    defaultColor: '#0a2351',
    accentColor: '#00e5ff',
    dimensions: {
      lengthScale: 1.05,
      widthScale: 1.06,
      heightScale: 0.94,
      wingHeight: 0.36,
      rideHeight: -0.02,
      doorStyle: 'scissor',
    },
    stats: {
      zeroToHundred: 2.3,
      horsepower: 1280,
      rangeKm: 580,
      topSpeedKmh: 385,
    },
    doors: {
      left: {
        nodeName: 'door_left_pivot',
        pivotPosition: [-1.01, 0.65, 0.5],
        openRotation: [0.75, 0.25, -0.25],
        closedRotation: [0, 0, 0],
      },
      right: {
        nodeName: 'door_right_pivot',
        pivotPosition: [1.01, 0.65, 0.5],
        openRotation: [0.75, -0.25, 0.25],
        closedRotation: [0, 0, 0],
      },
    },
    hotspotPosition: [0, 0.88, 0.1],
    cameras: {
      exterior: {
        position: [4.0, 1.38, 4.2],
        target: [0, 0.54, 0],
        fov: 40,
      },
      doorsOpen: {
        position: [3.4, 1.5, 3.5],
        target: [0, 0.65, 0.05],
        fov: 42,
      },
      driverSeat: {
        position: [-0.36, 0.9, -0.08],
        target: [-0.32, 0.82, 1.55],
        fov: 60,
      },
      rearSeat: {
        position: [0.0, 0.98, -0.82],
        target: [0.0, 0.82, 1.35],
        fov: 62,
      },
      scrollWaypoints: BASE_SCROLL_WAYPOINTS,
    },
  },
  {
    id: 'vanta-spectre',
    name: 'VANTA SPECTRE',
    code: 'VP-09 // GRAND TOURER',
    tagline: 'AUTONOMOUS LUXURY MEETS ORBITAL VELOCITY.',
    subtitle: 'Executive Four-Seat Hyper GT',
    modelPath: '/models/vanta-spectre.glb',
    defaultColor: '#b8c4d4',
    accentColor: '#38bdf8',
    dimensions: {
      lengthScale: 1.03,
      widthScale: 0.98,
      heightScale: 1.05,
      wingHeight: 0.14,
      rideHeight: 0.02,
      doorStyle: 'dihedral',
    },
    stats: {
      zeroToHundred: 2.6,
      horsepower: 1100,
      rangeKm: 740,
      topSpeedKmh: 340,
    },
    doors: {
      left: {
        nodeName: 'door_left_pivot',
        pivotPosition: [-0.94, 0.7, 0.48],
        openRotation: [0.22, 0.95, -0.45],
        closedRotation: [0, 0, 0],
      },
      right: {
        nodeName: 'door_right_pivot',
        pivotPosition: [0.94, 0.7, 0.48],
        openRotation: [0.22, -0.95, 0.45],
        closedRotation: [0, 0, 0],
      },
    },
    hotspotPosition: [0, 0.96, 0.1],
    cameras: {
      exterior: {
        position: [3.95, 1.5, 4.35],
        target: [0, 0.6, 0],
        fov: 40,
      },
      doorsOpen: {
        position: [3.35, 1.6, 3.65],
        target: [0, 0.7, 0.05],
        fov: 42,
      },
      driverSeat: {
        position: [-0.36, 0.97, -0.08],
        target: [-0.32, 0.89, 1.55],
        fov: 58,
      },
      rearSeat: {
        position: [0.0, 1.05, -0.82],
        target: [0.0, 0.89, 1.35],
        fov: 62,
      },
      scrollWaypoints: BASE_SCROLL_WAYPOINTS,
    },
  },
];

