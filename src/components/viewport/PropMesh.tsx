import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  getVariantSpec,
  type InventoryPart,
} from '../../data/assetInventory';
import {
  getChannelMaterialPool,
  getTintedMaterialForChannel,
} from '../../engine/channelMaterials';
import {
  evaluateObjectAnimationTransform,
  evaluatePartScatter,
  hashStringSeed,
} from '../../engine/objectAnimations';
import { useStudioStore } from '../../store/useStudioStore';
import type {
  ObjectAnimationSpec,
  RenderChannel,
  SceneAsset,
} from '../../types/scene';
import { AnimatedObjectEnvelope } from './AnimatedObjectEnvelope';

let sharedUnitRampGeo: THREE.BufferGeometry | null = null;
function getUnitRampGeometry(): THREE.BufferGeometry {
  if (sharedUnitRampGeo) return sharedUnitRampGeo;
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.5, 1);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.5, 0, 0);
  geo.computeVertexNormals();
  sharedUnitRampGeo = geo;
  return geo;
}

const BEVEL_BOX_CACHE = new Map<string, THREE.BufferGeometry>();

/**
 * Shared architectural chamfer/bevel box geometry cache so boxes across
 * buildings, props, furniture, and mannequins catch smooth rim highlights.
 */
export function getCachedBevelBoxGeometry(
  sx: number,
  sy: number,
  sz: number
): THREE.BufferGeometry {
  const rx = Math.max(0.005, Math.round(sx * 1000) / 1000);
  const ry = Math.max(0.005, Math.round(sy * 1000) / 1000);
  const rz = Math.max(0.005, Math.round(sz * 1000) / 1000);
  const key = `${rx}_${ry}_${rz}`;
  const cached = BEVEL_BOX_CACHE.get(key);
  if (cached) return cached;

  const minDim = Math.min(rx, ry, rz);
  const geo =
    minDim < 0.03
      ? new THREE.BoxGeometry(rx, ry, rz)
      : new RoundedBoxGeometry(rx, ry, rz, 2, Math.min(0.032, minDim * 0.14));

  if (BEVEL_BOX_CACHE.size > 2000) {
    const firstKey = BEVEL_BOX_CACHE.keys().next().value;
    if (firstKey !== undefined) {
      BEVEL_BOX_CACHE.get(firstKey)?.dispose();
      BEVEL_BOX_CACHE.delete(firstKey);
    }
  }
  BEVEL_BOX_CACHE.set(key, geo);
  return geo;
}

function easeOutBack(x: number): number {
  const c1 = 1.68;
  const c3 = c1 + 1;
  const p = x - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

interface PropMeshProps {
  asset: SceneAsset;
  channel: RenderChannel;
  isSelected: boolean;
  onSelect: (id: string) => void;
  groupRef?: (el: THREE.Group | null) => void;
  erasing?: boolean;
}

interface InventoryModelPartsProps {
  parts: InventoryPart[];
  variantKey: string;
  channel: RenderChannel;
  isSelected?: boolean;
  tintColor?: string;
  onPointerDown?: (e: { stopPropagation: () => void }) => void;
  erasing?: boolean;
  animation?: ObjectAnimationSpec;
  objectSeed?: number;
}

export const InventoryModelParts: React.FC<InventoryModelPartsProps> = ({
  parts,
  variantKey,
  channel,
  isSelected = false,
  tintColor,
  onPointerDown,
  erasing = false,
  animation,
  objectSeed = 0.5,
}) => {
  const committedRef = useRef<{ key: string; parts: InventoryPart[] }>({
    key: variantKey,
    parts,
  });
  const outgoingRef = useRef<{ key: string; parts: InventoryPart[] } | null>(null);
  const [outgoingState, setOutgoingState] = useState<{
    key: string;
    parts: InventoryPart[];
  } | null>(null);

  const animRef = useRef<{
    active: boolean;
    mode: 'morph' | 'erase';
    elapsed: number;
    duration: number;
  }>({
    active: true,
    mode: erasing ? 'erase' : 'morph',
    elapsed: 0,
    duration: erasing ? 0.42 : 0.36,
  });

  const rootMorphRef = useRef<THREE.Group | null>(null);
  const inPartRefs = useRef<(THREE.Group | null)[]>([]);
  const outPartRefs = useRef<(THREE.Group | null)[]>([]);
  const didMountInitRef = useRef(false);
  const wasPartScatteredRef = useRef(false);

  // Trigger smooth 3D Dual-Morph + Staggered Elastic Bloom on mount, variant change, or erase
  useLayoutEffect(() => {
    if (erasing) {
      animRef.current = {
        active: true,
        mode: 'erase',
        elapsed: 0,
        duration: 0.42,
      };
      return;
    }

    const prev = committedRef.current;
    if (!didMountInitRef.current) {
      didMountInitRef.current = true;
      committedRef.current = { key: variantKey, parts };
      animRef.current = {
        active: true,
        mode: 'morph',
        elapsed: 0,
        duration: 0.36,
      };
      for (let i = 0; i < parts.length; i++) {
        const grp = inPartRefs.current[i];
        const p = parts[i];
        if (!grp || !p) continue;
        grp.position.set(p.pos[0] * 0.6, p.pos[1] * 0.25, p.pos[2] * 0.6);
        grp.scale.set(0.001, 0.001, 0.001);
      }
      return;
    }

    if (prev.key === variantKey) {
      committedRef.current = { key: variantKey, parts };
      return;
    }

    const outSnap = { key: prev.key, parts: prev.parts };
    outgoingRef.current = outSnap;
    setOutgoingState(outSnap);
    committedRef.current = { key: variantKey, parts };
    animRef.current = {
      active: true,
      mode: 'morph',
      elapsed: 0,
      duration: 0.45,
    };

    // Synchronously initialize incoming parts to their t=0 morph starting pose to avoid any 1-frame flash
    const srcParts = outSnap.parts;
    for (let i = 0; i < parts.length; i++) {
      const grp = inPartRefs.current[i];
      const p = parts[i];
      if (!grp || !p) continue;
      const src = srcParts.length > 0 ? srcParts[i % srcParts.length] : null;
      const startX = src ? THREE.MathUtils.lerp(src.pos[0], p.pos[0] * 0.55, 0.45) : p.pos[0] * 0.6;
      const startY = src ? THREE.MathUtils.lerp(src.pos[1], p.pos[1] * 0.35, 0.45) : p.pos[1] * 0.25;
      const startZ = src ? THREE.MathUtils.lerp(src.pos[2], p.pos[2] * 0.55, 0.45) : p.pos[2] * 0.6;
      grp.position.set(startX, startY, startZ);
      grp.scale.set(0.001, 0.001, 0.001);
    }
  }, [variantKey, parts, erasing]);

  useFrame((_, delta) => {
    const anim = animRef.current;
    if (!anim.active) {
      const currParts = committedRef.current.parts;
      const shouldScatter =
        animation &&
        (animation.preset === 'rock_shatter' || animation.preset === 'crate_scatter');
      if (shouldScatter) {
        const currentTime = useStudioStore.getState().currentTime;
        const ev = evaluateObjectAnimationTransform(animation, currentTime, objectSeed);
        if (ev.scatterProgress > 0.001) {
          wasPartScatteredRef.current = true;
          for (let i = 0; i < currParts.length; i++) {
            const grp = inPartRefs.current[i];
            const p = currParts[i];
            if (!grp || !p) continue;
            const off = evaluatePartScatter(
              animation,
              i,
              p.pos,
              ev.scatterProgress,
              objectSeed
            );
            grp.position.set(
              p.pos[0] + off.posOffset[0],
              p.pos[1] + off.posOffset[1],
              p.pos[2] + off.posOffset[2]
            );
            grp.rotation.set(
              (p.rot?.[0] ?? 0) + off.rotOffset[0],
              (p.rot?.[1] ?? 0) + off.rotOffset[1],
              (p.rot?.[2] ?? 0) + off.rotOffset[2]
            );
            grp.scale.set(off.scale, off.scale, off.scale);
          }
          return;
        }
      }
      if (wasPartScatteredRef.current) {
        wasPartScatteredRef.current = false;
        for (let i = 0; i < currParts.length; i++) {
          const grp = inPartRefs.current[i];
          const p = currParts[i];
          if (!grp || !p) continue;
          grp.position.set(p.pos[0], p.pos[1], p.pos[2]);
          grp.rotation.set(p.rot?.[0] ?? 0, p.rot?.[1] ?? 0, p.rot?.[2] ?? 0);
          grp.scale.set(1, 1, 1);
        }
      }
      return;
    }

    anim.elapsed += Math.min(delta, 0.05);
    const t = Math.min(1, anim.elapsed / anim.duration);
    const currParts = committedRef.current.parts;
    const totalIn = Math.max(1, currParts.length);

    if (anim.mode === 'erase') {
      // Staggered top-to-bottom part dissolve & spiral collapse into ground
      if (rootMorphRef.current) {
        const pop = t < 0.2 ? 1 + (t / 0.2) * 0.08 : Math.max(0.001, (1 - (t - 0.2) / 0.8) * 1.08);
        const easeScale = pop * pop * (2 - pop);
        rootMorphRef.current.scale.set(
          Math.max(0.001, easeScale),
          Math.max(0.001, pop),
          Math.max(0.001, easeScale)
        );
        rootMorphRef.current.rotation.set(t * 0.18, t * 1.35, -t * 0.14);
        rootMorphRef.current.position.set(0, t < 0.18 ? t * 0.9 : -(t - 0.18) * 0.65, 0);
      }
      for (let i = 0; i < currParts.length; i++) {
        const grp = inPartRefs.current[i];
        const p = currParts[i];
        if (!grp || !p) continue;
        // Top parts collapse slightly earlier than base parts
        const revRatio = (totalIn - 1 - i) / totalIn;
        const delay = Math.min(0.28, revRatio * 0.24);
        const lu = THREE.MathUtils.clamp((t - delay) / (1 - delay), 0, 1);
        const collapse = lu * lu;
        const sPart = Math.max(0.0001, 1 - collapse);
        const px = THREE.MathUtils.lerp(p.pos[0], p.pos[0] * 0.3, collapse);
        const py = THREE.MathUtils.lerp(p.pos[1], p.pos[1] * 0.2, collapse);
        const pz = THREE.MathUtils.lerp(p.pos[2], p.pos[2] * 0.3, collapse);
        grp.position.set(px, py, pz);
        grp.rotation.set(
          p.rot?.[0] ?? 0,
          (p.rot?.[1] ?? 0) + collapse * 0.65,
          p.rot?.[2] ?? 0
        );
        grp.scale.set(sPart, sPart, sPart);
      }
      if (t >= 1) {
        anim.active = false;
      }
      return;
    }

    const outSnap = outgoingRef.current;

    // 1. Whole-object subtle elastic squash & stretch wave
    if (rootMorphRef.current) {
      if (t >= 1) {
        rootMorphRef.current.scale.set(1, 1, 1);
        rootMorphRef.current.rotation.set(0, 0, 0);
      } else {
        const wave = Math.sin(t * Math.PI * 2) * (1 - t);
        const sy = 1 - wave * 0.07;
        const sxz = 1 + wave * 0.04;
        rootMorphRef.current.scale.set(sxz, sy, sxz);
      }
    }

    // 2. Outgoing parts: smoothly morph toward incoming positions while collapsing
    if (outSnap) {
      const uOut = Math.min(1, t / 0.58);
      const easeCollapse = uOut * uOut * (3 - 2 * uOut);
      const sOut = Math.max(0.0001, 1 - easeCollapse);

      for (let i = 0; i < outSnap.parts.length; i++) {
        const grp = outPartRefs.current[i];
        const p = outSnap.parts[i];
        if (!grp || !p) continue;
        const dst = currParts[i % totalIn] ?? p;
        const px = THREE.MathUtils.lerp(p.pos[0], dst.pos[0], easeCollapse * 0.6);
        const py = THREE.MathUtils.lerp(p.pos[1], dst.pos[1] * 0.6, easeCollapse * 0.6);
        const pz = THREE.MathUtils.lerp(p.pos[2], dst.pos[2], easeCollapse * 0.6);
        const rx = p.rot?.[0] ?? 0;
        const ry = (p.rot?.[1] ?? 0) + easeCollapse * 0.28;
        const rz = p.rot?.[2] ?? 0;
        grp.position.set(px, py, pz);
        grp.rotation.set(rx, ry, rz);
        grp.scale.set(sOut, sOut, sOut);
      }
    }

    // 3. Incoming parts: staggered bottom-to-top morph from outgoing part positions + elastic spring
    const srcParts = outSnap?.parts ?? [];
    for (let i = 0; i < currParts.length; i++) {
      const grp = inPartRefs.current[i];
      const p = currParts[i];
      if (!grp || !p) continue;

      if (t >= 1) {
        grp.position.set(p.pos[0], p.pos[1], p.pos[2]);
        grp.rotation.set(p.rot?.[0] ?? 0, p.rot?.[1] ?? 0, p.rot?.[2] ?? 0);
        grp.scale.set(1, 1, 1);
        continue;
      }

      const delay = Math.min(0.26, (i / totalIn) * 0.22);
      const lu = THREE.MathUtils.clamp((t - delay) / (1 - delay), 0, 1);
      const easePos = 1 - Math.pow(1 - lu, 3);
      const sIn = lu <= 0.001 ? 0.0001 : Math.max(0.0001, easeOutBack(lu));

      const src = srcParts.length > 0 ? srcParts[i % srcParts.length] : null;
      const startX = src ? THREE.MathUtils.lerp(src.pos[0], p.pos[0] * 0.55, 0.45) : p.pos[0] * 0.6;
      const startY = src ? THREE.MathUtils.lerp(src.pos[1], p.pos[1] * 0.35, 0.45) : p.pos[1] * 0.25;
      const startZ = src ? THREE.MathUtils.lerp(src.pos[2], p.pos[2] * 0.55, 0.45) : p.pos[2] * 0.6;

      const px = THREE.MathUtils.lerp(startX, p.pos[0], easePos);
      const py = THREE.MathUtils.lerp(startY, p.pos[1], easePos);
      const pz = THREE.MathUtils.lerp(startZ, p.pos[2], easePos);

      const rx = p.rot?.[0] ?? 0;
      const ry = (p.rot?.[1] ?? 0) - (1 - easePos) * 0.26;
      const rz = p.rot?.[2] ?? 0;

      grp.position.set(px, py, pz);
      grp.rotation.set(rx, ry, rz);
      grp.scale.set(sIn, sIn, sIn);
    }

    if (t >= 1) {
      anim.active = false;
      outgoingRef.current = null;
      setOutgoingState(null);
    }
  });

  const unitRampGeo = useMemo(() => {
    const hasRamp =
      parts.some((p) => p.shape === 'ramp') ||
      (outgoingState?.parts.some((p) => p.shape === 'ramp') ?? false);
    return hasRamp ? getUnitRampGeometry() : null;
  }, [parts, outgoingState]);

  const wireMat = getChannelMaterialPool().wireframeOverlay;
  const showWire = channel === 'wireframe';

  const renderPart = (
    part: InventoryPart,
    idx: number,
    keyPrefix: string,
    refList: React.MutableRefObject<(THREE.Group | null)[]>,
    interactive: boolean
  ) => {
    const mat = getTintedMaterialForChannel(
      channel,
      isSelected,
      part.variant ?? 'default',
      tintColor
    );
    const rot: [number, number, number] = part.rot ?? [0, 0, 0];
    const [sx, sy, sz] = part.size;
    const ptrHandler = interactive ? onPointerDown : undefined;

    const wrapMesh = (geoElement: React.ReactNode, meshScale?: [number, number, number]) => (
      <group
        key={`${keyPrefix}_${idx}`}
        ref={(el) => {
          refList.current[idx] = el;
        }}
        position={part.pos}
        rotation={rot}
      >
        <mesh
          castShadow
          receiveShadow
          scale={meshScale}
          material={mat}
          onPointerDown={ptrHandler}
        >
          {geoElement}
        </mesh>
        {showWire && (
          <mesh scale={meshScale} material={wireMat}>
            {geoElement}
          </mesh>
        )}
      </group>
    );

    switch (part.shape) {
      case 'box': {
        const boxGeo = getCachedBevelBoxGeometry(sx, sy, sz);
        return (
          <group
            key={`${keyPrefix}_${idx}`}
            ref={(el) => {
              refList.current[idx] = el;
            }}
            position={part.pos}
            rotation={rot}
          >
            <mesh
              geometry={boxGeo}
              material={mat}
              castShadow
              receiveShadow
              onPointerDown={ptrHandler}
            />
            {showWire && <mesh geometry={boxGeo} material={wireMat} />}
          </group>
        );
      }
      case 'cylinder':
        return wrapMesh(<cylinderGeometry args={[sx, sy, sz, 24]} />);
      case 'cone': {
        const rawSegs = Math.round(sz);
        const coneSegs =
          rawSegs > 0 && rawSegs <= 6
            ? rawSegs
            : Math.max(20, rawSegs || 22);
        return wrapMesh(<coneGeometry args={[sx, sy, coneSegs]} />);
      }
      case 'sphere':
        return wrapMesh(<sphereGeometry args={[1, 24, 18]} />, [sx, sy, sz]);
      case 'dodecahedron':
        return wrapMesh(<dodecahedronGeometry args={[1, 1]} />, [sx, sy, sz]);
      case 'torus':
        return wrapMesh(
          <torusGeometry args={[sx, sy, 14, Math.max(24, Math.round(sz) || 28)]} />
        );
      case 'ramp':
        return unitRampGeo ? (
          <group
            key={`${keyPrefix}_${idx}`}
            ref={(el) => {
              refList.current[idx] = el;
            }}
            position={part.pos}
            rotation={rot}
          >
            <mesh
              geometry={unitRampGeo}
              scale={[sx, sy, sz]}
              material={mat}
              castShadow
              receiveShadow
              onPointerDown={ptrHandler}
            />
            {showWire && (
              <mesh
                geometry={unitRampGeo}
                scale={[sx, sy, sz]}
                material={wireMat}
              />
            )}
          </group>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <group ref={rootMorphRef}>
      {outgoingState &&
        outgoingState.parts.map((part, idx) =>
          renderPart(part, idx, `out_${outgoingState.key}`, outPartRefs, false)
        )}
      {parts.map((part, idx) =>
        renderPart(part, idx, `in_${variantKey}`, inPartRefs, true)
      )}
    </group>
  );
};

export const PropMesh: React.FC<PropMeshProps> = ({
  asset,
  channel,
  isSelected,
  onSelect,
  groupRef,
  erasing = false,
}) => {
  const variantSpec = useMemo(
    () => getVariantSpec(asset.type, asset.variantId),
    [asset.type, asset.variantId]
  );
  const objectSeed = useMemo(() => hashStringSeed(asset.id), [asset.id]);
  const baseHeightM = useMemo(() => {
    let maxY = 1.2;
    for (const p of variantSpec.parts) {
      maxY = Math.max(maxY, p.pos[1] + p.size[1] * 0.5);
    }
    return maxY;
  }, [variantSpec]);

  if (!asset.visible) return null;

  const handlePointerDown = (e: { stopPropagation: () => void }) => {
    if (erasing || asset.locked || useStudioStore.getState().pendingPlacement) return;
    e.stopPropagation();
    onSelect(asset.id);
  };

  const isNonWallProp =
    asset.type === 'tree' ||
    asset.type === 'lamp' ||
    asset.type === 'scene_prop' ||
    asset.type === 'creature';

  return (
    <group
      ref={groupRef}
      name={asset.id}
      position={asset.position}
      rotation={asset.rotation}
      scale={asset.scale}
      userData={isNonWallProp ? { noCameraCollide: true } : undefined}
    >
      <AnimatedObjectEnvelope
        objectId={asset.id}
        animation={erasing ? undefined : asset.animation}
        channel={channel}
        baseHeightM={baseHeightM}
        tintColor={asset.tintColor}
        hideShellOnShatter={variantSpec.parts.length <= 2}
      >
        <InventoryModelParts
          parts={variantSpec.parts}
          variantKey={variantSpec.id}
          channel={channel}
          isSelected={isSelected}
          tintColor={asset.tintColor}
          onPointerDown={handlePointerDown}
          erasing={erasing}
          animation={erasing ? undefined : asset.animation}
          objectSeed={objectSeed}
        />
      </AnimatedObjectEnvelope>
    </group>
  );
};
