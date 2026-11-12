/**
 * textures.ts - High-fidelity Procedural PBR Textures
 * Pure procedural generation in HTML5 Canvas. Zero external 404 image dependencies.
 * Adheres strictly to Three.js guidelines (SRGBColorSpace, anisotropy, photorealistic micro-details).
 */

import * as THREE from 'three';

// Cache generated textures so we don't recreate them
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * 1. Weathered Copper / Brass Plate with Scratches and Verdigris Patina
 */
export function createWeatheredCopperTexture(): THREE.CanvasTexture {
  if (textureCache.has('copper')) return textureCache.get('copper')!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base copper gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#a55428');
  grad.addColorStop(0.5, '#c87d46');
  grad.addColorStop(1, '#8e4420');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Micro-scratches & brushed grain
  ctx.strokeStyle = 'rgba(255, 210, 160, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 400; i++) {
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (Math.random() - 0.5) * 20);
    ctx.stroke();
  }

  // Weathering, corrosion & dark metal pits
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 3 + 1;
    ctx.fillStyle = Math.random() > 0.4 ? 'rgba(40, 20, 10, 0.35)' : 'rgba(30, 80, 65, 0.28)'; // verdigris patina speck
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Industrial stamped markings
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = 'rgba(30, 15, 8, 0.4)';
  ctx.fillText('CU-99.99 INDUSTRIAL CORE // REF 8402', 24, 60);
  ctx.fillText('ENES ÖZTÜRK // ARCHAEOMETRIC CORP', 24, 85);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set('copper', texture);
  return texture;
}

/**
 * 2. Silicon Wafer / Antique Dark PCB Motherboard Traces with Gold Pads
 */
export function createPCBTracesTexture(): THREE.CanvasTexture {
  if (textureCache.has('pcb')) return textureCache.get('pcb')!;

  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark matte ceramic / FR4 substrate
  ctx.fillStyle = '#0a100d';
  ctx.fillRect(0, 0, size, size);

  // Subtle grid of substrate weave
  ctx.strokeStyle = '#111b16';
  ctx.lineWidth = 1;
  const step = 32;
  for (let x = 0; x < size; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y < size; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Intricate Circuit traces (copper/gold bus lines)
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 3;

  for (let i = 0; i < 40; i++) {
    let px = (Math.floor(Math.random() * 16) + 1) * 64;
    let py = (Math.floor(Math.random() * 16) + 1) * 64;
    ctx.beginPath();
    ctx.moveTo(px, py);

    for (let s = 0; s < 4; s++) {
      const dir = Math.floor(Math.random() * 4);
      const len = 64 * (Math.floor(Math.random() * 2) + 1);
      if (dir === 0) px += len;
      else if (dir === 1) py += len;
      else if (dir === 2) { px += len; py += len; }
      else { px += len; py -= len; }
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Solder pads / Vias at terminations
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    // Via hole
    ctx.fillStyle = '#050706';
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Silkscreen technical markings
  ctx.fillStyle = 'rgba(230, 240, 220, 0.75)';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('TP_BUS_V12 // CLOCK_SYNC 33.33MHz', 40, 120);
  ctx.fillText('REV 4.9B [THE LAST COMPONENT]', 40, 140);
  ctx.fillText('DIODE_ARRAY [D101-D108] OK', 40, 160);

  // Micro IC chip footprint outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(300, 300, 220, 220);
  ctx.fillText('CPU_SOCKET_PGA_1024', 315, 330);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set('pcb', texture);
  return texture;
}

/**
 * 3. CRT Cathode Phosphor Green Grid Screen for Oscilloscope Backpack
 */
export function createCRTGridTexture(): THREE.CanvasTexture {
  if (textureCache.has('crt')) return textureCache.get('crt')!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep cathode phosphor dark green background
  ctx.fillStyle = '#031408';
  ctx.fillRect(0, 0, size, size);

  // Phosphor glow grid
  ctx.strokeStyle = 'rgba(40, 180, 80, 0.28)';
  ctx.lineWidth = 1.5;
  const gridStep = 32;
  for (let x = 0; x <= size; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Major center crosshairs
  ctx.strokeStyle = 'rgba(80, 255, 120, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  // Tick marks along center axes
  for (let i = 0; i <= size; i += 8) {
    ctx.beginPath();
    ctx.moveTo(size / 2 - 3, i);
    ctx.lineTo(size / 2 + 3, i);
    ctx.moveTo(i, size / 2 - 3);
    ctx.lineTo(i, size / 2 + 3);
    ctx.stroke();
  }

  // Scanline overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  for (let y = 0; y < size; y += 4) {
    ctx.fillRect(0, y, size, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('crt', texture);
  return texture;
}

/**
 * 4. Brushed Aluminum Heatsink Fins
 */
export function createBrushedMetalTexture(): THREE.CanvasTexture {
  if (textureCache.has('metal')) return textureCache.get('metal')!;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#42484f';
  ctx.fillRect(0, 0, size, size);

  // Linear streaks
  for (let i = 0; i < 800; i++) {
    const y = Math.random() * size;
    const alpha = Math.random() * 0.15 + 0.05;
    ctx.strokeStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set('metal', texture);
  return texture;
}

/**
 * 5. Molten Solder Glowing River Flow Texture
 */
export function createSolderRiverTexture(): THREE.CanvasTexture {
  if (textureCache.has('solder')) return textureCache.get('solder')!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Molten glowing gradient
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, '#5a1200');
  grad.addColorStop(0.3, '#d35400');
  grad.addColorStop(0.5, '#f39c12');
  grad.addColorStop(0.7, '#ffcc00');
  grad.addColorStop(1, '#5a1200');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Molten flux slag spots
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = 'rgba(20, 5, 2, 0.4)';
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 8 + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set('solder', texture);
  return texture;
}

/**
 * 6. Hard Disk Drive (HDD) Platter Concentric Magnetic Tracks
 */
export function createHDDPlatterTexture(): THREE.CanvasTexture {
  if (textureCache.has('hdd')) return textureCache.get('hdd')!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Mirror chrome gradient base
  ctx.fillStyle = '#8f98a3';
  ctx.fillRect(0, 0, size, size);

  // Concentric magnetic cylinders
  const cx = size / 2;
  const cy = size / 2;

  for (let r = 20; r < size / 2; r += 3) {
    const alpha = (r % 12 === 0) ? 0.35 : 0.12;
    ctx.strokeStyle = `rgba(20, 25, 30, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Radial sector boundaries
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
    ctx.lineTo(cx + Math.cos(a) * (size / 2 - 5), cy + Math.sin(a) * (size / 2 - 5));
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('hdd', texture);
  return texture;
}

/**
 * 7. Frosted Cryogenic Liquid Nitrogen Ice Surface
 */
export function createCryoIceTexture(): THREE.CanvasTexture {
  if (textureCache.has('cryo')) return textureCache.get('cryo')!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep cyan frost base
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#0f2b38');
  grad.addColorStop(0.5, '#1b4b5e');
  grad.addColorStop(1, '#0b202c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Frost dendritic crystals
  ctx.strokeStyle = 'rgba(180, 235, 255, 0.45)';
  ctx.lineWidth = 1.5;

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    for (let branch = 0; branch < 6; branch++) {
      const angle = (branch * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * 35, y + Math.sin(angle) * 35);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set('cryo', texture);
  return texture;
}
