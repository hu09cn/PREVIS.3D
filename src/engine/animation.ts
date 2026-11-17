import { cloneJoints, POSE_PRESETS } from '../data/presets';
import { getGroundY } from './terrain';
import type {
  CharacterActionTemplateType,
  CharacterActor,
  CharacterKeyframe,
  JointName,
  JointRotations,
  PosePreset,
  RoadConfig,
  ShotData,
  TerrainConfig,
  Vec3,
} from '../types/scene';

const JOINT_NAMES: JointName[] = [
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function lerpAnglesVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerpAngle(a[0], b[0], t), lerpAngle(a[1], b[1], t), lerpAngle(a[2], b[2], t)];
}

function interpolateJoints(
  a: JointRotations,
  b: JointRotations,
  t: number
): JointRotations {
  const out = {} as JointRotations;
  for (const name of JOINT_NAMES) {
    const ja = a[name] ?? [0, 0, 0];
    const jb = b[name] ?? [0, 0, 0];
    out[name] = lerpAnglesVec3(ja, jb, t);
  }
  return out;
}

/**
 * Adds a subtle, natural procedural gait cycle when a character is walking, running,
 * or actively translating across space during playback/export.
 */
function applyProceduralGait(
  joints: JointRotations,
  pelvisOffsetY: number,
  time: number,
  mode: 'walk' | 'run',
  weight: number
): { joints: JointRotations; pelvisOffsetY: number } {
  if (weight <= 0.01) return { joints, pelvisOffsetY };
  const freq = mode === 'run' ? 11.0 : 6.2;
  const phase = time * freq;
  const stride = Math.sin(phase) * weight;
  const oppStride = Math.sin(phase + Math.PI) * weight;
  const thighAmp = mode === 'run' ? 0.62 : 0.36;
  const armAmp = mode === 'run' ? 0.58 : 0.32;
  const shinAmp = mode === 'run' ? 0.55 : 0.25;
  const bobAmp = mode === 'run' ? 0.045 : 0.022;

  const out = cloneJoints(joints);
  out.leftThigh = [
    out.leftThigh[0] + stride * thighAmp,
    out.leftThigh[1],
    out.leftThigh[2],
  ];
  out.rightThigh = [
    out.rightThigh[0] + oppStride * thighAmp,
    out.rightThigh[1],
    out.rightThigh[2],
  ];
  out.leftShin = [
    Math.max(0, out.leftShin[0] + Math.max(0, -stride) * shinAmp),
    out.leftShin[1],
    out.leftShin[2],
  ];
  out.rightShin = [
    Math.max(0, out.rightShin[0] + Math.max(0, -oppStride) * shinAmp),
    out.rightShin[1],
    out.rightShin[2],
  ];
  out.leftUpperArm = [
    out.leftUpperArm[0] + oppStride * armAmp,
    out.leftUpperArm[1],
    out.leftUpperArm[2],
  ];
  out.rightUpperArm = [
    out.rightUpperArm[0] + stride * armAmp,
    out.rightUpperArm[1],
    out.rightUpperArm[2],
  ];
  const bob = Math.abs(Math.sin(phase)) * bobAmp * weight;
  return {
    joints: out,
    pelvisOffsetY: pelvisOffsetY + bob,
  };
}

/**
 * Evaluates a character's animated transform, pose, pelvis height, and 16-joint
 * rotations at `time` from its explicit keyframe track (or legacy camera-keyframe poses).
 */
export function evaluateCharacterAtTime(
  actor: CharacterActor,
  shot: ShotData | undefined,
  time: number,
  animateCycle = false
): CharacterActor {
  const track = shot?.characterTracks?.[actor.id];
  if (!track || track.length === 0) {
    // Support legacy ShotKeyframe.characterPoses if present
    const legacyKfs = (shot?.keyframes ?? [])
      .filter((k) => k.characterPoses && k.characterPoses[actor.id])
      .sort((a, b) => a.time - b.time);

    if (legacyKfs.length > 0) {
      let chosenPose: PosePreset = legacyKfs[0].characterPoses![actor.id]!;
      let nextKf: (typeof legacyKfs)[number] | null = null;
      let prevKf = legacyKfs[0];
      for (let i = 0; i < legacyKfs.length - 1; i++) {
        if (time >= legacyKfs[i].time && time <= legacyKfs[i + 1].time) {
          prevKf = legacyKfs[i];
          nextKf = legacyKfs[i + 1];
          break;
        }
      }
      if (time >= legacyKfs[legacyKfs.length - 1].time) {
        prevKf = legacyKfs[legacyKfs.length - 1];
        chosenPose = prevKf.characterPoses![actor.id]!;
      }
      if (nextKf) {
        const p0 = POSE_PRESETS[prevKf.characterPoses![actor.id]!];
        const p1 = POSE_PRESETS[nextKf.characterPoses![actor.id]!];
        const span = Math.max(0.0001, nextKf.time - prevKf.time);
        const u = Math.max(0, Math.min(1, (time - prevKf.time) / span));
        const alpha = u * u * (3 - 2 * u);
        chosenPose =
          u < 0.5
            ? prevKf.characterPoses![actor.id]!
            : nextKf.characterPoses![actor.id]!;
        return {
          ...actor,
          pose: chosenPose,
          pelvisOffsetY: lerp(p0.pelvisOffsetY, p1.pelvisOffsetY, alpha),
          joints: interpolateJoints(p0.joints, p1.joints, alpha),
        };
      }
      const preset = POSE_PRESETS[chosenPose];
      return {
        ...actor,
        pose: chosenPose,
        pelvisOffsetY: preset.pelvisOffsetY,
        joints: cloneJoints(preset.joints),
      };
    }

    if (animateCycle && (actor.pose === 'walk' || actor.pose === 'run')) {
      const gait = applyProceduralGait(
        actor.joints,
        actor.pelvisOffsetY,
        time,
        actor.pose,
        1
      );
      return {
        ...actor,
        pelvisOffsetY: gait.pelvisOffsetY,
        joints: gait.joints,
      };
    }
    return actor;
  }

  const sorted = [...track].sort((a, b) => a.time - b.time);

  if (sorted.length === 1 || time <= sorted[0].time) {
    const k = sorted[0];
    let joints = cloneJoints(k.joints);
    let pelvisOffsetY = k.pelvisOffsetY;
    if (animateCycle && (k.pose === 'walk' || k.pose === 'run')) {
      const gait = applyProceduralGait(joints, pelvisOffsetY, time, k.pose, 1);
      joints = gait.joints;
      pelvisOffsetY = gait.pelvisOffsetY;
    }
    return {
      ...actor,
      position: [...k.position],
      rotation: [...k.rotation],
      pose: k.pose,
      pelvisOffsetY,
      joints,
    };
  }

  const last = sorted[sorted.length - 1];
  if (time >= last.time) {
    let joints = cloneJoints(last.joints);
    let pelvisOffsetY = last.pelvisOffsetY;
    if (animateCycle && (last.pose === 'walk' || last.pose === 'run')) {
      const gait = applyProceduralGait(joints, pelvisOffsetY, time, last.pose, 1);
      joints = gait.joints;
      pelvisOffsetY = gait.pelvisOffsetY;
    }
    return {
      ...actor,
      position: [...last.position],
      rotation: [...last.rotation],
      pose: last.pose,
      pelvisOffsetY,
      joints,
    };
  }

  let segIdx = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      segIdx = i;
      break;
    }
  }

  const k0 = sorted[segIdx];
  const k1 = sorted[segIdx + 1];
  if (k0.interpolation === 'step') {
    return {
      ...actor,
      position: [...k0.position],
      rotation: [...k0.rotation],
      pose: k0.pose,
      pelvisOffsetY: k0.pelvisOffsetY,
      joints: cloneJoints(k0.joints),
    };
  }

  const span = Math.max(0.0001, k1.time - k0.time);
  const u = Math.max(0, Math.min(1, (time - k0.time) / span));
  const alpha =
    k0.interpolation === 'linear' ? u : u * u * (3 - 2 * u);

  const pos = lerpVec3(k0.position, k1.position, alpha);
  const rot = lerpAnglesVec3(k0.rotation, k1.rotation, alpha);
  let pelvisOffsetY = lerp(k0.pelvisOffsetY, k1.pelvisOffsetY, alpha);
  let joints = interpolateJoints(k0.joints, k1.joints, alpha);
  const pose = u < 0.5 ? k0.pose : k1.pose;

  // Apply natural cyclic gait when translating noticeably or posing walk/run
  const horizDist = Math.hypot(
    k1.position[0] - k0.position[0],
    k1.position[2] - k0.position[2]
  );
  const speed = horizDist / span;
  if (
    k0.pose === 'run' ||
    k1.pose === 'run' ||
    (horizDist > 0.35 && speed > 3.2)
  ) {
    const moveWeight = horizDist > 0.35 ? Math.sin(Math.PI * u) : 1;
    const gait = applyProceduralGait(
      joints,
      pelvisOffsetY,
      time,
      'run',
      Math.max(0.35, moveWeight)
    );
    joints = gait.joints;
    pelvisOffsetY = gait.pelvisOffsetY;
  } else if (
    k0.pose === 'walk' ||
    k1.pose === 'walk' ||
    horizDist > 0.35
  ) {
    const moveWeight =
      k0.pose === 'walk' || k1.pose === 'walk' ? 0.9 : Math.sin(Math.PI * u) * 0.85;
    const gait = applyProceduralGait(
      joints,
      pelvisOffsetY,
      time,
      'walk',
      moveWeight
    );
    joints = gait.joints;
    pelvisOffsetY = gait.pelvisOffsetY;
  }

  return {
    ...actor,
    position: pos,
    rotation: rot,
    pose,
    pelvisOffsetY,
    joints,
  };
}

export function evaluateAllCharactersAtTime(
  characters: CharacterActor[],
  shot: ShotData | undefined,
  time: number,
  animateCycle = false
): CharacterActor[] {
  return characters.map((c) =>
    evaluateCharacterAtTime(c, shot, time, animateCycle)
  );
}

/**
 * Generates a 3-keyframe ready-to-play animation sequence starting from the character's
 * current position & facing direction (+Z local forward).
 */
export function buildCharacterActionTemplate(
  actor: CharacterActor,
  template: CharacterActionTemplateType,
  duration: number,
  terrain: TerrainConfig,
  road: RoadConfig,
  makeId: (prefix: string) => string
): CharacterKeyframe[] {
  const dur = Math.max(2, duration);
  const fwdX = Math.sin(actor.rotation[1]);
  const fwdZ = Math.cos(actor.rotation[1]);

  const groundAt = (x: number, z: number): number => {
    const gy = getGroundY(x, z, terrain, road);
    // Keep elevated platform height if actor is currently standing above terrain
    if (actor.position[1] > gy + 0.35) {
      return actor.position[1];
    }
    return gy;
  };

  const makeKf = (
    time: number,
    pos: Vec3,
    rot: Vec3,
    pose: PosePreset
  ): CharacterKeyframe => {
    const preset = POSE_PRESETS[pose];
    return {
      id: makeId('ckf'),
      time: Number(time.toFixed(2)),
      position: pos,
      rotation: rot,
      pose,
      pelvisOffsetY: preset.pelvisOffsetY,
      joints: cloneJoints(preset.joints),
      interpolation: 'smooth',
    };
  };

  const startPos: Vec3 = [...actor.position];
  const startRot: Vec3 = [...actor.rotation];

  switch (template) {
    case 'advance_aim': {
      const midX = startPos[0] + fwdX * 1.8;
      const midZ = startPos[2] + fwdZ * 1.8;
      const endX = startPos[0] + fwdX * 3.2;
      const endZ = startPos[2] + fwdZ * 3.2;
      return [
        makeKf(0, startPos, startRot, 'idle'),
        makeKf(
          dur * 0.5,
          [midX, groundAt(midX, midZ), midZ],
          startRot,
          'walk'
        ),
        makeKf(
          dur * 0.9,
          [endX, groundAt(endX, endZ), endZ],
          startRot,
          'aim'
        ),
      ];
    }
    case 'take_cover': {
      const midX = startPos[0] + fwdX * 1.9;
      const midZ = startPos[2] + fwdZ * 1.9;
      const endX = startPos[0] + fwdX * 3.4;
      const endZ = startPos[2] + fwdZ * 3.4;
      return [
        makeKf(0, startPos, startRot, 'idle'),
        makeKf(
          dur * 0.45,
          [midX, groundAt(midX, midZ), midZ],
          startRot,
          'run'
        ),
        makeKf(
          dur * 0.85,
          [endX, groundAt(endX, endZ), endZ],
          startRot,
          'crouch_cover'
        ),
      ];
    }
    case 'turn_aim': {
      const turnedRot: Vec3 = [
        startRot[0],
        Number((startRot[1] + Math.PI).toFixed(3)),
        startRot[2],
      ];
      return [
        makeKf(0, startPos, startRot, 'idle'),
        makeKf(dur * 0.35, startPos, startRot, 'look_over_edge'),
        makeKf(dur * 0.78, startPos, turnedRot, 'aim'),
      ];
    }
    case 'patrol_walk':
    default: {
      const farX = startPos[0] + fwdX * 3.6;
      const farZ = startPos[2] + fwdZ * 3.6;
      const turnedRot: Vec3 = [
        startRot[0],
        Number((startRot[1] + Math.PI).toFixed(3)),
        startRot[2],
      ];
      return [
        makeKf(0, startPos, startRot, 'walk'),
        makeKf(
          dur * 0.48,
          [farX, groundAt(farX, farZ), farZ],
          startRot,
          'walk'
        ),
        makeKf(dur * 0.56, [farX, groundAt(farX, farZ), farZ], turnedRot, 'walk'),
        makeKf(dur, startPos, turnedRot, 'idle'),
      ];
    }
  }
}
