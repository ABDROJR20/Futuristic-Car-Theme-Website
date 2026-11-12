'use client';

import React, { Suspense, lazy, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  ContactShadows,
  Html,
  useGLTF,
} from '@react-three/drei';
import * as THREE from 'three';
import CameraRig from './CameraRig';
import ExteriorCar from './ExteriorCar';
import { GlbErrorBoundary } from './GlbErrorBoundary';
import { GLB_MODEL_CONFIG } from '@/lib/carConfig';
import { useVantaStore } from '@/store/useVantaStore';

const InteriorScene = lazy(() => import('./InteriorScene'));

function SceneSwapLoader({ label }: { label: string }) {
  return (
    <Html center>
      <div className="flex items-center gap-3 rounded-full border border-[#00f0ff]/40 bg-[#05060a]/90 px-5 py-2.5 text-white shadow-[0_0_30px_rgba(0,240,255,0.25)] backdrop-blur-xl">
        <span className="h-2.5 w-2.5 animate-ping rounded-full bg-[#00f0ff]" />
        <span className="whitespace-nowrap font-mono text-[11px] tracking-[0.25em] uppercase text-white/85">
          {label}
        </span>
      </div>
    </Html>
  );
}

function StudioLighting() {
  const accentColor = useVantaStore((s) => s.accentColor);

  return (
    <>
      <ambientLight intensity={0.35} />

      {/* Primary Key Light */}
      <spotLight
        position={[4.5, 8.5, 5.5]}
        angle={0.45}
        penumbra={0.9}
        intensity={3.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* Rim Light */}
      <directionalLight position={[-6.5, 4.2, -5.5]} intensity={2.1} color="#38bdf8" />

      {/* Subtle Fill Light */}
      <directionalLight position={[5.5, 2.0, 4.0]} intensity={0.95} color="#f1f5f9" />

      {/* Underglow Accent */}
      <pointLight position={[0, 0.14, 0]} intensity={1.6} distance={4.5} color={accentColor} />

      {/* High-Contrast HDRI Studio Reflections */}
      <Environment resolution={512} frames={1}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer
            form="rect"
            intensity={4.8}
            rotation-x={Math.PI / 2}
            position={[0, 5, -1]}
            scale={[10, 2.5, 1]}
            color="#ffffff"
          />
          <Lightformer
            form="rect"
            intensity={3.4}
            rotation-y={Math.PI / 2}
            position={[-6, 1.5, 0]}
            scale={[12, 0.8, 1]}
            color="#00f0ff"
          />
          <Lightformer
            form="rect"
            intensity={2.9}
            rotation-y={-Math.PI / 2}
            position={[6, 2, 0]}
            scale={[12, 1.2, 1]}
            color="#e2e8f0"
          />
          <Lightformer
            form="ring"
            color="#38bdf8"
            intensity={2.6}
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
    <group position={[0, -0.005, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[55, 55]} />
        <MeshReflectorMaterial
          blur={isMobile ? [200, 60] : [400, 120]}
          resolution={isMobile ? 512 : 1024}
          mixBlur={1}
          mixStrength={45}
          roughness={0.65}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#05060a"
          metalness={0.82}
          mirror={0.68}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[2.75, 2.77, 96]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.32} />
      </mesh>

      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.78}
        scale={12}
        blur={2.1}
        far={4}
        resolution={512}
        color="#000000"
      />
    </group>
  );
}

export default function Scene() {
  const activeScene = useVantaStore((s) => s.activeScene);
  const heroState = useVantaStore((s) => s.heroState);
  const preloaderDone = useVantaStore((s) => s.preloaderDone);

  // Lazy-load interior.glb after the hero assembly finishes
  useEffect(() => {
    if (preloaderDone && heroState === 'idle') {
      const timer = setTimeout(() => {
        try {
          useGLTF.preload(GLB_MODEL_CONFIG.interiorModelPath, true);
        } catch {
          // Handled by GlbErrorBoundary when rendered
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [preloaderDone, heroState]);

  return (
    <div className="fixed inset-0 z-0 h-screen w-screen pointer-events-auto">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [3.85, 1.42, 4.25], fov: 45, near: 0.05, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <color attach="background" args={['#05060a']} />
        <fog attach="fog" args={['#05060a', 11, 28]} />

        <CameraRig />
        <StudioLighting />

        {activeScene === 'exterior' ? (
          <>
            <GlbErrorBoundary modelPath={GLB_MODEL_CONFIG.exteriorModelPath}>
              <Suspense fallback={<SceneSwapLoader label="LOADING EXTERIOR.GLB..." />}>
                <ExteriorCar />
              </Suspense>
            </GlbErrorBoundary>
            <ShowroomFloor />
          </>
        ) : (
          <GlbErrorBoundary modelPath={GLB_MODEL_CONFIG.interiorModelPath}>
            <Suspense fallback={<SceneSwapLoader label="LOADING COCKPIT INTERIOR.GLB..." />}>
              <InteriorScene />
            </Suspense>
          </GlbErrorBoundary>
        )}
      </Canvas>
    </div>
  );
}
