import React, { useEffect, useMemo, useRef, useState } from 'react';
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStudioStore } from '../../store/useStudioStore';
import { getTerrainSize } from '../../engine/terrain';
import {
  computeTimeOfDayState,
  inferTimeMinutesFromEnv,
} from '../../engine/timeOfDay';
import { evaluateAllCharactersAtTime } from '../../engine/animation';
import type {
  BuildingSpec,
  CharacterActor,
  CustomModelAsset,
  GltfModelAsset,
  PaintedFencePath,
  PaintedRoadPath,
  PropType,
  RenderChannel,
  ScatteredPropSpec,
  ScatteredPropType,
  SceneAsset,
  ShotData,
  Vec3,
  WorldState,
} from '../../types/scene';
import { MannequinMesh } from './MannequinMesh';
import { PropMesh } from './PropMesh';
import { CustomModelMesh } from './CustomModelMesh';
import { GltfModelMesh } from './GltfModelMesh';
import { TerrainAndRoadsMesh } from './TerrainAndRoadsMesh';
import { PaintedPathsMesh } from './PaintedPathsMesh';
import { ProceduralCity } from './ProceduralCity';
import { EnterableCompoundMesh } from './EnterableCompoundMesh';
import { InstancedProps } from './InstancedProps';

const ERASE_ANIM_DURATION_MS = 440;

const SCATTERED_TO_PROP_MAP: Record<
  ScatteredPropType,
  { propType: PropType; defaultVar: string }
> = {
  tree: { propType: 'tree', defaultVar: 'round_crown' },
  bush: { propType: 'tree', defaultVar: 'shrub_cluster' },
  car: { propType: 'vehicle', defaultVar: 'sedan' },
  lamp: { propType: 'lamp', defaultVar: 'single_arm' },
  barrier: { propType: 'barrier', defaultVar: 'jersey' },
  cargo_stack: { propType: 'crate', defaultVar: 'pallet_stack' },
  rock: { propType: 'rock', defaultVar: 'boulder_cluster' },
};

function scatteredToErasingAsset(sc: ScatteredPropSpec): SceneAsset {
  const mapped = SCATTERED_TO_PROP_MAP[sc.type] ?? {
    propType: 'crate' as PropType,
    defaultVar: 'wooden_crate',
  };
  return {
    id: `erasing_${sc.id}`,
    kind: 'asset',
    type: mapped.propType,
    variantId: sc.variantId ?? mapped.defaultVar,
    name: sc.id,
    position: [...sc.position],
    rotation: [0, sc.rotationY, 0],
    scale: [sc.scale, sc.scale, sc.scale],
    visible: true,
    locked: true,
  };
}

const ErasingGroundRipple: React.FC<{ position: Vec3; radiusScale?: number }> = ({
  position,
  radiusScale = 1,
}) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const discRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const discMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    elapsedRef.current += dt;
    const t = Math.min(1, elapsedRef.current / 0.42);
    const easeOut = 1 - Math.pow(1 - t, 3);
    const s = (0.35 + easeOut * 1.95) * Math.max(0.55, radiusScale);
    if (ringRef.current) {
      ringRef.current.scale.set(s, s, 1);
    }
    if (discRef.current) {
      const ds = (1.15 - t * 0.95) * Math.max(0.55, radiusScale);
      discRef.current.scale.set(ds, ds, 1);
    }
    if (ringMatRef.current) {
      ringMatRef.current.opacity = Math.max(0, (1 - t) * 0.78);
    }
    if (discMatRef.current) {
      discMatRef.current.opacity = Math.max(0, (1 - t * t) * 0.28);
    }
  });

  return (
    <group position={[position[0], position[1] + 0.06, position[2]]}>
      <mesh ref={discRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.85, 24]} />
        <meshBasicMaterial
          ref={discMatRef}
          color="#fb7185"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58, 0.85, 28]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color="#f43f5e"
          transparent
          opacity={0.78}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

const ErasingEnvelope: React.FC<{
  pivot: Vec3;
  children: React.ReactNode;
}> = ({ pivot, children }) => {
  const outerRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    const g = outerRef.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    elapsedRef.current += dt;
    const t = Math.min(1, elapsedRef.current / 0.42);
    let s = 1;
    let yOff = 0;
    let rotY = 0;
    let tiltZ = 0;
    if (t < 0.18) {
      const p = t / 0.18;
      s = 1 + Math.sin(p * Math.PI * 0.5) * 0.07;
      yOff = p * 0.22;
      rotY = p * 0.12;
    } else {
      const k = (t - 0.18) / 0.82;
      const smooth = k * k * (3 - 2 * k);
      s = Math.max(0.001, (1 - smooth) * 1.07);
      yOff = 0.22 * (1 - k) - k * k * 0.75;
      rotY = 0.12 + k * k * 1.15;
      tiltZ = k * 0.18;
    }
    g.position.set(pivot[0], pivot[1] + yOff, pivot[2]);
    g.scale.set(s, s, s);
    g.rotation.set(0, rotY, tiltZ);
  });

  return (
    <>
      <ErasingGroundRipple position={pivot} radiusScale={1.25} />
      <group ref={outerRef} position={pivot}>
        <group position={[-pivot[0], -pivot[1], -pivot[2]]}>{children}</group>
      </group>
    </>
  );
};

interface ErasingGhostState {
  batchId: number;
  expiresAt: number;
  assets: SceneAsset[];
  characters: CharacterActor[];
  buildings: BuildingSpec[];
  customModels: CustomModelAsset[];
  gltfModels: GltfModelAsset[];
  paintedRoads: PaintedRoadPath[];
  paintedFences: PaintedFencePath[];
}

interface WorldContentProps {
  world: WorldState;
  channel: RenderChannel;
  selectedId: string | null;
  onSelect: (id: string) => void;
  objectRefs?: React.MutableRefObject<Record<string, THREE.Group | null>>;
  interactive?: boolean;
  shot?: ShotData;
  currentTime?: number;
  animateCycle?: boolean;
  placementSurfaceHandlers?: {
    onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerOut?: () => void;
    onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
  };
  onEmptyGroundClick?: () => void;
  collidersGroupRef?: React.Ref<THREE.Group>;
}

export const WorldContent: React.FC<WorldContentProps> = ({
  world,
  channel,
  selectedId,
  onSelect,
  objectRefs,
  interactive = true,
  shot,
  currentTime = 0,
  animateCycle = false,
  placementSurfaceHandlers,
  onEmptyGroundClick,
  collidersGroupRef,
}) => {
  const animatedCharacters = useMemo(
    () => evaluateAllCharactersAtTime(world.characters, shot, currentTime, animateCycle),
    [world.characters, shot, currentTime, animateCycle]
  );
  const { sunAzimuth, sunElevation, fogDensity, bgColor } = world.environment;
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const defogEnabled = useStudioStore((s) => s.defogEnabled);
  const graphicsQuality = useStudioStore((s) => s.graphicsQuality);
  const promoteScatteredProp = useStudioStore((s) => s.promoteScatteredProp);
  const pendingPlacement = useStudioStore((s) => s.pendingPlacement);
  const safeInteractive = interactive && !pendingPlacement;
  const effectiveFogDensity = defogEnabled ? 0 : fogDensity;
  const { scene } = useThree();

  const prevWorldRef = useRef<{ projectId: string; world: WorldState } | null>(
    null
  );
  const batchSeqRef = useRef(0);
  const [erasingBatches, setErasingBatches] = useState<ErasingGhostState[]>([]);

  useEffect(() => {
    const prev = prevWorldRef.current;
    prevWorldRef.current = { projectId: activeProjectId, world };

    if (!prev || prev.projectId !== activeProjectId || prev.world === world) {
      return;
    }

    const pw = prev.world;
    const curAssetIds = new Set(world.assets.map((a) => a.id));
    const prevAssetIds = new Set(pw.assets.map((a) => a.id));
    const newlyAddedAssets = world.assets.filter((a) => !prevAssetIds.has(a.id));

    const removedAssets = pw.assets.filter(
      (a) => a.visible !== false && !curAssetIds.has(a.id)
    );

    const curScatteredIds = new Set(world.scatteredProps.map((sp) => sp.id));
    const removedScatteredAsAssets = pw.scatteredProps
      .filter((sp) => {
        if (curScatteredIds.has(sp.id)) return false;
        // Skip if this scattered prop was just promoted to an editable SceneAsset
        const wasPromoted = newlyAddedAssets.some(
          (na) =>
            Math.hypot(
              na.position[0] - sp.position[0],
              na.position[2] - sp.position[2]
            ) < 0.05
        );
        return !wasPromoted;
      })
      .slice(0, 36)
      .map(scatteredToErasingAsset);

    const curCharIds = new Set(world.characters.map((c) => c.id));
    const removedChars = pw.characters.filter(
      (c) => c.visible !== false && !curCharIds.has(c.id)
    );

    const curBldgIds = new Set(world.buildings.map((b) => b.id));
    const removedBuildings = pw.buildings.filter((b) => !curBldgIds.has(b.id));

    const curCustomIds = new Set((world.customModels ?? []).map((m) => m.id));
    const removedCustom = (pw.customModels ?? []).filter(
      (m) => m.visible !== false && !curCustomIds.has(m.id)
    );

    const curGltfIds = new Set((world.gltfModels ?? []).map((m) => m.id));
    const removedGltf = (pw.gltfModels ?? []).filter(
      (m) => m.visible !== false && !curGltfIds.has(m.id)
    );

    const curRoadIds = new Set((world.paintedRoads ?? []).map((r) => r.id));
    const removedRoads = (pw.paintedRoads ?? []).filter(
      (r) => !curRoadIds.has(r.id)
    );

    const curFenceIds = new Set((world.paintedFences ?? []).map((f) => f.id));
    const removedFences = (pw.paintedFences ?? []).filter(
      (f) => !curFenceIds.has(f.id)
    );

    const combinedAssets = [...removedAssets, ...removedScatteredAsAssets].slice(
      0,
      48
    );

    const totalRemoved =
      combinedAssets.length +
      removedChars.length +
      removedBuildings.length +
      removedCustom.length +
      removedGltf.length +
      removedRoads.length +
      removedFences.length;

    if (totalRemoved === 0) return;

    const expiresAt = performance.now() + ERASE_ANIM_DURATION_MS;
    batchSeqRef.current += 1;
    const batch: ErasingGhostState = {
      batchId: batchSeqRef.current,
      expiresAt,
      assets: combinedAssets,
      characters: removedChars.slice(0, 12),
      buildings: removedBuildings.slice(0, 12),
      customModels: removedCustom.slice(0, 12),
      gltfModels: removedGltf.slice(0, 8),
      paintedRoads: removedRoads.slice(0, 8),
      paintedFences: removedFences.slice(0, 8),
    };

    setErasingBatches((prevBatches) => [
      ...prevBatches.filter((b) => b.expiresAt > performance.now()),
      batch,
    ]);
  }, [world, activeProjectId]);

  useEffect(() => {
    if (erasingBatches.length === 0) return;
    const now = performance.now();
    const earliest = Math.min(...erasingBatches.map((b) => b.expiresAt));
    const delay = Math.max(16, earliest - now + 15);
    const timer = window.setTimeout(() => {
      const cur = performance.now();
      setErasingBatches((prevBatches) =>
        prevBatches.filter((b) => b.expiresAt > cur)
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [erasingBatches]);

  const sunPos = useMemo<[number, number, number]>(() => {
    const r = 210;
    const phi = THREE.MathUtils.degToRad(90 - Math.max(5, Math.min(85, sunElevation)));
    const theta = THREE.MathUtils.degToRad(sunAzimuth);
    return [
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.cos(theta),
    ];
  }, [sunAzimuth, sunElevation]);

  const timeMinutes = inferTimeMinutesFromEnv(world.environment);
  const timeLighting = useMemo(
    () => computeTimeOfDayState(timeMinutes, effectiveFogDensity),
    [timeMinutes, effectiveFogDensity]
  );

  const resolvedBg =
    channel === 'depth'
      ? '#000000'
      : channel === 'normal'
      ? '#09090b'
      : channel === 'color'
      ? timeLighting.skyBgColor
      : bgColor && bgColor !== '#0B0C0E' && bgColor !== '#111622' && bgColor !== '#d4e2ea'
      ? bgColor
      : timeLighting.environment.bgColor;

  const showLit = channel === 'color' || channel === 'clay' || channel === 'wireframe';

  useEffect(() => {
    if (!showLit || effectiveFogDensity <= 0) {
      scene.fog = null;
    }
  }, [scene, showLit, effectiveFogDensity]);

  return (
    <>
      <color attach="background" args={[resolvedBg]} />
      {showLit && effectiveFogDensity > 0 && (
        <fogExp2 attach="fog" args={[resolvedBg, effectiveFogDensity]} />
      )}

      <ambientLight intensity={showLit ? timeLighting.ambientIntensity : 0.2} />
      {showLit && (
        <hemisphereLight
          args={[
            timeLighting.hemiSkyColor,
            timeLighting.hemiGroundColor,
            timeLighting.hemiIntensity,
          ]}
        />
      )}
      <directionalLight
        position={sunPos}
        intensity={showLit ? timeLighting.sunIntensity : 1.1}
        color={timeLighting.sunColor}
        castShadow={graphicsQuality !== 'low'}
        shadow-mapSize-width={graphicsQuality === 'high' ? 2048 : 1024}
        shadow-mapSize-height={graphicsQuality === 'high' ? 2048 : 1024}
        shadow-camera-near={4}
        shadow-camera-far={650}
        shadow-camera-left={-180}
        shadow-camera-right={180}
        shadow-camera-top={180}
        shadow-camera-bottom={-180}
        shadow-bias={-0.0004}
      />
      <directionalLight
        position={[-sunPos[0] * 0.5, 18, -sunPos[2] * 0.5]}
        intensity={0.45}
        color="#dbeafe"
      />

      <group {...(pendingPlacement ? placementSurfaceHandlers : undefined)}>
        {/* 960m x 960m Procedural Terrain & Road Network */}
        <TerrainAndRoadsMesh
          terrain={world.terrain}
          road={world.road}
          channel={channel}
          interactive={safeInteractive}
          onEmptyGroundClick={safeInteractive ? onEmptyGroundClick : undefined}
        />

      <group ref={collidersGroupRef} name="camera_wall_colliders">
        {/* Freehand / Brush-Drawn Roads & Continuous Fences / Walls */}
        <PaintedPathsMesh
          paintedRoads={world.paintedRoads ?? []}
          paintedFences={world.paintedFences ?? []}
          terrain={world.terrain}
          road={world.road}
          channel={channel}
          selectedId={safeInteractive ? selectedId : null}
          interactive={safeInteractive}
          onSelect={safeInteractive ? onSelect : () => {}}
        />

      {/* Instanced Composite Buildings */}
      <ProceduralCity
        buildings={world.buildings}
        channel={channel}
        selectedId={safeInteractive ? selectedId : null}
        onSelectBuilding={safeInteractive ? onSelect : () => {}}
        objectRefs={objectRefs}
      />

      {/* Enterable 2-Story Hero Compound */}
      {world.heroCompound && (
        <EnterableCompoundMesh
          compound={world.heroCompound}
          channel={channel}
          isSelected={safeInteractive && selectedId === world.heroCompound.id}
          onSelect={safeInteractive ? onSelect : () => {}}
          groupRef={
            objectRefs
              ? (el) => {
                  if (world.heroCompound) {
                    objectRefs.current[world.heroCompound.id] = el;
                  }
                }
              : undefined
          }
        />
      )}

      {/* High-Detail Instanced Open-World Props */}
      <InstancedProps
        props={world.scatteredProps}
        channel={channel}
        onSelectProp={safeInteractive ? promoteScatteredProp : undefined}
      />

      {/* Manually placed / editable Props */}
      {world.assets.map((asset) => (
        <PropMesh
          key={asset.id}
          asset={asset}
          channel={channel}
          isSelected={safeInteractive && selectedId === asset.id}
          onSelect={safeInteractive ? onSelect : () => {}}
          groupRef={
            objectRefs
              ? (el) => {
                  objectRefs.current[asset.id] = el;
                }
              : undefined
          }
        />
      ))}

      {/* AI-Modeled Multi-Part Custom 3D Assemblies */}
      {(world.customModels ?? []).map((cm) => (
        <CustomModelMesh
          key={cm.id}
          model={cm}
          channel={channel}
          isSelected={safeInteractive && selectedId === cm.id}
          onSelect={safeInteractive ? onSelect : () => {}}
          groupRef={
            objectRefs
              ? (el) => {
                  objectRefs.current[cm.id] = el;
                }
              : undefined
          }
        />
      ))}

      {/* High-Detail GLB/glTF 3D Meshes (Hunyuan3D / Local Import) */}
      {(world.gltfModels ?? []).map((gm) => (
        <GltfModelMesh
          key={gm.id}
          model={gm}
          channel={channel}
          isSelected={safeInteractive && selectedId === gm.id}
          onSelect={safeInteractive ? onSelect : () => {}}
          groupRef={
            objectRefs
              ? (el) => {
                  objectRefs.current[gm.id] = el;
                }
              : undefined
          }
        />
      ))}
      </group>

        {/* 16-Joint Anatomical Mannequins */}
        {animatedCharacters.map((actor) => (
          <MannequinMesh
            key={actor.id}
            actor={actor}
            channel={channel}
            isSelected={safeInteractive && selectedId === actor.id}
            onSelect={safeInteractive ? onSelect : () => {}}
            terrain={world.terrain}
            road={world.road}
            groupRef={
              objectRefs
                ? (el) => {
                    objectRefs.current[actor.id] = el;
                  }
                : undefined
            }
          />
        ))}

        {/* Smooth 3D Erase Transition Ghosts (Assets, Scattered Props, Characters, Buildings, Roads & Fences) */}
        {erasingBatches.map((batch) => (
          <React.Fragment key={batch.batchId}>
            {batch.assets.map((asset) => (
              <React.Fragment key={`erase_${batch.batchId}_${asset.id}`}>
                <ErasingGroundRipple
                  position={asset.position}
                  radiusScale={Math.max(0.75, asset.scale[0] * 1.1)}
                />
                <PropMesh
                  asset={asset}
                  channel={channel}
                  isSelected={false}
                  onSelect={() => {}}
                  erasing
                />
              </React.Fragment>
            ))}
            {batch.characters.map((actor) => (
              <ErasingEnvelope
                key={`erase_char_${batch.batchId}_${actor.id}`}
                pivot={actor.position}
              >
                <MannequinMesh
                  actor={actor}
                  channel={channel}
                  isSelected={false}
                  onSelect={() => {}}
                  terrain={world.terrain}
                  road={world.road}
                />
              </ErasingEnvelope>
            ))}
            {batch.buildings.map((bldg) => (
              <ErasingEnvelope
                key={`erase_bldg_${batch.batchId}_${bldg.id}`}
                pivot={bldg.position}
              >
                <ProceduralCity
                  buildings={[bldg]}
                  channel={channel}
                  selectedId={null}
                  onSelectBuilding={() => {}}
                />
              </ErasingEnvelope>
            ))}
            {batch.customModels.map((cm) => (
              <ErasingEnvelope
                key={`erase_cm_${batch.batchId}_${cm.id}`}
                pivot={cm.position}
              >
                <CustomModelMesh
                  model={cm}
                  channel={channel}
                  isSelected={false}
                  onSelect={() => {}}
                />
              </ErasingEnvelope>
            ))}
            {batch.gltfModels.map((gm) => (
              <ErasingEnvelope
                key={`erase_gm_${batch.batchId}_${gm.id}`}
                pivot={gm.position}
              >
                <GltfModelMesh
                  model={gm}
                  channel={channel}
                  isSelected={false}
                  onSelect={() => {}}
                />
              </ErasingEnvelope>
            ))}
            {batch.paintedRoads.map((roadStroke) => {
              const midPt =
                roadStroke.points[Math.floor(roadStroke.points.length / 2)] ??
                roadStroke.points[0] ?? [0, 0, 0];
              return (
                <ErasingEnvelope
                  key={`erase_road_${batch.batchId}_${roadStroke.id}`}
                  pivot={midPt}
                >
                  <PaintedPathsMesh
                    paintedRoads={[roadStroke]}
                    paintedFences={[]}
                    terrain={world.terrain}
                    road={world.road}
                    channel={channel}
                    selectedId={null}
                    interactive={false}
                    onSelect={() => {}}
                  />
                </ErasingEnvelope>
              );
            })}
            {batch.paintedFences.map((fenceStroke) => {
              const midPt =
                fenceStroke.points[Math.floor(fenceStroke.points.length / 2)] ??
                fenceStroke.points[0] ?? [0, 0, 0];
              return (
                <ErasingEnvelope
                  key={`erase_fence_${batch.batchId}_${fenceStroke.id}`}
                  pivot={midPt}
                >
                  <PaintedPathsMesh
                    paintedRoads={[]}
                    paintedFences={[fenceStroke]}
                    terrain={world.terrain}
                    road={world.road}
                    channel={channel}
                    selectedId={null}
                    interactive={false}
                    onSelect={() => {}}
                  />
                </ErasingEnvelope>
              );
            })}
          </React.Fragment>
        ))}
        {pendingPlacement && placementSurfaceHandlers && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -40, 0]}>
            <planeGeometry args={[getTerrainSize(world.terrain), getTerrainSize(world.terrain)]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
      </group>
    </>
  );
};
