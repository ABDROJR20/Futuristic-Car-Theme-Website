'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { CAR_LINEUP, VANTA_COLOR_SWATCHES } from '@/lib/carConfig';
import { useVantaStore } from '@/store/useVantaStore';

interface PartTransformRecord {
  name: string;
  group: THREE.Group;
  assembledPos: THREE.Vector3;
  assembledRot: THREE.Euler;
  explodedPos: THREE.Vector3;
  explodedRot: THREE.Euler;
  category: 'chassis' | 'interior' | 'wheel' | 'body' | 'aero' | 'door' | 'glass' | 'light';
}

/**
 * Deterministic pseudo-random generator per part index so exploded transforms
 * feel radial, cinematic, and repeatable across re-renders.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export default function ProceduralCar() {
  const rootGroupRef = useRef<THREE.Group>(null);
  const partsRegistryRef = useRef<Map<string, PartTransformRecord>>(new Map());
  const leftDoorPivotRef = useRef<THREE.Group>(null);
  const rightDoorPivotRef = useRef<THREE.Group>(null);
  const sweepLightRef = useRef<THREE.PointLight>(null);
  const sweepBeamMeshRef = useRef<THREE.Mesh>(null);
  const wheelSpinRefs = useRef<THREE.Group[]>([]);

  const heroState = useVantaStore((s) => s.heroState);
  const activeCar = useVantaStore((s) => s.activeCar);
  const activeColor = useVantaStore((s) => s.activeColor);
  const accentColor = useVantaStore((s) => s.accentColor);
  const preloaderDone = useVantaStore((s) => s.preloaderDone);
  const assemblyKey = useVantaStore((s) => s.assemblyKey);
  const isReducedMotion = useVantaStore((s) => s.isReducedMotion);
  const isMobile = useVantaStore((s) => s.isMobile);
  const setHeroState = useVantaStore((s) => s.setHeroState);

  const carConfig = CAR_LINEUP[activeCar] ?? CAR_LINEUP[0];
  const { dimensions } = carConfig;

  // Shared PBR Materials
  const materials = useMemo(() => {
    const swatch =
      VANTA_COLOR_SWATCHES.find((s) => s.hex.toLowerCase() === activeColor.toLowerCase()) ??
      VANTA_COLOR_SWATCHES[0];

    const bodyPaint = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(carConfig.defaultColor),
      metalness: swatch.metalness,
      roughness: swatch.roughness,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 1.0,
      envMapIntensity: 1.6,
    });

    const carbonFiber = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#090b10'),
      metalness: 0.55,
      roughness: 0.35,
      envMapIntensity: 1.1,
    });

    const darkChrome = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e2430'),
      metalness: 0.92,
      roughness: 0.18,
    });

    const glassCanopy = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#050914'),
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.68,
      transparent: true,
      opacity: 0.78,
      ior: 1.5,
      reflectivity: 0.95,
      side: THREE.DoubleSide,
    });

    const interiorLeather = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0c0f17'),
      metalness: 0.15,
      roughness: 0.65,
    });

    const interiorAlcantara = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#141926'),
      metalness: 0.1,
      roughness: 0.8,
    });

    const tireRubber = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#08090c'),
      metalness: 0.1,
      roughness: 0.82,
    });

    const cyanEmissive = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#00f0ff'),
      emissive: new THREE.Color('#00f0ff'),
      emissiveIntensity: 3.2,
      toneMapped: false,
    });

    const tailLightEmissive = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ff1744'),
      emissive: new THREE.Color('#ff1744'),
      emissiveIntensity: 3.5,
      toneMapped: false,
    });

    const headlightEmissive = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e0f7ff'),
      emissive: new THREE.Color('#7dd3fc'),
      emissiveIntensity: 3.8,
      toneMapped: false,
    });

    return {
      bodyPaint,
      carbonFiber,
      darkChrome,
      glassCanopy,
      interiorLeather,
      interiorAlcantara,
      tireRubber,
      cyanEmissive,
      tailLightEmissive,
      headlightEmissive,
    };
  }, [carConfig.defaultColor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smoothly tween car body paint & accent emissive when activeColor changes
  useEffect(() => {
    const targetColor = new THREE.Color(activeColor);
    const targetAccent = new THREE.Color(accentColor);
    const swatch = VANTA_COLOR_SWATCHES.find(
      (s) => s.hex.toLowerCase() === activeColor.toLowerCase()
    );

    gsap.to(materials.bodyPaint.color, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration: isReducedMotion ? 0 : 0.85,
      ease: 'power2.out',
    });

    if (swatch) {
      gsap.to(materials.bodyPaint, {
        roughness: swatch.roughness,
        metalness: swatch.metalness,
        duration: isReducedMotion ? 0 : 0.85,
      });
    }

    gsap.to(materials.cyanEmissive.color, {
      r: targetAccent.r,
      g: targetAccent.g,
      b: targetAccent.b,
      duration: 0.6,
    });
    gsap.to(materials.cyanEmissive.emissive, {
      r: targetAccent.r,
      g: targetAccent.g,
      b: targetAccent.b,
      duration: 0.6,
    });
  }, [activeColor, accentColor, isReducedMotion, materials]);

  // Dispose materials on unmount
  useEffect(() => {
    return () => {
      Object.values(materials).forEach((mat) => mat.dispose());
    };
  }, [materials]);

  /**
   * Callback ref factory to register each modular car part with its assembled & exploded transforms
   */
  const registerPart =
    (
      name: string,
      assembledPos: [number, number, number],
      assembledRot: [number, number, number],
      explosionVector: [number, number, number],
      category: PartTransformRecord['category'],
      seed: number
    ) =>
    (node: THREE.Group | null) => {
      if (!node) {
        partsRegistryRef.current.delete(name);
        return;
      }

      const existing = partsRegistryRef.current.get(name);
      if (existing && existing.group === node) return;

      const rx = (seededRandom(seed + 1) - 0.5) * 1.4;
      const ry = (seededRandom(seed + 2) - 0.5) * 1.4;
      const rz = (seededRandom(seed + 3) - 0.5) * 1.4;

      const spreadFactor = isMobile ? 0.68 : 1.0;

      const record: PartTransformRecord = {
        name,
        group: node,
        assembledPos: new THREE.Vector3(...assembledPos),
        assembledRot: new THREE.Euler(...assembledRot),
        explodedPos: new THREE.Vector3(
          assembledPos[0] + explosionVector[0] * spreadFactor,
          assembledPos[1] + explosionVector[1] * spreadFactor,
          assembledPos[2] + explosionVector[2] * spreadFactor
        ),
        explodedRot: new THREE.Euler(
          assembledRot[0] + rx,
          assembledRot[1] + ry,
          assembledRot[2] + rz
        ),
        category,
      };

      partsRegistryRef.current.set(name, record);
    };

  /**
   * PHASE 1 CORE: Staggered GSAP Assembly Intro Animation + Light Sweep
   */
  useEffect(() => {
    const records = Array.from(partsRegistryRef.current.values());
    if (records.length === 0) return;

    // Kill any active tweens on part transforms
    records.forEach((rec) => {
      gsap.killTweensOf(rec.group.position);
      gsap.killTweensOf(rec.group.rotation);
      gsap.killTweensOf(rec.group.scale);
    });

    // Reset doors to closed on assembly
    if (leftDoorPivotRef.current && rightDoorPivotRef.current) {
      gsap.killTweensOf([leftDoorPivotRef.current.rotation, rightDoorPivotRef.current.rotation]);
      leftDoorPivotRef.current.rotation.set(0, 0, 0);
      rightDoorPivotRef.current.rotation.set(0, 0, 0);
    }

    // Respect prefers-reduced-motion: snap directly to assembled state
    if (isReducedMotion) {
      records.forEach((rec) => {
        rec.group.position.copy(rec.assembledPos);
        rec.group.rotation.copy(rec.assembledRot);
        rec.group.scale.set(1, 1, 1);
      });
      if (preloaderDone && heroState === 'assembling') {
        setHeroState('idle');
      }
      return;
    }

    // While preloader is still active, hold all parts in their scattered/exploded state
    if (!preloaderDone) {
      records.forEach((rec) => {
        rec.group.position.copy(rec.explodedPos);
        rec.group.rotation.copy(rec.explodedRot);
        rec.group.scale.set(0.75, 0.75, 0.75);
      });
      return;
    }

    // Order parts from core chassis -> interior -> wheels -> body panels -> doors -> glass/lights
    const categoryOrder: Record<PartTransformRecord['category'], number> = {
      chassis: 0,
      interior: 1,
      wheel: 2,
      body: 3,
      door: 4,
      aero: 5,
      glass: 6,
      light: 7,
    };

    const sortedRecords = [...records].sort(
      (a, b) => categoryOrder[a.category] - categoryOrder[b.category]
    );

    // Place all parts at their exploded starting coordinates
    sortedRecords.forEach((rec) => {
      rec.group.position.copy(rec.explodedPos);
      rec.group.rotation.copy(rec.explodedRot);
      rec.group.scale.set(0.82, 0.82, 0.82);
    });

    const tl = gsap.timeline({
      onComplete: () => {
        setHeroState('idle');
      },
    });

    sortedRecords.forEach((rec, idx) => {
      const delay = idx * 0.042;

      tl.to(
        rec.group.position,
        {
          x: rec.assembledPos.x,
          y: rec.assembledPos.y,
          z: rec.assembledPos.z,
          duration: 1.35,
          ease: 'power3.out',
        },
        delay
      );

      tl.to(
        rec.group.rotation,
        {
          x: rec.assembledRot.x,
          y: rec.assembledRot.y,
          z: rec.assembledRot.z,
          duration: 1.45,
          ease: 'power3.out',
        },
        delay
      );

      tl.to(
        rec.group.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 1.1,
          ease: 'back.out(1.3)',
        },
        delay
      );
    });

    // Final signature light sweep across the assembled hypercar body
    if (sweepLightRef.current && sweepBeamMeshRef.current) {
      const light = sweepLightRef.current;
      const beam = sweepBeamMeshRef.current;
      const sweepStart = sortedRecords.length * 0.042 + 0.55;

      tl.set(light, { intensity: 0 }, 0);
      tl.set(light.position, { x: 0, y: 1.35, z: -3.2 }, sweepStart);
      tl.set(beam.position, { x: 0, y: 0.72, z: -3.2 }, sweepStart);
      tl.set(beam.scale, { x: 1, y: 1, z: 1 }, sweepStart);

      tl.to(
        light,
        {
          intensity: 18,
          duration: 0.2,
          ease: 'power2.out',
        },
        sweepStart
      );

      tl.to(
        [light.position, beam.position],
        {
          z: 3.2,
          duration: 0.85,
          ease: 'power2.inOut',
        },
        sweepStart
      );

      tl.to(
        light,
        {
          intensity: 0,
          duration: 0.3,
          ease: 'power2.in',
        },
        sweepStart + 0.65
      );

      tl.to(
        beam.scale,
        {
          x: 0.001,
          y: 0.001,
          z: 0.001,
          duration: 0.25,
        },
        sweepStart + 0.7
      );
    }

    return () => {
      tl.kill();
    };
  }, [preloaderDone, assemblyKey, activeCar, isReducedMotion, isMobile, setHeroState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Door open/close animation based on heroState ('doorsOpen' or 'interior')
  useEffect(() => {
    const leftDoor = leftDoorPivotRef.current;
    const rightDoor = rightDoorPivotRef.current;
    if (!leftDoor || !rightDoor) return;

    const shouldBeOpen = heroState === 'doorsOpen' || heroState === 'interior';
    const leftTarget = shouldBeOpen
      ? carConfig.doors.left.openRotation
      : carConfig.doors.left.closedRotation;
    const rightTarget = shouldBeOpen
      ? carConfig.doors.right.openRotation
      : carConfig.doors.right.closedRotation;

    gsap.killTweensOf([leftDoor.rotation, rightDoor.rotation]);

    const dur = isReducedMotion ? 0 : 0.82;

    gsap.to(leftDoor.rotation, {
      x: leftTarget[0],
      y: leftTarget[1],
      z: leftTarget[2],
      duration: dur,
      ease: 'power2.inOut',
    });

    gsap.to(rightDoor.rotation, {
      x: rightTarget[0],
      y: rightTarget[1],
      z: rightTarget[2],
      duration: dur,
      ease: 'power2.inOut',
    });
  }, [heroState, carConfig, isReducedMotion]);

  // Subtle wheel rotation & underglow pulse on frame
  useFrame((_, delta) => {
    if (heroState === 'idle' || heroState === 'doorsOpen') {
      wheelSpinRefs.current.forEach((wheelGroup) => {
        if (wheelGroup) {
          wheelGroup.rotation.x += delta * 0.25;
        }
      });
    }
  });

  /**
   * Reusable futuristic turbine wheel builder
   */
  const renderWheelUnit = (
    name: string,
    pos: [number, number, number],
    explodeVec: [number, number, number],
    isLeft: boolean,
    idx: number
  ) => (
    <group
      key={name}
      name={name}
      ref={registerPart(name, pos, [0, 0, 0], explodeVec, 'wheel', 100 + idx * 10)}
    >
      <group
        ref={(el) => {
          if (el) wheelSpinRefs.current[idx] = el;
        }}
      >
        {/* Outer Tire */}
        <mesh rotation={[0, 0, Math.PI / 2]} material={materials.tireRubber} castShadow receiveShadow>
          <cylinderGeometry args={[0.37, 0.37, 0.28, 36]} />
        </mesh>

        {/* Metallic Rim Barrel */}
        <mesh rotation={[0, 0, Math.PI / 2]} material={materials.darkChrome}>
          <cylinderGeometry args={[0.26, 0.26, 0.29, 24]} />
        </mesh>

        {/* Glowing Cyan Rim Ring */}
        <mesh
          position={[isLeft ? -0.146 : 0.146, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          material={materials.cyanEmissive}
        >
          <ringGeometry args={[0.23, 0.255, 32]} />
        </mesh>

        {/* 6 Aero Turbine Spokes */}
        {[0, 1, 2, 3, 4, 5].map((spokeIdx) => (
          <mesh
            key={spokeIdx}
            position={[isLeft ? -0.14 : 0.14, 0, 0]}
            rotation={[(spokeIdx * Math.PI) / 3, 0, 0]}
            material={materials.darkChrome}
          >
            <boxGeometry args={[0.02, 0.48, 0.045]} />
          </mesh>
        ))}

        {/* Center Lock Cap */}
        <mesh
          position={[isLeft ? -0.15 : 0.15, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          material={materials.cyanEmissive}
        >
          <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        </mesh>
      </group>

      {/* Stationary Carbon Ceramic Brake Disc & Cyan Caliper */}
      <mesh
        position={[isLeft ? -0.06 : 0.06, 0.06, -0.12]}
        material={materials.cyanEmissive}
      >
        <boxGeometry args={[0.06, 0.16, 0.11]} />
      </mesh>
    </group>
  );

  /**
   * Reusable futuristic bucket seat builder (4 seats inside cabin)
   */
  const renderBucketSeat = (
    name: string,
    pos: [number, number, number],
    explodeVec: [number, number, number],
    scale = 1,
    seed = 1
  ) => (
    <group
      key={name}
      name={name}
      ref={registerPart(name, pos, [0, 0, 0], explodeVec, 'interior', seed)}
      scale={[scale, scale, scale]}
    >
      {/* Seat Base Cushion */}
      <mesh position={[0, 0, 0]} material={materials.interiorLeather} castShadow>
        <boxGeometry args={[0.42, 0.08, 0.46]} />
      </mesh>
      {/* Side Bolsters */}
      <mesh position={[-0.19, 0.05, 0]} material={materials.interiorAlcantara}>
        <boxGeometry args={[0.06, 0.12, 0.44]} />
      </mesh>
      <mesh position={[0.19, 0.05, 0]} material={materials.interiorAlcantara}>
        <boxGeometry args={[0.06, 0.12, 0.44]} />
      </mesh>
      {/* Sculpted Backrest */}
      <mesh
        position={[0, 0.32, -0.18]}
        rotation={[-0.22, 0, 0]}
        material={materials.interiorLeather}
        castShadow
      >
        <boxGeometry args={[0.4, 0.58, 0.08]} />
      </mesh>
      {/* Integrated Headrest + Cyan Harness Accent */}
      <mesh
        position={[0, 0.64, -0.25]}
        rotation={[-0.15, 0, 0]}
        material={materials.interiorAlcantara}
      >
        <boxGeometry args={[0.24, 0.18, 0.07]} />
      </mesh>
      <mesh
        position={[0, 0.48, -0.14]}
        rotation={[-0.22, 0, 0]}
        material={materials.cyanEmissive}
      >
        <boxGeometry args={[0.22, 0.018, 0.02]} />
      </mesh>
    </group>
  );

  return (
    <group
      ref={rootGroupRef}
      position={[0, dimensions.rideHeight, 0]}
      scale={[dimensions.widthScale, dimensions.heightScale, dimensions.lengthScale]}
    >
      {/* ================================================================= */}
      {/* 1. CORE CARBON MONOCOQUE CHASSIS & FLOORPAN                       */}
      {/* ================================================================= */}
      <group
        name="chassis_base"
        ref={registerPart('chassis_base', [0, 0.22, 0], [0, 0, 0], [0, -2.4, 0], 'chassis', 1)}
      >
        {/* Main Underbody Floorpan */}
        <mesh material={materials.carbonFiber} castShadow receiveShadow>
          <boxGeometry args={[1.82, 0.1, 4.35]} />
        </mesh>
        {/* Center Spine Tunnel */}
        <mesh position={[0, 0.14, -0.05]} material={materials.interiorAlcantara}>
          <boxGeometry args={[0.24, 0.22, 2.3]} />
        </mesh>
        {/* Center Console Cyan Trim Line */}
        <mesh position={[0, 0.255, 0.05]} material={materials.cyanEmissive}>
          <boxGeometry args={[0.04, 0.012, 1.85]} />
        </mesh>
        {/* Rear Bulkhead / Power Core Housing */}
        <mesh position={[0, 0.34, -1.45]} material={materials.carbonFiber}>
          <boxGeometry args={[1.45, 0.46, 0.9]} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 2. INTERIOR CABIN: DASHBOARD, STEERING YOKE & 4 BUCKET SEATS      */}
      {/* ================================================================= */}
      <group
        name="interior_dashboard"
        ref={registerPart(
          'interior_dashboard',
          [0, 0.62, 0.68],
          [0, 0, 0],
          [0, 2.2, 1.5],
          'interior',
          12
        )}
      >
        {/* Sculpted Dash Wing */}
        <mesh material={materials.interiorLeather} castShadow>
          <boxGeometry args={[1.56, 0.2, 0.48]} />
        </mesh>
        {/* Holographic Panoramic OLED Screen */}
        <mesh position={[0, 0.14, -0.08]} rotation={[-0.25, 0, 0]} material={materials.darkChrome}>
          <boxGeometry args={[1.32, 0.16, 0.03]} />
        </mesh>
        <mesh
          position={[0, 0.14, -0.098]}
          rotation={[-0.25, 0, 0]}
          material={materials.cyanEmissive}
        >
          <boxGeometry args={[1.26, 0.025, 0.01]} />
        </mesh>
        {/* Driver Digital Cluster Hood */}
        <mesh
          position={[-0.36, 0.16, -0.1]}
          rotation={[-0.2, 0, 0]}
          material={materials.cyanEmissive}
        >
          <boxGeometry args={[0.32, 0.11, 0.015]} />
        </mesh>
        {/* Futuristic Hyperspace Steering Yoke (Left-Hand Drive) */}
        <group position={[-0.36, 0.07, -0.26]} rotation={[0.28, 0, 0]}>
          {/* Steering Column */}
          <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} material={materials.darkChrome}>
            <cylinderGeometry args={[0.035, 0.04, 0.24, 16]} />
          </mesh>
          {/* Yoke Grips & Center Hub */}
          <mesh material={materials.carbonFiber}>
            <boxGeometry args={[0.32, 0.05, 0.035]} />
          </mesh>
          <mesh position={[-0.14, 0.02, 0]} material={materials.interiorAlcantara}>
            <boxGeometry args={[0.04, 0.15, 0.04]} />
          </mesh>
          <mesh position={[0.14, 0.02, 0]} material={materials.interiorAlcantara}>
            <boxGeometry args={[0.04, 0.15, 0.04]} />
          </mesh>
          <mesh position={[0, 0.03, -0.02]} material={materials.cyanEmissive}>
            <boxGeometry args={[0.1, 0.015, 0.01]} />
          </mesh>
        </group>
      </group>

      {/* 4 Sculpted Cabin Seats (2 Front + 2 Rear) */}
      {renderBucketSeat('seat_fl', [-0.36, 0.32, 0.02], [-2.2, 2.0, 0.4], 1.0, 21)}
      {renderBucketSeat('seat_fr', [0.36, 0.32, 0.02], [2.2, 2.0, 0.4], 1.0, 22)}
      {renderBucketSeat('seat_rl', [-0.34, 0.36, -0.74], [-2.0, 2.4, -1.2], 0.9, 23)}
      {renderBucketSeat('seat_rr', [0.34, 0.36, -0.74], [2.0, 2.4, -1.2], 0.9, 24)}

      {/* ================================================================= */}
      {/* 3. SCULPTED HYPERCAR BODY PANELS                                  */}
      {/* ================================================================= */}
      {/* Main Lower Monocoque Waistline */}
      <group
        name="body_main"
        ref={registerPart('body_main', [0, 0.45, 0], [0, 0, 0], [0, 2.6, 0], 'body', 30)}
      >
        {/* Rear Haunches & Mid-body */}
        <mesh position={[0, 0.06, -0.85]} material={materials.bodyPaint} castShadow receiveShadow>
          <boxGeometry args={[1.94, 0.34, 2.15]} />
        </mesh>
        {/* Front Nose Cone Core */}
        <mesh
          position={[0, -0.02, 1.55]}
          rotation={[0.11, 0, 0]}
          material={materials.bodyPaint}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1.82, 0.28, 1.45]} />
        </mesh>
      </group>

      {/* Sculpted Front Frunk / Aero Hood */}
      <group
        name="hood_front"
        ref={registerPart('hood_front', [0, 0.58, 1.48], [0.14, 0, 0], [0, 2.8, 3.4], 'body', 31)}
      >
        <mesh material={materials.bodyPaint} castShadow receiveShadow>
          <boxGeometry args={[1.42, 0.08, 1.38]} />
        </mesh>
        {/* Central Aero NACA Duct */}
        <mesh position={[0, 0.042, 0.05]} material={materials.carbonFiber}>
          <boxGeometry args={[0.46, 0.02, 0.75]} />
        </mesh>
      </group>

      {/* 4 Sculpted Muscular Wheel Arches / Fenders */}
      <group
        name="fender_fl"
        ref={registerPart(
          'fender_fl',
          [-0.86, 0.54, 1.36],
          [0, 0, 0],
          [-3.2, 1.6, 2.5],
          'body',
          32
        )}
      >
        <mesh material={materials.bodyPaint} castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.34, 1.18]} />
        </mesh>
        <mesh position={[0.02, 0.18, -0.04]} rotation={[0.08, 0, -0.15]} material={materials.bodyPaint}>
          <boxGeometry args={[0.32, 0.08, 1.06]} />
        </mesh>
      </group>

      <group
        name="fender_fr"
        ref={registerPart(
          'fender_fr',
          [0.86, 0.54, 1.36],
          [0, 0, 0],
          [3.2, 1.6, 2.5],
          'body',
          33
        )}
      >
        <mesh material={materials.bodyPaint} castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.34, 1.18]} />
        </mesh>
        <mesh position={[-0.02, 0.18, -0.04]} rotation={[0.08, 0, 0.15]} material={materials.bodyPaint}>
          <boxGeometry args={[0.32, 0.08, 1.06]} />
        </mesh>
      </group>

      <group
        name="fender_rl"
        ref={registerPart(
          'fender_rl',
          [-0.9, 0.58, -1.35],
          [0, 0, 0],
          [-3.4, 1.8, -2.5],
          'body',
          34
        )}
      >
        <mesh material={materials.bodyPaint} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.4, 1.36]} />
        </mesh>
        <mesh position={[0.04, 0.22, 0]} rotation={[-0.06, 0, -0.18]} material={materials.bodyPaint}>
          <boxGeometry args={[0.34, 0.1, 1.24]} />
        </mesh>
      </group>

      <group
        name="fender_rr"
        ref={registerPart(
          'fender_rr',
          [0.9, 0.58, -1.35],
          [0, 0, 0],
          [3.4, 1.8, -2.5],
          'body',
          35
        )}
      >
        <mesh material={materials.bodyPaint} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.4, 1.36]} />
        </mesh>
        <mesh position={[-0.04, 0.22, 0]} rotation={[-0.06, 0, 0.18]} material={materials.bodyPaint}>
          <boxGeometry args={[0.34, 0.1, 1.24]} />
        </mesh>
      </group>

      {/* Rear Fastback Deck & Louvers */}
      <group
        name="rear_deck"
        ref={registerPart(
          'rear_deck',
          [0, 0.88, -1.42],
          [-0.22, 0, 0],
          [0, 3.2, -3.0],
          'body',
          36
        )}
      >
        <mesh material={materials.bodyPaint} castShadow receiveShadow>
          <boxGeometry args={[1.38, 0.08, 1.4]} />
        </mesh>
        {/* Central Spine Fin */}
        <mesh position={[0, 0.11, -0.05]} material={materials.carbonFiber}>
          <boxGeometry args={[0.04, 0.16, 1.1]} />
        </mesh>
        <mesh position={[0, 0.19, -0.05]} material={materials.cyanEmissive}>
          <boxGeometry args={[0.015, 0.015, 1.08]} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 4. ROOF CANOPY & PANORAMIC WINDSHIELD GLASS                       */}
      {/* ================================================================= */}
      <group
        name="roof_canopy"
        ref={registerPart('roof_canopy', [0, 1.12, -0.25], [0, 0, 0], [0, 3.8, -0.4], 'glass', 40)}
      >
        {/* Roof Spine Frame */}
        <mesh material={materials.bodyPaint} castShadow>
          <boxGeometry args={[1.18, 0.05, 1.25]} />
        </mesh>
        {/* Tinted Glass Roof Insert */}
        <mesh position={[0, 0.01, 0]} material={materials.glassCanopy}>
          <boxGeometry args={[0.98, 0.04, 1.12]} />
        </mesh>
      </group>

      {/* Swept Panoramic Windshield */}
      <group
        name="glass_windshield"
        ref={registerPart(
          'glass_windshield',
          [0, 0.88, 0.72],
          [-0.92, 0, 0],
          [0, 3.5, 2.6],
          'glass',
          41
        )}
      >
        <mesh material={materials.glassCanopy}>
          <boxGeometry args={[1.34, 0.035, 1.05]} />
        </mesh>
        {/* A-Pillars */}
        <mesh position={[-0.68, 0, 0]} material={materials.carbonFiber}>
          <boxGeometry args={[0.05, 0.05, 1.06]} />
        </mesh>
        <mesh position={[0.68, 0, 0]} material={materials.carbonFiber}>
          <boxGeometry args={[0.05, 0.05, 1.06]} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 5. TWO OPENABLE DOORS WITH HINGE PIVOTS (LEFT & RIGHT)            */}
      {/* ================================================================= */}
      <group
        name="door_left_pivot"
        ref={registerPart(
          'door_left_pivot',
          carConfig.doors.left.pivotPosition,
          [0, 0, 0],
          [-3.8, 1.5, 0.4],
          'door',
          50
        )}
      >
        <group ref={leftDoorPivotRef}>
          {/* Sculpted Outer Door Skin (offset relative to front hinge pivot) */}
          <mesh
            position={[0.02, -0.14, -0.62]}
            material={materials.bodyPaint}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.11, 0.42, 1.26]} />
          </mesh>
          {/* Side Aero Blade Accent */}
          <mesh position={[-0.045, -0.16, -0.62]} material={materials.carbonFiber}>
            <boxGeometry args={[0.03, 0.14, 1.12]} />
          </mesh>
          {/* Glowing Cyan Door Sill Strip */}
          <mesh position={[-0.05, -0.32, -0.62]} material={materials.cyanEmissive}>
            <boxGeometry args={[0.015, 0.015, 1.05]} />
          </mesh>
          {/* Frameless Side Window Glass */}
          <mesh
            position={[0.08, 0.18, -0.64]}
            rotation={[0, 0, -0.28]}
            material={materials.glassCanopy}
          >
            <boxGeometry args={[0.025, 0.32, 1.1]} />
          </mesh>
          {/* Interior Door Card Trim */}
          <mesh position={[0.075, -0.14, -0.62]} material={materials.interiorAlcantara}>
            <boxGeometry args={[0.04, 0.36, 1.16]} />
          </mesh>
        </group>
      </group>

      <group
        name="door_right_pivot"
        ref={registerPart(
          'door_right_pivot',
          carConfig.doors.right.pivotPosition,
          [0, 0, 0],
          [3.8, 1.5, 0.4],
          'door',
          51
        )}
      >
        <group ref={rightDoorPivotRef}>
          {/* Sculpted Outer Door Skin */}
          <mesh
            position={[-0.02, -0.14, -0.62]}
            material={materials.bodyPaint}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.11, 0.42, 1.26]} />
          </mesh>
          {/* Side Aero Blade Accent */}
          <mesh position={[0.045, -0.16, -0.62]} material={materials.carbonFiber}>
            <boxGeometry args={[0.03, 0.14, 1.12]} />
          </mesh>
          {/* Glowing Cyan Door Sill Strip */}
          <mesh position={[0.05, -0.32, -0.62]} material={materials.cyanEmissive}>
            <boxGeometry args={[0.015, 0.015, 1.05]} />
          </mesh>
          {/* Frameless Side Window Glass */}
          <mesh
            position={[-0.08, 0.18, -0.64]}
            rotation={[0, 0, 0.28]}
            material={materials.glassCanopy}
          >
            <boxGeometry args={[0.025, 0.32, 1.1]} />
          </mesh>
          {/* Interior Door Card Trim */}
          <mesh position={[-0.075, -0.14, -0.62]} material={materials.interiorAlcantara}>
            <boxGeometry args={[0.04, 0.36, 1.16]} />
          </mesh>
        </group>
      </group>

      {/* ================================================================= */}
      {/* 6. AERO SPLITTERS, SIDE SKIRTS, DIFFUSER & ACTIVE REAR WING       */}
      {/* ================================================================= */}
      <group
        name="splitter_front"
        ref={registerPart(
          'splitter_front',
          [0, 0.22, 2.26],
          [0, 0, 0],
          [0, -1.6, 3.8],
          'aero',
          60
        )}
      >
        <mesh material={materials.carbonFiber} castShadow>
          <boxGeometry args={[1.96, 0.045, 0.38]} />
        </mesh>
        <mesh position={[0, -0.02, 0.18]} material={materials.cyanEmissive}>
          <boxGeometry args={[1.88, 0.012, 0.02]} />
        </mesh>
      </group>

      <group
        name="diffuser_rear"
        ref={registerPart(
          'diffuser_rear',
          [0, 0.26, -2.22],
          [0, 0, 0],
          [0, -1.6, -3.8],
          'aero',
          61
        )}
      >
        <mesh material={materials.carbonFiber} castShadow>
          <boxGeometry args={[1.92, 0.18, 0.34]} />
        </mesh>
        {/* 5 Vertical Aero Diffuser Strakes */}
        {[-0.64, -0.32, 0, 0.32, 0.64].map((xOffset, i) => (
          <mesh key={i} position={[xOffset, -0.02, -0.05]} material={materials.carbonFiber}>
            <boxGeometry args={[0.025, 0.22, 0.38]} />
          </mesh>
        ))}
      </group>

      <group
        name="aero_wing"
        ref={registerPart(
          'aero_wing',
          [0, 0.86 + dimensions.wingHeight, -2.12],
          [0.08, 0, 0],
          [0, 3.4, -3.8],
          'aero',
          62
        )}
      >
        {/* Swan-Neck Wing Pylons */}
        <mesh position={[-0.42, -0.12, 0.06]} material={materials.carbonFiber}>
          <boxGeometry args={[0.035, 0.26, 0.18]} />
        </mesh>
        <mesh position={[0.42, -0.12, 0.06]} material={materials.carbonFiber}>
          <boxGeometry args={[0.035, 0.26, 0.18]} />
        </mesh>
        {/* Main Carbon Airfoil Blade */}
        <mesh material={materials.carbonFiber} castShadow>
          <boxGeometry args={[1.86, 0.04, 0.28]} />
        </mesh>
        {/* Wing Endplates with Cyan Tips */}
        <mesh position={[-0.93, -0.02, 0]} material={materials.bodyPaint}>
          <boxGeometry args={[0.03, 0.18, 0.36]} />
        </mesh>
        <mesh position={[0.93, -0.02, 0]} material={materials.bodyPaint}>
          <boxGeometry args={[0.03, 0.18, 0.36]} />
        </mesh>
        <mesh position={[0, 0.022, -0.13]} material={materials.cyanEmissive}>
          <boxGeometry args={[1.8, 0.01, 0.015]} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 7. SIGNATURE CYBERPUNK LED LIGHTBARS (FRONT & REAR)               */}
      {/* ================================================================= */}
      <group
        name="light_front_bar"
        ref={registerPart(
          'light_front_bar',
          [0, 0.44, 2.27],
          [0, 0, 0],
          [0, 1.2, 4.2],
          'light',
          70
        )}
      >
        {/* Full-Width Horizon DRL Blade */}
        <mesh material={materials.headlightEmissive}>
          <boxGeometry args={[1.76, 0.025, 0.04]} />
        </mesh>
        {/* Dual Angular Fang Accents */}
        <mesh position={[-0.78, -0.05, -0.02]} rotation={[0, 0, 0.45]} material={materials.cyanEmissive}>
          <boxGeometry args={[0.18, 0.02, 0.04]} />
        </mesh>
        <mesh position={[0.78, -0.05, -0.02]} rotation={[0, 0, -0.45]} material={materials.cyanEmissive}>
          <boxGeometry args={[0.18, 0.02, 0.04]} />
        </mesh>
      </group>

      <group
        name="light_rear_bar"
        ref={registerPart(
          'light_rear_bar',
          [0, 0.62, -2.2],
          [0, 0, 0],
          [0, 1.2, -4.2],
          'light',
          71
        )}
      >
        {/* Continuous Plasma Crimson Rear Lightbar */}
        <mesh material={materials.tailLightEmissive}>
          <boxGeometry args={[1.82, 0.032, 0.04]} />
        </mesh>
        <mesh position={[0, -0.045, 0]} material={materials.cyanEmissive}>
          <boxGeometry args={[0.65, 0.012, 0.03]} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 8. FOUR TURBINE WHEELS                                            */}
      {/* ================================================================= */}
      {renderWheelUnit('wheel_fl', [-0.94, 0.37, 1.38], [-3.6, 0.4, 2.4], true, 0)}
      {renderWheelUnit('wheel_fr', [0.94, 0.37, 1.38], [3.6, 0.4, 2.4], false, 1)}
      {renderWheelUnit('wheel_rl', [-0.96, 0.37, -1.36], [-3.6, 0.4, -2.4], true, 2)}
      {renderWheelUnit('wheel_rr', [0.96, 0.37, -1.36], [3.6, 0.4, -2.4], false, 3)}

      {/* ================================================================= */}
      {/* 9. ASSEMBLY COMPLETION LIGHT SWEEP EFFECT                         */}
      {/* ================================================================= */}
      <pointLight
        ref={sweepLightRef}
        color={accentColor}
        intensity={0}
        distance={5.5}
        decay={2}
        position={[0, 1.35, -3.2]}
      />
      <mesh
        ref={sweepBeamMeshRef}
        position={[0, 0.72, -3.2]}
        scale={[0.001, 0.001, 0.001]}
        material={materials.cyanEmissive}
      >
        <boxGeometry args={[2.35, 0.02, 0.06]} />
      </mesh>
    </group>
  );
}

