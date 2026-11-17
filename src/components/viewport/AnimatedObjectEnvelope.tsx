import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getTintedMaterialForChannel,
} from '../../engine/channelMaterials';
import {
  OBJECT_ANIMATION_PRESETS,
  evaluateObjectAnimationTransform,
  hashStringSeed,
  seededRand,
} from '../../engine/objectAnimations';
import { useStudioStore } from '../../store/useStudioStore';
import type { ObjectAnimationSpec, RenderChannel } from '../../types/scene';

interface AnimatedObjectEnvelopeProps {
  objectId: string;
  animation?: ObjectAnimationSpec;
  channel: RenderChannel;
  baseHeightM?: number;
  tintColor?: string;
  hideShellOnShatter?: boolean;
  children: React.ReactNode;
}

const SHARD_COUNT = 14;

export const AnimatedObjectEnvelope: React.FC<AnimatedObjectEnvelopeProps> = ({
  objectId,
  animation,
  channel,
  baseHeightM = 2.0,
  tintColor,
  hideShellOnShatter = false,
  children,
}) => {
  const animGroupRef = useRef<THREE.Group | null>(null);
  const shellGroupRef = useRef<THREE.Group | null>(null);
  const lampGlowRef = useRef<THREE.Mesh | null>(null);
  const shardRefs = useRef<(THREE.Mesh | null)[]>([]);

  const seed = useMemo(() => hashStringSeed(objectId), [objectId]);

  const shardSeeds = useMemo(() => {
    return Array.from({ length: SHARD_COUNT }, (_, i) => {
      const a = seededRand(seed + 0.17, i * 19 + 1) * Math.PI * 2;
      const elev = 0.25 + seededRand(seed + 0.53, i * 23 + 2) * 0.7;
      const speed = 2.4 + seededRand(seed + 0.89, i * 31 + 3) * 4.8;
      const upSpeed = 3.2 + seededRand(seed + 1.13, i * 37 + 4) * 4.6;
      const spinX = (seededRand(seed + 1.41, i * 41 + 5) - 0.5) * 14;
      const spinY = (seededRand(seed + 1.73, i * 43 + 6) - 0.5) * 14;
      const spinZ = (seededRand(seed + 2.09, i * 47 + 7) - 0.5) * 14;
      const size = 0.12 + seededRand(seed + 2.51, i * 53 + 8) * 0.24;
      const ox = Math.cos(a) * 0.22 * (1 - elev * 0.3);
      const oy = 0.2 + seededRand(seed + 2.93, i * 59 + 9) * Math.min(1.6, baseHeightM * 0.65);
      const oz = Math.sin(a) * 0.22 * (1 - elev * 0.3);
      return { a, speed, upSpeed, spinX, spinY, spinZ, size, ox, oy, oz };
    });
  }, [seed, baseHeightM]);

  const shardGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  useEffect(() => {
    return () => {
      shardGeo.dispose();
    };
  }, [shardGeo]);

  const usesShards = Boolean(
    animation &&
      animation.preset !== 'none' &&
      OBJECT_ANIMATION_PRESETS[animation.preset]?.usesShards
  );
  const isFlickerLamp = animation?.preset === 'lamp_flicker';

  const shardMat = getTintedMaterialForChannel(channel, false, 'dark', tintColor);
  const lampGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fde68a',
        transparent: true,
        opacity: 0.72,
      }),
    []
  );
  useEffect(() => {
    return () => {
      lampGlowMat.dispose();
    };
  }, [lampGlowMat]);

  useFrame(() => {
    const root = animGroupRef.current;
    if (!root) return;

    if (!animation || animation.preset === 'none') {
      root.position.set(0, 0, 0);
      root.rotation.set(0, 0, 0);
      root.scale.set(1, 1, 1);
      if (shellGroupRef.current) {
        shellGroupRef.current.visible = true;
        shellGroupRef.current.scale.set(1, 1, 1);
      }
      return;
    }

    const currentTime = useStudioStore.getState().currentTime;
    const ev = evaluateObjectAnimationTransform(animation, currentTime, seed, baseHeightM);

    root.position.set(ev.posOffset[0], ev.posOffset[1], ev.posOffset[2]);
    root.rotation.set(ev.rotEuler[0], ev.rotEuler[1], ev.rotEuler[2]);
    root.scale.set(ev.scaleMul[0], ev.scaleMul[1], ev.scaleMul[2]);

    // Single-part rocks hide intact shell when rock_shatter erupts into flying shards
    if (shellGroupRef.current) {
      if (
        hideShellOnShatter &&
        animation.preset === 'rock_shatter' &&
        ev.scatterProgress > 0.02
      ) {
        const s = Math.max(0.001, 1 - Math.min(1, ev.scatterProgress * 9));
        shellGroupRef.current.scale.set(s, s, s);
        shellGroupRef.current.visible = s > 0.015;
      } else {
        shellGroupRef.current.visible = true;
        shellGroupRef.current.scale.set(1, 1, 1);
      }
    }

    if (lampGlowRef.current && isFlickerLamp) {
      lampGlowRef.current.visible = ev.active && ev.flickerVisible;
    }

    if (usesShards) {
      const sp = ev.scatterProgress;
      const intensity = THREE.MathUtils.clamp(animation.intensity ?? 1.0, 0.2, 2.5);
      const tFlight = sp * Math.max(0.75, animation.duration ?? 1.3);
      const g = 11.8;

      for (let i = 0; i < SHARD_COUNT; i++) {
        const m = shardRefs.current[i];
        if (!m) continue;
        if (sp <= 0.002) {
          m.visible = false;
          continue;
        }
        m.visible = true;
        const sh = shardSeeds[i];
        const x = sh.ox + Math.cos(sh.a) * sh.speed * intensity * tFlight;
        const z = sh.oz + Math.sin(sh.a) * sh.speed * intensity * tFlight;
        const rawY = sh.oy + sh.upSpeed * intensity * tFlight - 0.5 * g * tFlight * tFlight;
        const floorY = sh.size * 0.55;
        const y = Math.max(floorY, rawY);

        m.position.set(x, y, z);
        const rotT = rawY <= floorY ? tFlight * 0.45 : tFlight;
        m.rotation.set(sh.spinX * rotT, sh.spinY * rotT, sh.spinZ * rotT);

        // Gently shrink tiny dust shards only at the very tail of collapse_sink
        const tailScale =
          animation.preset === 'collapse_sink' && sp > 0.85
            ? THREE.MathUtils.lerp(1, 0.25, (sp - 0.85) / 0.15)
            : 1;
        const sz = sh.size * tailScale * Math.max(0.5, Math.min(1.8, baseHeightM * 0.45));
        m.scale.set(sz * 1.15, sz * 0.78, sz);
      }
    }
  });

  return (
    <group ref={animGroupRef}>
      <group ref={shellGroupRef}>{children}</group>

      {isFlickerLamp && (
        <mesh
          ref={lampGlowRef}
          position={[0, Math.max(1.2, baseHeightM * 0.88), 0]}
          material={lampGlowMat}
          visible={false}
        >
          <sphereGeometry args={[0.38, 10, 8]} />
        </mesh>
      )}

      {usesShards &&
        shardSeeds.map((_, i) => (
          <mesh
            key={`shard_${i}`}
            ref={(el) => {
              shardRefs.current[i] = el;
            }}
            geometry={shardGeo}
            material={shardMat}
            castShadow
            receiveShadow
            visible={false}
          />
        ))}
    </group>
  );
};
