'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
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
  const projVecRef = useRef(new THREE.Vector3());

  const accentColor = useVantaStore((s) => s.accentColor);
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

        // Hide real brand logo/badge meshes if present
        if (/\b(logo|emblem|badge|audi|bmw|mercedes|porsche|bentley|tesla|ferrari)\b/i.test(token)) {
          mesh.name = mesh.name.replace(/bentley|audi|bmw|mercedes|porsche|tesla/gi, 'VANTA');
        }

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

  // Project 7 3D hotspot coordinates onto 2D screen coordinates every frame (zero <Html> portals)
  useFrame((state) => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const spot of INTERIOR_HOTSPOTS) {
      const el = document.getElementById(`vanta-hotspot-${spot.id}`);
      if (!el) continue;

      const vec = projVecRef.current.set(...spot.position);
      vec.project(state.camera);

      if (vec.z > 1) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      } else {
        const x = (vec.x * 0.5 + 0.5) * w;
        const y = (-(vec.y * 0.5) + 0.5) * h;
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      }
    }
  });

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
    </group>
  );
}
