import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { collabManager } from '../../collab/collabManager';
import { useCollabStore } from '../../store/useCollabStore';
import { useStudioStore } from '../../store/useStudioStore';
import type { Vec3 } from '../../types/scene';

interface Collaborators3DProps {
  directorCamRef: React.RefObject<THREE.PerspectiveCamera>;
  orbitRef: React.RefObject<{ target: THREE.Vector3 } | null>;
  objectRefs: React.MutableRefObject<Record<string, THREE.Group | null>>;
}

export const Collaborators3D: React.FC<Collaborators3DProps> = ({
  directorCamRef,
  orbitRef,
  objectRefs,
}) => {
  const language = useStudioStore((s) => s.language);
  const status = useCollabStore((s) => s.status);
  const peers = useCollabStore((s) => s.peers);
  const clientId = useCollabStore((s) => s.clientId);
  const remoteDragPreviews = useCollabStore((s) => s.remoteDragPreviews);

  const otherPeers = useMemo(
    () =>
      status === 'connected'
        ? peers.filter((p) => p.clientId !== clientId)
        : [],
    [status, peers, clientId]
  );

  useFrame(() => {
    if (status !== 'connected') return;

    const cam = directorCamRef.current;
    const target = orbitRef.current?.target;
    if (cam && target) {
      collabManager.updateCameraPose(
        [
          Number(cam.position.x.toFixed(2)),
          Number(cam.position.y.toFixed(2)),
          Number(cam.position.z.toFixed(2)),
        ],
        [
          Number(target.x.toFixed(2)),
          Number(target.y.toFixed(2)),
          Number(target.z.toFixed(2)),
        ]
      );
    }

    // Apply live remote drag previews directly to Three.js groups before authoritative commit
    for (const preview of Object.values(remoteDragPreviews)) {
      const grp = objectRefs.current[preview.objectId];
      if (!grp) continue;
      grp.position.set(
        preview.position[0],
        preview.position[1],
        preview.position[2]
      );
      grp.rotation.set(
        preview.rotation[0],
        preview.rotation[1],
        preview.rotation[2]
      );
      grp.scale.set(preview.scale[0], preview.scale[1], preview.scale[2]);
    }
  });

  if (status !== 'connected' || otherPeers.length === 0) return null;

  return (
    <group>
      {otherPeers.map((peer) => {
        const camPos: Vec3 = peer.cameraPos ?? [0, 8, 16];
        const camTarget: Vec3 = peer.cameraTarget ?? [0, 1, 0];

        // Compute focus badge position if peer has a selected object present in scene
        const selGrp = peer.selectedId
          ? objectRefs.current[peer.selectedId]
          : null;
        const preview = peer.selectedId
          ? remoteDragPreviews[peer.selectedId]
          : undefined;
        let selPos: Vec3 | null = null;
        if (preview) {
          selPos = [
            preview.position[0],
            preview.position[1] + 2.4,
            preview.position[2],
          ];
        } else if (selGrp) {
          selPos = [
            selGrp.position.x,
            selGrp.position.y + 2.4,
            selGrp.position.z,
          ];
        }

        return (
          <React.Fragment key={peer.clientId}>
            {/* Peer Camera Beacon */}
            <group position={camPos}>
              <mesh>
                <sphereGeometry args={[0.26, 14, 12]} />
                <meshBasicMaterial color={peer.color} />
              </mesh>
              <Html
                center
                distanceFactor={18}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                <div
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap shadow-md border border-white/60"
                  style={{ backgroundColor: peer.color }}
                >
                  {language === 'en' ? `${peer.name}'s View` : `${peer.name} 视角`}
                </div>
              </Html>
            </group>

            {/* Peer Look-At Ground Ring */}
            <group position={[camTarget[0], camTarget[1] + 0.06, camTarget[2]]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.32, 0.48, 20]} />
                <meshBasicMaterial
                  color={peer.color}
                  transparent
                  opacity={0.75}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
            <Line
              points={[camPos, camTarget]}
              color={peer.color}
              transparent
              opacity={0.28}
              lineWidth={1}
              dashed
              dashSize={0.5}
              gapSize={0.35}
            />

            {/* Peer Active Object Selection / Dragging Badge */}
            {selPos && (
              <group position={selPos}>
                <Html
                  center
                  distanceFactor={16}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  <div
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap shadow-md flex items-center gap-1 border border-white/70"
                    style={{ backgroundColor: peer.color }}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full bg-white ${
                        peer.isDragging ? 'animate-ping' : ''
                      }`}
                    />
                    <span>
                      {peer.name}
                      {peer.isDragging
                        ? language === 'en'
                          ? ' moving'
                          : ' 正在移动'
                        : language === 'en'
                          ? ' selected'
                          : ' 选中'}
                    </span>
                  </div>
                </Html>
              </group>
            )}
          </React.Fragment>
        );
      })}
    </group>
  );
};
