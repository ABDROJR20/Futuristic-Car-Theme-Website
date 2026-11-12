'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CAR_LINEUP, CameraPose, CameraViewKey } from '@/lib/carConfig';
import { useVantaStore } from '@/store/useVantaStore';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface FlyToOptions {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  duration?: number;
  ease?: string;
  onComplete?: () => void;
}

// Module-level reference so external UI or helpers can invoke flyTo if needed
let activeFlyToHandler: ((opts: FlyToOptions) => void) | null = null;

export function flyTo(options: FlyToOptions) {
  if (activeFlyToHandler) {
    activeFlyToHandler(options);
  }
}

export default function CameraRig() {
  const { camera } = useThree();
  const heroState = useVantaStore((s) => s.heroState);
  const activeCar = useVantaStore((s) => s.activeCar);
  const interiorSeat = useVantaStore((s) => s.interiorSeat);
  const isReducedMotion = useVantaStore((s) => s.isReducedMotion);
  const isMobile = useVantaStore((s) => s.isMobile);
  const setHeroState = useVantaStore((s) => s.setHeroState);
  const setActiveSection = useVantaStore((s) => s.setActiveSection);

  const carConfig = CAR_LINEUP[activeCar] ?? CAR_LINEUP[0];
  const initialExterior = carConfig.cameras.exterior;

  // Animated state proxies for GSAP
  const camPos = useRef({
    x: initialExterior.position[0],
    y: initialExterior.position[1],
    z: initialExterior.position[2],
  });
  const camTarget = useRef({
    x: initialExterior.target[0],
    y: initialExterior.target[1],
    z: initialExterior.target[2],
  });
  const camFov = useRef({ value: initialExterior.fov });

  // Pointer coordinates for subtle parallax / interior free-look
  const pointerRef = useRef({ x: 0, y: 0, smoothX: 0, smoothY: 0 });
  const lookAtVec = useRef(new THREE.Vector3());
  const isScrollingBelowHero = useRef(false);

  /**
   * Core camera transition helper: kills conflicting tweens before starting a new one.
   */
  const executeFlyTo = useCallback(
    ({
      position,
      target,
      fov = 40,
      duration = 1.35,
      ease = 'power3.inOut',
      onComplete,
    }: FlyToOptions) => {
      gsap.killTweensOf([camPos.current, camTarget.current, camFov.current]);

      const effectiveDuration = isReducedMotion ? 0 : duration;

      if (effectiveDuration === 0) {
        camPos.current.x = position[0];
        camPos.current.y = position[1];
        camPos.current.z = position[2];
        camTarget.current.x = target[0];
        camTarget.current.y = target[1];
        camTarget.current.z = target[2];
        camFov.current.value = fov;
        onComplete?.();
        return;
      }

      gsap.to(camPos.current, {
        x: position[0],
        y: position[1],
        z: position[2],
        duration: effectiveDuration,
        ease,
      });

      gsap.to(camTarget.current, {
        x: target[0],
        y: target[1],
        z: target[2],
        duration: effectiveDuration,
        ease,
      });

      gsap.to(camFov.current, {
        value: fov,
        duration: effectiveDuration,
        ease,
        onComplete,
      });
    },
    [isReducedMotion]
  );

  // Register global singleton handler
  useEffect(() => {
    activeFlyToHandler = executeFlyTo;
    return () => {
      activeFlyToHandler = null;
    };
  }, [executeFlyTo]);

  /**
   * Helper to fly to one of the 4 predefined views: exterior, doorsOpen, driverSeat, rearSeat
   */
  const flyToPredefinedView = useCallback(
    (
      view: CameraViewKey,
      overrides?: Partial<Pick<FlyToOptions, 'duration' | 'ease' | 'onComplete'>>
    ) => {
      const pose: CameraPose = carConfig.cameras[view];
      // Adjust slightly on narrow mobile viewports so the full car stays framed
      const mobileDistanceMultiplier =
        isMobile && (view === 'exterior' || view === 'doorsOpen') ? 1.28 : 1;

      executeFlyTo({
        position: [
          pose.position[0] * mobileDistanceMultiplier,
          pose.position[1] * mobileDistanceMultiplier,
          pose.position[2] * mobileDistanceMultiplier,
        ],
        target: pose.target,
        fov: pose.fov,
        duration: overrides?.duration ?? 1.35,
        ease: overrides?.ease ?? 'power3.inOut',
        onComplete: overrides?.onComplete,
      });
    },
    [carConfig, executeFlyTo, isMobile]
  );

  // Track mouse movement for subtle camera parallax & interior look-around
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('mousemove', handlePointerMove);
  }, []);

  // React to heroState & activeCar changes
  useEffect(() => {
    if (isScrollingBelowHero.current && heroState === 'idle') return;

    if (heroState === 'assembling') {
      // Dramatic wider angle during assembly, settling into exterior pose
      const ext = carConfig.cameras.exterior;
      const mult = isMobile ? 1.3 : 1;
      executeFlyTo({
        position: [ext.position[0] * 1.15 * mult, ext.position[1] * 1.2, ext.position[2] * 1.15 * mult],
        target: ext.target,
        fov: ext.fov + 3,
        duration: 1.2,
        ease: 'power2.out',
      });
    } else if (heroState === 'idle') {
      flyToPredefinedView('exterior', { duration: 1.2, ease: 'power3.out' });
    } else if (heroState === 'doorsOpen') {
      flyToPredefinedView('doorsOpen', { duration: 0.95, ease: 'power2.out' });
    } else if (heroState === 'interior') {
      const targetView: CameraViewKey = interiorSeat === 'rear' ? 'rearSeat' : 'driverSeat';
      flyToPredefinedView(targetView, { duration: 1.4, ease: 'power3.inOut' });
    } else if (heroState === 'exiting') {
      flyToPredefinedView('exterior', {
        duration: 1.3,
        ease: 'power3.inOut',
        onComplete: () => {
          setHeroState('idle');
        },
      });
    }
  }, [heroState, interiorSeat, activeCar, carConfig, executeFlyTo, flyToPredefinedView, isMobile, setHeroState]);

  // Master GSAP ScrollTrigger timeline for sections below the hero
  useEffect(() => {
    const scrollContainer = document.getElementById('scroll-sections-wrapper');
    if (!scrollContainer) return;

    const wp = carConfig.cameras.scrollWaypoints;
    const ext = carConfig.cameras.exterior;
    const mult = isMobile ? 1.25 : 1;

    const ctx = gsap.context(() => {
      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollContainer,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 1.1,
          onUpdate: (self) => {
            const p = self.progress;
            isScrollingBelowHero.current = p > 0.02;

            if (p <= 0.04) {
              setActiveSection('hero');
            } else if (p <= 0.28) {
              setActiveSection('design');
            } else if (p <= 0.5) {
              setActiveSection('performance');
            } else if (p <= 0.72) {
              setActiveSection('colors');
            } else if (p <= 0.88) {
              setActiveSection('specs');
            } else {
              setActiveSection('cta');
            }
          },
        },
      });

      // Ensure starting values match exterior camera pose
      masterTl.fromTo(
        camPos.current,
        {
          x: ext.position[0] * mult,
          y: ext.position[1] * mult,
          z: ext.position[2] * mult,
        },
        {
          x: wp.designFront.position[0] * mult,
          y: wp.designFront.position[1],
          z: wp.designFront.position[2] * mult,
          ease: 'power1.inOut',
          duration: 1,
        },
        0
      );
      masterTl.fromTo(
        camTarget.current,
        { x: ext.target[0], y: ext.target[1], z: ext.target[2] },
        {
          x: wp.designFront.target[0],
          y: wp.designFront.target[1],
          z: wp.designFront.target[2],
          ease: 'power1.inOut',
          duration: 1,
        },
        0
      );

      // Step 2: Design Side Profile
      masterTl.to(
        camPos.current,
        {
          x: wp.designSide.position[0] * mult,
          y: wp.designSide.position[1],
          z: wp.designSide.position[2] * mult,
          ease: 'power1.inOut',
          duration: 1,
        },
        1
      );
      masterTl.to(
        camTarget.current,
        {
          x: wp.designSide.target[0],
          y: wp.designSide.target[1],
          z: wp.designSide.target[2],
          ease: 'power1.inOut',
          duration: 1,
        },
        1
      );

      // Step 3: Performance Rear Aero Angle
      masterTl.to(
        camPos.current,
        {
          x: wp.performance.position[0] * mult,
          y: wp.performance.position[1],
          z: wp.performance.position[2] * mult,
          ease: 'power1.inOut',
          duration: 1,
        },
        2
      );
      masterTl.to(
        camTarget.current,
        {
          x: wp.performance.target[0],
          y: wp.performance.target[1],
          z: wp.performance.target[2],
          ease: 'power1.inOut',
          duration: 1,
        },
        2
      );

      // Step 4: Colors Studio Showcase
      masterTl.to(
        camPos.current,
        {
          x: wp.colors.position[0] * mult,
          y: wp.colors.position[1],
          z: wp.colors.position[2] * mult,
          ease: 'power1.inOut',
          duration: 1,
        },
        3
      );
      masterTl.to(
        camTarget.current,
        {
          x: wp.colors.target[0],
          y: wp.colors.target[1],
          z: wp.colors.target[2],
          ease: 'power1.inOut',
          duration: 1,
        },
        3
      );

      // Step 5: Specs Overhead Blueprint View
      masterTl.to(
        camPos.current,
        {
          x: wp.specs.position[0],
          y: wp.specs.position[1] * mult,
          z: wp.specs.position[2],
          ease: 'power1.inOut',
          duration: 1,
        },
        4
      );
      masterTl.to(
        camTarget.current,
        {
          x: wp.specs.target[0],
          y: wp.specs.target[1],
          z: wp.specs.target[2],
          ease: 'power1.inOut',
          duration: 1,
        },
        4
      );

      // Step 6: CTA Final Heroic Stance
      masterTl.to(
        camPos.current,
        {
          x: wp.cta.position[0] * mult,
          y: wp.cta.position[1],
          z: wp.cta.position[2] * mult,
          ease: 'power1.inOut',
          duration: 1,
        },
        5
      );
      masterTl.to(
        camTarget.current,
        {
          x: wp.cta.target[0],
          y: wp.cta.target[1],
          z: wp.cta.target[2],
          ease: 'power1.inOut',
          duration: 1,
        },
        5
      );
    });

    return () => {
      ctx.revert();
    };
  }, [carConfig, isMobile, setActiveSection]);

  // Apply camera position, FOV, and subtle pointer parallax on every R3F frame
  useFrame((state, delta) => {
    const ptr = pointerRef.current;
    ptr.smoothX = THREE.MathUtils.lerp(ptr.smoothX, ptr.x, Math.min(1, delta * 5));
    ptr.smoothY = THREE.MathUtils.lerp(ptr.smoothY, ptr.y, Math.min(1, delta * 5));

    const isInterior = heroState === 'interior';
    const parallaxAmp = isReducedMotion ? 0 : isInterior ? 0.35 : 0.14;

    if (isInterior) {
      // Inside cabin: camera stays rooted at seat headrest, target pans with mouse for free-look
      camera.position.set(camPos.current.x, camPos.current.y, camPos.current.z);
      lookAtVec.current.set(
        camTarget.current.x - ptr.smoothX * parallaxAmp,
        camTarget.current.y + ptr.smoothY * (parallaxAmp * 0.65),
        camTarget.current.z
      );
    } else {
      // Exterior: subtle floating orbit offset + subtle idle breathing
      const breath = isReducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.9) * 0.025;
      camera.position.set(
        camPos.current.x + ptr.smoothX * parallaxAmp,
        camPos.current.y + ptr.smoothY * (parallaxAmp * 0.5) + breath,
        camPos.current.z
      );
      lookAtVec.current.set(camTarget.current.x, camTarget.current.y, camTarget.current.z);
    }

    camera.lookAt(lookAtVec.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      if (Math.abs(camera.fov - camFov.current.value) > 0.01) {
        camera.fov = camFov.current.value;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}

