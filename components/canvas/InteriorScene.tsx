'use client';

import React, { useEffect, useMemo } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import {
  GLB_MODEL_CONFIG,
  INTERIOR_HOTSPOTS,
} from '@/lib/carConfig';
import {
  classifyMeshNode,
  inspectAndNormalizeGlb,
} from '@/lib/glbInspector';
import { useVantaStore } from '@/store/useVantaStore';

export default function InteriorScene() {
  const gltf = useGLTF(GLB_MODEL_CONFIG.interiorModelPath, true);

  const accentColor = useVantaStore((s) => s.accentColor);
  const activeHotspotId = useVantaStore((s) => s.activeHotspotId);
  const setActiveHotspotId = useVantaStore((s) => s.setActiveHotspotId);
  const setInteriorLoading = useVantaStore((s) => s.setInteriorLoading);

  // Premium Interior Materials (Section 4 requirements)
  const interiorMaterials = useMemo(() => {
    const nappaLeather = new THREE.MeshStandardMaterial({
      name: 'Vanta_Interior_Leather',
      color: new THREE.Color('#0d1018'),
      roughness: 0.6,
      metalness: 0.12,
      envMapIntensity: 0.9,
    });

    const forgedCarbon = new THREE.MeshStandardMaterial({
      name: 'Vanta_Interior_CarbonFiber',
      color: new THREE.Color('#131722'),
      roughness: 0.32,
      metalness: 0.55,
      envMapIntensity: 1.2,
    });

    const brushedMetal = new THREE.MeshStandardMaterial({
      name: 'Vanta_Interior_BrushedMetal',
      color: new THREE.Color('#64748b'),
      roughness: 0.22,
      metalness: 0.88,
      envMapIntensity: 1.4,
    });

    const displayGlass = new THREE.MeshPhysicalMaterial({
      name: 'Vanta_Interior_DisplayGlass',
      color: new THREE.Color('#030712'),
      roughness: 0.04,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.95,
    });

    const ambientWaveguide = new THREE.MeshStandardMaterial({
      name: 'Vanta_Interior_AmbientStrip',
      color: new THREE.Color(accentColor),
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 3.2,
      toneMapped: false,
    });

    return {
      nappaLeather,
      forgedCarbon,
      brushedMetal,
      displayGlass,
      ambientWaveguide,
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync ambient light strips with page accentColor
  useEffect(() => {
    const col = new THREE.Color(accentColor);
    gsap.to(interiorMaterials.ambientWaveguide.color, {
      r: col.r,
      g: col.g,
      b: col.b,
      duration: 0.5,
    });
    gsap.to(interiorMaterials.ambientWaveguide.emissive, {
      r: col.r,
      g: col.g,
      b: col.b,
      duration: 0.5,
    });
  }, [accentColor, interiorMaterials]);

  // Clone & inspect interior.glb, derive nodes, normalize scale & upgrade materials
  const { clonedInterior, report } = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const inspection = inspectAndNormalizeGlb(
      clone,
      GLB_MODEL_CONFIG.interiorModelPath,
      GLB_MODEL_CONFIG.targetInteriorSpanMeters
    );

    GLB_MODEL_CONFIG.derivedNodes.interior = inspection.rows
      .filter((r) => r.category !== 'group')
      .map((r) => r.name);

    const overallBox = new THREE.Box3().setFromObject(clone);
    const overallCenter = new THREE.Vector3();
    overallBox.getCenter(overallCenter);

    clone.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const mBox = new THREE.Box3().setFromObject(mesh);
        const mCenter = new THREE.Vector3();
        mBox.getCenter(mCenter);

        const cat = classifyMeshNode(mesh, mCenter, overallCenter);
        const token = `${mesh.name} ${
          Array.isArray(mesh.material)
            ? mesh.material.map((m) => m.name).join(' ')
            : mesh.material?.name || ''
        }`.toLowerCase();

        if (cat === 'ambient' || cat === 'light') {
          mesh.material = interiorMaterials.ambientWaveguide;
        } else if (cat === 'display') {
          mesh.material = interiorMaterials.displayGlass;
        } else if (cat === 'seat' || /leather|seat|cushion|dash/i.test(token)) {
          mesh.material = interiorMaterials.nappaLeather;
        } else if (/carbon|steer|yoke|door/i.test(token)) {
          mesh.material = interiorMaterials.forgedCarbon;
        } else if (/metal|chrome|titanium|aluminum|console|trim/i.test(token)) {
          mesh.material = interiorMaterials.brushedMetal;
        }
      }
    });

    return {
      clonedInterior: clone,
      report: inspection,
    };
  }, [gltf.scene, interiorMaterials]);

  useEffect(() => {
    setInteriorLoading(false);
  }, [setInteriorLoading]);

  return (
    <group>
      {/* Interior Cabin Ambient & Key Lighting */}
      <pointLight
        position={[0, 1.15, 0.2]}
        intensity={1.6}
        distance={3.5}
        color="#e2e8f0"
      />
      <pointLight
        position={[-0.35, 0.85, 0.45]}
        intensity={2.2}
        distance={2.2}
        color={accentColor}
      />
      <pointLight
        position={[0.35, 0.85, 0.45]}
        intensity={1.8}
        distance={2.2}
        color={accentColor}
      />

      {/* Normalized Interior GLB Scene */}
      <group
        position={report.groundOffset}
        scale={[report.normalizedScale, report.normalizedScale, report.normalizedScale]}
      >
        <primitive object={clonedInterior} />
      </group>

      {/* Ambient Photonic Waveguide Strips along Dashboard & Doors */}
      <mesh position={[0, 0.83, 0.58]} material={interiorMaterials.ambientWaveguide}>
        <boxGeometry args={[1.38, 0.008, 0.008]} />
      </mesh>
      <mesh position={[-0.72, 0.76, 0.05]} material={interiorMaterials.ambientWaveguide}>
        <boxGeometry args={[0.008, 0.008, 1.05]} />
      </mesh>
      <mesh position={[0.72, 0.76, 0.05]} material={interiorMaterials.ambientWaveguide}>
        <boxGeometry args={[0.008, 0.008, 1.05]} />
      </mesh>

      {/* 7 Interactive Interior Hotspots with Glassmorphism Spec Cards */}
      {INTERIOR_HOTSPOTS.map((spot) => {
        const isHovered = activeHotspotId === spot.id;

        return (
          <Html
            key={spot.id}
            position={spot.position}
            center
            zIndexRange={[30, 0]}
          >
            <div
              className="relative flex items-center justify-center select-none"
              onMouseEnter={() => setActiveHotspotId(spot.id)}
              onMouseLeave={() => setActiveHotspotId(null)}
              onClick={(e) => {
                e.stopPropagation();
                setActiveHotspotId(isHovered ? null : spot.id);
              }}
            >
              {/* Pulsing Hotspot Dot */}
              <button
                type="button"
                aria-label={spot.name}
                className="group relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-black/70 backdrop-blur-md transition-transform duration-300 hover:scale-125"
                style={{
                  borderColor: isHovered ? accentColor : 'rgba(255,255,255,0.35)',
                  boxShadow: isHovered
                    ? `0 0 22px ${accentColor}`
                    : `0 0 12px ${accentColor}66`,
                }}
              >
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ backgroundColor: accentColor }}
                />
                <span
                  className="relative inline-flex h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
              </button>

              {/* Glassmorphism Spec Card on Hover */}
              {isHovered && (
                <div className="pointer-events-none absolute bottom-10 left-1/2 w-72 -translate-x-1/2 rounded-2xl border border-white/15 bg-[#05060a]/88 p-4 text-left text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span
                      className="font-mono text-[9px] font-semibold tracking-[0.26em] uppercase"
                      style={{ color: accentColor }}
                    >
                      {spot.category}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <h4 className="mt-2 font-display text-sm font-bold tracking-wider uppercase text-white">
                    {spot.name}
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-white/75">
                    {spot.specs.map((specLine, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span
                          className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: accentColor }}
                        />
                        <span>{specLine}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

