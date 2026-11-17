import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getChannelMaterialPool,
  getMaterialForChannel,
} from '../../engine/channelMaterials';
import { generateRoadLayout } from '../../engine/roadNetwork';
import {
  createTerrainGeometry,
  getTerrainSize,
  isMarineTerrain,
  SCULPT_GRID_DEFAULT,
} from '../../engine/terrain';
import {
  applyTerrainSculptDab,
  ensurePaintMaterialBuffer,
  ensureSculptDeltaBuffer,
  serializePaintMaterials,
  serializeSculptDeltas,
} from '../../engine/terrainBrush';
import { useStudioStore } from '../../store/useStudioStore';
import type { RenderChannel, RoadConfig, TerrainConfig } from '../../types/scene';

interface TerrainAndRoadsMeshProps {
  terrain: TerrainConfig;
  road: RoadConfig;
  channel: RenderChannel;
  interactive?: boolean;
  onEmptyGroundClick?: () => void;
}

const RING_SEGMENTS = 48;
function buildCirclePoints(radius: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= RING_SEGMENTS; i++) {
    const a = (i / RING_SEGMENTS) * Math.PI * 2;
    pts.push([Math.cos(a) * radius, 0.08, Math.sin(a) * radius]);
  }
  return pts;
}
const UNIT_CIRCLE_POINTS = buildCirclePoints(1);

export const TerrainAndRoadsMesh: React.FC<TerrainAndRoadsMeshProps> = ({
  terrain,
  road,
  channel,
  interactive = false,
  onEmptyGroundClick,
}) => {
  const emptyClickDownRef = useRef<{ x: number; y: number } | null>(null);
  const terrainBrush = useStudioStore((s) => s.terrainBrush);
  const terrainBrushOrbitHold = useStudioStore((s) => s.terrainBrushOrbitHold);
  const setTerrainPointerOver = useStudioStore((s) => s.setTerrainPointerOver);
  const pushHistory = useStudioStore((s) => s.pushHistory);
  const commitTerrainSculpt = useStudioStore((s) => s.commitTerrainSculpt);

  const terrainGeo = useMemo(
    () => createTerrainGeometry(terrain, road),
    [terrain, road]
  );

  useEffect(() => {
    return () => {
      terrainGeo.dispose();
    };
  }, [terrainGeo]);

  const liveDeltasRef = useRef<Float32Array | null>(null);
  const livePaintsRef = useRef<Uint8Array | null>(null);
  const isPaintingRef = useRef(false);
  const anchorYRef = useRef(0);
  const lastDabPosRef = useRef<{ x: number; z: number } | null>(null);
  const lastStrokeTimeRef = useRef(0);

  const cursorGroupRef = useRef<THREE.Group>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [modState, setModState] = useState<{ alt: boolean; shift: boolean }>({
    alt: false,
    shift: false,
  });

  // Sync runtime sculpt & paint buffers whenever stored terrain changes externally
  useEffect(() => {
    if (!isPaintingRef.current) {
      liveDeltasRef.current = ensureSculptDeltaBuffer(terrain);
      livePaintsRef.current = ensurePaintMaterialBuffer(terrain);
    }
  }, [terrain]);

  // Commit finished brush stroke cleanly on window pointerup
  const finishStroke = useCallback(() => {
    if (!isPaintingRef.current) return;
    isPaintingRef.current = false;
    lastDabPosRef.current = null;
    if (liveDeltasRef.current) {
      const serialized = serializeSculptDeltas(liveDeltasRef.current);
      const serializedPaints = livePaintsRef.current
        ? serializePaintMaterials(livePaintsRef.current)
        : undefined;
      commitTerrainSculpt(
        serialized,
        terrain.sculptGridRes ?? SCULPT_GRID_DEFAULT,
        serializedPaints
      );
    }
  }, [commitTerrainSculpt, terrain.sculptGridRes]);

  useEffect(() => {
    const onWinUp = () => finishStroke();
    const onKeyChange = (e: KeyboardEvent) => {
      setModState((prev) =>
        prev.alt === e.altKey && prev.shift === e.shiftKey
          ? prev
          : { alt: e.altKey, shift: e.shiftKey }
      );
    };
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('keydown', onKeyChange);
    window.addEventListener('keyup', onKeyChange);
    return () => {
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('keydown', onKeyChange);
      window.removeEventListener('keyup', onKeyChange);
    };
  }, [finishStroke]);

  useEffect(() => {
    if (!terrainBrush.active || !interactive || terrainBrushOrbitHold) {
      setCursorVisible(false);
      if (isPaintingRef.current) {
        finishStroke();
      }
    }
  }, [terrainBrush.active, terrainBrushOrbitHold, interactive, finishStroke]);

  const updateCursorVisual = (e: ThreeEvent<PointerEvent>) => {
    if (!cursorGroupRef.current) return;
    cursorGroupRef.current.position.copy(e.point);
    if (e.face) {
      const n = e.face.normal.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      cursorGroupRef.current.quaternion.setFromUnitVectors(up, n);
    } else {
      cursorGroupRef.current.quaternion.identity();
    }
  };

  const applyDabAtEvent = (e: ThreeEvent<PointerEvent>, force = false) => {
    if (!liveDeltasRef.current) {
      liveDeltasRef.current = ensureSculptDeltaBuffer(terrain);
    }
    if (!livePaintsRef.current) {
      livePaintsRef.current = ensurePaintMaterialBuffer(terrain);
    }
    const now = performance.now();
    const prev = lastDabPosRef.current;
    const dist = prev ? Math.hypot(e.point.x - prev.x, e.point.z - prev.z) : Infinity;
    const stepThreshold = Math.max(0.35, terrainBrush.radius * 0.14);
    if (!force && dist < stepThreshold && now - lastStrokeTimeRef.current < 32) {
      return;
    }
    lastDabPosRef.current = { x: e.point.x, z: e.point.z };
    lastStrokeTimeRef.current = now;

    applyTerrainSculptDab(
      terrainGeo,
      liveDeltasRef.current,
      terrain,
      road,
      {
        hitX: e.point.x,
        hitZ: e.point.z,
        anchorY: anchorYRef.current,
        tool: terrainBrush.tool,
        material: terrainBrush.material ?? 'auto',
        radius: terrainBrush.radius,
        strength: terrainBrush.strength,
        falloff: terrainBrush.falloff,
        invert: e.altKey,
        shiftSmooth: e.shiftKey,
      },
      livePaintsRef.current
    );
  };

  const handleTerrainPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (
      !interactive ||
      !terrainBrush.active ||
      terrainBrushOrbitHold ||
      e.button !== 0 ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    e.stopPropagation();
    pushHistory();
    isPaintingRef.current = true;
    anchorYRef.current = e.point.y;
    setCursorVisible(true);
    updateCursorVisual(e);
    applyDabAtEvent(e, true);
  };

  const handleTerrainPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive || !terrainBrush.active) return;
    setTerrainPointerOver(true);
    if (terrainBrushOrbitHold) {
      setCursorVisible(false);
      return;
    }
    setCursorVisible(true);
    setModState((prev) =>
      prev.alt === e.altKey && prev.shift === e.shiftKey
        ? prev
        : { alt: e.altKey, shift: e.shiftKey }
    );
    updateCursorVisual(e);
    if (isPaintingRef.current) {
      e.stopPropagation();
      applyDabAtEvent(e, false);
    }
  };

  const materialCursorColor: Record<string, string> = {
    water: '#0ea5e9',
    grass: '#22c55e',
    rock: '#64748b',
    sand: '#eab308',
    soil: '#a16207',
    snow: '#f8fafc',
  };

  const cursorColor = modState.shift || terrainBrush.tool === 'smooth'
    ? '#6366f1'
    : modState.alt || terrainBrush.tool === 'erase'
    ? '#0ea5e9'
    : terrainBrush.material && terrainBrush.material !== 'auto'
    ? materialCursorColor[terrainBrush.material] || '#ef4444'
    : terrainBrush.tool === 'flatten'
    ? '#f59e0b'
    : '#ef4444';

  const innerScale = Math.max(0.1, 1 - terrainBrush.falloff);

  const layout = useMemo(
    () => generateRoadLayout(road, terrain),
    [road, terrain]
  );

  const terrainMat = getMaterialForChannel(channel, false, 'terrain');
  const waterMat = getMaterialForChannel(channel, false, 'water');
  const roadMat = getMaterialForChannel(channel, false, 'road');
  const curbMat = getMaterialForChannel(channel, false, 'accent');
  const wireMat = getChannelMaterialPool().wireframeOverlay;
  const showWire = channel === 'wireframe';
  const terrainSize = getTerrainSize(terrain);
  const waterSize = isMarineTerrain(terrain)
    ? Math.max(2400, terrainSize * 2.5)
    : Math.max(20, terrainSize - 4);

  const crosswalkRef = useRef<THREE.InstancedMesh>(null);
  const crosswalkWireRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const update = (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      layout.crosswalks.forEach((cw, idx) => {
        dummy.position.set(...cw.position);
        dummy.rotation.set(0, cw.rotationY, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
      });
      mesh.count = layout.crosswalks.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    update(crosswalkRef.current);
    update(crosswalkWireRef.current);
  }, [layout.crosswalks, showWire]);

  return (
    <group
      name="terrain_and_roads"
      onPointerDown={(e) => {
        if (!interactive || terrainBrush.active || e.button !== 0) {
          emptyClickDownRef.current = null;
          return;
        }
        emptyClickDownRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const down = emptyClickDownRef.current;
        emptyClickDownRef.current = null;
        if (!interactive || terrainBrush.active || e.button !== 0 || !down) {
          return;
        }
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) {
          onEmptyGroundClick?.();
        }
      }}
    >
      {/* 240m x 240m Heightfield Terrain (Sculptable with ZBrush Brush) */}
      <mesh
        geometry={terrainGeo}
        material={terrainMat}
        receiveShadow
        onPointerDown={handleTerrainPointerDown}
        onPointerMove={handleTerrainPointerMove}
        onPointerOver={() => {
          if (interactive && terrainBrush.active) setTerrainPointerOver(true);
        }}
        onPointerOut={() => {
          setTerrainPointerOver(false);
          if (!isPaintingRef.current) setCursorVisible(false);
        }}
      />
      {showWire && <mesh geometry={terrainGeo} material={wireMat} />}

      {/* ZBrush-Style Dual-Ring Surface Brush Cursor */}
      {interactive && terrainBrush.active && !terrainBrushOrbitHold && (
        <group ref={cursorGroupRef} visible={cursorVisible}>
          <group scale={[terrainBrush.radius, 1, terrainBrush.radius]}>
            <Line
              points={UNIT_CIRCLE_POINTS}
              color={cursorColor}
              lineWidth={2.2}
            />
          </group>
          <group
            scale={[
              terrainBrush.radius * innerScale,
              1,
              terrainBrush.radius * innerScale,
            ]}
          >
            <Line
              points={UNIT_CIRCLE_POINTS}
              color={cursorColor}
              lineWidth={1.2}
              dashed
              dashSize={0.12}
              gapSize={0.08}
            />
          </group>
          <Line
            points={[
              [0, 0, 0],
              [0, Math.min(4.5, Math.max(1.2, terrainBrush.radius * 0.25)), 0],
            ]}
            color={cursorColor}
            lineWidth={2}
          />
        </group>
      )}

      {/* Ocean, Canal & Carved Water Basin Plane */}
      <mesh
        position={[0, -1.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={waterMat}
        receiveShadow
      >
        <planeGeometry args={[waterSize, waterSize]} />
      </mesh>

      {/* Road Surfaces (omitted in pure white-box 'none' mode) */}
      {road.pattern !== 'none' &&
        layout.roads.map((r, i) => (
        <group
          key={`road_${i}`}
          position={r.position}
          rotation={[0, r.rotationY, 0]}
        >
          <mesh receiveShadow material={roadMat}>
            <boxGeometry args={[r.width, 0.06, r.length]} />
          </mesh>
          {showWire && (
            <mesh material={wireMat}>
              <boxGeometry args={[r.width, 0.06, r.length]} />
            </mesh>
          )}
        </group>
        ))}

      {/* Sidewalk Curbs */}
      {road.pattern !== 'none' &&
        layout.curbs.map((c, i) => (
        <group
          key={`curb_${i}`}
          position={c.position}
          rotation={[0, c.rotationY, 0]}
        >
          <mesh castShadow receiveShadow material={curbMat}>
            <boxGeometry args={[0.7, 0.24, c.length]} />
          </mesh>
          {showWire && (
            <mesh material={wireMat}>
              <boxGeometry args={[0.7, 0.24, c.length]} />
            </mesh>
          )}
        </group>
        ))}

      {/* Instanced Crosswalk Stripes */}
      {road.pattern !== 'none' && layout.crosswalks.length > 0 && (
        <>
          <instancedMesh
            ref={crosswalkRef}
            args={[undefined, undefined, layout.crosswalks.length]}
            material={curbMat}
            receiveShadow
          >
            <boxGeometry args={[0.55, 0.04, 2.8]} />
          </instancedMesh>
          {showWire && (
            <instancedMesh
              ref={crosswalkWireRef}
              args={[undefined, undefined, layout.crosswalks.length]}
              material={wireMat}
            >
              <boxGeometry args={[0.55, 0.04, 2.8]} />
            </instancedMesh>
          )}
        </>
      )}
    </group>
  );
};
