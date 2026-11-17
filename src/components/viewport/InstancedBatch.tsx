import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface InstancedBatchProps {
  matrices: THREE.Matrix4[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  wireMaterial: THREE.Material;
  showWire: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  noCameraCollide?: boolean;
  onPointerDownInstance?: (instanceId: number, stopPropagation: () => void) => void;
}

export const InstancedBatch: React.FC<InstancedBatchProps> = ({
  matrices,
  geometry,
  material,
  wireMaterial,
  showWire,
  castShadow = true,
  receiveShadow = true,
  noCameraCollide = false,
  onPointerDownInstance,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const wireRef = useRef<THREE.InstancedMesh>(null);

  const instanceArgs = useMemo(
    () =>
      [geometry, undefined, matrices.length] as [
        THREE.BufferGeometry,
        THREE.Material | undefined,
        number,
      ],
    [geometry, matrices.length]
  );

  useLayoutEffect(() => {
    const apply = (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      for (let i = 0; i < matrices.length; i++) {
        mesh.setMatrixAt(i, matrices[i]);
      }
      mesh.count = matrices.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    apply(meshRef.current);
    apply(wireRef.current);
  }, [matrices, geometry, material, wireMaterial, showWire]);

  if (matrices.length === 0) return null;

  return (
    <>
      <instancedMesh
        key={`m_${matrices.length}`}
        ref={meshRef}
        args={instanceArgs}
        material={material}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        userData={noCameraCollide ? { noCameraCollide: true } : undefined}
        onPointerDown={
          onPointerDownInstance
            ? (e) => {
                if (typeof e.instanceId === 'number') {
                  onPointerDownInstance(e.instanceId, () => e.stopPropagation());
                }
              }
            : undefined
        }
      />
      {showWire && (
        <instancedMesh
          key={`w_${matrices.length}`}
          ref={wireRef}
          args={instanceArgs}
          material={wireMaterial}
        />
      )}
    </>
  );
};
