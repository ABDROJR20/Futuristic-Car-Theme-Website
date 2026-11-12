# VANTA // Futuristic Electric Hypercar Experience

An interactive, single-page 3D automotive web experience built for the fictional electric hypercar brand **VANTA** (`VANTA ZERO-X`). Featuring a persistent full-viewport WebGL canvas, real Sketchfab GLB 3D models (`exterior.glb` & `interior.glb`), autonomous multi-part assembly animations, a cinematic two-scene exterior-to-cockpit fly-through transition, 360° interactive cabin look-around, and GSAP ScrollTrigger camera choreography.

---

## ✨ Key Features Completed

### 1. Real 3D GLB Models & Automated Sketchfab Pipeline
- **Exterior Hero Hypercar (`public/models/exterior.glb`)**: *"FREE Concept Car 002 - public domain (CC0)"* (3.45 MB) with auto-normalized scale (`4.4m` target length), grounded wheels (`y = 0`), and real mesh node classification.
- **Interior Cockpit Scene (`public/models/interior.glb`)**: *"Spaceship 001 - Cockpit Concept"* (7.02 MB, CC-BY 4.0) filtered of outlier room/mannequin nodes, centered directly in front of the driver seat, and augmented with architectural cockpit surfaces aligned to 7 interactive hotspots.
- **Automated CLI Tools**:
  - `scripts/fetch-models.mjs`: Authenticates against the Sketchfab v3 API using `SKETCHFAB_TOKEN` from `.env.local`, downloads model archives, packs `.gltf` + `.bin` + textures into single binary `.glb` files, and records attribution in `public/models/CREDITS.md`.
  - `scripts/inspect-glb.mjs` & `lib/glbInspector.ts`: Traverses every node in both `.glb` files, logs bounding boxes and material names, and populates `lib/carConfig.ts`.

### 2. Autonomous Part-by-Part Assembly Animation
- On initial load (after the `000% → 100%` `Preloader` sequence) or when clicking **REPLAY ASSEMBLY**, the exterior `.glb` model's real mesh nodes scatter into exploded vectors and smoothly assemble into their original transforms over `~2.2s` with `power3.out` easing, followed by a cyan emissive headlight pulse.

### 3. Premium PBR Automotive Materials & Studio Lighting
- **Body Paint**: Upgraded dynamically to `THREE.MeshPhysicalMaterial` (`clearcoat: 1.0`, `clearcoatRoughness: 0.05`, `metalness: 0.9`, `roughness: 0.25`, `envMapIntensity: 1.5`).
- **Tinted Glass**: Physical transmission & dark specular tint (`glass1_0`, `glass2_0`, `glass3_0`).
- **Wheels & Accents**: Dark satin alloy rims with subtle pulsing cyan emissive accent rings and light strips.
- **Lighting**: `@react-three/drei` `Environment` (`city` HDRI preset), directional key light, cyan rim light, interior point/hemisphere illumination, and soft `ContactShadows`.

### 4. Two-Scene Exterior → 360° Cockpit Transition
- **Interactive Entry**: Hovering/tapping the car reveals the pulsing **ENTER COCKPIT** hotspot pin (projected at 60fps from 3D world space onto the DOM with zero React 19 `<Html>` portal unmount issues).
- **Fly-Through Transition**: Clicking **ENTER COCKPIT** triggers a `1.6s` `power3.inOut` camera trajectory into the cabin while widening FOV from `45° → 70°`, applying a vignette blur and flash dissolve before swapping to the interior scene.
- **Full 360° Look-Around**: Dragging with mouse or touch inside the cockpit rotates yaw a full `360°` and pitches `-60°` to `+60°` with smooth damping and idle pointer parallax.
- **7 Interactive Interior Hotspots**:
  1. **Steering Yoke** (Steer-by-wire ratio `9.5:1`, haptic thumb pods, biometric grip sensors)
  2. **15.4" Center OLED Display** (3K curved OLED, real-time 3D telemetry & route planner)
  3. **12.3" Digital Instrument Cluster** (Speed, power flow, G-meter, AR lane overlay)
  4. **Floating Carbon Center Console** (Crystal drive selector, dual 15W MagSafe pads, capacitive climate bar)
  5. **Sculpted Nappa Leather Bucket Seats** (Carbon shell, 18-way bolster, heating/ventilation, illuminated VANTA crest)
  6. **Door Panels & Sound** (22-speaker 1,600W spatial audio array, micro-suede inserts)
  7. **Ambient Lighting & Panoramic Glass Roof** (64-color fiber-optic waveguides, electrochromic UV-99.9% tint)
- **Driver / Rear Seat Toggle & Exit**:
  - Click **BACK (REAR SEAT)** or press `ArrowDown` / `S` to smoothly glide between the Driver Command seat and Rear Executive Lounge.
  - Click **EXIT CABIN ✕** or press `ESC` to reverse the transition back to the exterior view and re-enable Lenis smooth scrolling.

### 5. Full Desktop, Tablet & Mobile Responsiveness
- **Navbar**: Skiper UI `Link000` & `Link004` animated links on desktop + glassmorphic hamburger drawer on mobile/tablet with quick **ENTER COCKPIT** action.
- **Adaptive Camera Framing**: Automatically scales camera distance on mobile/tablet viewports (`isMobile`) and supports touch-drag (`pointerType === 'touch'`) inside the 360° cockpit.
- **Responsive HUD & Cards**: Fluid typography, scrollable hotspot category pills on mobile/tablet, and compact telemetry bar.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16.4.6 (App Router, Turbopack) + React 19.3.0 + TypeScript
- **3D Engine**: Three.js (`three`), `@react-three/fiber`, `@react-three/drei` (GLTF + Google Draco decoder)
- **Animation & Scroll**: GSAP (`gsap`, `ScrollTrigger`) + `lenis` smooth scrolling
- **State Management**: `zustand` (`store/useVantaStore.ts`)
- **Styling & UI**: Tailwind CSS v4, `shadcn/ui`, `framer-motion`, Skiper UI (`components/ui/skiper-ui/skiper40.tsx`)

---

## 📁 Project Structure

```text
vanta-ev/
├── app/
│   ├── globals.css                  # Tailwind v4 theme, custom fonts & utility styles
│   ├── layout.tsx                   # Root layout with Orbitron, Inter & JetBrains Mono fonts
│   └── page.tsx                     # Single-page orchestration (Preloader, Navbar, 3D Canvas, Sections)
├── components/
│   ├── canvas/
│   │   ├── CameraRig.tsx            # Single source of truth for camera (flyTo, ScrollTrigger, 360° look)
│   │   ├── ExteriorCar.tsx          # /models/exterior.glb loader, PBR materials & assembly animation
│   │   ├── GlbErrorBoundary.tsx     # Graceful WebGL error boundary for GLTF loading
│   │   ├── InteriorScene.tsx        # /models/interior.glb normalization, cockpit lighting & 7 hotspots
│   │   ├── Scene.tsx                # R3F Canvas, HDRI Environment, ContactShadows & scene switcher
│   │   └── SceneWrapper.tsx         # Dynamic client-only wrapper for the fixed 3D Canvas
│   ├── providers/
│   │   └── SmoothScrollProvider.tsx # Lenis smooth scroll synced with GSAP ticker (auto-stops in cabin)
│   ├── sections/
│   │   ├── HeroSection.tsx          # Hero telemetry HUD, giant backdrop title & 3D cabin hotspot
│   │   └── ScrollSections.tsx       # Design, Performance, Colors, Specs & CTA scroll sections
│   └── ui/
│       ├── InteriorHUD.tsx          # Cockpit HUD, 7 hotspot spec cards, seat toggle & transition flash
│       ├── Navbar.tsx               # Fixed glassmorphic navbar with Skiper40 links + mobile drawer
│       ├── Preloader.tsx            # 000% -> 100% matrix calibration preloader
│       └── skiper-ui/
│           └── skiper40.tsx         # Skiper UI animated underline links (Link000 - Link005)
├── lib/
│   ├── carConfig.ts                 # Derived GLB node map, camera poses, scroll waypoints & hotspots
│   ├── glbInspector.ts              # Runtime GLB hierarchy & bounding-box inspector
│   └── utils.ts                     # Tailwind class merge helper
├── public/
│   └── models/
│       ├── exterior.glb             # Real 3D exterior concept car model
│       ├── interior.glb             # Real 3D futuristic cockpit model
│       └── CREDITS.md               # CC0 & CC-BY 4.0 model attributions
├── scripts/
│   ├── fetch-models.mjs             # Automated Sketchfab API downloader & GLB packer
│   └── inspect-glb.mjs              # Node CLI inspector for GLB node & material tables
└── store/
    └── useVantaStore.ts             # Zustand state machine (heroState, activeScene, seat, hotspots)
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd vanta-ev
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Inspect or Re-fetch 3D Models (Optional)

To inspect the node hierarchy and bounding boxes of `public/models/exterior.glb` and `public/models/interior.glb`:

```bash
node scripts/inspect-glb.mjs
```

To fetch fresh models from Sketchfab (requires `SKETCHFAB_TOKEN` in `vanta-ev/.env.local`):

```bash
node scripts/fetch-models.mjs
```

---

## 📜 3D Model Credits

See [`public/models/CREDITS.md`](./public/models/CREDITS.md) for full details:
- **Exterior (`exterior.glb`)**: *"FREE Concept Car 002 - public domain (CC0)"* by **Unity Fan youtube channel** — Public Domain (CC0).
- **Interior (`interior.glb`)**: *"Spaceship 001 - Cockpit Concept"* by **Mixmamo.studio** — CC-BY-4.0.
