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

export interface InteriorHotspotConfig {
  id: string;
  name: string;
  category: string;
  position: [number, number, number];
  nudgeTarget: [number, number, number];
  specs: [string, string];
}

export interface GlbDerivedNodeConfig {
  exteriorModelPath: string;
  interiorModelPath: string;
  targetExteriorLengthMeters: number;
  targetInteriorSpanMeters: number;
  /**
   * Node classification rules & derived mesh node names populated by inspect-glb / runtime glbInspector
   */
  derivedNodes: {
    body: string[];
    doors: {
      left: string[];
      right: string[];
      hasSeparateDoors: boolean | null; // null until GLB is loaded and inspected
    };
    wheels: string[];
    glass: string[];
    lights: string[];
    interior: string[];
  };
}

export const GLB_MODEL_CONFIG: GlbDerivedNodeConfig = {
  exteriorModelPath: '/models/exterior.glb',
  interiorModelPath: '/models/interior.glb',
  targetExteriorLengthMeters: 4.65,
  targetInteriorSpanMeters: 2.8,
  derivedNodes: {
    body: [],
    doors: {
      left: [],
      right: [],
      hasSeparateDoors: null,
    },
    wheels: [],
    glass: [],
    lights: [],
    interior: [],
  },
};

/**
 * 7 Interactive Interior Hotspots (Steering Yoke, Main Display, Instrument Cluster,
 * Center Console, Seats, Ambient Light Strips, Door Panel)
 */
export const INTERIOR_HOTSPOTS: InteriorHotspotConfig[] = [
  {
    id: 'steering-yoke',
    name: 'Hyperspace Carbon Yoke',
    category: 'STEER-BY-WIRE',
    position: [-0.36, 0.78, 0.38],
    nudgeTarget: [-0.36, 0.76, 0.55],
    specs: [
      'Force-feedback steer-by-wire, 14:1 variable ratio',
      'Forged carbon core with capacitive thumb encoders',
    ],
  },
  {
    id: 'main-display',
    name: 'Center Quantum OLED',
    category: 'INFOTAINMENT',
    position: [0.02, 0.84, 0.52],
    nudgeTarget: [0.02, 0.84, 0.65],
    specs: [
      '15.4 in OLED display, 120 Hz adaptive refresh rate',
      '2,400 nits peak HDR brightness, zero-bezel sapphire glass',
    ],
  },
  {
    id: 'instrument-cluster',
    name: 'Holographic Telemetry Cluster',
    category: 'DRIVER HUD',
    position: [-0.36, 0.91, 0.54],
    nudgeTarget: [-0.36, 0.91, 0.7],
    specs: [
      '12.3 in curved micro-LED cluster, 0.2 ms response',
      'Real-time G-force vectoring & thermal night-vision overlay',
    ],
  },
  {
    id: 'center-console',
    name: 'Floating Titanium Console',
    category: 'CABIN ARCHITECTURE',
    position: [0.0, 0.58, 0.12],
    nudgeTarget: [0.0, 0.55, 0.22],
    specs: [
      'CNC-machined Grade-5 titanium bridge & billet drive selector',
      'Dual 65W cryo-cooled magnetic inductive charging bays',
    ],
  },
  {
    id: 'seats',
    name: 'Zero-G Sculpted Bucket Seats',
    category: 'ERGONOMICS',
    position: [0.38, 0.82, -0.18],
    nudgeTarget: [0.42, 0.8, -0.22],
    specs: [
      'Full-grain sustainable Nappa leather (0.6 roughness) & Alcantara',
      '18-way active pneumatic lateral bolsters with tri-zone climate',
    ],
  },
  {
    id: 'ambient-strips',
    name: 'Photonic Ambient Waveguide',
    category: 'ILLUMINATION',
    position: [0.58, 0.88, 0.42],
    nudgeTarget: [0.65, 0.88, 0.45],
    specs: [
      '64-channel micro-optic laser waveguide synced to page accent',
      'Dynamic G-load and proximity telemetry pulse modulation',
    ],
  },
  {
    id: 'door-panel',
    name: 'Acoustic Carbon Door Card',
    category: 'ENCLOSURE',
    position: [-0.74, 0.74, 0.08],
    nudgeTarget: [-0.85, 0.74, 0.08],
    specs: [
      'Exposed twill carbon fiber & brushed anodized aluminum trim',
      'Integrated 24-speaker spatial array & e-latch release',
    ],
  },
];

export interface CarModelConfig {
  id: string;
  name: string;
  code: string;
  tagline: string;
  subtitle: string;
  modelPath: string;
  interiorModelPath: string;
  defaultColor: string;
  accentColor: string;
  stats: {
    zeroToHundred: number;
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
 * 5 Signature VANTA Color Swatches
 */
export const VANTA_COLOR_SWATCHES: CarColorSwatch[] = [
  {
    id: 'obsidian-cyan',
    name: 'Obsidian Pulse',
    hex: '#0b101b',
    accentHex: '#00f0ff',
    roughness: 0.25,
    metalness: 0.9,
  },
  {
    id: 'cryo-silver',
    name: 'Cryo Titanium',
    hex: '#b8c4d4',
    accentHex: '#38bdf8',
    roughness: 0.22,
    metalness: 0.92,
  },
  {
    id: 'ion-cobalt',
    name: 'Ion Cobalt',
    hex: '#0a2351',
    accentHex: '#00e5ff',
    roughness: 0.25,
    metalness: 0.9,
  },
  {
    id: 'plasma-crimson',
    name: 'Plasma Crimson',
    hex: '#5a0818',
    accentHex: '#ff2a5f',
    roughness: 0.24,
    metalness: 0.9,
  },
  {
    id: 'stealth-graphite',
    name: 'Vanta Matte',
    hex: '#121318',
    accentHex: '#22d3ee',
    roughness: 0.34,
    metalness: 0.85,
  },
];

const BASE_SCROLL_WAYPOINTS: CarModelConfig['cameras']['scrollWaypoints'] = {
  designFront: {
    position: [-2.6, 0.95, 3.6],
    target: [0, 0.55, 0.6],
    fov: 38,
  },
  designSide: {
    position: [4.8, 1.15, 0.2],
    target: [0, 0.6, 0],
    fov: 40,
  },
  performance: {
    position: [3.2, 0.75, -4.2],
    target: [0, 0.55, 0],
    fov: 45,
  },
  colors: {
    position: [-3.8, 1.85, 3.8],
    target: [0, 0.55, 0],
    fov: 42,
  },
  specs: {
    position: [0.0, 5.4, 0.01],
    target: [0, 0.4, 0],
    fov: 40,
  },
  cta: {
    position: [3.6, 1.25, 4.4],
    target: [0, 0.55, 0],
    fov: 42,
  },
};

export const CAR_LINEUP: CarModelConfig[] = [
  {
    id: 'vanta-x1',
    name: 'VANTA X1',
    code: 'VX-01 // APEX COUPE',
    tagline: 'SILENCE ARMED WITH 1,020 HORSEPOWER.',
    subtitle: 'Tri-Motor Quantum Solid-State Hypercar',
    modelPath: '/models/exterior.glb',
    interiorModelPath: '/models/interior.glb',
    defaultColor: '#0b101b',
    accentColor: '#00f0ff',
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
        openRotation: [0.28, 0.85, -0.52],
        closedRotation: [0, 0, 0],
      },
      right: {
        nodeName: 'door_right_pivot',
        pivotPosition: [0.96, 0.68, 0.48],
        openRotation: [0.28, -0.85, 0.52],
        closedRotation: [0, 0, 0],
      },
    },
    hotspotPosition: [0, 0.96, 0.12],
    cameras: {
      exterior: {
        position: [3.85, 1.42, 4.25],
        target: [0, 0.56, 0],
        fov: 45,
      },
      doorsOpen: {
        position: [3.15, 1.48, 3.45],
        target: [0, 0.66, 0.06],
        fov: 45,
      },
      driverSeat: {
        position: [-0.34, 0.92, -0.05],
        target: [-0.34, 0.86, 1.2],
        fov: 70,
      },
      rearSeat: {
        position: [0.0, 0.98, -0.78],
        target: [0.0, 0.84, 1.1],
        fov: 70,
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
    modelPath: '/models/exterior.glb',
    interiorModelPath: '/models/interior.glb',
    defaultColor: '#0a2351',
    accentColor: '#00e5ff',
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
        openRotation: [0.65, 0.35, -0.35],
        closedRotation: [0, 0, 0],
      },
      right: {
        nodeName: 'door_right_pivot',
        pivotPosition: [1.01, 0.65, 0.5],
        openRotation: [0.65, -0.35, 0.35],
        closedRotation: [0, 0, 0],
      },
    },
    hotspotPosition: [0, 0.92, 0.12],
    cameras: {
      exterior: {
        position: [3.95, 1.36, 4.15],
        target: [0, 0.54, 0],
        fov: 45,
      },
      doorsOpen: {
        position: [3.25, 1.45, 3.35],
        target: [0, 0.64, 0.06],
        fov: 45,
      },
      driverSeat: {
        position: [-0.34, 0.92, -0.05],
        target: [-0.34, 0.86, 1.2],
        fov: 70,
      },
      rearSeat: {
        position: [0.0, 0.98, -0.78],
        target: [0.0, 0.84, 1.1],
        fov: 70,
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
    modelPath: '/models/exterior.glb',
    interiorModelPath: '/models/interior.glb',
    defaultColor: '#b8c4d4',
    accentColor: '#38bdf8',
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
    hotspotPosition: [0, 0.96, 0.12],
    cameras: {
      exterior: {
        position: [3.9, 1.48, 4.3],
        target: [0, 0.58, 0],
        fov: 45,
      },
      doorsOpen: {
        position: [3.2, 1.54, 3.5],
        target: [0, 0.68, 0.06],
        fov: 45,
      },
      driverSeat: {
        position: [-0.34, 0.92, -0.05],
        target: [-0.34, 0.86, 1.2],
        fov: 70,
      },
      rearSeat: {
        position: [0.0, 0.98, -0.78],
        target: [0.0, 0.84, 1.1],
        fov: 70,
      },
      scrollWaypoints: BASE_SCROLL_WAYPOINTS,
    },
  },
];
