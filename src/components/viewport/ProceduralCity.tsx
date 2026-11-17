import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  getChannelMaterialPool,
  getMaterialForChannel,
  getTintedMaterialForChannel,
} from '../../engine/channelMaterials';
import type { BuildingSpec, RenderChannel } from '../../types/scene';
import { AnimatedObjectEnvelope } from './AnimatedObjectEnvelope';
import { InstancedBatch } from './InstancedBatch';

function easeOutBack(x: number): number {
  const c1 = 1.65;
  const c3 = c1 + 1;
  const p = x - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

interface ProceduralCityProps {
  buildings: BuildingSpec[];
  channel: RenderChannel;
  selectedId?: string | null;
  onSelectBuilding: (id: string) => void;
  objectRefs?: React.MutableRefObject<Record<string, THREE.Group | null>>;
}

const FLOOR_H = 3.2;

interface InstanceBucket {
  matrices: THREE.Matrix4[];
  ids: string[];
}

interface BuildingBatches {
  core: InstanceBucket;
  accent: InstanceBucket;
  dark: InstanceBucket;
  tank: InstanceBucket;
}

function collectBuildingBatches(
  buildings: BuildingSpec[],
  localOrigin = false
): BuildingBatches {
  const core: InstanceBucket = { matrices: [], ids: [] };
  const accent: InstanceBucket = { matrices: [], ids: [] };
  const dark: InstanceBucket = { matrices: [], ids: [] };
  const tank: InstanceBucket = { matrices: [], ids: [] };
  const coreMatrices = core.matrices;
  const accentMatrices = accent.matrices;
  const darkMatrices = dark.matrices;
  const tankMatrices = tank.matrices;
  const bucketIds = new Map<THREE.Matrix4[], string[]>([
    [coreMatrices, core.ids],
    [accentMatrices, accent.ids],
    [darkMatrices, dark.ids],
    [tankMatrices, tank.ids],
  ]);

  const parentMat = new THREE.Matrix4();
  const localMat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scl = new THREE.Vector3();
  let activeBuildingId = '';

  const pushLocal = (
    target: THREE.Matrix4[],
    lx: number,
    ly: number,
    lz: number,
    sx: number,
    sy: number,
    sz: number,
    rx = 0,
    ry = 0,
    rz = 0
  ) => {
    pos.set(lx, ly, lz);
    euler.set(rx, ry, rz);
    quat.setFromEuler(euler);
    scl.set(sx, sy, sz);
    localMat.compose(pos, quat, scl);
    target.push(parentMat.clone().multiply(localMat));
    bucketIds.get(target)?.push(activeBuildingId);
  };

  for (const b of buildings) {
    if (!b.visible) continue;
    activeBuildingId = b.id;
    const w = b.width;
    const d = b.depth;
    const totalH = b.floors * FLOOR_H;
    const roofY = 0.4 + totalH;

    if (localOrigin) {
      parentMat.identity();
    } else {
      pos.set(b.position[0], b.position[1], b.position[2]);
      euler.set(0, b.rotationY, 0);
      quat.setFromEuler(euler);
      scl.set(1, 1, 1);
      parentMat.compose(pos, quat, scl);
    }

    // 1. Base Plinth + Entrance Steps (+Z front)
    pushLocal(darkMatrices, 0, 0.2, 0, w + 0.4, 0.4, d + 0.4);
    pushLocal(accentMatrices, 0, 0.1, d * 0.5 + 0.55, 2.8, 0.2, 0.9);
    const awningW = b.style === 'commercial' ? Math.max(3.6, w * 0.85) : 3.2;
    const awningD = b.style === 'commercial' ? 1.9 : 1.3;
    pushLocal(
      accentMatrices,
      0,
      2.85,
      d * 0.5 + awningD * 0.52,
      awningW,
      0.16,
      awningD,
      0.08,
      0,
      0
    );

    // Commercial style adds wide ground-floor podium skirt
    if (b.style === 'commercial') {
      pushLocal(accentMatrices, 0, 1.85, 0, w + 1.2, 3.1, d + 1.0);
    }

    // 2. Recessed Structural Core
    pushLocal(coreMatrices, 0, 0.4 + totalH * 0.5, 0, w - 0.35, totalH, d - 0.35);

    // 3. 4 Chamfered Corner Columns
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        pushLocal(
          accentMatrices,
          sx * (w * 0.5 - 0.12),
          0.4 + totalH * 0.5,
          sz * (d * 0.5 - 0.12),
          0.48,
          totalH + 0.1,
          0.48
        );
        pushLocal(
          accentMatrices,
          sx * (w * 0.5 - 0.12),
          0.4 + totalH * 0.5,
          sz * (d * 0.5 - 0.12),
          0.44,
          totalH + 0.08,
          0.44,
          0,
          Math.PI / 4,
          0
        );
      }
    }

    // 4. Floor Cornice Bands, Window Mullions & Sills
    const colsX = Math.max(2, Math.floor(w / 2.2));
    for (let f = 0; f < b.floors; f++) {
      const floorBaseY = 0.4 + f * FLOOR_H;
      pushLocal(
        accentMatrices,
        0,
        floorBaseY + FLOOR_H - 0.12,
        0,
        w + 0.18,
        0.22,
        d + 0.18
      );

      // Residential style adds protruding balcony slabs on upper floors
      if (b.style === 'residential' && f >= 1) {
        pushLocal(
          accentMatrices,
          0,
          floorBaseY + 0.14,
          d * 0.5 + 0.38,
          Math.max(2.4, w * 0.58),
          0.18,
          0.85
        );
      }

      const sillY = floorBaseY + 0.95;
      for (const fz of [-1, 1]) {
        pushLocal(
          accentMatrices,
          0,
          sillY,
          fz * (d * 0.5 - 0.04),
          w - 0.6,
          0.14,
          0.28
        );
        for (let c = 1; c < colsX; c++) {
          const px = -w * 0.5 + (w * c) / colsX;
          pushLocal(
            coreMatrices,
            px,
            floorBaseY + FLOOR_H * 0.5,
            fz * (d * 0.5 - 0.06),
            0.32,
            FLOOR_H - 0.2,
            0.24
          );
        }
      }
    }

    // 5. Roof Silhouette Variants by style
    if (b.style === 'industrial') {
      // Sawtooth roof bays + tall industrial smokestack
      const bayCount = 2;
      const bayD = (d - 0.6) / bayCount;
      for (let i = 0; i < bayCount; i++) {
        const bz = -d * 0.5 + 0.3 + bayD * (i + 0.5);
        pushLocal(darkMatrices, 0, roofY + 0.55, bz, w - 0.3, 0.22, bayD * 1.05, 0.38, 0, 0);
      }
      pushLocal(tankMatrices, w * 0.28, roofY + 2.2, -d * 0.24, 0.72, 4.4, 0.85);
    } else if (b.style === 'residential') {
      // Pitched double-slope roof crown
      pushLocal(accentMatrices, 0, roofY + 0.85, -d * 0.24, w + 0.35, 0.24, d * 0.58, 0.42, 0, 0);
      pushLocal(accentMatrices, 0, roofY + 0.85, d * 0.24, w + 0.35, 0.24, d * 0.58, -0.42, 0, 0);
    } else if (b.style === 'tower_setback') {
      // Stepped upper crown tier + spire mast
      const upperH = FLOOR_H * 1.4;
      pushLocal(coreMatrices, 0, roofY + upperH * 0.5, 0, w * 0.64, upperH, d * 0.64);
      pushLocal(accentMatrices, 0, roofY + upperH + 0.14, 0, w * 0.68, 0.26, d * 0.68);
      pushLocal(tankMatrices, 0, roofY + upperH + 1.4, 0, 0.22, 2.6, 0.22);
    } else if (b.style === 'ruin_shell') {
      // Broken incomplete parapet + corner stub
      pushLocal(coreMatrices, -w * 0.15, roofY + 0.5, -d * 0.5 + 0.15, w * 0.7, 1.0, 0.28);
      pushLocal(coreMatrices, -w * 0.5 + 0.15, roofY + 0.4, -d * 0.1, 0.28, 0.8, d * 0.65);
    } else {
      // Standard modern/commercial roof parapet + HVAC & water tank
      pushLocal(coreMatrices, 0, roofY + 0.45, d * 0.5 - 0.15, w, 0.9, 0.28);
      pushLocal(coreMatrices, 0, roofY + 0.45, -d * 0.5 + 0.15, w, 0.9, 0.28);
      pushLocal(coreMatrices, -w * 0.5 + 0.15, roofY + 0.45, 0, 0.28, 0.9, d);
      pushLocal(coreMatrices, w * 0.5 - 0.15, roofY + 0.45, 0, 0.28, 0.9, d);

      pushLocal(
        darkMatrices,
        -w * 0.2,
        roofY + 0.45,
        -d * 0.15,
        Math.min(2.2, w * 0.35),
        0.9,
        Math.min(1.6, d * 0.28)
      );
      pushLocal(darkMatrices, w * 0.22, roofY + 0.3, d * 0.15, 1.1, 0.6, 1.1);
      pushLocal(tankMatrices, w * 0.22, roofY + 1.25, d * 0.15, 1.1, 1.3, 1.1);
    }

    // 7. Exterior Metal Fire-Escape Stairs on +X facade
    if (b.hasFireEscape && b.floors >= 2) {
      for (let f = 0; f < b.floors - 1; f++) {
        const ly = 0.4 + (f + 1) * FLOOR_H;
        pushLocal(
          darkMatrices,
          w * 0.5 + 0.55,
          ly - 0.1,
          0,
          1.1,
          0.14,
          Math.min(3.4, d * 0.55)
        );
        pushLocal(
          darkMatrices,
          w * 0.5 + 0.55,
          ly - FLOOR_H * 0.5,
          0,
          0.75,
          0.16,
          FLOOR_H * 1.15,
          f % 2 === 0 ? 0.68 : -0.68,
          0,
          0
        );
      }
    }
  }

  return {
    core,
    accent,
    dark,
    tank,
  };
}

interface AnimatedCustomBuildingProps {
  spec: BuildingSpec;
  batches: BuildingBatches;
  channel: RenderChannel;
  isSelected: boolean;
  unitBoxGeo: THREE.BufferGeometry;
  accentBoxGeo: THREE.BufferGeometry;
  unitCylGeo: THREE.BufferGeometry;
  wireMat: THREE.Material;
  showWire: boolean;
  onSelectBuilding: (id: string) => void;
  groupRef?: (el: THREE.Group | null) => void;
}

const AnimatedCustomBuilding: React.FC<AnimatedCustomBuildingProps> = ({
  spec,
  batches,
  channel,
  isSelected,
  unitBoxGeo,
  accentBoxGeo,
  unitCylGeo,
  wireMat,
  showWire,
  onSelectBuilding,
  groupRef,
}) => {
  const formKey = `${spec.style}_${spec.floors}_${spec.width}_${spec.depth}_${spec.hasFireEscape ? 1 : 0}`;
  const committedRef = useRef<{ key: string; batches: BuildingBatches }>({
    key: formKey,
    batches,
  });
  const [outgoingBatches, setOutgoingBatches] =
    useState<BuildingBatches | null>(null);
  const animRef = useRef<{ active: boolean; elapsed: number }>({
    active: false,
    elapsed: 0,
  });
  const inGroupRef = useRef<THREE.Group | null>(null);
  const outGroupRef = useRef<THREE.Group | null>(null);

  useLayoutEffect(() => {
    const prev = committedRef.current;
    if (prev.key === formKey) {
      committedRef.current = { key: formKey, batches };
      return;
    }
    setOutgoingBatches(prev.batches);
    committedRef.current = { key: formKey, batches };
    animRef.current = { active: true, elapsed: 0 };
    if (inGroupRef.current) {
      inGroupRef.current.scale.set(0.86, 0.04, 0.86);
    }
  }, [formKey, batches]);

  useFrame((_, delta) => {
    const anim = animRef.current;
    if (!anim.active) return;
    anim.elapsed += Math.min(delta, 0.05);
    const t = Math.min(1, anim.elapsed / 0.44);

    if (outGroupRef.current) {
      const u = Math.min(1, t / 0.56);
      const ease = u * u * (3 - 2 * u);
      const sy = Math.max(0.001, 1 - ease);
      const sxz = Math.max(0.001, 1 - ease * 0.22);
      outGroupRef.current.scale.set(sxz, sy, sxz);
    }

    if (inGroupRef.current) {
      if (t >= 1) {
        inGroupRef.current.scale.set(1, 1, 1);
      } else {
        const sy = Math.max(0.02, easeOutBack(t));
        const sxz = THREE.MathUtils.lerp(0.86, 1.0, 1 - Math.pow(1 - t, 3));
        inGroupRef.current.scale.set(sxz, sy, sxz);
      }
    }

    if (t >= 1) {
      anim.active = false;
      setOutgoingBatches(null);
    }
  });

  const bCoreMat = getTintedMaterialForChannel(
    channel,
    isSelected,
    'default',
    spec.tintColor
  );
  const bAccentMat = getTintedMaterialForChannel(
    channel,
    isSelected,
    'accent',
    spec.tintColor
  );
  const bDarkMat = getMaterialForChannel(channel, isSelected, 'dark');
  const onSelectSpec = (_: number, stop: () => void) => {
    stop();
    onSelectBuilding(spec.id);
  };

  return (
    <group
      ref={groupRef}
      name={`city_custom_${spec.id}`}
      position={spec.position}
      rotation={[0, spec.rotationY, 0]}
    >
      <AnimatedObjectEnvelope
        objectId={spec.id}
        animation={spec.animation}
        channel={channel}
        baseHeightM={Math.max(3.5, spec.floors * FLOOR_H + 1)}
        tintColor={spec.tintColor}
      >
        {outgoingBatches && (
          <group ref={outGroupRef}>
            <InstancedBatch
              matrices={outgoingBatches.core.matrices}
              geometry={unitBoxGeo}
              material={bCoreMat}
              wireMaterial={wireMat}
              showWire={showWire}
            />
            <InstancedBatch
              matrices={outgoingBatches.accent.matrices}
              geometry={accentBoxGeo}
              material={bAccentMat}
              wireMaterial={wireMat}
              showWire={showWire}
            />
            <InstancedBatch
              matrices={outgoingBatches.dark.matrices}
              geometry={unitBoxGeo}
              material={bDarkMat}
              wireMaterial={wireMat}
              showWire={showWire}
            />
            <InstancedBatch
              matrices={outgoingBatches.tank.matrices}
              geometry={unitCylGeo}
              material={bAccentMat}
              wireMaterial={wireMat}
              showWire={showWire}
            />
          </group>
        )}
        <group ref={inGroupRef}>
          <InstancedBatch
            matrices={batches.core.matrices}
            geometry={unitBoxGeo}
            material={bCoreMat}
            wireMaterial={wireMat}
            showWire={showWire}
            onPointerDownInstance={onSelectSpec}
          />
          <InstancedBatch
            matrices={batches.accent.matrices}
            geometry={accentBoxGeo}
            material={bAccentMat}
            wireMaterial={wireMat}
            showWire={showWire}
            onPointerDownInstance={onSelectSpec}
          />
          <InstancedBatch
            matrices={batches.dark.matrices}
            geometry={unitBoxGeo}
            material={bDarkMat}
            wireMaterial={wireMat}
            showWire={showWire}
            onPointerDownInstance={onSelectSpec}
          />
          <InstancedBatch
            matrices={batches.tank.matrices}
            geometry={unitCylGeo}
            material={bAccentMat}
            wireMaterial={wireMat}
            showWire={showWire}
            onPointerDownInstance={onSelectSpec}
          />
        </group>
      </AnimatedObjectEnvelope>
    </group>
  );
};
export const ProceduralCity: React.FC<ProceduralCityProps> = ({
  buildings,
  channel,
  selectedId,
  onSelectBuilding,
  objectRefs,
}) => {
  const unitBoxGeo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, 0.025), []);
  const accentBoxGeo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.055), []);
  const unitCylGeo = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 24), []);

  useEffect(() => {
    return () => {
      unitBoxGeo.dispose();
      accentBoxGeo.dispose();
      unitCylGeo.dispose();
    };
  }, [unitBoxGeo, accentBoxGeo, unitCylGeo]);

  // Split default instanced buildings vs individually tinted/selected buildings
  const { defaultBuildings, customBuildings } = useMemo(() => {
    const def: BuildingSpec[] = [];
    const cust: BuildingSpec[] = [];
    for (const b of buildings) {
      if (!b.visible) continue;
      if (
        b.tintColor ||
        (selectedId && b.id === selectedId) ||
        (b.animation && b.animation.preset !== 'none')
      ) {
        cust.push(b);
      } else {
        def.push(b);
      }
    }
    return { defaultBuildings: def, customBuildings: cust };
  }, [buildings, selectedId]);

  const batches = useMemo(() => collectBuildingBatches(defaultBuildings, false), [defaultBuildings]);

  const customRenderList = useMemo(
    () =>
      customBuildings.map((b) => ({
        spec: b,
        batches: collectBuildingBatches([b], true),
      })),
    [customBuildings]
  );

  const coreMat = getMaterialForChannel(channel, false, 'default');
  const accentMat = getMaterialForChannel(channel, false, 'accent');
  const darkMat = getMaterialForChannel(channel, false, 'dark');
  const wireMat = getChannelMaterialPool().wireframeOverlay;
  const showWire = channel === 'wireframe';

  const makeSelectHandler =
    (ids: string[]) => (idx: number, stop: () => void) => {
      const bId = ids[idx];
      if (bId) {
        stop();
        onSelectBuilding(bId);
      }
    };

  return (
    <group name="procedural_city_instanced">
      <InstancedBatch
        matrices={batches.core.matrices}
        geometry={unitBoxGeo}
        material={coreMat}
        wireMaterial={wireMat}
        showWire={showWire}
        onPointerDownInstance={makeSelectHandler(batches.core.ids)}
      />
      <InstancedBatch
        matrices={batches.accent.matrices}
        geometry={accentBoxGeo}
        material={accentMat}
        wireMaterial={wireMat}
        showWire={showWire}
        onPointerDownInstance={makeSelectHandler(batches.accent.ids)}
      />
      <InstancedBatch
        matrices={batches.dark.matrices}
        geometry={unitBoxGeo}
        material={darkMat}
        wireMaterial={wireMat}
        showWire={showWire}
        onPointerDownInstance={makeSelectHandler(batches.dark.ids)}
      />
      <InstancedBatch
        matrices={batches.tank.matrices}
        geometry={unitCylGeo}
        material={accentMat}
        wireMaterial={wireMat}
        showWire={showWire}
        onPointerDownInstance={makeSelectHandler(batches.tank.ids)}
      />

      {customRenderList.map(({ spec, batches: cb }) => (
        <AnimatedCustomBuilding
          key={spec.id}
          spec={spec}
          batches={cb}
          channel={channel}
          isSelected={selectedId === spec.id}
          unitBoxGeo={unitBoxGeo}
          accentBoxGeo={accentBoxGeo}
          unitCylGeo={unitCylGeo}
          wireMat={wireMat}
          showWire={showWire}
          onSelectBuilding={onSelectBuilding}
          groupRef={
            objectRefs
              ? (el) => {
                  objectRefs.current[spec.id] = el;
                }
              : undefined
          }
        />
      ))}
    </group>
  );
};
