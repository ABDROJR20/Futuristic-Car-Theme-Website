#!/usr/bin/env node
/**
 * CLI Inspector for /public/models/exterior.glb and /public/models/interior.glb
 * Parses the binary GLB JSON chunk directly (zero browser dependency), prints a summary
 * table of every node (name, type, parent, bounding box, and material names), and
 * reports whether separate door nodes exist.
 */
import fs from 'node:fs';
import path from 'node:path';

const MODELS_DIR = path.resolve(import.meta.dirname, '..', 'public', 'models');
const FILES = ['exterior.glb', 'interior.glb'];

function parseGlbJsonChunk(filePath) {
  const buffer = fs.readFileSync(filePath);
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) {
    throw new Error(`Invalid GLB header in ${filePath}`);
  }
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);
  if (jsonChunkType !== 0x4e4f534a) {
    throw new Error(`First chunk is not JSON in ${filePath}`);
  }
  const jsonText = buffer.subarray(20, 20 + jsonChunkLength).toString('utf8');
  return JSON.parse(jsonText);
}

function inspectGlbFile(fileName) {
  const fullPath = path.join(MODELS_DIR, fileName);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[GLB Inspector] ⚠️ Missing file: ${fullPath}`);
    return null;
  }

  const gltf = parseGlbJsonChunk(fullPath);
  const nodes = gltf.nodes || [];
  const meshes = gltf.meshes || [];
  const materials = gltf.materials || [];
  const accessors = gltf.accessors || [];

  // Map child -> parent index
  const parentMap = new Map();
  nodes.forEach((node, idx) => {
    if (Array.isArray(node.children)) {
      node.children.forEach((childIdx) => parentMap.set(childIdx, idx));
    }
  });

  const rows = nodes.map((node, idx) => {
    const parentIdx = parentMap.get(idx);
    const parentName = parentIdx !== undefined ? nodes[parentIdx]?.name || `Node_${parentIdx}` : 'ROOT';
    const hasMesh = node.mesh !== undefined;
    const meshObj = hasMesh ? meshes[node.mesh] : null;

    const matNames = new Set();
    let minVec = [Infinity, Infinity, Infinity];
    let maxVec = [-Infinity, -Infinity, -Infinity];

    if (meshObj && Array.isArray(meshObj.primitives)) {
      for (const prim of meshObj.primitives) {
        if (prim.material !== undefined && materials[prim.material]) {
          matNames.add(materials[prim.material].name || `Material_${prim.material}`);
        }
        const posAccIdx = prim.attributes?.POSITION;
        if (posAccIdx !== undefined && accessors[posAccIdx]) {
          const acc = accessors[posAccIdx];
          if (Array.isArray(acc.min) && Array.isArray(acc.max)) {
            for (let i = 0; i < 3; i++) {
              minVec[i] = Math.min(minVec[i], acc.min[i]);
              maxVec[i] = Math.max(maxVec[i], acc.max[i]);
            }
          }
        }
      }
    }

    const bboxStr =
      minVec[0] !== Infinity
        ? `[${minVec.map((n) => n.toFixed(2)).join(', ')}] -> [${maxVec.map((n) => n.toFixed(2)).join(', ')}]`
        : 'N/A';

    return {
      index: idx,
      name: node.name || `Node_${idx}`,
      type: hasMesh ? 'Mesh' : 'Group/Object3D',
      parent: parentName,
      boundingBox: bboxStr,
      materials: Array.from(matNames).join(', ') || '-',
    };
  });

  console.log(`\n======================================================================`);
  console.log(`GLB INSPECTION SUMMARY: ${fileName} (${rows.length} nodes)`);
  console.log(`======================================================================`);
  console.table(rows);

  const doorNodes = rows.filter((r) => /door/i.test(r.name));
  console.log(
    doorNodes.length > 0
      ? `✅ Separate door nodes detected (${doorNodes.length}): ${doorNodes.map((d) => d.name).join(', ')}`
      : `⚠️ No separate door nodes found in ${fileName} (doors are merged or named differently).`
  );

  return rows;
}

for (const file of FILES) {
  inspectGlbFile(file);
}

