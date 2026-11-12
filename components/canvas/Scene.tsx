'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  ContactShadows,
} from '@react-three/drei';
import * as THREE from 'three';
import CameraRig from './CameraRig';
import ProceduralCar from './ProceduralCar';
import { useVantaStore } from '@/store/useVantaStore';

function StudioLighting() {
  const accentColor = useVantaStore((s) => s.accentColor);

  return (
    <>
      <ambientLight intensity={0.45} />

      {/* Key Overhead Studio Spot */}
      <spotLight
        position={[4, 8, 5]}
        angle={0.48}
        penumbra={0.85}
        intensity={3.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* Cool Rim Light */}
      <directionalLight position={[-6, 4, -5]} intensity={1.8} color="#38bdf8" />

      {/* Warm Fill Light */}
      <directionalLight position={[6, 2, 4]} intensity={1.1} color="#e2e8f0" />

      {/* Underglow Accent Point Light */}
      <pointLight position={[0, 0.12, 0]} intensity={1.8} distance={4.5} color={accentColor} />

      {/* Procedural High-Contrast Automotive Reflections (City/Cyberpunk Studio) */}
      <Environment resolution={256} frames={1}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          {/* Top Softbox Strip */}
          <Lightformer
            form="rect"
            intensity={4.5}
            rotation-x={Math.PI / 2}
            position={[0, 5, -1]}
            scale={[10, 2.5, 1]}
            color="#ffffff"
          />
          {/* Left Cyan Horizon Strip */}
          <Lightformer
            form="rect"
            intensity={3.2}
            rotation-y={Math.PI / 2}
            position={[-6, 1.5, 0]}
            scale={[12, 0.8, 1]}
            color="#00f0ff"
          />
          {/* Right Cool White Strip */}
          <Lightformer
            form="rect"
            intensity={2.8}
            rotation-y={-Math.PI / 2}
            position={[6, 2, 0]}
            scale={[12, 1.2, 1]}
            color="#cbd5e1"
          />
          {/* Rear Halo Ring */}
          <Lightformer
            form="ring"
            color="#38bdf8"
            intensity={2.5}
            scale={6}
            position={[0, 2, -6]}
            target={[0, 0, 0]}
          />
        </group>
      </Environment>
    </>
  );
}

function ShowroomFloor() {
  const accentColor = useVantaStore((s) => s.accentColor);
  const isMobile = useVantaStore((s) => s.isMobile);

  return (
    <group position={[0, -0.01, 0]}>
      {/* Reflective Obsidian Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[55, 55]} />
        <MeshReflectorMaterial
          blur={isMobile ? [200, 60] : [400, 120]}
          resolution={isMobile ? 512 : 1024}
          mixBlur={1}
          mixStrength={45}
          roughness={0.68}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#05060a"
          metalness={0.8}
          mirror={0.65}
        />
      </mesh>

      {/* Subtle Telemetry Turntable Ring Around the Car */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[2.65, 2.67, 96]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.32} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[3.4, 3.41, 96]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
      </mesh>

      {/* Ground Contact Shadows */}
      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.75}
        scale={12}
        blur={2.2}
        far={4}
        resolution={512}
        color="#000000"
      />
    </group>
  );
}

export default function Scene() {
  return (
    <div className="fixed inset-0 z-0 h-screen w-screen pointer-events-auto">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [3.9, 1.45, 4.3], fov: 40, near: 0.08, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <color attach="background" args={['#05060a']} />
        <fog attach="fog" args={['#05060a', 11, 28]} />

        <Suspense fallback={null}>
          <CameraRig />
          <StudioLighting />
          <ProceduralCar />
          <ShowroomFloor />
        </Suspense>
      </Canvas>
    </div>
  );
}

