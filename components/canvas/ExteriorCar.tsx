'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import {
  CAR_LINEUP,
  GLB_MODEL_CONFIG,
  VANTA_COLOR_SWATCHES,
} from '@/lib/carConfig';
import {
  classifyMeshNode,
  inspectAndNormalizeGlb,
} from '@/lib/glbInspector';
import { useVantaStore } from '@/store/useVantaStore';

interface RealMeshPartRecord {
  mesh: THREE.Mesh;
  assembledPos: THREE.Vector3;
  assembledRot: THREE.Euler;
  assembledScale: THREE.Vector3;
  explodedPos: THREE.Vector3;
  explodedRot: THREE.Euler;
  orderIndex: number;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export default function ExteriorCar() {
  const gltf = useGLTF(GLB_MODEL_CONFIG.exteriorModelPath, true);

  const rootGroupRef = useRef<THREE.Group>(null);
  const leftDoorPivotRef = useRef<THREE.Group | null>(null);
  const rightDoorPivotRef = useRef<THREE.Group | null>(null);
  const sweepLightRef = useRef<THREE.PointLight>(null);
  const sweepBeamRef = useRef<THREE.Mesh>(null);
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projVecRef = useRef(new THREE.Vector3());

  const heroState = useVantaStore((s) => s.heroState);
  const activeCar = useVantaStore((s) => s.activeCar);
  const activeColor = useVantaStore((s) => s.activeColor);
  const accentColor = useVantaStore((s) => s.accentColor);
  const preloaderDone = useVantaStore((s) => s.preloaderDone);
  const assemblyKey = useVantaStore((s) => s.assemblyKey);
  const isReducedMotion = useVantaStore((s) => s.isReducedMotion);

  const setHeroState = useVantaStore((s) => s.setHeroState);
  const setCursorLabel = useVantaStore((s) => s.setCursorLabel);
  const setExteriorDoorDiagnostic = useVantaStore((s) => s.setExteriorDoorDiagnostic);

  const carConfig = CAR_LINEUP[activeCar] ?? CAR_LINEUP[0];

  // Premium PBR Materials (Section 2 requirements)
  const premiumMaterials = useMemo(() => {
    const bodyPaint = new THREE.MeshPhysicalMaterial({
      name: 'Vanta_BodyPaint_Physical',
      color: new THREE.Color(carConfig.defaultColor),
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      metalness: 0.9,
      roughness: 0.25,
      envMapIntensity: 1.5,
      reflectivity: 1.0,
    });

    const tintedGlass = new THREE.MeshPhysicalMaterial({
      name: 'Vanta_Glass_Tint',
      color: new THREE.Color('#050811'),
      metalness: 0.1,
      roughness: 0.04,
      transmission: 0.74,
      transparent: true,
      opacity: 0.82,
      ior: 1.52,
      envMapIntensity: 1.6,
      side: THREE.DoubleSide,
    });

    const darkWheelMetal = new THREE.MeshStandardMaterial({
      name: 'Vanta_Wheel_DarkMetal',
      color: new THREE.Color('#141821'),
      metalness: 0.92,
      roughness: 0.18,
      envMapIntensity: 1.4,
    });

    const pulsingLightEmissive = new THREE.MeshStandardMaterial({
      name: 'Vanta_Light_CyanEmissive',
      color: new THREE.Color(carConfig.accentColor),
      emissive: new THREE.Color(carConfig.accentColor),
      emissiveIntensity: 3.4,
      toneMapped: false,
    });

    return {
      bodyPaint,
      tintedGlass,
      darkWheelMetal,
      pulsingLightEmissive,
    };
  }, [carConfig.defaultColor, carConfig.accentColor]);

  // Clone scene, inspect nodes, derive config, upgrade materials, and build door hinge pivots
  const { clonedScene, report, partRecords } = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const inspection = inspectAndNormalizeGlb(
      clone,
      GLB_MODEL_CONFIG.exteriorModelPath,
      GLB_MODEL_CONFIG.targetExteriorLengthMeters
    );

    // Write derived node names into GLB_MODEL_CONFIG (lib/carConfig.ts)
    GLB_MODEL_CONFIG.derivedNodes.body = inspection.bodyNodes;
    GLB_MODEL_CONFIG.derivedNodes.doors.left = inspection.doorLeftNodes;
    GLB_MODEL_CONFIG.derivedNodes.doors.right = inspection.doorRightNodes;
    GLB_MODEL_CONFIG.derivedNodes.doors.hasSeparateDoors = inspection.hasSeparateDoors;
    GLB_MODEL_CONFIG.derivedNodes.wheels = inspection.wheelNodes;
    GLB_MODEL_CONFIG.derivedNodes.glass = inspection.glassNodes;
    GLB_MODEL_CONFIG.derivedNodes.lights = inspection.lightNodes;

    const overallBox = new THREE.Box3().setFromObject(clone);
    const overallCenter = new THREE.Vector3();
    overallBox.getCenter(overallCenter);

    const meshes: THREE.Mesh[] = [];
    const leftDoorMeshes: THREE.Mesh[] = [];
    const rightDoorMeshes: THREE.Mesh[] = [];

    clone.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const meshBox = new THREE.Box3().setFromObject(mesh);
        const meshCenter = new THREE.Vector3();
        meshBox.getCenter(meshCenter);

        const category = classifyMeshNode(mesh, meshCenter, overallCenter);
        const token = `${mesh.name} ${
          Array.isArray(mesh.material)
            ? mesh.material.map((m) => m.name).join(' ')
            : mesh.material?.name || ''
        }`.toLowerCase();

        // Remove any real brand logo decals/emblems if present
        if (/\b(logo|emblem|badge|audi|bmw|mercedes|porsche|bentley|tesla|ferrari)\b/i.test(token)) {
          mesh.visible = false;
        }

        // Apply premium materials per semantic category
        if (category === 'body' || category === 'doorLeft' || category === 'doorRight') {
          mesh.material = premiumMaterials.bodyPaint;
        } else if (category === 'glass' || /glass1|glass2/i.test(token)) {
          mesh.material = premiumMaterials.tintedGlass;
        } else if (category === 'light' || /taillights|glass3/i.test(token)) {
          mesh.material = premiumMaterials.pulsingLightEmissive;
        } else if (category === 'wheel' || /metal2/i.test(token)) {
          if (!/tire|tyre|rubber/i.test(token)) {
            mesh.material = premiumMaterials.darkWheelMetal;
          }
        }

        if (category === 'doorLeft') leftDoorMeshes.push(mesh);
        else if (category === 'doorRight') rightDoorMeshes.push(mesh);

        meshes.push(mesh);
      }
    });

    leftDoorPivotRef.current = null;
    rightDoorPivotRef.current = null;

    const buildDoorHingePivot = (doorMeshes: THREE.Mesh[], isLeft: boolean) => {
      if (doorMeshes.length === 0) return null;
      const unionBox = new THREE.Box3();
      doorMeshes.forEach((m) => unionBox.expandByObject(m));
      const c = new THREE.Vector3();
      unionBox.getCenter(c);

      const pivotWorld = new THREE.Vector3(
        isLeft ? unionBox.min.x : unionBox.max.x,
        c.y,
        unionBox.max.z
      );

      const pivotGroup = new THREE.Group();
      pivotGroup.name = isLeft ? 'derived_hinge_pivot_left' : 'derived_hinge_pivot_right';
      clone.add(pivotGroup);
      pivotGroup.position.copy(clone.worldToLocal(pivotWorld.clone()));
      pivotGroup.updateMatrixWorld(true);

      doorMeshes.forEach((m) => {
        pivotGroup.attach(m);
      });

      return pivotGroup;
    };

    if (inspection.hasSeparateDoors) {
      leftDoorPivotRef.current = buildDoorHingePivot(leftDoorMeshes, true);
      rightDoorPivotRef.current = buildDoorHingePivot(rightDoorMeshes, false);
    }

    // Build real-mesh assembly records (each mesh explodes radially outward from model center)
    const records: RealMeshPartRecord[] = meshes.map((mesh, idx) => {
      const mBox = new THREE.Box3().setFromObject(mesh);
      const mCenter = new THREE.Vector3();
      mBox.getCenter(mCenter);

      const dir = mCenter.clone().sub(overallCenter);
      if (dir.lengthSq() < 0.001) {
        dir.set(
          (seededRandom(idx + 1) - 0.5) * 2,
          seededRandom(idx + 2) + 0.5,
          (seededRandom(idx + 3) - 0.5) * 2
        );
      }
      dir.normalize();

      const explodeDist =
        (2.2 + seededRandom(idx * 7) * 2.4) / Math.max(inspection.normalizedScale, 0.1);
      const assembledPos = mesh.position.clone();
      const assembledRot = mesh.rotation.clone();
      const assembledScale = mesh.scale.clone();

      const explodedPos = assembledPos.clone().add(
        new THREE.Vector3(
          dir.x * explodeDist,
          Math.abs(dir.y) * explodeDist * 0.85 + 0.6 / Math.max(inspection.normalizedScale, 0.1),
          dir.z * explodeDist
        )
      );

      const explodedRot = new THREE.Euler(
        assembledRot.x + (seededRandom(idx + 11) - 0.5) * 1.1,
        assembledRot.y + (seededRandom(idx + 23) - 0.5) * 1.1,
        assembledRot.z + (seededRandom(idx + 37) - 0.5) * 1.1
      );

      return {
        mesh,
        assembledPos,
        assembledRot,
        assembledScale,
        explodedPos,
        explodedRot,
        orderIndex: idx,
      };
    });

    return {
      clonedScene: clone,
      report: inspection,
      partRecords: records,
    };
  }, [gltf.scene, premiumMaterials]);

  // Publish door diagnostic to Zustand store
  useEffect(() => {
    setExteriorDoorDiagnostic(report.hasSeparateDoors, report.doorDiagnostic);
  }, [report, setExteriorDoorDiagnostic]);

  // Smoothly tween car body paint & pulsing light accent when activeColor changes
  useEffect(() => {
    const targetColor = new THREE.Color(activeColor);
    const targetAccent = new THREE.Color(accentColor);
    const swatch = VANTA_COLOR_SWATCHES.find(
      (s) => s.hex.toLowerCase() === activeColor.toLowerCase()
    );

    gsap.to(premiumMaterials.bodyPaint.color, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration: isReducedMotion ? 0 : 0.85,
      ease: 'power2.out',
    });

    if (swatch) {
      gsap.to(premiumMaterials.bodyPaint, {
        roughness: swatch.roughness,
        metalness: swatch.metalness,
        duration: isReducedMotion ? 0 : 0.85,
      });
    }

    gsap.to(premiumMaterials.pulsingLightEmissive.color, {
      r: targetAccent.r,
      g: targetAccent.g,
      b: targetAccent.b,
      duration: 0.6,
    });
    gsap.to(premiumMaterials.pulsingLightEmissive.emissive, {
      r: targetAccent.r,
      g: targetAccent.g,
      b: targetAccent.b,
      duration: 0.6,
    });
  }, [activeColor, accentColor, isReducedMotion, premiumMaterials]);

  // Staggered GSAP Assembly Animation using the GLB's real mesh nodes
  useEffect(() => {
    if (partRecords.length === 0) return;

    partRecords.forEach((rec) => {
      gsap.killTweensOf([rec.mesh.position, rec.mesh.rotation, rec.mesh.scale]);
    });

    if (isReducedMotion) {
      partRecords.forEach((rec) => {
        rec.mesh.position.copy(rec.assembledPos);
        rec.mesh.rotation.copy(rec.assembledRot);
        rec.mesh.scale.copy(rec.assembledScale);
      });
      if (preloaderDone && heroState === 'assembling') {
        setHeroState('idle');
      }
      return;
    }

    if (!preloaderDone) {
      partRecords.forEach((rec) => {
        rec.mesh.position.copy(rec.explodedPos);
        rec.mesh.rotation.copy(rec.explodedRot);
      });
      return;
    }

    partRecords.forEach((rec) => {
      rec.mesh.position.copy(rec.explodedPos);
      rec.mesh.rotation.copy(rec.explodedRot);
    });

    const staggerStep = Math.min(0.055, 0.9 / Math.max(partRecords.length, 1));

    const tl = gsap.timeline({
      onComplete: () => {
        setHeroState('idle');
      },
    });

    partRecords.forEach((rec, i) => {
      const delay = i * staggerStep;
      tl.to(
        rec.mesh.position,
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
        rec.mesh.rotation,
        {
          x: rec.assembledRot.x,
          y: rec.assembledRot.y,
          z: rec.assembledRot.z,
          duration: 1.4,
          ease: 'power3.out',
        },
        delay
      );
    });

    if (sweepLightRef.current && sweepBeamRef.current) {
      const sweepStart = partRecords.length * staggerStep + 0.45;
      tl.set(sweepLightRef.current, { intensity: 0 }, 0);
      tl.set(sweepLightRef.current.position, { x: 0, y: 1.4, z: -2.8 }, sweepStart);
      tl.set(sweepBeamRef.current.position, { x: 0, y: 0.75, z: -2.8 }, sweepStart);
      tl.set(sweepBeamRef.current.scale, { x: 1, y: 1, z: 1 }, sweepStart);

      tl.to(sweepLightRef.current, { intensity: 16, duration: 0.2 }, sweepStart);
      tl.to(
        [sweepLightRef.current.position, sweepBeamRef.current.position],
        { z: 2.8, duration: 0.85, ease: 'power2.inOut' },
        sweepStart
      );
      tl.to(sweepLightRef.current, { intensity: 0, duration: 0.3 }, sweepStart + 0.65);
      tl.to(
        sweepBeamRef.current.scale,
        { x: 0.001, y: 0.001, z: 0.001, duration: 0.25 },
        sweepStart + 0.7
      );
    }

    return () => {
      tl.kill();
    };
  }, [partRecords, preloaderDone, assemblyKey, activeCar, isReducedMotion, setHeroState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Door Hinge Rotation on Hover ('doorsOpen') — only when separate door nodes exist
  useEffect(() => {
    const leftPivot = leftDoorPivotRef.current;
    const rightPivot = rightDoorPivotRef.current;
    if (!leftPivot && !rightPivot) return;

    const isOpen = heroState === 'doorsOpen' || heroState === 'interior';
    const dur = isReducedMotion ? 0 : 0.82;

    if (leftPivot) {
      gsap.killTweensOf(leftPivot.rotation);
      const rot = isOpen ? carConfig.doors.left.openRotation : [0, 0, 0];
      gsap.to(leftPivot.rotation, {
        x: rot[0],
        y: rot[1],
        z: rot[2],
        duration: dur,
        ease: 'power2.inOut',
      });
    }

    if (rightPivot) {
      gsap.killTweensOf(rightPivot.rotation);
      const rot = isOpen ? carConfig.doors.right.openRotation : [0, 0, 0];
      gsap.to(rightPivot.rotation, {
        x: rot[0],
        y: rot[1],
        z: rot[2],
        duration: dur,
        ease: 'power2.inOut',
      });
    }
  }, [heroState, carConfig, isReducedMotion]);

  // Subtle cyan light strip pulse + 3D-to-2D screen projection for the exterior cabin hotspot
  useFrame((state) => {
    const pulse = 2.8 + Math.sin(state.clock.elapsedTime * 2.6) * 0.65;
    premiumMaterials.pulsingLightEmissive.emissiveIntensity = pulse;

    const hotspotEl = document.getElementById('vanta-exterior-hotspot');
    if (hotspotEl) {
      const vec = projVecRef.current.set(...carConfig.hotspotPosition);
      vec.project(state.camera);
      if (vec.z > 1) {
        hotspotEl.style.opacity = '0';
      } else {
        const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(vec.y * 0.5) + 0.5) * window.innerHeight;
        hotspotEl.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        hotspotEl.style.opacity = '1';
      }
    }
  });

  const handleCarPointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
    setCursorLabel('OPEN');
    if (heroState === 'idle') {
      setHeroState('doorsOpen');
    }
  };

  const handleCarPointerOut = () => {
    setCursorLabel(null);
    if (heroState === 'doorsOpen') {
      hoverCloseTimeoutRef.current = setTimeout(() => {
        if (useVantaStore.getState().heroState === 'doorsOpen') {
          setHeroState('idle');
        }
      }, 450);
    }
  };

  const handleCarClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (heroState === 'idle') {
      setHeroState('doorsOpen');
    }
  };

  return (
    <group ref={rootGroupRef}>
      {/* Auto-normalized & grounded GLB exterior car */}
      <group
        position={report.groundOffset}
        scale={[report.normalizedScale, report.normalizedScale, report.normalizedScale]}
        onPointerOver={handleCarPointerOver}
        onPointerOut={handleCarPointerOut}
        onClick={handleCarClick}
      >
        <primitive object={clonedScene} />
      </group>

      {/* Emissive Wheel Rim Accent Rings positioned at normalized front & rear axles */}
      {[
        [-0.95, 0.36, 1.38],
        [0.95, 0.36, 1.38],
        [-0.96, 0.38, -1.36],
        [0.96, 0.38, -1.36],
      ].map((pos, idx) => (
        <mesh
          key={idx}
          position={pos as [number, number, number]}
          rotation={[0, Math.PI / 2, 0]}
          material={premiumMaterials.pulsingLightEmissive}
        >
          <ringGeometry args={[0.21, 0.23, 32]} />
        </mesh>
      ))}

      {/* Assembly Completion Light Sweep */}
      <pointLight
        ref={sweepLightRef}
        color={accentColor}
        intensity={0}
        distance={5.5}
        decay={2}
        position={[0, 1.4, -2.8]}
      />
      <mesh
        ref={sweepBeamRef}
        position={[0, 0.75, -2.8]}
        scale={[0.001, 0.001, 0.001]}
        material={premiumMaterials.pulsingLightEmissive}
      >
        <boxGeometry args={[2.3, 0.02, 0.05]} />
      </mesh>
    </group>
  );
}

useGLTF.preload(GLB_MODEL_CONFIG.exteriorModelPath, true);
