import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getCharacterVariantSpec,
  type InventoryPart,
} from '../../data/assetInventory';
import {
  getChannelMaterialPool,
  getMaterialForChannel,
  getTintedMaterialForChannel,
} from '../../engine/channelMaterials';
import { getFootGroundingOffsets } from '../../engine/terrain';
import { useStudioStore } from '../../store/useStudioStore';
import type {
  CharacterActor,
  JointName,
  RenderChannel,
  RoadConfig,
  TerrainConfig,
  Vec3,
} from '../../types/scene';
import { InventoryModelParts, getCachedBevelBoxGeometry } from './PropMesh';

interface MannequinMeshProps {
  actor: CharacterActor;
  channel: RenderChannel;
  isSelected: boolean;
  onSelect: (id: string) => void;
  groupRef?: (el: THREE.Group | null) => void;
  terrain?: TerrainConfig;
  road?: RoadConfig;
}

const ALL_JOINTS: JointName[] = [
  'pelvis',
  'lowerSpine',
  'chest',
  'neck',
  'head',
  'leftUpperArm',
  'leftForearm',
  'leftHand',
  'rightUpperArm',
  'rightForearm',
  'rightHand',
  'leftThigh',
  'leftShin',
  'leftBoot',
  'rightThigh',
  'rightShin',
  'rightBoot',
];

type AccessoryJointKey =
  | 'head'
  | 'chest'
  | 'pelvis'
  | 'leftUpperArm'
  | 'rightUpperArm'
  | 'leftForearm'
  | 'rightHand';

// World-space origin of each joint in the base 1.75m standing mannequin (inside morphGroup)
const JOINT_STAND_ORIGIN: Record<AccessoryJointKey, Vec3> = {
  pelvis: [0, 0.92, 0],
  chest: [0, 1.17, 0],
  head: [0, 1.56, 0],
  leftUpperArm: [-0.21, 1.41, 0],
  rightUpperArm: [0.21, 1.41, 0],
  leftForearm: [-0.21, 1.13, 0],
  rightHand: [0.21, 0.87, 0],
};

function bucketAccessoryParts(
  parts: InventoryPart[],
  scaleVec: Vec3
): Record<AccessoryJointKey, InventoryPart[]> {
  const buckets: Record<AccessoryJointKey, InventoryPart[]> = {
    head: [],
    chest: [],
    pelvis: [],
    leftUpperArm: [],
    rightUpperArm: [],
    leftForearm: [],
    rightHand: [],
  };
  const sx = Math.abs(scaleVec[0]) > 0.01 ? scaleVec[0] : 1;
  const sy = Math.abs(scaleVec[1]) > 0.01 ? scaleVec[1] : 1;
  const sz = Math.abs(scaleVec[2]) > 0.01 ? scaleVec[2] : 1;

  for (const part of parts) {
    // Convert authored world-meter coords back into morphGroup's 1.75m skeleton space
    const lx = part.pos[0] / sx;
    const ly = part.pos[1] / sy;
    const lz = part.pos[2] / sz;

    let target: AccessoryJointKey = 'chest';
    if (ly >= 1.54 && Math.abs(lx) <= 0.18) {
      target = 'head';
    } else if (lx <= -0.22 && ly >= 1.25) {
      target = 'leftUpperArm';
    } else if (lx >= 0.22 && ly >= 1.25 && lz <= 0.12) {
      target = 'rightUpperArm';
    } else if (lx <= -0.22 && ly >= 0.96 && lz > 0.08) {
      target = 'leftForearm';
    } else if (lx >= 0.2 && ly < 1.25) {
      target = 'rightHand';
    } else if (ly < 1.04 && Math.abs(lx) <= 0.28) {
      target = 'pelvis';
    } else {
      target = 'chest';
    }

    const origin = JOINT_STAND_ORIGIN[target];
    buckets[target].push({
      ...part,
      pos: [lx - origin[0], ly - origin[1], lz - origin[2]],
    });
  }
  return buckets;
}

interface PartCommonProps {
  pos?: [number, number, number];
  rot?: [number, number, number];
  useDark?: boolean;
  mat: THREE.Material;
  darkMat: THREE.Material;
  wireMat: THREE.Material;
  showWire: boolean;
  onPointerDown: (e: { stopPropagation: () => void }) => void;
}

const PartSphere = React.memo<PartCommonProps & { radius: number }>(
  ({
    radius,
    pos = [0, 0, 0],
    rot = [0, 0, 0],
    useDark = false,
    mat,
    darkMat,
    wireMat,
    showWire,
    onPointerDown,
  }) => (
    <group position={pos} rotation={rot}>
      <mesh
        castShadow
        receiveShadow
        material={useDark ? darkMat : mat}
        onPointerDown={onPointerDown}
      >
        <sphereGeometry args={[radius, 22, 16]} />
      </mesh>
      {showWire && (
        <mesh material={wireMat}>
          <sphereGeometry args={[radius, 12, 8]} />
        </mesh>
      )}
    </group>
  )
);

const PartCapsule = React.memo<PartCommonProps & { radius: number; length: number }>(
  ({
    radius,
    length,
    pos = [0, 0, 0],
    rot = [0, 0, 0],
    useDark = false,
    mat,
    darkMat,
    wireMat,
    showWire,
    onPointerDown,
  }) => (
    <group position={pos} rotation={rot}>
      <mesh
        castShadow
        receiveShadow
        material={useDark ? darkMat : mat}
        onPointerDown={onPointerDown}
      >
        <capsuleGeometry args={[radius, length, 10, 20]} />
      </mesh>
      {showWire && (
        <mesh material={wireMat}>
          <capsuleGeometry args={[radius, length, 6, 12]} />
        </mesh>
      )}
    </group>
  )
);

const PartBox = React.memo<PartCommonProps & { args: [number, number, number] }>(
  ({
    args,
    pos = [0, 0, 0],
    rot = [0, 0, 0],
    useDark = false,
    mat,
    darkMat,
    wireMat,
    showWire,
    onPointerDown,
  }) => {
    const geo = getCachedBevelBoxGeometry(args[0], args[1], args[2]);
    return (
      <group position={pos} rotation={rot}>
        <mesh
          castShadow
          receiveShadow
          dispose={null}
          geometry={geo}
          material={useDark ? darkMat : mat}
          onPointerDown={onPointerDown}
        />
        {showWire && <mesh dispose={null} geometry={geo} material={wireMat} />}
      </group>
    );
  }
);

/**
 * 16-Joint Anatomical Previs Mannequin (1.75m height, facing +Z).
 * Supports smooth skeletal pose damping and elastic form-switch transitions.
 */
export const MannequinMesh: React.FC<MannequinMeshProps> = ({
  actor,
  channel,
  isSelected,
  onSelect,
  groupRef,
  terrain,
  road,
}) => {
  const { leftDelta, rightDelta } = useMemo(() => {
    if (!terrain || !road) return { leftDelta: 0, rightDelta: 0 };
    const info = getFootGroundingOffsets(
      actor.position[0],
      actor.position[2],
      actor.rotation[1],
      terrain,
      road
    );
    if (Math.abs(actor.position[1] - info.groundY) > 0.35) {
      return { leftDelta: 0, rightDelta: 0 };
    }
    return { leftDelta: info.leftDelta, rightDelta: info.rightDelta };
  }, [actor.position, actor.rotation, terrain, road]);

  const charVariant = useMemo(
    () => getCharacterVariantSpec(actor.variantId),
    [actor.variantId]
  );

  // Extract archetype-specific accessory parts (skip 17 base anatomy parts + optional coatApron cylinder which is already rigged on pelvis)
  const accessoryBuckets = useMemo(() => {
    const extraStartIdx = charVariant.coatApron ? 18 : 17;
    const extras =
      charVariant.parts.length > extraStartIdx
        ? charVariant.parts.slice(extraStartIdx)
        : [];
    return bucketAccessoryParts(extras, charVariant.scaleVec);
  }, [charVariant]);

  const morphGroupRef = useRef<THREE.Group | null>(null);
  const coatMeshRef = useRef<THREE.Mesh | null>(null);
  const jointGroupRefs = useRef<Partial<Record<JointName, THREE.Group | null>>>({});

  const prevVariantIdRef = useRef<string>(charVariant.id);
  const variantPulseRef = useRef<{ active: boolean; elapsed: number }>({
    active: false,
    elapsed: 0,
  });
  const currScaleVecRef = useRef<[number, number, number]>([
    ...charVariant.scaleVec,
  ]);
  const currCoatScaleRef = useRef<number>(charVariant.coatApron ? 1 : 0.001);
  const currPelvisYRef = useRef<number>(0.92 + (actor.pelvisOffsetY ?? 0));
  const currJointsRef = useRef<Record<JointName, [number, number, number]>>(
    ALL_JOINTS.reduce((acc, k) => {
      const jt = actor.joints?.[k] ?? [0, 0, 0];
      acc[k] = [jt[0] ?? 0, jt[1] ?? 0, jt[2] ?? 0];
      return acc;
    }, {} as Record<JointName, [number, number, number]>)
  );

  // Apply initial joint poses synchronously on mount / actor change so first paint is never T-posed
  useLayoutEffect(() => {
    const initPelvisY = 0.92 + (actor.pelvisOffsetY ?? 0);
    currPelvisYRef.current = initPelvisY;
    if (jointGroupRefs.current.pelvis) {
      jointGroupRefs.current.pelvis.position.y = initPelvisY;
    }
    for (const jName of ALL_JOINTS) {
      const tj = actor.joints?.[jName] ?? [0, 0, 0];
      const rx = tj[0] ?? 0;
      const ry = tj[1] ?? 0;
      const rz = tj[2] ?? 0;
      currJointsRef.current[jName] = [rx, ry, rz];
      const grp = jointGroupRefs.current[jName];
      if (grp) grp.rotation.set(rx, ry, rz);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor.id]);

  useEffect(() => {
    if (prevVariantIdRef.current !== charVariant.id) {
      prevVariantIdRef.current = charVariant.id;
      variantPulseRef.current = { active: true, elapsed: 0 };
    }
  }, [charVariant.id]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const isExporting = useStudioStore.getState().isExporting;
    const damp = isExporting ? 1 : 1 - Math.exp(-14 * dt);

    // 1. Smoothly damp body scaleVec + elastic morph wave when variantId changes
    const targetScale = charVariant.scaleVec;
    const cs = currScaleVecRef.current;
    cs[0] = THREE.MathUtils.lerp(cs[0], targetScale[0], damp);
    cs[1] = THREE.MathUtils.lerp(cs[1], targetScale[1], damp);
    cs[2] = THREE.MathUtils.lerp(cs[2], targetScale[2], damp);

    let waveY = 1;
    let waveXZ = 1;
    if (variantPulseRef.current.active && !isExporting) {
      variantPulseRef.current.elapsed += dt;
      const t = Math.min(1, variantPulseRef.current.elapsed / 0.42);
      if (t >= 1) {
        variantPulseRef.current.active = false;
      } else {
        const w = Math.sin(t * Math.PI * 2) * (1 - t);
        waveY = 1 + w * 0.12;
        waveXZ = 1 - w * 0.07;
      }
    }

    if (morphGroupRef.current) {
      morphGroupRef.current.scale.set(
        cs[0] * waveXZ,
        cs[1] * waveY,
        cs[2] * waveXZ
      );
    }

    // 2. Smoothly damp coat apron appearance/disappearance
    const targetCoat = charVariant.coatApron ? 1 : 0.001;
    currCoatScaleRef.current = THREE.MathUtils.lerp(
      currCoatScaleRef.current,
      targetCoat,
      damp
    );
    if (coatMeshRef.current) {
      const sCoat = currCoatScaleRef.current;
      coatMeshRef.current.visible = sCoat > 0.02;
      coatMeshRef.current.scale.set(sCoat, sCoat, sCoat);
    }

    // 3. Smoothly damp pelvis vertical offset & all 16 skeletal joints
    const targetPelvisY = 0.92 + (actor.pelvisOffsetY ?? 0);
    currPelvisYRef.current = THREE.MathUtils.lerp(
      currPelvisYRef.current,
      targetPelvisY,
      damp
    );
    const pelvisGrp = jointGroupRefs.current.pelvis;
    if (pelvisGrp) {
      pelvisGrp.position.y = currPelvisYRef.current;
    }

    for (const jName of ALL_JOINTS) {
      const grp = jointGroupRefs.current[jName];
      if (!grp) continue;
      const cj = currJointsRef.current[jName];
      const tj = actor.joints?.[jName] ?? [0, 0, 0];
      cj[0] = THREE.MathUtils.lerp(cj[0], tj[0] ?? 0, damp);
      cj[1] = THREE.MathUtils.lerp(cj[1], tj[1] ?? 0, damp);
      cj[2] = THREE.MathUtils.lerp(cj[2], tj[2] ?? 0, damp);
      grp.rotation.set(cj[0], cj[1], cj[2]);
    }
  });

  const actorLocked = actor.locked;
  const actorId = actor.id;
  const handlePointerDown = useMemo(
    () => (e: { stopPropagation: () => void }) => {
      if (actorLocked || useStudioStore.getState().pendingPlacement) return;
      e.stopPropagation();
      onSelect(actorId);
    },
    [actorLocked, actorId, onSelect]
  );

  if (!actor.visible) return null;

  const mat = getTintedMaterialForChannel(
    channel,
    isSelected,
    'mannequinBody',
    actor.tintColor
  );
  const darkMat = getMaterialForChannel(channel, isSelected, 'mannequinAccent');
  const wireMat = getChannelMaterialPool().wireframeOverlay;
  const showWire = channel === 'wireframe';

  const sharedPartProps = {
    mat,
    darkMat,
    wireMat,
    showWire,
    onPointerDown: handlePointerDown,
  };

  const renderJointAccessories = (jointKey: AccessoryJointKey) => {
    const list = accessoryBuckets[jointKey];
    if (!list || list.length === 0) return null;
    return (
      <InventoryModelParts
        parts={list}
        variantKey={`char_acc_${charVariant.id}_${jointKey}`}
        channel={channel}
        isSelected={isSelected}
        tintColor={actor.tintColor}
        onPointerDown={handlePointerDown}
      />
    );
  };

  return (
    <group
      ref={groupRef}
      name={actor.id}
      position={actor.position}
      rotation={actor.rotation}
      scale={actor.scale}
    >
      <group ref={morphGroupRef} scale={charVariant.scaleVec}>
        {/* 1. Pelvis Root */}
        <group
          ref={(el) => {
            jointGroupRefs.current.pelvis = el;
          }}
          position={[0, 0.92, 0]}
        >
          <PartBox args={[0.26, 0.13, 0.17]} useDark {...sharedPartProps} />
          {renderJointAccessories('pelvis')}
          <mesh
            ref={coatMeshRef}
            visible={Boolean(charVariant.coatApron)}
            position={[0, -0.22, -0.02]}
            castShadow
            receiveShadow
            material={mat}
            onPointerDown={handlePointerDown}
          >
            <cylinderGeometry args={[0.19, 0.3, 0.52, 24, 1, false]} />
          </mesh>

          {/* 2. Lower Spine */}
          <group
            ref={(el) => {
              jointGroupRefs.current.lowerSpine = el;
            }}
            position={[0, 0.08, 0]}
          >
            <PartCapsule radius={0.105} length={0.1} pos={[0, 0.08, 0]} {...sharedPartProps} />

            {/* 3. Chest / Ribcage */}
            <group
              ref={(el) => {
                jointGroupRefs.current.chest = el;
              }}
              position={[0, 0.17, 0]}
            >
              <PartBox args={[0.32, 0.25, 0.19]} pos={[0, 0.14, 0]} {...sharedPartProps} />
              {/* Horizontal Shoulder Clavicle Bar */}
              <PartCapsule
                radius={0.048}
                length={0.28}
                pos={[0, 0.24, 0]}
                rot={[0, 0, Math.PI / 2]}
                {...sharedPartProps}
              />
              {renderJointAccessories('chest')}

              {/* 4. Neck */}
              <group
                ref={(el) => {
                  jointGroupRefs.current.neck = el;
                }}
                position={[0, 0.29, 0]}
              >
                <PartCapsule radius={0.048} length={0.05} pos={[0, 0.04, 0]} useDark {...sharedPartProps} />

                {/* 5. Head (Sculpted Cranium + Nose Bridge + Visor Goggles facing +Z) */}
                <group
                  ref={(el) => {
                    jointGroupRefs.current.head = el;
                  }}
                  position={[0, 0.1, 0]}
                >
                  <PartSphere radius={0.105} pos={[0, 0.1, 0]} {...sharedPartProps} />
                  {/* Jaw */}
                  <PartBox args={[0.12, 0.08, 0.12]} pos={[0, 0.045, 0.025]} {...sharedPartProps} />
                  {/* Nose Bridge */}
                  <PartBox args={[0.026, 0.055, 0.045]} pos={[0, 0.095, 0.1]} {...sharedPartProps} />
                  {/* Tactical Visor / Goggles Bar */}
                  <PartBox args={[0.17, 0.042, 0.05]} pos={[0, 0.12, 0.092]} useDark {...sharedPartProps} />
                  {renderJointAccessories('head')}
                </group>
              </group>

              {/* Left Arm: 6. UpperArm -> 7. Forearm -> 8. Hand */}
              <group
                ref={(el) => {
                  jointGroupRefs.current.leftUpperArm = el;
                }}
                position={[-0.21, 0.24, 0]}
              >
                <PartSphere radius={0.056} useDark {...sharedPartProps} />
                <PartCapsule radius={0.046} length={0.18} pos={[0, -0.14, 0]} {...sharedPartProps} />
                {renderJointAccessories('leftUpperArm')}
                <group
                  ref={(el) => {
                    jointGroupRefs.current.leftForearm = el;
                  }}
                  position={[0, -0.28, 0]}
                >
                  <PartSphere radius={0.044} useDark {...sharedPartProps} />
                  <PartCapsule radius={0.038} length={0.18} pos={[0, -0.13, 0]} {...sharedPartProps} />
                  {renderJointAccessories('leftForearm')}
                  <group
                    ref={(el) => {
                      jointGroupRefs.current.leftHand = el;
                    }}
                    position={[0, -0.26, 0]}
                  >
                    <PartBox args={[0.042, 0.09, 0.068]} pos={[0, -0.04, 0.01]} useDark {...sharedPartProps} />
                  </group>
                </group>
              </group>

              {/* Right Arm: 9. UpperArm -> 10. Forearm -> 11. Hand */}
              <group
                ref={(el) => {
                  jointGroupRefs.current.rightUpperArm = el;
                }}
                position={[0.21, 0.24, 0]}
              >
                <PartSphere radius={0.056} useDark {...sharedPartProps} />
                <PartCapsule radius={0.046} length={0.18} pos={[0, -0.14, 0]} {...sharedPartProps} />
                {renderJointAccessories('rightUpperArm')}
                <group
                  ref={(el) => {
                    jointGroupRefs.current.rightForearm = el;
                  }}
                  position={[0, -0.28, 0]}
                >
                  <PartSphere radius={0.044} useDark {...sharedPartProps} />
                  <PartCapsule radius={0.038} length={0.18} pos={[0, -0.13, 0]} {...sharedPartProps} />
                  <group
                    ref={(el) => {
                      jointGroupRefs.current.rightHand = el;
                    }}
                    position={[0, -0.26, 0]}
                  >
                    <PartBox args={[0.042, 0.09, 0.068]} pos={[0, -0.04, 0.01]} useDark {...sharedPartProps} />
                    {renderJointAccessories('rightHand')}
                  </group>
                </group>
              </group>
            </group>
          </group>

          {/* Left Leg: 12. Thigh -> 13. Shin -> 14. Boot */}
          <group
            ref={(el) => {
              jointGroupRefs.current.leftThigh = el;
            }}
            position={[-0.1, -0.04 + leftDelta * 0.5, 0]}
          >
            <PartSphere radius={0.068} useDark {...sharedPartProps} />
            <PartCapsule radius={0.062} length={0.28} pos={[0, -0.21, 0]} {...sharedPartProps} />
            <group
              ref={(el) => {
                jointGroupRefs.current.leftShin = el;
              }}
              position={[0, -0.42, 0]}
            >
              <PartSphere radius={0.054} useDark {...sharedPartProps} />
              <PartCapsule radius={0.048} length={0.28} pos={[0, -0.21, 0]} {...sharedPartProps} />
              <group
                ref={(el) => {
                  jointGroupRefs.current.leftBoot = el;
                }}
                position={[0, -0.42 + leftDelta * 0.5, 0]}
              >
                <PartBox args={[0.09, 0.075, 0.2]} pos={[0, -0.025, 0.045]} useDark {...sharedPartProps} />
              </group>
            </group>
          </group>

          {/* Right Leg: 15. Thigh -> 16. Shin -> 17. Boot */}
          <group
            ref={(el) => {
              jointGroupRefs.current.rightThigh = el;
            }}
            position={[0.1, -0.04 + rightDelta * 0.5, 0]}
          >
            <PartSphere radius={0.068} useDark {...sharedPartProps} />
            <PartCapsule radius={0.062} length={0.28} pos={[0, -0.21, 0]} {...sharedPartProps} />
            <group
              ref={(el) => {
                jointGroupRefs.current.rightShin = el;
              }}
              position={[0, -0.42, 0]}
            >
              <PartSphere radius={0.054} useDark {...sharedPartProps} />
              <PartCapsule radius={0.048} length={0.28} pos={[0, -0.21, 0]} {...sharedPartProps} />
              <group
                ref={(el) => {
                  jointGroupRefs.current.rightBoot = el;
                }}
                position={[0, -0.42 + rightDelta * 0.5, 0]}
              >
                <PartBox args={[0.09, 0.075, 0.2]} pos={[0, -0.025, 0.045]} useDark {...sharedPartProps} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
