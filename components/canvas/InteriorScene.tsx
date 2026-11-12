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

  // Premium Interior Materials (DoubleSide enabled so cabin walls/consoles never cull from inside)
  const interiorMaterials = useMemo(() => {
    const nappaLeather = new THREE.MeshStandardMaterial({
      name: 'Vanta_Interior_Leather',
      color: new THREE.Color('#141926'),
      roughness: 0.58,
      metalness: 0.15,
      envMapIntensity: 1.2,
      side: THREE.DoubleSide,
    });

    const forgedCarbon = new THREE.MeshStandardMaterial({
      name: 'Vanta_Interior_CarbonFiber',
      color: new THREE.Color('#1c2333'),
      roughness: 0.3,
      metalness: 0.62,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide,
    });

    const brushedMetal = new THREE.MeshStandardMaterial({
      name: 'Vanta_Interior_BrushedMetal',
      color: new THREE.Color('#94a3b8'),
      roughness: 0.22,
      metalness: 0.88,
      envMapIntensity: 1.6,
      side: THREE.DoubleSide,
    });

    const displayGlass = new THREE.MeshPhysicalMaterial({
      name: 'Vanta_Interior_DisplayGlass',
      color: new THREE.Color('#061224'),
      emissive: new THREE.Color('#004466'),
      emissiveIntensity: 0.9,
      roughness: 0.06,
      metalness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.95,
      side: THREE.DoubleSide,
    });

    const ambientWaveguide = new THREE.MeshStandardMaterial({
      name: 'Vanta_Interior_AmbientStrip',
      color: new THREE.Color(accentColor),
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 3.4,
      toneMapped: false,
      side: THREE.DoubleSide,
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

  // Clone & inspect interior.glb, isolate core cockpit consoles from outlier room bounds, and normalize
  const { clonedInterior, cockpitTransform } = useMemo(() => {
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

    // Compute tight bounding box around the actual cockpit consoles & monitors
    const consoleBox = new THREE.Box3();
    let hasConsoleMeshes = false;

    clone.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

        const mBox = new THREE.Box3().setFromObject(mesh);
        const mCenter = new THREE.Vector3();
        const mSize = new THREE.Vector3();
        mBox.getCenter(mCenter);
        mBox.getSize(mSize);

        const cat = classifyMeshNode(mesh, mCenter, overallCenter);
        const matName = Array.isArray(mesh.material)
          ? mesh.material.map((m) => m?.name || '').join(' ')
          : mesh.material?.name || '';
        const token = `${mesh.name} ${matName}`.toLowerCase();

        // Hide mannequin ('human'), poster, or giant outlier room walls that block or skew the cockpit
        if (/\b(human|poster|room_base|fx_glass)\b/i.test(token) || mSize.x > 4.5) {
          mesh.visible = false;
          return;
        }

        // Sanitize any real brand names
        if (/\b(logo|emblem|badge|audi|bmw|mercedes|porsche|bentley|tesla|ferrari)\b/i.test(token)) {
          mesh.name = mesh.name.replace(/bentley|audi|bmw|mercedes|porsche|tesla/gi, 'VANTA');
        }

        // Accumulate cockpit core bounding box
        if (/console|monitor|carbon|keys|metal|seat|chair|dash/i.test(token) || mSize.length() < 4.0) {
          consoleBox.expandByObject(mesh);
          hasConsoleMeshes = true;
        }

        if (cat === 'ambient' || cat === 'light' || /keys_blue|keys_orange|keys_red|monitor_blue|monitor_green|monitor_orange/i.test(token)) {
          mesh.material = interiorMaterials.ambientWaveguide;
        } else if (cat === 'display' || /monitor/i.test(token)) {
          mesh.material = interiorMaterials.displayGlass;
        } else if (cat === 'seat' || /leather|seat|cushion|charcoal|darkgray|dimgray/i.test(token)) {
          mesh.material = interiorMaterials.nappaLeather;
        } else if (/carbon|steer|yoke|door|console_base/i.test(token)) {
          mesh.material = interiorMaterials.forgedCarbon;
        } else if (/metal|chrome|silver|titanium|aluminum|console|trim/i.test(token)) {
          mesh.material = interiorMaterials.brushedMetal;
        } else {
          // Ensure double-sided rendering on any original material
          if (mesh.material && !Array.isArray(mesh.material)) {
            mesh.material.side = THREE.DoubleSide;
          }
        }
      }
    });

    const targetBox = hasConsoleMeshes ? consoleBox : overallBox;
    const cSize = new THREE.Vector3();
    const cCenter = new THREE.Vector3();
    targetBox.getSize(cSize);
    targetBox.getCenter(cCenter);

    const maxSpan = Math.max(cSize.x, cSize.z, 0.5);
    const scale = 2.5 / maxSpan;

    // Position the normalized cockpit right in front of the driver seat ([0, 0.82, 0.55])
    const offset: [number, number, number] = [
      -cCenter.x * scale,
      -targetBox.min.y * scale + 0.15,
      -cCenter.z * scale + 0.45,
    ];

    return {
      clonedInterior: clone,
      cockpitTransform: { scale, offset },
    };
  }, [gltf.scene, interiorMaterials]);

  useEffect(() => {
    setInteriorLoading(false);
  }, [setInteriorLoading]);

  // Project 7 3D hotspot coordinates onto 2D screen coordinates every frame
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
        // Clamp screen coordinates slightly so cards stay reachable on mobile/tablet screens
        const rawX = (vec.x * 0.5 + 0.5) * w;
        const rawY = (-(vec.y * 0.5) + 0.5) * h;
        const x = Math.max(28, Math.min(w - 28, rawX));
        const y = Math.max(70, Math.min(h - 90, rawY));
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      }
    }
  });

  return (
    <group>
      {/* Strong Interior Cockpit Illumination so nothing looks dark or hidden */}
      <ambientLight intensity={1.35} />
      <hemisphereLight args={['#e2e8f0', '#0f172a', 1.4]} />
      <pointLight
        position={[0, 1.35, 0.15]}
        intensity={3.5}
        distance={6}
        color="#f8fafc"
      />
      <pointLight
        position={[-0.36, 0.95, 0.42]}
        intensity={3.0}
        distance={3.5}
        color={accentColor}
      />
      <pointLight
        position={[0.36, 0.95, 0.42]}
        intensity={2.6}
        distance={3.5}
        color={accentColor}
      />
      <pointLight
        position={[0, 1.05, -0.65]}
        intensity={2.2}
        distance={4}
        color="#38bdf8"
      />

      {/* Normalized Interior GLB Scene centered around the cockpit consoles */}
      <group
        position={cockpitTransform.offset}
        scale={[cockpitTransform.scale, cockpitTransform.scale, cockpitTransform.scale]}
      >
        <primitive object={clonedInterior} />
      </group>

      {/* Architectural Cockpit Enclosure Frame & Interactive Anchor Surfaces */}
      {/* 1. Sculpted Dashboard Bridge & Panoramic Display Bezel */}
      <group position={[0, 0.74, 0.62]}>
        <mesh material={interiorMaterials.nappaLeather}>
          <boxGeometry args={[1.58, 0.16, 0.36]} />
        </mesh>
        {/* 15.4" Center Quantum OLED Display */}
        <mesh position={[0.02, 0.11, -0.08]} rotation={[-0.18, 0, 0]} material={interiorMaterials.displayGlass}>
          <boxGeometry args={[0.42, 0.25, 0.02]} />
        </mesh>
        <mesh position={[0.02, 0.11, -0.092]} rotation={[-0.18, 0, 0]} material={interiorMaterials.ambientWaveguide}>
          <boxGeometry args={[0.44, 0.27, 0.005]} />
        </mesh>
        {/* 12.3" Driver Holographic Instrument Cluster */}
        <mesh position={[-0.36, 0.16, -0.06]} rotation={[-0.15, 0, 0]} material={interiorMaterials.displayGlass}>
          <boxGeometry args={[0.34, 0.14, 0.018]} />
        </mesh>
        <mesh position={[-0.36, 0.23, -0.06]} rotation={[-0.15, 0, 0]} material={interiorMaterials.ambientWaveguide}>
          <boxGeometry args={[0.34, 0.008, 0.01]} />
        </mesh>
      </group>

      {/* 2. Hyperspace Steer-By-Wire Carbon Yoke */}
      <group position={[-0.36, 0.78, 0.36]} rotation={[0.24, 0, 0]}>
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} material={interiorMaterials.brushedMetal}>
          <cylinderGeometry args={[0.03, 0.038, 0.22, 24]} />
        </mesh>
        <mesh material={interiorMaterials.forgedCarbon}>
          <boxGeometry args={[0.3, 0.045, 0.03]} />
        </mesh>
        <mesh position={[-0.135, 0.02, 0]} material={interiorMaterials.nappaLeather}>
          <boxGeometry args={[0.035, 0.14, 0.035]} />
        </mesh>
        <mesh position={[0.135, 0.02, 0]} material={interiorMaterials.nappaLeather}>
          <boxGeometry args={[0.035, 0.14, 0.035]} />
        </mesh>
        <mesh position={[0, 0.026, -0.016]} material={interiorMaterials.ambientWaveguide}>
          <boxGeometry args={[0.12, 0.008, 0.008]} />
        </mesh>
      </group>

      {/* 3. Floating Titanium Center Console Bridge */}
      <group position={[0, 0.52, 0.08]}>
        <mesh material={interiorMaterials.forgedCarbon}>
          <boxGeometry args={[0.26, 0.16, 1.15]} />
        </mesh>
        <mesh position={[0, 0.085, 0.05]} material={interiorMaterials.brushedMetal}>
          <boxGeometry args={[0.22, 0.015, 0.85]} />
        </mesh>
        <mesh position={[0, 0.094, 0.05]} material={interiorMaterials.ambientWaveguide}>
          <boxGeometry args={[0.02, 0.006, 0.75]} />
        </mesh>
      </group>

      {/* 4. Sculpted Nappa Leather Bucket Seats (Front & Rear) */}
      {[
        [-0.36, 0.45, -0.18],
        [0.36, 0.45, -0.18],
        [-0.34, 0.48, -0.92],
        [0.34, 0.48, -0.92],
      ].map((pos, idx) => (
        <group key={idx} position={pos as [number, number, number]}>
          <mesh material={interiorMaterials.nappaLeather}>
            <boxGeometry args={[0.42, 0.09, 0.44]} />
          </mesh>
          <mesh position={[0, 0.32, -0.18]} rotation={[-0.18, 0, 0]} material={interiorMaterials.nappaLeather}>
            <boxGeometry args={[0.38, 0.56, 0.08]} />
          </mesh>
          <mesh position={[0, 0.62, -0.24]} rotation={[-0.1, 0, 0]} material={interiorMaterials.forgedCarbon}>
            <boxGeometry args={[0.22, 0.16, 0.07]} />
          </mesh>
          <mesh position={[0, 0.48, -0.135]} rotation={[-0.18, 0, 0]} material={interiorMaterials.ambientWaveguide}>
            <boxGeometry args={[0.2, 0.012, 0.01]} />
          </mesh>
        </group>
      ))}

      {/* 5. Acoustic Carbon Door Cards & Photonic Ambient Waveguides */}
      <mesh position={[-0.78, 0.68, -0.05]} material={interiorMaterials.forgedCarbon}>
        <boxGeometry args={[0.06, 0.52, 1.35]} />
      </mesh>
      <mesh position={[0.78, 0.68, -0.05]} material={interiorMaterials.forgedCarbon}>
        <boxGeometry args={[0.06, 0.52, 1.35]} />
      </mesh>
      <mesh position={[0, 0.83, 0.58]} material={interiorMaterials.ambientWaveguide}>
        <boxGeometry args={[1.48, 0.01, 0.01]} />
      </mesh>
      <mesh position={[-0.74, 0.76, 0.05]} material={interiorMaterials.ambientWaveguide}>
        <boxGeometry args={[0.01, 0.01, 1.15]} />
      </mesh>
      <mesh position={[0.74, 0.76, 0.05]} material={interiorMaterials.ambientWaveguide}>
        <boxGeometry args={[0.01, 0.01, 1.15]} />
      </mesh>
    </group>
  );
}
