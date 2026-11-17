import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  getChannelMaterialPool,
  getMaterialForChannel,
} from '../../engine/channelMaterials';
import type { RenderChannel, ScatteredPropSpec } from '../../types/scene';
import { InstancedBatch } from './InstancedBatch';

interface InstancedPropsProps {
  props: ScatteredPropSpec[];
  channel: RenderChannel;
  onSelectProp?: (id: string) => void;
}

function createJerseyBarrierGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.3, 0);
  shape.lineTo(0.3, 0);
  shape.lineTo(0.28, 0.22);
  shape.lineTo(0.14, 0.45);
  shape.lineTo(0.1, 1.0);
  shape.lineTo(-0.1, 1.0);
  shape.lineTo(-0.14, 0.45);
  shape.lineTo(-0.28, 0.22);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 2.4,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    bevelSegments: 1,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-1.2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

function createCarBodyGeometry(): THREE.BufferGeometry {
  // Faceted side-profile car chassis + sloped windshield + cabin
  const shape = new THREE.Shape();
  shape.moveTo(-2.1, 0.28);
  shape.lineTo(2.1, 0.28);
  shape.lineTo(2.05, 0.72);
  shape.lineTo(1.25, 0.88);
  shape.lineTo(0.55, 1.42);
  shape.lineTo(-0.85, 1.42);
  shape.lineTo(-1.55, 0.92);
  shape.lineTo(-2.08, 0.82);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.86,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.05,
    bevelSegments: 2,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.93, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

export const InstancedProps: React.FC<InstancedPropsProps> = ({
  props,
  channel,
  onSelectProp,
}) => {
  const unitBoxGeo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.06), []);
  const unitCylGeo = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 22), []);
  const unitSphereGeo = useMemo(() => new THREE.SphereGeometry(1, 20, 14), []);
  const rockGeo = useMemo(() => {
    const g = new THREE.DodecahedronGeometry(1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i);
      const vy = p.getY(i);
      const vz = p.getZ(i);
      const warp = 0.86 + 0.22 * Math.sin(vx * 3.1 + vz * 2.4 + vy * 1.9);
      p.setXYZ(i, vx * warp * 1.15, vy * warp * 0.72, vz * warp);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const barrierGeo = useMemo(() => createJerseyBarrierGeometry(), []);
  const carGeo = useMemo(() => createCarBodyGeometry(), []);

  useEffect(() => {
    return () => {
      unitBoxGeo.dispose();
      unitCylGeo.dispose();
      unitSphereGeo.dispose();
      rockGeo.dispose();
      barrierGeo.dispose();
      carGeo.dispose();
    };
  }, [unitBoxGeo, unitCylGeo, unitSphereGeo, rockGeo, barrierGeo, carGeo]);

  const batches = useMemo(() => {
    const woodMatrices: THREE.Matrix4[] = [];
    const woodIds: string[] = [];
    const boxDark: THREE.Matrix4[] = [];
    const boxDarkIds: string[] = [];
    const lampHeadMatrices: THREE.Matrix4[] = [];
    const lampHeadIds: string[] = [];
    const cylDark: THREE.Matrix4[] = [];
    const cylDarkIds: string[] = [];
    const trunkMatrices: THREE.Matrix4[] = [];
    const trunkIds: string[] = [];
    const foliageMatrices: THREE.Matrix4[] = [];
    const foliageIds: string[] = [];
    const rockMatrices: THREE.Matrix4[] = [];
    const rockIds: string[] = [];
    const barrierMatrices: THREE.Matrix4[] = [];
    const barrierIds: string[] = [];
    const carMatrices: THREE.Matrix4[] = [];
    const carIds: string[] = [];

    const parent = new THREE.Matrix4();
    const local = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scl = new THREE.Vector3();

    const push = (
      arr: THREE.Matrix4[],
      idArr: string[],
      id: string,
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
      local.compose(pos, quat, scl);
      arr.push(parent.clone().multiply(local));
      idArr.push(id);
    };

    for (const p of props) {
      pos.set(p.position[0], p.position[1], p.position[2]);
      euler.set(0, p.rotationY, 0);
      quat.setFromEuler(euler);
      scl.set(p.scale, p.scale, p.scale);
      parent.compose(pos, quat, scl);

      switch (p.type) {
        case 'lamp':
          push(cylDark, cylDarkIds, p.id, 0, 0.2, 0, 0.34, 0.4, 0.34);
          push(cylDark, cylDarkIds, p.id, 0, 2.3, 0, 0.14, 4.2, 0.14);
          push(boxDark, boxDarkIds, p.id, 0, 4.45, 0.35, 0.1, 0.08, 0.9, -0.25, 0, 0);
          push(lampHeadMatrices, lampHeadIds, p.id, 0, 4.52, 0.9, 0.28, 0.1, 0.44);
          break;

        case 'barrier':
          barrierMatrices.push(parent.clone());
          barrierIds.push(p.id);
          break;

        case 'cargo_stack':
          push(woodMatrices, woodIds, p.id, 0, 0.07, 0, 1.4, 0.14, 1.4);
          push(woodMatrices, woodIds, p.id, -0.28, 0.56, 0.1, 0.72, 0.84, 0.72);
          push(woodMatrices, woodIds, p.id, 0.36, 0.46, -0.15, 0.56, 0.64, 0.8);
          push(woodMatrices, woodIds, p.id, -0.05, 1.24, 0.05, 0.6, 0.52, 0.6, 0, 0.28, 0);
          break;

        case 'car':
          carMatrices.push(parent.clone());
          carIds.push(p.id);
          push(cylDark, cylDarkIds, p.id, -0.88, 0.34, 1.32, 0.68, 0.22, 0.68, 0, 0, Math.PI / 2);
          push(cylDark, cylDarkIds, p.id, 0.88, 0.34, 1.32, 0.68, 0.22, 0.68, 0, 0, Math.PI / 2);
          push(cylDark, cylDarkIds, p.id, -0.88, 0.34, -1.32, 0.68, 0.22, 0.68, 0, 0, Math.PI / 2);
          push(cylDark, cylDarkIds, p.id, 0.88, 0.34, -1.32, 0.68, 0.22, 0.68, 0, 0, Math.PI / 2);
          push(boxDark, boxDarkIds, p.id, -1.04, 0.96, 0.55, 0.18, 0.1, 0.12);
          push(boxDark, boxDarkIds, p.id, 1.04, 0.96, 0.55, 0.18, 0.1, 0.12);
          break;

        case 'tree':
          push(trunkMatrices, trunkIds, p.id, 0, 1.1, 0, 0.32, 2.2, 0.32);
          push(trunkMatrices, trunkIds, p.id, -0.25, 2.0, 0.1, 0.14, 0.9, 0.14, 0.3, 0, 0.45);
          push(trunkMatrices, trunkIds, p.id, 0.25, 2.1, -0.1, 0.14, 0.9, 0.14, -0.2, 0, -0.45);
          push(foliageMatrices, foliageIds, p.id, 0, 2.95, 0, 1.05, 0.95, 1.05);
          push(foliageMatrices, foliageIds, p.id, -0.6, 2.5, 0.25, 0.72, 0.68, 0.72);
          push(foliageMatrices, foliageIds, p.id, 0.62, 2.6, -0.22, 0.7, 0.68, 0.7);
          break;

        case 'bush':
          push(foliageMatrices, foliageIds, p.id, 0, 0.45, 0, 0.65, 0.52, 0.65);
          push(foliageMatrices, foliageIds, p.id, 0.42, 0.36, 0.2, 0.45, 0.4, 0.45);
          push(foliageMatrices, foliageIds, p.id, -0.38, 0.34, -0.18, 0.42, 0.38, 0.42);
          break;

        case 'rock':
          push(rockMatrices, rockIds, p.id, 0, 0.45, 0, 1.0, 0.85, 0.95, 0.12, 0.25, 0.08);
          push(rockMatrices, rockIds, p.id, 0.72, 0.24, 0.35, 0.52, 0.48, 0.5, -0.15, 0.8, 0.2);
          break;
      }
    }

    return {
      woodMatrices,
      woodIds,
      boxDark,
      boxDarkIds,
      lampHeadMatrices,
      lampHeadIds,
      cylDark,
      cylDarkIds,
      trunkMatrices,
      trunkIds,
      foliageMatrices,
      foliageIds,
      rockMatrices,
      rockIds,
      barrierMatrices,
      barrierIds,
      carMatrices,
      carIds,
    };
  }, [props]);

  const woodMat = getMaterialForChannel(channel, false, 'wood');
  const darkMat = getMaterialForChannel(channel, false, 'dark');
  const lampHeadMat = getMaterialForChannel(channel, false, 'emissiveLamp');
  const trunkMat = getMaterialForChannel(channel, false, 'trunk');
  const foliageMat = getMaterialForChannel(channel, false, 'foliage');
  const rockMat = getMaterialForChannel(channel, false, 'rock');
  const concreteMat = getMaterialForChannel(channel, false, 'concrete');
  const carMat = getMaterialForChannel(channel, false, 'car');
  const wireMat = getChannelMaterialPool().wireframeOverlay;
  const showWire = channel === 'wireframe';

  const handleClickBatch = (ids: string[]) =>
    onSelectProp
      ? (idx: number, stop: () => void) => {
          const targetId = ids[idx];
          if (targetId) {
            stop();
            onSelectProp(targetId);
          }
        }
      : undefined;

  return (
    <group name="instanced_world_props">
      <InstancedBatch
        matrices={batches.woodMatrices}
        geometry={unitBoxGeo}
        material={woodMat}
        wireMaterial={wireMat}
        showWire={showWire}
        onPointerDownInstance={handleClickBatch(batches.woodIds)}
      />
      <InstancedBatch
        matrices={batches.boxDark}
        geometry={unitBoxGeo}
        material={darkMat}
        wireMaterial={wireMat}
        showWire={showWire}
        onPointerDownInstance={handleClickBatch(batches.boxDarkIds)}
      />
      <InstancedBatch
        matrices={batches.lampHeadMatrices}
        geometry={unitBoxGeo}
        material={lampHeadMat}
        wireMaterial={wireMat}
        showWire={showWire}
        noCameraCollide
        onPointerDownInstance={handleClickBatch(batches.lampHeadIds)}
      />
      <InstancedBatch
        matrices={batches.cylDark}
        geometry={unitCylGeo}
        material={darkMat}
        wireMaterial={wireMat}
        showWire={showWire}
        noCameraCollide
        onPointerDownInstance={handleClickBatch(batches.cylDarkIds)}
      />
      <InstancedBatch
        matrices={batches.trunkMatrices}
        geometry={unitCylGeo}
        material={trunkMat}
        wireMaterial={wireMat}
        showWire={showWire}
        noCameraCollide
        onPointerDownInstance={handleClickBatch(batches.trunkIds)}
      />
      <InstancedBatch
        matrices={batches.foliageMatrices}
        geometry={unitSphereGeo}
        material={foliageMat}
        wireMaterial={wireMat}
        showWire={showWire}
        noCameraCollide
        onPointerDownInstance={handleClickBatch(batches.foliageIds)}
      />
      <InstancedBatch
        matrices={batches.rockMatrices}
        geometry={rockGeo}
        material={rockMat}
        wireMaterial={wireMat}
        showWire={showWire}
        onPointerDownInstance={handleClickBatch(batches.rockIds)}
      />
      <InstancedBatch
        matrices={batches.barrierMatrices}
        geometry={barrierGeo}
        material={concreteMat}
        wireMaterial={wireMat}
        showWire={showWire}
        onPointerDownInstance={handleClickBatch(batches.barrierIds)}
      />
      <InstancedBatch
        matrices={batches.carMatrices}
        geometry={carGeo}
        material={carMat}
        wireMaterial={wireMat}
        showWire={showWire}
        onPointerDownInstance={handleClickBatch(batches.carIds)}
      />
    </group>
  );
};
