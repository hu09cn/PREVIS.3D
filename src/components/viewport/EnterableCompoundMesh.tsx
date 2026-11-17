import React from 'react';
import * as THREE from 'three';
import {
  getChannelMaterialPool,
  getMaterialForChannel,
} from '../../engine/channelMaterials';
import { useStudioStore } from '../../store/useStudioStore';
import type { HeroCompoundSpec, RenderChannel } from '../../types/scene';
import { AnimatedObjectEnvelope } from './AnimatedObjectEnvelope';

interface EnterableCompoundMeshProps {
  compound: HeroCompoundSpec;
  channel: RenderChannel;
  isSelected: boolean;
  onSelect: (id: string) => void;
  groupRef?: (el: THREE.Group | null) => void;
}

/**
 * Indoor-Outdoor Connected Hero Building (14m x 10m, 2 Floors + Rooftop).
 * Local origin at bottom-center, front doorway faces +Z toward the street.
 * Cameras can push seamlessly from exterior street -> porch steps -> doorway ->
 * 1F lobby (with interior stairs & columns) -> 2F balcony -> rooftop.
 */
export const EnterableCompoundMesh: React.FC<EnterableCompoundMeshProps> = ({
  compound,
  channel,
  isSelected,
  onSelect,
  groupRef,
}) => {
  if (!compound.visible) return null;

  const mat = getMaterialForChannel(channel, isSelected, 'default');
  const accentMat = getMaterialForChannel(channel, isSelected, 'accent');
  const darkMat = getMaterialForChannel(channel, isSelected, 'dark');
  const wireMat = getChannelMaterialPool().wireframeOverlay;
  const showWire = channel === 'wireframe';

  const handlePointerDown = (e: { stopPropagation: () => void }) => {
    if (compound.locked || useStudioStore.getState().pendingPlacement) return;
    e.stopPropagation();
    onSelect(compound.id);
  };

  const BoxPart = ({
    args,
    pos,
    rot = [0, 0, 0] as [number, number, number],
    variant = 'default' as 'default' | 'accent' | 'dark',
  }: {
    args: [number, number, number];
    pos: [number, number, number];
    rot?: [number, number, number];
    variant?: 'default' | 'accent' | 'dark';
  }) => {
    const m =
      variant === 'accent' ? accentMat : variant === 'dark' ? darkMat : mat;
    return (
      <group position={pos} rotation={rot}>
        <mesh
          castShadow
          receiveShadow
          material={m}
          onPointerDown={handlePointerDown}
        >
          <boxGeometry args={args} />
        </mesh>
        {showWire && (
          <mesh material={wireMat}>
            <boxGeometry args={args} />
          </mesh>
        )}
      </group>
    );
  };

  // Interior stairs from 1F (y=0.25) to 2F (y=3.45), along -Z at x=-4.4
  const stairSteps = Array.from({ length: 10 }, (_, i) => {
    const stepH = 3.2 / 10;
    const y = 0.25 + stepH * (i + 0.5);
    const z = 2.0 - i * 0.45;
    return (
      <BoxPart
        key={`in_stair_${i}`}
        args={[1.6, stepH, 0.48]}
        pos={[-4.5, y, z]}
        variant="dark"
      />
    );
  });

  // Exterior stairs from 2F balcony side to rooftop
  const roofStairs = Array.from({ length: 10 }, (_, i) => {
    const stepH = 3.2 / 10;
    const y = 3.45 + stepH * (i + 0.5);
    const z = -2.5 + i * 0.42;
    return (
      <BoxPart
        key={`ext_stair_${i}`}
        args={[1.1, stepH * 0.6, 0.44]}
        pos={[7.65, y, z]}
        variant="dark"
      />
    );
  });

  return (
    <group
      ref={groupRef}
      name={compound.id}
      position={compound.position}
      rotation={[0, compound.rotationY, 0]}
    >
      <AnimatedObjectEnvelope
        objectId={compound.id}
        animation={compound.animation}
        channel={channel}
        baseHeightM={8.0}
      >
        {/* --- Ground Plinth & Entrance Porch Steps (Facing +Z) --- */}
      <BoxPart args={[14.4, 0.25, 10.4]} pos={[0, 0.125, 0]} variant="dark" />
      <BoxPart args={[4.4, 0.12, 1.4]} pos={[0, 0.06, 5.7]} variant="accent" />
      <BoxPart args={[3.8, 0.12, 0.8]} pos={[0, 0.18, 5.4]} variant="accent" />
      {/* Entrance Awning Canopy */}
      <BoxPart args={[4.6, 0.16, 1.8]} pos={[0, 3.05, 5.8]} rot={[0.08, 0, 0]} variant="accent" />

      {/* --- 1F Front Wall with Open 2.8m x 2.7m Doorway --- */}
      <BoxPart args={[5.6, 3.2, 0.32]} pos={[-4.2, 1.85, 4.84]} />
      <BoxPart args={[5.6, 3.2, 0.32]} pos={[4.2, 1.85, 4.84]} />
      <BoxPart args={[2.8, 0.55, 0.32]} pos={[0, 3.175, 4.84]} />
      {/* Doorframe Trim */}
      <BoxPart args={[0.16, 2.7, 0.42]} pos={[-1.4, 1.6, 4.84]} variant="accent" />
      <BoxPart args={[0.16, 2.7, 0.42]} pos={[1.4, 1.6, 4.84]} variant="accent" />

      {/* --- 1F Side & Back Walls with Window Openings & Sills --- */}
      {/* Back Wall (-Z) */}
      <BoxPart args={[14, 1.1, 0.32]} pos={[0, 0.8, -4.84]} />
      <BoxPart args={[2.4, 1.6, 0.32]} pos={[-5.8, 2.15, -4.84]} />
      <BoxPart args={[2.4, 1.6, 0.32]} pos={[0, 2.15, -4.84]} />
      <BoxPart args={[2.4, 1.6, 0.32]} pos={[5.8, 2.15, -4.84]} />
      <BoxPart args={[14, 0.5, 0.32]} pos={[0, 3.2, -4.84]} />
      {/* Left Wall (-X) */}
      <BoxPart args={[0.32, 3.2, 10]} pos={[-6.84, 1.85, 0]} />
      {/* Right Wall (+X) with side window */}
      <BoxPart args={[0.32, 1.1, 10]} pos={[6.84, 0.8, 0]} />
      <BoxPart args={[0.32, 1.6, 3.2]} pos={[6.84, 2.15, -3.4]} />
      <BoxPart args={[0.32, 1.6, 3.2]} pos={[6.84, 2.15, 3.4]} />
      <BoxPart args={[0.32, 0.5, 10]} pos={[6.84, 3.2, 0]} />
      <BoxPart args={[0.45, 0.1, 3.6]} pos={[6.9, 1.35, 0]} variant="accent" />

      {/* --- 1F Interior Lobby Columns, Counter & Stairs --- */}
      <BoxPart args={[0.45, 3.2, 0.45]} pos={[-2.2, 1.85, 1.5]} variant="accent" />
      <BoxPart args={[0.45, 3.2, 0.45]} pos={[2.2, 1.85, 1.5]} variant="accent" />
      <BoxPart args={[0.45, 3.2, 0.45]} pos={[2.2, 1.85, -2.0]} variant="accent" />
      {/* Interior Tactical Cover Desk */}
      <BoxPart args={[2.8, 0.95, 0.7]} pos={[3.6, 0.725, -0.5]} variant="dark" />
      {stairSteps}

      {/* --- 2F Floor Slab (with stairwell cutout at x=-5.6..-3.4, z=-2.2..2.2) --- */}
      <BoxPart args={[10.2, 0.25, 10]} pos={[1.9, 3.45, 0]} variant="accent" />
      <BoxPart args={[3.8, 0.25, 3.0]} pos={[-5.1, 3.45, 3.5]} variant="accent" />
      <BoxPart args={[3.8, 0.25, 2.8]} pos={[-5.1, 3.45, -3.6]} variant="accent" />

      {/* --- 2F Cantilevered Balcony (+Z) with Safety Railings --- */}
      <BoxPart args={[10.0, 0.22, 2.0]} pos={[0, 3.45, 5.9]} variant="accent" />
      <BoxPart args={[10.0, 0.95, 0.14]} pos={[0, 4.02, 6.85]} variant="dark" />
      <BoxPart args={[0.14, 0.95, 2.0]} pos={[-4.93, 4.02, 5.9]} variant="dark" />
      <BoxPart args={[0.14, 0.95, 2.0]} pos={[4.93, 4.02, 5.9]} variant="dark" />

      {/* --- 2F Walls with Balcony Doorway & Windows --- */}
      <BoxPart args={[4.4, 3.0, 0.3]} pos={[-4.8, 5.05, 4.84]} />
      <BoxPart args={[4.4, 3.0, 0.3]} pos={[4.8, 5.05, 4.84]} />
      <BoxPart args={[5.2, 0.6, 0.3]} pos={[0, 6.25, 4.84]} />
      <BoxPart args={[0.3, 3.0, 10]} pos={[-6.84, 5.05, 0]} />
      <BoxPart args={[0.3, 3.0, 4.0]} pos={[6.84, 5.05, -3.0]} />
      <BoxPart args={[0.3, 3.0, 4.0]} pos={[6.84, 5.05, 3.0]} />
      <BoxPart args={[0.3, 0.6, 2.0]} pos={[6.84, 6.25, 0]} />
      <BoxPart args={[14, 3.0, 0.3]} pos={[0, 5.05, -4.84]} />

      {/* --- Exterior Fire Stairs to Rooftop --- */}
      {roofStairs}

      {/* --- Rooftop Slab + Parapets + HVAC & Water Tank --- */}
      <BoxPart args={[14.3, 0.28, 10.3]} pos={[0, 6.68, 0]} variant="accent" />
      <BoxPart args={[14.3, 0.85, 0.28]} pos={[0, 7.22, 5.01]} />
      <BoxPart args={[14.3, 0.85, 0.28]} pos={[0, 7.22, -5.01]} />
      <BoxPart args={[0.28, 0.85, 10.0]} pos={[-7.01, 7.22, 0]} />
      <BoxPart args={[0.28, 0.85, 10.0]} pos={[7.01, 7.22, 0]} />
      {/* Rooftop HVAC Units */}
      <BoxPart args={[2.2, 1.1, 1.6]} pos={[-3.5, 7.37, -1.8]} variant="dark" />
      <BoxPart args={[1.6, 0.9, 1.2]} pos={[-1.0, 7.27, -2.0]} variant="dark" />
      {/* Rooftop Water Tank */}
      <group position={[4.2, 6.82, -2.2]}>
        <mesh castShadow receiveShadow material={darkMat} position={[0, 0.4, 0]} onPointerDown={handlePointerDown}>
          <boxGeometry args={[1.4, 0.8, 1.4]} />
        </mesh>
        <mesh castShadow receiveShadow material={accentMat} position={[0, 1.6, 0]} onPointerDown={handlePointerDown}>
          <cylinderGeometry args={[0.75, 0.75, 1.6, 16]} />
        </mesh>
        {showWire && (
          <mesh material={wireMat} position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.75, 0.75, 1.6, 12]} />
          </mesh>
        )}
      </group>
      </AnimatedObjectEnvelope>
    </group>
  );
};
