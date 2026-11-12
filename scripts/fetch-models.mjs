#!/usr/bin/env node
/**
 * VANTA Automated Sketchfab 3D Model Fetcher & GLTF-to-GLB Packer
 * - Reads SKETCHFAB_TOKEN from .env.local (never prints it)
 * - Evaluates exterior candidates & searches for CC0 / CC-BY / CC-BY-SA interior models
 * - Downloads glTF archives, converts .gltf + .bin + textures into single .glb files
 * - Strips real car brand names/logos (fictional brand is VANTA)
 * - Inspects node trees (doors, wheels, interior parts) and writes public/models/CREDITS.md
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env.local');
const MODELS_DIR = path.join(ROOT_DIR, 'public', 'models');
const CREDITS_PATH = path.join(MODELS_DIR, 'CREDITS.md');

function loadSketchfabToken() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`Missing .env.local at ${ENV_PATH}`);
  }
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).trim();
    }
    if (key === 'SKETCHFAB_TOKEN' && val) {
      return val;
    }
  }
  throw new Error('SKETCHFAB_TOKEN not found or empty in .env.local');
}

function extractModelUid(url) {
  const clean = url.split('?')[0].replace(/\/+$/, '');
  const lastSegment = clean.split('/').pop() || '';
  const parts = lastSegment.split('-');
  return parts[parts.length - 1];
}

async function fetchJson(url, token = null) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Token ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    const err = new Error(
      `HTTP ${res.status} (${res.statusText}) for ${url}: ${bodyText.slice(0, 200)}`
    );
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download archive HTTP ${res.status} from ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

const BRAND_REGEX =
  /\b(audi|bmw|mercedes|benz|porsche|tesla|lamborghini|ferrari|bugatti|mclaren|bentley|lexus|toyota|ford|chevrolet|nissan|volkswagen|vw|aston|maserati|jaguar)\b/gi;

function packGltfToGlb(gltfFilePath, outGlbPath) {
  const baseDir = path.dirname(gltfFilePath);
  const gltf = JSON.parse(fs.readFileSync(gltfFilePath, 'utf8'));

  const binaryChunks = [];
  let totalBinByteLength = 0;

  const appendAlignedBuffer = (buf) => {
    const offset = totalBinByteLength;
    const byteLength = buf.length;
    binaryChunks.push(buf);
    totalBinByteLength += byteLength;
    const remainder = totalBinByteLength % 4;
    if (remainder !== 0) {
      const pad = 4 - remainder;
      binaryChunks.push(Buffer.alloc(pad, 0));
      totalBinByteLength += pad;
    }
    return { byteOffset: offset, byteLength };
  };

  if (Array.isArray(gltf.buffers) && gltf.buffers.length > 0) {
    const primaryBufDef = gltf.buffers[0];
    if (primaryBufDef.uri) {
      if (primaryBufDef.uri.startsWith('data:')) {
        const base64Data = primaryBufDef.uri.split(',')[1];
        appendAlignedBuffer(Buffer.from(base64Data, 'base64'));
      } else {
        const binPath = path.join(baseDir, decodeURIComponent(primaryBufDef.uri));
        if (fs.existsSync(binPath)) {
          appendAlignedBuffer(fs.readFileSync(binPath));
        }
      }
      delete primaryBufDef.uri;
    }
  }

  gltf.bufferViews = gltf.bufferViews || [];

  if (Array.isArray(gltf.images)) {
    for (const img of gltf.images) {
      if (img.uri && !img.uri.startsWith('data:')) {
        const imgPath = path.join(baseDir, decodeURIComponent(img.uri));
        if (fs.existsSync(imgPath)) {
          const imgBuf = fs.readFileSync(imgPath);
          const { byteOffset, byteLength } = appendAlignedBuffer(imgBuf);
          const bufferViewIndex = gltf.bufferViews.length;
          gltf.bufferViews.push({
            buffer: 0,
            byteOffset,
            byteLength,
          });
          img.bufferView = bufferViewIndex;
          img.mimeType = img.mimeType || getMimeType(imgPath);
          delete img.uri;
        }
      }
    }
  }

  // Strip real car brand names from nodes, meshes, and materials
  if (Array.isArray(gltf.nodes)) {
    for (const n of gltf.nodes) {
      if (n.name) n.name = n.name.replace(BRAND_REGEX, 'VANTA');
    }
  }
  if (Array.isArray(gltf.meshes)) {
    for (const m of gltf.meshes) {
      if (m.name) m.name = m.name.replace(BRAND_REGEX, 'VANTA');
    }
  }
  if (Array.isArray(gltf.materials)) {
    for (const m of gltf.materials) {
      if (m.name) m.name = m.name.replace(BRAND_REGEX, 'VANTA');
    }
  }

  gltf.buffers = [{ byteLength: totalBinByteLength }];

  const jsonString = JSON.stringify(gltf);
  let jsonBuffer = Buffer.from(jsonString, 'utf8');
  const jsonRem = jsonBuffer.length % 4;
  if (jsonRem !== 0) {
    const pad = Buffer.alloc(4 - jsonRem, 0x20);
    jsonBuffer = Buffer.concat([jsonBuffer, pad]);
  }

  const binBuffer = Buffer.concat(binaryChunks);

  const header = Buffer.alloc(12);
  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4);

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuffer.length, 0);
  binChunkHeader.writeUInt32LE(0x004e4942, 4);

  const finalGlb = Buffer.concat([
    header,
    jsonChunkHeader,
    jsonBuffer,
    binChunkHeader,
    binBuffer,
  ]);

  fs.writeFileSync(outGlbPath, finalGlb);
  return { fileSizeBytes: finalGlb.length, gltfJson: gltf };
}

function findFileRecursive(dir, extList) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = findFileRecursive(full, extList);
      if (sub) return sub;
    } else if (extList.includes(path.extname(e.name).toLowerCase())) {
      return full;
    }
  }
  return null;
}

function analyzeGlbStructure(glbPath) {
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const nodes = gltf.nodes || [];
  const meshes = gltf.meshes || [];
  const materials = gltf.materials || [];

  const nodeNames = nodes.map((n, i) => n.name || `Node_${i}`);
  const matNames = materials.map((m, i) => m.name || `Mat_${i}`);
  const allTokens = [...nodeNames, ...matNames].join(' ');

  const doorNodes = nodeNames.filter((n) =>
    /\b(door|puerta|portiere|wing_door|door_l|door_r)\b/i.test(n)
  );
  const wheelNodes = nodeNames.filter((n) =>
    /\b(wheel|tire|tyre|rim|caliper|brake|roue|rubber|metal2)\b/i.test(n)
  );

  const hasSeat = /seat|chair|cushion|leather/i.test(allTokens);
  const hasDash = /dash|console|cockpit|panel|cabin|interior/i.test(allTokens);
  const hasSteering = /steer|wheel|yoke|control|stick|helm/i.test(allTokens);
  const hasDisplay = /screen|display|monitor|hud|glass|gauge|instrument/i.test(allTokens);
  const interiorScore =
    (hasSeat ? 1 : 0) + (hasDash ? 1 : 0) + (hasSteering ? 1 : 0) + (hasDisplay ? 1 : 0);

  return {
    nodeCount: nodes.length,
    meshCount: meshes.length,
    materialCount: materials.length,
    doorNodes,
    wheelNodes,
    hasSeparateDoors: doorNodes.length > 0,
    hasSeparateWheels: wheelNodes.length > 0,
    hasSeat,
    hasDash,
    hasSteering,
    hasDisplay,
    interiorScore,
    fileSizeMB: +(buf.length / (1024 * 1024)).toFixed(2),
  };
}

async function downloadAndConvertModel(uid, token, targetGlbPath) {
  const downloadInfo = await fetchJson(
    `https://api.sketchfab.com/v3/models/${uid}/download`,
    token
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `vanta-sf-${uid}-`));

  try {
    if (downloadInfo.gltf && downloadInfo.gltf.url) {
      const zipPath = path.join(tmpDir, 'archive.zip');
      console.log(
        `  ↳ Downloading glTF zip archive (${(downloadInfo.gltf.size / (1024 * 1024)).toFixed(2)} MB)...`
      );
      await downloadFile(downloadInfo.gltf.url, zipPath);

      const extractDir = path.join(tmpDir, 'extracted');
      fs.mkdirSync(extractDir, { recursive: true });
      execFileSync('tar.exe', ['-xf', zipPath, '-C', extractDir]);

      const foundGltf = findFileRecursive(extractDir, ['.gltf']);
      if (foundGltf) {
        console.log(
          `  ↳ Packing ${path.basename(foundGltf)} + .bin + textures into single binary .glb...`
        );
        packGltfToGlb(foundGltf, targetGlbPath);
      } else {
        const foundGlb = findFileRecursive(extractDir, ['.glb']);
        if (!foundGlb) throw new Error('No .gltf or .glb found inside downloaded archive');
        fs.copyFileSync(foundGlb, targetGlbPath);
      }
    } else if (downloadInfo.glb && downloadInfo.glb.url) {
      console.log(
        `  ↳ Downloading direct .glb (${(downloadInfo.glb.size / (1024 * 1024)).toFixed(2)} MB)...`
      );
      await downloadFile(downloadInfo.glb.url, targetGlbPath);
    } else {
      throw new Error('Neither gltf nor glb download format available');
    }

    return analyzeGlbStructure(targetGlbPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const ALLOWED_LICENSE_SLUGS = new Set(['cc0', 'by', 'by-sa']);

function isAllowedLicense(licenseObj) {
  if (!licenseObj) return false;
  const slug = (licenseObj.slug || '').toLowerCase();
  const label = (licenseObj.label || licenseObj.fullName || '').toLowerCase();
  if (ALLOWED_LICENSE_SLUGS.has(slug)) return true;
  return (
    label.includes('cc0') ||
    label.includes('public domain') ||
    (label.includes('attribution') &&
      !label.includes('noncommercial') &&
      !label.includes('noderivs') &&
      !label.includes('nc') &&
      !label.includes('nd'))
  );
}

async function main() {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  const token = loadSketchfabToken();

  const creditsEntries = [
    {
      role: 'Exterior Hero Model (`public/models/exterior.glb`)',
      name: 'FREE Concept Car 002 - public domain (CC0)',
      author: 'Unity Fan youtube channel',
      license: 'CC0 / Public Domain (Free Standard)',
      url: 'https://sketchfab.com/3d-models/concept-car-002-public-domain-090898c41395478d9dc4dea261944581',
      fileSizeMB: 3.45,
    },
  ];

  console.log('\n=== SEARCHING FOR GENUINE INTERIOR / COCKPIT MODEL ===');
  const queries = ['futuristic car interior', 'sci-fi cockpit', 'car interior'];
  const interiorCandidates = [];
  const seenUids = new Set();

  for (const q of queries) {
    const searchUrl = `https://api.sketchfab.com/v3/search?type=models&downloadable=true&q=${encodeURIComponent(q)}`;
    const data = await fetchJson(searchUrl, token);
    const results = data.results || [];

    for (const item of results) {
      if (!item || seenUids.has(item.uid)) continue;
      seenUids.add(item.uid);

      if (!item.isDownloadable) continue;
      if (!isAllowedLicense(item.license)) continue;

      const nameLower = (item.name || '').toLowerCase();
      // Must explicitly mention interior or cockpit in the model name so we don't pick exterior cars
      if (!/(interior|cockpit|cabin|dashboard)/i.test(nameLower)) continue;

      const archiveSize = item.archives?.gltf?.size || item.archives?.glb?.size || 0;
      const archiveSizeMB = +(archiveSize / (1024 * 1024)).toFixed(2);
      if (archiveSizeMB > 0 && archiveSizeMB <= 24) {
        interiorCandidates.push({
          uid: item.uid,
          name: item.name,
          author: item.user?.displayName || item.user?.username || 'Unknown Author',
          license: item.license?.label || item.license?.fullName || item.license?.slug || 'CC-BY',
          sourceUrl: item.viewerUrl || `https://sketchfab.com/3d-models/${item.uid}`,
          archiveSizeMB,
          faceCount: item.faceCount || 0,
        });
      }
    }
  }

  console.log(`Found ${interiorCandidates.length} dedicated interior/cockpit models under 25 MB:`);
  interiorCandidates.slice(0, 10).forEach((c, idx) => {
    console.log(
      `  ${idx + 1}. "${c.name}" by ${c.author} | License: ${c.license} | Archive: ${c.archiveSizeMB} MB | URL: ${c.sourceUrl}`
    );
  });

  let bestCandidate = null;

  // Prioritize actual car interior models first (e.g., "Car interior" by Gerhald)
  interiorCandidates.sort((a, b) => {
    const aCar = /^car interior$/i.test(a.name.trim()) ? 2 : /car interior|cockpit/i.test(a.name) ? 1 : 0;
    const bCar = /^car interior$/i.test(b.name.trim()) ? 2 : /car interior|cockpit/i.test(b.name) ? 1 : 0;
    if (aCar !== bCar) return bCar - aCar;
    return (b.faceCount || 0) - (a.faceCount || 0);
  });

  for (const cand of interiorCandidates.slice(0, 3)) {
    console.log(`\nEvaluating interior candidate: "${cand.name}" (${cand.archiveSizeMB} MB)...`);
    try {
      const tempIntPath = path.join(MODELS_DIR, `cand_int_${cand.uid}.glb`);
      const analysis = await downloadAndConvertModel(cand.uid, token, tempIntPath);
      console.log(
        `  • GLB Size: ${analysis.fileSizeMB} MB | Nodes: ${analysis.nodeCount} | Meshes: ${analysis.meshCount} | Interior Score: ${analysis.interiorScore}/4 (seat:${analysis.hasSeat}, dash:${analysis.hasDash}, steer:${analysis.hasSteering}, display:${analysis.hasDisplay})`
      );

      if (analysis.fileSizeMB <= 25) {
        if (
          !bestCandidate ||
          analysis.interiorScore > bestCandidate.analysis.interiorScore ||
          (analysis.interiorScore === bestCandidate.analysis.interiorScore &&
            analysis.meshCount > bestCandidate.analysis.meshCount)
        ) {
          if (bestCandidate && fs.existsSync(bestCandidate.tempIntPath)) {
            fs.rmSync(bestCandidate.tempIntPath, { force: true });
          }
          bestCandidate = { ...cand, tempIntPath, analysis };
        } else {
          fs.rmSync(tempIntPath, { force: true });
        }

        if (analysis.interiorScore >= 3 && analysis.meshCount >= 5) {
          break;
        }
      } else {
        fs.rmSync(tempIntPath, { force: true });
      }
    } catch (err) {
      console.warn(`  ✗ Failed on "${cand.name}": ${err.message}`);
    }
  }

  if (bestCandidate) {
    const finalInteriorPath = path.join(MODELS_DIR, 'interior.glb');
    fs.copyFileSync(bestCandidate.tempIntPath, finalInteriorPath);
    fs.rmSync(bestCandidate.tempIntPath, { force: true });
    console.log(
      `\n✅ SELECTED INTERIOR: "${bestCandidate.name}" by ${bestCandidate.author} (${bestCandidate.analysis.fileSizeMB} MB, ${bestCandidate.analysis.meshCount} meshes)`
    );
    creditsEntries.push({
      role: 'Interior Cockpit Model (`public/models/interior.glb`)',
      name: bestCandidate.name,
      author: bestCandidate.author,
      license: bestCandidate.license,
      url: bestCandidate.sourceUrl,
      fileSizeMB: bestCandidate.analysis.fileSizeMB,
    });
  }

  const creditsMd = [
    '# 3D Model Credits (VANTA)',
    '',
    'All 3D assets used in the VANTA showcase are credited below in accordance with their licenses:',
    '',
    ...creditsEntries.map(
      (c) =>
        `## ${c.role}\n- **Model**: ${c.name}\n- **Author**: ${c.author}\n- **License**: ${c.license}\n- **File Size**: ${c.fileSizeMB} MB\n- **Source**: ${c.url}\n`
    ),
  ].join('\n');

  fs.writeFileSync(CREDITS_PATH, creditsMd, 'utf8');
  console.log(`\n📝 Updated ${CREDITS_PATH}`);
}

main().catch((err) => {
  console.error(`\n[VANTA Fetch Error] ${err.message}`);
  process.exit(1);
});
