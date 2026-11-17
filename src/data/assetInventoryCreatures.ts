import type { ClayVariant } from '../engine/channelMaterials';
import type { Vec3 } from '../types/scene';
import type { AssetVariantSpec, InventoryPart } from './assetInventory';

const r2 = (n: number) => Number(n.toFixed(2));

const box = (
  pos: Vec3,
  size: Vec3,
  variant: ClayVariant = 'default',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'box', pos, size, variant, rot }
    : { shape: 'box', pos, size, variant };

const cyl = (
  pos: Vec3,
  rTop: number,
  rBot: number,
  h: number,
  variant: ClayVariant = 'default',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'cylinder', pos, size: [r2(rTop), r2(rBot), r2(h)], variant, rot }
    : { shape: 'cylinder', pos, size: [r2(rTop), r2(rBot), r2(h)], variant };

const cone = (
  pos: Vec3,
  r: number,
  h: number,
  seg = 8,
  variant: ClayVariant = 'default',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'cone', pos, size: [r2(r), r2(h), seg], variant, rot }
    : { shape: 'cone', pos, size: [r2(r), r2(h), seg], variant };

const sph = (
  pos: Vec3,
  sx: number,
  sy: number,
  sz: number,
  variant: ClayVariant = 'default',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'sphere', pos, size: [r2(sx), r2(sy), r2(sz)], variant, rot }
    : { shape: 'sphere', pos, size: [r2(sx), r2(sy), r2(sz)], variant };

const torus = (
  pos: Vec3,
  radius: number,
  tube: number,
  seg = 12,
  variant: ClayVariant = 'default',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'torus', pos, size: [r2(radius), r2(tube), seg], variant, rot }
    : { shape: 'torus', pos, size: [r2(radius), r2(tube), seg], variant };

interface QuadrupedConfig {
  bodyLen: number;
  bodyW: number;
  bodyH: number;
  legH: number;
  legR: number;
  neckLen: number;
  neckR: number;
  neckTilt?: number;
  headSize: [number, number, number];
  snoutLen?: number;
  bodyMat: ClayVariant;
  accentMat?: ClayVariant;
  legMat?: ClayVariant;
  hoofMat?: ClayVariant;
  tailLen?: number;
  tailUp?: boolean;
  bushyTail?: boolean;
  ears?: 'tall' | 'pointed' | 'floppy' | 'round' | 'short';
  horns?: 'cow' | 'goat' | 'antler' | 'unicorn' | 'tusk' | 'none';
  mane?: boolean;
  wingSpan?: number;
  shell?: boolean;
  spots?: boolean;
  saddle?: boolean;
  visor?: boolean;
}

/**
 * Shared parameterized quadruped anatomy builder resting cleanly on y = 0.
 */
function buildQuadrupedParts(cfg: QuadrupedConfig): InventoryPart[] {
  const {
    bodyLen,
    bodyW,
    bodyH,
    legH,
    legR,
    neckLen,
    neckR,
    neckTilt = 0.55,
    headSize,
    snoutLen = 0.14,
    bodyMat,
    accentMat = 'dark',
    legMat = bodyMat,
    hoofMat = 'dark',
    tailLen = 0.4,
    tailUp = false,
    bushyTail = false,
    ears = 'pointed',
    horns = 'none',
    mane = false,
    wingSpan = 0,
    shell = false,
    spots = false,
    saddle = false,
    visor = false,
  } = cfg;

  const parts: InventoryPart[] = [];
  const bodyY = legH + bodyH * 0.42;
  const xOff = bodyW * 0.62;
  const zFront = bodyLen * 0.68;
  const zBack = -bodyLen * 0.68;

  // Main torso + chest + haunch
  parts.push(sph([0, bodyY, 0], bodyW, bodyH, bodyLen, bodyMat));
  parts.push(sph([0, bodyY + bodyH * 0.08, bodyLen * 0.38], bodyW * 0.92, bodyH * 0.94, bodyLen * 0.52, bodyMat));
  parts.push(sph([0, bodyY + bodyH * 0.06, -bodyLen * 0.36], bodyW * 0.94, bodyH * 0.96, bodyLen * 0.54, bodyMat));

  if (shell) {
    parts.push(
      sph([0, bodyY + bodyH * 0.38, 0], bodyW * 1.18, bodyH * 0.95, bodyLen * 1.12, accentMat),
      torus([0, bodyY - bodyH * 0.05, 0], Math.max(bodyW, bodyLen) * 1.05, 0.06, 16, 'wood', [Math.PI / 2, 0, 0])
    );
  }

  if (spots) {
    parts.push(
      sph([bodyW * 0.72, bodyY + bodyH * 0.2, bodyLen * 0.12], bodyW * 0.32, bodyH * 0.35, bodyLen * 0.24, accentMat),
      sph([-bodyW * 0.72, bodyY + bodyH * 0.15, -bodyLen * 0.18], bodyW * 0.3, bodyH * 0.32, bodyLen * 0.25, accentMat),
      sph([0, bodyY + bodyH * 0.68, -bodyLen * 0.2], bodyW * 0.38, bodyH * 0.28, bodyLen * 0.24, accentMat)
    );
  }

  if (saddle) {
    parts.push(
      box([0, bodyY + bodyH * 0.85, 0.04], [bodyW * 1.45, 0.09, bodyLen * 0.58], 'wood'),
      box([0, bodyY + bodyH * 0.95, -bodyLen * 0.18], [bodyW * 1.2, 0.14, 0.1], accentMat)
    );
  }

  // Four legs resting on y = 0
  const legs: [number, number][] = [
    [-xOff, zFront],
    [xOff, zFront],
    [-xOff, zBack],
    [xOff, zBack],
  ];
  for (const [lx, lz] of legs) {
    parts.push(
      cyl([lx, legH * 0.52, lz], legR * 1.22, legR * 0.85, legH * 0.96, legMat),
      cyl([lx, Math.min(0.06, legH * 0.14), lz], legR * 0.92, legR * 1.05, Math.min(0.11, legH * 0.25), hoofMat)
    );
  }

  // Neck
  const neckBaseZ = bodyLen * 0.64;
  const neckBaseY = bodyY + bodyH * 0.32;
  const nSin = Math.sin(neckTilt);
  const nCos = Math.cos(neckTilt);
  const neckMidZ = neckBaseZ + nSin * neckLen * 0.45;
  const neckMidY = neckBaseY + nCos * neckLen * 0.45;
  parts.push(
    cyl([0, neckMidY, neckMidZ], neckR * 0.85, neckR * 1.15, neckLen, bodyMat, [neckTilt, 0, 0])
  );

  if (mane) {
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      parts.push(
        box(
          [0, neckBaseY + nCos * neckLen * (0.2 + t * 0.65) + 0.06, neckBaseZ + nSin * neckLen * (0.2 + t * 0.65) - 0.08],
          [0.08, 0.18, 0.14],
          accentMat,
          [neckTilt - 0.25, 0, 0]
        )
      );
    }
  }

  // Head + Snout + Eyes
  const headY = neckBaseY + nCos * neckLen * 0.86 + headSize[1] * 0.25;
  const headZ = neckBaseZ + nSin * neckLen * 0.88 + headSize[2] * 0.35;
  parts.push(sph([0, headY, headZ], headSize[0], headSize[1], headSize[2], bodyMat));
  parts.push(
    sph(
      [0, headY - headSize[1] * 0.18, headZ + headSize[2] * 0.72 + snoutLen * 0.35],
      headSize[0] * 0.66,
      headSize[1] * 0.58,
      snoutLen,
      bodyMat
    )
  );
  // Nose tip
  parts.push(
    sph(
      [0, headY - headSize[1] * 0.08, headZ + headSize[2] * 0.72 + snoutLen * 1.15],
      headSize[0] * 0.28,
      headSize[1] * 0.22,
      headSize[0] * 0.24,
      hoofMat
    )
  );

  // Eyes / Sci-fi Visor
  if (visor) {
    parts.push(
      box([0, headY + headSize[1] * 0.12, headZ + headSize[2] * 0.82], [headSize[0] * 1.5, headSize[1] * 0.32, 0.08], 'emissiveLamp')
    );
  } else {
    const eyeX = headSize[0] * 0.68;
    const eyeY = headY + headSize[1] * 0.22;
    const eyeZ = headZ + headSize[2] * 0.56;
    parts.push(
      sph([-eyeX, eyeY, eyeZ], 0.032, 0.032, 0.032, 'dark'),
      sph([eyeX, eyeY, eyeZ], 0.032, 0.032, 0.032, 'dark')
    );
  }

  // Ears
  const earX = headSize[0] * 0.66;
  const earY = headY + headSize[1] * 0.72;
  const earZ = headZ - headSize[2] * 0.1;
  if (ears === 'tall') {
    parts.push(
      sph([-earX * 0.72, earY + 0.16, earZ], 0.055, 0.22, 0.04, bodyMat, [-0.15, 0, 0.16]),
      sph([earX * 0.72, earY + 0.16, earZ], 0.055, 0.22, 0.04, bodyMat, [-0.15, 0, -0.16])
    );
  } else if (ears === 'pointed') {
    parts.push(
      cone([-earX * 0.78, earY + 0.06, earZ], 0.065, 0.17, 6, accentMat, [0.1, 0, 0.2]),
      cone([earX * 0.78, earY + 0.06, earZ], 0.065, 0.17, 6, accentMat, [0.1, 0, -0.2])
    );
  } else if (ears === 'floppy') {
    parts.push(
      box([-headSize[0] * 1.05, headY + 0.05, earZ], [0.06, 0.28, 0.22], accentMat, [0.1, 0, 0.22]),
      box([headSize[0] * 1.05, headY + 0.05, earZ], [0.06, 0.28, 0.22], accentMat, [0.1, 0, -0.22])
    );
  } else if (ears === 'round') {
    parts.push(
      sph([-earX * 0.85, earY, earZ], 0.075, 0.075, 0.045, accentMat),
      sph([earX * 0.85, earY, earZ], 0.075, 0.075, 0.045, accentMat)
    );
  } else if (ears === 'short') {
    parts.push(
      cone([-earX * 0.75, earY + 0.04, earZ], 0.05, 0.11, 6, bodyMat, [0.1, 0, 0.15]),
      cone([earX * 0.75, earY + 0.04, earZ], 0.05, 0.11, 6, bodyMat, [0.1, 0, -0.15])
    );
  }

  // Horns / Antlers / Tusks
  if (horns === 'cow') {
    parts.push(
      cone([-headSize[0] * 1.05, earY + 0.05, earZ + 0.05], 0.05, 0.34, 8, 'default', [0.3, 0, 1.05]),
      cone([headSize[0] * 1.05, earY + 0.05, earZ + 0.05], 0.05, 0.34, 8, 'default', [0.3, 0, -1.05])
    );
  } else if (horns === 'goat') {
    parts.push(
      cone([-headSize[0] * 0.55, earY + 0.12, earZ], 0.04, 0.28, 8, 'dark', [-0.65, 0, 0.25]),
      cone([headSize[0] * 0.55, earY + 0.12, earZ], 0.04, 0.28, 8, 'dark', [-0.65, 0, -0.25])
    );
  } else if (horns === 'antler') {
    for (const side of [-1, 1]) {
      parts.push(
        cyl([side * 0.12, earY + 0.22, earZ - 0.03], 0.02, 0.03, 0.42, 'wood', [-0.25, 0, -side * 0.36]),
        cyl([side * 0.25, earY + 0.36, earZ + 0.05], 0.015, 0.02, 0.24, 'wood', [0.3, 0, -side * 0.2]),
        cyl([side * 0.22, earY + 0.44, earZ - 0.12], 0.014, 0.02, 0.22, 'wood', [-0.45, 0, -side * 0.45])
      );
    }
  } else if (horns === 'unicorn') {
    parts.push(
      cone([0, headY + headSize[1] * 1.05, headZ + headSize[2] * 0.52], 0.045, 0.52, 10, 'emissiveLamp', [0.42, 0, 0])
    );
  } else if (horns === 'tusk') {
    // Elephant / Mammoth trunk + sweeping tusks
    parts.push(
      cyl([0, headY - 0.28, headZ + headSize[2] * 1.15], 0.1, 0.14, 0.72, bodyMat, [0.35, 0, 0]),
      cyl([0, headY - 0.68, headZ + headSize[2] * 1.48], 0.065, 0.095, 0.42, bodyMat, [-0.3, 0, 0]),
      cone([-0.24, headY - 0.22, headZ + headSize[2] * 1.28], 0.055, 0.56, 8, 'default', [1.15, 0.18, 0]),
      cone([0.24, headY - 0.22, headZ + headSize[2] * 1.28], 0.055, 0.56, 8, 'default', [1.15, -0.18, 0])
    );
  }

  // Optional Feathered Wings (e.g. Pegasus / Griffin)
  if (wingSpan > 0) {
    for (const side of [-1, 1]) {
      parts.push(
        box(
          [side * (bodyW + wingSpan * 0.35), bodyY + bodyH * 0.75, bodyLen * 0.15],
          [wingSpan * 0.7, 0.06, 0.48],
          accentMat,
          [-0.15, 0, side * 0.32]
        ),
        box(
          [side * (bodyW + wingSpan * 0.82), bodyY + bodyH * 0.92, bodyLen * 0.02],
          [wingSpan * 0.52, 0.05, 0.36],
          bodyMat,
          [-0.1, 0, side * 0.12]
        )
      );
    }
  }

  // Tail
  if (tailLen > 0) {
    const tailZ = -bodyLen * 0.94 - (tailUp ? 0.04 : tailLen * 0.25);
    const tailY = bodyY + (tailUp ? 0.16 : -tailLen * 0.22);
    if (bushyTail) {
      parts.push(
        sph(
          [0, tailY + (tailUp ? 0.12 : 0), tailZ - tailLen * 0.22],
          tailLen * 0.32,
          tailLen * 0.32,
          tailLen * 0.62,
          accentMat,
          [tailUp ? -0.55 : 0.45, 0, 0]
        )
      );
    } else {
      parts.push(
        cyl(
          [0, tailY, tailZ],
          0.032,
          0.05,
          tailLen,
          accentMat,
          [tailUp ? -0.6 : 0.75, 0, 0]
        )
      );
    }
  }

  return parts;
}

function buildBirdParts(cfg: {
  wingspan: number;
  bodyH: number;
  flying: boolean;
  bodyMat: ClayVariant;
  wingMat: ClayVariant;
  beakMat?: ClayVariant;
  longNeck?: boolean;
  crest?: boolean;
}): InventoryPart[] {
  const {
    wingspan,
    bodyH,
    flying,
    bodyMat,
    wingMat,
    beakMat = 'car',
    longNeck = false,
    crest = false,
  } = cfg;
  const parts: InventoryPart[] = [];
  const y0 = flying ? Math.max(0.85, bodyH + 0.55) : 0.38;

  // Legs if standing
  if (!flying) {
    parts.push(
      cyl([-0.08, 0.18, -0.02], 0.022, 0.028, 0.36, beakMat),
      cyl([0.08, 0.18, -0.02], 0.022, 0.028, 0.36, beakMat),
      box([-0.08, 0.02, 0.04], [0.09, 0.03, 0.14], beakMat),
      box([0.08, 0.02, 0.04], [0.09, 0.03, 0.14], beakMat)
    );
  }

  // Streamlined body + chest
  parts.push(
    sph([0, y0, 0], 0.18, 0.22, 0.38, bodyMat, [flying ? -0.15 : 0.28, 0, 0]),
    // Tail fan
    box([0, y0 - 0.04, -0.45], [0.28, 0.04, 0.34], wingMat, [0.2, 0, 0])
  );

  // Neck + head + beak
  const neckY = y0 + (longNeck ? 0.34 : 0.18);
  const neckZ = 0.28 + (longNeck ? 0.1 : 0);
  if (longNeck) {
    parts.push(cyl([0, y0 + 0.22, 0.28], 0.055, 0.085, 0.42, bodyMat, [0.35, 0, 0]));
  }
  parts.push(
    sph([0, neckY, neckZ], 0.11, 0.11, 0.14, bodyMat),
    cone([0, neckY - 0.02, neckZ + 0.17], 0.045, 0.16, 6, beakMat, [Math.PI / 2, 0, 0]),
    sph([-0.07, neckY + 0.03, neckZ + 0.06], 0.024, 0.024, 0.024, 'dark'),
    sph([0.07, neckY + 0.03, neckZ + 0.06], 0.024, 0.024, 0.024, 'dark')
  );

  if (crest) {
    parts.push(
      box([0, neckY + 0.13, neckZ + 0.01], [0.03, 0.1, 0.14], 'car')
    );
  }

  // Spread wings
  const wHalf = wingspan * 0.5;
  for (const side of [-1, 1]) {
    if (flying) {
      parts.push(
        box([side * (0.18 + wHalf * 0.28), y0 + 0.1, 0.06], [wHalf * 0.56, 0.04, 0.32], wingMat, [0, -side * 0.12, side * 0.18]),
        box([side * (0.18 + wHalf * 0.72), y0 + 0.16, -0.04], [wHalf * 0.46, 0.035, 0.24], bodyMat, [0, -side * 0.24, side * 0.06])
      );
    } else {
      parts.push(
        sph([side * 0.19, y0 + 0.02, -0.04], 0.065, 0.16, 0.28, wingMat, [0.15, 0, -side * 0.12])
      );
    }
  }

  return parts;
}

function buildFishSchoolParts(): InventoryPart[] {
  const fishOffsets: { pos: Vec3; scale: number; yaw: number; mat: ClayVariant }[] = [
    { pos: [0, 0.72, 0.35], scale: 1.0, yaw: 0.05, mat: 'car' },
    { pos: [-0.46, 0.56, 0.02], scale: 0.82, yaw: 0.14, mat: 'default' },
    { pos: [0.48, 0.84, -0.05], scale: 0.86, yaw: -0.1, mat: 'accent' },
    { pos: [-0.24, 0.92, -0.45], scale: 0.74, yaw: 0.08, mat: 'car' },
    { pos: [0.3, 0.5, -0.48], scale: 0.78, yaw: -0.14, mat: 'default' },
  ];
  const parts: InventoryPart[] = [];
  for (const f of fishOffsets) {
    const [fx, fy, fz] = f.pos;
    const s = f.scale;
    const sy = Math.sin(f.yaw);
    const cy = Math.cos(f.yaw);
    parts.push(
      sph([fx, fy, fz], 0.1 * s, 0.12 * s, 0.34 * s, f.mat, [0, f.yaw, 0]),
      sph([fx + sy * 0.08 * s, fy - 0.03 * s, fz + cy * 0.08 * s], 0.075 * s, 0.065 * s, 0.2 * s, 'default', [0, f.yaw, 0]),
      sph([fx - 0.065 * s, fy + 0.03 * s, fz + 0.2 * s], 0.022 * s, 0.022 * s, 0.022 * s, 'dark'),
      sph([fx + 0.065 * s, fy + 0.03 * s, fz + 0.2 * s], 0.022 * s, 0.022 * s, 0.022 * s, 'dark'),
      cone([fx - sy * 0.04 * s, fy + 0.13 * s, fz - cy * 0.04 * s], 0.03 * s, 0.14 * s, 4, 'accent', [-0.32, f.yaw, 0]),
      cone([fx - sy * 0.38 * s, fy, fz - cy * 0.38 * s], 0.095 * s, 0.2 * s, 4, 'default', [Math.PI / 2, f.yaw, 0]),
      box([fx - 0.11 * s, fy - 0.03 * s, fz + 0.04 * s], [0.11 * s, 0.02 * s, 0.07 * s], 'default', [0, 0.35 + f.yaw, -0.2]),
      box([fx + 0.11 * s, fy - 0.03 * s, fz + 0.04 * s], [0.11 * s, 0.02 * s, 0.07 * s], 'default', [0, -0.35 + f.yaw, 0.2])
    );
  }
  return parts;
}

function buildSwimmerParts(cfg: {
  len: number;
  r: number;
  bodyMat: ClayVariant;
  finMat: ClayVariant;
  sharkFin?: boolean;
  floatY?: number;
}): InventoryPart[] {
  const { len, r, bodyMat, finMat, sharkFin = false, floatY = 0.75 } = cfg;
  return [
    // Main streamlined torso + countershaded belly
    sph([0, floatY, 0.06 * len], r, r * 0.98, len * 0.44, bodyMat),
    sph([0, floatY - r * 0.24, 0.1 * len], r * 0.84, r * 0.58, len * 0.34, 'default'),
    // Tapered nose cone & tail peduncle
    cone([0, floatY - r * 0.06, len * 0.44], r * 0.62, len * 0.2, 10, bodyMat, [Math.PI / 2, 0, 0]),
    cone([0, floatY, -len * 0.38], r * 0.52, len * 0.28, 10, bodyMat, [-Math.PI / 2, 0, 0]),
    // Eyes
    sph([-r * 0.68, floatY + r * 0.16, len * 0.34], r * 0.12, r * 0.12, r * 0.12, 'dark'),
    sph([r * 0.68, floatY + r * 0.16, len * 0.34], r * 0.12, r * 0.12, r * 0.12, 'dark'),
    // Dorsal fin
    cone([0, floatY + r * (sharkFin ? 1.32 : 0.98), -len * 0.04], r * (sharkFin ? 0.32 : 0.24), r * (sharkFin ? 1.3 : 0.62), 4, finMat, [-0.38, 0, 0]),
    // Swept pectoral fins
    box([-r * 1.18, floatY - r * 0.2, len * 0.1], [r * (sharkFin ? 0.95 : 1.35), r * 0.08, r * 0.52], finMat, [0, 0.42, -0.24]),
    box([r * 1.18, floatY - r * 0.2, len * 0.1], [r * (sharkFin ? 0.95 : 1.35), r * 0.08, r * 0.52], finMat, [0, -0.42, 0.24]),
    // Pelvic / stabilizer fins
    box([-r * 0.55, floatY - r * 0.32, -len * 0.14], [r * 0.42, r * 0.06, r * 0.28], finMat, [0, 0.3, -0.25]),
    box([r * 0.55, floatY - r * 0.32, -len * 0.14], [r * 0.42, r * 0.06, r * 0.28], finMat, [0, -0.3, 0.25]),
    // Tail fluke
    box(
      [0, floatY, -len * 0.53],
      sharkFin ? [r * 0.12, r * 1.65, r * 0.65] : [r * 1.75, r * 0.1, r * 0.68],
      finMat
    ),
  ];
}

function makeCreaturePair(
  id: string,
  groupName: string,
  specs: {
    suf: string;
    tag: string;
    heightM: number;
    widthM: number;
    depthM: number;
    parts: InventoryPart[];
  }[]
): AssetVariantSpec[] {
  return specs.map((s) => ({
    id: `${id}_${s.suf}`,
    label: `${groupName} · ${s.tag}`,
    heightM: s.heightM,
    widthM: s.widthM,
    depthM: s.depthM,
    parts: s.parts,
  }));
}

function buildEasternDragonParts(variant: 'gold' | 'jade'): InventoryPart[] {
  const scaleMat: ClayVariant = variant === 'gold' ? 'car' : 'foliage';
  const spineMat: ClayVariant = variant === 'gold' ? 'emissiveLamp' : 'accent';
  const parts: InventoryPart[] = [];
  const segCount = 10;
  for (let i = 0; i < segCount; i++) {
    const t = i / (segCount - 1);
    const z = 1.8 - t * 3.8;
    const y = 1.45 + Math.sin(t * Math.PI * 2.2) * 0.42;
    const x = Math.cos(t * Math.PI * 1.6) * 0.26;
    const radius = 0.24 * (1 - t * 0.55);
    parts.push(
      sph([r2(x), r2(y), r2(z)], radius, radius * 1.05, 0.26, scaleMat),
      cone([r2(x), r2(y + radius * 1.15), r2(z)], 0.045, 0.16, 4, spineMat)
    );
  }
  // Dragon head + snout + antlers + whiskers
  parts.push(
    sph([0.26, 1.58, 2.02], 0.24, 0.2, 0.3, scaleMat),
    box([0.26, 1.52, 2.34], [0.22, 0.16, 0.34], scaleMat),
    sph([0.1, 1.64, 2.16], 0.045, 0.045, 0.045, 'emissiveLamp'),
    sph([0.42, 1.64, 2.16], 0.045, 0.045, 0.045, 'emissiveLamp'),
    cone([0.14, 1.86, 1.9], 0.04, 0.38, 6, 'default', [-0.45, 0, 0.2]),
    cone([0.38, 1.86, 1.9], 0.04, 0.38, 6, 'default', [-0.45, 0, -0.2]),
    // Four short clawed legs
    cyl([-0.08, 1.12, 0.95], 0.05, 0.04, 0.36, scaleMat, [0, 0, 0.45]),
    cyl([0.46, 1.12, 0.95], 0.05, 0.04, 0.36, scaleMat, [0, 0, -0.45]),
    cyl([-0.26, 0.96, -0.75], 0.045, 0.035, 0.34, scaleMat, [0, 0, 0.45]),
    cyl([0.14, 0.96, -0.75], 0.045, 0.035, 0.34, scaleMat, [0, 0, -0.45])
  );
  return parts;
}

function buildSpiderOrBeetleParts(kind: 'spider' | 'beetle'): InventoryPart[] {
  if (kind === 'spider') {
    const parts: InventoryPart[] = [
      sph([0, 0.46, 0.18], 0.22, 0.18, 0.24, 'dark'),
      sph([0, 0.56, -0.32], 0.36, 0.28, 0.44, 'dark'),
      sph([-0.08, 0.5, 0.41], 0.045, 0.045, 0.045, 'emissiveLamp'),
      sph([0.08, 0.5, 0.41], 0.045, 0.045, 0.045, 'emissiveLamp'),
    ];
    for (let i = 0; i < 4; i++) {
      const zOff = 0.25 - i * 0.18;
      for (const side of [-1, 1]) {
        parts.push(
          cyl([side * 0.36, 0.54, zOff], 0.032, 0.028, 0.42, 'dark', [0, 0, side * 1.15]),
          cyl([side * 0.62, 0.24, zOff - 0.04], 0.028, 0.016, 0.52, 'rock', [0, 0, -side * 0.28])
        );
      }
    }
    return parts;
  }
  const parts: InventoryPart[] = [
    sph([0, 0.42, -0.08], 0.38, 0.24, 0.56, 'accent'),
    sph([0, 0.38, 0.48], 0.24, 0.18, 0.24, 'dark'),
    cone([0, 0.52, 0.84], 0.055, 0.46, 8, 'dark', [0.85, 0, 0]),
  ];
  for (let i = 0; i < 3; i++) {
    const zOff = 0.2 - i * 0.26;
    for (const side of [-1, 1]) {
      parts.push(
        cyl([side * 0.42, 0.22, zOff], 0.028, 0.02, 0.42, 'dark', [0, 0, side * 0.85])
      );
    }
  }
  return parts;
}

function buildJellyfishParts(): InventoryPart[] {
  const parts: InventoryPart[] = [
    sph([0, 1.75, 0], 0.52, 0.38, 0.52, 'accent'),
    sph([0, 1.68, 0], 0.32, 0.22, 0.32, 'emissiveLamp'),
    torus([0, 1.56, 0], 0.46, 0.045, 16, 'emissiveLamp', [Math.PI / 2, 0, 0]),
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const tx = r2(Math.cos(a) * 0.28);
    const tz = r2(Math.sin(a) * 0.28);
    parts.push(
      cyl([tx, 1.05, tz], 0.028, 0.015, 0.98, 'accent', [Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12]),
      sph([tx * 1.15, 0.52, tz * 1.15], 0.032, 0.032, 0.032, 'emissiveLamp')
    );
  }
  return parts;
}

export const CREATURE_VARIANTS: AssetVariantSpec[] = [
  // 1. 马匹与坐骑
  ...makeCreaturePair('crt_horse', '马匹坐骑', [
    {
      suf: 'gallop',
      tag: '乡村骏马',
      heightM: 1.65,
      widthM: 0.72,
      depthM: 2.25,
      parts: buildQuadrupedParts({
        bodyLen: 0.68,
        bodyW: 0.28,
        bodyH: 0.3,
        legH: 0.82,
        legR: 0.062,
        neckLen: 0.56,
        neckR: 0.13,
        neckTilt: 0.48,
        headSize: [0.13, 0.13, 0.24],
        snoutLen: 0.15,
        bodyMat: 'trunk',
        accentMat: 'dark',
        mane: true,
        ears: 'short',
        tailLen: 0.65,
      }),
    },
    {
      suf: 'armored',
      tag: '带鞍战马',
      heightM: 1.7,
      widthM: 0.78,
      depthM: 2.3,
      parts: buildQuadrupedParts({
        bodyLen: 0.72,
        bodyW: 0.31,
        bodyH: 0.32,
        legH: 0.84,
        legR: 0.068,
        neckLen: 0.58,
        neckR: 0.14,
        neckTilt: 0.46,
        headSize: [0.14, 0.14, 0.25],
        snoutLen: 0.16,
        bodyMat: 'dark',
        accentMat: 'car',
        mane: true,
        saddle: true,
        ears: 'short',
        tailLen: 0.68,
      }),
    },
  ]),

  // 2. 忠犬与荒野恶狼
  ...makeCreaturePair('crt_canine', '忠犬与狼', [
    {
      suf: 'dog',
      tag: '农村大黄犬',
      heightM: 0.72,
      widthM: 0.38,
      depthM: 1.05,
      parts: buildQuadrupedParts({
        bodyLen: 0.36,
        bodyW: 0.15,
        bodyH: 0.16,
        legH: 0.36,
        legR: 0.038,
        neckLen: 0.24,
        neckR: 0.09,
        neckTilt: 0.55,
        headSize: [0.11, 0.1, 0.14],
        snoutLen: 0.1,
        bodyMat: 'car',
        accentMat: 'trunk',
        ears: 'floppy',
        tailLen: 0.3,
        tailUp: true,
      }),
    },
    {
      suf: 'wolf',
      tag: '荒野孤狼',
      heightM: 0.85,
      widthM: 0.42,
      depthM: 1.32,
      parts: buildQuadrupedParts({
        bodyLen: 0.44,
        bodyW: 0.17,
        bodyH: 0.19,
        legH: 0.44,
        legR: 0.042,
        neckLen: 0.28,
        neckR: 0.11,
        neckTilt: 0.68,
        headSize: [0.12, 0.11, 0.16],
        snoutLen: 0.13,
        bodyMat: 'rock',
        accentMat: 'dark',
        ears: 'pointed',
        tailLen: 0.42,
        bushyTail: true,
      }),
    },
  ]),

  // 3. 灵猫与森林猛虎
  ...makeCreaturePair('crt_feline', '猫咪与猛虎', [
    {
      suf: 'cat',
      tag: '田园橘猫',
      heightM: 0.42,
      widthM: 0.22,
      depthM: 0.62,
      parts: buildQuadrupedParts({
        bodyLen: 0.22,
        bodyW: 0.09,
        bodyH: 0.095,
        legH: 0.18,
        legR: 0.025,
        neckLen: 0.12,
        neckR: 0.055,
        neckTilt: 0.4,
        headSize: [0.085, 0.08, 0.085],
        snoutLen: 0.04,
        bodyMat: 'car',
        accentMat: 'default',
        ears: 'pointed',
        tailLen: 0.26,
        tailUp: true,
      }),
    },
    {
      suf: 'tiger',
      tag: '林间斑斓虎',
      heightM: 1.05,
      widthM: 0.56,
      depthM: 1.85,
      parts: buildQuadrupedParts({
        bodyLen: 0.62,
        bodyW: 0.24,
        bodyH: 0.25,
        legH: 0.48,
        legR: 0.065,
        neckLen: 0.3,
        neckR: 0.15,
        neckTilt: 0.72,
        headSize: [0.16, 0.15, 0.17],
        snoutLen: 0.09,
        bodyMat: 'car',
        accentMat: 'dark',
        spots: true,
        ears: 'round',
        tailLen: 0.58,
      }),
    },
  ]),

  // 4. 耕牛与牧场奶牛
  ...makeCreaturePair('crt_cattle', '水牛与奶牛', [
    {
      suf: 'buffalo',
      tag: '农村耕田水牛',
      heightM: 1.48,
      widthM: 0.86,
      depthM: 2.35,
      parts: buildQuadrupedParts({
        bodyLen: 0.76,
        bodyW: 0.36,
        bodyH: 0.36,
        legH: 0.66,
        legR: 0.075,
        neckLen: 0.36,
        neckR: 0.18,
        neckTilt: 0.85,
        headSize: [0.18, 0.16, 0.24],
        snoutLen: 0.14,
        bodyMat: 'dark',
        accentMat: 'rock',
        horns: 'cow',
        ears: 'short',
        tailLen: 0.52,
      }),
    },
    {
      suf: 'dairy',
      tag: '花斑奶牛',
      heightM: 1.45,
      widthM: 0.82,
      depthM: 2.28,
      parts: buildQuadrupedParts({
        bodyLen: 0.74,
        bodyW: 0.34,
        bodyH: 0.35,
        legH: 0.68,
        legR: 0.068,
        neckLen: 0.36,
        neckR: 0.16,
        neckTilt: 0.8,
        headSize: [0.17, 0.15, 0.23],
        snoutLen: 0.13,
        bodyMat: 'default',
        accentMat: 'dark',
        spots: true,
        horns: 'cow',
        ears: 'short',
        tailLen: 0.52,
      }),
    },
  ]),

  // 5. 绵羊与高地山羊
  ...makeCreaturePair('crt_sheep', '绵羊与山羊', [
    {
      suf: 'sheep',
      tag: '白毛绵羊',
      heightM: 0.88,
      widthM: 0.58,
      depthM: 1.15,
      parts: buildQuadrupedParts({
        bodyLen: 0.38,
        bodyW: 0.24,
        bodyH: 0.24,
        legH: 0.36,
        legR: 0.036,
        neckLen: 0.22,
        neckR: 0.09,
        neckTilt: 0.55,
        headSize: [0.11, 0.1, 0.14],
        snoutLen: 0.08,
        bodyMat: 'default',
        legMat: 'dark',
        accentMat: 'dark',
        ears: 'floppy',
        tailLen: 0.14,
      }),
    },
    {
      suf: 'goat',
      tag: '弯角山羊',
      heightM: 0.94,
      widthM: 0.44,
      depthM: 1.12,
      parts: buildQuadrupedParts({
        bodyLen: 0.36,
        bodyW: 0.17,
        bodyH: 0.18,
        legH: 0.42,
        legR: 0.034,
        neckLen: 0.26,
        neckR: 0.08,
        neckTilt: 0.45,
        headSize: [0.1, 0.095, 0.15],
        snoutLen: 0.09,
        bodyMat: 'concrete',
        accentMat: 'dark',
        horns: 'goat',
        ears: 'short',
        tailLen: 0.16,
        tailUp: true,
      }),
    },
  ]),

  // 6. 田园家禽
  ...makeCreaturePair('crt_poultry', '田园家禽', [
    {
      suf: 'rooster',
      tag: '农村大公鸡',
      heightM: 0.66,
      widthM: 0.32,
      depthM: 0.58,
      parts: buildBirdParts({
        wingspan: 0.4,
        bodyH: 0.35,
        flying: false,
        bodyMat: 'car',
        wingMat: 'trunk',
        crest: true,
      }),
    },
    {
      suf: 'goose',
      tag: '大白鹅',
      heightM: 0.85,
      widthM: 0.36,
      depthM: 0.68,
      parts: buildBirdParts({
        wingspan: 0.48,
        bodyH: 0.48,
        flying: false,
        bodyMat: 'default',
        wingMat: 'concrete',
        longNeck: true,
      }),
    },
  ]),

  // 7. 梅花鹿与驯鹿
  ...makeCreaturePair('crt_deer', '林间鹿群', [
    {
      suf: 'sika',
      tag: '梅花鹿',
      heightM: 1.55,
      widthM: 0.58,
      depthM: 1.65,
      parts: buildQuadrupedParts({
        bodyLen: 0.52,
        bodyW: 0.2,
        bodyH: 0.22,
        legH: 0.72,
        legR: 0.036,
        neckLen: 0.48,
        neckR: 0.095,
        neckTilt: 0.38,
        headSize: [0.11, 0.11, 0.18],
        snoutLen: 0.11,
        bodyMat: 'trunk',
        accentMat: 'default',
        spots: true,
        horns: 'antler',
        ears: 'pointed',
        tailLen: 0.16,
        tailUp: true,
      }),
    },
    {
      suf: 'reindeer',
      tag: '北欧巨角麋鹿',
      heightM: 1.85,
      widthM: 0.68,
      depthM: 1.95,
      parts: buildQuadrupedParts({
        bodyLen: 0.6,
        bodyW: 0.24,
        bodyH: 0.26,
        legH: 0.78,
        legR: 0.044,
        neckLen: 0.5,
        neckR: 0.12,
        neckTilt: 0.5,
        headSize: [0.13, 0.12, 0.2],
        snoutLen: 0.13,
        bodyMat: 'rock',
        accentMat: 'default',
        horns: 'antler',
        ears: 'pointed',
        tailLen: 0.18,
      }),
    },
  ]),

  // 8. 棕熊与大熊猫
  ...makeCreaturePair('crt_bear', '棕熊与熊猫', [
    {
      suf: 'brown',
      tag: '森林棕熊',
      heightM: 1.38,
      widthM: 0.88,
      depthM: 2.05,
      parts: buildQuadrupedParts({
        bodyLen: 0.68,
        bodyW: 0.35,
        bodyH: 0.34,
        legH: 0.54,
        legR: 0.1,
        neckLen: 0.26,
        neckR: 0.2,
        neckTilt: 0.82,
        headSize: [0.21, 0.19, 0.22],
        snoutLen: 0.12,
        bodyMat: 'trunk',
        accentMat: 'dark',
        ears: 'round',
        tailLen: 0.12,
      }),
    },
    {
      suf: 'panda',
      tag: '竹林大熊猫',
      heightM: 1.18,
      widthM: 0.78,
      depthM: 1.68,
      parts: buildQuadrupedParts({
        bodyLen: 0.56,
        bodyW: 0.32,
        bodyH: 0.3,
        legH: 0.44,
        legR: 0.09,
        neckLen: 0.22,
        neckR: 0.18,
        neckTilt: 0.78,
        headSize: [0.2, 0.18, 0.19],
        snoutLen: 0.09,
        bodyMat: 'default',
        legMat: 'dark',
        accentMat: 'dark',
        spots: true,
        ears: 'round',
        tailLen: 0.1,
      }),
    },
  ]),

  // 9. 非洲象与猛犸象
  ...makeCreaturePair('crt_elephant', '巨象与猛犸', [
    {
      suf: 'savanna',
      tag: '草原非洲象',
      heightM: 2.9,
      widthM: 1.55,
      depthM: 3.6,
      parts: buildQuadrupedParts({
        bodyLen: 1.15,
        bodyW: 0.62,
        bodyH: 0.64,
        legH: 1.25,
        legR: 0.18,
        neckLen: 0.4,
        neckR: 0.32,
        neckTilt: 0.95,
        headSize: [0.38, 0.38, 0.4],
        snoutLen: 0.18,
        bodyMat: 'rock',
        accentMat: 'concrete',
        ears: 'floppy',
        horns: 'tusk',
        tailLen: 0.68,
      }),
    },
    {
      suf: 'mammoth',
      tag: '冰川猛犸象',
      heightM: 3.1,
      widthM: 1.65,
      depthM: 3.85,
      parts: buildQuadrupedParts({
        bodyLen: 1.22,
        bodyW: 0.66,
        bodyH: 0.68,
        legH: 1.28,
        legR: 0.19,
        neckLen: 0.42,
        neckR: 0.34,
        neckTilt: 0.92,
        headSize: [0.4, 0.42, 0.42],
        snoutLen: 0.18,
        bodyMat: 'trunk',
        accentMat: 'dark',
        ears: 'short',
        horns: 'tusk',
        tailLen: 0.62,
      }),
    },
  ]),

  // 10. 灵兔与赤狐
  ...makeCreaturePair('crt_small_wild', '灵兔与赤狐', [
    {
      suf: 'rabbit',
      tag: '林间白兔',
      heightM: 0.56,
      widthM: 0.24,
      depthM: 0.48,
      parts: buildQuadrupedParts({
        bodyLen: 0.16,
        bodyW: 0.095,
        bodyH: 0.095,
        legH: 0.12,
        legR: 0.024,
        neckLen: 0.08,
        neckR: 0.05,
        neckTilt: 0.35,
        headSize: [0.075, 0.07, 0.085],
        snoutLen: 0.04,
        bodyMat: 'default',
        accentMat: 'default',
        ears: 'tall',
        tailLen: 0.1,
        bushyTail: true,
      }),
    },
    {
      suf: 'fox',
      tag: '蓬尾赤狐',
      heightM: 0.58,
      widthM: 0.3,
      depthM: 0.98,
      parts: buildQuadrupedParts({
        bodyLen: 0.3,
        bodyW: 0.12,
        bodyH: 0.125,
        legH: 0.25,
        legR: 0.028,
        neckLen: 0.18,
        neckR: 0.07,
        neckTilt: 0.52,
        headSize: [0.09, 0.085, 0.12],
        snoutLen: 0.1,
        bodyMat: 'car',
        legMat: 'dark',
        accentMat: 'default',
        ears: 'pointed',
        tailLen: 0.42,
        bushyTail: true,
        tailUp: true,
      }),
    },
  ]),

  // 11. 飞禽猛雕与仙鹤
  ...makeCreaturePair('crt_raptor', '飞禽与仙鹤', [
    {
      suf: 'eagle',
      tag: '展翅雄鹰',
      heightM: 1.25,
      widthM: 2.25,
      depthM: 1.05,
      parts: buildBirdParts({
        wingspan: 2.2,
        bodyH: 0.35,
        flying: true,
        bodyMat: 'trunk',
        wingMat: 'dark',
      }),
    },
    {
      suf: 'crane',
      tag: '古风仙鹤',
      heightM: 1.4,
      widthM: 2.4,
      depthM: 1.25,
      parts: buildBirdParts({
        wingspan: 2.35,
        bodyH: 0.38,
        flying: true,
        bodyMat: 'default',
        wingMat: 'dark',
        longNeck: true,
        crest: true,
      }),
    },
  ]),

  // 12. 游鱼、鲨鱼与巨鲸
  ...makeCreaturePair('crt_marine', '鱼群与巨鲸', [
    {
      suf: 'koi',
      tag: '池塘锦鲤鱼群',
      heightM: 1.05,
      widthM: 1.25,
      depthM: 1.45,
      parts: buildFishSchoolParts(),
    },
    {
      suf: 'shark',
      tag: '大白鲨',
      heightM: 1.1,
      widthM: 0.95,
      depthM: 3.1,
      parts: buildSwimmerParts({
        len: 2.9,
        r: 0.32,
        bodyMat: 'rock',
        finMat: 'dark',
        sharkFin: true,
        floatY: 0.75,
      }),
    },
    {
      suf: 'whale',
      tag: '深海座头鲸',
      heightM: 1.9,
      widthM: 2.2,
      depthM: 6.2,
      parts: buildSwimmerParts({
        len: 5.8,
        r: 0.68,
        bodyMat: 'accent',
        finMat: 'dark',
        floatY: 1.2,
      }),
    },
  ]),

  // 13. 巨龟与潜伏鳄鱼
  ...makeCreaturePair('crt_reptile', '陆龟与鳄鱼', [
    {
      suf: 'tortoise',
      tag: '草原巨龟',
      heightM: 0.75,
      widthM: 0.95,
      depthM: 1.35,
      parts: buildQuadrupedParts({
        bodyLen: 0.45,
        bodyW: 0.32,
        bodyH: 0.24,
        legH: 0.22,
        legR: 0.065,
        neckLen: 0.26,
        neckR: 0.075,
        neckTilt: 0.95,
        headSize: [0.095, 0.08, 0.12],
        snoutLen: 0.05,
        bodyMat: 'foliage',
        accentMat: 'trunk',
        shell: true,
        ears: 'short',
        tailLen: 0.18,
      }),
    },
    {
      suf: 'croc',
      tag: '沼泽鳄鱼',
      heightM: 0.52,
      widthM: 0.75,
      depthM: 2.7,
      parts: buildQuadrupedParts({
        bodyLen: 0.85,
        bodyW: 0.25,
        bodyH: 0.16,
        legH: 0.16,
        legR: 0.055,
        neckLen: 0.22,
        neckR: 0.14,
        neckTilt: 1.35,
        headSize: [0.16, 0.09, 0.22],
        snoutLen: 0.36,
        bodyMat: 'foliage',
        accentMat: 'dark',
        ears: 'short',
        tailLen: 0.95,
      }),
    },
  ]),

  // 14. 东方龙与仙侠瑞兽
  ...makeCreaturePair('crt_oriental_dragon', '东方神龙', [
    {
      suf: 'gold',
      tag: '古风金龙',
      heightM: 2.1,
      widthM: 1.05,
      depthM: 4.5,
      parts: buildEasternDragonParts('gold'),
    },
    {
      suf: 'jade',
      tag: '仙侠青龙',
      heightM: 2.1,
      widthM: 1.05,
      depthM: 4.5,
      parts: buildEasternDragonParts('jade'),
    },
  ]),

  // 15. 西方飞龙与狮鹫
  ...makeCreaturePair('crt_wyvern', '奇幻飞龙与狮鹫', [
    {
      suf: 'dragon',
      tag: '中世纪翼龙',
      heightM: 2.25,
      widthM: 2.95,
      depthM: 2.8,
      parts: buildQuadrupedParts({
        bodyLen: 0.76,
        bodyW: 0.32,
        bodyH: 0.34,
        legH: 0.74,
        legR: 0.085,
        neckLen: 0.74,
        neckR: 0.13,
        neckTilt: 0.42,
        headSize: [0.17, 0.15, 0.26],
        snoutLen: 0.22,
        bodyMat: 'car',
        accentMat: 'dark',
        horns: 'cow',
        wingSpan: 1.55,
        tailLen: 1.05,
        ears: 'pointed',
      }),
    },
    {
      suf: 'griffin',
      tag: '皇家狮鹫',
      heightM: 1.68,
      widthM: 2.35,
      depthM: 2.1,
      parts: buildQuadrupedParts({
        bodyLen: 0.62,
        bodyW: 0.26,
        bodyH: 0.28,
        legH: 0.72,
        legR: 0.06,
        neckLen: 0.48,
        neckR: 0.12,
        neckTilt: 0.45,
        headSize: [0.13, 0.12, 0.19],
        snoutLen: 0.15,
        bodyMat: 'car',
        accentMat: 'default',
        wingSpan: 1.15,
        ears: 'pointed',
        tailLen: 0.68,
      }),
    },
  ]),

  // 16. 独角兽与天马
  ...makeCreaturePair('crt_unicorn', '圣光独角兽', [
    {
      suf: 'unicorn',
      tag: '独角兽',
      heightM: 1.85,
      widthM: 0.72,
      depthM: 2.25,
      parts: buildQuadrupedParts({
        bodyLen: 0.68,
        bodyW: 0.28,
        bodyH: 0.3,
        legH: 0.82,
        legR: 0.058,
        neckLen: 0.56,
        neckR: 0.13,
        neckTilt: 0.45,
        headSize: [0.13, 0.13, 0.23],
        snoutLen: 0.14,
        bodyMat: 'default',
        accentMat: 'accent',
        horns: 'unicorn',
        mane: true,
        ears: 'pointed',
        tailLen: 0.7,
      }),
    },
    {
      suf: 'pegasus',
      tag: '展翼天马',
      heightM: 1.9,
      widthM: 2.45,
      depthM: 2.25,
      parts: buildQuadrupedParts({
        bodyLen: 0.68,
        bodyW: 0.28,
        bodyH: 0.3,
        legH: 0.82,
        legR: 0.058,
        neckLen: 0.56,
        neckR: 0.13,
        neckTilt: 0.45,
        headSize: [0.13, 0.13, 0.23],
        snoutLen: 0.14,
        bodyMat: 'default',
        accentMat: 'emissiveLamp',
        horns: 'unicorn',
        wingSpan: 1.15,
        mane: true,
        ears: 'pointed',
        tailLen: 0.7,
      }),
    },
  ]),

  // 17. 巨蛛与独角仙
  ...makeCreaturePair('crt_arthropod', '巨蛛与甲虫', [
    {
      suf: 'spider',
      tag: '奇幻幽穴巨蛛',
      heightM: 0.88,
      widthM: 1.45,
      depthM: 1.45,
      parts: buildSpiderOrBeetleParts('spider'),
    },
    {
      suf: 'beetle',
      tag: '丛林独角甲虫',
      heightM: 0.75,
      widthM: 1.05,
      depthM: 1.35,
      parts: buildSpiderOrBeetleParts('beetle'),
    },
  ]),

  // 18. 科幻仿生生物
  ...makeCreaturePair('crt_scifi_bio', '科幻仿生生物', [
    {
      suf: 'robohound',
      tag: '赛博机械猎犬',
      heightM: 0.82,
      widthM: 0.44,
      depthM: 1.25,
      parts: buildQuadrupedParts({
        bodyLen: 0.42,
        bodyW: 0.17,
        bodyH: 0.17,
        legH: 0.42,
        legR: 0.04,
        neckLen: 0.24,
        neckR: 0.09,
        neckTilt: 0.62,
        headSize: [0.12, 0.1, 0.16],
        snoutLen: 0.12,
        bodyMat: 'concrete',
        accentMat: 'accent',
        legMat: 'dark',
        hoofMat: 'emissiveLamp',
        ears: 'pointed',
        visor: true,
        tailLen: 0.28,
        tailUp: true,
      }),
    },
    {
      suf: 'jelly',
      tag: '异星发光水母',
      heightM: 2.15,
      widthM: 1.08,
      depthM: 1.08,
      parts: buildJellyfishParts(),
    },
  ]),
];
