import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getVariantSpec } from '../../data/assetInventory';
import {
  getChannelMaterialPool,
  getMaterialForChannel,
  type ClayVariant,
} from '../../engine/channelMaterials';
import {
  buildRoadRibbonGeometry,
  computeRoadCrossFrames,
  sampleAlongPolyline,
  sampleAlongRoadFrames,
  sampleFenceSegmentsAlongPolyline,
} from '../../engine/paintedPaths';
import { getGroundY } from '../../engine/terrain';
import { useStudioStore } from '../../store/useStudioStore';
import type {
  PaintedFencePath,
  PaintedRoadPath,
  RenderChannel,
  RoadConfig,
  TerrainConfig,
} from '../../types/scene';
import { InventoryModelParts } from './PropMesh';

interface PaintedRoadMeshProps {
  roadPath: PaintedRoadPath;
  terrain: TerrainConfig;
  road: RoadConfig;
  channel: RenderChannel;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const PaintedRoadMesh: React.FC<PaintedRoadMeshProps> = ({
  roadPath,
  terrain,
  road,
  channel,
  isSelected,
  onSelect,
}) => {
  const { style, width, points } = roadPath;
  const roadGroupRef = useRef<THREE.Group | null>(null);
  const prevStyleKeyRef = useRef<string>(`${style}_${width}`);
  const pulseRef = useRef<{ active: boolean; elapsed: number }>({
    active: false,
    elapsed: 0,
  });

  useLayoutEffect(() => {
    const key = `${style}_${width}`;
    if (prevStyleKeyRef.current !== key) {
      prevStyleKeyRef.current = key;
      pulseRef.current = { active: true, elapsed: 0 };
      if (roadGroupRef.current) {
        roadGroupRef.current.scale.set(1, 0.15, 1);
      }
    }
  }, [style, width]);

  useFrame((_, delta) => {
    if (!pulseRef.current.active || !roadGroupRef.current) return;
    pulseRef.current.elapsed += Math.min(delta, 0.05);
    const t = Math.min(1, pulseRef.current.elapsed / 0.38);
    if (t >= 1) {
      roadGroupRef.current.scale.set(1, 1, 1);
      pulseRef.current.active = false;
    } else {
      const c1 = 1.65;
      const c3 = c1 + 1;
      const p = t - 1;
      const sy = Math.max(0.05, 1 + c3 * p * p * p + c1 * p * p);
      roadGroupRef.current.scale.set(1, sy, 1);
    }
  });

  const roadFrames = useMemo(
    () =>
      computeRoadCrossFrames(
        points,
        width,
        style === 'viaduct'
          ? undefined
          : (x, z) => getGroundY(x, z, terrain, road),
        { maxCrossSlope: 0.22, clearance: 0.14 }
      ),
    [points, width, style, terrain, road]
  );

  const geometries = useMemo(() => {
    const groundSkirt = style !== 'viaduct';
    const main = buildRoadRibbonGeometry(
      points,
      width,
      style === 'viaduct' ? 0.52 : style === 'sidewalk' ? 0.24 : 0.22,
      style === 'sidewalk' ? 0.16 : 0.08,
      0,
      { roadFrames, anchorSkirtToGround: groundSkirt }
    );

    const hasCurbs =
      style === 'asphalt_2lane' ||
      style === 'asphalt_4lane' ||
      style === 'highway' ||
      style === 'cobble' ||
      style === 'viaduct';

    const curbW = style === 'highway' || style === 'viaduct' ? 0.42 : 0.48;
    const curbH = style === 'highway' || style === 'viaduct' ? 0.68 : 0.24;
    const curbTop = style === 'highway' || style === 'viaduct' ? 0.62 : 0.18;
    const shift = Math.max(0.5, width * 0.5 - curbW * 0.4);

    const leftEdge = hasCurbs
      ? buildRoadRibbonGeometry(points, curbW, curbH, curbTop, -shift, { roadFrames })
      : null;
    const rightEdge = hasCurbs
      ? buildRoadRibbonGeometry(points, curbW, curbH, curbTop, shift, { roadFrames })
      : null;

    const centerDivider =
      style === 'asphalt_4lane'
        ? buildRoadRibbonGeometry(points, 0.26, 0.04, 0.1, 0, { roadFrames })
        : style === 'highway'
        ? buildRoadRibbonGeometry(points, 0.55, 0.72, 0.65, 0, { roadFrames })
        : null;

    const railLeft =
      style === 'rail'
        ? buildRoadRibbonGeometry(points, 0.16, 0.14, 0.22, -0.82, { roadFrames })
        : style === 'dirt'
        ? buildRoadRibbonGeometry(points, 0.55, 0.04, 0.095, -0.95, { roadFrames })
        : null;
    const railRight =
      style === 'rail'
        ? buildRoadRibbonGeometry(points, 0.16, 0.14, 0.22, 0.82, { roadFrames })
        : style === 'dirt'
        ? buildRoadRibbonGeometry(points, 0.55, 0.04, 0.095, 0.95, { roadFrames })
        : null;

    return { main, leftEdge, rightEdge, centerDivider, railLeft, railRight };
  }, [points, width, style, roadFrames]);

  useEffect(() => {
    return () => {
      geometries.main.dispose();
      geometries.leftEdge?.dispose();
      geometries.rightEdge?.dispose();
      geometries.centerDivider?.dispose();
      geometries.railLeft?.dispose();
      geometries.railRight?.dispose();
    };
  }, [geometries]);

  const stamps = useMemo(() => {
    if (style === 'rail') {
      return sampleAlongRoadFrames(roadFrames, 1.35, 0.12);
    }
    if (style === 'viaduct') {
      return sampleAlongPolyline(points, 12.0, -2.5);
    }
    if (style === 'asphalt_2lane' || style === 'asphalt_4lane' || style === 'highway') {
      return sampleAlongRoadFrames(roadFrames, 4.4, 0.095);
    }
    return [];
  }, [points, roadFrames, style]);

  const baseVariant: ClayVariant =
    style === 'cobble'
      ? 'rock'
      : style === 'dirt'
      ? 'trunk'
      : style === 'sidewalk'
      ? 'concrete'
      : style === 'rail'
      ? 'rock'
      : 'road';

  const baseMat = getMaterialForChannel(channel, isSelected, baseVariant);
  const edgeVariant: ClayVariant =
    style === 'viaduct' || style === 'highway' ? 'concrete' : 'concrete';
  const edgeMat = getMaterialForChannel(channel, isSelected, edgeVariant);
  const dividerMat = getMaterialForChannel(
    channel,
    isSelected,
    style === 'highway' ? 'concrete' : 'accent'
  );
  const darkMat = getMaterialForChannel(channel, isSelected, 'dark');
  const woodMat = getMaterialForChannel(channel, isSelected, 'wood');
  const dashMat = getMaterialForChannel(
    channel,
    isSelected,
    style === 'asphalt_2lane' ? 'accent' : 'default'
  );
  const wireMat = getChannelMaterialPool().wireframeOverlay;
  const showWire = channel === 'wireframe';

  const handlePointerDown = (e: { stopPropagation: () => void }) => {
    if (useStudioStore.getState().pendingPlacement) return;
    e.stopPropagation();
    onSelect(roadPath.id);
  };

  return (
    <group ref={roadGroupRef} name={roadPath.id}>
      <mesh
        geometry={geometries.main}
        material={baseMat}
        receiveShadow
        castShadow={style === 'viaduct'}
        onPointerDown={handlePointerDown}
      />
      {showWire && <mesh geometry={geometries.main} material={wireMat} />}

      {geometries.leftEdge && (
        <mesh
          geometry={geometries.leftEdge}
          material={edgeMat}
          castShadow
          receiveShadow
          onPointerDown={handlePointerDown}
        />
      )}
      {geometries.rightEdge && (
        <mesh
          geometry={geometries.rightEdge}
          material={edgeMat}
          castShadow
          receiveShadow
          onPointerDown={handlePointerDown}
        />
      )}
      {geometries.centerDivider && (
        <mesh
          geometry={geometries.centerDivider}
          material={dividerMat}
          castShadow={style === 'highway'}
          receiveShadow
          onPointerDown={handlePointerDown}
        />
      )}
      {geometries.railLeft && (
        <mesh
          geometry={geometries.railLeft}
          material={style === 'rail' ? darkMat : edgeMat}
          castShadow={style === 'rail'}
          receiveShadow
          onPointerDown={handlePointerDown}
        />
      )}
      {geometries.railRight && (
        <mesh
          geometry={geometries.railRight}
          material={style === 'rail' ? darkMat : edgeMat}
          castShadow={style === 'rail'}
          receiveShadow
          onPointerDown={handlePointerDown}
        />
      )}

      {style === 'rail' &&
        stamps.map((s, idx) => (
          <mesh
            key={`tie_${idx}`}
            position={s.position}
            rotation={[s.pitchX, s.rotationY, s.rollZ, 'YXZ']}
            material={woodMat}
            castShadow
            receiveShadow
            onPointerDown={handlePointerDown}
          >
            <boxGeometry args={[2.5, 0.1, 0.34]} />
          </mesh>
        ))}

      {style === 'viaduct' &&
        stamps.map((s, idx) => (
          <mesh
            key={`pier_${idx}`}
            position={s.position}
            rotation={[0, s.rotationY, 0]}
            material={edgeMat}
            castShadow
            receiveShadow
            onPointerDown={handlePointerDown}
          >
            <cylinderGeometry args={[0.68, 0.84, 5.2, 12]} />
          </mesh>
        ))}

      {style === 'asphalt_2lane' &&
        stamps.map((s, idx) => (
          <mesh
            key={`dash_${idx}`}
            position={s.position}
            rotation={[s.pitchX, s.rotationY, s.rollZ, 'YXZ']}
            material={dashMat}
            receiveShadow
            onPointerDown={handlePointerDown}
          >
            <boxGeometry args={[0.18, 0.03, 2.2]} />
          </mesh>
        ))}

      {(style === 'asphalt_4lane' || style === 'highway') &&
        stamps.map((s, idx) => {
          const laneShift = width * 0.25;
          const rx = Math.cos(s.rotationY) * laneShift;
          const rz = -Math.sin(s.rotationY) * laneShift;
          const rightDy = -Math.tan(s.rollZ) * laneShift;
          return (
            <React.Fragment key={`ldash_${idx}`}>
              <mesh
                position={[s.position[0] - rx, s.position[1] + rightDy, s.position[2] - rz]}
                rotation={[s.pitchX, s.rotationY, s.rollZ, 'YXZ']}
                material={dashMat}
                receiveShadow
              >
                <boxGeometry args={[0.14, 0.03, 2.1]} />
              </mesh>
              <mesh
                position={[s.position[0] + rx, s.position[1] - rightDy, s.position[2] + rz]}
                rotation={[s.pitchX, s.rotationY, s.rollZ, 'YXZ']}
                material={dashMat}
                receiveShadow
              >
                <boxGeometry args={[0.14, 0.03, 2.1]} />
              </mesh>
            </React.Fragment>
          );
        })}
    </group>
  );
};

interface PaintedFenceMeshProps {
  fencePath: PaintedFencePath;
  terrain: TerrainConfig;
  road: RoadConfig;
  channel: RenderChannel;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const PaintedFenceMesh: React.FC<PaintedFenceMeshProps> = ({
  fencePath,
  terrain,
  road,
  channel,
  isSelected,
  onSelect,
}) => {
  const variantSpec = useMemo(
    () => getVariantSpec(fencePath.propType, fencePath.variantId),
    [fencePath.propType, fencePath.variantId]
  );

  const segments = useMemo(() => {
    const spanAxis: 'x' | 'z' =
      variantSpec.depthM > variantSpec.widthM * 1.15 ? 'z' : 'x';
    const segLen = Math.max(variantSpec.widthM, variantSpec.depthM);
    return sampleFenceSegmentsAlongPolyline(
      fencePath.points,
      segLen,
      spanAxis,
      terrain,
      road
    );
  }, [fencePath.points, variantSpec, terrain, road]);

  const handlePointerDown = (e: { stopPropagation: () => void }) => {
    if (useStudioStore.getState().pendingPlacement) return;
    e.stopPropagation();
    onSelect(fencePath.id);
  };

  return (
    <group name={fencePath.id}>
      {segments.map((seg, idx) => (
        <group
          key={`${fencePath.id}_seg_${idx}`}
          position={seg.position}
          rotation={[0, seg.rotationY, 0]}
        >
          <InventoryModelParts
            parts={variantSpec.parts}
            variantKey={`${variantSpec.id}_${idx}`}
            channel={channel}
            isSelected={isSelected}
            onPointerDown={handlePointerDown}
          />
        </group>
      ))}
    </group>
  );
};

interface PaintedPathsMeshProps {
  paintedRoads: PaintedRoadPath[];
  paintedFences: PaintedFencePath[];
  terrain: TerrainConfig;
  road: RoadConfig;
  channel: RenderChannel;
  selectedId: string | null;
  interactive: boolean;
  onSelect: (id: string) => void;
}

export const PaintedPathsMesh: React.FC<PaintedPathsMeshProps> = ({
  paintedRoads,
  paintedFences,
  terrain,
  road,
  channel,
  selectedId,
  interactive,
  onSelect,
}) => {
  if (paintedRoads.length === 0 && paintedFences.length === 0) return null;

  return (
    <group name="painted_roads_and_fences">
      {paintedRoads.map((rp) => (
        <PaintedRoadMesh
          key={rp.id}
          roadPath={rp}
          terrain={terrain}
          road={road}
          channel={channel}
          isSelected={interactive && selectedId === rp.id}
          onSelect={interactive ? onSelect : () => {}}
        />
      ))}
      {paintedFences.map((fp) => (
        <PaintedFenceMesh
          key={fp.id}
          fencePath={fp}
          terrain={terrain}
          road={road}
          channel={channel}
          isSelected={interactive && selectedId === fp.id}
          onSelect={interactive ? onSelect : () => {}}
        />
      ))}
    </group>
  );
};
