import * as THREE from 'three';

export type MeshPartCategory =
  | 'body'
  | 'doorLeft'
  | 'doorRight'
  | 'wheel'
  | 'glass'
  | 'light'
  | 'trim'
  | 'interior'
  | 'display'
  | 'seat'
  | 'steering'
  | 'ambient';

export interface InspectedNodeRow {
  name: string;
  type: string;
  parent: string;
  bboxMin: string;
  bboxMax: string;
  size: string;
  materials: string;
  category: MeshPartCategory | 'group';
}

export interface DerivedGlbReport {
  modelLabel: string;
  rows: InspectedNodeRow[];
  hasSeparateDoors: boolean;
  doorDiagnostic: string;
  doorLeftNodes: string[];
  doorRightNodes: string[];
  bodyNodes: string[];
  wheelNodes: string[];
  glassNodes: string[];
  lightNodes: string[];
  normalizedScale: number;
  groundOffset: [number, number, number];
}

/**
 * Derive semantic category from a mesh's node name, parent chain, material names, and bounding box.
 */
export function classifyMeshNode(
  mesh: THREE.Mesh,
  localCenter: THREE.Vector3,
  modelCenter: THREE.Vector3
): MeshPartCategory {
  const pathNames: string[] = [];
  let curr: THREE.Object3D | null = mesh;
  while (curr) {
    if (curr.name) pathNames.push(curr.name.toLowerCase());
    curr = curr.parent;
  }
  const combinedName = pathNames.join(' ');

  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const matNames = mats
    .map((m) => (m?.name ? m.name.toLowerCase() : ''))
    .join(' ');
  const token = `${combinedName} ${matNames}`;

  // 1. Doors (must explicitly match door keywords and not be the whole car body)
  if (/\b(door|puerta|portiere|wing_door|door_l|door_r|lf_door|rf_door|doorleft|doorright)\b/i.test(combinedName)) {
    const isLeft =
      /\b(left|l_|_l|fl|rl|lh|driver)\b/i.test(combinedName) ||
      localCenter.x < modelCenter.x;
    return isLeft ? 'doorLeft' : 'doorRight';
  }

  // 2. Glass / Windows / Windshield
  if (/\b(glass|window|windshield|windscreen|canopy|visor|transparent|glazing)\b/i.test(token)) {
    return 'glass';
  }

  // 3. Lights / Emissives / DRL / Headlights / Taillights
  if (/\b(light|headlight|taillight|drl|led|lamp|emissive|glow|neon|signal|brake_light)\b/i.test(token)) {
    return 'light';
  }

  // 4. Ambient interior light strips
  if (/\b(ambient|strip|waveguide|accent_light|cabin_glow)\b/i.test(token)) {
    return 'ambient';
  }

  // 5. Wheels / Tires / Rims / Calipers / Brakes
  if (/\b(wheel|tire|tyre|rim|spoke|caliper|brake|disc|rotor|hub)\b/i.test(token)) {
    return 'wheel';
  }

  // 6. Steering wheel / Yoke
  if (/\b(steer|yoke|volant)\b/i.test(token)) {
    return 'steering';
  }

  // 7. Screens / Displays / HUD / Cluster
  if (/\b(screen|display|monitor|oled|lcd|hud|cluster|infotainment|gauge)\b/i.test(token)) {
    return 'display';
  }

  // 8. Seats / Headrests / Cushions
  if (/\b(seat|chair|headrest|cushion|bolster|leather_seat)\b/i.test(token)) {
    return 'seat';
  }

  // 9. Body Paint / Exterior Shell / Panels / Hood / Fender / Bumper
  if (
    /\b(body|paint|carpaint|shell|chassis_ext|hood|bonnet|fender|bumper|quarter|roof|deck|trunk|boot|skirt|spoiler|wing)\b/i.test(
      token
    )
  ) {
    return 'body';
  }

  // 10. Interior / Dashboard / Console / Cabin
  if (/\b(interior|cabin|dash|console|carpet|alcantara|leather|upholstery|cockpit)\b/i.test(token)) {
    return 'interior';
  }

  return 'trim';
}

/**
 * Inspects a loaded GLB scene, prints a formatted console.table summary of all nodes,
 * normalizes scale and grounding (y = 0), and returns the derived node metadata.
 */
export function inspectAndNormalizeGlb(
  sceneRoot: THREE.Object3D,
  modelLabel: string,
  targetSpanMeters = 4.65
): DerivedGlbReport {
  sceneRoot.updateMatrixWorld(true);

  const overallBox = new THREE.Box3().setFromObject(sceneRoot);
  const overallSize = new THREE.Vector3();
  const overallCenter = new THREE.Vector3();
  overallBox.getSize(overallSize);
  overallBox.getCenter(overallCenter);

  const maxHorizSpan = Math.max(overallSize.x, overallSize.z, 0.001);
  const normalizedScale = targetSpanMeters / maxHorizSpan;

  // Ground the lowest vertex at y = 0 and center horizontally at x = 0, z = 0
  const groundOffset: [number, number, number] = [
    -overallCenter.x * normalizedScale,
    -overallBox.min.y * normalizedScale,
    -overallCenter.z * normalizedScale,
  ];

  const rows: InspectedNodeRow[] = [];
  const doorLeftNodes: string[] = [];
  const doorRightNodes: string[] = [];
  const bodyNodes: string[] = [];
  const wheelNodes: string[] = [];
  const glassNodes: string[] = [];
  const lightNodes: string[] = [];

  sceneRoot.traverse((node) => {
    const parentName = node.parent?.name || 'ROOT';

    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const matNames = mats.map((m) => m?.name || m?.type || 'UnnamedMat').join(', ');

      const category = classifyMeshNode(mesh, center, overallCenter);
      const nodeName = mesh.name || `Mesh_${mesh.id}`;

      if (category === 'doorLeft') doorLeftNodes.push(nodeName);
      else if (category === 'doorRight') doorRightNodes.push(nodeName);
      else if (category === 'body') bodyNodes.push(nodeName);
      else if (category === 'wheel') wheelNodes.push(nodeName);
      else if (category === 'glass') glassNodes.push(nodeName);
      else if (category === 'light') lightNodes.push(nodeName);

      rows.push({
        name: nodeName,
        type: mesh.type,
        parent: parentName,
        bboxMin: `[${box.min.x.toFixed(2)}, ${box.min.y.toFixed(2)}, ${box.min.z.toFixed(2)}]`,
        bboxMax: `[${box.max.x.toFixed(2)}, ${box.max.y.toFixed(2)}, ${box.max.z.toFixed(2)}]`,
        size: `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`,
        materials: matNames,
        category,
      });
    } else {
      rows.push({
        name: node.name || `Node_${node.id}`,
        type: node.type,
        parent: parentName,
        bboxMin: '-',
        bboxMax: '-',
        size: '-',
        materials: '-',
        category: 'group',
      });
    }
  });

  const hasSeparateDoors = doorLeftNodes.length > 0 || doorRightNodes.length > 0;
  const doorDiagnostic = hasSeparateDoors
    ? `Separate door nodes detected (Left: ${doorLeftNodes.length}, Right: ${doorRightNodes.length}). Hinge pivot groups created at leading door edges.`
    : `No separate door nodes found in ${modelLabel} (doors are merged into the body mesh). Door rotation is skipped as requested instead of faking it.`;

  if (typeof window !== 'undefined') {
    console.groupCollapsed(
      `%c[VANTA GLB Inspector] ${modelLabel} (${rows.length} nodes | scale=${normalizedScale.toFixed(3)})`,
      'color: #00f0ff; font-weight: bold;'
    );
    console.table(rows);
    console.info(`[VANTA Door Diagnostic] ${doorDiagnostic}`);
    console.groupEnd();
  }

  return {
    modelLabel,
    rows,
    hasSeparateDoors,
    doorDiagnostic,
    doorLeftNodes,
    doorRightNodes,
    bodyNodes,
    wheelNodes,
    glassNodes,
    lightNodes,
    normalizedScale,
    groundOffset,
  };
}

