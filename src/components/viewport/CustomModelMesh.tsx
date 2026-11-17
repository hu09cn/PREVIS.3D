import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getChannelMaterialPool,
  getMaterialForChannel,
} from '../../engine/channelMaterials';
import {
  evaluateObjectAnimationTransform,
  evaluatePartScatter,
  hashStringSeed,
} from '../../engine/objectAnimations';
import { useStudioStore } from '../../store/useStudioStore';
import type {
  CustomModelAsset,
  CustomModelPart,
  ProceduralMaterialKind,
  RenderChannel,
} from '../../types/scene';
import { AnimatedObjectEnvelope } from './AnimatedObjectEnvelope';

interface CustomModelMeshProps {
  model: CustomModelAsset;
  channel: RenderChannel;
  isSelected: boolean;
  onSelect: (id: string) => void;
  groupRef?: (el: THREE.Group | null) => void;
}

function createPartMaterial(
  colorHex: string,
  kind: ProceduralMaterialKind = 'matte',
  isSelected: boolean
): THREE.MeshStandardMaterial {
  let color: THREE.Color;
  try {
    color = new THREE.Color(colorHex || '#cbd5e1');
  } catch {
    color = new THREE.Color('#cbd5e1');
  }

  let roughness = 0.84;
  let metalness = 0.05;
  let transparent = false;
  let opacity = 1;
  let flatShading = false;
  let emissive = new THREE.Color('#000000');
  let emissiveIntensity = 0;

  switch (kind) {
    case 'metal':
      roughness = 0.3;
      metalness = 0.72;
      break;
    case 'glass':
      roughness = 0.12;
      metalness = 0.16;
      transparent = true;
      opacity = 0.56;
      break;
    case 'emissive':
      roughness = 0.35;
      metalness = 0.08;
      emissive = color.clone();
      emissiveIntensity = 0.85;
      break;
    case 'wood':
      roughness = 0.85;
      metalness = 0.03;
      break;
    case 'stone':
      roughness = 0.94;
      metalness = 0.03;
      flatShading = true;
      break;
    case 'foliage':
      roughness = 0.86;
      metalness = 0.02;
      break;
    case 'fabric':
      roughness = 0.92;
      metalness = 0.01;
      break;
    case 'matte':
    default:
      roughness = 0.82;
      metalness = 0.05;
      break;
  }

  if (isSelected && kind !== 'emissive') {
    emissive = new THREE.Color('#0284c7');
    emissiveIntensity = 0.25;
  }

  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent,
    opacity,
    flatShading,
    emissive,
    emissiveIntensity,
  });
}

const PartGeometry: React.FC<{ part: CustomModelPart }> = ({ part }) => {
  switch (part.shape) {
    case 'cylinder': {
      const topR =
        typeof part.topRatio === 'number' && Number.isFinite(part.topRatio)
          ? Math.max(0.05, Math.min(2.5, part.topRatio)) * 0.5
          : 0.5;
      return <cylinderGeometry args={[topR, 0.5, 1, 18]} />;
    }
    case 'cone':
      return <coneGeometry args={[0.5, 1, 18]} />;
    case 'plane':
      return <boxGeometry args={[1, 0.08, 1]} />;
    case 'sphere':
      return <sphereGeometry args={[0.5, 16, 12]} />;
    case 'torus':
      return <torusGeometry args={[0.38, 0.12, 12, 24]} />;
    case 'dodecahedron':
      return <dodecahedronGeometry args={[0.5, 1]} />;
    case 'capsule':
      return <capsuleGeometry args={[0.34, 0.32, 6, 12]} />;
    case 'box':
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
};

export const CustomModelMesh: React.FC<CustomModelMeshProps> = ({
  model,
  channel,
  isSelected,
  onSelect,
  groupRef,
}) => {
  const partRefs = useRef<(THREE.Group | null)[]>([]);
  const wasScatteredRef = useRef(false);
  const objectSeed = useMemo(() => hashStringSeed(model.id), [model.id]);
  const baseHeightM = useMemo(() => {
    let maxY = 1.6;
    for (const p of model.parts) {
      maxY = Math.max(maxY, p.position[1] + Math.max(0.05, p.size[1]) * 0.5);
    }
    return maxY;
  }, [model.parts]);

  const partMaterials = useMemo(() => {
    if (channel !== 'color') return [];
    return model.parts.map((part) =>
      createPartMaterial(part.color, part.materialKind, isSelected)
    );
  }, [channel, isSelected, model.parts]);

  useEffect(() => {
    return () => {
      partMaterials.forEach((m) => m.dispose());
    };
  }, [partMaterials]);

  useFrame(() => {
    const anim = model.animation;
    const shouldScatter =
      anim && (anim.preset === 'rock_shatter' || anim.preset === 'crate_scatter');
    if (shouldScatter) {
      const currentTime = useStudioStore.getState().currentTime;
      const ev = evaluateObjectAnimationTransform(anim, currentTime, objectSeed, baseHeightM);
      if (ev.scatterProgress > 0.001) {
        wasScatteredRef.current = true;
        for (let i = 0; i < model.parts.length; i++) {
          const grp = partRefs.current[i];
          const part = model.parts[i];
          if (!grp || !part) continue;
          const off = evaluatePartScatter(
            anim,
            i,
            part.position,
            ev.scatterProgress,
            objectSeed
          );
          const sx = Math.max(0.05, part.size[0]) * off.scale;
          const sy = Math.max(0.05, part.size[1]) * off.scale;
          const sz = Math.max(0.05, part.size[2]) * off.scale;
          grp.position.set(
            part.position[0] + off.posOffset[0],
            part.position[1] + off.posOffset[1],
            part.position[2] + off.posOffset[2]
          );
          grp.rotation.set(
            part.rotation[0] + off.rotOffset[0],
            part.rotation[1] + off.rotOffset[1],
            part.rotation[2] + off.rotOffset[2]
          );
          grp.scale.set(sx, sy, sz);
        }
        return;
      }
    }
    if (wasScatteredRef.current) {
      wasScatteredRef.current = false;
      for (let i = 0; i < model.parts.length; i++) {
        const grp = partRefs.current[i];
        const part = model.parts[i];
        if (!grp || !part) continue;
        grp.position.set(part.position[0], part.position[1], part.position[2]);
        grp.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
        grp.scale.set(
          Math.max(0.05, part.size[0]),
          Math.max(0.05, part.size[1]),
          Math.max(0.05, part.size[2])
        );
      }
    }
  });

  if (!model.visible) return null;

  const wireMat = getChannelMaterialPool().wireframeOverlay;
  const showWire = channel === 'wireframe';

  const handlePointerDown = (e: { stopPropagation: () => void }) => {
    if (model.locked || useStudioStore.getState().pendingPlacement) return;
    e.stopPropagation();
    onSelect(model.id);
  };

  return (
    <group
      ref={groupRef}
      name={model.id}
      position={model.position}
      rotation={model.rotation}
      scale={model.scale}
    >
      <AnimatedObjectEnvelope
        objectId={model.id}
        animation={model.animation}
        channel={channel}
        baseHeightM={baseHeightM}
        hideShellOnShatter={model.parts.length <= 2}
      >
        {model.parts.map((part, idx) => {
          const mat =
            channel === 'color'
              ? partMaterials[idx]
              : getMaterialForChannel(
                  channel,
                  isSelected,
                  part.materialKind === 'metal' || part.materialKind === 'stone'
                    ? 'dark'
                    : 'default'
                );
          const sx = Math.max(0.05, part.size[0]);
          const sy = Math.max(0.05, part.size[1]);
          const sz = Math.max(0.05, part.size[2]);

          return (
            <group
              key={part.id || `${model.id}_p_${idx}`}
              ref={(el) => {
                partRefs.current[idx] = el;
              }}
              position={part.position}
              rotation={part.rotation}
              scale={[sx, sy, sz]}
            >
              <mesh
                castShadow
                receiveShadow
                material={mat}
                onPointerDown={handlePointerDown}
              >
                <PartGeometry part={part} />
              </mesh>
              {showWire && (
                <mesh material={wireMat}>
                  <PartGeometry part={part} />
                </mesh>
              )}
            </group>
          );
        })}
      </AnimatedObjectEnvelope>
    </group>
  );
};
