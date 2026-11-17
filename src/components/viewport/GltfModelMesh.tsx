import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  getChannelMaterialPool,
  getMaterialForChannel,
} from '../../engine/channelMaterials';
import { useStudioStore } from '../../store/useStudioStore';
import type { GltfModelAsset, RenderChannel } from '../../types/scene';
import { AnimatedObjectEnvelope } from './AnimatedObjectEnvelope';

interface GltfModelMeshProps {
  model: GltfModelAsset;
  channel: RenderChannel;
  isSelected: boolean;
  onSelect: (id: string) => void;
  groupRef?: (el: THREE.Group | null) => void;
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer | null {
  const commaIdx = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || commaIdx === -1) return null;
  const header = dataUrl.slice(0, commaIdx);
  const body = dataUrl.slice(commaIdx + 1);
  if (header.includes(';base64')) {
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes.buffer;
  }
  const decoded = decodeURIComponent(body);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes.buffer;
}

export const GltfModelMesh: React.FC<GltfModelMeshProps> = ({
  model,
  channel,
  isSelected,
  onSelect,
  groupRef,
}) => {
  const [loadedScene, setLoadedScene] = useState<THREE.Group | null>(null);

  const porcelainMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e6e1d6'),
      roughness: 0.72,
      metalness: 0.06,
      emissive: isSelected ? new THREE.Color('#0284c7') : new THREE.Color('#000000'),
      emissiveIntensity: isSelected ? 0.25 : 0,
    });
  }, [isSelected]);

  useEffect(() => {
    return () => {
      porcelainMat.dispose();
    };
  }, [porcelainMat]);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();

    const setupScene = (scene: THREE.Group) => {
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry && !mesh.geometry.attributes.normal) {
            mesh.geometry.computeVertexNormals();
          }
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.__origMaterial = mesh.material;
        }
      });
      if (!cancelled) {
        setLoadedScene(scene);
      }
    };

    const buffer = dataUrlToArrayBuffer(model.glbDataUrl);
    if (buffer) {
      loader.parse(
        buffer,
        '',
        (gltf) => setupScene(gltf.scene),
        (err) => console.error('[GltfModelMesh] GLB parse failed:', err)
      );
    } else if (model.glbDataUrl) {
      loader.load(
        model.glbDataUrl,
        (gltf) => setupScene(gltf.scene),
        undefined,
        (err) => console.error('[GltfModelMesh] GLB load failed:', err)
      );
    }

    return () => {
      cancelled = true;
    };
  }, [model.glbDataUrl]);

  useEffect(() => {
    if (!loadedScene) return;
    const wireMat = getChannelMaterialPool().wireframeOverlay;
    const wireClones: THREE.Mesh[] = [];

    loadedScene.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      if (mesh.userData.__isWireOverlay) return;

      const origMat = mesh.userData.__origMaterial as THREE.Material | THREE.Material[] | undefined;
      const hasEmbeddedTextureOrColor =
        origMat &&
        !Array.isArray(origMat) &&
        origMat instanceof THREE.MeshStandardMaterial &&
        (Boolean(origMat.map) ||
          Boolean(mesh.geometry?.attributes?.color) ||
          origMat.color.getHex() !== 0xffffff);

      if (channel === 'color') {
        if (hasEmbeddedTextureOrColor && origMat instanceof THREE.MeshStandardMaterial) {
          origMat.emissive.set(isSelected ? '#0284c7' : '#000000');
          origMat.emissiveIntensity = isSelected ? 0.22 : 0;
          mesh.material = origMat;
        } else {
          mesh.material = porcelainMat;
        }
      } else {
        mesh.material = getMaterialForChannel(channel, isSelected, 'default');
      }

      if (channel === 'wireframe') {
        const wireOverlay = new THREE.Mesh(mesh.geometry, wireMat);
        wireOverlay.userData.__isWireOverlay = true;
        wireOverlay.raycast = () => {};
        mesh.add(wireOverlay);
        wireClones.push(wireOverlay);
      }
    });

    return () => {
      wireClones.forEach((w) => {
        w.parent?.remove(w);
      });
    };
  }, [loadedScene, channel, isSelected, porcelainMat]);

  useEffect(() => {
    return () => {
      if (!loadedScene) return;
      loadedScene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          const orig = mesh.userData.__origMaterial;
          if (Array.isArray(orig)) {
            orig.forEach((m) => m.dispose());
          } else if (orig && typeof orig.dispose === 'function') {
            orig.dispose();
          }
        }
      });
    };
  }, [loadedScene]);

  if (!model.visible) return null;

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
      onPointerDown={handlePointerDown}
    >
      <AnimatedObjectEnvelope
        objectId={model.id}
        animation={model.animation}
        channel={channel}
        baseHeightM={2.2}
        hideShellOnShatter
      >
        {loadedScene && <primitive object={loadedScene} />}
      </AnimatedObjectEnvelope>
    </group>
  );
};
