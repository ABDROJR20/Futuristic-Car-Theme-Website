'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  CAR_LINEUP,
  CameraPose,
  CameraViewKey,
  INTERIOR_HOTSPOTS,
} from '@/lib/carConfig';
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

let activeFlyToHandler: ((opts: FlyToOptions) => void) | null = null;
let activeEnterInteriorHandler: (() => void) | null = null;
let activeExitInteriorHandler: (() => void) | null = null;

export function flyTo(options: FlyToOptions) {
  if (activeFlyToHandler) {
    activeFlyToHandler(options);
  }
}

export function triggerEnterInterior() {
  if (activeEnterInteriorHandler) {
    activeEnterInteriorHandler();
  }
}

export function triggerExitInterior() {
  if (activeExitInteriorHandler) {
    activeExitInteriorHandler();
  }
}

export default function CameraRig() {
  const { camera, gl } = useThree();
  const heroState = useVantaStore((s) => s.heroState);
  const activeCar = useVantaStore((s) => s.activeCar);
  const interiorSeat = useVantaStore((s) => s.interiorSeat);
  const activeHotspotId = useVantaStore((s) => s.activeHotspotId);
  const isReducedMotion = useVantaStore((s) => s.isReducedMotion);
  const isMobile = useVantaStore((s) => s.isMobile);

  const setHeroState = useVantaStore((s) => s.setHeroState);
  const setActiveScene = useVantaStore((s) => s.setActiveScene);
  const setTransitionPhase = useVantaStore((s) => s.setTransitionPhase);
  const setActiveSection = useVantaStore((s) => s.setActiveSection);
  const setInteriorSeat = useVantaStore((s) => s.setInteriorSeat);
  const setActiveHotspotId = useVantaStore((s) => s.setActiveHotspotId);
  const toggleInteriorSeat = useVantaStore((s) => s.toggleInteriorSeat);

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

  // Pointer coordinates for subtle idle parallax
  const pointerRef = useRef({ x: 0, y: 0, smoothX: 0, smoothY: 0 });

  // 360° Interior drag look-around state (yaw unrestricted, pitch clamped -60° to +60°)
  const interiorLookRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    targetYaw: 0,
    targetPitch: -0.05,
    currentYaw: 0,
    currentPitch: -0.05,
  });

  // Hotspot nudge offset
  const nudgeOffsetRef = useRef({ x: 0, y: 0, z: 0 });
  const lookAtVec = useRef(new THREE.Vector3());
  const isScrollingBelowHero = useRef(false);

  /**
   * Core camera transition helper: kills conflicting tweens before starting a new one.
   */
  const executeFlyTo = useCallback(
    ({
      position,
      target,
      fov = 45,
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

  /**
   * Helper to fly to one of the 4 predefined views: exterior, doorsOpen, driverSeat, rearSeat
   */
  const flyToPredefinedView = useCallback(
    (
      view: CameraViewKey,
      overrides?: Partial<Pick<FlyToOptions, 'duration' | 'ease' | 'onComplete'>>
    ) => {
      const pose: CameraPose = carConfig.cameras[view];
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

  /**
   * Two-scene transition: Exterior -> Cabin Fly-Through (1.6s, power3.inOut, FOV 45 -> 70)
   * with blur/vignette + flash/dissolve swap to /models/interior.glb
   */
  const handleEnterInterior = useCallback(() => {
    const state = useVantaStore.getState();
    if (state.heroState === 'interior' || state.transitionPhase !== 'none') return;

    setInteriorSeat('driver');
    setActiveHotspotId(null);
    interiorLookRef.current.targetYaw = 0;
    interiorLookRef.current.currentYaw = 0;
    interiorLookRef.current.targetPitch = -0.04;
    interiorLookRef.current.currentPitch = -0.04;

    if (isReducedMotion) {
      setActiveScene('interior');
      setHeroState('interior');
      setTransitionPhase('none');
      flyToPredefinedView('driverSeat', { duration: 0 });
      return;
    }

    setTransitionPhase('entering-fly');

    const driverPose = carConfig.cameras.driverSeat;
    // Fly from exterior into cabin threshold over 1.6s, widening FOV 45 -> 70
    executeFlyTo({
      position: [driverPose.position[0], driverPose.position[1] + 0.05, driverPose.position[2] + 0.15],
      target: driverPose.target,
      fov: 70,
      duration: 1.6,
      ease: 'power3.inOut',
    });

    // Trigger quick flash/dissolve near the end of the camera fly-through and swap scene
    gsap.delayedCall(1.22, () => {
      setTransitionPhase('flash-swap');
      gsap.delayedCall(0.22, () => {
        setActiveScene('interior');
        setHeroState('interior');
        camPos.current.x = driverPose.position[0];
        camPos.current.y = driverPose.position[1];
        camPos.current.z = driverPose.position[2];
        camTarget.current.x = driverPose.target[0];
        camTarget.current.y = driverPose.target[1];
        camTarget.current.z = driverPose.target[2];
        camFov.current.value = 70;
      });
      gsap.delayedCall(0.55, () => {
        setTransitionPhase('none');
      });
    });
  }, [
    carConfig,
    executeFlyTo,
    flyToPredefinedView,
    isReducedMotion,
    setActiveHotspotId,
    setActiveScene,
    setHeroState,
    setInteriorSeat,
    setTransitionPhase,
  ]);

  /**
   *  Interior -> Exterior with doors closing
   */
  const handleExitInterior = useCallback(() => {
    const state = useVantaStore.getState();
    if (state.heroState !== 'interior') return;

    setActiveHotspotId(null);

    if (isReducedMotion) {
      setActiveScene('exterior');
      setTransitionPhase('none');
      setHeroState('idle');
      flyToPredefinedView('exterior', { duration: 0 });
      return;
    }

    setTransitionPhase('exiting-flash');
    setHeroState('exiting');

    gsap.delayedCall(0.2, () => {
      setActiveScene('exterior');
      const doorsPose = carConfig.cameras.doorsOpen;
      camPos.current.x = doorsPose.position[0] * 0.65;
      camPos.current.y = doorsPose.position[1] * 0.85;
      camPos.current.z = doorsPose.position[2] * 0.65;
      camFov.current.value = 65;

      flyToPredefinedView('exterior', {
        duration: 1.45,
        ease: 'power3.inOut',
        onComplete: () => {
          setHeroState('idle');
          setTransitionPhase('none');
        },
      });
    });
  }, [
    carConfig,
    flyToPredefinedView,
    isReducedMotion,
    setActiveHotspotId,
    setActiveScene,
    setHeroState,
    setTransitionPhase,
  ]);

  // Register global handlers
  useEffect(() => {
    activeFlyToHandler = executeFlyTo;
    activeEnterInteriorHandler = handleEnterInterior;
    activeExitInteriorHandler = handleExitInterior;
    return () => {
      activeFlyToHandler = null;
      activeEnterInteriorHandler = null;
      activeExitInteriorHandler = null;
    };
  }, [executeFlyTo, handleEnterInterior, handleExitInterior]);

  // Pointer & 360° Drag Look-Around listeners (Mouse + Touch for Mobile/Tablet)
  useEffect(() => {
    const domElement = gl.domElement;
    domElement.style.touchAction = 'pan-y';

    const onPointerDown = (e: PointerEvent) => {
      if (useVantaStore.getState().heroState !== 'interior') return;
      domElement.style.touchAction = 'none';
      interiorLookRef.current.isDragging = true;
      interiorLookRef.current.lastX = e.clientX;
      interiorLookRef.current.lastY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (interiorLookRef.current.isDragging && useVantaStore.getState().heroState === 'interior') {
        const dx = e.clientX - interiorLookRef.current.lastX;
        const dy = e.clientY - interiorLookRef.current.lastY;
        interiorLookRef.current.lastX = e.clientX;
        interiorLookRef.current.lastY = e.clientY;

        // Full 360° yaw (unrestricted), pitch clamped to -60°..+60° (-Math.PI/3 .. +Math.PI/3)
        const sensitivity = e.pointerType === 'touch' ? 0.006 : 0.0045;
        interiorLookRef.current.targetYaw -= dx * sensitivity;
        const maxPitch = Math.PI / 3; // 60 degrees
        interiorLookRef.current.targetPitch = THREE.MathUtils.clamp(
          interiorLookRef.current.targetPitch - dy * sensitivity,
          -maxPitch,
          maxPitch
        );
      }
    };

    const onPointerUp = () => {
      interiorLookRef.current.isDragging = false;
      if (useVantaStore.getState().heroState !== 'interior') {
        domElement.style.touchAction = 'pan-y';
      }
    };

    domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [gl.domElement]);

  // Keyboard shortcuts inside the car: ArrowDown / S for rear/front seat toggle, ESC to exit
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (useVantaStore.getState().heroState !== 'interior') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleExitInterior();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        toggleInteriorSeat();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleExitInterior, toggleInteriorSeat]);

  // React to heroState & interiorSeat changes
  useEffect(() => {
    if (isScrollingBelowHero.current && heroState === 'idle') return;

    if (heroState === 'assembling') {
      const ext = carConfig.cameras.exterior;
      const mult = isMobile ? 1.3 : 1;
      executeFlyTo({
        position: [
          ext.position[0] * 1.15 * mult,
          ext.position[1] * 1.18,
          ext.position[2] * 1.15 * mult,
        ],
        target: ext.target,
        fov: ext.fov + 3,
        duration: 1.2,
        ease: 'power2.out',
      });
    } else if (heroState === 'idle') {
      flyToPredefinedView('exterior', { duration: 1.15, ease: 'power3.out' });
    } else if (heroState === 'doorsOpen') {
      flyToPredefinedView('doorsOpen', { duration: 0.9, ease: 'power2.out' });
    } else if (heroState === 'interior') {
      const targetView: CameraViewKey = interiorSeat === 'rear' ? 'rearSeat' : 'driverSeat';
      flyToPredefinedView(targetView, { duration: 1.1, ease: 'power3.inOut' });
    }
  }, [heroState, interiorSeat, activeCar, carConfig, executeFlyTo, flyToPredefinedView, isMobile]);

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

  // Frame loop: apply position, FOV, 360° damped interior look, hotspot nudge & idle parallax
  useFrame((state, delta) => {
    const ptr = pointerRef.current;
    const damp = Math.min(1, delta * 6);
    ptr.smoothX = THREE.MathUtils.lerp(ptr.smoothX, ptr.x, damp);
    ptr.smoothY = THREE.MathUtils.lerp(ptr.smoothY, ptr.y, damp);

    const isInterior = heroState === 'interior';

    if (isInterior) {
      const look = interiorLookRef.current;
      look.currentYaw = THREE.MathUtils.lerp(look.currentYaw, look.targetYaw, damp);
      look.currentPitch = THREE.MathUtils.lerp(look.currentPitch, look.targetPitch, damp);

      // Subtle mouse parallax when not actively dragging
      const idleYawOffset = look.isDragging ? 0 : -ptr.smoothX * 0.08;
      const idlePitchOffset = look.isDragging ? 0 : ptr.smoothY * 0.05;

      const finalYaw = look.currentYaw + idleYawOffset;
      const finalPitch = THREE.MathUtils.clamp(
        look.currentPitch + idlePitchOffset,
        -Math.PI / 3,
        Math.PI / 3
      );

      // Compute spherical look direction vector from seat headrest position
      const dirX = Math.sin(finalYaw) * Math.cos(finalPitch);
      const dirY = Math.sin(finalPitch);
      const dirZ = Math.cos(finalYaw) * Math.cos(finalPitch);

      // Gentle camera nudge toward hovered hotspot
      const hoveredHotspot = activeHotspotId
        ? INTERIOR_HOTSPOTS.find((h) => h.id === activeHotspotId)
        : null;

      const targetNudgeX = hoveredHotspot
        ? (hoveredHotspot.nudgeTarget[0] - camPos.current.x) * 0.22
        : 0;
      const targetNudgeY = hoveredHotspot
        ? (hoveredHotspot.nudgeTarget[1] - camPos.current.y) * 0.22
        : 0;
      const targetNudgeZ = hoveredHotspot
        ? (hoveredHotspot.nudgeTarget[2] - (camPos.current.z + 1.0)) * 0.22
        : 0;

      nudgeOffsetRef.current.x = THREE.MathUtils.lerp(nudgeOffsetRef.current.x, targetNudgeX, damp);
      nudgeOffsetRef.current.y = THREE.MathUtils.lerp(nudgeOffsetRef.current.y, targetNudgeY, damp);
      nudgeOffsetRef.current.z = THREE.MathUtils.lerp(nudgeOffsetRef.current.z, targetNudgeZ, damp);

      camera.position.set(camPos.current.x, camPos.current.y, camPos.current.z);
      lookAtVec.current.set(
        camPos.current.x + dirX * 1.5 + nudgeOffsetRef.current.x,
        camPos.current.y + dirY * 1.5 + nudgeOffsetRef.current.y,
        camPos.current.z + dirZ * 1.5 + nudgeOffsetRef.current.z
      );
    } else {
      const parallaxAmp = isReducedMotion ? 0 : 0.14;
      const breath = isReducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.9) * 0.02;

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
