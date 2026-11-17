import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  getCharacterVariantSpec,
  getVariantSpec,
  type InventoryPart,
} from '../../data/assetInventory';
import type { PendingPlacement } from '../../types/scene';

interface PlacementGhostProps {
  placement: PendingPlacement;
  groupRef: React.Ref<THREE.Group>;
}

const NOOP_RAYCAST = () => null;

export const PlacementGhost: React.FC<PlacementGhostProps> = ({
  placement,
  groupRef,
}) => {
  const ghostMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
        roughness: 0.5,
      }),
    []
  );

  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#0ea5e9',
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  const treeRingMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#10b981',
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  const treeFillMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#10b981',
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  const rockRingMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#d97706',
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  const rockFillMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f59e0b',
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  const eraserRingMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f43f5e',
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  const eraserFillMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f43f5e',
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  const parts: InventoryPart[] = useMemo(() => {
    if (placement.kind === 'object_eraser') {
      return [];
    }
    if (placement.kind === 'character') {
      return getCharacterVariantSpec(placement.variantId).parts;
    }
    if (placement.kind === 'tree_brush') {
      return getVariantSpec('tree', placement.variantId).parts;
    }
    if (placement.kind === 'rock_brush') {
      return getVariantSpec('rock', placement.variantId).parts;
    }
    if (placement.propType) {
      return getVariantSpec(placement.propType, placement.variantId).parts;
    }
    return [];
  }, [placement]);

  const renderGhostPart = (p: InventoryPart, idx: number) => {
    const rot: [number, number, number] = p.rot ?? [0, 0, 0];
    const [sx, sy, sz] = p.size;

    switch (p.shape) {
      case 'box':
      case 'ramp':
        return (
          <mesh
            key={idx}
            position={p.pos}
            rotation={rot}
            material={ghostMat}
            raycast={NOOP_RAYCAST}
          >
            <boxGeometry args={[sx, sy, sz]} />
          </mesh>
        );
      case 'cylinder':
        return (
          <mesh
            key={idx}
            position={p.pos}
            rotation={rot}
            material={ghostMat}
            raycast={NOOP_RAYCAST}
          >
            <cylinderGeometry args={[sx, sy, sz, 12]} />
          </mesh>
        );
      case 'cone':
        return (
          <mesh
            key={idx}
            position={p.pos}
            rotation={rot}
            material={ghostMat}
            raycast={NOOP_RAYCAST}
          >
            <coneGeometry args={[sx, sy, Math.max(4, Math.round(sz) || 10)]} />
          </mesh>
        );
      case 'sphere':
        return (
          <mesh
            key={idx}
            position={p.pos}
            rotation={rot}
            scale={[sx, sy, sz]}
            material={ghostMat}
            raycast={NOOP_RAYCAST}
          >
            <sphereGeometry args={[1, 10, 8]} />
          </mesh>
        );
      case 'dodecahedron':
        return (
          <mesh
            key={idx}
            position={p.pos}
            rotation={rot}
            scale={[sx, sy, sz]}
            material={ghostMat}
            raycast={NOOP_RAYCAST}
          >
            <dodecahedronGeometry args={[1, 1]} />
          </mesh>
        );
      case 'torus':
        return (
          <mesh
            key={idx}
            position={p.pos}
            rotation={rot}
            material={ghostMat}
            raycast={NOOP_RAYCAST}
          >
            <torusGeometry args={[sx, sy, 8, Math.max(8, Math.round(sz) || 16)]} />
          </mesh>
        );
      default:
        return null;
    }
  };

  const isTreeBrush = placement.kind === 'tree_brush';
  const isRockBrush = placement.kind === 'rock_brush';
  const isScatterBrush = isTreeBrush || isRockBrush;
  const isObjectEraser = placement.kind === 'object_eraser';
  const areaRadius =
    isScatterBrush || isObjectEraser
      ? Math.max(
          2,
          placement.brushRadius ?? (isTreeBrush ? 12 : isRockBrush ? 10 : 10)
        )
      : 0;

  const ringInner =
    isScatterBrush || isObjectEraser
      ? Math.max(1.2, areaRadius - 0.35)
      : placement.kind === 'road_brush'
      ? Math.max(0.8, (placement.roadWidth ?? 8) * 0.5 - 0.18)
      : 0.75;
  const ringOuter =
    isScatterBrush || isObjectEraser
      ? areaRadius
      : placement.kind === 'road_brush'
      ? Math.max(1.0, (placement.roadWidth ?? 8) * 0.5)
      : 0.92;

  const activeRingMat = isObjectEraser
    ? eraserRingMat
    : isTreeBrush
    ? treeRingMat
    : isRockBrush
    ? rockRingMat
    : ringMat;

  const activeFillMat = isObjectEraser
    ? eraserFillMat
    : isRockBrush
    ? rockFillMat
    : treeFillMat;

  return (
    <group ref={groupRef} visible={false} name="__placement_ghost__">
      {/* Ground aim reticle ring + center dot */}
      <mesh
        position={[0, 0.08, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={activeRingMat}
        raycast={NOOP_RAYCAST}
      >
        <ringGeometry args={[ringInner, ringOuter, 48]} />
      </mesh>
      {(isScatterBrush || isObjectEraser) && (
        <mesh
          position={[0, 0.06, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={activeFillMat}
          raycast={NOOP_RAYCAST}
        >
          <circleGeometry args={[ringInner, 48]} />
        </mesh>
      )}
      {isObjectEraser && (
        <>
          <mesh
            position={[0, 0.1, 0]}
            rotation={[-Math.PI / 2, 0, Math.PI / 4]}
            material={eraserRingMat}
            raycast={NOOP_RAYCAST}
          >
            <planeGeometry args={[Math.min(areaRadius * 0.85, 6), 0.32]} />
          </mesh>
          <mesh
            position={[0, 0.1, 0]}
            rotation={[-Math.PI / 2, 0, -Math.PI / 4]}
            material={eraserRingMat}
            raycast={NOOP_RAYCAST}
          >
            <planeGeometry args={[Math.min(areaRadius * 0.85, 6), 0.32]} />
          </mesh>
        </>
      )}
      <mesh
        position={[0, 0.09, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={activeRingMat}
        raycast={NOOP_RAYCAST}
      >
        <circleGeometry args={[0.18, 16]} />
      </mesh>
      {parts.map((part, idx) => renderGhostPart(part, idx))}
      {isScatterBrush && parts.length > 0 && (
        <>
          <group
            position={[-areaRadius * 0.42, 0, areaRadius * 0.28]}
            rotation={[0, 1.2, 0]}
            scale={[0.88, 0.88, 0.88]}
          >
            {parts.map((part, idx) => renderGhostPart(part, idx))}
          </group>
          <group
            position={[areaRadius * 0.38, 0, -areaRadius * 0.3]}
            rotation={[0, 2.6, 0]}
            scale={[1.08, 1.08, 1.08]}
          >
            {parts.map((part, idx) => renderGhostPart(part, idx))}
          </group>
        </>
      )}
    </group>
  );
};
