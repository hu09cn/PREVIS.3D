import React, { useMemo } from 'react';
import type { InventoryPart } from '../../data/assetInventory';
import type { ClayVariant } from '../../engine/channelMaterials';

interface AssetVariantThumbProps {
  parts: InventoryPart[];
  tintColor?: string;
  size?: number;
  className?: string;
}

const COS_A = Math.cos(Math.PI / 6); // 30 deg iso
const SIN_A = Math.sin(Math.PI / 6);
const ELEV = 0.88;

function projectIso(x: number, y: number, z: number): [number, number] {
  // Simple crisp isometric projection: X right-forward, Z left-forward, Y up
  const px = (x - z) * COS_A;
  const py = -y * ELEV + (x + z) * SIN_A * 0.55;
  return [px, py];
}

function getShadeTriplet(variant: ClayVariant = 'default', tintColor?: string) {
  if (tintColor && variant !== 'dark' && variant !== 'trunk' && variant !== 'emissiveLamp') {
    return {
      top: tintColor,
      left: tintColor,
      right: tintColor,
      stroke: 'rgba(15,23,42,0.22)',
      opacity: 0.9,
    };
  }
  switch (variant) {
    case 'trunk':
      return { top: '#b2a699', left: '#9e9183', right: '#867a6d', stroke: '#74685c', opacity: 1 };
    case 'dark':
    case 'mannequinAccent':
      return { top: '#9ca3af', left: '#858d99', right: '#6b7280', stroke: '#525864', opacity: 1 };
    case 'emissiveLamp':
      return { top: '#fde68a', left: '#fcd34d', right: '#f59e0b', stroke: '#d97706', opacity: 1 };
    case 'foliage':
      return { top: '#eaebe6', left: '#dcdfd6', right: '#c7cbc0', stroke: '#a9afa2', opacity: 1 };
    case 'car':
      return { top: '#e4eaf0', left: '#d2dce6', right: '#bac6d3', stroke: '#93a2b3', opacity: 1 };
    case 'road':
      return { top: '#838b96', left: '#6f7680', right: '#5a6069', stroke: '#454a52', opacity: 1 };
    case 'water':
      return { top: '#7dd3fc', left: '#38bdf8', right: '#0284c7', stroke: '#0369a1', opacity: 0.85 };
    case 'concrete':
    case 'rock':
      return { top: '#e4e2dc', left: '#d4d1ca', right: '#bfbcb4', stroke: '#9e9b93', opacity: 1 };
    case 'wood':
      return { top: '#e8dfd1', left: '#d9ccb8', right: '#c5b59d', stroke: '#a6947c', opacity: 1 };
    case 'accent':
      return { top: '#ecebe6', left: '#dedcd5', right: '#cac7be', stroke: '#a7a49c', opacity: 1 };
    case 'default':
    case 'mannequinBody':
    default:
      return { top: '#f5f4f0', left: '#e6e4de', right: '#d2d0c8', stroke: '#b2afa7', opacity: 1 };
  }
}

function rotateVec(
  x: number,
  y: number,
  z: number,
  rot?: [number, number, number]
): [number, number, number] {
  if (!rot || (rot[0] === 0 && rot[1] === 0 && rot[2] === 0)) return [x, y, z];
  const [rx, ry, rz] = rot;
  // Euler XYZ
  let y1 = y * Math.cos(rx) - z * Math.sin(rx);
  let z1 = y * Math.sin(rx) + z * Math.cos(rx);
  let x1 = x;

  const x2 = x1 * Math.cos(ry) + z1 * Math.sin(ry);
  const z2 = -x1 * Math.sin(ry) + z1 * Math.cos(ry);
  x1 = x2;
  z1 = z2;

  const x3 = x1 * Math.cos(rz) - y1 * Math.sin(rz);
  const y3 = x1 * Math.sin(rz) + y1 * Math.cos(rz);
  return [x3, y3, z1];
}

type CachedThumb = { elements: React.ReactNode[]; viewBox: string };
const THUMB_RENDER_CACHE = new WeakMap<InventoryPart[], Map<string, CachedThumb>>();

function computeThumbRenderData(
  parts: InventoryPart[],
  tintColor?: string
): CachedThumb {
  const tintKey = tintColor ?? '__default__';
  let byTint = THUMB_RENDER_CACHE.get(parts);
  const hit = byTint?.get(tintKey);
  if (hit) return hit;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const expandPoint = (px: number, py: number, pad = 0) => {
    if (px - pad < minX) minX = px - pad;
    if (px + pad > maxX) maxX = px + pad;
    if (py - pad < minY) minY = py - pad;
    if (py + pad > maxY) maxY = py + pad;
  };

  const sortedParts = [...parts].sort((a, b) => {
    const da = a.pos[0] + a.pos[2] + a.pos[1] * 0.45;
    const db = b.pos[0] + b.pos[2] + b.pos[1] * 0.45;
    return da - db;
  });

  const shapes: React.ReactNode[] = [];

  sortedParts.forEach((p, idx) => {
    const [cx, cy, cz] = p.pos;
    const [sx, sy, sz] = p.size;
    const shade = getShadeTriplet(p.variant ?? 'default', tintColor);

    if (p.shape === 'box' || p.shape === 'ramp') {
      const hx = sx * 0.5;
      const hy = p.shape === 'ramp' ? sy : sy * 0.5;
      const hz = sz * 0.5;
      const yOff = p.shape === 'ramp' ? sy * 0.5 : 0;

      const corner = (dx: number, dy: number, dz: number): [number, number] => {
        const [rx, ry, rz] = rotateVec(dx, dy, dz, p.rot);
        const pt = projectIso(cx + rx, cy + yOff + ry, cz + rz);
        expandPoint(pt[0], pt[1], 0.04);
        return pt;
      };

      if (p.shape === 'ramp') {
        const b0 = corner(-hx, -sy * 0.5, hz);
        const b1 = corner(hx, -sy * 0.5, hz);
        const b2 = corner(hx, -sy * 0.5, -hz);
        const b3 = corner(-hx, -sy * 0.5, -hz);
        const t2 = corner(hx, sy * 0.5, -hz);
        const t3 = corner(-hx, sy * 0.5, -hz);

        shapes.push(
          <g key={idx} opacity={shade.opacity}>
            <polygon
              points={`${b0} ${b1} ${t2} ${t3}`}
              fill={shade.top}
              stroke={shade.stroke}
              strokeWidth={0.05}
              strokeLinejoin="round"
            />
            <polygon
              points={`${b1} ${b2} ${t2}`}
              fill={shade.right}
              stroke={shade.stroke}
              strokeWidth={0.05}
              strokeLinejoin="round"
            />
            <polygon
              points={`${b0} ${b3} ${t3}`}
              fill={shade.left}
              stroke={shade.stroke}
              strokeWidth={0.05}
              strokeLinejoin="round"
            />
          </g>
        );
        return;
      }

      const pTopFront = corner(hx, hy, hz);
      const pTopRight = corner(hx, hy, -hz);
      const pTopBack = corner(-hx, hy, -hz);
      const pTopLeft = corner(-hx, hy, hz);
      const pBotFront = corner(hx, -hy, hz);
      const pBotRight = corner(hx, -hy, -hz);
      const pBotLeft = corner(-hx, -hy, hz);

      const pts = (list: [number, number][]) => list.map((q) => q.join(',')).join(' ');

      shapes.push(
        <g key={idx} opacity={shade.opacity}>
          <polygon
            points={pts([pTopLeft, pTopFront, pBotFront, pBotLeft])}
            fill={shade.left}
            stroke={shade.stroke}
            strokeWidth={0.045}
            strokeLinejoin="round"
          />
          <polygon
            points={pts([pTopFront, pTopRight, pBotRight, pBotFront])}
            fill={shade.right}
            stroke={shade.stroke}
            strokeWidth={0.045}
            strokeLinejoin="round"
          />
          <polygon
            points={pts([pTopBack, pTopRight, pTopFront, pTopLeft])}
            fill={shade.top}
            stroke={shade.stroke}
            strokeWidth={0.045}
            strokeLinejoin="round"
          />
        </g>
      );
    } else if (p.shape === 'cylinder') {
      const halfH = sz * 0.5;
      const [rx1, ry1, rz1] = rotateVec(0, halfH, 0, p.rot);
      const [rx2, ry2, rz2] = rotateVec(0, -halfH, 0, p.rot);
      const top = projectIso(cx + rx1, cy + ry1, cz + rz1);
      const bot = projectIso(cx + rx2, cy + ry2, cz + rz2);
      const rTop = Math.max(0.06, sx);
      const rBot = Math.max(0.06, sy);
      expandPoint(top[0], top[1], rTop);
      expandPoint(bot[0], bot[1], rBot);

      const dx = top[0] - bot[0];
      const dy = top[1] - bot[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      const pts = [
        [top[0] + nx * rTop, top[1] + ny * rTop],
        [top[0] - nx * rTop, top[1] - ny * rTop],
        [bot[0] - nx * rBot, bot[1] - ny * rBot],
        [bot[0] + nx * rBot, bot[1] + ny * rBot],
      ]
        .map((q) => q.join(','))
        .join(' ');

      shapes.push(
        <g key={idx} opacity={shade.opacity}>
          <polygon
            points={pts}
            fill={shade.left}
            stroke={shade.stroke}
            strokeWidth={0.045}
            strokeLinejoin="round"
          />
          <ellipse
            cx={top[0]}
            cy={top[1]}
            rx={rTop}
            ry={rTop * 0.45}
            fill={shade.top}
            stroke={shade.stroke}
            strokeWidth={0.04}
          />
        </g>
      );
    } else if (p.shape === 'cone') {
      const halfH = sy * 0.5;
      const r = Math.max(0.1, sx);
      const [rx1, ry1, rz1] = rotateVec(0, halfH, 0, p.rot);
      const [rx2, ry2, rz2] = rotateVec(0, -halfH, 0, p.rot);
      const tip = projectIso(cx + rx1, cy + ry1, cz + rz1);
      const base = projectIso(cx + rx2, cy + ry2, cz + rz2);
      expandPoint(tip[0], tip[1], 0.08);
      expandPoint(base[0], base[1], r);

      shapes.push(
        <g key={idx} opacity={shade.opacity}>
          <polygon
            points={`${tip[0]},${tip[1]} ${base[0] - r},${base[1]} ${base[0] + r},${base[1]}`}
            fill={shade.top}
            stroke={shade.stroke}
            strokeWidth={0.045}
            strokeLinejoin="round"
          />
        </g>
      );
    } else if (p.shape === 'torus') {
      const center = projectIso(cx, cy, cz);
      const majorR = Math.max(0.12, sx * 0.92);
      const tubeR = Math.max(0.035, Math.min(majorR * 0.45, sy * 1.15));
      const flatHoriz = Math.abs(p.rot?.[0] ?? 0) > 0.9;
      const rxIso = majorR;
      const ryIso = flatHoriz ? majorR * 0.56 : majorR * 0.88;
      expandPoint(center[0], center[1], Math.max(rxIso, ryIso) + tubeR);

      shapes.push(
        <g key={idx} opacity={shade.opacity}>
          <ellipse
            cx={center[0]}
            cy={center[1]}
            rx={rxIso}
            ry={ryIso}
            fill="none"
            stroke={shade.stroke}
            strokeWidth={tubeR * 1.45}
          />
          <ellipse
            cx={center[0]}
            cy={center[1]}
            rx={rxIso}
            ry={ryIso}
            fill="none"
            stroke={shade.top}
            strokeWidth={tubeR * 0.95}
          />
        </g>
      );
    } else {
      const center = projectIso(cx, cy, cz);
      const rx = Math.max(0.12, (sx + sz) * 0.48);
      const ry = Math.max(0.12, sy * 0.88);
      expandPoint(center[0], center[1], Math.max(rx, ry));

      shapes.push(
        <g key={idx} opacity={shade.opacity}>
          <ellipse
            cx={center[0]}
            cy={center[1]}
            rx={rx}
            ry={ry}
            fill={shade.left}
            stroke={shade.stroke}
            strokeWidth={0.045}
          />
          <ellipse
            cx={center[0] - rx * 0.18}
            cy={center[1] - ry * 0.22}
            rx={rx * 0.58}
            ry={ry * 0.52}
            fill={shade.top}
            opacity={0.75}
          />
        </g>
      );
    }
  });

  let result: CachedThumb;
  if (!Number.isFinite(minX)) {
    result = { elements: shapes, viewBox: '-1 -1 2 2' };
  } else {
    const w = Math.max(0.6, maxX - minX);
    const h = Math.max(0.6, maxY - minY);
    const span = Math.max(w, h) * 1.24;
    const midX = (minX + maxX) * 0.5;
    const midY = (minY + maxY) * 0.5;
    result = {
      elements: shapes,
      viewBox: `${(midX - span * 0.5).toFixed(3)} ${(midY - span * 0.5).toFixed(3)} ${span.toFixed(3)} ${span.toFixed(3)}`,
    };
  }

  if (!byTint) {
    byTint = new Map();
    THUMB_RENDER_CACHE.set(parts, byTint);
  }
  byTint.set(tintKey, result);
  return result;
}

/**
 * Precompute isometric thumbnail projection during startup preload so opening any
 * Asset Library category renders instantaneously without main-thread hitching.
 */
export function warmAssetVariantThumb(parts: InventoryPart[], tintColor?: string): void {
  computeThumbRenderData(parts, tintColor);
}

const AssetVariantThumbInner: React.FC<AssetVariantThumbProps> = ({
  parts,
  tintColor,
  size = 48,
  className = '',
}) => {
  const { elements, viewBox } = useMemo(
    () => computeThumbRenderData(parts, tintColor),
    [parts, tintColor]
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {elements}
    </svg>
  );
};

export const AssetVariantThumb = React.memo(AssetVariantThumbInner);
